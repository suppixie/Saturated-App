import { Platform } from "react-native";

export const C = {
  red: "#cc242c",
  teal: "#2b4959",
  green: "#04b264",
  greenDark: "#087647",
  ink: "#201a1b",
  cream: "#fffef8",
  gold: "#ffd700",
} as const;

export const F = {
  display: "Boldonse",
  regular: "DMSans",
  medium: "DMSansMedium",
  bold: "DMSansBold",
} as const;

export const FIGMA_FRAME_WIDTH = 441;
export const FIGMA_FRAME_HEIGHT = 918;
export const EXPLORE_PAGE_SIZE = 30;

export const glass = {
  backgroundColor: "rgba(4,178,100,.15)",
  borderColor: "rgba(255,255,255,.5)",
  borderWidth: 0.35,
  ...(Platform.OS === "android"
    ? {
        boxShadow: "0px 4px 4px rgba(0,0,0,0.28)",
      }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
      }),
} as const;
