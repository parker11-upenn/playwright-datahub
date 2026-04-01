import { test, expect } from '@playwright/test';

test.setTimeout(10 * 60 * 1000);

test('process multiple OnBehalf users', async ({ browser }) => {

  const users = [
    // 'CIACCIO',//ADMIN,
    // 'KILLILEE',//CAMPUS PARTNER
    // 'ROBERSON',//HOUSE DIRECTOR
    // 'DACHE',//FACULTY DIRECTOR
    // 'KIDA THOMAS',//COORDINATOR
    // 'IGHEDO',//RESIDENT ASSISTANT
    'RASHID'//TRAINEE
    
  ];

  for (const user of users) {
    console.log(`Processing user: ${user}`);

    // Create a fresh context each time
    const context = await browser.newContext();
    const page = await context.newPage();

    // SSO Login as parker11
    await page.goto('https://chas-stage.collegehouses.upenn.edu/chasdatahub/home.cfm');
    await page.getByRole('textbox', { name: 'Username' }).fill('parker11');
    await page.getByRole('textbox', { name: 'Password' }).fill('shine-DESERT-world!!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.waitForURL('**/chasdatahub/**', { timeout: 3 * 60 * 1000 });

    // Navigate to Administration
    await page.getByRole('link', { name: 'Administration' }).click();
    // Search user
    await page.getByRole('searchbox', { name: 'Search:' }).fill(user);
    await page.getByRole('link', { name: 'Edit' }).click();
    // Login on behalf
    await page.getByRole('button', { name: 'Log in OnBehalf' }).click();
    await page.waitForTimeout(3000);
    // Create a new incident
    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.getByRole('link', { name: ' Create Incident Report' }).click();

    // fill out incident
    //select Location tab
    await page.getByRole('tab', { name: ' Location Date & Time' }).click();
   const daysBack = Math.floor(Math.random() * 29) + 1; // 1–29 days ago
  const date = new Date();
  date.setDate(date.getDate() - daysBack);

  const formattedDate = date.toISOString().slice(0, 16);

  await page.locator('#incidentDate').fill(formattedDate);
  await page.locator('#incidentDate').dispatchEvent('change');
  console.log(
  'Incident date set to:',
  await page.locator('#incidentDate').inputValue()
);


    await page.locator('#location1').check();
 
    await page.locator('#LocID').selectOption('57');

    await page.locator('#save_dateTime').click();
   
    // select People tab
    await page.getByRole('tab', { name: ' People' }).click();
    // Student Search
    await page.getByRole('button', { name: 'Search Student' }).click();
    await page.getByRole('button', { name: /Search By Room/i }).click();
    await page.locator('#buildingName').selectOption('57');
    await page.getByLabel('Room #').selectOption('DUBS 0118');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('button', { name: 'ADD' }).click();
    await page.getByRole('button', { name: 'Close' }).first().click();
    //University Personnel
    await page.getByRole('button', { name: 'University Personnel' }).click();
    await page.getByRole('textbox', { name: 'First Name' }).click();
    await page.getByRole('textbox', { name: 'First Name' }).fill('Lana');
    await page.getByRole('textbox', { name: 'Last Name' }).click();
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Del Ray');
    await page.getByRole('radio', { name: 'Allied Guard' }).check();
    await page.getByRole('button', { name: 'Add Person' }).click();
    await page.getByLabel('Add University Personnel: Add').getByText('Close').click();
    // CHAS/RHS Team Member
    await page.getByRole('button', { name: 'CHAS/RHS Team Member' }).click();
    await page.getByRole('textbox', { name: 'First Name' }).fill('Ryan');
    await page.getByRole('textbox', { name: 'First Name' }).press('Tab');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Parker');
    await page.locator('#ChasdeptID').selectOption('90');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.locator('#addUserButton0').click();
    await page.getByRole('button', { name: 'Close' }).nth(1).click();
    // Non-Penncard Persons
    await page.getByRole('button', { name: 'Non-Penncard Persons' }).click();
    await page.locator('#npfirstnameInput').click();
    await page.locator('#npfirstnameInput').fill('Jane');
    await page.locator('#nplastnameInput').click();
    await page.locator('#nplastnameInput').fill('Jones');
    await page.locator('#npemailInput').click();
    await page.locator('#npemailInput').fill('jjones@gmail.com');
    await page.locator('#npphoneInput').click();
    await page.locator('#npphoneInput').fill('2672672678');
    await page.locator('#npcellphoneInput').click();
    await page.locator('#npcellphoneInput').fill('5551234567');
    await page.locator('#npaddressInput').click();
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

    /////////////////////////////////////////////
    // Summary tab
    await page.getByRole('tab', { name: 'Summary' }).click();
    await page
      .getByRole('textbox', { name: 'Describe the incident here' })
      .fill('This is a test summary. The people included are ');

    // Involved Student accordion


    // Open the P-number picker
const btn = page.getByRole('button', { name: 'Involved Student(s) P-Number' });
await btn.scrollIntoViewIfNeeded();
await btn.click();


    // 1. Define the container locator first (the accordion body for students)
    const studentPersonnelContainer = page.locator('#collapseStudents');

    // 2. SMART WAIT: Wait for the container to be visible (i.e., the accordion has opened)
    await studentPersonnelContainer.waitFor({ state: 'visible' });

    // 3. SCOPED ACTION: Find the 'person-id' button *INSIDE* the container 
    //    and then click it. This forces Playwright to only look within the 
    //    '#collapseStudents' element, making the selector unique.
    await studentPersonnelContainer.locator('button.person-id').click();

    await page
      .getByRole('textbox', { name: 'Describe the incident here' })
      .pressSequentially(', ');

    // Involved Team Member accordion

    // Open the P-number picker
    await page.getByRole('button', { name: 'Involved Team Member' }).click();

    // 1. Define the container locator first (the accordion body for staff)
    const teamPersonnelContainer = page.locator('#collapseStaff');

    // 2. SMART WAIT: Wait for the container to be visible (i.e., the accordion has opened)
    await teamPersonnelContainer.waitFor({ state: 'visible' });

    // 3. SCOPED ACTION: Find the 'person-id' button *INSIDE* the container 
    //    and then click it. This forces Playwright to only look within the 
    //    '#collapseStaff' element, making the selector unique.
    await teamPersonnelContainer.locator('button.person-id').click();
    await page
      .getByRole('textbox', { name: 'Describe the incident here' })
      .pressSequentially(', ');

    // Emergency Personnel accordion

    // Open the P-number picker
    await page.getByRole('button', { name: 'Emergency Personnel' }).click();

    // 1. Define the container locator first (the accordion body for staff)
    const emergencyPersonnelContainer = page.locator('#collapseEmergency');

    // 2. SMART WAIT: Wait for the container to be visible (i.e., the accordion has opened)
    await emergencyPersonnelContainer.waitFor({ state: 'visible' });

    // 3. SCOPED ACTION: Find the 'person-id' button *INSIDE* the container 
    //    and then click it. This forces Playwright to only look within the 
    //    '#collapseEmergency' element, making the selector unique.
    await emergencyPersonnelContainer.locator('button.person-id').click();
    await page
      .getByRole('textbox', { name: 'Describe the incident here' })
      .pressSequentially(', ');

    // None / Unknown Person(s) P-Number accordion

    await page.getByRole('button', { name: 'None / Unknown Person(s) P-Number' }).click();
    // 1. Define the container locator first (the accordion body for staff)
    const unknownPersonnelContainer = page.locator('#collapseUnknown');
    // 2. SMART WAIT: Wait for the container to be visible (i.e., the accordion has opened)
    await unknownPersonnelContainer.waitFor({ state: 'visible' });
    // 3. SCOPED ACTION: Find the 'person-id' button *INSIDE* the container 
    //    and then click it. This forces Playwright to only look within the 
    //    '#collapseUnknown' element, making the selector unique.
    await unknownPersonnelContainer.locator('button.person-id').click();
    await page
      .getByRole('textbox', { name: 'Describe the incident here' })
      .pressSequentially(', ');

    // Non-Penncard Person(s) P-Number accordion
    await page.getByRole('button', { name: 'Non-Penncard Person(s) P-Number' }).click();
    // 1. Define the container locator first (the accordion body for staff)
    const nonPenncardPersonnelContainer = page.locator('#collapseOther');
    // 2. SMART WAIT: Wait for the container to be visible (i.e., the accordion has opened)
    await nonPenncardPersonnelContainer.waitFor({ state: 'visible' });
    // 3. SCOPED ACTION: Find the 'person-id' button *INSIDE* the container 
    //    and then click it. This forces Playwright to only look within the 
    //    '#collapseOther' element, making the selector unique.
    await nonPenncardPersonnelContainer.locator('button.person-id').click();
    await page.locator('#save_description').click();

    // //////Assets tab
    await page.getByRole('tab', { name: 'Assets' }).click();

    // Upload the file directly
    await page.setInputFiles('#fileInput', '/Users/parker11/Desktop/incident.png');

    // File name
    await page.locator('#fileName').fill('Incident Upload Test');

    // Click upload
    await page.getByRole('button', { name: 'Upload' }).click();

    // ⏳ Give the app time to finish processing the upload
    await page.waitForTimeout(5000); // 5 seconds

    // Now submit
    await page.locator('#submit_unsubmitted_incd').click();
    await page.locator('#confirmActionBtn').click();
    // await page.pause();

    await page.getByRole('link', { name: 'Logout' }).click();

    // Confirm "propagate_no" button if present
    if (await page.locator('#propagate_no').isVisible()) {
      await page.locator('#propagate_no').click();
    }

    // The system forces a full logout and wants a new browser window.
    // Close this context.
    await context.close();
  }

});
