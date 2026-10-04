import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, Share, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If iOS and not standalone, it is installable via Safari Share menu
    if (isIosDevice) {
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    }
    return false;
  };

  return { isInstallable, isInstalled, isIOS, triggerInstall };
};

interface InstallAppButtonProps {
  variant?: 'header' | 'button' | 'compact';
  className?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      const installed = await triggerInstall();
      if (!installed && !isInstallable) {
        // Fallback for browsers that don't trigger beforeinstallprompt
        setShowIOSModal(true);
      }
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all shadow-sm ${className}`}
          title="Install AttendX Mobile App"
        >
          <Smartphone className="w-3.5 h-3.5 animate-pulse" />
          <span>Install App</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleClick}
          className={`p-2 rounded-lg text-xs font-mono font-bold bg-[var(--bg-inset)] hover:bg-blue-600/20 text-[var(--text-secondary)] hover:text-blue-500 border border-[var(--border-color)] hover:border-blue-500/40 transition-all ${className}`}
          title="Install AttendX Mobile App"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      )}

      {variant === 'button' && (
        <button
          onClick={handleClick}
          className={`btn-primary px-4 py-2 text-xs font-mono font-bold flex items-center justify-center gap-2 ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Install Mobile WebApp</span>
        </button>
      )}

      {/* iOS & Universal Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="swiss-card max-w-sm w-full p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-2xl relative text-xs font-sans">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Install AttendX App</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Instant native biometric access on your device</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 font-mono text-[11px]">
              <div className="p-3 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-color)] flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <div>
                  Tap the <strong className="text-blue-500">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> in your browser menu (Safari / Chrome).
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-color)] flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <div>
                  Scroll down and tap <strong className="text-blue-500">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" />.
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-color)] flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <div>
                  Tap <strong className="text-emerald-500">Add</strong> in top-right. Launch AttendX anytime from your home screen with zero browser bars.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full btn-primary py-2.5 text-xs font-mono font-bold"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const FloatingMobileInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('attendx_pwa_banner_dismissed') === 'true';
  });
  const [showGuide, setShowGuide] = useState<boolean>(false);

  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('attendx_pwa_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowGuide(true);
    } else {
      const ok = await triggerInstall();
      if (!ok) {
        setShowGuide(true);
      }
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden animate-in slide-in-from-bottom duration-300">
        <div className="swiss-card p-3.5 rounded-2xl border border-blue-500/40 shadow-2xl bg-[var(--bg-surface)]/95 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">Install AttendX WebApp</div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">Fast 1-tap mobile biometric scanning</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-mono font-bold shadow-md hover:bg-blue-700 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="swiss-card max-w-sm w-full p-6 rounded-2xl border border-[var(--border-color)] space-y-4 text-xs font-sans relative">
            <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 p-1 text-[var(--text-muted)]">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add to Home Screen</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Tap the browser menu/share button <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> and select <strong>"Add to Home Screen"</strong> to install AttendX on your phone.
            </p>
            <button onClick={() => setShowGuide(false)} className="w-full btn-primary py-2 text-xs font-bold">
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
