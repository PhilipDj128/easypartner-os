'use client';

import { useState } from 'react';

interface SendLoginLinkButtonProps {
  email: string | null;
  customerName: string;
}

export function SendLoginLinkButton({ email, customerName }: SendLoginLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!email) return null;

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kunde inte skicka');
        return;
      }
      setSent(true);
    } catch {
      setError('Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
        Inloggningslänk skickad till {email}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white transition-all duration-150 hover:bg-white/5 disabled:opacity-60"
      >
        {loading ? 'Skickar...' : 'Skicka inloggningslänk'}
      </button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
