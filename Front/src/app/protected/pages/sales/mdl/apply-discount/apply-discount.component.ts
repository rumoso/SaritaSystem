import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { DiscountCatalogService } from 'src/app/protected/services/discount-catalog.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// =====================================================================
// Descuento sobre la nota de venta
// Análisis: SaritaPlan/analisis/001-descuentos-nota-venta.md
//
// Tres mecanismos, MUTUAMENTE EXCLUYENTES (aplicar uno recalcula la nota
// desde cero, descartando el anterior):
//
//  1) MONTO FIJO  -> se reparte proporcional al importe de cada línea y
//     se resta al precio.
//  2) % DE DESCUENTO -> se le baja ese porcentaje al precio de cada
//     línea.
//  3) TIPO DE PRECIO (catálogo) -> recalcula el precio de la línea con
//     el margen configurado en el catálogo.
//
// REGLA SUPER IMPORTANTE: ninguna línea con precio mínimo puede quedar
// por debajo de él (campo costPlusPorcent, ya calculado en la BD como
// costo + 30%). El precio de lista siempre gana sobre el mínimo:
//
//     precio_final = min( precio_lista, max( minimo, precio_calculado ) )
//
// OJO CON LOS TEXTOS DE ESTA PANTALLA: la ve el cajero. No debe
// mencionarse el costo del producto en ninguna etiqueta, mensaje ni
// ayuda — el cajero no tiene por qué deducir el costo a partir de los
// descuentos. Internamente sí se usa (costPlusPorcent), pero hacia
// afuera siempre se le llama "precio mínimo".
// =====================================================================

// Tolerancia para comparar pesos: evita que el ruido de punto flotante
// deje centavos colgados o marque líneas como "topadas" sin estarlo.
const EPSILON = 0.005;

@Component({
  selector: 'app-apply-discount',
  templateUrl: './apply-discount.component.html',
  // Estilos base del área de ventas (clases ns-*), igual que payments.
  styleUrls: ['../nsale/nsale.component.css', './apply-discount.component.css']
})
export class ApplyDiscountComponent implements OnInit {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  title: string = 'Agregar descuento';
  bShowSpinner: boolean = false;

  // Copia de trabajo de las líneas de la nota. No se toca el original
  // hasta que el usuario confirma.
  aLineas: any[] = [];

  aDescuentos: any[] = [];

  montoDescuento: any = '';
  porcentajeDescuento: any = '';
  oDescuentoSeleccionado: any = null;

  // Resultado del cálculo (vista previa)
  bCalculado: boolean = false;
  aResultado: any[] = [];
  aAvisos: string[] = [];
  nTotalOriginal: number = 0;
  nTotalNuevo: number = 0;
  nDescuentoSolicitado: number = 0;
  nDescuentoAplicado: number = 0;

