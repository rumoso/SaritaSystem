-- =====================================================================
-- SOLO DATOS — para producción / cualquier ambiente donde la estructura
-- (tabla discountcatalog, columnas, etc.) ya se sincronizó con Workbench.
--
-- NO incluye: CREATE TABLE, ALTER TABLE, ni los 2 stored procedures que
-- se corrigieron en local (insertUpdateActionsConf, getActionSection) —
-- quedan a cargo del propio Workbench, según se confirmó.
--
-- Qué inserta:
--   1) Permiso especial "Administrar catálogo de descuentos"
--   2) Entrada de menú "Catálogo de descuentos" (Configuración)
--   3) Los 3 tipos de precio del catálogo (Precio 3 / 5 / 7)
--
-- Idempotente: se puede correr varias veces sin duplicar. Ningún ID se
-- fija a mano — se dejan en AUTO_INCREMENT y las referencias (sección,
-- menú padre) se resuelven por nombre, para que funcione aunque el
-- ambiente destino tenga ids distintos a los de local.
--
-- Referencia: SaritaPlan/analisis/001-descuentos-nota-venta.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Permiso especial: administrar el catálogo de % de descuento
--
-- Va en la sección "Ventas" (misma que ventas_changePrice y demás
-- permisos del punto de venta). Se resuelve por nombre de sección, no
-- por id, por si en este ambiente las secciones quedaron en otro orden.
-- ---------------------------------------------------------------------
INSERT INTO `actions`
  ( `createDate`, `idActionSection`, `name`, `nameHtml`, `description`, `active`, `nSpecial` )
SELECT
    NOW()
  , ( SELECT idActionSection FROM actionsection WHERE sectionName = 'Ventas' LIMIT 1 )
  , 'ventas_AdminCatDescuentos'
  , 'Administrar catálogo de descuentos'
  , 'Permite crear, editar y eliminar los porcentajes del catálogo de descuentos que se aplican en el punto de venta.'
  , 1
  , 0
WHERE NOT EXISTS (
  SELECT 1 FROM `actions` WHERE `name` = 'ventas_AdminCatDescuentos'
);

-- ---------------------------------------------------------------------
-- 2) Entrada de menú: Configuración > Catálogo de descuentos
--
-- OJO: el menú NO se ve solo por existir aquí. Hay que asignárselo a
-- cada usuario/rol desde "Permisos de menú" (tabla menupermisos), igual
-- que cualquier otro menú del sistema — eso es decisión de negocio, no
-- se automatiza en este script.
-- ---------------------------------------------------------------------
INSERT INTO `menus`
  ( `createDate`, `idMenuPadre`, `lugar`, `name`, `description`
  , `icon`, `linkCat`, `linkList`, `idAplication`, `active` )
SELECT
    NOW()
  , padre.idMenu
  , IFNULL( (
      SELECT MAX(lugar) + 1 FROM menus WHERE idMenuPadre = padre.idMenu
    ), 1 )
  , 'Catálogo de descuentos'
  , 'Porcentajes de descuento que se pueden aplicar en el punto de venta.'
  , NULL
  , NULL
  , 'catDescuentos'
  , 1
  , 1
FROM ( SELECT idMenu FROM menus WHERE name = 'Configuración' AND idMenuPadre = 0 LIMIT 1 ) AS padre
WHERE NOT EXISTS (
  SELECT 1 FROM `menus` WHERE `linkList` = 'catDescuentos'
);

-- ---------------------------------------------------------------------
-- 3) Catálogo de tipos de precio (cards del punto de venta)
--
-- Recordatorio: el % NO se resta al precio, se suma al costo — nunca
-- puede ser menor a 30 (piso de negocio costo + 30%), la tabla lo
-- refuerza con un CHECK.
-- ---------------------------------------------------------------------
INSERT INTO `discountcatalog` ( `createDate`, `name`, `percentage`, `active` )
SELECT NOW(), 'Precio 3', 30, 1
WHERE NOT EXISTS ( SELECT 1 FROM `discountcatalog` WHERE `name` = 'Precio 3' );

INSERT INTO `discountcatalog` ( `createDate`, `name`, `percentage`, `active` )
SELECT NOW(), 'Precio 5', 50, 1
WHERE NOT EXISTS ( SELECT 1 FROM `discountcatalog` WHERE `name` = 'Precio 5' );

INSERT INTO `discountcatalog` ( `createDate`, `name`, `percentage`, `active` )
SELECT NOW(), 'Precio 7', 75, 1
WHERE NOT EXISTS ( SELECT 1 FROM `discountcatalog` WHERE `name` = 'Precio 7' );

-- ---------------------------------------------------------------------
-- Verificación rápida al terminar
-- ---------------------------------------------------------------------
SELECT 'actions' AS tabla, idAction AS id, name FROM actions WHERE name = 'ventas_AdminCatDescuentos'
UNION ALL
SELECT 'menus', idMenu, name FROM menus WHERE linkList = 'catDescuentos'
UNION ALL
SELECT 'discountcatalog', idDiscountCatalog, CONCAT(name, ' (', percentage, '%)') FROM discountcatalog;
