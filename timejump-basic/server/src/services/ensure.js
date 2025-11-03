import { query } from '../db.js';
import { todayISO } from '../utils/date.js';

const cache = new Map();

export async function ensureDefaultTheme() {
  if (cache.has('defaultTheme')) return cache.get('defaultTheme');
  const rows = await query(
    'SELECT themeID FROM theme ORDER BY themeID ASC LIMIT 1',
  ).catch(() => []);
  if (rows.length) {
    const id = rows[0].themeID;
    cache.set('defaultTheme', id);
    return id;
  }
  const result = await query(
    'INSERT INTO theme (themeName, Description) VALUES (?, ?)',
    ['Operations Hub', 'Fallback theme created automatically for inventory items.'],
  );
  cache.set('defaultTheme', result.insertId);
  return result.insertId;
}

export async function ensureDefaultGiftShop() {
  if (cache.has('defaultGiftShop')) return cache.get('defaultGiftShop');
  const rows = await query(
    'SELECT ShopID FROM gift_shops ORDER BY ShopID ASC LIMIT 1',
  ).catch(() => []);
  if (rows.length) {
    const id = rows[0].ShopID;
    cache.set('defaultGiftShop', id);
    return id;
  }
  const themeId = await ensureDefaultTheme();
  const result = await query(
    'INSERT INTO gift_shops (ThemeID, ShopName, Revenue, OpenDate) VALUES (?, ?, NULL, ?)',
    [themeId, 'Central Gift Shop', todayISO()],
  );
  cache.set('defaultGiftShop', result.insertId);
  return result.insertId;
}

export async function ensureDefaultFoodVendor() {
  if (cache.has('defaultVendor')) return cache.get('defaultVendor');
  const rows = await query(
    'SELECT VendorID FROM food_vendor ORDER BY VendorID ASC LIMIT 1',
  ).catch(() => []);
  if (rows.length) {
    const id = rows[0].VendorID;
    cache.set('defaultVendor', id);
    return id;
  }
  const result = await query(
    'INSERT INTO food_vendor (VendorName) VALUES (?)',
    ['Central Dining'],
  );
  cache.set('defaultVendor', result.insertId);
  return result.insertId;
}

export async function ensureParkingCatalogTable() {
  if (cache.has('parkingCatalog')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS parking_catalog (
      lot_name VARCHAR(60) PRIMARY KEY,
      display_name VARCHAR(80) NOT NULL,
      price DECIMAL(6,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  cache.set('parkingCatalog', true);
}

export async function ensureScheduleNotesTable() {
  if (cache.has('scheduleNotes')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS schedule_notes (
      ScheduleID INT UNSIGNED PRIMARY KEY,
      notes TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_sched_notes FOREIGN KEY (ScheduleID) REFERENCES schedules (ScheduleID) ON DELETE CASCADE
    )
  `);
  cache.set('scheduleNotes', true);
}
