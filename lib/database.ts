import type { User } from "@supabase/supabase-js";
import { File as ExpoFile } from "expo-file-system";
import { Platform } from "react-native";

import { supabase } from "./supabase";

export type DatabaseProfile = {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  date_of_birth?: string | null;
  birth_verified_at: string | null;
  terms_accepted_at?: string | null;
  is_suspended?: boolean;
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
  created_at?: string;
  lifecycle_status?: CatalogueLifecycle;
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

export type DatabaseChatGroup = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  drink_type: string;
  visibility: "public" | "private";
  invite_code: string;
  image_url: string | null;
  member_count: number | string;
  joined: boolean;
  created_at: string;
};

export type DatabaseChatMessage = {
  id: string;
  group_id: string;
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

export type DatabaseChatMember = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  is_owner: boolean;
};

export type ReportTargetType = "profile" | "review" | "comment";

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "sexual_content"
  | "dangerous_or_illegal"
  | "misinformation"
  | "intellectual_property"
  | "other";

export type ModerationAction =
  | "dismiss"
  | "hide_content"
  | "restore_content"
  | "suspend_user"
  | "reinstate_user"
  | "resolve_no_action";

export type DatabaseModerationReport = {
  id: string;
  target_type: ReportTargetType;
  reason: ReportReason;
  details: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  created_at: string;
  target_profile_id: string | null;
  target_review_id: string | null;
  target_comment_id: string | null;
  reporter_name: string;
  target_user_id: string | null;
  target_user_name: string | null;
  content_preview: string | null;
};

export type CatalogueLifecycle =
  | "draft"
  | "active"
  | "discontinued"
  | "duplicate"
  | "archived";

export type DatabaseAdminBeverage = {
  id: string;
  name: string;
  category: string;
  subtype: string | null;
  brand: string | null;
  image_url: string | null;
  is_published: boolean;
  lifecycle_status: CatalogueLifecycle;
  duplicate_of: string | null;
  admin_note: string;
  updated_at: string;
  potential_duplicate_ids?: string[];
};

export type DatabaseAdminDrinkRequest = {
  id: string;
  user_id: string;
  drink_name: string;
  status: "pending" | "approved" | "rejected";
  resolution_note: string;
  resolved_beverage_id: string | null;
  created_at: string;
  profiles:
    | { display_name: string; username: string | null }
    | { display_name: string; username: string | null }[]
    | null;
};

export type NotificationKind =
  | "review_like"
  | "review_comment"
  | "follow"
  | "badge_earned";

export type DatabaseNotification = {
  id: string;
  kind: NotificationKind;
  review_id: string | null;
  comment_id: string | null;
  badge_id: string | null;
  beverage_id: string | null;
  is_read: boolean;
  created_at: string;
  actor:
    | { id: string; display_name: string; username: string | null; avatar_url: string | null }
    | { id: string; display_name: string; username: string | null; avatar_url: string | null }[]
    | null;
  badges: { name: string } | { name: string }[] | null;
  beverages: { name: string } | { name: string }[] | null;
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
        "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,terms_accepted_at,is_suspended,created_at",
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
      "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,terms_accepted_at,is_suspended,created_at",
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
      "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,terms_accepted_at,is_suspended,created_at",
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
      "id,username,display_name,bio,avatar_url,date_of_birth,birth_verified_at,terms_accepted_at,is_suspended,created_at",
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
  const response = await client()
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();
  const deleted = result(response.data, response.error) as
    | { id: string }
    | null;
  if (!deleted?.id) {
    throw new Error(
      "This review could not be deleted. Refresh your profile and try again.",
    );
  }
  return deleted.id;
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

export async function loadBlockedProfileIds(userId: string) {
  const response = await client()
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  return (result(response.data, response.error) || []).map(
    (row) => row.blocked_id as string,
  );
}

export async function blockProfile(profileId: string) {
  const response = await client().rpc("block_user", {
    target_profile_id: profileId,
  });
  return Boolean(result(response.data, response.error));
}

export async function unblockProfile(profileId: string) {
  const response = await client().rpc("unblock_user", {
    target_profile_id: profileId,
  });
  return Boolean(result(response.data, response.error));
}

export async function acceptCommunityTerms() {
  const response = await client().rpc("accept_community_terms");
  return result(response.data, response.error) as string;
}

export async function submitContentReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}) {
  const response = await client().rpc("submit_content_report", {
    report_target_type: input.targetType,
    report_target_id: input.targetId,
    report_reason: input.reason,
    report_details: input.details?.trim() || "",
  });
  return result(response.data, response.error) as string;
}

