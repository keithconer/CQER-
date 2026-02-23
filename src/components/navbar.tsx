"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    userType: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const activeView = searchParams.get("view") === "programs" ? "programs" : "projects";
  const showDataNav =
    pathname?.startsWith("/dashboard") &&
    (user.userType === "unit_coordinator" || user.userType === "college_coordinator");

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard?view=projects");
    router.prefetch("/dashboard?view=programs");
    router.prefetch("/settings");
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials =
    (user.firstName?.[0] || "") + (user.lastName?.[0] || "");

  return (
    <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[95rem] mx-auto flex h-12 items-center justify-between px-2 sm:px-3 md:px-4">
        {/* Left: App name */}
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Image
              src="/CQERFINAL.png"
              alt="CQER Logo"
              width={42}
              height={42}
              className="object-contain"
            />
            <span className="text-sm font-bold tracking-tight">CQER</span>
          </div>
        </button>

        {/* Right: Profile section */}
        <div className="flex items-center gap-2">
          {showDataNav && (
            <div className="inline-flex rounded-md border border-border/60 p-0.5 bg-muted/20 mr-1">
              <Button
                size="sm"
                onClick={() => router.push("/dashboard?view=programs")}
                className={`h-7 text-[10px] px-2.5 ${
                  activeView === "programs"
                    ? "bg-transparent text-[#159E44] hover:bg-muted"
                    : "bg-transparent text-foreground hover:bg-muted"
                }`}
              >
                Programs
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard?view=projects")}
                className={`h-7 text-[10px] px-2.5 ${
                  activeView === "projects"
                    ? "bg-transparent text-[#159E44] hover:bg-muted"
                    : "bg-transparent text-foreground hover:bg-muted"
                }`}
              >
                Projects
              </Button>
            </div>
          )}
          <Avatar className="h-7 w-7">
            <AvatarImage
              src={user.avatarUrl || undefined}
              alt={user.firstName}
            />
            <AvatarFallback className="text-[10px] font-medium bg-muted">
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium hidden sm:inline">
            {user.firstName}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="text-xs cursor-pointer"
              >
                <Settings className="mr-2 h-3 w-3" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-xs cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-3 w-3" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
