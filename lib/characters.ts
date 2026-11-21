export type Character = {
  id: string;
  name: string;
  bio: string;
  color: string;
  photos: { file: string; caption: string }[];
};

/** The sample cast shown on the first page. Images live in public/characters. */
export const CHARACTERS: Character[] = [
  {
    id: "miso",
    name: "Miso",
    bio: "Orange cat. Naps in sunbeams, wakes up for snacks.",
    color: "#f39a3b",
    photos: [
      { file: "miso-beach.svg", caption: "Beach day" },
      { file: "miso-night.svg", caption: "Counting stars" },
    ],
  },
  {
    id: "bolt",
    name: "Bolt",
    bio: "Friendly robot. Collects shiny buttons and city lights.",
    color: "#8fb3d9",
    photos: [
      { file: "bolt-city.svg", caption: "Rush hour" },
      { file: "bolt-snow.svg", caption: "First snow" },
    ],
  },
  {
    id: "inky",
    name: "Inky",
    bio: "Octopus with eight arms and twice as many party plans.",
    color: "#9b6cf7",
    photos: [
      { file: "inky-party.svg", caption: "Birthday bash" },
      { file: "inky-beach.svg", caption: "Visiting the shore" },
    ],
  },
  {
    id: "puff",
    name: "Puff",
    bio: "Little cloud. Floats wherever the breeze goes.",
    color: "#a9c3e2",
    photos: [
      { file: "puff-forest.svg", caption: "Morning hike" },
      { file: "puff-night.svg", caption: "Moonlit drift" },
    ],
  },
  {
    id: "spike",
    name: "Spike",
    bio: "Cactus in a clay pot. Prickly outside, soft inside.",
    color: "#4caf6a",
    photos: [
      { file: "spike-snow.svg", caption: "Far from the desert" },
      { file: "spike-party.svg", caption: "Dance floor" },
    ],
  },
];
