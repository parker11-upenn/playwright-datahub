import 'dotenv/config';
import { test, expect } from '@playwright/test';

test.setTimeout(10 * 60 * 1000);
let incId;

test('create incident, submit, then fresh login delete asset and confirm', async ({ browser }) => {
  const baseUrl = 'https://chas-stage.collegehouses.upenn.edu/chasdatahub/home.cfm';

const username = process.env.CHAS_USERNAME;
const password = process.env.CHAS_PASSWORD;

if (!username || !password) {
  throw new Error('Missing CHAS_USERNAME or CHAS_PASSWORD environment variables');
}

  // --- UPDATED FUNCTION TO ACCEPT A SPECIFIC USER ---
  const loginAndOnBehalf = async (page, targetUser) => {
    await page.goto(baseUrl);
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL('**/chasdatahub/**', { timeout: 3 * 60 * 1000 });

    await page.getByRole('link', { name: 'Administration' }).click();
    await page.getByRole('searchbox', { name: 'Search:' }).fill(targetUser);
    await page.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Log in OnBehalf' }).click();

    await page.waitForTimeout(3000);
  };

  const handleForcedLogoutIfPresent = async (page) => {
    if (await page.locator('#propagate_no').isVisible().catch(() => false)) {
      await page.locator('#propagate_no').click();
    }
  };

  const setIncidentDateWithinLast30Days = async (page) => {
    const daysBack = Math.floor(Math.random() * 29) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const formattedDate = date.toISOString().slice(0, 16);
    const incidentDate = page.locator('#incidentDate');
    await incidentDate.waitFor({ state: 'visible' });
    await incidentDate.fill(formattedDate);
    await incidentDate.dispatchEvent('change');
    await incidentDate.dispatchEvent('blur');
  };

  // Round 1: create + submit (unsubmitted -> queued)
  let createdDocId = null;

  {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // LOGIN AS RASHID
    await loginAndOnBehalf(page1, 'RASHID');

    await page1.getByRole('link', { name: 'Incidents' }).click();
    await page1.getByRole('link', { name: ' Create Incident Report' }).click();

    await page1.getByRole('tab', { name: ' Location Date & Time' }).click();
    await setIncidentDateWithinLast30Days(page1);
    await page1.locator('#location1').check();
    await page1.waitForTimeout(500);
    await page1.locator('#LocID').selectOption('67');
    await page1.locator('#LocID').dispatchEvent('change');
    await page1.locator('#save_dateTime').click();

    await page1.getByRole('tab', { name: ' People' }).click();
    await page1.getByRole('button', { name: 'Search Student' }).click();
    await page1.getByRole('button', { name: /Search By Room/i }).click();
    await page1.locator('#buildingName').selectOption('67');
    await page1.getByLabel('Room #').selectOption('GUTM 0202');
    await page1.getByRole('button', { name: 'Search', exact: true }).click();

    const firstStudentCard = page1.locator('#searchRoomResults .card').first();
    await firstStudentCard.waitFor({ state: 'visible' });
    await firstStudentCard.getByRole('button', { name: 'ADD' }).click();
    await page1.getByRole('button', { name: 'Close' }).first().click();

    // University Personnel
    await page1.getByRole('button', { name: 'University Personnel' }).click();
    await page1.getByRole('textbox', { name: 'First Name' }).fill('Debbie');
    await page1.getByRole('textbox', { name: 'Last Name' }).fill('Harry');
    await page1.getByRole('radio', { name: 'Allied Guard' }).check();
    await page1.getByRole('button', { name: 'Add Person' }).click();
    await page1.getByLabel('Add University Personnel: Add').getByText('Close').click();

    // CHAS/RHS Team Member
    await page1.getByRole('button', { name: 'CHAS/RHS Team Member' }).click();
    await page1.getByRole('textbox', { name: 'First Name' }).fill('Ryan');
    await page1.getByRole('textbox', { name: 'Last Name' }).fill('Parker');
    await page1.locator('#ChasdeptID').selectOption('90');
    await page1.getByRole('button', { name: 'Search', exact: true }).click();
    await page1.locator('#addUserButton0').click();
    await page1.getByRole('button', { name: 'Close' }).nth(1).click();

    // Non-Penncard Persons
    await page1.getByRole('button', { name: 'Non-Penncard Persons' }).click();
    await page1.locator('#npfirstnameInput').fill('Jane');
    await page1.locator('#nplastnameInput').fill('Jones');
    await page1.locator('#npemailInput').fill('jjones@gmail.com');
    await page1.locator('#npphoneInput').fill('2672672678');
    await page1.locator('#npcellphoneInput').fill('5551234567');
    await page1.locator('#npaddressInput').fill('123 Washington Avenue, Philadelphia, PA 19104');
    await page1.getByRole('radio', { name: 'Parent/Family' }).check();
    await page1.locator('#npotherinfo').fill('This is a test note for Jane.');
    await page1.locator('#addnpButton1').click();
    await page1.getByRole('button', { name: 'Close' }).nth(1).click();

    // None/Unknown
    await page1.getByRole('button', { name: 'None/Unknown' }).click();
    await page1.locator('#unotherinfo').fill('This is a test description of an unknown person.');
    await page1.locator('#addunButton1').click();
    await page1.locator('.modal.show .btn-close').click();

    await page1.getByRole('tab', { name: 'Summary' }).click();
    await page1.getByRole('textbox', { name: 'Describe the incident here' }).fill('Summary text...');

    // Handling P-Numbers for various accordions (simplified for space)
    const accordions = [
      { btn: 'Involved Student(s) P-Number', target: '#collapseStudents' },
      { btn: 'Involved Team Member', target: '#collapseStaff' },
      { btn: 'Emergency Personnel', target: '#collapseEmergency' },
      { btn: 'None / Unknown Person(s) P-Number', target: '#collapseUnknown' },
      { btn: 'Non-Penncard Person(s) P-Number', target: '#collapseOther' }
    ];

    for (const item of accordions) {
      await page1.getByRole('button', { name: item.btn }).click();
      const container = page1.locator(item.target);
      await container.waitFor({ state: 'visible' });
      await container.locator('button.person-id').click();
      await page1.getByRole('textbox', { name: 'Describe the incident here' }).pressSequentially(', ');
    }

    await page1.locator('#save_description').click();

    // Assets
    await page1.getByRole('tab', { name: 'Assets' }).click();
    await page1.setInputFiles('#fileInput', '/Users/parker11/Desktop/incident.png');
    await page1.locator('#fileName').fill('Incident Upload Test');
    await page1.getByRole('button', { name: 'Upload' }).click();
    await page1.waitForTimeout(5000);

    const firstTrash = page1.locator('i.delete-icon[data-page="AttachmentTab"]').first();
    createdDocId = await firstTrash.getAttribute('data-docid');

    await page1.locator('#submit_unsubmitted_incd').click();
    await page1.locator('#confirmActionBtn').click();

    await expect(page1).toHaveURL(/dsp_add_incident\.cfm/i);
    incId = new URL(page1.url()).searchParams.get('incID');
    
    await page1.getByRole('link', { name: 'Logout' }).click();
    await handleForcedLogoutIfPresent(page1);
    await context1.close();
  }

  // Round 2: fresh login, delete asset, confirm
  {
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // --- LOGIN AS MCDONALD ---
    await loginAndOnBehalf(page2, 'MCDONALD');

    await page2.getByRole('link', { name: 'Incidents' }).click();
    await page2.locator('#Queued-tab').click();
    
    const filter = page2.locator('#dataTable4_filter input[type="search"]');
    await filter.waitFor({ state: 'visible' });
    await filter.fill(String(incId));

    const incidentLink = page2.locator('#dataTable4').getByRole('link', { name: String(incId) });
    await incidentLink.waitFor({ state: 'visible' });
    await incidentLink.click();

    await page2.locator('#incident-attachment-tab').click();

    const trashSelector = createdDocId
      ? `i.delete-icon[data-page="AttachmentTab"][data-docid="${createdDocId}"]`
      : 'i.delete-icon[data-page="AttachmentTab"]';

   // 1. Click the initial "Send Back" button on the main page
    await page2.locator('#sendback_queued_incd').click();

    // 2. Wait for the modal to appear (using the textarea as a reliable anchor)
    const reasonTextArea = page2.locator('#send_back_to_rw_reason');
    await reasonTextArea.waitFor({ state: 'visible' });

    // 3. Fill in the reason
    await reasonTextArea.fill('Please revise and send back.');

    // 4. Click the final confirmation button in the modal footer
    await page2.locator('#btnsendbackToRWIncident').click();

    // OPTIONAL: Wait for the modal to disappear or a success message to show
    // await expect(page2.locator('#sendBackToReportWriterResults')).toBeVisible();

    // await page2.getByRole('tab', { name: 'Review & Confirm' }).click();
    // await page2.locator('input[name="AlliedCatID"][value="6"]').check({ force: true });
    
    // await page2.locator('#submit_queued_incd').click();
    // await page2.locator('#confirmActionBtn').click();

    await page2.getByRole('link', { name: 'Logout' }).click();
    await handleForcedLogoutIfPresent(page2);
    await context2.close();
  }
////////////////////////
  // Round 3: RASHID logs in, deletes asset, replies, and re-submits
  ////////////////////////
  {
    const context3 = await browser.newContext();
    const page3 = await context3.newPage();

    await loginAndOnBehalf(page3, 'RASHID');

    await page3.getByRole('link', { name: 'Incidents' }).click();

    // 1. Find the incident in Unsubmitted Tab
    await page3.locator('#Unsubmitted-tab').click();
    const filter = page3.locator('#dataTable1_filter input[type="search"]');
    await filter.waitFor({ state: 'visible' });
    await filter.fill(String(incId));

    const incidentLink = page3.locator('#dataTable1').getByRole('link', { name: String(incId) });
    await incidentLink.waitFor({ state: 'visible' });
    await incidentLink.click();

    // 2. DELETE THE ASSET (as requested)
    await page3.locator('#incident-attachment-tab').click();
    
    // We use the same docId captured in Round 1 for precision
    const trashSelector = createdDocId
      ? `i.delete-icon[data-page="AttachmentTab"][data-docid="${createdDocId}"]`
      : 'i.delete-icon[data-page="AttachmentTab"]';

    const trashIcon3 = page3.locator(trashSelector).first();
    await trashIcon3.waitFor({ state: 'visible' });
    await trashIcon3.click();

    await page3.locator('#confirmDeleteAttachmentBtn').waitFor({ state: 'visible' });
    await page3.locator('#confirmDeleteAttachmentBtn').click();
    
    // Wait for deletion to process
    await page3.waitForTimeout(2000);

    // 3. GO TO NOTES & REPLY
    await page3.getByRole('tab', { name: 'Notes' }).click();
    const replyBtn = page3.locator('button.reply-button[data-notetype="MessageReportWriter"]').first();
    await replyBtn.waitFor({ state: 'visible' });
    await replyBtn.click();

    const replyTextArea = page3.locator('#replyText');
    await replyTextArea.waitFor({ state: 'visible' });
    await replyTextArea.fill('I deleted the asset.');
    await page3.locator('#submitNotesReply').click();
    await expect(page3.locator('#successNoteReplyMessage')).toBeVisible();

    // 4. SUBMIT THE REPORT (to send it back to Queued)
    // Using the same ID from Round 1 submission
    await page3.locator('#submit_unsubmitted_incd').click();
    await page3.locator('#confirmActionBtn').click();

    // Verify it's gone from the current page/submitted successfully
    await expect(page3).toHaveURL(/dsp_add_incident\.cfm/i);

    // 5. Logout
    await page3.getByRole('link', { name: 'Logout' }).click();
    await handleForcedLogoutIfPresent(page3);
    await context3.close();
  }

  ////////////////////////
  // Round 4: MCDONALD logs in, selects the same incident from the notifications
  ////////////////////////
  {
    const context4 = await browser.newContext();
    const page4 = await context4.newPage();

    // 1. Login as the reviewer (MCDONALD)
    await loginAndOnBehalf(page4, 'MCDONALD');

    // 2. Target the Notification Bell
    const bellBtn = page4.locator('#notificationButton');
    await expect(bellBtn).toBeVisible({ timeout: 15000 });
    
    console.log(`Attempting to click notification bell for Incident #${incId}...`);
    await bellBtn.click({ force: true });

    // 3. Wait for the notification list to appear
    const list = page4.locator('#notificationList');
    await list.waitFor({ state: 'visible' });

    // 4. Find the link that contains the incId
    const notificationLink = list.locator(`a:has-text("${incId}")`);

    if (await notificationLink.count() > 0) {
        await notificationLink.waitFor({ state: 'visible', timeout: 10000 });
        await notificationLink.click({ force: true });
        console.log(`Clicked notification link for Incident #${incId}`);
    } else {
        console.error(`Link for Incident #${incId} not found in toast. Falling back to manual search.`);
        await page4.getByRole('link', { name: 'Incidents' }).click();
        await page4.locator('#Queued-tab').click();
        await page4.locator('#dataTable4_filter input[type="search"]').fill(String(incId));
        const manualLink = page4.locator('#dataTable4').getByRole('link', { name: String(incId) });
        await manualLink.waitFor({ state: 'visible' });
        await manualLink.click();
    }

    // 5. Handle the Note Reply
    await page4.getByRole('tab', { name: 'Notes' }).click();
    const finalReplyBtn = page4.locator('button.reply-button[data-notetype="MessageReportWriter"]').first();
    await finalReplyBtn.waitFor({ state: 'visible' });
    await finalReplyBtn.click();

    const finalTextArea = page4.locator('#replyText');
    await finalTextArea.waitFor({ state: 'visible' });
    await finalTextArea.fill('Thank you!');
    await page4.locator('#submitNotesReply').click();
    await expect(page4.locator('#successNoteReplyMessage')).toBeVisible();

    // 6. Review & Confirm
    await page4.getByRole('tab', { name: 'Review & Confirm' }).click();
    await page4.locator('input[name="AlliedCatID"][value="6"]').check({ force: true });

    // 7. Final Confirmation
    await page4.locator('#submit_queued_incd').click();
    await page4.locator('#confirmActionBtn').click();

    // 8. Verification
    await expect(page4).toHaveURL(/dsp_add_incident\.cfm/i);
    console.log(`Incident #${incId} successfully confirmed. Moving to dashboard search...`);

    // --- NEW TASKS START HERE ---

    // A. Go to Incidents Dashboard
    await page4.getByRole('link', { name: 'Incidents' }).click();

    // B. Click the "New" tab
    const newTab = page4.getByRole('tab', { name: /New/i });
    await newTab.waitFor({ state: 'visible' });
    await newTab.click();

    // C. Search for the incident ID
    const activePanel = page4.locator('.tab-pane.active');
    const searchFilter = activePanel.locator('input[type="search"]');
    await searchFilter.waitFor({ state: 'visible', timeout: 15000 });
    await searchFilter.fill(String(incId));

    // ... D. Click the link for the incident ...
    const confirmedLink = activePanel.locator('table.dataTable').getByRole('link', { name: String(incId) });
    await confirmedLink.waitFor({ state: 'visible' });
    await confirmedLink.click();

    // E. Navigate to the Action tab
    const actionTab = page4.locator('#incident-action-tab');
    await actionTab.waitFor({ state: 'visible' });
    await actionTab.click();

    // --- RESTORED: Click the Paper Plane to open the modal ---
    const applyActionIcon = page4.locator('i.fa-paper-plane[data-bs-target="#selectPeopleModal"]');
    await applyActionIcon.waitFor({ state: 'visible' });
    await applyActionIcon.click();

    // --- RESTORED: Define the Modal locator ---
    const actionModal = page4.locator('#selectPeopleModal'); 
    await expect(actionModal).toBeVisible({ timeout: 5000 });

    // 1. SELECT PEOPLE (Targeting individuals)
    console.log("Selecting individual person checkboxes...");
    const personCheckboxes = actionModal.locator('input[type="checkbox"]').filter({
        hasNot: page4.locator('#selectAllPeople, .violation-checkbox, .action-checkbox, .action2-checkbox')
    });
    
    const pCount = await personCheckboxes.count();
    for (let i = 0; i < pCount; i++) {
        await personCheckboxes.nth(i).click({ force: true });
    }

    // 2. HANDLE HEALTH & SAFETY
    const healthSafetyBox = page4.getByLabel(/Health & Safety/i);
    
    if (await healthSafetyBox.isVisible()) {
        console.log("Health & Safety checkbox found. Attempting to activate...");
        await healthSafetyBox.click({ force: true });
        
        const firstViolation = page4.locator('input.violation-checkbox').first();
        try {
            await firstViolation.waitFor({ state: 'visible', timeout: 3000 });
        } catch (e) {
            console.warn("Violations didn't appear. Retrying Health & Safety click...");
            await healthSafetyBox.click({ force: true });
            await firstViolation.waitFor({ state: 'visible', timeout: 5000 });
        }

        await page4.waitForTimeout(1000); 

        const violationCheckboxes = page4.locator('input.violation-checkbox');
        const vCount = await violationCheckboxes.count();
        
        for (let i = 0; i < vCount; i++) {
            const vBox = violationCheckboxes.nth(i);
            if (!(await vBox.isChecked())) {
                await vBox.click({ force: true });
                await page4.waitForTimeout(150);
            }
        }

        // SPECIFY "OTHER" VIOLATION
        const otherCheckbox = page4.locator('input.violation-checkbox[data-isother="true"], input.violation-checkbox[value="19"]').first();
        if (await otherCheckbox.isVisible() && !(await otherCheckbox.isChecked())) {
            await otherCheckbox.click({ force: true });
            await page4.waitForTimeout(300);
        }

        const otherInput = page4.locator('#violationOtherInput');
        await otherInput.waitFor({ state: 'visible' });
        await otherInput.fill('random violation');
        await otherInput.press('Tab');
    }

    // 3. CHECK REMAINING ACTIONS
    const actionCheckboxes = page4.locator('input.action-checkbox, input.action2-checkbox');
    const actionCount = await actionCheckboxes.count();
    
    for (let i = 0; i < actionCount; i++) {
        const box = actionCheckboxes.nth(i);
        if (!(await box.isChecked())) {
            await box.click({ force: true });
            await page4.waitForTimeout(100);
        }
    }

    // 4. FINAL SUBMIT
    const submitBtn = page4.locator('#confirmSubmit');

    // Ensure the button is in the viewport
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    console.log("Attempting final Submit click...");

    // Strategy 1: The "Human" Double-Click (helps if the first click is swallowed by focus)
    await submitBtn.click({ clickCount: 2, delay: 100 });

    // Strategy 2: The JavaScript "Direct" Click
    // This bypasses any invisible overlays (like a spinner) that might be blocking Playwright
    await page4.evaluate(() => {
        const btn = document.querySelector('#confirmSubmit');
        if (btn) {
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            btn.click();
        }
    });

    // 5. VERIFICATION
    try {
        // We wait for the modal to actually be removed from the DOM
        await expect(actionModal).toBeHidden({ timeout: 10000 });
        console.log("Success: Modal closed and form submitted.");
    } catch (error) {
        console.error("Modal is still visible after multiple click attempts.");
        
        // Final Debug: Take a look at the console logs of the browser
        const consoleLogs = await page4.evaluate(() => window.lastError || "No JS errors found in browser console.");
        console.log(`Browser Context: ${consoleLogs}`);
        
        await page4.screenshot({ path: 'final-submit-stuck.png' });
        
        // If it's still stuck, you might need to manually check if 
        // there is a 'required' field hidden in another tab of the modal.
        throw error;
    }
// 6. Navigate to the Action tab
    await page4.locator('#incident-action-tab').click();
    
    // Wait for at least one trash icon to be visible on the results cards
    const firstTrash = page4.locator('i.delete-icon[data-page="ActionTab"]').first();
    await firstTrash.waitFor({ state: 'visible', timeout: 10000 });

    // 7. Loop to delete the actions
    // We'll delete 3 actions; the list refreshes after each deletion
    let actionsToDelete = 3; 
    
    for (let i = 0; i < actionsToDelete; i++) {
        // Always grab the current 'first' icon as the DOM updates
        const trashBtn = page4.locator('i.delete-icon[data-page="ActionTab"]').first();
        
        // Break if we've run out of actions before hitting our limit
        if (await trashBtn.count() === 0) {
            console.log("No more actions found to delete.");
            break;
        }

        const actionId = await trashBtn.getAttribute('data-actionid');
        console.log(`Triggering delete for Action ID: ${actionId}...`);

        // Force click the trash icon (bypasses tooltip overlays)
        await trashBtn.click({ force: true });

        // 8. Handle the Confirmation Modal
        const confirmDeleteModalBtn = page4.locator('#confirmDeleteButton');
        
        // Wait for the confirmation button to be stable and visible
        await confirmDeleteModalBtn.waitFor({ state: 'visible', timeout: 5000 });
        await confirmDeleteModalBtn.click();

        // 9. Verification: Wait for this specific action ID to leave the DOM
        // This ensures the AJAX call finished before we loop to the next item
        await expect(trashBtn).not.toHaveAttribute('data-actionid', actionId, { timeout: 8000 });
        
        console.log(`Action ID ${actionId} successfully removed.`);
        
        // Small buffer to let the UI settle after the card disappears
        await page4.waitForTimeout(1000);
    }

    console.log("Specified actions have been deleted.");
    // console.log("Form submitted successfully with all actions and violations.");

    // 9. Cleanup
    await page4.getByRole('link', { name: 'Logout' }).click();
    await handleForcedLogoutIfPresent(page4);
    await context4.close();
  }
  ////////////////////////
  // Round 5: Add Policy Modal
  ////////////////////////
  {
    const context5 = await browser.newContext();
    const page5 = await context5.newPage();

    // 1. Login & Navigation (Using our stable pattern)
    await loginAndOnBehalf(page5, 'MCDONALD');
    await page5.getByRole('link', { name: 'Incidents' }).click();
    
    // Search for the incident
    const searchFilter = page5.locator('.tab-pane.active input[type="search"]');
    await searchFilter.fill(String(incId));
    await page5.locator('table.dataTable').getByRole('link', { name: String(incId) }).click();

    // 2. Open Policy Tab & Trigger Modal
    await page5.locator('#incident-policy-tab').click();
    await page5.locator('i.fa-file-signature').click();

    // 3. Interact with the "Add Policy" Modal
    const policyModal = page5.locator('.modal-content:has-text("Add Policy")');
    await expect(policyModal).toBeVisible();

    // -- Step A: Select People --
    // We can either use "Select All" or pick Alvin specifically
    const alvinCheckbox = policyModal.locator('input[value="ALVIN BI"]');
    await alvinCheckbox.check();
    
    // -- Step B: Select Policies --
    // Let's go with "Noise" and "Disruptive Behavior"
    await policyModal.locator('#policy_16').check(); // Noise
    await policyModal.locator('#policy_15').check(); // Disruptive Behavior

    console.log("People and Policies selected. Submitting...");

    // 4. Submit with the "Bulletproof" sequence from Round 4
    const submitBtn = policyModal.locator('#confirmPolicySubmit');
    
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeEnabled();

    // Attempting the click
    await submitBtn.click();

    // 5. Verification
    // Check for the success message within the modal or wait for closure
    const successMsg = policyModal.locator('#policysuccessMessage');
    await expect(successMsg).toBeVisible({ timeout: 10000 });
    
    console.log("Success: Policy successfully added to incident.");

    // Final screenshot for the records
    await page5.screenshot({ path: 'round5-policy-complete.png' });
  }
});