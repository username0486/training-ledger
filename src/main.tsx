
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
    let registration: ServiceWorkerRegistration | null = null;
    let updateAvailable = false;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          registration = reg;
          console.log('[Service Worker] Registration successful:', reg.scope);

          // Check for updates immediately
          reg.update();

          // Listen for service worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            console.log('[Service Worker] New version found, installing...');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is waiting
                console.log('[Service Worker] New version ready, waiting for activation');
                updateAvailable = true;
                showUpdateNotification();
              } else if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
                // First install or after skipWaiting
                console.log('[Service Worker] Activated');
                window.location.reload();
              }
            });
          });

          // Listen for controller change (when new SW takes control)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[Service Worker] Controller changed, reloading...');
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error('[Service Worker] Registration failed:', error);
        });
    });

    // Show update notification
    function showUpdateNotification() {
      // Create a simple toast notification
      const toast = document.createElement('div');
      toast.id = 'sw-update-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1c1c1c;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        animation: slideUp 0.3s ease-out;
      `;
      
      const text = document.createElement('span');
      text.textContent = 'Update available';
      
      const button = document.createElement('button');
      button.textContent = 'Update';
      button.style.cssText = `
        background: #ff6b6b;
        color: white;
        border: none;
        padding: 6px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 14px;
      `;
      button.onclick = () => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        toast.remove();
      };
      
      toast.appendChild(text);
      toast.appendChild(button);
      document.body.appendChild(toast);

      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
