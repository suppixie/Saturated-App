import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./lib/supabase";
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
  Info,
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
import React, { useEffect, useState } from "react";
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
  FlatList,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const C = {
  red: "#cc242c",
  teal: "#2b4959",
  green: "#04b264",
  ink: "#201a1b",
  cream: "#fffef8",
  gold: "#ffd700",
};
const F = {
  display: "Boldonse",
  regular: "DMSans",
  medium: "DMSansMedium",
  bold: "DMSansBold",
};

const STORAGE_KEY = "saturated-state-v7";
const FIGMA_FRAME_WIDTH = 441;
const FIGMA_FRAME_HEIGHT = 918;

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

const BACKGROUND_NOISE_MINT = createNoisePath(176, 0x4b7a21, 0.08, 42, 42);
const BACKGROUND_NOISE_LIGHT = createNoisePath(134, 0xf8e4c2, 0, 42, 42);

type Drink = {
  id: string;
  name: string;
  type: string;
  typeColor: string;
  image: ImageSourcePropType;
  rating: number;
  tags: string[];
  description: string;
  origin?: string;
  brand?: string;
};
type Review = {
  id: string;
  drinkId: string;
  user: string;
  avatar: ImageSourcePropType;
  rating: number;
  text: string;
  tags: string[];
  date: string;
  likes: number;
  comments: number;
};
type ReviewComment = {
  id: string;
  user: string;
  avatar: ImageSourcePropType;
  text: string;
  date: string;
};
type SearchProfile = {
  id: string;
  name: string;
  handle: string;
  memberSince: string;
  buddies: number;
  avatar: ImageSourcePropType;
};
type Screen =
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

const coreDrinks: Drink[] = [
  {
    id: "aperol",
    name: "Aperol Spritz",
    type: "Cocktail",
    typeColor: "#aa0cac",
    rating: 4.1,
    tags: ["Citrus", "Refreshing"],
    origin: "Italy",
    brand: "Aperol",
    description:
      "Aperol Spritz is a bright and bubbly Italian cocktail, perfect for sunny afternoons. It's a refreshing mix of bittersweet flavors that instantly lifts your spirits.",
    image: require("./assets/drinks/aperol.png"),
  },
  {
    id: "sprite",
    name: "Sprite",
    type: "Soft Drink",
    typeColor: "#2903c0",
    rating: 3.8,
    tags: ["Refreshing", "Fizzy"],
    description:
      "A crisp lemon-lime soft drink with a clean, refreshing finish.",
    image: require("./assets/drinks/sprite.png"),
  },
  {
    id: "coke",
    name: "Coca-Cola",
    type: "Soft Drink",
    typeColor: "#2903c0",
    rating: 4.0,
    tags: ["Fizzy", "Sweet"],
    description:
      "The unmistakable sparkling cola with caramel and citrus notes.",
    image: require("./assets/drinks/coca-cola.png"),
  },
  {
    id: "heineken",
    name: "Heineken",
    type: "Beer",
    typeColor: "#84791b",
    rating: 4.0,
    tags: ["Mild", "Crisp"],
    description: "A balanced pale lager with a subtly bitter finish.",
    image: require("./assets/drinks/heineken.png"),
  },
  {
    id: "pilsner",
    name: "Pilsner Urquell",
    type: "Beer",
    typeColor: "#84791b",
    rating: 4.5,
    tags: ["Crisp", "Bitter"],
    description: "The original golden pilsner with a floral hop aroma.",
    image: require("./assets/drinks/pilsner.png"),
  },
  {
    id: "margarita",
    name: "Margarita",
    type: "Cocktail",
    typeColor: "#aa0cac",
    rating: 4.2,
    tags: ["Citrusy", "Tangy"],
    description: "Tequila, lime and orange liqueur served bright and cold.",
    image: require("./assets/drinks/margarita.png"),
  },
  {
    id: "hophouse",
    name: "Hop House Lager",
    type: "Beer",
    typeColor: "#84791b",
    rating: 4.3,
    tags: ["Mild", "Bitter"],
    description: "A double-hopped lager with a crisp, aromatic profile.",
    image: require("./assets/drinks/hop-house.png"),
  },
  {
    id: "guinness",
    name: "Guinness Draught",
    type: "Beer",
    typeColor: "#84791b",
    rating: 4.6,
    tags: ["Creamy", "Roasted"],
    description: "Iconic stout with roasted notes and a smooth creamy head.",
    image: require("./assets/drinks/guinness.png"),
  },
  {
    id: "petrus",
    name: "Château Petrus",
    type: "Wine",
    typeColor: "#9c0000",
    rating: 4.9,
    tags: ["Dry", "Rich"],
    origin: "France",
    brand: "Petrus",
    description:
      "A celebrated Pomerol with plush dark fruit and a long, elegant finish.",
    image: require("./assets/drinks/petrus.png"),
  },
  {
    id: "birra",
    name: "Birra Moretti",
    type: "Beer",
    typeColor: "#84791b",
    rating: 5,
    tags: ["Crisp", "Balanced"],
    description: "A traditionally brewed Italian lager.",
    image: require("./assets/drinks/birra.png"),
  },
  {
    id: "sevenup",
    name: "7 Up",
    type: "Soft Drink",
    typeColor: "#2903c0",
    rating: 3.7,
    tags: ["Citrus", "Fizzy"],
    description: "A light lemon-lime soda with an upbeat, sparkling finish.",
    image: require("./assets/drinks/seven-up.png"),
  },
  {
    id: "cosmo",
    name: "Cosmopolitan",
    type: "Cocktail",
    typeColor: "#aa0cac",
    rating: 4.2,
    tags: ["Tarty", "Fruity"],
    description: "A bright cranberry and citrus cocktail.",
    image: require("./assets/drinks/cosmopolitan.png"),
  },
  {
    id: "espresso",
    name: "Espresso Martini",
    type: "Cocktail",
    typeColor: "#aa0cac",
    rating: 4.7,
    tags: ["Strong", "Coffee"],
    description: "A rich, chilled combination of espresso and vodka.",
    image: require("./assets/drinks/espresso-martini.png"),
  },
  {
    id: "rose",
    name: "Whispering Angel",
    type: "Wine",
    typeColor: "#9c0000",
    rating: 4.4,
    tags: ["Dry", "Floral"],
    description: "Elegant Provence rosé with delicate fruit notes.",
    image: require("./assets/drinks/whispering-angel.png"),
  },
  {
    id: "cortado",
    name: "Cortado",
    type: "Coffee",
    typeColor: "#a4600d",
    rating: 4.5,
    tags: ["Creamy", "Strong"],
    description: "Equal parts espresso and warm steamed milk.",
    image: require("./assets/drinks/cortado.png"),
  },
  {
    id: "matcha",
    name: "White Choc Matcha",
    type: "Tea Latte",
    typeColor: "#7cb100",
    rating: 4.3,
    tags: ["Creamy", "Sweet"],
    description: "Ceremonial matcha softened with white chocolate.",
    image: require("./assets/drinks/matcha.png"),
  },
];

type AdditionalDrinkSeed = Drink & {
  totalReviews: number;
  review: Omit<Review, "id" | "drinkId" | "avatar">;
};

const reviewAuthors: Record<string, ImageSourcePropType> = {
  "Gabby Romero": require("./assets/people/gabby.png"),
  "Liam Harper": require("./assets/people/liam.png"),
  "Sarah James": require("./assets/people/sarah.png"),
  "James Kent": require("./assets/people/james.png"),
  "Jaques Dane": require("./assets/people/jaques.png"),
  "Liddy Powell": require("./assets/people/liddy.png"),
  "Mark Kelly": require("./assets/people/mark.png"),
};

