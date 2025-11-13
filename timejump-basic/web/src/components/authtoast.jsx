import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthToast({ toast, onDismiss }) {
  if (!toast) return null;
  const hasActions = Array.isArray(toast.actions) && toast.actions.length > 0;
  const dismissClass = hasActions ? 'btn' : 'btn primary';

  function handleDismiss() {
    if (typeof onDismiss === 'function') {
      onDismiss();
    }
  }

  function renderAction(action, idx) {
    const className = action.primary ? 'btn primary' : 'btn';
    const key = `${action.label}-${idx}`;
    const handleClick = () => {
      if (typeof action.onClick === 'function') {
        action.onClick();
      }
      handleDismiss();
    };
    if (action.to) {
      return (
        <Link key={key} className={className} to={action.to} onClick={handleClick}>
          {action.label}
        </Link>
      );
    }
    if (action.href) {
      return (
        <a
          key={key}
          className={className}
          href={action.href}
          rel={action.external ? 'noreferrer noopener' : undefined}
          target={action.external ? '_blank' : undefined}
          onClick={handleClick}
        >
          {action.label}
        </a>
      );
    }
    return (
      <button key={key} type="button" className={className} onClick={handleClick}>
        {action.label}
      </button>
    );
  }

  return (
    <div className="nav-toast-flyout" role="status">
      <div className="nav-toast-flyout__body">
        {toast.title && (
          <div className="nav-toast-flyout__title">
            {toast.title}
          </div>
        )}
        {toast.message && <p>{toast.message}</p>}
        {(hasActions || toast.dismissible !== false) && (
          <div className="nav-toast-flyout__actions">
            {toast.actions?.map((action, idx) => renderAction(action, idx))}
            {toast.dismissible !== false && (
              <button type="button" className={dismissClass} onClick={handleDismiss}>
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
