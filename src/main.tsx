import React from "react";
import ReactDOM from "react-dom/client";
import Workspace from "./pages/Workspace";
import { WorkspaceProvider } from "./hooks/useWorkspace";
import "./styles/app.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  </React.StrictMode>,
);