const additionalDrinkSeeds: AdditionalDrinkSeed[] = [
  // Soft drinks
  {
    id: "fanta-orange",
    name: "Fanta Orange",
    type: "Soft Drink",
    typeColor: "#2903c0",
    image: require("./assets/drinks/catalog/fanta-orange.png"),
    rating: 4.1,
    tags: ["Orange", "Fizzy", "Sweet"],
    origin: "Italy",
    brand: "Fanta",
    description:
      "A lively orange soda with bright citrus sweetness and a playful sparkling finish.",
    totalReviews: 73,
    review: {
      user: "Sarah James",
      rating: 4,
      text: "Big orange aroma, lots of bubbles and a nostalgic candy-like finish. Best over ice when you want something unapologetically sweet.",
      tags: ["Orange", "Fizzy"],
      date: "19 Jul 2026",
      likes: 14,
      comments: 3,
    },
  },
  {
    id: "dr-pepper",
    name: "Dr Pepper",
    type: "Soft Drink",
    typeColor: "#2903c0",
    image: require("./assets/drinks/catalog/dr-pepper.png"),
    rating: 4.2,
    tags: ["Cherry", "Spiced", "Sweet"],
    origin: "United States",
    brand: "Dr Pepper",
    description:
      "A distinctive dark soda blending cherry, warm spice and caramel-like sweetness.",
    totalReviews: 96,
    review: {
      user: "James Kent",
      rating: 4.5,
      text: "Cherry is the first thing I notice, followed by vanilla and a curious peppery warmth. More complex than a standard cola.",
      tags: ["Cherry", "Spiced"],
      date: "18 Jul 2026",
      likes: 21,
      comments: 5,
    },
  },
  {
    id: "sanpellegrino-limonata",
    name: "S.Pellegrino Limonata",
    type: "Soft Drink",
    typeColor: "#2903c0",
    image: require("./assets/drinks/catalog/sanpellegrino-limonata.png"),
    rating: 4.4,
    tags: ["Lemon", "Tart", "Refreshing"],
    origin: "Italy",
    brand: "S.Pellegrino",
    description:
      "Sparkling Italian lemon drink with real citrus character and a pleasantly tart edge.",
    totalReviews: 58,
    review: {
      user: "Gabby Romero",
      rating: 4.5,
      text: "Proper lemon sharpness rather than just lemon candy. The fine bubbles and slightly bitter peel note keep it refreshing.",
      tags: ["Lemon", "Tart"],
      date: "17 Jul 2026",
      likes: 18,
      comments: 4,
    },
  },
  {
    id: "club-mate",
    name: "Club-Mate",
    type: "Soft Drink",
    typeColor: "#2903c0",
    image: require("./assets/drinks/catalog/club-mate.png"),
    rating: 3.9,
    tags: ["Herbal", "Dry", "Caffeinated"],
    origin: "Germany",
    brand: "Club-Mate",
    description:
      "A caffeinated sparkling yerba mate drink with herbal depth and restrained sweetness.",
    totalReviews: 41,
    review: {
      user: "Liam Harper",
      rating: 4,
      text: "Unusual at first: dry, grassy and gently smoky. Once it is ice cold, the herbal bitterness becomes very moreish.",
      tags: ["Herbal", "Dry"],
      date: "16 Jul 2026",
      likes: 9,
      comments: 2,
    },
  },
  {
    id: "irn-bru",
    name: "Irn-Bru",
    type: "Soft Drink",
    typeColor: "#2903c0",
    image: require("./assets/drinks/catalog/irn-bru.png"),
    rating: 4,
    tags: ["Citrus", "Bubblegum", "Fizzy"],
    origin: "Scotland",
    brand: "A.G. Barr",
    description:
      "A vivid Scottish soft drink with citrus, vanilla and bubblegum-like flavour notes.",
    totalReviews: 82,
    review: {
      user: "Mark Kelly",
      rating: 4,
      text: "Almost impossible to describe: orange citrus, cream soda and bubblegum all at once. Weird in the best possible way.",
      tags: ["Bubblegum", "Fizzy"],
      date: "15 Jul 2026",
      likes: 17,
      comments: 6,
    },
  },

  // Beers
  {
    id: "sierra-nevada-pale-ale",
    name: "Sierra Nevada Pale Ale",
    type: "Beer",
    typeColor: "#84791b",
    image: require("./assets/drinks/catalog/sierra-nevada-pale-ale.png"),
    rating: 4.6,
    tags: ["Piney", "Citrus", "Bitter"],
    origin: "United States",
    brand: "Sierra Nevada",
    description:
      "A classic American pale ale with grapefruit, pine and a firm caramel malt backbone.",
    totalReviews: 118,
    review: {
      user: "Liam Harper",
      rating: 4.5,
      text: "A benchmark pale ale. Grapefruit and pine lead the way, with enough caramel malt to keep the finish balanced.",
      tags: ["Piney", "Bitter"],
      date: "14 Jul 2026",
      likes: 25,
      comments: 7,
    },
  },
  {
    id: "peroni",
    name: "Peroni Nastro Azzurro",
    type: "Beer",
    typeColor: "#84791b",
    image: require("./assets/drinks/catalog/peroni.png"),
    rating: 4.1,
    tags: ["Crisp", "Light", "Dry"],
    origin: "Italy",
    brand: "Peroni",
    description:
      "A clean Italian lager with delicate grain, light floral hops and a dry finish.",
    totalReviews: 104,
    review: {
      user: "Jaques Dane",
      rating: 4,
      text: "Very clean and light with a tidy dry finish. Nothing loud here, just a crisp lager that works brilliantly with food.",
      tags: ["Crisp", "Dry"],
      date: "13 Jul 2026",
      likes: 13,
      comments: 2,
    },
  },
  {
    id: "punk-ipa",
    name: "Punk IPA",
    type: "Beer",
    typeColor: "#84791b",
    image: require("./assets/drinks/catalog/punk-ipa.png"),
    rating: 4.3,
    tags: ["Tropical", "Hoppy", "Bitter"],
    origin: "Scotland",
    brand: "BrewDog",
    description:
      "A modern IPA packed with tropical fruit, citrus hops and a punchy bitter finish.",
    totalReviews: 137,
    review: {
      user: "Mark Kelly",
      rating: 4.5,
      text: "Loads of grapefruit and tropical fruit before the hops snap into a long bitter finish. Bold but still easy to drink.",
      tags: ["Tropical", "Hoppy"],
      date: "12 Jul 2026",
      likes: 22,
      comments: 5,
    },
  },
  {
    id: "corona-extra",
    name: "Corona Extra",
    type: "Beer",
    typeColor: "#84791b",
    image: require("./assets/drinks/catalog/corona-extra.png"),
    rating: 3.9,
    tags: ["Light", "Crisp", "Citrus"],
    origin: "Mexico",
    brand: "Corona",
    description:
      "A light-bodied Mexican lager known for its mellow grain and refreshing citrus pairing.",
    totalReviews: 156,
    review: {
      user: "Sarah James",
      rating: 4,
      text: "Soft grain, gentle bitterness and very refreshing with lime. It is simple, sunny and at its best straight from an ice bucket.",
      tags: ["Light", "Citrus"],
      date: "11 Jul 2026",
      likes: 19,
      comments: 4,
    },
  },
  {
    id: "asahi-super-dry",
    name: "Asahi Super Dry",
    type: "Beer",
    typeColor: "#84791b",
    image: require("./assets/drinks/catalog/asahi-super-dry.png"),
    rating: 4.4,
    tags: ["Dry", "Crisp", "Clean"],
    origin: "Japan",
    brand: "Asahi",
    description:
      "A sharp, highly attenuated Japanese lager with a clean palate and quick dry finish.",
    totalReviews: 89,
    review: {
      user: "James Kent",
      rating: 4.5,
      text: "Exceptionally clean with a brisk carbonation and almost no lingering sweetness. The dry finish makes the next sip inevitable.",
      tags: ["Dry", "Clean"],
      date: "10 Jul 2026",
      likes: 16,
      comments: 3,
    },
  },

  // Cocktails
  {
    id: "mojito",
    name: "Mojito",
    type: "Cocktail",
    typeColor: "#aa0cac",
    image: require("./assets/drinks/catalog/mojito.png"),
    rating: 4.5,
    tags: ["Minty", "Citrus", "Refreshing"],
    origin: "Cuba",
    brand: "Classic Cocktail",
    description:
      "White rum, fresh lime, mint, sugar and soda built into a cool, aromatic highball.",
    totalReviews: 124,
    review: {
      user: "Gabby Romero",
      rating: 4.5,
      text: "Fresh mint and lime make this incredibly bright. The rum is present without overpowering the sparkling, cooling finish.",
      tags: ["Minty", "Refreshing"],
      date: "9 Jul 2026",
      likes: 28,
      comments: 8,
    },
  },
  {
    id: "negroni",
    name: "Negroni",
    type: "Cocktail",
    typeColor: "#aa0cac",
    image: require("./assets/drinks/catalog/negroni.png"),
    rating: 4.6,
    tags: ["Bitter", "Orange", "Herbal"],
    origin: "Italy",
    brand: "Classic Cocktail",
    description:
      "Equal parts gin, sweet vermouth and bitter aperitivo with a fragrant orange twist.",
    totalReviews: 111,
    review: {
      user: "Liddy Powell",
      rating: 5,
      text: "Bitter orange, dark herbs and a warm gin backbone. It starts assertive and becomes beautifully silky as the ice melts.",
      tags: ["Bitter", "Herbal"],
      date: "8 Jul 2026",
      likes: 33,
      comments: 9,
    },
  },
  {
    id: "old-fashioned",
    name: "Old Fashioned",
    type: "Cocktail",
    typeColor: "#aa0cac",
    image: require("./assets/drinks/catalog/old-fashioned.png"),
    rating: 4.7,
    tags: ["Bourbon", "Orange", "Rich"],
    origin: "United States",
    brand: "Classic Cocktail",
    description:
      "Whiskey gently sweetened and seasoned with aromatic bitters, served over a large cube.",
    totalReviews: 132,
    review: {
      user: "Mark Kelly",
      rating: 5,
      text: "Rich bourbon, orange oil and aromatic spice with exactly enough sweetness. A slow drink that rewards every minute in the glass.",
      tags: ["Bourbon", "Rich"],
      date: "7 Jul 2026",
      likes: 36,
      comments: 10,
    },
  },
  {
    id: "paloma",
    name: "Paloma",
    type: "Cocktail",
    typeColor: "#aa0cac",
    image: require("./assets/drinks/catalog/paloma.png"),
    rating: 4.4,
    tags: ["Grapefruit", "Tangy", "Fizzy"],
    origin: "Mexico",
    brand: "Classic Cocktail",
    description:
      "Tequila, grapefruit and lime topped with soda for a tart, lightly saline refresher.",
    totalReviews: 77,
    review: {
      user: "Sarah James",
      rating: 4.5,
      text: "Juicy grapefruit and lime make the tequila taste bright rather than heavy. A tiny salty note gives the finish real lift.",
      tags: ["Grapefruit", "Tangy"],
      date: "6 Jul 2026",
      likes: 20,
      comments: 4,
    },
  },
  {
    id: "french-75",
    name: "French 75",
    type: "Cocktail",
    typeColor: "#aa0cac",
    image: require("./assets/drinks/catalog/french-75.png"),
    rating: 4.5,
    tags: ["Lemon", "Sparkling", "Dry"],
    origin: "France",
    brand: "Classic Cocktail",
    description:
      "Gin, lemon and sugar lengthened with sparkling wine for an elegant, lively drink.",
    totalReviews: 69,
    review: {
      user: "Gabby Romero",
      rating: 4.5,
      text: "The lemon and gin give it structure while the sparkling wine keeps everything celebratory. Crisp, dry and dangerously easy.",
      tags: ["Lemon", "Sparkling"],
      date: "5 Jul 2026",
      likes: 24,
      comments: 6,
    },
  },

  // Wines
  {
    id: "cloudy-bay-sauvignon",
    name: "Cloudy Bay Sauvignon Blanc",
    type: "Wine",
    typeColor: "#9c0000",
    image: require("./assets/drinks/catalog/cloudy-bay-sauvignon.png"),
    rating: 4.6,
    tags: ["Tropical", "Crisp", "Herbal"],
    origin: "New Zealand",
    brand: "Cloudy Bay",
    description:
      "Vibrant Marlborough Sauvignon Blanc with passionfruit, citrus and a fresh herbal edge.",
    totalReviews: 86,
    review: {
      user: "Liddy Powell",
      rating: 4.5,
      text: "Passionfruit and lime jump from the glass, followed by a fresh green-herb note. Bright acidity keeps it precise.",
      tags: ["Tropical", "Crisp"],
      date: "4 Jul 2026",
      likes: 19,
      comments: 4,
    },
  },
  {
    id: "rioja-reserva",
    name: "Rioja Reserva",
    type: "Wine",
    typeColor: "#9c0000",
    image: require("./assets/drinks/catalog/rioja-reserva.png"),
    rating: 4.5,
    tags: ["Cherry", "Vanilla", "Oaky"],
    origin: "Spain",
    brand: "Marqués de Reserva",
    description:
      "Mature Tempranillo with red cherry, vanilla, leather and polished oak spice.",
    totalReviews: 74,
    review: {
      user: "James Kent",
      rating: 4.5,
      text: "Ripe cherry meets vanilla and cedar, with soft tannins that make it feel already settled. Excellent with grilled food.",
      tags: ["Cherry", "Oaky"],
      date: "3 Jul 2026",
      likes: 17,
      comments: 3,
    },
  },
  {
    id: "barolo",
    name: "Barolo",
    type: "Wine",
    typeColor: "#9c0000",
    image: require("./assets/drinks/catalog/barolo.png"),
    rating: 4.8,
    tags: ["Rose", "Tannic", "Earthy"],
    origin: "Italy",
    brand: "Piedmont Selection",
    description:
      "Structured Nebbiolo showing rose, red fruit, earth and a long, finely tannic finish.",
    totalReviews: 63,
    review: {
      user: "Gabby Romero",
      rating: 5,
      text: "Perfumed with rose and cherry, then earthy and seriously structured on the palate. The finish seems to last for minutes.",
      tags: ["Rose", "Tannic"],
      date: "2 Jul 2026",
      likes: 29,
      comments: 7,
    },
  },
  {
    id: "sancerre",
    name: "Sancerre",
    type: "Wine",
    typeColor: "#9c0000",
    image: require("./assets/drinks/catalog/sancerre.png"),
    rating: 4.4,
    tags: ["Mineral", "Citrus", "Dry"],
    origin: "France",
    brand: "Loire Valley Selection",
    description:
      "Dry Loire Sauvignon Blanc with lemon, white flowers and a clean flinty mineral note.",
    totalReviews: 57,
    review: {
      user: "Sarah James",
      rating: 4.5,
      text: "Lemon peel, white flowers and a distinctly stony finish. Lean and refreshing, but not short on personality.",
      tags: ["Mineral", "Dry"],
      date: "1 Jul 2026",
      likes: 15,
      comments: 2,
    },
  },
  {
    id: "mendoza-malbec",
    name: "Mendoza Malbec",
    type: "Wine",
    typeColor: "#9c0000",
    image: require("./assets/drinks/catalog/mendoza-malbec.png"),
    rating: 4.5,
    tags: ["Plum", "Cocoa", "Full-bodied"],
    origin: "Argentina",
    brand: "Andes Estate",
    description:
      "Generous high-altitude Malbec with plum, blackberry, cocoa and smooth rounded tannins.",
    totalReviews: 92,
    review: {
      user: "Mark Kelly",
      rating: 4.5,
      text: "Dark plum and blackberry with a cocoa note that works beautifully beside steak. Full-bodied without feeling rough.",
      tags: ["Plum", "Cocoa"],
      date: "30 Jun 2026",
      likes: 23,
      comments: 5,
    },
  },

  // Coffees
  {
    id: "flat-white",
    name: "Flat White",
    type: "Coffee",
    typeColor: "#a4600d",
    image: require("./assets/drinks/catalog/flat-white.png"),
    rating: 4.7,
    tags: ["Velvety", "Strong", "Milky"],
    origin: "Australia / New Zealand",
    brand: "Coffeehouse Classic",
    description:
      "Double espresso folded through finely textured milk for a strong, velvety cup.",
    totalReviews: 143,
    review: {
      user: "Liam Harper",
      rating: 5,
      text: "Silky microfoam with enough espresso to stay bold all the way through. Richer than a latte and beautifully balanced.",
      tags: ["Velvety", "Strong"],
      date: "29 Jun 2026",
      likes: 31,
      comments: 8,
    },
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    type: "Coffee",
    typeColor: "#a4600d",
    image: require("./assets/drinks/catalog/cold-brew.png"),
    rating: 4.4,
    tags: ["Smooth", "Chocolate", "Cold"],
    origin: "Japan",
    brand: "Slow Steep",
    description:
      "Coffee extracted slowly in cold water for a smooth body and low-acid chocolate notes.",
    totalReviews: 121,
    review: {
      user: "Sarah James",
      rating: 4.5,
      text: "Smooth and chocolatey with none of the sharpness hot coffee can have. Clean enough to drink without milk or sugar.",
      tags: ["Smooth", "Chocolate"],
      date: "28 Jun 2026",
      likes: 26,
      comments: 6,
    },
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    type: "Coffee",
    typeColor: "#a4600d",
    image: require("./assets/drinks/catalog/cappuccino.png"),
    rating: 4.5,
    tags: ["Foamy", "Roasted", "Creamy"],
    origin: "Italy",
    brand: "Coffeehouse Classic",
    description:
      "Espresso balanced with steamed milk and a generous cap of airy microfoam.",
    totalReviews: 164,
    review: {
      user: "Gabby Romero",
      rating: 4.5,
      text: "A deep roasted espresso under a cloud of fine, sweet foam. The proportions make every sip feel light and rich together.",
      tags: ["Foamy", "Roasted"],
      date: "27 Jun 2026",
      likes: 22,
      comments: 4,
    },
  },
  {
    id: "iced-americano",
    name: "Iced Americano",
    type: "Coffee",
    typeColor: "#a4600d",
    image: require("./assets/drinks/catalog/iced-americano.png"),
    rating: 4.2,
    tags: ["Bold", "Clean", "Refreshing"],
    origin: "United States",
    brand: "Coffeehouse Classic",
    description:
      "Espresso lengthened with cold water and ice for a bold but clean chilled coffee.",
    totalReviews: 98,
    review: {
      user: "James Kent",
      rating: 4,
      text: "Direct, dark and refreshing. The melting ice softens the espresso gradually without turning it milky or sweet.",
      tags: ["Bold", "Clean"],
      date: "26 Jun 2026",
      likes: 12,
      comments: 2,
    },
  },
  {
    id: "mocha",
    name: "Caffè Mocha",
    type: "Coffee",
    typeColor: "#a4600d",
    image: require("./assets/drinks/catalog/mocha.png"),
    rating: 4.3,
    tags: ["Chocolate", "Creamy", "Sweet"],
    origin: "Italy / United States",
    brand: "Coffeehouse Classic",
    description:
      "Espresso and steamed milk enriched with chocolate for a comforting dessert-like coffee.",
    totalReviews: 116,
    review: {
      user: "Liddy Powell",
      rating: 4.5,
      text: "Dark chocolate and espresso keep each other in check. Sweet and creamy, but with enough roast to feel like coffee rather than pudding.",
      tags: ["Chocolate", "Creamy"],
      date: "25 Jun 2026",
      likes: 20,
      comments: 5,
    },
  },

  // Teas
  {
    id: "earl-grey",
    name: "Earl Grey",
    type: "Tea",
    typeColor: "#7cb100",
    image: require("./assets/drinks/catalog/earl-grey.png"),
    rating: 4.3,
    tags: ["Bergamot", "Floral", "Citrus"],
    origin: "United Kingdom",
    brand: "Classic Tea",
    description:
      "Black tea scented with fragrant bergamot oil for a brisk, floral citrus cup.",
    totalReviews: 79,
    review: {
      user: "Sarah James",
      rating: 4.5,
      text: "Brisk black tea with a clear bergamot perfume. Floral and citrusy without tasting like fragrance when brewed gently.",
      tags: ["Bergamot", "Floral"],
      date: "24 Jun 2026",
      likes: 18,
      comments: 3,
    },
  },
  {
    id: "masala-chai",
    name: "Masala Chai",
    type: "Tea",
    typeColor: "#7cb100",
    image: require("./assets/drinks/catalog/masala-chai.png"),
    rating: 4.7,
    tags: ["Spiced", "Milky", "Warming"],
    origin: "India",
    brand: "House Chai",
    description:
      "Black tea simmered with milk, ginger, cardamom, cinnamon and warming aromatic spices.",
    totalReviews: 105,
    review: {
      user: "Gabby Romero",
      rating: 5,
      text: "Cardamom and ginger lead, then cinnamon and sweet milk round everything out. Deeply aromatic and genuinely warming.",
      tags: ["Spiced", "Warming"],
      date: "23 Jun 2026",
      likes: 30,
      comments: 7,
    },
  },
  {
    id: "jasmine-green-tea",
    name: "Jasmine Green Tea",
    type: "Tea",
    typeColor: "#7cb100",
    image: require("./assets/drinks/catalog/jasmine-green-tea.png"),
    rating: 4.4,
    tags: ["Floral", "Delicate", "Fresh"],
    origin: "China",
    brand: "Jasmine Garden",
    description:
      "Green tea naturally scented with jasmine blossoms for a soft, clean and floral infusion.",
    totalReviews: 67,
    review: {
      user: "Liddy Powell",
      rating: 4.5,
      text: "Fresh green tea underneath a gentle jasmine aroma. Delicate, clean and never bitter when the water is not too hot.",
      tags: ["Floral", "Delicate"],
      date: "22 Jun 2026",
      likes: 16,
      comments: 2,
    },
  },
  {
    id: "peach-iced-tea",
    name: "Peach Iced Tea",
    type: "Tea",
    typeColor: "#7cb100",
    image: require("./assets/drinks/catalog/peach-iced-tea.png"),
    rating: 4.2,
    tags: ["Peach", "Fruity", "Refreshing"],
    origin: "United States",
    brand: "Summer Brew",
    description:
      "Chilled black tea with ripe peach flavour and a smooth, lightly sweet finish.",
    totalReviews: 88,
    review: {
      user: "Mark Kelly",
      rating: 4,
      text: "Ripe peach comes first, but there is enough tea tannin underneath to stop it becoming syrupy. Very good over lots of ice.",
      tags: ["Peach", "Refreshing"],
      date: "21 Jun 2026",
      likes: 14,
      comments: 3,
    },
  },
  {
    id: "genmaicha",
    name: "Genmaicha",
    type: "Tea",
    typeColor: "#7cb100",
    image: require("./assets/drinks/catalog/genmaicha.png"),
    rating: 4.5,
    tags: ["Toasted", "Grassy", "Nutty"],
    origin: "Japan",
    brand: "Kyoto Tea House",
    description:
      "Japanese green tea blended with roasted rice for a grassy, nutty and comforting cup.",
    totalReviews: 54,
    review: {
      user: "Liam Harper",
      rating: 4.5,
      text: "The roasted rice smells like warm popcorn, while the green tea stays fresh and grassy. Comforting and surprisingly savoury.",
      tags: ["Toasted", "Nutty"],
      date: "20 Jun 2026",
      likes: 17,
      comments: 4,
    },
  },

  // Whiskeys
  {
    id: "jameson",
    name: "Jameson Irish Whiskey",
    type: "Whiskey",
    typeColor: "#8a4f16",
    image: require("./assets/drinks/catalog/jameson.png"),
    rating: 4.4,
    tags: ["Smooth", "Vanilla", "Spiced"],
    origin: "Ireland",
    brand: "Jameson",
    description:
      "Triple-distilled Irish whiskey with orchard fruit, vanilla and a gentle spicy finish.",
    totalReviews: 147,
    review: {
      user: "Mark Kelly",
      rating: 4.5,
      text: "Soft vanilla and apple with a gentle pepper note at the end. Approachable neat and still distinctive in a highball.",
      tags: ["Smooth", "Vanilla"],
      date: "19 Jun 2026",
      likes: 27,
      comments: 6,
    },
  },
  {
    id: "glenfiddich-12",
    name: "Glenfiddich 12",
    type: "Whiskey",
    typeColor: "#8a4f16",
    image: require("./assets/drinks/catalog/glenfiddich-12.png"),
    rating: 4.5,
    tags: ["Pear", "Oaky", "Fresh"],
    origin: "Scotland",
    brand: "Glenfiddich",
    description:
      "Speyside single malt showing fresh pear, light oak and a clean, gently malty finish.",
    totalReviews: 101,
    review: {
      user: "James Kent",
      rating: 4.5,
      text: "Fresh pear and cereal sweetness make the opening very friendly. Light oak and malt appear on the clean finish.",
      tags: ["Pear", "Oaky"],
      date: "18 Jun 2026",
      likes: 19,
      comments: 4,
    },
  },
  {
    id: "makers-mark",
    name: "Maker's Mark",
    type: "Whiskey",
    typeColor: "#8a4f16",
    image: require("./assets/drinks/catalog/makers-mark.png"),
    rating: 4.5,
    tags: ["Caramel", "Vanilla", "Warming"],
    origin: "United States",
    brand: "Maker's Mark",
    description:
      "Wheated Kentucky bourbon with caramel, vanilla, sweet oak and a rounded warming finish.",
    totalReviews: 113,
    review: {
      user: "Liam Harper",
      rating: 4.5,
      text: "Caramel and vanilla are generous, but the soft wheat character keeps the heat rounded. Excellent in an Old Fashioned.",
      tags: ["Caramel", "Warming"],
      date: "17 Jun 2026",
      likes: 22,
      comments: 5,
    },
  },
  {
    id: "nikka-from-the-barrel",
    name: "Nikka From the Barrel",
    type: "Whiskey",
    typeColor: "#8a4f16",
    image: require("./assets/drinks/catalog/nikka-from-the-barrel.png"),
    rating: 4.8,
    tags: ["Rich", "Spiced", "Orange"],
    origin: "Japan",
    brand: "Nikka",
    description:
      "A concentrated Japanese blend with orange peel, baking spice, oak and a powerful silky body.",
    totalReviews: 76,
    review: {
      user: "Liddy Powell",
      rating: 5,
      text: "Concentrated orange peel, clove and polished oak. Powerful, but a few drops of water reveal a wonderfully silky texture.",
      tags: ["Rich", "Spiced"],
      date: "16 Jun 2026",
      likes: 34,
      comments: 9,
    },
  },
  {
    id: "redbreast-12",
    name: "Redbreast 12",
    type: "Whiskey",
    typeColor: "#8a4f16",
    image: require("./assets/drinks/catalog/redbreast-12.png"),
    rating: 4.9,
    tags: ["Dried Fruit", "Nutty", "Creamy"],
    origin: "Ireland",
    brand: "Redbreast",
    description:
      "Single pot still Irish whiskey layered with dried fruit, toasted nuts and creamy spice.",
    totalReviews: 84,
    review: {
      user: "Mark Kelly",
      rating: 5,
      text: "Dried fruit, toasted nuts and creamy spice arrive in layers. Rich without heaviness and exceptionally long on the finish.",
      tags: ["Dried Fruit", "Creamy"],
      date: "15 Jun 2026",
      likes: 38,
      comments: 10,
    },
  },

  // Other drinks
  {
    id: "ginger-lemon-kombucha",
    name: "Ginger Lemon Kombucha",
    type: "Kombucha",
    typeColor: "#116d65",
    image: require("./assets/drinks/catalog/ginger-lemon-kombucha.png"),
    rating: 4.2,
    tags: ["Tangy", "Ginger", "Fizzy"],
    origin: "United States",
    brand: "Wild Culture",
    description:
      "Fermented tea sharpened with fresh ginger and lemon for a tangy, naturally sparkling drink.",
    totalReviews: 62,
    review: {
      user: "Sarah James",
      rating: 4,
      text: "A lively fermented tang followed by lemon and a real ginger prickle. Dry enough to stay refreshing rather than juice-like.",
      tags: ["Tangy", "Ginger"],
      date: "14 Jun 2026",
      likes: 15,
      comments: 3,
    },
  },
  {
    id: "mango-lassi",
    name: "Mango Lassi",
    type: "Yogurt Drink",
    typeColor: "#116d65",
    image: require("./assets/drinks/catalog/mango-lassi.png"),
    rating: 4.6,
    tags: ["Mango", "Creamy", "Sweet"],
    origin: "India",
    brand: "House Lassi",
    description:
      "Ripe mango blended with yogurt and a touch of cardamom into a cool, creamy drink.",
    totalReviews: 91,
    review: {
      user: "Gabby Romero",
      rating: 4.5,
      text: "Ripe mango, tangy yogurt and just a whisper of cardamom. Thick and creamy, but still fresh enough beside spicy food.",
      tags: ["Mango", "Creamy"],
      date: "13 Jun 2026",
      likes: 24,
      comments: 6,
    },
  },
  {
    id: "sparkling-mineral-water",
    name: "Sparkling Mineral Water",
    type: "Water",
    typeColor: "#116d65",
    image: require("./assets/drinks/catalog/sparkling-mineral-water.png"),
    rating: 4,
    tags: ["Mineral", "Crisp", "Fizzy"],
    origin: "Italy",
    brand: "Alpine Spring",
    description:
      "Naturally mineral-rich water with fine persistent bubbles and a clean, dry finish.",
    totalReviews: 45,
    review: {
      user: "James Kent",
      rating: 4,
      text: "Fine bubbles, a subtle mineral bite and absolutely no sweetness. A simple drink, but especially good with a big meal.",
      tags: ["Mineral", "Crisp"],
      date: "12 Jun 2026",
      likes: 10,
      comments: 2,
    },
  },
  {
    id: "horchata",
    name: "Horchata",
    type: "Rice Drink",
    typeColor: "#116d65",
    image: require("./assets/drinks/catalog/horchata.png"),
    rating: 4.4,
    tags: ["Cinnamon", "Creamy", "Sweet"],
    origin: "Mexico",
    brand: "Casa Fresca",
    description:
      "A chilled rice drink infused with cinnamon and vanilla for a softly creamy refreshment.",
    totalReviews: 59,
    review: {
      user: "Liddy Powell",
      rating: 4.5,
      text: "Soft rice creaminess with cinnamon and vanilla. Sweet, cooling and surprisingly light when it is served very cold.",
      tags: ["Cinnamon", "Creamy"],
      date: "11 Jun 2026",
      likes: 18,
      comments: 4,
    },
  },
  {
    id: "ginger-beer",
    name: "Craft Ginger Beer",
    type: "Ginger Beer",
    typeColor: "#116d65",
    image: require("./assets/drinks/catalog/ginger-beer.png"),
    rating: 4.3,
    tags: ["Ginger", "Spicy", "Fizzy"],
    origin: "United Kingdom",
    brand: "Fever Orchard",
    description:
      "A non-alcoholic brewed ginger drink with citrus lift and a lingering spicy kick.",
    totalReviews: 71,
    review: {
      user: "Liam Harper",
      rating: 4.5,
      text: "Real ginger heat builds after the first sip, backed by lively bubbles and a squeeze of citrus. Excellent on its own.",
      tags: ["Ginger", "Spicy"],
      date: "10 Jun 2026",
      likes: 20,
      comments: 5,
    },
  },
];

