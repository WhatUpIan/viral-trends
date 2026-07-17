"use server";

import { regenerateMorningBrief } from "@/lib/brief";
import { getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function refreshBrief() {
  const user = await getUser();
  if (!user) redirect("/login?next=/brief");
  await regenerateMorningBrief(user.id);
  revalidatePath("/brief");
  revalidatePath("/dashboard");
}
