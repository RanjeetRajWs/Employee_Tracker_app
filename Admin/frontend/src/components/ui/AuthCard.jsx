import React from 'react';
import Card from './Card';

export default function AuthCard({ children, title }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          {title && <h2 className="text-2xl font-bold text-center mb-4">{title}</h2>}
          {children}
        </Card>
      </div>
    </div>
  );
}
