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
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border bg-card/50 p-6">
        <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Admin Panel
        </h1>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
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
