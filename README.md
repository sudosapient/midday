![hero](github.png)

<p align="center">
	<h1 align="center"><b>Midday</b></h1>
<p align="center">
    Your AI-Powered Business Assistant
    <br />
    <br />
    <a href="https://midday.ai">Website</a>
    ·
    <a href="https://github.com/midday-ai/midday/issues">Issues</a>
  </p>
</p>

<p align="center">
  <a href="https://go.midday.ai/K7GwMoQ">
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </a>
</p>

## About Midday

Midday is an all-in-one tool designed to help freelancers, contractors, consultants, and solo entrepreneurs manage their business operations more efficiently. It integrates various functions typically scattered across multiple platforms into a single, cohesive system.


## Features

**Time Tracking**: Allows for live time tracking of projects to boost productivity and collaboration, providing insightful project overviews.<br/>
**Invoicing**: An upcoming feature that will enable users to create web-based invoices, collaborate in real-time, and synchronize projects seamlessly.<br/>
**Magic Inbox**: Automatically matches incoming invoices or receipts to the correct transactions, simplifying financial tracking and organization.<br/>
**Vault**: Secure storage for important files like contracts and agreements, keeping everything in one place for easy access​.<br/>
**Seamless Export**: Facilitates easy export of financial data, packaged neatly in CSV files for accountants.<br/>
**Assistant**: Provides tailored insights into financial situations, helping users understand spending patterns, cut costs, and find documents.<br/>




## Get started

We are working on the documentation to get started with Midday for local development: https://docs.midday.ai

## Supabase deployment modes

Midday can run against either a local Supabase stack or a hosted Supabase
project. A hybrid development setup is also supported, where the Midday
dashboard, API, worker, and Redis run locally while Auth, Postgres, Storage,
and Realtime are provided by Supabase Cloud.

### Fully local

The provided `compose.local.yml` is configured for Supabase CLI containers
started with `supabase start`. In this mode, Midday and Supabase communicate
over the external `supabase_network_midday-mod` Docker network while the
browser uses the host-facing Supabase URL at `http://127.0.0.1:54321`.

### Local application with Supabase Cloud

The application code supports a hosted Supabase project. Configure the public
and server URLs to use the hosted project, along with its Postgres and
S3-compatible Storage credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_INTERNAL_URL=https://PROJECT_REF.supabase.co
SUPABASE_AUTH_ISSUER=https://PROJECT_REF.supabase.co/auth/v1

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...

DATABASE_PRIMARY_URL=postgresql://...
DATABASE_PRIMARY_POOLER_URL=postgresql://...
DATABASE_SESSION_POOLER=postgresql://...
DATABASE_SSL_DISABLED=false

R2_ENDPOINT=https://PROJECT_REF.supabase.co/storage/v1/s3
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=apps
```

The hosted project must have the Midday database migrations, RLS policies,
Realtime publication configuration, Storage buckets, and Storage policies
applied before starting the application.

> [!IMPORTANT]
> Treat Supabase as one logical unit. Auth, Postgres, Realtime, Storage, API
> URLs, and credentials should all belong to the same Supabase project. Mixing
> local Auth with a cloud database, or using Storage from another project, is
> not supported.

`NEXT_PUBLIC_*` variables are embedded in the dashboard at build time, so the
dashboard image must be rebuilt when changing the Supabase URL or publishable
key. Secret keys, database credentials, and S3 secret keys must never be
exposed through `NEXT_PUBLIC_*` variables.

The current `compose.local.yml` intentionally hardcodes local Supabase
addresses and disables database TLS. To use Supabase Cloud with Docker
Compose, provide a Compose override that replaces those values and rebuild the
dashboard. Setting cloud values only in `.env.compose.local` is insufficient
because values declared directly in `compose.local.yml` take precedence.

## App Architecture

- Monorepo
- Bun
- React
- TypeScript
- Nextjs
- Supabase
- Shadcn
- Tauri
- Expo
- TailwindCSS

### Hosting

- Supabase (database, storage, realtime, auth)
- Railway (API, Worker, Dashboard)
- Vercel (Website)
- Cloudflare (Engine, CDN/Proxy)

### Services

- Trigger.dev (background jobs)
- Resend (Transactional & Marketing)
- Github Actions (CI/CD)
- GoCardLess (Bank connection EU)
- Plaid (Bank connection in Canada and US)
- Teller (Bank connection in the US)
- OpenPanel (Events and Analytics)
- Polar (Payment processing)
- Typesense (Search)
- Gemini
- OpenAI

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/96aae855e5dd87c30d53c1d154b37cf7aa5a89b3.svg "Repobeats analytics image")

## License

This project is licensed under the **[AGPL-3.0](https://opensource.org/licenses/AGPL-3.0)** for non-commercial use. 

### Commercial Use

For commercial use or deployments requiring a setup fee, please contact us
for a commercial license at [engineer@midday.ai](mailto:engineer@midday.ai).

By using this software, you agree to the terms of the license.
