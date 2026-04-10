# Implementation Plan: Firebase Auth Integration

## 📋 Micro-Step Checklist
- [ ] Phase 1: Dependencies & Configuration
  - [x] Step 1.A: Install Frontend Dependencies
  - [x] Step 1.B: Install Backend Dependencies
- [ ] Phase 2: Backend Authentication
  - [x] Step 2.A: Write Auth Middleware Verification Harness
  - [x] Step 2.B: Implement Firebase Admin Initialization
  - [ ] Step 2.C: Implement Token Verification Middleware
  - [ ] Step 2.D: Secure Core API Endpoints
- [ ] Phase 3: Frontend State & API
  - [ ] Step 3.A: Implement Firebase Client Initialization
  - [ ] Step 3.B: Implement Auth Context Provider
  - [ ] Step 3.C: Implement Axios Request Interceptor
- [ ] Phase 4: Frontend UI
  - [ ] Step 4.A: Implement Login Component
  - [ ] Step 4.B: Integrate Auth Routing in App.tsx

## 📝 Step-by-Step Implementation Details

### Phase 1: Dependencies & Configuration
#### Step 1.A (Install Frontend Dependencies):
*   *Target Directory:* `frontend/`
*   *Instructions:* Install `firebase`, `react-firebaseui`, and `firebaseui`. These are required for managing client-side authentication and rendering the SSO UI.
*   *Verification:* `cd frontend && npm install firebase react-firebaseui firebaseui`

#### Step 1.B (Install Backend Dependencies):
*   *Target Directory:* `agent/`
*   *Instructions:* Install `firebase-admin`. This is required to cryptographically verify the JWT tokens sent by the frontend.
*   *Verification:* `cd agent && npm install firebase-admin`

### Phase 2: Backend Authentication
#### Step 2.A (The Verification Harness):
*   *Target File:* `agent/tests/auth.test.js`
*   *Verification:* Write explicit assertions mocking `req`, `res`, and `next` to test `verifyToken`. Ensure a missing token yields a `401`, an invalid token yields a `401`, and a valid mock token successfully calls `next()` and attaches claims to `req.user`. Run `cd agent && npm test`. (Red phase).

#### Step 2.B (Firebase Admin Initialization):
*   *Target File:* `agent/src/lib/firebase.js`
*   *Instructions:* Export a configured `firebase-admin` instance. Use `applicationDefault()` for standard ADC, but provide fallback logic to initialize using credentials from a local file if `process.env.TEST_SA_KEY_PATH` or `.keys/test-sa.json` exists (as mandated in the design doc for local testing).
*   *Verification:* Ensure the file parses correctly with `node agent/src/lib/firebase.js`.

#### Step 2.C (Token Verification Middleware):
*   *Target File:* `agent/src/middleware/auth.js`
*   *Instructions:* Extract the Bearer token from the `Authorization` header. Use `admin.auth().verifyIdToken(token)`. If successful, attach the decoded payload to `req.user`. If missing or invalid, do not use a generic try/catch—throw an error with `.status = 401` using the `asyncHandler` pattern convention established in the project.
*   *Verification:* Run the test suite created in 2.A: `cd agent && npm test`. (Green phase).

#### Step 2.D (Secure Core API Endpoints):
*   *Target File:* `agent/src/server.js`
*   *Instructions:* Import `verifyToken` from `middleware/auth.js`. Register it on the core API routes (e.g., `/api/analyze` or global `/api/*` depending on structure). Ensure it plays nicely with the global error handler.
*   *Verification:* Run the backend server `cd agent && npm start` and ensure it starts without errors.

### Phase 3: Frontend State & API
#### Step 3.A (Firebase Client Initialization):
*   *Target File:* `frontend/src/firebaseConfig.ts`
*   *Instructions:* Complete the initialization using environment variables (`import.meta.env`). Ensure both `app` and `auth` are cleanly exported.
*   *Verification:* `cd frontend && npm run build` (Should build without TypeScript errors).

#### Step 3.B (Auth Context Provider):
*   *Target File:* `frontend/src/contexts/AuthContext.tsx`
*   *Instructions:* Implement the `useEffect` hook to call `onAuthStateChanged(auth, user => ... )`. Set the `user` state and toggle `loading` to false once the initial state resolves. Provide this state to `children`.
*   *Verification:* `cd frontend && npm run lint` to ensure no React Hook violations.

#### Step 3.C (Axios Request Interceptor):
*   *Target File:* `frontend/src/api/axios.ts`
*   *Instructions:* Inside the request interceptor, await the current Firebase user token via `auth.currentUser?.getIdToken()`. If available, append it to `config.headers.Authorization` as a Bearer token.
*   *Verification:* `cd frontend && npm run lint` and `npm run build`.

### Phase 4: Frontend UI
#### Step 4.A (Login Component):
*   *Target File:* `frontend/src/components/Login.tsx`
*   *Instructions:* Render `StyledFirebaseAuth` passing the `auth` instance and standard `uiConfig` (enable GoogleAuthProvider). CRITICAL: Ensure `import 'firebaseui/dist/firebaseui.css'` is present at the top to satisfy Vite bundling requirements as noted in the design.
*   *Verification:* `cd frontend && npm run build`.

#### Step 4.B (Integrate Auth Routing):
*   *Target File:* `frontend/src/App.tsx`
*   *Instructions:* Wrap the entire application in `<AuthProvider>`. Inside the main layout, consume `useAuth()`. If `loading` is true, render a spinner or null. If `user` is null, render `<Login />`. Otherwise, render the authenticated application interface.
*   *Verification:* `cd frontend && npm run build` and ensure the Vite dev server boots cleanly (`cd frontend && npm run dev`).