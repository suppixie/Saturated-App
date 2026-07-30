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

export async function signUpWithEmail(
  displayName: string,
  email: string,
  password: string,
) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
      data: { full_name: displayName.trim() },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithProvider(provider: "google" | "apple") {
  const client = requireSupabase();
  const redirectTo = getRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== "web",
    },
  });
  if (error) throw error;
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
