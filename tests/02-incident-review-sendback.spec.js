import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  handleForcedLogoutIfPresent,
  logout,
  loadIncidentId
} from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Review & Sendback', () => {
  let incId;

  test.beforeAll(() => {
    // Load the incident ID created by the previous test
    incId = loadIncidentId();
  });

  test('reviewer sends incident back for revision', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // LOGIN AS MCDONALD (Reviewer)
    await loginAndOnBehalf(page, 'MCDONALD');

    // Navigate to Queued incidents
    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.locator('#Queued-tab').click();

    // Search for the incident
    const filter = page.locator('#dataTable4_filter input[type="search"]');
    await filter.waitFor({ state: 'visible' });
    await filter.fill(String(incId));

    const incidentLink = page.locator('#dataTable4').getByRole('link', { name: String(incId) });
    await incidentLink.waitFor({ state: 'visible' });
    await incidentLink.click();

    // Navigate to attachment tab
    await page.locator('#incident-attachment-tab').click();

    // Click "Send Back" button
    await page.locator('#sendback_queued_incd').click();

    // Wait for the modal and fill in reason
    const reasonTextArea = page.locator('#send_back_to_rw_reason');
    await reasonTextArea.waitFor({ state: 'visible' });
    await reasonTextArea.fill('Please revise and send back.');

    // Click final confirmation button
    await page.locator('#btnsendbackToRWIncident').click();

    // Verify modal closes
    await expect(reasonTextArea).not.toBeVisible({ timeout: 5000 });

    // Cleanup
    await logout(page);
    await context.close();
  });
});
