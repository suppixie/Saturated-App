import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { supabase } from "./supabase";

const ANONYMOUS_ID_KEY = "saturated.telemetry.anonymous-id";
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const APP_VERSION = "1.0.0";
const ALLOWED_EVENTS = new Set([
  "app_opened",
  "screen_viewed",
  "search_performed",
  "drink_opened",
  "review_submitted",
  "drink_saved",
  "profile_followed",
  "notification_opened",
]);

let anonymousIdPromise: Promise<string> | undefined;

async function anonymousId() {
  if (!anonymousIdPromise) {
    anonymousIdPromise = (async () => {
      const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
      if (stored) return stored;
      const created = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      await AsyncStorage.setItem(ANONYMOUS_ID_KEY, created);
      return created;
    })();
  }
  return anonymousIdPromise;
}

function safeText(value: unknown, limit = 1_500) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(access_token|refresh_token|apikey|authorization)=?[^\s&]+/gi, "$1=[redacted]")
    .slice(0, limit);
}

function safeProperties(properties: Record<string, unknown>) {
  const allowed: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties).slice(0, 12)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/i.test(key)) continue;
    if (typeof value === "string") allowed[key] = safeText(value, 100);
    else if (typeof value === "number" || typeof value === "boolean" || value === null)
      allowed[key] = value;
  }
  return allowed;
}

async function identity() {
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return { userId: user?.id || null, anonymousId: await anonymousId() };
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
) {
  if (!supabase || !ALLOWED_EVENTS.has(eventName)) return;
  try {
    const ids = await identity();
    await supabase.from("analytics_events").insert({
      user_id: ids.userId,
      anonymous_id: ids.anonymousId,
      session_id: SESSION_ID,
      event_name: eventName,
      properties: safeProperties(properties),
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
  } catch {
    // Analytics must never affect the product experience.
  }
}

export async function captureCrash(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (!supabase) return;
  try {
    const ids = await identity();
    const resolved = error instanceof Error ? error : new Error(String(error));
    await supabase.from("crash_reports").insert({
      user_id: ids.userId,
      anonymous_id: ids.anonymousId,
      message: safeText(resolved.message, 1_000),
      stack: safeText(resolved.stack, 5_000),
      context: safeProperties(context),
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
  } catch {
    // Crash reporting must not create a second crash.
  }
}

type ErrorUtilsShape = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

export function installCrashReporter() {
  const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsShape })
    .ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void captureCrash(error, { fatal: Boolean(isFatal), source: "global_handler" });
    previous?.(error, isFatal);
  });
}
