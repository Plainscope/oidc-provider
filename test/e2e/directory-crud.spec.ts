/**
 * Directory CRUD and Security Tests
 * Tests CSRF protection and uniqueness constraints in the remote directory UI
 */
import { test, expect } from '@playwright/test';

const DIRECTORY_BASE_URL = process.env.DIRECTORY_URL || 'http://localhost:7080';
const BEARER_TOKEN = process.env.DIRECTORY_BEARER_TOKEN || 'sk-AKnZKbq1O9RYwEagYhARZWlrPpbMCvliO8H646DmndO2Phth';

test.describe('Directory CRUD Operations with Security', () => {
  test.beforeEach(async ({ page }) => {
    // Set Bearer token header for authorization
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${BEARER_TOKEN}`
    });
  });

  test('should load roles page with CSRF token', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/roles`);
    await expect(page.locator('h2')).toContainText('Roles');

    // Verify CSRF token is present
    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
    expect(csrfToken).toBeTruthy();

    // Verify csrfFetch is available
    const hasCsrfFetch = await page.evaluate(() => typeof window['csrfFetch'] === 'function');
    expect(hasCsrfFetch).toBe(true);
  });

  test('should enforce role name uniqueness', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/roles`);

    const testRoleName = `test-role-${Date.now()}`;

    // Create first role
    await page.click('button:has-text("Add Role")');
    await page.fill('input[placeholder="Name"]', testRoleName);
    await page.fill('input[placeholder="Description"]', 'Test role');
    await page.click('button:has-text("Create")', { force: true });

    // Wait for role to appear in list (modal closes automatically)
    await page.waitForSelector(`text=${testRoleName}`, { state: 'visible' });

    // Verify role appears in list
    await expect(page.locator(`text=${testRoleName}`)).toBeVisible();

    // Try to create duplicate
    await page.click('button:has-text("Add Role")');
    await page.fill('input[placeholder="Name"]', testRoleName);
    await page.fill('input[placeholder="Description"]', 'Duplicate role');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error banner instead of closing
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/already exists|duplicate/i);
  });

  test('should enforce domain name uniqueness', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/domains`);

    const testDomainName = `test-domain-${Date.now()}`;

    // Create first domain
    await page.click('button:has-text("Add Domain")');
    await page.fill('input[placeholder="Name"]', testDomainName);
    await page.fill('input[placeholder="Description"]', 'Test domain');
    await page.click('button:has-text("Create")', { force: true });

    // Wait for domain to appear in list
    await page.waitForSelector(`text=${testDomainName}`, { state: 'visible' });

    // Verify domain appears
    await expect(page.locator(`text=${testDomainName}`)).toBeVisible();

    // Try duplicate
    await page.click('button:has-text("Add Domain")');
    await page.fill('input[placeholder="Name"]', testDomainName);
    await page.fill('input[placeholder="Description"]', 'Duplicate domain');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/already exists|duplicate/i);
  });

  test('should enforce group name uniqueness within domain', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/groups`);

    // First get a domain ID
    const domainsResponse = await page.request.get(`${DIRECTORY_BASE_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });
    const domains = await domainsResponse.json();
    const domainId = domains[0]?.id;

    if (!domainId) {
      test.skip();
      return;
    }

    const testGroupName = `test-group-${Date.now()}`;

    // Create first group
    await page.click('button:has-text("Add Group")');

    // Wait for modal and domains to load
    await page.waitForSelector('select', { state: 'visible' });

    await page.fill('input[placeholder*="Name"]', testGroupName);
    await page.selectOption('select', domainId);
    await page.fill('input[placeholder="Description"]', 'Test group');
    await page.click('button:has-text("Create")', { force: true });

    // Wait for group to appear in list
    await page.waitForSelector(`text=${testGroupName}`, { state: 'visible' });

    // Verify group appears
    await expect(page.locator(`text=${testGroupName}`)).toBeVisible();

    // Try duplicate in the SAME domain (should fail)
    await page.click('button:has-text("Add Group")');
    await page.fill('input[placeholder*="Name"]', testGroupName);
    await page.selectOption('select', domainId);
    await page.fill('input[placeholder="Description"]', 'Duplicate group');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/already exists.*domain/i);
  });

  test('should allow same group name in different domains', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/groups`);

    // Get at least two domains
    const domainsResponse = await page.request.get(`${DIRECTORY_BASE_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });
    const domains = await domainsResponse.json();

    // Create second domain if needed
    let domain1Id = domains[0]?.id;
    let domain2Id = domains[1]?.id;

    if (!domain1Id) {
      test.skip();
      return;
    }

    if (!domain2Id) {
      // Create second domain
      const createDomainRes = await page.request.post(`${DIRECTORY_BASE_URL}/api/domains`, {
        headers: { 'Authorization': `Bearer ${BEARER_TOKEN}`, 'Content-Type': 'application/json' },
        data: { name: `test-domain-${Date.now()}`, description: 'Test domain 2' }
      });
      const newDomain = await createDomainRes.json();
      domain2Id = newDomain.id;
    }

    const testGroupName = `test-group-shared-${Date.now()}`;

    // Create group in first domain
    await page.click('button:has-text("Add Group")');
    await page.waitForSelector('select', { state: 'visible' });
    await page.fill('input[placeholder*="Name"]', testGroupName);
    await page.selectOption('select', domain1Id);
    await page.fill('input[placeholder="Description"]', 'Group in domain 1');
    await page.click('button:has-text("Create")', { force: true });

    // Wait for first group to appear
    await page.waitForSelector(`text=${testGroupName}`, { state: 'visible' });

    // Create group with SAME name in second domain (should succeed)
    await page.click('button:has-text("Add Group")');
    await page.fill('input[placeholder*="Name"]', testGroupName);
    await page.selectOption('select', domain2Id);
    await page.fill('input[placeholder="Description"]', 'Group in domain 2');
    await page.click('button:has-text("Create")', { force: true });

    // Should succeed - verify both groups exist
    await page.waitForTimeout(1000);
    const groupRows = page.locator(`tr:has-text("${testGroupName}")`);
    await expect(groupRows).toHaveCount(2);
  });

  test('should enforce user email uniqueness', async ({ page }) => {
    // Get domain for test user
    const domainsResponse = await page.request.get(`${DIRECTORY_BASE_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });
    const domains = await domainsResponse.json();
    const domainId = domains[0]?.id;

    if (!domainId) {
      test.skip();
      return;
    }

    const testEmail = `test-${Date.now()}@example.com`;

    // Create first user via API
    const user1Response = await page.request.post(`${DIRECTORY_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        username: `user1-${Date.now()}`,
        password: 'Test123!',
        domain_id: domainId,
        email: testEmail,
        display_name: 'Test User 1'
      }
    });
    expect(user1Response.ok()).toBe(true);

    // Try to create second user with same email
    const user2Response = await page.request.post(`${DIRECTORY_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        username: `user2-${Date.now()}`,
        password: 'Test123!',
        domain_id: domainId,
        email: testEmail,
        display_name: 'Test User 2'
      }
    });

    expect(user2Response.status()).toBe(409);
    const errorData = await user2Response.json();
    expect(errorData.error).toMatch(/email already in use/i);
  });

  test('should use CSRF token in all mutation requests', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/roles`);

    // Monitor network requests
    const requests: any[] = [];
    page.on('request', request => {
      if (request.method() !== 'GET') {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    const testRoleName = `csrf-test-${Date.now()}`;

    // Create role
    await page.click('button:has-text("Add Role")');
    await page.fill('input[placeholder="Name"]', testRoleName);

    // Wait for the POST request to complete
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/roles') && response.request().method() === 'POST'
    );
    await page.click('button:has-text("Create")', { force: true });
    await responsePromise;

    // Verify POST request included CSRF token
    const postRequest = requests.find(r => r.method === 'POST' && r.url.includes('/api/roles'));
    expect(postRequest).toBeDefined();
    expect(postRequest.headers['x-csrftoken'] || postRequest.headers['X-CSRFToken']).toBeTruthy();
  });

  test('should show inline error on user edit for duplicate email', async ({ page }) => {
    // Create two users
    const domainsResponse = await page.request.get(`${DIRECTORY_BASE_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });
    const domains = await domainsResponse.json();
    const domainId = domains[0]?.id;

    if (!domainId) {
      test.skip();
      return;
    }

    const email1 = `user1-${Date.now()}@example.com`;
    const email2 = `user2-${Date.now()}@example.com`;

    const user1Res = await page.request.post(`${DIRECTORY_BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}`, 'Content-Type': 'application/json' },
      data: {
        username: `user1-${Date.now()}`,
        password: 'Test123!',
        domain_id: domainId,
        email: email1,
        display_name: 'User One'
      }
    });
    await user1Res.json();

    const user2Res = await page.request.post(`${DIRECTORY_BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}`, 'Content-Type': 'application/json' },
      data: {
        username: `user2-${Date.now()}`,
        password: 'Test123!',
        domain_id: domainId,
        email: email2,
        display_name: 'User Two'
      }
    });
    const user2 = await user2Res.json();

    // Navigate to edit user2 and try to use email1
    await page.goto(`${DIRECTORY_BASE_URL}/users/edit?id=${user2.id}`);

    await page.fill('input[placeholder="Primary Email"]', email1);
    await page.click('button:has-text("Save")', { force: true });

    // Wait for error message to appear
    await page.waitForSelector('div.text-red-600', { state: 'visible' });
    await expect(page.locator('div.text-red-600')).toBeVisible();
    await expect(page.locator('div.text-red-600')).toContainText(/email already in use/i);
  });

  test('should reject empty domain name', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/domains`);

    // Try to create domain with empty name
    await page.click('button:has-text("Add Domain")');
    await page.fill('input[placeholder="Name"]', '   '); // whitespace only
    await page.fill('input[placeholder="Description"]', 'Test domain');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error message
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/name is required/i);
  });

  test('should reject empty role name', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/roles`);

    // Try to create role with empty name
    await page.click('button:has-text("Add Role")');
    await page.fill('input[placeholder="Name"]', '');
    await page.fill('input[placeholder="Description"]', 'Test role');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error message
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/name is required/i);
  });

  test('should reject empty group name', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/groups`);

    // Get a domain ID first
    const domainsResponse = await page.request.get(`${DIRECTORY_BASE_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });
    const domains = await domainsResponse.json();
    const domainId = domains[0]?.id;

    if (!domainId) {
      test.skip();
      return;
    }

    // Try to create group with empty name
    await page.click('button:has-text("Add Group")');
    await page.fill('input[placeholder="Name"]', '');
    await page.fill('input[placeholder="Domain ID"]', domainId);
    await page.fill('input[placeholder="Description"]', 'Test group');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error message
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/name is required/i);
  });

  test('should reject empty username', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/users`);

    // Try to create user with empty username
    await page.click('button:has-text("Add User")');
    await page.fill('input[placeholder*="Username"]', '   '); // whitespace only
    await page.fill('input[placeholder*="Password"]', 'Test123!');
    await page.click('button:has-text("Create")', { force: true });

    // Should show error message
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/username is required/i);
  });

  test('should reject empty password', async ({ page }) => {
    await page.goto(`${DIRECTORY_BASE_URL}/users`);

    // Get a domain ID first
    const domainsResponse = await page.request.get(`${DIRECTORY_BASE_URL}/api/domains`, {
      headers: { 'Authorization': `Bearer ${BEARER_TOKEN}` }
    });
    const domains = await domainsResponse.json();
    const domainId = domains[0]?.id;

    if (!domainId) {
      test.skip();
      return;
    }

    // Try to create user with empty password
    await page.click('button:has-text("Add User")');
    await page.fill('input[placeholder*="Username"]', `testuser-${Date.now()}`);
    await page.fill('input[placeholder*="Password"]', '');

    // Select domain if dropdown exists
    if (await page.locator('select').count() > 0) {
      await page.selectOption('select', domainId);
    }

    await page.click('button:has-text("Create")', { force: true });

    // Should show error message
    await expect(page.locator('div.bg-red-50')).toBeVisible();
    await expect(page.locator('div.bg-red-50')).toContainText(/password is required/i);
  });
