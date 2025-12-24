import { test, expect } from '@playwright/test';

test.describe('Text Interaction', () => {
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
          ],
        }),
      });
    });

    // Mock the usernames API call
    await page.route('**/api/users', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          usernames: ['testuser', 'admin'],
        }),
      });
    });

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
            { text: 'Hello', position: 0, isWord: true, toBeNormalized: false, candidates: [] },
            { text: 'wrld', position: 1, isWord: true, toBeNormalized: true, candidates: ['world', 'word'] },
            { text: '.', position: 2, isWord: false, toBeNormalized: false, candidates: [] },
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

    // Simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', 'testuser');
      localStorage.setItem('textsData', JSON.stringify([
            {
              id: 1,
              grade: 5,
              usersAssigned: ['testuser'],
              normalizedByUser: false,
              sourceFileName: 'essay1.txt',
            },
      ]));
    });

    await page.goto('/main');
    
    // Ensure we are on the main page
    await expect(page).toHaveURL('/main');
    
    // Wait for the dashboard to load
    await expect(page.getByRole('heading', { name: 'Busca de Textos' })).toBeVisible();

    // Select the essay using the robust selector
    await page.getByRole('combobox').first().click();
    await page.getByText('essay1.txt', { exact: true }).click();
    
    // Wait for the essay text to be visible
    await expect(page.getByText('Hello')).toBeVisible();
  });

  test('should display candidates when clicking a word', async ({ page }) => {
    // Click on 'wrld'
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();

    // Verify candidates are displayed
    await expect(page.getByText('Alternativas para')).toBeVisible();
    await expect(page.getByText('world', { exact: true })).toBeVisible();
    await expect(page.getByText('word', { exact: true })).toBeVisible();
  });

  test('should apply a correction from candidates', async ({ page }) => {
    // Mock the POST normalization call
    let postCalled = false;
    await page.route('**/api/texts/1/normalizations', async route => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        const postData = route.request().postDataJSON();
        expect(postData).toEqual({
          first_index: 1,
          last_index: 1,
          new_token: 'world'
        });
        await route.fulfill({ status: 200 });
      } else {
        // GET request after refresh
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            "1": { last_index: 1, new_token: "world" }
          }),
        });
      }
    });

    // Click on 'wrld'
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();

    // Click on candidate 'world'
    await page.getByText('world', { exact: true }).click();

    // Confirm in popup
    await expect(page.getByText('você deseja adicionar world como correção?')).toBeVisible();
    await page.getByRole('button', { name: 'Adicionar' }).click();

    // Verify API call was made
    expect(postCalled).toBe(true);

    // Verify the text is updated
    await expect(page.locator('.clickable').filter({ hasText: 'world' })).toHaveClass(/corrected/); 
  });

  test('should apply a manual correction', async ({ page }) => {
    // Mock the POST normalization call
    await page.route('**/api/texts/1/normalizations', async route => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        expect(postData).toEqual({
          first_index: 1,
          last_index: 1,
          new_token: 'custom'
        });
        await route.fulfill({ status: 200 });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            "1": { last_index: 1, new_token: "custom" }
          }),
        });
      }
    });

    // Click on 'wrld'
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();

    // Type in new token input
    await page.getByPlaceholder('Novo Token').fill('custom');
    
    // Click the add button (pencil icon)
    await page.locator('.edit-button').click();

    // Confirm in popup
    await expect(page.getByText('você deseja adicionar custom como correção?')).toBeVisible();
    await page.getByRole('button', { name: 'Adicionar' }).click();

    // Verify update
    await expect(page.getByText('custom')).toHaveClass(/corrected/);
  });

  test('should delete a correction', async ({ page }) => {
    // Start with a corrected text
    await page.route('**/api/texts/1/normalizations', async route => {
        if (route.request().method() === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  "1": { last_index: 1, new_token: "world" }
                }),
            });
        } else if (route.request().method() === 'DELETE') {
            const postData = route.request().postDataJSON();
            expect(postData).toEqual({ word_index: 1 });
            await route.fulfill({ status: 200 });
        }
    });

    // Reload to get the corrected state
    await page.reload();
    // Select essay again as reload clears state
    await page.getByRole('combobox').first().click();
    await page.getByText('essay1.txt', { exact: true }).click();

    // Click on the corrected word 'world'
    await page.locator('.clickable').filter({ hasText: 'world' }).click();

    // Click the delete button (trash icon)
    await page.locator('.delete-button').click();

    // Confirm in popup
    await expect(page.getByText('você deseja remover a correção?')).toBeVisible();
    await page.getByRole('button', { name: 'Remover' }).click();
  });
});
