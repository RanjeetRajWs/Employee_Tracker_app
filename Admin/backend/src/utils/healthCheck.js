/**
 * System Health Check Utility
 * Monitors system health and provides status information
 */

const mongoose = require('mongoose');
const Session = require('../models/session');
const User = require('../models/user');
const Admin = require('../models/admin');
const logger = require('../config/logger');

/**
 * Check database connection
 */
async function checkDatabase() {
    try {
        const state = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        return {
            status: state === 1 ? 'healthy' : 'unhealthy',
            state: states[state],
            connected: state === 1
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Check system resources
 */
async function checkResources() {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ isActive: true });
        const totalAdmins = await Admin.countDocuments();

        return {
            status: 'healthy',
            users: {
                total: totalUsers,
                active: activeUsers
            },
            sessions: {
                total: totalSessions,
                active: activeSessions
            },
            admins: {
                total: totalAdmins
            }
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
}

/**
 * Check API endpoints
 */
function checkEndpoints() {
    return {
        status: 'healthy',
        endpoints: {
            health: '/admin/health',
            login: '/admin/login',
            sessions: '/admin/sessions',
            users: '/admin/users'
        }
    };
}

/**
 * Get system uptime
 */
function getUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return {
        seconds: uptime,
        formatted: `${hours}h ${minutes}m ${seconds}s`
    };
}

/**
 * Get memory usage
 */
function getMemoryUsage() {
    const usage = process.memoryUsage();

    return {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
    };
}

/**
 * Comprehensive health check
 */
async function getSystemHealth() {
    try {
        const [database, resources] = await Promise.all([
            checkDatabase(),
            checkResources()
        ]);

        const endpoints = checkEndpoints();
        const uptime = getUptime();
        const memory = getMemoryUsage();

        const overallStatus =
            database.status === 'healthy' &&
                resources.status === 'healthy'
                ? 'healthy'
                : 'unhealthy';

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            database,
            resources,
            endpoints,
            system: {
                uptime,
                memory,
                nodeVersion: process.version,
                platform: process.platform
            }
        };
    } catch (error) {
        logger.error('Health check failed:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    checkDatabase,
    checkResources,
    checkEndpoints,
    getSystemHealth,
    getUptime,
    getMemoryUsage
};
