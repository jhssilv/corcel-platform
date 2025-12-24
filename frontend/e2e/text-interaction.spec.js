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
            { id: 101, text: 'Hello', position: 0, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 102, text: 'wrld', position: 1, isWord: true, toBeNormalized: true, candidates: ['world', 'word'] },
            { id: 103, text: '.', position: 2, isWord: false, toBeNormalized: false, candidates: [] },
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
          new_token: 'world',
          suggest_for_all: false
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

    // Verify API call was made (no popup expected)
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
          new_token: 'custom',
          suggest_for_all: false
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

    // Verify update (no popup expected)
    await expect(page.getByText('custom')).toHaveClass(/corrected/);
  });

  test('should delete a correction', async ({ page }) => {
    let deleteCalled = false;
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
            deleteCalled = true;
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

    // Verify DELETE was called
    expect(deleteCalled).toBe(true);
  });

  test('should toggle "to be normalized" status', async ({ page }) => {
    // Mock the toggle API call
    let toggleCalled = false;
    await page.route('**/api/tokens/102/suggestions/toggle', async route => {
      toggleCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: "Token 'to_be_normalized' status toggled" }),
      });
    });

    // Click on 'wrld' (which has toBeNormalized: true)
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();

    // Verify candidates panel is open
    await expect(page.getByText('Alternativas para')).toBeVisible();

    // Click the toggle button (green checkmark/trash icon depending on state)
    // The button has class 'remove-suggestions-button'
    await page.locator('.remove-suggestions-button').click();

    // Verify the confirmation dialog appears
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.getByText('Marcar token como (in)correto?')).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: 'Confirmar' }).click();

    // Verify API was called
    expect(toggleCalled).toBe(true);
  });

  test('should send global suggestion flag when adding a correction', async ({ page }) => {
    // Mock the save normalization API call
    let savePayload = null;
    await page.route('**/api/texts/1/normalizations', async route => {
      if (route.request().method() === 'POST') {
        savePayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: "Correction added: world" }),
        });
      } else {
        await route.continue();
      }
    });

    // Click on 'wrld'
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();

    // Check the "Sugestão Global" checkbox
    await page.getByLabel('Sugestão Global').check();

    // Select a candidate 'world'
    await page.getByRole('button', { name: 'world', exact: true }).click();

    // Verify confirmation popup
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.getByText('você deseja adicionar world como correção para todas as ocorrências?')).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: 'Adicionar' }).click();

    // Verify payload
    expect(savePayload).toBeTruthy();
    expect(savePayload.suggest_for_all).toBe(true);
    expect(savePayload.new_token).toBe('world');
  });

  test('should show popup when global suggestion is checked and manual token is entered', async ({ page }) => {
    // Click on 'wrld'
    await page.locator('.clickable').filter({ hasText: 'wrld' }).click();

    // Check the "Sugestão Global" checkbox
    await page.getByLabel('Sugestão Global').check();

    // Enter manual token
    await page.getByPlaceholder('Novo Token').fill('custom_global');
    
    // Press Enter
    await page.getByPlaceholder('Novo Token').press('Enter');

    // Verify confirmation popup
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await expect(page.getByText('você deseja adicionar custom_global como correção para todas as ocorrências?')).toBeVisible();
  });
});
