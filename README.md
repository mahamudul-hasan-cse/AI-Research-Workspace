# AI-Research-Workspace
AI-Research-Workspace

## AI assistant setup

The `/assistant` chat streams responses from Google Gemini through the
server-side `/api/chat` route.

1. Create a free API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Create `.env.local` in the project root (it is git-ignored) containing:

   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
   ```

3. Restart `npm run dev`.

The key is only read on the server. Do not prefix it with `NEXT_PUBLIC_`.
On Vercel, add the same variable under Project Settings → Environment Variables.
