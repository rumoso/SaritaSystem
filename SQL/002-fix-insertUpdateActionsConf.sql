-- =====================================================================
-- FIX: no se podían guardar permisos desde la pantalla de Roles/Usuarios
--
-- Síntoma: al marcar un permiso y guardar, el sistema respondía
-- "No pudieron guardar los permisos" (status 2). Quitar permisos sí
-- funcionaba; agregarlos nunca.
--
-- Causa: actionsconf.idActionsConf es la PRIMARY KEY, NOT NULL y SIN
-- auto_increment (el auto_increment es keyx). El SP insertaba sin dar
-- ese campo:
--
--     INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
--     VALUES (NOW(), ...);
--
-- lo que con STRICT_TRANS_TABLES revienta con:
--     ERROR 1364: Field 'idActionsConf' doesn't have a default value
--
-- El EXIT HANDLER del propio SP se tragaba ese error y devolvía
-- out_id = 0, que el Back traducía al mensaje genérico. Por eso nunca
-- se vio la causa real.
--
-- Solución: generar el id con getIDKeyByUserWithOUT (la misma convención
-- que usan insertMenuPermisoByIdRelation y el resto de las tablas con
-- este patrón: id = CONCAT(idUser, consecutivo)). Se llama DENTRO del
-- ciclo porque cada renglón necesita su propio id.
--
-- Bug preexistente, independiente del análisis 001.
-- =====================================================================

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
        -- Capturar el mensaje de error
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
                -- Insertar si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM actionsconf
                    WHERE relationType = p_relationType
                      AND idRelation = p_idRelation
                      AND idAction = v_idAction
                      AND active = 1
                ) THEN

                    -- idActionsConf es PK sin auto_increment: hay que
                    -- generarlo aquí, uno por renglón insertado.
                    CALL getIDKeyByUserWithOUT( p_idUserLogON, @idNew );

                    INSERT INTO actionsconf (idActionsConf, createDate, relationType, idRelation, idAction, active)
                    VALUES (@idNew, NOW(), p_relationType, p_idRelation, v_idAction, 1);

                END IF;
            ELSE
                -- Eliminar si existe y está activo
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
