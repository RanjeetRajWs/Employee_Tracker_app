import React from 'react';

export default function ConfirmModal({ open, title = 'Confirm', message, onCancel, onConfirm, busy = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700 dark:text-gray-200">{message}</p>
        </div>
        <div className="p-4 border-t flex justify-end gap-3 dark:border-slate-700">
          <button onClick={onCancel} className="px-4 py-2 border rounded text-gray-700 dark:text-gray-200 dark:border-slate-600">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">{busy ? 'Please wait...' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
