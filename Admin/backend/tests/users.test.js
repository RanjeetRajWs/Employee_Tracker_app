/**
 * User Management Tests
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

describe('User Management Endpoints', () => {
    let adminToken;
    let superadminToken;
    let testUserId;

    beforeEach(async () => {
        // Create superadmin
        const superadminRes = await request(app)
            .post('/admin/register')
            .send({
                username: 'superadmin',
                email: 'superadmin@example.com',
                password: 'Super123!@#',
                role: 'superadmin',
            });
        superadminToken = superadminRes.body.token;

        // Create regular admin
        const adminRes = await request(app)
            .post('/admin/register')
            .send({
                username: 'regularadmin',
                email: 'admin@example.com',
                password: 'Admin123!@#',
                role: 'admin',
            });
        adminToken = adminRes.body.token;

        // Create test user
        const userRes = await request(app)
            .post('/admin/register')
            .send({
                username: 'testuser',
                email: 'testuser@example.com',
                password: 'Test123!@#',
                role: 'manager',
            });
        testUserId = userRes.body.admin.id;
    });

    describe('GET /admin/users', () => {
        it('should get all users with admin token', async () => {
            const res = await request(app)
                .get('/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.users)).toBe(true);
            expect(res.body.users.length).toBeGreaterThan(0);
            expect(res.body).toHaveProperty('totalPages');
            expect(res.body).toHaveProperty('currentPage');
        });

        it('should support pagination', async () => {
            const res = await request(app)
                .get('/admin/users?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.users.length).toBeLessThanOrEqual(2);
        });

        it('should filter by role', async () => {
            const res = await request(app)
                .get('/admin/users?role=manager')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            res.body.users.forEach(user => {
                expect(user.role).toBe('manager');
            });
        });

        it('should fail without authentication', async () => {
            const res = await request(app).get('/admin/users');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /admin/users/:id', () => {
        it('should get user by ID', async () => {
            const res = await request(app)
                .get(`/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user._id).toBe(testUserId);
            expect(res.body.user.email).toBe('testuser@example.com');
        });

        it('should fail with invalid ID', async () => {
            const res = await request(app)
                .get('/admin/users/invalid-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PUT /admin/users/:id', () => {
        it('should update user successfully', async () => {
            const res = await request(app)
                .put(`/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'updateduser',
                    role: 'admin',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.username).toBe('updateduser');
            expect(res.body.user.role).toBe('admin');
        });

        it('should fail with duplicate email', async () => {
            const res = await request(app)
                .put(`/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'admin@example.com', // Already exists
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
        });
    });

    describe('DELETE /admin/users/:id', () => {
        it('should deactivate user with superadmin token', async () => {
            const res = await request(app)
                .delete(`/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${superadminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('deactivated');
        });

        it('should fail with regular admin token', async () => {
            const res = await request(app)
                .delete(`/admin/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /admin/change-password', () => {
        it('should change password successfully', async () => {
            const res = await request(app)
                .post('/admin/change-password')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    currentPassword: 'Admin123!@#',
                    newPassword: 'NewPass123!@#',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify new password works
            const loginRes = await request(app)
                .post('/admin/login')
                .send({
                    email: 'admin@example.com',
                    password: 'NewPass123!@#',
                });

            expect(loginRes.statusCode).toBe(200);
        });

        it('should fail with incorrect current password', async () => {
            const res = await request(app)
                .post('/admin/change-password')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    currentPassword: 'WrongPassword123!',
                    newPassword: 'NewPass123!@#',
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Password Reset Flow', () => {
        it('should request password reset', async () => {
            const res = await request(app)
                .post('/admin/password-reset/request')
                .send({
                    email: 'admin@example.com',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            // In development, token is returned
            if (process.env.NODE_ENV === 'development') {
                expect(res.body).toHaveProperty('resetToken');
            }
        });

        it('should always return success for non-existent email', async () => {
            const res = await request(app)
                .post('/admin/password-reset/request')
                .send({
                    email: 'nonexistent@example.com',
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
