import { auth } from "@/auth";
import { userKey } from "./photos";

export type Viewer = { uid: string; name: string; image: string | null; admin: boolean };

/** Emails allowed to moderate, from ADMIN_EMAILS (comma separated). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** The signed-in user, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return {
    uid: userKey(email),
    name: session.user?.name || email.split("@")[0],
    image: session.user?.image ?? null,
    admin: adminEmails().includes(email.toLowerCase()),
  };
}
