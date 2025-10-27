const { pool, allowedOrigin } = require('../db');

async function getAttractions(res) {
  const sql = `
    SELECT
      a.AttractionID,
      a.Name,
      COALESCE(atype.TypeName, 'Unknown')  AS Type,
      COALESCE(t.themeName, 'Unassigned')  AS Theme,
      a.HeightRestriction,
      a.RidersPerVehicle
    FROM attraction a
    LEFT JOIN attraction_type atype
      ON a.AttractionTypeID = atype.AttractionTypeID
    LEFT JOIN theme t
      ON a.ThemeID = t.themeID
    ORDER BY a.Name;
  `;
  const [rows] = await pool.query(sql);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin
  });
  res.end(JSON.stringify(rows));
}

module.exports = { getAttractions };
