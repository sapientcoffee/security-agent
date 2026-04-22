# Cloud Run Deployment Plan

## Objective
Deploy both the Backend (`agent`) and Frontend (`frontend`) components of the Security Audit application to Google Cloud Run in the `us-east1` region, utilizing existing local `.env` files for configuration.

## Key Files & Context
- `agent/Dockerfile` & `agent/.env`
- `frontend/Dockerfile` & `frontend/.env`
- Google Cloud Project: `coffee-and-codey`

## Implementation Steps

### Phase 1: Backend (Agent) Deployment
The backend must be deployed first so we can obtain its public URL, which the frontend needs.

1.  **Extract API Key:**
    Read the `GOOGLE_API_KEY` from `agent/.env`.
2.  **Deploy Source:**
    Execute `gcloud run deploy security-audit-agent` pointing to the `./agent` directory, setting the `GOOGLE_API_KEY` as a runtime environment variable.
3.  **Capture URL:**
    Retrieve the newly generated Cloud Run Service URL for the backend.

### Phase 2: Frontend (UI) Deployment
The frontend requires build-time arguments to embed configuration (like Firebase settings and the API URL) into the static build.

1.  **Update API URL:**
    Temporarily update the `VITE_API_URL` value in memory to the newly captured backend Cloud Run URL from Phase 1.
2.  **Local Docker Build:**
    Source the variables from `frontend/.env` (and use the new `VITE_API_URL`). Build the Docker image tagged for Google Container Registry (e.g., `gcr.io/coffee-and-codey/security-audit-frontend`).
3.  **Push Image:**
    Push the built image to GCR via `docker push`.
4.  **Deploy Image:**
    Execute `gcloud run deploy security-audit-frontend` using the pushed image.

## Verification & Testing
-   Access the frontend Cloud Run URL in a browser.
-   Ensure the UI loads correctly without Firebase initialization errors.
-   Perform a test code submission to verify successful communication with the backend service.