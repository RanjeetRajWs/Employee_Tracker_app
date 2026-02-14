# Admin Backend Setup Guide

## Prerequisites

- **Node.js**: v16 or higher
- **MongoDB**: v5.0 or higher (running locally or remote)
- **npm**: v7 or higher

## Installation

### 1. Clone and Navigate to Backend Directory

```bash
cd "/Users/mac/Desktop/Projects/Employee Tracker/project 4 2.0/Admin/backend"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend root directory with the following variables:

```env
# Database
MONGO_URI=mongodb://localhost:27017/employeeTrackerAdmin

# Server
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
```

**Important:**
- Replace `JWT_SECRET` with a strong random string (minimum 32 characters)
- For production, set `NODE_ENV=production`
- Generate a secure JWT secret using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (if installed via Homebrew)
brew services start mongodb-community

# Or start manually
mongod --config /usr/local/etc/mongod.conf
```

### 5. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## Verify Installation

### Check Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "database": "connected",
  "uptime": 1.234,
  "environment": "development"
}
```

### Create First Admin User

```bash
curl -X POST http://localhost:5000/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin123!",
    "role": "superadmin"
  }'
```

## Project Structure

```
backend/
├── server.js                 # Main application entry point
├── init-db.js               # Database initialization
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables (create this)
├── logs/                    # Application logs (auto-created)
│   ├── error.log
│   └── combined.log
└── src/
    ├── config/
    │   └── logger.js        # Winston logger configuration
    ├── controllers/
    │   └── adminController.js  # Business logic
    ├── middleware/
    │   ├── auth.js          # JWT authentication
    │   ├── errorHandler.js  # Global error handler
    │   ├── rateLimiter.js   # Rate limiting
    │   └── validators/
    │       └── authValidators.js  # Input validation
    ├── models/
    │   └── admin.js         # Mongoose schema
    ├── routes/
    │   └── admin.js         # API routes
    └── utils/
        ├── errors.js        # Custom error classes
        └── envValidator.js  # Environment validation
```

## Available Scripts

```bash
# Start server in production mode
npm start

# Start server in development mode with auto-reload
npm run dev

# Run tests (once implemented)
npm test
```

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Features

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (superadmin, admin, manager)
- Password hashing with bcrypt

✅ **Security**
- Helmet for security headers
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- CORS enabled

✅ **User Management**
- CRUD operations for users
- Soft delete (deactivation)
- Password change functionality
- Password reset flow

✅ **Logging**
- Winston logger with file rotation
- Request logging with Morgan
- Error tracking

✅ **Error Handling**
- Centralized error handling
- Custom error classes
- Detailed error responses in development

## Troubleshooting

### MongoDB Connection Issues

**Error:** `Database connection failed`

**Solution:**
1. Ensure MongoDB is running: `brew services list` (macOS)
2. Check MongoDB URI in `.env` file
3. Verify MongoDB is accessible: `mongosh mongodb://localhost:27017`

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
1. Change `PORT` in `.env` file
2. Or kill the process using port 5000:
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

### JWT Secret Warning

**Warning:** `JWT_SECRET should be at least 32 characters`

**Solution:**
Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add it to your `.env` file.

### Missing Environment Variables

**Error:** `Missing required environment variables`

**Solution:**
Ensure all required variables are in your `.env` file:
- `MONGO_URI`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`

## Testing

### Manual Testing with cURL

**Register a user:**
```bash
curl -X POST http://localhost:5000/admin/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Get profile (requires token):**
```bash
curl http://localhost:5000/admin/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=<64-character-random-string>
JWT_EXPIRES_IN=24h
LOG_LEVEL=warn
PORT=5000
```

### Security Checklist

- [ ] Use strong JWT_SECRET (64+ characters)
- [ ] Set NODE_ENV=production
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Configure CORS for specific origins
- [ ] Set up log rotation
- [ ] Monitor error logs regularly
- [ ] Implement email service for password reset
- [ ] Set up backup strategy for database

## Support

For issues or questions, refer to:
- [API Documentation](./API_DOCUMENTATION.md)
- MongoDB Documentation: https://docs.mongodb.com
- Express.js Documentation: https://expressjs.com
