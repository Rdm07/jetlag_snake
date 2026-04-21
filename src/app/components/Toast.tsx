"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 text-white text-sm px-4 py-2 rounded-lg shadow-xl z-50 animate-fade-in">
      {message}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);

  function addToast(message: string) {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
  }

  function removeToast(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  const ToastContainer = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} onDone={() => removeToast(toast.id)} />
      ))}
    </div>
  );

  return { addToast, ToastContainer };
}
