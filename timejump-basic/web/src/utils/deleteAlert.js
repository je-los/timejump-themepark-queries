import { showToast } from './toast';

export function notifyDeleteError(err, fallbackMessage = 'Unable to delete.') {
  const message = err?.message || fallbackMessage || 'Unable to delete.';
  showToast(message, 'error');
  return message;
}

export function notifyDeleteSuccess(message = 'Deleted successfully.') {
  showToast(message, 'success');
  return message;
}
