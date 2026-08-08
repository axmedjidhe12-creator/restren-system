import dotenv from 'dotenv';
import path from 'path';

// Load actual .env configuration for tests
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_restren_2026';
}
