const db = require('../config/db');

const getAll = async () => {
    const sql = ` 
        SELECT AttractionID, Name, AttractionType, Duration, HeightRestriction, Cancelled
        FROM attraction;
        `;

    const [rows] = await db.query(sql);
    return rows
};

const getById = async (id) => {
    const sql = `
        SELECT * FROM attraction
        WHERE AttractionID = ?;
    `;

    const [rows] = await db.query(sql, [id]);
    return rows[0];
}
const create = async (attractionData) => {
  const { 
    Name, 
    AttractionType, 
    ThemeID, 
    Duration, 
    HeightRestriction, 
    RidersPerRow, 
    RidersPerVehicle, 
    Manufacturer, 
    Cancelled 
  } = attractionData;

  const sql = `
    INSERT INTO attraction 
      (Name, AttractionType, ThemeID, Duration, HeightRestriction, RidersPerRow, RidersPerVehicle, Manufacturer, Cancelled) 
    VALUES 
      (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  
  const [result] = await db.query(sql, [
    Name, 
    AttractionType, 
    ThemeID, 
    Duration, 
    HeightRestriction, 
    RidersPerRow, 
    RidersPerVehicle, 
    Manufacturer, 
    Cancelled
  ]);
  
  // Return the ID of the new attraction
  return { id: result.insertId, ...attractionData };
};

const update = async (id, attractionData) => {
  const { 
    Name, 
    AttractionType, 
    ThemeID, 
    Duration, 
    HeightRestriction, 
    RidersPerRow, 
    RidersPerVehicle, 
    Manufacturer, 
    Cancelled 
  } = attractionData;

  const sql = `
    UPDATE attraction 
    SET 
      Name = ?, 
      AttractionType = ?, 
      ThemeID = ?, 
      Duration = ?, 
      HeightRestriction = ?, 
      RidersPerRow = ?, 
      RidersPerVehicle = ?, 
      Manufacturer = ?, 
      Cancelled = ?
    WHERE 
      AttractionID = ?;
  `;
  
  const [result] = await db.query(sql, [
    Name, 
    AttractionType, 
    ThemeID, 
    Duration, 
    HeightRestriction, 
    RidersPerRow, 
    RidersPerVehicle, 
    Manufacturer, 
    Cancelled,
    id 
  ]);
  
  return result;
};

const remove = async (id) => {
  const sql = `
    DELETE FROM attraction 
    WHERE AttractionID = ?;
  `;
  
  const [result] = await db.query(sql, [id]);
  return result;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};