import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Error boundary for initialization
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Failed to initialize app:", error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; text-align: center; padding: 20px;">
      <div>
        <h1 style="font-size: 24px; margin-bottom: 16px;">Application Error</h1>
        <p style="color: #666; margin-bottom: 8px;">Failed to load the application.</p>
        <p style="color: #999; font-size: 14px;">Please check the browser console for details.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}
