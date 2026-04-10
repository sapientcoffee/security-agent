# Frontend & Backend Updates for Security Agent

## Objective
Create a modern, reactive web frontend (React + Vite + Tailwind CSS) to interface with the security agent, allowing users to paste code, upload files, or provide a Git repository URL for security auditing. Update the backend to process these inputs, specifically adding the capability to clone and analyze Git repositories.

## Key Files & Context
- `frontend/`: New React + Vite project directory.
- `agent/package.json`: Will require new dependencies for Git operations (e.g., `simple-git`, `glob`).
- `agent/src/server.js`: Will be updated with a new dedicated analysis endpoint.

## Implementation Steps

### Phase 1: Backend Updates (`agent/`)
1. **Dependencies**: Install `simple-git` (for cloning repositories) and `glob` (for finding files within the cloned repo) in the `agent` project.
2. **Git Processing Utility**: 
   - Create a utility module to handle cloning a given Git URL into a temporary directory (using `os.tmpdir()`).
   - Implement logic to traverse the cloned repository, reading relevant source files while ignoring binary files, `.git`, `node_modules`, and other common noise directories.
   - Concatenate the file contents into a structured string format (e.g., `--- File: path/to/file ---\n<content>`) suitable for the LLM.
   - Ensure temporary directories are securely deleted after processing, even if errors occur.
3. **New API Endpoint**: 
   - Add a `POST /api/analyze` endpoint to `agent/src/server.js`.
   - Accept a payload like `{ inputType, content }` where `inputType` is either `'text'` (for pasted code or file uploads) or `'git'` (for repository URLs).
   - If `inputType` is `'git'`, use the new Git utility to fetch and prepare the code.
   - Pass the prepared code to the Gemini model using the existing `gemini-3-flash-preview` configuration and system instructions.
   - Return the generated Markdown report to the client.

### Phase 2: Frontend Implementation (`frontend/`)
1. **Project Setup**: Initialize a new React project using Vite in the `frontend/` directory.
2. **Dependencies**: Install Tailwind CSS, `axios` (for API requests), `lucide-react` (for icons), and `react-markdown` (for rendering the agent's report).
3. **UI Components**:
   - **Main Layout**: A clean, centered modern layout.
   - **Input Section**: Implement a tabbed interface or unified form supporting:
     - **Paste Code**: A large textarea for direct code entry.
     - **Upload File**: A file picker that reads the file content client-side using the FileReader API.
     - **Git Repository**: An input field for a valid Git URL.
   - **Loading State**: A visually appealing loading indicator/spinner while the backend is processing (Git cloning and LLM generation can take time).
   - **Results Area**: A section utilizing `react-markdown` to properly format and display the returned security audit report.
4. **Integration**: Connect the frontend form submissions to the new `http://localhost:8080/api/analyze` endpoint.

## Verification & Testing
1. **Pasted Code**: Verify that pasting a vulnerable code snippet returns a formatted markdown report.
2. **File Upload**: Verify that uploading a source code file successfully reads the text in the browser, sends it to the backend, and returns a report.
3. **Git Repository**: Verify that providing a public Git URL (e.g., a small sample repo) successfully triggers the backend clone, processes the files, cleans up the temporary directory, and returns a comprehensive report.
4. **UI/UX**: Confirm the application is responsive, styling looks modern (Tailwind), and loading states provide good user feedback.
5. **CORS**: Ensure the frontend (typically running on port 5173) can communicate with the backend on port 8080 without CORS issues.
