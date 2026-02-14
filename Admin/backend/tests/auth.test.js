/**
 * Authentication Tests
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../src/routes/admin');
const initDB = require('../init-db');
const errorHandler = require('../src/middleware/errorHandler');

// Create test app
const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use(errorHandler);

// Initialize database connection
beforeAll(async () => {
    await initDB();
});

describe('Authentication Endpoints', () => {
    describe('POST /admin/register', () => {
        it('should register a new admin successfully', async () => {
            const res = await request(app)
                .post('/admin/register')
                .send({
                    username: 'testadmin',
                    email: 'test@example.com',
                    password: 'Test123!@#',
                    role: 'admin',
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.admin).toHaveProperty('id');
            expect(res.body.admin.email).toBe('test@example.com');
            expect(res.body.admin.username).toBe('testadmin');
            expect(res.body).toHaveProperty('token');
        });

        it('should fail with weak password', async () => {
            const res = await request(app)
                .post('/admin/register')
                .send({
                    username: 'testadmin',
                    email: 'test@example.com',
                    password: 'weak',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should fail with duplicate email', async () => {
            // First registration
            await request(app)
                .post('/admin/register')
                .send({
                    username: 'testadmin1',
                    email: 'duplicate@example.com',
                    password: 'Test123!@#',
                });

            // Duplicate registration
            const res = await request(app)
                .post('/admin/register')
                .send({
                    username: 'testadmin2',
                    email: 'duplicate@example.com',
                    password: 'Test123!@#',
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('should fail with invalid email format', async () => {
            const res = await request(app)
                .post('/admin/register')
                .send({
                    username: 'testadmin',
                    email: 'invalid-email',
                    password: 'Test123!@#',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /admin/login', () => {
        beforeEach(async () => {
            // Create a test user
            await request(app)
                .post('/admin/register')
                .send({
                    username: 'logintest',
                    email: 'login@example.com',
                    password: 'Test123!@#',
                });
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/admin/login')
                .send({
                    email: 'login@example.com',
                    password: 'Test123!@#',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
            expect(res.body.admin.email).toBe('login@example.com');
            expect(res.body.admin).toHaveProperty('lastLogin');
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/admin/login')
                .send({
                    email: 'login@example.com',
                    password: 'WrongPassword123!',
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/admin/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Test123!@#',
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should fail with missing credentials', async () => {
            const res = await request(app)
                .post('/admin/login')
                .send({
                    email: 'login@example.com',
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /admin/me', () => {
        let token;

        beforeEach(async () => {
            // Register and get token
            const res = await request(app)
                .post('/admin/register')
                .send({
                    username: 'profiletest',
                    email: 'profile@example.com',
                    password: 'Test123!@#',
                });
            token = res.body.token;
        });

        it('should get profile with valid token', async () => {
            const res = await request(app)
                .get('/admin/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.admin.email).toBe('profile@example.com');
            expect(res.body.admin).toHaveProperty('isActive');
        });

        it('should fail without token', async () => {
            const res = await request(app).get('/admin/me');

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should fail with invalid token', async () => {
            const res = await request(app)
                .get('/admin/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
