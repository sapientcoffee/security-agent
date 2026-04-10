# Security Audit Frontend

A modern, reactive web application built with **React**, **Vite**, and **Tailwind CSS** that provides a user-friendly interface for the Security Audit Agent.

## ✨ Features

- **Unified Code Submission**: 
  - **Paste Code**: A large, easy-to-use editor for snippets.
  - **File Upload**: Select local files to audit.
  - **Git Repo**: Provide a repository URL for full project analysis.
- **Rich Audit Reports**: Uses `react-markdown` to beautifully render security findings, complete with code highlighting, severity status, and actionable recommendations.
- **Real-time Feedback**: Includes smooth animations and informative loading states during the analysis process.

## 🛠️ Technology Stack

- **React**: Core UI library.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS**: Utility-first styling for a clean, professional aesthetic.
- **Axios**: Clean API communications.
- **Lucide React**: Modern, scalable icon set.
- **React Markdown**: Robust Markdown parsing and rendering.

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## ⚙️ Configuration
The frontend expects the backend service to be running at `http://localhost:8080/api/analyze`. Ensure the backend is started before performing audits.
