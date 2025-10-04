import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [releaseMessage, setReleaseMessage] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, packages(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;

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

  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_orders"] });
      toast.success("Order confirmed successfully");
    },
  });

  const releaseOrderMutation = useMutation({
    mutationFn: async ({ orderId, message }: { orderId: string; message: string }) => {
      const order = orders?.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found");

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "released", released_at: new Date().toISOString(), release_message: message })
        .eq("id", orderId);
      if (orderError) throw orderError;

      if (order.package_id) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + order.packages.duration_days);

        const { error: subError } = await supabase.from("subscriptions").insert({
          user_id: order.user_id,
          package_id: order.package_id,
          order_id: orderId,
          end_date: endDate.toISOString(),
          is_active: true,
        });
        if (subError) throw subError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_orders"] });
      setSelectedOrder(null);
      setReleaseMessage("");
      toast.success("Order released and subscription activated");
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_orders"] });
      toast.success("Order rejected");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-accent/20 text-accent";
      case "released":
        return "bg-primary/20 text-primary";
      case "rejected":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-warning/20 text-warning";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
        <p className="text-muted-foreground">Manage and process customer orders</p>
      </div>

      <div className="space-y-4">
        {orders?.map((order) => (
          <Card key={order.id} className="p-6 border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{order.packages?.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Customer: {order.userEmail}
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  Amount: ${order.amount} ({order.crypto_type})
                </p>
                {order.transaction_hash && (
                  <p className="text-xs text-muted-foreground font-mono mt-2">
                    TX: {order.transaction_hash}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                {order.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-accent text-accent hover:bg-accent/10"
                      onClick={() => confirmOrderMutation.mutate(order.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => rejectOrderMutation.mutate(order.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}

                {order.status === "confirmed" && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-primary-glow"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Release Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Release Order</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Release Message (Optional)</label>
                          <Textarea
                            value={releaseMessage}
                            onChange={(e) => setReleaseMessage(e.target.value)}
                            placeholder="Enter a message for the customer..."
                            className="mt-1"
                          />
                        </div>
                        <Button
                          className="w-full bg-gradient-to-r from-accent to-accent/80"
                          onClick={() =>
                            releaseOrderMutation.mutate({
                              orderId: order.id,
                              message: releaseMessage,
                            })
                          }
                        >
                          Confirm Release
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOrders;
