# Security Audit Project

This repository contains the complete Security Audit system, composed of an AI-powered backend agent and a frontend application.

## Project Structure

- **`/agent`**: The backend Node.js remote agent that interfaces with Google AI Studio and the Gemini CLI. [View Agent README](./agent/README.md)
- **`/frontend`**: The frontend web application (Coming soon).

## Development

To run the agent locally:

```bash
cd agent
npm install
npm run dev
```

## Deployment

The backend agent can be deployed to Google Cloud Run as a containerized service. Refer to the documentation in `/agent` for more details.
