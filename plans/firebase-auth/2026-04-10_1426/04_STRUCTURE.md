# Directory Structure & File Skeletons

This document outlines the structural boundaries and the specific file components required for the Firebase Authentication & Token Pass-through implementation.

## Structural Boundaries

### 1. Frontend Boundary (`frontend/src/`)
The frontend is responsible for the user interface, session maintenance (via Firebase's SDK), and injecting the authorization token into outbound requests.

*   `frontend/src/firebaseConfig.ts`: Entry point for Firebase SDK initialization.
*   `frontend/src/contexts/AuthContext.tsx`: React Context for providing authentication state to the component tree.
*   `frontend/src/components/Login.tsx`: UI component for handling the SSO redirect and login flow.
*   `frontend/src/api/axios.ts`: Axios client configured to intercept requests and append the JWT.

### 2. Backend Boundary (`agent/src/`)
The backend is purely stateless. It relies on cryptographically verifying the incoming token. 

*   `agent/src/lib/firebase.js`: Initializes Firebase Admin with ADC or local service accounts.
*   `agent/src/middleware/auth.js`: Express middleware to validate tokens and extract user context.

## File Interfaces & Signatures

### `frontend/src/firebaseConfig.ts`
```typescript
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';

export const app: FirebaseApp;
export const auth: Auth;
```

### `frontend/src/contexts/AuthContext.tsx`
```typescript
export interface AuthContextType {
  user: import('firebase/auth').User | null;
  loading: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }>;
export const useAuth: () => AuthContextType;
```

### `frontend/src/components/Login.tsx`
```typescript
export const Login: React.FC;
```

### `frontend/src/api/axios.ts`
```typescript
import { AxiosInstance } from 'axios';
const apiClient: AxiosInstance;
export default apiClient;
```

### `agent/src/lib/firebase.js`
```javascript
// Exports initialized firebase-admin instance
module.exports = { admin };
```

### `agent/src/middleware/auth.js`
```javascript
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyToken = async (req, res, next) => {};

module.exports = { verifyToken };
```
