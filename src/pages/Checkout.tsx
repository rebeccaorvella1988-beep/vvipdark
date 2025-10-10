import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get("package");
  const productId = searchParams.get("product");
  const navigate = useNavigate();
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [countdown, setCountdown] = useState(900); // 15 minutes
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

  const { data: productData } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_products")
        .select("*")
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const itemData = packageData || productData;
  const itemType = packageId ? "package" : "product";

  const { data: siteSettings } = useQuery({
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
      toast.error("Please enter transaction/reference ID");
      return;
    }

    try {
      const orderPayload: any = {
        user_id: session.user.id,
        amount: itemData.price,
        crypto_type: selectedCrypto || selectedPaymentMethod,
        transaction_hash: transactionHash,
        status: "pending",
      };

      if (itemType === "package") {
        orderPayload.package_id = packageId;
      } else {
        orderPayload.digital_product_id = productId;
      }

      const { data: orderData, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

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

  if (!itemData) return null;

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 md:py-12 px-3 sm:px-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 sm:mb-6">
          ← Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          <Card className="p-4 sm:p-6 border-primary/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{itemType === "package" ? "Package" : "Product"}</p>
                <p className="font-semibold">{itemData.name}</p>
              </div>
              {packageData && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-semibold">{packageData.categories?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{packageData.duration_days} days</p>
                  </div>
                </>
              )}
              {productData && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-semibold text-sm">{productData.description}</p>
                </div>
              )}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">${itemData.price}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 border-primary/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Payment Method</h2>

            {!selectedCrypto && !selectedPaymentMethod ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-3">Cryptocurrency</p>
                  <div className="space-y-2">
                    {cryptoWallets?.map((wallet) => (
                      <Button
                        key={wallet.id}
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
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
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-3">Alternative Payment Methods</p>
                  <div className="space-y-2">
                    {siteSettings?.mpesa_agent_number && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("mpesa")}
                      >
                        <div>
                          <p className="font-semibold">M-Pesa Agent</p>
                          <p className="text-sm text-muted-foreground">
                            {siteSettings.mpesa_agent_name}
                          </p>
                        </div>
                      </Button>
                    )}
                    {siteSettings?.cashapp_handle && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("cashapp")}
                      >
                        <p className="font-semibold">CashApp</p>
                      </Button>
                    )}
                    {siteSettings?.venmo_handle && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("venmo")}
                      >
                        <p className="font-semibold">Venmo</p>
                      </Button>
                    )}
                    {siteSettings?.paypal_email && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("paypal")}
                      >
                        <p className="font-semibold">PayPal</p>
                      </Button>
                    )}
                    {siteSettings?.applepay_number && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("applepay")}
                      >
                        <p className="font-semibold">Apple Pay</p>
                      </Button>
                    )}
                    {siteSettings?.zelle_email && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("zelle")}
                      >
                        <p className="font-semibold">Zelle</p>
                      </Button>
                    )}
                    {siteSettings?.chime_email && (
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => setSelectedPaymentMethod("chime")}
                      >
                        <p className="font-semibold">Chime</p>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedCrypto ? (
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

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const telegramLink = (packageData?.telegram_link || siteSettings?.telegram_link);
                    if (telegramLink) window.open(telegramLink, "_blank");
                  }}
                  disabled={!packageData?.telegram_link && !siteSettings?.telegram_link}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Telegram Support
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  After submission, admin will verify your payment and activate your subscription.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {selectedPaymentMethod === "mpesa" && "M-Pesa Agent"}
                      {selectedPaymentMethod === "cashapp" && "CashApp"}
                      {selectedPaymentMethod === "venmo" && "Venmo"}
                      {selectedPaymentMethod === "paypal" && "PayPal"}
                      {selectedPaymentMethod === "applepay" && "Apple Pay"}
                      {selectedPaymentMethod === "zelle" && "Zelle"}
                      {selectedPaymentMethod === "chime" && "Chime"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentMethod("")}>
                    Change
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  {selectedPaymentMethod === "mpesa" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Name</p>
                        <p className="font-semibold">{siteSettings?.mpesa_agent_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Agent Number</p>
                        <p className="font-mono font-semibold">{siteSettings?.mpesa_agent_number}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to the agent number above
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === "cashapp" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">CashApp Handle</p>
                        <p className="font-mono font-semibold">{siteSettings?.cashapp_handle}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to this handle
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === "venmo" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Venmo Handle</p>
                        <p className="font-mono font-semibold">{siteSettings?.venmo_handle}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to this handle
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === "paypal" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">PayPal Email</p>
                        <p className="font-mono font-semibold">{siteSettings?.paypal_email}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to this email
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === "applepay" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Apple Pay Number</p>
                        <p className="font-mono font-semibold">{siteSettings?.applepay_number}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to this number
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === "zelle" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Zelle Email</p>
                        <p className="font-mono font-semibold">{siteSettings?.zelle_email}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to this email
                      </p>
                    </>
                  )}
                  {selectedPaymentMethod === "chime" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Chime Email</p>
                        <p className="font-mono font-semibold">{siteSettings?.chime_email}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Send ${itemData.price} to this email
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <Label>Transaction/Reference ID</Label>
                  <Input
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    placeholder="Enter transaction/reference ID after payment"
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

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const telegramLink = (packageData?.telegram_link || siteSettings?.telegram_link);
                    if (telegramLink) window.open(telegramLink, "_blank");
                  }}
                  disabled={!packageData?.telegram_link && !siteSettings?.telegram_link}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Telegram Support
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
