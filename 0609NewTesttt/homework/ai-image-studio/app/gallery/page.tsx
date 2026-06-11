import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import ImageCard from "@/components/ImageCard";
import type { Generation } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("generations")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const images = (data as Generation[]) ?? [];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-white">Gallery</h1>
          <p className="text-sm text-zinc-400">
            {images.length} {images.length === 1 ? "image" : "images"} you&apos;ve created.
          </p>
        </header>

        {images.length === 0 ? (
          <div className="flex h-[60vh] flex-col items-center justify-center text-center text-zinc-600">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-ink-850 text-3xl">
              ▦
            </div>
            <p className="text-sm">No images yet. Head to the Studio to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {images.map((g) => (
              <ImageCard key={g.id} gen={g} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
