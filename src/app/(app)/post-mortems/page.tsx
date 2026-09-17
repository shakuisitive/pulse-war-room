import { PostMortemArchive } from "@/components/post-mortem/post-mortem-archive";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PostMortemsPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("post_mortem_archive_view")
    .select("*")
    .eq("org_id", session.organization.id)
    .order("published_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post-mortems</h1>
        <p className="text-muted-foreground">
          Published incident reviews and follow-up learnings across your organization.
        </p>
      </div>
      <PostMortemArchive items={items ?? []} />
    </div>
  );
}
