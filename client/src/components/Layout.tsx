import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Users, 
  Settings,
  Menu,
  X,
  LogOut,
  Rocket
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Quotations", href: "/quotations", icon: ClipboardList },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "AI Settings", href: "/settings/ai", icon: Rocket},
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IP</span>
              </div>
              <span className="text-xl font-semibold text-slate-900">InvoicePro</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            );
          })}
        </nav>
        
        {/* User info */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center space-x-3 px-3 py-2">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="User avatar" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/";
            }}
            className="w-full flex items-center justify-center space-x-2 text-slate-600 hover:text-slate-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">IP</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">InvoicePro</span>
          </div>
          <div className="w-9"></div> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <div className="overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
