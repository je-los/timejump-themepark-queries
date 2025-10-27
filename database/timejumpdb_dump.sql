CREATE DATABASE  IF NOT EXISTS `timejumpdb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `timejumpdb`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: timejumpdb
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
  `Name` varchar(25) NOT NULL,
  `AttractionType` smallint NOT NULL,
  `ThemeID` int NOT NULL,
  `Duration` time NOT NULL,
  `HeightRestriction` smallint NOT NULL,
  `RidersPerRow` smallint NOT NULL,
  `RidersPerVehicle` smallint NOT NULL,
  `Manufacturer` varchar(60) NOT NULL,
  `Cancelled` smallint NOT NULL,
  PRIMARY KEY (`AttractionID`),
  KEY `AttractionType_idx` (`AttractionType`),
  KEY `Cancelled_idx` (`Cancelled`),
  KEY `ThemeID_idx` (`ThemeID`),
  CONSTRAINT `attraction_chk_1` CHECK ((`HeightRestriction` between 0 and 50)),
  CONSTRAINT `attraction_chk_2` CHECK ((`Cancelled` between 0 and 2)),
  CONSTRAINT `chk_duration` CHECK (((`Duration` >= TIME'00:00:01') and (`Duration` <= TIME'01:00:00'))),
  CONSTRAINT `chk_riders` CHECK (((`RidersPerRow` >= 0) and (`RidersPerRow` <= 4)))
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attraction`
--

LOCK TABLES `attraction` WRITE;
/*!40000 ALTER TABLE `attraction` DISABLE KEYS */;
/*!40000 ALTER TABLE `attraction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attraction_type`
--

DROP TABLE IF EXISTS `attraction_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attraction_type` (
  `AttractionType` smallint NOT NULL,
  `AttractionDesc` varchar(50) NOT NULL,
  PRIMARY KEY (`AttractionType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attraction_type`
--

LOCK TABLES `attraction_type` WRITE;
/*!40000 ALTER TABLE `attraction_type` DISABLE KEYS */;
/*!40000 ALTER TABLE `attraction_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cancellation`
--

DROP TABLE IF EXISTS `cancellation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cancellation` (
  `Cancelled` smallint NOT NULL,
  `Reasoning` varchar(50) NOT NULL,
  PRIMARY KEY (`Cancelled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cancellation`
--

LOCK TABLES `cancellation` WRITE;
/*!40000 ALTER TABLE `cancellation` DISABLE KEYS */;
/*!40000 ALTER TABLE `cancellation` ENABLE KEYS */;
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
  `role` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `email` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`employeeID`),
  CONSTRAINT `chk_end` CHECK (((`end_date` is null) or (`end_date` >= `start_date`))),
  CONSTRAINT `chk_pos_digits` CHECK (((`role` <= 999999) and (`role` >= 100000))),
  CONSTRAINT `chk_salary` CHECK (((`salary` >= 0.00) and (`salary` <= 200000.00)))
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee`
--

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
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
  `CuisineType` varchar(30) NOT NULL,
  `Location` varchar(50) NOT NULL,
  `ContractStart` date NOT NULL,
  `ContractEnd` date DEFAULT NULL,
  PRIMARY KEY (`VendorID`),
  CONSTRAINT `chk_contract_dates` CHECK (((`ContractEnd` is null) or (`ContractEnd` >= `ContractStart`)))
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
  `shop_id` int unsigned DEFAULT NULL,
  `name` varchar(80) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`item_id`),
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
  `NumEmployees` smallint NOT NULL,
  PRIMARY KEY (`ShopID`),
  CONSTRAINT `chk_dates_order` CHECK (((`CloseDate` is null) or (`CloseDate` >= `OpenDate`))),
  CONSTRAINT `chk_numemployees_min` CHECK ((`NumEmployees` >= 4)),
  CONSTRAINT `chk_revenue_notneg` CHECK (((`Revenue` is null) or (`Revenue` >= 0)))
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
-- Table structure for table `incidents`
--

DROP TABLE IF EXISTS `incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidents` (
  `IncidentID` int unsigned NOT NULL AUTO_INCREMENT,
  `IncidentType` smallint NOT NULL,
  `EmployeeID` int NOT NULL,
  `TicketID` int DEFAULT NULL,
  `Details` varchar(300) DEFAULT NULL,
  PRIMARY KEY (`IncidentID`)
) ENGINE=InnoDB AUTO_INCREMENT=10000000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `RecordID` int NOT NULL AUTO_INCREMENT,
  `AttractionID` int NOT NULL,
  `EmployeeID` int NOT NULL,
  `Date_broken_down` date NOT NULL,
  `Date_fixed` date DEFAULT NULL,
  `type_of_maintenance` enum('inspection','repair','cleaning','software','calibration','emergency') NOT NULL,
  `Description_of_work` text,
  `Duration_of_repair` decimal(6,2) DEFAULT NULL,
  `Issue_reported` text NOT NULL,
  `Severity_of_report` enum('low','medium','high','critical') NOT NULL,
  `pre_condition_status` enum('operational','limited','out_of_service') NOT NULL,
  `post_condition_status` enum('operational','limited','out_of_service') DEFAULT NULL,
  `Safety_check_status` tinyint(1) DEFAULT NULL,
  `Approved_by_supervisor` int DEFAULT NULL,
  PRIMARY KEY (`RecordID`),
  CONSTRAINT `chk_desc_len` CHECK ((char_length(`Description_of_work`) <= 1000)),
  CONSTRAINT `chk_issue_len` CHECK ((char_length(`Issue_reported`) <= 500)),
  CONSTRAINT `chk_mr_dates` CHECK (((`Date_fixed` is null) or (`Date_fixed` >= `Date_broken_down`))),
  CONSTRAINT `chk_mr_duration` CHECK (((`Duration_of_repair` is null) or (`Duration_of_repair` >= 0))),
  CONSTRAINT `chk_mr_safety_bool` CHECK (((`Safety_check_status` is null) or (`Safety_check_status` in (0,1))))
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
-- Table structure for table `menu_item`
--

DROP TABLE IF EXISTS `menu_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_item` (
  `item_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned DEFAULT NULL,
  `name` varchar(80) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`item_id`),
  CONSTRAINT `menu_item_chk_1` CHECK ((`price` >= 0))
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
-- Table structure for table `parking`
--

