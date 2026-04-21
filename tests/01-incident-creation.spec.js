import { test, expect } from '@playwright/test';
import {
  loginAndOnBehalf,
  handleForcedLogoutIfPresent,
  setIncidentDateWithinLast30Days,
  logout,
  saveIncidentId,
  clearTestState
} from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Creation', () => {
  let createdDocId = null;
  let incId = null;

  test.beforeAll(() => {
    // Clear any previous test state
    clearTestState();
  });

  test('create incident with all sections and upload asset', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // LOGIN AS RASHID
    await loginAndOnBehalf(page, 'RASHID');

    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.getByRole('link', { name: ' Create Incident Report' }).click();

    // Location Date & Time Tab
    await page.getByRole('tab', { name: ' Location Date & Time' }).click();
    await setIncidentDateWithinLast30Days(page);
    const incidentStartDate = await page.locator('#incidentDate').inputValue();
    await page.locator('#location1').check();
    await page.waitForTimeout(500);
    await page.locator('#LocID').selectOption('67');
    await page.locator('#LocID').dispatchEvent('change');
    await page.locator('#save_dateTime').click();

    // People Tab
    await page.getByRole('tab', { name: ' People' }).click();
    await page.getByRole('button', { name: 'Search Student' }).click();
    await page.getByRole('button', { name: /Search By Room/i }).click();
    await page.locator('#buildingName').selectOption('67');
    await page.getByLabel('Room #').selectOption('GUTM 0202');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const firstStudentCard = page.locator('#searchRoomResults .card').first();
    await firstStudentCard.waitFor({ state: 'visible' });
    await firstStudentCard.getByRole('button', { name: 'ADD' }).click();
    await page.getByRole('button', { name: 'Close' }).first().click();

    // University Personnel
    await page.getByRole('button', { name: 'University Personnel' }).click();
    await page.getByRole('textbox', { name: 'First Name' }).fill('Debbie');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Harry');
    await page.getByRole('radio', { name: 'Allied Guard' }).check();
    await page.getByRole('button', { name: 'Add Person' }).click();
    await page.getByLabel('Add University Personnel: Add').getByText('Close').click();

    // CHAS/RHS Team Member
    await page.getByRole('button', { name: 'CHAS/RHS Team Member' }).click();
    await page.getByRole('textbox', { name: 'First Name' }).fill('Ryan');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Parker');
    await page.locator('#ChasdeptID').selectOption('90');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.locator('#addUserButton0').click();
    await page.getByRole('button', { name: 'Close' }).nth(1).click();

    // Non-Penncard Persons
    await page.getByRole('button', { name: 'Non-Penncard Persons' }).click();
    await page.locator('#npfirstnameInput').fill('Jane');
    await page.locator('#nplastnameInput').fill('Jones');
    await page.locator('#npemailInput').fill('jjones@gmail.com');
    await page.locator('#npphoneInput').fill('2672672678');
    await page.locator('#npcellphoneInput').fill('5551234567');
    await page.locator('#npaddressInput').fill('123 Washington Avenue, Philadelphia, PA 19104');
    await page.getByRole('radio', { name: 'Parent/Family' }).check();
    await page.locator('#npotherinfo').fill('This is a test note for Jane.');
    await page.locator('#addnpButton1').click();
    await page.getByRole('button', { name: 'Close' }).nth(1).click();

    // None/Unknown
    await page.getByRole('button', { name: 'None/Unknown' }).click();
    await page.locator('#unotherinfo').fill('This is a test description of an unknown person.');
    await page.locator('#addunButton1').click();
    await page.locator('.modal.show .btn-close').click();

    // Summary Tab
    await page.getByRole('tab', { name: 'Summary' }).click();
    await page.getByRole('textbox', { name: 'Describe the incident here' }).fill('Summary text...');

    // Handling P-Numbers for various accordions
    const accordions = [
      { btn: 'Involved Student(s) P-Number', target: '#collapseStudents' },
      { btn: 'Involved Team Member', target: '#collapseStaff' },
      { btn: 'Emergency Personnel', target: '#collapseEmergency' },
      { btn: 'None / Unknown Person(s) P-Number', target: '#collapseUnknown' },
      { btn: 'Non-Penncard Person(s) P-Number', target: '#collapseOther' }
    ];

    for (const item of accordions) {
      await page.getByRole('button', { name: item.btn }).click();
      const container = page.locator(item.target);
      await container.waitFor({ state: 'visible' });
      await container.locator('button.person-id').click();
      await page.getByRole('textbox', { name: 'Describe the incident here' }).pressSequentially(', ');
    }

    await page.locator('#save_description').click();

    // Assets Tab
    await page.getByRole('tab', { name: 'Assets' }).click();
    await page.setInputFiles('#fileInput', '/Users/parker11/Desktop/incident.png');
    await page.locator('#fileName').fill('Incident Upload Test');
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForTimeout(5000);

    const firstTrash = page.locator('i.delete-icon[data-page="AttachmentTab"]').first();
    createdDocId = await firstTrash.getAttribute('data-docid');

    // Submit Incident
    await page.locator('#submit_unsubmitted_incd').click();
    await page.locator('#confirmActionBtn').click();

    await expect(page).toHaveURL(/dsp_add_incident\.cfm/i);
    incId = new URL(page.url()).searchParams.get('incID');

    // Save the incident ID and start date for subsequent tests
    saveIncidentId(incId, incidentStartDate);

    // Cleanup
    await logout(page);
    await context.close();

    expect(incId).toBeTruthy();
  });
});
