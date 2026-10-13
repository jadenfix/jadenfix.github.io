import { expect, test } from '@playwright/test';

test('legacy /projects URL recovers to the production HashRouter page', async ({ page }) => {
  await page.goto('/projects');

  await expect(page).toHaveURL(/\/#\/projects$/);
  await expect(page.getByRole('heading', { name: 'All Projects' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search projects' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Search projects' }).fill('Financial C++');
  await expect(page.getByText('Financial C++ Engine', { exact: true })).toBeVisible();
  await expect(page.getByText('Roe AI Python SDK', { exact: true })).toBeHidden();
});

test('production navigation reaches Projects at desktop and mobile widths', async ({ page, isMobile }) => {
  await page.goto('/#/');

  if (isMobile) {
    await page.getByRole('button', { name: 'Toggle menu' }).click();
  }

  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL(/\/#\/projects$/);
  await expect(page.getByRole('heading', { name: 'All Projects' })).toBeVisible();
});
