# Implementation Plan: GitHub Security Review Bot

## 📋 Micro-Step Checklist
- [x] Phase 1: Setup and Initialization
  - [x] Step 1.A: Verify directory structure and initialize dependencies
  - [x] Step 1.B: Create basic Express server skeleton
- [x] Phase 2: Webhook Handling & Verification
  - [x] Step 2.A: Implement Webhook Verification Middleware
  - [x] Step 2.B: Implement PR Event Webhook Endpoint
- [x] Phase 3: GitHub API Integration (Octokit)
  - [x] Step 3.A: Implement GitHub App Authentication
  - [x] Step 3.B: Implement PR Diff Retrieval
- [x] Phase 4: Core Agent Integration
  - [x] Step 4.A: Implement Agent HTTP Client
  - [x] Step 4.B: Integrate Client into Webhook Flow
- [x] Phase 5: Feedback Delivery
  - [x] Step 5.A: Implement PR Review Posting
  - [x] Step 5.B: Integrate Posting into Webhook Flow
- [x] Phase 6: Deployment & Validation
  - [x] Step 6.A: Create Dockerfile
  - [x] Step 6.B: Write Testing & Validation Harness

## 📝 Step-by-Step Implementation Details

### Phase 1: Setup and Initialization
#### Step 1.A (Verify directory structure and initialize dependencies):
*   *Target File:* `github-bot/package.json`
*   *Instructions:* Ensure `express`, `octokit`, `dotenv` are installed. Run `npm install` inside the `github-bot/` directory. 
*   *Verification:* Ensure `node_modules` is populated and no installation errors exist.

#### Step 1.B (Create basic Express server skeleton):
*   *Target File:* `github-bot/src/server.js`
*   *Instructions:* Setup Express to listen on a port (e.g. 3001). Create a health check endpoint at `GET /health`.
*   *Verification:* Write a basic test or run the server and `curl http://localhost:3001/health` to confirm it returns `200 OK`.

### Phase 2: Webhook Handling & Verification
#### Step 2.A (Implement Webhook Verification Middleware):
*   *Target File:* `github-bot/src/server.js`
*   *Instructions:* Implement a middleware to compute the HMAC-SHA256 signature using `process.env.GITHUB_WEBHOOK_SECRET` against `req.body` (using `express.raw({type: 'application/json'})`). Compare with the `X-Hub-Signature-256` header. Reject unauthorized payloads with `401`.
*   *Verification:* Write a unit test passing a known payload and secret, ensuring correct HMAC validation.

#### Step 2.B (Implement PR Event Webhook Endpoint):
*   *Target File:* `github-bot/src/server.js`
*   *Instructions:* Add `POST /api/webhook` route. Filter for `pull_request` events (`req.headers['x-github-event'] === 'pull_request'`) with actions `opened` or `synchronize`. Extract `repository.owner.login`, `repository.name`, `pull_request.number`, and `installation.id`.
*   *Verification:* Send a mock JSON payload to the endpoint and verify correct parsing/logging.

### Phase 3: GitHub API Integration (Octokit)
#### Step 3.A (Implement GitHub App Authentication):
*   *Target File:* `github-bot/src/github-service.js`
*   *Instructions:* Export a factory or class that initializes `Octokit` with `createAppAuth`. It requires `appId`, `privateKey`, and `installationId`. Provide methods for authentication.
*   *Verification:* Test with a mock `installationId` to ensure the correct authentication mechanism is triggered without crashing.

#### Step 3.B (Implement PR Diff Retrieval):
*   *Target File:* `github-bot/src/github-service.js`
*   *Instructions:* Implement a function `getPRDiff(owner, repo, pull_number)` that calls the GitHub API (`octokit.rest.pulls.get`) passing the correct headers to accept `application/vnd.github.v3.diff` media type so it returns the raw diff string.
*   *Verification:* Mock the Octokit response to verify that `getPRDiff` correctly requests and returns the diff format.

### Phase 4: Core Agent Integration
#### Step 4.A (Implement Agent HTTP Client):
*   *Target File:* `github-bot/src/agent-client.js`
*   *Instructions:* Implement `analyzeDiff(diffText)`. Use `fetch` or a similar HTTP client to `POST` the diff to `AGENT_API_URL` (e.g. `http://localhost:3000/api/analyze`) with `{ inputType: 'code', content: diffText, requireStructuredOutput: true }`. Assume it returns a JSON schema with `{ summary, comments: [{ path, line, body }] }`.
*   *Verification:* Mock `fetch` and verify correct payload shape and JSON parsing.

#### Step 4.B (Integrate Client into Webhook Flow):
*   *Target File:* `github-bot/src/server.js`
*   *Instructions:* Inside the `POST /api/webhook` handler, wire up `getPRDiff` to fetch the diff, then call `analyzeDiff` with the retrieved diff.
*   *Verification:* Write an integration test mocking `github-service` and `agent-client` to verify end-to-end flow.

### Phase 5: Feedback Delivery
#### Step 5.A (Implement PR Review Posting):
*   *Target File:* `github-bot/src/github-service.js`
*   *Instructions:* Implement `createReview(owner, repo, pull_number, summary, comments)`. Use `octokit.rest.pulls.createReview` to post the `summary` as the body and attach the line-specific inline comments formatted appropriately.
*   *Verification:* Mock Octokit to assert that `createReview` is called with the correctly mapped comments array.

#### Step 5.B (Integrate Posting into Webhook Flow):
*   *Target File:* `github-bot/src/server.js`
*   *Instructions:* After `analyzeDiff` returns the structured output, call `createReview` to publish the findings back to the GitHub PR. Ensure error handling is robust to prevent crashing the webhook server on partial failures.
*   *Verification:* Run a complete mock webhook request, expecting all mocked functions (diff fetch, analyze, create review) to be called in order.

### Phase 6: Deployment & Validation
#### Step 6.A (Create Dockerfile):
*   *Target File:* `github-bot/Dockerfile`
*   *Instructions:* Write a standard Node.js Dockerfile for the GitHub Bot. `FROM node:18-alpine`, copy `package.json`, install dependencies, copy `src`, and specify `CMD ["node", "src/server.js"]`. Expose the web server port.
*   *Verification:* Run `docker build -t github-bot ./github-bot` and verify it builds successfully.

#### Step 6.B (Write Testing & Validation Harness):
*   *Target File:* `github-bot/tests/integration.test.js`
*   *Instructions:* Create an integration test suite that mocks GitHub and the Core Security Agent. Send a simulated webhook and verify the end-to-end data flow to ensure architectural integrity without hitting real external services.
*   *Verification:* Execute `npm test` inside `github-bot/` and achieve passing results.