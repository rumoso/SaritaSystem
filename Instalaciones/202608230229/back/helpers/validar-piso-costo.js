const { dbSPConnection } = require('../database/config');

// =====================================================================
// REGLA DE NEGOCIO SUPER IMPORTANTE
// Ningún producto CON COSTO puede venderse por debajo de costo + 30%.
// Análisis: SaritaPlan/analisis/001-descuentos-nota-venta.md
//
// Esta validación es el respaldo del lado servidor: el Front ya valida,
// pero cualquiera que pegue directo a la API (Postman, otro cliente) se
// saltaría la regla si esto no existiera.
//
// Alcance — solo aplica a líneas que manejan costo:
//   - Productos del catálogo (idProduct > 0 y cost > 0): SÍ aplica.
//   - Taller / sobre (idProduct = 0): NO aplica, no manejan costo.
//   - Producto con costo NULL/0 (dato mal capturado): NO aplica, no hay
//     piso que calcular.
//
// El costo y el precio de lista se leen de `products`, NO de lo que
// mandó el cliente: si se confiara en el body, bastaría con mandar
// cost = 0 para saltarse el piso.
// =====================================================================

const PORCENTAJE_PISO = 1.30;

// Los precios se guardan como float; comparar con tolerancia evita
// falsos rechazos por ruido de punto flotante (129.99999 vs 130).
const TOLERANCIA = 0.01;

/**
 * Revisa las líneas de una venta contra el piso de costo.
 *
 * @param {Array} saleDetail líneas tal como llegan en el body
 * @returns {Promise<{ bOK: boolean, message: string }>}
 */
const validarPisoCosto = async( saleDetail = [] ) => {

  const aLineasConProducto = ( saleDetail || [] )
    .filter( x => parseInt( x.idProduct ) > 0 );

  // Venta de puro taller/sobre: no hay nada que validar.
  if( aLineasConProducto.length == 0 ){
    return { bOK: true, message: '' };
  }

  const aIdProducts = [ ...new Set( aLineasConProducto.map( x => parseInt( x.idProduct ) ) ) ];

  const connection = await dbSPConnection.getConnection();

  try{

    const [ oProducts ] = await connection.query(
      `SELECT idProduct, name, cost, price
       FROM products
       WHERE idProduct IN (?)`
      , [ aIdProducts ]
    );

    const oProductsById = new Map( oProducts.map( p => [ Number( p.idProduct ), p ] ) );

    const aViolaciones = [];

    for( const oLinea of aLineasConProducto ){

      const oProduct = oProductsById.get( parseInt( oLinea.idProduct ) );

      // Producto que no existe: no es asunto de esta validación, el SP
      // de la venta lo rechazará por la foreign key.
      if( !oProduct ) continue;

      const nCost = parseFloat( oProduct.cost );

      // Sin costo capturado: no hay piso que calcular.
      if( !nCost || nCost <= 0 ) continue;

      const nPrecioLista = parseFloat( oProduct.price ) || 0;
      const nPiso = Math.round( nCost * PORCENTAJE_PISO * 100 ) / 100;

      // El precio de lista siempre gana sobre el piso: si el jefe puso
      // un precio de lista por debajo del piso, ese producto se vende a
      // su precio de lista y no hay descuento que darle. Sin este min()
      // la validación trabaría la venta normal de esos productos.
      const nLimite = nPrecioLista > 0 ? Math.min( nPiso, nPrecioLista ) : nPiso;

      const nPrecio = parseFloat( oLinea.precio );

      if( nPrecio < ( nLimite - TOLERANCIA ) ){
        aViolaciones.push(
          `"${ oProduct.name }" no puede venderse en $${ nPrecio.toFixed(2) }, `
          + `su precio mínimo permitido es $${ nLimite.toFixed(2) }`
        );
      }

    }

    if( aViolaciones.length > 0 ){
      return {
        bOK: false,
        message: 'No se registró la venta porque hay productos por debajo de su precio mínimo: '
               + aViolaciones.join('; ') + '.'
      };
    }

    return { bOK: true, message: '' };

  }finally{
    connection.release();
  }

};

module.exports = {
    validarPisoCosto
  , PORCENTAJE_PISO
}
