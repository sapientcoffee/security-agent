import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { Github, CheckCircle, ExternalLink, AlertCircle, Clock, Database, Trash2, History, GitPullRequest, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface GitHubConfig {
  configured: boolean;
  appId?: string;
  name?: string;
  htmlUrl?: string;
  installedAt?: unknown;
  lastTriggeredAt?: unknown;
  repositories?: string[];
}

interface ReviewHistory {
  id: string;
  repo: string;
  pullNumber: number;
  prUrl: string;
  summary: string;
  commentCount: number;
  timestamp: string;
}

export function GitHubSetup({ mode = 'config' }: { mode?: 'config' | 'history' }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'finalizing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [history, setHistory] = useState<ReviewHistory[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const initializationRef = useRef(false);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      finalizeSetup(code);
    } else {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update collapsed state when config is loaded
  useEffect(() => {
    if (config?.configured) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [config]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, historyRes] = await Promise.all([
        apiClient.get('/api/github/config'),
        apiClient.get('/api/github/reviews').catch(() => ({ data: [] }))
      ]);
      setConfig(configRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error('Failed to fetch GitHub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async () => {
    if (!window.confirm('Are you sure you want to delete this GitHub integration? This will remove all stored credentials and history from our database.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.delete('/api/github/config');
      setConfig({ configured: false });
      setHistory([]);
      setStatus('idle');
      setIsCollapsed(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error(error);
      setError(error.response?.data?.error || 'Failed to delete GitHub integration.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const finalizeSetup = async (code: string) => {
    setLoading(true);
    setStatus('finalizing');
    setError(null);
    try {
      await apiClient.post('/api/github/finalize-setup', { code });
      await fetchData();
      setStatus('success');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error(error);
      setError(error.response?.data?.error || 'Failed to finalize GitHub setup.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const startManifestFlow = () => {
    // Derive the webhook URL from the API base URL
    const apiBaseUrl = apiClient.defaults.baseURL || '';

    // Ensure we have a valid URL with protocol
    let fullApiBaseUrl = '';
    if (apiBaseUrl.startsWith('http')) {
      fullApiBaseUrl = apiBaseUrl;
    } else if (apiBaseUrl.startsWith('//')) {
      fullApiBaseUrl = window.location.protocol + apiBaseUrl;
    } else {
      // Handle relative paths or empty base URL
      const origin = window.location.origin;
      const path = apiBaseUrl === '/' || !apiBaseUrl ? '' : apiBaseUrl;
      fullApiBaseUrl = origin + path;
    }

    // Safety check: ensure fullApiBaseUrl is not just an origin if we expect it to be an API
    if (fullApiBaseUrl.endsWith('/')) {
      fullApiBaseUrl = fullApiBaseUrl.slice(0, -1);
    }

    const webhookUrl = `${fullApiBaseUrl}/api/webhook`;
    const manifest = {
      "name": "Security Bot-" + Math.floor(Math.random() * 1000),
      "url": window.location.origin,
      "hook_attributes": {
        "url": webhookUrl
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

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Never';
    const ts = timestamp as { _seconds?: number } | string | number;
    const date = (typeof ts === 'object' && ts !== null && '_seconds' in ts && ts._seconds) 
      ? new Date(ts._seconds * 1000) 
      : new Date(ts as string | number);
    return date.toLocaleString();
  };

  if (loading && status !== 'finalizing' && !config) {
    return (
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 flex justify-center items-center h-24">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // REVIEWS HISTORY MODE
  if (mode === 'history') {
    if (!config?.configured) return null;
    return (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-900 font-bold text-lg">
              <History size={20} className="text-gray-400" />
              Recent Reviews
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{history.length} Total</span>
          </div>

          {history.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {history.map((review) => (
                <div key={review.id} className="p-6 bg-white hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <GitPullRequest size={16} className="text-blue-500" />
                        {review.repo} #{review.pullNumber}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {review.summary.replace(/#{1,3}\s/g, '').substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                          <Clock size={14} />
                          {formatDate(review.timestamp)}
                        </div>
                        <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">
                          {review.commentCount} Findings
                        </div>
                      </div>
                    </div>
                    <a 
                      href={review.prUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                      title="View on GitHub"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <History size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium text-sm">No activity recorded yet.</p>
            </div>
          )}
        </div>
    );
  }

  // CONFIG / BANNER MODE
  return (
    <div className="space-y-6">
      {status === 'error' && error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={20} />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {config?.configured && status !== 'success' ? (
        // COLLAPSABLE CONFIG CARD
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-left">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Github size={20} />
                </div>
                <h2 className="text-base font-bold text-gray-900">{config.name || 'GitHub Bot Active'}</h2>
              </div>
              <div className="flex items-center gap-2 pl-9 sm:pl-0 border-l-0 sm:border-l sm:border-gray-200 sm:ml-2 sm:pl-4">
                <span className={`w-2 h-2 rounded-full ${config.installedAt ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <p className="text-sm text-gray-500">{config.installedAt ? 'Monitoring Pull Requests' : 'Setup Required'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              <span className="hidden sm:inline">Manage</span>
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </div>
          </button>

          {!isCollapsed && (
            <div className="px-6 pb-6 pt-0 space-y-6 animate-in slide-in-from-top-2 duration-300">
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
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
          )}
        </div>
      ) : status === 'success' ? (
        // SUCCESS CARD
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
      ) : status === 'finalizing' ? (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 py-12 text-center space-y-4">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
          <p className="text-gray-600 font-medium">Finalizing setup with GitHub...</p>
        </div>
      ) : (
        // BANNER FOR NEW USERS
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-800 rounded-3xl shadow-xl p-10 md:p-12 text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Github size={14} />
                New Integration
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Automate Your Security Reviews</h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Connect your own GitHub App to enable automated security reviews for every 
                Pull Request. Get AI-powered feedback directly in your dev workflow.
              </p>
            </div>
            <button
              onClick={startManifestFlow}
              disabled={loading}
              className="flex-shrink-0 px-8 py-4 bg-white text-blue-700 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-50 transition-all transform active:scale-[0.98] shadow-2xl shadow-blue-900/20"
            >
              <Github size={24} />
              Connect GitHub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
