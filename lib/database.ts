import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type DatabaseProfile = {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  date_of_birth?: string | null;
  birth_verified_at: string | null;
  created_at: string;
  follower_count?: number;
};

export type DatabaseBeverage = {
  id: string;
  name: string;
  category: string;
  subtype: string | null;
  brand: string | null;
  origin: string | null;
  description: string;
  image_url: string | null;
  official_tags: string[];
  average_rating: number | string;
  review_count: number;
};

export type DatabaseReview = {
  id: string;
  beverage_id: string;
  user_id: string;
  rating: number | string;
  body: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  flavour_tags: string[];
  like_count: number;
  comment_count: number;
  image_urls: string[];
};

export type DatabaseComment = {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles:
    | {
        display_name: string;
        username: string | null;
        avatar_url: string | null;
      }
    | {
        display_name: string;
        username: string | null;
        avatar_url: string | null;
      }[];
};

export type DatabaseBadge = {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  target: number;
  progress: number;
  earned_at: string | null;
};

function client() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add the EXPO_PUBLIC_SUPABASE_URL and publishable key.",
    );
  }
  return supabase;
}

function result<T>(data: T | null, error: { message: string } | null) {
  if (error) throw new Error(error.message);
  return data;
}

export async function loadCatalogue() {
  const response = await client()
    .from("beverage_catalogue")
    .select("*")
    .order("name");
  return (result(response.data, response.error) || []) as DatabaseBeverage[];
}

export async function loadProfiles() {
  const [profileResponse, followsResponse] = await Promise.all([
    client()
      .from("profiles")
      .select(
        "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,created_at",
      )
      .order("display_name"),
    client().from("follows").select("following_id"),
  ]);
  const profiles = (result(profileResponse.data, profileResponse.error) ||
    []) as DatabaseProfile[];
  const counts = new Map<string, number>();
  for (const follow of result(followsResponse.data, followsResponse.error) ||
    []) {
    counts.set(follow.following_id, (counts.get(follow.following_id) || 0) + 1);
  }
  return profiles.map((profile) => ({
    ...profile,
    follower_count: counts.get(profile.id) || 0,
  }));
}

export async function loadCurrentProfile(userId: string) {
  const response = await client()
    .from("profiles")
    .select(
      "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,created_at",
    )
    .eq("id", userId)
    .single();
  return result(response.data, response.error) as DatabaseProfile;
}

export async function updateCurrentProfile(
  user: User,
  updates: {
    displayName: string;
    username: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
  },
) {
  const normalizedUsername = updates.username.replace(/^@/, "").trim();
  const profileResponse = await client()
    .from("profiles")
    .update({
      display_name: updates.displayName.trim(),
      username: normalizedUsername || null,
      ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
      ...(updates.avatarUrl ? { avatar_url: updates.avatarUrl } : {}),
    })
    .eq("id", user.id)
    .select(
      "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,created_at",
    )
    .single();
  const profile = result(
    profileResponse.data,
    profileResponse.error,
  ) as DatabaseProfile;

  if (
    updates.email &&
    updates.email.trim().toLowerCase() !== user.email?.toLowerCase()
  ) {
    const authResponse = await client().auth.updateUser({
      email: updates.email.trim().toLowerCase(),
    });
    result(authResponse.data, authResponse.error);
  }
  return profile;
}

