import React from 'react';

export default function Card({ children, className = '', title = null }) {
  return (
    <div className={`bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 shadow-md rounded-lg p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </div>
  );
}
