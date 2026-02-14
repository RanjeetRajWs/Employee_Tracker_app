import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-shadow';
  const variants = {
    primary: 'bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
    secondary: 'bg-white text-gray-800 border px-3 py-2 hover:bg-gray-50 focus:ring-gray-300 dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:hover:bg-slate-600',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-800',
    danger: 'bg-red-600 text-white px-4 py-2 hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600'
  };
  const cls = `${base} ${variants[variant] || variants.primary} ${className}`;
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
