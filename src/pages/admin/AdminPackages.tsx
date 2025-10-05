import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const AdminPackages = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "",
    category_id: "",
    telegram_link: "",
    whatsapp_link: "",
    features: "",
    is_active: true,
  });

  const { data: packages } = useQuery({
    queryKey: ["admin_packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, categories(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const featuresArray = data.features
        .split("\n")
        .filter((f: string) => f.trim())
        .map((f: string) => f.trim());

      const packageData = {
        ...data,
        price: parseFloat(data.price),
        duration_days: parseInt(data.duration_days),
        features: featuresArray,
      };

      if (editingPackage) {
        const { error } = await supabase
          .from("packages")
          .update(packageData)
          .eq("id", editingPackage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("packages").insert(packageData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_packages"] });
      setOpen(false);
      setEditingPackage(null);
      resetForm();
      toast.success(editingPackage ? "Package updated" : "Package created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_packages"] });
      toast.success("Package deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      duration_days: "",
      category_id: "",
      telegram_link: "",
      whatsapp_link: "",
      features: "",
      is_active: true,
    });
  };

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price.toString(),
      duration_days: pkg.duration_days.toString(),
      category_id: pkg.category_id || "",
      telegram_link: pkg.telegram_link || "",
      whatsapp_link: pkg.whatsapp_link || "",
      features: Array.isArray(pkg.features) ? pkg.features.join("\n") : "",
      is_active: pkg.is_active,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Packages</h1>
          <p className="text-muted-foreground">Manage subscription packages and signal plans</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow">
              <Plus className="h-4 w-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "Edit" : "Create"} Package</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (Days)</label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Features (one per line)</label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={5}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telegram Link</label>
                <Input
                  value={formData.telegram_link}
                  onChange={(e) => setFormData({ ...formData, telegram_link: e.target.value })}
                  placeholder="https://t.me/..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">WhatsApp Link</label>
                <Input
                  value={formData.whatsapp_link}
                  onChange={(e) => setFormData({ ...formData, whatsapp_link: e.target.value })}
                  placeholder="https://wa.me/..."
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
                {editingPackage ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {packages?.map((pkg) => (
          <Card key={pkg.id} className="p-6 border-primary/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  {pkg.categories && (
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                      {pkg.categories.name}
                    </span>
                  )}
                  {!pkg.is_active && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-primary font-semibold">${pkg.price}</span>
                  <span className="text-muted-foreground">{pkg.duration_days} days</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(pkg)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(pkg.id)}
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

export default AdminPackages;
