import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';

// Helper for cross-platform alerts
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export function usePwaInstall() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [showIosInstallPopup, setShowIosInstallPopup] = useState(false);

  useEffect(() => {
    // 1. Exit immediately if we are on a Native App (iOS/Android)
    if (Platform.OS !== 'web') return;

    // 2. Ensure window is defined (protects against SSR issues)
    if (typeof window === 'undefined') return;

    const handler = (e) => {
      e.preventDefault(); // Prevents the default mini-infobar from appearing
      setInstallPromptEvent(e); // Save the event for later
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    // If they are on the native app, they've already installed it!
    if (Platform.OS !== 'web') {
      showAlert("Already Installed", "You are currently using the native mobile app!");
      return;
    }

    // --- WEB ONLY LOGIC BELOW ---
    // If we have a saved prompt event (on Android/Chrome Desktop), show it.
    if (installPromptEvent) {
      installPromptEvent.prompt();
    } else {
      // Otherwise, check if the user is on an iOS browser
      const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIos) {
        // If they are on iOS Web, show our custom instruction popup
        setShowIosInstallPopup(true);
      } else {
        // For other browsers, show a generic alert
        showAlert("Install App", "To install, please use the 'Add to Home Screen' option in your browser's menu.");
      }
    }
  };

  return {
    showIosInstallPopup,
    handleInstallClick,
    closeIosInstallPopup: () => setShowIosInstallPopup(false) // Helper to close the popup
  };
}