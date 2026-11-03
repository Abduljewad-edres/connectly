import React, { useState } from 'react';
import { usePWA } from '../context/PWAContext';
import { CheckIcon, SparklesIcon } from './Icons';

export const InstallAppModal = () => {
  const {
    isInstallModalOpen,
    closeInstallModal,
    isInstallable,
    isInstalled,
    platform,
    promptInstall
  } = usePWA();

  const [activeTab, setActiveTab] = useState(
    platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'desktop'
  );

  if (!isInstallModalOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
      closeInstallModal();
    }
  };

  return (
    <div className="modal-overlay" onClick={closeInstallModal} style={{ zIndex: 1200 }}>
      <div
        className="modal-container pwa-install-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '92%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          padding: '0'
        }}
      >
        {/* Modal Header with Connectly Branding */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.22) 0%, rgba(124, 58, 237, 0.18) 100%)',
            padding: '1.75rem 1.5rem 1.25rem',
            textAlign: 'center',
            position: 'relative',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <button
            onClick={closeInstallModal}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              transition: 'all 0.15s ease'
            }}
            title="Close"
          >
            ✕
          </button>

          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 0.75rem',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)'
            }}
          >
            <span style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ffffff' }}>C</span>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 0.35rem' }}>
            Install Connectly
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Connect. Share. Belong. — Standalone App Experience
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {isInstalled ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
                background: 'var(--success-light)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--success)'
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'var(--success)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem'
                }}
              >
                <CheckIcon size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
                Connectly is Already Installed!
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                You are currently running Connectly in standalone application mode. Enjoy the full experience!
              </p>
            </div>
          ) : (
            <>
              {/* Direct One-Click Install Button if supported */}
              {isInstallable && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <button
                    onClick={handleInstallClick}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <SparklesIcon size={18} />
                    <span>Install Connectly Now</span>
                  </button>
                  <p
                    style={{
                      textAlign: 'center',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.45rem'
                    }}
                  >
                    Quick 1-click installation on your device with no app store download required.
                  </p>
                </div>
              )}

              {/* Platform Instructions Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '0.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    gap: '0.25rem'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('android')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeTab === 'android' ? 'var(--primary)' : 'transparent',
                      color: activeTab === 'android' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Android
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('desktop')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeTab === 'desktop' ? 'var(--primary)' : 'transparent',
                      color: activeTab === 'desktop' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Windows / PC
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ios')}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: activeTab === 'ios' ? 'var(--primary)' : 'transparent',
                      color: activeTab === 'ios' ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    iOS / iPhone
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions based on selected tab */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                {activeTab === 'android' && (
                  <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.6' }}>
                    <li>Open <strong>Chrome</strong> or your preferred Android browser.</li>
                    <li>Tap the <strong>three vertical dots (⋮)</strong> at the top right of the browser.</li>
                    <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Confirm by clicking <strong>"Install"</strong> to launch Connectly from your home screen anytime!</li>
                  </ol>
                )}

                {activeTab === 'desktop' && (
                  <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.6' }}>
                    <li>Look at the right side of your browser address bar in <strong>Chrome</strong> or <strong>Edge</strong>.</li>
                    <li>Click the <strong>Install icon (⊞ or ⊕)</strong>.</li>
                    <li>Or click the browser menu (<strong>⋮</strong> or <strong>⋯</strong>) &rarr; <strong>Apps</strong> &rarr; <strong>"Install Connectly"</strong>.</li>
                    <li>Connectly will launch in its own standalone window with taskbar and desktop shortcuts!</li>
                  </ol>
                )}

                {activeTab === 'ios' && (
                  <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.6' }}>
                    <li>Open Connectly in <strong>Safari</strong> on your iPhone or iPad.</li>
                    <li>Tap the <strong>Share</strong> button (the square with an upward arrow ⎋) at the bottom.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).</li>
                    <li>Tap <strong>"Add"</strong> in the top-right corner to place the Connectly app icon on your home screen!</li>
                  </ol>
                )}
              </div>

              {/* Features List */}
              <div
                style={{
                  marginTop: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <CheckIcon size={14} className="text-primary" />
                  <span>Standalone window</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <CheckIcon size={14} className="text-primary" />
                  <span>Instant launch speed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <CheckIcon size={14} className="text-primary" />
                  <span>Safe offline caching</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <CheckIcon size={14} className="text-primary" />
                  <span>Real-time live spaces</span>
                </div>
              </div>
            </>
          )}

          {/* Close button at bottom */}
          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button
              onClick={closeInstallModal}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

