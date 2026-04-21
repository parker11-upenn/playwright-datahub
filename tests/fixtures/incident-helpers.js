import 'dotenv/config';
import { expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const baseUrl = 'https://chas-stage.collegehouses.upenn.edu/chasdatahub/home.cfm';
const username = process.env.CHAS_USERNAME;
const password = process.env.CHAS_PASSWORD;

if (!username || !password) {
  throw new Error('Missing CHAS_USERNAME or CHAS_PASSWORD environment variables');
}

// State file to share incId between tests
const stateFile = path.join(process.cwd(), '.test-state.json');

/**
 * Login and switch to a specific user via "On Behalf" functionality
 */
export async function loginAndOnBehalf(page, targetUser) {
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
}

/**
 * Handle forced logout modal if present
 */
export async function handleForcedLogoutIfPresent(page) {
  if (await page.locator('#propagate_no').isVisible().catch(() => false)) {
    await page.locator('#propagate_no').click();
  }
}

/**
 * Set incident date to a random date within the last 30 days
 */
export async function setIncidentDateWithinLast30Days(page) {
  const daysBack = Math.floor(Math.random() * 29) + 1;
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const formattedDate = date.toISOString().slice(0, 16);
  const incidentDate = page.locator('#incidentDate');
  await incidentDate.waitFor({ state: 'visible' });
  await incidentDate.fill(formattedDate);
  await incidentDate.dispatchEvent('change');
  await incidentDate.dispatchEvent('blur');
}

/**
 * Logout from the application
 */
export async function logout(page) {
  await page.getByRole('link', { name: 'Logout' }).click();
  await handleForcedLogoutIfPresent(page);
}

/**
 * Navigate to an incident by ID and tab name
 */
export async function navigateToIncident(page, incId, tabName) {
  await page.getByRole('link', { name: 'Incidents' }).click();
  
  const tabSelector = {
    'Unsubmitted': '#Unsubmitted-tab',
    'Queued': '#Queued-tab',
    'New': '.tab-pane.active',
    'Open': '#Open-tab',
    'Archived': '#archived-tab'
  }[tabName];

  if (tabName !== 'New') {
    await page.locator(tabSelector).click();
  }

  const filter = page.locator('.tab-pane.active input[type="search"]');
  await filter.waitFor({ state: 'visible' });
  await filter.fill(String(incId));

  const incidentLink = page.locator('table.dataTable').getByRole('link', { name: String(incId) });
  await incidentLink.waitFor({ state: 'visible' });
  await incidentLink.click();
}

/**
 * Save incident ID to a persistent file for sharing between tests
 */
export function saveIncidentId(incId, startDate) {
  const state = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    : {};

  state.incId = String(incId);
  if (startDate) {
    state.startDate = startDate;
  }
  state.timestamp = new Date().toISOString();

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

export function saveLinkedIncidentId(secondIncId) {
  const state = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
    : {};

  state.secondIncId = String(secondIncId);
  state.timestamp = new Date().toISOString();

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

/**
 * Load incident ID from the persistent file
 */
export function loadIncidentId() {
  if (!fs.existsSync(stateFile)) {
    throw new Error('Incident ID not found. Make sure the incident creation test runs first.');
  }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  return state.incId;
}

export function loadSecondIncidentId() {
  if (!fs.existsSync(stateFile)) {
    throw new Error('Incident state not found. Make sure the linking test runs first.');
  }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  if (!state.secondIncId) {
    throw new Error('Second incident ID not found in incident state. Make sure the linking test saved it.');
  }
  return state.secondIncId;
}

/**
 * Load the first incident start date from the persistent file
 */
export function loadIncidentStartDate() {
  if (!fs.existsSync(stateFile)) {
    throw new Error('Incident state not found. Make sure the incident creation test runs first.');
  }
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  if (!state.startDate) {
    throw new Error('Start date not found in incident state. Make sure the incident creation test saved it.');
  }
  return state.startDate;
}

/**
 * Clear the test state file
 */
export function clearTestState() {
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

/**
 * Get base URL
 */
export function getBaseUrl() {
  return baseUrl;
}
