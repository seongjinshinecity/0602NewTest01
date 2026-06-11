import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import Studio from "@/components/Studio";
import type { Generation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Seed the studio with the most recent completed images.
  const { data } = await supabase
    .from("generations")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(13);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1">
        <Studio initialHistory={(data as Generation[]) ?? []} />
      </main>
    </div>
  );
}
