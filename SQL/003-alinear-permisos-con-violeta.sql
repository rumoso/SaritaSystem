-- =====================================================================
-- Alinear el esquema de permisos de Sarita con el de Violeta
--
-- Contexto completo: SaritaPlan/docs/divergencia-permisos-vs-violeta.md
--
-- Los stored procedures de permisos son los mismos en Sarita y Violeta
-- (se copian de uno a otro), pero el esquema de Sarita se quedó en la
-- versión vieja. Los SPs insertan sin dar la PK porque en Violeta esa
-- columna es AUTO_INCREMENT; en Sarita no lo es y truena con
-- "ERROR 1364: Field ... doesn't have a default value".
--
-- Qué arregla:
--   * Otorgar permisos a un rol/usuario   (insertUpdateActionsConf)
--   * Crear una acción nueva              (insertUpdateAction)
--   * Crear una sección de acciones       (insertUpdateActionSection)
--
-- Estas tablas NO participan en la sincronización entre sucursales
-- (solo productos y usuarios se sincronizan), así que se puede quitar el
-- esquema de ids distribuidos (keyx + PK manual generada con
-- getIDKeyByUserWithOUT) sin riesgo de choque de ids.
--
-- ANTES DE CORRER: respaldar. Ejemplo del respaldo que se tomó en local:
--   mysqldump -u USER -p db_sarita actions actionsconf actionsection > pre-migracion-permisos.sql
--
-- NO es idempotente: correrlo dos veces falla en el DROP COLUMN. Es a
-- propósito — que truene es mejor que dejar el esquema a medias.
-- =====================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------
-- 1. actionsconf  ->  idActionsConf AUTO_INCREMENT, sin keyx
--
-- Una tabla solo admite UNA columna AUTO_INCREMENT, así que primero se
-- va keyx y después se marca la PK.
-- ---------------------------------------------------------------------
ALTER TABLE `actionsconf` DROP COLUMN `keyx`;
ALTER TABLE `actionsconf` MODIFY `idActionsConf` BIGINT NOT NULL AUTO_INCREMENT;

-- ---------------------------------------------------------------------
-- 2. actions  ->  idAction AUTO_INCREMENT, sin keyx
--
-- actionsconf.idAction tiene FK contra actions.idAction. Se suelta y se
-- vuelve a poner: los VALORES no cambian, solo se le agrega el
-- AUTO_INCREMENT a la columna, pero MySQL no deja alterar una columna
-- referenciada con la FK puesta.
-- ---------------------------------------------------------------------
ALTER TABLE `actionsconf` DROP FOREIGN KEY `fk_actionsconf_actions1`;

ALTER TABLE `actions` DROP COLUMN `keyx`;
ALTER TABLE `actions` MODIFY `idAction` BIGINT NOT NULL AUTO_INCREMENT;

ALTER TABLE `actionsconf`
  ADD CONSTRAINT `fk_actionsconf_actions1`
  FOREIGN KEY (`idAction`) REFERENCES `actions` (`idAction`);

-- ---------------------------------------------------------------------
-- 3. actionsection  ->  agregar iLugar (columna que Sarita nunca tuvo)
--    y volver la PK AUTO_INCREMENT.
--
-- OJO: lo del AUTO_INCREMENT aquí va MÁS ALLÁ de Violeta. Violeta
-- tampoco lo tiene, así que allá crear secciones también truena con el
-- mismo ERROR 1364 — es un bug latente en los dos sistemas, nada más que
-- casi nadie usa esa pantalla. Se corrige aquí y conviene aplicar el
-- mismo arreglo en Violeta.
--
-- iLugar es el orden en que se pintan las secciones; se inicializa con
-- el propio idActionSection para conservar el orden actual.
-- ---------------------------------------------------------------------
ALTER TABLE `actions` DROP FOREIGN KEY `fk_actions_actionsection1`;

