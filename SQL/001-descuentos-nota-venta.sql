-- =====================================================================
-- 001 - Descuentos sobre nota de venta
-- Análisis: SaritaPlan/analisis/001-descuentos-nota-venta.md
--
-- T1 - Catálogo de % de descuento (margen sobre costo)
-- T2 - Permiso especial para administrar el catálogo
--
-- Idempotente: se puede correr varias veces sin duplicar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- T1 - Tabla discountcatalog
--
-- El % NO es un descuento sobre el precio: es el margen sobre costo con
-- el que se recalcula el precio de venta -> precio = cost * (1 + %/100).
-- Por eso el mínimo es 30: es el piso de negocio (costo + 30%).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `discountcatalog` (
    `idDiscountCatalog` BIGINT       NOT NULL AUTO_INCREMENT
  , `createDate`        DATETIME     NULL
  , `name`              VARCHAR(200) NOT NULL
  , `percentage`        DECIMAL(6,2) NOT NULL
  , `active`            SMALLINT     NULL DEFAULT 1
  , PRIMARY KEY (`idDiscountCatalog`)
  , UNIQUE KEY `name_UNIQUE` (`name`)
  , CONSTRAINT `ck_discountcatalog_percentage_min`
      CHECK (`percentage` >= 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- ---------------------------------------------------------------------
-- T2 - Permiso especial: administrar el catálogo de % de descuento
--
-- nSpecial = 0 -> permiso de menú (no pide re-autorización en vivo).
-- Sección 1 = Ventas, para agruparlo con ventas_changePrice y demás.
-- ---------------------------------------------------------------------
INSERT INTO `actions`
  ( `idAction`, `createDate`, `idActionSection`
  , `name`, `nameHtml`, `description`, `active`, `nSpecial` )
SELECT
    11522
  , NOW()
  , 1
  , 'ventas_AdminCatDescuentos'
  , 'Administrar catálogo de descuentos'
  , 'Permite crear, editar y eliminar los porcentajes del catálogo de descuentos que se aplican en el punto de venta.'
  , 1
  , 0
WHERE NOT EXISTS (
  SELECT 1 FROM `actions` WHERE `name` = 'ventas_AdminCatDescuentos'
);

-- ---------------------------------------------------------------------
-- T2b - Entrada de menú (Configuración > Catálogo de descuentos)
--
-- OJO: el menú NO se ve solo por existir aquí. Hay que asignárselo a
-- cada usuario desde la pantalla de "Permisos de menú" (tabla
-- menupermisos), igual que cualquier otro menú del sistema.
-- ---------------------------------------------------------------------
INSERT INTO `menus`
  ( `createDate`, `idMenuPadre`, `lugar`, `name`, `description`
  , `icon`, `linkCat`, `linkList`, `idAplication`, `active` )
SELECT
    NOW()
  , 11              -- Configuración
  , 2               -- después de "Tipos de Cambio"
  , 'Catálogo de descuentos'
  , 'Porcentajes de descuento que se pueden aplicar en el punto de venta.'
  , NULL
  , NULL
  , 'catDescuentos'
  , 1
  , 1
WHERE NOT EXISTS (
  SELECT 1 FROM `menus` WHERE `linkList` = 'catDescuentos'
);
