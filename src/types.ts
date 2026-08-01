import type { ImageSourcePropType } from "react-native";

export type Drink = {
  id: string;
  name: string;
  type: string;
  typeColor: string;
  image: ImageSourcePropType;
  rating: number;
  reviewCount?: number;
  tags: string[];
  description: string;
  origin?: string;
  brand?: string;
};

export type Review = {
  id: string;
  drinkId: string;
  userId?: string;
  user: string;
  avatar: ImageSourcePropType;
  rating: number;
  text: string;
  tags: string[];
  date: string;
  likes: number;
  comments: number;
  imageUrls?: string[];
};

export type ReviewComment = {
  id: string;
  userId?: string;
  user: string;
  avatar: ImageSourcePropType;
  text: string;
  date: string;
};

export type SearchProfile = {
  id: string;
  name: string;
  handle: string;
  memberSince: string;
  buddies: number;
  avatar: ImageSourcePropType;
};

export type Screen =
  | "splash"
  | "explore"
  | "search"
  | "request"
  | "drinklist"
  | "drink"
  | "profile"
  | "userProfile"
  | "settings"
  | "review"
  | "reviewDetail"
  | "feed";
