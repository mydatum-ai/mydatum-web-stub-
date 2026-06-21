# MyDatum Partner login: React public client

This sample is for low-risk browser applications registered as **public clients**. It uses
`oidc-client-ts` to generate state, nonce, a PKCE verifier, and an S256 challenge with Web Crypto;
exchange the code without a secret; and validate the signed ID token through discovery and JWKS.

Copy `.env.example` to `.env`, set a public Partner client ID, then run:

```sh
npm ci
npm run lint
npm test
npm run build
npm run dev:local
```

From the repository root, the equivalent container workflow uses the root `.env` variable names and
`docker compose --profile react up --build -d`. React configuration is embedded during the image
build, so rebuild after changing it.

Register `http://127.0.0.1:4173/auth/callback` and browser origin
`http://127.0.0.1:4173` exactly (or change registration and config together).
Use `openid` alone for private sign-in; add `email` only when required and handle it being absent.

If Partner generated a different loopback port, run Vite with
`npx vite --host=127.0.0.1 --port=<registered-port> --strictPort` and keep the configured redirect
and browser origin exact.
`localhost` and `127.0.0.1` are different OAuth redirect hosts.

Tokens use an in-memory store. Only the short-lived, one-time authorization transaction is placed
in `sessionStorage`; tokens never use `localStorage`, `sessionStorage`, URLs, logs, or rendered error
details. Reloading intentionally loses the login and requires reauthentication. Duplicate, expired,
or wrong-tab callbacks fail because the transaction is one-time and tab-scoped; callback parameters
are removed from browser history after success or failure. A network failure returns to a clean retry
and displays a redacted error instead of leaving the sign-in button apparently inactive.

Any XSS can act with the authority of the running page even when tokens are in memory. Prefer the
Node or Django backend-for-frontend reference for high-risk data, long sessions, stricter auditing,
or applications that need server-side revocation and token custody.
