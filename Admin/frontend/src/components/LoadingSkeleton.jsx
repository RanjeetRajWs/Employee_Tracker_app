import React from "react";

/**
 * LoadingSkeleton Component
 * Displays animated skeleton screens while content is loading
 */

// Card Skeleton
export function CardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
        </div>
    );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }) {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </td>
            ))}
        </tr>
    );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 4 }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-6 py-3">
                                <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-3/4 animate-pulse"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {Array.from({ length: rows }).map((_, i) => (
                        <TableRowSkeleton key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Stats Card Skeleton
export function StatCardSkeleton() {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
        </div>
    );
}

// List Item Skeleton
export function ListItemSkeleton() {
    return (
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 animate-pulse">
            <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
            </div>
        </div>
    );
}

// Form Skeleton
export function FormSkeleton({ fields = 4 }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
            ))}
            <div className="flex justify-end space-x-2 pt-4">
                <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
            </div>
        </div>
    );
}

// Page Skeleton (Dashboard)
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// Default export
export default function LoadingSkeleton({ type = "card", ...props }) {
    switch (type) {
        case "card":
            return <CardSkeleton {...props} />;
        case "table":
            return <TableSkeleton {...props} />;
        case "stat":
            return <StatCardSkeleton {...props} />;
        case "list":
            return <ListItemSkeleton {...props} />;
        case "form":
            return <FormSkeleton {...props} />;
        case "dashboard":
            return <DashboardSkeleton {...props} />;
        default:
            return <CardSkeleton {...props} />;
    }
}
