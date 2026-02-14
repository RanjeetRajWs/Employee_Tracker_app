import React, { useEffect } from "react";

export default function Modal({ children, onClose, title }) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 p-6 overflow-auto max-h-[85vh]">
                <div className="flex items-start justify-between pb-3 border-b dark:border-slate-700 mb-4">
                    <div>
                        {title ? (
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                        ) : null}
                        {title ? <p className="text-sm text-gray-500 dark:text-gray-400">Detailed session information</p> : null}
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="ml-4 inline-flex items-center justify-center h-9 w-9 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M5.22 5.22a.75.75 0 011.06 0L12 10.94l5.72-5.72a.75.75 0 111.06 1.06L13.06 12l5.72 5.72a.75.75 0 11-1.06 1.06L12 13.06l-5.72 5.72a.75.75 0 11-1.06-1.06L10.94 12 5.22 6.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
