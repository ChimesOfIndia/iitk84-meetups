# IITK84 MeetUps

A meetup organiser for the IITK Class of 1984 batch.

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
3. Install dependencies: `npm install`
4. Run locally: `npm run dev`
5. Build: `npm run build`

## Deploy on Vercel

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
