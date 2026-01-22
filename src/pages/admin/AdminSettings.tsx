import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, DollarSign } from "lucide-react";

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
    // M-Pesa Daraja
    mpesa_consumer_key: "",
    mpesa_consumer_secret: "",
    mpesa_passkey: "",
    mpesa_paybill: "",
    mpesa_enabled: false,
    mpesa_environment: "sandbox",
    // Alternative payments with toggles
    cashapp_handle: "",
    cashapp_enabled: true,
    venmo_handle: "",
    venmo_enabled: true,
    paypal_email: "",
    paypal_enabled: true,
    applepay_number: "",
    applepay_enabled: true,
    zelle_email: "",
    zelle_enabled: true,
    chime_email: "",
    chime_enabled: true,
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
        // M-Pesa Daraja
        mpesa_consumer_key: settings.mpesa_consumer_key || "",
        mpesa_consumer_secret: settings.mpesa_consumer_secret || "",
        mpesa_passkey: settings.mpesa_passkey || "",
        mpesa_paybill: settings.mpesa_paybill || "",
        mpesa_enabled: settings.mpesa_enabled || false,
        mpesa_environment: settings.mpesa_environment || "sandbox",
        // Alternative payments
        cashapp_handle: settings.cashapp_handle || "",
        cashapp_enabled: settings.cashapp_enabled ?? true,
        venmo_handle: settings.venmo_handle || "",
        venmo_enabled: settings.venmo_enabled ?? true,
        paypal_email: settings.paypal_email || "",
        paypal_enabled: settings.paypal_enabled ?? true,
        applepay_number: settings.applepay_number || "",
        applepay_enabled: settings.applepay_enabled ?? true,
        zelle_email: settings.zelle_email || "",
        zelle_enabled: settings.zelle_enabled ?? true,
        chime_email: settings.chime_email || "",
        chime_enabled: settings.chime_enabled ?? true,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Site Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Configure your website and payment methods</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        {/* Basic Info */}
        <Card className="p-4 sm:p-6 border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <Label>Site Name</Label>
              <Input
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Site Logo URL</Label>
              <Input
                value={formData.site_logo}
                onChange={(e) => setFormData({ ...formData, site_logo: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Site Description</Label>
              <Textarea
                value={formData.site_description}
                onChange={(e) => setFormData({ ...formData, site_description: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Support & Contact */}
        <Card className="p-4 sm:p-6 border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Support & Contact</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The Telegram link will be used as support button on checkout page
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Support Email</Label>
              <Input
                type="email"
                value={formData.support_email}
                onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Support Phone</Label>
              <Input
                value={formData.support_phone}
                onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Telegram</Label>
              <Input
                value={formData.telegram_link}
                onChange={(e) => setFormData({ ...formData, telegram_link: e.target.value })}
                placeholder="https://t.me/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={formData.whatsapp_link}
                onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })}
                placeholder="https://wa.me/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Twitter</Label>
              <Input
                value={formData.twitter_link}
                onChange={(e) => setFormData({ ...formData, twitter_link: e.target.value })}
                placeholder="https://twitter.com/..."
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* M-Pesa Daraja Settings */}
        <Card className="p-4 sm:p-6 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Smartphone className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">M-Pesa Express (STK Push)</h3>
              <p className="text-sm text-muted-foreground">
                Enable instant M-Pesa payments via Safaricom Daraja API
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.mpesa_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, mpesa_enabled: checked })}
              />
              <Label className="text-sm">{formData.mpesa_enabled ? "Enabled" : "Disabled"}</Label>
            </div>
          </div>

          {formData.mpesa_enabled && (
            <div className="space-y-4 pt-4 border-t border-green-500/20">
              <div>
                <Label>Environment</Label>
                <Select
                  value={formData.mpesa_environment}
                  onValueChange={(value) => setFormData({ ...formData, mpesa_environment: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production (Live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Consumer Key</Label>
                  <Input
                    value={formData.mpesa_consumer_key}
                    onChange={(e) => setFormData({ ...formData, mpesa_consumer_key: e.target.value })}
                    placeholder="From Daraja portal"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Consumer Secret</Label>
                  <Input
                    type="password"
                    value={formData.mpesa_consumer_secret}
                    onChange={(e) => setFormData({ ...formData, mpesa_consumer_secret: e.target.value })}
                    placeholder="From Daraja portal"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Passkey</Label>
                  <Input
                    type="password"
                    value={formData.mpesa_passkey}
                    onChange={(e) => setFormData({ ...formData, mpesa_passkey: e.target.value })}
                    placeholder="STK Push passkey"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Paybill/Till Number</Label>
                  <Input
                    value={formData.mpesa_paybill}
                    onChange={(e) => setFormData({ ...formData, mpesa_paybill: e.target.value })}
                    placeholder="174379"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600">
                  💡 Get your credentials from{" "}
                  <a
                    href="https://developer.safaricom.co.ke/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Safaricom Daraja Portal
                  </a>
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Alternative Payment Methods */}
        <Card className="p-4 sm:p-6 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Alternative Payment Methods</h3>
              <p className="text-sm text-muted-foreground">
                Manual payment methods - enable/disable individually
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* CashApp */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Switch
                checked={formData.cashapp_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, cashapp_enabled: checked })}
              />
              <div className="flex-1">
                <Label className="font-medium">CashApp</Label>
                <Input
                  value={formData.cashapp_handle}
                  onChange={(e) => setFormData({ ...formData, cashapp_handle: e.target.value })}
                  placeholder="$handle"
                  className="mt-2"
                  disabled={!formData.cashapp_enabled}
                />
              </div>
            </div>

            {/* Venmo */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Switch
                checked={formData.venmo_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, venmo_enabled: checked })}
              />
              <div className="flex-1">
                <Label className="font-medium">Venmo</Label>
                <Input
                  value={formData.venmo_handle}
                  onChange={(e) => setFormData({ ...formData, venmo_handle: e.target.value })}
                  placeholder="@handle"
                  className="mt-2"
                  disabled={!formData.venmo_enabled}
                />
              </div>
            </div>

            {/* PayPal */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Switch
                checked={formData.paypal_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, paypal_enabled: checked })}
              />
              <div className="flex-1">
                <Label className="font-medium">PayPal</Label>
                <Input
                  type="email"
                  value={formData.paypal_email}
                  onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-2"
                  disabled={!formData.paypal_enabled}
                />
              </div>
            </div>

            {/* Apple Pay */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Switch
                checked={formData.applepay_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, applepay_enabled: checked })}
              />
              <div className="flex-1">
                <Label className="font-medium">Apple Pay</Label>
                <Input
                  value={formData.applepay_number}
                  onChange={(e) => setFormData({ ...formData, applepay_number: e.target.value })}
                  placeholder="+1..."
                  className="mt-2"
                  disabled={!formData.applepay_enabled}
                />
              </div>
            </div>

            {/* Zelle */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Switch
                checked={formData.zelle_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, zelle_enabled: checked })}
              />
              <div className="flex-1">
                <Label className="font-medium">Zelle</Label>
                <Input
                  type="email"
                  value={formData.zelle_email}
                  onChange={(e) => setFormData({ ...formData, zelle_email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-2"
                  disabled={!formData.zelle_enabled}
                />
              </div>
            </div>

            {/* Chime */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
              <Switch
                checked={formData.chime_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, chime_enabled: checked })}
              />
              <div className="flex-1">
                <Label className="font-medium">Chime</Label>
                <Input
                  type="email"
                  value={formData.chime_email}
                  onChange={(e) => setFormData({ ...formData, chime_email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-2"
                  disabled={!formData.chime_enabled}
                />
              </div>
            </div>
          </div>
        </Card>

        <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
};

export default AdminSettings;
