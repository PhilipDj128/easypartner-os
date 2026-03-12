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
      <span className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
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
        className="rounded-lg border border-brand-500 px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 disabled:opacity-60"
      >
        {loading ? 'Skickar...' : 'Skicka inloggningslänk'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