export async function updateCurrentDateOfBirth(
  userId: string,
  dateOfBirth: string,
) {
  const response = await client()
    .from("profiles")
    .update({
      date_of_birth: dateOfBirth,
      birth_verified_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(
      "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,created_at",
    )
    .single();
  return result(response.data, response.error) as DatabaseProfile;
}

export async function loadReviews() {
  const response = await client()
    .from("review_details")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return (result(response.data, response.error) || []) as DatabaseReview[];
}

export async function saveReview(input: {
  beverageId: string;
  rating: number;
  body: string;
  tags: string[];
}) {
  const response = await client().rpc("save_review", {
    target_beverage_id: input.beverageId,
    review_rating: input.rating,
    review_body: input.body,
    review_tags: input.tags,
  });
  return result(response.data, response.error) as string;
}

export async function deleteReview(reviewId: string) {
  const response = await client().from("reviews").delete().eq("id", reviewId);
  result(response.data, response.error);
}

export async function loadLikedReviewIds(userId: string) {
  const response = await client()
    .from("review_likes")
    .select("review_id")
    .eq("user_id", userId);
  return (result(response.data, response.error) || []).map(
    (row) => row.review_id as string,
  );
}

export async function toggleReviewLike(reviewId: string) {
  const response = await client().rpc("toggle_review_like", {
    target_review_id: reviewId,
  });
  return Boolean(result(response.data, response.error));
}

export async function loadReviewComments(reviewId: string) {
  const response = await client()
    .from("review_comments")
    .select(
      "id,review_id,user_id,body,created_at,profiles!review_comments_user_id_fkey(display_name,username,avatar_url)",
    )
    .eq("review_id", reviewId)
    .order("created_at");
  return (result(response.data, response.error) || []) as DatabaseComment[];
}

export async function addReviewComment(reviewId: string, body: string) {
  const sessionResponse = await client().auth.getUser();
  const user = result(sessionResponse.data.user, sessionResponse.error) as User;
  const response = await client()
    .from("review_comments")
    .insert({ review_id: reviewId, user_id: user.id, body: body.trim() })
    .select("id")
    .single();
  return result(response.data, response.error) as { id: string };
}

export async function loadDrinklist(userId: string) {
  const response = await client()
    .from("drinklist")
    .select("beverage_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (result(response.data, response.error) || []).map(
    (row) => row.beverage_id as string,
  );
}

export async function toggleDrinklist(beverageId: string) {
  const response = await client().rpc("toggle_drinklist", {
    target_beverage_id: beverageId,
  });
  return Boolean(result(response.data, response.error));
}

export async function loadFollowingIds(userId: string) {
  const response = await client()
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  return (result(response.data, response.error) || []).map(
    (row) => row.following_id as string,
  );
}

export async function toggleFollow(profileId: string) {
  const response = await client().rpc("toggle_follow", {
    target_profile_id: profileId,
  });
  return Boolean(result(response.data, response.error));
}

export async function loadBadges(userId: string) {
  await client().rpc("refresh_my_badges");
  const badgesResponse = await client()
    .from("badges")
    .select("id,name,description,icon_url,target")
    .order("target");
  const progressResponse = await client()
    .from("user_badges")
    .select("badge_id,progress,earned_at")
    .eq("user_id", userId);
  const badges = result(badgesResponse.data, badgesResponse.error) || [];
  const progress = new Map(
    (result(progressResponse.data, progressResponse.error) || []).map((row) => [
      row.badge_id,
      row,
    ]),
  );
  return badges.map((badge) => {
    const userBadge = progress.get(badge.id);
    return {
      ...badge,
      progress: userBadge?.progress || 0,
      earned_at: userBadge?.earned_at || null,
    };
  }) as DatabaseBadge[];
}

export async function loadDrinkRequests(userId: string) {
  const response = await client()
    .from("drink_requests")
    .select("id,drink_name,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return result(response.data, response.error) || [];
}

export async function submitDrinkRequest(drinkName: string) {
  const userResponse = await client().auth.getUser();
  const user = result(userResponse.data.user, userResponse.error) as User;
  const response = await client()
    .from("drink_requests")
    .insert({ user_id: user.id, drink_name: drinkName.trim() })
    .select("id,drink_name,status,created_at")
    .single();
  return result(response.data, response.error);
}

export async function deleteCurrentAccount() {
  const response = await client().rpc("delete_my_account");
  result(response.data, response.error);
  await client().auth.signOut({ scope: "local" });
}

async function uploadPublicImage(
  bucket: "avatars" | "review-images",
  ownerId: string,
  uri: string,
) {
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";
  const path = `${ownerId}/${Date.now()}.${extension}`;
  const file = await fetch(uri);
  const bytes = await file.arrayBuffer();
  const upload = await client()
    .storage.from(bucket)
    .upload(path, bytes, { contentType, upsert: false });
  result(upload.data, upload.error);
  const publicUrl = client().storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: publicUrl.data.publicUrl };
}

export async function uploadAvatar(userId: string, uri: string) {
  const uploaded = await uploadPublicImage("avatars", userId, uri);
  const response = await client()
    .from("profiles")
    .update({ avatar_url: uploaded.publicUrl })
    .eq("id", userId);
  result(response.data, response.error);
  return uploaded.publicUrl;
}

export async function uploadReviewImage(
  userId: string,
  reviewId: string,
  uri: string,
) {
  const uploaded = await uploadPublicImage("review-images", userId, uri);
  const response = await client().from("review_images").insert({
    review_id: reviewId,
    user_id: userId,
    storage_path: uploaded.path,
    public_url: uploaded.publicUrl,
  });
  result(response.data, response.error);
  return uploaded.publicUrl;
}
