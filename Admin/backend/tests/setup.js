/**
 * Test Setup and Configuration
 */

const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGO_URI = 'mongodb://localhost:27017/employeeTrackerAdmin_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Connect to test database before all tests
beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

// Clear database after each test
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// Disconnect after all tests
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

// Increase timeout for database operations
jest.setTimeout(10000);
