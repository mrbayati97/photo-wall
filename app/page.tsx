import { auth, signIn, signOut } from "@/auth";
import { listUploads, userKey } from "@/lib/photos";
import { SAMPLE_PINS } from "@/lib/samples";
import Board from "./board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const email = session?.user?.email;
  const uid = email ? userKey(email) : null;
  const uploads = await listUploads(uid);

  return (
    <Board
      pins={[...uploads, ...SAMPLE_PINS]}
      user={uid ? { uid, name: session?.user?.name ?? email ?? "", image: session?.user?.image ?? null } : null}
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
