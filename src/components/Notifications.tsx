import { Bell, CheckCheck, Heart, MessageCircle, Star, UserPlus } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { DatabaseNotification } from "../../lib/database";
import { C, F } from "../theme";

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

function copyFor(notification: DatabaseNotification) {
  const actor = one(notification.actor)?.display_name || "Someone";
  const drink = one(notification.beverages)?.name;
  const badge = one(notification.badges)?.name || notification.badge_id;
  if (notification.kind === "review_like") return `${actor} liked your${drink ? ` ${drink}` : ""} review.`;
  if (notification.kind === "review_comment") return `${actor} commented on your${drink ? ` ${drink}` : ""} review.`;
  if (notification.kind === "follow") return `${actor} followed you.`;
  return `You earned the ${badge || "new"} badge.`;
}

function NotificationIcon({ kind }: { kind: DatabaseNotification["kind"] }) {
  if (kind === "review_like") return <Heart size={18} color={C.red} />;
  if (kind === "review_comment") return <MessageCircle size={18} color={C.teal} />;
  if (kind === "follow") return <UserPlus size={18} color={C.green} />;
  return <Star size={18} color="#9a7200" />;
}

export function NotificationsContent({
  notifications,
  onOpen,
  onMarkAll,
}: {
  notifications: DatabaseNotification[];
  onOpen: (notification: DatabaseNotification) => void;
  onMarkAll: () => void;
}) {
  const unread = notifications.filter((item) => !item.is_read).length;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><Bell size={20} color={C.teal} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{unread ? `${unread} new notification${unread === 1 ? "" : "s"}` : "You're all caught up"}</Text>
          <Text style={styles.helper}>Likes, comments, follows and badges appear here.</Text>
        </View>
        {!!unread && (
          <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications read" onPress={onMarkAll} style={styles.markAll}>
            <CheckCheck size={16} color={C.teal} />
          </Pressable>
        )}
      </View>
      {!notifications.length ? (
        <View style={styles.empty}>
          <Bell size={28} color="rgba(43,73,89,.45)" />
          <Text style={styles.heading}>No notifications yet</Text>
          <Text style={styles.helper}>Activity from the Saturated community will show here.</Text>
        </View>
      ) : notifications.map((notification) => (
        <Pressable
          key={notification.id}
          accessibilityRole="button"
          accessibilityLabel={`${notification.is_read ? "Read" : "New"} notification. ${copyFor(notification)}`}
          onPress={() => onOpen(notification)}
          style={[styles.card, !notification.is_read && styles.cardUnread]}
        >
          <View style={styles.icon}><NotificationIcon kind={notification.kind} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.copy}>{copyFor(notification)}</Text>
            <Text style={styles.date}>{new Date(notification.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
          {!notification.is_read && <View accessibilityLabel="Unread" style={styles.unreadDot} />}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 28, paddingBottom: 70, gap: 11 },
  summary: { minHeight: 84, padding: 14, borderRadius: 21, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,254,248,.78)", borderWidth: 1, borderColor: "rgba(255,255,255,.78)" },
  summaryIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(43,73,89,.08)" },
  heading: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  helper: { marginTop: 3, fontFamily: F.regular, fontSize: 10, lineHeight: 14, color: "rgba(32,26,27,.65)" },
  markAll: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(4,178,100,.1)" },
  empty: { minHeight: 190, borderRadius: 22, alignItems: "center", justifyContent: "center", padding: 25, gap: 7, backgroundColor: "rgba(255,254,248,.58)" },
  card: { minHeight: 74, padding: 13, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,254,248,.68)", borderWidth: 1, borderColor: "rgba(255,255,255,.7)" },
  cardUnread: { backgroundColor: "rgba(220,255,238,.82)", borderColor: "rgba(4,178,100,.22)" },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.7)" },
  copy: { fontFamily: F.medium, fontSize: 11, lineHeight: 15, color: C.ink },
  date: { marginTop: 4, fontFamily: F.regular, fontSize: 9, color: "rgba(32,26,27,.5)" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
});
