const TOAST_ROOT_ID = 'tj-toast-root';
const TOAST_LIFETIME = 3500;

function ensureContainer() {
  if (typeof document === 'undefined') return null;
  let container = document.getElementById(TOAST_ROOT_ID);
  if (container) return container;
  container = document.createElement('div');
  container.id = TOAST_ROOT_ID;
  container.style.position = 'fixed';
  container.style.top = '18px';
  container.style.right = '18px';
  container.style.display = 'grid';
  container.style.gap = '12px';
  container.style.zIndex = '9999';
  container.style.pointerEvents = 'none';
  container.style.maxWidth = '360px';
  container.style.width = 'calc(100vw - 36px)';
  document.body.appendChild(container);
  return container;
}

export function showToast(message, tone = 'info') {
  if (!message || typeof document === 'undefined') return;
  const container = ensureContainer();
  if (!container) return;
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  toast.style.padding = '14px 16px';
  toast.style.borderRadius = '12px';
  toast.style.color = '#e2e8f0';
  const palette = tone === 'error'
    ? { bg: '#7f1d1d', border: 'rgba(248,113,113,0.9)' }
    : tone === 'success'
      ? { bg: '#14532d', border: 'rgba(74,222,128,0.9)' }
      : { bg: '#0f172a', border: 'rgba(148,163,184,0.45)' };
  toast.style.background = `linear-gradient(135deg, ${palette.bg}, ${palette.bg === '#0f172a' ? '#0b1224' : palette.bg})`;
  toast.style.border = `1px solid ${palette.border}`;
  toast.style.boxShadow = '0 18px 36px rgba(15,23,42,0.35)';
  toast.style.fontSize = '14px';
  toast.style.pointerEvents = 'auto';
  toast.style.justifySelf = 'end';
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease';
    setTimeout(() => {
      toast.remove();
      if (!container.hasChildNodes()) container.remove();
    }, 220);
  }, TOAST_LIFETIME);
}
