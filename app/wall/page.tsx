import { signIn, signOut } from "@/auth";
import { getViewer } from "@/lib/viewer";
import { listPins } from "@/lib/pins";
import { withSocial } from "@/lib/social";
import { hasDatabase } from "@/lib/db";
import { blobMode } from "@/lib/blob-mode";
import { SAMPLE_PINS } from "@/lib/samples";
import Board from "../board";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export default async function Home() {
  const viewer = await getViewer();
  let pins = SAMPLE_PINS;
  let dbOk = hasDatabase();
  try {
    pins = await withSocial([...(await listPins(viewer)), ...SAMPLE_PINS], viewer);
  } catch (e) {
    console.error("Could not load pins from the database", e);
    dbOk = false;
  }
  const mode = blobMode();

  return (
    <Board
      pins={pins}
      user={viewer}
      social={dbOk}
      canPost={dbOk && mode !== "none"}
      uploadMode={mode === "oidc" ? "presigned" : "token"}
      signInAction={async () => {
        "use server";
        await signIn("google", { redirectTo: "/wall" });
      }}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/wall" });
      }}
    />
  );
}
