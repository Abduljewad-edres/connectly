import React, { useState } from 'react';
import { usePWA } from '../context/PWAContext';
import { SparklesIcon } from './Icons';

export const PWAUpdateBanner = () => {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isUpdateAvailable || isDismissed) return null;

  return (
    <aside
      className="pwa-update-banner"
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        background: 'linear-gradient(135deg, #1f1b3c 0%, #17152b 100%)',
        border: '1px solid rgba(139, 92, 246, 0.45)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.3)',
        borderRadius: 'var(--radius-full)',
        padding: '0.55rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        color: '#ffffff',
        fontSize: '0.85rem',
        fontWeight: '500',
        maxWidth: '92%',
        animation: 'slideUpTrans 0.25s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <SparklesIcon size={16} className="text-primary" />
        <span>New version of <strong>Connectly</strong> available!</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={updateApp}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            border: 'none',
            color: '#ffffff',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
          }}
        >
          Update Now
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            padding: '0.2rem 0.4rem'
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </aside>
  );
};

