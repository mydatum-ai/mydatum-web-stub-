import { InMemoryWebStorage, UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

const callbackCompletions = new WeakMap<UserManager, Promise<User>>();

export type PublicConfig = Readonly<{
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}>;

export type PublicEnv = Readonly<{
  VITE_MYDATUM_ISSUER?: string;
  VITE_MYDATUM_CLIENT_ID?: string;
  VITE_MYDATUM_REDIRECT_URI?: string;
  VITE_MYDATUM_SCOPES?: string;
}>;

export function readPublicConfig(env: PublicEnv): PublicConfig {
  const authority = env.VITE_MYDATUM_ISSUER?.replace(/\/$/, "");
  const clientId = env.VITE_MYDATUM_CLIENT_ID;
  const redirectUri = env.VITE_MYDATUM_REDIRECT_URI;
  const scope = env.VITE_MYDATUM_SCOPES || "openid";
  if (!authority || !clientId || !redirectUri) throw new Error("Public MyDatum configuration is incomplete");
  if (!scope.split(/\s+/).includes("openid")) throw new Error("Scopes must include openid");
  return Object.freeze({ authority, clientId, redirectUri, scope });
}

export function createUserManager(config: PublicConfig): UserManager {
  return new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    automaticSilentRenew: false,
    monitorSession: false,
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage, prefix: "mydatum.tx." }),
  });
}

export function completeSigninOnce(manager: UserManager): Promise<User> {
  const existing = callbackCompletions.get(manager);
  if (existing) return existing;

  const completion = manager.signinRedirectCallback();
  callbackCompletions.set(manager, completion);
  return completion;
}

export function safeUser(user: User) {
  return {
    subject: user.profile.sub,
    email: typeof user.profile.email === "string" ? user.profile.email : null,
    emailVerified: user.profile.email_verified === true,
  };
}

export function clearCallbackUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

export function safeError(error: unknown): string {
  const value = error as { error?: string; message?: string };
  if (value?.error === "access_denied") return "Sign-in was cancelled.";
  if (value?.error === "invalid_grant") return "Sign-in response was rejected or expired. Please try again. (OIDC-TOKEN)";
  if (value?.error === "invalid_client") return "This application registration was rejected. (OIDC-CLIENT)";
  if (value?.error === "invalid_scope") return "The requested sign-in permissions were rejected. (OIDC-SCOPE)";

  const message = typeof value?.message === "string" ? value.message.toLowerCase() : "";
  if (message.includes("no matching state") || message.includes("no state in response")) {
    return "The sign-in transaction was not found in this browser tab. Please try again. (OIDC-STATE)";
  }
  if (message.includes("state does not match")) {
    return "The sign-in response did not match this browser transaction. Please try again. (OIDC-STATE)";
  }
  if (message.includes("nonce")) {
    return "The sign-in response failed replay protection. Please try again. (OIDC-NONCE)";
  }
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("load failed")) {
    return "The browser could not reach the MyDatum token endpoint. (OIDC-NETWORK)";
  }
  if (message.includes("content-type") || message.includes("json")) {
    return "MyDatum returned an invalid token response. (OIDC-RESPONSE)";
  }
  return "Sign-in could not be completed. Please try again. (OIDC-UNKNOWN)";
}
