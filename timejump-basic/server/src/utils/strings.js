export function toSlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toTitle(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed
    .split(/[_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
