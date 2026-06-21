import { useEffect, useMemo, useState } from "react";
import type { User } from "oidc-client-ts";

import { clearCallbackUrl, completeSigninOnce, createUserManager, readPublicConfig, safeError, safeUser, type PublicEnv } from "./auth";
import "./styles.css";

export default function App() {
  const manager = useMemo(() => createUserManager(readPublicConfig(import.meta.env as unknown as PublicEnv)), []);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(window.location.pathname === "/auth/callback");

  useEffect(() => {
    if (window.location.pathname !== "/auth/callback") return;
    let active = true;
    completeSigninOnce(manager)
      .then((result) => { if (active) setUser(result); })
      .catch((reason: unknown) => { if (active) setError(safeError(reason)); })
      .finally(() => {
        clearCallbackUrl();
        if (active) setBusy(false);
      });
    return () => { active = false; };
  }, [manager]);

  async function login() {
    setError("");
    setBusy(true);
    try {
      await manager.signinRedirect({ extraQueryParams: { prompt: "login" } });
    } catch (reason: unknown) {
      setError(safeError(reason));
      setBusy(false);
    }
  }

  async function logout() {
    await manager.removeUser();
    setUser(null);
  }

  if (busy) return <main><section className="card" aria-live="polite"><p>Completing sign-in…</p></section></main>;
  const profile = user ? safeUser(user) : null;
  return (
    <main>
      <section className="card" aria-labelledby="title">
        <p className="eyebrow">MYDATUM PARTNER REFERENCE</p>
        <h1 id="title">Public browser sign-in</h1>
        <p>Authorization Code with PKCE. Tokens remain in memory and disappear on reload.</p>
        {error && <div className="error" role="alert">{error}</div>}
        {profile ? (
          <div className="profile">
            <h2>Signed in</h2>
            <dl><dt>Opaque subject</dt><dd>{profile.subject}</dd><dt>Email</dt><dd>{profile.email ?? "Not shared"}</dd></dl>
            <button type="button" onClick={logout}>Sign out locally</button>
          </div>
        ) : (
          <button type="button" onClick={login} disabled={busy}>{busy ? "Starting sign-in…" : "Sign in with MyDatum"}</button>
        )}
        <p className="note">For financial, health, administrative, or long-lived sessions, use the backend-for-frontend pattern.</p>
      </section>
    </main>
  );
}
