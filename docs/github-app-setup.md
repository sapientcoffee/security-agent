# GitHub App Setup Guide

This guide provides two ways to setup your GitHub App: the **Automated "One-Click" Method** (Recommended) and the **Manual Method**.

## 🚀 1. Automated Setup (Recommended)

GitHub supports "Manifests" which allow you to pre-configure an app with one click.

1.  **Open the Generator:** Locate the `github-bot/create-app.html` file in this repository.
2.  **Open in Browser:** Open this file in your web browser.
3.  **Click "Create GitHub App":** This will redirect you to GitHub with all permissions and events pre-selected.
4.  **Finalize:** GitHub will ask you to name the app and provide a webhook secret.
5.  **Download Key:** After creation, GitHub will redirect you back, and you will be prompted to generate and download your private key.

---

## 2. Manual Setup (Alternative)

If the automated method doesn't work for you, follow these steps:
...

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
