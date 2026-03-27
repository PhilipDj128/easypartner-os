'use client';

import { useState } from 'react';
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

    try {
      const res = await fetch('/api/auth/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte skicka länk.');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Något gick fel. Försök igen.');
    }

    setLoading(false);
  };

  const urlError = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('error') : null;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        background: 'var(--background)',
        backgroundImage: [
          'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          'radial-gradient(ellipse 60% 60% at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        ].join(', '),
        backgroundSize: '24px 24px, 100% 100%',
      }}
    >
      {/* Subtle glow behind card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            Kundportal
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Logga in med din e-post — vi skickar en säker länk.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 0 40px rgba(0,0,0,0.3), 0 0 80px rgba(99,102,241,0.04)',
          }}
        >
          {urlError === 'access_denied' && (
            <div
              className="mb-6 rounded-lg p-3 text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.15)',
                color: '#fca5a5',
              }}
            >
              Åtkomst nekad — din e-post har inte behörighet. Kontakta administratören.
            </div>
          )}

          {(urlError === 'auth' || urlError === 'missing_code') && (
            <div
              className="mb-6 rounded-lg p-3 text-sm"
              style={{
                background: 'rgba(251,146,60,0.08)',
                border: '1px solid rgba(251,146,60,0.2)',
                color: '#fdba74',
              }}
            >
              Inloggningen misslyckades. Länken kan ha gått ut — begär en ny nedan.
            </div>
          )}

          {sent ? (
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#86efac" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="font-heading text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Kolla din e-post
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                Vi har skickat en inloggningslänk till{' '}
                <span style={{ color: '#a5b4fc' }}>{email}</span>.
                Klicka på länken för att logga in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-sm hover:underline"
                style={{ color: 'var(--muted)' }}
              >
                Skicka igen med annan e-post
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  E-postadress
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[var(--muted-foreground)]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="namn@foretag.se"
                />
              </div>

              {error && (
                <div
                  className="rounded-lg p-3 text-sm"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#fca5a5',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.2)',
                }}
                onMouseOver={(e) => {
                  if (!loading) (e.target as HTMLButtonElement).style.filter = 'brightness(1.15)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.filter = 'none';
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round"/>
                    </svg>
                    Skickar...
                  </span>
                ) : (
                  'Skicka inloggningslänk'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Är du partner?{' '}
          <Link href="/" className="hover:underline" style={{ color: '#a5b4fc' }}>
            Gå till EasyPartner OS
          </Link>
        </p>
      </div>
    </div>
  );
}
