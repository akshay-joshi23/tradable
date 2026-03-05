/**
 * OAuth and deep-link auth helpers for Supabase.
 * Used for Google Sign-In and magic link redirect handling.
 */
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "./supabase";

/**
 * Call once at app startup (e.g. in _layout or login screen).
 * Required for web; safe to call on native.
 */
export function maybeCompleteAuthSession() {
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * Build redirect URI for OAuth and magic links.
 * Uses tradable:// scheme for deep linking back into the app.
 */
export function getAuthRedirectUri(): string {
  return makeRedirectUri({ scheme: "tradable", path: "auth" });
}

/**
 * Parse tokens from a redirect URL and set the Supabase session.
 * Used after OAuth (Google) or magic link redirect.
 */
export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const { access_token, refresh_token } = params;

  if (!access_token) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? "",
  });

  if (error) {
    throw error;
  }

  return data.session;
}

/**
 * Start Google OAuth flow.
 * Opens browser, user signs in, redirects back to app with tokens.
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("No OAuth URL returned");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success" && result.url) {
    await createSessionFromUrl(result.url);
  }
}
