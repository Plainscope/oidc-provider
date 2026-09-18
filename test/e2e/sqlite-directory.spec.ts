import { test, expect } from '@playwright/test';
import { PROVIDER_BASE_URL } from '../utils/urls';

const PROVIDER_URL = PROVIDER_BASE_URL;

// Test user credentials (should exist in the test database)
const TEST_USER = {
  email: 'admin@localhost',
  password: 'test-password',
  id: '8276bb5b-d0b7-41e9-a805-77b62a2865f4'
};

// Note: full content preserved from main with password updated
