# Repository Restructure Plan

## Objective
Reorganize the current repository into a monorepo-style structure to accommodate both the existing backend AI agent and a future frontend application, adhering to best practices including proper git initialization and ignore rules.

## Scope & Impact
- Move all existing backend code, tests, dependencies, and configuration files into a new `/agent` directory.
- Create an empty `/frontend` directory for future development.
- Initialize a Git repository at the project root.
- Establish a comprehensive root `.gitignore` file to prevent tracking of sensitive data and build artifacts.
- Create a new root `README.md` to document the overall project structure.

## Implementation Steps
1. **Directory Creation**:
   - Create directories: `agent` and `frontend`.
2. **File Relocation**:
   - Move the following files and directories into `agent/`:
     - `src/`
     - `tests/`
     - `package.json`
     - `package-lock.json`
     - `.env`
     - `Dockerfile`
     - `README.md` (renamed from the original)
     - `node_modules/`
     - `server.log`
3. **Source Control Setup**:
   - Create a `.gitkeep` file in the `frontend/` directory.
   - Initialize a new git repository (`git init`) at the project root.
   - Create a root `.gitignore` file containing standard exclusions for Node.js, environment variables, logs, and OS-generated files.
4. **Documentation**:
   - Create a new `README.md` at the project root describing the monorepo structure and providing high-level instructions on how to navigate and run the sub-projects.

## Verification
- Verify that `agent/src`, `agent/package.json`, etc., exist.
- Verify that the `frontend/` directory exists.
- Verify that `git status` works at the root and correctly ignores `agent/node_modules`, `agent/.env`, and `agent/server.log`.
- Verify the root `README.md` and `.gitignore` are present and correct.
