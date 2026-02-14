import React from 'react';

function ToastItem({ toast, onClose }) {
  const bg = toast.type === 'success'
    ? 'bg-green-50 border-green-200 dark:bg-emerald-900 dark:border-emerald-700'
    : 'bg-red-50 border-red-200 dark:bg-rose-900 dark:border-rose-700';
  const text = toast.type === 'success' ? 'text-green-800 dark:text-emerald-200' : 'text-red-800 dark:text-rose-200';
  return (
    <div className={`max-w-sm w-full ${bg} border p-3 rounded-md shadow-sm flex items-start gap-3`}>
      <div className={`flex-1 ${text} text-sm`}>{toast.message}</div>
      <button onClick={() => onClose(toast.id)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">✕</button>
    </div>
  );
}

export default function ToastContainer({ toasts = [], remove }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
      <div className="flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={remove} />
        ))}
      </div>
    </div>
  );
}
