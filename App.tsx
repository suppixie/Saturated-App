import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import {
  Boldonse_400Regular,
  useFonts as useBoldonse,
} from "@expo-google-fonts/boldonse";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDMSans,
} from "@expo-google-fonts/dm-sans";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  Apple,
  ArrowLeftCircle,
  ArrowRight,
  Camera,
  ChevronRight,
  CirclePlus,
  Edit3,
  Filter,
  Globe,
  Heart,
  LogOut,
  Mail,
  MessageCircle,
  Scale,
  Search,
  Settings,
  Share2,
  Star,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  Polygon,
  Rect,
  RadialGradient as SvgRadialGradient,
  Stop,
} from "react-native-svg";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  ImageStyle,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  answerOAuthConsentRequest,
  handleAuthCallback,
  loadOAuthConsentRequest,
  OAuthConsentRequest,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
} from "./lib/auth";
import {
  addReviewComment,
  DatabaseBadge,
  DatabaseBeverage,
  DatabaseComment,
  DatabaseProfile,
  DatabaseReview,
  deleteCurrentAccount,
  loadBadges,
  loadCatalogue,
  loadCurrentProfile,
  loadDrinklist,
  loadDrinkRequests,
  loadFollowingIds,
  loadLikedReviewIds,
  loadProfiles,
  loadReviewComments,
  loadReviews,
  saveReview,
  submitDrinkRequest,
  toggleDrinklist,
  toggleFollow,
  toggleReviewLike,
  updateCurrentDateOfBirth,
  updateCurrentProfile,
  uploadAvatar,
} from "./lib/database";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { catalogueImages } from "./src/data/catalogueImages";
import {
  drinks,
  featuredCatalogueOrder,
  initialCommentThreads,
  initialReviews,
  mergeSeedCommentThreads,
  mergeSeedReviews,
  reviewTotals,
  searchableProfiles,
} from "./src/data/seedData";
import {
  C,
  EXPLORE_PAGE_SIZE,
  F,
  FIGMA_FRAME_HEIGHT,
  FIGMA_FRAME_WIDTH,
  glass,
} from "./src/theme";
import s from "./src/styles";
import type {
  Drink,
  Review,
  ReviewComment,
  Screen,
  SearchProfile,
} from "./src/types";

const STORAGE_KEY = "saturated-state-v7";
const PENDING_BIRTH_DATE_KEY = "saturated-pending-date-of-birth";
const PENDING_AVATAR_URI_KEY = "saturated-pending-avatar-uri";
const PENDING_USERNAME_KEY = "saturated-pending-username";

function createNoisePath(
  count: number,
  seed: number,
  sizeOffset = 0,
  width = FIGMA_FRAME_WIDTH,
  height = FIGMA_FRAME_HEIGHT,
) {
  let state = seed >>> 0;
  let path = "";
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = 0; index < count; index += 1) {
    const x = next() * width;
    const y = next() * height;
    const size = 0.45 + sizeOffset + next() * 0.9;
    path += `M${x.toFixed(2)} ${y.toFixed(2)}h${size.toFixed(2)}v${size.toFixed(2)}h-${size.toFixed(2)}Z`;
  }
  return path;
}

const BACKGROUND_NOISE_TILE = 36;
const BACKGROUND_NOISE_MINT = createNoisePath(
  36,
  0x4b7a21,
  -0.08,
  BACKGROUND_NOISE_TILE,
  BACKGROUND_NOISE_TILE,
);
const BACKGROUND_NOISE_LIGHT = createNoisePath(
  24,
  0xf8e4c2,
  -0.16,
  BACKGROUND_NOISE_TILE,
  BACKGROUND_NOISE_TILE,
);

const transparentDrinkImage = {
  uri: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
} as ImageSourcePropType;

function normalizedDrinkName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const localDrinkArtworkAliases: Record<string, string> = {
  "coca-cola-original-taste": "coke",
  "heineken-original": "heineken",
  "original-7up": "sevenup",
  "birra-moretti-l-autentica": "birra",
  "whispering-angel-rose": "rose",
};

function localDrinkImageForName(name: string, databaseId?: string) {
  if (databaseId && catalogueImages[databaseId]) {
    return catalogueImages[databaseId];
  }
  const aliasedDrinkId = databaseId
    ? localDrinkArtworkAliases[databaseId]
    : undefined;
  if (aliasedDrinkId) {
    return drinks.find((drink) => drink.id === aliasedDrinkId)?.image;
  }
  const normalized = normalizedDrinkName(name);
  return drinks.find((drink) => normalizedDrinkName(drink.name) === normalized)
    ?.image;
}

function typeColor(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("soft")) return "#2903c0";
  if (normalized.includes("beer")) return "#84791b";
  if (normalized.includes("cocktail")) return "#aa0cac";
  if (normalized.includes("wine")) return "#9c0000";
  if (normalized.includes("coffee")) return "#a4600d";
  if (normalized.includes("tea")) return "#7cb100";
  if (normalized.includes("whiskey")) return "#8a4a12";
  return "#116d65";
}

function beverageFromDatabase(beverage: DatabaseBeverage): Drink {
  const localImage = localDrinkImageForName(beverage.name, beverage.id);
  return {
    id: beverage.id,
    name: beverage.name,
    type: beverage.category,
    typeColor: typeColor(beverage.category),
    image:
      localImage ||
      (beverage.image_url
        ? { uri: beverage.image_url }
        : transparentDrinkImage),
    rating: Number(beverage.average_rating || 0),
    reviewCount: beverage.review_count || 0,
    tags: beverage.official_tags || [],
    description: beverage.description || "",
    origin: beverage.origin || undefined,
    brand: beverage.brand || undefined,
  };
}

function reviewFromDatabase(review: DatabaseReview): Review {
  return {
    id: review.id,
    drinkId: review.beverage_id,
    userId: review.user_id,
    user: review.display_name || review.username || "Saturated User",
    avatar: review.avatar_url ? { uri: review.avatar_url } : undefined,
    rating: Number(review.rating),
    text: review.body,
    tags: review.flavour_tags || [],
    date: new Date(review.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    likes: review.like_count || 0,
    comments: review.comment_count || 0,
    imageUrls: review.image_urls || [],
  };
}

function profileFromDatabase(profile: DatabaseProfile): SearchProfile {
  return {
    id: profile.id,
    name: profile.display_name,
    handle: profile.username
      ? `@${profile.username.replace(/^@/, "")}`
      : "@user",
    memberSince: new Date(profile.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    }),
    buddies: profile.follower_count || 0,
    avatar: profile.avatar_url ? { uri: profile.avatar_url } : undefined,
  };
}

