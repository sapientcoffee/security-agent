import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden bg-gray-900 shadow-sm border border-gray-800">
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800 text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-700 hover:text-white z-10 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:opacity-100"
        aria-label="Copy code to clipboard"
        title="Copy code"
      >
        {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
      </button>
      {/* @ts-ignore - react-syntax-highlighter types are sometimes incompatible with React 18 */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        PreTag="div"
      >
        {String(value).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
}
