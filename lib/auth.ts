import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";
import { Linking, Platform } from "react-native";

import { supabase } from "./supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add the EXPO_PUBLIC_SUPABASE_URL and publishable key.",
    );
  }
  return supabase;
}

function getRedirectUrl() {
  const configuredRedirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  if (configuredRedirect) return configuredRedirect;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "saturated://auth/callback";
}

export type EmailSignUpDetails = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
};

export async function signUpWithEmail(details: EmailSignUpDetails) {
  const client = requireSupabase();
  const displayName = `${details.firstName.trim()} ${details.lastName.trim()}`;
  const { data, error } = await client.auth.signUp({
    email: details.email.trim().toLowerCase(),
    password: details.password,
    options: {
      emailRedirectTo: getRedirectUrl(),
      data: {
        first_name: details.firstName.trim(),
        last_name: details.lastName.trim(),
        full_name: displayName,
        username: details.username.trim().replace(/^@/, "").toLowerCase(),
        date_of_birth: details.dateOfBirth,
      },
    },
  });
  if (error) throw error;
  if (data.user && data.user.identities?.length === 0) {
    throw new Error(
      "An account with this email already exists. Choose sign in instead.",
    );
  }
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      throw new Error(
        "Confirm your email using the link Supabase sent you, then sign in again.",
      );
    }
    throw error;
  }
  return data;
}

export async function signInWithProvider(provider: "google" | "apple") {
  const providerName = provider === "google" ? "Google" : "Apple";
  const client = requireSupabase();
  const redirectTo = getRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });
  if (error) {
    if (
      error.message.toLowerCase().includes("not enabled") ||
      error.message.toLowerCase().includes("unsupported provider")
    ) {
      throw new Error(
        `${providerName} sign-in is not enabled in Supabase yet. Use email sign-in for now.`,
      );
    }
    throw error;
  }
  if (Platform.OS !== "web" && data.url) {
    await Linking.openURL(data.url);
  }
  return data;
}

export async function handleAuthCallback(url: string) {
  const client = requireSupabase();
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data.session;
  }

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return data.session;
  }
  return null;
}

export type OAuthConsentRequest = OAuthAuthorizationDetails;

export async function loadOAuthConsentRequest(authorizationId: string) {
  const client = requireSupabase();
  const { data, error } =
    await client.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error) throw error;
  if (!data) throw new Error("This authorization request is no longer valid.");
  return data;
}

export async function answerOAuthConsentRequest(
  authorizationId: string,
  decision: "approve" | "deny",
) {
  const client = requireSupabase();
  const response =
    decision === "approve"
      ? await client.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
      : await client.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        });
  if (response.error) throw response.error;
  if (!response.data?.redirect_url) {
    throw new Error("Supabase did not return an authorization redirect.");
  }
  return response.data.redirect_url;
}
