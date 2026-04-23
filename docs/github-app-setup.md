# GitHub Integration Guide

The Security Audit Platform uses a multi-tenant GitHub App model. Each user creates their own personal GitHub App which is then linked to their profile in the platform.

## 🚀 One-Click Setup (Recommended)

The easiest way to integrate is through the platform's Dashboard.

1.  **Open Dashboard:** Navigate to the platform's web interface and log in.
2.  **Start Setup:** Click the **"Setup Bot"** button on the "Automate Your Security" banner.
3.  **Create App:** You will be redirected to GitHub. Choose a name for your bot and click **"Create GitHub App"**.
4.  **Confirm Permissions:** GitHub will automatically pre-configure the necessary permissions (Pull Request: Write, Contents: Read).
5.  **Finalize:** After creation, you will be redirected back to the platform. The system will automatically capture your credentials and save them securely in Firestore.
6.  **Install:** On the final screen, click **"Install on Repositories"** to choose which of your projects the bot should monitor.

---

## 🛠 Troubleshooting & Manual Setup

If the one-click setup fails, you can manually verify the following configuration in your GitHub App settings:

### Webhook URL
Must point to the `github-security-bot` service:
`https://[YOUR_BOT_URL]/api/webhook`

### Permissions
- **Contents:** Read-only (required to fetch code)
- **Pull Requests:** Read & Write (required to post review comments)
- **Metadata:** Read-only (required by GitHub)

### Events
- **Pull Request:** Triggered on opened, synchronized, and labeled.

---

## 🗑 Deleting the Integration
If you wish to disconnect your GitHub App:
1.  Go to the **Dashboard**.
2.  Expand the **GitHub Integration** card.
3.  Click **"Delete"**.
4.  This will wipe your Private Key, App ID, and Review History from our database.
5.  *Note: You should also manually uninstall or delete the app from your GitHub account settings.*
