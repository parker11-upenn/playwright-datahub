# Modular Incident Workflow Tests

This test suite breaks down the monolithic "v5-full-incident" test into 6 focused, maintainable tests that each cover a specific aspect of the incident workflow.

## Requirements

* Node.js (v18+ recommended)
* npm
* Access to CHAS DataHub (valid credentials)

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

## Environment Variables (Required)

Create a `.env` file in the project root:

```env
CHAS_USERNAME=your_username
CHAS_PASSWORD=your_password
```

Do NOT commit this file. It is already ignored via `.gitignore`.

## Test Files

### 1. **01-incident-creation.spec.js**
Creates a complete incident with all sections (location, people, summary, assets).
- **User**: RASHID (Report Writer)
- **Actions**: Fill all incident sections, upload asset, submit

### 2. **02-incident-review-sendback.spec.js**
Reviewer sends the incident back for revision.
- **User**: MCDONALD (Reviewer)
- **Actions**: Navigate to queued incident, send back with reason

### 3. **03-incident-asset-deletion.spec.js**
Report writer deletes the asset and replies to feedback.
- **User**: RASHID (Report Writer)
- **Actions**: Delete asset, reply in notes, re-submit incident

### 4. **04-incident-actions.spec.js**
Reviewer confirms incident, applies actions and violations, then deletes some actions.
- **User**: MCDONALD (Reviewer)
- **Actions**: Handle notifications, reply to notes, review & confirm, apply actions/violations, delete actions

### 5. **05-incident-policies.spec.js**
Add policies to the confirmed incident, add responses, and delete them.
- **User**: MCDONALD (Reviewer)
- **Actions**: Open policy modal, select people and policies, add responses, delete policies and responses

### 6. **06-incident-archive.spec.js**
Complete archive and un-archive workflow for confirmed incidents.
- **User**: MCDONALD (Reviewer)
- **Actions**: Toggle facilities/residential services, confirm incident, archive via mass archive, un-archive from archived tab

### 7. **07-incident-linking-setup.spec.js**
Creates a second incident for linking purposes and confirms it.
- **User**: RASHID (Report Writer) → MCDONALD (Reviewer)
- **Actions**: Create simplified incident (student only), switch user, confirm incident

## How Tests Share Data

Tests are sequential and the incident ID is **automatically shared** between them:

1. **01** creates the incident and saves the ID to `.test-state.json`
2. **02-06** load the ID from `.test-state.json` and use it

The state file is automatically cleared before the first test runs.

## Running Tests

### Run all tests in order
```bash
npx playwright test tests/0*.spec.js
```

### Run specific test
```bash
# Test 1: Create incident only
npx playwright test tests/01-incident-creation.spec.js --project=chromium --debug;

# Test 2: Reviewer sends incident back (requires test 01 to run first)
npx playwright test tests/02-incident-review-sendback.spec.js --project=chromium --debug;

# Test 3: Report writer deletes asset and replies (requires tests 01-02 to run first)
npx playwright test tests/03-incident-asset-deletion.spec.js --project=chromium --debug;

# Test 4: Apply actions & violations (requires tests 01-03 to run first)
npx playwright test tests/04-incident-actions.spec.js --project=chromium --debug;

# Test 5: Add policies to incident (requires all previous tests to run first)
npx playwright test tests/05-incident-policies.spec.js --project=chromium --debug;

# Test 6: Archive and un-archive incident (requires all previous tests to run first)
npx playwright test tests/06-incident-archive.spec.js --project=chromium --debug;

# Test 7: Create second incident for linking (can run independently)
npx playwright test tests/07-incident-linking-setup.spec.js --project=chromium --debug;
```

**Note:** Tests must run in order (01 → 02 → 03 → 04 → 05 → 06) because each test depends on the incident ID created in test 01. Test 07 is independent and creates its own incident for linking purposes. To run them in sequence:
```bash
npx playwright test tests/0*.spec.js --project=chromium --debug;
```

### Run with different settings
```bash
# Run in headed mode (see browser)
npx playwright test tests/0*.spec.js --headed

# Run specific test in headed mode with debug
npx playwright test tests/01-incident-creation.spec.js --headed --debug

# Run with specific browser
npx playwright test tests/0*.spec.js --project=chromium

# Run test 04 with verbose output
npx playwright test tests/04-incident-actions.spec.js --reporter=verbose

# Run test 05 in headed mode to watch policy addition
npx playwright test tests/05-incident-policies.spec.js --headed

# Run test 06 in headed mode to watch archive/un-archive
npx playwright test tests/06-incident-archive.spec.js --headed

# Run test 07 in headed mode to watch second incident creation
npx playwright test tests/07-incident-linking-setup.spec.js --headed
```

## Key Improvements

✅ **Focused Tests**: Each test has a single responsibility  
✅ **Parallel Capable**: Tests can eventually run in parallel for independent features  
✅ **Maintainable**: Smaller files are easier to debug and update  
✅ **Reusable Helpers**: Common functions extracted to `fixtures/incident-helpers.js`  
✅ **Sequential Support**: Tests run in order with automatic state sharing  
✅ **Clear Names**: Test names clearly describe what's being tested  

## Shared Helpers

All common utilities are in `fixtures/incident-helpers.js`:

- `loginAndOnBehalf(page, targetUser)` - Login and switch user
- `setIncidentDateWithinLast30Days(page)` - Set random incident date
- `logout(page)` - Logout safely
- `navigateToIncident(page, incId, tabName)` - Find and open incident
- `saveIncidentId(incId)` - Save ID for other tests
- `loadIncidentId()` - Load saved ID
- `handleForcedLogoutIfPresent(page)` - Handle logout modal

## Debugging

If a test fails:

1. Check the error message - it will indicate which test and which step
2. Look at the `.test-state.json` to see if the incident was created
3. Use `--headed` flag to see what the browser is doing
4. Add additional `console.log()` statements as needed
5. Check screenshots in the working directory

## Next Steps

To make tests even more independent:
- Use API calls or database fixtures to create incidents instead of UI
- Store incident data in a shared fixture instead of a file
- Consider using Playwright's built-in `test.serial()` for better sequencing
