import { test, expect } from '@playwright/test';
import { loginAndOnBehalf, logout, loadSecondIncidentId, loadIncidentStartDate } from './fixtures/incident-helpers';

test.setTimeout(10 * 60 * 1000);

test.describe('Incident Search', () => {
  test('MCDONALD searches for the linked incident by ID', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginAndOnBehalf(page, 'MCDONALD');

    await page.getByRole('link', { name: 'Incidents' }).click();
    await page.locator('a#search-tab').click();

    const secondIncId = loadSecondIncidentId();
    expect(secondIncId).toBeTruthy();

    let firstIncidentDate = loadIncidentStartDate();
    expect(firstIncidentDate).toBeTruthy();
    if (firstIncidentDate.includes('T')) {
      firstIncidentDate = firstIncidentDate.split('T')[0];
    }

    const advancedSearchButton = page.locator('button.accordion-button', { hasText: 'Advanced Search' });
    await advancedSearchButton.waitFor({ state: 'visible', timeout: 10000 });
    await advancedSearchButton.click();

    const startDateInput = page.locator('input#startDate');
    await startDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await startDateInput.fill(firstIncidentDate);

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const endDateInput = page.locator('input#endDate');
    await endDateInput.waitFor({ state: 'visible', timeout: 10000 });
    await endDateInput.fill(todayString);

    const categorySelect = page.locator('select#chascatID');
    await categorySelect.waitFor({ state: 'visible', timeout: 10000 });
    await categorySelect.selectOption('6');

    const actionSelect = page.locator('select#actionID');
    await actionSelect.waitFor({ state: 'visible', timeout: 10000 });
    await actionSelect.selectOption('77');

    const policySelect = page.locator('select#policyID');
    await policySelect.waitFor({ state: 'visible', timeout: 10000 });
    await policySelect.selectOption('15');

    const applyFiltersButton = page.locator('button#applyFilters');
    await applyFiltersButton.waitFor({ state: 'visible', timeout: 10000 });
    await applyFiltersButton.click();
    await page.pause();

    const searchInput = page.locator('input#incID');
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(String(secondIncId));

    const searchButton = page.locator('button#searchIncident');
    await searchButton.waitFor({ state: 'visible', timeout: 10000 });
    await searchButton.click();

    await page.pause();
//this one is getting stuck because I'm adding too many filters. brought issue to Yousaf's attention.
    await context.close();
  });
});
