/**
 * @file BillingBanner.tsx
 * @description Component for billing session management banner
 */

import React from 'react';

interface BillingBannerProps {
  providerId: string | undefined;
  onSaveSession: () => void;
  isSaving: boolean;
}

export function BillingBanner({ providerId, onSaveSession, isSaving }: BillingBannerProps) {
  if (!providerId) return null;

  return (
    <div className="bg-indigo-600 border-b border-indigo-500 p-3 flex items-center justify-between shadow-lg z-50">
      <div className="text-white font-bold text-sm tracking-wide">
        Log in to the provider, then click here to save session.
      </div>
      <button
        onClick={onSaveSession}
        disabled={isSaving}
        className="bg-white text-indigo-600 px-4 py-1.5 rounded font-bold text-xs shadow hover:bg-zinc-100 disabled:opacity-50 transition-colors"
      >
        {isSaving ? 'Saving...' : 'Set as Billing Link & Save Session'}
      </button>
    </div>
  );
}
