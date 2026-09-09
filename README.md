# Bayline

**From check-in to keys back.**

Vehicle-first operations software for independent repair shops, mechanics, and automotive service centers. Built by **B&C Software & Web** on the reusable B&C Core.

Live demo (GitHub Pages, `gh-pages` branch):  
https://astridbonoan.github.io/autoshop_management_system.io/

## Demo sign-in

All seeded demo accounts use the password `demo123`.

| Role | Email |
| --- | --- |
| Administrator | `admin@bcsoftware.demo` |
| Manager | `manager@bcsoftware.demo` |
| Service Advisor | `advisor@bcsoftware.demo` |
| Technician | `employee@bcsoftware.demo` |
| Technician | `mike@bcsoftware.demo` |

The application runs in **demo mode** when Supabase environment variables are not set. Demo data is stored in the browser. Authorization is still enforced in the application data layer, not only in the UI.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase-ready authentication, schema, and Row Level Security
- GitHub Actions for lint, test, and build
- GitHub Pages from the `gh-pages` branch

## Local development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Supabase

1. Create a project in Supabase.
2. Run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_autoshop.sql`.
3. Copy `.env.example` to `.env` and set:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit the service-role key. The frontend may only use the public anonymous key.

## GitHub Pages

Repository Settings → Pages → Deploy from a branch → `gh-pages` / root.

The production workflow deploys `main` to `gh-pages` after tests pass. Hash routing is used so the single-page app works under `/autoshop_management_system.io/`.

## Architecture

**B&C Core** remains reusable: authentication, users, roles, permissions, notifications, activity, documents, search, settings, dashboard framework, and reporting framework.

**Bayline** is the automotive layer: customers (core clients), vehicles, appointments, repair orders, inspections, estimates, parts, inventory, technicians, scheduling, and payments.

Typical workflow:

Customer → Vehicle → Appointment → Check-in → Inspection → Estimate → Approval → Repair order → Technician → Parts/labor → Quality check → Ready for pickup → Payment → Vehicle history

## Source control

`main` is the stable integrated branch. Features are developed on dedicated branches, tested, then merged.
