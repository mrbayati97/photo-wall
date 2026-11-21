import data from "./samples.json";
import type { Category, Pin } from "./shared";

type Person = { name: string; bio: string; avatar: string };
type SamplePin = { file: string; person: string; title: string; category: string; description: string; width: number; height: number; aiGenerated?: boolean };

const people = data.people as Record<string, Person>;

/** Sample pins: illustrated people (SVG) plus AI-generated portrait photos, all fictional. */
export const SAMPLE_PINS: Pin[] = (data.pins as SamplePin[]).map((p) => {
  const person = people[p.person];
  return {
    id: `sample/${p.file}`,
    src: `/pins/${p.file}`,
    title: p.title,
    description: p.description,
    category: p.category as Category,
    author: { name: person.name, avatar: person.avatar, bio: person.bio },
    sample: true,
    mine: false,
    aiGenerated: Boolean(p.aiGenerated),
    width: p.width,
    height: p.height,
  };
});
