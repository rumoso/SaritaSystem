const { response } = require('express');

const { dbConnection } = require('../database/config');
const { PORCENTAJE_PISO, TOLERANCIA } = require('../helpers/validar-piso-costo');

// ══════════════════════════════════════════════════════════════
// PANEL DEL DIRECTOR (SaritaPlan/analisis/002-dashboard-directivo.md)
//
// Portado de VioletaSystem y recortado a lo que Sarita sí tiene:
// aquí NO hay cartera (78% contado, 0.32% crédito, sin apartados), ni
// TimeCard, ni bitácora de comisiones. A cambio se agrega el bloque de
// tendencia, que Violeta no tiene.
//
// Solo lectura: ningún endpoint de este archivo escribe. Un endpoint por
// bloque a propósito — es lo que permite que un bloque lento o caído no
// tumbe a los otros cuatro.
//
// Las tres definiciones que NO se pueden mezclar (regla del análisis):
//   VENDIDO  — importe de las notas levantadas en el rango.
//   COBRADO  — pagos registrados en el rango, vengan de donde vengan.
//   UTILIDAD — se calcula SIEMPRE sobre lo vendido, nunca sobre lo
//              cobrado, y se rotula "utilidad generada" para que nadie
//              la compare de frente contra `rep_getUtilidades` (ese mide
//              utilidad COBRADA y descarta ventas negativas: son
//              preguntas distintas y las dos cifras son correctas).
// ══════════════════════════════════════════════════════════════

// Exclusiones fijas, en un solo lugar para que ocho consultas no se
// desincronicen: las cotizaciones (idSaleType 6) no son ventas, y lo
// cancelado no cuenta en ningún número.
const _SQL_VENTA_VALIDA = `S.active = 1 AND S.idSaleType <> 6`;

// El taller de Sarita es solo el tipo 5. Violeta usa [5, 7] porque allá
// existe un segundo tipo de taller que aquí no está dado de alta.
const _TIPOS_TALLER = [5];

// Existencia según la define el propio sistema (`getProductsListWithPage`):
// suma de los movimientos de inventario ya firmados por verificación y
// mostrador. No se inventa una fórmula nueva: si el catálogo de
// productos cuenta así, el panel cuenta igual.
const _SQL_EXISTENCIA = `
    SELECT idProduct, SUM(cantidad) AS exis
    FROM inventarylog
    WHERE active = 1 AND firmaVer = 1 AND firmaMost = 1
    GROUP BY idProduct
`;

// Ventana para los patrones de ritmo (horas pico y día de la semana).
// Un solo mes deja las horas con muy pocas notas por celda; 90 días dan
// volumen sin dejar de ser el comportamiento actual de la tienda.
const _DIAS_RITMO = 90;

