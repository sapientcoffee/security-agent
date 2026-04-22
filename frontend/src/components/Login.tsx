import React from 'react';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider } from 'firebase/auth';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import 'firebaseui/dist/firebaseui.css';
import { Shield } from 'lucide-react';

const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    GoogleAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    signInSuccessWithAuthResult: () => false,
  },
};

export const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl">
          <Shield size={40} strokeWidth={2.5} />
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome</h1>
          <p className="mt-2 text-gray-500">
            Sign in to the Security Audit Agent to analyze your code.
          </p>
        </div>

        <div className="py-4">
          <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={auth} />
        </div>

        <footer className="text-xs text-gray-400">
          &copy; 2026 Security Audit Agent &bull; Powered by Google Gemini
        </footer>
      </div>
    </div>
  );
};
