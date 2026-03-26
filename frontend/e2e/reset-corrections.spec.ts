import { test, expect } from '@playwright/test';

test.describe('Reset Corrections', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Login
        await page.route('**/api/login', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ message: 'Login successful', isAdmin: false }),
            });
        });

        // Mock Texts List
        await page.route('**/api/texts/', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    textsData: [{
                        id: 1,
                        grade: 5,
                        usersAssigned: ['testuser'],
                        normalizedByUser: false,
                        sourceFileName: 'essay1.txt',
                    }],
                }),
            });
        });

        // Mock Usernames
        await page.route('**/api/users', async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ usernames: ['testuser'] }) });
        });

        // Go to login and login
        await page.goto('/');
        await page.fill('input[type="text"]', 'testuser');
        await page.fill('input[type="password"]', 'password');
        await page.click('button:has-text("Entrar")');
    });

    test('should delete all normalizations', async ({ page }) => {
        let normalizations = { "0": { last_index: 0, new_token: "Hi" } };

        // Mock Text Detail
        await page.route('**/api/texts/1', async route => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: 1,
                    sourceFileName: 'essay1.txt',
                    grade: 5,
                    normalizedByUser: false,
                    assignedToUser: true,
                    tokens: [
                        { id: 101, text: 'Hello', position: 0, isWord: true, toBeNormalized: false, candidates: [] },
                        { id: 102, text: 'World', position: 1, isWord: true, toBeNormalized: false, candidates: [] }
                    ],
                }),
            });
        });

        // Mock Normalizations
        await page.route('**/api/texts/1/normalizations', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(normalizations)
                });
            } else {
                await route.continue();
            }
        });

        // Mock Delete
        let deleteCalled = false;
        await page.route('**/api/texts/1/normalizations/all', async route => {
            if (route.request().method() === 'DELETE') {
                deleteCalled = true;
                normalizations = {}; // Update state for next fetch
                await route.fulfill({ status: 200, body: JSON.stringify({ message: "Deleted" }) });
            } else {
                await route.continue();
            }
        });

        // Select the text
        await page.getByRole('combobox').first().click();
        await page.getByText('essay1.txt', { exact: true }).click();

        // Wait for essay container
        await expect(page.getByTestId('essay-container')).toBeVisible();

        // Handle confirmation dialog
        page.on('dialog', dialog => dialog.accept());

        // Click delete corrections button
        const resetBtn = page.getByTestId('reset-corrections-btn');
        await expect(resetBtn).toBeVisible();
        await resetBtn.click();

        // Verify API was called
        await expect.poll(() => deleteCalled).toBe(true);

        // Verify UI update (optional, but good)
        // Since we mocked normalizations to be empty on next fetch, 
        // if UI refreshed, it should show original state (no corrections)
        // This depends on how quickly refresh happens.
    });
});
