
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { disableShakeToUndo } from "./utils/disableShakeToUndo";

  // Disable iOS shake-to-undo globally
  disableShakeToUndo();

  createRoot(document.getElementById("root")!).render(<App />);

  // Register service worker for PWA functionality (production only)
  // In dev mode, service worker can interfere with HMR and JSON loading
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[Service Worker] Registration successful:', registration.scope);
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed:', error);
        });
    });
  }
  