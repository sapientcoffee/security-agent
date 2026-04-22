import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { Github, Loader2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';

export function GitHubSetup() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'finalizing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if we are returning from GitHub with a code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && status === 'idle') {
      finalizeSetup(code);
    }
  }, []);

  const finalizeSetup = async (code: string) => {
    setLoading(true);
    setStatus('finalizing');
    try {
      const response = await apiClient.post('/api/github/finalize-setup', { code });
      setInstallUrl(response.data.installUrl);
      setStatus('success');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
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

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-4">
        <CheckCircle className="mx-auto text-green-600" size={48} />
        <h2 className="text-xl font-bold text-green-900">GitHub App Created!</h2>
        <p className="text-green-700">Your personal security bot is ready. The final step is to install it on your repositories.</p>
        <a 
          href={installUrl || '#'} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
        >
          <ExternalLink size={20} />
          Install on Repositories
        </a>
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
            disabled={loading}
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
