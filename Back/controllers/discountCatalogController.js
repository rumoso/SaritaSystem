const { response } = require('express');

const { dbSPConnection } = require('../database/config');

// =====================================================================
// Catálogo de % de descuento
// Análisis: SaritaPlan/analisis/001-descuentos-nota-venta.md
//
// A diferencia del resto del sistema (que trabaja con stored procedures),
// este CRUD arma el SQL aquí. Por eso, dos reglas que NO se pueden
// relajar en este archivo:
//   1) Todas las queries van PARAMETRIZADAS (?). Nunca interpolar
//      valores en el string del SQL: aquí sí sería inyección real.
//   2) La conexión se toma del pool y se libera SIEMPRE en el finally,
//      pase lo que pase, o se agota el connectionLimit del pool.
// =====================================================================

// El piso de negocio: ningún producto con costo puede venderse por
// debajo de costo + 30%. Por eso el catálogo no acepta menos de 30.
const PORCENTAJE_MINIMO = 30;


const getDiscountCatalogListWithPage = async(req, res = response) => {

  const {
    search = ''
    , start = 0
    , limiter = 10
  } = req.body;

  const connection = await dbSPConnection.getConnection();

  try{

    const sLike = `%${ search }%`;
    const iStart = parseInt( start ) || 0;
    const iLimiter = parseInt( limiter ) || 10;

    const [ oCount ] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM discountcatalog
       WHERE name LIKE ?`
      , [ sLike ]
    );

    const [ oRows ] = await connection.query(
      // CAST a DOUBLE: mysql2 regresa los DECIMAL como string ("40.00")
      // y el Front hace aritmética con este valor (cost * (1 + %/100)).
      `SELECT
           idDiscountCatalog
         , createDate
         , name
         , CAST(percentage AS DOUBLE) AS percentage
         , active
       FROM discountcatalog
       WHERE name LIKE ?
       ORDER BY percentage ASC
       LIMIT ?, ?`
      , [ sLike, iStart, iLimiter ]
    );

    res.json({
      status: 0,
      message: "Ejecutado correctamente.",
      data: {
        count: oCount[0].count,
        rows: oRows
      }
    });

  }catch(error){

    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });

  }finally{
    connection.release();
  }

};


const insertUpdateDiscountCatalog = async(req, res = response) => {

  const {
    idDiscountCatalog = 0
    , name = ''
    , percentage = 0
    , active = true
  } = req.body;

  const connection = await dbSPConnection.getConnection();

  try{

    const sName = ( name || '' ).trim();
    const nPercentage = parseFloat( percentage );

    // Validaciones antes de tocar la BD: el CHECK de la tabla es la
    // última línea de defensa, no la primera — aquí damos un mensaje
    // que el usuario del punto de venta pueda entender.
    if( sName.length == 0 ){
      return res.json({
        status: 1,
        message: "El nombre del descuento es obligatorio."
      });
    }

    if( isNaN( nPercentage ) ){
      return res.json({
        status: 1,
        message: "El porcentaje debe ser un número."
      });
    }

    if( nPercentage < PORCENTAJE_MINIMO ){
      return res.json({
        status: 1,
        message: `El porcentaje no puede ser menor a ${ PORCENTAJE_MINIMO }%, `
               + `porque dejaría productos por debajo de su precio mínimo (costo + ${ PORCENTAJE_MINIMO }%).`
      });
    }

    const iActive = active ? 1 : 0;
    const iId = parseInt( idDiscountCatalog ) || 0;

    // Una sola sentencia atómica en ambos caminos: no hay pasos
    // intermedios que puedan quedar a medias, así que no hace falta
    // transacción explícita.
    if( iId > 0 ){

      const [ oResult ] = await connection.query(
        `UPDATE discountcatalog
         SET name = ?, percentage = ?, active = ?
         WHERE idDiscountCatalog = ?`
        , [ sName, nPercentage, iActive, iId ]
      );

      if( oResult.affectedRows == 0 ){
        return res.json({
          status: 1,
          message: "No se encontró el descuento a actualizar."
        });
      }

      res.json({
        status: 0,
        message: "Descuento actualizado con éxito.",
        data: { idDiscountCatalog: iId }
      });

    }
    else{

      const [ oResult ] = await connection.query(
        `INSERT INTO discountcatalog ( createDate, name, percentage, active )
         VALUES ( NOW(), ?, ?, ? )`
        , [ sName, nPercentage, iActive ]
      );

      res.json({
        status: 0,
        message: "Descuento guardado con éxito.",
        data: { idDiscountCatalog: oResult.insertId }
      });

    }

  }catch(error){

    // El UNIQUE de name convierte el duplicado en un error de BD; lo
    // traducimos a un mensaje entendible en vez de soltar el técnico.
    if( error.code === 'ER_DUP_ENTRY' ){
      return res.json({
        status: 1,
        message: "Ya existe un descuento con ese nombre."
      });
    }

    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });

  }finally{
    connection.release();
  }

};


const disabledDiscountCatalog = async(req, res = response) => {

  const {
    idDiscountCatalog = 0
  } = req.body;

  const connection = await dbSPConnection.getConnection();

  try{

    const iId = parseInt( idDiscountCatalog ) || 0;

    if( iId == 0 ){
      return res.json({
        status: 1,
        message: "No se recibió el descuento a eliminar."
      });
    }

    // Baja lógica, igual que el resto de los catálogos del sistema: las
    // ventas viejas que usaron este descuento siguen siendo auditables.
    const [ oResult ] = await connection.query(
      `UPDATE discountcatalog
       SET active = 0
       WHERE idDiscountCatalog = ?`
      , [ iId ]
    );

    if( oResult.affectedRows == 0 ){
      return res.json({
        status: 1,
        message: "No se encontró el descuento a eliminar."
      });
    }

    res.json({
      status: 0,
      message: "Descuento eliminado con éxito."
    });

  }catch(error){

    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });

  }finally{
    connection.release();
  }

};


const cbxGetDiscountCatalogCombo = async(req, res = response) => {

  const {
    search = ''
  } = req.body;

  const connection = await dbSPConnection.getConnection();

  try{

    // Solo activos: son las cards que se pintan en el punto de venta.
    const [ oRows ] = await connection.query(
      `SELECT
           idDiscountCatalog
         , name
         , CAST(percentage AS DOUBLE) AS percentage
       FROM discountcatalog
       WHERE active = 1
         AND name LIKE ?
       ORDER BY percentage ASC`
      , [ `%${ search }%` ]
    );

    if( oRows.length == 0 ){

      res.json({
        status: 3,
        message: "No se encontró información.",
        data: null
      });

    }
    else{

      res.json({
        status: 0,
        message: "Ejecutado correctamente.",
        data: oRows
      });

    }

  }catch(error){

    res.json({
      status: 2,
      message: "Sucedió un error inesperado",
      data: error.message
    });

  }finally{
    connection.release();
  }

};


module.exports = {
    getDiscountCatalogListWithPage
  , insertUpdateDiscountCatalog
  , disabledDiscountCatalog
  , cbxGetDiscountCatalogCombo
}
