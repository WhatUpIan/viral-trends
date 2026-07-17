import { getUser, createClient } from "@/lib/supabase/server";

/** Display name for greetings: profile display_name → email local-part */
export async function getGreetingName(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.display_name?.trim()) return data.display_name.trim();
    const email = data?.email ?? user.email;
    if (email) return email.split("@")[0] ?? email;
  } catch {
    if (user.email) return user.email.split("@")[0] ?? user.email;
  }
  return null;
}

export function timeOfDayGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