const drinks: Drink[] = [
  ...coreDrinks,
  ...additionalDrinkSeeds.map(({ totalReviews, review, ...drink }) => drink),
];

const exploreOrder = [
  "sprite",
  "coke",
  "heineken",
  "pilsner",
  "margarita",
  "hophouse",
  "guinness",
  "petrus",
  "birra",
  "sevenup",
  "cosmo",
  "espresso",
  "rose",
  "cortado",
  "matcha",
  ...additionalDrinkSeeds.map((drink) => drink.id),
];
const exploreDrinks = exploreOrder
  .map((id) => drinks.find((drink) => drink.id === id))
  .filter((drink): drink is Drink => Boolean(drink));

const coreReviews: Review[] = [
  {
    id: "r1",
    drinkId: "aperol",
    user: "Gabby Romero",
    avatar: require("./assets/people/gabby.png"),
    rating: 5,
    text: "The light and effervescent combination of orange flavored bittersweet liqueur, sparkling wine, and club soda is a sunset in a cup.",
    tags: ["Citrus", "Refreshing"],
    date: "20 Jun 2026",
    likes: 8,
    comments: 2,
  },
  {
    id: "r2",
    drinkId: "aperol",
    user: "Liam Harper",
    avatar: require("./assets/people/liam.png"),
    rating: 4,
    text: "Ordered it because everyone else was drinking one. Stayed for the bittersweet orange kick and ended up ordering a second.",
    tags: ["Zesty", "Invigorating"],
    date: "3 May 2026",
    likes: 6,
    comments: 7,
  },
  {
    id: "r3",
    drinkId: "birra",
    user: "Mark Kelly",
    avatar: require("./assets/people/mark.png"),
    rating: 5,
    text: "Unlike Heineken, it has good texture. On a good day I could get drunk with just one pint of it.",
    tags: ["Crisp"],
    date: "15 Jun 2026",
    likes: 3,
    comments: 1,
  },
  {
    id: "r4",
    drinkId: "sprite",
    user: "Sarah James",
    avatar: require("./assets/people/sarah.png"),
    rating: 4,
    text: "Cold, bright and properly fizzy. The lemon-lime finish is simple, but it always does the job with salty food.",
    tags: ["Refreshing", "Fizzy"],
    date: "18 Jun 2026",
    likes: 12,
    comments: 3,
  },
  {
    id: "r5",
    drinkId: "coke",
    user: "James Kent",
    avatar: require("./assets/people/james.png"),
    rating: 4,
    text: "Classic caramel sweetness with a lively sparkle. Best poured over plenty of ice with a slice of lemon.",
    tags: ["Sweet", "Fizzy"],
    date: "17 Jun 2026",
    likes: 9,
    comments: 2,
  },
  {
    id: "r6",
    drinkId: "heineken",
    user: "Jaques Dane",
    avatar: require("./assets/people/jaques.png"),
    rating: 4,
    text: "Clean and crisp with a gentle herbal bitterness. A dependable lager when it is served properly cold.",
    tags: ["Crisp", "Mild"],
    date: "16 Jun 2026",
    likes: 7,
    comments: 4,
  },
  {
    id: "r7",
    drinkId: "pilsner",
    user: "James Kent",
    avatar: require("./assets/people/james.png"),
    rating: 4.5,
    text: "Floral hops, a firm bitter edge and a soft bready middle. It tastes balanced all the way through the finish.",
    tags: ["Crisp", "Bitter"],
    date: "15 Jun 2026",
    likes: 18,
    comments: 6,
  },
  {
    id: "r8",
    drinkId: "margarita",
    user: "Gabby Romero",
    avatar: require("./assets/people/gabby.png"),
    rating: 4.5,
    text: "Sharp fresh lime, a warm tequila note and just enough orange sweetness. The salt rim makes every sip pop.",
    tags: ["Citrusy", "Tangy"],
    date: "14 Jun 2026",
    likes: 21,
    comments: 5,
  },
  {
    id: "r9",
    drinkId: "hophouse",
    user: "Liam Harper",
    avatar: require("./assets/people/liam.png"),
    rating: 4.5,
    text: "Aromatic without becoming heavy. There is a pleasant hop bite, followed by a smooth and easy lager finish.",
    tags: ["Mild", "Bitter"],
    date: "12 Jun 2026",
    likes: 11,
    comments: 2,
  },
  {
    id: "r10",
    drinkId: "guinness",
    user: "Liddy Powell",
    avatar: require("./assets/people/liddy.png"),
    rating: 5,
    text: "Velvety texture, roasted malt and a dry finish. The creamy head makes it feel richer than it actually drinks.",
    tags: ["Creamy", "Roasted"],
    date: "10 Jun 2026",
    likes: 24,
    comments: 8,
  },
  {
    id: "r11",
    drinkId: "petrus",
    user: "Gabby Romero",
    avatar: require("./assets/people/gabby.png"),
    rating: 5,
    text: "Deep plum and dark cherry with a wonderfully silky texture. The finish is long, layered and quietly powerful.",
    tags: ["Rich", "Dry"],
    date: "8 Jun 2026",
    likes: 31,
    comments: 9,
  },
  {
    id: "r12",
    drinkId: "sevenup",
    user: "Sarah James",
    avatar: require("./assets/people/sarah.png"),
    rating: 3.5,
    text: "Light lemon and lime with plenty of bubbles. Sweeter than I remembered, but very refreshing straight from the fridge.",
    tags: ["Citrus", "Fizzy"],
    date: "7 Jun 2026",
    likes: 6,
    comments: 1,
  },
  {
    id: "r13",
    drinkId: "cosmo",
    user: "Gabby Romero",
    avatar: require("./assets/people/gabby.png"),
    rating: 4,
    text: "Tart cranberry and citrus up front, then a clean vodka finish. Bright, elegant and not overly sweet.",
    tags: ["Tarty", "Fruity"],
    date: "5 Jun 2026",
    likes: 14,
    comments: 4,
  },
  {
    id: "r14",
    drinkId: "espresso",
    user: "Liddy Powell",
    avatar: require("./assets/people/liddy.png"),
    rating: 5,
    text: "Bold espresso aroma with a smooth, lightly sweet finish. Strong enough to wake you up and polished enough for dessert.",
    tags: ["Strong", "Coffee"],
    date: "3 Jun 2026",
    likes: 27,
    comments: 7,
  },
  {
    id: "r15",
    drinkId: "rose",
    user: "Sarah James",
    avatar: require("./assets/people/sarah.png"),
    rating: 4.5,
    text: "Delicate strawberry and peach notes with a dry mineral finish. Light, floral and made for a sunny table.",
    tags: ["Dry", "Floral"],
    date: "1 Jun 2026",
    likes: 16,
    comments: 3,
  },
  {
    id: "r16",
    drinkId: "cortado",
    user: "Liam Harper",
    avatar: require("./assets/people/liam.png"),
    rating: 4.5,
    text: "The milk softens the espresso without hiding it. Compact, creamy and strong with a lovely roasted finish.",
    tags: ["Creamy", "Strong"],
    date: "30 May 2026",
    likes: 13,
    comments: 2,
  },
  {
    id: "r17",
    drinkId: "matcha",
    user: "Sarah James",
    avatar: require("./assets/people/sarah.png"),
    rating: 4.5,
    text: "Earthy matcha balanced by a soft white-chocolate sweetness. Creamy and comforting without losing the tea flavour.",
    tags: ["Creamy", "Sweet"],
    date: "28 May 2026",
    likes: 19,
    comments: 5,
  },
  {
    id: "r18",
    drinkId: "sprite",
    user: "Liam Harper",
    avatar: require("./assets/people/liam.png"),
    rating: 3.5,
    text: "Very clean citrus flavour and a sharp burst of carbonation. A little sweet, though still easy to drink.",
    tags: ["Citrus", "Refreshing"],
    date: "26 May 2026",
    likes: 5,
    comments: 1,
  },
];

