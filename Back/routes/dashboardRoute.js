const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getResumenDia
    , getResumenPorVendedor
    , getInventario
    , getResumenMes
    , getTendencia
     } = require('../controllers/dashboardController');

const router = Router();

// Panel del director (SaritaPlan/analisis/002). Todo es de solo lectura y
// un endpoint por bloque, para que un bloque lento no tumbe a los otros.
//
// `idUserLogON` es obligatorio en todos: es con lo que se resuelve el
// permiso del panel (`dashboard_VerPanel`) y el de ver costos
// (`dashboard_VerCostos`).

const _aValidacion = [
    check('idUserLogON', 'El usuario es obligatorio').isInt({ gt: 0 }),
    validarCampos
];

router.post('/getResumenDia', _aValidacion, getResumenDia);

router.post('/getResumenPorVendedor', _aValidacion, getResumenPorVendedor);

router.post('/getInventario', _aValidacion, getInventario);

router.post('/getResumenMes', _aValidacion, getResumenMes);

router.post('/getTendencia', _aValidacion, getTendencia);

module.exports = router;
