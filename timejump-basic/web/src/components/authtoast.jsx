import React from 'react';

export default function AuthToast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="nav-toast-flyout" role="status">
      <div className="nav-toast-flyout__body">
        <div className="nav-toast-flyout__title">
          {toast.type === 'in' ? "You're signed in" : "You're signed out"}
        </div>
        <p>{toast.message}</p>
        <button className="btn primary" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
