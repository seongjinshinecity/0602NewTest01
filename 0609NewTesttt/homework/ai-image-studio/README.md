# ✦ AI Image Studio

A Midjourney-style text-to-image web app. Type a prompt, pick a style and aspect
ratio, and generate images with **FLUX** via the **fal.ai** queue API. Sign in,
build a private gallery, and download your creations.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(Auth + Postgres + Storage) · fal.ai**.

---

## ✨ Features

- Email/password **auth** (sign up / sign in / sign out) via Supabase
- **Text-to-image** generation with FLUX
- Generation **options**: aspect ratio (1:1 / 16:9 / 9:16), style (Realistic /
  Anime / Cinematic / Fantasy), and **negative prompt**
- **Async queue** flow (submit → poll) so requests never hit serverless timeouts
- Images **persisted to Supabase Storage** (fal URLs expire)
- **History + gallery**, **download**, animated loading state
- **Dark, polished UI** — left nav · center composer · right results — fully responsive
- **Row Level Security** on the table *and* the storage bucket: users only ever
  see their own images

---

## 📁 Project structure

```
ai-image-studio/
├─ app/
│  ├─ layout.tsx              # root layout (dark)
│  ├─ globals.css             # Tailwind + theme
│  ├─ page.tsx                # Studio (protected) — left nav, composer, results
│  ├─ login/page.tsx          # sign in
│  ├─ signup/page.tsx         # sign up
│  ├─ gallery/page.tsx        # full grid of the user's images
│  ├─ auth/callback/route.ts  # email-confirm / OAuth code exchange
│  └─ api/
│     ├─ generate/route.ts    # POST  submit job to fal, insert row
│     └─ status/route.ts      # GET   poll fal, store image, update row
├─ components/
│  ├─ AuthForm.tsx
│  ├─ Sidebar.tsx
│  ├─ Studio.tsx              # client orchestrator: state + polling
│  ├─ PromptComposer.tsx      # prompt + options form
│  ├─ ResultPanel.tsx         # featured image, loading canvas, recent strip
│  └─ ImageCard.tsx           # image + download
├─ lib/
│  ├─ constants.ts            # aspect ratios, styles, prompt modifiers
│  ├─ types.ts                # shared TypeScript types
│  ├─ fal.ts                  # fal.ai queue REST wrapper
│  └─ supabase/
│     ├─ client.ts            # browser client
│     ├─ server.ts            # server (RSC / route) client
│     └─ middleware.ts        # session refresh + route guard
├─ middleware.ts              # wires up the auth middleware
├─ supabase/schema.sql        # DB tables, RLS, storage bucket + policies
├─ .env.local.example
└─ ...config (next, tailwind, tsconfig, postcss, eslint)
```

---

## 🗄️ Database design (Supabase)

**`public.generations`** — one row per request:

| column            | type          | notes                                            |
| ----------------- | ------------- | ------------------------------------------------ |
| `id`              | uuid (PK)     | `gen_random_uuid()`                              |
| `user_id`         | uuid (FK)     | → `auth.users(id)`, cascade delete               |
| `prompt`          | text          | user's prompt (raw)                              |
| `negative_prompt` | text          | nullable                                         |
| `style`           | text          | `realistic` / `anime` / `cinematic` / `fantasy`  |
| `aspect_ratio`    | text          | `1:1` / `16:9` / `9:16`                          |
| `model`           | text          | e.g. `fal-ai/flux/dev`                           |
| `fal_request_id`  | text          | fal queue request id (for polling)               |
| `image_path`      | text          | path in the storage bucket                       |
| `image_url`       | text          | public URL of the stored image                   |
| `status`          | text          | `pending` / `processing` / `completed` / `failed`|
| `error`           | text          | failure detail                                   |
| `created_at`      | timestamptz   | `now()`                                          |

- **RLS** restricts every operation to `auth.uid() = user_id`.
- **Storage bucket** `generations` (public read); writes restricted so the first
  path segment must equal the user's id (`<user_id>/<generation_id>.jpg`).

The full SQL lives in [`supabase/schema.sql`](./supabase/schema.sql).

---

## 🔌 API design

All routes are server-side and require an authenticated Supabase session.

### `POST /api/generate`
Submits a job to the fal queue and creates a `processing` row.

```jsonc
// request
{ "prompt": "a fox in a snowy forest", "negativePrompt": "blurry",
  "style": "cinematic", "aspectRatio": "16:9" }
// response
{ "id": "<generation uuid>", "requestId": "<fal request id>" }
```

The server appends style modifiers to the prompt and maps the aspect ratio to a
fal `image_size`.

### `GET /api/status?id=<generation uuid>`
Polls fal using the `status_url` fal returned at submit (persisted on the row —
fal collapses the model path in the requests URL, so we never reconstruct it).
When fal reports `COMPLETED`, the server downloads the image, uploads it to
Storage, and flips the row to `completed`.

```jsonc
{ "id": "...", "status": "processing" | "completed" | "failed",
  "imageUrl": "https://...", "error": null }
```

The client polls this every 1.5s until a terminal state.

> **Negative prompt note:** the field is wired end-to-end and sent to fal.
> `fal-ai/flux/dev` (the default) currently *ignores* `negative_prompt`. To make
> it effective, set `FAL_MODEL` to a CFG-capable fal model — no code change needed.

---

## 🚀 Run locally

**Prerequisites:** Node 18.18+ and a free [Supabase](https://supabase.com) project
and [fal.ai](https://fal.ai) account.

1. **Install**
   ```bash
   cd ai-image-studio
   npm install
   ```

2. **Set up Supabase**
   - Create a project, then open **SQL Editor** and run
     [`supabase/schema.sql`](./supabase/schema.sql).
   - (Auth → Providers) Email is on by default. For instant local testing you can
     turn **off** "Confirm email" under Auth → Sign In / Providers.

3. **Configure env** — copy and fill in:
   ```bash
   cp .env.local.example .env.local
   ```
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=...        # Supabase → Project Settings → API
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   FAL_KEY=key_id:key_secret           # fal.ai → Dashboard → Keys
   FAL_MODEL=fal-ai/flux/dev           # optional (try fal-ai/flux/schnell for speed)
   ```

4. **Dev server**
   ```bash
   npm run dev
   # http://localhost:3000  → redirects to /login → sign up → generate
   ```

---

## ☁️ Deploy (Vercel)

1. Push this folder to a Git repo and **Import** it in Vercel.
2. Add the same env vars (**Project Settings → Environment Variables**):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `FAL_KEY`,
   `FAL_MODEL`, and `NEXT_PUBLIC_SITE_URL` (your production URL).
3. In **Supabase → Auth → URL Configuration**, add your Vercel domain to the
   redirect allow-list (e.g. `https://your-app.vercel.app/auth/callback`).
4. Deploy. `next build` runs automatically.

The status route uses `runtime = "nodejs"`; default function limits are plenty
because generation runs on fal's queue, not inside the request.

> Any host that runs `next build` / `next start` (Render, Fly, a Node server)
> works too — Vercel is just the zero-config path.

---

## 🔒 Security notes

- `FAL_KEY` is **server-only** (never `NEXT_PUBLIC_`), so it stays out of the browser.
- `.env.local` is gitignored — never commit secrets.
- **If a key was ever shared in plaintext, rotate it** in the fal.ai dashboard.
- RLS is enforced on both the table and the storage bucket.
