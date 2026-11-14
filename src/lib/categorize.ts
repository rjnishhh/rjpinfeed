import type { FeedCategory, FeedPin } from "./types";

export const CATEGORIES: FeedCategory[] = [
  { name: "Mindset & Self-Respect", color: "#c45c6a" },
  { name: "Money & Finance", color: "#3d7a5a" },
  { name: "Tech, AI & Setups", color: "#c97b2c" },
  { name: "Art & Aesthetic", color: "#7a5ca8" },
  { name: "Pop Culture & Nostalgia", color: "#3b6ea5" },
  { name: "Fresh Finds", color: "#8a7355" },
];

const RULES: { category: string; words: string[] }[] = [
  {
    category: "Mindset & Self-Respect",
    words: [
      "mindset", "respect", "presence", "discipline", "peace", "self", "poem",
      "motivation", "ambition", "excellent", "habits", "boundaries", "scarcity",
      "yoga", "meditation", "life you want", "universe",
    ],
  },
  {
    category: "Money & Finance",
    words: [
      "money", "wealth", "finance", "bitcoin", "utxo", "treasury", "invest",
      "income", "cash", "bank", "crypto", "savings", "raise", "assets",
    ],
  },
  {
    category: "Tech, AI & Setups",
    words: [
      "ai ", " agent", "setup", "wallpaper", "desk", "monitor", "keyboard",
      "laptop", "code", "software", "claude", "grok", "chatgpt", "tech",
    ],
  },
  {
    category: "Art & Aesthetic",
    words: [
      "aesthetic", "portrait", "banner", "design", "anime", "fashion", "art",
      "mood", "vibes", "abstract", "photo", "room", "interior", "decor",
    ],
  },
  {
    category: "Pop Culture & Nostalgia",
    words: [
      "nostalgia", "doodle", "google", "thanksgiving", "tv", "song", "movie",
      "visionquest", "cartoon", "meme", "retro", "90s", "2000s",
    ],
  },
];

export function categorizePin(input: {
  title?: string | null;
  description?: string | null;
  board?: string | null;
  domain?: string | null;
}): string {
  const hay = [input.title, input.description, input.board, input.domain]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const rule of RULES) {
    if (rule.words.some((w) => hay.includes(w.trim()))) return rule.category;
  }
  return "Fresh Finds";
}

export function filenameFor(pin: FeedPin, index: number, total: number, ext: string) {
  const safe = pin.title
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || `pin-${pin.id}`;
  const suffix = total > 1 ? ` (${String(index).padStart(2, "0")} of ${String(total).padStart(2, "0")})` : "";
  return `${safe}${suffix}${ext}`;
}
