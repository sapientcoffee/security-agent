# High-Level Design: Enhance Web UI

This document synthesizes the requirements and research to define the architectural approach for introducing real-time progress updates, enhanced markdown visualization, and audit history to the Security Agent web UI.

## 1. Server-Sent Events (SSE) Integration

To provide granular progress feedback without the overhead of WebSockets, we will use Server-Sent Events (SSE).

*   **Backend Approach:** 
    *   The `agent/src/server.js` endpoint needs to support SSE. We will introduce a `GET /api/analyze/stream` endpoint (or modify the existing endpoint to accept `GET` requests for SSE compatibility, as native `EventSource` relies on `GET`). 
    *   The endpoint will set the required headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`.
    *   During the audit process (`agent/src/git-processor.js` and subsequent AI analysis), the backend will use `res.write()` to emit serialized JSON events corresponding to the stages: `cloning`, `parsing`, `analyzing`, and finally `completed` (with the markdown payload) or `error`.
*   **Frontend Approach:**
    *   The frontend will initiate the audit using the native `new EventSource(url)` API.
    *   We will attach event listeners for `message` (or specific named events) to update the UI state.
    *   Existing error handling is maintained by listening to the `error` event on the `EventSource`, surfacing the error message to the user, and immediately calling `source.close()` to terminate the connection.

## 2. Component Architecture

We will introduce two new primary structural components to maintain a clean UI while expanding functionality.

*   **`AnalysisProgress` (Stepper Component):**
    *   **Responsibility:** Visually represent the current stage of the audit (Cloning Repository → Parsing Files → AI Analysis).
    *   **Props:** Accepts a `currentStep` prop (e.g., `'cloning' | 'parsing' | 'analyzing' | 'completed'`).
    *   **Design:** A vertical or horizontal stepper utilizing Tailwind CSS for layout and styling, and `lucide-react` for iconography (e.g., spinning loaders for the active step, checkmarks for completed steps).
*   **`AuditHistorySidebar` (Sidebar Component):**
    *   **Responsibility:** Display a list of previous audits and allow users to select one to view the cached report.
    *   **Design:** A collapsible sidebar (positioned on the left or right). It will iterate over the history state and render summary cards for each past audit. Clicking a card will populate the main content area with the selected report.

## 3. Markdown Enhancement

To improve readability and actionability for developers and security auditors, we will enhance how markdown reports are rendered.

*   **Syntax Highlighting:** We will integrate `react-syntax-highlighter` (using the `prism` build for a good balance of performance and aesthetics) into our existing `react-markdown` setup.
*   **Implementation Strategy:**
    *   We will provide a custom `components` object to the `<ReactMarkdown>` component.
    *   We will override the default `code` element. If the `inline` prop is true, we render a standard inline `<code>` tag. If false, we extract the language (e.g., `language-javascript`) and render the `SyntaxHighlighter` component.
*   **Interactive 'Copy Fix' Button:**
    *   Within our custom `code` component override, we will wrap the `SyntaxHighlighter` in a relative container.
    *   We will absolutely position a "Copy" button (using `lucide-react` clipboard icon) in the top-right corner.
    *   The button will utilize `navigator.clipboard.writeText(children)` to copy the raw code block content to the user's clipboard, displaying a brief "Copied!" feedback state.

## 4. Data Schema

To fulfill the requirement for audit history while planning for a future Firestore migration, we will use a structured schema persisted in the browser's `localStorage` under the key `auditHistory`.

```typescript
// LocalStorage Key: 'auditHistory'
type AuditRecord = {
  id: string;          // Unique identifier (UUID or timestamp-based)
  timestamp: number;   // Epoch timestamp of when the audit completed
  repoUrl: string;     // The URL of the repository audited
  report: string;      // The full markdown string of the AI audit report
  summary: string;     // A derived short summary (e.g., "3 High Severities found")
};

// State representation
type AuditHistory = AuditRecord[];
```
This flat array structure maps perfectly to a future Firestore collection where each `AuditRecord` represents a document.

## 5. State Management

The introduction of progress tracking and history requires expanding the local state in `App.tsx`.

*   **New State Variables in `App.tsx`:**
    *   `auditStatus`: Tracks the granular SSE state (`'idle' | 'cloning' | 'parsing' | 'analyzing' | 'completed' | 'error'`). This replaces the binary `isAnalyzing` boolean.
    *   `history`: An array of `AuditRecord` objects. Initialized lazily from `localStorage` on component mount.
    *   `selectedHistoryId`: A string (or null) tracking which historical report is currently being viewed. If null, the UI shows the standard input form or the current active audit.
*   **State Transitions:**
    *   When an audit begins, `auditStatus` moves through the progression states, driving the `AnalysisProgress` component.
    *   Upon completion, the final report is appended to the `history` state, persisted to `localStorage`, and `selectedHistoryId` is set to the new record's ID to display it.
    *   Selecting an item from the `AuditHistorySidebar` updates `selectedHistoryId`, swapping the main view to render the cached markdown report instead of the input form.