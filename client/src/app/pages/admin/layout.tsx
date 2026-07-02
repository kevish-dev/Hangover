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
import { LayoutDashboard, Map, MapPin, CalendarCheck, Users, Settings, LogOut, FileText } from "lucide-react";

const navItems = [
  { title: "Destinations", url: "/dashboard/destinations", icon: MapPin },
  { title: "Trips", url: "/dashboard/trips", icon: Map },
  { title: "Forms", url: "/dashboard/forms", icon: FileText },
  { title: "Bookings", url: "/dashboard/bookings", icon: CalendarCheck },
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
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
      <Sidebar variant="inset" collapsible="icon" className="border-r border-gray-200">
        <SidebarHeader className="border-b border-gray-200 py-4 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
             <div className="size-8 rounded-md bg-[#781216] flex items-center justify-center shrink-0">
               <span className="text-white font-bold text-lg leading-none">H</span>
             </div>
             <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
               <span className="font-semibold text-sm">Hangover</span>
               <span className="text-xs text-muted-foreground">Admin Portal</span>
             </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
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
                <SidebarMenuButton onClick={logout} tooltip="Log out" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <LogOut />
                  <span>Log out</span>
                </SidebarMenuButton>
             </SidebarMenuItem>
           </SidebarMenu>
        </div>
      </Sidebar>
      <SidebarInset className="bg-gray-50 flex flex-col flex-1 h-screen overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="w-px h-4 bg-gray-200 mx-2" />
          <h1 className="text-sm font-medium">Dashboard</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
