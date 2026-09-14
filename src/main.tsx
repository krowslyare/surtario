import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/brand.css";
import "./styles/controls.css";
import "./styles/select.css";
import "./styles/motion.css";
import "./styles/workspace.css";
import { MotionConfig } from "motion/react";

const backendUrl = import.meta.env.VITE_CONVEX_URL;
const convex = backendUrl ? new ConvexReactClient(backendUrl) : null;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      {convex ? (
        <ConvexProvider client={convex}>
          <App persistenceEnabled />
        </ConvexProvider>
      ) : (
        <App persistenceEnabled={false} />
      )}
    </MotionConfig>
  </React.StrictMode>,
);
