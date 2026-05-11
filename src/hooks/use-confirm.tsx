import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = React.createContext<ConfirmFn | null>(null);

export function ConfirmRoot({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [pending, setPending] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setPending(opts);
      }),
    []
  );

  const respond = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) respond(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{pending?.title}</DialogTitle>
            {pending?.description && (
              <DialogDescription>{pending.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => respond(false)}>
              {pending?.cancelText ?? t("action.cancel")}
            </Button>
            <Button
              variant={pending?.destructive ? "destructive" : "default"}
              onClick={() => respond(true)}
              autoFocus
            >
              {pending?.confirmText ?? t("action.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmRoot>");
  return ctx;
}
