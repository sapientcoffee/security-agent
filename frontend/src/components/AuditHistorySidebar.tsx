import React, { ReactNode } from 'react';
import { Clock, ChevronRight, History, Trash2, Shield, X, Code, Github, FileUp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AuditRecord } from '../App';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuditHistorySidebarProps {
  history: AuditRecord[];
  onSelect: (record: AuditRecord) => void;
  onDelete: (id: string) => void;
  selectedId: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
  className?: string;
  children?: ReactNode;
}

export const AuditHistorySidebar: React.FC<AuditHistorySidebarProps> = ({
  history,
  onSelect,
  onDelete,
  selectedId,
  isOpen = false,
  onClose,
  isInline = false,
  className,
  children
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'git': return <Github size={14} />;
      case 'file': return <FileUp size={14} />;
      default: return <Code size={14} />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(timestamp);
  };

  const content = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 text-gray-800">
          <History size={20} className="text-blue-600" />
          <h2 className="font-semibold text-lg tracking-tight">Audit History</h2>
        </div>
        {!isInline && onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {children && (
        <div className="p-4 border-b border-gray-100 bg-white">
          {children}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-gray-400 px-4">
            <div className="p-4 bg-gray-50 rounded-full border border-gray-100">
              <Shield size={32} className="text-gray-300" />
            </div>
            <div>
              <p className="font-medium text-gray-600">No audits yet</p>
              <p className="text-sm mt-1">Your analysis history will appear here.</p>
            </div>
          </div>
        ) : (
          history.map((record) => (
            <div 
              key={record.id}
              onClick={() => onSelect(record)}
              className={cn(
                "group relative p-4 rounded-xl border transition-all cursor-pointer",
                selectedId === record.id 
                  ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                  : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-md"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                    record.inputType === 'git' ? "bg-purple-100 text-purple-700" :
                    record.inputType === 'file' ? "bg-green-100 text-green-700" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    {getTypeIcon(record.inputType)}
                    <span className="capitalize">{record.inputType}</span>
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDate(record.timestamp)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(record.id);
                  }}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete record"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <h3 className="text-sm font-medium text-gray-800 line-clamp-1 mb-1 break-all">
                {record.repoUrl || "Pasted Content"}
              </h3>
              
              <p className="text-xs text-gray-500 line-clamp-2">
                {record.summary || "No summary available"}
              </p>

              {selectedId === record.id && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500">
                  <ChevronRight size={20} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );

  if (isInline) {
    return (
      <div className={cn("flex flex-col h-full bg-white", className)}>
        {content}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Overlay for Mobile */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-full w-80 bg-white border-r border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {content}
      </div>
    </>
  );
};
