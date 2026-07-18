import * as client from "openid-client";
import { env } from "../../config/env";

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export function oauthRedirectBase(): string {
  return stripTrailingSlash(env.FRONTEND_URL);
}

const googleConfigCache: { current?: Promise<client.Configuration> } = {};
const microsoftConfigCache = new Map<string, Promise<client.Configuration>>();

export async function getGoogleOidcConfiguration(
  clientId: string,
  clientSecret: string
): Promise<client.Configuration> {
  if (!googleConfigCache.current) {
    const redirectUri = `${oauthRedirectBase()}/api/auth/oidc/google/callback`;
    googleConfigCache.current = client.discovery(
      new URL("https://accounts.google.com"),
      clientId,
      { redirect_uris: [redirectUri] },
      client.ClientSecretPost(clientSecret)
    );
  }
  return googleConfigCache.current;
}

export async function getMicrosoftOidcConfiguration(
  tenant: string,
  clientId: string,
  clientSecret: string
): Promise<client.Configuration> {
  const key = tenant;
  let p = microsoftConfigCache.get(key);
  if (!p) {
    const redirectUri = `${oauthRedirectBase()}/api/auth/oidc/microsoft/callback`;
    const issuerUrl = new URL(`https://login.microsoftonline.com/${tenant}/v2.0`);
    p = client.discovery(issuerUrl, clientId, { redirect_uris: [redirectUri] }, client.ClientSecretPost(clientSecret));
    microsoftConfigCache.set(key, p);
  }
  return p;
}
