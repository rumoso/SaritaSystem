const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const {
  getDiscountCatalogListWithPage
    , insertUpdateDiscountCatalog
    , disabledDiscountCatalog
    , cbxGetDiscountCatalogCombo
  } = require('../controllers/discountCatalogController');


const router = Router();

router.post('/getDiscountCatalogListWithPage', getDiscountCatalogListWithPage);

router.post('/insertUpdateDiscountCatalog', [

  check('name','Nombre obligatorio').not().isEmpty(),

  check('percentage','Porcentaje obligatorio').not().isEmpty(),
  check('percentage','El porcentaje debe ser numérico').isNumeric(),

  validarCampos
], insertUpdateDiscountCatalog);

router.post('/disabledDiscountCatalog', [

  check('idDiscountCatalog','Id del descuento obligatorio').not().isEmpty(),
  check('idDiscountCatalog','Id del descuento debe ser numérico').isNumeric(),

  validarCampos
], disabledDiscountCatalog);

router.post('/cbxGetDiscountCatalogCombo', cbxGetDiscountCatalogCombo);

module.exports = router;
