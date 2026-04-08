# EasyPartner OS — Claude Code Context

## Projektöversikt
Internt operativsystem för Easypartner AB (franchisee Philip Dejager, Globen Södra, Stockholm).
Byggt för att hantera prospektering, offerter, CRM och intern kommunikation för svenska SMB-försäljning.

- **Repo:** PhilipDj128/easypartner-os
- **Live:** easypartner-os.vercel.app
- **Stack:** Next.js 14 (App Router), Supabase (North EU Stockholm), Vercel, Tailwind CSS, shadcn/ui
- **Workflow:** Philip beskriver krav → Claude skriver Cursor-prompts → Philip klistrar in i Cursor → testar live på Vercel

---

## Tech Stack

| Del | Teknik |
|-----|--------|
| Framework | Next.js 14 (App Router) |
| Databas | Supabase (PostgreSQL, North EU) |
| Auth | Supabase Auth + admin-godkännandeflöde |
| UI | shadcn/ui, Tailwind CSS, dark mode |
| Deploy | Vercel (auto-deploy från main) |
| Mail | Resend |
| Signing | Oneflow-inspirerad digital signering |
| Cron | Vercel Cron Jobs (nattlig auto-prospektering) |

---

## Moduler & Status

### ✅ Klara
- **Prospekteringsmotor** — Google Places API + PageSpeed API, nattlig cron-job
- **Offertbyggare** — 3-stegs wizard (Oneflow-inspirerad), digital signering via Resend
- **Auth/RBAC** — Supabase Auth, admin-godkännandeflöde, rollbaserade rättigheter
- **Intern chatt** — Slack-liknande chattmodul

### 🔄 Pågående / Planerat
- shadcn dark-mode redesign (globalt)
- Utökad quote builder-funktionalitet
- CRM-modul för klienthantering
- Klientportal (externt inlogg för slutkunder)

---

## Databasstruktur (Supabase)

Viktiga tabeller:
- `users` — med roller (admin, agent, viewer) och godkännandestatus
- `prospects` — prospektdata från Google Places + manuellt
- `quotes` — offerter med status (draft, sent, signed)
- `clients` — aktiva kunder
- `messages` — intern chatt

Admin-konto: Philip94lgs@gmail.com (admin)
Sekundär användare: Hassan Damerji

---

## Viktiga Regler & Konventioner

### Kod
- Använd alltid **App Router** (inte Pages Router)
- Komponenter i `app/` eller `components/`
- Server Components som standard — Client Components (`"use client"`) bara när nödvändigt
- Alla Supabase-anrop via server-side (API routes eller Server Components)
- Miljövariabler: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### UI/Design
- shadcn/ui komponenter genomgående
- Dark mode är default
- Tailwind för all styling — inga CSS-filer om det inte behövs
- Scandinavisk, ren design — minimalistisk

### Deploy
- Push till `main` = auto-deploy på Vercel
- Testa alltid lokalt med `npm run dev` innan push
- Vercel env-variabler sätts i Vercel dashboard (inte i .env som pushas)

---

## Produkter Easypartner säljer (kontext för offert-modulen)

- SEO & webbplatser
- Microsoft 365 (EP Klient)
- IT-säkerhet / NIS2-compliance
- Telefoni (Dstny)
- Hardware
- AI-lösningar (Synthflow, m.fl.)

---

## Lokalt Dev-Setup

```bash
npm install
npm run dev        # Startar på localhost:3000
```

Supabase: Använd produktions-DB (North EU Stockholm) — ingen lokal Supabase-instans.

---

## Affärskontext

- Målgrupp: Svenska SMBs, fokus på städ, vård, hantverkare
- Säljkanal: Direktförsäljning, kalla samtal, LinkedIn
- Intäktsmål: ~3M SEK/år recurring
- Fakturering: Månadsvis SaaS-liknande paket

---

## Relaterade Projekt

- **AZMA Gruppen** — azmagruppen.com (GitHub: PhilipDj128/azmagruppen) — statisk HTML på Vercel, B2B advisory
- **Klientsajter** — separata repos per kund (Erikas Städ, Kök & Bad, AMAECHISON, Rörfiness, m.fl.)
