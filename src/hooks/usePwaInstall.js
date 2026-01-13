// src/hooks/usePwaInstall.js

import { useState, useEffect } from 'react';

export function usePwaInstall() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showIosInstallPopup, setShowIosInstallPopup] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // Prevents the default mini-infobar from appearing
      setInstallPromptEvent(e); // Save the event for later
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    // If we have a saved prompt event (on Android), show it.
    if (installPromptEvent) {
      installPromptEvent.prompt();
    } else {
      // Otherwise, check if the user is on iOS
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIos) {
        // If they are on iOS, show our custom instruction popup
        setShowIosInstallPopup(true);
      } else {
        // For other browsers, you can show a generic alert
        alert("To install, please use the 'Add to Home Screen' option in your browser's menu.");
      }
    }
  };

  return {
    showIosInstallPopup,
    handleInstallClick,
    closeIosInstallPopup: () => setShowIosInstallPopup(false) // Helper to close the popup
  };
}