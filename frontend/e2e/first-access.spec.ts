import { test, expect } from '@playwright/test';

test.describe('First Access', () => {
  test('should activate account successfully', async ({ page }) => {
    // Mock the activate API call
    await page.route('**/api/activate', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      expect(postData.username).toBe('newuser');
      expect(postData.password).toBe('newpassword123');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Account activated successfully.' }),
      });
    });

    await page.goto('/first-access');

    // Fill form
    await page.fill('input[id="username"]', 'newuser');
    await page.fill('input[id="password"]', 'newpassword123');
    await page.fill('input[id="confirmPassword"]', 'newpassword123');

    // Submit
    await page.click('button[type="submit"]');

    // Expect success message
    await expect(page.locator('.message.success')).toContainText('Conta ativada com sucesso!');
    
    // Should redirect to login (check URL after timeout)
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL('/login');
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/first-access');

    await page.fill('input[id="username"]', 'newuser');
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'mismatch');

    await page.click('button[type="submit"]');

    await expect(page.locator('.message.error')).toContainText('As senhas não coincidem.');
  });
});
