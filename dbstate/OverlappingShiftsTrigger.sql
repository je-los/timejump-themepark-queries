-- Prevent overlapping shifts for the same employee on the same date
DELIMITER $$

CREATE TRIGGER prevent_overlap_shifts
BEFORE INSERT ON schedules
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.EmployeeID = NEW.EmployeeID
      AND s.Shift_date = NEW.Shift_date
      AND NOT (NEW.End_time <= s.Start_time OR NEW.Start_time >= s.End_time)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee already has a shift during this timeframe';
  END IF;
END$$

CREATE TRIGGER schedules_before_update_no_overlap
BEFORE UPDATE ON schedules
FOR EACH ROW
BEGIN
  IF (NEW.Shift_date <> OLD.Shift_date OR NEW.Start_time <> OLD.Start_time OR NEW.End_time <> OLD.End_time) THEN
    IF EXISTS (
      SELECT 1 FROM schedules s
      WHERE s.EmployeeID = NEW.EmployeeID
        AND s.Shift_date = NEW.Shift_date
        AND s.ScheduleID <> NEW.ScheduleID
        AND NOT (NEW.End_time <= s.Start_time OR NEW.Start_time >= s.End_time)
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee already has a shift during this timeframe';
    END IF;
  END IF;
END$$

DELIMITER ;