import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 980 } });

  page.on('console', (message) => {
    console.log(`console.${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    console.error(`pageerror: ${error.message}`);
  });
  page.on('requestfailed', (request) => {
    console.error(`requestfailed: ${request.url()} ${request.failure()?.errorText}`);
  });

  const handleDialog = (dialog) => {
    const message = dialog.message() ?? '';
    if (dialog.type() === 'prompt') {
      if (message.includes('username')) {
        dialog.accept('ui-automation-user');
        return;
      }
      if (message.includes('password')) {
        dialog.accept('ui-automation-pass');
        return;
      }
      if (message.includes('MFA code')) {
        dialog.accept('111111');
        return;
      }
    }
    dialog.accept();
  };

  page.on('dialog', handleDialog);
  const appUrl = process.env.POC_URL || `http://127.0.0.1:${process.env.PORT || '4173'}`;
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app', { timeout: 10000 });
  const appNodeExists = await page.locator('#app').count();
  console.log(`appNodeExists=${appNodeExists}`);
  const html = await page.locator('#app').innerHTML();
  console.log(`initialAppHtmlLength=${html.length}`);
  await page.waitForTimeout(1500);
  const appMarkup = await page.locator('body').innerText();
  console.log(`pageTextSnippet=${appMarkup.slice(0, 120)}`);

  await page.getByRole('button', { name: 'Reset seed' }).click();
  await page.getByRole('heading', { name: 'What this POC is proving' }).waitFor();
  await page.getByRole('button', { name: 'Provision' }).click();
  await page.getByRole('heading', { name: 'Provision teammate' }).waitFor();

  await page.getByRole('textbox', { name: 'Name' }).fill('Playwright User');
  await page.getByRole('textbox', { name: 'Email' }).fill('playwright@example.com');
  await page.locator('input[name="licenseNumber"]').fill('PL-000');
  await page.locator('input[name="licenseState"]').fill('FL');
  await page.getByRole('textbox', { name: 'Role' }).fill('Ops');
  await page.locator('input[name="carrier_carrier-cna"]').check();
  await page.locator('input[name="carrier_carrier-hartford"]').check();
  await page.getByRole('button', { name: 'Create provisioning request' }).click();
  await page.getByRole('button', { name: 'Requests' }).click();
  await page.getByRole('heading', { name: 'Lifecycle Requests' }).waitFor();
  await page.waitForTimeout(200);
  const requestCountAfterProvision = await page.locator('#app .request-row').count();
  if (requestCountAfterProvision < 1) {
    throw new Error('Provisioning request did not create a new lifecycle request.');
  }

  await page.getByRole('button', { name: 'Users' }).click();
  const createdUserCard = page.locator('.user-row', { hasText: 'Playwright User' });
  await createdUserCard.waitFor();
  if (await createdUserCard.isVisible() === false) {
    throw new Error('Provisioned user card is not visible.');
  }

  await createdUserCard.getByRole('button', { name: 'Offboard' }).click();
  await page.waitForTimeout(300);

  const departedBadge = createdUserCard.getByText('departed', { exact: false });
  const isDeparted = await departedBadge.isVisible().catch(() => false);
  if (!isDeparted) {
    throw new Error('User is not marked as departed after offboarding action.');
  }

  const launchUserCard = page.locator('.user-row', { hasText: 'Alex Metka' });
  await launchUserCard.getByRole('button', { name: 'Launch my access' }).click();
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Continuity' }).click();
  await page.locator('#app section:has-text("Admin Continuity")').waitFor();
  const continuityText = await page.locator('h2:has-text("Admin Continuity")').innerText();
  if (!continuityText.includes('Admin Continuity')) {
    throw new Error('Continuity section did not render.');
  }

  await page.getByRole('button', { name: 'Knowledge' }).click();
  await page.fill('input[name="query"]', 'hartford');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForTimeout(200);
  const hasHartfordAnswer = await page.getByText('Hartford: deprovision flow').isVisible();
  if (!hasHartfordAnswer) {
    throw new Error('Knowledge assistant did not return Hartford result.');
  }

  await page.getByRole('button', { name: 'Users' }).click();
  await page.waitForSelector('#app .user-row', { timeout: 10000 });
  const localCountBefore = await page.locator('.user-row').count();
  await page.reload();
  await page.getByRole('button', { name: 'Users' }).click();
  await page.waitForSelector('#app .user-row', { timeout: 10000 });
  const localCountAfter = await page.locator('.user-row').count();
  if (localCountAfter !== localCountBefore) {
    throw new Error('Local storage state did not persist across reload.');
  }

  await browser.close();
  console.log('Playwright smoke check passed');
}

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
