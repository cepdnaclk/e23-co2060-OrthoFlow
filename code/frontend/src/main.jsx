import { StrictMode } from "react";
import "./global.css";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { applyStoredTheme } from "./constants.js";

applyStoredTheme();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
