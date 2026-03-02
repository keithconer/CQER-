"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  LogOut,
  FolderPlus,
  FolderKanban,
  FileText,
  Users,
  Database,
  Award,
} from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    userType: string;
    department: string | null;
    unit: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createExpanded, setCreateExpanded] = useState(true);
  const [recordsExpanded, setRecordsExpanded] = useState(true);

  const isDashboard = pathname?.startsWith("/dashboard");
  const activeView = searchParams.get("view") === "programs" ? "programs" : "projects";
  const panelParam = searchParams.get("panel");
  const activePanel =
    panelParam === "unit-coordinators" ||
    panelParam === "awards" ||
    panelParam === "accounts" ||
    panelParam === "projects" ||
    panelParam === "programs"
      ? panelParam
      : "records";

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard?panel=records&view=projects");
    router.prefetch("/dashboard?panel=records&view=programs");
    router.prefetch("/dashboard?panel=unit-coordinators");
    router.prefetch("/dashboard?panel=awards");
    router.prefetch("/dashboard?panel=accounts");
    router.prefetch("/dashboard?panel=projects");
    router.prefetch("/dashboard?panel=programs");
    router.prefetch("/settings");
  }, [router]);

  useEffect(() => {
    if (!isDashboard) return;
    document.documentElement.setAttribute(
      "data-dashboard-sidebar",
      sidebarOpen ? "open" : "closed"
    );
    return () => {
      document.documentElement.setAttribute("data-dashboard-sidebar", "closed");
    };
  }, [isDashboard, sidebarOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const goTo = (path: string) => {
    router.push(path);
  };

  const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || "");
  const roleLabel =
    user.userType === "super_admin"
      ? "Super Admin"
      : user.userType === "college_coordinator"
        ? "College Coordinator"
        : "Unit Coordinator";
  const deptUnitLabel = user.department
    ? `${user.department}${user.unit ? ` • ${user.unit}` : ""}`
    : null;

  const navItemClass = (active: boolean) =>
    `h-7 w-full justify-start text-[10px] border ${active ? "border-border/40 bg-muted/30" : "border-transparent"}`;

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[95rem] mx-auto flex min-h-12 items-center justify-between px-2 sm:px-3 md:px-4 py-1.5">
        <div className="flex items-center gap-2">
          {isDashboard && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border/40 bg-white"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Image
              src="/CQERFINAL.png"
              alt="CQER Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName} />
            <AvatarFallback className="text-[10px] font-medium bg-muted">
              {initials.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-medium">{user.firstName}</span>
            <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
              <PopoverTrigger asChild>
                <span
                  onMouseEnter={() => setRolePopoverOpen(true)}
                  onMouseLeave={() => setRolePopoverOpen(false)}
                  className="inline-flex w-fit mt-0.5 rounded-full border border-border/40 bg-white px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/80 cursor-default"
                >
                  {roleLabel}
                </span>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                onMouseEnter={() => setRolePopoverOpen(true)}
                onMouseLeave={() => setRolePopoverOpen(false)}
                className="w-auto px-2 py-1.5 text-[10px] leading-none"
              >
                <span className="text-muted-foreground">{deptUnitLabel || "No Department - Unit"}</span>
              </PopoverContent>
            </Popover>
          </div>

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
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
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

      {isDashboard && sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {isDashboard && (
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-64 border-r border-border/40 bg-white transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-12 items-center justify-between border-b border-border/40 px-3">
            <Image
              src="/CQERFINAL.png"
              alt="CQER Logo"
              width={36}
              height={36}
              className="object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-1 px-2 py-3">
            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <>
                <Button
                  variant="ghost"
                  className="h-8 w-full justify-start text-[10px] font-medium"
                  onClick={() => setCreateExpanded((prev) => !prev)}
                >
                  <FolderPlus className="mr-2 h-3.5 w-3.5" />
                  Create
                </Button>
                {createExpanded && (
                  <div className="space-y-1 pl-2">
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "records" && activeView === "projects")}
                      onClick={() => goTo("/dashboard?panel=records&view=projects")}
                    >
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Projects
                    </Button>
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "records" && activeView === "programs")}
                      onClick={() => goTo("/dashboard?panel=records&view=programs")}
                    >
                      <FileText className="mr-2 h-3.5 w-3.5" />
                      Programs
                    </Button>
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "awards")}
                      onClick={() => goTo("/dashboard?panel=awards")}
                    >
                      <Award className="mr-2 h-3.5 w-3.5" />
                      Awards
                    </Button>
                  </div>
                )}
              </>
            )}

            {user.userType === "college_coordinator" && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "unit-coordinators")}
                onClick={() => goTo("/dashboard?panel=unit-coordinators")}
              >
                <Users className="mr-2 h-3.5 w-3.5" />
                Register Unit Coordinators
              </Button>
            )}

            {user.userType === "super_admin" && (
              <>
                <Button
                  variant="ghost"
                  className="h-8 w-full justify-start text-[10px] font-medium"
                  onClick={() => setRecordsExpanded((prev) => !prev)}
                >
                  <Database className="mr-2 h-3.5 w-3.5" />
                  Records
                </Button>
                {recordsExpanded && (
                  <div className="space-y-1 pl-2">
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "accounts")}
                      onClick={() => goTo("/dashboard?panel=accounts")}
                    >
                      <Users className="mr-2 h-3.5 w-3.5" />
                      Accounts
                    </Button>
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "projects")}
                      onClick={() => goTo("/dashboard?panel=projects")}
                    >
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Projects
                    </Button>
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "programs")}
                      onClick={() => goTo("/dashboard?panel=programs")}
                    >
                      <FileText className="mr-2 h-3.5 w-3.5" />
                      Programs
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      )}
    </header>
  );
}
