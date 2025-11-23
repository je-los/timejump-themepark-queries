-- Automatically close all attractions when a weather report is logged
DELIMITER $$

CREATE TRIGGER weather_cancellation_auto_close_attractions
AFTER INSERT ON ride_cancellation
FOR EACH ROW
BEGIN
  -- Only trigger for weather-related reasons
  IF NEW.reason IN ('Heavy Rain', 'Lightning', 'Lightning Advisory') THEN
    INSERT INTO attraction_closure (AttractionID, StatusID, StartsAt, EndsAt, Note)
    SELECT 
      a.AttractionID,
      2, -- StatusID 2 = "Closed due to weather"
      NOW(),
      NULL,
      CONCAT('Weather alert: ', NEW.reason)
    FROM attraction a
    WHERE NOT EXISTS (
      -- Don't close if already closed on this date for weather
      SELECT 1 FROM attraction_closure ac
      WHERE ac.AttractionID = a.AttractionID
        AND ac.StatusID = 2
        AND DATE(ac.StartsAt) = NEW.cancel_date
        AND ac.EndsAt IS NULL
    );
  END IF;
END$$

DELIMITER ;
