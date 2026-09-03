// Whether cookies this app sets should be marked Secure (HTTPS-only). Not
// applied unconditionally — a Secure cookie is silently rejected by the
// browser on a plain http:// origin, which is exactly how this project
// runs locally (npm run dev on http://localhost:3000). Production (Vercel)
// is HTTPS-only, so this is on there and nowhere else.
export const SECURE_COOKIES = process.env.NODE_ENV === 'production'