export async function loadModeratorStatus() {
  const response = await client().rpc("is_moderator");
  return Boolean(result(response.data, response.error));
}

export async function loadModerationQueue() {
  const response = await client()
    .from("moderation_queue")
    .select("*")
    .in("status", ["open", "in_review"])
    .order("created_at", { ascending: true });
  return (result(response.data, response.error) ||
    []) as DatabaseModerationReport[];
}

export async function resolveModerationReport(
  reportId: string,
  action: ModerationAction,
  note = "",
) {
  const response = await client().rpc("resolve_content_report", {
    target_report_id: reportId,
    moderation_action: action,
    moderator_note: note.trim(),
  });
  result(response.data, response.error);
}

export async function loadAdminCatalogue() {
  const response = await client()
    .from("beverages")
    .select(
      "id,name,category,subtype,brand,image_url,is_published,lifecycle_status,duplicate_of,admin_note,updated_at",
    )
    .order("updated_at", { ascending: false });
  const rows = (result(response.data, response.error) || []) as DatabaseAdminBeverage[];
  const normalizedName = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  const groups = new Map<string, string[]>();
  rows.forEach((row) => {
    const key = normalizedName(row.name);
    groups.set(key, [...(groups.get(key) || []), row.id]);
  });
  return rows.map((row) => ({
    ...row,
    potential_duplicate_ids: (groups.get(normalizedName(row.name)) || []).filter(
      (id) => id !== row.id,
    ),
  }));
}

export async function updateAdminBeverage(input: {
  beverageId: string;
  status: CatalogueLifecycle;
  duplicateOf?: string;
  note?: string;
}) {
  const response = await client().rpc("admin_update_beverage", {
    target_beverage_id: input.beverageId,
    next_status: input.status,
    duplicate_beverage_id: input.duplicateOf || null,
    note: input.note?.trim() || "",
  });
  result(response.data, response.error);
}

export async function loadAdminDrinkRequests() {
  const response = await client()
    .from("drink_requests")
    .select(
      "id,user_id,drink_name,status,resolution_note,resolved_beverage_id,created_at,profiles!drink_requests_user_id_fkey(display_name,username)",
    )
    .order("created_at", { ascending: false });
  return (result(response.data, response.error) || []) as DatabaseAdminDrinkRequest[];
}

export async function resolveAdminDrinkRequest(input: {
  requestId: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
  beverageId?: string;
}) {
  const response = await client().rpc("admin_resolve_drink_request", {
    target_request_id: input.requestId,
    next_status: input.status,
    note: input.note?.trim() || "",
    linked_beverage_id: input.beverageId || null,
  });
  result(response.data, response.error);
}

