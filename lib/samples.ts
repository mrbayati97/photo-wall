import data from "./samples.json";
import type { Category, Pin } from "./shared";

/** Sample pins featuring the illustrated people in public/pins and public/avatars. */
export const SAMPLE_PINS: Pin[] = data.pins.map((p) => {
  const person = data.people[p.person as keyof typeof data.people];
  return {
    id: `sample/${p.file}`,
    src: `/pins/${p.file}`,
    title: p.title,
    description: p.description,
    category: p.category as Category,
    author: { name: person.name, avatar: `/avatars/${p.person}.svg`, bio: person.bio },
    sample: true,
    mine: false,
    width: p.width,
    height: p.height,
  };
});