const additionalReviews: Review[] = additionalDrinkSeeds.map(
  (drink, index) => ({
    id: `catalog-review-${index + 1}`,
    drinkId: drink.id,
    avatar: reviewAuthors[drink.review.user],
    ...drink.review,
  }),
);

const initialReviews: Review[] = [...coreReviews, ...additionalReviews];

const commentVoices = [
  {
    user: "Sarah James",
    avatar: require("./assets/people/sarah.png"),
    text: "That finish is exactly what stood out to me too.",
  },
  {
    user: "James Kent",
    avatar: require("./assets/people/james.png"),
    text: "Adding this one to my list for the weekend.",
  },
  {
    user: "Liddy Powell",
    avatar: require("./assets/people/liddy.png"),
    text: "Great description — I had the same flavour notes.",
  },
  {
    user: "Gabby Romero",
    avatar: require("./assets/people/gabby.png"),
    text: "It is even better properly chilled.",
  },
];

const initialCommentThreads: Record<string, ReviewComment[]> =
  Object.fromEntries(
    initialReviews.map((review) => [
      review.id,
      Array.from({ length: review.comments }, (_, index) => {
        const voice = commentVoices[index % commentVoices.length];
        return {
          id: `${review.id}-comment-${index + 1}`,
          user: voice.user,
          avatar: voice.avatar,
          text: voice.text,
          date: index === 0 ? "Today" : `${index + 1}d`,
        };
      }),
    ]),
  );

function mergeSeedCommentThreads(
  storedThreads?: Record<string, ReviewComment[]>,
) {
  const normalizedStoredThreads = Object.fromEntries(
    Object.entries(storedThreads || {}).map(([reviewId, comments]) => [
      reviewId,
      (comments || []).map((comment, index) => ({
        ...comment,
        avatar:
          reviewAuthors[comment.user] ||
          initialCommentThreads[reviewId]?.[index]?.avatar ||
          require("./assets/people/mark.png"),
      })),
    ]),
  );
  return { ...initialCommentThreads, ...normalizedStoredThreads };
}

const reviewTotals: Record<string, number> = {
  aperol: 56,
  sprite: 84,
  coke: 127,
  heineken: 93,
  pilsner: 68,
  margarita: 72,
  hophouse: 49,
  guinness: 141,
  petrus: 38,
  birra: 61,
  sevenup: 43,
  cosmo: 76,
  espresso: 109,
  rose: 64,
  cortado: 52,
  matcha: 47,
  ...Object.fromEntries(
    additionalDrinkSeeds.map((drink) => [drink.id, drink.totalReviews]),
  ),
};

