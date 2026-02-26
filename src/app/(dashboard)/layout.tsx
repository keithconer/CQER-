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

  // BULLETPROOF REDIRECT: If no profile exists, redirected to login 
  // (unless they are the super admin we just registered)
  if (!profile) {
    if (user.email === "main.keithbrian.coner@cvsu.edu.ph") {
      // Proactively create super_admin profile if it doesn't exist
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        first_name: "Keith Brian",
        last_name: "Coner",
        user_type: "super_admin",
      });
      // Refresh to get the new profile
      return redirect("/dashboard");
    }
    redirect("/login");
  }

  // If incomplete (missing first name) and NOT super_admin, they might need setup
  if (!profile.first_name && profile.user_type !== "super_admin") {
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
    department: profile.department || null,
    unit: profile.unit || null,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={userData} />
      <main className="dashboard-main max-w-[95rem] mx-auto px-2 sm:px-3 md:px-4 py-6 transition-[margin] duration-200">
        {children}
      </main>
    </div>
  );
}
