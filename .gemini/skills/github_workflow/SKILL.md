---
name: github-workflow
description: Provides the process for raising git commits, checking branches, and creating PRs using the gh CLI. Use this when the user needs to commit code or open a pull request.
---

## 1. Branch Management & Context Awareness
Before writing any code, you must ensure you are working in the correct context to avoid merge conflicts or accidental commits to protected branches.

### Verify Your Location
* **Check Current Branch:** `git branch --show-current`
* **Check Working Directory:** `git status` (Ensure no stray files from previous tasks are present).

### The Sync-and-Branch Process
Always start your work by syncing with the remote source of truth.
```bash
# Sync your local main branch with the remote repository
gh repo sync

# Create and switch to a new feature branch
# Format: <type>/<short-description>
git checkout -b feat/add-user-auth
```

**Common Branch Prefixes:**
- `feat/`: New functionality.
- `fix/`: Bug fixes.
- `docs/`: Documentation updates.
- `refactor/`: Code changes that neither fix bugs nor add features.

## 2. Raising Quality Commits
Commits should be "atomic," meaning each commit contains one logical change. We follow the Conventional Commits specification.

### Commit Message Format
`type(scope): description`

- **Type:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- **Scope:** (Optional) The specific module affected (e.g., `api`, `middleware`).
- **Description:** Use the imperative mood ("add" instead of "added").

**Example:**
`feat(ui): add loading spinner to login button`

### Staging Changes
Review your changes before committing to ensure no "debug" code (like `console.log`) is included.
```bash
# Review and stage specific hunks of code
git add -p

# Commit with a clear message
git commit -m "feat(api): implement password hashing"
```

## 3. Pre-Flight Checklist (Verification)
**Strict Rule:** Never raise a Pull Request (PR) until your code has passed all local checks. This saves CI/CD resources and reviewer time.

1. **Run Tests:** Execute the project's test suite (e.g., `npm test`, `pytest`, `go test ./...`).
2. **Linting:** Run the linter to ensure code style consistency.
3. **Local Build:** Verify the project still builds/compiles.
4. **Final Rebase:** Pull the latest changes from main and rebase your branch to resolve conflicts locally.

```bash
git fetch origin
git rebase origin/main
```

## 4. Raising a Pull Request with gh CLI
The GitHub CLI allows you to create and manage PRs without leaving your terminal.

### Create the PR
Initiate the interactive PR creation process:
```bash
gh pr create
```

**Recommended Flags:**
- `--web`: Opens the PR in your browser for a final visual review before submitting.
- `--fill`: Automatically populates the title and body based on your commit history.
- `--reviewer "@username"`: Assigns a teammate for review.

### PR Description Standard
A good PR provides context. Use the following structure in the description:
- **Summary:** What does this PR do and why?
- **Changes:** A bulleted list of technical implementation details.
- **Testing:** How did you verify these changes?
- **Issues:** Reference any related tickets (e.g., `Closes #101`).

## 5. Post-Submission Monitoring
After raising the PR, use the CLI to monitor the "health" of your contribution.

| Action | Command |
| --- | --- |
| Check CI Status | `gh pr checks` |
| View PR Status | `gh pr status` |
| Merge (if approved) | `gh pr merge --squash --delete-branch` |

## 6. Git & CLI Cheat Sheet

| Task | Command |
| --- | --- |
| Sync Repo | `gh repo sync` |
| New Branch | `git checkout -b <name>` |
| Stage Changes | `git add -p` |
| Check PRs | `gh pr list` |
| Review a PR | `gh pr checkout <number>` |