function mergeSeedReviews(storedReviews?: Review[]) {
  const stored = storedReviews || [];
  const storedById = new Map(stored.map((review) => [review.id, review]));
  const seedIds = new Set(initialReviews.map((review) => review.id));
  return [
    ...initialReviews.map((review) => {
      const storedReview = storedById.get(review.id);
      const mergedReview = storedReview
        ? { ...review, ...storedReview }
        : review;
      return {
        ...mergedReview,
        avatar: reviewAuthors[mergedReview.user] || review.avatar,
      };
    }),
    ...stored
      .filter((review) => !seedIds.has(review.id))
      .map((review) => ({
        ...review,
        avatar:
          reviewAuthors[review.user] ||
          review.avatar ||
          require("./assets/people/mark.png"),
      })),
  ];
}

const searchableProfiles: SearchProfile[] = [
  {
    id: "mark",
    name: "Mark Kelly",
    handle: "@markelly1",
    memberSince: "Jun 2026",
    buddies: 184,
    avatar: require("./assets/people/mark.png"),
  },
  {
    id: "gabby",
    name: "Gabby Romero",
    handle: "@gabbyromero",
    memberSince: "Mar 2026",
    buddies: 326,
    avatar: require("./assets/people/gabby.png"),
  },
  {
    id: "liam",
    name: "Liam Harper",
    handle: "@liamharper",
    memberSince: "Apr 2026",
    buddies: 211,
    avatar: require("./assets/people/liam.png"),
  },
  {
    id: "sarah",
    name: "Sarah James",
    handle: "@sarahsips",
    memberSince: "May 2026",
    buddies: 409,
    avatar: require("./assets/people/sarah.png"),
  },
  {
    id: "liddy",
    name: "Liddy Powell",
    handle: "@liddysips",
    memberSince: "Feb 2026",
    buddies: 287,
    avatar: require("./assets/people/liddy.png"),
  },
  {
    id: "jaques",
    name: "Jaques Dane",
    handle: "@jaquesdrinks",
    memberSince: "Jan 2026",
    buddies: 152,
    avatar: require("./assets/people/jaques.png"),
  },
  {
    id: "james",
    name: "James Kent",
    handle: "@jameskent",
    memberSince: "May 2026",
    buddies: 238,
    avatar: require("./assets/people/james.png"),
  },
];

