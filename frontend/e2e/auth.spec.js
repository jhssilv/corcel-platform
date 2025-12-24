import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Mock the login API call
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Login successful' }),
      });
    });

    // Mock the texts API call which is called immediately after login
    await page.route('**/api/texts/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textsData: [
            {
              id: 1,
              grade: 5,
              usersAssigned: ['testuser'],
              normalizedByUser: false,
              sourceFileName: 'essay1.txt',
            },
          ],
        }),
      });
    });

    await page.goto('/');

    // Fill in the login form
    await page.fill('input[name="username_input"]', 'testuser');
    await page.fill('input[name="password_input"]', 'password123');

    // Click the login button
    await page.click('button[type="submit"]');

    // Expect to be redirected to the main page
    await expect(page).toHaveURL('/main');
    
    // Verify that the main page content is visible
    await expect(page.getByRole('heading', { name: 'Busca de Textos' })).toBeVisible();
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    // Mock the login API call to fail
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    // Mock window.alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Invalid credentials');
      await dialog.accept();
    });

    await page.goto('/');

    // Fill in the login form
    await page.fill('input[name="username_input"]', 'wronguser');
    await page.fill('input[name="password_input"]', 'wrongpass');

    // Click the login button
    await page.click('button[type="submit"]');

    // Expect to stay on the login page (or redirect to it)
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Mock logout API
    await page.route('**/api/logout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logout successful' }),
      });
    });

    // Simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', 'testuser');
    });

    await page.goto('/main');

    // Open side panel
    await page.locator('button[aria-label="Menu"]').click();

    // Click logout button
    await page.getByRole('button', { name: 'Sair' }).click();

    // Expect to be redirected to login
    await expect(page).toHaveURL(/\/login/);
    
    // Verify localStorage is cleared (optional, but good practice)
    const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    expect(isAuthenticated).toBeNull();
  });
});
