import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check, X, Share, PlusSquare, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPwaButton: React.FC<{ variant?: 'navbar' | 'sidebar' | 'banner' }> = ({ variant = 'navbar' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      // Android / Chrome / Desktop PWA prompt
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Show iOS Safari "Add to Home Screen" instructions
      setShowIOSModal(true);
    } else {
      // Generic instructions
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
          <Check className="w-3.5 h-3.5" />
          <span>App Installed</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono font-bold text-[11px] uppercase tracking-wider rounded-lg shadow-md shadow-blue-500/20 transition-all border border-blue-400/30 shrink-0"
          title="Install AttendX Mobile Web App"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Download App</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#0D121C] hover:bg-blue-600/20 border border-blue-500/30 text-slate-200 transition-all group"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-blue-400">Install Mobile App</div>
              <div className="text-[10px] text-slate-400">Fast 1-tap home screen access</div>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-blue-400" />
        </button>
      )}

      {/* iOS & Browser Install Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-card border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Install AttendX App</h3>
              <p className="text-xs text-slate-400 mt-1">
                Install as a standalone web application for full-screen camera and offline recognition.
              </p>
            </div>

            <div className="space-y-2.5 text-left text-xs bg-[#080C14] p-3.5 rounded-xl border border-white/[0.08]">
              <div className="flex items-start gap-2.5 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline text-blue-400" /> in your browser menu.</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">2</span>
                <span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />.</span>
              </div>
              <div className="flex items-start gap-2.5 text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">3</span>
                <span>Launch <strong className="text-white">AttendX</strong> directly from your phone's app icon!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
