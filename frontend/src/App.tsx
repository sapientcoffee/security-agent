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

import { useState, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Shield, Code, Github, FileUp, Loader2, Send, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type InputType = 'text' | 'git' | 'file';

export default function App() {
  const [inputType, setInputType] = useState<InputType>('text');
  const [content, setContent] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!content.trim()) {
      setError('Please provide some code or a repository URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await axios.post('http://localhost:8080/api/analyze', {
        inputType: inputType === 'file' ? 'text' : inputType,
        content
      });
      setReport(response.data.report);
    } catch (err: unknown) {
      console.error(err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message || 'An unexpected error occurred during analysis.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 w-full flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
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

        {/* Main Interface */}
        <main className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
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
              disabled={loading || !content.trim()}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98]",
                loading || !content.trim()
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
              )}
            >
              {loading ? (
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
        </main>

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
                components={{
                  h1: ({node: _node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 border-b pb-2" {...props} />,
                  h2: ({node: _node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
                  h3: ({node: _node, ...props}) => <h3 className="text-xl font-bold mt-5 mb-2" {...props} />,
                  p: ({node: _node, ...props}) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
                  ul: ({node: _node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-700" {...props} />,
                  li: ({node: _node, ...props}) => <li {...props} />,
                  code: ({node: _node, inline, ...props}: {inline?: boolean, [key: string]: unknown}) => (
                    inline 
                      ? <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />
                      : <div className="bg-gray-900 rounded-xl p-4 my-4 overflow-x-auto"><code className="text-gray-100 font-mono text-sm" {...props} /></div>
                  ),
                  blockquote: ({node: _node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-6" {...props} />
                }}
              >
                {report}
              </ReactMarkdown>
            </div>
          </section>
        )}
      </div>
      
      <footer className="mt-12 text-gray-400 text-sm">
        &copy; 2026 Security Audit Agent &bull; Powered by Google Gemini
      </footer>
    </div>
  );
}
