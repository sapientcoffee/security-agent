# Design Proposal: Web UI Layout Enhancement

## 1. Addressing the "Black Section" & Dark Elements
The primary cause of the user-reported "big black section" was likely Vite's default dark mode styles being injected into the `<body>` element when the user's OS is in Dark Mode, which clashed with the forced `bg-gray-50` and white cards. Your fix in `index.css` (`color-scheme: light`) resolves the root issue. 

However, there are still a few stark, high-contrast dark elements that create "black sections" in the layout:
*   **`CodeBlock.tsx`:** Uses `bg-gray-900` for the container and the `vscDarkPlus` theme for syntax highlighting. If an audit report contains many code snippets, the report becomes dominated by heavy, blocky dark bands.
*   **`GitHubSetup.tsx`:** The "Manage Installation" button uses `bg-gray-900`.
*   **Mobile Overlay:** `AuditHistorySidebar.tsx` uses a `bg-black/20` overlay (which is fine, but worth noting).

## 2. Space Optimization & Layout Overhaul

### Current State
The application uses a single, centered, vertical column layout (`max-w-4xl`). On wide desktop screens (1080p, 1440p, 4k), this leaves massive empty margins on the left and right sides. Furthermore, the core Audit flow is visually interrupted by large "GitHub Setup" and "GitHub Review History" sections stacked above and below it.

### Proposed Dashboard Layout
We should shift from a single-column landing page style to a standard web app dashboard layout (Sidebar + Main Content area).

1.  **Persistent Top Navigation Bar (Header)**
    *   **Action:** Move the Logo, Title, "New Audit" button, and "Sign Out" button into a fixed top navbar (`h-16`, `border-b`, `bg-white`).
    *   **Benefit:** Keeps primary actions accessible at all times, freeing up vertical space in the content area.

2.  **Persistent Left Sidebar (History & Integrations)**
    *   **Action:** On desktop (`lg:flex`), lock the `AuditHistorySidebar` to the left side (`w-80`).
    *   **Action:** Move the "GitHub Review History" (`<GitHubSetup mode="history" />`) into this sidebar as a secondary tab (e.g., "Web Audits" vs "GitHub PRs").
    *   **Action:** Move the "GitHub Setup" config banner (`<GitHubSetup mode="config" />`) to the bottom of this sidebar as a compact "Integration Status" card, removing it from the main audit flow.
    *   **Benefit:** Consolidates all history and configuration into a secondary zone, keeping the main workspace pristine.

3.  **Expansive Main Workspace (The Audit Flow)**
    *   **Action:** The central area (`flex-1`) will now house *only* the Audit Input Tabs (Code, File, Git) and the resulting Audit Report.
    *   **Action:** Expand the max-width (e.g., `max-w-6xl` or `w-full max-w-screen-xl`) so the report and code blocks can utilize horizontal space effectively.
    *   **Benefit:** Code lines in reports will wrap less frequently, making analysis much easier to read.

## 3. Report Visualization (`CodeBlock.tsx` Styling)
To prevent the report from feeling too dark and fragmented, we need to adjust how code snippets are rendered inside the markdown.

### Option A: Light Mode Integration (Recommended)
Switch the code blocks to a light theme to make the report feel like a cohesive, printable document.
*   **Theme:** Change `vscDarkPlus` to a light theme (like GitHub Light or a custom light slate theme).
*   **Container:** `bg-gray-50 border border-gray-200 text-gray-800`.
*   **Benefit:** Seamless integration with the white report card.

### Option B: Softer Dark Mode
If dark code blocks are preferred for readability/contrast, soften them.
*   **Theme:** Use a softer syntax theme like `nord`, `dracula`, or `github-dark`.
*   **Container:** Change `bg-gray-900` to `bg-slate-800` or `#0d1117`.
*   **Fix:** Remove the internal padding from the syntax highlighter component so it doesn't create a double-border effect with the outer Tailwind container.

## Next Steps for Implementation
1.  **Refactor `App.tsx`:** Implement a standard `flex h-screen overflow-hidden` wrapper.
2.  **Update `AuditHistorySidebar.tsx`:** Add a desktop view mode (remove absolute positioning/backdrop on `lg` screens).
3.  **Relocate Components:** Move `<GitHubSetup>` instances out of the main column and into the sidebar.
4.  **Style `CodeBlock.tsx`:** Apply the light theme (Option A) to better integrate with the light UI.