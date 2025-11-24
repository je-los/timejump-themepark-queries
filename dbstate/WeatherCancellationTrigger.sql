-- Automatically close all attractions when a weather report is logged
DELIMITER $$

CREATE TRIGGER weather_cancellation_auto_close_attractions
AFTER INSERT ON ride_cancellation
FOR EACH ROW
BEGIN
  -- Only trigger when the weather report is for today
  IF NEW.reason IN ('Heavy Rain', 'Light Rain', 'Lightning', 'Lightning Advisory', 'Thunderstorm', 'Snow', 'Hail', 'Tornado', 'Hurricane')
     AND DATE(NEW.cancel_date) = CURDATE() THEN
    INSERT INTO attraction_closure (AttractionID, StatusID, StartsAt, EndsAt, Note)
    SELECT 
      a.AttractionID,
      2, -- StatusID 2 = "Closed due to weather"
      NOW(),
      NULL,
      CONCAT('Weather alert: ', NEW.reason)
    FROM attraction a
    WHERE NOT EXISTS (
      SELECT 1 FROM attraction_closure ac
      WHERE ac.AttractionID = a.AttractionID
        AND ac.StatusID = 2
        AND DATE(ac.StartsAt) = CURDATE()
        AND ac.EndsAt IS NULL
    );
  END IF;
END$$

DELIMITER ;
