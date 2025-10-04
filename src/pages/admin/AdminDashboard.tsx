import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, ShoppingBag, Package } from "lucide-react";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [usersRes, ordersRes, subsRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*"),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const totalSales = ordersRes.data?.reduce((acc, order) => {
        return acc + (parseFloat(order.amount.toString()) || 0);
      }, 0) || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalSales,
        totalOrders: ordersRes.data?.length || 0,
        activeSubscriptions: subsRes.count || 0,
      };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, packages(*)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      
      // Fetch user emails separately
      const ordersWithEmails = await Promise.all(
        data.map(async (order) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", order.user_id)
            .single();
          return { ...order, userEmail: profile?.email || "Unknown" };
        })
      );
      
      return ordersWithEmails;
    },
  });

  const statCards = [
    { icon: Users, label: "Total Users", value: stats?.totalUsers || 0, color: "text-primary" },
    { icon: DollarSign, label: "Total Sales", value: `$${stats?.totalSales.toFixed(2)}`, color: "text-accent" },
    { icon: ShoppingBag, label: "Total Orders", value: stats?.totalOrders || 0, color: "text-warning" },
    { icon: Package, label: "Active Subscriptions", value: stats?.activeSubscriptions || 0, color: "text-primary-glow" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor your platform's performance</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 border-primary/20">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        <div className="space-y-4">
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div>
                  <p className="font-semibold">{order.packages?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.userEmail} • ${order.amount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{order.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No recent orders</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
