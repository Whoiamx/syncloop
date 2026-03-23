"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  function handleResponse(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm: showConfirm }}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
          onClick={() => handleResponse(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl border border-surface-800 bg-surface-900 shadow-2xl shadow-black/40 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
              options.danger ? "bg-red-500/10" : "bg-brand-500/10"
            }`}>
              {options.danger ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-400">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              )}
            </div>

            <h3 className="text-lg font-bold text-surface-100 mb-1.5">{options.title}</h3>
            <p className="text-sm text-surface-400 leading-relaxed mb-6">{options.message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => handleResponse(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-surface-700 text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-all"
              >
                {options.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => handleResponse(true)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  options.danger
                    ? "bg-red-500 hover:bg-red-400 text-white hover:shadow-lg hover:shadow-red-500/20"
                    : "bg-brand-500 hover:bg-brand-400 text-white hover:shadow-lg hover:shadow-brand-500/20"
                }`}
              >
                {options.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
