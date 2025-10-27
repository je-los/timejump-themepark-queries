import { createServer } from 'http';
import { parse as parseUrl } from 'url';
import { StringDecoder } from 'string_decoder';
import dotenv from 'dotenv';
import { query } from './db.js';
import { BASE_ATTENDANCE, MULTIPLIERS, RIDE_CONFIGS, OPERATING_HOURS, THEMES } from './rides_config.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

dotenv.config();
const PORT = Number(process.env.PORT || 5175);
const CORS = process.env.CORS_ORIGIN || 'http://localhost:5173';

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}
function parseBody(req){
  return new Promise(resolve=>{
    const dec = new StringDecoder('utf8'); let buf='';
    req.on('data',d=>buf+=dec.write(d));
    req.on('end',()=>{ buf+=dec.end(); try{ resolve(buf?JSON.parse(buf):{});}catch{resolve({});} });
  });
}
function getAuth(req){
  const h = req.headers['authorization']; if(!h) return null;
  const [kind, tok] = h.split(' ');
  if (kind!=='Bearer' || !tok) return null;
  return verifyToken(tok);
}
function requireRole(auth, roles){
  if(!auth) return false;
  if(roles.includes('employee') && ['employee','admin','owner'].includes(auth.role)) return true;
  if(roles.includes('admin') && ['admin','owner'].includes(auth.role)) return true;
  if(roles.includes('owner') && auth.role==='owner') return true;
  return roles.includes(auth.role);
}

