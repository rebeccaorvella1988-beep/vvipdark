import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Wallet,
  ShoppingBag,
  FileText,
  Settings,
  MessageSquare,
  Gift,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.role !== "admin") {
        toast.error("Access denied. Admin only.");
        navigate("/dashboard");
        return;
      }

      setLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/free-content", icon: Gift, label: "Free Content" },
    { path: "/admin/packages", icon: Package, label: "Packages" },
    { path: "/admin/categories", icon: FolderTree, label: "Categories" },
    { path: "/admin/wallets", icon: Wallet, label: "Crypto Wallets" },
    { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { path: "/admin/products", icon: FileText, label: "Digital Products" },
    { path: "/admin/telegram", icon: MessageSquare, label: "Telegram" },
    { path: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-r md:border-b-0 border-border bg-card/50 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-8 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Admin Panel
        </h1>

        <nav className="space-y-1 md:space-y-2 flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex-shrink-0 md:flex-shrink">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start text-xs md:text-sm whitespace-nowrap"
                  size="sm"
                >
                  <Icon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 md:mt-auto md:pt-8 hidden md:block">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
