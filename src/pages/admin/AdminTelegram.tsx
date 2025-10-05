import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const AdminTelegram = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    bot_token: "",
    admin_chat_id: "",
    admin_notifications_enabled: true,
    user_notifications_enabled: true,
  });

  const { data: settings } = useQuery({
    queryKey: ["telegram_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_settings")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        bot_token: settings.bot_token || "",
        admin_chat_id: settings.admin_chat_id || "",
        admin_notifications_enabled: settings.admin_notifications_enabled,
        user_notifications_enabled: settings.user_notifications_enabled,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (settings) {
        const { error } = await supabase
          .from("telegram_settings")
          .update(data)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("telegram_settings").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram_settings"] });
      toast.success("Telegram settings saved");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Telegram Integration</h1>
        <p className="text-muted-foreground">
          Configure Telegram bot for order notifications
        </p>
      </div>

      <Card className="p-6 border-primary/20 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium">Bot Token</label>
            <Input
              type="password"
              value={formData.bot_token}
              onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your bot token from @BotFather on Telegram
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Admin Chat ID</label>
            <Input
              value={formData.admin_chat_id}
              onChange={(e) => setFormData({ ...formData, admin_chat_id: e.target.value })}
              placeholder="-1001234567890"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Chat ID where admin notifications will be sent
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Admin Notifications</label>
                <p className="text-xs text-muted-foreground">
                  Notify admin when new orders are placed
                </p>
              </div>
              <Switch
                checked={formData.admin_notifications_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, admin_notifications_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">User Notifications</label>
                <p className="text-xs text-muted-foreground">
                  Notify users when orders are released
                </p>
              </div>
              <Switch
                checked={formData.user_notifications_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, user_notifications_enabled: checked })
                }
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Save Settings
          </Button>
        </form>
      </Card>

      <Card className="p-6 border-primary/20 max-w-2xl mt-6">
        <h3 className="font-semibold mb-4">Setup Instructions</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Message @BotFather on Telegram and create a new bot</li>
          <li>Copy the bot token and paste it above</li>
          <li>Add your bot to your admin group/channel</li>
          <li>Get the chat ID using @userinfobot or similar tools</li>
          <li>Paste the chat ID above and save</li>
        </ol>
      </Card>
    </div>
  );
};

export default AdminTelegram;
