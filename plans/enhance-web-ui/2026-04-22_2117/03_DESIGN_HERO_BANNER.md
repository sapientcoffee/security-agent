# Design Update: GitHub Setup Hero Banner

## Objective
The current "Automate Your Security" (GitHub Setup) banner is awkwardly constrained within the narrow left sidebar. It feels like secondary information and fails to deliver the high-impact "Power User Upgrade" experience intended. This design update relocates the component to the main workspace and transforms it into a premium Hero Banner, while providing a sleek, compact state for configured users.

## 1. Architectural Placement (`frontend/src/App.tsx`)
**Goal:** Liberate the banner from the sidebar and place it at the top of the main application flow.
*   **Remove:** Delete both `<GitHubSetup mode="config" />` elements currently nested inside the `<AuditHistorySidebar>` components (around line 308 for desktop, and 335 for mobile overlay).
*   **Insert:** Place a single `<GitHubSetup mode="config" />` directly inside the `<main>` container, right at the top of the `<div className="max-w-6xl mx-auto space-y-8">`. This will ensure the component spans the full width of the main content area, sitting prominently above the intro header and input tabs.

## 2. Component Visual Redesign (`frontend/src/components/GitHubSetup.tsx`)

### State A: Unconfigured (The "Power User" Hero Banner)
When the user has not yet configured the GitHub app, the banner needs to feel expansive, modern, and compelling.
*   **Background & Effects:** Enhance the gradient to a richer tech palette: `bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-800`. Keep the existing glassmorphism blur orb (`bg-white/10 blur-3xl`), but consider adding a second subtle orb on the bottom left for depth.
*   **Typography:** Update the main heading to exactly **"Automate Your Security Reviews"**. Ensure the subtext is legible and compelling.
*   **Call to Action:** Change the button text from "Setup Bot" to **"Connect GitHub"**. Ensure padding and margins are generous (`p-10` or `p-12` on larger screens) to utilize the new full-width placement effectively.

### State B: Configured (The "Compact Status Bar")
Once connected, a large hero banner wastes valuable vertical space. The existing "Collapsible Config Card" needs to be significantly slimmed down into an integrated notification bar.
*   **Container Slimming:** Change the large padded card (`p-6`) to a sleek, horizontal strip (`px-6 py-4`). Reduce the shadow to `shadow-sm` and roundings to `rounded-2xl` for a tighter UI fit.
*   **Header Reformatting:** 
    *   Change the layout to a single horizontal line (using `flex-row`, `items-center`).
    *   Reduce the GitHub icon size from `24` to `20` and its container padding.
    *   Display the text **"GitHub Bot Active"** (or the app name) alongside a pulsing green dot and text like "Monitoring Pull Requests".
*   **Actionable Indicator:** Add a clear **"Manage"** text link next to the chevron toggle to make it obvious that the slim bar can be expanded to view repository stats and deletion options.
*   **Expanded Content:** The dropdown content (Last Review, Repositories, Manage Installation, Delete) remains functionally the same but should have its padding reduced (`px-6 pb-6 pt-0`) to match the slimmed header.

## UX Goal Check
By implementing these two distinct states in the main workspace, we achieve the "Feature Unlock" feeling. New users are greeted with a beautiful, wide advertisement for the automation feature. Once they connect, the UI gracefully collapses out of the way, confirming their "Power User" status via a professional, unobtrusive status bar while maximizing space for their manual review tasks.