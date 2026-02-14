const { check, validationResult } = require('express-validator');

const registerRules = [
  check('username')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  check('role')
    .optional()
    .isIn(['superadmin', 'admin', 'manager'])
    .withMessage('Invalid role'),
];

const createUserRules = [
  check('username')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  check('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const updateProfileRules = [
  check('username')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  check('email')
    .optional()
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
];

const changePasswordRules = [
  check('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  check('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

const resetPasswordRules = [
  check('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
];

const confirmResetPasswordRules = [
  check('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  check('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
}

module.exports = {
  registerRules,
  createUserRules,
  loginRules,
  updateProfileRules,
  changePasswordRules,
  resetPasswordRules,
  confirmResetPasswordRules,
  handleValidation
};
