import { test, expect, type Page } from '@playwright/test';

const tokenByText = (page: Page, tokenText: string) =>
  page.locator(`[data-testid="essay-token"][data-token-text="${tokenText}"]`).first();

test.describe('Multi-Token Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the texts API call
    await page.route('**/api/texts/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textsData: [
            {
              id: 2,
              grade: 8,
              usersAssigned: ['testuser'],
              normalizedByUser: false,
              sourceFileName: 'essay2.txt',
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

    // Mock the text detail API call with a longer text
    await page.route('**/api/texts/2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          sourceFileName: 'essay2.txt',
          grade: 8,
          normalizedByUser: false,
          assignedToUser: true,
          tokens: [
            { id: 201, text: 'The', position: 0, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 202, text: 'quick', position: 1, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 203, text: 'brown', position: 2, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 204, text: 'fox', position: 3, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 205, text: 'jumps', position: 4, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 206, text: 'over', position: 5, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 207, text: 'the', position: 6, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 208, text: 'lazy', position: 7, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 209, text: 'dog', position: 8, isWord: true, toBeNormalized: false, candidates: [] },
            { id: 210, text: '.', position: 9, isWord: false, toBeNormalized: false, candidates: [] },
          ],
        }),
      });
    });

    // Mock the normalizations API call
    await page.route('**/api/texts/2/normalizations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Mock current user API call (AuthContext bootstrap)
    await page.route('**/api/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ username: 'testuser', isAdmin: false }),
      });
    });

    // Simulate logged-in state
    await page.addInitScript(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('username', 'testuser');
      localStorage.setItem('isAdmin', 'false');
      localStorage.setItem('textsData', JSON.stringify([
        {
          id: 2,
          grade: 8,
          usersAssigned: ['testuser'],
          normalizedByUser: false,
          sourceFileName: 'essay2.txt',
        },
      ]));
    });

    await page.goto('/main');

    // Ensure we are on the main page
    await expect(page).toHaveURL('/main');

    // Wait for the dashboard to load
    await expect(page.getByRole('heading', { name: 'Busca de Textos' })).toBeVisible();

    // Select the essay
    await page.getByRole('combobox').first().click();
    await page.getByText('essay2.txt', { exact: true }).click();

    // Wait for the essay text to be visible
    await expect(page.getByText('The', { exact: true })).toBeVisible();
  });

  test('should select multiple tokens using Control key', async ({ page }) => {
    // Click 'quick' (index 1)
    await tokenByText(page, 'quick').click();

    // Hold Control and click 'fox' (index 3)
    await page.keyboard.down('Control');
    await tokenByText(page, 'fox').click();
    await page.keyboard.up('Control');

    // Verify selection visual state
    // 'quick', 'brown', 'fox' should be selected
    await expect(tokenByText(page, 'quick')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'brown')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'fox')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);

    // 'The' and 'jumps' should NOT be selected
    await expect(page.getByText('The', { exact: true })).not.toHaveClass(/selected/);
    await expect(tokenByText(page, 'jumps')).not.toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
  });

  test('should modify selection range using Control key', async ({ page }) => {
    // Initial selection: 'brown' (2) to 'jumps' (4)
    await tokenByText(page, 'brown').click();
    await page.keyboard.down('Control');
    await tokenByText(page, 'jumps').click();
    await page.keyboard.up('Control');

    // Verify initial selection
    await expect(tokenByText(page, 'brown')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'fox')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'jumps')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);

    // Expand left: Click 'quick' (1)
    await page.keyboard.down('Control');
    await tokenByText(page, 'quick').click();
    await page.keyboard.up('Control');

    // Verify expansion
    await expect(tokenByText(page, 'quick')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'brown')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'jumps')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);

    // Shrink right: Click 'fox' (3)
    // Current range: 1 (quick) to 4 (jumps)
    // Clicking 3 (fox) with Ctrl should set EndIndex to 3?
    // Logic: selectedOption (3) < selectedStartIndex (1) ? No.
    // So setSelectedEndIndex(3).
    await page.keyboard.down('Control');
    await tokenByText(page, 'fox').click();
    await page.keyboard.up('Control');

    // Verify shrink
    // Range should be 1 (quick) to 3 (fox)
    await expect(tokenByText(page, 'quick')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'fox')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    // 'jumps' (4) should no longer be selected
    await expect(tokenByText(page, 'jumps')).not.toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
  });

  test('should hide candidates list when multiple tokens are selected and reset selection', async ({ page }) => {
    // Select 'quick' (1)
    await tokenByText(page, 'quick').click();

    // Verify candidates might be visible (if it had any, but 'quick' has none in mock)
    // Let's assume 'quick' has no candidates, so "Alternativas para" is hidden anyway.
    // But let's check that selecting multiple ensures it stays hidden or behaves correctly.

    // Select 'fox' (3) with Ctrl
    await page.keyboard.down('Control');
    await tokenByText(page, 'fox').click();
    await page.keyboard.up('Control');

    // Verify "Alternativas para" is NOT visible (it shouldn't be for multi-selection)
    await expect(page.getByText('Alternativas para')).not.toBeVisible();

    // Now click 'brown' (2) WITHOUT Ctrl
    await tokenByText(page, 'brown').click();

    // Verify selection is now JUST 'brown'
    await expect(tokenByText(page, 'brown')).toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'quick')).not.toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
    await expect(tokenByText(page, 'fox')).not.toHaveAttribute('data-token-state', /(^|\s)selected(\s|$)/);
  });

  test('should apply a correction to multiple tokens', async ({ page }) => {
    // Mock the POST normalization call
    let postCalled = false;
    await page.route('**/api/texts/2/normalizations', async route => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        const postData = route.request().postDataJSON();
        expect(postData).toEqual({
          first_index: 1,
          last_index: 3,
          new_token: 'fast animal',
          suggest_for_all: false
        });
        await route.fulfill({ status: 200 });
      } else {
        // GET request after refresh
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            "1": { last_index: 3, new_token: "fast animal" }
          }),
        });
      }
    });

    // Select 'quick' to 'fox'
    await tokenByText(page, 'quick').click();
    await page.keyboard.down('Control');
    await tokenByText(page, 'fox').click();
    await page.keyboard.up('Control');

    // Type new token
    await page.getByPlaceholder('Novo Token').fill('fast animal');

    // Click add
    await page.getByTestId('edit-button').click();

    // Verify API call
    expect(postCalled).toBe(true);

    // Verify update in UI
    // The text should now show 'fast animal' instead of 'quick brown fox'
    // Note: The frontend implementation replaces the tokens with the correction.
    // We need to check if 'fast animal' is visible and has 'corrected' class.
    await expect(page.getByText('fast animal')).toBeVisible();
    await expect(tokenByText(page, 'fast animal')).toHaveAttribute('data-token-state', /(^|\s)corrected(\s|$)/);

    // Original tokens should not be visible individually or should be replaced
    await expect(tokenByText(page, 'quick')).not.toBeVisible();
  });

  test('should delete a multi-token correction', async ({ page }) => {
    let isDeleted = false;

    // Dynamic mock for normalizations
    await page.route('**/api/texts/2/normalizations', async route => {
      if (route.request().method() === 'GET') {
        if (!isDeleted) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              "1": { last_index: 3, new_token: "fast animal" }
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
          });
        }
      } else if (route.request().method() === 'DELETE') {
        const postData = route.request().postDataJSON();
        expect(postData).toEqual({ word_index: 1 });
        isDeleted = true;
        await route.fulfill({ status: 200 });
      }
    });

    // Reload to get the corrected state
    await page.reload();
    await page.getByRole('combobox').first().click();
    await page.getByText('essay2.txt', { exact: true }).click();

    // Verify corrected state
    await expect(page.getByText('fast animal')).toBeVisible();

    // Click on the corrected phrase
    await page.getByText('fast animal').click();

    // Click delete
    await page.getByTestId('delete-button').click();

    // Verify that the original tokens return
    // 'quick', 'brown', 'fox' should be visible again
    await expect(tokenByText(page, 'quick')).toBeVisible();
    await expect(tokenByText(page, 'brown')).toBeVisible();
    await expect(tokenByText(page, 'fox')).toBeVisible();

    // 'fast animal' should be gone
    await expect(page.getByText('fast animal')).not.toBeVisible();
  });
});
