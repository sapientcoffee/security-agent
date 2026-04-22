# 02_RESEARCH_REPORT: Firebase Authentication & Token Pass-through

## Codebase Analysis

### Frontend Structure (`frontend/`)
- **Technology Stack**: Vite, React 18, Axios for API requests.
- **Entry Point**: `frontend/src/main.tsx`.
- **Main Application**: `frontend/src/App.tsx`.
- **Routing**: No formal routing library (e.g., React Router) is currently used. Navigation between views is managed via local component state.
- **API Communication**: The `handleAnalyze` function in `App.tsx` sends POST requests to `http://localhost:8080/api/analyze` using `axios`.
- **Firebase Status**: No Firebase dependencies or configurations currently exist.

### Backend Structure (`agent/`)
- **Technology Stack**: Node.js, Express, Google Generative AI SDK.
- **Entry Point**: `agent/src/server.js`.
- **Middleware Pattern**: The server uses a custom logging and request correlation middleware pattern (using `AsyncLocalStorage` and `winston`).
- **Configuration**: Managed via `.env` and loaded using `dotenv`.
- **API Endpoints**: Key endpoints include `/api/analyze`, `/agent-card`, and `/v1/message:send`.
- **Firebase Status**: No Firebase Admin SDK or authentication middleware currently exists.

## Technical Grounding (External Research)

### Frontend: `react-firebaseui` and React 18
- `react-firebaseui` is a wrapper for the `firebaseui-web` library.
- **Integration**:
    1.  Initialize Firebase using `initializeApp(config)`.
    2.  Use the `<StyledFirebaseAuth />` component from `react-firebaseui`.
    3.  Manage user state using `onAuthStateChanged` from `firebase/auth`.
- **Auth Flow**: Users sign in via Google OAuth. The ID token is retrieved using `user.getIdToken()`.

### Backend: `firebase-admin` and Express
- **Initialization**: Requires a service account key or standard ADC if running on GCP.
- **Middleware**: A `verifyToken` middleware should:
    1.  Extract the token from the `Authorization: Bearer <TOKEN>` header.
    2.  Call `admin.auth().verifyIdToken(token)`.
    3.  Attach the decoded user information to the `req` object (e.g., `req.user`).
    4.  Return 401 Unauthorized if the token is missing or invalid.

## Integration Strategy

### Frontend
1.  **Add Dependencies**: `npm install firebase react-firebaseui firebaseui`.
2.  **Firebase Config**: Store in a separate file (e.g., `frontend/src/firebaseConfig.ts`) or inject directly in `main.tsx`.
3.  **Auth State**: Wrap the `App` component with an `AuthProvider` (custom context) to provide user info globally.
4.  **Login UI**: Create a `Login` component using `react-firebaseui` and conditionally render it if the user is not authenticated.
5.  **API Requests**: Intercept or update `axios` calls to include the `Authorization` header with the current ID token.

### Backend
1.  **Add Dependencies**: `npm install firebase-admin`.
2.  **Firebase Admin SDK**: Initialize in `agent/src/server.js` or a new `agent/src/lib/firebase.js`.
3.  **Auth Middleware**: Create `agent/src/middleware/auth.js` to implement token verification.
4.  **Middleware Registration**: Register `authMiddleware` in `agent/src/server.js` before API routes.
5.  **Service Account**: Ensure the backend has access to a service account with "Firebase Authentication Admin" permissions.

## Identified Risks & Unknowns
- **Service Account Access**: Need to confirm if the backend has an existing service account or if one needs to be created for `firebase-admin`.
- **Vite Compatibility**: Ensure `firebaseui` styles are correctly imported in the Vite build.
- **Port Conflict**: Current frontend/backend ports are fixed (5173/8080); ensure no conflicts during development.
