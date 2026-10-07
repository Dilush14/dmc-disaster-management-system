import { test, expect } from '@playwright/test';
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNioAAAAASUVORK5CYII=', 'base64');
// Explicit browser-only fixtures: production code never accepts these identities.
async function backendFixture(page) {
  const reports = [];
  const submissions = [];
  await page.route('**/src/services/firebase/config.js*', route => route.fulfill({ contentType: 'application/javascript', body: `export const isFirebaseConfigured = true; export function getFirebaseServices() { return { auth: { currentUser: { getIdToken: async () => 'browser-test-token' } } }; }` }));
  await page.route('**/src/features/public-auth/services/publicAuthService.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    const key = 'test-only-user';
    export const publicAuthError = error => error.message;
    export function observePublicAuth(callback) { callback(JSON.parse(sessionStorage.getItem(key) || 'null')); return () => {}; }
    export async function authenticatePublic(values) { const user = { id: 'test-citizen', name: values.name || 'citizen', email: values.email, phone: '0771234567', role: values.role || 'CITIZEN' }; sessionStorage.setItem(key, JSON.stringify(user)); return user; }
    export async function logoutPublic() { sessionStorage.removeItem(key); }
    export async function savePublicProfile(values) { return values; }
    export async function requestPasswordReset() { return 'Reset requested'; }
  ` }));
  await page.route('**/api/public/hazard-reports**', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' } });
    expect(request.headers().authorization).toBe('Bearer browser-test-token');
    const headers = { 'Access-Control-Allow-Origin': '*' };
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST') {
      const body = request.postDataBuffer().toString();
      const match = body.match(/\r\n\r\n(\{[^\r\n]+\})\r\n/);
      expect(match).not.toBeNull();
      const data = JSON.parse(match[1]); submissions.push(data);
      expect(Object.keys(data).sort()).toEqual(['clientRequestId', 'dateTime', 'description', 'hazardType', 'latitude', 'longitude'].sort());
      expect(data.dateTime).toMatch(/Z$/);
      const reportId = 'HR-1234567890ABCDEF12345678';
      const report = { ...data, reportId, reporterId: 'test-citizen', status: 'PENDING_VERIFICATION', submittedAt: new Date().toISOString(), photoUrl: '/api/public/hazard-reports/' + reportId + '/photo' };
      reports.push(report);
      return route.fulfill({ headers, json: report });
    }
    if (path.endsWith('/photo')) return route.fulfill({ headers, contentType: 'image/png', body: image });
    if (path.endsWith('/my')) return route.fulfill({ headers, json: reports });
    return route.fulfill({ headers, json: reports.find(report => path.endsWith(report.reportId)) });
  });
  return { reports, submissions };
}
async function login(page, destination = /\/public\/home$/) {
  await page.goto('/public/login');
  await page.getByLabel('Email', { exact: true }).fill('citizen@example.com');
  await page.getByLabel('Password', { exact: true }).fill('example123');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(destination);
}
test('public form validation and signup only offer citizen/volunteer roles', async ({ page }) => {
  await backendFixture(page);
  await page.goto('/public/login');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await page.goto('/public');
  await page.getByRole('link', { name: 'Get Started' }).click();
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByText('Choose Citizen or Community Volunteer.')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await page.getByLabel('Full Name', { exact: true }).fill('Nimal Perera');
  await page.getByLabel('Email', { exact: true }).fill('nimal@example.com');
  await page.getByLabel('Phone Number').fill('0771234567');
  await page.getByLabel('Password', { exact: true }).fill('example123');
  await page.getByLabel('Confirm Password', { exact: true }).fill('example123');
  await page.getByRole('radio', { name: /Community Volunteer/ }).check();
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nimal Perera' })).toBeVisible();
});
test('complete reporting flow with GPS fallback, photo, edit, submission and status', async ({ page }) => {
  const fixture = await backendFixture(page);
  await page.setViewportSize({ width: 390, height: 850 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_, fail) => fail({ code: 1 }) } }));
  await login(page);
  await page.getByRole('link', { name: 'Report a Hazard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Flood', exact: true }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Describe the hazard.')).toBeVisible();
  await page.getByLabel('Description', { exact: true }).fill('Heavy rain has flooded the main road.');
  await page.getByRole('button', { name: 'Use my current location' }).click();
  await expect(page.getByText('Unable to access your current location.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
  await page.getByLabel('Latitude', { exact: true }).fill('6.9271');
  await page.getByLabel('Longitude', { exact: true }).fill('79.8612');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Choose hazard photo').setInputFiles({ name: 'hazard.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByAltText('Selected hazard evidence')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Heavy rain has flooded the main road.')).toBeVisible();
  await expect(page.getByText(/Lat: 6.9271/)).toBeVisible();
  await expect(page.getByAltText('Hazard evidence')).toBeVisible();
  await page.getByRole('link', { name: 'Edit description', exact: true }).click();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Heavy rain has flooded the main road.');
  await page.getByLabel('Description', { exact: true }).fill('Main road is flooded and blocked.');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Submit Report' }).click();
  await expect(page.getByRole('heading', { name: 'Report Submitted Successfully!' })).toBeVisible();
  await page.getByRole('link', { name: 'View Report Status' }).click();
  await expect(page.getByText('Pending', { exact: true })).toBeVisible();
  await expect(page.getByText('Main road is flooded and blocked.')).toBeVisible();
  await page.getByRole('link', { name: 'My Reports', exact: true }).click();
  await expect(page.locator('.public-report-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.public-report-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Verified', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching reports' })).toBeVisible();
  expect(fixture.submissions).toHaveLength(1);
  expect(errors).toEqual([]);
});
test('route guards and public navigation do not expose staff routes', async ({ page }) => {
  await backendFixture(page);
  await page.goto('/public/report-hazard/review');
  await expect(page).toHaveURL(/\/public\/login$/);
  await login(page, /\/public\/report-hazard$/);
  await page.goto('/public/report-hazard/review');
  await expect(page).toHaveURL(/\/public\/report-hazard$/);
  await page.goto('/public/home');
  for (const [name, heading] of [['Info', 'Disaster Information'], ['Profile', 'Your Profile'], ['Home', 'citizen']]) {
    await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  expect(await page.locator('a[href="/auth"], a[href="/"]').count()).toBe(0);
});
for (const width of [375, 390, 412, 430, 768, 1440]) {
  test(`public screens fit ${width}px`, async ({ page }) => {
    await backendFixture(page);
    await page.setViewportSize({ width, height: 850 });
    for (const [path, heading] of [['/public', 'Disaster Management Centre'], ['/public/signup', 'Create Account'], ['/public/login', 'Welcome Back']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await login(page);
    for (const [path, heading] of [['/public/home', 'citizen'], ['/public/report-hazard', 'Select Hazard Type'], ['/public/my-reports', 'My Reports']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto('/public/home');
    await expect(page.locator('.public-home-banner')).toBeVisible();
    if (width === 390 || width === 1440) await page.screenshot({ path: `test-results/public-home-${width}.png`, fullPage: true });
  });
}

test('unconfigured authentication cannot create a fake session', async ({ page }) => {
  await page.route('**/src/services/firebase/config.js*', route => route.fulfill({ contentType: 'application/javascript', body: 'export const isFirebaseConfigured = false; export const getFirebaseServices = () => null;' }));
  await page.goto('/public/login');
  await page.getByLabel('Email', { exact: true }).fill('citizen@example.com');
  await page.getByLabel('Password', { exact: true }).fill('example123');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sign-in is not available yet');
  await expect(page).toHaveURL(/\/public\/login$/);
  await expect(page.getByText('UI preview', { exact: false })).toHaveCount(0);
  await page.goto('/public/home');
  await expect(page).toHaveURL(/\/public\/login$/);
});