// ── Permisos ──
// Mismo camino que el SP `haveActionPermiso` del propio sistema: primero
// por rol (relationType 'R'), luego por usuario directo ('U'). No hay
// bypass por rol administrador.
//
// Las DOS banderas de active importan y son distintas:
//   A.active  = 1 -> el permiso existe y sigue vigente en el catálogo.
//   AC.active = 1 -> la ASIGNACIÓN a ese rol/usuario sigue vigente.
// La pantalla de permisos revoca poniendo `actionsconf.active = 0`, no
// borrando el renglón; sin ese segundo filtro un permiso revocado se
// seguiría concediendo. (Verificado: al revocar `dashboard_VerCostos` el
// servidor seguía mandando los costos.)
const _fn_tienePermiso = async(idUser, actionName) => {

    const porRol = await dbConnection.query(
        `SELECT AC.idAction
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
         INNER JOIN rolesconfig AS RC ON AC.idRelation = RC.idRol
         WHERE AC.relationType = 'R' AND AC.active = 1
           AND RC.idUser = :idUser AND A.name = :actionName AND A.active = 1
         LIMIT 1`,
        { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
    );

    if (porRol.length > 0) {
        return true;
    }

    const porUsuario = await dbConnection.query(
        `SELECT AC.idAction
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
         WHERE AC.relationType = 'U' AND AC.active = 1
           AND AC.idRelation = :idUser AND A.name = :actionName AND A.active = 1
         LIMIT 1`,
        { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
    );

    return porUsuario.length > 0;

};

// Guarda común de todos los endpoints. Devuelve null si puede seguir, o
// la respuesta a mandar si no.
const _fn_validarAcceso = async(idUserLogON) => {

    if (!idUserLogON) {
        return { status: 1, message: "No se identificó al usuario." };
    }

    const bPuedeVer = await _fn_tienePermiso(idUserLogON, 'dashboard_VerPanel');

    if (!bPuedeVer) {
        return { status: 1, message: "No tienes permiso para ver el panel." };
    }

    return null;

};

// ── Fechas ──
// El comparativo del día es contra el MISMO DÍA DE LA SEMANA anterior
// (un lunes no se parece a un domingo); el del mes, contra el mes
// anterior AL MISMO DÍA DEL MES (comparar 12 días contra 31 no dice
// nada) y —lo que Violeta no hace— contra el MISMO MES DEL AÑO ANTERIOR.
//
// Ese comparativo anual no es un adorno: mes contra mes, la venta de
// Sarita "cae" seis meses seguidos, y es estacionalidad de papelería.
// Año contra año, 2026 va por encima de 2025 en todos los meses
// comparables. Sin este renglón el panel cuenta una historia falsa.
const _fn_fechas = (fecha) => {

    const sHoy = (fecha && String(fecha).substring(0, 10)) || new Date().toISOString().substring(0, 10);

    const oDia = new Date(`${ sHoy }T12:00:00`);

    const oSemanaAnterior = new Date(oDia);
    oSemanaAnterior.setDate(oSemanaAnterior.getDate() - 7);

    const iDiaDelMes = oDia.getDate();

    const oMesIni = new Date(oDia);
    oMesIni.setDate(1);

    // Mismo día del mes anterior. Si ese mes no llega a ese día (31 de
    // marzo → febrero), Date lo desborda al mes siguiente, así que se
    // topa al último día real del mes anterior.
    const _fn_rangoDesplazado = (iMeses) => {

        const oIni = new Date(oDia);
        oIni.setDate(1);
        oIni.setMonth(oIni.getMonth() - iMeses);

        const iUltimoDia = new Date(oIni.getFullYear(), oIni.getMonth() + 1, 0).getDate();

        const oFin = new Date(oIni);
        oFin.setDate(Math.min(iDiaDelMes, iUltimoDia));

        return { ini: oIni, fin: oFin };

    };

    const oMesAnt = _fn_rangoDesplazado(1);
    const oMesAnio = _fn_rangoDesplazado(12);

    const oRitmoIni = new Date(oDia);
    oRitmoIni.setDate(oRitmoIni.getDate() - (_DIAS_RITMO - 1));

    const fmt = (d) => `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;

    return {
        dia: sHoy,
        diaComparativo: fmt(oSemanaAnterior),
        mesIni: fmt(oMesIni),
        mesFin: sHoy,
        mesAntIni: fmt(oMesAnt.ini),
        mesAntFin: fmt(oMesAnt.fin),
        mesAnioIni: fmt(oMesAnio.ini),
        mesAnioFin: fmt(oMesAnio.fin),
        ritmoIni: fmt(oRitmoIni),
        ritmoFin: sHoy
    };

};

// ── Utilidad ──
// Fórmula única: importe menos costo por cantidad.
//
// El LEFT JOIN a products y el CASE no son decorativos: replican el
// criterio de `rep_getUtilidades`, que une con INNER JOIN a products, de
// modo que una línea cuyo idProduct no exista en el catálogo no aporta
// ni importe ni costo. Hoy en Sarita esto no descarta nada (hay cero
// líneas huérfanas y hasta el sobre de taller existe como el producto 0),
// pero deja el panel y el reporte midiendo lo mismo si algún día
// aparecen.
const _SQL_IMPORTE = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.importe ELSE 0 END)`;
const _SQL_COSTO = `SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cost * D.cantidad ELSE 0 END)`;

// Redondeo de salida. Toda cantidad que sale de aquí va redondeada: es
// la regla del proyecto y aquí son los números que ve el dueño.
const _fn_r = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Arma el bloque de venta/utilidad de un rango, aplicando el permiso de
// costos: sin `dashboard_VerCostos` los campos de costo, utilidad y
// margen NO se incluyen en la respuesta — no se mandan ocultos para que
// el Front los esconda.
const _fn_armarVenta = (fila, bVerCostos) => {

    const vendido = _fn_r(fila && fila.vendido);
    const costo = _fn_r(fila && fila.costo);
    const notas = Number((fila && fila.notas) || 0);

    const oVenta = {
        vendido,
        notas,
        piezas: _fn_r(fila && fila.piezas),
        ticket: notas > 0 ? _fn_r(vendido / notas) : 0
    };

    if (bVerCostos) {
        oVenta.costo = costo;
        oVenta.utilidad = _fn_r(vendido - costo);
        oVenta.margen = vendido > 0 ? _fn_r((vendido - costo) / vendido * 100) : 0;
    }

    return oVenta;

};

// Variación porcentual contra el periodo comparativo. null cuando no hay
// base: "creció infinito" no es una lectura útil.
const _fn_variacion = (actual, anterior) => {
    const a = Number(anterior) || 0;
    if (a === 0) {
        return null;
    }
    return _fn_r(((Number(actual) || 0) - a) / a * 100);
};

// Venta (y su costo) de un rango de fechas.
const _fn_getVenta = async(desde, hasta, sFiltroTipo = '') => {

    const filas = await dbConnection.query(
        `SELECT
            COUNT(DISTINCT S.idSale) AS notas,
            ${ _SQL_IMPORTE } AS vendido,
            ${ _SQL_COSTO } AS costo,
            SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cantidad ELSE 0 END) AS piezas
         FROM sales AS S
         INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
         LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
         WHERE ${ _SQL_VENTA_VALIDA }
           AND DATE(S.createDate) BETWEEN :desde AND :hasta
           ${ sFiltroTipo }`,
        { replacements: { desde, hasta }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas[0] || {};

};

// El taller de Sarita se captura con `cost` igual al precio (verificado:
// $331,947.22 de importe contra $331,947.22 de costo en las 5,355 líneas
// históricas), así que su utilidad registrada es cero.
//
// No es un error de esta consulta ni algo que el panel deba "corregir":
// es que el taller no lleva costo de material ni de mano de obra. Pero
// arrastra el margen global hacia abajo, y un dueño que ve 44% donde su
// mostrador va al 55% merece saber por qué. Se manda la bandera para que
// el Front lo explique en una línea, en vez de dejarlo como misterio.
const _fn_tallerSinCosto = (oTaller) => {
    return _fn_r(oTaller && oTaller.vendido) > 0
        && Math.abs(_fn_r(oTaller && oTaller.vendido) - _fn_r(oTaller && oTaller.costo)) < 1;
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 1 — EL PULSO DE HOY
//////////////////////////////////////////////////////////////////////////////////////////////////

const getResumenDia = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        const oFechas = _fn_fechas(fecha);

        const sTaller = _TIPOS_TALLER.join(', ');

        const [oHoy, oAntes, oMostrador, oTaller, aFormasPago, aCobrado, aCajas] = await Promise.all([

            _fn_getVenta(oFechas.dia, oFechas.dia),
            _fn_getVenta(oFechas.diaComparativo, oFechas.diaComparativo),
            _fn_getVenta(oFechas.dia, oFechas.dia, `AND S.idSaleType NOT IN (${ sTaller })`),
            _fn_getVenta(oFechas.dia, oFechas.dia, `AND S.idSaleType IN (${ sTaller })`),

            dbConnection.query(
                `SELECT F.name AS formaPagoDesc, SUM(P.pago) AS monto, COUNT(*) AS movimientos
                 FROM payments AS P
                 LEFT JOIN forma_pago AS F ON F.idFormaPago = P.idFormaPago
                 WHERE P.active = 1 AND DATE(P.createDate) = :dia
                 GROUP BY F.name
                 ORDER BY monto DESC`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            ),

            // Cobrado del día. Sin cartera, esto y lo vendido casi
            // coinciden — pero siguen siendo dos números distintos y el
            // panel no los presenta como el mismo.
            dbConnection.query(
                `SELECT SUM(P.pago) AS total, COUNT(*) AS movimientos
                 FROM payments AS P
                 INNER JOIN sales AS S ON S.idSale = P.idRelation AND S.active = 1
                 WHERE P.active = 1
                   AND P.relationType = 'V'
                   AND DATE(P.createDate) = :dia`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            ),

            // Cajas activas sin corte del día: riesgo operativo que solo
            // se nota en vivo.
            dbConnection.query(
                `SELECT CJ.idCaja, CJ.name AS cajaDesc
                 FROM cajas AS CJ
                 WHERE CJ.active = 1
                   AND NOT EXISTS (
                       SELECT 1 FROM corte_caja AS CC
                       WHERE CC.idCaja = CJ.idCaja AND CC.active = 1 AND DATE(CC.createDate) = :dia
                   )`,
                { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
            )
        ]);

        const venta = _fn_armarVenta(oHoy, bVerCostos);
        const ventaAntes = _fn_armarVenta(oAntes, bVerCostos);

        const oCobrado = aCobrado[0] || {};

        const oResp = {
            fecha: oFechas.dia,
            fechaComparativo: oFechas.diaComparativo,

            venta,
            ventaComparativo: ventaAntes,
            variacionVendido: _fn_variacion(venta.vendido, ventaAntes.vendido),
            variacionNotas: _fn_variacion(venta.notas, ventaAntes.notas),

            cobrado: {
                total: _fn_r(oCobrado.total),
                movimientos: Number(oCobrado.movimientos) || 0
            },

            mostrador: _fn_armarVenta(oMostrador, bVerCostos),
            taller: _fn_armarVenta(oTaller, bVerCostos),

            formasPago: aFormasPago.map((f) => ({
                formaPagoDesc: f.formaPagoDesc || 'Sin forma de pago',
                monto: _fn_r(f.monto),
                movimientos: Number(f.movimientos) || 0
            })),

            cajasSinCorte: aCajas,

            bVerCostos,
            // "Sin ventas registradas hoy" y "$0.00" significan cosas
            // distintas: el Front necesita poder distinguirlas.
            bSinDatos: venta.notas === 0 && (Number(oCobrado.movimientos) || 0) === 0
        };

        if (bVerCostos) {
            oResp.variacionUtilidad = _fn_variacion(venta.utilidad, ventaAntes.utilidad);
            oResp.bTallerSinCosto = _fn_tallerSinCosto(oTaller);
        }

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 2 — QUIÉN VA ADELANTE (POR VENDEDOR)
//////////////////////////////////////////////////////////////////////////////////////////////////

// Un renglón por vendedor con actividad en el día, ordenado por UTILIDAD
// GENERADA y no por importe vendido: es el número que dice si alguien
// vende bien o solo vende barato. En julio, Gladys y Paola vendieron casi
// lo mismo ($28,448 contra $27,045) con márgenes y tickets distintos.
//
// Margen % y ticket promedio son propios de Sarita — Violeta no los trae
// en este bloque.
const getResumenPorVendedor = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        const oFechas = _fn_fechas(fecha);

        const filas = await dbConnection.query(
            `SELECT
                U.idUser,
                U.name AS vendedorDesc,
                U.userName,
                V.notas,
                V.vendido,
                V.costo,
                V.piezas
             FROM users AS U
             INNER JOIN (
                SELECT
                    S.idSeller_idUser AS idUser,
                    COUNT(DISTINCT S.idSale) AS notas,
                    ${ _SQL_IMPORTE } AS vendido,
                    ${ _SQL_COSTO } AS costo,
                    SUM(CASE WHEN PP.idProduct IS NOT NULL THEN D.cantidad ELSE 0 END) AS piezas
                FROM sales AS S
                INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
                LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
                WHERE ${ _SQL_VENTA_VALIDA } AND DATE(S.createDate) = :dia
                GROUP BY S.idSeller_idUser
             ) AS V ON V.idUser = U.idUser`,
            { replacements: { dia: oFechas.dia }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = filas.map((f) => {

            const vendido = _fn_r(f.vendido);
            const costo = _fn_r(f.costo);
            const notas = Number(f.notas) || 0;

            const oFila = {
                idUser: f.idUser,
                vendedorDesc: f.vendedorDesc,
                userName: f.userName,
                notas,
                vendido,
                piezas: _fn_r(f.piezas),
                ticket: notas > 0 ? _fn_r(vendido / notas) : 0
            };

            if (bVerCostos) {
                oFila.costo = costo;
                oFila.utilidad = _fn_r(vendido - costo);
                oFila.margen = vendido > 0 ? _fn_r((vendido - costo) / vendido * 100) : 0;
            }

            return oFila;

        });

        // Orden por utilidad generada. Sin el permiso de costos no hay
        // utilidad que ordenar, así que cae a importe vendido.
        rows.sort((a, b) => (bVerCostos ? (b.utilidad - a.utilidad) : (b.vendido - a.vendido)));

        const oTotales = {
            notas: rows.reduce((s, x) => s + x.notas, 0),
            vendido: _fn_r(rows.reduce((s, x) => s + x.vendido, 0))
        };

        oTotales.ticket = oTotales.notas > 0 ? _fn_r(oTotales.vendido / oTotales.notas) : 0;

        if (bVerCostos) {
            oTotales.utilidad = _fn_r(rows.reduce((s, x) => s + x.utilidad, 0));
            oTotales.margen = oTotales.vendido > 0 ? _fn_r(oTotales.utilidad / oTotales.vendido * 100) : 0;
        }

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { fecha: oFechas.dia, rows, totales: oTotales, bVerCostos, bSinDatos: rows.length === 0 }
        });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 3 — CAPITAL DORMIDO (INVENTARIO)
//////////////////////////////////////////////////////////////////////////////////////////////////

const getInventario = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        // El valor a costo ES dato de costo: sin el permiso este bloque
        // completo no tiene nada que mostrar.
        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');

        if (!bVerCostos) {
            return res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: { bSinPermiso: true }
            });
        }

        const oFechas = _fn_fechas(fecha);

        // Una sola pasada sobre products: totales, las tres cubetas de
        // no-rotación y los que están por debajo de su piso.
        //
        // El piso viene de `helpers/validar-piso-costo` (analisis/001),
        // no de un 1.30 escrito otra vez aquí: si algún día cambia la
        // regla, cambia en un solo lugar.
        const filas = await dbConnection.query(
            `SELECT
                COUNT(*) AS productos,
                SUM(E.exis) AS piezas,
                SUM(E.exis * P.cost) AS costo,
                SUM(E.exis * P.price) AS lista,

                SUM(CASE WHEN U.ultima IS NULL THEN 1 ELSE 0 END) AS nuncaProductos,
                SUM(CASE WHEN U.ultima IS NULL THEN E.exis * P.cost ELSE 0 END) AS nuncaCosto,

                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 12 MONTH) THEN 1 ELSE 0 END) AS sin12Productos,
                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 12 MONTH) THEN E.exis * P.cost ELSE 0 END) AS sin12Costo,

                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 6 MONTH) AND U.ultima >= DATE_SUB(:corte, INTERVAL 12 MONTH) THEN 1 ELSE 0 END) AS sin6Productos,
                SUM(CASE WHEN U.ultima IS NOT NULL AND U.ultima < DATE_SUB(:corte, INTERVAL 6 MONTH) AND U.ultima >= DATE_SUB(:corte, INTERVAL 12 MONTH) THEN E.exis * P.cost ELSE 0 END) AS sin6Costo,

                SUM(CASE WHEN P.cost > 0 AND P.price < ( ROUND(P.cost * :piso, 2) - :tolerancia ) THEN 1 ELSE 0 END) AS bajoPiso,

                -- El mismo conteo pero sobre TODO el catálogo activo, no
                -- solo lo que hay en existencia. Los dos números importan
                -- y son distintos (7 contra 28): el primero es lo que hoy
                -- se puede vender mal, el segundo es el tamaño real del
                -- problema de precios que hay que corregir en el catálogo.
                ( SELECT COUNT(*) FROM products AS PT
                  WHERE PT.active = 1 AND PT.cost > 0
                    AND PT.price < ( ROUND(PT.cost * :piso, 2) - :tolerancia ) ) AS bajoPisoTotal
             FROM products AS P
             INNER JOIN ( ${ _SQL_EXISTENCIA } ) AS E ON E.idProduct = P.idProduct
             LEFT JOIN ( SELECT idProduct, MAX(createDate) AS ultima FROM salesdetail WHERE active = 1 GROUP BY idProduct ) AS U
                ON U.idProduct = P.idProduct
             WHERE P.active = 1 AND E.exis > 0`,
            {
                replacements: { corte: oFechas.dia, piso: PORCENTAJE_PISO, tolerancia: TOLERANCIA },
                type: dbConnection.QueryTypes.SELECT
            }
        );

        const f = filas[0] || {};

        const costo = _fn_r(f.costo);
        const lista = _fn_r(f.lista);

        const _fn_cubeta = (clave, etiqueta, productos, valor) => ({
            clave,
            etiqueta,
            productos: Number(productos) || 0,
            costo: _fn_r(valor),
            porcentaje: costo > 0 ? _fn_r(_fn_r(valor) / costo * 100) : 0
        });

        const aCubetas = [
            _fn_cubeta('nunca', 'Nunca se ha vendido', f.nuncaProductos, f.nuncaCosto),
            _fn_cubeta('sin12', 'Sin movimiento 12+ meses', f.sin12Productos, f.sin12Costo),
            _fn_cubeta('sin6', 'Sin movimiento 6 a 12 meses', f.sin6Productos, f.sin6Costo)
        ];

        const dormidoCosto = _fn_r(aCubetas.reduce((s, c) => s + c.costo, 0));

        const oResp = {
            fecha: oFechas.dia,
            productos: Number(f.productos) || 0,
            piezas: _fn_r(f.piezas),
            costo,
            lista,
            utilidadPotencial: _fn_r(lista - costo),

            cubetas: aCubetas,

            dormido: {
                productos: aCubetas.reduce((s, c) => s + c.productos, 0),
                costo: dormidoCosto,
                porcentaje: costo > 0 ? _fn_r(dormidoCosto / costo * 100) : 0
            },

            bajoPiso: Number(f.bajoPiso) || 0,
            bajoPisoTotal: Number(f.bajoPisoTotal) || 0,
            bSinDatos: (Number(f.productos) || 0) === 0
        };

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 4 — EL MES
//////////////////////////////////////////////////////////////////////////////////////////////////

const getResumenMes = async(req, res = response) => {

    const { idUserLogON, fecha = '' } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const bVerCostos = await _fn_tienePermiso(idUserLogON, 'dashboard_VerCostos');
        const oFechas = _fn_fechas(fecha);

        const [oMes, oMesAnterior, oMesAnio, aDiaria] = await Promise.all([

            _fn_getVenta(oFechas.mesIni, oFechas.mesFin),
            _fn_getVenta(oFechas.mesAntIni, oFechas.mesAntFin),
            _fn_getVenta(oFechas.mesAnioIni, oFechas.mesAnioFin),

            dbConnection.query(
                `SELECT DATE(S.createDate) AS fecha, ${ _SQL_IMPORTE } AS vendido, COUNT(DISTINCT S.idSale) AS notas
                 FROM sales AS S
                 INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
                 LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
                 WHERE ${ _SQL_VENTA_VALIDA }
                   AND DATE(S.createDate) BETWEEN :desde AND :hasta
                 GROUP BY DATE(S.createDate)
                 ORDER BY fecha`,
                { replacements: { desde: oFechas.mesIni, hasta: oFechas.mesFin }, type: dbConnection.QueryTypes.SELECT }
            )
        ]);

        const venta = _fn_armarVenta(oMes, bVerCostos);
        const ventaAnterior = _fn_armarVenta(oMesAnterior, bVerCostos);
        const ventaAnio = _fn_armarVenta(oMesAnio, bVerCostos);

        const oResp = {
            desde: oFechas.mesIni,
            hasta: oFechas.mesFin,

            venta,

            // Los dos comparativos van con su rango explícito: el Front
            // tiene que poder decir "1 al 14", no solo "el mes pasado".
            mesAnterior: {
                desde: oFechas.mesAntIni,
                hasta: oFechas.mesAntFin,
                venta: ventaAnterior,
                variacionVendido: _fn_variacion(venta.vendido, ventaAnterior.vendido),
                variacionTicket: _fn_variacion(venta.ticket, ventaAnterior.ticket)
            },

            mismoMesAnioAnterior: {
                desde: oFechas.mesAnioIni,
                hasta: oFechas.mesAnioFin,
                venta: ventaAnio,
                variacionVendido: _fn_variacion(venta.vendido, ventaAnio.vendido),
                variacionTicket: _fn_variacion(venta.ticket, ventaAnio.ticket)
            },

            diaria: aDiaria.map((d) => ({
                fecha: d.fecha,
                vendido: _fn_r(d.vendido),
                notas: Number(d.notas) || 0
            })),

            bVerCostos,
            bSinDatos: venta.notas === 0
        };

        if (bVerCostos) {
            oResp.mesAnterior.variacionUtilidad = _fn_variacion(venta.utilidad, ventaAnterior.utilidad);
            oResp.mismoMesAnioAnterior.variacionUtilidad = _fn_variacion(venta.utilidad, ventaAnio.utilidad);
            // El margen se compara en PUNTOS porcentuales, no en % de %:
            // "el margen bajó 6.5 puntos" se entiende, "bajó 11%" no.
            oResp.mesAnterior.variacionMargenPuntos = _fn_r(venta.margen - ventaAnterior.margen);
            oResp.mismoMesAnioAnterior.variacionMargenPuntos = _fn_r(venta.margen - ventaAnio.margen);
        }

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

//////////////////////////////////////////////////////////////////////////////////////////////////
// BLOQUE 5 — TENDENCIA Y RITMO
//
// Este bloque no existe en Violeta. Sale de lo que pidió el cliente
// ("la tendencia en los productos") y de los patrones que aparecieron al
// revisar los datos de la mercería.
//////////////////////////////////////////////////////////////////////////////////////////////////

const getTendencia = async(req, res = response) => {

    const { idUserLogON, fecha = '', iTop = 6 } = req.body;

    try {

        const oNoAcceso = await _fn_validarAcceso(idUserLogON);
        if (oNoAcceso) {
            return res.json(oNoAcceso);
        }

        const oFechas = _fn_fechas(fecha);
        const sTaller = _TIPOS_TALLER.join(', ');
        const iLimite = Math.min(Math.max(Number(iTop) || 6, 1), 20);

        const [aProductos, aHoras, aDiasSemana, aTallerEstatus, aTallerDetenidos, aDescuentos] = await Promise.all([

            // Productos que más suben y bajan en PIEZAS, mes actual
            // contra el anterior al mismo día del mes. Se excluye el
            // producto 0 (el sobre de taller): no es un artículo del
            // catálogo y arrasaría el listado.
            //
            // FULL OUTER JOIN no existe en MySQL, así que se arma la
            // lista de productos con UNION y se cuelgan las dos
            // ventanas — sin eso, un producto que se vendió solo en uno
            // de los dos meses (justo el caso más interesante) no
            // aparecería.
            dbConnection.query(
                `SELECT
                    L.idProduct,
                    P.name AS productoDesc,
                    IFNULL(A.piezas, 0) AS piezasActual,
                    IFNULL(B.piezas, 0) AS piezasAnterior,
                    IFNULL(A.piezas, 0) - IFNULL(B.piezas, 0) AS delta
                 FROM (
                    SELECT idProduct FROM salesdetail AS D
                    INNER JOIN sales AS S ON S.idSale = D.idSale
                    WHERE D.active = 1 AND ${ _SQL_VENTA_VALIDA } AND D.idProduct > 0
                      AND DATE(S.createDate) BETWEEN :desde AND :hasta
                    UNION
                    SELECT idProduct FROM salesdetail AS D
                    INNER JOIN sales AS S ON S.idSale = D.idSale
                    WHERE D.active = 1 AND ${ _SQL_VENTA_VALIDA } AND D.idProduct > 0
                      AND DATE(S.createDate) BETWEEN :desdeAnt AND :hastaAnt
                 ) AS L
                 INNER JOIN products AS P ON P.idProduct = L.idProduct
                 LEFT JOIN (
                    SELECT D.idProduct, SUM(D.cantidad) AS piezas
                    FROM salesdetail AS D
                    INNER JOIN sales AS S ON S.idSale = D.idSale
                    WHERE D.active = 1 AND ${ _SQL_VENTA_VALIDA }
                      AND DATE(S.createDate) BETWEEN :desde AND :hasta
                    GROUP BY D.idProduct
                 ) AS A ON A.idProduct = L.idProduct
                 LEFT JOIN (
                    SELECT D.idProduct, SUM(D.cantidad) AS piezas
                    FROM salesdetail AS D
                    INNER JOIN sales AS S ON S.idSale = D.idSale
                    WHERE D.active = 1 AND ${ _SQL_VENTA_VALIDA }
                      AND DATE(S.createDate) BETWEEN :desdeAnt AND :hastaAnt
                    GROUP BY D.idProduct
                 ) AS B ON B.idProduct = L.idProduct
                 ORDER BY ABS(IFNULL(A.piezas, 0) - IFNULL(B.piezas, 0)) DESC
                 LIMIT :iLimite`,
                {
                    replacements: {
                        desde: oFechas.mesIni, hasta: oFechas.mesFin,
                        desdeAnt: oFechas.mesAntIni, hastaAnt: oFechas.mesAntFin,
                        iLimite
                    },
                    type: dbConnection.QueryTypes.SELECT
                }
            ),

            // Horas pico y día de la semana van sobre los últimos 90
            // días, no sobre el mes: con un solo mes cada hora queda con
            // muy pocas notas y el patrón se pierde en el ruido.
            dbConnection.query(
                `SELECT HOUR(S.createDate) AS hora,
                        COUNT(DISTINCT S.idSale) AS notas,
                        ${ _SQL_IMPORTE } AS vendido
                 FROM sales AS S
                 INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
                 LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
                 WHERE ${ _SQL_VENTA_VALIDA }
                   AND DATE(S.createDate) BETWEEN :desde AND :hasta
                 GROUP BY HOUR(S.createDate)
                 ORDER BY hora`,
                { replacements: { desde: oFechas.ritmoIni, hasta: oFechas.ritmoFin }, type: dbConnection.QueryTypes.SELECT }
            ),

            // DAYOFWEEK de MySQL: 1 = domingo … 7 = sábado.
            dbConnection.query(
                `SELECT DAYOFWEEK(S.createDate) AS dow,
                        COUNT(DISTINCT S.idSale) AS notas,
                        ${ _SQL_IMPORTE } AS vendido,
                        COUNT(DISTINCT DATE(S.createDate)) AS dias
                 FROM sales AS S
                 INNER JOIN salesdetail AS D ON D.idSale = S.idSale AND D.active = 1
                 LEFT JOIN products AS PP ON PP.idProduct = D.idProduct
                 WHERE ${ _SQL_VENTA_VALIDA }
                   AND DATE(S.createDate) BETWEEN :desde AND :hasta
                 GROUP BY DAYOFWEEK(S.createDate)
                 ORDER BY dow`,
                { replacements: { desde: oFechas.ritmoIni, hasta: oFechas.ritmoFin }, type: dbConnection.QueryTypes.SELECT }
            ),

            // Estatus ACTUAL de cada sobre: el renglón más reciente de su
            // bitácora, no todos los renglones.
            //
            // El JOIN a `sales` no sobra: `sobre_taller_status` guarda el
            // sobre físico de cualquier venta que lleve uno, no solo de
            // las de taller. Sin acotar al tipo 5, este bloque mezclaría
            // el flujo del taller con sobres de mostrador.
            dbConnection.query(
                `SELECT SC.idStatusSobre, SC.nombre AS estatusDesc, COUNT(*) AS folios
                 FROM sobre_taller_status AS ST
                 INNER JOIN (
                    SELECT idSale, MAX(idSobreTallerStatus) AS ultimo
                    FROM sobre_taller_status
                    WHERE createDate <= :hasta
                    GROUP BY idSale
                 ) AS U ON U.ultimo = ST.idSobreTallerStatus
                 INNER JOIN sobre_status_cat AS SC ON SC.idStatusSobre = ST.idStatusSobre
                 INNER JOIN sales AS S ON S.idSale = ST.idSale AND S.active = 1
                 WHERE S.idSaleType IN (${ sTaller })
                 GROUP BY SC.idStatusSobre, SC.nombre
                 ORDER BY folios DESC`,
                { replacements: { hasta: `${ oFechas.dia } 23:59:59` }, type: dbConnection.QueryTypes.SELECT }
            ),

            // Los que llevan más días sin cambiar de estatus. Sin
            // "Entregado" (5): un sobre entregado ya terminó, no está
            // detenido.
            dbConnection.query(
                `SELECT ST.idSale, SC.nombre AS estatusDesc, ST.createDate,
                        DATEDIFF(:dia, ST.createDate) AS dias
                 FROM sobre_taller_status AS ST
                 INNER JOIN (
                    SELECT idSale, MAX(idSobreTallerStatus) AS ultimo
                    FROM sobre_taller_status
                    WHERE createDate <= :hasta
                    GROUP BY idSale
                 ) AS U ON U.ultimo = ST.idSobreTallerStatus
                 INNER JOIN sobre_status_cat AS SC ON SC.idStatusSobre = ST.idStatusSobre
                 INNER JOIN sales AS S ON S.idSale = ST.idSale AND S.active = 1
                 WHERE ST.idStatusSobre <> 5
                   AND S.idSaleType IN (${ sTaller })
                 ORDER BY dias DESC
                 LIMIT 5`,
                {
                    replacements: { dia: oFechas.dia, hasta: `${ oFechas.dia } 23:59:59` },
                    type: dbConnection.QueryTypes.SELECT
                }
            ),

            // Uso de los tipos de precio del catálogo de descuentos
            // (analisis/001).
            //
            // La venta NO guarda de cuál renglón del catálogo salió el
            // descuento: en `salesdetail` solo queda `descuento`, que es
            // el monto rebajado por unidad. Así que el porcentaje se
            // reconstruye (descuento / precioUnitario) y se agrupa por
            // ese valor redondeado — que es exactamente lo que el cajero
            // eligió. Si algún día se guarda el idDiscountCatalog en la
            // venta, esta consulta se cambia por un JOIN y deja de ser
            // una reconstrucción.
            dbConnection.query(
                `SELECT
                    ROUND(D.descuento / D.precioUnitario * 100) AS porcentaje,
                    COUNT(*) AS lineas,
                    COUNT(DISTINCT S.idSale) AS notas,
                    ROUND(SUM(D.descuento * D.cantidad), 2) AS montoDescontado
                 FROM salesdetail AS D
                 INNER JOIN sales AS S ON S.idSale = D.idSale
                 WHERE D.active = 1 AND ${ _SQL_VENTA_VALIDA }
                   AND D.descuento <> 0 AND D.precioUnitario > 0
                   AND DATE(S.createDate) BETWEEN :desde AND :hasta
                 GROUP BY porcentaje
                 ORDER BY lineas DESC`,
                { replacements: { desde: oFechas.mesIni, hasta: oFechas.mesFin }, type: dbConnection.QueryTypes.SELECT }
            )
        ]);

        const _DIAS = ['', 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const aSuben = aProductos
            .filter((p) => Number(p.delta) > 0)
            .map((p) => ({
                idProduct: p.idProduct,
                productoDesc: p.productoDesc,
                piezasActual: _fn_r(p.piezasActual),
                piezasAnterior: _fn_r(p.piezasAnterior),
                delta: _fn_r(p.delta)
            }))
            .sort((a, b) => b.delta - a.delta);

        const aBajan = aProductos
            .filter((p) => Number(p.delta) < 0)
            .map((p) => ({
                idProduct: p.idProduct,
                productoDesc: p.productoDesc,
                piezasActual: _fn_r(p.piezasActual),
                piezasAnterior: _fn_r(p.piezasAnterior),
                delta: _fn_r(p.delta)
            }))
            .sort((a, b) => a.delta - b.delta);

        const aDias = aDiasSemana.map((d) => {
            const iDias = Number(d.dias) || 0;
            const iNotas = Number(d.notas) || 0;
            return {
                dow: Number(d.dow) || 0,
                diaDesc: _DIAS[Number(d.dow) || 0] || '',
                notas: iNotas,
                vendido: _fn_r(d.vendido),
                // El promedio por día es lo comparable: en 90 días no
                // caen los mismos siete días de la semana el mismo
                // número de veces, y menos si la tienda cierra alguno.
                notasPorDia: iDias > 0 ? _fn_r(iNotas / iDias) : 0,
                dias: iDias
            };
        });

        const oMasFlojo = aDias.length > 0
            ? aDias.reduce((min, d) => (d.notasPorDia < min.notasPorDia ? d : min), aDias[0])
            : null;

        const aHorasOut = aHoras.map((h) => ({
            hora: Number(h.hora) || 0,
            notas: Number(h.notas) || 0,
            vendido: _fn_r(h.vendido)
        }));

        const oHoraPico = aHorasOut.length > 0
            ? aHorasOut.reduce((max, h) => (h.notas > max.notas ? h : max), aHorasOut[0])
            : null;

        const oResp = {
            fecha: oFechas.dia,

            productos: {
                desde: oFechas.mesIni,
                hasta: oFechas.mesFin,
                desdeComparativo: oFechas.mesAntIni,
                hastaComparativo: oFechas.mesAntFin,
                suben: aSuben,
                bajan: aBajan,
                bSinDatos: aSuben.length === 0 && aBajan.length === 0
            },

            ritmo: {
                desde: oFechas.ritmoIni,
                hasta: oFechas.ritmoFin,
                dias: _DIAS_RITMO,
                horas: aHorasOut,
                horaPico: oHoraPico,
                diasSemana: aDias,
                diaMasFlojo: oMasFlojo,
                bSinDatos: aHorasOut.length === 0
            },

            taller: {
                estatus: aTallerEstatus.map((t) => ({
                    idStatusSobre: t.idStatusSobre,
                    estatusDesc: t.estatusDesc,
                    folios: Number(t.folios) || 0
                })),
                detenidos: aTallerDetenidos.map((d) => ({
                    idSale: d.idSale,
                    estatusDesc: d.estatusDesc,
                    dias: Number(d.dias) || 0
                })),
                bSinDatos: aTallerEstatus.length === 0
            },

            descuentos: {
                desde: oFechas.mesIni,
                hasta: oFechas.mesFin,
                rows: aDescuentos.map((d) => ({
                    porcentaje: Number(d.porcentaje) || 0,
                    lineas: Number(d.lineas) || 0,
                    notas: Number(d.notas) || 0,
                    montoDescontado: _fn_r(d.montoDescontado)
                })),
                bSinDatos: aDescuentos.length === 0
            }
        };

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oResp });

    } catch (error) {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

module.exports = {
    getResumenDia
    , getResumenPorVendedor
    , getInventario
    , getResumenMes
    , getTendencia
}
