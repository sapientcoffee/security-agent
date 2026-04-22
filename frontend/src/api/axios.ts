import axios from 'axios';
import { auth } from '../firebaseConfig';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});

apiClient.interceptors.request.use(
  async (config) => {
    let token = null;
    const isBypassEnabled = import.meta.env.VITE_ENABLE_AUTH_BYPASS === 'true';
    
    if (isBypassEnabled) {
      token = localStorage.getItem('E2E_BYPASS_TOKEN');
    }
    
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
