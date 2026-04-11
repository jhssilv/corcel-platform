import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate the user globally for these tests
    await page.route('**/api/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ username: 'testuser', isAdmin: true }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', 'testuser');
      localStorage.setItem('isAdmin', 'true');
    });
  });

  test('MainPage: should display error when fetching essay details fails', async ({ page }) => {
    await page.route('**/api/users', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ usernames: [] }) });
    });
    // Give valid list of texts
    await page.route('**/api/texts/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textsData: [
            { id: 999, grade: 1, usersAssigned: [], normalizedByUser: false, sourceFileName: 'test_essay.txt' },
          ],
        }),
      });
    });
    // Fail when fetching the specific essay
    await page.route('**/api/texts/999', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' }),
      });
    });

    await page.goto('/main');
    await page.getByRole('combobox').first().click();
    await page.getByText('test_essay.txt', { exact: true }).click();

    await expect(page.getByTestId('main-error')).toBeVisible();
    await expect(page.getByTestId('main-error')).toContainText('Database connection failed');
  });

  test('EssaySelector: should display error when fetching texts list fails', async ({ page }) => {
    await page.route('**/api/users', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ usernames: [] }) });
    });
    
    await page.route('**/api/texts/', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to retrieve texts' }),
      });
    });

    await page.goto('/main');
    
    await expect(page.getByTestId('selector-error')).toBeVisible();
    await expect(page.getByTestId('selector-error')).toContainText('Failed to retrieve texts');
  });

  test('OCRPage: should display error when fetching raw text fails', async ({ page }) => {
    await page.route('**/api/users', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ usernames: [] }) });
    });
    await page.route('**/api/raw-texts/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textsData: [{ id: 888, sourceFileName: 'ocr_test.txt' }],
        }),
      });
    });
    
    // Fetch raw text fails
    await page.route('**/api/raw-texts/888', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Raw text not found' }),
      });
    });

    await page.goto('/ocr');
    await page.getByRole('combobox').first().click();
    await page.getByText('ocr_test.txt', { exact: true }).click();
    
    await expect(page.getByTestId('ocr-error')).toBeVisible();
    await expect(page.getByTestId('ocr-error')).toContainText('Raw text not found');
  });

  test('DownloadDialog: should display error when download fails', async ({ page }) => {
    await page.route('**/api/users', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ usernames: [] }) });
    });
    await page.route('**/api/texts/', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ textsData: [] }) });
    });
    
    await page.addInitScript(() => {
        localStorage.setItem('textIds', JSON.stringify([1, 2]));
    });

    // Mock download API error
    await page.route('**/api/download', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No files available for download' }),
      });
    });

    await page.goto('/main');
    
    // Open Side Panel
    await page.getByRole('button', { name: 'Menu' }).click();
    
    // Open Dialog
    await page.getByRole('button', { name: 'Download' }).click();
    
    // Dialog should be open
    await expect(page.getByText('Opções de Download')).toBeVisible();
    
    // Click submit
    // Note: the button starts disabled for 2 seconds. Wait for it to become enabled.
    await expect(page.getByRole('button', { name: 'Baixar' })).toBeEnabled({ timeout: 3000 });
    await page.getByRole('button', { name: 'Baixar' }).click();
    
    await expect(page.getByTestId('download-error')).toBeVisible();
    await expect(page.getByTestId('download-error')).toContainText('No files available for download');
  });
});
