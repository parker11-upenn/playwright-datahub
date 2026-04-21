import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  handleForcedLogoutIfPresent,
  setIncidentDateWithinLast30Days,
  logout,
  navigateToIncident,
  loadIncidentId,
  saveLinkedIncidentId
} from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Linking Setup', () => {
  let secondIncId = null;

  test('create simplified incident as RASHID, then confirm as MCDONALD', async ({ browser }) => {
    // PART 1: Create simplified incident as RASHID
    {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      // LOGIN AS RASHID
      await loginAndOnBehalf(page1, 'RASHID');

      await page1.getByRole('link', { name: 'Incidents' }).click();
      await page1.getByRole('link', { name: ' Create Incident Report' }).click();

      // Location Date & Time Tab
      await page1.getByRole('tab', { name: ' Location Date & Time' }).click();
      await setIncidentDateWithinLast30Days(page1);
      await page1.locator('#location1').check();
      await page1.waitForTimeout(500);
      await page1.locator('#LocID').selectOption('67');
      await page1.locator('#LocID').dispatchEvent('change');
      await page1.locator('#save_dateTime').click();

      // People Tab - Only add student
      await page1.getByRole('tab', { name: ' People' }).click();
      await page1.getByRole('button', { name: 'Search Student' }).click();
      await page1.getByRole('button', { name: /Search By Room/i }).click();
      await page1.locator('#buildingName').selectOption('67');
      await page1.getByLabel('Room #').selectOption('GUTM 0202');
      await page1.getByRole('button', { name: 'Search', exact: true }).click();

      const firstStudentCard = page1.locator('#searchRoomResults .card').first();
      await firstStudentCard.waitFor({ state: 'visible' });
      await firstStudentCard.getByRole('button', { name: 'ADD' }).click();
      await page1.getByRole('button', { name: 'Close' }).first().click();

      // Summary Tab
      await page1.getByRole('tab', { name: 'Summary' }).click();
      await page1.getByRole('textbox', { name: 'Describe the incident here' }).fill('Second incident for linking test...');

      // Handling P-Numbers - only for students
      await page1.getByRole('button', { name: 'Involved Student(s) P-Number' }).click();
      const studentContainer = page1.locator('#collapseStudents');
      await studentContainer.waitFor({ state: 'visible' });
      await studentContainer.locator('button.person-id').click();
      await page1.getByRole('textbox', { name: 'Describe the incident here' }).pressSequentially(', ');

      await page1.locator('#save_description').click();

      // Submit Incident
      await page1.locator('#submit_unsubmitted_incd').click();
      await page1.locator('#confirmActionBtn').click();

      await expect(page1).toHaveURL(/dsp_add_incident\.cfm/i);
      secondIncId = new URL(page1.url()).searchParams.get('incID');
      saveLinkedIncidentId(secondIncId);

      console.log(`Created second incident with ID: ${secondIncId}`);

      // Cleanup first part
      await logout(page1);
      await context1.close();
    }

    // PART 2: Confirm incident as MCDONALD
    {
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // LOGIN AS MCDONALD
      await loginAndOnBehalf(page2, 'MCDONALD');

      // Navigate to Unsubmitted tab and find the new incident
      await navigateToIncident(page2, secondIncId, 'Queued');

      // Go to Review & Confirm tab
      await page2.getByRole('tab', { name: 'Review & Confirm' }).click();

      // Select Hazing category toggle (AlliedCatID value 12)
      const hazingRow = page2.locator('div.row.mb-3:has-text("Hazing")');
      await hazingRow.waitFor({ state: 'visible', timeout: 10000 });

      const hazingToggle = hazingRow.locator('input.form-check-input[type="checkbox"][name="AlliedCatID"][value="12"]');
      await hazingToggle.scrollIntoViewIfNeeded();
      await expect(hazingToggle).toBeVisible();

      if (!(await hazingToggle.isChecked())) {
        try {
          await hazingToggle.click({ force: true });
        } catch (e) {
          const handle = await hazingToggle.elementHandle();
          if (handle) await page2.evaluate((el) => el.click(), handle);
        }
      }

      await expect(hazingToggle).toBeChecked();

      // Confirm incident
      const confirmButton = page2.locator('#submit_queued_incd');
      await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
      await confirmButton.click();

      // Confirm modal
      const confirmModalBtn = page2.locator('#confirmActionBtn');
      await confirmModalBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmModalBtn.click();

      // Wait for confirmation to complete
      await page2.waitForTimeout(10000);

      console.log(`Confirmed second incident with ID: ${secondIncId}`);

      // Use header search to find the confirmed incident
      const headerSearchForm = page2.locator('#headerSearchForm');
      const headerSearchInput = headerSearchForm.locator('input[type="text"], input[type="search"]');
      await headerSearchInput.waitFor({ state: 'visible', timeout: 20000 });
      await headerSearchInput.fill(String(secondIncId));

      const searchIrBtn = headerSearchForm.locator('button').filter({ hasText: 'Search IR' });
      await searchIrBtn.waitFor({ state: 'visible', timeout: 10000 });
      await searchIrBtn.click();

      // Wait for search results and click the incident link
      const searchResultLink = page2.locator('table.dataTable').getByRole('link', { name: String(secondIncId) });
      await searchResultLink.waitFor({ state: 'visible', timeout: 30000 });
      await searchResultLink.click();

      // Open Incident Actions dropdown and select Link Details
      const incidentActionsBtn = page2.locator('.dropdown .btn.dropdown-toggle').first();
      await incidentActionsBtn.waitFor({ state: 'visible', timeout: 10000 });
      await incidentActionsBtn.click();

      const linkDetailsOption = page2.locator('button.dropdown-item').filter({ hasText: 'Link Details' });
      await linkDetailsOption.waitFor({ state: 'visible', timeout: 10000 });
      await linkDetailsOption.click();

      // Wait for Link Another Incident modal
      const linkModalTitle = page2.locator('#linkIncidentDetailsLabel');
      await linkModalTitle.waitFor({ state: 'visible', timeout: 10000 });

      // Use the first incident ID (if available) to link
      const firstIncId = loadIncidentId();
      expect(firstIncId).toBeTruthy();

      const linkInput = page2.locator('#linkIncID');
      await linkInput.waitFor({ state: 'visible', timeout: 10000 });
      await linkInput.fill(String(firstIncId));

      const linkSaveBtn = page2.locator('#LinkSaveButton');
      await linkSaveBtn.waitFor({ state: 'visible', timeout: 10000 });
      await linkSaveBtn.click();

      // Wait for save response message (success or error) and then close
      const linkSuccess = page2.locator('#successLinkMessage');
      const linkError = page2.locator('#errorLinkMessage');
      await Promise.race([
        linkSuccess.waitFor({ state: 'visible', timeout: 10000 }),
        linkError.waitFor({ state: 'visible', timeout: 10000 })
      ]);

      // Close the Link Details modal specifically
      const closeModalBtn = page2.locator('.modal.show .modal-footer button').filter({ hasText: 'Close' });
      await closeModalBtn.waitFor({ state: 'visible', timeout: 10000 });
      await closeModalBtn.click();

      // Wait for modal to actually close
      await page2.locator('.modal.show').waitFor({ state: 'hidden', timeout: 10000 });

      // Re-open Link Details to inspect linked IR entries and delete one
      await incidentActionsBtn.click();
      const linkDetailsOptionReopen = page2.locator('.dropdown-menu.show button.dropdown-item').filter({ hasText: 'Link Details' });
      await linkDetailsOptionReopen.waitFor({ state: 'visible', timeout: 10000 });
      await linkDetailsOptionReopen.click();

      const linkModalReopen = page2.locator('#linkIncidentDetailsLabel');
      await linkModalReopen.waitFor({ state: 'visible', timeout: 10000 });

      const linkedIRTrailButton = page2.locator('button.accordion-button', { hasText: 'Linked IR Trail' });
      await linkedIRTrailButton.waitFor({ state: 'visible', timeout: 10000 });
      await linkedIRTrailButton.click();

      const collapseLinkedIRs = page2.locator('#collapseLinkedIRs.show');
      await collapseLinkedIRs.waitFor({ state: 'visible', timeout: 10000 });

      const deleteButton = collapseLinkedIRs.locator(`button.link-delete-button[data-incid="${secondIncId}"]`);
      await deleteButton.scrollIntoViewIfNeeded();
      await deleteButton.waitFor({ state: 'visible', timeout: 10000 });

      page2.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      try {
        await deleteButton.click({ force: true });
      } catch (e) {
        const handle = await deleteButton.elementHandle();
        if (handle) await page2.evaluate((el) => el.click(), handle);
      }

      await page2.pause();

      // Close the Link Details modal after deletion
      const closeModalBtnReopen = page2.locator('.modal.show .modal-footer button').filter({ hasText: 'Close' });
      await closeModalBtnReopen.waitFor({ state: 'visible', timeout: 10000 });
      await closeModalBtnReopen.click();
      await page2.locator('.modal.show').waitFor({ state: 'hidden', timeout: 10000 });
      // Cleanup
      await logout(page2);
      await context2.close();
    }

    expect(secondIncId).toBeTruthy();
  });
});