import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  handleForcedLogoutIfPresent,
  logout,
  loadIncidentId
} from './fixtures/incident-helpers';

test.setTimeout(15 * 60 * 1000);

test.describe('Incident Actions & Violations', () => {
  let incId;

  test.beforeAll(() => {
    // Load the incident ID created by the creation test
    incId = loadIncidentId();
  });

  test('reviewer applies actions and violations, then confirms incident', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // LOGIN AS MCDONALD (Reviewer)
    await loginAndOnBehalf(page, 'MCDONALD');

    // Handle notification and navigate to incident
    const bellBtn = page.locator('#notificationButton');
    await expect(bellBtn).toBeVisible({ timeout: 15000 });
    
    console.log(`Attempting to click notification bell for Incident #${incId}...`);
    await bellBtn.click({ force: true });

    const list = page.locator('#notificationList');
    await list.waitFor({ state: 'visible' });

    const notificationLink = list.locator(`a:has-text("${incId}")`);

    if (await notificationLink.count() > 0) {
      await notificationLink.waitFor({ state: 'visible', timeout: 10000 });
      await notificationLink.click({ force: true });
      console.log(`Clicked notification link for Incident #${incId}`);
    } else {
      console.error(`Link for Incident #${incId} not found in toast. Falling back to manual search.`);
      await page.getByRole('link', { name: 'Incidents' }).click();
      await page.locator('#Queued-tab').click();
      await page.locator('#dataTable4_filter input[type="search"]').fill(String(incId));
      const manualLink = page.locator('#dataTable4').getByRole('link', { name: String(incId) });
      await manualLink.waitFor({ state: 'visible' });
      await manualLink.click();
    }

    // REPLY TO NOTES
    await page.getByRole('tab', { name: 'Notes' }).click();
    const finalReplyBtn = page.locator('button.reply-button[data-notetype="MessageReportWriter"]').first();
    await finalReplyBtn.waitFor({ state: 'visible' });
    await finalReplyBtn.click();

    const finalTextArea = page.locator('#replyText');
    await finalTextArea.waitFor({ state: 'visible' });
    await finalTextArea.fill('Thank you!');
    await page.locator('#submitNotesReply').click();
    await expect(page.locator('#successNoteReplyMessage')).toBeVisible();

    // REVIEW & CONFIRM
    await page.getByRole('tab', { name: 'Review & Confirm' }).click();
    await page.locator('input[name="AlliedCatID"][value="6"]').check({ force: true });

    // FINAL SUBMISSION
    await page.locator('#submit_queued_incd').click();
    await page.locator('#confirmActionBtn').click();

    await expect(page).toHaveURL(/dsp_add_incident\.cfm/i);
    console.log(`Incident #${incId} successfully confirmed.`);

    // Navigate to New tab to access the confirmed incident
    await page.getByRole('link', { name: 'Incidents' }).click();
    const newTab = page.getByRole('tab', { name: /New/i });
    await newTab.waitFor({ state: 'visible' });
    await newTab.click();

    // Search for the incident
    const activePanel = page.locator('.tab-pane.active');
    const searchFilter = activePanel.locator('input[type="search"]');
    await searchFilter.waitFor({ state: 'visible', timeout: 15000 });
    await searchFilter.fill(String(incId));

    const confirmedLink = activePanel.locator('table.dataTable').getByRole('link', { name: String(incId) });
    await confirmedLink.waitFor({ state: 'visible' });
    await confirmedLink.click();

    // APPLY ACTIONS & VIOLATIONS
    const actionTab = page.locator('#incident-action-tab');
    await actionTab.waitFor({ state: 'visible' });
    await actionTab.click();

    const applyActionIcon = page.locator('i.fa-paper-plane[data-bs-target="#selectPeopleModal"]');
    await applyActionIcon.waitFor({ state: 'visible' });
    await applyActionIcon.click();

    const actionModal = page.locator('#selectPeopleModal');
    await expect(actionModal).toBeVisible({ timeout: 5000 });

    // Select people
    console.log("Selecting individual person checkboxes...");
    const personCheckboxes = actionModal.locator('input[type="checkbox"]').filter({
      hasNot: page.locator('#selectAllPeople, .violation-checkbox, .action-checkbox, .action2-checkbox')
    });
    
    const pCount = await personCheckboxes.count();
    for (let i = 0; i < pCount; i++) {
      await personCheckboxes.nth(i).click({ force: true });
    }

    // Handle Health & Safety violations
    const healthSafetyBox = page.getByLabel(/Health & Safety/i);
    
    if (await healthSafetyBox.isVisible()) {
      console.log("Health & Safety checkbox found. Activating...");
      await healthSafetyBox.click({ force: true });
      
      const firstViolation = page.locator('input.violation-checkbox').first();
      try {
        await firstViolation.waitFor({ state: 'visible', timeout: 3000 });
      } catch (e) {
        console.warn("Violations didn't appear. Retrying...");
        await healthSafetyBox.click({ force: true });
        await firstViolation.waitFor({ state: 'visible', timeout: 5000 });
      }

      await page.waitForTimeout(1000);

      const violationCheckboxes = page.locator('input.violation-checkbox');
      const vCount = await violationCheckboxes.count();
      
      for (let i = 0; i < vCount; i++) {
        const vBox = violationCheckboxes.nth(i);
        if (!(await vBox.isChecked())) {
          await vBox.click({ force: true });
          await page.waitForTimeout(150);
        }
      }

      // Specify "OTHER" violation
      const otherCheckbox = page.locator('input.violation-checkbox[data-isother="true"], input.violation-checkbox[value="19"]').first();
      if (await otherCheckbox.isVisible() && !(await otherCheckbox.isChecked())) {
        await otherCheckbox.click({ force: true });
        await page.waitForTimeout(300);
      }

      const otherInput = page.locator('#violationOtherInput');
      await otherInput.waitFor({ state: 'visible' });
      await otherInput.fill('random violation');
      await otherInput.press('Tab');
    }

    // Select remaining actions
    const actionCheckboxes = page.locator('input.action-checkbox, input.action2-checkbox');
    const actionCount = await actionCheckboxes.count();
    
    for (let i = 0; i < actionCount; i++) {
      const box = actionCheckboxes.nth(i);
      if (!(await box.isChecked())) {
        await box.click({ force: true });
        await page.waitForTimeout(100);
      }
    }

    // SUBMIT ACTIONS FORM
    const submitBtn = page.locator('#confirmSubmit');
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    console.log("Attempting final Submit click...");

    // Double-click for reliability
    await submitBtn.click({ clickCount: 2, delay: 100 });

    // JavaScript click as fallback
    await page.evaluate(() => {
      const btn = document.querySelector('#confirmSubmit');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        btn.click();
      }
    });

    // Wait for modal to close
    try {
      await expect(actionModal).toBeHidden({ timeout: 10000 });
      console.log("Success: Modal closed and form submitted.");
    } catch (error) {
      console.error("Modal is still visible after multiple click attempts.");
      await page.screenshot({ path: 'actions-submit-stuck.png' });
      throw error;
    }

    // DELETE SOME ACTIONS
    await page.locator('#incident-action-tab').click();
    
    const firstTrash = page.locator('i.delete-icon[data-page="ActionTab"]').first();
    await firstTrash.waitFor({ state: 'visible', timeout: 10000 });

    let actionsToDelete = 3;
    
    for (let i = 0; i < actionsToDelete; i++) {
      const trashBtn = page.locator('i.delete-icon[data-page="ActionTab"]').first();
      
      if (await trashBtn.count() === 0) {
        console.log("No more actions found to delete.");
        break;
      }

      const actionId = await trashBtn.getAttribute('data-actionid');
      console.log(`Deleting Action ID: ${actionId}...`);

      await trashBtn.click({ force: true });

      const confirmDeleteModalBtn = page.locator('#confirmDeleteButton');
      await confirmDeleteModalBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmDeleteModalBtn.click();

      await expect(trashBtn).not.toHaveAttribute('data-actionid', actionId, { timeout: 8000 });
      
      console.log(`Action ID ${actionId} successfully removed.`);
      await page.waitForTimeout(1000);
    }

    console.log("Actions deletion complete.");

    // Cleanup
    await logout(page);
    await context.close();
  });
});
