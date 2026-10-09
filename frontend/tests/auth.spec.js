import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/src/services/firebase/staffAuthService.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export async function loginStaff() { throw new Error('Backend unavailable in this test.'); }
      export async function registerStaff() { throw new Error('Backend unavailable in this test.'); }
    `,
  }));
  // Keep UI checks isolated from live Firebase account creation.
  await page.route('**/src/features/public-auth/services/publicAuthService.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export async function authenticatePublic() { throw new Error('Backend unavailable in this test.'); }
      export const publicAuthError = error => error.message;
      export async function requestPasswordReset() { return 'Reset requested.'; }
    `,
  }));
});
for (const width of [375, 430, 768, 1024, 1366, 1440, 1920]) {
  test(
    `welcome and sliding authentication at ${width}px`,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      await page.getByRole('link', { name: 'Sign In to the Portal' }).click();
      await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await expect(page.getByText('Enter a valid email address.')).toBeVisible();
      const visual = page.locator('.auth-visual');
      const panel = page.locator('.auth-form-panel');
      if (width > 760)
        expect((await visual.boundingBox()).x).toBeLessThan((await panel.boundingBox()).x);
      await page.getByRole('button', { name: 'Register' }).click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await page.waitForTimeout(700);
      await expect(page.locator('form')).toHaveCount(1);
      if (width > 760)
        expect((await visual.boundingBox()).x).toBeGreaterThan((await panel.boundingBox()).x);
      await page.getByRole('button', { name: 'Create Account', exact: true }).click();
      await expect(page.getByText('Passwords must match.')).toBeVisible();
      await page.getByLabel('Full Name', { exact: true }).fill('Test Citizen');
      await page.getByLabel('Role', { exact: true }).selectOption('DMC Officer');
      await page.getByLabel('Email Address', { exact: true }).fill('test@example.com');
      await page.getByLabel('Phone Number', { exact: true }).fill('0771234567');
      await page.getByLabel('Password', { exact: true }).fill('example password');
      await page.getByLabel('Confirm Password', { exact: true }).fill('example password');
      await page.getByRole('button', { name: 'Show password', exact: true }).click();
      await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Create Account', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Backend unavailable in this test.');
      await page.locator('.switch-prompt button').click();
      await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
      await page.waitForTimeout(700);
      if (width > 760)
        expect((await visual.boundingBox()).x).toBeLessThan((await panel.boundingBox()).x);
      await page.locator('.auth-tabs').getByRole('button', { name: 'Sign Up' }).click();
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
      await page.waitForTimeout(700);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      if ([375, 1440].includes(width))
        await page.screenshot({ path: `test-results/signup-${width}.png`, fullPage: true });
    }
  );
}
test(
  'direct routes and reduced motion',
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/auth?mode=signup');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await page.locator('.auth-tabs').getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'About', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.goto('/missing');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  }
);
