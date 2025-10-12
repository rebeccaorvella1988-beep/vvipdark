import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("free_content")
        .update({ title, content })
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
    });
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
                <form onSubmit={(e) => handleSubmit(e, content.id)} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      name="title"
                      defaultValue={content.title}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      name="content"
                      defaultValue={content.content}
                      required
                      rows={4}
                      className="mt-1"
                    />
                  </div>
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
                    <p className="text-sm text-muted-foreground">{content.content}</p>
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
