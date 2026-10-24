import coffee from "@/assets/coffee.jpg";
import bites from "@/assets/bites.jpg";
import beer from "@/assets/beer.jpg";
import hero from "@/assets/hero.jpg";
import type { ImageKey } from "./types";

export const IMAGES: Record<ImageKey, string> = { coffee, bites, beer, hero };
export const CATEGORY_LABEL: Record<string, string> = {
  coffee: "Coffee",
  "cold-brew": "Cold brew",
  bites: "Bites",
  mains: "Mains",
  beer: "On tap",
  desserts: "Desserts",
};
