# Security Audit Project

This repository contains a modern, full-stack Security Audit system that uses AI to perform functional and security reviews of source code.

## 🏗️ Architecture

The system follows a decoupled client-server architecture:

- **Frontend (React + Vite + Tailwind CSS)**: A modern, reactive web application that provides a unified interface for code submission. It supports direct pasting, file uploads, and Git repository URLs.
- **Backend (Node.js/Express Agent)**: A specialized security service that processes various inputs, handles Git operations (cloning, file traversal), and interfaces with **Google Gemini 1.5 Flash** to generate comprehensive audit reports.

### Workflow
1. **Input Submission**: User provides code via the Frontend.
2. **Preprocessing**: 
   - For **Text/Files**: Content is sent directly to the backend.
   - For **Git Repos**: The backend clones the repository to a secure temporary directory, traverses the file tree (ignoring noise), and aggregates the source code.
3. **AI Analysis**: The processed code is sent to Gemini with a specialized system instruction defining its role as a Security Engineer.
4. **Report Generation**: The AI returns a Markdown-formatted report.
5. **Display**: The Frontend renders the report beautifully using `react-markdown`.

## 📁 Project Structure

- **[`/agent`](./agent)**: Node.js/Express backend service.
  - `src/server.js`: API endpoints and AI integration.
  - `src/git-processor.js`: Logic for cloning and processing Git repositories.
- **[`/frontend`](./frontend)**: React frontend application.
  - `src/App.tsx`: Main application logic and UI.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Google AI Studio API Key (set as `GOOGLE_API_KEY` in `agent/.env`)

### 1. Start the Backend Agent
```bash
cd agent
npm install
npm start
```
The backend runs on `http://localhost:8080`.

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the provided URL (usually `http://localhost:5173`) in your browser.

## 🔒 Security Note
This tool is for audit and educational purposes. Ensure you have permission to audit any code or repository you submit to the service.
