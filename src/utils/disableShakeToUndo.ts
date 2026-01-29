/**
 * Disables iOS shake-to-undo functionality globally for the app
 * This prevents the system "Undo Typing" prompt from appearing
 * while using the app, especially during logging.
 * 
 * For web apps running in Safari on iOS, this:
 * 1. Prevents undo/redo keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
 * 2. Clears undo stack on input elements to minimize undo history
 * 3. Intercepts shake gestures to clear undo stack when detected
 * 
 * Note: Complete disable of iOS shake-to-undo from a web app is not 100% possible.
 * This implementation minimizes it as much as possible. For complete disable,
 * the app would need to be wrapped in a native shell (Capacitor/Cordova) and
 * disable it at the native iOS level (e.g., in AppDelegate or ViewController).
 */

/**
 * Disables undo/redo on a specific input element
 */
function disableUndoOnElement(element: HTMLInputElement | HTMLTextAreaElement): void {
  // Set attributes to minimize undo tracking
  element.setAttribute('autocomplete', 'off');
  element.setAttribute('spellcheck', 'false');
  
  // Prevent undo/redo keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Prevent Cmd+Z / Ctrl+Z (undo) and Cmd+Shift+Z / Ctrl+Y (redo)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'y' || e.key === 'Z' || e.key === 'Y')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  };

  // Use capture phase to intercept before other handlers
  element.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });

  // Clear undo stack when input loses focus to prevent shake-to-undo
  // This ensures the undo stack is cleared after the user finishes typing
  // This happens on blur so it doesn't interfere with active typing
  element.addEventListener('blur', () => {
    // Clear undo stack by temporarily modifying and restoring the value
    // This happens on blur so it doesn't interfere with typing
    const currentValue = element.value;
    if (currentValue) {
      // Temporarily append and remove a space to clear undo stack
      // Using requestAnimationFrame ensures this happens after blur is complete
      requestAnimationFrame(() => {
        element.value = currentValue + ' ';
        requestAnimationFrame(() => {
          element.value = currentValue;
        });
      });
    }
  }, { once: false });
}

/**
 * Disables shake-to-undo globally for the entire app
 */
export function disableShakeToUndo(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  // Disable undo/redo on all existing inputs
  const disableUndoOnAllInputs = () => {
    const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    inputs.forEach(disableUndoOnElement);
  };

  // Disable undo on existing inputs immediately
  if (document.body) {
    disableUndoOnAllInputs();
  } else {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', disableUndoOnAllInputs);
  }

  // Watch for dynamically added inputs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check if the node itself is an input
          if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
            disableUndoOnElement(node);
          }
          // Check for inputs within the node
          const inputs = node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
          inputs.forEach(disableUndoOnElement);
        }
      });
    });
  });

  // Observe the entire document for new inputs
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });
  }

  // Prevent undo/redo keyboard shortcuts globally (as a fallback)
  window.addEventListener('keydown', (e) => {
    // Only prevent in input/textarea contexts
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'y' || e.key === 'Z' || e.key === 'Y')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, { capture: true, passive: false });

  // Intercept shake gestures to prevent undo prompts
  // On iOS Safari, shake-to-undo is triggered by device motion
  if ('DeviceMotionEvent' in window) {
    let lastShakeTime = 0;
    const shakeThreshold = 800; // Minimum time between shake detections (ms)
    const accelerationThreshold = 2.0; // Minimum acceleration to detect shake

    const handleMotion = (e: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastShakeTime < shakeThreshold) {
        return; // Ignore rapid shake events
      }

      // Detect significant acceleration (shake)
      if (e.acceleration) {
        const { x, y, z } = e.acceleration;
        const magnitude = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
        
        if (magnitude > accelerationThreshold) {
          lastShakeTime = now;
          
          // Clear undo stack on active input to prevent undo prompt
          const activeElement = document.activeElement;
          if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
            const currentValue = activeElement.value;
            if (currentValue) {
              // Subtle manipulation to clear undo stack without visual change
              activeElement.value = currentValue + ' ';
              requestAnimationFrame(() => {
                activeElement.value = currentValue;
              });
            }
          }
        }
      }
    };

    // Request permission for device motion (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permission: string) => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleMotion, { passive: true });
          }
        })
        .catch(() => {
          // Permission denied or not available - continue without motion detection
          // The keyboard shortcut prevention will still work
        });
    } else {
      // Fallback for older iOS or when permission API not available
      window.addEventListener('devicemotion', handleMotion, { passive: true });
    }
  }
}
