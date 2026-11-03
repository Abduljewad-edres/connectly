import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PWAContext = createContext(null);

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // Platform detection helper
  const getPlatform = useCallback(() => {
    if (typeof window === 'undefined') return 'other';
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/windows/.test(userAgent)) return 'windows';
    if (/macintosh|mac os x/.test(userAgent)) return 'mac';
    return 'other';
  }, []);

  const [platform, setPlatform] = useState('other');

  useEffect(() => {
    setPlatform(getPlatform());

    // 1. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');

      setIsInstalled(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstallable(false);
      }
    };

    checkStandalone();

    const mediaMatcher = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => {
      if (e.matches) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };
    if (mediaMatcher.addEventListener) {
      mediaMatcher.addEventListener('change', handleMediaChange);
    }

    // 2. Capture beforeinstallprompt event (Chrome, Edge, Android browsers)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('[Connectly PWA] Installation prompt ready and captured.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Capture appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
      console.log('[Connectly PWA] Application successfully installed.');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Register Service Worker and monitor updates
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[Connectly PWA] Service Worker registered with scope:', reg.scope);

          // Check if there's already a waiting worker
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setIsUpdateAvailable(true);
          }

          // Detect new service worker installing
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;

            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                // New update ready!
                setWaitingWorker(installing);
                setIsUpdateAvailable(true);
                console.log('[Connectly PWA] New version ready to install.');
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[Connectly PWA] SW registration failed:', err);
        });

      // Reload page when new service worker takes over (only if user accepted update)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing && waitingWorker) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaMatcher.removeEventListener) {
        mediaMatcher.removeEventListener('change', handleMediaChange);
      }
    };
  }, [getPlatform]);

  // Trigger browser install prompt or open instructions modal
  const promptInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          console.log('[Connectly PWA] User accepted installation prompt');
        } else {
          console.log('[Connectly PWA] User dismissed installation prompt');
        }
      } catch (err) {
        console.error('[Connectly PWA] Error invoking install prompt:', err);
      } finally {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else {
      // Browser doesn't support direct trigger (iOS Safari, Firefox, or already installed):
      // Open helpful step-by-step instructions modal
      setIsInstallModalOpen(true);
    }
  };

  // Trigger app update
  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  const openInstallModal = () => setIsInstallModalOpen(true);
  const closeInstallModal = () => setIsInstallModalOpen(false);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        platform,
        isInstallModalOpen,
        isUpdateAvailable,
        promptInstall,
        openInstallModal,
        closeInstallModal,
        updateApp
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    return {
      isInstallable: false,
      isInstalled: false,
      platform: 'other',
      isInstallModalOpen: false,
      isUpdateAvailable: false,
      promptInstall: () => {},
      openInstallModal: () => {},
      closeInstallModal: () => {},
      updateApp: () => {}
    };
  }
  return context;
};

