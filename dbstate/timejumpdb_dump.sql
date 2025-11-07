CREATE DATABASE  IF NOT EXISTS `timejumpdb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `timejumpdb`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: timejumpdb
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attraction`
--

DROP TABLE IF EXISTS `attraction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attraction` (
  `AttractionID` int unsigned NOT NULL AUTO_INCREMENT,
  `Name` varchar(80) NOT NULL,
  `AttractionTypeID` smallint unsigned NOT NULL,
  `ThemeID` int NOT NULL,
  `HeightRestriction` smallint NOT NULL,
  `RidersPerVehicle` smallint NOT NULL,
  PRIMARY KEY (`AttractionID`),
  KEY `ThemeID_idx` (`ThemeID`),
  KEY `idx_attraction_typeid` (`AttractionTypeID`),
  CONSTRAINT `fk_attraction_theme` FOREIGN KEY (`ThemeID`) REFERENCES `theme` (`themeID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_attraction_typeid` FOREIGN KEY (`AttractionTypeID`) REFERENCES `attraction_type` (`AttractionTypeID`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attraction`
--

LOCK TABLES `attraction` WRITE;
/*!40000 ALTER TABLE `attraction` DISABLE KEYS */;
INSERT INTO `attraction` VALUES (1,'Pterodactyl Plunge',1,1,54,24),(2,'Cretaceous Crossing',2,1,40,16),(3,'Raptor Rapids',3,1,42,20),(4,'The Extinction Event',4,1,0,0),(5,'Dragon Rider\'s Fury',1,2,54,24),(6,'Quest of the Crystal King',5,2,40,16),(7,'The Royal Tournament',6,2,36,20),(8,'Runaway Gold Mine',7,3,48,24),(9,'The Rattlesnake Robbery',8,3,0,12),(10,'Oil Derrick Drop',9,3,52,16),(11,'Cosmic Collapse: Wormhole Jump',10,4,54,24),(12,'The Zero-G Skyway',11,4,40,24),(13,'The Sword in the Stone',4,2,0,0),(14,'The High Noon Shootout',4,3,0,0),(15,'Symphony of the Nexus',4,4,0,0);
/*!40000 ALTER TABLE `attraction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attraction_closure`
--

DROP TABLE IF EXISTS `attraction_closure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attraction_closure` (
  `ClosureID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `AttractionID` int unsigned NOT NULL,
  `StatusID` tinyint unsigned NOT NULL,
  `StartsAt` datetime NOT NULL,
  `EndsAt` datetime DEFAULT NULL,
  `Note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ClosureID`),
  KEY `ix_attraction_time` (`AttractionID`,`StartsAt`),
  KEY `fk_closure_status` (`StatusID`),
  CONSTRAINT `fk_closure_attraction` FOREIGN KEY (`AttractionID`) REFERENCES `attraction` (`AttractionID`) ON DELETE CASCADE,
  CONSTRAINT `fk_closure_status` FOREIGN KEY (`StatusID`) REFERENCES `cancellation_status` (`StatusID`) ON DELETE RESTRICT,
  CONSTRAINT `chk_no_overlap` CHECK (((`EndsAt` is null) or (`EndsAt` > `StartsAt`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attraction_closure`
--

LOCK TABLES `attraction_closure` WRITE;
/*!40000 ALTER TABLE `attraction_closure` DISABLE KEYS */;
/*!40000 ALTER TABLE `attraction_closure` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attraction_type`
--

DROP TABLE IF EXISTS `attraction_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attraction_type` (
  `AttractionTypeID` smallint unsigned NOT NULL AUTO_INCREMENT,
  `TypeName` varchar(40) NOT NULL,
  `Description` text NOT NULL,
  PRIMARY KEY (`AttractionTypeID`),
  UNIQUE KEY `uq_attraction_type_name` (`TypeName`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attraction_type`
--

LOCK TABLES `attraction_type` WRITE;
/*!40000 ALTER TABLE `attraction_type` DISABLE KEYS */;
INSERT INTO `attraction_type` VALUES (1,'Coaster','High-speed roller coasters and variants.'),(2,'Dark Ride','Indoor ride with controlled vehicles and scenes.'),(3,'Water Ride','Flumes, rapids, and other water-based attractions.'),(4,'Show','Seated or street performance with scheduled times.'),(5,'Interactive Dark Ride','Dark ride with onboard scoring/interaction.'),(6,'Flat Ride','Classic spinning/swinging rides.'),(7,'Wooden Coaster','Traditional wooden-structure coaster.'),(8,'Shooting Gallery','Interactive target shooting attraction.'),(9,'Drop Tower','Vertical drop ride.'),(10,'Indoor Coaster','Coaster operating fully indoors.'),(11,'Motion Simulator','Seated simulator with synchronized media/motion.');
/*!40000 ALTER TABLE `attraction_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cancellation_status`
--

DROP TABLE IF EXISTS `cancellation_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cancellation_status` (
  `StatusID` tinyint unsigned NOT NULL,
  `StatusName` varchar(30) NOT NULL,
  `Description` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`StatusID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cancellation_status`
--

LOCK TABLES `cancellation_status` WRITE;
/*!40000 ALTER TABLE `cancellation_status` DISABLE KEYS */;
INSERT INTO `cancellation_status` VALUES (0,'active','Operating as normal'),(1,'temporarily_closed','Closed for maintenance/weather/etc.'),(2,'permanently_closed','Decommissioned');
/*!40000 ALTER TABLE `cancellation_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
  `employeeID` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(99) DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `role` int unsigned NOT NULL,
  `start_date` date DEFAULT NULL,
  `email` varchar(60) NOT NULL,
  PRIMARY KEY (`employeeID`),
  UNIQUE KEY `uq_employee_email` (`email`),
  KEY `fk_employee_role` (`role`),
  CONSTRAINT `fk_employee_role` FOREIGN KEY (`role`) REFERENCES `positions` (`PositionID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_email_format` CHECK (regexp_like(`email`,_utf8mb4'^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$')),
  CONSTRAINT `chk_salary` CHECK (((`salary` >= 0.00) and (`salary` <= 200000.00)))
) ENGINE=InnoDB AUTO_INCREMENT=10000004 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee`
--

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
INSERT INTO `employee` VALUES (10000000,'Erin Employee',45000.00,1,'2025-10-27','erin.employee@timejump.test'),(10000001,'Manny Manager',65000.00,2,'2025-10-27','manny.manager@timejump.test'),(10000002,'Ada Admin',80000.00,3,'2025-10-27','ada.admin@timejump.test'),(10000003,'Owen Owner',120000.00,4,'2025-10-27','owen.owner@timejump.test');
/*!40000 ALTER TABLE `employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `food_vendor`
--

DROP TABLE IF EXISTS `food_vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_vendor` (
  `VendorID` int unsigned NOT NULL AUTO_INCREMENT,
  `VendorName` varchar(40) NOT NULL,
  PRIMARY KEY (`VendorID`),
  UNIQUE KEY `uq_vendor_name` (`VendorName`),
  CONSTRAINT `chk_vendor_name_not_blank` CHECK ((trim(`VendorName`) <> _utf8mb4''))
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `food_vendor`
--

LOCK TABLES `food_vendor` WRITE;
/*!40000 ALTER TABLE `food_vendor` DISABLE KEYS */;
/*!40000 ALTER TABLE `food_vendor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gift_item`
--

DROP TABLE IF EXISTS `gift_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gift_item` (
  `item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `shop_id` int unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `uq_shop_itemname` (`shop_id`,`name`),
  CONSTRAINT `fk_giftitem_shop` FOREIGN KEY (`shop_id`) REFERENCES `gift_shops` (`ShopID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `gift_item_chk_1` CHECK ((`price` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gift_item`
--

LOCK TABLES `gift_item` WRITE;
/*!40000 ALTER TABLE `gift_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `gift_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gift_shops`
--

DROP TABLE IF EXISTS `gift_shops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gift_shops` (
  `ShopID` int unsigned NOT NULL AUTO_INCREMENT,
  `ThemeID` int NOT NULL,
  `ShopName` varchar(50) NOT NULL,
  `Revenue` decimal(12,2) DEFAULT NULL,
  `OpenDate` date NOT NULL,
  `CloseDate` date DEFAULT NULL,
  PRIMARY KEY (`ShopID`),
  KEY `fk_giftshop_theme` (`ThemeID`),
  CONSTRAINT `fk_giftshop_theme` FOREIGN KEY (`ThemeID`) REFERENCES `theme` (`themeID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_dates_order` CHECK (((`CloseDate` is null) or (`CloseDate` >= `OpenDate`))),
  CONSTRAINT `chk_revenue_notneg` CHECK (((`Revenue` is null) or (`Revenue` >= 0))),
  CONSTRAINT `chk_shop_name_not_blank` CHECK ((trim(`ShopName`) <> _utf8mb4''))
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gift_shops`
--

LOCK TABLES `gift_shops` WRITE;
/*!40000 ALTER TABLE `gift_shops` DISABLE KEYS */;
/*!40000 ALTER TABLE `gift_shops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incident_status`
--

DROP TABLE IF EXISTS `incident_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_status` (
  `StatusID` tinyint unsigned NOT NULL,
  `StatusName` varchar(30) NOT NULL,
  PRIMARY KEY (`StatusID`),
  UNIQUE KEY `uq_incident_status_name` (`StatusName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incident_status`
--

LOCK TABLES `incident_status` WRITE;
/*!40000 ALTER TABLE `incident_status` DISABLE KEYS */;
INSERT INTO `incident_status` VALUES (3,'closed'),(2,'investigating'),(1,'open');
/*!40000 ALTER TABLE `incident_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incident_type`
--

DROP TABLE IF EXISTS `incident_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incident_type` (
  `TypeID` smallint NOT NULL,
  `TypeName` varchar(40) NOT NULL,
  `TypeDesc` text,
  PRIMARY KEY (`TypeID`),
  UNIQUE KEY `uq_incident_type_name` (`TypeName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incident_type`
--

LOCK TABLES `incident_type` WRITE;
/*!40000 ALTER TABLE `incident_type` DISABLE KEYS */;
INSERT INTO `incident_type` VALUES (1,'Guest Injury','Any injury to a guest; document first aid rendered and whether EMS was called.'),(2,'Staff Injury','Employee injury while on duty; notify supervisor and HR/workers‚Äô comp.'),(3,'Medical Emergency','Serious medical episode (e.g., cardiac, seizure, anaphylaxis); EMS likely required.'),(4,'Slip/Trip/Fall','Loss of footing leading to injury; note surface conditions and footwear.'),(5,'Ride Malfunction','Mechanical or control fault affecting ride function; may require shutdown.'),(6,'Ride Evacuation','Guests evacuated from a ride; log duration, cause, and procedures followed.'),(7,'Weather Impact','Operations affected by weather (lightning, high wind, extreme heat/cold).'),(8,'Power Outage','Partial or full electrical outage impacting operations or safety systems.'),(9,'Lost Child','Minor separated from guardian; include last known location and description.'),(10,'Found Child','Unaccompanied minor located; awaiting guardian reunification.'),(11,'Theft/Lost Property','Reported theft or loss of personal items; include location and item details.'),(12,'Guest Disturbance','Behavioral issues (intoxication, fighting, harassment); security may be involved.'),(13,'Vandalism/Damage','Damage to park property or assets; include estimated impact.'),(14,'Food Safety','Foodborne illness concern or contamination risk; notify food safety lead.'),(15,'Fire/Smoke Alarm','Any fire event or alarm activation; indicate cause and response actions.'),(16,'Animal/Wildlife','Wildlife interaction posing risk or causing disruption within park areas.'),(17,'ADA/Accessibility','Accessibility barrier or incident affecting guests with disabilities.');
/*!40000 ALTER TABLE `incident_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incidents`
--

DROP TABLE IF EXISTS `incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidents` (
  `IncidentID` int unsigned NOT NULL AUTO_INCREMENT,
  `IncidentType` smallint NOT NULL,
  `StatusID` tinyint unsigned NOT NULL DEFAULT '1',
  `EmployeeID` int unsigned DEFAULT NULL,
  `TicketID` int unsigned DEFAULT NULL,
  `OccurredAt` datetime(6) NOT NULL,
  `Location` varchar(80) DEFAULT NULL,
  `Severity` tinyint unsigned NOT NULL DEFAULT '1',
  `Details` text,
  PRIMARY KEY (`IncidentID`),
  KEY `fk_incident_type` (`IncidentType`),
  KEY `fk_incident_status` (`StatusID`),
  KEY `fk_incident_ticket` (`TicketID`),
  KEY `ix_incidents_employee` (`EmployeeID`),
  CONSTRAINT `fk_incident_employee` FOREIGN KEY (`EmployeeID`) REFERENCES `employee` (`employeeID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incident_status` FOREIGN KEY (`StatusID`) REFERENCES `incident_status` (`StatusID`),
  CONSTRAINT `fk_incident_ticket` FOREIGN KEY (`TicketID`) REFERENCES `ticket` (`TicketID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_incident_type` FOREIGN KEY (`IncidentType`) REFERENCES `incident_type` (`TypeID`),
  CONSTRAINT `chk_severity_range` CHECK ((`Severity` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidents`
--

LOCK TABLES `incidents` WRITE;
/*!40000 ALTER TABLE `incidents` DISABLE KEYS */;
/*!40000 ALTER TABLE `incidents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_records`
--

DROP TABLE IF EXISTS `maintenance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_records` (
  `RecordID` int unsigned NOT NULL AUTO_INCREMENT,
  `AttractionID` int unsigned NOT NULL,
  `EmployeeID` int unsigned DEFAULT NULL,
  `SourceID` tinyint unsigned NOT NULL DEFAULT '1',
  `Date_broken_down` date NOT NULL,
  `Date_fixed` date DEFAULT NULL,
  `type_of_maintenance` enum('inspection','repair','cleaning','software','calibration','emergency') NOT NULL DEFAULT 'repair',
  `Description_of_work` text,
  `Duration_of_repair` decimal(6,2) DEFAULT NULL,
  `Severity_of_report` enum('low','medium','high','critical') NOT NULL,
  `Approved_by_supervisor` int unsigned DEFAULT NULL,
  PRIMARY KEY (`RecordID`),
  KEY `fk_mr_attraction` (`AttractionID`),
  KEY `fk_mr_employee` (`EmployeeID`),
  KEY `fk_mr_supervisor` (`Approved_by_supervisor`),
  KEY `fk_mr_source` (`SourceID`),
  KEY `ix_mr_severity` (`Severity_of_report`),
  CONSTRAINT `fk_mr_attraction` FOREIGN KEY (`AttractionID`) REFERENCES `attraction` (`AttractionID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_mr_employee` FOREIGN KEY (`EmployeeID`) REFERENCES `employee` (`employeeID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mr_source` FOREIGN KEY (`SourceID`) REFERENCES `maintenance_source` (`SourceID`),
  CONSTRAINT `fk_mr_supervisor` FOREIGN KEY (`Approved_by_supervisor`) REFERENCES `employee` (`employeeID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_desc_len` CHECK ((char_length(`Description_of_work`) <= 1000)),
  CONSTRAINT `chk_mr_dates` CHECK (((`Date_fixed` is null) or (`Date_fixed` >= `Date_broken_down`))),
  CONSTRAINT `chk_mr_duration` CHECK (((`Duration_of_repair` is null) or (`Duration_of_repair` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_records`
--

LOCK TABLES `maintenance_records` WRITE;
/*!40000 ALTER TABLE `maintenance_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_source`
--

DROP TABLE IF EXISTS `maintenance_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_source` (
  `SourceID` tinyint unsigned NOT NULL,
  `SourceName` varchar(20) NOT NULL,
  PRIMARY KEY (`SourceID`),
  UNIQUE KEY `uq_source_name` (`SourceName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_source`
--

LOCK TABLES `maintenance_source` WRITE;
/*!40000 ALTER TABLE `maintenance_source` DISABLE KEYS */;
INSERT INTO `maintenance_source` VALUES (2,'auto'),(1,'manual');
/*!40000 ALTER TABLE `maintenance_source` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_item`
--

DROP TABLE IF EXISTS `menu_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item` (
  `item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  `price` decimal(7,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `uq_vendor_itemname` (`vendor_id`,`name`),
  KEY `ix_menu_active` (`is_active`),
  CONSTRAINT `fk_menuitem_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `food_vendor` (`VendorID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_item_name_not_blank` CHECK ((trim(`name`) <> _utf8mb4'')),
  CONSTRAINT `menu_item_chk_price` CHECK (((`price` >= 0.00) and (`price` <= 500.00)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_item`
--

LOCK TABLES `menu_item` WRITE;
/*!40000 ALTER TABLE `menu_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `menu_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parking_lot`
--

DROP TABLE IF EXISTS `parking_lot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_lot` (
  `parking_lot_id` smallint unsigned NOT NULL AUTO_INCREMENT,
  `lot_name` varchar(32) NOT NULL,
  `base_price` decimal(6,2) NOT NULL,
  PRIMARY KEY (`parking_lot_id`),
  UNIQUE KEY `uq_lot_name` (`lot_name`),
  CONSTRAINT `chk_base_price_0_500` CHECK ((`base_price` between 0 and 500))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_lot`
--

LOCK TABLES `parking_lot` WRITE;
/*!40000 ALTER TABLE `parking_lot` DISABLE KEYS */;
INSERT INTO `parking_lot` VALUES (1,'Lot A',200.00),(2,'Lot B',180.00),(3,'Lot C',160.00),(4,'Lot D',140.00),(5,'Lot E',120.00);
/*!40000 ALTER TABLE `parking_lot` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parking_pass`
--

DROP TABLE IF EXISTS `parking_pass`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_pass` (
  `pass_id` int unsigned NOT NULL AUTO_INCREMENT,
  `parking_lot_id` smallint unsigned NOT NULL,
  `service_date` date NOT NULL,
  `transaction_id` int unsigned DEFAULT NULL,
  `ticket_id` int unsigned DEFAULT NULL,
  `status` enum('purchased','refunded','canceled') NOT NULL DEFAULT 'purchased',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`pass_id`),
  KEY `idx_pass_lot_date` (`parking_lot_id`,`service_date`),
  KEY `idx_pass_tx` (`transaction_id`),
  KEY `idx_pass_ticket` (`ticket_id`),
  CONSTRAINT `fk_pass_lot` FOREIGN KEY (`parking_lot_id`) REFERENCES `parking_lot` (`parking_lot_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_pass`
--

LOCK TABLES `parking_pass` WRITE;
/*!40000 ALTER TABLE `parking_pass` DISABLE KEYS */;
/*!40000 ALTER TABLE `parking_pass` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `positions` (
  `PositionID` int unsigned NOT NULL,
  `RoleName` varchar(45) NOT NULL,
  PRIMARY KEY (`PositionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `positions`
--

LOCK TABLES `positions` WRITE;
/*!40000 ALTER TABLE `positions` DISABLE KEYS */;
INSERT INTO `positions` VALUES (1,'Employee'),(2,'Manager'),(3,'Admin'),(4,'Owner');
/*!40000 ALTER TABLE `positions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ride_cancellation`
--

DROP TABLE IF EXISTS `ride_cancellation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ride_cancellation` (
  `cancel_id` int unsigned NOT NULL AUTO_INCREMENT,
  `AttractionID` int NOT NULL,
  `cancel_date` date NOT NULL,
  `reason` varchar(50) NOT NULL,
  PRIMARY KEY (`cancel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ride_cancellation`
--

LOCK TABLES `ride_cancellation` WRITE;
/*!40000 ALTER TABLE `ride_cancellation` DISABLE KEYS */;
/*!40000 ALTER TABLE `ride_cancellation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ride_log`
--

DROP TABLE IF EXISTS `ride_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ride_log` (
  `log_id` int unsigned NOT NULL AUTO_INCREMENT,
  `AttractionID` int unsigned NOT NULL,
  `log_date` date NOT NULL,
  `riders_count` int unsigned NOT NULL,
  PRIMARY KEY (`log_id`),
  UNIQUE KEY `uq_attr_day` (`AttractionID`,`log_date`),
  CONSTRAINT `fk_ridelog_attraction` FOREIGN KEY (`AttractionID`) REFERENCES `attraction` (`AttractionID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ride_log_chk_1` CHECK ((`riders_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ride_log`
--

LOCK TABLES `ride_log` WRITE;
/*!40000 ALTER TABLE `ride_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `ride_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_notes`
--

DROP TABLE IF EXISTS `schedule_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_notes` (
  `ScheduleID` int unsigned NOT NULL,
  `notes` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ScheduleID`),
  CONSTRAINT `fk_sched_notes` FOREIGN KEY (`ScheduleID`) REFERENCES `schedules` (`ScheduleID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_notes`
--

LOCK TABLES `schedule_notes` WRITE;
/*!40000 ALTER TABLE `schedule_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `ScheduleID` int unsigned NOT NULL AUTO_INCREMENT,
  `EmployeeID` int unsigned NOT NULL,
  `AttractionID` int unsigned NOT NULL,
  `Shift_date` date NOT NULL,
  `Start_time` time NOT NULL,
  `End_time` time NOT NULL,
  `ShiftMinutes` smallint unsigned GENERATED ALWAYS AS (timestampdiff(MINUTE,concat(`Shift_date`,_utf8mb4' ',`Start_time`),concat(`Shift_date`,_utf8mb4' ',`End_time`))) STORED,
  PRIMARY KEY (`ScheduleID`),
  UNIQUE KEY `uq_emp_day_attr_start` (`EmployeeID`,`Shift_date`,`AttractionID`,`Start_time`),
  KEY `fk_sched_attraction` (`AttractionID`),
  CONSTRAINT `fk_sched_attraction` FOREIGN KEY (`AttractionID`) REFERENCES `attraction` (`AttractionID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sched_employee` FOREIGN KEY (`EmployeeID`) REFERENCES `employee` (`employeeID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_sched_time_order` CHECK ((`End_time` > `Start_time`)),
  CONSTRAINT `chk_sched_time_window` CHECK (((`Start_time` >= TIME'10:00:00') and (`End_time` <= TIME'20:00:00')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedules`
--

LOCK TABLES `schedules` WRITE;
/*!40000 ALTER TABLE `schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `show_event`
--

DROP TABLE IF EXISTS `show_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `show_event` (
  `show_id` int unsigned NOT NULL AUTO_INCREMENT,
  `ThemeID` int NOT NULL,
  `ShowName` varchar(80) NOT NULL,
  `Duration` time NOT NULL,
  PRIMARY KEY (`show_id`),
  UNIQUE KEY `uq_theme_showname` (`ThemeID`,`ShowName`),
  CONSTRAINT `fk_show_theme` FOREIGN KEY (`ThemeID`) REFERENCES `theme` (`themeID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_show_duration` CHECK (((`Duration` >= TIME'00:05:00') and (`Duration` <= TIME'03:00:00'))),
  CONSTRAINT `chk_show_name_not_blank` CHECK ((trim(`ShowName`) <> _utf8mb4''))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `show_event`
--

LOCK TABLES `show_event` WRITE;
/*!40000 ALTER TABLE `show_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `show_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `show_time`
--

DROP TABLE IF EXISTS `show_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `show_time` (
  `show_time_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `show_id` int unsigned NOT NULL,
  `show_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`show_time_id`),
  UNIQUE KEY `uq_show_slot` (`show_id`,`show_date`,`start_time`),
  CONSTRAINT `fk_showtime_event` FOREIGN KEY (`show_id`) REFERENCES `show_event` (`show_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_showtime_hours` CHECK (((`start_time` >= TIME'10:00:00') and (`end_time` <= TIME'20:00:00'))),
  CONSTRAINT `chk_showtime_order` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `show_time`
--

LOCK TABLES `show_time` WRITE;
/*!40000 ALTER TABLE `show_time` DISABLE KEYS */;
/*!40000 ALTER TABLE `show_time` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `theme`
--

DROP TABLE IF EXISTS `theme`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `theme` (
  `themeID` int NOT NULL AUTO_INCREMENT,
  `themeName` varchar(50) NOT NULL,
  `Description` varchar(255) NOT NULL,
  PRIMARY KEY (`themeID`),
  UNIQUE KEY `uq_theme_name` (`themeName`),
  CONSTRAINT `chk_theme_name_not_blank` CHECK ((trim(`themeName`) <> _utf8mb4''))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `theme`
--

LOCK TABLES `theme` WRITE;
/*!40000 ALTER TABLE `theme` DISABLE KEYS */;
INSERT INTO `theme` VALUES (1,'Jurassic Zone','Primeval jungles, thunderous coasters, and aquatic escapades inspired by Earth‚Äôs fearless past.'),(2,'Medieval Fantasy Zone','Soaring dragons, enchanted quests, and live-action tournaments straight from the realm of legend.'),(3,'Wild West Zone','Dusty canyons, runaway trains, and stunt shows that bring frontier folklore to life.'),(4,'Nova-Crest','Gravity-defying coasters, immersive simulators, and nighttime spectacles from the future of thrills.');
/*!40000 ALTER TABLE `theme` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket` (
  `TicketID` int unsigned NOT NULL AUTO_INCREMENT,
  `TicketType` varchar(30) NOT NULL,
  `UserID` int unsigned DEFAULT NULL,
  `Price` decimal(6,2) NOT NULL,
  `PurchaseDate` date NOT NULL,
  `ExpirationDate` date NOT NULL,
  `ParkingPassID` int unsigned DEFAULT NULL,
  `EntryTime` datetime DEFAULT NULL,
  PRIMARY KEY (`TicketID`),
  KEY `ix_ticket_type` (`TicketType`),
  KEY `fk_ticket_parking_pass` (`ParkingPassID`),
  KEY `idx_ticket_user` (`UserID`),
  CONSTRAINT `fk_ticket_parking_pass` FOREIGN KEY (`ParkingPassID`) REFERENCES `parking_pass` (`pass_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_type` FOREIGN KEY (`TicketType`) REFERENCES `ticket_catalog` (`ticket_type`) ON UPDATE CASCADE,
  CONSTRAINT `fk_ticket_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_ticket_entrytime_window` CHECK (((`EntryTime` is null) or ((cast(`EntryTime` as time) >= _utf8mb4'10:00:00') and (cast(`EntryTime` as time) <= _utf8mb4'20:00:00')))),
  CONSTRAINT `chk_ticket_expiration` CHECK ((`ExpirationDate` > `PurchaseDate`)),
  CONSTRAINT `chk_ticket_price` CHECK (((`Price` >= 0) and (`Price` <= 500)))
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket`
--

LOCK TABLES `ticket` WRITE;
/*!40000 ALTER TABLE `ticket` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_catalog`
--

DROP TABLE IF EXISTS `ticket_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_catalog` (
  `ticket_type` varchar(30) NOT NULL,
  `price` decimal(6,2) NOT NULL,
  PRIMARY KEY (`ticket_type`),
  CONSTRAINT `ticket_catalog_chk_1` CHECK (((`price` >= 0) and (`price` <= 500)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_catalog`
--

LOCK TABLES `ticket_catalog` WRITE;
/*!40000 ALTER TABLE `ticket_catalog` DISABLE KEYS */;
INSERT INTO `ticket_catalog` VALUES ('Adult',89.00),('Child',59.00),('General',50.00),('Senior',69.00),('VIP',149.00);
/*!40000 ALTER TABLE `ticket_catalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_purchase`
--

DROP TABLE IF EXISTS `ticket_purchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_purchase` (
  `purchase_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `item_name` varchar(160) NOT NULL,
  `item_type` varchar(32) NOT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `details` longtext,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_id`),
  KEY `idx_ticket_purchase_user` (`user_id`),
  CONSTRAINT `fk_ticket_purchase_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_purchase`
--

LOCK TABLES `ticket_purchase` WRITE;
/*!40000 ALTER TABLE `ticket_purchase` DISABLE KEYS */;
INSERT INTO `ticket_purchase` VALUES (1,8,'Adult','ticket',1,89.00,'{\"category\":\"day\"}','2025-11-06 23:46:08'),(2,8,'Child','ticket',1,59.00,'{\"category\":\"day\"}','2025-11-06 23:46:08'),(3,8,'Parking - Lot A','parking',1,200.00,'{\"lot\":\"Lot A\"}','2025-11-06 23:46:08');
/*!40000 ALTER TABLE `ticket_purchase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_line`
--

DROP TABLE IF EXISTS `transaction_line`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_line` (
  `line_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transactionID` int NOT NULL,
  `product_type` enum('ticket','menu_item','gift_item','parking') NOT NULL,
  `product_id` int unsigned NOT NULL,
  `name_snapshot` varchar(120) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `qty` int unsigned NOT NULL DEFAULT '1',
  `line_subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`line_id`),
  KEY `ix_tl_tx` (`transactionID`),
  KEY `ix_tl_type_id` (`product_type`,`product_id`),
  CONSTRAINT `fk_tl_tx` FOREIGN KEY (`transactionID`) REFERENCES `transactions` (`transactionID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_tl_nonneg_amounts` CHECK (((`unit_price` >= 0) and (`line_subtotal` >= 0) and (`tax_amount` >= 0) and (`discount_amount` >= 0) and (`line_total` >= 0))),
  CONSTRAINT `chk_tl_qty_pos` CHECK ((`qty` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_line`
--

LOCK TABLES `transaction_line` WRITE;
/*!40000 ALTER TABLE `transaction_line` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction_line` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_tender`
--

DROP TABLE IF EXISTS `transaction_tender`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_tender` (
  `tender_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transactionID` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`tender_id`),
  KEY `ix_tt_tx` (`transactionID`),
  CONSTRAINT `fk_tt_tx` FOREIGN KEY (`transactionID`) REFERENCES `transactions` (`transactionID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_tt_amount_nonneg` CHECK ((`amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_tender`
--

LOCK TABLES `transaction_tender` WRITE;
/*!40000 ALTER TABLE `transaction_tender` DISABLE KEYS */;
/*!40000 ALTER TABLE `transaction_tender` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transactionID` int NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned DEFAULT NULL,
  `transDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `tax_rate_percent` decimal(5,2) NOT NULL DEFAULT '8.25',
  PRIMARY KEY (`transactionID`),
  KEY `idx_transactions_user` (`user_id`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profile`
--

DROP TABLE IF EXISTS `user_profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profile` (
  `user_id` int unsigned NOT NULL,
  `full_name` varchar(160) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profile`
--

LOCK TABLES `user_profile` WRITE;
/*!40000 ALTER TABLE `user_profile` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(120) NOT NULL,
  `password_hash` varbinary(128) NOT NULL,
  `role` enum('customer','employee','manager','admin','owner') NOT NULL DEFAULT 'customer',
  `employeeID` int unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_employee` (`employeeID`),
  CONSTRAINT `fk_users_employee` FOREIGN KEY (`employeeID`) REFERENCES `employee` (`employeeID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'owner@example.com',_binary '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0','owner',NULL,'2025-10-22 09:32:25'),(2,'cathy.customer@timejump.test',_binary '°	\„iG≠V\ﬁ\ ƒü¯¨öŸß±™\rÙ≥\ƒ\Às¡ˇ\Í','customer',NULL,'2025-10-28 04:56:03'),(3,'erin.employee@timejump.test',_binary '\’\Èånö|aRÆJ\ﬁG\„ˆãx}-\'\È\Õﬂáèèä\Ã\Èùy‡©Ç\·¯†\ﬂ\Z˘\0\„πGYÂ∂û£ˇwE\Ó\◊‘ìV\√-\Ó\…?\≈4ï\Ââ\\§4ò\0&cö','employee',10000000,'2025-10-28 04:56:03'),(4,'manny.manager@timejump.test',_binary 'Kp\ﬂJÆÙ≥\ŒVNå∏ı\‚\÷åP´òg\ﬂy*.X∞@h∞úÑ\”\È{—ë\Z¨\Áõco\Î\rEXE`\‰\À˜\≈œº\«¡\Ëâ[,¨˝¿u©âSı','manager',10000001,'2025-10-28 04:56:03'),(5,'ada.admin@timejump.test',_binary 'Åã°sÃ£á}˚#Ü\”a%ï\≈\nºÆ(\r¶\Í∂\¬ÚPß\ÊìsEóyù\Z©60oØ§r\€g\Z§\…\'\Ô\Á™5(\√¡pÜe\∆\›\Z˛ã±$˙\∆%ˆ','admin',10000002,'2025-10-28 04:56:03'),(6,'owen.owner@timejump.test',_binary '\ÕT8›∏H˚\Í\Ì\¬7}bk\\\÷&>\⁄\‚[xÜx©c\‘–≠öúXî˙â\Ô\œV+ö†¥O@˙\÷˜æ\÷I%D\·A\Ïe\0äˇéª«¥\“˚\«@~b1\‡ñé\",\0è','owner',10000003,'2025-10-28 04:56:03'),(7,'jane.customer@timejump.test',_binary 'ã]Ø\ÓÉK0ü)â\Â˛≥D≥7@O\‘e\Â@J\·µR}øéW<\Ìu¢SÛ§ß\€%Íê±mB±>PV%ÜG.g|≠I¸z0\∆4\Á¿A(ΩÙ','customer',NULL,'2025-10-28 04:58:21');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `users_role_guard_ins` BEFORE INSERT ON `users` FOR EACH ROW BEGIN
  IF NEW.role = 'customer' AND NEW.employeeID IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer users cannot reference employeeID';
  END IF;
  IF NEW.role IN ('employee','admin','owner','manager') AND NEW.employeeID IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff users must reference an employeeID';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `users_role_guard_upd` BEFORE UPDATE ON `users` FOR EACH ROW BEGIN
  IF NEW.role = 'customer' AND NEW.employeeID IS NOT NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer users cannot reference employeeID';
  END IF;
  IF NEW.role IN ('employee','admin','owner','manager') AND NEW.employeeID IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff users must reference an employeeID';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary view structure for view `v_attraction_current_status`
--

DROP TABLE IF EXISTS `v_attraction_current_status`;
/*!50001 DROP VIEW IF EXISTS `v_attraction_current_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_attraction_current_status` AS SELECT 
 1 AS `AttractionID`,
 1 AS `StatusID`,
 1 AS `StatusName`,
 1 AS `StatusDescription`,
 1 AS `StartsAt`,
 1 AS `EndsAt`,
 1 AS `Note`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_parking_lots_prices`
--

DROP TABLE IF EXISTS `v_parking_lots_prices`;
/*!50001 DROP VIEW IF EXISTS `v_parking_lots_prices`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_parking_lots_prices` AS SELECT 
 1 AS `parking_lot_id`,
 1 AS `lot_name`,
 1 AS `base_price`,
 1 AS `service_date`,
 1 AS `passes_today`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_ticket_with_parking`
--

DROP TABLE IF EXISTS `v_ticket_with_parking`;
/*!50001 DROP VIEW IF EXISTS `v_ticket_with_parking`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_ticket_with_parking` AS SELECT 
 1 AS `TicketID`,
 1 AS `TicketType`,
 1 AS `Price`,
 1 AS `PurchaseDate`,
 1 AS `ExpirationDate`,
 1 AS `EntryTime`,
 1 AS `ParkingPassID`,
 1 AS `pass_status`,
 1 AS `service_date`,
 1 AS `parking_lot_id`,
 1 AS `lot_name`,
 1 AS `base_price`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_user_profile`
--

DROP TABLE IF EXISTS `v_user_profile`;
/*!50001 DROP VIEW IF EXISTS `v_user_profile`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_user_profile` AS SELECT 
 1 AS `user_id`,
 1 AS `email`,
 1 AS `role`,
 1 AS `employeeID`,
 1 AS `user_created_at`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `phone`,
 1 AS `birthdate`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `visitor`
--

DROP TABLE IF EXISTS `visitor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitor` (
  `user_id` int unsigned NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_visitor_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visitor`
--

LOCK TABLES `visitor` WRITE;
/*!40000 ALTER TABLE `visitor` DISABLE KEYS */;
INSERT INTO `visitor` VALUES (7,'Jane','Customer','555-0101','2002-08-15','2025-10-28 04:58:27','2025-10-28 04:58:27');
/*!40000 ALTER TABLE `visitor` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `visitor_check_role` BEFORE INSERT ON `visitor` FOR EACH ROW BEGIN
  IF (SELECT role FROM users WHERE user_id = NEW.user_id) <> 'customer' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only users with role=customer can have a visitor profile';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Dumping events for database 'timejumpdb'
--

--
-- Dumping routines for database 'timejumpdb'
--
/*!50003 DROP PROCEDURE IF EXISTS `auth_login` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `auth_login`(
  IN  p_email    VARCHAR(120),
  IN  p_password VARCHAR(255),
  OUT p_user_id  INT UNSIGNED,
  OUT p_role     VARCHAR(20)
)
BEGIN
  SELECT user_id, role
    INTO p_user_id, p_role
  FROM users
  WHERE email = p_email
    AND password_hash = UNHEX(SHA2(p_password,256))
  LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `purchase_parking_pass` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `purchase_parking_pass`(
  IN  p_parking_lot_id SMALLINT UNSIGNED,
  IN  p_service_date   DATE,
  IN  p_transaction_id INT UNSIGNED,
  OUT p_pass_id        INT UNSIGNED
)
BEGIN
  DECLARE v_pld_id INT UNSIGNED;

  START TRANSACTION;

  -- Ensure lot+date inventory row exists (capacity from lot)
  INSERT INTO parking_lot_day (parking_lot_id, service_date, capacity)
  VALUES (
    p_parking_lot_id,
    p_service_date,
    (SELECT capacity FROM parking_lot WHERE parking_lot_id = p_parking_lot_id)
  )
  ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);

  SET v_pld_id = LAST_INSERT_ID();

  -- Lock row and bump sold only if capacity remains
  SELECT id FROM parking_lot_day WHERE id = v_pld_id FOR UPDATE;

  UPDATE parking_lot_day
  SET sold = sold + 1
  WHERE id = v_pld_id
    AND (sold + held) < capacity;

  IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sold out for this lot/date';
  END IF;

  -- Create the pass
  INSERT INTO parking_pass (parking_lot_day_id, parking_lot_id, service_date, transaction_id, status)
  VALUES (v_pld_id, p_parking_lot_id, p_service_date, p_transaction_id, 'purchased');

  SET p_pass_id = LAST_INSERT_ID();

  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `refund_parking_pass` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `refund_parking_pass`(IN p_pass_id INT UNSIGNED)
BEGIN
  DECLARE v_pld_id INT UNSIGNED;

  START TRANSACTION;

  SELECT parking_lot_day_id INTO v_pld_id
  FROM parking_pass
  WHERE pass_id = p_pass_id AND status = 'purchased'
  FOR UPDATE;

  IF v_pld_id IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pass not found or not refundable';
  END IF;

  UPDATE parking_pass SET status = 'refunded' WHERE pass_id = p_pass_id;

  UPDATE parking_lot_day
  SET sold = sold - 1
  WHERE id = v_pld_id AND sold > 0;

  COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_attraction_current_status`
--

/*!50001 DROP VIEW IF EXISTS `v_attraction_current_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY INVOKER */
/*!50001 VIEW `v_attraction_current_status` AS select `ac`.`AttractionID` AS `AttractionID`,`ac`.`StatusID` AS `StatusID`,`cs`.`StatusName` AS `StatusName`,`cs`.`Description` AS `StatusDescription`,`ac`.`StartsAt` AS `StartsAt`,`ac`.`EndsAt` AS `EndsAt`,`ac`.`Note` AS `Note` from (`attraction_closure` `ac` join `cancellation_status` `cs` on((`cs`.`StatusID` = `ac`.`StatusID`))) where ((`ac`.`EndsAt` is null) and (`ac`.`StartsAt` = (select max(`ac2`.`StartsAt`) from `attraction_closure` `ac2` where ((`ac2`.`AttractionID` = `ac`.`AttractionID`) and (`ac2`.`EndsAt` is null))))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_parking_lots_prices`
--

/*!50001 DROP VIEW IF EXISTS `v_parking_lots_prices`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY INVOKER */
/*!50001 VIEW `v_parking_lots_prices` AS select `l`.`parking_lot_id` AS `parking_lot_id`,`l`.`lot_name` AS `lot_name`,`l`.`base_price` AS `base_price`,curdate() AS `service_date`,(select count(0) from `parking_pass` `p` where ((`p`.`parking_lot_id` = `l`.`parking_lot_id`) and (`p`.`service_date` = curdate()))) AS `passes_today` from `parking_lot` `l` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_ticket_with_parking`
--

/*!50001 DROP VIEW IF EXISTS `v_ticket_with_parking`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY INVOKER */
/*!50001 VIEW `v_ticket_with_parking` AS select `t`.`TicketID` AS `TicketID`,`t`.`TicketType` AS `TicketType`,`t`.`Price` AS `Price`,`t`.`PurchaseDate` AS `PurchaseDate`,`t`.`ExpirationDate` AS `ExpirationDate`,`t`.`EntryTime` AS `EntryTime`,`t`.`ParkingPassID` AS `ParkingPassID`,`pp`.`status` AS `pass_status`,`pp`.`service_date` AS `service_date`,`pp`.`parking_lot_id` AS `parking_lot_id`,`l`.`lot_name` AS `lot_name`,`l`.`base_price` AS `base_price` from ((`ticket` `t` left join `parking_pass` `pp` on((`pp`.`pass_id` = `t`.`ParkingPassID`))) left join `parking_lot` `l` on((`l`.`parking_lot_id` = `pp`.`parking_lot_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_user_profile`
--

/*!50001 DROP VIEW IF EXISTS `v_user_profile`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY INVOKER */
/*!50001 VIEW `v_user_profile` AS select `u`.`user_id` AS `user_id`,`u`.`email` AS `email`,`u`.`role` AS `role`,`u`.`employeeID` AS `employeeID`,`u`.`created_at` AS `user_created_at`,`v`.`first_name` AS `first_name`,`v`.`last_name` AS `last_name`,`v`.`phone` AS `phone`,`v`.`birthdate` AS `birthdate` from (`users` `u` left join `visitor` `v` on((`v`.`user_id` = `u`.`user_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-06 23:56:36
