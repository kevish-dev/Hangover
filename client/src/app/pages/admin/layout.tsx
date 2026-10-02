import { Outlet, Link, useLocation, Navigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { paymentApi } from "../../../lib/paymentApi";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "../../components/ui/sidebar";
import {
  LogOut,
  Home,
  MapPin,
  Map,
  Database,
  CalendarRange,
  ClipboardCheck,
  CalendarCheck,
  BookOpen,
  CreditCard,
  Star,
  LayoutDashboard,
  Receipt,
  Image,
  BarChart3,
  Tent,
  Users,
  HeartHandshake,
  Mail,
  MessageSquare,
} from "lucide-react";

const overviewItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
];

const crmItems = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Master data", url: "/dashboard/crm-master-data", icon: Database },
  { title: "Itinerary trips", url: "/dashboard/crm-trips", icon: MapPin },
  { title: "Itinerary festivals", url: "/dashboard/crm-festivals", icon: Tent },
  { title: "Interest", url: "/dashboard/interest", icon: HeartHandshake },
  { title: "Inquiries", url: "/dashboard/inquiries", icon: MessageSquare },
  { title: "Bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  { title: "Operations", url: "/dashboard/operations", icon: ClipboardCheck },
  { title: "Balance sheet", url: "/dashboard/ledger", icon: BookOpen },
  { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
  { title: "Invoices", url: "/dashboard/invoices", icon: Receipt },
  { title: "Notifications", url: "/dashboard/notifications", icon: Mail },
];

const websiteItems = [
  { title: "Destinations", url: "/dashboard/destinations", icon: MapPin },
  { title: "Reviews", url: "/dashboard/reviews", icon: Star },
  { title: "Landing Page", url: "/dashboard/landing", icon: Image },
  { title: "Public site", url: "/", icon: Home },
];

export default function AdminLayout() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  const { data: pendingPaymentsData } = useQuery({
    queryKey: ["admin", "payments", "pending_verification_count"],
    queryFn: () => paymentApi.getAllPayments({ limit: 1, status: "PENDING_VERIFICATION" }),
    enabled: !!user && user.role === "ADMIN",
    refetchInterval: 30000,
  });
  const pendingPaymentsCount = pendingPaymentsData?.meta?.total || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-medium text-gray-500">Loading...</div>
      </div>
    );
  }

  // If not logged in or not admin, redirect
  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  const renderItem = (item: { title: string; url: string; icon: any }) => {
    const isActive = item.url === "/"
      ? location.pathname === "/"
      : item.url === "/dashboard"
        ? location.pathname === "/dashboard"
        : location.pathname.startsWith(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <Link to={item.url}>
            <item.icon />
            <span className="flex-1 truncate">{item.title}</span>
            {item.title === "Payments" && pendingPaymentsCount > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                {pendingPaymentsCount}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarProvider>
      <Sidebar
        variant="inset"
        collapsible="icon"
        className="border-r border-gray-200"
      >
        <SidebarHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="size-8 rounded-md bg-[#781216] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg leading-none">
                H
              </span>
            </div>
            <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm">Hangover</span>
              <span className="text-xs text-muted-foreground">
                Admin Portal
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {overviewItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>CRM</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {crmItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Website</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {websiteItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto p-4 border-t border-gray-200">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                tooltip="Log out"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </Sidebar>
      <SidebarInset className="bg-gray-50 flex flex-col flex-1 min-w-0 h-dvh md:h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="w-px h-4 bg-gray-200 mx-2" />
          <h1 className="text-sm font-medium">Dashboard</h1>
        </header>
        <main className="admin-main flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <style>{`
        @media (max-width: 767px) {
          .admin-main {
            overscroll-behavior: contain;
          }
          .admin-main input:not([type="checkbox"]):not([type="radio"]),
          .admin-main select,
          .admin-main textarea,
          [role="dialog"] input:not([type="checkbox"]):not([type="radio"]),
          [role="dialog"] select,
          [role="dialog"] textarea {
            font-size: 16px !important;
          }
          [role="dialog"] {
            overscroll-behavior: contain;
          }
          [role="dialog"] > button.absolute {
            display: flex;
            width: 40px;
            height: 40px;
            align-items: center;
            justify-content: center;
            top: 8px;
            right: 8px;
          }
        }
      `}</style>
    </SidebarProvider>
  );
}
