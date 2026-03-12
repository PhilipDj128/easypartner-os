'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError('Systemet är inte konfigurerat.');
      setLoading(false);
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/client/dashboard`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message || 'Kunde inte skicka länk.');
      return;
    }
    setSent(true);
  };

  const urlError = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('error') : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-sand-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-sand-200 bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-brand-900">Kundportal</h1>
        <p className="mt-2 text-sm text-sand-200">
          Logga in med din e-post. Vi skickar en inloggningslänk till dig.
        </p>

        {(urlError === 'auth' || urlError === 'missing_code') && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Inloggningen misslyckades. Länken kan ha gått ut. Begär en ny nedan.
          </div>
        )}

        {sent ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <p className="font-medium">Kolla din e-post</p>
            <p className="mt-1 text-sm">
              Vi har skickat en inloggningslänk till <strong>{email}</strong>. Klicka på länken
              för att logga in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-600">
                E-postadress
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-sand-200 px-3 py-2 text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="namn@foretag.se"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? 'Skickar...' : 'Skicka inloggningslänk'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-sand-200">
          Är du partner? <Link href="/" className="text-brand-600 hover:underline">Gå till EasyPartner OS</Link>
        </p>
      </div>
    </div>
  );
}
