import type { Screen } from "../types";

export type AppRoute =
  | { name: "explore" }
  | { name: "search"; query?: string; mode?: "beverages" | "profiles" }
  | { name: "drinklist" }
  | { name: "profile" }
  | { name: "feed" }
  | { name: "notifications" }
  | { name: "settings" }
  | { name: "drink"; drinkId: string }
  | { name: "reviewDetail"; reviewId: string }
  | { name: "userProfile"; profileId: string };

const SIMPLE_ROUTES = new Set<AppRoute["name"]>([
  "explore",
  "search",
  "drinklist",
  "profile",
  "feed",
  "notifications",
  "settings",
]);

export function parseAppUrl(rawUrl: string): AppRoute | null {
  try {
    const url = new URL(rawUrl);
    const protocolIsApp = url.protocol === "saturated:";
    const segments = protocolIsApp
      ? [url.hostname, ...url.pathname.split("/")]
      : url.pathname.split("/");
    const clean = segments.filter(Boolean).map(decodeURIComponent);
    const routeName = clean[0];
    if (!routeName) return null;
    if (routeName === "drink" && clean[1]) return { name: "drink", drinkId: clean[1] };
    if (routeName === "review" && clean[1]) return { name: "reviewDetail", reviewId: clean[1] };
    if (routeName === "profile" && clean[1]) return { name: "userProfile", profileId: clean[1] };
    if (routeName === "search") {
      const mode = url.searchParams.get("mode");
      return {
        name: "search",
        query: url.searchParams.get("q") || undefined,
        mode: mode === "profiles" ? "profiles" : "beverages",
      };
    }
    if (SIMPLE_ROUTES.has(routeName as AppRoute["name"]))
      return { name: routeName } as AppRoute;
    return null;
  } catch {
    return null;
  }
}

export function routeToScreen(route: AppRoute): Screen {
  return route.name;
}

export function appUrl(route: AppRoute) {
  if (route.name === "drink") return `saturated://drink/${encodeURIComponent(route.drinkId)}`;
  if (route.name === "reviewDetail") return `saturated://review/${encodeURIComponent(route.reviewId)}`;
  if (route.name === "userProfile") return `saturated://profile/${encodeURIComponent(route.profileId)}`;
  if (route.name === "search") {
    const params = new URLSearchParams();
    if (route.query) params.set("q", route.query);
    if (route.mode) params.set("mode", route.mode);
    return `saturated://search${params.size ? `?${params.toString()}` : ""}`;
  }
  return `saturated://${route.name}`;
}
