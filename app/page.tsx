import { signIn, signOut } from "@/auth";
import { getViewer } from "@/lib/viewer";
import { listPins } from "@/lib/pins";
import { hasDatabase } from "@/lib/db";
import { SAMPLE_PINS } from "@/lib/samples";
import Board from "./board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getViewer();
  let pins = SAMPLE_PINS;
  let dbError = false;
  try {
    pins = [...(await listPins(viewer)), ...SAMPLE_PINS];
  } catch (e) {
    console.error("Could not load pins from the database", e);
    dbError = true;
  }

  return (
    <Board
      pins={pins}
      user={viewer}
      canPost={hasDatabase() && !dbError}
      signInAction={async () => {
        "use server";
        await signIn("google");
      }}
      signOutAction={async () => {
        "use server";
        await signOut();
      }}
    />
  );
}
