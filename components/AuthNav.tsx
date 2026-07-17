import { getUser } from "@/lib/supabase/server";
import Link from "next/link";

/** Server component: login/account links for the hero nav. */
export async function AuthNav() {
  const user = await getUser();

  if (!user) {
    return (
      <Link href="/login" className="transition hover:text-[var(--paper)]">
        Log in
      </Link>
    );
  }

  return (
    <>
      <Link href="/dashboard" className="transition hover:text-[var(--paper)]">
        Dashboard
      </Link>
      <Link href="/brief" className="transition hover:text-[var(--paper)]">
        Brief
      </Link>
      <form action="/auth/signout" method="post" className="inline">
        <button type="submit" className="cursor-pointer transition hover:text-[var(--paper)]">
          Log out
        </button>
      </form>
    </>
  );
}
