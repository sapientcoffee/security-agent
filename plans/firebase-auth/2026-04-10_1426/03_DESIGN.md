# High-Level Design: Firebase Authentication & Token Pass-through

## 1. Architectural Approach
We are implementing a **Stateless, Token-Based Authentication Architecture** utilizing Firebase Auth. 

- **Frontend (React/Vite)**: Acts as the authentication client. It integrates `react-firebaseui` for Google Single Sign-On (SSO) and manages short-lived JWTs (ID Tokens).
- **Backend (Node/Express)**: Acts as a stateless resource server. It utilizes `firebase-admin` to cryptographically verify the JWT on every protected API request.
- **Pattern Alignment**: We are adopting a standard API Gateway/Middleware pattern for authorization. The backend will not maintain session state; all authorization context is derived from the verified bearer token. 
- **Trade-offs**: Choosing Firebase Auth reduces operational overhead and simplifies Google integration. Relying on `react-firebaseui` accelerates frontend development but trades off highly customized UI control for a standardized Firebase look-and-feel.

## 2. Authentication Flow
1. **Unauthenticated Access**: User navigates to the Workstation Portal.
2. **Local State Check**: React `AuthContext` checks Firebase `onAuthStateChanged`.
3. **Login Prompt**: If no user is found, the application renders the `Login` component containing `react-firebaseui`.
4. **Authentication**: User authenticates via Google OAuth.
5. **Token Acquisition**: Firebase SDK seamlessly retrieves and refreshes the ID Token (`user.getIdToken()`).
6. **Authenticated Request**: The React app (via an `axios` request interceptor) attaches `Authorization: Bearer <ID_TOKEN>` to all backend API calls.
7. **Token Verification**: Backend Express middleware intercepts the request, extracts the token, and verifies it using `admin.auth().verifyIdToken()`.
8. **Authorization Decision**: 
   - If valid, the decoded user payload is attached to `req.user` and the request proceeds.
   - If invalid or missing, the middleware immediately rejects the request with a `401 Unauthorized` status.

## 3. Component Hierarchy & Skeletons

### Frontend (`frontend/src/`)
- **`firebaseConfig.ts`**: Initializes the Firebase application using the provided configuration variables.
- **`contexts/AuthContext.tsx`**: A React Context Provider wrapping `firebase.auth().onAuthStateChanged` to supply global `user` and `loading` state to the component tree.
- **`components/Login.tsx`**: Wraps and renders the `<StyledFirebaseAuth />` component.
- **`App.tsx`**: Acts as the primary routing boundary (in the absence of a formal routing library). Conditionally renders `<Login />` if `user` is null, otherwise renders the main dashboard UI.
- **`api/axios.ts`**: Configures an Axios instance with a request interceptor to dynamically fetch and inject the latest Firebase ID token into request headers.

### Backend (`agent/src/`)
- **`lib/firebase.js`**: Initializes the `firebase-admin` application.
- **`middleware/auth.js`**: Express middleware (`verifyToken`) that performs JWT validation, leveraging `asyncHandler` for proper error propagation.
- **`server.js`**: Global registration of `verifyToken` middleware to protect core API endpoints (e.g., `/api/analyze`).

## 4. Data Structures

### Frontend Auth State (`AuthContext`)
```typescript
interface AuthContextType {
  user: import('firebase/auth').User | null;
  loading: boolean;
}
```

### Backend Request Payload (`req.user`)
The decoded JWT claims will be attached to the Express request object for downstream use:
```javascript
req.user = {
  uid: "firebase-unique-id",
  email: "user@example.com",
  email_verified: true,
  // ...other decoded JWT claims from Firebase
};
```

## 5. Risk Mitigation (From Research)

- **Service Account Access**: To initialize `firebase-admin` securely on the backend, we will rely on Google Cloud Application Default Credentials (ADC) where possible. For local environments, we will fall back to a `.env` specified Service Account Key path (aligning with project mandate: `TEST_SA_KEY_PATH` or `.keys/test-sa.json`).
- **Vite Compatibility**: The Vite build pipeline requires proper CSS imports for `firebaseui`. We will ensure `import 'firebaseui/dist/firebaseui.css'` is explicitly present in the `Login.tsx` component to prevent unstyled rendering.
- **Port Conflicts**: We will ensure development scripts strictly bind to their intended ports (5173 for frontend, 8080 for backend) to prevent cross-origin or proxy configuration issues.
- **API Error Handling**: Following project mandates, the auth middleware will utilize the existing `asyncHandler` pattern in `server.js` and throw errors with a `.status = 401` property rather than using generic `try/catch` blocks.