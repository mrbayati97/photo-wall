// Turn a character JSON spec (characters/<id>.json) into a sample person on the wall.
//
//   node scripts/make-character.mjs <id>                 generate the photo (paid OpenAI call)
//   node scripts/make-character.mjs <id> --avatar x,y,s  crop the avatar from the saved photo
//
// The `image` block of the spec is sent to OpenAI as a JSON prompt. The raw PNG is kept in
// characters/out/ (git-ignored), the pin and avatar are written as WebP into public/, and the
// person and pin are added to lib/samples.json with aiGenerated: true.
// Avatar crop: x, y = top-left corner, s = side length, all as fractions of the photo width.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const [id, flag, cropArg] = process.argv.slice(2);
if (!id) throw new Error("usage: node scripts/make-character.mjs <id> [--avatar x,y,s]");

const spec = JSON.parse(await readFile(path.join(root, "characters", `${id}.json`), "utf8"));
const rawPath = path.join(root, "characters", "out", `${id}.png`);

if (flag === "--avatar") {
  const [x, y, s] = cropArg.split(",").map(Number);
  const img = sharp(rawPath);
  const { width } = await img.metadata();
  const px = (f) => Math.round(f * width);
  await img
    .extract({ left: px(x), top: px(y), width: px(s), height: px(s) })
    .resize(160, 160)
    .webp({ quality: 82 })
    .toFile(path.join(root, "public", "avatars", `${id}.webp`));
  console.log(`avatar written: public/avatars/${id}.webp`);
  process.exit(0);
}

const exists = await access(rawPath).then(() => true, () => false);
if (exists && flag !== "--force") {
  console.log(`${rawPath} already exists; pass --force to pay for a new one.`);
} else {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const prompt =
    "Create the image described by this JSON spec. Follow every field; never include anything listed in \"avoid\".\n" +
    JSON.stringify(spec.image, null, 2);

  let b64;
  for (const model of ["gpt-image-2", "gpt-image-1"]) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, size: "1024x1536", quality: "high", n: 1 }),
    });
    const body = await res.json();
    if (res.ok) {
      b64 = body.data[0].b64_json;
      console.log(`generated with ${model}`);
      break;
    }
    console.warn(`${model}: ${res.status} ${body.error?.message ?? ""}`);
    if (res.status !== 404 && !/model/i.test(body.error?.message ?? "")) process.exit(1);
  }
  if (!b64) process.exit(1);
  await mkdir(path.dirname(rawPath), { recursive: true });
  await writeFile(rawPath, Buffer.from(b64, "base64"));
}

// Pin image: 900x1350, the same size as the other Style pins.
await sharp(rawPath)
  .resize(900, 1350, { fit: "cover" })
  .webp({ quality: 80 })
  .toFile(path.join(root, "public", "pins", spec.pin.file));

// Add or replace the person and pin in the sample data.
const samplesPath = path.join(root, "lib", "samples.json");
const samples = JSON.parse(await readFile(samplesPath, "utf8"));
samples.people[id] = { ...spec.profile, avatar: `/avatars/${id}.webp` };
samples.pins = samples.pins.filter((p) => p.file !== spec.pin.file);
samples.pins.push({ ...spec.pin, person: id, width: 900, height: 1350, aiGenerated: true });
await writeFile(samplesPath, JSON.stringify(samples, null, 2) + "\n");

console.log(`pin written: public/pins/${spec.pin.file}; lib/samples.json updated`);
console.log(`next: look at ${rawPath} and run --avatar x,y,s to crop the face`);
