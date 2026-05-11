import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ToastRoot } from "@/hooks/use-toast";
import { ConfirmRoot } from "@/hooks/use-confirm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initSettings } from "@/store/settings";

initSettings();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastRoot>
      <ConfirmRoot>
        <TooltipProvider delayDuration={200}>
          <App />
        </TooltipProvider>
      </ConfirmRoot>
    </ToastRoot>
  </React.StrictMode>
);
