import React from "react";
import { X } from "lucide-react";

/**
 * ConfirmDialog Component
 * Improved confirmation dialog with better UX
 */

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger", // danger, warning, info
    loading = false,
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            button: "bg-red-600 hover:bg-red-700 text-white",
            icon: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400",
        },
        warning: {
            button: "bg-yellow-600 hover:bg-yellow-700 text-white",
            icon: "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400",
        },
        info: {
            button: "bg-blue-600 hover:bg-blue-700 text-white",
            icon: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400",
        },
    };

    const styles = variantStyles[variant] || variantStyles.info;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            disabled={loading}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {message}
                    </p>

                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg transition font-medium disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg transition font-medium disabled:opacity-50 ${styles.button}`}
                        >
                            {loading ? "Processing..." : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
