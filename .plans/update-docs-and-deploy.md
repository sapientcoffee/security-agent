# Implementation Plan: Update Docs and Deploy GitHub Bot

## 📋 Micro-Step Checklist
- [x] Phase 1: Documentation Updates
  - [x] Step 1.A: Update `.gemini/GEMINI.md` to include deployment and local dev instructions for the new `github-bot`.
  - [x] Step 1.B: Create `github-bot/README.md` with explicit setup, testing, and deployment commands based on the walkthrough.
- [x] Phase 2: Cloud Deployment
  - [x] Step 2.A: Build the Docker image via Google Cloud Build.
  - [x] Step 2.B: Deploy the built image to Google Cloud Run.