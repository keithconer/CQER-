"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
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
    viewParam === "project-registration" || viewParam === "project-proposal"
      ? viewParam
      : "project-registration";
  const activeAccountView = accountParam === "transfer" ? "transfer" : "register";
  const panelParam = searchParams.get("panel");
  const activePanel =
    panelParam === "unit-coordinators" ||
    panelParam === "account-management" ||
    panelParam === "accounts" ||
    panelParam === "funding" ||
    panelParam === "awards" ||
    panelParam === "student-involvement" ||
    panelParam === "faculty-involvement" ||
    panelParam === "technologies-innovation" ||
    panelParam === "ordinance-resolutions" ||
    panelParam === "trainings" ||
    panelParam === "projects"
    || panelParam === "trainings"
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
        : "Unit Coordinator";
  const deptUnitLabel = user.department
    ? `${user.department}${user.unit ? ` • ${user.unit}` : ""}`
    : null;

  const navItemClass = (active: boolean) =>
    `dashboard-nav-item h-6 w-full justify-start text-[9px] border ${active ? "border-border/40 bg-muted/30" : "border-transparent"}`;
  const isAccountPanel = activePanel === "account-management" || activePanel === "accounts";

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
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
          </div>

          <TooltipProvider delayDuration={150}>
            <ScrollArea className="h-[calc(100vh-48px)]">
              <div className={cn("space-y-1 py-3", sidebarOpen ? "px-2" : "px-0")}>
              {(user.userType === "college_coordinator" || user.userType === "unit_coordinator") && (
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
                                  "h-10 w-10 mx-auto flex p-0 rounded-xl transition-all duration-200",
                                  (activePanel === "records" || createExpanded)
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                              >
                                <FolderPlus className="h-5 w-5 shrink-0" />
                              </Button>
                            </PopoverTrigger>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">Projects</TooltipContent>
                      </Tooltip>
                      <PopoverContent side="right" align="start" className="w-48 p-2 ml-2 bg-background border border-border shadow-md rounded-lg">
                        <div className="space-y-1">
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
                      <span className="text-[9px] font-medium">Projects</span>
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
                    </div>
                  )}
                </>
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
                                  "transition-all duration-200 h-10 w-10 p-0 rounded-xl",
                                  isAccountPanel
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                              >
                                <UserCog className="h-5 w-5 shrink-0" />
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

              {/* Simplified loop for common items */}
              {[
                { panel: "funding", icon: Database, label: "Funding", roles: ["college_coordinator", "unit_coordinator"] },
                { panel: "awards", icon: Award, label: "Awards", roles: ["college_coordinator", "unit_coordinator"] },
                { panel: "student-involvement", icon: UserRoundCheck, label: "Student Involvement", roles: ["college_coordinator", "unit_coordinator"] },
                { panel: "faculty-involvement", icon: GraduationCap, label: "Faculty Involvement", roles: ["college_coordinator", "unit_coordinator"] },
                { panel: "technologies-innovation", icon: Cpu, label: "Technologies", roles: ["college_coordinator", "unit_coordinator"] },
                { panel: "ordinance-resolutions", icon: ScrollText, label: "Ordinance", roles: ["college_coordinator", "unit_coordinator"] },
                { panel: "trainings", icon: BookOpenCheck, label: "Trainings", roles: ["college_coordinator", "unit_coordinator"] },
              ].map((item) => (
                item.roles.includes(user.userType) && (
                  <div key={item.panel} className="flex justify-center w-full">
                    {withTooltip(
                      item.label,
                      <Button
                        variant="ghost"
                        className={cn(
                          "transition-all duration-200",
                          sidebarOpen ? "h-7 w-full justify-start px-3" : "h-10 w-10 p-0 rounded-xl",
                          activePanel === item.panel
                            ? "border border-border/40 bg-muted/30 text-foreground"
                            : "border border-transparent text-foreground"
                        )}
                        onClick={() => goTo(`/dashboard?panel=${item.panel}`)}
                      >
                        <item.icon className={cn("shrink-0", sidebarOpen ? "mr-2 h-3 w-3" : "h-5 w-5")} />
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
                                  "transition-all duration-200 h-10 w-10 p-0 rounded-xl",
                                  isAccountPanel
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                              >
                                <UserCog className="h-5 w-5 shrink-0" />
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
                        sidebarOpen ? "w-full justify-start px-3" : "w-10 h-10 mx-auto flex p-0 rounded-xl",
                        isAccountPanel ? "border border-border/40 bg-muted/30" : "border border-transparent"
                      )}
                      onClick={() => setAccountExpanded((prev) => !prev)}
                    >
                      <UserCog className={cn("shrink-0", sidebarOpen ? "mr-2 h-3.5 w-3.5" : "h-5 w-5")} />
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
                        sidebarOpen ? "w-full justify-start px-3" : "w-10 h-10 mx-auto flex p-0 rounded-xl",
                        recordsExpanded && !sidebarOpen ? "border border-border/40 bg-muted/30" : "border border-transparent"
                      )}
                      onClick={() => setRecordsExpanded((prev) => !prev)}
                    >
                      <Database className={cn("shrink-0", sidebarOpen ? "mr-2 h-3.5 w-3.5" : "h-5 w-5")} />
                      {sidebarOpen && <span className="text-[9px] font-medium">Records</span>}
                    </Button>
                  )}
                  
                  {/* Super admin flattened items when collapsed, nested when expanded */}
                  {(recordsExpanded || !sidebarOpen) && (
                    <div className={cn(sidebarOpen ? "space-y-1 pl-2" : "space-y-1")}>
                      {[
                        { panel: "projects", icon: FolderKanban, label: "Projects" },
                        { panel: "funding", icon: Database, label: "Funding" },
                        { panel: "awards", icon: Award, label: "Awards" },
                        { panel: "student-involvement", icon: UserRoundCheck, label: "Student Involvement" },
                        { panel: "faculty-involvement", icon: GraduationCap, label: "Faculty Involvement" },
                        { panel: "technologies-innovation", icon: Cpu, label: "Technologies" },
                        { panel: "ordinance-resolutions", icon: ScrollText, label: "Ordinance" },
                        { panel: "trainings", icon: BookOpenCheck, label: "Trainings" },
                      ].map((item) => (
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
                                          "transition-all duration-200 h-10 w-10 p-0 rounded-xl",
                                          (activePanel === "projects" && (activeView === "project-registration" || activeView === "project-proposal"))
                                            ? "border border-border/40 bg-muted/30 text-foreground"
                                            : "border border-transparent text-foreground"
                                        )}
                                      >
                                        <item.icon className="shrink-0 h-5 w-5" />
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
                                  sidebarOpen ? "h-6 w-full justify-start px-2" : "h-10 w-10 p-0 rounded-xl",
                                  activePanel === item.panel 
                                    ? "border border-border/40 bg-muted/30 text-foreground"
                                    : "border border-transparent text-foreground"
                                )}
                                onClick={() => (item.panel === "projects" && sidebarOpen) 
                                  ? setSuperProjectsExpanded(!superProjectsExpanded) 
                                  : goTo(`/dashboard?panel=${item.panel}`)}
                              >
                                <item.icon className={cn("shrink-0", sidebarOpen ? "mr-2 h-3 w-3" : "h-5 w-5")} />
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
