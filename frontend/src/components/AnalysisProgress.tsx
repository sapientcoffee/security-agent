import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { AuditStatus } from '../App';

interface AnalysisProgressProps {
  status: AuditStatus;
}

const steps = [
  { id: 'cloning', label: 'Cloning Repository' },
  { id: 'parsing', label: 'Parsing Files' },
  { id: 'analyzing', label: 'Security Analysis' },
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ status }) => {
  const lastActiveStatus = useRef<AuditStatus>('idle');

  // Track the last active status so we know which step failed if status becomes 'error'
  useEffect(() => {
    if (status !== 'error' && status !== 'idle' && status !== 'completed') {
      lastActiveStatus.current = status;
    }
  }, [status]);

  if (status === 'idle' || status === 'completed') {
    return null;
  }

  const getStepState = (stepId: string) => {
    const activeId = status === 'error' ? lastActiveStatus.current : status;
    const stepIds = steps.map(s => s.id);
    const activeIndex = stepIds.indexOf(activeId);
    const currentIndex = stepIds.indexOf(stepId);

    if (status === 'error' && currentIndex === activeIndex) {
      return 'error';
    }
    if (currentIndex < activeIndex) {
      return 'completed';
    }
    if (currentIndex === activeIndex) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="w-full max-w-md mx-auto my-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Analysis in Progress</h3>
      <div className="space-y-6">
        {steps.map((step, index) => {
          const state = getStepState(step.id);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative flex items-start">
              {!isLast && (
                <div 
                  className={`absolute top-6 left-3 -ml-px w-0.5 ${
                    state === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  }`} 
                  style={{ height: 'calc(100% + 1rem)' }}
                />
              )}
              
              <div className="relative flex items-center justify-center bg-white z-10">
                {state === 'completed' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                {state === 'active' && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
                {state === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
                {state === 'pending' && <Circle className="w-6 h-6 text-gray-300" />}
              </div>
              
              <div className="ml-4">
                <p className={`text-sm font-medium ${
                  state === 'active' ? 'text-blue-700' :
                  state === 'error' ? 'text-red-600' :
                  state === 'completed' ? 'text-gray-900' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </p>
                {state === 'active' && (
                  <p className="text-xs text-blue-500 mt-1">This might take a moment...</p>
                )}
                {state === 'error' && (
                  <p className="text-xs text-red-500 mt-1">An error occurred during this step.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
