import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  handleForcedLogoutIfPresent,
  logout,
  loadIncidentId
} from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Asset Deletion & Reply', () => {
  let incId;

  test.beforeAll(() => {
    // Load the incident ID created by the creation test
    incId = loadIncidentId();
  });

  test('report writer deletes asset and replies to reviewer feedback', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // LOGIN AS RASHID (Report Writer)
    await loginAndOnBehalf(page, 'RASHID');

    // Navigate to Unsubmitted incidents
    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.locator('#Unsubmitted-tab').click();

    // Search for the incident
    const filter = page.locator('#dataTable1_filter input[type="search"]');
    await filter.waitFor({ state: 'visible' });
    await filter.fill(String(incId));

    const incidentLink = page.locator('#dataTable1').getByRole('link', { name: String(incId) });
    await incidentLink.waitFor({ state: 'visible' });
    await incidentLink.click();

    // DELETE THE ASSET
    await page.locator('#incident-attachment-tab').click();

    const trashIcon = page.locator('i.delete-icon[data-page="AttachmentTab"]').first();
    await trashIcon.waitFor({ state: 'visible' });
    await trashIcon.click();

    const confirmDeleteBtn = page.locator('#confirmDeleteAttachmentBtn');
    await confirmDeleteBtn.waitFor({ state: 'visible' });
    await confirmDeleteBtn.click();

    // Wait for deletion to process
    await page.waitForTimeout(2000);

    // GO TO NOTES & REPLY
    await page.getByRole('tab', { name: 'Notes' }).click();
    const replyBtn = page.locator('button.reply-button[data-notetype="MessageReportWriter"]').first();
    await replyBtn.waitFor({ state: 'visible' });
    await replyBtn.click();

    const replyTextArea = page.locator('#replyText');
    await replyTextArea.waitFor({ state: 'visible' });
    await replyTextArea.fill('I deleted the asset.');
    await page.locator('#submitNotesReply').click();
    await expect(page.locator('#successNoteReplyMessage')).toBeVisible();

    // SUBMIT THE REPORT (to send it back to Queued)
    await page.locator('#submit_unsubmitted_incd').click();
    await page.locator('#confirmActionBtn').click();

    // Verify submission
    await expect(page).toHaveURL(/dsp_add_incident\.cfm/i);

    // Cleanup
    await logout(page);
    await context.close();
  });
});
