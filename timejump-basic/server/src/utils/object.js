export function pick(body, ...keys) {
  if (!body || typeof body !== 'object') return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const value = body[key];
      if (value !== undefined) return value;
    }
  }
  return undefined;
}
