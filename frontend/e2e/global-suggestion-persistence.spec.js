import { test, expect } from '@playwright/test';

test.describe('Global Suggestion Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Mock setup similar to text-interaction.spec.js
    await page.route('**/api/texts/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textsData: [{ id: 1, grade: 5, usersAssigned: ['testuser'], normalizedByUser: false, sourceFileName: 'essay1.txt' }],
        }),
      });
    });

    await page.route('**/api/users', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ usernames: ['testuser'] }) });
    });

    await page.route('**/api/texts/1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          sourceFileName: 'essay1.txt',
          grade: 5,
          tokens: [
            { id: 101, text: 'Hello', position: 0, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 102, text: 'wrld', position: 1, isWord: true, toBeNormalized: true, candidates: ['world'] },
          ],
        }),
      });
    });

    await page.route('**/api/texts/1/normalizations', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.addInitScript(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', 'testuser');
      localStorage.setItem('isAdmin', 'false');
    });

    await page.goto('/main');
    await page.getByRole('combobox').first().click();
    await page.getByText('essay1.txt', { exact: true }).click();
    await expect(page.getByText('Hello')).toBeVisible();
  });

  test('should persist global suggestion check when re-clicking the token', async ({ page }) => {
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();
    await page.getByLabel('Sugestão Global').check();
    
    // Re-click the token
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();
    
    await page.getByText('world', { exact: true }).click();
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.getByText('você deseja adicionar world como correção para todas as ocorrências de "wrld"? Isso afetará todos os textos')).toBeVisible();
  });
});
