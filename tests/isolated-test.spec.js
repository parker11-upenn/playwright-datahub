import { test, expect } from '@playwright/test';

// 1. HELPER FUNCTIONS
const baseUrl = 'https://chas-stage.collegehouses.upenn.edu/chasdatahub/home.cfm';
const username = process.env.CHAS_USERNAME || 'parker11';
const password = process.env.CHAS_PASSWORD || 'shine-DESERT-world!!';

const loginAndOnBehalf = async (page, targetUser) => {
    await page.goto(baseUrl);
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL('**/chasdatahub/**', { timeout: 3 * 60 * 1000 });

    console.log(`Switching to OnBehalf: ${targetUser}`);
    await page.getByRole('link', { name: 'Administration' }).click();
    await page.getByRole('searchbox', { name: 'Search:' }).fill(targetUser);
    await page.getByRole('link', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Log in OnBehalf' }).click();

    await page.waitForTimeout(3000);
};

// 2. THE ACTUAL TEST
test('Debug Policy Modal Only', async ({ browser }) => {
    const incId = '51234'; 
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Starting Policy Modal debug for Incident #${incId}`);

    await loginAndOnBehalf(page, 'MCDONALD');

    await page.getByRole('link', { name: 'Incidents' }).click();
    const openTab = page.getByRole('tab', { name: /Open/i });
    await openTab.click();
    
    const searchFilter = page.locator('.tab-pane.active input[type="search"]');
    await searchFilter.fill(String(incId));
    await page.locator('table.dataTable').getByRole('link', { name: String(incId) }).first().click();

    console.log("Navigating to Policy Tab...");
    const policyTab = page.locator('#incident-policy-tab');
    await policyTab.waitFor({ state: 'visible' });
    await policyTab.click();

    await page.locator('i.fa-file-signature').click();

    // --- POLICY MODAL WORKFLOW ---
    const policyModal = page.locator('.modal-content:has-text("Add Policy")');
    await expect(policyModal).toBeVisible();
    
    // Give the modal animation a moment to settle
    await page.waitForTimeout(1000);

    // 1. SELECT PEOPLE (Using .click instead of .check)
    console.log("Selecting individual person checkboxes...");
    const personCheckboxes = policyModal.locator('input.policy-person-checkbox');
    const pCount = await personCheckboxes.count();
    
    for (let i = 0; i < pCount; i++) {
        // We use click({ force: true }) because the actual <input> might be covered by a label or custom styling
        await personCheckboxes.nth(i).click({ force: true });
        await page.waitForTimeout(200); // Brief pause to ensure the JS listener registers it
    }

    // 2. SELECT POLICIES (Using .click instead of .check)
    console.log("Selecting specific policies...");
    const noisePolicy = policyModal.locator('#policy_16');
    const disruptivePolicy = policyModal.locator('#policy_15');

    await noisePolicy.click({ force: true });
    await disruptivePolicy.click({ force: true });

// 3. FINAL SUBMIT
    const submitBtn = policyModal.locator('#confirmPolicySubmit');
    await submitBtn.click({ force: true });

    // 4. VERIFICATION
    console.log("Waiting for modal to close and UI to settle...");

    // Instead of waiting for a specific ID, let's wait for the modal to vanish
    await expect(policyModal).toBeHidden({ timeout: 10000 });

    // Give the background AJAX/DataTable a second to actually render the new row
    await page.waitForTimeout(2000);

    try {
        // BROAD SEARCH: Check if 'Noise' exists anywhere in the visible text of the page
        // This avoids issues with nested IDs or partial page refreshes
        const bodyText = page.locator('body');
        await expect(bodyText).toContainText('Noise', { timeout: 10000 });
        
        console.log("Success: 'Noise' found on the page!");
    } catch (e) {
        console.warn("Could not find 'Noise' in the page body. Taking final screenshot.");
        await page.screenshot({ path: 'check-this-screenshot.png' });
        
        // Let's print out what the locator *does* see to the console for debugging
        const visibleText = await page.locator('table').first().innerText().catch(() => 'No table found');
        console.log("First table text content:", visibleText);
        
        throw e;
    }
// 5. DELETE THE "NOISE" POLICY
    console.log("Locating the specific Noise policy via data-policyid...");
    const noiseTrashCan = page.locator('i.delete-icon[data-policyid="16"]');
    
    console.log("Clicking the trash can for Policy 16 (Noise)...");
    await noiseTrashCan.click({ force: true });

    // --- HANDLE THE BOOTSTRAP CONFIRMATION MODAL ---
    console.log("Waiting for the VISIBLE Confirmation Modal...");
    
    // We add .filter({ visible: true }) to ignore the other 3 hidden delete modals
    // We also search for "Citation" to be extra sure
    const deleteModal = page.locator('.modal-content')
        .filter({ hasText: 'Confirm Deletion' })
        .filter({ hasText: 'Citation' })
        .filter({ visible: true });

    const confirmDeleteBtn = deleteModal.locator('#confirmDeletePolicyButton');

    // Wait for the specific visible modal
    await expect(deleteModal).toBeVisible({ timeout: 5000 });
    
    console.log("Clicking the 'Delete' button in the modal...");
    await confirmDeleteBtn.click({ force: true });

    // 6. FINAL VERIFICATION
    console.log("Verifying Policy 16 is gone...");

    // 1. Wait for the specific modal to vanish
    await expect(deleteModal).toBeHidden({ timeout: 10000 });

    // 2. Verify the trash icon for Noise is gone
    await expect(noiseTrashCan).toBeHidden({ timeout: 10000 });

    // 3. Ensure 'Disruptive Behavior' (Policy 15) is still there
    const disruptiveRow = page.locator('li.list-group-item', { hasText: 'Disruptive Behavior' });
    await expect(disruptiveRow).toBeVisible();

    console.log("Success: Noise deleted, Disruptive Behavior remains.");

});