export async function loadNotifications(userId: string) {
  const response = await client()
    .from("notifications")
    .select(
      "id,kind,review_id,comment_id,badge_id,beverage_id,is_read,created_at,actor:profiles!notifications_actor_id_fkey(id,display_name,username,avatar_url),badges(name),beverages(name)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (result(response.data, response.error) || []) as DatabaseNotification[];
}

export async function markNotificationRead(notificationId: string) {
  const response = await client()
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  result(response.data, response.error);
}

export async function markAllNotificationsRead(userId: string) {
  const response = await client()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  result(response.data, response.error);
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

export async function exportCurrentUserData(userId: string) {
  const requests = [
    client().from("profiles").select("*").eq("id", userId).single(),
    client().from("reviews").select("*").eq("user_id", userId),
    client().from("review_comments").select("*").eq("user_id", userId),
    client().from("review_likes").select("*").eq("user_id", userId),
    client().from("drinklist").select("*").eq("user_id", userId),
    client().from("follows").select("*").eq("follower_id", userId),
    client().from("drink_requests").select("*").eq("user_id", userId),
    client().from("user_badges").select("*").eq("user_id", userId),
    client().from("user_blocks").select("*").eq("blocker_id", userId),
    client().from("content_reports").select("*").eq("reporter_id", userId),
    client().from("notifications").select("*").eq("user_id", userId),
    client().from("analytics_events").select("*").eq("user_id", userId),
    client().from("crash_reports").select("*").eq("user_id", userId),
  ] as const;
  const [
    profile,
    reviews,
    comments,
    likes,
    drinklist,
    follows,
    drinkRequests,
    badges,
    blocks,
    reports,
    notifications,
    analytics,
    crashReports,
  ] = await Promise.all(requests);

  const checked = <T>(response: {
    data: T;
    error: { message: string } | null;
  }) => result(response.data, response.error);

  return {
    exported_at: new Date().toISOString(),
    profile: checked(profile),
    reviews: checked(reviews),
    comments: checked(comments),
    likes: checked(likes),
    drinklist: checked(drinklist),
    follows: checked(follows),
    drink_requests: checked(drinkRequests),
    badges: checked(badges),
    blocks: checked(blocks),
    reports: checked(reports),
    notifications: checked(notifications),
    analytics_events: checked(analytics),
    crash_reports: checked(crashReports),
  };
}

async function uploadPublicImage(
  bucket: "avatars" | "review-images" | "group-images",
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
  const bytes =
    Platform.OS === "web"
      ? await (await fetch(uri)).arrayBuffer()
      : await new ExpoFile(uri).arrayBuffer();
  if (bytes.byteLength < 256) {
    throw new Error(
      "The selected image could not be read. Please choose the photo again.",
    );
  }
  const upload = await client()
    .storage.from(bucket)
    .upload(path, bytes, { contentType, upsert: false });
  result(upload.data, upload.error);
  const publicUrl = client().storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: publicUrl.data.publicUrl };
}

export async function loadGroupChats() {
  const response = await client().rpc("list_group_chats");
  return result(response.data, response.error) as DatabaseChatGroup[];
}

export async function createGroupChat(input: {
  ownerId: string;
  name: string;
  description: string;
  drinkType: string;
  visibility: "public" | "private";
  inviteCode: string;
  imageUrl?: string;
}) {
  const response = await client()
    .from("group_chats")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      description: input.description,
      drink_type: input.drinkType,
      visibility: input.visibility,
      invite_code: input.inviteCode,
      image_url: input.imageUrl || null,
    })
    .select("*")
    .single();
  return result(response.data, response.error) as Omit<
    DatabaseChatGroup,
    "member_count" | "joined"
  >;
}

export async function joinGroupChat(groupId: string) {
  const response = await client().rpc("join_group_chat", {
    target_group_id: groupId,
  });
  result(response.data, response.error);
}

export async function joinGroupChatByInvite(inviteCode: string) {
  const response = await client().rpc("join_group_chat_by_invite", {
    target_invite_code: inviteCode,
  });
  return result(response.data, response.error) as string;
}

export async function leaveGroupChat(groupId: string) {
  const response = await client().rpc("leave_group_chat", {
    target_group_id: groupId,
  });
  result(response.data, response.error);
}

export async function loadGroupChatMembers(groupId: string) {
  const response = await client().rpc("list_group_chat_members", {
    target_group_id: groupId,
  });
  return (result(response.data, response.error) || []) as DatabaseChatMember[];
}

export async function reportGroupChat(groupId: string) {
  const userResponse = await client().auth.getUser();
  const user = result(userResponse.data.user, userResponse.error) as User;
  const response = await client().from("group_chat_reports").insert({
    group_id: groupId,
    reporter_id: user.id,
    reason: "other",
    details: "Reported from the group chat options menu.",
  });
  result(response.data, response.error);
}

export async function loadGroupChatMessages(groupId: string) {
  const response = await client()
    .from("group_chat_messages")
    .select(
      "id,group_id,user_id,body,created_at,profiles!group_chat_messages_user_id_fkey(display_name,username,avatar_url)",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(100);
  return result(response.data, response.error) as DatabaseChatMessage[];
}

export async function sendGroupChatMessage(
  groupId: string,
  userId: string,
  body: string,
) {
  const response = await client()
    .from("group_chat_messages")
    .insert({ group_id: groupId, user_id: userId, body: body.trim() })
    .select(
      "id,group_id,user_id,body,created_at,profiles!group_chat_messages_user_id_fkey(display_name,username,avatar_url)",
    )
    .single();
  return result(response.data, response.error) as DatabaseChatMessage;
}

export async function uploadGroupImage(userId: string, uri: string) {
  const uploaded = await uploadPublicImage("group-images", userId, uri);
  return uploaded.publicUrl;
}

export async function uploadAvatar(userId: string, uri: string) {
  const uploaded = await uploadPublicImage("avatars", userId, uri);
  const response = await client()
    .from("profiles")
    .update({ avatar_url: uploaded.publicUrl })
    .eq("id", userId)
    .select("avatar_url")
    .single();
  const profile = result(response.data, response.error) as {
    avatar_url: string | null;
  };
  if (!profile.avatar_url)
    throw new Error("The uploaded picture was not saved to your profile.");
  return profile.avatar_url;
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
