import data from "./samples.json";
import type { Category, Pin } from "./shared";

type Person = { name: string; bio: string; avatar: string };
type SamplePin = { file: string; person: string; title: string; category: string; description: string; width: number; height: number; aiGenerated?: boolean; stock?: boolean };

const people = data.people as Record<string, Person>;

/** Sample pins: AI-generated portraits and licensed Adobe Stock photos, with fictional names and bios. */
export const SAMPLE_PINS: Pin[] = (data.pins as SamplePin[]).map((p) => {
  const person = people[p.person];
  return {
    id: `sample/${p.file}`,
    src: `/pins/${p.file}`,
    title: p.title,
    description: p.description,
    category: p.category as Category,
    author: { key: `s:${p.person}`, name: person.name, avatar: person.avatar, bio: person.bio },
    sample: true,
    mine: false,
    aiGenerated: Boolean(p.aiGenerated),
    stock: Boolean(p.stock),
    width: p.width,
    height: p.height,
  };
});

export const SAMPLE_PEOPLE = new Set(Object.keys(people));
export const SAMPLE_PIN_IDS = new Set(SAMPLE_PINS.map((p) => p.id));
