import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { Github, Loader2, CheckCircle, ExternalLink, AlertCircle, Clock, Database, Trash2 } from 'lucide-react';

interface GitHubConfig {
  configured: boolean;
  appId?: string;
  name?: string;
  htmlUrl?: string;
  installedAt?: any;
  lastTriggeredAt?: any;
  repositories?: string[];
}

export function GitHubSetup() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'finalizing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    // Prevent double-initialization in React StrictMode
    if (initializationRef.current) return;
    initializationRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Clear the code from the URL immediately so it doesn't re-run on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
      finalizeSetup(code);
    } else {
      fetchConfig();
    }
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await apiClient.get('/api/github/config');
      setConfig(response.data);
    } catch (err) {
      console.error('Failed to fetch GitHub config:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async () => {
    if (!window.confirm('Are you sure you want to delete this GitHub integration? This will remove all stored credentials and history from our database.')) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete('/api/github/config');
      setConfig({ configured: false });
      setStatus('idle');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete GitHub integration.');
    } finally {
      setLoading(false);
    }
  };

  const finalizeSetup = async (code: string) => {
    setLoading(true);
    setStatus('finalizing');
    try {
      await apiClient.post('/api/github/finalize-setup', { code });
      await fetchConfig();
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to finalize GitHub setup.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const startManifestFlow = () => {
    const manifest = {
      "name": "Security Bot-" + Math.floor(Math.random() * 1000),
      "url": window.location.origin,
      "hook_attributes": {
        "url": "https://github-security-bot-300502296392.us-central1.run.app/api/webhook"
      },
      "redirect_url": window.location.origin,
      "public": false,
      "default_permissions": {
        "pull_requests": "write",
        "contents": "read",
        "metadata": "read"
      },
      "default_events": [
        "pull_request"
      ]
    };

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://github.com/settings/apps/new';
    
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'manifest';
    input.value = JSON.stringify(manifest);
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading && status !== 'finalizing') {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (config?.configured && status !== 'success') {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Github size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{config.name || 'GitHub Active'}</h2>
              <p className="text-gray-500 text-sm font-mono">App ID: {config.appId}</p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${config.installedAt ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {config.installedAt ? 'Installed' : 'Created (Not Installed)'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
            <Clock className="text-gray-400 mt-1" size={18} />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Last Review</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(config.lastTriggeredAt)}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
            <Database className="text-gray-400 mt-1" size={18} />
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Repositories</p>
              <p className="text-sm font-medium text-gray-700">{config.repositories?.length || 0} Connected</p>
            </div>
          </div>
        </div>

        {!config.installedAt && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-amber-800">
            <AlertCircle size={20} />
            <p className="text-sm">The app is created but hasn't been installed on any repositories yet.</p>
          </div>
        )}

        <div className="flex gap-3">
          <a 
            href={config.htmlUrl + '/installations/new'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-center hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} />
            Manage Installation
          </a>
          <button
            onClick={deleteConfig}
            className="px-6 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-4">
        <CheckCircle className="mx-auto text-green-600" size={48} />
        <h2 className="text-xl font-bold text-green-900">GitHub App Created!</h2>
        <p className="text-green-700">Your personal security bot is ready. The final step is to install it on your repositories.</p>
        <a 
          href={config?.htmlUrl + '/installations/new'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
        >
          <ExternalLink size={20} />
          Install on Repositories
        </a>
        <button onClick={() => setStatus('idle')} className="block w-full text-sm text-green-600 font-medium hover:underline mt-2">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-100 rounded-2xl">
          <Github size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GitHub Integration</h2>
          <p className="text-gray-500">Connect your own GitHub App for automated PR reviews.</p>
        </div>
      </div>

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {status === 'finalizing' ? (
        <div className="py-8 text-center space-y-4">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
          <p className="text-gray-600 font-medium">Finalizing setup with GitHub...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600 leading-relaxed">
            By connecting your own GitHub App, the Security Audit Agent will automatically 
            review every Pull Request in your selected repositories.
          </p>
          <button
            onClick={startManifestFlow}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-gray-800 transition-all transform active:scale-[0.98]"
          >
            <Github size={20} />
            Create Personal GitHub App
          </button>
        </div>
      )}
    </div>
  );
}
