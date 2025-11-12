import { query } from '../db.js';
import { todayISO } from '../utils/date.js';

const cache = new Map();

async function addColumnOnce(key, sql) {
  if (cache.has(key)) return;
  try {
    await query(sql);
  } catch (err) {
    const toleratedCodes = [
      'ER_DUP_FIELDNAME',
      'ER_DUP_KEYNAME',
      'ER_CANT_CREATE_TABLE',
      'ER_TABLE_EXISTS_ERROR',
      'ER_TABLEACCESS_DENIED_ERROR',
      'ER_DBACCESS_DENIED_ERROR',
    ];
    if (!err?.code || !toleratedCodes.includes(err.code)) {
      throw err;
    }
    console.warn(`[ensure] Skipping schema change (${key}) due to ${err.code}: ${err.sqlMessage || err.message}`);
  }
  cache.set(key, true);
}

export async function ensureThemeImageColumn() {
  await addColumnOnce('themeImageColumn', `
    ALTER TABLE theme
    ADD COLUMN image_url VARCHAR(255) NULL AFTER Description
  `);
}

export async function ensureAttractionImageColumn() {
  await addColumnOnce('attractionImageColumn', `
    ALTER TABLE attraction
    ADD COLUMN image_url VARCHAR(255) NULL AFTER Name
  `);
}

export async function ensureAttractionTypeDescriptionColumn() {
  await addColumnOnce('attractionTypeDescription', `
    ALTER TABLE attraction_type
    ADD COLUMN Description TEXT NULL AFTER TypeName
  `);
}

export async function ensureAttractionExperienceColumns() {
  await addColumnOnce('attractionExperienceLevel', `
    ALTER TABLE attraction
    ADD COLUMN experience_level VARCHAR(120) NULL AFTER Capacity
  `);
  await addColumnOnce('attractionTargetAudience', `
    ALTER TABLE attraction
    ADD COLUMN target_audience VARCHAR(160) NULL AFTER experience_level
  `);
}

export async function ensureGiftItemImageColumn() {
  await addColumnOnce('giftItemImageColumn', `
    ALTER TABLE gift_item
    ADD COLUMN image_url VARCHAR(255) NULL AFTER name
  `);
}

export async function ensureMenuItemImageColumn() {
  await addColumnOnce('menuItemImageColumn', `
    ALTER TABLE menu_item
    ADD COLUMN image_url VARCHAR(255) NULL AFTER name
  `);
}

export async function ensureEmployeeJobRoleColumn() {
  await addColumnOnce('employeeJobRoleColumn', `
    ALTER TABLE employee
    ADD COLUMN job_role VARCHAR(120) NULL AFTER role
  `);
}

export async function ensureFoodVendorThemeColumn() {
  await addColumnOnce('vendorThemeColumn', `
    ALTER TABLE food_vendor
    ADD COLUMN ThemeID INT UNSIGNED NULL AFTER VendorName
  `);
  if (!cache.has('vendorThemeConstraint')) {
    try {
      await query(`
        ALTER TABLE food_vendor
        ADD CONSTRAINT fk_vendor_theme FOREIGN KEY (ThemeID) REFERENCES theme (themeID)
          ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (err) {
      const duplicateKey = err?.code && ['ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR'].includes(err.code);
      const namedDuplicate = err?.sqlMessage && err.sqlMessage.includes('Duplicate foreign key constraint');
      const incompatibleColumns = err?.errno === 3780 || (err?.sqlMessage && err.sqlMessage.includes('incompatible'));
      if (!duplicateKey && !namedDuplicate && !incompatibleColumns) {
        throw err;
      }
      if (incompatibleColumns) {
        console.warn('[ensureFoodVendorThemeColumn] Skipping foreign key creation due to incompatible column types.');
      }
    }
    cache.set('vendorThemeConstraint', true);
  }
}

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
  await ensureFoodVendorThemeColumn();
  const rows = await query(
    'SELECT VendorID FROM food_vendor ORDER BY VendorID ASC LIMIT 1',
  ).catch(() => []);
  if (rows.length) {
    const id = rows[0].VendorID;
    cache.set('defaultVendor', id);
    return id;
  }
  const themeId = await ensureDefaultTheme();
  const result = await query(
    'INSERT INTO food_vendor (VendorName, ThemeID) VALUES (?, ?)',
    ['Central Dining', themeId],
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

export async function ensureTicketCatalogTable() {
  if (cache.has('ticketCatalog')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS ticket_catalog (
      ticket_type VARCHAR(80) PRIMARY KEY,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  cache.set('ticketCatalog', true);
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

export async function ensureTicketPurchaseTables() {
  if (cache.has('ticketPurchases')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS ticket_purchase (
      purchase_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      item_name VARCHAR(160) NOT NULL,
      item_type VARCHAR(32) NOT NULL,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      visit_date DATE NULL,
      details LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ticket_purchase_user (user_id),
      CONSTRAINT fk_ticket_purchase_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);
  // ensure visit_date column exists for older schemas
  await query('ALTER TABLE ticket_purchase ADD COLUMN visit_date DATE NULL AFTER price').catch(() => {});
  cache.set('ticketPurchases', true);
}

export async function ensureUserProfileTable() {
  if (cache.has('userProfiles')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS user_profile (
      user_id INT UNSIGNED PRIMARY KEY,
      full_name VARCHAR(160),
      phone VARCHAR(40),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_profile_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);
  cache.set('userProfiles', true);
}

export async function ensureMenuSalesTable() {
  if (cache.has('menuSales')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS menu_sales (
      SaleID INT UNSIGNED NOT NULL AUTO_INCREMENT,
      menu_item_id INT UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      price_each DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (SaleID),
      KEY idx_menu_sales_date (sale_date),
      CONSTRAINT fk_menu_sales_item FOREIGN KEY (menu_item_id)
        REFERENCES menu_item (item_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  cache.set('menuSales', true);
}

export async function ensureGiftSalesTable() {
  if (cache.has('giftSales')) return;
  await query(`
    CREATE TABLE IF NOT EXISTS gift_sales (
      SaleID INT UNSIGNED NOT NULL AUTO_INCREMENT,
      gift_item_id INT UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL DEFAULT 1,
      sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      price_each DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (SaleID),
      KEY idx_gift_sales_date (sale_date),
      CONSTRAINT fk_gift_sales_item FOREIGN KEY (gift_item_id)
        REFERENCES gift_item (item_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  cache.set('giftSales', true);
}
