import { create } from 'zustand';

interface ServiceWorkerStore {
  isUpdateAvailable: boolean;
  isUpdateReady: boolean;
  isInstalling: boolean;
  setUpdateAvailable: (available: boolean) => void;
  setUpdateReady: (ready: boolean) => void;
  setInstalling: (installing: boolean) => void;
  activateUpdate: () => void;
  initializeServiceWorker: () => void;
}

const useServiceWorkerStore = create<ServiceWorkerStore>((set) => ({
  isUpdateAvailable: false,
  isUpdateReady: false,
  isInstalling: false,

  setUpdateAvailable: (available) => set({ isUpdateAvailable: available }),
  setUpdateReady: (ready) => set({ isUpdateReady: ready }),
  setInstalling: (installing) => set({ isInstalling: installing }),

  activateUpdate: async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  },

  initializeServiceWorker: () => {
    if (import.meta.env.DEV) {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser');
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        set({ isUpdateAvailable: true, isUpdateReady: true });
      }

      registration.addEventListener('updatefound', () => {
        set({ isInstalling: true });
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              set({ isUpdateAvailable: true, isUpdateReady: true, isInstalling: false });
            }
          });
        }
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });

    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  },
}));

export default useServiceWorkerStore;
