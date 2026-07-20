import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "../../../contexts/AuthContext";
import { Navigate } from "react-router";
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
  CalendarRange,
  ClipboardCheck,
  CalendarCheck,
  BookOpen,
  CreditCard,
  Star,
  LayoutDashboard,
  Receipt,
} from "lucide-react";

const navItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Destinations", url: "/dashboard/destinations", icon: MapPin },
  { title: "Circuits", url: "/dashboard/circuits", icon: Map },
  { title: "Trips & departures", url: "/dashboard/trips", icon: CalendarRange },
  { title: "Bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  { title: "Operations", url: "/dashboard/operations", icon: ClipboardCheck },
  { title: "Balance sheet", url: "/dashboard/ledger", icon: BookOpen },
  { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
  { title: "Invoices", url: "/dashboard/invoices", icon: Receipt },
  { title: "Reviews", url: "/dashboard/reviews", icon: Star },
  { title: "Public site", url: "/", icon: Home },
];

export default function AdminLayout() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

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
                {navItems.map((item) => {
                  const isActive = item.url === "/"
                    ? location.pathname === "/"
                    : item.url === "/dashboard"
                      ? location.pathname === "/dashboard"
                      : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
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
