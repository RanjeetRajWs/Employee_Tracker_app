import React from "react";
import { FileQuestion, Users, Database, Settings, FileText, Activity } from "lucide-react";

/**
 * EmptyState Component
 * Displays helpful empty states with icons and actions
 */

const iconMap = {
    users: Users,
    data: Database,
    settings: Settings,
    reports: FileText,
    activity: Activity,
    default: FileQuestion,
};

export default function EmptyState({
    icon = "default",
    title = "No data found",
    description = "There's nothing here yet.",
    action,
    actionLabel = "Get Started",
    className = "",
}) {
    const Icon = iconMap[icon] || iconMap.default;

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                {description}
            </p>

            {action && (
                <button
                    onClick={action}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// Specific empty state variants
export function NoUsersFound({ onCreateUser }) {
    return (
        <EmptyState
            icon="users"
            title="No users found"
            description="Get started by creating your first user account."
            action={onCreateUser}
            actionLabel="Create User"
        />
    );
}

export function NoDataFound() {
    return (
        <EmptyState
            icon="data"
            title="No data available"
            description="Data will appear here once users start tracking their activity."
        />
    );
}

export function NoReportsFound() {
    return (
        <EmptyState
            icon="reports"
            title="No reports available"
            description="Reports will be generated once there is activity data to analyze."
        />
    );
}

export function NoSessionsFound() {
    return (
        <EmptyState
            icon="activity"
            title="No sessions found"
            description="Active sessions will appear here when users are working."
        />
    );
}

export function NoSearchResults({ onClear }) {
    return (
        <EmptyState
            icon="default"
            title="No results found"
            description="Try adjusting your search or filter criteria."
            action={onClear}
            actionLabel="Clear Filters"
        />
    );
}