function commentFromDatabase(comment: DatabaseComment): ReviewComment {
  const profile = Array.isArray(comment.profiles)
    ? comment.profiles[0]
    : comment.profiles;
  return {
    id: comment.id,
    userId: comment.user_id,
    user: profile?.display_name || profile?.username || "Saturated User",
    avatar: profile?.avatar_url ? { uri: profile.avatar_url } : undefined,
    text: comment.body,
    date: new Date(comment.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
  };
}
function GlassLayers({
  radius = 23,
  intensity = 32,
  colors = ["rgba(255,255,255,.42)", "rgba(4,178,100,.12)"],
}: {
  radius?: number;
  intensity?: number;
  colors?: readonly [string, string];
}) {
  return (
    <>
      {Platform.OS !== "android" && (
        <BlurView
          pointerEvents="none"
          intensity={intensity}
          tint="light"
          style={[s.glassBlur, { borderRadius: radius }]}
        />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={
          Platform.OS === "android"
            ? ["rgba(255,255,255,.2)", "rgba(4,178,100,.1)"]
            : colors
        }
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={[s.glassGradient, { borderRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={[s.glassInnerEdge, { borderRadius: radius }]}
      />
    </>
  );
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "SU";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return `${first}${last}`.toUpperCase();
}

function usernameFromEmail(email?: string | null) {
  const localPart = email?.split("@")[0]?.trim().toLowerCase() || "user";
  const normalized = localPart.replace(/[^a-z0-9._]/g, "");
  return normalized || "user";
}

function UserAvatar({
  name,
  source,
  size,
  style,
}: {
  name: string;
  source?: ImageSourcePropType;
  size: number;
  style?: StyleProp<ImageStyle>;
}) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  if (source) {
    return (
      <Image
        accessibilityLabel={`${name} profile picture`}
        source={source}
        style={[dimensions, style]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      accessibilityLabel={`${name} initials profile picture`}
      style={[s.initialsAvatar, dimensions, style]}
    >
      <Text
        style={[s.initialsAvatarText, { fontSize: Math.max(10, size * 0.31) }]}
      >
        {initialsForName(name)}
      </Text>
    </View>
  );
}

function BackgroundNoise() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox={`0 0 ${FIGMA_FRAME_WIDTH} ${FIGMA_FRAME_HEIGHT}`}
      preserveAspectRatio="none"
      style={s.bgNoise}
    >
      <Defs>
        <Pattern
          id="backgroundNoisePattern"
          x="0"
          y="0"
          width={BACKGROUND_NOISE_TILE}
          height={BACKGROUND_NOISE_TILE}
          patternUnits="userSpaceOnUse"
        >
          <Path d={BACKGROUND_NOISE_MINT} fill="#04b264" opacity={0.34} />
          <Path d={BACKGROUND_NOISE_LIGHT} fill="#fff" opacity={0.9} />
        </Pattern>
      </Defs>
      <Rect
        width={FIGMA_FRAME_WIDTH}
        height={FIGMA_FRAME_HEIGHT}
        fill="url(#backgroundNoisePattern)"
      />
    </Svg>
  );
}

function Background({
  children,
  creamOpacity = 0.4,
}: {
  children: React.ReactNode;
  creamOpacity?: number;
}) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar hidden />
      <View style={s.bgWhite} />
      <View
        pointerEvents="none"
        style={[
          s.bgCream,
          { backgroundColor: `rgba(255,250,228,${creamOpacity})` },
        ]}
      />
      <View pointerEvents="none" style={s.bgMint} />
      <BackgroundNoise />
      {children}
    </SafeAreaView>
  );
}

function DrinkCardGlow() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox="0 0 110 187"
      preserveAspectRatio="none"
      style={s.drinkGlow}
    >
      <Defs>
        <SvgRadialGradient
          id="drinkCardGlow"
          cx="50%"
          cy="100%"
          rx="72%"
          ry="55%"
        >
          <Stop offset="0" stopColor="#c8ff3c" stopOpacity={0.25} />
          <Stop offset="0.35" stopColor="#64801e" stopOpacity={0.125} />
          <Stop offset="0.7" stopColor="#000" stopOpacity={0} />
        </SvgRadialGradient>
      </Defs>
      <Rect width="110" height="187" rx="16" fill="url(#drinkCardGlow)" />
    </Svg>
  );
}

function DrinkCardVisual({ drink }: { drink: Drink }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [drink.id, drink.image]);
  const remoteImage =
    typeof drink.image === "object" &&
    !Array.isArray(drink.image) &&
    "uri" in drink.image;
  const isSprite = normalizedDrinkName(drink.name) === "sprite";
  return (
    <View style={s.drinkCardSurface}>
      <GlassLayers
        radius={16}
        intensity={15}
        colors={["rgba(255,255,255,.5)", "rgba(255,255,255,.08)"]}
      />
      <DrinkCardGlow />
      <View style={s.drinkImageFrame}>
        {!imageFailed && (
          <Image
            source={drink.image}
            style={[
              s.drinkImage,
              remoteImage && (s.remoteDrinkImage as any),
              isSprite && s.spriteExploreImage,
            ]}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </View>
      <View style={s.drinkLabel}>
        <Text numberOfLines={1} style={s.drinkName}>
          {drink.name}
        </Text>
        <Text style={[s.tiny, { color: drink.typeColor }]}>{drink.type}</Text>
      </View>
    </View>
  );
}

function CompactFeedDrinkCard({ drink }: { drink: Drink }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [drink.id, drink.image]);
  const remoteImage =
    typeof drink.image === "object" &&
    !Array.isArray(drink.image) &&
    "uri" in drink.image;
  return (
    <View style={s.friendCompactCard}>
      <View style={s.friendCompactSurface}>
        <GlassLayers
          radius={9}
          intensity={15}
          colors={["rgba(255,255,255,.5)", "rgba(255,255,255,.08)"]}
        />
        <DrinkCardGlow />
        <View style={s.friendCompactImageFrame}>
          {!imageFailed && (
            <Image
              source={drink.image}
              style={[
                s.friendCompactImage,
                remoteImage && (s.remoteDrinkImage as any),
              ]}
              resizeMode="contain"
              onError={() => setImageFailed(true)}
            />
          )}
        </View>
        <View style={s.friendCompactLabel}>
          <Text numberOfLines={1} style={s.friendCompactName}>
            {drink.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[s.friendCompactType, { color: drink.typeColor }]}
          >
            {drink.type}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DeviceStatusBar({ light = false }: { light?: boolean }) {
  if (Platform.OS !== "web") return null;
  return (
    <View style={s.deviceStatusBar}>
      <Text style={[s.deviceStatusText, light && s.deviceStatusTextLight]}>
        9:41
      </Text>
      <Text style={[s.deviceStatusText, light && s.deviceStatusTextLight]}>
        ▮▮▮ ◉ ▱
      </Text>
    </View>
  );
}
function Heading({
  children,
  back,
  onBack,
}: {
  children: string;
  back?: boolean;
  onBack?: () => void;
}) {
  return (
    <View style={s.heading}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
        >
          <ArrowLeftCircle size={38} color={C.ink} />
        </Pressable>
      )}
      <Text style={s.headingText}>{children}</Text>
    </View>
  );
}
function Pill({
  children,
  selected = false,
  onPress,
  color = C.teal,
}: {
  children: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const redTint = color.toLowerCase() === "#960000";
  const selectedFill =
    color === C.green ? "rgba(4,178,100,.18)" : "rgba(255,119,125,.3)";
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? children : undefined}
      onPress={onPress}
      style={[
        s.pill,
        redTint && {
          backgroundColor: "rgba(255,119,125,.3)",
          borderColor: "rgba(150,0,0,.54)",
        },
        selected && { backgroundColor: selectedFill, borderColor: color },
      ]}
    >
      <Text style={[s.tiny, { color }]}>{children}</Text>
    </Pressable>
  );
}
function Rating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ color: C.gold, fontSize: size, letterSpacing: 1 }}>
        {"★".repeat(Math.floor(value))}
        {value % 1 ? "☆" : ""}
      </Text>
      <Text style={[s.body, { marginLeft: 5 }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

function HalfStarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const size = 35;
  return (
    <View style={s.starPicker}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <View key={star} style={{ width: size, height: size }}>
            <Star size={size} color={C.red} fill="transparent" />
            <View
              pointerEvents="none"
              style={[s.halfStarFill, { width: size * fill }]}
            >
              <Star
                size={size}
                color={C.red}
                fill={C.red}
                style={s.filledStar}
              />
            </View>
            <View style={s.halfStarHitArea}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star - 0.5} stars`}
                onPress={() => onChange(star - 0.5)}
                style={s.halfStarButton}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star} stars`}
                onPress={() => onChange(star)}
                style={s.halfStarButton}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function BottomNav({
  active,
  onGo,
}: {
  active: string;
  onGo: (x: Screen) => void;
}) {
  return (
    <View style={s.nav}>
      {Platform.OS !== "android" && (
        <BlurView
          pointerEvents="none"
          intensity={48}
          tint="light"
          style={s.navBlur}
        />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(90,132,132,.28)", "rgba(48,205,139,.26)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.navTint}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,.46)", "rgba(255,255,255,.1)"]}
        style={s.navHighlight}
      />
      {(["explore", "drinklist", "profile"] as Screen[]).map((x) => (
        <Pressable
          key={x}
          accessibilityRole="button"
          accessibilityLabel={`Go to ${x}`}
          onPress={() => onGo(x)}
          style={[s.navItem, active === x && s.navActive]}
        >
          <Text style={[s.navText, active === x && s.navTextActive]}>
            {x[0].toUpperCase() + x.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ResponsiveAppFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS === "web") return <>{children}</>;

  const scale = Math.min(1, width / FIGMA_FRAME_WIDTH);
  const scaledWidth = FIGMA_FRAME_WIDTH * scale;
  const canvasHeight = height / scale;

  return (
    <View style={s.nativeViewport}>
      <View
        style={[
          s.nativeFrame,
          {
            width: scaledWidth,
            height,
          },
        ]}
      >
        <View
          style={[
            s.nativeCanvas,
            {
              height: canvasHeight,
              left: -(FIGMA_FRAME_WIDTH * (1 - scale)) / 2,
              top: -(canvasHeight * (1 - scale)) / 2,
              transform: [{ scale }],
            },
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

function ScreenTransition({
  screen,
  children,
}: {
  screen: Screen;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    translateX.setValue(width);
    const animation = Animated.timing(translateX, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [screen, translateX, width]);

  return (
    <Animated.View
      style={[s.screenTransition, { transform: [{ translateX }] }]}
    >
      {children}
    </Animated.View>
  );
}

function formatDateOfBirth(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function validatedDateOfBirth(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }
  const today = new Date();
  const adultCutoff = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  if (birthDate > adultCutoff) return "underage" as const;
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

type EmailAccountDetails = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
  avatarUri?: string;
};

function Onboarding({
  visible,
  onEmailSignIn,
  onEmailSignUp,
  onProvider,
}: {
  visible: boolean;
  onEmailSignIn: (
    email: string,
    password: string,
    dateOfBirth: string,
  ) => Promise<void>;
  onEmailSignUp: (
    details: EmailAccountDetails,
  ) => Promise<"signed-in" | "check-email">;
  onProvider: (
    provider: "google" | "apple",
    dateOfBirth: string,
  ) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [chosenUsername, setChosenUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [avatarUri, setAvatarUri] = useState<string>();
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);
  const [accountMode, setAccountMode] = useState<"social" | "email" | "create">(
    "social",
  );
  useEffect(() => {
    if (!visible) {
      setAccountMode("social");
      setNotice("");
    }
  }, [visible]);
  const run = async (operation: () => Promise<void>) => {
    try {
      setBusy(true);
      setNotice("");
      await operation();
    } catch (error) {
      setNoticeTone("error");
      setNotice(
        error instanceof Error
          ? error.message
          : accountMode === "create"
            ? "Could not create account. Please try again."
            : "Could not sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const showFormError = (message: string) => {
    setNoticeTone("error");
    setNotice(message);
  };
  const finishEmail = async () => {
    if (!email.trim() || !email.includes("@"))
      return showFormError("Enter a valid email address.");
    if (accountMode === "create" && (!firstName.trim() || !lastName.trim()))
      return showFormError("Enter your first and last name.");
    const normalizedUsername = chosenUsername
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    if (
      accountMode === "create" &&
      !/^[a-z0-9._]{3,30}$/.test(normalizedUsername)
    )
      return showFormError(
        "Choose a 3–30 character username using letters, numbers, dots or underscores.",
      );
    const normalizedBirthDate = validatedDateOfBirth(dateOfBirth);
    if (!normalizedBirthDate)
      return showFormError("Enter your date of birth as DD/MM/YYYY.");
    if (normalizedBirthDate === "underage")
      return showFormError("You must be 18+ to use this app.");
    if (password.length < 8)
      return showFormError("Your password must contain at least 8 characters.");
    await run(async () => {
      if (accountMode === "create") {
        const outcome = await onEmailSignUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: normalizedUsername,
          email: email.trim(),
          password,
          dateOfBirth: normalizedBirthDate as string,
          avatarUri,
        });
        if (outcome === "check-email") {
          setNoticeTone("success");
          setNotice(
            "Account created. Check your email, open the confirmation link, then return here and sign in.",
          );
          setPassword("");
        }
        return;
      }
      await onEmailSignIn(
        email.trim(),
        password,
        normalizedBirthDate as string,
      );
    });
  };
  const finishProvider = async (provider: "google" | "apple") => {
    const normalizedBirthDate = validatedDateOfBirth(dateOfBirth);
    if (!normalizedBirthDate)
      return showFormError("Enter your date of birth as DD/MM/YYYY.");
    if (normalizedBirthDate === "underage")
      return showFormError("You must be 18+ to use this app.");
    await run(() => onProvider(provider, normalizedBirthDate));
  };
  const chooseProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo permission required",
        "Allow photo access to choose a profile picture. You can also skip this step.",
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!picked.canceled) setAvatarUri(picked.assets[0].uri);
  };
  const noticeContent = !!notice && (
    <View style={[s.authNotice, noticeTone === "error" && s.authNoticeError]}>
      <Text
        style={[
          s.authNoticeText,
          noticeTone === "error" && s.authNoticeTextError,
        ]}
      >
        {notice}
      </Text>
    </View>
  );
  const birthDateField = (
    <View style={s.birthDateField}>
      <Text style={s.birthDateLabel}>Date of birth</Text>
      <TextInput
        value={dateOfBirth}
        onChangeText={(value) => setDateOfBirth(formatDateOfBirth(value))}
        keyboardType="number-pad"
        maxLength={10}
        placeholder="DD/MM/YYYY"
        placeholderTextColor="rgba(32,26,27,.45)"
        style={s.birthDateInput}
      />
    </View>
  );
  return (
    <Modal
      visible={visible}
      transparent={accountMode !== "create"}
      animationType="slide"
    >
      {accountMode === "create" ? (
        <SafeAreaView style={s.createAccountScreen}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.createAccountContent}
            >
              <Text style={s.createAccountTitle}>Create your account</Text>
              <Text style={s.onboardAge}>You must be 18+ to use this app.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose an optional profile photo"
                style={s.createAvatarButton}
                onPress={() => void chooseProfilePhoto()}
              >
                <UserAvatar
                  name={
                    `${firstName} ${lastName}`.trim() ||
                    chosenUsername ||
                    "Saturated User"
                  }
                  source={avatarUri ? { uri: avatarUri } : undefined}
                  size={84}
                />
                <View style={s.createAvatarCamera}>
                  <Camera size={15} color="#fff" />
                </View>
              </Pressable>
              <Text style={s.createAvatarHint}>Profile photo (optional)</Text>
              <View style={s.createNameRow}>
                <TextInput
                  autoFocus
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="rgba(32,26,27,.45)"
                  style={[s.input, s.createNameInput]}
                />
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="rgba(32,26,27,.45)"
                  style={[s.input, s.createNameInput]}
                />
              </View>
              <TextInput
                value={chosenUsername}
                onChangeText={setChosenUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Username"
                placeholderTextColor="rgba(32,26,27,.45)"
                style={s.input}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email address"
                placeholderTextColor="rgba(32,26,27,.45)"
                style={s.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry
                placeholder="Password (8+ characters)"
                placeholderTextColor="rgba(32,26,27,.45)"
                style={s.input}
              />
              {birthDateField}
              <Pressable
                style={[s.primary, s.onboardControl]}
                accessibilityRole="button"
                accessibilityLabel="Create account"
                disabled={busy}
                onPress={() => void finishEmail()}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryText}>Create account</Text>
                )}
              </Pressable>
              {noticeContent}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to sign in options"
                onPress={() => {
                  setNotice("");
                  setAccountMode("social");
                }}
                style={s.textButton}
              >
                <Text style={s.textButtonText}>Back to sign in options</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      ) : (
        <View style={s.modalWrap}>
          <View style={s.onboard}>
            <View style={s.handle} />
            <Text style={s.onboardTitle}>Welcome to Saturated</Text>
            <Text style={s.onboardAge}>You must be 18+ to use this app.</Text>
            {birthDateField}
            {accountMode === "social" ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  style={s.socialButton}
                  disabled={busy}
                  onPress={() => void finishProvider("google")}
                >
                  <Globe size={20} color="#4285f4" />
                  <Text style={s.socialButtonText}>Continue with Google</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                  style={[s.socialButton, s.socialButtonDark]}
                  disabled={busy}
                  onPress={() => void finishProvider("apple")}
                >
                  <Apple size={21} color="#fff" fill="#fff" />
                  <Text style={[s.socialButtonText, { color: "#fff" }]}>
                    Continue with Apple
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with email"
                  style={s.socialButton}
                  onPress={() => {
                    setNotice("");
                    setAccountMode("email");
                  }}
                >
                  <Mail size={20} color={C.teal} />
                  <Text style={s.socialButtonText}>Continue with email</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  autoFocus
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                  placeholderTextColor="rgba(32,26,27,.45)"
                  style={s.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  secureTextEntry
                  placeholder="Password (8+ characters)"
                  placeholderTextColor="rgba(32,26,27,.45)"
                  style={s.input}
                />
                <Pressable
                  style={[s.primary, s.onboardControl]}
                  accessibilityRole="button"
                  accessibilityLabel={"Sign in"}
                  disabled={busy}
                  onPress={() => void finishEmail()}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryText}>Sign in</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to sign in options"
                  onPress={() => {
                    setNotice("");
                    setAccountMode("social");
                  }}
                  style={s.textButton}
                >
                  <Text style={s.textButtonText}>Back to sign in options</Text>
                </Pressable>
              </>
            )}
            {noticeContent}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              style={s.createAccountButton}
              onPress={() => {
                setNotice("");
                setAccountMode("create");
              }}
            >
              <UserPlus size={18} color={C.red} />
              <Text style={s.createAccountText}>Create an account</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Modal>
  );
}

function OAuthConsentScreen({
  authorizationId,
  session,
  onRequireSignIn,
}: {
  authorizationId: string | null;
  session: Session | null;
  onRequireSignIn: () => void;
}) {
  const [details, setDetails] = useState<OAuthConsentRequest | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    if (!authorizationId) {
      setError(
        "This consent page needs to be opened from a valid Supabase authorization request.",
      );
      return;
    }
    if (!session) return;
    let active = true;
    setError("");
    void loadOAuthConsentRequest(authorizationId)
      .then((request) => {
        if (!active) return;
        if ("redirect_url" in request) {
          if (Platform.OS === "web")
            window.location.assign(request.redirect_url);
          return;
        }
        setDetails(request);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load this authorization request.",
        );
      });
    return () => {
      active = false;
    };
  }, [authorizationId, session]);

  const decide = async (decision: "approve" | "deny") => {
    if (!authorizationId) return;
    try {
      setBusy(decision);
      setError("");
      const redirectUrl = await answerOAuthConsentRequest(
        authorizationId,
        decision,
      );
      if (Platform.OS === "web") window.location.assign(redirectUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not complete this authorization request.",
      );
      setBusy(null);
    }
  };

  const scopeLabels: Record<string, string> = {
    openid: "Verify your identity",
    profile: "View your Saturated profile",
    email: "View your email address",
    phone: "View your phone number",
  };

  return (
    <Background>
      <ScrollView
        style={s.oauthConsentScroll}
        contentContainerStyle={s.oauthConsentContent}
      >
        <Text style={s.oauthBrand}>Saturated</Text>
        <View style={s.oauthConsentCard}>
          <GlassLayers radius={24} intensity={30} />
          {!session ? (
            <>
              <Text style={s.oauthConsentTitle}>Sign in to continue</Text>
              <Text style={s.oauthConsentCopy}>
                Sign in to review and approve this access request.
              </Text>
              <Pressable style={s.primary} onPress={onRequireSignIn}>
                <Text style={s.primaryText}>Sign in</Text>
              </Pressable>
            </>
          ) : !details && !error ? (
            <ActivityIndicator color={C.red} />
          ) : details ? (
            <>
              {!!details.client.logo_uri && (
                <Image
                  source={{ uri: details.client.logo_uri }}
                  style={s.oauthClientLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={s.oauthConsentTitle}>
                Authorize {details.client.name}
              </Text>
              <Text style={s.oauthConsentCopy}>
                {details.client.name} wants to access your Saturated account as{" "}
                {details.user.email}.
              </Text>
              <View style={s.oauthScopeList}>
                {details.scope
                  .split(" ")
                  .filter(Boolean)
                  .map((scope) => (
                    <View key={scope} style={s.oauthScopeRow}>
                      <View style={s.oauthScopeDot} />
                      <Text style={s.oauthScopeText}>
                        {scopeLabels[scope] || `Use ${scope} access`}
                      </Text>
                    </View>
                  ))}
              </View>
              <Text style={s.oauthRedirectText} numberOfLines={2}>
                You will return to {details.redirect_uri}
              </Text>
              <View style={s.oauthConsentActions}>
                <Pressable
                  disabled={Boolean(busy)}
                  onPress={() => void decide("deny")}
                  style={s.oauthDenyButton}
                >
                  {busy === "deny" ? (
                    <ActivityIndicator color={C.red} />
                  ) : (
                    <Text style={s.oauthDenyText}>Deny</Text>
                  )}
                </Pressable>
                <Pressable
                  disabled={Boolean(busy)}
                  onPress={() => void decide("approve")}
                  style={[s.primary, s.oauthApproveButton]}
                >
                  {busy === "approve" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryText}>Allow access</Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}
          {!!error && <Text style={s.oauthError}>{error}</Text>}
        </View>
      </ScrollView>
    </Background>
  );
}

function Splash() {
  return (
    <View style={s.splash}>
      <StatusBar hidden />
      <Image
        source={require("./assets/splash.png")}
        style={s.splashImage}
        resizeMode="cover"
      />
      <View style={s.splashShade} />
      <Text style={s.splashTitle}>Saturated</Text>
    </View>
  );
}

function Explore({
  items,
  onOpen,
  onToggle,
  onGo,
}: {
  items: Drink[];
  onOpen: (d: Drink) => void;
  onToggle: (id: string) => void;
  onGo: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [alcoholFilter, setAlcoholFilter] = useState<
    "all" | "alcoholic" | "non-alcoholic"
  >("all");
  const [visibleCount, setVisibleCount] = useState(EXPLORE_PAGE_SIZE);
  const filterOptions = [
    "All",
    "Soft Drink",
    "Beer",
    "Cocktail",
    "Wine",
    "Coffee",
    "Tea",
    "Whiskey",
    "Other",
  ];
  const drinkCategory = (drink: Drink) => {
    if (drink.type.toLowerCase().includes("tea")) return "Tea";
    if (drink.type.toLowerCase().includes("whiskey")) return "Whiskey";
    if (filterOptions.includes(drink.type)) return drink.type;
    return "Other";
  };
  const alcoholicCategories = [
    "beer",
    "cocktail",
    "wine",
    "whiskey",
    "whisky",
    "spirit",
    "vodka",
    "gin",
    "rum",
    "tequila",
    "brandy",
    "liqueur",
  ];
  const isAlcoholic = (drink: Drink) => {
    const category = drink.type.toLowerCase();
    return alcoholicCategories.some((value) => category.includes(value));
  };
  const shown = items.filter((drink) => {
    const matchesCategory = filter === "All" || drinkCategory(drink) === filter;
    const alcoholic = isAlcoholic(drink);
    const matchesAlcohol =
      alcoholFilter === "all" ||
      (alcoholFilter === "alcoholic" ? alcoholic : !alcoholic);
    return matchesCategory && matchesAlcohol;
  });
  useEffect(() => {
    setVisibleCount(EXPLORE_PAGE_SIZE);
  }, [filter, alcoholFilter, items]);
  const visibleDrinks = shown.slice(0, visibleCount);
  return (
    <Background>
      <View style={s.headerRow}>
        <Text style={s.headingText}>Saturated</Text>
        <View style={s.iconRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search drinks"
            onPress={() => onGo("search")}
            style={s.headerIcon}
          >
            <Search color={C.red} size={23} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open friends feed"
            onPress={() => onGo("feed")}
            style={s.headerIcon}
          >
            <Users color={C.red} size={23} />
          </Pressable>
        </View>
      </View>
      <View style={s.alcoholToggle} accessibilityRole="tablist">
        {(
          [
            ["all", "All"],
            ["alcoholic", "Alcoholic"],
            ["non-alcoholic", "Non-Alc"],
          ] as const
        ).map(([value, label]) => {
          const selected = alcoholFilter === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setAlcoholFilter(value)}
              style={[
                s.alcoholToggleItem,
                selected && s.alcoholToggleItemActive,
              ]}
            >
              <Text
                style={[
                  s.alcoholToggleText,
                  selected && s.alcoholToggleTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        horizontal
        style={s.filterScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {filterOptions.map((f) => (
          <Pill
            key={f}
            selected={filter === f}
            color={C.green}
            onPress={() => setFilter(f)}
          >
            {f}
          </Pill>
        ))}
      </ScrollView>
      <FlatList
        data={visibleDrinks}
        style={s.screenList}
        numColumns={3}
        keyExtractor={(x) => x.id}
        contentContainerStyle={s.grid}
        columnWrapperStyle={s.gridRow}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            onPress={() => onOpen(item)}
            onLongPress={() => onToggle(item.id)}
            style={s.drinkCard}
          >
            <DrinkCardVisual drink={item} />
          </Pressable>
        )}
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          if (visibleCount < shown.length) {
            setVisibleCount((current) =>
              Math.min(current + EXPLORE_PAGE_SIZE, shown.length),
            );
          }
        }}
      />
      <BottomNav active="explore" onGo={onGo} />
    </Background>
  );
}

function SearchScreen({
  drinks,
  profiles,
  saved,
  onBack,
  onOpen,
  onOpenProfile,
  onToggle,
  onRequest,
}: {
  drinks: Drink[];
  profiles: SearchProfile[];
  saved: string[];
  onBack: () => void;
  onOpen: (drink: Drink) => void;
  onOpenProfile: (profile: SearchProfile) => void;
  onToggle: (id: string) => void;
  onRequest: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"beverages" | "profiles">("beverages");
  const normalized = query.trim().toLowerCase();
  const beverageResults = drinks.filter(
    (drink) =>
      !!normalized &&
      (drink.name.toLowerCase().includes(normalized) ||
        drink.type.toLowerCase().includes(normalized) ||
        drink.tags.some((tag) => tag.toLowerCase().includes(normalized))),
  );
  const profileResults = profiles.filter(
    (profile) =>
      !!normalized &&
      (profile.name.toLowerCase().includes(normalized) ||
        profile.handle.toLowerCase().includes(normalized)),
  );

  return (
    <Background>
      <Heading back onBack={onBack}>
        Search
      </Heading>
      <View style={s.searchModeSwitch}>
        {(["beverages", "profiles"] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`Search ${option}`}
            onPress={() => setMode(option)}
            style={[
              s.searchModeButton,
              mode === option && s.searchModeButtonActive,
            ]}
          >
            <Text
              style={[
                s.searchModeText,
                mode === option && s.searchModeTextActive,
              ]}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={s.searchBar}>
        <Search size={21} color={C.teal} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={
            mode === "beverages"
              ? "Search beverages, types or flavours"
              : "Search profiles or usernames"
          }
          placeholderTextColor="rgba(32,26,27,.45)"
          style={s.searchField}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
          >
            <X size={19} color={C.teal} />
          </Pressable>
        )}
      </View>
      {!!normalized && (
        <Text style={s.searchCount}>
          {mode === "beverages"
            ? `${beverageResults.length} ${
                beverageResults.length === 1 ? "beverage" : "beverages"
              }`
            : `${profileResults.length} ${
                profileResults.length === 1 ? "profile" : "profiles"
              }`}
        </Text>
      )}
      {mode === "beverages" ? (
        <FlatList
          data={beverageResults}
          style={s.screenList}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.searchResults}
          renderItem={({ item }) => (
            <Pressable onPress={() => onOpen(item)} style={s.searchResultCard}>
              <View style={s.searchResultImageBox}>
                <Image
                  source={item.image}
                  style={[
                    s.searchResultImage,
                    item.id === "sprite" && s.spriteSearchImage,
                  ]}
                  resizeMode="contain"
                />
              </View>
              <View style={s.searchResultCopy}>
                <Text style={s.searchResultName}>{item.name}</Text>
                <Text style={[s.body, { color: item.typeColor }]}>
                  {item.type} · {item.rating.toFixed(1)} ★
                </Text>
                <Text style={s.tiny}>{item.tags.join(" · ")}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  saved.includes(item.id)
                    ? "Remove from Drinklist"
                    : "Add to Drinklist"
                }
                onPress={(event) => {
                  event.stopPropagation();
                  onToggle(item.id);
                }}
                style={s.searchSaveButton}
              >
                <Heart
                  size={20}
                  color={C.red}
                  fill={saved.includes(item.id) ? C.red : "transparent"}
                />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            normalized ? (
              <View style={s.searchEmptyState}>
                <Text style={s.emptyTitle}>No beverages found</Text>
                <Text style={s.emptyPrompt}>Don’t see your drink?</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Request ${query}`}
                  style={s.requestDrinkButton}
                  onPress={() => onRequest(query.trim())}
                >
                  <Text style={s.primaryText}>Request drink</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={profileResults}
          style={s.screenList}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.searchResults}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name}'s profile`}
              onPress={() => onOpenProfile(item)}
              style={s.profileSearchCard}
            >
              <UserAvatar
                name={item.name}
                source={item.avatar}
                size={50}
                style={s.profileSearchAvatar}
              />
              <View style={s.searchResultCopy}>
                <Text style={s.searchResultName}>{item.name}</Text>
                <Text style={[s.body, { color: C.teal }]}>{item.handle}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            normalized ? (
              <View style={s.searchEmptyState}>
                <Text style={s.emptyTitle}>No profiles found</Text>
                <Text style={s.emptyPrompt}>Try a name or username.</Text>
              </View>
            ) : null
          }
        />
      )}
    </Background>
  );
}

function RequestDrinkScreen({
  initialName,
  onBack,
  onSubmit,
}: {
  initialName: string;
  onBack: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [drinkName, setDrinkName] = useState(initialName);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const validName = drinkName.trim();
  return (
    <Background>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Heading back onBack={onBack}>
          Request Drink
        </Heading>
        <ScrollView
          style={s.screenScroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.requestPageContent}
        >
          <View style={[s.requestFormCard, glass]}>
            <View style={s.requestIconCircle}>
              <CirclePlus size={30} color={C.red} />
            </View>
            <Text style={s.requestFormTitle}>What should we add?</Text>
            <Text style={s.requestFormCopy}>
              Name the beverage you couldn’t find. Our team will review it for
              the Saturated catalogue.
            </Text>
            <Text style={s.requestInputLabel}>Drink name</Text>
            <TextInput
              autoFocus
              value={drinkName}
              onChangeText={(value) => {
                setDrinkName(value);
                setSubmitted(false);
              }}
              placeholder="e.g. Jameson Black Barrel"
              placeholderTextColor="rgba(32,26,27,.4)"
              style={s.requestNameInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit drink request"
              disabled={!validName || submitting}
              style={[
                s.primary,
                s.requestSubmit,
                !validName && s.disabledButton,
              ]}
              onPress={async () => {
                try {
                  setSubmitting(true);
                  await onSubmit(validName);
                  setSubmitted(true);
                } catch (error) {
                  Alert.alert(
                    "Could not submit request",
                    error instanceof Error
                      ? error.message
                      : "Please try again.",
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryText}>Submit request</Text>
              )}
            </Pressable>
            {submitted && (
              <View style={s.requestSuccess}>
                <Text style={s.requestSuccessTitle}>Request submitted</Text>
                <Text style={s.requestSuccessText}>
                  “{validName}” has been sent to the Saturated team.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Background>
  );
}

function Drinklist({
  items,
  onRemove,
  onOpen,
  onReview,
  onGo,
}: {
  items: Drink[];
  onRemove: (id: string) => void;
  onOpen: (d: Drink) => void;
  onReview: (d: Drink) => void;
  onGo: (s: Screen) => void;
}) {
  const [sortByType, setSortByType] = useState(false);
  const flavourFallbacks: Record<string, string[]> = {
    "soft drink": ["Fizzy", "Refreshing", "Sweet"],
    beer: ["Crisp", "Malty", "Bitter"],
    cocktail: ["Balanced", "Fruity", "Refreshing"],
    wine: ["Fruity", "Dry", "Smooth"],
    coffee: ["Roasted", "Strong", "Creamy"],
    whiskey: ["Oaky", "Warm", "Smooth"],
  };
  const tagsForDrinklist = (drink: Drink) =>
    Array.from(
      new Set([
        ...drink.tags,
        ...(flavourFallbacks[drink.type.toLowerCase()] || [
          "Smooth",
          "Refreshing",
          "Balanced",
        ]),
      ]),
    ).slice(0, 3);
  const visibleItems = sortByType
    ? [...items].sort((a, b) => a.type.localeCompare(b.type))
    : items;
  return (
    <Background creamOpacity={0.5}>
      <View style={s.headerRow}>
        <Text style={s.headingText}>Drinklist</Text>
        <View style={s.iconRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sort Drinklist by type"
            onPress={() => setSortByType((value) => !value)}
            style={[s.headerIcon, sortByType && s.headerIconActive]}
          >
            <Filter color={C.red} size={23} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search drinks"
            onPress={() => onGo("search")}
            style={s.headerIcon}
          >
            <Search color={C.red} size={23} />
          </Pressable>
        </View>
      </View>
      <Text style={[s.cardTitle, { marginHorizontal: 32, marginBottom: 14 }]}>
        {items.length} Drinks saved to try
      </Text>
      <ScrollView
        style={s.screenScroll}
        contentContainerStyle={s.drinklistContent}
      >
        {visibleItems.map((d) => (
          <Pressable key={d.id} onPress={() => onOpen(d)} style={s.listCard}>
            <View style={s.listCardSurface}>
              <GlassLayers
                radius={23}
                intensity={40}
                colors={["rgba(255,255,255,.28)", "rgba(4,178,100,.15)"]}
              />
              <View style={s.listImageBox}>
                <Image
                  source={d.image}
                  style={[s.listImage, d.id === "sprite" && s.spriteListImage]}
                  resizeMode="contain"
                />
              </View>
              <View style={s.listDetails}>
                <Text numberOfLines={1} style={s.cardTitle}>
                  {d.name}
                </Text>
                <View style={s.listMetaRow}>
                  <Pill color={d.typeColor}>{d.type}</Pill>
                  <Text style={s.cardTitle}>{d.rating} ★</Text>
                </View>
                <View style={s.listTagsRow}>
                  {tagsForDrinklist(d).map((tag) => (
                    <View key={tag} style={s.listTag}>
                      <Text numberOfLines={1} style={s.listTagText}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.listActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${d.name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    onReview(d);
                  }}
                  style={s.smallButton}
                >
                  <Edit3 size={16} color={C.teal} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${d.name} from Drinklist`}
                  onPress={(event) => {
                    event.stopPropagation();
                    onRemove(d.id);
                  }}
                  style={[
                    s.smallButton,
                    { backgroundColor: "rgba(255,164,164,.7)" },
                  ]}
                >
                  <X size={17} color={C.teal} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}
        {!items.length && (
          <Text style={s.empty}>
            Your Drinklist is empty. Long-press a drink on Explore to save it.
          </Text>
        )}
      </ScrollView>
      <BottomNav active="drinklist" onGo={onGo} />
    </Background>
  );
}

function ReviewCard({
  review,
  liked,
  onLike,
  onOpen,
  onOpenProfile,
}: {
  review: Review;
  liked: boolean;
  onLike: (id: string) => void;
  onOpen: (review: Review) => void;
  onOpenProfile: (user: string) => void;
}) {
  return (
    <View style={s.reviewCard}>
      <View style={s.reviewFront}>
        <View style={s.reviewHeaderRow}>
          <View style={s.reviewIdentity}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${review.user}'s profile picture`}
              onPress={(event) => {
                event.stopPropagation();
                onOpenProfile(review.user);
              }}
            >
              <UserAvatar
                name={review.user}
                source={review.avatar}
                size={40}
                style={s.avatar}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${review.user}'s profile`}
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenProfile(review.user);
                }}
              >
                <Text style={s.body}>{review.user}</Text>
              </Pressable>
              <Rating value={review.rating} />
            </View>
          </View>
          <Text style={s.tiny}>{review.date}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${review.user}'s review and comments`}
          onPress={() => onOpen(review)}
          style={{ marginVertical: 9 }}
        >
          <Text style={s.reviewText}>{review.text}</Text>
        </Pressable>
        <View style={[s.inline, { justifyContent: "space-between" }]}>
          <View style={s.inline}>
            {review.tags.map((t) => (
              <Pill key={t} color="#960000">
                {t}
              </Pill>
            ))}
          </View>
          <View style={s.inline}>
            <MessageCircle size={13} color={C.ink} />
            <Text style={s.tiny}>{review.comments}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                liked
                  ? `Unlike ${review.user}'s review`
                  : `Like ${review.user}'s review`
              }
              onPress={(event) => {
                event.stopPropagation();
                onLike(review.id);
              }}
            >
              <Heart
                size={13}
                color={liked ? C.red : C.ink}
                fill={liked ? C.red : "transparent"}
              />
            </Pressable>
            <Text style={s.tiny}>{review.likes}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ReviewDetailScreen({
  review,
  drink,
  liked,
  comments,
  onBack,
  onLike,
  onAddComment,
  onOpenProfile,
  onOpenDrink,
  activeTab,
  onGo,
}: {
  review: Review;
  drink: Drink;
  liked: boolean;
  comments: ReviewComment[];
  onBack: () => void;
  onLike: () => void;
  onAddComment: (text: string) => void;
  onOpenProfile: (user: string) => void;
  onOpenDrink: (drink: Drink) => void;
  activeTab: "explore" | "drinklist" | "profile";
  onGo: (screen: Screen) => void;
}) {
  const [comment, setComment] = useState("");
  const submitComment = () => {
    const nextComment = comment.trim();
    if (!nextComment) return;
    onAddComment(nextComment);
    setComment("");
  };
  return (
    <Background>
      <Heading back onBack={onBack}>
        Review Thread
      </Heading>
      <ScrollView
        style={s.screenScroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.reviewDetailContent}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${drink.name} drink profile`}
          onPress={() => onOpenDrink(drink)}
          style={s.reviewDetailDrinkStrip}
        >
          <GlassLayers radius={20} intensity={36} />
          <View style={s.reviewDetailImageBox}>
            <Image
              source={drink.image}
              resizeMode="contain"
              style={[
                s.reviewDetailDrinkImage,
                drink.id === "sprite" && s.spriteReviewDetailImage,
              ]}
            />
          </View>
          <View style={s.reviewDetailDrinkCopy}>
            <Text style={s.cardTitle}>{drink.name}</Text>
            <Text style={[s.body, { color: drink.typeColor }]}>
              {drink.type}
            </Text>
          </View>
        </Pressable>

        <View style={s.reviewDetailDepth}>
          <View style={s.reviewDetailCard}>
            <View style={s.reviewHeaderRow}>
              <View style={s.reviewIdentity}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${review.user}'s profile picture`}
                  onPress={() => onOpenProfile(review.user)}
                >
                  <UserAvatar
                    name={review.user}
                    source={review.avatar}
                    size={44}
                    style={s.reviewDetailAvatar}
                  />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${review.user}'s profile`}
                    onPress={() => onOpenProfile(review.user)}
                  >
                    <Text style={s.cardTitle}>{review.user}</Text>
                  </Pressable>
                  <Rating value={review.rating} size={18} />
                </View>
              </View>
              <Text style={s.tiny}>{review.date}</Text>
            </View>
            <Text style={s.reviewDetailText}>{review.text}</Text>
            {!!review.imageUrls?.[0] && (
              <Image
                source={{ uri: review.imageUrls[0] }}
                style={s.reviewDetailUploadedImage}
                resizeMode="cover"
              />
            )}
            <View style={s.reviewDetailFooter}>
              <View style={s.inline}>
                {review.tags.map((tag) => (
                  <Pill key={tag} color="#960000">
                    {tag}
                  </Pill>
                ))}
              </View>
              <View style={s.inline}>
                <MessageCircle size={16} color={C.ink} />
                <Text style={s.body}>{review.comments}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={liked ? "Unlike review" : "Like review"}
                  onPress={onLike}
                  style={s.reviewDetailLikeButton}
                >
                  <Heart
                    size={18}
                    color={liked ? C.red : C.ink}
                    fill={liked ? C.red : "transparent"}
                  />
                  <Text style={[s.body, liked && { color: C.red }]}>
                    {review.likes}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <Text style={s.reviewCommentsTitle}>Comments ({comments.length})</Text>
        {comments.length ? (
          comments.map((item) => (
            <View key={item.id} style={s.commentCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.user}'s profile`}
                onPress={() => onOpenProfile(item.user)}
              >
                <UserAvatar
                  name={item.user}
                  source={item.avatar}
                  size={38}
                  style={s.commentAvatar}
                />
              </Pressable>
              <View style={s.commentCopy}>
                <View style={s.commentHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.user}'s profile`}
                    onPress={() => onOpenProfile(item.user)}
                  >
                    <Text style={s.commentUserName}>{item.user}</Text>
                  </Pressable>
                  <Text style={s.tiny}>{item.date}</Text>
                </View>
                <Text style={s.reviewText}>{item.text}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={s.reviewNoComments}>Be the first to comment.</Text>
        )}
        <View style={s.commentComposer}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a comment..."
            placeholderTextColor="rgba(32,26,27,.62)"
            style={s.commentInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            disabled={!comment.trim()}
            onPress={submitComment}
            style={[
              s.commentSubmit,
              !comment.trim() && s.commentSubmitDisabled,
            ]}
          >
            <Text style={s.primaryText}>Post</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNav active={activeTab} onGo={onGo} />
    </Background>
  );
}

function DrinkProfile({
  drink,
  reviews,
  saved,
  onBack,
  onReview,
  onToggle,
  onLike,
  likedReviewIds,
  onOpenReview,
  onOpenProfile,
}: {
  drink: Drink;
  reviews: Review[];
  saved: boolean;
  onBack: () => void;
  onReview: () => void;
  onToggle: () => void;
  onLike: (id: string) => void;
  likedReviewIds: string[];
  onOpenReview: (review: Review) => void;
  onOpenProfile: (user: string) => void;
}) {
  const mine = reviews.filter((r) => r.drinkId === drink.id);
  const avg = drink.rating;
  const totalReviews =
    drink.reviewCount ?? reviewTotals[drink.id] ?? mine.length;
  const popularTags = Object.entries(
    mine
      .flatMap((review) => review.tags)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .reduce<Record<string, number>>(
        (counts, tag) => ({ ...counts, [tag]: (counts[tag] || 0) + 1 }),
        {},
      ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag);
  return (
    <Background>
      <ScrollView
        style={s.screenScroll}
        contentContainerStyle={{ paddingBottom: 35 }}
      >
        <Heading back onBack={onBack}>
          Drink Profile
        </Heading>
        <View style={s.hero}>
          <GlassLayers
            radius={23}
            intensity={30}
            colors={["rgba(255,255,255,.36)", "rgba(4,178,100,.12)"]}
          />
          <Image
            source={drink.image}
            style={[s.heroImage, drink.id === "sprite" && s.spriteHeroImage]}
            resizeMode="contain"
          />
          <View style={s.heroPill}>
            <Pill color={drink.typeColor}>{drink.type}</Pill>
          </View>
        </View>
        <View style={s.detailCard}>
          <GlassLayers
            radius={23}
            intensity={40}
            colors={["rgba(255,255,255,.28)", "rgba(4,178,100,.15)"]}
          />
          <Text style={s.detailTitle}>{drink.name}</Text>
          <Text style={s.inlineText}>
            {"★".repeat(Math.round(avg))} {avg.toFixed(1)} — {totalReviews}{" "}
            Reviews
          </Text>
          <Text style={[s.body, { marginVertical: 14 }]}>
            {drink.description}
          </Text>
          <View style={s.detailMeta}>
            <Text style={s.body}>
              Origin :{" "}
              <Text style={{ color: C.teal }}>
                {drink.origin || "International"}
              </Text>
            </Text>
            <Text style={s.body}>
              Brand :{" "}
              <Text style={{ color: C.teal }}>{drink.brand || drink.name}</Text>
            </Text>
          </View>
          <View style={s.officialTagsSection}>
            <Text style={s.body}>Official tags</Text>
            <View style={s.officialTagsWrap}>
              {drink.tags.map((t) => (
                <Pill key={t} color="#960000">
                  {t}
                </Pill>
              ))}
            </View>
          </View>
        </View>
        <View
          style={[
            s.inline,
            { marginHorizontal: 32, marginTop: 22, marginBottom: 22 },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Review ${drink.name}`}
            onPress={onReview}
            style={[s.primary, { flex: 1 }]}
          >
            <Text style={s.primaryText}>✎ Write a Review</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              saved ? "Remove from Drinklist" : "Add to Drinklist"
            }
            onPress={onToggle}
            style={[s.secondary, { flex: 1 }]}
          >
            <Text style={s.secondaryText}>
              {saved ? "✓ Saved" : "+ Add to List"}
            </Text>
          </Pressable>
        </View>
        {mine.length > 0 && popularTags.length > 0 ? (
          <View style={s.commonTagsSection}>
            <Text style={s.cardTitle}>Flavour notes by users</Text>
            <View style={s.userFlavourTagsWrap}>
              {popularTags.map((tag) => (
                <Pill key={tag} color="#960000">
                  {tag}
                </Pill>
              ))}
            </View>
          </View>
        ) : (
          <View style={[s.reviewPromptCard, glass]}>
            <GlassLayers radius={18} intensity={34} />
            <Text style={s.reviewPromptTitle}>Tried this drink?</Text>
            <Text style={s.reviewPromptCopy}>
              {mine.length
                ? "Add flavour notes to your review to help other drinkers."
                : "Be the first to review it and share the flavour notes you noticed."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Write a review for ${drink.name}`}
              style={s.reviewPromptButton}
              onPress={onReview}
            >
              <Text style={s.primaryText}>Write a review</Text>
            </Pressable>
          </View>
        )}
        {mine.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            liked={likedReviewIds.includes(r.id)}
            onLike={onLike}
            onOpen={onOpenReview}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </ScrollView>
    </Background>
  );
}

function ReviewScreen({
  drink,
  existingReview,
  onBack,
  onSubmit,
}: {
  drink: Drink;
  existingReview?: Review;
  onBack: () => void;
  onSubmit: (r: number, t: string, tags: string[]) => Promise<void> | void;
}) {
  const isEditing = Boolean(existingReview);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [text, setText] = useState(existingReview?.text || "");
  const [tags, setTags] = useState<string[]>(existingReview?.tags || []);
  const [saving, setSaving] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [availableNotes, setAvailableNotes] = useState(() =>
    Array.from(
      new Set([
        "Citrusy",
        "Fresh",
        "Tangy",
        "Sweet",
        "Strong",
        "Floral",
        "Nutty",
        "Bitter",
        "Creamy",
        "Refreshing",
        "Tarty",
        ...(existingReview?.tags || []),
      ]),
    ),
  );
  return (
    <Background>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={s.screenScroll} keyboardShouldPersistTaps="handled">
          <Heading back onBack={onBack}>
            Review
          </Heading>
          <View style={[s.reviewDrink, glass]}>
            <View style={s.reviewDrinkImageBox}>
              <Image
                source={drink.image}
                style={[
                  s.reviewDrinkImage,
                  drink.id === "sprite" && s.spriteReviewImage,
                ]}
                resizeMode="contain"
              />
            </View>
            <View style={s.reviewDrinkCopy}>
              <Text
                style={s.reviewDrinkTitle}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {drink.name}
              </Text>
              <Pill color={drink.typeColor}>{drink.type}</Pill>
            </View>
          </View>
          <View style={[s.ratingCard, glass]}>
            <Text style={s.cardTitle}>Tap to Rate</Text>
            <View style={s.ratingRow}>
              <HalfStarRatingInput value={rating} onChange={setRating} />
              <Text style={s.ratingNumber}>{rating.toFixed(1)}</Text>
            </View>
          </View>
          <View style={[s.formCard, glass]}>
            <Text style={s.cardTitle}>Your Review</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              placeholder="What did you think of the drink?..."
              style={s.reviewInput}
            />
          </View>
          <View style={[s.notesCard, glass]}>
            <Text style={s.cardTitle}>Flavour notes</Text>
            <View style={s.notes}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a custom flavour note"
                style={s.addNoteChip}
                onPress={() => setAddingCustom((value) => !value)}
              >
                <Text style={[s.tiny, { color: "#fff" }]}>Add +</Text>
              </Pressable>
              {availableNotes.map((n) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${n} flavour note`}
                  key={n}
                  style={[s.noteChip, tags.includes(n) && s.noteChipSelected]}
                  onPress={() =>
                    setTags((x) =>
                      x.includes(n) ? x.filter((y) => y !== n) : [...x, n],
                    )
                  }
                >
                  <Text
                    style={[
                      s.tiny,
                      { color: tags.includes(n) ? "#960000" : "#5f6f66" },
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            {addingCustom && (
              <View style={s.customNoteRow}>
                <TextInput
                  autoFocus
                  value={customNote}
                  onChangeText={setCustomNote}
                  placeholder="Custom flavour note"
                  placeholderTextColor="rgba(32,26,27,.45)"
                  style={s.customNoteInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save custom flavour note"
                  style={s.addNoteButton}
                  onPress={() => {
                    const note = customNote.trim();
                    if (!note) return;
                    const existing = availableNotes.find(
                      (item) => item.toLowerCase() === note.toLowerCase(),
                    );
                    const savedNote = existing || note;
                    if (!existing)
                      setAvailableNotes((current) => [...current, savedNote]);
                    if (!tags.includes(savedNote))
                      setTags((current) => [...current, savedNote]);
                    setCustomNote("");
                    setAddingCustom(false);
                  }}
                >
                  <Text style={[s.tiny, { color: "#fff" }]}>Save</Text>
                </Pressable>
              </View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isEditing ? "Save review" : "Submit review"}
            style={[s.primary, { margin: 32, height: 46 }]}
            disabled={saving}
            onPress={async () => {
              if (!rating)
                return Alert.alert(
                  "Choose a rating",
                  `Select at least half a star before ${
                    isEditing ? "saving" : "submitting"
                  }.`,
                );
              if (!text.trim())
                return Alert.alert(
                  "Write a review",
                  `Tell us what you thought before ${
                    isEditing ? "saving" : "submitting"
                  }.`,
                );
              try {
                setSaving(true);
                await onSubmit(rating, text.trim(), tags);
              } catch (error) {
                Alert.alert(
                  "Could not save review",
                  error instanceof Error ? error.message : "Please try again.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryText}>{isEditing ? "Save" : "Submit"}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Background>
  );
}

const badgeNames = [
  "First Sip",
  "Wine much",
  "Caffeine in my Blood",
  "Around the World",
  "Pint Master",
  "Cocktailio",
  "Always on the rocks",
  "Coke Zero Gang",
  "Spritz or nothing",
];
const currentFallbackBadgeNames = [
  "First Sip",
  "Five Sips",
  "Ten Sips",
  "Social Sipper",
];
const bottleCapPoints = Array.from({ length: 48 }, (_, index) => {
  const angle = (index * Math.PI * 2) / 48 - Math.PI / 2;
  const radius = index % 2 === 0 ? 43 : 36;
  return `${44 + Math.cos(angle) * radius},${44 + Math.sin(angle) * radius}`;
}).join(" ");

function ProgressRing({ value }: { value: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={s.progressCircle}>
      <Svg width={44} height={44}>
        <Circle
          cx={22}
          cy={22}
          r={radius}
          fill="transparent"
          stroke="rgba(43,73,89,.18)"
          strokeWidth={4}
        />
        <Circle
          cx={22}
          cy={22}
          r={radius}
          fill="transparent"
          stroke={C.green}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - value)}
          transform="rotate(-90 22 22)"
        />
      </Svg>
      <Text style={s.progressText}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

function BadgeCap({ earned = false }: { earned?: boolean }) {
  return (
    <Svg width={88} height={88}>
      <Defs>
        <SvgRadialGradient id="badgeCap" cx="36%" cy="28%" rx="75%" ry="75%">
          <Stop offset="0" stopColor={earned ? "#fff1a8" : "#c9d8ce"} />
          <Stop offset=".65" stopColor={earned ? "#e6aa36" : "#9eada5"} />
          <Stop offset="1" stopColor={earned ? C.red : "#74837c"} />
        </SvgRadialGradient>
      </Defs>
      <Polygon points={bottleCapPoints} fill="url(#badgeCap)" />
      <Circle cx={44} cy={44} r={28} fill="rgba(255,255,255,.08)" />
    </Svg>
  );
}

function ProfileBadge({ name, earned }: { name: string; earned: boolean }) {
  const exactArtwork =
    name === "First Sip"
      ? require("./assets/badges/first-sip.png")
      : name === "Pint Master"
        ? require("./assets/badges/pint-master.png")
        : null;
  return (
    <View style={[s.badgeItem, !earned && s.badgeLocked]}>
      {earned && exactArtwork ? (
        <Image
          source={exactArtwork}
          accessibilityLabel={name}
          style={
            name === "Pint Master" ? s.badgeCompositeTall : s.badgeComposite
          }
          resizeMode="contain"
        />
      ) : (
        <>
          <BadgeCap earned={earned} />
          <Text style={[s.tiny, s.badgeLabel]}>{name}</Text>
        </>
      )}
    </View>
  );
}

function ReceiptZigzag() {
  const points = [
    "0,12",
    ...Array.from({ length: 48 }, (_, index) => {
      const x = index * (374 / 47);
      return `${x},${index % 2 === 0 ? 5 : 0}`;
    }),
    "374,12",
  ].join(" ");
  return (
    <Svg
      width="100%"
      height={12}
      viewBox="0 0 374 12"
      preserveAspectRatio="none"
    >
      <Polygon points={points} fill={C.red} />
    </Svg>
  );
}

function Profile({
  name,
  username,
  profile,
  ownAvatar,
  ownUserId,
  drinks,
  reviews,
  badges,
  buddyTotal,
  badgeTab,
  setBadgeTab,
  followed,
  onToggleFollow,
  onBack,
  onGo,
  onEditReview,
  onOpenReview,
  onEdit,
  onSettings,
}: {
  name: string;
  username: string;
  profile?: SearchProfile;
  ownAvatar?: ImageSourcePropType;
  ownUserId?: string;
  drinks: Drink[];
  reviews: Review[];
  badges?: DatabaseBadge[];
  buddyTotal?: number;
  badgeTab: boolean;
  setBadgeTab: (b: boolean) => void;
  followed?: boolean;
  onToggleFollow?: () => void;
  onBack?: () => void;
  onGo: (s: Screen) => void;
  onEditReview: (review: Review) => void;
  onOpenReview: (review: Review) => void;
  onEdit: () => void;
  onSettings: () => void;
}) {
  const isOwn = !profile;
  const profileName = profile?.name || name || "Mark Kelly";
  const profileHandle = profile?.handle || username || "@markelly1";
  const profileAvatar = profile?.avatar || ownAvatar;
  const memberSince = profile?.memberSince || "Jun 2026";
  const my = reviews.filter((review) =>
    profile
      ? review.userId === profile.id
      : ownUserId
        ? review.userId === ownUserId
        : review.user === profileName || review.user === "Mark Kelly",
  );
  const currentBadgeNames = badges?.length
    ? badges.map((badge) => badge.name)
    : currentFallbackBadgeNames;
  const legacyBadgeNames = badgeNames.filter(
    (badgeName) => !currentBadgeNames.includes(badgeName),
  );
  const earned =
    badges?.filter((badge) => badge.earned_at).length ??
    Math.min(currentBadgeNames.length, my.length);
  const earnedCurrentBadges = new Set(
    badges?.length
      ? badges.filter((badge) => badge.earned_at).map((badge) => badge.name)
      : currentBadgeNames.slice(0, earned),
  );
  const reviewedDrinks = my
    .map((review) => drinks.find((drink) => drink.id === review.drinkId))
    .filter((drink): drink is Drink => Boolean(drink));
  const reviewedTypes = new Set(
    reviewedDrinks.map((drink) => drink.type.toLowerCase()),
  );
  const reviewedNames = reviewedDrinks.map((drink) => drink.name.toLowerCase());
  const reviewedOrigins = new Set(
    reviewedDrinks.map((drink) => drink.origin).filter(Boolean),
  );
  const legacyBadgeEarned = (badgeName: string) => {
    if (badgeName === "Wine much") return reviewedTypes.has("wine");
    if (badgeName === "Caffeine in my Blood")
      return reviewedTypes.has("coffee");
    if (badgeName === "Around the World") return reviewedOrigins.size >= 3;
    if (badgeName === "Pint Master") {
      return (
        reviewedDrinks.filter((drink) => drink.type.toLowerCase() === "beer")
          .length >= 3
      );
    }
    if (badgeName === "Cocktailio") return reviewedTypes.has("cocktail");
    if (badgeName === "Always on the rocks")
      return reviewedTypes.has("whiskey");
    if (badgeName === "Coke Zero Gang") {
      return reviewedNames.some((drinkName) => drinkName.includes("coke"));
    }
    if (badgeName === "Spritz or nothing") {
      return reviewedNames.some((drinkName) => drinkName.includes("spritz"));
    }
    return false;
  };
  const avg = my.length ? my.reduce((a, b) => a + b.rating, 0) / my.length : 0;
  const buddyCount = isOwn
    ? (buddyTotal ??
      searchableProfiles.find((item) => item.id === "mark")?.buddies ??
      0)
    : (profile?.buddies || 0) + (followed ? 1 : 0);
  const shareReceipt = async () => {
    const receiptLines = my.map((review, index) => {
      const drink = drinks.find((item) => item.id === review.drinkId);
      return `${index + 1}. ${drink?.name || "Drink"} — ${review.rating.toFixed(
        1,
      )}/5\n“${review.text}”`;
    });
    try {
      await Share.share({
        title: "My Saturated receipt",
        message: `My Saturated receipt\n\n${receiptLines.join("\n\n")}`,
      });
    } catch {
      Alert.alert(
        "Share receipt",
        "Your receipt is ready to share to Instagram or another social app.",
      );
    }
  };
  return (
    <Background>
      {isOwn ? (
        <View style={s.headerRow}>
          <Text style={s.headingText}>Profile</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile settings"
            onPress={onSettings}
            style={s.headerIcon}
          >
            <Settings color={C.red} />
          </Pressable>
        </View>
      ) : (
        <Heading back onBack={onBack}>
          Profile
        </Heading>
      )}
      <View style={[s.profileCard, glass]}>
        <GlassLayers radius={23} intensity={40} />
        <UserAvatar
          name={profileName}
          source={profileAvatar}
          size={55}
          style={s.profileAvatar}
        />
        <View style={s.profileDetails}>
          <Text style={s.cardTitle}>{profileName}</Text>
          <Text style={s.profileHandle}>{profileHandle}</Text>
          <Text style={s.tiny}>Member since: {memberSince}</Text>
        </View>
        <View style={s.profileEditWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isOwn
                ? "Edit profile"
                : `${followed ? "Unfollow" : "Follow"} ${profileName}`
            }
            onPress={isOwn ? onEdit : onToggleFollow}
            style={[s.profileAction, followed && s.profileActionFollowing]}
          >
            {isOwn ? (
              <Edit3 size={10} color={C.green} />
            ) : (
              <UserPlus size={11} color={followed ? C.cream : C.green} />
            )}
            <Text
              style={[
                s.profileActionText,
                followed && s.profileActionTextFollowing,
              ]}
            >
              {isOwn ? "Edit" : followed ? "Following" : "Follow"}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={[s.inline, s.profileTabs]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show reviews"
          onPress={() => setBadgeTab(false)}
          style={[s.tab, !badgeTab && s.tabActive]}
        >
          {badgeTab && <GlassLayers radius={23} intensity={35} />}
          <Text style={[s.primaryText, badgeTab && { color: "#666" }]}>
            Reviews
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show badges"
          onPress={() => setBadgeTab(true)}
          style={[s.tab, badgeTab && s.tabActive]}
        >
          {!badgeTab && <GlassLayers radius={23} intensity={35} />}
          <Text style={[s.primaryText, !badgeTab && { color: "#666" }]}>
            Badges
          </Text>
        </Pressable>
      </View>
      {badgeTab ? (
        <ScrollView
          style={s.screenScroll}
          contentContainerStyle={s.profileScrollContent}
        >
          <View style={[s.progressCard, glass]}>
            <ProgressRing
              value={earned / Math.max(currentBadgeNames.length, 1)}
            />
            <View>
              <Text style={s.cardTitle}>
                {earned} of {currentBadgeNames.length} badges unlocked
              </Text>
              <Text style={s.reviewText}>Try more drinks to earn badges</Text>
            </View>
          </View>
          <View style={s.badges}>
            {currentBadgeNames.map((badgeName) => (
              <ProfileBadge
                key={badgeName}
                name={badgeName}
                earned={earnedCurrentBadges.has(badgeName)}
              />
            ))}
          </View>
          <Text style={s.legacyBadgeHeading}>Original badges</Text>
          <View style={s.badges}>
            {legacyBadgeNames.map((badgeName) => (
              <ProfileBadge
                key={badgeName}
                name={badgeName}
                earned={legacyBadgeEarned(badgeName)}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={s.screenScroll}
          contentContainerStyle={s.profileScrollContent}
        >
          <View style={[s.stats, s.statsThree]}>
            <View style={[s.stat, s.statThree]}>
              <GlassLayers radius={23} intensity={40} />
              <Text style={s.statNumber}>{my.length} 🍷</Text>
              <Text style={s.cardTitle}>Drinks Tried</Text>
            </View>
            <View style={[s.stat, s.statThree]}>
              <GlassLayers radius={23} intensity={40} />
              <Text style={s.statNumber}>{avg.toFixed(1)} ★</Text>
              <Text style={s.cardTitle}>Avg. Rating</Text>
            </View>
            <View style={[s.stat, s.statThree]}>
              <GlassLayers radius={23} intensity={40} />
              <Text style={s.statNumber}>{buddyCount}</Text>
              <Text style={s.cardTitle}>Buddies</Text>
            </View>
          </View>
          <Text style={[s.cardTitle, s.receiptHeading]}>
            {isOwn ? "Your Receipt" : `${profileName.split(" ")[0]}'s Reviews`}
          </Text>
          <View style={s.receiptWrap}>
            <ReceiptZigzag />
            <View style={s.receipt}>
              {isOwn && my.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share receipt to Instagram or social apps"
                  onPress={shareReceipt}
                  style={s.receiptShareButton}
                >
                  <Share2 size={14} color={C.red} />
                  <Text style={s.receiptShareText}>Share</Text>
                </Pressable>
              )}
              <Text style={s.receiptLogo}>Saturated</Text>
              <View style={s.dash} />
              {my.length > 0 && (
                <View style={[s.inline, { justifyContent: "space-between" }]}>
                  <Text style={s.tiny}>QTY ITEM</Text>
                  <Text style={s.tiny}>RATING</Text>
                </View>
              )}
              {my.length === 0 && (
                <View style={s.receiptEmpty}>
                  <Text style={s.receiptEmptyTitle}>
                    {isOwn
                      ? "Your receipt is empty"
                      : `${profileName.split(" ")[0]} has no reviews yet`}
                  </Text>
                  <Text style={s.receiptEmptyCopy}>
                    {isOwn
                      ? "Try a new drink and write a review to see it appear here."
                      : "Their drink reviews will appear here once they start tasting."}
                  </Text>
                  {isOwn && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Explore drinks"
                      onPress={() => onGo("explore")}
                      style={s.receiptEmptyButton}
                    >
                      <Text style={s.primaryText}>Explore drinks</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {my.map((r, i) => {
                const d = drinks.find((x) => x.id === r.drinkId)!;
                return (
                  <View
                    key={r.id}
                    style={[
                      s.receiptItem,
                      i < my.length - 1 && s.receiptItemDivider,
                    ]}
                  >
                    <View
                      style={[s.inline, { justifyContent: "space-between" }]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open review for ${d?.name}`}
                        onPress={() => onOpenReview(r)}
                        style={s.receiptItemCopy}
                      >
                        <Text style={s.body}>
                          {i + 1} {d?.name}
                        </Text>
                        <Text style={s.tiny}> {r.date}</Text>
                      </Pressable>
                      {isOwn && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit review for ${d?.name}`}
                          onPress={() => onEditReview(r)}
                          style={s.receiptEditButton}
                        >
                          <Edit3 size={12} color={C.red} />
                        </Pressable>
                      )}
                      <View style={s.receiptRating}>
                        <Text style={s.receiptStars}>
                          {"★".repeat(Math.round(r.rating))}
                        </Text>
                        <Text style={s.receiptRatingNumber}>
                          {r.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Read ${d?.name} review`}
                      onPress={() => onOpenReview(r)}
                    >
                      <Text style={s.receiptReviewText}>“{r.text}”</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
      <BottomNav active="profile" onGo={onGo} />
    </Background>
  );
}

function SettingsOption({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[s.settingsOption, danger && s.settingsDangerOption]}
    >
      <View style={[s.settingsOptionIcon, danger && s.settingsDangerIcon]}>
        {icon}
      </View>
      <View style={s.settingsOptionCopy}>
        <Text style={[s.settingsOptionTitle, danger && { color: C.red }]}>
          {title}
        </Text>
        <Text style={s.settingsOptionSubtitle}>{subtitle}</Text>
      </View>
      {!danger && <ChevronRight size={18} color="rgba(43,73,89,.55)" />}
    </Pressable>
  );
}

function SettingsScreen({
  name,
  avatar,
  username,
  email,
  ageVerified,
  requestCount,
  reviewCount,
  savedCount,
  onBack,
  onRequest,
  onSaveAccount,
  onUploadAvatar,
  onDeleteAccount,
  onLogout,
  initialSection = "menu",
}: {
  name: string;
  avatar?: ImageSourcePropType;
  username: string;
  email: string;
  ageVerified: boolean;
  requestCount: number;
  reviewCount: number;
  savedCount: number;
  onBack: () => void;
  onRequest: () => void;
  onSaveAccount: (details: {
    name: string;
    username: string;
    email: string;
  }) => Promise<void> | void;
  onUploadAvatar: () => Promise<void>;
  onDeleteAccount: () => void;
  onLogout: () => void;
  initialSection?: "menu" | "account";
}) {
  const [section, setSection] = useState<"menu" | "account" | "gdpr">(
    initialSection,
  );
  const [draftName, setDraftName] = useState(name);
  const [draftUsername, setDraftUsername] = useState(username);
  const [draftEmail, setDraftEmail] = useState(email);
  const [logoutVisible, setLogoutVisible] = useState(false);

  if (section !== "menu") {
    const title = section === "account" ? "Account Details" : "Privacy & Data";
    return (
      <Background>
        <Heading
          back
          onBack={() =>
            initialSection === "account" ? onBack() : setSection("menu")
          }
        >
          {title}
        </Heading>
        <ScrollView
          style={s.screenScroll}
          contentContainerStyle={s.settingsDetailContent}
        >
          {section === "account" && (
            <View style={[s.settingsDetailCard, glass]}>
              <Text style={s.settingsDetailTitle}>Your account</Text>
              <Text style={s.settingsDetailCopy}>
                Keep the details shown across your profile and sign-in account
                up to date.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload profile picture"
                style={s.settingsPhotoButton}
                onPress={() =>
                  void onUploadAvatar().catch((error) =>
                    Alert.alert(
                      "Could not upload profile picture",
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    ),
                  )
                }
              >
                <Camera size={17} color={C.teal} />
                <Text style={s.secondaryText}>Upload profile picture</Text>
              </Pressable>
              <Text style={s.settingsInputLabel}>Display name</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                style={s.settingsInput}
                placeholder="Your name"
              />
              <Text style={s.settingsInputLabel}>Username</Text>
              <TextInput
                value={draftUsername}
                onChangeText={setDraftUsername}
                autoCapitalize="none"
                style={s.settingsInput}
                placeholder="@username"
              />
              <Text style={s.settingsInputLabel}>Email</Text>
              <TextInput
                value={draftEmail}
                onChangeText={setDraftEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={s.settingsInput}
                placeholder="you@example.com"
              />
              <View style={s.settingsVerifiedRow}>
                <Text style={s.settingsVerifiedText}>
                  {ageVerified
                    ? "✓ 21+ age verified"
                    : "Age verification pending"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save account details"
                disabled={
                  !draftName.trim() ||
                  !draftUsername.trim() ||
                  !draftEmail.trim()
                }
                onPress={() => {
                  const normalizedUsername = draftUsername
                    .trim()
                    .startsWith("@")
                    ? draftUsername.trim()
                    : `@${draftUsername.trim()}`;
                  setDraftUsername(normalizedUsername);
                  void Promise.resolve(
                    onSaveAccount({
                      name: draftName.trim(),
                      username: normalizedUsername,
                      email: draftEmail.trim(),
                    }),
                  )
                    .then(() =>
                      Alert.alert(
                        "Account updated",
                        "Your profile details were saved.",
                      ),
                    )
                    .catch((error) =>
                      Alert.alert(
                        "Could not update account",
                        error instanceof Error
                          ? error.message
                          : "Please try again.",
                      ),
                    );
                }}
                style={s.settingsPrimaryButton}
              >
                <Text style={s.primaryText}>Save changes</Text>
              </Pressable>
            </View>
          )}

          {section === "gdpr" && (
            <View style={[s.settingsDetailCard, glass]}>
              <Text style={s.settingsDetailTitle}>Your data rights</Text>
              <Text style={s.settingsDetailCopy}>
                You can access, export, correct, or delete your personal data.
                Consent can be withdrawn at any time.
              </Text>
              <View style={s.settingsDataSummary}>
                <Text style={s.body}>{reviewCount} reviews</Text>
                <Text style={s.body}>{savedCount} saved drinks</Text>
                <Text style={s.body}>{requestCount} drink requests</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export my data"
                onPress={() =>
                  Share.share({
                    title: "My Saturated data",
                    message: JSON.stringify(
                      {
                        profile: { name, username, email },
                        reviewCount,
                        savedCount,
                        requestCount,
                      },
                      null,
                      2,
                    ),
                  })
                }
                style={s.settingsSecondaryButton}
              >
                <Share2 size={16} color={C.teal} />
                <Text style={s.settingsSecondaryText}>Export my data</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete my account data"
                onPress={() =>
                  Alert.alert(
                    "Delete account data?",
                    "This permanently deletes your Saturated account, profile, reviews, comments, likes, Drinklist and follows. This cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: onDeleteAccount,
                      },
                    ],
                  )
                }
                style={s.settingsDeleteButton}
              >
                <Text style={s.settingsDeleteText}>
                  Delete account permanently
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Background>
    );
  }

  return (
    <Background>
      <Heading back onBack={onBack}>
        Settings
      </Heading>
      <ScrollView
        style={s.screenScroll}
        contentContainerStyle={s.settingsContent}
      >
        <View style={[s.settingsAccountCard, glass]}>
          <UserAvatar
            name={name || "Saturated User"}
            source={avatar}
            size={55}
            style={s.settingsAvatar}
          />
          <View style={s.settingsAccountCopy}>
            <Text style={s.cardTitle}>{name || "Mark Kelly"}</Text>
            <Text style={s.tiny}>21+ verified account</Text>
          </View>
        </View>

        <Text style={s.settingsSectionTitle}>Account & privacy</Text>
        <View style={s.settingsGroup}>
          <SettingsOption
            icon={<Users size={20} color={C.teal} />}
            title="Account details"
            subtitle="Profile, sign-in and age-verification details"
            onPress={() => setSection("account")}
          />
          <SettingsOption
            icon={<Scale size={20} color={C.teal} />}
            title="GDPR regulations"
            subtitle="Privacy, data access, consent and deletion"
            onPress={() => setSection("gdpr")}
          />
        </View>

        <Text style={s.settingsSectionTitle}>Community</Text>
        <View style={s.settingsGroup}>
          <SettingsOption
            icon={<CirclePlus size={20} color={C.teal} />}
            title="Request a drink"
            subtitle={
              requestCount
                ? `${requestCount} request${requestCount === 1 ? "" : "s"} submitted`
                : "Suggest a missing beverage"
            }
            onPress={onRequest}
          />
          <SettingsOption
            icon={<Camera size={20} color={C.teal} />}
            title="Instagram & socials"
            subtitle="@saturated.app"
            onPress={() =>
              Linking.openURL("https://www.instagram.com/saturated.app/").catch(
                () =>
                  Alert.alert("Instagram", "Instagram could not be opened."),
              )
            }
          />
        </View>

        <View style={[s.settingsGroup, { marginTop: 22 }]}>
          <SettingsOption
            icon={<LogOut size={20} color={C.red} />}
            title="Log out"
            subtitle="Return to the Saturated sign-in screen"
            danger
            onPress={() => setLogoutVisible(true)}
          />
        </View>
      </ScrollView>
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View style={s.confirmOverlay}>
          <View style={s.logoutConfirmCard}>
            <Text style={s.logoutConfirmTitle}>Log out?</Text>
            <Text style={s.logoutConfirmCopy}>
              You can sign back in at any time.
            </Text>
            <View style={s.logoutConfirmActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel logout"
                onPress={() => setLogoutVisible(false)}
                style={s.logoutCancelButton}
              >
                <Text style={s.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm logout"
                onPress={() => {
                  setLogoutVisible(false);
                  onLogout();
                }}
                style={s.logoutConfirmButton}
              >
                <LogOut size={16} color={C.cream} />
                <Text style={s.primaryText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Background>
  );
}

const feedFriendCards = [
  {
    drinkId: "heineken",
    source: require("./assets/feed/friend-heineken.png"),
    count: "8",
  },
  {
    drinkId: "rose",
    source: require("./assets/feed/friend-rose.png"),
    count: "2",
  },
  {
    drinkId: "espresso",
    source: require("./assets/feed/friend-espresso.png"),
    count: "10+",
  },
  {
    drinkId: "pilsner",
    source: require("./assets/feed/friend-pilsner.png"),
    count: "6",
  },
  {
    drinkId: "petrus",
    source: require("./assets/feed/friend-petrus.png"),
    count: "5",
  },
];

const feedBuddyAvatars = [
  require("./assets/people/mark.png"),
  require("./assets/people/liddy.png"),
  require("./assets/people/sarah.png"),
  require("./assets/people/james.png"),
];

type FeedActivity = {
  group?: string;
  name: string;
  message: string;
  action?: string;
  quote?: boolean;
  time: string;
  avatar?: ImageSourcePropType;
  drinkId: string;
  profileId?: string;
  reviewId?: string;
  target: "drink" | "profile";
};

const feedActivity: FeedActivity[] = [
  {
    group: "Today",
    name: "James kent",
    message: "rated Pilsner Urquell 4.5/5 🍺",
    action: "Read the review →",
    time: "8h ago",
    avatar: require("./assets/people/james.png"),
    drinkId: "pilsner",
    profileId: "james",
    reviewId: "r7",
    target: "drink",
  },
  {
    group: "Yesterday",
    name: "Liddy Powell",
    message: "unlocked First Sip! 🥤",
    time: "1 day ago",
    avatar: require("./assets/people/liddy.png"),
    drinkId: "sprite",
    profileId: "liddy",
    target: "profile",
  },
  {
    name: "Jaques Dane",
    message: "reviewed Heineken 🍺",
    action: "Read the review →",
    time: "1 day ago",
    avatar: require("./assets/people/jaques.png"),
    drinkId: "heineken",
    profileId: "jaques",
    reviewId: "r6",
    target: "drink",
  },
  {
    group: "Earlier this week",
    name: "Liddy Powell",
    message: "followed you",
    time: "2 days ago",
    avatar: require("./assets/people/liddy.png"),
    drinkId: "sprite",
    profileId: "liddy",
    target: "profile",
  },
  {
    name: "Aperol Spritz",
    message: "is trending this week! 🔥",
    action: "127 Reviews →",
    time: "2 days ago",
    avatar: require("./assets/drinks/aperol.png"),
    drinkId: "aperol",
    target: "drink",
  },
  {
    name: "Sarah James",
    message: "added White Choc Matcha Latte to her Drinklist +",
    time: "2 days ago",
    avatar: require("./assets/people/sarah.png"),
    drinkId: "matcha",
    profileId: "sarah",
    target: "drink",
  },
  {
    name: "Sarah James",
    message: "commented on your review",
    action: "“It’s definitely some quality beer”",
    quote: true,
    time: "4 days ago",
    avatar: require("./assets/people/sarah.png"),
    drinkId: "birra",
    profileId: "sarah",
    target: "profile",
  },
];

function Feed({
  drinks,
  profiles,
  reviews,
  followingIds,
  onBack,
  onOpen,
  onOpenProfile,
  onOpenReview,
}: {
  drinks: Drink[];
  profiles: SearchProfile[];
  reviews: Review[];
  followingIds: string[];
  onBack: () => void;
  onOpen: (drink: Drink) => void;
  onOpenProfile: (profile: SearchProfile) => void;
  onOpenReview: (review: Review) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const followedReviews = reviews.filter(
    (review) => review.userId && followingIds.includes(review.userId),
  );
  const followedDrinkCounts = new Map<string, number>();
  followedReviews.forEach((review) =>
    followedDrinkCounts.set(
      review.drinkId,
      (followedDrinkCounts.get(review.drinkId) || 0) + 1,
    ),
  );
  const liveFriendCards = Array.from(followedDrinkCounts.entries()).map(
    ([drinkId, count]) => ({
      drinkId,
      source: drinks.find((drink) => drink.id === drinkId)?.image,
      count: count > 9 ? "10+" : String(count),
    }),
  );
  const allFriendCards = liveFriendCards.length
    ? liveFriendCards
    : feedFriendCards;
  const visibleFriends = showAll ? allFriendCards : allFriendCards.slice(0, 5);
  const drinkById = (id: string) =>
    drinks.find((drink) => drink.id === id) || drinks[0];
  const liveActivity = followedReviews.map((review, index) => ({
    name: review.user,
    message: `reviewed ${drinkById(review.drinkId).name}`,
    action: "Read the review â†’",
    time: index === 0 ? "Just now" : review.date,
    avatar: review.avatar,
    drinkId: review.drinkId,
    profileId: review.userId,
    reviewId: review.id,
    target: "review",
    group: index === 0 ? "Recent activity" : undefined,
    quote: false,
  }));
  const activityItems = liveActivity.length ? liveActivity : feedActivity;

  return (
    <Background creamOpacity={0.5}>
      <ScrollView style={s.screenScroll} contentContainerStyle={s.feedContent}>
        <Heading back onBack={onBack}>
          Feed
        </Heading>
        <View style={s.feedSectionHeader}>
          <Text style={s.cardTitle}>Your friends are drinking..</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showAll ? "Show fewer friend drinks" : "View more friend drinks"
            }
            onPress={() => setShowAll((value) => !value)}
            style={s.feedMoreButton}
          >
            <Text style={[s.cardTitle, { color: C.red }]}>
              {showAll ? "Show Less" : "View More"}
            </Text>
            <ArrowRight
              size={15}
              strokeWidth={2.5}
              color={C.ink}
              style={showAll ? s.feedMoreArrowExpanded : undefined}
            />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.friendStrip}
        >
          {visibleFriends.map((friend, index) => (
            <Pressable
              key={`${friend.drinkId}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${drinkById(friend.drinkId).name}`}
              onPress={() => onOpen(drinkById(friend.drinkId))}
              style={s.friendDrink}
            >
              <CompactFeedDrinkCard drink={drinkById(friend.drinkId)} />
              <View style={s.friendSocialRow}>
                <Text style={s.friendCount}>{friend.count}</Text>
                <View style={s.friendAvatarStack}>
                  {[0, 1, 2].map((offset) => (
                    <Image
                      key={offset}
                      source={
                        feedBuddyAvatars[
                          (index + offset) % feedBuddyAvatars.length
                        ]
                      }
                      style={[
                        s.friendMiniAvatar,
                        offset > 0 && s.friendMiniAvatarOverlap,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={s.activityTitle}>Friends Activity</Text>
        {activityItems.map((activity, index) => (
          <View key={`${activity.name}-${index}`}>
            {!!activity.group && (
              <Text style={s.activityGroup}>{activity.group}</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${activity.name} ${activity.message}`}
              onPress={() => {
                if (activity.reviewId) {
                  const reviewToOpen = reviews.find(
                    (item) => item.id === activity.reviewId,
                  );
                  if (reviewToOpen) onOpenReview(reviewToOpen);
                  return;
                }
                if (activity.target === "profile" && activity.profileId) {
                  const profile = profiles.find(
                    (item) => item.id === activity.profileId,
                  );
                  if (profile) onOpenProfile(profile);
                  return;
                }
                onOpen(drinkById(activity.drinkId));
              }}
              style={[
                s.activity,
                glass,
                activity.action ? s.activityTall : s.activityShort,
              ]}
            >
              <UserAvatar
                name={activity.name}
                source={activity.avatar}
                size={33}
                style={s.activityAvatar}
              />
              <View style={s.activityCopy}>
                <Text style={s.body}>
                  <Text style={{ fontFamily: F.bold }}>{activity.name} </Text>
                  {activity.message}
                </Text>
                {!!activity.action && (
                  <Text
                    style={[
                      s.activityAction,
                      activity.quote && s.activityQuote,
                    ]}
                  >
                    {activity.action}
                  </Text>
                )}
              </View>
              <Text style={s.activityTime}>{activity.time}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </Background>
  );
}

export default function App() {
  const [dm] = useDMSans({
    DMSans: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansBold: DMSans_700Bold,
  });
  const [bold] = useBoldonse({ Boldonse: Boldonse_400Regular });
  const [screen, setScreen] = useState<Screen>("splash");
  const [onboard, setOnboard] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [currentProfile, setCurrentProfile] = useState<DatabaseProfile | null>(
    null,
  );
  const [catalogueDrinks, setCatalogueDrinks] = useState<Drink[]>(drinks);
  const [databaseProfiles, setDatabaseProfiles] =
    useState<SearchProfile[]>(searchableProfiles);
  const [badges, setBadges] = useState<DatabaseBadge[]>([]);
  const [name, setName] = useState("Mark Kelly");
  const [username, setUsername] = useState("@markelly1");
  const [email, setEmail] = useState("mark@example.com");
  const [saved, setSaved] = useState<string[]>([]);
  const [reviews, setReviews] = useState(initialReviews);
  const [likedReviews, setLikedReviews] = useState<string[]>([]);
  const [commentThreads, setCommentThreads] = useState<
    Record<string, ReviewComment[]>
  >(initialCommentThreads);
  const [selected, setSelected] = useState(drinks[0]);
  const [selectedReviewId, setSelectedReviewId] = useState(
    initialReviews[0].id,
  );
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewReturn, setReviewReturn] = useState<Screen>("drink");
  const [reviewDetailReturn, setReviewDetailReturn] = useState<Screen>("drink");
  const [reviewDetailTab, setReviewDetailTab] = useState<
    "explore" | "drinklist" | "profile"
  >("explore");
  const [badgeTab, setBadgeTab] = useState(false);
  const [searchReturn, setSearchReturn] = useState<Screen>("explore");
  const [drinkReturn, setDrinkReturn] = useState<Screen>("explore");
  const [requestReturn, setRequestReturn] = useState<Screen>("search");
  const [requestDraft, setRequestDraft] = useState("");
  const [requests, setRequests] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState(searchableProfiles[1]);
  const [profileReturn, setProfileReturn] = useState<Screen>("search");
  const [followedProfiles, setFollowedProfiles] = useState<string[]>([]);
  const [settingsInitialSection, setSettingsInitialSection] = useState<
    "menu" | "account"
  >("menu");
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  const isOAuthConsentRoute =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location.pathname === "/oauth/consent";
  const oauthAuthorizationId = isOAuthConsentRoute
    ? new URLSearchParams(window.location.search).get("authorization_id")
    : null;

  const refreshDatabaseState = async (activeSession: Session | null) => {
    const [catalogueRows, profileRows, reviewRows] = await Promise.all([
      loadCatalogue(),
      loadProfiles(),
      loadReviews(),
    ]);
    const mappedDrinks = catalogueRows
      .map(beverageFromDatabase)
      .sort((a, b) => {
        const aFeatured = featuredCatalogueOrder.indexOf(a.id);
        const bFeatured = featuredCatalogueOrder.indexOf(b.id);
        if (aFeatured !== -1 || bFeatured !== -1) {
          if (aFeatured === -1) return 1;
          if (bFeatured === -1) return -1;
          return aFeatured - bFeatured;
        }
        return a.name.localeCompare(b.name);
      });
    const mappedProfiles = profileRows.map(profileFromDatabase);
    const mappedReviews = reviewRows.map(reviewFromDatabase);
    setCatalogueDrinks(mappedDrinks);
    setDatabaseProfiles(mappedProfiles);
    setReviews(mappedReviews);
    setSelected((current) => {
      return (
        mappedDrinks.find((drink) => drink.id === current.id) ||
        mappedDrinks[0] ||
        current
      );
    });
    setSelectedProfile((current) => {
      return (
        mappedProfiles.find((profile) => profile.id === current.id) ||
        mappedProfiles[0] ||
        current
      );
    });

    if (!activeSession) {
      setCurrentProfile(null);
      setSaved([]);
      setLikedReviews([]);
      setFollowedProfiles([]);
      setBadges([]);
      setRequests([]);
      return;
    }

    const userId = activeSession.user.id;
    const [
      profile,
      drinklistIds,
      likedIds,
      followingIds,
      badgeRows,
      requestRows,
    ] = await Promise.all([
      loadCurrentProfile(userId),
      loadDrinklist(userId),
      loadLikedReviewIds(userId),
      loadFollowingIds(userId),
      loadBadges(userId),
      loadDrinkRequests(userId),
    ]);
    let resolvedProfile = profile;
    const pendingAvatarUri = await AsyncStorage.getItem(PENDING_AVATAR_URI_KEY);
    if (pendingAvatarUri && !profile.avatar_url) {
      try {
        const avatarUrl = await uploadAvatar(userId, pendingAvatarUri);
        resolvedProfile = { ...profile, avatar_url: avatarUrl };
        await AsyncStorage.removeItem(PENDING_AVATAR_URI_KEY);
      } catch {
        // Keep the local URI so the optional onboarding photo can retry later.
      }
    }
    const pendingUsername = await AsyncStorage.getItem(PENDING_USERNAME_KEY);
    if (pendingUsername) {
      if (!resolvedProfile.username) {
        try {
          resolvedProfile = await updateCurrentProfile(activeSession.user, {
            displayName: resolvedProfile.display_name,
            username: pendingUsername,
          });
          await AsyncStorage.removeItem(PENDING_USERNAME_KEY);
        } catch {
          // The database migration normally handles this before the client fallback.
        }
      } else if (
        resolvedProfile.username.replace(/^@/, "").toLowerCase() ===
        pendingUsername.replace(/^@/, "").toLowerCase()
      ) {
        await AsyncStorage.removeItem(PENDING_USERNAME_KEY);
      }
    }
    const resolvedUsername =
      resolvedProfile.username || usernameFromEmail(activeSession.user.email);
    setCurrentProfile(resolvedProfile);
    setName(resolvedProfile.display_name || "Saturated User");
    setUsername(`@${resolvedUsername.replace(/^@/, "")}`);
    setEmail(activeSession.user.email || "");
    setSaved(drinklistIds);
    setLikedReviews(likedIds);
    setFollowedProfiles(followingIds);
    setBadges(badgeRows);
    setRequests(
      requestRows
        .map((request) => String(request.drink_name || ""))
        .filter(Boolean),
    );
  };

  useEffect(() => {
    if (!supabase) {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((raw) => {
          const stored = raw ? JSON.parse(raw) : null;
          if (stored?.onboarded) {
            setOnboarded(true);
            setName(stored.name || "Mark Kelly");
            setUsername(stored.username || "@markelly1");
            setEmail(stored.email || "mark@example.com");
            setSaved(stored.saved || []);
            setReviews(mergeSeedReviews(stored.reviews));
            setLikedReviews(stored.likedReviews || []);
            setCommentThreads(mergeSeedCommentThreads(stored.commentThreads));
            setRequests(stored.requests || []);
            setFollowedProfiles(stored.followedProfiles || []);
            setScreen("explore");
          } else {
            setScreen("splash");
            setOnboard(true);
          }
        })
        .catch(() => {
          setScreen("splash");
          setOnboard(true);
        })
        .finally(() => setReady(true));
      return;
    }

    let active = true;
    const applySession = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) {
        const pendingBirthDate = await AsyncStorage.getItem(
          PENDING_BIRTH_DATE_KEY,
        );
        if (pendingBirthDate) {
          try {
            await updateCurrentDateOfBirth(
              nextSession.user.id,
              pendingBirthDate,
            );
            await AsyncStorage.removeItem(PENDING_BIRTH_DATE_KEY);
          } catch (error) {
            console.warn("Could not save date of birth", error);
          }
        }
      }
      await refreshDatabaseState(nextSession);
      if (!active) return;
      setOnboarded(Boolean(nextSession));
      setOnboard(!nextSession);
      setScreen(nextSession ? "explore" : "splash");
    };
    const consumeAuthUrl = (url: string | null) => {
      if (url?.includes("auth/callback")) {
        void handleAuthCallback(url).catch((error) =>
          Alert.alert("Sign-in failed", error.message),
        );
      }
    };
    const urlSubscription = Linking.addEventListener("url", ({ url }) =>
      consumeAuthUrl(url),
    );
    void Linking.getInitialURL().then(consumeAuthUrl);
    const authSubscription = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === "INITIAL_SESSION") return;
        setTimeout(() => {
          void applySession(nextSession).catch((error) =>
            Alert.alert("Could not load your account", error.message),
          );
        }, 0);
      },
    );
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return applySession(data.session);
      })
      .catch((error) => {
        if (!active) return;
        Alert.alert("Could not connect to Saturated", error.message);
        setOnboard(true);
        setScreen("splash");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      urlSubscription.remove();
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ready && !isSupabaseConfigured)
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          onboarded,
          name,
          username,
          email,
          saved,
          reviews,
          likedReviews,
          commentThreads,
          requests,
          followedProfiles,
        }),
      );
  }, [
    ready,
    onboarded,
    name,
    username,
    email,
    saved,
    reviews,
    likedReviews,
    commentThreads,
    requests,
    followedProfiles,
  ]);
  const appDrinks = catalogueDrinks.length ? catalogueDrinks : drinks;
  const appProfiles = databaseProfiles.length
    ? databaseProfiles
    : searchableProfiles;
  const go = (nextScreen: Screen) => {
    if (nextScreen === "search") setSearchReturn(screen);
    setScreen(nextScreen);
  };
  const open = (d: Drink) => {
    setDrinkReturn(screen);
    setSelected(d);
    setScreen("drink");
  };
  const openProfile = (profileToOpen: SearchProfile) => {
    setProfileReturn(screen);
    setSelectedProfile(profileToOpen);
    setBadgeTab(false);
    setScreen("userProfile");
  };
  const openProfileByName = (userName: string) => {
    const normalizedName = userName.trim().toLowerCase();
    if (
      normalizedName === name.trim().toLowerCase() ||
      normalizedName === "mark kelly"
    ) {
      setBadgeTab(false);
      setScreen("profile");
      return;
    }
    const matchingProfile = appProfiles.find(
      (profile) => profile.name.toLowerCase() === normalizedName,
    );
    if (matchingProfile) openProfile(matchingProfile);
  };
  const review = (d: Drink) => {
    if (screen !== "drink") setDrinkReturn(screen);
    setEditingReviewId(null);
    setReviewReturn("drink");
    setSelected(d);
    setScreen("review");
  };
  const editReview = (reviewToEdit: Review) => {
    const drinkToEdit = appDrinks.find(
      (drink) => drink.id === reviewToEdit.drinkId,
    );
    if (!drinkToEdit) return;
    setEditingReviewId(reviewToEdit.id);
    setReviewReturn(screen);
    setSelected(drinkToEdit);
    setScreen("review");
  };
  const openReview = (reviewToOpen: Review) => {
    setReviewDetailReturn(screen);
    if (screen === "drink" && drinkReturn === "reviewDetail") {
      // Preserve the tab that led into the existing review thread.
    } else if (screen === "profile" || screen === "userProfile") {
      setReviewDetailTab("profile");
    } else if (
      screen === "drinklist" ||
      (screen === "drink" && drinkReturn === "drinklist")
    ) {
      setReviewDetailTab("drinklist");
    } else if (
      screen === "drink" &&
      (drinkReturn === "profile" || drinkReturn === "userProfile")
    ) {
      setReviewDetailTab("profile");
    } else {
      setReviewDetailTab("explore");
    }
    setSelectedReviewId(reviewToOpen.id);
    setSelected(
      appDrinks.find((drink) => drink.id === reviewToOpen.drinkId) ||
        appDrinks[0],
    );
    if (session) {
      void loadReviewComments(reviewToOpen.id)
        .then((comments) =>
          setCommentThreads((current) => ({
            ...current,
            [reviewToOpen.id]: comments.map(commentFromDatabase),
          })),
        )
        .catch((error) =>
          Alert.alert("Could not load comments", error.message),
        );
    }
    setScreen("reviewDetail");
  };
  const requestDrink = (returnScreen: Screen, initialName = "") => {
    setRequestReturn(returnScreen);
    setRequestDraft(initialName);
    setScreen("request");
  };
  const requireAccount = () => {
    if (session) return true;
    setOnboard(true);
    setScreen("splash");
    return false;
  };
  const toggle = async (id: string) => {
    if (!requireAccount()) return;
    try {
      const added = await toggleDrinklist(id);
      setSaved((current) =>
        added
          ? Array.from(new Set([...current, id]))
          : current.filter((item) => item !== id),
      );
    } catch (error) {
      Alert.alert(
        "Could not update Drinklist",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };
  const like = async (id: string) => {
    if (!requireAccount()) return;
    try {
      const liked = await toggleReviewLike(id);
      setLikedReviews((current) =>
        liked
          ? Array.from(new Set([...current, id]))
          : current.filter((reviewId) => reviewId !== id),
      );
      setReviews((allReviews) =>
        allReviews.map((item) =>
          item.id === id
            ? {
                ...item,
                likes: Math.max(
                  0,
                  item.likes +
                    (likedReviews.includes(id)
                      ? liked
                        ? 0
                        : -1
                      : liked
                        ? 1
                        : 0),
                ),
              }
            : item,
        ),
      );
    } catch (error) {
      Alert.alert(
        "Could not update like",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };
  const addComment = async (reviewId: string, text: string) => {
    if (!session || !currentProfile) {
      requireAccount();
      return;
    }
    const inserted = await addReviewComment(reviewId, text);
    const newComment: ReviewComment = {
      id: inserted.id,
      userId: session.user.id,
      user: currentProfile.display_name || "Saturated User",
      avatar: currentProfile.avatar_url
        ? { uri: currentProfile.avatar_url }
        : undefined,
      text,
      date: "Now",
    };
    setCommentThreads((current) => ({
      ...current,
      [reviewId]: [...(current[reviewId] || []), newComment],
    }));
    setReviews((current) =>
      current.map((item) =>
        item.id === reviewId ? { ...item, comments: item.comments + 1 } : item,
      ),
    );
  };
  if (!dm || !bold || !ready)
    return (
      <View style={s.loader}>
        <ActivityIndicator color={C.red} />
      </View>
    );
  const selectedReview =
    reviews.find((item) => item.id === selectedReviewId) ||
    reviews[0] ||
    initialReviews[0];
  const reviewBeingEdited = editingReviewId
    ? reviews.find((item) => item.id === editingReviewId)
    : undefined;
  let body: React.ReactNode;
  if (isOAuthConsentRoute)
    body = (
      <OAuthConsentScreen
        authorizationId={oauthAuthorizationId}
        session={session}
        onRequireSignIn={() => setOnboard(true)}
      />
    );
  else if (screen === "splash") body = <Splash />;
  else if (screen === "explore")
    body = (
      <Explore
        items={appDrinks}
        onOpen={open}
        onToggle={(id) => void toggle(id)}
        onGo={go}
      />
    );
  else if (screen === "search")
    body = (
      <SearchScreen
        drinks={appDrinks}
        profiles={appProfiles}
        saved={saved}
        onBack={() => go(searchReturn)}
        onOpen={open}
        onOpenProfile={openProfile}
        onToggle={(id) => void toggle(id)}
        onRequest={(drinkName) => requestDrink("search", drinkName)}
      />
    );
  else if (screen === "request")
    body = (
      <RequestDrinkScreen
        initialName={requestDraft}
        onBack={() => setScreen(requestReturn)}
        onSubmit={async (drinkName) => {
          if (!requireAccount()) throw new Error("Sign in to request a drink.");
          await submitDrinkRequest(drinkName);
          setRequests((current) =>
            current.some(
              (request) => request.toLowerCase() === drinkName.toLowerCase(),
            )
              ? current
              : [...current, drinkName],
          );
        }}
      />
    );
  else if (screen === "drinklist")
    body = (
      <Drinklist
        items={appDrinks.filter((d) => saved.includes(d.id))}
        onRemove={(id) => void toggle(id)}
        onOpen={open}
        onReview={review}
        onGo={go}
      />
    );
  else if (screen === "drink")
    body = (
      <DrinkProfile
        drink={selected}
        reviews={reviews}
        saved={saved.includes(selected.id)}
        onBack={() => setScreen(drinkReturn)}
        onReview={() => review(selected)}
        onToggle={() => void toggle(selected.id)}
        onLike={(id) => void like(id)}
        likedReviewIds={likedReviews}
        onOpenReview={openReview}
        onOpenProfile={openProfileByName}
      />
    );
  else if (screen === "reviewDetail")
    body = (
      <ReviewDetailScreen
        review={selectedReview}
        drink={
          appDrinks.find((drink) => drink.id === selectedReview.drinkId) ||
          appDrinks[0]
        }
        liked={likedReviews.includes(selectedReview.id)}
        comments={commentThreads[selectedReview.id] || []}
        onBack={() => setScreen(reviewDetailReturn)}
        onLike={() => void like(selectedReview.id)}
        onAddComment={(text) => void addComment(selectedReview.id, text)}
        onOpenProfile={openProfileByName}
        onOpenDrink={open}
        activeTab={reviewDetailTab}
        onGo={go}
      />
    );
  else if (screen === "review")
    body = (
      <ReviewScreen
        key={`${selected.id}-${editingReviewId || "new"}`}
        drink={selected}
        existingReview={reviewBeingEdited}
        onBack={() => {
          setEditingReviewId(null);
          setScreen(reviewReturn);
        }}
        onSubmit={async (rating, text, tags) => {
          if (!session) {
            requireAccount();
            return;
          }
          await saveReview({
            beverageId: selected.id,
            rating,
            body: text,
            tags,
          });
          const [reviewRows, catalogueRows, drinklistIds, badgeRows] =
            await Promise.all([
              loadReviews(),
              loadCatalogue(),
              loadDrinklist(session.user.id),
              loadBadges(session.user.id),
            ]);
          setReviews(reviewRows.map(reviewFromDatabase));
          setCatalogueDrinks(catalogueRows.map(beverageFromDatabase));
          setSaved(drinklistIds);
          setBadges(badgeRows);
          setEditingReviewId(null);
          setScreen(editingReviewId ? reviewReturn : "drink");
        }}
      />
    );
  else if (screen === "profile")
    body = (
      <Profile
        name={name}
        username={username}
        ownAvatar={
          currentProfile?.avatar_url
            ? { uri: currentProfile.avatar_url }
            : undefined
        }
        ownUserId={session?.user.id}
        drinks={appDrinks}
        reviews={reviews}
        badges={badges}
        buddyTotal={followedProfiles.length}
        badgeTab={badgeTab}
        setBadgeTab={setBadgeTab}
        onGo={go}
        onEditReview={editReview}
        onOpenReview={openReview}
        onEdit={() => {
          setSettingsInitialSection("account");
          setScreen("settings");
        }}
        onSettings={() => {
          setSettingsInitialSection("menu");
          go("settings");
        }}
      />
    );
  else if (screen === "userProfile")
    body = (
      <Profile
        key={selectedProfile.id}
        name={name}
        username={username}
        profile={selectedProfile}
        drinks={appDrinks}
        reviews={reviews}
        badgeTab={badgeTab}
        setBadgeTab={setBadgeTab}
        followed={followedProfiles.includes(selectedProfile.id)}
        onToggleFollow={() => {
          if (!requireAccount()) return;
          void toggleFollow(selectedProfile.id)
            .then((followed) =>
              setFollowedProfiles((current) =>
                followed
                  ? Array.from(new Set([...current, selectedProfile.id]))
                  : current.filter((id) => id !== selectedProfile.id),
              ),
            )
            .catch((error) =>
              Alert.alert("Could not update buddy", error.message),
            );
        }}
        onBack={() => setScreen(profileReturn)}
        onGo={go}
        onEditReview={editReview}
        onOpenReview={openReview}
        onEdit={() => undefined}
        onSettings={() => undefined}
      />
    );
  else if (screen === "settings")
    body = (
      <SettingsScreen
        key={settingsInitialSection}
        name={name}
        avatar={
          currentProfile?.avatar_url
            ? { uri: currentProfile.avatar_url }
            : undefined
        }
        username={username}
        email={email}
        ageVerified={Boolean(currentProfile?.birth_verified_at)}
        requestCount={requests.length}
        reviewCount={
          reviews.filter(
            (item) => item.user === name || item.user === "Mark Kelly",
          ).length
        }
        savedCount={saved.length}
        initialSection={settingsInitialSection}
        onBack={() => go("profile")}
        onRequest={() => requestDrink("settings")}
        onSaveAccount={async (details) => {
          if (!session) return;
          const profile = await updateCurrentProfile(session.user, {
            displayName: details.name,
            username: details.username,
            email: details.email,
          });
          setCurrentProfile(profile);
          setName(profile.display_name);
          setUsername(
            profile.username
              ? `@${profile.username.replace(/^@/, "")}`
              : "@user",
          );
          setEmail(details.email);
          setDatabaseProfiles((await loadProfiles()).map(profileFromDatabase));
        }}
        onUploadAvatar={async () => {
          if (!session) return;
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(
              "Photo permission required",
              "Allow photo access to update your profile picture.",
            );
            return;
          }
          const picked = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });
          if (picked.canceled) return;
          const avatarUrl = await uploadAvatar(
            session.user.id,
            picked.assets[0].uri,
          );
          setCurrentProfile((profile) =>
            profile ? { ...profile, avatar_url: avatarUrl } : profile,
          );
          setDatabaseProfiles((await loadProfiles()).map(profileFromDatabase));
        }}
        onDeleteAccount={() => {
          void deleteCurrentAccount().catch((error) =>
            Alert.alert("Could not delete account", error.message),
          );
        }}
        onLogout={() => {
          void supabase?.auth.signOut();
          setOnboarded(false);
          setOnboard(true);
          setScreen("splash");
        }}
      />
    );
  else
    body = (
      <Feed
        drinks={appDrinks}
        profiles={appProfiles}
        reviews={reviews}
        followingIds={followedProfiles}
        onBack={() => go("explore")}
        onOpen={open}
        onOpenProfile={openProfile}
        onOpenReview={openReview}
      />
    );
  return (
    <SafeAreaProvider>
      <ResponsiveAppFrame>
        <ScreenTransition
          key={isOAuthConsentRoute ? "oauth-consent" : screen}
          screen={screen}
        >
          {body}
        </ScreenTransition>
      </ResponsiveAppFrame>
      <Onboarding
        visible={onboard}
        onEmailSignIn={async (accountEmail, password, dateOfBirth) => {
          await AsyncStorage.setItem(PENDING_BIRTH_DATE_KEY, dateOfBirth);
          try {
            await signInWithEmail(accountEmail, password);
          } catch (error) {
            await AsyncStorage.removeItem(PENDING_BIRTH_DATE_KEY);
            throw error;
          }
        }}
        onEmailSignUp={async (details) => {
          await AsyncStorage.setItem(PENDING_USERNAME_KEY, details.username);
          if (details.avatarUri)
            await AsyncStorage.setItem(
              PENDING_AVATAR_URI_KEY,
              details.avatarUri,
            );
          else await AsyncStorage.removeItem(PENDING_AVATAR_URI_KEY);
          let result;
          try {
            result = await signUpWithEmail(details);
          } catch (error) {
            await AsyncStorage.removeItem(PENDING_AVATAR_URI_KEY);
            await AsyncStorage.removeItem(PENDING_USERNAME_KEY);
            throw error;
          }
          if (result.session && details.avatarUri) {
            try {
              await uploadAvatar(result.session.user.id, details.avatarUri);
              await AsyncStorage.removeItem(PENDING_AVATAR_URI_KEY);
            } catch {
              // The selected photo remains queued and uploads after the next session refresh.
            }
          }
          return result.session ? "signed-in" : "check-email";
        }}
        onProvider={async (provider, dateOfBirth) => {
          await AsyncStorage.setItem(PENDING_BIRTH_DATE_KEY, dateOfBirth);
          try {
            await signInWithProvider(provider);
          } catch (error) {
            await AsyncStorage.removeItem(PENDING_BIRTH_DATE_KEY);
            throw error;
          }
        }}
      />
    </SafeAreaProvider>
  );
}
