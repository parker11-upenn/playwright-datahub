import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  logout,
  loadIncidentId,
  navigateToIncident
} from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Review Facilities/Residential Service', () => {
  let incId;

  test.beforeAll(() => {
    incId = loadIncidentId();
  });

  test('mcdonald selects Facilities/Residential Services and confirms incident', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as reviewer
    await loginAndOnBehalf(page, 'MCDONALD');

    // Go to Queued tab and open target incident
    await navigateToIncident(page, incId, 'Queued');

    // Click Review & Confirm tab
    await page.getByRole('tab', { name: 'Review & Confirm' }).click();

    // Toggle facilities/residential services checkbox and add note
    const facilitiesCheckbox = page.locator('input#AlliedCatID[type="checkbox"][value="6"]');
    await facilitiesCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    if (!(await facilitiesCheckbox.isChecked())) {
      await facilitiesCheckbox.check();
    }

    const notesArea = page.locator('textarea#NonNote');
    await notesArea.waitFor({ state: 'visible', timeout: 5000 });
    await notesArea.fill('Optional non-sensitive facility consequence note.');

    // Confirm incident
    const confirmButton = page.locator('#submit_queued_incd');
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // Wait for any pulse/spinner state and re-check to ensure the button click is registered
    await page.waitForTimeout(1000);

    // Confirm modal
    const confirmModalBtn = page.locator('#confirmActionBtn');
    await confirmModalBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmModalBtn.click();

    // Wait for confirmation step to complete (can be replaced with specific assertions)
    await page.waitForTimeout(3000);

    // Optionally assert we're redirected to a page or dashboard
    await expect(page).toHaveURL(/dsp_add_incident\.cfm/i);

    // Pause before logout for visual verification
    await page.waitForTimeout(5000);

    // Go back to dashboard and navigate to Open tab
    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.locator('#Open-tab').click();

    // Search for the incident in Open tab
    const openFilter = page.locator('.tab-pane.active input[type="search"]');
    await openFilter.waitFor({ state: 'visible' });
    await openFilter.fill(String(incId));

    // Toggle the archive checkbox for this incident
    const archiveCheckbox = page.locator(`input#archive_tableNumber2[value="${incId}"]`);
    await archiveCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    await archiveCheckbox.check();

    // Click the Mass Archive button
    const massArchiveBtn = page.locator('button[name="MassArchiveIncident"][table-id="tableNumber2"]');
    await massArchiveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await massArchiveBtn.click();

    // Confirm archive modal
    const confirmArchiveBtn = page.locator('#confirmActionMassArchiveBtn');
    await confirmArchiveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmArchiveBtn.click();

    // Wait for archive action to complete
    await page.waitForTimeout(2000);

    console.log('Incident archived successfully.');
await page.pause();
    // Go back to incidents and navigate to Archived tab
    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.locator('#archived-tab').click();

    // Search for the incident in Archived tab
    const archivedFilter = page.locator('.tab-pane.active input[type="search"]');
    await archivedFilter.waitFor({ state: 'visible' });
    await archivedFilter.fill(String(incId));

    // Click on the incident link
    const archivedIncidentLink = page.locator('table.dataTable').getByRole('link', { name: String(incId) });
    await archivedIncidentLink.waitFor({ state: 'visible' });
    await archivedIncidentLink.click();

    // Click Incident Actions dropdown
    const incidentActionsBtn = page.locator('.dropdown .btn.btn-danger.dropdown-toggle').first();
    await incidentActionsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await incidentActionsBtn.click();

    // Select Un-Archive option
    const unArchiveBtn = page.locator('button.dropdown-item').filter({ hasText: 'Un-Archive' }).first();
    await unArchiveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await unArchiveBtn.click();

    // Confirm un-archive modal
    const confirmUnArchiveBtn = page.locator('#confirmArchiveActionBtn');
    await confirmUnArchiveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmUnArchiveBtn.click();

    // Wait for un-archive action to complete
    await page.waitForTimeout(2000);

    console.log('Incident un-archived successfully.');

    // Cleanup
    await logout(page);
    await context.close();
  });
});