DROP TABLE IF EXISTS `parking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking` (
  `ParkingID` int unsigned NOT NULL AUTO_INCREMENT,
  `parking_lot_name` enum('Lot A','Lot B','Lot C','Lot D','Lot E') NOT NULL,
  `parking_space_number` smallint unsigned NOT NULL,
  `availability` tinyint(1) NOT NULL DEFAULT '1',
  `parking_price` decimal(5,2) GENERATED ALWAYS AS ((case `parking_lot_name` when _utf8mb4'Lot A' then 150.00 when _utf8mb4'Lot B' then 120.00 when _utf8mb4'Lot C' then 100.00 when _utf8mb4'Lot D' then 80.00 when _utf8mb4'Lot E' then 60.00 end)) STORED,
  `TransactionID` int DEFAULT NULL,
  PRIMARY KEY (`ParkingID`),
  UNIQUE KEY `uq_lot_space` (`parking_lot_name`,`parking_space_number`),
  CONSTRAINT `chk_availability` CHECK ((`availability` in (0,1))),
  CONSTRAINT `chk_price_0_500` CHECK ((`parking_price` between 0 and 500)),
  CONSTRAINT `chk_space_number` CHECK ((`parking_space_number` between 1 and 1000))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking`
--

LOCK TABLES `parking` WRITE;
/*!40000 ALTER TABLE `parking` DISABLE KEYS */;
/*!40000 ALTER TABLE `parking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parking_reservation`
--

DROP TABLE IF EXISTS `parking_reservation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_reservation` (
  `ReservationID` int unsigned NOT NULL AUTO_INCREMENT,
  `ParkingID` int unsigned NOT NULL,
  `reservation_date` date NOT NULL,
  `TransactionID` int DEFAULT NULL,
  `status` enum('held','purchased','refunded','canceled') NOT NULL DEFAULT 'purchased',
  PRIMARY KEY (`ReservationID`),
  UNIQUE KEY `uq_space_per_day` (`ParkingID`,`reservation_date`),
  KEY `idx_date` (`reservation_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_reservation`
--

LOCK TABLES `parking_reservation` WRITE;
/*!40000 ALTER TABLE `parking_reservation` DISABLE KEYS */;
/*!40000 ALTER TABLE `parking_reservation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `positions` (
  `PositionID` int NOT NULL,
  `RoleName` varchar(45) NOT NULL,
  PRIMARY KEY (`PositionID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `positions`
--

LOCK TABLES `positions` WRITE;
/*!40000 ALTER TABLE `positions` DISABLE KEYS */;
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
  `AttractionID` int NOT NULL,
  `log_date` date NOT NULL,
  `riders_count` int NOT NULL,
  PRIMARY KEY (`log_id`),
  UNIQUE KEY `uq_attr_day` (`AttractionID`,`log_date`),
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
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `ScheduleID` int unsigned NOT NULL AUTO_INCREMENT,
  `EmployeeID` int NOT NULL,
  `AttractionID` int NOT NULL,
  `Shift_date` date NOT NULL,
  `Start_time` time NOT NULL,
  `End_time` time NOT NULL,
  PRIMARY KEY (`ScheduleID`),
  UNIQUE KEY `uq_emp_day_attr_start` (`EmployeeID`,`Shift_date`,`AttractionID`,`Start_time`),
  CONSTRAINT `chk_sched_time_order` CHECK ((`End_time` > `Start_time`)),
  CONSTRAINT `chk_sched_time_window` CHECK (((`Start_time` between _utf8mb4'12:00:00' and _utf8mb4'23:59:59') and (`End_time` between _utf8mb4'12:00:00' and _utf8mb4'23:59:59')))
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
  PRIMARY KEY (`show_id`)
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
-- Table structure for table `theme`
--

DROP TABLE IF EXISTS `theme`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `theme` (
  `themeID` int NOT NULL AUTO_INCREMENT,
  `themeName` varchar(50) NOT NULL,
  `numAttraction` int DEFAULT NULL,
  PRIMARY KEY (`themeID`),
  UNIQUE KEY `themeID` (`themeID`),
  CONSTRAINT `theme_chk_1` CHECK ((`numAttraction` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `theme`
--

LOCK TABLES `theme` WRITE;
/*!40000 ALTER TABLE `theme` DISABLE KEYS */;
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
  `Price` decimal(6,2) NOT NULL,
  `PurchaseDate` date NOT NULL,
  `ExpirationDate` date NOT NULL,
  `EntryTime` datetime DEFAULT NULL,
  `ParkingID` int DEFAULT NULL,
  PRIMARY KEY (`TicketID`),
  CONSTRAINT `chk_ticket_entrytime_window` CHECK (((`EntryTime` is null) or (cast(`EntryTime` as time) between _utf8mb4'12:00:00' and _utf8mb4'23:59:59'))),
  CONSTRAINT `chk_ticket_expiration` CHECK ((`ExpirationDate` > `PurchaseDate`)),
  CONSTRAINT `chk_ticket_price` CHECK (((`Price` >= 0) and (`Price` <= 500))),
  CONSTRAINT `chk_ticket_type_size` CHECK ((char_length(`TicketType`) <= 30))
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
INSERT INTO `ticket_catalog` VALUES ('Child',35.00),('General',50.00),('VIP',120.00);
/*!40000 ALTER TABLE `ticket_catalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `transactionID` int NOT NULL AUTO_INCREMENT,
  `transDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `employeeID` int DEFAULT NULL,
  `payment_method` enum('card','cash','online') NOT NULL,
  `payment_status` enum('pending','authorized','captured','refunded','voided') NOT NULL DEFAULT 'captured',
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `tax_rate_percent` decimal(5,2) DEFAULT NULL,
  `jurisdiction` varchar(32) DEFAULT NULL,
  `themeID` int DEFAULT NULL,
  PRIMARY KEY (`transactionID`),
  CONSTRAINT `chk_total_math` CHECK ((`total` = round(((`subtotal` + `tax_amount`) - `discount_amount`),2)))
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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(120) NOT NULL,
  `password_hash` varbinary(128) NOT NULL,
  `role` enum('customer','employee','admin','owner') NOT NULL DEFAULT 'customer',
  `employeeID` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'owner@example.com',_binary '\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0','owner',NULL,'2025-10-22 09:32:25');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visitors`
--

DROP TABLE IF EXISTS `visitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitors` (
  `TicketID` int NOT NULL,
  `FirstName` varchar(45) DEFAULT NULL,
  `LastName` varchar(45) DEFAULT NULL,
  `PhoneNumber` varchar(15) DEFAULT NULL,
  `Email` varchar(30) DEFAULT NULL,
  `BirthDate` date DEFAULT NULL,
  `EntryDate` date DEFAULT NULL,
  PRIMARY KEY (`TicketID`),
  CONSTRAINT `chk_phone_format` CHECK (regexp_like(`PhoneNumber`,_utf8mb4'^[+]?[0-9\\s\\(\\)-]{10,15}$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visitors`
--

LOCK TABLES `visitors` WRITE;
/*!40000 ALTER TABLE `visitors` DISABLE KEYS */;
/*!40000 ALTER TABLE `visitors` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-22  6:20:35
