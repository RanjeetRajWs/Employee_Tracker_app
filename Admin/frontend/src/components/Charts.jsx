import React from "react";

/**
 * Simple Chart Components
 * Lightweight chart components without external dependencies
 */

// Bar Chart
export function BarChart({ data, height = 200, className = "" }) {
    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ height }}>
                <p className="text-gray-400 dark:text-gray-500">No data to display</p>
            </div>
        );
    }

    const maxValue = Math.max(...data.map((d) => d.value));

    return (
        <div className={`flex items-end justify-around gap-2 ${className}`} style={{ height }}>
            {data.map((item, index) => {
                const barHeight = (item.value / maxValue) * 100;
                return (
                    <div key={index} className="flex flex-col items-center flex-1 max-w-20">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {item.value}
                        </div>
                        <div
                            className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                            style={{ height: `${barHeight}%` }}
                            title={`${item.label}: ${item.value}`}
                        ></div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center truncate w-full">
                            {item.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Progress Bar
export function ProgressBar({ value, max = 100, label, color = "blue", className = "" }) {
    const percentage = Math.min((value / max) * 100, 100);

    const colorClasses = {
        blue: "bg-blue-500 dark:bg-blue-600",
        green: "bg-green-500 dark:bg-green-600",
        yellow: "bg-yellow-500 dark:bg-yellow-600",
        red: "bg-red-500 dark:bg-red-600",
        purple: "bg-purple-500 dark:bg-purple-600",
    };

    return (
        <div className={className}>
            {label && (
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                        {value} / {max}
                    </span>
                </div>
            )}
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${colorClasses[color] || colorClasses.blue}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

// Donut Chart
export function DonutChart({ data, size = 120, className = "" }) {
    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
                <p className="text-gray-400 dark:text-gray-500 text-xs">No data</p>
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90;

    const colors = [
        "#3b82f6", // blue
        "#10b981", // green
        "#f59e0b", // yellow
        "#ef4444", // red
        "#8b5cf6", // purple
        "#ec4899", // pink
    ];

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {data.map((item, index) => {
                    const percentage = (item.value / total) * 100;
                    const angle = (percentage / 100) * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;

                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (currentAngle * Math.PI) / 180;
                    const radius = size / 2 - 10;
                    const innerRadius = radius * 0.6;

                    const x1 = size / 2 + radius * Math.cos(startRad);
                    const y1 = size / 2 + radius * Math.sin(startRad);
                    const x2 = size / 2 + radius * Math.cos(endRad);
                    const y2 = size / 2 + radius * Math.sin(endRad);
                    const x3 = size / 2 + innerRadius * Math.cos(endRad);
                    const y3 = size / 2 + innerRadius * Math.sin(endRad);
                    const x4 = size / 2 + innerRadius * Math.cos(startRad);
                    const y4 = size / 2 + innerRadius * Math.sin(startRad);

                    const largeArc = angle > 180 ? 1 : 0;

                    const pathData = [
                        `M ${x1} ${y1}`,
                        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                        `L ${x3} ${y3}`,
                        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                        "Z",
                    ].join(" ");

                    return (
                        <path
                            key={index}
                            d={pathData}
                            fill={colors[index % colors.length]}
                            className="hover:opacity-80 transition-opacity"
                        >
                            <title>{`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}</title>
                        </path>
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                </div>
            </div>
        </div>
    );
}

// Line Chart (Simple)
export function LineChart({ data, height = 200, className = "" }) {
    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ height }}>
                <p className="text-gray-400 dark:text-gray-500">No data to display</p>
            </div>
        );
    }

    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const range = maxValue - minValue || 1;

    const points = data.map((item, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((item.value - minValue) / range) * 100;
        return `${x},${y}`;
    });

    return (
        <div className={className} style={{ height }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                    points={points.join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-500 dark:text-blue-400"
                />
                {data.map((item, index) => {
                    const x = (index / (data.length - 1)) * 100;
                    const y = 100 - ((item.value - minValue) / range) * 100;
                    return (
                        <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="2"
                            className="fill-blue-500 dark:fill-blue-400"
                        >
                            <title>{`${item.label}: ${item.value}`}</title>
                        </circle>
                    );
                })}
            </svg>
        </div>
    );
}

// Stats Grid
export function StatsGrid({ stats, className = "" }) {
    return (
        <div className={`grid grid-cols-2 gap-4 ${className}`}>
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
                >
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                    {stat.change && (
                        <div
                            className={`text-xs mt-1 ${stat.change > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                        >
                            {stat.change > 0 ? "+" : ""}
                            {stat.change}%
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default { BarChart, ProgressBar, DonutChart, LineChart, StatsGrid };
