import { describe, expect, it, vi } from "vitest";
import type { User, UserManager } from "oidc-client-ts";
import { completeSigninOnce, readPublicConfig, safeError } from "./auth";

describe("public client configuration", () => {
  it("accepts issuer client redirect and openid scope without a secret", () => {
    const config = readPublicConfig({
      VITE_MYDATUM_ISSUER: "https://auth.staging.mydatum.ai/",
      VITE_MYDATUM_CLIENT_ID: "public-client",
      VITE_MYDATUM_REDIRECT_URI: "http://127.0.0.1:4173/auth/callback",
      VITE_MYDATUM_SCOPES: "openid email",
    });
    expect(config.authority).toBe("https://auth.staging.mydatum.ai");
    expect(Object.keys(config).every((key) => !key.toLowerCase().includes("secret"))).toBe(true);
  });

  it("rejects configuration without openid", () => {
    expect(() => readPublicConfig({
      VITE_MYDATUM_ISSUER: "https://auth.staging.mydatum.ai",
      VITE_MYDATUM_CLIENT_ID: "public-client",
      VITE_MYDATUM_REDIRECT_URI: "http://127.0.0.1:4173/auth/callback",
      VITE_MYDATUM_SCOPES: "email",
    })).toThrow(/openid/);
  });

  it("does not disclose provider errors", () => {
    expect(safeError({ error: "access_denied", error_description: "sensitive" })).toBe("Sign-in was cancelled.");
    expect(safeError(new Error("token secret"))).not.toContain("secret");
  });

  it("reports safe callback failure categories", () => {
    expect(safeError(new TypeError("Failed to fetch"))).toContain("OIDC-NETWORK");
    expect(safeError(new Error("No matching state found in storage"))).toContain("OIDC-STATE");
    expect(safeError({ error: "invalid_grant", error_description: "sensitive" })).toContain("OIDC-TOKEN");
  });

});

describe("callback processing", () => {
  it("processes the one-time callback once when React StrictMode re-runs effects", async () => {
    const user = { profile: { sub: "subject" } } as User;
    const signinRedirectCallback = vi.fn().mockResolvedValue(user);
    const manager = { signinRedirectCallback } as unknown as UserManager;

    const first = completeSigninOnce(manager);
    const second = completeSigninOnce(manager);

    expect(first).toBe(second);
    await expect(second).resolves.toBe(user);
    expect(signinRedirectCallback).toHaveBeenCalledOnce();
  });
});
