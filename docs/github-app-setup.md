# GitHub App Setup Guide

This guide provides step-by-step instructions for obtaining the credentials required to run the GitHub Security Review Bot.

## 1. Create the GitHub App

1.  **Navigate to GitHub Apps:** Go to your GitHub Profile -> **Settings** -> **Developer settings** -> **GitHub Apps**.
2.  **Create New App:** Click **New GitHub App**.
    *   **GitHub App name:** e.g., `Security-Audit-Bot-[YourName]`.
    *   **Homepage URL:** Your project's repository URL.
3.  **Webhook Settings:**
    *   **Webhook:** Check the "Active" box.
    *   **Webhook URL:** 
        *   For **Local Dev**: Use a proxy URL (e.g., from `smee.io`).
        *   For **Cloud**: Use your Cloud Run service URL (e.g., `https://github-security-bot-...run.app/api/webhook`).
    *   **Webhook secret:** Enter a secure random string. **Store this as `GITHUB_WEBHOOK_SECRET`.**
4.  **Permissions:**
    *   **Repository permissions** -> **Contents**: `Read-only` (to fetch code).
    *   **Repository permissions** -> **Pull requests**: `Read & write` (to post reviews).
    *   **Repository permissions** -> **Metadata**: `Read-only` (default).
5.  **Subscribe to events:**
    *   Check **Pull request** (under the "Permissions and events" section).
6.  **Create:** Click **Create GitHub App**.

## 2. Obtain Credentials

### GITHUB_APP_ID
On the **General** settings page of your new app, find the **App ID**. It is a 6-to-7 digit number.

### GITHUB_PRIVATE_KEY
1.  On the **General** page, scroll down to **Private keys**.
2.  Click **Generate a private key**.
3.  A `.pem` file will be downloaded to your computer.
4.  Open this file in a text editor. The entire content (including the `-----BEGIN...` and `-----END...` lines) is your **`GITHUB_PRIVATE_KEY`**.

### GITHUB_WEBHOOK_SECRET
This is the secret string you entered in Step 1.3 above.

---

## 3. Core Agent Integration

### AGENT_API_URL
This is the endpoint of your deployed Security Audit Agent.
1.  Go to the **Google Cloud Console** -> **Cloud Run**.
2.  Find the `security-audit-agent` service.
3.  Append `/api/analyze` to the service URL.
    *   *Example:* `https://security-audit-agent-xxxx.run.app/api/analyze`

### AGENT_API_TOKEN
The agent requires an OIDC identity token for authentication.
*   **For Development:** Generate a temporary token using `gcloud auth print-identity-token`.
*   **For Production:** The Bot service should ideally use its own Service Account identity to fetch tokens dynamically.

---

## 4. Applying the Variables

### For Local Development (.env)
```env
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_secret
AGENT_API_URL=http://localhost:8080/api/analyze
AGENT_API_TOKEN=your_token
```

### For Cloud Run Deployment
```bash
gcloud run services update github-security-bot \
  --set-env-vars="GITHUB_APP_ID=123456" \
  --set-env-vars="GITHUB_PRIVATE_KEY=$(cat path/to/key.pem)" \
  --set-env-vars="GITHUB_WEBHOOK_SECRET=your_secret" \
  --set-env-vars="AGENT_API_URL=https://agent.run.app/api/analyze" \
  --set-env-vars="AGENT_API_TOKEN=your_token"
```
