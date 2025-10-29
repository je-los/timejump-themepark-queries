export function isZeroBuffer(buf) {
  if (!buf) return true;
  const view = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  for (let i = 0; i < view.length; i += 1) {
    if (view[i] !== 0) return false;
  }
  return true;
}
