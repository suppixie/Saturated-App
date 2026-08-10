import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeftCircle,
  Check,
  CirclePlus,
  Copy,
  Filter,
  Flag,
  Globe2,
  ImagePlus,
  Lock,
  LogOut,
  MessageCircle,
  MoreVertical,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { C, F, glass } from "../theme";
import type { ChatGroup, ChatGroupVisibility } from "../types";

export type GroupChatRoomMessage = {
  id: string;
  body: string;
  createdAt: string;
  userName: string;
  mine: boolean;
};

export type GroupChatMember = {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  isOwner: boolean;
};

const localGroupMessages = new Map<string, GroupChatRoomMessage[]>();
let groupDirectoryScrollOffset = 0;

export type CreateChatGroupInput = {
  name: string;
  description: string;
  drinkType: string;
  visibility: ChatGroupVisibility;
  inviteCode: string;
  imageUri?: string;
};

const GROUP_TYPES = [
  "All",
  "Soft Drink",
  "Beer",
  "Cocktail",
  "Wine",
  "Coffee",
  "Whiskey",
  "Other",
];

function createInviteCode() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function GroupDirectoryCard({
  group,
  joined,
  onOpen,
  onJoin,
  renderGlass,
}: {
  group: ChatGroup;
  joined: boolean;
  onOpen: () => void;
  onJoin: () => void;
  renderGlass: (radius?: number, intensity?: number) => React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.name}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.groupCard,
        pressed && styles.groupCardPressed,
      ]}
    >
      {renderGlass(22, 38)}
      {group.imageUrl ? (
        <Image source={{ uri: group.imageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarText}>{initials(group.name)}</Text>
        </View>
      )}
      <View style={styles.groupCopy}>
        <View style={styles.groupTitleRow}>
          <Text numberOfLines={1} style={styles.groupName}>
            {group.name}
          </Text>
          {group.visibility === "private" ? (
            <Lock size={13} color={C.teal} />
          ) : (
            <Globe2 size={13} color={C.teal} />
          )}
        </View>
        <Text numberOfLines={2} style={styles.description}>
          {group.description || "A space for drink discoveries and reviews."}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.typeLabel}>{group.drinkType}</Text>
          <Users size={13} color={C.teal} />
          <Text style={styles.memberCount}>{group.memberCount}</Text>
        </View>
      </View>
      {joined ? (
        <View style={styles.joinedPill}>
          <Check size={12} color={C.green} />
          <Text style={styles.joinedText}>Joined</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Join ${group.name}`}
          onPress={(event) => {
            event.stopPropagation();
            onJoin();
          }}
          style={styles.joinButton}
        >
          <Text style={styles.joinText}>Join</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export function GroupChatsScreen({
  groups,
  currentUserId,
  onBack,
  onCreate,
  onJoin,
  onLoadMessages,
  onSendMessage,
  onLeave,
  onReport,
  onLoadMembers,
  renderGlass,
}: {
  groups: ChatGroup[];
  currentUserId?: string;
  onBack: () => void;
  onCreate: (input: CreateChatGroupInput) => Promise<void> | void;
  onJoin: (group: ChatGroup) => Promise<void> | void;
  onLoadMessages?: (group: ChatGroup) => Promise<GroupChatRoomMessage[]>;
  onSendMessage?: (
    group: ChatGroup,
    body: string,
  ) => Promise<GroupChatRoomMessage>;
  onLeave?: (group: ChatGroup) => Promise<void> | void;
  onReport?: (group: ChatGroup) => Promise<void> | void;
  onLoadMembers?: (group: ChatGroup) => Promise<GroupChatMember[]>;
  renderGlass: (radius?: number, intensity?: number) => React.ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drinkType, setDrinkType] = useState("Other");
  const [visibility, setVisibility] = useState<ChatGroupVisibility>("public");
  const [imageUri, setImageUri] = useState<string>();
  const [inviteCode, setInviteCode] = useState(createInviteCode);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [locallyJoinedIds, setLocallyJoinedIds] = useState<string[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageVersion, setMessageVersion] = useState(0);
  const [messageLoading, setMessageLoading] = useState(false);
  const [roomMenuOpen, setRoomMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState<GroupChatMember[]>([]);

  const visibleGroups = useMemo(
    () =>
      groups.filter(
        (group) =>
          (selectedType === "All" || group.drinkType === selectedType) &&
          (group.visibility === "public" ||
            group.ownerId === currentUserId ||
            group.joined),
      ),
    [currentUserId, groups, selectedType],
  );
  const inviteLink = `saturated://groups/join/${inviteCode}`;
  const privateGroups = visibleGroups.filter(
    (group) =>
      group.visibility === "private" &&
      (group.ownerId === currentUserId || group.joined),
  );
  const publicGroups = visibleGroups.filter(
    (group) => group.visibility === "public",
  );
  const activeGroup = activeGroupId
    ? groups.find((group) => group.id === activeGroupId)
    : undefined;
  const activeMessages = activeGroup
    ? localGroupMessages.get(activeGroup.id) || []
    : [];
  const activeGroupJoined = Boolean(
    activeGroup &&
    (activeGroup.joined ||
      activeGroup.ownerId === currentUserId ||
      locallyJoinedIds.includes(activeGroup.id)),
  );

  React.useEffect(() => {
    if (!activeGroup || !onLoadMessages) return;
    let current = true;
    setMessageLoading(true);
    void onLoadMessages(activeGroup)
      .then((messages) => {
        if (!current) return;
        localGroupMessages.set(activeGroup.id, messages);
        setMessageVersion((value) => value + 1);
      })
      .catch(() => undefined)
      .finally(() => {
        if (current) setMessageLoading(false);
      });
    return () => {
      current = false;
    };
  }, [activeGroupId]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDrinkType("Other");
    setVisibility("public");
    setImageUri(undefined);
    setInviteCode(createInviteCode());
    setCopied(false);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo permission required",
        "Allow photo access to add an optional group picture.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const copyInvite = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const createGroup = async () => {
    if (name.trim().length < 2) {
      Alert.alert("Add a group name", "Use at least two characters.");
      return;
    }
    try {
      setSaving(true);
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        drinkType,
        visibility,
        inviteCode,
        imageUri,
      });
      setCreateOpen(false);
      resetForm();
    } catch (error) {
      Alert.alert(
        "Could not create group",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const joinFromDirectory = async (group: ChatGroup) => {
    await onJoin(group);
    setLocallyJoinedIds((current) =>
      current.includes(group.id) ? current : [...current, group.id],
    );
  };

  const sendMessage = async () => {
    if (!activeGroup || !messageDraft.trim() || !activeGroupJoined) return;
    const body = messageDraft.trim();
    const message: GroupChatRoomMessage = {
      id: `${activeGroup.id}-${Date.now()}`,
      body,
      createdAt: new Date().toISOString(),
      userName: "You",
      mine: true,
    };
    localGroupMessages.set(activeGroup.id, [
      ...(localGroupMessages.get(activeGroup.id) || []),
      message,
    ]);
    setMessageDraft("");
    setMessageVersion((value) => value + 1);
    if (onSendMessage) {
      try {
        const savedMessage = await onSendMessage(activeGroup, body);
        localGroupMessages.set(
          activeGroup.id,
          (localGroupMessages.get(activeGroup.id) || []).map((item) =>
            item.id === message.id ? savedMessage : item,
          ),
        );
        setMessageVersion((value) => value + 1);
      } catch {
        // Starter and offline groups intentionally keep the optimistic message.
      }
    }
  };

  const showMembers = async () => {
    if (!activeGroup) return;
    setRoomMenuOpen(false);
    setMembersOpen(true);
    setMembersLoading(true);
    try {
      setMembers(onLoadMembers ? await onLoadMembers(activeGroup) : []);
    } catch (error) {
      setMembersOpen(false);
      Alert.alert(
        "Could not load members",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setMembersLoading(false);
    }
  };

  const leaveActiveGroup = () => {
    if (!activeGroup) return;
    setRoomMenuOpen(false);
    Alert.alert(
      "Leave this group?",
      `You will need to join ${activeGroup.name} again to send messages.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            void Promise.resolve(onLeave?.(activeGroup))
              .then(() => {
                setLocallyJoinedIds((current) =>
                  current.filter((id) => id !== activeGroup.id),
                );
                setActiveGroupId(undefined);
              })
              .catch((error) =>
                Alert.alert(
                  "Could not leave group",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  };

  const reportActiveGroup = () => {
    if (!activeGroup) return;
    setRoomMenuOpen(false);
    Alert.alert(
      "Report this group?",
      "Saturated will send the group to the moderation queue for review.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => {
            void Promise.resolve(onReport?.(activeGroup))
              .then(() =>
                Alert.alert("Report received", "Thanks for letting us know."),
              )
              .catch((error) =>
                Alert.alert(
                  "Could not report group",
                  error instanceof Error ? error.message : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  };

  if (activeGroup) {
    return (
      <KeyboardAvoidingView
        style={styles.roomScreen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.roomHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to group chats"
            onPress={() => setActiveGroupId(undefined)}
          >
            <ArrowLeftCircle size={40} strokeWidth={2.3} color={C.ink} />
          </Pressable>
          <View style={styles.roomHeadingCopy}>
            <Text numberOfLines={1} style={styles.roomHeading}>
              {activeGroup.name}
            </Text>
            <Text style={styles.roomMeta}>
              {activeGroup.visibility === "private" ? "Private" : "Public"}
              {` · ${activeGroup.memberCount} members`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Group options"
            onPress={() => setRoomMenuOpen((value) => !value)}
            style={styles.roomMenuButton}
          >
            <MoreVertical size={26} strokeWidth={2.2} color={C.red} />
          </Pressable>
          {roomMenuOpen && (
            <View style={styles.roomMenu}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See group members"
                onPress={() => void showMembers()}
                style={styles.roomMenuItem}
              >
                <UserRound size={17} color={C.teal} />
                <Text style={styles.roomMenuText}>
                  See who&apos;s in the group
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Report group"
                onPress={reportActiveGroup}
                style={styles.roomMenuItem}
              >
                <Flag size={17} color={C.teal} />
                <Text style={styles.roomMenuText}>Report group</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Leave group"
                onPress={leaveActiveGroup}
                style={styles.roomMenuItem}
              >
                <LogOut size={17} color={C.red} />
                <Text style={[styles.roomMenuText, styles.roomMenuDanger]}>
                  Leave group
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        <ScrollView
          key={`${activeGroup.id}-${messageVersion}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messages}
        >
          {messageLoading && <ActivityIndicator color={C.red} />}
          {!messageLoading && !activeMessages.length && (
            <View style={styles.roomEmpty}>
              <MessageCircle size={34} color={C.teal} />
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptyCopy}>
                Share a recommendation, tasting note or local find with this
                group.
              </Text>
            </View>
          )}
          {activeMessages.map((message) => (
            <View
              key={message.id}
              style={[styles.myMessage, !message.mine && styles.otherMessage]}
            >
              <Text
                style={[
                  styles.messageAuthor,
                  !message.mine && styles.otherMessageText,
                ]}
              >
                {message.userName}
              </Text>
              <Text
                style={[
                  styles.messageBody,
                  !message.mine && styles.otherMessageText,
                ]}
              >
                {message.body}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  !message.mine && styles.otherMessageTime,
                ]}
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}
        </ScrollView>
        {activeGroupJoined ? (
          <View style={styles.composer}>
            <TextInput
              value={messageDraft}
              onChangeText={setMessageDraft}
              onSubmitEditing={() => void sendMessage()}
              placeholder="Write a message…"
              placeholderTextColor="rgba(32,26,27,.48)"
              returnKeyType="send"
              style={styles.composerInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!messageDraft.trim()}
              onPress={() => void sendMessage()}
              style={[
                styles.sendButton,
                !messageDraft.trim() && styles.disabledButton,
              ]}
            >
              <Send size={18} color={C.cream} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Join ${activeGroup.name} to chat`}
            onPress={() => void joinFromDirectory(activeGroup)}
            style={styles.roomJoinButton}
          >
            <Text style={styles.submitText}>Join Group to Chat</Text>
          </Pressable>
        )}
        <Modal
          visible={membersOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMembersOpen(false)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close group members"
            onPress={() => setMembersOpen(false)}
            style={styles.membersBackdrop}
          >
            <Pressable
              accessibilityRole="none"
              onPress={(event) => event.stopPropagation()}
              style={styles.membersCard}
            >
              <View style={styles.membersHeader}>
                <View>
                  <Text style={styles.membersTitle}>Group members</Text>
                  <Text style={styles.membersSubtitle}>{activeGroup.name}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close members"
                  onPress={() => setMembersOpen(false)}
                  style={styles.closeButton}
                >
                  <X size={20} color={C.ink} />
                </Pressable>
              </View>
              {membersLoading ? (
                <ActivityIndicator color={C.red} style={styles.membersLoader} />
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.membersList}
                >
                  {members.map((member) => (
                    <View key={member.id} style={styles.memberRow}>
                      {member.avatarUrl ? (
                        <Image
                          source={{ uri: member.avatarUrl }}
                          style={styles.memberAvatar}
                        />
                      ) : (
                        <View style={styles.memberAvatarFallback}>
                          <Text style={styles.memberAvatarText}>
                            {initials(member.name)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.memberCopy}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {!!member.username && (
                          <Text style={styles.memberUsername}>
                            @{member.username.replace(/^@/, "")}
                          </Text>
                        )}
                      </View>
                      {member.isOwner && (
                        <Text style={styles.ownerBadge}>Owner</Text>
                      )}
                    </View>
                  ))}
                  {!members.length && (
                    <Text style={styles.membersEmpty}>
                      No members to show yet.
                    </Text>
                  )}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentOffset={{ x: 0, y: groupDirectoryScrollOffset }}
        scrollEventThrottle={16}
        onScroll={(event) => {
          groupDirectoryScrollOffset = event.nativeEvent.contentOffset.y;
        }}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
          >
            <ArrowLeftCircle size={40} strokeWidth={2.3} color={C.ink} />
          </Pressable>
          <View style={styles.headingCopy}>
            <Text style={styles.heading}>Group Chats</Text>
            <Text style={styles.subheading}>Find your drinking circle.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter chat groups"
            onPress={() => setFilterOpen((value) => !value)}
            style={styles.iconButton}
          >
            <Filter size={24} strokeWidth={2.2} color={C.red} />
          </Pressable>
        </View>

        {filterOpen && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {GROUP_TYPES.map((type) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityLabel={`Show ${type} groups`}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.filterPill,
                  selectedType === type && styles.filterPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selectedType === type && styles.filterTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a group chat"
          onPress={() => setCreateOpen(true)}
          style={styles.createButton}
        >
          <CirclePlus size={20} color={C.cream} />
          <Text style={styles.createButtonText}>Create a Group Chat</Text>
        </Pressable>

        <View style={styles.groupList}>
          {!!privateGroups.length && (
            <>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeading}>Private groups</Text>
                <Text style={styles.groupCount}>{privateGroups.length}</Text>
              </View>
              {privateGroups.map((group) => (
                <GroupDirectoryCard
                  key={group.id}
                  group={group}
                  joined
                  onOpen={() => setActiveGroupId(group.id)}
                  onJoin={() => void joinFromDirectory(group)}
                  renderGlass={renderGlass}
                />
              ))}
            </>
          )}
          <View
            style={[
              styles.sectionHeadingRow,
              privateGroups.length > 0 && styles.discoverHeadingWithGap,
            ]}
          >
            <Text style={styles.sectionHeading}>
              {selectedType === "All" ? "Discover groups" : selectedType}
            </Text>
            <Text style={styles.groupCount}>{publicGroups.length} groups</Text>
          </View>
          {publicGroups.map((group) => (
            <GroupDirectoryCard
              key={group.id}
              group={group}
              joined={
                group.joined ||
                group.ownerId === currentUserId ||
                locallyJoinedIds.includes(group.id)
              }
              onOpen={() => setActiveGroupId(group.id)}
              onJoin={() => void joinFromDirectory(group)}
              renderGlass={renderGlass}
            />
          ))}
          {!visibleGroups.length && (
            <View style={styles.empty}>
              <MessageCircle size={30} color={C.teal} />
              <Text style={styles.emptyTitle}>No groups here yet</Text>
              <Text style={styles.emptyCopy}>
                Create the first {selectedType.toLowerCase()} group and invite
                people to join.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create a Group</Text>
                <Text style={styles.modalSubtitle}>
                  Make space for your people.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close create group"
                onPress={() => setCreateOpen(false)}
                style={styles.closeButton}
              >
                <X size={21} color={C.ink} />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.form}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add optional group picture"
                onPress={() => void pickImage()}
                style={styles.photoPicker}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <>
                    <ImagePlus size={26} color={C.teal} />
                    <Text style={styles.photoLabel}>Group picture</Text>
                    <Text style={styles.optional}>Optional</Text>
                  </>
                )}
              </Pressable>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Group name"
                placeholderTextColor="rgba(32,26,27,.52)"
                maxLength={60}
                style={styles.input}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor="rgba(32,26,27,.52)"
                multiline
                maxLength={240}
                style={[styles.input, styles.descriptionInput]}
              />

              <Text style={styles.fieldLabel}>Drink type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalFilters}
              >
                {GROUP_TYPES.filter((type) => type !== "All").map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setDrinkType(type)}
                    style={[
                      styles.filterPill,
                      drinkType === type && styles.filterPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        drinkType === type && styles.filterTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Who can discover it?</Text>
              <View style={styles.visibilityRow}>
                {(["public", "private"] as ChatGroupVisibility[]).map(
                  (option) => (
                    <Pressable
                      key={option}
                      onPress={() => setVisibility(option)}
                      style={[
                        styles.visibilityButton,
                        visibility === option && styles.visibilitySelected,
                      ]}
                    >
                      {option === "public" ? (
                        <Globe2
                          size={17}
                          color={visibility === option ? C.cream : C.teal}
                        />
                      ) : (
                        <Lock
                          size={17}
                          color={visibility === option ? C.cream : C.teal}
                        />
                      )}
                      <View style={styles.visibilityCopy}>
                        <Text
                          style={[
                            styles.visibilityTitle,
                            visibility === option &&
                              styles.visibilityTextSelected,
                          ]}
                        >
                          {option === "public" ? "Public" : "Private"}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.visibilityHint,
                            visibility === option &&
                              styles.visibilityHintSelected,
                          ]}
                        >
                          {option === "public"
                            ? "Anyone can join"
                            : "Invite only"}
                        </Text>
                      </View>
                    </Pressable>
                  ),
                )}
              </View>

              <Text style={styles.fieldLabel}>Invite link</Text>
              <View style={styles.inviteRow}>
                <TextInput
                  value={inviteLink}
                  editable={false}
                  selectTextOnFocus
                  style={styles.inviteInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy invite link"
                  onPress={() => void copyInvite()}
                  style={styles.copyButton}
                >
                  {copied ? (
                    <Check size={18} color={C.cream} />
                  ) : (
                    <Copy size={18} color={C.cream} />
                  )}
                </Pressable>
              </View>
              <Text style={styles.inviteHint}>
                {visibility === "private"
                  ? "Only people with this link can join."
                  : "Share this link directly or let people find the public group."}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create group"
                disabled={saving}
                onPress={() => void createGroup()}
                style={[styles.submitButton, saving && styles.disabledButton]}
              >
                <Text style={styles.submitText}>
                  {saving ? "Creating…" : "Create Group"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 32, paddingBottom: 56 },
  header: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 2,
    paddingBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontFamily: F.bold, fontSize: 26, lineHeight: 28, color: C.ink },
  headingCopy: { flex: 1, paddingTop: 6 },
  heading: {
    fontFamily: F.display,
    fontSize: 32,
    lineHeight: 44,
    color: C.red,
  },
  subheading: {
    marginTop: 7,
    fontFamily: F.regular,
    fontSize: 13,
    color: C.teal,
  },
  iconButton: {
    width: 32,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { gap: 8, paddingBottom: 16 },
  filterPill: {
    minHeight: 36,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.55)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,254,248,.52)",
  },
  filterPillSelected: { backgroundColor: C.teal, borderColor: C.teal },
  filterText: { fontFamily: F.medium, color: C.teal, fontSize: 13 },
  filterTextSelected: { color: C.cream },
  createButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.red,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  createButtonText: { fontFamily: F.bold, fontSize: 15, color: C.cream },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  discoverHeadingWithGap: { marginTop: 18 },
  sectionHeading: { fontFamily: F.bold, fontSize: 20, color: C.ink },
  groupCount: { fontFamily: F.regular, fontSize: 12, color: C.teal },
  groupList: { gap: 13 },
  groupCard: {
    ...glass,
    minHeight: 112,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  groupCardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  avatar: { width: 64, height: 64, borderRadius: 18 },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: C.cream, fontFamily: F.bold, fontSize: 19 },
  groupCopy: { flex: 1, gap: 4 },
  groupTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupName: { flexShrink: 1, fontFamily: F.bold, fontSize: 16, color: C.ink },
  description: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 16,
    color: C.ink,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  typeLabel: {
    fontFamily: F.medium,
    fontSize: 11,
    color: C.red,
    marginRight: 5,
  },
  memberCount: { fontFamily: F.regular, fontSize: 11, color: C.teal },
  joinButton: {
    borderRadius: 16,
    backgroundColor: C.red,
    paddingHorizontal: 13,
    minHeight: 32,
    justifyContent: "center",
  },
  joinText: { fontFamily: F.bold, fontSize: 12, color: C.cream },
  joinedPill: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(4,178,100,.55)",
    paddingHorizontal: 10,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  joinedText: { fontFamily: F.bold, fontSize: 11, color: C.green },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 56,
    paddingHorizontal: 30,
  },
  emptyTitle: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  emptyCopy: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: C.teal,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(32,26,27,.22)",
  },
  modalSheet: {
    maxHeight: "91%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: C.cream,
    paddingTop: 10,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(43,73,89,.25)",
    alignSelf: "center",
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontFamily: F.bold, fontSize: 25, color: C.ink },
  modalSubtitle: { fontFamily: F.regular, fontSize: 13, color: C.teal },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(43,73,89,.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  form: { paddingHorizontal: 24, paddingBottom: 40, gap: 13 },
  photoPicker: {
    height: 92,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(43,73,89,.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,178,100,.07)",
  },
  photoPreview: { width: "100%", height: "100%", borderRadius: 20 },
  photoLabel: { fontFamily: F.bold, fontSize: 13, color: C.teal, marginTop: 4 },
  optional: {
    fontFamily: F.regular,
    fontSize: 10,
    color: "rgba(32,26,27,.55)",
  },
  input: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.35)",
    backgroundColor: "#fff",
    paddingHorizontal: 17,
    fontFamily: F.regular,
    fontSize: 15,
    color: C.ink,
  },
  descriptionInput: { minHeight: 82, paddingTop: 14, textAlignVertical: "top" },
  fieldLabel: { fontFamily: F.bold, fontSize: 13, color: C.ink, marginTop: 2 },
  modalFilters: { gap: 7 },
  visibilityRow: { flexDirection: "row", gap: 10 },
  visibilityButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.32)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visibilitySelected: { backgroundColor: C.teal, borderColor: C.teal },
  visibilityCopy: { flex: 1 },
  visibilityTitle: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  visibilityTextSelected: { color: C.cream },
  visibilityHint: { fontFamily: F.regular, fontSize: 10, color: C.teal },
  visibilityHintSelected: { color: "rgba(255,254,248,.72)" },
  inviteRow: { flexDirection: "row", gap: 8 },
  inviteInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "rgba(43,73,89,.08)",
    paddingHorizontal: 14,
    fontFamily: F.regular,
    fontSize: 11,
    color: C.teal,
  },
  copyButton: {
    width: 48,
    borderRadius: 18,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteHint: {
    fontFamily: F.regular,
    fontSize: 11,
    color: "rgba(32,26,27,.62)",
    marginTop: -6,
  },
  submitButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitText: { fontFamily: F.bold, fontSize: 16, color: C.cream },
  disabledButton: { opacity: 0.55 },
  roomScreen: { flex: 1 },
  roomHeader: {
    minHeight: 96,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    zIndex: 20,
  },
  roomHeadingCopy: { flex: 1, minWidth: 0 },
  roomHeading: {
    fontFamily: F.display,
    fontSize: 25,
    lineHeight: 35,
    color: C.red,
  },
  roomMeta: { fontFamily: F.regular, fontSize: 12, color: C.teal },
  roomMenuButton: {
    width: 34,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  roomMenu: {
    position: "absolute",
    right: 32,
    top: 76,
    width: 205,
    paddingVertical: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.16)",
    backgroundColor: "#fffef8",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  roomMenuItem: {
    minHeight: 43,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  roomMenuText: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  roomMenuDanger: { color: C.red },
  messages: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 10,
  },
  roomEmpty: {
    alignItems: "center",
    gap: 9,
    marginBottom: 80,
    paddingHorizontal: 22,
  },
  myMessage: {
    maxWidth: "82%",
    alignSelf: "flex-end",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 19,
    borderBottomRightRadius: 6,
    backgroundColor: C.teal,
  },
  otherMessage: {
    alignSelf: "flex-start",
    borderBottomRightRadius: 19,
    borderBottomLeftRadius: 6,
    backgroundColor: "rgba(255,254,248,.88)",
  },
  otherMessageText: { color: C.ink },
  otherMessageTime: { color: "rgba(32,26,27,.55)" },
  messageAuthor: { fontFamily: F.bold, fontSize: 11, color: C.cream },
  messageBody: {
    marginTop: 2,
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 19,
    color: C.cream,
  },
  messageTime: {
    marginTop: 4,
    fontFamily: F.regular,
    fontSize: 9,
    color: "rgba(255,254,248,.68)",
    textAlign: "right",
  },
  composer: {
    paddingHorizontal: 24,
    paddingTop: 9,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,254,248,.92)",
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.28)",
    backgroundColor: "#fff",
    paddingHorizontal: 17,
    fontFamily: F.regular,
    fontSize: 14,
    color: C.ink,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  roomJoinButton: {
    height: 52,
    marginHorizontal: 32,
    marginBottom: 18,
    borderRadius: 26,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  membersBackdrop: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,26,27,.26)",
  },
  membersCard: {
    width: "100%",
    maxHeight: "68%",
    borderRadius: 24,
    padding: 18,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.7)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 14,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  membersTitle: { fontFamily: F.bold, fontSize: 20, color: C.ink },
  membersSubtitle: { fontFamily: F.regular, fontSize: 12, color: C.teal },
  membersLoader: { marginVertical: 28 },
  membersList: { gap: 9, paddingBottom: 4 },
  memberRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: "rgba(4,178,100,.08)",
  },
  memberAvatar: { width: 38, height: 38, borderRadius: 19 },
  memberAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.teal,
  },
  memberAvatarText: { fontFamily: F.bold, fontSize: 11, color: C.cream },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  memberUsername: { fontFamily: F.regular, fontSize: 10, color: C.teal },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(204,36,44,.1)",
    fontFamily: F.bold,
    fontSize: 9,
    color: C.red,
  },
  membersEmpty: {
    paddingVertical: 26,
    textAlign: "center",
    fontFamily: F.regular,
    fontSize: 12,
    color: C.teal,
  },
});