const glass = {
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
          width="42"
          height="42"
          patternUnits="userSpaceOnUse"
        >
          <Path d={BACKGROUND_NOISE_MINT} fill="#04b264" opacity={0.2} />
          <Path d={BACKGROUND_NOISE_LIGHT} fill="#fff" opacity={0.78} />
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
      <StatusBar style="dark" />
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
      <DeviceStatusBar />
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
  return (
    <View style={s.drinkCardSurface}>
      <GlassLayers
        radius={16}
        intensity={15}
        colors={["rgba(255,255,255,.5)", "rgba(255,255,255,.08)"]}
      />
      <DrinkCardGlow />
      <View style={s.drinkImageFrame}>
        <Image
          source={drink.image}
          style={[s.drinkImage, drink.id === "sprite" && s.spriteExploreImage]}
          resizeMode="contain"
        />
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
          <Image
            source={drink.image}
            style={s.friendCompactImage}
            resizeMode="contain"
          />
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
  const { width } = useWindowDimensions();
  if (Platform.OS === "web") return <>{children}</>;

  const scale = Math.min(1, width / FIGMA_FRAME_WIDTH);
  const scaledWidth = FIGMA_FRAME_WIDTH * scale;
  const scaledHeight = FIGMA_FRAME_HEIGHT * scale;

  return (
    <View style={s.nativeViewport}>
      <View
        style={[
          s.nativeFrame,
          {
            width: scaledWidth,
            height: scaledHeight,
          },
        ]}
      >
        <View
          style={[
            s.nativeCanvas,
            {
              left: -(FIGMA_FRAME_WIDTH * (1 - scale)) / 2,
              top: -(FIGMA_FRAME_HEIGHT * (1 - scale)) / 2,
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

function Onboarding({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountMode, setAccountMode] = useState<"social" | "email" | "create">(
    "social",
  );
  const finishEmail = () => {
    if (!email.trim() || !email.includes("@"))
      return Alert.alert("Valid email required");
    if (accountMode === "create" && !name.trim())
      return Alert.alert("Name required");
    onDone(name.trim() || email.split("@")[0] || "Saturated User");
  };
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.modalWrap}>
        <View style={s.onboard}>
          <View style={s.handle} />
          <Text style={s.onboardTitle}>Welcome to Saturated</Text>
          <Text style={s.onboardAge}>You must be 21+ to continue</Text>
          <Text style={s.onboardCopy}>
            Your age will be verified from the date-of-birth information linked
            to your Google or Apple account. Saturated never displays it.
          </Text>
          {accountMode === "social" ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                style={s.socialButton}
                onPress={() => onDone("Mark Kelly")}
              >
                <Globe size={20} color="#4285f4" />
                <Text style={s.socialButtonText}>Continue with Google</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                style={[s.socialButton, s.socialButtonDark]}
                onPress={() => onDone("Mark Kelly")}
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
                onPress={() => setAccountMode("email")}
              >
                <Mail size={20} color={C.teal} />
                <Text style={s.socialButtonText}>Continue with email</Text>
              </Pressable>
            </>
          ) : (
            <>
              {accountMode === "create" && (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(32,26,27,.45)"
                  style={s.input}
                />
              )}
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
              <Pressable
                style={[s.primary, s.onboardControl]}
                accessibilityRole="button"
                accessibilityLabel={
                  accountMode === "create" ? "Create account" : "Sign in"
                }
                onPress={finishEmail}
              >
                <Text style={s.primaryText}>
                  {accountMode === "create" ? "Create account" : "Sign in"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to sign in options"
                onPress={() => setAccountMode("social")}
                style={s.textButton}
              >
                <Text style={s.textButtonText}>Back to sign in options</Text>
              </Pressable>
            </>
          )}
          {accountMode !== "create" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              style={s.createAccountButton}
              onPress={() => setAccountMode("create")}
            >
              <UserPlus size={18} color={C.red} />
              <Text style={s.createAccountText}>Create an account</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Splash() {
  return (
    <View style={s.splash}>
      <StatusBar style="light" />
      <Image
        source={require("./assets/splash.png")}
        style={s.splashImage}
        resizeMode="cover"
      />
      <View style={s.splashShade} />
      <DeviceStatusBar light />
      <Text style={s.splashTitle}>Saturated</Text>
    </View>
  );
}

function Explore({
  onOpen,
  onToggle,
  onGo,
}: {
  onOpen: (d: Drink) => void;
  onToggle: (id: string) => void;
  onGo: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState("All");
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
  const shown = exploreDrinks.filter((drink) =>
    filter === "All" ? true : drinkCategory(drink) === filter,
  );
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
        data={shown}
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
      />
      <BottomNav active="explore" onGo={onGo} />
    </Background>
  );
}

function SearchScreen({
  saved,
  onBack,
  onOpen,
  onOpenProfile,
  onToggle,
  onRequest,
}: {
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
  const profileResults = searchableProfiles.filter(
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
              <Image source={item.avatar} style={s.profileSearchAvatar} />
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
  onSubmit: (name: string) => void;
}) {
  const [drinkName, setDrinkName] = useState(initialName);
  const [submitted, setSubmitted] = useState(false);
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
              disabled={!validName}
              style={[
                s.primary,
                s.requestSubmit,
                !validName && s.disabledButton,
              ]}
              onPress={() => {
                onSubmit(validName);
                setSubmitted(true);
              }}
            >
              <Text style={s.primaryText}>Submit request</Text>
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
                  {d.tags.map((t) => (
                    <Pill key={t} color="#960000">
                      {t}
                    </Pill>
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
              <Image
                source={review.avatar}
                style={s.avatar}
                resizeMode="cover"
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
                  <Image
                    source={review.avatar}
                    style={s.reviewDetailAvatar}
                    resizeMode="cover"
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
                <Image
                  source={item.avatar}
                  style={s.commentAvatar}
                  resizeMode="cover"
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
  const totalReviews = reviewTotals[drink.id] || mine.length;
  const popularTags = Object.entries(
    mine
      .flatMap((review) => review.tags)
      .reduce<Record<string, number>>(
        (counts, tag) => ({ ...counts, [tag]: (counts[tag] || 0) + 1 }),
        {},
      ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag]) => tag);
  const commonUserTags = popularTags.length ? popularTags : drink.tags;
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
        <View style={s.commonTagsSection}>
          <Text style={s.cardTitle}>Common user flavour tags</Text>
          <Text style={s.commonTagsText}>{commonUserTags.join("  ·  ")}</Text>
        </View>
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
  onSubmit: (r: number, t: string, tags: string[]) => void;
}) {
  const isEditing = Boolean(existingReview);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [text, setText] = useState(existingReview?.text || "");
  const [tags, setTags] = useState<string[]>(existingReview?.tags || []);
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
            <View>
              <Text style={s.detailTitle}>{drink.name}</Text>
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
            onPress={() => {
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
              onSubmit(rating, text.trim(), tags);
            }}
          >
            <Text style={s.primaryText}>{isEditing ? "Save" : "Submit"}</Text>
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
  reviews,
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
  reviews: Review[];
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
  const profileAvatar = profile?.avatar || require("./assets/people/mark.png");
  const memberSince = profile?.memberSince || "Jun 2026";
  const my = reviews.filter(
    (r) => r.user === profileName || (isOwn && r.user === "Mark Kelly"),
  );
  const earned = Math.min(9, Math.max(2, my.length + 1));
  const earnedIndices = new Set([0, 4, 1, 2, 3, 5, 6, 7, 8].slice(0, earned));
  const avg = my.length ? my.reduce((a, b) => a + b.rating, 0) / my.length : 0;
  const buddyCount = isOwn
    ? searchableProfiles.find((item) => item.id === "mark")?.buddies || 0
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
        <Image source={profileAvatar} style={s.profileAvatar} />
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
      <View style={[s.inline, { marginHorizontal: 32 }]}>
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
          contentContainerStyle={{ paddingBottom: 125 }}
        >
          <View style={[s.progressCard, glass]}>
            <ProgressRing value={earned / 9} />
            <View>
              <Text style={s.cardTitle}>{earned} of 9 badges unlocked</Text>
              <Text style={s.reviewText}>Try more drinks to earn badges</Text>
            </View>
          </View>
          <View style={s.badges}>
            {badgeNames.map((badgeName, index) => {
              const earnedBadge = earnedIndices.has(index);
              const exactArtwork =
                index === 0
                  ? require("./assets/badges/first-sip.png")
                  : index === 4
                    ? require("./assets/badges/pint-master.png")
                    : null;
              return (
                <View
                  key={badgeName}
                  style={[s.badgeItem, !earnedBadge && s.badgeLocked]}
                >
                  {earnedBadge && exactArtwork ? (
                    <Image
                      source={exactArtwork}
                      accessibilityLabel={badgeName}
                      style={
                        index === 4 ? s.badgeCompositeTall : s.badgeComposite
                      }
                      resizeMode="contain"
                    />
                  ) : (
                    <>
                      <BadgeCap earned={earnedBadge} />
                      <Text style={[s.tiny, s.badgeLabel]}>{badgeName}</Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={s.screenScroll}
          contentContainerStyle={{ paddingBottom: 125 }}
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
          <Text
            style={[s.cardTitle, { marginHorizontal: 32, marginVertical: 12 }]}
          >
            {isOwn ? "Your Receipt" : `${profileName.split(" ")[0]}'s Reviews`}
          </Text>
          <View style={s.receiptWrap}>
            <ReceiptZigzag />
            <View style={s.receipt}>
              {isOwn && (
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
              <View style={[s.inline, { justifyContent: "space-between" }]}>
                <Text style={s.tiny}>QTY ITEM</Text>
                <Text style={s.tiny}>RATING</Text>
              </View>
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
  username,
  email,
  requestCount,
  reviewCount,
  savedCount,
  onBack,
  onRequest,
  onSaveAccount,
  onDeleteAccount,
  onLogout,
  initialSection = "menu",
}: {
  name: string;
  username: string;
  email: string;
  requestCount: number;
  reviewCount: number;
  savedCount: number;
  onBack: () => void;
  onRequest: () => void;
  onSaveAccount: (details: {
    name: string;
    username: string;
    email: string;
  }) => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
  initialSection?: "menu" | "account";
}) {
  const [section, setSection] = useState<"menu" | "account" | "gdpr" | "about">(
    initialSection,
  );
  const [draftName, setDraftName] = useState(name);
  const [draftUsername, setDraftUsername] = useState(username);
  const [draftEmail, setDraftEmail] = useState(email);
  const [logoutVisible, setLogoutVisible] = useState(false);

  if (section !== "menu") {
    const title =
      section === "account"
        ? "Account Details"
        : section === "gdpr"
          ? "Privacy & Data"
          : "About Saturated";
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
                <Text style={s.settingsVerifiedText}>✓ 21+ age verified</Text>
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
                  onSaveAccount({
                    name: draftName.trim(),
                    username: normalizedUsername,
                    email: draftEmail.trim(),
                  });
                  Alert.alert(
                    "Account updated",
                    "Your profile details were saved.",
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
                    "This removes the local profile, reviews, lists and settings from this device.",
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
                <Text style={s.settingsDeleteText}>Delete account data</Text>
              </Pressable>
            </View>
          )}

          {section === "about" && (
            <View style={[s.settingsDetailCard, glass]}>
              <Text style={s.settingsAboutLogo}>Saturated</Text>
              <Text style={s.settingsDetailCopy}>
                Discover beverages, track what you have tried, share thoughtful
                reviews and see what your buddies are drinking.
              </Text>
              <View style={s.settingsDataSummary}>
                <Text style={s.body}>Version 1.0.0</Text>
                <Text style={s.body}>iOS and Android</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Saturated project website"
                onPress={() =>
                  Linking.openURL(
                    "https://github.com/suppixie/Saturated-Original",
                  )
                }
                style={s.settingsSecondaryButton}
              >
                <Globe size={16} color={C.teal} />
                <Text style={s.settingsSecondaryText}>Project website</Text>
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
          <Image
            source={require("./assets/people/mark.png")}
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
          <SettingsOption
            icon={<Info size={20} color={C.teal} />}
            title="About the app"
            subtitle="Learn about Saturated and this version"
            onPress={() => setSection("about")}
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
            subtitle="Follow Saturated on social media"
            onPress={() =>
              Linking.openURL("https://www.instagram.com/").catch(() =>
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
  avatar: ImageSourcePropType;
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
  onBack,
  onOpen,
  onOpenProfile,
  onOpenReview,
}: {
  onBack: () => void;
  onOpen: (drink: Drink) => void;
  onOpenProfile: (profile: SearchProfile) => void;
  onOpenReview: (review: Review) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleFriends = showAll
    ? [
        ...feedFriendCards,
        ...exploreDrinks.slice(5, 10).map((drink) => ({
          drinkId: drink.id,
          source: drink.image,
          count: "3",
        })),
      ]
    : feedFriendCards;
  const drinkById = (id: string) =>
    drinks.find((drink) => drink.id === id) || drinks[0];

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
              {index < 5 ? (
                <Image
                  source={friend.source}
                  style={s.friendComposite}
                  resizeMode="contain"
                />
              ) : (
                <CompactFeedDrinkCard drink={drinkById(friend.drinkId)} />
              )}
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
        {feedActivity.map((activity, index) => (
          <View key={`${activity.name}-${index}`}>
            {!!activity.group && (
              <Text style={s.activityGroup}>{activity.group}</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${activity.name} ${activity.message}`}
              onPress={() => {
                if (activity.reviewId) {
                  const reviewToOpen = initialReviews.find(
                    (item) => item.id === activity.reviewId,
                  );
                  if (reviewToOpen) onOpenReview(reviewToOpen);
                  return;
                }
                if (activity.target === "profile" && activity.profileId) {
                  const profile = searchableProfiles.find(
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
              <Image
                source={activity.avatar}
                style={s.activityAvatar}
                resizeMode="cover"
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
  const [name, setName] = useState("Mark Kelly");
  const [username, setUsername] = useState("@markelly1");
  const [email, setEmail] = useState("mark@example.com");
  const [saved, setSaved] = useState(["aperol", "sprite", "hophouse"]);
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
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const x = raw ? JSON.parse(raw) : null;
        if (x?.onboarded) {
          setOnboarded(true);
          setName(x.name || "Mark Kelly");
          setUsername(x.username || "@markelly1");
          setEmail(x.email || "mark@example.com");
          setSaved(x.saved || []);
          setReviews(mergeSeedReviews(x.reviews));
          setLikedReviews(x.likedReviews || []);
          setCommentThreads(mergeSeedCommentThreads(x.commentThreads));
          setRequests(x.requests || []);
          setFollowedProfiles(x.followedProfiles || []);
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
  }, []);
  useEffect(() => {
    if (!ready) return;
    setReviews((current) => {
      const merged = mergeSeedReviews(current);
      return merged.length === current.length &&
        merged.every((review, index) => review === current[index])
        ? current
        : merged;
    });
  }, [ready]);
  useEffect(() => {
    if (ready)
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
    const matchingProfile = searchableProfiles.find(
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
    const drinkToEdit = drinks.find(
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
      drinks.find((drink) => drink.id === reviewToOpen.drinkId) || drinks[0],
    );
    setScreen("reviewDetail");
  };
  const requestDrink = (returnScreen: Screen, initialName = "") => {
    setRequestReturn(returnScreen);
    setRequestDraft(initialName);
    setScreen("request");
  };
  const toggle = (id: string) =>
    setSaved((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const like = (id: string) =>
    setLikedReviews((current) => {
      const alreadyLiked = current.includes(id);
      setReviews((allReviews) =>
        allReviews.map((item) =>
          item.id === id
            ? {
                ...item,
                likes: Math.max(0, item.likes + (alreadyLiked ? -1 : 1)),
              }
            : item,
        ),
      );
      return alreadyLiked
        ? current.filter((reviewId) => reviewId !== id)
        : [...current, id];
    });
  const addComment = (reviewId: string, text: string) => {
    const newComment: ReviewComment = {
      id: `${reviewId}-${Date.now()}`,
      user: name || "Mark Kelly",
      avatar: require("./assets/people/mark.png"),
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
    reviews.find((item) => item.id === selectedReviewId) || reviews[0];
  const reviewBeingEdited = editingReviewId
    ? reviews.find((item) => item.id === editingReviewId)
    : undefined;
  let body: React.ReactNode;
  if (screen === "splash") body = <Splash />;
  else if (screen === "explore")
    body = <Explore onOpen={open} onToggle={toggle} onGo={go} />;
  else if (screen === "search")
    body = (
      <SearchScreen
        saved={saved}
        onBack={() => go(searchReturn)}
        onOpen={open}
        onOpenProfile={openProfile}
        onToggle={toggle}
        onRequest={(drinkName) => requestDrink("search", drinkName)}
      />
    );
  else if (screen === "request")
    body = (
      <RequestDrinkScreen
        initialName={requestDraft}
        onBack={() => setScreen(requestReturn)}
        onSubmit={(drinkName) =>
          setRequests((current) =>
            current.some(
              (request) => request.toLowerCase() === drinkName.toLowerCase(),
            )
              ? current
              : [...current, drinkName],
          )
        }
      />
    );
  else if (screen === "drinklist")
    body = (
      <Drinklist
        items={drinks.filter((d) => saved.includes(d.id))}
        onRemove={toggle}
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
        onToggle={() => toggle(selected.id)}
        onLike={like}
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
          drinks.find((drink) => drink.id === selectedReview.drinkId) ||
          drinks[0]
        }
        liked={likedReviews.includes(selectedReview.id)}
        comments={commentThreads[selectedReview.id] || []}
        onBack={() => setScreen(reviewDetailReturn)}
        onLike={() => like(selectedReview.id)}
        onAddComment={(text) => addComment(selectedReview.id, text)}
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
        onSubmit={(rating, text, tags) => {
          if (editingReviewId && reviewBeingEdited) {
            setReviews((current) =>
              current.map((item) =>
                item.id === editingReviewId
                  ? { ...item, rating, text, tags }
                  : item,
              ),
            );
            setEditingReviewId(null);
            setScreen(reviewReturn);
            return;
          }
          setReviews((x) => [
            {
              id: Date.now().toString(),
              drinkId: selected.id,
              user: name,
              avatar: require("./assets/people/mark.png"),
              rating,
              text,
              tags,
              date: new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              likes: 0,
              comments: 0,
            },
            ...x,
          ]);
          setSaved((x) => x.filter((id) => id !== selected.id));
          setEditingReviewId(null);
          go("drink");
        }}
      />
    );
  else if (screen === "profile")
    body = (
      <Profile
        name={name}
        username={username}
        reviews={reviews}
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
        reviews={reviews}
        badgeTab={badgeTab}
        setBadgeTab={setBadgeTab}
        followed={followedProfiles.includes(selectedProfile.id)}
        onToggleFollow={() =>
          setFollowedProfiles((current) =>
            current.includes(selectedProfile.id)
              ? current.filter((id) => id !== selectedProfile.id)
              : [...current, selectedProfile.id],
          )
        }
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
        username={username}
        email={email}
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
        onSaveAccount={(details) => {
          setName(details.name);
          setUsername(details.username);
          setEmail(details.email);
        }}
        onDeleteAccount={() => {
          void supabase?.auth.signOut();
          AsyncStorage.removeItem(STORAGE_KEY).finally(() => {
            setName("Mark Kelly");
            setUsername("@markelly1");
            setEmail("mark@example.com");
            setSaved([]);
            setReviews(initialReviews);
            setLikedReviews([]);
            setCommentThreads(initialCommentThreads);
            setRequests([]);
            setFollowedProfiles([]);
            setOnboarded(false);
            setOnboard(true);
            setScreen("splash");
          });
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
        onBack={() => go("explore")}
        onOpen={open}
        onOpenProfile={openProfile}
        onOpenReview={openReview}
      />
    );
  return (
    <SafeAreaProvider>
      <ResponsiveAppFrame>{body}</ResponsiveAppFrame>
      <Onboarding
        visible={onboard}
        onDone={(n) => {
          setName(n);
          setOnboarded(true);
          setOnboard(false);
          setScreen("explore");
        }}
      />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  nativeViewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  nativeFrame: {
    position: "relative",
    overflow: "hidden",
  },
  nativeCanvas: {
    position: "absolute",
    width: FIGMA_FRAME_WIDTH,
    height: FIGMA_FRAME_HEIGHT,
  },
  safe: {
    flex: 1,
    height: Platform.OS === "web" ? FIGMA_FRAME_HEIGHT : "100%",
    maxHeight: FIGMA_FRAME_HEIGHT,
    minHeight: 0,
    width: Platform.OS === "web" ? FIGMA_FRAME_WIDTH : "100%",
    maxWidth: FIGMA_FRAME_WIDTH,
    marginHorizontal: "auto",
    backgroundColor: "#fff",
    overflow: "hidden",
    paddingTop: Platform.OS === "android" ? 22 : 0,
  },
  bgWhite: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#fff",
  },
  bgCream: {
    ...StyleSheet.absoluteFill,
  },
  bgMint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(234,248,209,.2)",
  },
  bgNoise: {
    ...StyleSheet.absoluteFill,
    opacity: 1,
  },
  glassBlur: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  glassGradient: {
    ...StyleSheet.absoluteFill,
  },
  glassInnerEdge: {
    ...StyleSheet.absoluteFill,
    borderWidth: 0.35,
    borderColor: "rgba(255,255,255,.5)",
  },
  deviceStatusBar: {
    height: 22,
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  deviceStatusText: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 12,
    lineHeight: 14,
  },
  deviceStatusTextLight: { color: "#fff" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  screenList: { flex: 1, minHeight: 0 },
  screenScroll: { flex: 1, minHeight: 0 },
  heading: {
    height: 102,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 12,
  },
  headingText: { fontFamily: F.display, fontSize: 32, color: C.red },
  headerRow: {
    height: 90,
    paddingHorizontal: 27,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  headerIcon: {
    width: 25,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconActive: {
    borderRadius: 10,
    backgroundColor: "rgba(204,36,44,.1)",
  },
  filterScroller: {
    height: 45,
    minHeight: 45,
    maxHeight: 45,
    flexGrow: 0,
    flexShrink: 0,
  },
  filters: { height: 45, paddingHorizontal: 27, gap: 8, alignItems: "center" },
  pill: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,.4)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  tiny: { fontFamily: F.medium, fontSize: 10, color: C.ink },
  body: { fontFamily: F.medium, fontSize: 12, lineHeight: 15, color: C.ink },
  reviewText: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 15,
    color: C.ink,
  },
  cardTitle: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineText: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  primary: {
    backgroundColor: C.red,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    padding: 13,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  secondary: {
    ...glass,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    padding: 13,
  },
  secondaryText: { fontFamily: F.bold, fontSize: 14, color: C.teal },
  searchInput: {
    height: 38,
    marginHorizontal: 28,
    marginVertical: 4,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,.7)",
    paddingHorizontal: 16,
    fontFamily: F.regular,
  },
  searchBar: {
    ...glass,
    height: 52,
    marginHorizontal: 32,
    borderRadius: 23,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,.74)",
  },
  searchField: {
    flex: 1,
    height: 48,
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink,
    outlineStyle: "none",
  } as any,
  searchModeSwitch: {
    height: 38,
    marginHorizontal: 32,
    marginBottom: 12,
    padding: 3,
    borderRadius: 19,
    backgroundColor: "rgba(43,73,89,.1)",
    flexDirection: "row",
  },
  searchModeButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchModeButtonActive: {
    backgroundColor: C.teal,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
  },
  searchModeText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.teal,
  },
  searchModeTextActive: { color: "#fff" },
  searchCount: {
    marginHorizontal: 33,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
  },
  searchResults: { paddingHorizontal: 32, paddingBottom: 30, gap: 12 },
  searchResultCard: {
    ...glass,
    minHeight: 96,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  searchResultImageBox: {
    width: 62,
    height: 76,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultImage: { width: 62, height: 76 },
  spriteSearchImage: {
    position: "absolute",
    width: 151,
    height: 103,
    left: -28,
    top: -14,
  },
  searchResultCopy: { flex: 1, gap: 4, paddingHorizontal: 12 },
  searchResultName: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  searchSaveButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchEmptyState: {
    alignItems: "center",
    marginTop: 62,
    gap: 10,
  },
  emptyTitle: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  emptyPrompt: { fontFamily: F.medium, fontSize: 13, color: C.teal },
  requestDrinkButton: {
    minWidth: 148,
    height: 42,
    borderRadius: 21,
    marginTop: 4,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  requestPageContent: {
    paddingHorizontal: 32,
    paddingTop: 18,
    paddingBottom: 40,
  },
  requestFormCard: {
    borderRadius: 26,
    padding: 24,
    backgroundColor: "rgba(255,254,248,.94)",
    alignItems: "stretch",
  },
  requestIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(204,36,44,.1)",
    marginBottom: 16,
  },
  requestFormTitle: {
    fontFamily: F.display,
    fontSize: 22,
    color: C.red,
    textAlign: "center",
  },
  requestFormCopy: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(32,26,27,.72)",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  requestInputLabel: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
    marginBottom: 7,
  },
  requestNameInput: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.28)",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    fontFamily: F.medium,
    fontSize: 14,
    color: C.ink,
  },
  requestSubmit: { height: 46, marginTop: 18 },
  disabledButton: { opacity: 0.38 },
  requestSuccess: {
    marginTop: 16,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "rgba(4,178,100,.12)",
    borderWidth: 1,
    borderColor: "rgba(4,178,100,.28)",
  },
  requestSuccessTitle: { fontFamily: F.bold, fontSize: 12, color: C.green },
  requestSuccessText: {
    fontFamily: F.regular,
    fontSize: 11,
    lineHeight: 15,
    color: C.ink,
    marginTop: 3,
  },
  profileSearchCard: {
    ...glass,
    minHeight: 76,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  profileSearchAvatar: { width: 50, height: 50, borderRadius: 25 },
  grid: {
    width: 374,
    alignSelf: "center",
    paddingTop: 20,
    paddingBottom: 130,
    gap: 22,
  },
  gridRow: {
    width: 374,
    gap: 22,
  },
  drinkCard: {
    width: 110,
    height: 187,
    borderRadius: 16,
    ...(Platform.OS === "android"
      ? {
          boxShadow: "0px 3px 8px rgba(0,0,0,0.25)",
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }),
  },
  drinkCardSurface: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor:
      Platform.OS === "android"
        ? "rgba(242,249,229,.82)"
        : "rgba(255,255,255,.1)",
  },
  drinkGlow: { ...StyleSheet.absoluteFill },
  drinkImageFrame: {
    width: 110,
    height: 154,
    overflow: "hidden",
  },
  drinkImage: { width: "100%", height: 154 },
  spriteExploreImage: {
    position: "absolute",
    width: 424,
    height: 286,
    left: -99,
    top: -61,
  },
  drinkLabel: {
    height: 33,
    backgroundColor: "rgba(255,255,255,.8)",
    alignItems: "center",
    paddingTop: 3,
  },
  drinkName: { fontFamily: F.bold, fontSize: 11, maxWidth: 100 },
  savedMark: {
    display: "none",
    position: "absolute",
    right: 6,
    top: 5,
    color: C.red,
    fontSize: 16,
  },
  saveButton: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 27,
    height: 27,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.76)",
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    position: "absolute",
    left: 33,
    right: 33,
    bottom: 34,
    height: 80,
    borderRadius: 24,
    borderWidth: 0.35,
    borderColor: "rgba(255,255,255,.5)",
    ...(Platform.OS === "android"
      ? {
          backgroundColor: "rgba(74,105,108,.62)",
          boxShadow: "0px 6px 6px rgba(0,0,0,0.34)",
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }),
    overflow: "hidden",
    flexDirection: "row",
  },
  navBlur: {
    ...StyleSheet.absoluteFill,
  },
  navTint: {
    ...StyleSheet.absoluteFill,
  },
  navHighlight: { ...StyleSheet.absoluteFill },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  navActive: { backgroundColor: "rgba(0,0,0,.3)" },
  navText: {
    fontFamily: F.display,
    fontSize: 16,
    color: "#173746",
    textShadowColor: "rgba(255,255,255,.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  navTextActive: {
    color: "#fff",
    textShadowColor: "rgba(0,0,0,.24)",
  },
  listCard: {
    height: 110,
    borderRadius: 23,
    marginBottom: 12,
    ...(Platform.OS === "android"
      ? {
          boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }),
  },
  drinklistContent: {
    width: 374,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: 130,
  },
  listCardSurface: {
    flex: 1,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 23,
    borderWidth: 0.35,
    borderColor: "rgba(255,255,255,.5)",
    backgroundColor:
      Platform.OS === "android" ? "rgba(222,244,224,.8)" : "transparent",
  },
  listImageBox: {
    width: 77,
    backgroundColor: "rgba(244,250,228,.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  listImage: { width: 56, height: 72 },
  spriteListImage: {
    position: "absolute",
    width: 221,
    height: 149,
    left: -42,
    top: -14,
  },
  listDetails: {
    flex: 1,
    paddingTop: 7,
    paddingLeft: 12,
    paddingRight: 4,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 7,
  },
  listTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
  },
  listActions: {
    width: 54,
    paddingTop: 16,
    paddingRight: 21,
    alignItems: "flex-end",
    gap: 11,
  },
  smallButton: {
    ...glass,
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontFamily: F.medium,
    textAlign: "center",
    marginTop: 70,
    color: "#666",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "rgba(43,73,89,.28)",
    backgroundColor: C.cream,
  },
  hero: {
    ...glass,
    height: 275,
    marginHorizontal: 35,
    borderRadius: 23,
    backgroundColor: "rgba(250,255,242,.36)",
    borderColor: "rgba(4,178,100,.18)",
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 15,
    width: "100%",
    height: 240,
  },
  spriteHeroImage: {
    width: 669,
    height: 501,
    left: -52,
    right: undefined,
    top: -78,
  },
  heroPill: { position: "absolute", left: 14, top: 14, zIndex: 2 },
  detailCard: {
    ...glass,
    marginHorizontal: 32,
    marginTop: 22,
    marginBottom: 5,
    borderRadius: 23,
    padding: 21,
    overflow: "hidden",
  },
  detailMeta: { gap: 3 },
  officialTagsSection: { marginTop: 14, gap: 8 },
  officialTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  detailTitle: { fontFamily: F.bold, fontSize: 28, color: C.ink },
  reviewCard: {
    marginHorizontal: 32,
    marginBottom: 14,
    borderRadius: 16,
    paddingBottom: 7,
    backgroundColor: "rgba(4,178,100,.2)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  reviewFront: {
    minHeight: 154,
    borderRadius: 16,
    padding: 20,
    backgroundColor: C.cream,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewDetailContent: {
    paddingHorizontal: 32,
    paddingBottom: 130,
  },
  reviewDetailDrinkStrip: {
    height: 84,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  reviewDetailImageBox: {
    width: 52,
    height: 66,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewDetailDrinkImage: { width: 48, height: 62 },
  spriteReviewDetailImage: {
    position: "absolute",
    width: 190,
    height: 128,
    left: -46,
    top: -28,
  },
  reviewDetailDrinkCopy: { flex: 1, gap: 4, marginLeft: 12 },
  reviewDetailDepth: {
    marginTop: 18,
    paddingBottom: 8,
    borderRadius: 20,
    backgroundColor: "rgba(4,178,100,.2)",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
  },
  reviewDetailCard: {
    borderRadius: 20,
    padding: 22,
    backgroundColor: C.cream,
  },
  reviewDetailAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: "rgba(43,73,89,.3)",
    backgroundColor: C.cream,
  },
  reviewDetailText: {
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 21,
    color: C.ink,
    marginVertical: 22,
  },
  reviewDetailFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewDetailLikeButton: {
    minWidth: 46,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: "rgba(204,36,44,.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  reviewCommentsTitle: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.ink,
    marginTop: 26,
    marginBottom: 10,
  },
  commentCard: {
    minHeight: 72,
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    backgroundColor: "rgba(4,178,100,.16)",
    borderWidth: 0.5,
    borderColor: "rgba(4,125,82,.28)",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    borderColor: "rgba(43,73,89,.3)",
    backgroundColor: C.cream,
  },
  commentCopy: { flex: 1, gap: 6 },
  commentUserName: { fontFamily: F.bold, fontSize: 12, color: C.teal },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewNoComments: {
    fontFamily: F.medium,
    fontSize: 12,
    color: "rgba(32,26,27,.58)",
    marginBottom: 12,
  },
  commentComposer: {
    minHeight: 54,
    borderRadius: 21,
    padding: 6,
    paddingLeft: 14,
    marginTop: 8,
    backgroundColor: "rgba(255,254,248,.94)",
    borderWidth: 0.5,
    borderColor: "rgba(43,73,89,.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    height: 42,
    fontFamily: F.medium,
    fontSize: 12,
    color: C.ink,
    outlineStyle: "none",
  } as any,
  commentSubmit: {
    minWidth: 68,
    height: 42,
    borderRadius: 18,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSubmitDisabled: {
    opacity: 1,
    backgroundColor: "rgba(204,36,44,.72)",
  },
  reviewDrink: {
    height: 99,
    marginHorizontal: 33,
    marginTop: 10,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  reviewDrinkImageBox: {
    width: 55,
    height: 76,
    marginRight: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewDrinkImage: { width: 55, height: 76 },
  spriteReviewImage: {
    position: "absolute",
    width: 212,
    height: 159,
    left: -48,
    top: -30,
  },
  ratingCard: {
    height: 100,
    margin: 22,
    marginHorizontal: 33,
    borderRadius: 23,
    padding: 20,
    gap: 10,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  starPicker: { flexDirection: "row", alignItems: "center", gap: 2 },
  halfStarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 35,
    overflow: "hidden",
  },
  filledStar: { position: "absolute", left: 0, top: 0 },
  halfStarHitArea: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
  },
  halfStarButton: { flex: 1 },
  ratingNumber: { fontFamily: F.bold, fontSize: 36, color: C.ink },
  formCard: {
    height: 264,
    marginHorizontal: 33,
    borderRadius: 23,
    padding: 12,
  },
  reviewInput: {
    height: 209,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.8)",
    padding: 12,
    fontFamily: F.regular,
    fontSize: 12,
  },
  notesCard: {
    margin: 22,
    marginHorizontal: 33,
    borderRadius: 23,
    padding: 20,
  },
  customNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  customNoteInput: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,.52)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,.25)",
    fontFamily: F.medium,
    fontSize: 10,
  },
  addNoteButton: {
    height: 28,
    minWidth: 62,
    borderRadius: 14,
    paddingHorizontal: 13,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  notes: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  noteChip: {
    height: 24,
    minWidth: 65,
    paddingHorizontal: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  noteChipSelected: {
    backgroundColor: "rgba(255,119,125,.3)",
    borderColor: "rgba(150,0,0,.54)",
  },
  addNoteChip: {
    height: 24,
    minWidth: 65,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  commonTagsSection: {
    marginHorizontal: 32,
    marginBottom: 14,
    paddingHorizontal: 2,
    gap: 6,
  },
  commonTagsText: {
    fontFamily: F.medium,
    fontSize: 12,
    lineHeight: 18,
    color: "#960000",
  },
  profileCard: {
    height: 77,
    marginHorizontal: 33,
    marginTop: 21,
    borderRadius: 23,
    paddingHorizontal: 20,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  profileAvatar: { width: 55, height: 55, borderRadius: 28 },
  profileDetails: {
    flex: 1,
    height: 55,
    justifyContent: "center",
    gap: 2,
  },
  profileHandle: {
    fontFamily: F.bold,
    fontSize: 10,
    lineHeight: 11,
    color: C.ink,
  },
  profileEditWrap: {
    height: 55,
    justifyContent: "center",
    alignItems: "center",
  },
  profileAction: {
    minWidth: 44,
    height: 29,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1.3,
    borderColor: "rgba(4,178,100,.3)",
    backgroundColor: "rgba(4,178,100,.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  profileActionFollowing: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  profileActionText: {
    fontFamily: F.medium,
    fontSize: 12,
    lineHeight: 15,
    color: C.green,
  },
  profileActionTextFollowing: { color: C.cream },
  settingsContent: { paddingHorizontal: 32, paddingBottom: 40 },
  settingsDetailContent: { paddingHorizontal: 32, paddingBottom: 40 },
  settingsDetailCard: {
    borderRadius: 23,
    padding: 20,
    overflow: "hidden",
  },
  settingsDetailTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    color: C.ink,
    marginBottom: 7,
  },
  settingsDetailCopy: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(32,26,27,.72)",
    marginBottom: 18,
  },
  settingsInputLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: C.ink,
    marginBottom: 6,
  },
  settingsInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.2)",
    backgroundColor: "rgba(255,254,248,.92)",
    paddingHorizontal: 14,
    marginBottom: 14,
    fontFamily: F.medium,
    fontSize: 13,
    color: C.ink,
    outlineStyle: "none",
  } as any,
  settingsVerifiedRow: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(4,178,100,.1)",
    marginBottom: 18,
  },
  settingsVerifiedText: {
    fontFamily: F.bold,
    fontSize: 10,
    color: C.green,
  },
  settingsPrimaryButton: {
    height: 46,
    borderRadius: 18,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsDataSummary: {
    borderRadius: 16,
    padding: 14,
    gap: 7,
    backgroundColor: "rgba(255,254,248,.78)",
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.1)",
    marginBottom: 14,
  },
  settingsSecondaryButton: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.24)",
    backgroundColor: "rgba(255,254,248,.78)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 10,
  },
  settingsSecondaryText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.teal,
  },
  settingsDeleteButton: {
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(204,36,44,.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsDeleteText: { fontFamily: F.bold, fontSize: 12, color: C.red },
  settingsAboutLogo: {
    fontFamily: F.display,
    fontSize: 24,
    color: C.red,
    textAlign: "center",
    marginBottom: 18,
  },
  settingsAccountCard: {
    height: 82,
    borderRadius: 23,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsAvatar: { width: 55, height: 55, borderRadius: 28 },
  settingsAccountCopy: { flex: 1, gap: 5, justifyContent: "center" },
  settingsSectionTitle: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.ink,
    marginTop: 22,
    marginBottom: 8,
  },
  settingsGroup: {
    backgroundColor: "rgba(255,254,248,.86)",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.12)",
  },
  settingsOption: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(43,73,89,.12)",
  },
  settingsDangerOption: { borderBottomWidth: 0 },
  settingsOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,73,89,.08)",
  },
  settingsDangerIcon: { backgroundColor: "rgba(204,36,44,.08)" },
  settingsOptionCopy: { flex: 1, gap: 3 },
  settingsOptionTitle: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  settingsOptionSubtitle: {
    fontFamily: F.regular,
    fontSize: 10,
    lineHeight: 13,
    color: "rgba(32,26,27,.62)",
  },
  tab: {
    ...glass,
    height: 34,
    flex: 1,
    marginTop: 10,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabActive: { backgroundColor: C.red },
  progressCard: {
    height: 66,
    margin: 12,
    marginHorizontal: 33,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressCircle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressText: {
    position: "absolute",
    fontFamily: F.medium,
    fontSize: 10,
    color: C.ink,
  },
  badges: {
    paddingHorizontal: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 0,
  },
  badgeItem: {
    width: "31%",
    height: 120,
    alignItems: "center",
  },
  badgeLocked: { opacity: 0.42 },
  badgeLabel: {
    width: 105,
    textAlign: "center",
    marginTop: 2,
  },
  badgeComposite: { width: 88, height: 105 },
  badgeCompositeTall: { width: 88, height: 121 },
  stats: {
    width: 374,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  statsThree: { gap: 8 },
  stat: {
    height: 88,
    flex: 1,
    minWidth: 0,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor:
      Platform.OS === "android" ? "rgba(222,244,224,.78)" : "transparent",
    ...(Platform.OS === "android"
      ? {
          boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }),
  },
  statNumber: { fontFamily: F.bold, fontSize: 25 },
  statThree: { flex: 1 },
  receiptWrap: {
    width: 374,
    marginHorizontal: 33,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
  },
  receipt: {
    width: "100%",
    minHeight: 405,
    backgroundColor: C.cream,
    padding: 20,
    position: "relative",
  },
  receiptItem: { marginTop: 16, paddingBottom: 16 },
  receiptItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(32,26,27,.12)",
  },
  receiptItemCopy: { flex: 1, minWidth: 0, gap: 2 },
  receiptEditButton: {
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(204,36,44,.07)",
  },
  receiptReviewText: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 15,
    color: C.ink,
    marginLeft: 30,
    marginTop: 5,
  },
  receiptRating: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    gap: 5,
  },
  receiptStars: { color: "#e3a000", fontSize: 12 },
  receiptRatingNumber: {
    fontFamily: F.bold,
    fontSize: 10,
    color: "rgba(32,26,27,.62)",
  },
  receiptShareButton: {
    position: "absolute",
    right: 14,
    top: 14,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(204,36,44,.4)",
    backgroundColor: "rgba(204,36,44,.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 2,
  },
  receiptShareText: { fontFamily: F.bold, fontSize: 10, color: C.red },
  receiptLogo: {
    fontFamily: F.display,
    fontSize: 18,
    textAlign: "center",
    marginVertical: 16,
  },
  dash: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ddd",
    marginBottom: 16,
  },
  feedContent: { paddingBottom: 18 },
  feedSectionHeader: {
    marginHorizontal: 32,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedMoreButton: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  feedMoreArrowExpanded: { transform: [{ rotate: "180deg" }] },
  friendStrip: {
    paddingHorizontal: 22,
    gap: 2,
    marginTop: 12,
  },
  friendDrink: { width: 77, alignItems: "center" },
  friendComposite: { width: 77, height: 120 },
  friendCompactCard: {
    width: 77,
    height: 120,
    borderRadius: 9,
    ...(Platform.OS === "android"
      ? {
          boxShadow: "0px 3px 5px rgba(0,0,0,0.25)",
        }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }),
  },
  friendCompactSurface: {
    flex: 1,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor:
      Platform.OS === "android"
        ? "rgba(242,249,229,.86)"
        : "rgba(255,255,255,.1)",
  },
  friendCompactImageFrame: {
    width: 77,
    height: 92,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  friendCompactImage: {
    width: "85%",
    height: "85%",
    backgroundColor: "transparent",
  },
  friendCompactLabel: {
    width: 77,
    height: 28,
    paddingHorizontal: 3,
    paddingTop: 2,
    backgroundColor: "rgba(255,255,255,.8)",
    alignItems: "center",
  },
  friendCompactName: {
    maxWidth: 71,
    fontFamily: F.bold,
    fontSize: 7,
    lineHeight: 9,
    textAlign: "center",
  },
  friendCompactType: {
    maxWidth: 71,
    fontFamily: F.medium,
    fontSize: 6.5,
    lineHeight: 8,
    textAlign: "center",
  },
  friendCount: {
    fontFamily: F.medium,
    fontSize: 10,
    color: C.ink,
  },
  friendSocialRow: {
    minHeight: 13,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  friendAvatarStack: { flexDirection: "row", alignItems: "center" },
  friendMiniAvatar: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.35,
    borderColor: C.cream,
  },
  friendMiniAvatarOverlap: { marginLeft: -4.5 },
  activityTitle: {
    fontFamily: F.bold,
    fontSize: 14,
    color: C.ink,
    marginHorizontal: 32,
    marginTop: 29,
  },
  activityGroup: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 15,
    color: C.ink,
    marginHorizontal: 33,
    marginTop: 5,
  },
  activity: {
    marginHorizontal: 33,
    marginTop: 10,
    borderRadius: 23,
    paddingHorizontal: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activityTall: { height: 66 },
  activityShort: { height: 55 },
  activityAvatar: {
    width: 33,
    height: 33,
    borderRadius: 17,
  },
  activityCopy: { flex: 1 },
  activityAction: {
    fontFamily: F.medium,
    fontSize: 10,
    color: C.red,
    marginTop: 1,
  },
  activityQuote: {
    fontFamily: F.regular,
    fontStyle: "italic",
    color: C.ink,
  },
  activityTime: {
    fontFamily: F.regular,
    fontSize: 10,
    color: "rgba(0,0,0,.7)",
  },
  confirmOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(32,26,27,.38)",
  },
  logoutConfirmCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.14)",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoutConfirmTitle: {
    fontFamily: F.display,
    fontSize: 20,
    color: C.red,
    textAlign: "center",
  },
  logoutConfirmCopy: {
    marginTop: 10,
    fontFamily: F.regular,
    fontSize: 13,
    color: C.ink,
    textAlign: "center",
  },
  logoutConfirmActions: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  logoutCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.28)",
    backgroundColor: "rgba(255,255,255,.72)",
  },
  logoutConfirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: C.red,
  },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,.2)",
  },
  onboard: {
    width: "100%",
    maxWidth: FIGMA_FRAME_WIDTH,
    backgroundColor: "#fffef8",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 10,
    overflow: "hidden",
    alignItems: "center",
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#aaa",
    alignSelf: "center",
  },
  onboardTitle: {
    fontFamily: F.display,
    fontSize: 20,
    color: C.red,
    marginTop: 2,
    width: "100%",
    textAlign: "center",
  },
  onboardAge: {
    width: "100%",
    fontFamily: F.bold,
    fontSize: 14,
    color: C.ink,
    textAlign: "center",
  },
  onboardCopy: {
    width: "100%",
    fontFamily: F.regular,
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(32,26,27,.72)",
    marginBottom: 2,
    textAlign: "center",
  },
  socialButton: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.25)",
    backgroundColor: "rgba(255,255,255,.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialButtonDark: { backgroundColor: C.ink, borderColor: C.ink },
  socialButtonText: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  createAccountButton: {
    width: "100%",
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: C.red,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createAccountText: { fontFamily: F.bold, fontSize: 13, color: C.red },
  onboardControl: { width: "100%" },
  textButton: {
    width: "100%",
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  textButtonText: { fontFamily: F.medium, fontSize: 11, color: C.teal },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,.8)",
    paddingHorizontal: 15,
    fontFamily: F.regular,
  },
  splash: {
    flex: 1,
    height: Platform.OS === "web" ? FIGMA_FRAME_HEIGHT : "100%",
    maxHeight: FIGMA_FRAME_HEIGHT,
    minHeight: 0,
    width: Platform.OS === "web" ? FIGMA_FRAME_WIDTH : "100%",
    maxWidth: FIGMA_FRAME_WIDTH,
    marginHorizontal: "auto",
    backgroundColor: "#f30",
    overflow: "hidden",
  },
  splashImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
    ...(Platform.OS === "web"
      ? ({ objectFit: "cover", objectPosition: "center top" } as any)
      : {}),
  },
  splashShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,50,0,.06)",
  },
  splashTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "30%",
    fontFamily: F.display,
    fontSize: 52,
    color: "#e9fae8",
    textAlign: "center",
  },
});