ALTER TABLE `actionsection` ADD COLUMN `iLugar` INT NULL AFTER `sectionName`;
UPDATE `actionsection` SET `iLugar` = `idActionSection` WHERE `iLugar` IS NULL;

ALTER TABLE `actionsection` DROP COLUMN `keyx`;
ALTER TABLE `actionsection` MODIFY `idActionSection` BIGINT NOT NULL AUTO_INCREMENT;

ALTER TABLE `actions`
  ADD CONSTRAINT `fk_actions_actionsection1`
  FOREIGN KEY (`idActionSection`) REFERENCES `actionsection` (`idActionSection`);

COMMIT;

-- ---------------------------------------------------------------------
-- 3b. getActionSection ya no puede seleccionar actionsection.keyx,
--     porque la columna se acaba de eliminar (quedaba ERROR 1054).
--     El Front no usa ese campo, así que se quita del SELECT y se
--     aprovecha para ordenar por iLugar, que es justamente para lo que
--     existe esa columna.
--
--     En Violeta este SP sigue seleccionando keyx y allá funciona
--     porque su actionsection todavía tiene la columna.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `getActionSection`;

DELIMITER $$

CREATE PROCEDURE `getActionSection`()
BEGIN

    SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

    SELECT
      ASS.idActionSection
    , ASS.sectionName
    , ASS.iLugar
    , ASS.active
    FROM actionsection ASS
    ORDER BY ASS.iLugar ASC, ASS.idActionSection ASC;

    SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 4. Revertir el parche 002: con el esquema ya alineado, el SP vuelve a
--    ser exactamente el mismo que el de Violeta (inserta sin dar la PK,
--    porque ahora sí es AUTO_INCREMENT).
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `insertUpdateActionsConf`;

DELIMITER $$

CREATE PROCEDURE `insertUpdateActionsConf`(
    IN p_relationType VARCHAR(10),
    IN p_idRelation INT,
    IN p_jsonList JSON,
    IN p_idUserLogON INT
)
BEGIN
    DECLARE totalRows INT DEFAULT 0;
    DECLARE i INT DEFAULT 0;
    DECLARE v_idAction INT;
    DECLARE v_bPermissionAction INT;

    DECLARE mensaje_error TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 mensaje_error = MESSAGE_TEXT;
        SELECT 0 AS out_id, mensaje_error AS message;
    END;

    SET totalRows = IFNULL(JSON_LENGTH(p_jsonList), 0);

    SET @out_id = 0;
    SET @message = '';

    IF p_idRelation > 0 AND LENGTH(p_relationType) > 0 AND p_relationType IN('R','U') THEN

        WHILE i < totalRows DO
            SET v_idAction = IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_jsonList, CONCAT('$[', i, '].idAction'))) AS UNSIGNED), 0);
            SET v_bPermissionAction = IFNULL(CAST(JSON_UNQUOTE(JSON_EXTRACT(p_jsonList, CONCAT('$[', i, '].bPermissionAction'))) AS UNSIGNED), 0);

            IF v_bPermissionAction = 1 THEN
                IF NOT EXISTS (
                    SELECT 1 FROM actionsconf
                    WHERE relationType = p_relationType
                      AND idRelation = p_idRelation
                      AND idAction = v_idAction
                      AND active = 1
                ) THEN
                    INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
                    VALUES (NOW(), p_relationType, p_idRelation, v_idAction, 1);
                END IF;
            ELSE
                DELETE FROM actionsconf
                WHERE relationType = p_relationType
                  AND idRelation = p_idRelation
                  AND idAction = v_idAction
                  AND active = 1;
            END IF;

            SET i = i + 1;
        END WHILE;

        SET @out_id = 1;
        SET @message = 'Guardado con éxito.';
    ELSE
        SET @out_id = 0;
        SET @message = 'No se pudo guardar.';
    END IF;

    SELECT @out_id AS out_id, @message AS message;
END$$

DELIMITER ;
