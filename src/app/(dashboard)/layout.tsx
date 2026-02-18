import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // BULLETPROOF REDIRECT: If no profile exists OR if it's incomplete (missing first name), they MUST pick a role
  if (!profile || !profile.first_name) {
    redirect("/register?step=2");
  }

  const userData = {
    firstName: profile.first_name || user.user_metadata?.first_name || "User",
    lastName: profile.last_name || user.user_metadata?.last_name || "",
    email: user.email || "",
    avatarUrl:
      profile.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null,
    userType: profile.user_type,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={userData} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
