# Free-tier deployment guide

## Required free services only

- Frontend: Vercel free tier or Netlify free tier.
- Backend: Render free tier, Railway free tier, or Fly.io free allowance.
- Database/Auth/Storage: Supabase free tier.
- Live cache/session state: Upstash Redis free tier.
- Realtime: self-hosted Socket.io in the backend process.

## Supabase setup

1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Use Supabase Auth for user signup/login.
4. Store public assets in a free Supabase Storage bucket.
5. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend host environment.

## Upstash setup

1. Create a free Upstash Redis database.
2. Copy the REST URL and token.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the backend host.

## Backend deployment

Use Render/Railway/Fly.io free tier with:

```bash
npm install
npm run build -w apps/server
npm run start -w apps/server
```

Set `CORS_ORIGIN` to the deployed frontend origin. The health endpoint is `/health`.

## Frontend deployment

Use Vercel or Netlify free tier with:

```bash
npm install
npm run build -w apps/web
```

Set `VITE_SERVER_URL` to the deployed backend URL.

## Recovery and scaling notes

- Redis stores hot room state with a six-hour TTL for reconnects.
- Supabase stores backup snapshots in `game_states` every five authoritative state versions and at game end.
- Socket.io rooms isolate broadcasts by `roomId`.
- For horizontal scaling on free-tier experiments, pin a room to one backend instance or add the Socket.io Redis adapter when a free Redis plan supports the required connection pattern.
