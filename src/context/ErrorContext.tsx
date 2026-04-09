import React, { createContext, useState, useEffect, useContext } from 'react';

export interface AppError {
  id: string;
  message: string;
  timestamp: Date;
  source?: string;
  stack?: string;
}

interface ErrorContextType {
  errors: AppError[];
  clearErrors: () => void;
  addError: (err: Omit<AppError, 'id' | 'timestamp'>) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = (err: Omit<AppError, 'id' | 'timestamp'>) => {
    setErrors(prev => [...prev, { ...err, id: Math.random().toString(36).substring(7), timestamp: new Date() }]);
  };

  const clearErrors = () => {
    setErrors([]);
  };

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addError({ 
        message: event.message, 
        source: 'Window Error',
        stack: event.error?.stack
      });
    };
    
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Ignore the vite websocket error
      if (event.reason?.message?.includes('WebSocket closed without opened')) return;
      
      addError({ 
        message: event.reason?.message || (typeof event.reason === 'string' ? event.reason : 'Unhandled Rejection'), 
        source: 'Promise Rejection',
        stack: event.reason?.stack
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, clearErrors, addError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error('useErrorContext must be used within ErrorProvider');
  return context;
};
