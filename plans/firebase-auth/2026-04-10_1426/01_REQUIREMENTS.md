# 01_REQUIREMENTS: Firebase Authentication & Token Pass-through

## Objective
Implement a secure authentication layer using Firebase for the Workstation Portal to protect both the React frontend and the backend API.

## User Stories
- As a **Developer**, I want to ensure only authorized users can access the Workstation Portal to prevent unauthorized resource usage.
- As a **User**, I want to log in using my Google account for ease of access and security.
- As an **Admin**, I want the backend to verify tokens for every request to ensure system integrity.

## Scope & Constraints
- **Authentication Provider**: Google (via Firebase).
- **Frontend UI**: Utilize `firebaseui` or `react-firebaseui` for a standard login experience.
- **Access Control**: Entire application is protected; unauthenticated users should be redirected to a login screen.
- **Backend Verification**: Use `firebase-admin` to verify the ID token on every API request.
- **Authorization**: All API requests must include the `Authorization: Bearer <ID_TOKEN>` header.
- **Tech Stack**:
    - Frontend: React, Firebase JS SDK.
    - Backend: Node.js, Express, Firebase Admin SDK.

## Firebase Configuration (Source of Truth)
```javascript
apiKey: "[REDACTED]",
authDomain: "coffee-and-codey.firebaseapp.com",
projectId: "coffee-and-codey",
storageBucket: "coffee-and-codey.firebasestorage.app",
messagingSenderId: "300502296392",
appId: "[REDACTED]",
measurementId: "G-7PX49DJS5F"
```

## Success Criteria
- [ ] Users see a Firebase login screen when accessing the app without being authenticated.
- [ ] Successful Google login redirects to the main portal dashboard.
- [ ] All frontend-to-backend API calls include the Firebase ID Token in the Authorization header.
- [ ] Backend middleware `verifyToken` correctly validates the JWT and extracts user info.
- [ ] Unauthorized backend requests return a 401 Unauthorized status.
