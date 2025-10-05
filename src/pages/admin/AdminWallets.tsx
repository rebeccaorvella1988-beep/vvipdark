import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const AdminWallets = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any>(null);
  const [formData, setFormData] = useState({
    crypto_type: "",
    wallet_address: "",
    network: "",
    is_active: true,
  });

  const { data: wallets } = useQuery({
    queryKey: ["admin_wallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crypto_wallets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingWallet) {
        const { error } = await supabase
          .from("crypto_wallets")
          .update(data)
          .eq("id", editingWallet.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crypto_wallets").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_wallets"] });
      setOpen(false);
      setEditingWallet(null);
      resetForm();
      toast.success(editingWallet ? "Wallet updated" : "Wallet added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crypto_wallets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_wallets"] });
      toast.success("Wallet deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      crypto_type: "",
      wallet_address: "",
      network: "",
      is_active: true,
    });
  };

  const handleEdit = (wallet: any) => {
    setEditingWallet(wallet);
    setFormData({
      crypto_type: wallet.crypto_type,
      wallet_address: wallet.wallet_address,
      network: wallet.network || "",
      is_active: wallet.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Crypto Wallets</h1>
          <p className="text-muted-foreground">Manage cryptocurrency payment addresses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow">
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWallet ? "Edit" : "Add"} Crypto Wallet</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Crypto Type</label>
                <Input
                  value={formData.crypto_type}
                  onChange={(e) => setFormData({ ...formData, crypto_type: e.target.value })}
                  placeholder="BTC, USDT, ETH, etc."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Wallet Address</label>
                <Input
                  value={formData.wallet_address}
                  onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                  placeholder="0x..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Network (Optional)</label>
                <Input
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  placeholder="TRC20, ERC20, BEP20, etc."
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Active</label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingWallet ? "Update" : "Add"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {wallets?.map((wallet) => (
          <Card key={wallet.id} className="p-6 border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-lg">{wallet.crypto_type}</h3>
                  {wallet.network && (
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                      {wallet.network}
                    </span>
                  )}
                  {!wallet.is_active && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-card/50 p-3 rounded border border-border">
                  <code className="text-sm text-muted-foreground font-mono flex-1 break-all">
                    {wallet.wallet_address}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyAddress(wallet.wallet_address)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(wallet)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(wallet.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminWallets;