  // Advertencia de nota mixta (líneas con precio mínimo + líneas sin él)
  bNotaMixta: boolean = false;

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private dialogRef: MatDialogRef<ApplyDiscountComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private discountServ: DiscountCatalogService
  ) { }

  ngOnInit(): void {

    // Copia profunda: si el usuario cancela, la nota queda intacta.
    this.aLineas = JSON.parse( JSON.stringify( this.ODataP.saleDetail || [] ) );

    this.nTotalOriginal = this.fn_sumImportes( this.aLineas );
    this.nTotalNuevo = this.nTotalOriginal;

    // Nota mixta: hay líneas de producto (con precio mínimo) y líneas de
    // taller (sin él) al mismo tiempo. El taller absorbe sin límite todo
    // lo que las de producto rechazan al topar, así que hay que avisarlo.
    const bHayProducto = this.aLineas.some( x => this.fn_esProducto(x) );
    const bHayTaller   = this.aLineas.some( x => this.fn_esTaller(x) );
    this.bNotaMixta = bHayProducto && bHayTaller;

    this.fn_cbxGetDiscountCatalogCombo();

  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CLASIFICACIÓN DE LÍNEAS
//////////////////////////////////////////////////////////////////////////////////////////////////

  // Taller / sobre: no tiene precio mínimo.
  fn_esTaller( linea: any ): boolean {
    return !linea.idProduct || linea.idProduct == 0;
  }

  // Producto del catálogo bien capturado: sí tiene precio mínimo.
  fn_esProducto( linea: any ): boolean {
    return !this.fn_esTaller( linea ) && this.fn_toNumber( linea.cost ) > 0;
  }

  // Producto del catálogo con datos incompletos: no se le puede calcular
  // el precio mínimo, así que se deja fuera del descuento.
  fn_esProductoIncompleto( linea: any ): boolean {
    return !this.fn_esTaller( linea ) && this.fn_toNumber( linea.cost ) <= 0;
  }

  fn_minimoDeLinea( linea: any ): number {
    return this.fn_toNumber( linea.costPlusPorcent );
  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CÁLCULO
//////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * TIPO DE PRECIO (card del catálogo): recalcula el precio de cada
   * línea con el margen configurado.
   */
  fn_aplicarTipoPrecio( oDescuento: any ){

    this.oDescuentoSeleccionado = oDescuento;
    this.montoDescuento = '';        // los mecanismos son excluyentes
    this.porcentajeDescuento = '';

    const nPorcentaje = this.fn_toNumber( oDescuento.percentage );

    const aAvisos: string[] = [];
    const aResultado: any[] = [];

    for( const oLinea of this.aLineas ){

      const oNueva = { ...oLinea };
      const nCantidad = this.fn_toNumber( oLinea.cantidad ) || 1;
      const nPrecioLista = this.fn_toNumber( oLinea.precioUnitario );

      if( this.fn_esTaller( oLinea ) ){
        aAvisos.push( `"${ oLinea.productDesc }" es de taller, no se le puede aplicar un tipo de precio.` );
        aResultado.push( this.fn_lineaSinCambio( oNueva, nPrecioLista, nCantidad ) );
        continue;
      }

      if( this.fn_esProductoIncompleto( oLinea ) ){
        aAvisos.push( `"${ oLinea.productDesc }" tiene información incompleta, no se le puede aplicar descuento.` );
        aResultado.push( this.fn_lineaSinCambio( oNueva, nPrecioLista, nCantidad ) );
        continue;
      }

      const nBase = this.fn_toNumber( oLinea.cost );
      const nMinimo = this.fn_minimoDeLinea( oLinea );

      const nPrecioCalculado = this.fn_round2( nBase * ( 1 + nPorcentaje / 100 ) );
      const nPrecioFinal = Math.min( nPrecioLista, Math.max( nMinimo, nPrecioCalculado ) );

      const nDescuentoUnitario = this.fn_round2( nPrecioLista - nPrecioFinal );

      if( nDescuentoUnitario <= EPSILON ){
        aAvisos.push( `"${ oLinea.productDesc }" ya se vende a ese precio o por debajo, se mantiene su precio actual.` );
        aResultado.push( this.fn_lineaSinCambio( oNueva, nPrecioLista, nCantidad ) );
        continue;
      }

      oNueva.descuento = nDescuentoUnitario;
      oNueva.precio = this.fn_round2( nPrecioLista - nDescuentoUnitario );
      oNueva.importe = this.fn_round2( oNueva.precio * nCantidad );

      aResultado.push( oNueva );

    }

    this.fn_publicarResultado( aResultado, aAvisos, 'tipoPrecio' );

  }

  /**
   * % DE DESCUENTO: le baja ese porcentaje al precio de cada línea,
   * sin pasarse del precio mínimo.
   */
  fn_aplicarPorcentajeDescuento(){

    this.oDescuentoSeleccionado = null;   // los mecanismos son excluyentes
    this.montoDescuento = '';

    const nPorcentaje = this.fn_toNumber( this.porcentajeDescuento );

    if( nPorcentaje <= 0 ){
      this.fn_resetResultado();
      return;
    }

    const aAvisos: string[] = [];
    const aResultado: any[] = [];

    for( const oLinea of this.aLineas ){

      const oNueva = { ...oLinea };
      const nCantidad = this.fn_toNumber( oLinea.cantidad ) || 1;
      const nPrecioLista = this.fn_toNumber( oLinea.precioUnitario );

      if( this.fn_esProductoIncompleto( oLinea ) ){
        aAvisos.push( `"${ oLinea.productDesc }" tiene información incompleta, no se le puede aplicar descuento.` );
        aResultado.push( this.fn_lineaSinCambio( oNueva, nPrecioLista, nCantidad ) );
        continue;
      }

      const nPrecioCalculado = this.fn_round2( nPrecioLista * ( 1 - nPorcentaje / 100 ) );

      // El taller no tiene precio mínimo: puede bajar hasta cero.
      const nMinimo = this.fn_esTaller( oLinea ) ? 0 : this.fn_minimoDeLinea( oLinea );

      // Si la línea ya está en o por debajo de su mínimo, no tiene nada
      // que ceder: se queda como está (nunca se le sube el precio).
      const nPrecioFinal = Math.min( nPrecioLista, Math.max( nMinimo, nPrecioCalculado ) );

      const nDescuentoUnitario = this.fn_round2( nPrecioLista - nPrecioFinal );

      if( nDescuentoUnitario <= EPSILON ){
        aAvisos.push( `"${ oLinea.productDesc }" ya está en su precio mínimo permitido, no se le puede aplicar descuento.` );
        aResultado.push( this.fn_lineaSinCambio( oNueva, nPrecioLista, nCantidad ) );
        continue;
      }

      // Topó: no alcanzó a recibir el % completo.
      const nDescuentoCompleto = this.fn_round2( nPrecioLista * ( nPorcentaje / 100 ) );

      if( ( nDescuentoCompleto - nDescuentoUnitario ) > EPSILON ){
        aAvisos.push(
          `"${ oLinea.productDesc }" solo pudo recibir ${ this.fn_money( nDescuentoUnitario * nCantidad ) } `
          + `de descuento; más lo dejaría por debajo de su precio mínimo.`
        );
      }

      oNueva.descuento = nDescuentoUnitario;
      oNueva.precio = this.fn_round2( nPrecioLista - nDescuentoUnitario );
      oNueva.importe = this.fn_round2( oNueva.precio * nCantidad );

      aResultado.push( oNueva );

    }

    this.fn_publicarResultado( aResultado, aAvisos, 'porcentaje' );

  }

  /**
   * MONTO FIJO: reparte proporcional al importe, respeta el precio
   * mínimo por línea y redistribuye lo que no se pudo aplicar.
   */
  fn_aplicarMonto(){

    this.oDescuentoSeleccionado = null;   // los mecanismos son excluyentes
    this.porcentajeDescuento = '';

    const nMonto = this.fn_toNumber( this.montoDescuento );

    if( nMonto <= 0 ){
      this.fn_resetResultado();
      return;
    }

    const aAvisos: string[] = [];

    // Capacidad = cuánto descuento total (en pesos, ya por la cantidad)
    // puede absorber cada línea antes de topar su precio mínimo.
    const aTrabajo = this.aLineas.map( oLinea => {

      const nCantidad = this.fn_toNumber( oLinea.cantidad ) || 1;
      const nPrecioActual = this.fn_toNumber( oLinea.precio ) || this.fn_toNumber( oLinea.precioUnitario );
      const nImporte = this.fn_round2( nPrecioActual * nCantidad );

      let nCapacidad = 0;

      if( this.fn_esTaller( oLinea ) ){
        // Sin precio mínimo: puede absorber hasta quedar en cero.
        nCapacidad = nImporte;
      }
      else if( this.fn_esProductoIncompleto( oLinea ) ){
        nCapacidad = 0;
      }
      else {
        const nMinimo = this.fn_minimoDeLinea( oLinea );
        nCapacidad = Math.max( 0, this.fn_round2( ( nPrecioActual - nMinimo ) * nCantidad ) );
      }

      return {
        oLinea: oLinea
        , nCantidad: nCantidad
        , nPrecioActual: nPrecioActual
        , nImporte: nImporte
        , nCapacidad: nCapacidad
        , nAsignado: 0
      };

    });

    // --- Reparto proporcional con redistribución ---
    // Cada pasada reparte lo que falta entre las líneas que todavía
    // tienen margen. Una pasada o termina de repartir todo, o satura al
    // menos una línea, así que el ciclo siempre converge.
    let nRestante = nMonto;
    let iGuarda = 0;

    while( nRestante > EPSILON && iGuarda <= aTrabajo.length + 1 ){

      iGuarda++;

      const aElegibles = aTrabajo.filter( x => ( x.nCapacidad - x.nAsignado ) > EPSILON );

      if( aElegibles.length == 0 ) break;

      const nBase = aElegibles.reduce( (sum, x) => sum + x.nImporte, 0 );

      if( nBase <= 0 ) break;

      const nARepartir = nRestante;
      let bHuboAsignacion = false;

      for( const oT of aElegibles ){

        const nProporcion = oT.nImporte / nBase;
        const nDeseado = nARepartir * nProporcion;
        const nLibre = oT.nCapacidad - oT.nAsignado;
        const nDar = Math.min( nDeseado, nLibre );

        if( nDar > 0 ){
          oT.nAsignado += nDar;
          nRestante -= nDar;
          bHuboAsignacion = true;
        }

      }

      if( !bHuboAsignacion ) break;

    }

    // --- Redondeo a 2 decimales y ajuste del residuo ---
    // Redondear cada línea por separado deja centavos sueltos; el
    // sobrante se le carga a la línea con más margen disponible para
    // que la suma de líneas cuadre exacto con el total de la nota.
    for( const oT of aTrabajo ){
      oT.nAsignado = this.fn_round2( oT.nAsignado );
      if( oT.nAsignado > oT.nCapacidad ) oT.nAsignado = oT.nCapacidad;
    }

    const nAplicadoAntesDeAjuste = this.fn_round2(
      aTrabajo.reduce( (sum, x) => sum + x.nAsignado, 0 )
    );

    let nResiduo = this.fn_round2( Math.min( nMonto, this.fn_capacidadTotal( aTrabajo ) ) - nAplicadoAntesDeAjuste );

    if( Math.abs( nResiduo ) > 0 ){

      const aConMargen = aTrabajo
        .filter( x => ( x.nCapacidad - x.nAsignado ) >= nResiduo )
        .sort( (a, b) => b.nImporte - a.nImporte );

      if( aConMargen.length > 0 ){
        aConMargen[0].nAsignado = this.fn_round2( aConMargen[0].nAsignado + nResiduo );
      }

    }

    // --- Construcción de las líneas resultantes y sus avisos ---
    const aResultado: any[] = [];

    for( const oT of aTrabajo ){

      const oNueva = { ...oT.oLinea };
      const oLinea = oT.oLinea;

      if( oT.nCapacidad <= EPSILON ){

        if( this.fn_esProductoIncompleto( oLinea ) ){
          aAvisos.push( `"${ oLinea.productDesc }" tiene información incompleta, no se le puede aplicar descuento.` );
        }
        else if( this.fn_esProducto( oLinea ) ){
          aAvisos.push( `"${ oLinea.productDesc }" ya está en su precio mínimo permitido, no se le puede aplicar descuento.` );
        }

        aResultado.push( this.fn_lineaSinCambio( oNueva, oT.nPrecioActual, oT.nCantidad ) );
        continue;

      }

      // Topó: recibió menos de lo que le tocaba proporcionalmente.
      const nProporcional = nMonto * ( oT.nImporte / this.nTotalOriginal );

      if( ( nProporcional - oT.nAsignado ) > EPSILON && this.fn_esProducto( oLinea ) ){
        aAvisos.push(
          `"${ oLinea.productDesc }" solo pudo recibir ${ this.fn_money( oT.nAsignado ) } de descuento; `
          + `más lo dejaría por debajo de su precio mínimo.`
        );
      }

      const nDescuentoUnitario = this.fn_round2( oT.nAsignado / oT.nCantidad );

      oNueva.descuento = this.fn_round2( this.fn_toNumber( oLinea.descuento ) + nDescuentoUnitario );
      oNueva.precio = this.fn_round2( oT.nPrecioActual - nDescuentoUnitario );
      oNueva.importe = this.fn_round2( oNueva.precio * oT.nCantidad );

      aResultado.push( oNueva );

    }

    const nTotalAplicado = this.fn_round2(
      aTrabajo.reduce( (sum, x) => sum + x.nAsignado, 0 )
    );

    const nNoAplicado = this.fn_round2( nMonto - nTotalAplicado );

    if( nNoAplicado > EPSILON ){
      aAvisos.push(
        `No se pudieron aplicar ${ this.fn_money( nNoAplicado ) } del descuento: `
        + `ningún producto de la nota tiene margen suficiente.`
      );
    }

    this.fn_publicarResultado( aResultado, aAvisos, 'monto' );

  }

  fn_capacidadTotal( aTrabajo: any[] ): number {
    return this.fn_round2( aTrabajo.reduce( (sum, x) => sum + x.nCapacidad, 0 ) );
  }

  fn_lineaSinCambio( oNueva: any, nPrecio: number, nCantidad: number ): any {
    oNueva.descuento = this.fn_toNumber( oNueva.descuento );
    oNueva.precio = this.fn_round2( nPrecio );
    oNueva.importe = this.fn_round2( nPrecio * nCantidad );
    return oNueva;
  }

  fn_publicarResultado( aResultado: any[], aAvisos: string[], sTipo: string ){

    this.aResultado = aResultado;
    this.aAvisos = aAvisos;
    this.nTotalNuevo = this.fn_sumImportes( aResultado );
    this.nDescuentoAplicado = this.fn_round2( this.nTotalOriginal - this.nTotalNuevo );
    this.nDescuentoSolicitado = sTipo == 'monto'
      ? this.fn_toNumber( this.montoDescuento )
      : this.nDescuentoAplicado;
    this.bCalculado = true;

  }

  fn_resetResultado(){
    this.bCalculado = false;
    this.aResultado = [];
    this.aAvisos = [];
    this.nTotalNuevo = this.nTotalOriginal;
    this.nDescuentoAplicado = 0;
    this.nDescuentoSolicitado = 0;
  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

  fn_toNumber( x: any ): number {
    const n = parseFloat( x );
    return isNaN( n ) ? 0 : n;
  }

  fn_round2( n: number ): number {
    return Math.round( ( n + Number.EPSILON ) * 100 ) / 100;
  }

  fn_money( n: number ): string {
    return '$' + this.fn_round2( n ).toFixed(2);
  }

  fn_sumImportes( aLineas: any[] ): number {
    return this.fn_round2( aLineas.reduce( (sum, x) => sum + this.fn_toNumber( x.importe ), 0 ) );
  }

  fn_limpiar(){
    this.montoDescuento = '';
    this.porcentajeDescuento = '';
    this.oDescuentoSeleccionado = null;
    this.fn_resetResultado();
  }

  fn_puedeAplicar(): boolean {
    return this.bCalculado && this.nDescuentoAplicado > EPSILON;
  }

  fn_aplicar(){

    if( !this.fn_puedeAplicar() ) return;

    this.dialogRef.close({
      bAplicado: true
      , saleDetail: this.aResultado
      , aAvisos: this.aAvisos
      , nDescuentoAplicado: this.nDescuentoAplicado
    });

  }

  fn_CerrarMDL(){
    this.dialogRef.close( null );
  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

  fn_cbxGetDiscountCatalogCombo(){

    this.bShowSpinner = true;

    this.discountServ.CCbxGetDiscountCatalogCombo('')
    .subscribe({
      next: (resp: ResponseGet) => {

        this.aDescuentos = resp.status === 0 ? resp.data : [];
        this.bShowSpinner = false;

      },
      error: (ex: HttpErrorResponse) => {

        this.servicesGServ.showSnakbar( "Problemas con el servicio" );
        this.bShowSpinner = false;

      }
    })

  }

}
