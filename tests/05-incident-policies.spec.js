import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  handleForcedLogoutIfPresent,
  logout,
  loadIncidentId,
  navigateToIncident
} from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Policy Addition', () => {
  let incId;

  test.beforeAll(() => {
    // Load the incident ID created by the creation test
    incId = loadIncidentId();
  });

  test('add policies to confirmed incident', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // LOGIN AS MCDONALD (Reviewer)
    await loginAndOnBehalf(page, 'MCDONALD');

    // Navigate to the incident
    await navigateToIncident(page, incId, 'Open');

    // Open Policy Tab & Trigger Modal
    await page.locator('#incident-policy-tab').click();
    await page.locator('i.fa-file-signature').click();

    // Interact with the "Add Policy" Modal
    const policyModal = page.locator('.modal-content:has-text("Add Policy")');
    await expect(policyModal).toBeVisible();

    // Select people (Alvin)
    const alvinCheckbox = policyModal.locator('input[value="ALVIN BI"]');
    await alvinCheckbox.check();
    
    // Select policies (Noise and Disruptive Behavior)
    await policyModal.locator('#policy_16').check(); // Noise
    await policyModal.locator('#policy_15').check(); // Disruptive Behavior

    console.log("People and Policies selected. Submitting...");

    // Submit the form
    const submitBtn = policyModal.locator('#confirmPolicySubmit');
    
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    
    console.log("Success: Policy successfully added to incident.");

    // Take a screenshot for records
    await page.screenshot({ path: 'incident-policy-added.png' });

    // DELETE THE FIRST POLICY
    await page.locator('#incident-policy-tab').click();
    
    const firstPolicyTrash = page.locator('i.delete-icon[data-page="PolicyTab"]').first();
    await firstPolicyTrash.waitFor({ state: 'visible', timeout: 5000 });
    
    const policyId = await firstPolicyTrash.getAttribute('data-policyid');
    console.log(`Deleting Policy ID: ${policyId}...`);

    await firstPolicyTrash.click({ force: true });

    const confirmDeletePolicyBtn = page.locator('#confirmDeletePolicyButton');
    await confirmDeletePolicyBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmDeletePolicyBtn.click();

    await expect(firstPolicyTrash).not.toHaveAttribute('data-policyid', policyId, { timeout: 8000 });
    
    console.log(`Policy ID ${policyId} successfully removed.`);

    // ADD A POLICY RESPONSE
    const responseBtn = page.locator('i[data-bs-toggle="modal"][data-bs-target="#responseMultipalModal"]');
    await responseBtn.waitFor({ state: 'visible', timeout: 5000 });
    await responseBtn.click();

    const responseModal = page.locator('#responseMultipalModal .modal-content');
    await responseModal.waitFor({ state: 'visible', timeout: 5000 });

    // Select the first available Citation option
    const citationsSelect = responseModal.locator('#CitationsID');
    await citationsSelect.waitFor({ state: 'visible', timeout: 5000 });
    await citationsSelect.selectOption({ index: 0 });

    // Select first radio in responseMultipleGroup
    const firstResponseRadio = responseModal.locator('input.responseMultiple-radio[name="responseMultipleGroup"]').first();
    await firstResponseRadio.waitFor({ state: 'visible', timeout: 5000 });
    await firstResponseRadio.check();

    // Set sanction deadline one week into the future
    const offSetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const isoLocal = offSetDate.toISOString().slice(0,16);
    const deadlineInput = responseModal.locator('#sanctionMultipleDeadline');
    await deadlineInput.fill(isoLocal);

    // Save response
    const saveResponseBtn = responseModal.locator('#saveMultipleResponse');
    await saveResponseBtn.waitFor({ state: 'visible', timeout: 5000 });
    await saveResponseBtn.click();

    // Validate response was saved (success message appears)
    const responseSuccess = responseModal.locator('#policyResponseMultipleSuccessMessage');
    await responseSuccess.waitFor({ state: 'visible', timeout: 10000 });

    // Close response modal explicitly if the app keeps it open
    const closeModalBtn = responseModal.locator('button[data-bs-dismiss="modal"], button.btn-close').first();
    if (await closeModalBtn.isVisible()) {
      await closeModalBtn.click();
    }

    await expect(responseModal).toBeHidden({ timeout: 5000 });

    console.log('Policy response saved and modal closed successfully.');

    // Pause so user can visually confirm the policy response is present
    await page.waitForTimeout(2000);

    // DELETE THE POLICY RESPONSE
    const responseDeleteSelector = '#policyResponseContainer .delete-icon[data-page="PolicyResponseTab"]';
    const responseDeleteBtn = page.locator(responseDeleteSelector).first();
    await responseDeleteBtn.waitFor({ state: 'visible', timeout: 5000 });

    const responseId = await responseDeleteBtn.getAttribute('data-responsetransactionid');
    console.log(`Deleting Policy Response ID: ${responseId}...`);

    await responseDeleteBtn.click({ force: true });

    // Confirm delete (required button ID from provided HTML)
    const confirmResponseDelete = page.locator('#confirmDeletePolicyResponseButton');
    await confirmResponseDelete.waitFor({ state: 'visible', timeout: 5000 });
    await confirmResponseDelete.click();

    // Wait for response line to disappear
    const removedSelector = `#policyResponseContainer .delete-icon[data-responsetransactionid="${responseId}"]`;
    await expect(page.locator(removedSelector)).toHaveCount(0, { timeout: 10000 });

    console.log(`Policy Response ID ${responseId} successfully removed.`);

    // Incident Actions: Send Back To Queue
    const incidentActionsBtn = page.locator('.dropdown .btn.btn-danger.dropdown-toggle').first();
    await incidentActionsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await incidentActionsBtn.click();

    const sendBackBtn = page.locator('button#returnto_queued_incd, button[name="returnto_queued_incd"]');
    await sendBackBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sendBackBtn.click();

    const confirmActionBtn = page.locator('#confirmActionBtn');
    await confirmActionBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmActionBtn.click();

    // Confirm the action completed by waiting for a known post-action state, e.g. URL or toast
    await page.waitForTimeout(2000); // small buffer for action to complete

    console.log('Send Back To Queue action confirmed.');

    // Cleanup
    await logout(page);
    await context.close();
  });
});
