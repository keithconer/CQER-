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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  KeyRound,
  LogOut,
  Moon,
  Type,
  FolderPlus,
  FolderKanban,
  Users,
  Database,
  Award,
  UserRoundCheck,
  GraduationCap,
  Cpu,
  ScrollText,
  BookOpenCheck,
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
  const [superProjectsExpanded, setSuperProjectsExpanded] = useState(true);
  const [fontScale, setFontScale] = useState<"small" | "medium" | "large">(() => {
    if (typeof window === "undefined") return "small";
    const savedScale = window.localStorage.getItem("cqer_font_scale");
    return savedScale === "small" || savedScale === "medium" || savedScale === "large"
      ? savedScale
      : "small";
  });
  const [darkModeEnabled, setDarkModeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("cqer_theme") === "dark";
  });

  const isDashboard = pathname?.startsWith("/dashboard");
  const viewParam = searchParams.get("view");
  const activeView =
    viewParam === "project-registration" || viewParam === "project-proposal"
      ? viewParam
      : "project-registration";
  const panelParam = searchParams.get("panel");
  const activePanel =
    panelParam === "unit-coordinators" ||
    panelParam === "funding" ||
    panelParam === "awards" ||
    panelParam === "student-involvement" ||
    panelParam === "faculty-involvement" ||
    panelParam === "technologies-innovation" ||
    panelParam === "ordinance-resolutions" ||
    panelParam === "trainings" ||
    panelParam === "accounts" ||
    panelParam === "projects"
      ? panelParam
      : "records";

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard?panel=records&view=project-registration");
    router.prefetch("/dashboard?panel=records&view=project-proposal");
    router.prefetch("/dashboard?panel=unit-coordinators");
    router.prefetch("/dashboard?panel=funding");
    router.prefetch("/dashboard?panel=awards");
    router.prefetch("/dashboard?panel=student-involvement");
    router.prefetch("/dashboard?panel=faculty-involvement");
    router.prefetch("/dashboard?panel=technologies-innovation");
    router.prefetch("/dashboard?panel=ordinance-resolutions");
    router.prefetch("/dashboard?panel=trainings");
    router.prefetch("/dashboard?panel=accounts");
    router.prefetch("/dashboard?panel=projects&view=project-registration");
    router.prefetch("/dashboard?panel=projects&view=project-proposal");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-font-scale", fontScale);
    window.localStorage.setItem("cqer_font_scale", fontScale);
  }, [fontScale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (darkModeEnabled) {
      root.classList.add("dark");
      window.localStorage.setItem("cqer_theme", "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem("cqer_theme", "light");
    }
  }, [darkModeEnabled]);

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
    `dashboard-nav-item h-7 w-full justify-start text-[10px] border ${active ? "border-border/40 bg-muted/30" : "border-transparent"}`;

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-[95rem] mx-auto flex min-h-12 items-center justify-between px-2 sm:px-3 md:px-4 py-1.5">
        <div className="flex items-center gap-2">
          {isDashboard && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-border/40 bg-background"
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
                  className="inline-flex w-fit mt-0.5 rounded-full border border-border/40 bg-background px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/80 cursor-default"
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
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-[10px] cursor-pointer">
                  <Settings className="mr-2 h-3 w-3" />
                  Settings
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-[10px] cursor-pointer">
                      <Type className="mr-2 h-3 w-3" />
                      Accessibility
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuLabel className="text-[10px]">Font Size</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={fontScale}
                        onValueChange={(value) =>
                          setFontScale(value as "small" | "medium" | "large")
                        }
                      >
                        <DropdownMenuRadioItem value="small" className="text-[10px] cursor-pointer">
                          Default (Small)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="medium" className="text-[10px] cursor-pointer">
                          Medium
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="large" className="text-[10px] cursor-pointer">
                          Large
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="text-[10px] cursor-pointer"
                    onSelect={(event) => {
                      event.preventDefault();
                      setDarkModeEnabled((prev) => !prev);
                    }}
                  >
                    <Moon className="mr-2 h-3 w-3" />
                    Dark Mode
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="text-[10px] cursor-pointer"
              >
                <KeyRound className="mr-2 h-3 w-3" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-[10px] cursor-pointer"
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
          className={`fixed top-0 left-0 z-50 h-full w-64 border-r border-border/40 bg-background transition-transform duration-200 ${
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
                  className="dashboard-nav-item h-8 w-full justify-start text-[10px] font-medium"
                  onClick={() => setCreateExpanded((prev) => !prev)}
                >
                  <FolderPlus className="mr-2 h-3.5 w-3.5" />
                  Projects
                </Button>
                {createExpanded && (
                  <div className="space-y-1 pl-2">
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "records" && activeView === "project-registration")}
                      onClick={() => goTo("/dashboard?panel=records&view=project-registration")}
                    >
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Project Registration
                    </Button>
                    <Button
                      variant="ghost"
                      className={navItemClass(activePanel === "records" && activeView === "project-proposal")}
                      onClick={() => goTo("/dashboard?panel=records&view=project-proposal")}
                    >
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Project Proposal
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

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "funding")}
                onClick={() => goTo("/dashboard?panel=funding")}
              >
                <Database className="mr-2 h-3.5 w-3.5" />
                Funding
              </Button>
            )}

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "awards")}
                onClick={() => goTo("/dashboard?panel=awards")}
              >
                <Award className="mr-2 h-3.5 w-3.5" />
                Awards
              </Button>
            )}

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "student-involvement")}
                onClick={() => goTo("/dashboard?panel=student-involvement")}
              >
                <UserRoundCheck className="mr-2 h-3.5 w-3.5" />
                Student Involvement
              </Button>
            )}

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "faculty-involvement")}
                onClick={() => goTo("/dashboard?panel=faculty-involvement")}
              >
                <GraduationCap className="mr-2 h-3.5 w-3.5" />
                Faculty Involvement in ESCE
              </Button>
            )}

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "technologies-innovation")}
                onClick={() => goTo("/dashboard?panel=technologies-innovation")}
              >
                <Cpu className="mr-2 h-3.5 w-3.5" />
                Technologies/Innovation Adapted
              </Button>
            )}

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "ordinance-resolutions")}
                onClick={() => goTo("/dashboard?panel=ordinance-resolutions")}
              >
                <ScrollText className="mr-2 h-3.5 w-3.5" />
                Ordinance or Resolutions
              </Button>
            )}

            {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
              <Button
                variant="ghost"
                className={navItemClass(activePanel === "trainings")}
                onClick={() => goTo("/dashboard?panel=trainings")}
              >
                <BookOpenCheck className="mr-2 h-3.5 w-3.5" />
                Trainings
              </Button>
            )}

            {user.userType === "super_admin" && (
              <>
                <Button
                  variant="ghost"
                  className="dashboard-nav-item h-8 w-full justify-start text-[10px] font-medium"
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
                      className="dashboard-nav-item h-7 w-full justify-start text-[10px] border border-transparent"
                      onClick={() => setSuperProjectsExpanded((prev) => !prev)}
                    >
                      <FolderKanban className="mr-2 h-3.5 w-3.5" />
                      Projects
                    </Button>
                    {superProjectsExpanded && (
                      <div className="space-y-1 pl-2">
                        <Button
                          variant="ghost"
                          className={navItemClass(activePanel === "projects" && activeView === "project-registration")}
                          onClick={() => goTo("/dashboard?panel=projects&view=project-registration")}
                        >
                          <FolderKanban className="mr-2 h-3.5 w-3.5" />
                          Project Registration
                        </Button>
                        <Button
                          variant="ghost"
                          className={navItemClass(activePanel === "projects" && activeView === "project-proposal")}
                          onClick={() => goTo("/dashboard?panel=projects&view=project-proposal")}
                        >
                          <FolderKanban className="mr-2 h-3.5 w-3.5" />
                          Project Proposal
                        </Button>
                      </div>
                    )}
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
