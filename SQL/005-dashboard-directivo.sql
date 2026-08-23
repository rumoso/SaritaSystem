-- =====================================================================
-- 005 - Panel del director
-- Análisis: SaritaPlan/analisis/002-dashboard-directivo.md
-- Tareas:   SaritaPlan/tareas/002-dashboard-directivo.md  (T1, T2)
--
-- Idempotente: se puede correr varias veces sin duplicar.
--
-- Todo se resuelve POR NOMBRE, nunca por id fijo: los ids de menú y de
-- acción difieren entre la base local y producción, así que amarrarse a
-- un número aquí es garantía de que el script haga algo distinto en cada
-- ambiente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- T1 - Los dos permisos
--
-- Mismos nombres que VioletaSystem, a propósito: los dos sistemas
-- comparten código base y mantener los nombres alineados es lo que
-- permite portar el controller sin tocar la lógica de permisos.
--
-- nSpecial = 0 -> permiso de menú, no pide re-autorización en vivo.
--
-- La sección se resuelve por nombre; si no existiera 'Ventas' se cae a
-- la primera sección activa para que el INSERT no truene por FK.
-- ---------------------------------------------------------------------

INSERT INTO `actions`
  ( `createDate`, `idActionSection`
  , `name`, `nameHtml`, `description`, `active`, `nSpecial` )
SELECT
    NOW()
  , IFNULL(
      ( SELECT `idActionSection` FROM `actionsection` WHERE `sectionName` = 'Ventas' AND `active` = 1 LIMIT 1 )
    , ( SELECT `idActionSection` FROM `actionsection` WHERE `active` = 1 ORDER BY `iLugar` LIMIT 1 )
    )
  , 'dashboard_VerPanel'
  , 'Ver panel del director'
  , 'Da acceso a la pantalla del panel del director (indicadores del día, del mes, inventario y tendencia).'
  , 1
  , 0
WHERE NOT EXISTS (
  SELECT 1 FROM `actions` WHERE `name` = 'dashboard_VerPanel'
);

-- Permiso separado a propósito: un vendedor puede tener acceso al panel
-- sin ver el costo del inventario ni la utilidad del negocio. Sin este
-- permiso el servidor NO manda esos campos — no los manda ocultos para
-- que el Front los esconda.
INSERT INTO `actions`
  ( `createDate`, `idActionSection`
  , `name`, `nameHtml`, `description`, `active`, `nSpecial` )
SELECT
    NOW()
  , IFNULL(
      ( SELECT `idActionSection` FROM `actionsection` WHERE `sectionName` = 'Ventas' AND `active` = 1 LIMIT 1 )
    , ( SELECT `idActionSection` FROM `actionsection` WHERE `active` = 1 ORDER BY `iLugar` LIMIT 1 )
    )
  , 'dashboard_VerCostos'
  , 'Ver costos y utilidad en el panel'
  , 'Dentro del panel del director, permite ver el costo del inventario, la utilidad generada y el margen.'
  , 1
  , 0
WHERE NOT EXISTS (
  SELECT 1 FROM `actions` WHERE `name` = 'dashboard_VerCostos'
);

-- ---------------------------------------------------------------------
-- T2 - Menú padre "Dirección" y su entrada
--
-- `lugar = 0` para que quede antes de "Ventas" (que hoy es 1), igual
-- que en VioletaSystem.
--
-- OJO: el menú NO se ve solo por existir aquí. Hay que asignárselo al
-- usuario o al rol desde la pantalla de "Permisos de menú" (tabla
-- `menupermisos`), igual que `catDescuentos`.
-- ---------------------------------------------------------------------

INSERT INTO `menus`
  ( `createDate`, `idMenuPadre`, `lugar`, `name`, `description`
  , `icon`, `linkCat`, `linkList`, `idAplication`, `active` )
SELECT
    NOW()
  , 0
  , 0
  , 'Dirección'
  , 'Indicadores para la toma de decisiones.'
  , NULL
  , NULL
  , NULL
  , 1
  , 1
WHERE NOT EXISTS (
  SELECT 1 FROM `menus` WHERE `name` = 'Dirección' AND `idMenuPadre` = 0
);

-- El padre se resuelve por nombre. La subconsulta va envuelta en un
-- derivado (`AS X`) porque MySQL no deja leer la misma tabla que se está
-- insertando dentro del propio INSERT ... SELECT.
INSERT INTO `menus`
  ( `createDate`, `idMenuPadre`, `lugar`, `name`, `description`
  , `icon`, `linkCat`, `linkList`, `idAplication`, `active` )
SELECT
    NOW()
  , X.idMenu
  , 1
  , 'Panel del director'
  , 'La situación del negocio en una pantalla: el día, los vendedores, el inventario, el mes y la tendencia.'
  , NULL
  , NULL
  , 'dashboardDirector'
  , 1
  , 1
FROM ( SELECT `idMenu` FROM `menus` WHERE `name` = 'Dirección' AND `idMenuPadre` = 0 LIMIT 1 ) AS X
WHERE NOT EXISTS (
  SELECT 1 FROM ( SELECT `linkList` FROM `menus` ) AS Y WHERE Y.`linkList` = 'dashboardDirector'
);

-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
SELECT `idAction`, `name`, `nameHtml`, `active`
FROM `actions`
WHERE `name` IN ('dashboard_VerPanel', 'dashboard_VerCostos');

SELECT M.`idMenu`, M.`idMenuPadre`, M.`lugar`, M.`name`, M.`linkList`
FROM `menus` AS M
WHERE M.`name` = 'Dirección' OR M.`linkList` = 'dashboardDirector'
ORDER BY M.`idMenuPadre`, M.`lugar`;
