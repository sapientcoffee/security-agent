# Implementation Plan: Enhance Web UI

## 📁 Directory Structure & New Files
The following new components will be created in the frontend workspace to support the enhanced UI:
*   `frontend/src/components/AnalysisProgress.tsx`
*   `frontend/src/components/AuditHistorySidebar.tsx`
*   `frontend/src/components/CodeBlock.tsx`

## 📋 Micro-Step Checklist
- [ ] **Phase 1: Backend SSE Implementation**
  - [x] Step 1.A: Update `agent/src/git-processor.js` to accept and fire progress events.
  - [x] Step 1.B: Update `agent/src/server.js` to support SSE streaming (via POST + chunked transfer).
- [ ] **Phase 2: Frontend State & Storage**
  - [x] Step 2.A: Install `react-syntax-highlighter`.
  - [x] Step 2.B: Implement LocalStorage persistence and `auditStatus` state in `App.tsx`.
- [ ] **Phase 3: Frontend Components**
  - [x] Step 3.A: Build `AnalysisProgress.tsx` (stepper).
  - [ ] Step 3.B: Build `AuditHistorySidebar.tsx` (history menu).
  - [ ] Step 3.C: Build `CodeBlock.tsx` (syntax highlighting & copy action).
- [ ] **Phase 4: Integration**
  - [ ] Step 4.A: Integrate SSE consumption logic in `App.tsx`.
  - [ ] Step 4.B: Assemble new components into the main layout of `App.tsx`.

## 📝 Step-by-Step Implementation Details

### Phase 1: Backend SSE Implementation

#### Step 1.A (Git Processor Progress updates):
*   *Target File:* `agent/src/git-processor.js`
*   *Instructions:* 
    1. Modify `processGitRepo` signature to accept an `onProgress` callback: `async function processGitRepo(repoUrl, onProgress = () => {})`.
    2. Call `onProgress('cloning')` before cloning the repo.
    3. Call `onProgress('parsing')` before parsing files.
*   *Verification:* Ensure no existing tests break. Run `npm run test` in `agent/`.

#### Step 1.B (Server SSE Endpoint):
*   *Target File:* `agent/src/server.js`
*   *Instructions:* 
    1. Modify the `POST /api/analyze` endpoint to support SSE. *(Note: Using POST + native fetch streaming in the frontend is strongly recommended over GET + EventSource to avoid URL length limits for pasted code and to easily pass the Authorization header without query param hacks).*
    2. Set headers: `res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive');`.
    3. Ensure to use `res.write(\`data: ${JSON.stringify({ status: '...' })}\n\n\`)` format for SSE.
    4. Pass an anonymous function to `processGitRepo` that emits status changes directly to the client (`res.write`).
    5. During `getLLMModel` analysis, emit `analyzing`. Once it completes, emit the final markdown (`completed`) and call `res.end()`. Catch errors and emit an `error` status.
*   *Verification:* Add a mock test in `agent/tests/server.test.js` or verify the response headers via `curl`.

### Phase 2: Frontend Foundation & State

#### Step 2.A (Dependencies):
*   *Target Directory:* `frontend/`
*   *Instructions:* Run `npm install react-syntax-highlighter` and `npm install -D @types/react-syntax-highlighter`.
*   *Verification:* Ensure `package.json` updates successfully.

#### Step 2.B (State Management):
*   *Target File:* `frontend/src/App.tsx`
*   *Instructions:* 
    1. Introduce the `AuditRecord` and `AuditHistory` types as defined in the Design Doc.
    2. Add state hooks: `auditStatus` (`idle`, `cloning`, `parsing`, `analyzing`, `completed`, `error`), `history` (initialized lazily from `localStorage.getItem('auditHistory')`), and `selectedHistoryId` (string | null).
    3. Write a helper function `saveToHistory(report)` that creates an `AuditRecord`, appends it to state, and syncs to `localStorage`.
*   *Verification:* Ensure types compile (`npm run build` in frontend).

### Phase 3: Frontend Components

#### Step 3.A (Analysis Progress Stepper):
*   *Target File:* `frontend/src/components/AnalysisProgress.tsx`
*   *Instructions:* 
    1. Create a Stepper component accepting a `currentStep` prop (`'idle' | 'cloning' | 'parsing' | 'analyzing' | 'completed' | 'error'`).
    2. Use Tailwind and `lucide-react` icons (e.g., spinning loaders vs checkmarks) to show active, completed, or pending states for each stage.
*   *Verification:* Ensure the component mounts correctly and styles are applied.

#### Step 3.B (Audit History Sidebar):
*   *Target File:* `frontend/src/components/AuditHistorySidebar.tsx`
*   *Instructions:* 
    1. Accept props: `history: AuditRecord[]`, `onSelect: (id: string) => void`, `selectedId: string | null`.
    2. Render a collapsible sidebar containing a list of history cards.
    3. Each card should show a derived summary (or truncated report), the repo URL/Type, and timestamp.
*   *Verification:* Component maps over a mock array correctly and responds to clicks.

#### Step 3.C (Code Block Renderer):
*   *Target File:* `frontend/src/components/CodeBlock.tsx`
*   *Instructions:* 
    1. Export a component that wraps `react-syntax-highlighter` (using the `prism` build for performance/aesthetics).
    2. Add a relative container with an absolutely positioned "Copy" button (`lucide-react` clipboard icon).
    3. Use `navigator.clipboard.writeText` to copy the code block contents, temporarily updating state to show "Copied!" for feedback.
*   *Verification:* Verify button click triggers clipboard copy and displays feedback text.

### Phase 4: Integration

#### Step 4.A (SSE Consumption):
*   *Target File:* `frontend/src/App.tsx`
*   *Instructions:* 
    1. Refactor `handleAnalyze` to use native `fetch` with `response.body.getReader()` to consume the SSE stream. (This avoids the GET limits and allows passing the `Authorization: Bearer <token>` header).
    2. Parse the incoming UTF-8 chunks using `TextDecoder` to extract `data: {...}` lines.
    3. Update `auditStatus` state based on received events.
    4. On `status === 'completed'`, set the final report in state, reset the processing status, and call `saveToHistory()`.
*   *Verification:* Run `npm run dev` and test a repository audit. Console logs should verify streaming chunks are parsed.

#### Step 4.B (Final Assembly):
*   *Target File:* `frontend/src/App.tsx`
*   *Instructions:* 
    1. Embed `<AuditHistorySidebar>` in the main layout (e.g., as a left sidebar or drawer).
    2. Render `<AnalysisProgress>` dynamically when `auditStatus !== 'idle'`.
    3. Update the `components` prop of `<ReactMarkdown>` by passing the new `<CodeBlock>` for the `code` override.
*   *Verification:* Perform an end-to-end run. Verify progress visual updates, markdown syntax highlighting with working copy buttons, and that the successful run is stored in the history sidebar.