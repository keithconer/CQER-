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
  FolderKanban,
  BookOpenCheck,
  Loader2,
  Sun,
  UserCog,
  UserPlus,
  LayoutDashboard,
  Users2,
  Download,
  BriefcaseBusiness,
  Wrench,
  Factory,
  Cpu,
  Megaphone,
  Wallet,
  Landmark,
  ClipboardCheck,
  Newspaper,
  Trophy,
  NotepadText,
  UserRoundPlus,
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
  const panelParam = searchParams.get("panel");
  const activePanel: string =
    panelParam === "overview" ||
    panelParam === "account-management" ||
    panelParam === "accounts" ||
    panelParam === "community" ||
    panelParam === "backup" ||
    panelParam === "trainings" ||
    panelParam === "consultancy" ||
    panelParam === "technical-advisory" ||
    panelParam === "adopters-with-enterprise" ||
    panelParam === "technologies-innovations-commercialized" ||
    panelParam === "iec-materials" ||
    panelParam === "budget-utilization" ||
    panelParam === "ordinance-resolution" ||
    panelParam === "impact-assessment" ||
    panelParam === "project-leader-records" ||
    panelParam === "extension-program" ||
    panelParam === "awards-recognition" ||
    panelParam === "other-activities" ||
    panelParam === "projects"
      ? panelParam
      : "overview";

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/dashboard?panel=overview");
    router.prefetch("/dashboard?panel=community");
    router.prefetch("/dashboard?panel=backup");
    router.prefetch("/dashboard?panel=trainings");
    router.prefetch("/dashboard?panel=consultancy");
    router.prefetch("/dashboard?panel=technical-advisory");
    router.prefetch("/dashboard?panel=adopters-with-enterprise");
    router.prefetch("/dashboard?panel=technologies-innovations-commercialized");
    router.prefetch("/dashboard?panel=iec-materials");
    router.prefetch("/dashboard?panel=budget-utilization");
    router.prefetch("/dashboard?panel=ordinance-resolution");
    router.prefetch("/dashboard?panel=impact-assessment");
    router.prefetch("/dashboard?panel=project-leader-records");
    router.prefetch("/dashboard?panel=extension-program");
    router.prefetch("/dashboard?panel=awards-recognition");
    router.prefetch("/dashboard?panel=other-activities");
    router.prefetch("/dashboard?panel=accounts");
    router.prefetch("/dashboard?panel=account-management&account=register");
    router.prefetch("/dashboard?panel=projects&view=project-registration");
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
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
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
        id: "project-registration",
        label: "Project Registration",
        href: "/dashboard?panel=projects&view=project-registration",
        keywords: ["project registration", "project leader", "projects folder", "project page"],
        description: "Open the project registration page.",
        icon: FolderKanban,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "budget-utilization",
        label: "Budget Utilization",
        href: "/dashboard?panel=budget-utilization",
        keywords: ["budget", "utilization", "expenses", "spent", "spending"],
        description: "Open the budget utilization page.",
        icon: Wallet,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "ordinance-resolution",
        label: "Ordinance / Resolution",
        href: "/dashboard?panel=ordinance-resolution",
        keywords: ["ordinance", "resolution", "approval", "endorsed", "policy"],
        description: "Open the ordinance and resolution page.",
        icon: Landmark,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "impact-assessment",
        label: "Impact Assessment",
        href: "/dashboard?panel=impact-assessment",
        keywords: ["impact", "assessment", "evaluation", "lead evaluator", "needs assessment"],
        description: "Open the impact and assessment page.",
        icon: ClipboardCheck,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "project-leader-records",
        label: "Project Leader Registration",
        href: "/dashboard?panel=project-leader-records",
        keywords: ["project leader registration", "project leader records", "designation records"],
        description: "Open the unit coordinator project leader records page.",
        icon: UserRoundPlus,
        roles: ["unit_coordinator"],
      },
      {
        id: "extension-program",
        label: "Extension Program",
        href: "/dashboard?panel=extension-program",
        keywords: ["extension", "program", "featured", "media", "ppa"],
        description: "Open the extension program page.",
        icon: Newspaper,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "awards-recognition",
        label: "Awards and Recognition",
        href: "/dashboard?panel=awards-recognition",
        keywords: ["awards", "recognition", "award", "conference", "donor"],
        description: "Open the awards and recognition page.",
        icon: Trophy,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "other-activities",
        label: "Other Activities",
        href: "/dashboard?panel=other-activities",
        keywords: ["other activities", "meeting", "workshop", "planning", "outreach"],
        description: "Open the other activities page.",
        icon: NotepadText,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "backup",
        label: "Create Backup",
        href: "/dashboard?panel=backup",
        keywords: ["backup", "restore", "import", "export"],
        description: "Export your created records and import them later.",
        icon: Download,
        roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
      },
      {
        id: "trainings",
        label: "Trainings",
        href: "/dashboard?panel=trainings",
        keywords: ["training", "trainings"],
        description: "Open the trainings page.",
        icon: BookOpenCheck,
        roles: ["project_leader", "unit_coordinator", "college_coordinator"],
      },
      {
        id: "consultancy",
        label: "Consultancy",
        href: "/dashboard?panel=consultancy",
        keywords: ["consultancy", "consulting", "consultancy records"],
        description: "Open the consultancy page.",
        icon: BriefcaseBusiness,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "technical-advisory",
        label: "Technical Advisory",
        href: "/dashboard?panel=technical-advisory",
        keywords: ["technical advisory", "advisory", "technical advisory services"],
        description: "Open the technical advisory page.",
        icon: Wrench,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "adopters-with-enterprise",
        label: "Adopters with Enterprise",
        href: "/dashboard?panel=adopters-with-enterprise",
        keywords: ["adopters", "enterprise", "adopters with enterprise"],
        description: "Open the adopters with enterprise page.",
        icon: Factory,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "technologies-innovations-commercialized",
        label: "Technologies / Innovations Commercialized",
        href: "/dashboard?panel=technologies-innovations-commercialized",
        keywords: ["technologies", "innovations", "commercialized", "technology commercialization"],
        description: "Open the technologies / innovations commercialized page.",
        icon: Cpu,
        roles: ["project_leader", "college_coordinator"],
      },
      {
        id: "iec-materials",
        label: "IEC Materials",
        href: "/dashboard?panel=iec-materials",
        keywords: ["iec", "iec materials", "information education communication"],
        description: "Open the IEC materials page.",
        icon: Megaphone,
        roles: ["project_leader", "college_coordinator"],
      },
    ];

    return items.filter((item) => item.roles.includes(user.userType));
  }, [user.userType]);

  const sidebarSections = useMemo(
    () => [
      {
        id: "general",
        label: "General",
        items: [
          {
            label: "Dashboard",
            panel: "overview",
            href: "/dashboard?panel=overview",
            icon: LayoutDashboard,
            roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
          },
          {
            label: "CQER Community",
            panel: "community",
            href: "/dashboard?panel=community",
            icon: Users2,
            roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
          },
          {
            label: "Create Backup",
            panel: "backup",
            href: "/dashboard?panel=backup",
            icon: Download,
            roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
          },
        ],
      },
      {
        id: "records",
        label: "Records",
        items: [
          {
            label: "Project Registration",
            panel: "projects",
            href: "/dashboard?panel=projects&view=project-registration",
            icon: FolderKanban,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Budget Utilization",
            panel: "budget-utilization",
            href: "/dashboard?panel=budget-utilization",
            icon: Wallet,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Ordinance / Resolution",
            panel: "ordinance-resolution",
            href: "/dashboard?panel=ordinance-resolution",
            icon: Landmark,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Impact Assessment",
            panel: "impact-assessment",
            href: "/dashboard?panel=impact-assessment",
            icon: ClipboardCheck,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Project Leader Registration",
            panel: "project-leader-records",
            href: "/dashboard?panel=project-leader-records",
            icon: UserRoundPlus,
            roles: ["unit_coordinator"],
          },
          {
            label: "Extension Program",
            panel: "extension-program",
            href: "/dashboard?panel=extension-program",
            icon: Newspaper,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Awards and Recognition",
            panel: "awards-recognition",
            href: "/dashboard?panel=awards-recognition",
            icon: Trophy,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Other Activities",
            panel: "other-activities",
            href: "/dashboard?panel=other-activities",
            icon: NotepadText,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Trainings",
            panel: "trainings",
            href: "/dashboard?panel=trainings",
            icon: BookOpenCheck,
            roles: ["project_leader", "unit_coordinator", "college_coordinator"],
          },
          {
            label: "Consultancy",
            panel: "consultancy",
            href: "/dashboard?panel=consultancy",
            icon: BriefcaseBusiness,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Technical Advisory",
            panel: "technical-advisory",
            href: "/dashboard?panel=technical-advisory",
            icon: Wrench,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Adopters with Enterprise",
            panel: "adopters-with-enterprise",
            href: "/dashboard?panel=adopters-with-enterprise",
            icon: Factory,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "Technologies / Innovations Commercialized",
            panel: "technologies-innovations-commercialized",
            href: "/dashboard?panel=technologies-innovations-commercialized",
            icon: Cpu,
            roles: ["project_leader", "college_coordinator"],
          },
          {
            label: "IEC Materials",
            panel: "iec-materials",
            href: "/dashboard?panel=iec-materials",
            icon: Megaphone,
            roles: ["project_leader", "college_coordinator"],
          },
        ],
      },
    ],
    []
  );
  const showAccountSection = user.userType === "super_admin" || user.userType === "college_coordinator";
  const accountRegistrationLabel = user.userType === "super_admin" ? "Register College Coordinators" : "Register Unit Coordinators";

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
              <div className={cn("space-y-3 py-3", sidebarOpen ? "px-2" : "px-0")}>
                {sidebarSections.map((section) => {
                  const items = section.items.filter((item) => item.roles.includes(user.userType));
                  if (items.length === 0) return null;
                  return (
                    <div key={section.id} className="space-y-1">
                      {items.map((item) => (
                        <div key={item.label} className="flex justify-center w-full">
                          {withTooltip(
                            item.label,
                            <Button
                              variant="ghost"
                              className={cn(
                                "transition-all duration-200",
                                sidebarOpen ? "h-8 w-full justify-start px-3" : collapsedButtonClass,
                                activePanel === item.panel
                                  ? "border border-border/40 bg-muted/30 text-foreground"
                                  : "border border-transparent text-foreground"
                              )}
                              onClick={() => goTo(item.href)}
                            >
                              <item.icon className={cn("shrink-0", sidebarOpen ? "mr-2 h-3.5 w-3.5" : collapsedIconClass)} />
                              {sidebarOpen && <span className="text-[9px] font-medium">{item.label}</span>}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {showAccountSection && (
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
                            className={navItemClass(isAccountPanel)}
                            onClick={() => goTo("/dashboard?panel=account-management&account=register")}
                          >
                            <UserPlus className="mr-2 h-3 w-3" />
                            {accountRegistrationLabel}
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
                    <div className="space-y-1 px-2 pb-3">
                      <Button
                        variant="ghost"
                        className={navItemClass(isAccountPanel)}
                        onClick={() => goTo("/dashboard?panel=account-management&account=register")}
                      >
                        <UserPlus className="mr-2 h-3 w-3" />
                        {accountRegistrationLabel}
                      </Button>
                    </div>
                  )}
                </>
              )}
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
