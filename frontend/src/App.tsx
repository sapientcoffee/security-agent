// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Shield, Code, Github, FileUp, Loader2, Send, AlertTriangle, LogOut, Menu, Plus } from 'lucide-react';
import { AnalysisProgress } from './components/AnalysisProgress';
import { AuditHistorySidebar } from './components/AuditHistorySidebar';
import { CodeBlock } from './components/CodeBlock';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { GitHubSetup } from './components/GitHubSetup';
import { auth as firebaseAuth } from './firebaseConfig';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type InputType = 'text' | 'git' | 'file';

export type AuditStatus = 'idle' | 'cloning' | 'parsing' | 'analyzing' | 'completed' | 'error';

export interface AuditRecord {
  id: string;
  timestamp: number;
  repoUrl: string;
  inputType: InputType;
  report: string;
  summary: string;
}

export default function App() {
  const { user, loading } = useAuth();
  const [inputType, setInputType] = useState<InputType>('text');
  const [content, setContent] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [auditStatus, setAuditStatus] = useState<AuditStatus>('idle');
  const [history, setHistory] = useState<AuditRecord[]>(() => {
    const saved = localStorage.getItem('auditHistory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse history from localStorage', e);
        return [];
      }
    }
    return [];
  });
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveToHistory = (newReport: string, rawContent: string, type: InputType) => {
    let title = '';
    if (type === 'git') {
      title = rawContent;
    } else if (type === 'text') {
      title = 'Pasted Code';
    } else if (type === 'file') {
      title = 'Uploaded File';
    }

    const newRecord: AuditRecord = {
      id: new Date().getTime().toString(),
      timestamp: Date.now(),
      repoUrl: title,
      inputType: type,
      report: newReport,
      summary: `Audit from ${new Date().toLocaleString()}`,
    };
    
    setHistory(prev => {
      const updated = [newRecord, ...prev];
      try {
        localStorage.setItem('auditHistory', JSON.stringify(updated));
      } catch (e: unknown) {
        const err = e as { name?: string; code?: number };
        if (err.name === 'QuotaExceededError' || err.code === 22) {
          console.warn('LocalStorage quota exceeded. Evicting oldest item and retrying...');
          const evicted = updated.slice(0, -1);
          try {
            localStorage.setItem('auditHistory', JSON.stringify(evicted));
          } catch (retryError) {
            console.error('Failed to save to localStorage even after eviction', retryError);
          }
        } else {
          console.error('Failed to save to localStorage', e);
        }
      }
      return updated;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!user) return;

    if (!content.trim()) {
      setError('Please provide some code or a repository URL.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const currentSignal = abortControllerRef.current.signal;

    setIsAnalyzing(true);
    setError(null);
    setReport(null);

    try {
      const token = await user.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers,
        signal: currentSignal,
        body: JSON.stringify({
          inputType: inputType === 'file' ? 'text' : inputType,
          content
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (!dataStr.trim()) continue;

              try {
                const event = JSON.parse(dataStr);
                
                if (event.status === 'cloning' || event.status === 'parsing' || event.status === 'analyzing') {
                  setAuditStatus(event.status);
                } else if (event.status === 'completed') {
                  setReport(event.report);
                  saveToHistory(event.report, content, inputType);
                  setAuditStatus('completed');
                } else if (event.status === 'error') {
                  setError(event.message || 'An error occurred during analysis.');
                  setAuditStatus('error');
                }
              } catch (e) {
                console.error('Failed to parse SSE JSON:', e, 'Raw data:', dataStr);
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Analysis aborted');
        return;
      }
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
      setAuditStatus('error');
    } finally {
      if (abortControllerRef.current?.signal === currentSignal) {
        setIsAnalyzing(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const TabButton = ({ type, icon: Icon, label }: { type: InputType; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => {
        setInputType(type);
        setContent('');
        setError(null);
      }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
        inputType === type 
          ? "bg-blue-600 text-white shadow-md" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button 
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors" 
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Shield className="text-blue-600" size={28} strokeWidth={2.5} />
          <span className="text-xl font-bold tracking-tight text-gray-900 inline-block">
            Security Agent
          </span>
        </div>
        
        {/* Center: New Audit (Desktop) */}
        <div className="hidden sm:flex flex-1 justify-center">
          <button
            onClick={() => {
              setSelectedHistoryId(null);
              setReport(null);
              setAuditStatus('idle');
            }}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-sm"
          >
            <Plus size={18} />
            New Audit
          </button>
        </div>

        {/* Right: User actions */}
        <div className="flex items-center gap-4">
          {/* New Audit (Mobile) */}
          <button
            onClick={() => {
              setSelectedHistoryId(null);
              setReport(null);
              setAuditStatus('idle');
            }}
            className="sm:hidden p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Plus size={20} />
          </button>

          <div className="flex items-center gap-3 sm:border-l sm:border-gray-200 sm:pl-4">
            <span className="hidden md:inline-block text-sm text-gray-600">
              {user?.email || 'User'}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('E2E_BYPASS_TOKEN');
                firebaseAuth.signOut();
              }}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors p-2 sm:p-0 rounded-md sm:rounded-none hover:bg-red-50 sm:hover:bg-transparent"
              title="Sign Out"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-64px)] overflow-hidden relative">
        
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-80 bg-white border-r border-gray-200 shrink-0 h-full overflow-hidden">
          <AuditHistorySidebar
            history={history}
            selectedId={selectedHistoryId}
            onSelect={(record) => {
              setSelectedHistoryId(record.id);
              setReport(record.report);
            }}
            onDelete={(id) => {
              setHistory(prev => {
                const updated = prev.filter(h => h.id !== id);
                localStorage.setItem('auditHistory', JSON.stringify(updated));
                return updated;
              });
              if (selectedHistoryId === id) {
                setSelectedHistoryId(null);
                setReport(null);
              }
            }}
            isInline={true}
          />
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AuditHistorySidebar
          history={history}
          selectedId={selectedHistoryId}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSelect={(record) => {
            setSelectedHistoryId(record.id);
            setReport(record.report);
            setIsSidebarOpen(false);
          }}
          onDelete={(id) => {
            setHistory(prev => {
              const updated = prev.filter(h => h.id !== id);
              localStorage.setItem('auditHistory', JSON.stringify(updated));
              return updated;
            });
            if (selectedHistoryId === id) {
              setSelectedHistoryId(null);
              setReport(null);
            }
          }}
        />

        {/* Main Workspace (Right) */}
        <main className="flex-1 bg-gray-50 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <GitHubSetup mode="config" />
            
            {/* Header / Intro */}
            {!selectedHistoryId && !report && !isAnalyzing && (
              <header className="text-center space-y-4 py-8">
                <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl mb-2">
                  <Shield size={40} strokeWidth={2.5} />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                  Security Audit Agent
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                  Functional and security analysis for your source code. 
                  Powered by Gemini 3.1 Flash.
                </p>
              </header>
            )}

            {/* Main Interface / Inputs */}
            {!selectedHistoryId && (
              <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
                  <TabButton type="text" icon={Code} label="Paste Code" />
                  <TabButton type="file" icon={FileUp} label="Upload File" />
                  <TabButton type="git" icon={Github} label="Git Repo" />
                </div>

                <div className="p-6 space-y-6">
                  {/* Input Areas */}
                  {inputType === 'text' && (
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste your code here..."
                      className="w-full h-64 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm resize-none bg-gray-50"
                    />
                  )}

                  {inputType === 'file' && (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                      <FileUp className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mb-4" />
                      <p className="text-lg font-medium text-gray-600 group-hover:text-blue-700">
                        {content ? "File selected! Click to change." : "Click to select a code file"}
                      </p>
                      {content && (
                        <p className="mt-2 text-sm text-gray-400 max-w-xs truncate italic">
                          File content loaded and ready.
                        </p>
                      )}
                    </div>
                  )}

                  {inputType === 'git' && (
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Github size={20} />
                        </div>
                        <input
                          type="text"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="https://github.com/username/repo"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                        />
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm leading-relaxed">
                        <AlertTriangle className="flex-shrink-0" size={18} />
                        <p>
                          <strong>Note:</strong> Repository analysis clones the repository onto our servers. 
                          Large repositories or those with many files might take a few moments to process.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertTriangle size={20} />
                      <p className="font-medium">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !content.trim()}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]",
                      isAnalyzing || !content.trim()
                        ? "bg-gray-300 cursor-not-allowed text-gray-500"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
                    )}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Analyzing Security...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Run Security Audit
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}

            {/* Analysis Progress */}
            <AnalysisProgress status={auditStatus} />

            {/* Results Area */}
            {report && (
              <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="text-green-600" size={24} />
                    Audit Report
                  </h2>
                  <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    Completed
                  </div>
                </div>
                <div className="p-8 prose prose-slate max-w-none">
                  <ReactMarkdown
                                      rehypePlugins={[rehypeSanitize]}
                                      components={{                      h1: ({node: _node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 border-b pb-2" {...props} />,
                      h2: ({node: _node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
                      h3: ({node: _node, ...props}) => <h3 className="text-xl font-bold mt-5 mb-2" {...props} />,
                      p: ({node: _node, ...props}) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
                      ul: ({node: _node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700" {...props} />,
                      li: ({node: _node, ...props}) => <li {...props} />,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      code: ({node, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        // In react-markdown v9+, code blocks are those with a language class or inside a pre
                        const isCodeBlock = !!match || (node && node.tagName === 'code' && node.position?.start.line !== node.position?.end.line);
                        
                        return isCodeBlock ? (
                          <CodeBlock 
                            language={match ? match[1] : 'text'} 
                            value={String(children).replace(/\n$/, '')} 
                          />
                        ) : (
                          <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded font-mono text-sm" {...props}>
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({node: _node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-6" {...props} />
                    }}
                  >
                    {report}
                  </ReactMarkdown>
                </div>
              </section>
            )}

            {/* GitHub Review History (Bottom) */}
            <GitHubSetup mode="history" />

            <footer className="pt-8 pb-4 text-center text-gray-400 text-sm">
              &copy; 2026 Security Audit Agent &bull; Powered by Google Gemini
            </footer>
            
          </div>
        </main>
      </div>
    </div>
  );
}
