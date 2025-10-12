import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift, TrendingUp } from "lucide-react";

const AdminFreeContent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: freeContent } = useQuery({
    queryKey: ["free-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_content")
        .select("*")
        .order("type", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("free_content")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free-content"] });
      toast({ title: "Content updated successfully!" });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Failed to update content", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("free_content")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["free-content"] });
      toast({ title: "Status updated successfully!" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, id: string, type: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updates: any = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
    };

    if (type === "signals") {
      updates.market_type = formData.get("market_type") as string;
      updates.action = formData.get("action") as string;
      updates.price = formData.get("price") ? parseFloat(formData.get("price") as string) : null;
      updates.take_profit = formData.get("take_profit") ? parseFloat(formData.get("take_profit") as string) : null;
      updates.stop_loss = formData.get("stop_loss") ? parseFloat(formData.get("stop_loss") as string) : null;
    } else if (type === "sports_betting") {
      updates.sport_type = formData.get("sport_type") as string;
      updates.game_type = formData.get("game_type") as string;
      updates.result = formData.get("result") as string;
    }

    updateMutation.mutate({ id, updates });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Free Content Management</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Update free content visible to all visitors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {freeContent?.map((content) => (
          <Card key={content.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                {content.type === "sports_betting" ? (
                  <TrendingUp className="h-5 w-5 text-primary" />
                ) : (
                  <Gift className="h-5 w-5 text-accent" />
                )}
                {content.type === "sports_betting" ? "Free Sports Betting" : "Free Signals"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingId === content.id ? (
                <form onSubmit={(e) => handleSubmit(e, content.id, content.type)} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={content.title}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      name="content"
                      defaultValue={content.content}
                      required
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {content.type === "signals" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="market_type">Market Type</Label>
                          <Input
                            id="market_type"
                            name="market_type"
                            defaultValue={content.market_type || ""}
                            placeholder="e.g., Forex, Crypto, Stocks"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="action">Action</Label>
                          <Select name="action" defaultValue={content.action || "buy"}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buy">Buy</SelectItem>
                              <SelectItem value="sell">Sell</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="price">Price</Label>
                          <Input
                            id="price"
                            name="price"
                            type="number"
                            step="0.00001"
                            defaultValue={content.price || ""}
                            placeholder="Entry price"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="take_profit">Take Profit</Label>
                          <Input
                            id="take_profit"
                            name="take_profit"
                            type="number"
                            step="0.00001"
                            defaultValue={content.take_profit || ""}
                            placeholder="TP"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stop_loss">Stop Loss</Label>
                          <Input
                            id="stop_loss"
                            name="stop_loss"
                            type="number"
                            step="0.00001"
                            defaultValue={content.stop_loss || ""}
                            placeholder="SL"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {content.type === "sports_betting" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="sport_type">Sport</Label>
                          <Input
                            id="sport_type"
                            name="sport_type"
                            defaultValue={content.sport_type || ""}
                            placeholder="e.g., Football, Basketball"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="game_type">Game Type</Label>
                          <Input
                            id="game_type"
                            name="game_type"
                            defaultValue={content.game_type || ""}
                            placeholder="e.g., Premier League, NBA"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="result">Result</Label>
                        <Input
                          id="result"
                          name="result"
                          defaultValue={content.result || ""}
                          placeholder="e.g., Team A vs Team B - Over 2.5"
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">{content.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{content.content}</p>
                    
                    {content.type === "signals" && (content.market_type || content.action || content.price) && (
                      <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                        {content.market_type && <div><span className="font-medium">Market:</span> {content.market_type}</div>}
                        {content.action && <div><span className="font-medium">Action:</span> <span className="capitalize">{content.action}</span></div>}
                        {content.price && <div><span className="font-medium">Price:</span> {content.price}</div>}
                        {content.take_profit && <div><span className="font-medium">TP:</span> {content.take_profit}</div>}
                        {content.stop_loss && <div><span className="font-medium">SL:</span> {content.stop_loss}</div>}
                      </div>
                    )}
                    
                    {content.type === "sports_betting" && (content.sport_type || content.game_type || content.result) && (
                      <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                        {content.sport_type && <div><span className="font-medium">Sport:</span> {content.sport_type}</div>}
                        {content.game_type && <div><span className="font-medium">Game Type:</span> {content.game_type}</div>}
                        {content.result && <div><span className="font-medium">Result:</span> {content.result}</div>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setEditingId(content.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={content.is_active ? "destructive" : "default"}
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: content.id,
                          isActive: !content.is_active,
                        })
                      }
                    >
                      {content.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminFreeContent;
