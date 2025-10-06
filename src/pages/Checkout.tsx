import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get("package");
  const navigate = useNavigate();
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [countdown, setCountdown] = useState(1800); // 30 minutes
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const { data: packageData } = useQuery({
    queryKey: ["package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, categories(*)")
        .eq("id", packageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!packageId,
  });

  const { data: cryptoWallets } = useQuery({
    queryKey: ["crypto_wallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crypto_wallets")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const selectedWallet = cryptoWallets?.find((w) => w.crypto_type === selectedCrypto);

  useEffect(() => {
    if (selectedWallet) {
      QRCode.toDataURL(selectedWallet.wallet_address).then(setQrCodeUrl);
    }
  }, [selectedWallet]);

  const handleCopy = () => {
    if (selectedWallet) {
      navigator.clipboard.writeText(selectedWallet.wallet_address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitPayment = async () => {
    if (!transactionHash.trim()) {
      toast.error("Please enter transaction hash");
      return;
    }

    try {
      const { data: orderData, error } = await supabase.from("orders").insert({
        user_id: session.user.id,
        package_id: packageId,
        amount: packageData.price,
        crypto_type: selectedCrypto,
        transaction_hash: transactionHash,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Send Telegram notification to admin
      if (orderData) {
        supabase.functions.invoke("send-telegram-notification", {
          body: { orderId: orderData.id, type: "new_order" },
        }).catch(console.error);
      }

      toast.success("Payment submitted! Waiting for admin confirmation.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!packageData) return null;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          ← Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-6 border-primary/20">
            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Package</p>
                <p className="font-semibold">{packageData.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-semibold">{packageData.categories?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{packageData.duration_days} days</p>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-primary">${packageData.price}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-primary/20">
            <h2 className="text-2xl font-bold mb-4">Payment Method</h2>

            {!selectedCrypto ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Select your preferred cryptocurrency
                </p>
                {cryptoWallets?.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => setSelectedCrypto(wallet.crypto_type)}
                  >
                    <div>
                      <p className="font-semibold">{wallet.crypto_type}</p>
                      {wallet.network && (
                        <p className="text-sm text-muted-foreground">{wallet.network}</p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedCrypto}</p>
                    {selectedWallet?.network && (
                      <p className="text-sm text-muted-foreground">{selectedWallet.network}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCrypto("")}>
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />}
                </div>

                <div>
                  <Label>Wallet Address</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={selectedWallet?.wallet_address || ""}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button size="icon" variant="outline" onClick={handleCopy}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-mono text-lg">{formatTime(countdown)}</span>
                </div>

                <div>
                  <Label>Transaction Hash</Label>
                  <Input
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    placeholder="Enter transaction hash after payment"
                    className="mt-1"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-accent to-accent/80"
                  onClick={handleSubmitPayment}
                  disabled={!transactionHash.trim()}
                >
                  I Have Paid
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  After submission, admin will verify your payment and activate your subscription.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
