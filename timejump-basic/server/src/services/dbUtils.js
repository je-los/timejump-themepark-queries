import { query } from '../db.js';

const enumCache = new Map();

export async function getEnumValues(table, column) {
  const key = `${table}.${column}`;
  if (enumCache.has(key)) return enumCache.get(key);
  const rows = await query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  ).catch(() => []);
  if (!rows.length) {
    enumCache.set(key, []);
    return [];
  }
  const match = rows[0].COLUMN_TYPE.match(/^enum\((.*)\)$/i);
  if (!match) {
    enumCache.set(key, []);
    return [];
  }
  const values = match[1]
    .split(',')
    .map(token => token.trim().replace(/^'(.*)'$/, '$1'));
  enumCache.set(key, values);
  return values;
}
