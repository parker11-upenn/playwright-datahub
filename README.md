# Playwright Incident Automation

This project contains Playwright end-to-end tests for the CHAS DataHub incident workflow.

## What This Test Does
[text](tests/v5-full-incident.spec.js)
This test automates the full lifecycle of an incident:

1. Logs in as a user and creates an incident
2. Submits the incident
3. Logs in as a reviewer and sends it back
4. Logs back in as the original user, edits, and resubmits
5. Reviewer confirms the incident
6. Applies actions and policies
7. Performs cleanup steps

---

## Requirements

* Node.js (v18+ recommended)
* npm
* Access to CHAS DataHub (valid credentials)

---

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd playwright-datahub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Playwright browsers

```bash
npx playwright install
```

---

## Environment Variables (Required)

Create a `.env` file in the project root:

```env
CHAS_USERNAME=your_username
CHAS_PASSWORD=your_password
```

Do NOT commit this file. It is already ignored via `.gitignore`.

---

## Running the Test

Run in debug mode (recommended first time):

```bash
npx playwright test tests/v5-full-incident.spec.js --project=chromium --debug
```

Run normally:

```bash
npx playwright test tests/v5-full-incident.spec.js --project=chromium
```

---

## Viewing Test Results

After running tests:

```bash
npx playwright show-report
```

Or open the trace file:

```bash
npx playwright show-trace test-results/<trace-file>.zip
```

---

## Notes

* Credentials are loaded via environment variables for security
* The test uses multiple browser contexts to simulate different users
* Some waits/timeouts are intentionally longer due to backend processing time
* File uploads require a valid local file path (see test file)

---

## Troubleshooting

### Error: Missing CHAS_USERNAME or CHAS_PASSWORD

Make sure:

* `.env` file exists
* `dotenv` is installed
* The test imports `dotenv/config`

### Login fails

* Verify credentials are correct
* Confirm access to the CHAS environment

### File upload fails

Update this line in the test to match your local file:

```js
await page.setInputFiles('#fileInput', 'path/to/your/file.png');
```

---

## Future Improvements

* Move test data (users, locations, etc.) to config
* Replace static waits with smarter assertions
* Parameterize environments (dev/stage/prod)
* Add CI integration (GitHub Actions)

---
