import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 text-gray-800 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
    </div>
  );
}
