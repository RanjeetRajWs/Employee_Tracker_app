const jwt = require('jsonwebtoken');
const adminModel = require('../models/admin');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

/**
 * Authenticate JWT token and attach user to request
 * Works for both Admin and regular User tokens
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Try to find user in Admin collection first
    let user = await adminModel.findById(payload.id).select('-password');

    // If not found in Admin, try User collection
    if (!user) {
      user = await User.findById(payload.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update lastActive timestamp (non-blocking)
    user.lastActive = new Date();
    user.save().catch(err => logger.error('Error updating lastActive in middleware:', err));

    // Attach user object to request with consistent structure
    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Authorize based on user roles
 * @param {...string} roles - Allowed roles
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user found'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - Insufficient permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