const server = createServer(async (req, res) => {
  const { pathname, query: q } = parseUrl(req.url, true);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    return res.end();
  }

  try {
    // ---- Health
    if (pathname === '/api/health' && req.method === 'GET') {
      const r = await query('SELECT 1 AS ok');
      return sendJSON(res, 200, { ok:true, db: r[0]?.ok === 1 });
    }

    // ---- Auth
    if (pathname === '/api/auth/signup' && req.method === 'POST') {
      const { email, password } = await parseBody(req);
      if (!email || !password) return sendJSON(res, 400, { ok:false, error:'email & password required' });
      const exists = await query('SELECT user_id FROM users WHERE email=?',[email]);
      if (exists.length) return sendJSON(res, 409, { ok:false, error:'email already exists' });
      const ph = hashPassword(password);
      const r = await query('INSERT INTO users (email,password_hash,role) VALUES (?,?,?)',[email, ph, 'customer']);
      const token = signToken({ user_id:r.insertId, email, role:'customer' });
      return sendJSON(res, 200, { ok:true, token });
    }
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await parseBody(req);
      const rows = await query('SELECT user_id,email,role,password_hash FROM users WHERE email=?',[email]);
      if (!rows.length) return sendJSON(res, 401, { ok:false, error:'invalid credentials' });
      const u = rows[0];
      if (!verifyPassword(password, u.password_hash)) return sendJSON(res, 401, { ok:false, error:'invalid credentials' });
      const token = signToken({ user_id:u.user_id, email:u.email, role:u.role });
      return sendJSON(res, 200, { ok:true, token });
    }
    if (pathname === '/api/me' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!auth) return sendJSON(res, 401, { ok:false, error:'unauthorized' });
      return sendJSON(res, 200, { ok:true, me: auth });
    }

    // ---- Catalog (Gift/Food)
    if (pathname === '/api/gift-items' && req.method === 'GET') {
      const rows = await query('SELECT item_id, name, price FROM gift_item WHERE is_active=1 ORDER BY item_id DESC');
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    if (pathname === '/api/food-items' && req.method === 'GET') {
      const rows = await query('SELECT item_id, name, price FROM menu_item WHERE is_active=1 ORDER BY item_id DESC');
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    if (pathname === '/api/gift-items' && req.method === 'POST') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const { name, price } = await parseBody(req);
      const r = await query('INSERT INTO gift_item (name, price) VALUES (?,?)',[name,Number(price)]);
      return sendJSON(res, 200, { ok:true, id: r.insertId });
    }
    if (pathname === '/api/food-items' && req.method === 'POST') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const { name, price } = await parseBody(req);
      const r = await query('INSERT INTO menu_item (name, price) VALUES (?,?)',[name,Number(price)]);
      return sendJSON(res, 200, { ok:true, id: r.insertId });
    }

    // ---- Tickets & Parking (prices from DB)
    if (pathname === '/api/ticket-types' && req.method === 'GET') {
      const rows = await query('SELECT ticket_type AS name, price FROM ticket_catalog ORDER BY ticket_type');
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    if (pathname === '/api/ticket-types' && req.method === 'POST') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const { name, price } = await parseBody(req);
      if (!name || price === undefined) return sendJSON(res, 400, { ok:false, error:'name and price required' });
      await query('INSERT INTO ticket_catalog (ticket_type, price) VALUES (?,?)',[name, Number(price)]);
      return sendJSON(res, 200, { ok:true });
    }
    if (pathname === '/api/parking-lots' && req.method === 'GET') {
      const rows = await query(`
        SELECT parking_lot_name AS name, MAX(parking_price) AS price
        FROM parking
        GROUP BY parking_lot_name
        ORDER BY FIELD(parking_lot_name,'Lot A','Lot B','Lot C','Lot D','Lot E'), parking_lot_name
      `);
      const data = rows.map((row, idx)=>({
        name: row.name,
        price: Number(row.price ?? 0),
        item_id: `${row.name || 'Lot'}-${idx}`
      }));
      return sendJSON(res, 200, { ok:true, data });
    }
    if (pathname === '/api/parking-lots' && req.method === 'POST') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const { name, price } = await parseBody(req);
      if (!name || price === undefined) return sendJSON(res, 400, { ok:false, error:'name and price required' });
      await query('INSERT INTO parking (parking_lot_name, parking_price) VALUES (?,?)',[name, Number(price)]);
      return sendJSON(res, 200, { ok:true });
    }
    if (pathname === '/api/parking/prices' && req.method === 'GET') {
      const rows = await query(`
        SELECT parking_lot_name AS lot, MAX(parking_price) AS price
        FROM parking
        GROUP BY parking_lot_name
        ORDER BY FIELD(parking_lot_name,'Lot A','Lot B','Lot C','Lot D','Lot E')
      `);
      return sendJSON(res, 200, { ok:true, data: rows });
    }

    if (pathname === '/api/rides/dragon-riders-fury' && req.method === 'GET') {
      const rideRow = await query(`
        SELECT AttractionID, Name, AttractionType, Duration, HeightRestriction, RidersPerRow, RidersPerVehicle, Manufacturer
        FROM attraction
        WHERE Name = ?
        LIMIT 1
      `, ["Dragon Rider's Fury"]);
      const ride = rideRow[0] || null;
      const config = RIDE_CONFIGS.find(r => r.name === "Dragon Rider's Fury");
      let forecast = null;
      if (config) {
        const baseAttendance = BASE_ATTENDANCE * MULTIPLIERS.seasonal.shoulder * MULTIPLIERS.day_of_week.weekday;
        const hourly = MULTIPLIERS.hourly_distribution.slice(0, OPERATING_HOURS).map((fraction, idx) => {
          const potentialBoardings = baseAttendance * fraction * config.attraction_rate;
          const capped = Math.min(Math.round(potentialBoardings), config.capacity_cap);
          return {
            hour: 10 + idx,
            expected_boardings: capped
          };
        });
        const total = hourly.reduce((sum, row) => sum + row.expected_boardings, 0);
        forecast = {
          capacity_cap: config.capacity_cap,
          attraction_rate: config.attraction_rate,
          failure_rate: config.failure_rate,
          expected_daily_boardings: total,
          hourly_breakdown: hourly
        };
      }
      return sendJSON(res, 200, { ok:true, data: { ride, forecast } });
    }

    // ---- Attractions
    if (pathname === '/api/themes' && req.method === 'GET') {
      const rows = await query('SELECT themeID, themeName FROM theme ORDER BY themeID');
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    const themeMatch = pathname.match(/^\/api\/themes\/(\d+)$/);
    if (themeMatch && req.method === 'GET') {
      const themeID = Number(themeMatch[1]);
      const rides = await query(`
        SELECT AttractionID, Name, AttractionType, Duration, HeightRestriction, RidersPerRow, RidersPerVehicle, Manufacturer
        FROM attraction WHERE ThemeID=? ORDER BY AttractionType, AttractionID LIMIT 50
      `,[themeID]);
      const shows = await query('SELECT show_id, ShowName, Duration FROM show_event WHERE ThemeID=? LIMIT 1',[themeID]);
      return sendJSON(res, 200, { ok:true, rides, show: shows[0] || null });
    }

    // ---- Ops (restricted)
    if (pathname === '/api/employees' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['employee','admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const rows = await query('SELECT employeeID, name, salary, role, start_date, end_date, email FROM employee ORDER BY employeeID DESC LIMIT 200');
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    if (pathname === '/api/maintenance' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['employee','admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const rows = await query(`
        SELECT RecordID, AttractionID, EmployeeID, Date_broken_down, Date_fixed, type_of_maintenance, Severity_of_report
        FROM maintenance_records ORDER BY RecordID DESC LIMIT 200
      `);
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    if (pathname === '/api/incidents' && req.method === 'GET') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['employee','admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const rows = await query('SELECT IncidentID, IncidentType, EmployeeID, TicketID, Details FROM incidents ORDER BY IncidentID DESC LIMIT 200');
      return sendJSON(res, 200, { ok:true, data: rows });
    }

    // ---- Cancellation reasons & logging
    if (pathname === '/api/cancellation-reasons' && req.method === 'GET') {
      const rows = await query('SELECT reason_id, code, label FROM cancellation_reason ORDER BY reason_id');
      return sendJSON(res, 200, { ok:true, data: rows });
    }
    if (pathname === '/api/ride-cancellations' && req.method === 'POST') {
      const auth = getAuth(req);
      if (!requireRole(auth, ['employee','admin','owner'])) return sendJSON(res, 403, { ok:false, error:'forbidden' });
      const { AttractionID, cancel_date, reason_code, reason_id, notes } = await parseBody(req);
      let rid = reason_id;
      if (!rid && reason_code) {
        const r = await query('SELECT reason_id FROM cancellation_reason WHERE code=?',[String(reason_code).toLowerCase()]);
        if (!r.length) return sendJSON(res, 400, { ok:false, error:'invalid reason_code' });
        rid = r[0].reason_id;
      }
      if (!AttractionID || !cancel_date || !rid) return sendJSON(res, 400, { ok:false, error:'AttractionID, cancel_date, and reason required' });
      const r = await query('INSERT INTO ride_cancellation (AttractionID,cancel_date,reason_id,notes) VALUES (?,?,?,?)',
        [Number(AttractionID), cancel_date, Number(rid), notes||null]);
      return sendJSON(res, 200, { ok:true, id:r.insertId });
    }

    // ---- Reports
    if (pathname === '/api/reports/cancellations' && req.method === 'GET') {
      const { start, end, reasons } = q;
      if (!start || !end) return sendJSON(res, 400, { ok:false, error:'start and end required' });

      let where = 'rc.cancel_date BETWEEN ? AND ?';
      const params = [start, end];

      if (reasons) {
        const codes = String(reasons).split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
        if (codes.length) {
          const ids = await query(`SELECT reason_id FROM cancellation_reason WHERE code IN (${codes.map(()=>'?').join(',')})`, codes);
          if (!ids.length) return sendJSON(res, 200, { ok:true, data: [] });
          where += ` AND rc.reason_id IN (${ids.map(()=>'?').join(',')})`;
          params.push(...ids.map(r=>r.reason_id));
        }
      }

      const data = await query(
        `SELECT a.Name AS attraction, rc.cancel_date, cr.code AS reason_code, cr.label AS reason_label, rc.notes
         FROM ride_cancellation rc
         JOIN cancellation_reason cr ON cr.reason_id = rc.reason_id
         JOIN attraction a ON a.AttractionID = rc.AttractionID
         WHERE ${where}
         ORDER BY rc.cancel_date DESC`,
        params
      );
      return sendJSON(res, 200, { ok:true, data });
    }

    if (pathname === '/api/reports/cancellations/summary' && req.method === 'GET') {
      const { start, end } = q;
      if (!start || !end) return sendJSON(res, 400, { ok:false, error:'start and end required' });
      const rows = await query(
        `SELECT cr.code, cr.label, COUNT(*) AS cnt
         FROM ride_cancellation rc
         JOIN cancellation_reason cr ON cr.reason_id = rc.reason_id
         WHERE rc.cancel_date BETWEEN ? AND ?
         GROUP BY cr.reason_id, cr.code, cr.label
         ORDER BY cnt DESC`,
        [start, end]
      );
      return sendJSON(res, 200, { ok:true, data: rows });
    }

    // ---- Parking availability (optional)
    if (pathname === '/api/parking/availability' && req.method === 'GET') {
      const date = q.date;
      if (!date) return sendJSON(res, 400, { ok:false, error:'date is required (YYYY-MM-DD)' });
      const rows = await query(
        `SELECT p.ParkingID, p.parking_lot_name, p.parking_space_number, p.parking_price,
                IF(pr.ReservationID IS NULL, 1, 0) AS is_available
         FROM parking p
         LEFT JOIN parking_reservation pr
           ON pr.ParkingID = p.ParkingID AND pr.reservation_date = ?
         ORDER BY p.parking_lot_name, p.parking_space_number
         LIMIT 500`,
        [date]
      );
      return sendJSON(res, 200, { ok:true, data: rows });
    }

    // 404
    return sendJSON(res, 404, { ok:false, error:'Not found' });
  } catch (e) {
    console.error(e);
    return sendJSON(res, 500, { ok:false, error:'Server error' });
  }
});

server.listen(PORT, () => console.log(`Basic Node server listening on :${PORT}`));
    if (pathname === '/api/ride-library' && req.method === 'GET') {
      const themes = THEMES.map(theme => ({
        name: theme.name,
        slug: theme.slug,
        description: theme.description,
        rides: theme.rides.map(ride => ({
          id: ride.id,
          name: ride.name,
          slug: ride.slug,
          type: ride.type
        }))
      }));
      const rides = RIDE_CONFIGS.map(ride => ({
        id: ride.id,
        name: ride.name,
        slug: ride.slug,
        theme: ride.theme,
        type: ride.type
      }));
      return sendJSON(res, 200, { ok:true, data: { themes, rides } });
    }
    const themeMatchSlug = pathname.match(/^\/api\/ride-library\/themes\/([a-z0-9\-]+)$/);
    if (themeMatchSlug && req.method === 'GET') {
      const themeSlug = themeMatchSlug[1];
      const theme = THEMES.find(t=>t.slug === themeSlug);
      if (!theme) return sendJSON(res, 404, { ok:false, error:'theme not found' });
      const rideIds = theme.rides.map(r=>r.id);
      const rideRows = rideIds.length ? await query(`
        SELECT AttractionID, Name, AttractionType, Duration, HeightRestriction, RidersPerRow, RidersPerVehicle, Manufacturer
        FROM attraction
        WHERE AttractionID IN (${rideIds.map(()=>'?').join(',')})
      `, rideIds) : [];
      const rideMap = new Map(rideRows.map(row => [row.AttractionID, row]));
      const rides = theme.rides.map(ride => ({
        ...ride,
        details: rideMap.get(ride.id) || null
      }));
      return sendJSON(res, 200, { ok:true, data: { ...theme, rides } });
    }
    const rideMatchSlug = pathname.match(/^\/api\/ride-library\/rides\/([a-z0-9\-]+)$/);
    if (rideMatchSlug && req.method === 'GET') {
      const rideSlug = rideMatchSlug[1];
      const rideConfig = RIDE_CONFIGS.find(r=>r.slug === rideSlug);
      if (!rideConfig) return sendJSON(res, 404, { ok:false, error:'ride not found' });
      const rideRow = await query(`
        SELECT AttractionID, Name, AttractionType, Duration, HeightRestriction, RidersPerRow, RidersPerVehicle, Manufacturer
        FROM attraction
        WHERE AttractionID = ?
        LIMIT 1
      `,[rideConfig.id]);
      const ride = rideRow[0] || null;

      let forecast = null;
      if (rideConfig) {
        const baseAttendance = BASE_ATTENDANCE * MULTIPLIERS.seasonal.shoulder * MULTIPLIERS.day_of_week.weekday;
        const hourlyFractions = MULTIPLIERS.hourly_distribution.slice(0, Math.min(OPERATING_HOURS, MULTIPLIERS.hourly_distribution.length));
        const hourly = hourlyFractions.map((fraction, idx)=>{
          const potential = baseAttendance * fraction * rideConfig.attraction_rate;
          const boardings = Math.min(Math.round(potential), rideConfig.capacity_cap);
          return {
            hour: 10 + idx,
            expected_boardings: boardings
          };
        });
        const total = hourly.reduce((sum, row)=>sum + row.expected_boardings, 0);
        forecast = {
          capacity_cap: rideConfig.capacity_cap,
          attraction_rate: rideConfig.attraction_rate,
          failure_rate: rideConfig.failure_rate,
          expected_daily_boardings: total,
          hourly_breakdown: hourly
        };
      }
      return sendJSON(res, 200, { ok:true, data: { ride, config: rideConfig, forecast } });
    }
