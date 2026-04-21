import { test, expect } from '@playwright/test';
import { loginAndOnBehalf, logout, loadSecondIncidentId, navigateToIncident } from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Settings Automation Test', () => {
  test('Grant/Revoke Access and Verify as Killilee', async ({ browser }) => {
    const secondIncId = loadSecondIncidentId();
    expect(secondIncId).toBeTruthy();

    // PART 1: Login as MCDONALD to modify permissions
    {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      await loginAndOnBehalf(page1, 'MCDONALD');

      // Navigate to the incident
      await navigateToIncident(page1, secondIncId, 'Open');

      // Open Incident Settings Modal
      const incidentActionsBtn = page1.locator('.dropdown .btn.dropdown-toggle').first();
      await incidentActionsBtn.click();
      await page1.locator('button#btn_systemSettings').click();

      // Search for Alize Roberson
      await page1.locator('#SystemSettingsfirstnameInput').fill('alize');
      await page1.locator('#SystemSettingslastnameInput').fill('roberson');
      await page1.locator('#SystemSettingsSearchCHASButton').click();

      // Add user and expand accordion
      await page1.locator('#addSystemUserButton0').click();
      await page1.locator('button[data-bs-target="#collapseTwo"]').click();

      // --- TOGGLE VIEW NAMES ---
      page1.once('dialog', async dialog => {
        await dialog.accept(); 
      });
      const alizeRow = page1.locator('tr', { hasText: 'ALIZE ROBERSON' });
      await alizeRow.locator('input.toggleViewNames').click();
      await expect(alizeRow.locator('input.toggleViewNames')).toBeChecked();

      // --- REVOKE ACCESS FOR KILLILEE ---
      // Note: Ensure the data-staffid matches the specific row for Killilee
      const revokeIcon = page1.locator('i.fa-trash[data-staffid="2593"]');
      page1.once('dialog', async dialog => {
        await dialog.accept();
      });
      await revokeIcon.click();

      // Close modal and logout
      await page1.locator('#systemSettingsDetails .btn-close').click();
      await logout(page1);
      await context1.close();
    }

// PART 2: Login as KILLILEE
    {
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // LOGIN AS KILLILEE
      await loginAndOnBehalf(page2, 'KILLILEE');

      // 1. Click the 'Incidents' menu item first to reveal the search bar
      // We use getByRole with a regex to handle potential extra whitespace in the HTML
      await page2.getByRole('link', { name: /Incidents/i }).click();

      console.log(`Searching for incident ID: ${secondIncId} as KILLILEE`);

      // 2. Now the header search input should be available
      const headerSearchInput = page2.locator('#navHeaderincID');
      await headerSearchInput.waitFor({ state: 'visible', timeout: 15000 });
      await headerSearchInput.fill(String(secondIncId));

      // 3. Click the 'Search IR' button
      await page2.locator('#searchHeaderIncident').click();

      // 4. Wait for results and click the incident link
      const searchResultLink = page2.locator('table.dataTable').getByRole('link', { name: String(secondIncId) });
      await searchResultLink.waitFor({ state: 'visible', timeout: 30000 });
      await searchResultLink.click();

      // 5. Fill the reason for request in the textarea
      const noteTextArea = page2.locator('#newNoteText');
      await noteTextArea.waitFor({ state: 'visible', timeout: 10000 });
      await noteTextArea.fill('please give me access');

      // 6. Select "Request Access" from the Message Type dropdown
      // Using the value 'MessageStaff' from your HTML snippet
      await page2.locator('#noteType').selectOption('MessageStaff');

      // 7. Select "Kathryn McDonald" from the Recipient dropdown
      // Using the value '2088' as seen in your HTML for Kathryn McDonald (Owner)
      await page2.locator('#recipientStaffID').selectOption('2088');

      // 8. Click the Submit button
      await page2.locator('#submitNewNote').click();

      // 9. Pause for manual inspection
   
  // 10. Click the 'X' button in the specific 'Add Note' modal
// We use :visible to ensure we only target the one currently on screen
const modalXButton = page2.locator('#addNoteModalLabel').locator('..').locator('.btn-close');

// OR even cleaner using Playwright's "filter" or "has" logic:
const activeModalClose = page2.locator('.modal.show .btn-close'); 

await activeModalClose.click();

      // 11. Wait for the modal to be fully hidden before logging out
      await page2.locator('#addNoteModalLabel').waitFor({ state: 'hidden', timeout: 5000 });


      // 12. Log out and close context
      await logout(page2);
      await context2.close();

    }
// PART 3: Login as MCDONALD to grant Patrick access
    {
      const context3 = await browser.newContext();
      const page3 = await context3.newPage();

      // 1. LOGIN AS MCDONALD
      await loginAndOnBehalf(page3, 'MCDONALD');

      // 2. Handle notification bell
      const bellBtn = page3.locator('#notificationButton');
      await expect(bellBtn).toBeVisible({ timeout: 15000 });
      
      console.log(`Checking notifications for Incident #${secondIncId}...`);
      await bellBtn.click({ force: true });

      // 3. Wait for the list and select the most recent notification for this incident
      const list = page3.locator('#notificationList');
      await list.waitFor({ state: 'visible' });

      const notificationLink = list.locator(`a:has-text("${secondIncId}")`).first();

      if (await notificationLink.count() > 0) {
        await notificationLink.waitFor({ state: 'visible', timeout: 10000 });
        await notificationLink.click({ force: true });
        console.log(`Clicked notification link for Incident #${secondIncId}`);
      } else {
        // Fallback: Manual header search
        console.warn(`Notification for #${secondIncId} not found. Falling back to search.`);
        await page3.getByRole('link', { name: /Incidents/i }).click();
        const headerSearchInput = page3.locator('#navHeaderincID');
        await headerSearchInput.fill(String(secondIncId));
        await page3.locator('#searchHeaderIncident').click();
      }

      // --- NEW STEP: Click the incident link in the search results table ---
      // This handles the transition from the results page to the actual report
      const tableResultLink = page3.locator('table.dataTable').getByRole('link', { name: String(secondIncId), exact: true });
      await tableResultLink.waitFor({ state: 'visible', timeout: 15000 });
      await tableResultLink.click();

      // 4. Now on the Incident page, open Incident Actions
      const incidentActionsBtn = page3.locator('.dropdown .btn.dropdown-toggle').first();
      await incidentActionsBtn.waitFor({ state: 'visible', timeout: 10000 });
      await incidentActionsBtn.click();

      const incidentSettingsBtn = page3.locator('button#btn_systemSettings');
      await incidentSettingsBtn.waitFor({ state: 'visible' });
      await incidentSettingsBtn.click();

      // 5. Search for Patrick Killilee in the modal
      await page3.locator('#SystemSettingsfirstnameInput').fill('patrick');
      await page3.locator('#SystemSettingslastnameInput').fill('killilee');
      await page3.locator('#SystemSettingsSearchCHASButton').click();

      // 6. Add Patrick from search results
      const addButton = page3.locator('#addSystemUserButton0');
      await addButton.waitFor({ state: 'visible', timeout: 10000 });
      await addButton.click();

      console.log('Access granted to Patrick. Pausing for manual check.');

      // 7. FINAL PAUSE
      // await page3.pause();

// 8. Click the 'Close' button in the modal footer
      // Using .modal.show ensures we target the active Incident Settings modal
      const footerCloseBtn = page3.locator('.modal.show .modal-footer button', { hasText: 'Close' });
      await footerCloseBtn.waitFor({ state: 'visible', timeout: 5000 });
      await footerCloseBtn.click();

      // 9. Wait for the modal to be fully hidden
      await footerCloseBtn.waitFor({ state: 'hidden', timeout: 5000 });

      // 10. Final Logout
      console.log('Test complete. Logging out MCDONALD.');
      await logout(page3);
      await context3.close();
    }
  });
});