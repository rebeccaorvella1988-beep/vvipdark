import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["subscriptions", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, packages(*)")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: orders } = useQuery({
    queryKey: ["orders", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, packages(*), digital_products(*)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-accent";
      case "released":
        return "text-primary";
      case "pending":
        return "text-warning";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            TradePro
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.full_name || profile?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>
          <p className="text-muted-foreground">
            Manage your subscriptions and access your premium content
          </p>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-4">
            {subscriptions && subscriptions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {subscriptions.map((sub) => (
                  <Card key={sub.id} className="p-6 border-primary/20">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{sub.packages?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(sub.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground mb-4">{sub.packages?.description}</p>
                    <div className="space-y-2">
                      {sub.packages?.telegram_link && (
                        <a
                          href={sub.packages.telegram_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:text-primary-glow transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Join Telegram Group
                        </a>
                      )}
                      {sub.packages?.whatsapp_link && (
                        <a
                          href={sub.packages.whatsapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Join WhatsApp Group
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground mb-6">
                  Start your trading journey by purchasing a package
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-primary to-primary-glow"
                >
                  Browse Packages
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-6 border-primary/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">
                            {order.packages?.name || order.digital_products?.name}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Amount: ${order.amount} ({order.crypto_type})
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span className="text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>
                        {order.release_message && (
                          <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                            <p className="text-sm text-accent-foreground">{order.release_message}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-medium uppercase ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-dashed">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground">
                  Your order history will appear here
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
