-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: db_sarita
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actions`
--

DROP TABLE IF EXISTS `actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actions` (
  `keyx` bigint NOT NULL AUTO_INCREMENT,
  `idAction` bigint NOT NULL,
  `createDate` datetime DEFAULT NULL,
  `idActionSection` bigint NOT NULL,
  `name` varchar(500) DEFAULT NULL,
  `nameHtml` varchar(500) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `active` smallint DEFAULT NULL,
  `nSpecial` smallint DEFAULT '0',
  PRIMARY KEY (`idAction`),
  UNIQUE KEY `keyx_UNIQUE` (`keyx`),
  KEY `fk_actions_actionsection1_idx` (`idActionSection`),
  CONSTRAINT `fk_actions_actionsection1` FOREIGN KEY (`idActionSection`) REFERENCES `actionsection` (`idActionSection`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actions`
--

LOCK TABLES `actions` WRITE;
/*!40000 ALTER TABLE `actions` DISABLE KEYS */;
INSERT INTO `actions` VALUES (1,1226,'2023-08-18 00:29:15',3,'users_CrearModificar','Crear y modificar usuarios','Este permiso te permite crear y modificar usuario',1,0),(2,1320,'2023-09-03 04:53:06',3,'users_Disable','Deshabilitar usuarios','Este permiso te permite deshabilitar usuarios',1,0),(3,1324,'2023-09-03 19:14:09',1,'ventas_Crear','Crear Ventas','Este permiso te permite crear y modificar ventas',1,0),(4,1325,'2023-09-03 19:15:26',1,'ventas_Cancelar','Cancelar Ventas','Es para cancelar ventas',1,0),(5,1326,'2023-09-03 19:25:18',1,'ventas_RegistrarPagos','Registrar pagos','Es para poder registrar pagos',1,0),(8,1346,'2023-09-03 19:48:38',1,'ventas_consRegresarAInventario','Regresar producto al inventario apartir de consignación ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder regresar al inventario de una consignación',1,0),(9,1386,'2023-09-04 07:08:23',1,'ventas_consVentaContado','\nCrear venta de contado apartir de consignación ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder autorizar la creación de ventas de contado a partir de una consignación',1,0),(10,11492,'2023-12-31 00:09:33',1,'ventas_consVentaCredito','\nCrear venta de crédito apartir de consignación ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder crear ventas a crédito a partir de una consignación',1,0),(11,11493,'2023-12-31 00:12:18',1,'ventas_consApartado','\nCrear venta de apartado apartir de consignación ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder crear apartados apartir de consignación',1,0),(12,11494,'2023-12-31 00:07:45',1,'ventas_crearCorteCaja','Crear Corte de Caja','Es para poder crear cortes de caja',1,0),(13,11495,'2023-12-31 00:08:38',1,'ventas_crearEgresos','\nCrear Egresos','Es para poder crear Egresos',1,0),(14,11496,'2023-12-31 00:09:43',2,'inv_CrearInventarioFisico','Crear inventario físico ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder crear inventarios físicos',1,0),(15,11497,'2023-12-31 00:11:03',2,'inv_RectificarInventarioFisico','Rectificar inventario físico ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder rectificar, comprobar el inventario físico',1,0),(16,11498,'2024-01-02 00:00:00',1,'ventas_abrirCaja','Abrir caja','Es para poder abrir caja',1,0),(17,11499,'2024-01-02 00:00:00',3,'users_actionPermission','Asignar permisos de acciones','Este permiso te permite asignar los permisos de acciones',1,0),(18,11500,'2024-01-06 00:00:00',2,'inv_ModifMostradorInventarioFisico','Modificar el dato del Mostrador del inventario físico ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder aumentar o disminuir el dato del mostrador sin ecanear el código',1,0),(19,11501,'2024-01-07 00:00:00',2,'inv_VerificarInventarioFisico','Verificar el inventario físico ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder verificar el inventario físico',1,0),(20,11502,'2024-01-07 00:00:00',2,'inv_TerminarinventarioFisico','Terminar el inventario físico ( REQUIERE CÓDIGO DE AUTORIZACIÓN ) NOTA: ESTA ACCIÓN AFECTA EL INVENTARIO DE LOS PRODUCTOS','Es para poder terminar el inventario físico',1,1),(21,11503,'2024-01-17 00:00:00',1,'ventas_CancelarPago','Cancelar Pago ( AUN NO ESTÁ EN UN CORTE DE CAJA ) ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder cancelar pagos que aun no están en un corte',1,0),(22,11504,'2024-01-17 00:00:00',1,'ventas_CancelarPagoCortado','Cancelar Pago ( YA ESTÁ EN UN CORTE DE CAJA ) ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder cancelar pagos que ya están en un corte de caja',1,0),(23,11505,'2024-01-23 00:00:00',5,'opera_CancelarComision','Cancelar comisión ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder cancelar comisiones',1,0),(24,11506,'2024-02-21 17:22:01',1,'ventas_CancelarSaleDetail','Cancelar producto en venta ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder cancelar productos de una venta',1,0),(26,11507,'2024-02-21 17:24:27',5,'opera_ChangeStatus','Cambiar estatus de comisión ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder cambiar el status de la comisión',1,0),(27,11508,'2024-02-22 00:00:00',5,'opera_VeriEnt_Verification','Verificar entradas de inventario ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder verificar las entradas de inventario',1,1),(28,11509,'2024-02-22 00:00:00',5,'opera_VeriEnt_Mostrador','Recibir producto verificado al mostrador ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso se modrá recibir el producto ya verificado en mostrador',1,1),(30,11510,'2024-02-22 00:00:00',6,'prod_SalidaInventario','Baja de inventario ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso se puede bajar el inventario de los productos',1,1),(31,11511,'2024-03-24 11:37:39',1,'ventas_ChangeTaller','Actualizar sobre de taller ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Es para poder actualizar datos del sobre de taller',1,0),(32,11512,'2024-04-06 13:31:56',1,'ventas_CrearConsMartin','Crear notas de consignación a nombre de Martín ( \r\nREQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso puedes crear notas de consignación a nombre de Martin.',1,0),(33,11513,'2024-04-13 14:07:50',6,'prod_DevolutionInventario','Devolución de inventario ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso se pueden crear devoluciones de productos',1,1),(34,11514,'2024-04-13 14:07:50',6,'prod_VeryDevolutionInventario','Verificar devolución de inventario ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso se pueden verificar las devoluciones de productos',1,1),(35,11515,'2024-04-15 22:16:46',1,'ventas_changePrice','Cambiar precio de producto al agregar a nota de venta ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso se puede cambiar el precio unitario de los productos antes de agregar a la nota de venta.',1,0),(36,11516,'2024-06-09 11:55:10',1,'ventas_cancelIngreso','Cancelación de ingreso manual ( REQUIERE CÓDIGO DE AUTORIZACIÓN )','Con este permiso puedes cancelar ingresos manuales',1,0),(37,11517,'2024-08-10 13:30:54',1,'rep_costosProductos','Visualizar los costos de los productos en los reportes','Con este permiso puedes ver los costos de los productos en los repores',1,0),(38,11519,'2025-02-16 13:36:47',7,'invF_CreateBlock','Crear inventarios físicos reales','Con este permiso puedes crear inventarios físicos Reales que bloquean',1,0),(39,11520,'2025-02-16 13:36:47',7,'invF_showCostPrice','Mostrar Costos y Precios de los productos en el inventario físico','Con este permiso puedes visualizar los costos y los precios en los inventarios físicos',1,0),(40,11521,'2025-02-08 00:00:00',1,'ventas_CancelarTaller','Cancelar Ventas de taller','Con este permiso puedes cancelar ventas de taller',1,1),(41,11522,'2026-08-15 15:25:22',1,'ventas_AdminCatDescuentos','Administrar cat├ílogo de descuentos','Permite crear, editar y eliminar los porcentajes del cat├ílogo de descuentos que se aplican en el punto de venta.',1,0);
/*!40000 ALTER TABLE `actions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `actionsconf`
--

DROP TABLE IF EXISTS `actionsconf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actionsconf` (
  `keyx` bigint NOT NULL AUTO_INCREMENT,
  `idActionsConf` bigint NOT NULL,
  `createDate` datetime DEFAULT NULL,
  `relationType` varchar(5) DEFAULT NULL,
  `idRelation` bigint DEFAULT NULL,
  `idAction` bigint NOT NULL,
  `active` smallint DEFAULT NULL,
  PRIMARY KEY (`idActionsConf`),
  UNIQUE KEY `keyx_UNIQUE` (`keyx`),
  KEY `fk_actionsconf_actions1_idx` (`idAction`),
  CONSTRAINT `fk_actionsconf_actions1` FOREIGN KEY (`idAction`) REFERENCES `actions` (`idAction`)
) ENGINE=InnoDB AUTO_INCREMENT=1305 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actionsconf`
--

LOCK TABLES `actionsconf` WRITE;
/*!40000 ALTER TABLE `actionsconf` DISABLE KEYS */;
INSERT INTO `actionsconf` VALUES (1122,214,'2025-05-21 18:59:46','U',213,11496,1),(1123,215,'2025-05-21 18:59:46','U',213,11519,1),(1266,584,'2025-08-04 23:31:32','U',53,1324,1),(1267,585,'2025-08-04 23:31:32','U',53,1325,1),(1268,586,'2025-08-04 23:31:32','U',53,1326,1),(1269,587,'2025-08-04 23:31:32','U',53,1346,1),(1270,588,'2025-08-04 23:31:32','U',53,1386,1),(1271,589,'2025-08-04 23:31:32','U',53,11492,1),(1272,590,'2025-08-04 23:31:32','U',53,11493,1),(1273,591,'2025-08-04 23:31:32','U',53,11494,1),(1274,592,'2025-08-04 23:31:32','U',53,11495,1),(1275,593,'2025-08-04 23:31:32','U',53,11498,1),(1276,594,'2025-08-04 23:31:32','U',53,11503,1),(1277,595,'2025-08-04 23:31:32','U',53,11504,1),(1278,596,'2025-08-04 23:31:32','U',53,11506,1),(1279,597,'2025-08-04 23:31:32','U',53,11511,1),(1280,598,'2025-08-04 23:31:32','U',53,11512,1),(1281,599,'2025-08-04 23:31:32','U',53,11515,1),(406,1132,'2024-02-25 21:00:15','R',5,1324,1),(1124,3302,'2025-06-17 18:23:09','R',27,11496,1),(1125,3303,'2025-06-17 18:23:09','R',27,11497,1),(1126,3304,'2025-06-17 18:23:09','R',27,11500,1),(1127,3305,'2025-06-17 18:23:09','R',27,11501,1),(1128,3306,'2025-06-17 18:23:09','R',27,11519,1),(1129,3307,'2025-06-17 18:23:09','R',27,11520,1),(1130,3393,'2025-08-03 18:54:27','R',1,1324,1),(1131,3394,'2025-08-03 18:54:27','R',1,1325,1),(1132,3395,'2025-08-03 18:54:27','R',1,1326,1),(1133,3396,'2025-08-03 18:54:27','R',1,1346,1),(1134,3397,'2025-08-03 18:54:27','R',1,1386,1),(1135,3398,'2025-08-03 18:54:27','R',1,11492,1),(1136,3399,'2025-08-03 18:54:27','R',1,11493,1),(1137,3400,'2025-08-03 18:54:27','R',1,11494,1),(1138,3401,'2025-08-03 18:54:27','R',1,11495,1),(1139,3402,'2025-08-03 18:54:27','R',1,11498,1),(1140,3403,'2025-08-03 18:54:27','R',1,11503,1),(1141,3404,'2025-08-03 18:54:27','R',1,11504,1),(1142,3405,'2025-08-03 18:54:27','R',1,11506,1),(1143,3406,'2025-08-03 18:54:27','R',1,11511,1),(1144,3407,'2025-08-03 18:54:27','R',1,11512,1),(1145,3408,'2025-08-03 18:54:27','R',1,11515,1),(1146,3409,'2025-08-03 18:54:27','R',1,11516,1),(1147,3410,'2025-08-03 18:54:27','R',1,11517,1),(1148,3411,'2025-08-03 18:54:27','R',1,11521,1),(1149,3412,'2025-08-03 18:54:27','R',1,11496,1),(1150,3413,'2025-08-03 18:54:27','R',1,11497,1),(1151,3414,'2025-08-03 18:54:27','R',1,11500,1),(1152,3415,'2025-08-03 18:54:27','R',1,11501,1),(1153,3416,'2025-08-03 18:54:27','R',1,11502,1),(1154,3417,'2025-08-03 18:54:27','R',1,1226,1),(1155,3418,'2025-08-03 18:54:27','R',1,1320,1),(1156,3419,'2025-08-03 18:54:27','R',1,11499,1),(1157,3420,'2025-08-03 18:54:27','R',1,11505,1),(1158,3421,'2025-08-03 18:54:27','R',1,11507,1),(1159,3422,'2025-08-03 18:54:27','R',1,11508,1),(1160,3423,'2025-08-03 18:54:27','R',1,11509,1),(1161,3424,'2025-08-03 18:54:27','R',1,11510,1),(1162,3425,'2025-08-03 18:54:27','R',1,11513,1),(1163,3426,'2025-08-03 18:54:27','R',1,11514,1),(1164,3427,'2025-08-03 18:54:27','R',1,11519,1),(1165,3428,'2025-08-03 18:54:27','R',1,11520,1),(1166,3429,'2025-08-03 18:55:08','R',2,1324,1),(1167,3430,'2025-08-03 18:55:08','R',2,1325,1),(1168,3431,'2025-08-03 18:55:08','R',2,1326,1),(1169,3432,'2025-08-03 18:55:08','R',2,1346,1),(1170,3433,'2025-08-03 18:55:08','R',2,1386,1),(1171,3434,'2025-08-03 18:55:08','R',2,11492,1),(1172,3435,'2025-08-03 18:55:08','R',2,11493,1),(1173,3436,'2025-08-03 18:55:08','R',2,11494,1),(1174,3437,'2025-08-03 18:55:08','R',2,11495,1),(1175,3438,'2025-08-03 18:55:08','R',2,11498,1),(1176,3439,'2025-08-03 18:55:08','R',2,11503,1),(1177,3440,'2025-08-03 18:55:08','R',2,11504,1),(1178,3441,'2025-08-03 18:55:08','R',2,11506,1),(1179,3442,'2025-08-03 18:55:08','R',2,11511,1),(1180,3443,'2025-08-03 18:55:08','R',2,11512,1),(1181,3444,'2025-08-03 18:55:08','R',2,11515,1),(1182,3445,'2025-08-03 18:55:08','R',2,11516,1),(1183,3446,'2025-08-03 18:55:08','R',2,11517,1),(1184,3447,'2025-08-03 18:55:08','R',2,11521,1),(1185,3448,'2025-08-03 18:55:08','R',2,11496,1),(1186,3449,'2025-08-03 18:55:08','R',2,11497,1),(1187,3450,'2025-08-03 18:55:08','R',2,11500,1),(1188,3451,'2025-08-03 18:55:08','R',2,11501,1),(1189,3452,'2025-08-03 18:55:08','R',2,11502,1),(1190,3453,'2025-08-03 18:55:08','R',2,1226,1),(1191,3454,'2025-08-03 18:55:08','R',2,1320,1),(1192,3455,'2025-08-03 18:55:08','R',2,11499,1),(1193,3456,'2025-08-03 18:55:08','R',2,11505,1),(1194,3457,'2025-08-03 18:55:08','R',2,11507,1),(1195,3458,'2025-08-03 18:55:08','R',2,11508,1),(1196,3459,'2025-08-03 18:55:08','R',2,11509,1),(1197,3460,'2025-08-03 18:55:08','R',2,11510,1),(1198,3461,'2025-08-03 18:55:08','R',2,11513,1),(1199,3462,'2025-08-03 18:55:08','R',2,11514,1),(1200,3463,'2025-08-03 18:55:08','R',2,11519,1),(1201,3464,'2025-08-03 18:55:08','R',2,11520,1),(1202,3465,'2025-08-03 19:00:39','R',3,1324,1),(1203,3466,'2025-08-03 19:00:39','R',3,1325,1),(1204,3467,'2025-08-03 19:00:39','R',3,1326,1),(1205,3468,'2025-08-03 19:00:39','R',3,1346,1),(1206,3469,'2025-08-03 19:00:39','R',3,1386,1),(1207,3470,'2025-08-03 19:00:39','R',3,11492,1),(1208,3471,'2025-08-03 19:00:39','R',3,11493,1),(1209,3472,'2025-08-03 19:00:39','R',3,11494,1),(1210,3473,'2025-08-03 19:00:39','R',3,11495,1),(1211,3474,'2025-08-03 19:00:39','R',3,11498,1),(1212,3475,'2025-08-03 19:00:39','R',3,11503,1),(1213,3476,'2025-08-03 19:00:39','R',3,11504,1),(1214,3477,'2025-08-03 19:00:39','R',3,11506,1),(1215,3478,'2025-08-03 19:00:39','R',3,11511,1),(1216,3479,'2025-08-03 19:00:39','R',3,11515,1),(1217,3480,'2025-08-03 19:00:39','R',3,11516,1),(1218,3481,'2025-08-03 19:00:39','R',3,11517,1),(1219,3482,'2025-08-03 19:00:39','R',3,11496,1),(1220,3483,'2025-08-03 19:00:39','R',3,11497,1),(1221,3484,'2025-08-03 19:00:39','R',3,11500,1),(1222,3485,'2025-08-03 19:00:39','R',3,11501,1),(1223,3486,'2025-08-03 19:00:39','R',3,1226,1),(1224,3487,'2025-08-03 19:00:39','R',3,1320,1),(1225,3488,'2025-08-03 19:00:39','R',3,11499,1),(1226,3489,'2025-08-03 19:00:39','R',3,11505,1),(1227,3490,'2025-08-03 19:00:39','R',3,11507,1),(1228,3491,'2025-08-03 19:00:39','R',3,11519,1),(1229,3492,'2025-08-03 19:00:39','R',3,11520,1),(1304,3495,'2026-08-15 17:14:41','R',1,11522,1),(1282,5100,'2025-08-04 23:31:32','U',53,11516,1),(1283,5101,'2025-08-04 23:31:32','U',53,11517,1),(1284,5102,'2025-08-04 23:31:32','U',53,11521,1),(1285,5103,'2025-08-04 23:31:32','U',53,11496,1),(1286,5104,'2025-08-04 23:31:32','U',53,11497,1),(1287,5105,'2025-08-04 23:31:32','U',53,11500,1),(1288,5106,'2025-08-04 23:31:32','U',53,11501,1),(1289,5107,'2025-08-04 23:31:32','U',53,11502,1),(1290,5108,'2025-08-04 23:31:32','U',53,1226,1),(1291,5109,'2025-08-04 23:31:32','U',53,1320,1),(1292,5110,'2025-08-04 23:31:32','U',53,11499,1),(1293,5111,'2025-08-04 23:31:32','U',53,11505,1),(1294,5112,'2025-08-04 23:31:32','U',53,11507,1),(1295,5113,'2025-08-04 23:31:32','U',53,11508,1),(1296,5114,'2025-08-04 23:31:32','U',53,11509,1),(1297,5115,'2025-08-04 23:31:32','U',53,11510,1),(1298,5116,'2025-08-04 23:31:32','U',53,11513,1),(1299,5117,'2025-08-04 23:31:32','U',53,11514,1),(1300,5118,'2025-08-04 23:31:32','U',53,11519,1),(1301,5119,'2025-08-04 23:31:32','U',53,11520,1),(438,15734,'2024-03-02 17:57:56','U',15733,1226,1),(439,15735,'2024-03-02 17:57:56','U',15733,1320,1),(440,15736,'2024-03-02 17:57:57','U',15733,11499,1),(464,21058,'2024-03-27 19:15:39','R',6,1324,1),(465,21059,'2024-03-27 19:15:39','R',6,1326,1),(466,21060,'2024-03-27 19:15:39','R',6,11494,1),(467,21061,'2024-03-27 19:15:40','R',6,11495,1),(468,21062,'2024-03-27 19:15:40','R',6,11498,1),(469,21063,'2024-03-27 19:15:40','R',6,11511,1),(1109,330143,'2025-02-16 21:00:36','R',4,1324,1),(1110,330144,'2025-02-16 21:00:36','R',4,1325,1),(1111,330145,'2025-02-16 21:00:36','R',4,1346,1),(1112,330146,'2025-02-16 21:00:36','R',4,1386,1),(1113,330147,'2025-02-16 21:00:36','R',4,11492,1),(1114,330148,'2025-02-16 21:00:36','R',4,11493,1),(1115,330149,'2025-02-16 21:00:36','R',4,11503,1),(1116,330150,'2025-02-16 21:00:36','R',4,11504,1),(1117,330151,'2025-02-16 21:00:36','R',4,11515,1),(1118,330152,'2025-02-16 21:00:36','R',4,11509,1),(1119,330153,'2025-02-16 21:00:36','R',4,11513,1);
/*!40000 ALTER TABLE `actionsconf` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `actionsection`
--

DROP TABLE IF EXISTS `actionsection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actionsection` (
  `keyx` bigint NOT NULL AUTO_INCREMENT,
  `idActionSection` bigint NOT NULL,
  `sectionName` varchar(500) DEFAULT NULL,
  `active` smallint DEFAULT NULL,
  PRIMARY KEY (`idActionSection`),
  UNIQUE KEY `keyx_UNIQUE` (`keyx`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actionsection`
--

LOCK TABLES `actionsection` WRITE;
/*!40000 ALTER TABLE `actionsection` DISABLE KEYS */;
INSERT INTO `actionsection` VALUES (1,1,'Ventas',1),(2,2,'Inventario',1),(3,3,'Usuarios',1),(4,4,'Roles',1),(5,5,'Operación',1),(6,6,'Productos',1),(7,7,'Inventario físico',1);
/*!40000 ALTER TABLE `actionsection` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-15 17:19:59
