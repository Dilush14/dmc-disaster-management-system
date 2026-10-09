import { test, expect } from '@playwright/test';

async function mockCloud(page, { invalidPassword = false, backendUnavailable = false, role = 'DMC_OFFICER' } = {}) {
  const profiles = [];
  // Replace only the external Firebase SDK and HTTP server; use the real auth service.
  await page.route('**/src/services/firebase/config.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const isFirebaseConfigured = true;
      export function getFirebaseServices() {
        return { auth: { get currentUser() { return window.testUser || null; } } };
      }
    `,
  }));
  await page.route('**/firebase_auth.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const browserLocalPersistence = 'local';
      export const browserSessionPersistence = 'session';
      export async function setPersistence(auth, persistence) { window.testPersistence = persistence; }
      async function authenticate(auth, email, password) {
        if (${invalidPassword}) throw { code: 'auth/invalid-credential' };
        window.testEmail = email;
        window.testUser = { getIdToken: async () => 'test-id-token' };
        return { user: window.testUser };
      }
      export const signInWithEmailAndPassword = authenticate;
      export const createUserWithEmailAndPassword = authenticate;
      export async function updateProfile(user, values) { window.testDisplayName = values.displayName; }
      export function onAuthStateChanged(auth, callback) { callback(auth.currentUser); return () => {}; }
      export async function signOut() { window.testUser = null; }
      export async function sendPasswordResetEmail(auth, email) { window.testResetEmail = email; }
    `,
  }));
  await page.route('**/api/staff/*', async route => {
    const request = route.request();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization,content-type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    expect(request.headers().authorization).toBe('Bearer test-id-token');
    if (backendUnavailable) {
      return route.fulfill({ status: 503, headers, json: { message: 'Profile service unavailable.' } });
    }
    if (request.method() === 'POST') profiles.push(request.postDataJSON());
    return route.fulfill({
      headers,
      json: { id: 'test-user', email: 'citizen@example.com', name: 'Test Citizen',
        phone: '0771234567', role: profiles.at(-1)?.requestedRole || role, ...profiles.at(-1) },
    });
  });
  return profiles;
}

for (const role of ['DMC_OFFICER', 'DISTRICT_OFFICER', 'RESPONSE_TEAM_MEMBER']) {
test(`desktop login verifies ${role} and opens the staff portal`, async ({ page }) => {
  await mockCloud(page, { role });
  await page.goto('/auth');
  await page.getByLabel('Email Address', { exact: true }).fill('citizen@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('status')).toContainText('reset instructions');
  expect(await page.evaluate(() => window.testResetEmail)).toBe('citizen@example.com');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/monitoring$/);
  await expect(page.getByText('Test Citizen', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.testPersistence)).toBe('local');
});
}

test('desktop signup activates the selected staff role and opens the staff portal', async ({ page }) => {
  const profiles = await mockCloud(page);
  await page.goto('/auth?mode=signup');
  await page.getByLabel('Full Name').fill('Test Citizen');
  await page.getByLabel('Role', { exact: true }).selectOption('Response Team Member');
  await expect(page.getByLabel('Role', { exact: true }).locator('option')).toHaveText([
    'Select your role', 'DMC Officer', 'District Officer', 'Response Team Member',
  ]);
  await page.getByLabel('Email Address').fill('citizen@example.com');
  await page.getByLabel('Phone Number').fill('0771234567');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page).toHaveURL(/\/staff\/monitoring$/);
  expect(profiles).toEqual([{ name: 'Test Citizen', phone: '0771234567', requestedRole: 'RESPONSE_TEAM_MEMBER' }]);
  expect(await page.evaluate(() => window.testDisplayName)).toBe('Test Citizen');
  expect(await page.evaluate(() => window.testPersistence)).toBe('session');
});

for (const scenario of [
  { invalidPassword: true, message: 'Email or password is incorrect.' },
  { backendUnavailable: true, message: 'Profile service unavailable.' },
]) {
  test(`desktop login keeps the form open on failure: ${scenario.message}`, async ({ page }) => {
    await mockCloud(page, scenario);
    await page.goto('/auth');
    await page.getByLabel('Email Address').fill('citizen@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('status')).toContainText(scenario.message);
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeEnabled();
  });
}

test('local storage cannot grant an unauthenticated user staff access', async ({ page }) => {
  await mockCloud(page);
  await page.addInitScript(() => localStorage.setItem('dmcStaffRole', 'DMC_OFFICER'));
  await page.goto('/staff/monitoring');
  await expect(page).toHaveURL(/\/auth$/);
});

test('a public role cannot open the staff portal', async ({ page }) => {
  await mockCloud(page, { role: 'CITIZEN' });
  await page.goto('/auth');
  await page.getByLabel('Email Address').fill('citizen@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Response Team Member account is required');
  await expect(page).toHaveURL(/\/auth$/);
});
