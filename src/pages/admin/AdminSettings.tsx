import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    site_name: "",
    site_logo: "",
    site_description: "",
    support_email: "",
    support_phone: "",
    telegram_link: "",
    whatsapp_link: "",
    twitter_link: "",
    mpesa_agent_number: "",
    mpesa_agent_name: "",
    cashapp_handle: "",
    venmo_handle: "",
    paypal_email: "",
    applepay_number: "",
    zelle_email: "",
    chime_email: "",
  });

  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        site_name: settings.site_name || "",
        site_logo: settings.site_logo || "",
        site_description: settings.site_description || "",
        support_email: settings.support_email || "",
        support_phone: settings.support_phone || "",
        telegram_link: settings.telegram_link || "",
        whatsapp_link: settings.whatsapp_link || "",
        twitter_link: settings.twitter_link || "",
        mpesa_agent_number: settings.mpesa_agent_number || "",
        mpesa_agent_name: settings.mpesa_agent_name || "",
        cashapp_handle: settings.cashapp_handle || "",
        venmo_handle: settings.venmo_handle || "",
        paypal_email: settings.paypal_email || "",
        applepay_number: settings.applepay_number || "",
        zelle_email: settings.zelle_email || "",
        chime_email: settings.chime_email || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (settings) {
        const { error } = await supabase
          .from("site_settings")
          .update(data)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_settings").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Settings saved successfully");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Site Settings</h1>
        <p className="text-muted-foreground">Configure your website information</p>
      </div>

      <Card className="p-6 border-primary/20 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium">Site Name</label>
            <Input
              value={formData.site_name}
              onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Site Logo URL</label>
            <Input
              value={formData.site_logo}
              onChange={(e) => setFormData({ ...formData, site_logo: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Site Description</label>
            <Textarea
              value={formData.site_description}
              onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-4">Support & Contact</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The Telegram link will be used as support button on checkout page
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Support Email</label>
                <Input
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Support Phone</label>
                <Input
                  value={formData.support_phone}
                  onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-4">Social Links</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Telegram</label>
                <Input
                  value={formData.telegram_link}
                  onChange={(e) => setFormData({ ...formData, telegram_link: e.target.value })}
                  placeholder="https://t.me/..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">WhatsApp</label>
                <Input
                  value={formData.whatsapp_link}
                  onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })}
                  placeholder="https://wa.me/..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Twitter</label>
                <Input
                  value={formData.twitter_link}
                  onChange={(e) => setFormData({ ...formData, twitter_link: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="font-semibold mb-4">Alternative Payment Methods</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure payment options for clients who prefer agent-based or non-crypto payments
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">M-Pesa Agent Number</label>
                <Input
                  value={formData.mpesa_agent_number}
                  onChange={(e) => setFormData({ ...formData, mpesa_agent_number: e.target.value })}
                  placeholder="+254..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">M-Pesa Agent Name</label>
                <Input
                  value={formData.mpesa_agent_name}
                  onChange={(e) => setFormData({ ...formData, mpesa_agent_name: e.target.value })}
                  placeholder="Agent Name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CashApp Handle</label>
                <Input
                  value={formData.cashapp_handle}
                  onChange={(e) => setFormData({ ...formData, cashapp_handle: e.target.value })}
                  placeholder="$handle"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Venmo Handle</label>
                <Input
                  value={formData.venmo_handle}
                  onChange={(e) => setFormData({ ...formData, venmo_handle: e.target.value })}
                  placeholder="@handle"
                />
              </div>
              <div>
                <label className="text-sm font-medium">PayPal Email</label>
                <Input
                  type="email"
                  value={formData.paypal_email}
                  onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apple Pay Number</label>
                <Input
                  value={formData.applepay_number}
                  onChange={(e) => setFormData({ ...formData, applepay_number: e.target.value })}
                  placeholder="+1..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Zelle Email</label>
                <Input
                  type="email"
                  value={formData.zelle_email}
                  onChange={(e) => setFormData({ ...formData, zelle_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Chime Email</label>
                <Input
                  type="email"
                  value={formData.chime_email}
                  onChange={(e) => setFormData({ ...formData, chime_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Save Settings
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AdminSettings;
