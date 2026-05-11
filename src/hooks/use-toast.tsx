import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastItem = ToastInput & { id: string };

const ToastCtx = React.createContext<{
  toast: (t: ToastInput) => void;
} | null>(null);

export function ToastRoot({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const toast = React.useCallback((t: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ toast }}>
      <ToastProvider>
        {children}
        {items.map((t) => (
          <Toast key={t.id} onOpenChange={(o) => !o && dismiss(t.id)}>
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && (
                <ToastDescription>{t.description}</ToastDescription>
              )}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastRoot");
  return ctx;
}
