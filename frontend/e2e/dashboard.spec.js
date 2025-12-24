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
    await expect(page.getByText('ID do Texto', { exact: true })).toBeVisible();
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
    await expect(page.locator('.document-title').filter({ hasText: 'essay1.txt' })).toBeVisible();
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

  test('should update corrected count when essay is marked as finished', async ({ page }) => {
    // Initial count check
    await expect(page.locator('.corrected-count')).toContainText('Finalizados: 1 de 2');

    // Mock the text detail API call for essay 1
    await page.route('**/api/texts/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          sourceFileName: 'essay1.txt',
          grade: 5,
          normalizedByUser: false,
          tokens: [{ text: 'Hello', position: 0, toBeNormalized: false, candidates: [] }],
        }),
      });
    });

    // Mock normalizations (GET and PATCH)
    await page.route('**/api/texts/1/normalizations', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Success' }),
        });
      } else {
        // Default to GET
        await route.fulfill({ status: 200, body: JSON.stringify({}) });
      }
    });

    // Select essay 1
    await page.getByRole('combobox').first().click();
    await page.getByText('essay1.txt', { exact: true }).click();

    // Update mock for text detail (so the button updates too)
    await page.unroute('**/api/texts/1');
    await page.route('**/api/texts/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          grade: 5,
          usersAssigned: ['testuser'],
          normalizedByUser: true, // Now TRUE
          sourceFileName: 'essay1.txt',
          content: 'Essay content...',
          tokens: [{ text: 'Hello', position: 0, toBeNormalized: false, candidates: [] }],
        }),
      });
    });

    // Mock the REFRESH of the texts list
    await page.unroute('**/api/texts/');
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
              normalizedByUser: true, // Now TRUE
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

    // Setup a promise to wait for the refresh call (LIST)
    const refreshPromise = page.waitForResponse(async response => {
      // We want the list response, not the detail response
      // The list response has 'textsData' property
      if (!response.url().includes('/api/texts/')) return false;
      if (response.status() !== 200) return false;
      try {
        const json = await response.json();
        return json.textsData !== undefined;
      } catch (e) {
        return false;
      }
    });

    // Click the toggle
    await page.locator('.finalized-toggle').click();

    // Wait for the refresh call to complete
    await refreshPromise;

    // Verify the count updates
    await expect(page.locator('.corrected-count')).toContainText('Finalizados: 2 de 2');
  });
});
