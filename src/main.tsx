import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";

const backendUrl = import.meta.env.VITE_CONVEX_URL;
const convex = backendUrl ? new ConvexReactClient(backendUrl) : null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {convex ? (
      <ConvexProvider client={convex}>
        <App persistenceEnabled />
      </ConvexProvider>
    ) : (
      <App persistenceEnabled={false} />
    )}
  </React.StrictMode>,
);
