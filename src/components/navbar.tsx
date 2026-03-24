"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { NavbarPageSearch, type NavbarSearchItem } from "@/components/navbar-page-search";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ChevronRight,
  Database,
  Award,
  UserRoundCheck,
  GraduationCap,
  Cpu,
  ScrollText,
  BookOpenCheck,
  Loader2,
  Sun,
  UserCog,
  UserPlus,
  ArrowRightLeft,
  LayoutDashboard,
  Users2,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

interface NavbarProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    userType: string;
    department: string | null;
    unit: string | null;
  };
}

type NavSearchConfig = {
  id: string;
  label: string;
  href: string;
  keywords?: string[];
  description?: string;
  icon: LucideIcon;
  roles: string[];
};

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [isPending, startTransition] = useTransition();

  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createExpanded, setCreateExpanded] = useState(true);
  const [recordsExpanded, setRecordsExpanded] = useState(true);
  const [superProjectsExpanded, setSuperProjectsExpanded] = useState(true);
  const [accountExpanded, setAccountExpanded] = useState(true);
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
  const accountParam = searchParams.get("account");
  const activeView =
    viewParam === "project-registration" || viewParam === "project-proposal" || viewParam === "needs-assessment" || viewParam === "consultancy-extension"
      ? viewParam
      : "project-registration";
  const activeAccountView = accountParam === "transfer" ? "transfer" : "register";
  const panelParam = searchParams.get("panel");
  const activePanel =
    panelParam === "overview" ||
    panelParam === "records" ||
    panelParam === "unit-coordinators" ||
    panelParam === "account-management" ||
    panelParam === "accounts" ||
    panelParam === "funding" ||
    panelParam === "awards" ||
    panelParam === "student-involvement" ||
    panelParam === "faculty-involvement" ||
    panelParam === "community" ||
    panelParam === "technologies-innovation" ||
    panelParam === "ordinance-resolutions" ||
    panelParam === "trainings" ||
    panelParam === "projects"
    || panelParam === "trainings"
      ? panelParam
      : "overview";

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard?panel=overview");
    router.prefetch("/dashboard?panel=community");
    router.prefetch("/dashboard?panel=records&view=project-registration");
    router.prefetch("/dashboard?panel=records&view=project-proposal");
    router.prefetch("/dashboard?panel=records&view=needs-assessment");
    router.prefetch("/dashboard?panel=records&view=consultancy-extension");
    router.prefetch("/dashboard?panel=unit-coordinators");
    router.prefetch("/dashboard?panel=funding");
    router.prefetch("/dashboard?panel=awards");
    router.prefetch("/dashboard?panel=student-involvement");
    router.prefetch("/dashboard?panel=faculty-involvement");
    router.prefetch("/dashboard?panel=technologies-innovation");
    router.prefetch("/dashboard?panel=ordinance-resolutions");
    router.prefetch("/dashboard?panel=trainings");
    router.prefetch("/dashboard?panel=accounts");
    router.prefetch("/dashboard?panel=account-management&account=register");
    router.prefetch("/dashboard?panel=account-management&account=transfer");
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
    startTransition(() => {
      router.push(path);
    });
    setSidebarOpen(false);
  };

  const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || "");
  const roleLabel =
    user.userType === "super_admin"
      ? "Super Admin"
      : user.userType === "college_coordinator"
        ? "College Coordinator"
        : user.userType === "project_leader"
          ? "Project Leader"
          : user.userType === "extension_office"
            ? "Extension Office"
            : "Unit Coordinator";
  const deptUnitLabel = user.department
    ? `${user.department}${user.unit ? ` • ${user.unit}` : ""}`
    : null;

  const navItemClass = (active: boolean) =>
    `dashboard-nav-item h-6 w-full justify-start text-[9px] border ${active ? "border-border/40 bg-muted/30" : "border-transparent"}`;
  const isAccountPanel = activePanel === "account-management" || activePanel === "accounts";
  const collapsedButtonClass = "h-9 w-9 p-0 rounded-xl";
  const collapsedIconClass = "h-4 w-4";
  const commonPanelItems: {
    panel: string;
    icon: LucideIcon;
    label: string;
    roles: string[];
  }[] = [
    { panel: "trainings", icon: BookOpenCheck, label: "Trainings", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
    { panel: "funding", icon: Database, label: "Funding", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
    { panel: "awards", icon: Award, label: "Awards", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
    { panel: "student-involvement", icon: UserRoundCheck, label: "Student Involvement", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
    { panel: "faculty-involvement", icon: GraduationCap, label: "Faculty Involvement", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
    { panel: "technologies-innovation", icon: Cpu, label: "Technologies", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
    { panel: "ordinance-resolutions", icon: ScrollText, label: "Ordinance", roles: ["college_coordinator", "unit_coordinator", "extension_office"] },
  ];
  const superAdminRecordItems = [
    { panel: "projects", icon: FolderKanban, label: "Projects" },
    { panel: "trainings", icon: BookOpenCheck, label: "Trainings" },
    { panel: "funding", icon: Database, label: "Funding" },
    { panel: "awards", icon: Award, label: "Awards" },
    { panel: "student-involvement", icon: UserRoundCheck, label: "Student Involvement" },
    { panel: "faculty-involvement", icon: GraduationCap, label: "Faculty Involvement" },
    { panel: "technologies-innovation", icon: Cpu, label: "Technologies" },
    { panel: "ordinance-resolutions", icon: ScrollText, label: "Ordinance" },
  ] as const;
  const searchItems = useMemo<NavbarSearchItem[]>(() => {
    const items: NavSearchConfig[] = [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard?panel=overview",
        keywords: ["home", "overview", "main"],
        description: "Go to the main dashboard overview.",
        icon: LayoutDashboard,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office", "project_leader"],
      },
      {
        id: "community",
        label: "CQER Community",
        href: "/dashboard?panel=community",
        keywords: ["community", "announcements", "social", "feed", "ceit"],
        description: "Open the CQER Community announcement feed.",
        icon: Users2,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "account-management",
        label: "Account Management",
        href: "/dashboard?panel=account-management&account=register",
        keywords: ["accounts", "register", "manage users"],
        description: "Open the coordinator account management page.",
        icon: UserCog,
        roles: ["super_admin", "college_coordinator"],
      },
      {
        id: "account-transfer",
        label: user.userType === "super_admin" ? "Transfer College Coordinator Role" : "Transfer Unit Coordinator Role",
        href: "/dashboard?panel=account-management&account=transfer",
        keywords: ["transfer", "account handover", "role transfer"],
        description: "Transfer coordinator responsibilities to another account.",
        icon: ArrowRightLeft,
        roles: ["super_admin", "college_coordinator"],
      },
      {
        id: "records",
        label: "Records",
        href: "/dashboard?panel=records&view=project-registration",
        keywords: ["records", "project registration", "proposal records"],
        description: "Open the records section.",
        icon: FolderPlus,
        roles: ["college_coordinator", "unit_coordinator", "extension_office", "project_leader"],
      },
      {
        id: "projects",
        label: "Projects",
        href: user.userType === "super_admin"
          ? "/dashboard?panel=projects&view=project-registration"
          : "/dashboard?panel=records&view=project-registration",
        keywords: ["project registration", "projects folder", "project page"],
        description: "Open the projects page.",
        icon: FolderKanban,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office", "project_leader"],
      },
      {
        id: "project-proposals",
        label: "Project Proposals",
        href: user.userType === "super_admin"
          ? "/dashboard?panel=projects&view=project-proposal"
          : "/dashboard?panel=records&view=project-proposal",
        keywords: ["proposal", "project proposal", "proposals"],
        description: "Open the project proposal page.",
        icon: FolderKanban,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office", "project_leader"],
      },
      {
        id: "consultancy-extension",
        label: "Consultancy Extension",
        href: "/dashboard?panel=records&view=consultancy-extension",
        keywords: ["consultancy", "extension", "consultation"],
        description: "Open the consultancy extension page.",
        icon: FolderKanban,
        roles: ["project_leader"],
      },
      {
        id: "trainings",
        label: "Trainings",
        href: "/dashboard?panel=trainings",
        keywords: ["training", "seminar", "workshop"],
        description: "Open trainings management.",
        icon: BookOpenCheck,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "funding",
        label: "Funding",
        href: "/dashboard?panel=funding",
        keywords: ["budget", "finance", "funding"],
        description: "Open funding records and analysis.",
        icon: Database,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "awards",
        label: "Awards",
        href: "/dashboard?panel=awards",
        keywords: ["recognition", "awards"],
        description: "Open awards management.",
        icon: Award,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "student-involvement",
        label: "Student Involvement",
        href: "/dashboard?panel=student-involvement",
        keywords: ["students", "student activities"],
        description: "Open student involvement records.",
        icon: UserRoundCheck,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "faculty-involvement",
        label: "Faculty Involvement",
        href: "/dashboard?panel=faculty-involvement",
        keywords: ["faculty", "pool of experts", "faculty records"],
        description: "Open faculty involvement records.",
        icon: GraduationCap,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "technologies",
        label: "Technologies",
        href: "/dashboard?panel=technologies-innovation",
        keywords: ["technology", "innovation", "technologies"],
        description: "Open technologies and innovations.",
        icon: Cpu,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "ordinance",
        label: "Ordinance",
        href: "/dashboard?panel=ordinance-resolutions",
        keywords: ["ordinance", "resolution", "ordinances"],
        description: "Open ordinance and resolution records.",
        icon: ScrollText,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office"],
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        keywords: ["password", "preferences", "change password"],
        description: "Open account settings.",
        icon: Settings,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "extension_office", "project_leader"],
      },
    ];

    return items.filter((item) => item.roles.includes(user.userType));
  }, [user.userType]);

  const withTooltip = (label: string, content: ReactNode) => {
    if (sidebarOpen) return content;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <>
      <header className="dashboard-header border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-30">
        <div className="max-w-[95rem] mx-auto flex min-h-12 items-center justify-between px-2 sm:px-3 md:px-4 py-1.5">
        <div className={cn("flex items-center gap-2 transition-opacity duration-200", sidebarOpen && isDashboard ? "opacity-0 invisible pointer-events-none" : "opacity-100 visible")}>
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
          <NavbarPageSearch items={searchItems} onNavigate={goTo} />
          <NotificationBell userId={user.id} />
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
              <button className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer">
                <Settings className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[9px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-[9px] cursor-pointer">
                  <Settings className="mr-2 h-2.5 w-2.5" />
                  Settings
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-[9px] cursor-pointer">
                      <Type className="mr-2 h-2.5 w-2.5" />
                      Accessibility
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuLabel className="text-[9px]">Font Size</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={fontScale}
                        onValueChange={(value) =>
                          setFontScale(value as "small" | "medium" | "large")
                        }
                      >
                        <DropdownMenuRadioItem value="small" className="text-[9px] cursor-pointer">
                          Default (Small)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="medium" className="text-[9px] cursor-pointer">
                          Medium
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="large" className="text-[9px] cursor-pointer">
                          Large
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="text-[9px] cursor-pointer"
                    onSelect={(event) => {
                      event.preventDefault();
                      setDarkModeEnabled((prev) => !prev);
                    }}
                  >
                    {darkModeEnabled ? (
                      <><Sun className="mr-2 h-2.5 w-2.5" /> Light Mode</>
                    ) : (
                      <><Moon className="mr-2 h-2.5 w-2.5" /> Dark Mode</>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="text-[9px] cursor-pointer"
              >
                <KeyRound className="mr-2 h-2.5 w-2.5" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-[9px] cursor-pointer"
              >
                <LogOut className="mr-2 h-2.5 w-2.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

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
          className={cn(
            "fixed top-0 left-0 z-50 h-full border-r border-border/40 bg-background transition-[width] duration-300 ease-in-out",
            sidebarOpen ? "w-64" : "w-16"
          )}
        >
          <div className={cn(
            "flex h-12 items-center border-b border-border/40 px-3 transition-all duration-300",
            sidebarOpen ? "justify-between" : "justify-center"
          )}>
            {sidebarOpen ? (
              <>
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
                  <PanelLeftClose className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <TooltipProvider delayDuration={150}>
            <ScrollArea className="h-[calc(100vh-48px)]">
              <div className={cn("space-y-1 py-3", sidebarOpen ? "px-2" : "px-0")}>
              <div className="flex justify-center w-full">
                {withTooltip(
                  "Dashboard",
                  <Button
                    variant="ghost"
                    className={cn(
                      "transition-all duration-200",
                      sidebarOpen ? "h-7 w-full justify-start px-3" : collapsedButtonClass,
                      activePanel === "overview"
                        ? "border border-border/40 bg-muted/30 text-foreground"
                        : "border border-transparent text-foreground"
                    )}
                    onClick={() => goTo("/dashboard?panel=overview")}
                  >
                    <LayoutDashboard className={cn("shrink-0", sidebarOpen ? "mr-2 h-3 w-3" : collapsedIconClass)} />
                    {sidebarOpen && <span className="text-[9px] font-medium">Dashboard</span>}
                  </Button>
                )}
              </div>
              {["super_admin", "college_coordinator", "unit_coordinator", "extension_office"].includes(user.userType) && (
                <div className="flex justify-center w-full">
                  {withTooltip(
                    "CQER Community",
                    <Button
                      variant="ghost"
                      className={cn(
                        "transition-all duration-200",
                        sidebarOpen ? "h-7 w-full justify-start px-3" : collapsedButtonClass,
                        activePanel === "community"
                          ? "border border-border/40 bg-muted/30 text-foreground"
                          : "border border-transparent text-foreground"
                      )}
                      onClick={() => goTo("/dashboard?panel=community")}
                    >
                      <Users2 className={cn("shrink-0", sidebarOpen ? "mr-2 h-3 w-3" : collapsedIconClass)} />
                      {sidebarOpen && <span className="text-[9px] font-medium">CQER Community</span>}
                    </Button>
                  )}
                </div>
              )}
              {user.userType === "college_coordinator" && (
                <>
                  {!sidebarOpen ? (
                    <Popover>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center w-full">
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  `transition-all duration-200 ${collapsedButtonClass}`,
                                  isAccountPanel
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                              >
                                <UserCog className={`${collapsedIconClass} shrink-0`} />
                              </Button>
                            </PopoverTrigger>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">Account Management</TooltipContent>
                      </Tooltip>
                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-56 p-2 ml-2 bg-background border border-border shadow-md rounded-lg"
                      >
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            className={navItemClass(isAccountPanel && activeAccountView === "register")}
                            onClick={() => goTo("/dashboard?panel=account-management&account=register")}
                          >
                            <UserPlus className="mr-2 h-3 w-3" />
                            Register Unit Coordinators
                          </Button>
                          <Button
                            variant="ghost"
                            className={navItemClass(isAccountPanel && activeAccountView === "transfer")}
                            onClick={() => goTo("/dashboard?panel=account-management&account=transfer")}
                          >
                            <ArrowRightLeft className="mr-2 h-3 w-3" />
                            Transfer Unit Coordinator Role
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 transition-all duration-200 w-full justify-start px-3",
                        isAccountPanel ? "border border-border/40 bg-muted/30" : "border border-transparent"
                      )}
                      onClick={() => setAccountExpanded((prev) => !prev)}
                    >
                      <UserCog className="mr-2 h-3.5 w-3.5 shrink-0" />
                      <span className="text-[9px] font-medium">Account Management</span>
                    </Button>
                  )}
                  {accountExpanded && sidebarOpen && (
                    <div className="space-y-1 pl-2">
                      <Button
                        variant="ghost"
                        className={navItemClass(isAccountPanel && activeAccountView === "register")}
                        onClick={() => goTo("/dashboard?panel=account-management&account=register")}
                      >
                        <UserPlus className="mr-2 h-3 w-3" />
                        Register Unit Coordinators
                      </Button>
                      <Button
                        variant="ghost"
                        className={navItemClass(isAccountPanel && activeAccountView === "transfer")}
                        onClick={() => goTo("/dashboard?panel=account-management&account=transfer")}
                      >
                        <ArrowRightLeft className="mr-2 h-3 w-3" />
                        Transfer Unit Coordinator Role
                      </Button>
                    </div>
                  )}
                </>
              )}

              {(["college_coordinator", "unit_coordinator", "extension_office", "project_leader"].includes(user.userType)) && (
                <>
                  {!sidebarOpen ? (
                    <Popover>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center w-full">
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  `${collapsedButtonClass} mx-auto flex transition-all duration-200`,
                                  (activePanel === "records" || createExpanded)
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                              >
                                <FolderPlus className={`${collapsedIconClass} shrink-0`} />
                              </Button>
                            </PopoverTrigger>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">Records</TooltipContent>
                      </Tooltip>
                      <PopoverContent side="right" align="start" className="w-48 p-2 ml-2 bg-background border border-border shadow-md rounded-lg">
                        <div className="space-y-1">
                          {user.userType === "project_leader" && (
                            <>
                              <Button
                                variant="ghost"
                                className={navItemClass(activePanel === "records" && activeView === "project-registration")}
                                onClick={() => goTo("/dashboard?panel=records&view=project-registration")}
                              >
                                <FolderKanban className="mr-2 h-3 w-3" />
                                Project Registration
                              </Button>
                              <Button
                                variant="ghost"
                                className={navItemClass(activePanel === "records" && activeView === "project-proposal")}
                                onClick={() => goTo("/dashboard?panel=records&view=project-proposal")}
                              >
                                <FolderKanban className="mr-2 h-3 w-3" />
                                Project Proposal
                              </Button>
                              <Button
                                variant="ghost"
                                className={navItemClass(activePanel === "records" && activeView === "needs-assessment")}
                                onClick={() => goTo("/dashboard?panel=records&view=needs-assessment")}
                              >
                                <FolderKanban className="mr-2 h-3 w-3" />
                                Needs Assessment
                              </Button>
                              <Button
                                variant="ghost"
                                className={navItemClass(activePanel === "records" && activeView === "consultancy-extension")}
                                onClick={() => goTo("/dashboard?panel=records&view=consultancy-extension")}
                              >
                                <FolderKanban className="mr-2 h-3 w-3" />
                                Consultancy Extension
                              </Button>
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 transition-all duration-200 w-full justify-start px-3",
                        (activePanel === "records" || createExpanded) ? "border border-border/40 bg-muted/30" : "border border-transparent"
                      )}
                      onClick={() => setCreateExpanded((prev) => !prev)}
                    >
                      <FolderPlus className="mr-2 h-3.5 w-3.5 shrink-0" />
                      <span className="text-[9px] font-medium">Records</span>
                      <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform duration-200", createExpanded && "rotate-90")} />
                    </Button>
                  )}
                  {createExpanded && sidebarOpen && (
                    <div className="space-y-1 pl-2">
                      <Button
                        variant="ghost"
                        className={navItemClass(activePanel === "records" && activeView === "project-registration")}
                        onClick={() => goTo("/dashboard?panel=records&view=project-registration")}
                      >
                        <FolderKanban className="mr-2 h-3 w-3" />
                        Project Registration
                      </Button>
                      <Button
                        variant="ghost"
                        className={navItemClass(activePanel === "records" && activeView === "project-proposal")}
                        onClick={() => goTo("/dashboard?panel=records&view=project-proposal")}
                      >
                        <FolderKanban className="mr-2 h-3 w-3" />
                        Project Proposal
                      </Button>
                      {user.userType === "project_leader" && (
                        <Button
                          variant="ghost"
                          className={navItemClass(activePanel === "records" && activeView === "needs-assessment")}
                          onClick={() => goTo("/dashboard?panel=records&view=needs-assessment")}
                        >
                          <FolderKanban className="mr-2 h-3 w-3" />
                          Needs Assessment
                        </Button>
                      )}
                      {user.userType === "project_leader" && (
                        <Button
                          variant="ghost"
                          className={navItemClass(activePanel === "records" && activeView === "consultancy-extension")}
                          onClick={() => goTo("/dashboard?panel=records&view=consultancy-extension")}
                        >
                          <FolderKanban className="mr-2 h-3 w-3" />
                          Consultancy Extension
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Simplified loop for common items */}
              {commonPanelItems.map((item) => (
                item.roles.includes(user.userType) && (
                  <div key={item.panel} className="flex justify-center w-full">
                    {withTooltip(
                      item.label,
                      <Button
                        variant="ghost"
                        className={cn(
                          "transition-all duration-200",
                          sidebarOpen ? "h-7 w-full justify-start px-3" : collapsedButtonClass,
                          activePanel === item.panel
                            ? "border border-border/40 bg-muted/30 text-foreground"
                            : "border border-transparent text-foreground"
                        )}
                        onClick={() => goTo(`/dashboard?panel=${item.panel}`)}
                      >
                        <item.icon className={cn("shrink-0", sidebarOpen ? "mr-2 h-3 w-3" : collapsedIconClass)} />
                        {sidebarOpen && <span className="text-[9px]">{item.label}</span>}
                      </Button>
                    )}
                  </div>
                )
              ))}

              {user.userType === "super_admin" && (
                <>
                  {!sidebarOpen ? (
                    <Popover>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center w-full">
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  `transition-all duration-200 ${collapsedButtonClass}`,
                                  isAccountPanel
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                              >
                                <UserCog className={`${collapsedIconClass} shrink-0`} />
                              </Button>
                            </PopoverTrigger>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">Account Management</TooltipContent>
                      </Tooltip>
                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-56 p-2 ml-2 bg-background border border-border shadow-md rounded-lg"
                      >
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            className={navItemClass(isAccountPanel && activeAccountView === "register")}
                            onClick={() => goTo("/dashboard?panel=account-management&account=register")}
                          >
                            <UserPlus className="mr-2 h-3 w-3" />
                            Register College Coordinators
                          </Button>
                          <Button
                            variant="ghost"
                            className={navItemClass(isAccountPanel && activeAccountView === "transfer")}
                            onClick={() => goTo("/dashboard?panel=account-management&account=transfer")}
                          >
                            <ArrowRightLeft className="mr-2 h-3 w-3" />
                            Transfer College Coordinator Role
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 transition-all duration-200",
                        sidebarOpen ? "w-full justify-start px-3" : `${collapsedButtonClass} mx-auto flex`,
                        isAccountPanel ? "border border-border/40 bg-muted/30" : "border border-transparent"
                      )}
                      onClick={() => setAccountExpanded((prev) => !prev)}
                    >
                      <UserCog className={cn("shrink-0", sidebarOpen ? "mr-2 h-3.5 w-3.5" : collapsedIconClass)} />
                      {sidebarOpen && <span className="text-[9px] font-medium">Account Management</span>}
                    </Button>
                  )}
                  {accountExpanded && sidebarOpen && (
                    <div className="space-y-1 pl-2">
                      <Button
                        variant="ghost"
                        className={navItemClass(isAccountPanel && activeAccountView === "register")}
                        onClick={() => goTo("/dashboard?panel=account-management&account=register")}
                      >
                        <UserPlus className="mr-2 h-3 w-3" />
                        Register College Coordinators
                      </Button>
                      <Button
                        variant="ghost"
                        className={navItemClass(isAccountPanel && activeAccountView === "transfer")}
                        onClick={() => goTo("/dashboard?panel=account-management&account=transfer")}
                      >
                        <ArrowRightLeft className="mr-2 h-3 w-3" />
                        Transfer College Coordinator Role
                      </Button>
                    </div>
                  )}
                  {withTooltip(
                    "Records",
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-8 transition-all duration-200",
                        sidebarOpen ? "w-full justify-start px-3" : `${collapsedButtonClass} mx-auto flex`,
                        recordsExpanded && !sidebarOpen ? "border border-border/40 bg-muted/30" : "border border-transparent"
                      )}
                      onClick={() => setRecordsExpanded((prev) => !prev)}
                    >
                      <Database className={cn("shrink-0", sidebarOpen ? "mr-2 h-3.5 w-3.5" : collapsedIconClass)} />
                      {sidebarOpen && <span className="text-[9px] font-medium">Records</span>}
                    </Button>
                  )}
                  
                  {/* Super admin flattened items when collapsed, nested when expanded */}
                  {(recordsExpanded || !sidebarOpen) && (
                    <div className={cn(sidebarOpen ? "space-y-1 pl-2" : "space-y-1")}>
                      {superAdminRecordItems.map((item) => (
                        <div key={item.panel} className="w-full">
                          <div className="flex justify-center w-full">
                            {item.panel === "projects" && !sidebarOpen ? (
                            <Popover>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex justify-center w-full">
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className={cn(
                                          `transition-all duration-200 ${collapsedButtonClass}`,
                                          (activePanel === "projects" && (activeView === "project-registration" || activeView === "project-proposal"))
                                            ? "border border-border/40 bg-muted/30 text-foreground"
                                            : "border border-transparent text-foreground"
                                        )}
                                      >
                                        <item.icon className={`shrink-0 ${collapsedIconClass}`} />
                                      </Button>
                                    </PopoverTrigger>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">{item.label}</TooltipContent>
                              </Tooltip>
                              <PopoverContent side="right" align="start" className="w-48 p-2 ml-2 bg-background border border-border shadow-md rounded-lg">
                                <div className="space-y-1">
                                  <Button
                                    variant="ghost"
                                    className={navItemClass(activePanel === "projects" && activeView === "project-registration")}
                                    onClick={() => goTo("/dashboard?panel=projects&view=project-registration")}
                                  >
                                    <FolderKanban className="mr-2 h-3 w-3" />
                                    Project Registration
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className={navItemClass(activePanel === "projects" && activeView === "project-proposal")}
                                    onClick={() => goTo("/dashboard?panel=projects&view=project-proposal")}
                                  >
                                    <FolderKanban className="mr-2 h-3 w-3" />
                                    Project Proposal
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            withTooltip(
                              item.label,
                              <Button
                                variant="ghost"
                                className={cn(
                                  "transition-all duration-200",
                                  sidebarOpen ? "h-6 w-full justify-start px-2" : collapsedButtonClass,
                                  activePanel === item.panel 
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                                onClick={() => (item.panel === "projects" && sidebarOpen) 
                                  ? setSuperProjectsExpanded(!superProjectsExpanded) 
                                  : goTo(`/dashboard?panel=${item.panel}`)}
                              >
                                <item.icon className={cn("shrink-0", sidebarOpen ? "mr-2 h-3 w-3" : collapsedIconClass)} />
                                {sidebarOpen && <span className="text-[9px]">{item.label}</span>}
                              </Button>
                            )
                          )}
                          </div>
                          {item.panel === "projects" && sidebarOpen && superProjectsExpanded && (
                            <div className="space-y-1 pl-2">
                              <Button
                                variant="ghost"
                                className={navItemClass(activePanel === "projects" && activeView === "project-registration")}
                                onClick={() => goTo("/dashboard?panel=projects&view=project-registration")}
                              >
                                <FolderKanban className="mr-2 h-3 w-3" />
                                Project Registration
                              </Button>
                              <Button
                                variant="ghost"
                                className={navItemClass(activePanel === "projects" && activeView === "project-proposal")}
                                onClick={() => goTo("/dashboard?panel=projects&view=project-proposal")}
                              >
                                <FolderKanban className="mr-2 h-3 w-3" />
                                Project Proposal
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              </div>
            </ScrollArea>
          </TooltipProvider>
        </aside>
      )}

      {isPending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center p-6 bg-background rounded-xl border shadow-lg gap-4 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 animate-pulse">
              <Image src="/CQERFINAL.png" alt="CQER Logo" fill className="object-contain" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-medium">Loading...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
