# Research Report: Enhance Web UI with real-time progress and better report visualization

## Current Implementation State

### Backend Audit Process
- **Endpoint:** `agent/src/server.js` defines `POST /api/analyze`.
- **Workflow:** Standard request-response cycle. It is asynchronous internally but does not stream updates.
- **Git Handling:** `agent/src/git-processor.js` handles cloning (via `simple-git`) and file discovery (via `glob`).
- **Progress Tracking:** None currently implemented. No events are emitted during the cloning or parsing stages.

### Frontend UI & Rendering
- **Framework:** React with TypeScript.
- **Styling:** Tailwind CSS.
- **Icons:** `lucide-react`.
- **Markdown Rendering:** `react-markdown` v9.
- **Code Blocks:** Custom rendering is defined in `App.tsx` but is limited to basic dark-themed containers without syntax highlighting.
- **State Management:** Local `useState` in `App.tsx` for `isAnalyzing`, `report`, and `error`.

### Persistence & Storage
- **Current Usage:** `localStorage` is used exclusively for a mock token in E2E tests (`VITE_ENABLE_AUTH_BYPASS`).
- **History:** No current mechanism for saving or viewing previous audit reports.

## Proposed Technical Approach

### 1. Real-time Progress (SSE)
- **Backend:** Update `agent/src/server.js` and `agent/src/git-processor.js` to accept a response object or callback to emit progress events.
- **Protocol:** Server-Sent Events (SSE) is recommended for its simplicity in one-way server-to-client updates over HTTP.
- **Events:** `cloning`, `parsing`, `analyzing`, `completed`, `error`.

### 2. Syntax Highlighting & Interactive Reports
- **Library:** `react-syntax-highlighter` (specifically the `prism` or `hljs` variants) integrated into `react-markdown`.
- **Features:** 
    - Auto-detection of language from code blocks.
    - 'Copy Fix' button using `navigator.clipboard.writeText`.
    - Improved visual contrast for remediation snippets.

### 3. Audit History Sidebar
- **Storage:** Use `localStorage` to store an array of audit metadata and full reports.
- **Schema:** `{ id, timestamp, repoUrl, report, summary }`.
- **UI:** A collapsible sidebar in `App.tsx` that populates from `localStorage` on mount.

### 4. Progress Stepper
- **Component:** A new `AnalysisProgress` component using Tailwind and `lucide-react` icons to visualize the current state received via SSE.

## Technical Grounding & Documentation
- **SSE Headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- **React SSE Client:** `new EventSource(url)` (native browser API).
- **Markdown Highlighting:** `react-markdown` `components` prop allows overriding the `code` tag with `SyntaxHighlighter`.
