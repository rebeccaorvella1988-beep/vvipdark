import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Clock, MessageCircle, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import MpesaPayment from "@/components/checkout/MpesaPayment";

type PaymentCategory = "" | "crypto" | "mpesa" | "alternative";
type AlternativeMethod = "cashapp" | "venmo" | "paypal" | "applepay" | "zelle" | "chime";

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get("package");
  const productId = searchParams.get("product");
  const navigate = useNavigate();
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeMethod | "">("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [countdown, setCountdown] = useState(900);
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

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
    if (countdown > 0 && (selectedCrypto || selectedAlternative)) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, selectedCrypto, selectedAlternative]);

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

  // Create pending order for M-Pesa
  const createPendingOrder = async () => {
    if (!session?.user?.id || !itemData) return null;
    
    const orderPayload: any = {
      user_id: session.user.id,
      amount: itemData.price,
      crypto_type: "mpesa",
      status: "pending",
    };

    if (itemType === "package") {
      orderPayload.package_id = packageId;
    } else {
      orderPayload.digital_product_id = productId;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create order");
      return null;
    }
    
    return data.id;
  };

  const handleMpesaSelect = async () => {
    const orderId = await createPendingOrder();
    if (orderId) {
      setPendingOrderId(orderId);
      setPaymentCategory("mpesa");
    }
  };

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
        crypto_type: selectedCrypto || selectedAlternative,
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

  const resetPayment = () => {
    setPaymentCategory("");
    setSelectedCrypto("");
    setSelectedAlternative("");
    setPendingOrderId(null);
    setTransactionHash("");
    setCountdown(900);
  };

  // Check which alternative methods are available and enabled
  const availableAlternatives = [
    { key: "cashapp" as const, label: "CashApp", value: siteSettings?.cashapp_enabled && siteSettings?.cashapp_handle ? siteSettings.cashapp_handle : null },
    { key: "venmo" as const, label: "Venmo", value: siteSettings?.venmo_enabled && siteSettings?.venmo_handle ? siteSettings.venmo_handle : null },
    { key: "paypal" as const, label: "PayPal", value: siteSettings?.paypal_enabled && siteSettings?.paypal_email ? siteSettings.paypal_email : null },
    { key: "applepay" as const, label: "Apple Pay", value: siteSettings?.applepay_enabled && siteSettings?.applepay_number ? siteSettings.applepay_number : null },
    { key: "zelle" as const, label: "Zelle", value: siteSettings?.zelle_enabled && siteSettings?.zelle_email ? siteSettings.zelle_email : null },
    { key: "chime" as const, label: "Chime", value: siteSettings?.chime_enabled && siteSettings?.chime_email ? siteSettings.chime_email : null },
  ].filter((m): m is { key: AlternativeMethod; label: string; value: string } => m.value !== null);

  if (!itemData) return null;

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 md:py-12 px-3 sm:px-4">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 sm:mb-6">
          ← Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Order Summary */}
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

          {/* Payment Method */}
          <Card className="p-4 sm:p-6 border-primary/20">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Payment Method</h2>

            {/* Payment Category Selection */}
            {!paymentCategory && (
              <div className="space-y-4">
                {/* Cryptocurrency */}
                {cryptoWallets && cryptoWallets.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => setPaymentCategory("crypto")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Wallet className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Pay with Cryptocurrency</p>
                        <p className="text-sm text-muted-foreground">
                          Bitcoin, USDT, and more
                        </p>
                      </div>
                    </div>
                  </Button>
                )}

                {/* M-Pesa */}
                {siteSettings?.mpesa_enabled && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4 border-green-500/30 hover:border-green-500/50"
                    onClick={handleMpesaSelect}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Smartphone className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-semibold">M-Pesa Express</p>
                        <p className="text-sm text-muted-foreground">
                          Instant payment via STK Push
                        </p>
                      </div>
                    </div>
                  </Button>
                )}

                {/* Alternative Methods */}
                {availableAlternatives.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => setPaymentCategory("alternative")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <span className="text-lg">💳</span>
                      </div>
                      <div>
                        <p className="font-semibold">Other Payment Methods</p>
                        <p className="text-sm text-muted-foreground">
                          CashApp, Venmo, PayPal, etc.
                        </p>
                      </div>
                    </div>
                  </Button>
                )}
              </div>
            )}

            {/* Crypto Selection */}
            {paymentCategory === "crypto" && !selectedCrypto && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={resetPayment} className="mb-2">
                  ← Back to payment methods
                </Button>
                <p className="text-sm font-medium mb-3">Select Cryptocurrency</p>
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
            )}

            {/* Crypto Payment Details */}
            {paymentCategory === "crypto" && selectedCrypto && (
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
                    const telegramLink = packageData?.telegram_link || siteSettings?.telegram_link;
                    if (telegramLink) window.open(telegramLink, "_blank");
                  }}
                  disabled={!packageData?.telegram_link && !siteSettings?.telegram_link}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Telegram Support
                </Button>
              </div>
            )}

            {/* M-Pesa Payment */}
            {paymentCategory === "mpesa" && pendingOrderId && (
              <MpesaPayment
                amount={itemData.price}
                orderId={pendingOrderId}
                itemName={itemData.name}
                onSuccess={() => navigate("/dashboard")}
                onBack={resetPayment}
              />
            )}

            {/* Alternative Methods Selection */}
            {paymentCategory === "alternative" && !selectedAlternative && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={resetPayment} className="mb-2">
                  ← Back to payment methods
                </Button>
                <p className="text-sm font-medium mb-3">Select Payment Method</p>
                <div className="space-y-2">
                  {availableAlternatives.map((method) => (
                    <Button
                      key={method.key}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => setSelectedAlternative(method.key)}
                    >
                      <p className="font-semibold">{method.label}</p>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Payment Details */}
            {paymentCategory === "alternative" && selectedAlternative && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {availableAlternatives.find(m => m.key === selectedAlternative)?.label}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAlternative("")}>
                    Change
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedAlternative === "cashapp" && "CashApp Handle"}
                      {selectedAlternative === "venmo" && "Venmo Handle"}
                      {selectedAlternative === "paypal" && "PayPal Email"}
                      {selectedAlternative === "applepay" && "Apple Pay Number"}
                      {selectedAlternative === "zelle" && "Zelle Email"}
                      {selectedAlternative === "chime" && "Chime Email"}
                    </p>
                    <p className="font-mono font-semibold text-lg">
                      {availableAlternatives.find(m => m.key === selectedAlternative)?.value}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send ${itemData.price} to the above address
                  </p>
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
                    const telegramLink = packageData?.telegram_link || siteSettings?.telegram_link;
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
