import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignInButton } from "@clerk/clerk-react";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  FileText,
  Folder,
  Package,
  Truck,
  FlaskConical,
  Users,
  Cog,
  Clock,
  TrendingUp,
  Settings,
  ShoppingCart,
  Mail,
  Palette,
  Bot,
  BellRing,
  Beaker,
  BarChart3,
  CheckCircle2,
  Calendar,
  Factory,
  Sparkles,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

const getMenuItems = (t: (key: string) => string) => [
  { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/" },
  {
    icon: LayoutDashboard,
    label: t("nav.managerDashboard"),
    path: "/manager-dashboard",
  },
  { icon: FileText, label: t("nav.documents"), path: "/documents" },
  { icon: Folder, label: t("nav.projects"), path: "/projects" },
  { icon: Package, label: t("nav.materials"), path: "/materials" },
  { icon: Beaker, label: t("nav.recipes"), path: "/recipes" },
  { icon: Beaker, label: t("nav.mixingLog"), path: "/mixing-log" },
  {
    icon: BarChart3,
    label: t("nav.productionAnalytics"),
    path: "/production-analytics",
  },
  { icon: TrendingUp, label: t("nav.forecasting"), path: "/forecasting" },
  {
    icon: ShoppingCart,
    label: t("nav.purchaseOrders"),
    path: "/purchase-orders",
  },
  { icon: Truck, label: t("nav.deliveries"), path: "/deliveries" },
  { icon: Truck, label: t("nav.driverDeliveries"), path: "/driver-deliveries" },
  { icon: FlaskConical, label: t("nav.qualityControl"), path: "/quality" },
  { icon: Users, label: t("nav.workforce"), path: "/employees" },
  { icon: Cog, label: t("nav.machines"), path: "/machines" },
  { icon: Clock, label: t("nav.timesheets"), path: "/timesheets" },
  {
    icon: CheckCircle2,
    label: t("nav.timesheetApproval"),
    path: "/timesheet-approval",
  },
  {
    icon: Calendar,
    label: t("nav.shiftManagement"),
    path: "/shift-management",
  },
  {
    icon: Clock,
    label: "Workforce Entry",
    path: "/workforce-entry",
  },
  {
    icon: Factory,
    label: "Concrete Base DB",
    path: "/concrete-base-dashboard",
  },
  {
    icon: Package,
    label: "Aggregate Inputs",
    path: "/aggregate-inputs",
  },
  {
    icon: BellRing,
    label: "Low Stock Settings",
    path: "/low-stock-settings",
  },
  { icon: TrendingUp, label: t("nav.reports"), path: "/timesheet-summary" },
  { icon: Mail, label: t("nav.reportSettings"), path: "/report-settings" },
  { icon: Palette, label: t("nav.emailBranding"), path: "/email-branding" },
  { icon: Bot, label: t("nav.aiAssistant"), path: "/ai-assistant" },
  {
    icon: BellRing,
    label: t("nav.notificationTemplates"),
    path: "/notification-templates",
  },
  { icon: Settings, label: t("nav.settings"), path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              {t("auth.loginToContinue")}
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t("auth.loginDescription")}
            </p>
          </div>
          <SignInButton mode="modal">
            <Button
              size="lg"
              className="w-full shadow-lg hover:shadow-xl transition-all"
            >
              {t("auth.login")}
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuItems = getMenuItems(t);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center bg-[#1a1a1a] border-b border-orange-500/20">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-orange-500/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src="/azvirt-logo.png"
                    alt="AzVirt"
                    className="h-8 w-auto"
                  />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-[#1a1a1a]">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-[#1a1a1a] border-t border-orange-500/20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-orange-500/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("nav.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-orange-500/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-end bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <LanguageSwitcher />
          </div>
        )}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        )}
        <main
          className="flex-1 p-4 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url(/azvirt-bg.png)" }}
        >
          {children}
        </main>

        {/* Floating AI Assistant Button */}
        {location !== "/ai-assistant" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setLocation("/ai-assistant")}
                  size="lg"
                  className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all hover:scale-110 z-50 group"
                >
                  <Sparkles className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>AI Assistant</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                  {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} K
                </kbd>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarInset>
    </>
  );
}
