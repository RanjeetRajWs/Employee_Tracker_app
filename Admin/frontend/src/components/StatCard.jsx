import React from "react";

export default function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6 bg-white dark:bg-slate-800 dark:border-slate-700`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
        </div>
        <Icon size={40} className="opacity-20" />
      </div>
    </div>
  );
}
