import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the texts API call
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
            {
              id: 2,
              grade: 3,
              usersAssigned: ['testuser'],
              normalizedByUser: true,
              sourceFileName: 'essay2.txt',
            },
          ],
        }),
      });
    });

    // Mock the usernames API call (used in EssaySelector)
    await page.route('**/api/users', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          usernames: ['testuser', 'admin'],
        }),
      });
    });

    // Mock login
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Login successful' }),
      });
    });

    await page.goto('/');
    await page.fill('input[name="username_input"]', 'testuser');
    await page.fill('input[name="password_input"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to main
    await expect(page).toHaveURL('/main');
  });

  test('should display the dashboard with essay selector', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Busca de Textos' })).toBeVisible();
    await expect(page.getByText('ID do Texto')).toBeVisible();
  });

  test('should select an essay and display its content', async ({ page }) => {
    // Mock the text detail API call
    await page.route('**/api/texts/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          sourceFileName: 'essay1.txt',
          grade: 5,
          tokens: [
            { text: 'Hello', position: 0, toBeNormalized: false, candidates: [] },
            { text: 'world', position: 1, toBeNormalized: true, candidates: ['World'] },
          ],
        }),
      });
    });

    // Mock the normalizations API call
    await page.route('**/api/texts/1/normalizations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Select the essay from the dropdown
    // We target the first combobox (ID do Texto)
    await page.getByRole('combobox').first().click();
    
    // Click option 'essay1.txt'
    await page.getByText('essay1.txt', { exact: true }).click();

    // Verify the essay content is displayed
    await expect(page.getByRole('heading', { name: 'essay1.txt' })).toBeVisible();
    await expect(page.getByText('Hello')).toBeVisible();
    await expect(page.getByText('world')).toBeVisible();
  });

  test('should open download dialog', async ({ page }) => {
    // Open side panel using specific selector
    await page.locator('button[aria-label="Menu"]').click();
    
    // Click download button
    await page.getByRole('button', { name: 'Download' }).click();
    
    await expect(page.getByRole('heading', { name: 'Opções de Download' })).toBeVisible();
    await expect(page.getByText('Todos os textos selecionados no filtro serão baixados.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { name: 'Opções de Download' })).not.toBeVisible();
  });
});
