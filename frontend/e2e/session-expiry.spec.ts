import { test, expect } from '@playwright/test';

test.describe('Session Expiry', () => {

  test('should alert and redirect to login when API returns 401', async ({ page }) => {
    // 1. Mock Login
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Login successful', isAdmin: false }),
      });
    });

    // 2. Mock Initial Texts List
    await page.route('**/api/texts/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          textsData: [
            {
              id: 123,
              grade: 5,
              usersAssigned: ['testuser'],
              normalizedByUser: false,
              sourceFileName: 'Essay 123',
            },
          ],
        }),
      });
    });
    
    // 3. Mock Usernames
    await page.route('**/api/users', async route => {
      await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({ usernames: ['teacher1'] })
      });
    });

    // 4. Mock The specific text detail call to fail with 401
    await page.route('**/api/texts/123', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token expired' }),
      });
    });
    
    // 5. Mock Normalizations (fetched in parallel with text)
    await page.route('**/api/texts/123/normalizations', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ corrections: [] })
        })
    })

    // Handle Alert Dialog
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Execute Login Flow
    await page.goto('/login');
    await page.fill('input[name="username_input"]', 'testuser');
    await page.fill('input[name="password_input"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for Main Page
    await expect(page).toHaveURL('/main');
    
    // Wait for header to ensure page loaded
    await expect(page.getByRole('heading', { name: 'Busca de Textos' })).toBeVisible();

    // Interact with EssaySelector
    // Open the dropdown - assuming 'ID do Texto' is the placeholder
    // Force click because react-select structure overlays the placeholder text
    const dropdown = page.getByText('ID do Texto', { exact: true });
    await dropdown.click({ force: true });
    
    // Select the essay option
    await page.getByText('Essay 123').click();

    // Wait for the redirect to login
    await expect(page).toHaveURL('/login');
    
    // Verify alert message matches what we put in AuthContext
    expect(dialogMessage).toBe("Sua sessão expirou. Por favor, faça login novamente.");

  });
});
