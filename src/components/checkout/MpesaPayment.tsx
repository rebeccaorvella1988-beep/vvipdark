import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Smartphone, Check, X, RefreshCw } from "lucide-react";

interface MpesaPaymentProps {
  amount: number;
  orderId: string;
  itemName: string;
  onSuccess: () => void;
  onBack: () => void;
}

type PaymentStatus = "idle" | "initiating" | "waiting" | "checking" | "success" | "failed";

const MpesaPayment = ({ amount, orderId, itemName, onSuccess, onBack }: MpesaPaymentProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [pollCount, setPollCount] = useState(0);

  const formatPhoneNumber = (phone: string) => {
    let formatted = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    if (formatted.startsWith("0")) {
      formatted = "254" + formatted.slice(1);
    } else if (formatted.startsWith("+254")) {
      formatted = formatted.slice(1);
    } else if (!formatted.startsWith("254")) {
      formatted = "254" + formatted;
    }
    return formatted;
  };

  const validatePhone = (phone: string) => {
    const formatted = formatPhoneNumber(phone);
    return formatted.length === 12 && formatted.startsWith("254");
  };

  const initiatePayment = async () => {
    if (!validatePhone(phoneNumber)) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }

    setStatus("initiating");
    setStatusMessage("Sending payment request to your phone...");

    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phone: formatPhoneNumber(phoneNumber),
          amount: amount,
          orderId: orderId,
          accountReference: itemName.substring(0, 12).replace(/[^a-zA-Z0-9]/g, ""),
        },
      });

      if (error) throw error;

      if (data?.success) {
        setCheckoutRequestId(data.checkoutRequestId);
        setStatus("waiting");
        setStatusMessage("Check your phone and enter your M-Pesa PIN");
        toast.success(data.message || "Payment request sent to your phone");
      } else {
        throw new Error(data?.error || "Failed to initiate payment");
      }
    } catch (error: any) {
      console.error("STK Push error:", error);
      setStatus("failed");
      setStatusMessage(error.message || "Failed to initiate payment");
      toast.error(error.message || "Failed to initiate payment");
    }
  };

  const checkPaymentStatus = async () => {
    if (!checkoutRequestId) return;

    setStatus("checking");
    setPollCount((prev) => prev + 1);

    try {
      const { data, error } = await supabase.functions.invoke("mpesa-query", {
        body: { checkoutRequestId },
      });

      if (error) throw error;

      if (data?.orderStatus === "confirmed") {
        setStatus("success");
        setStatusMessage("Payment confirmed!");
        toast.success("Payment confirmed! Your order is being processed.");
        setTimeout(onSuccess, 2000);
      } else if (data?.orderStatus === "failed") {
        setStatus("failed");
        setStatusMessage("Payment was cancelled or failed");
      } else {
        setStatus("waiting");
        setStatusMessage("Waiting for payment confirmation...");
      }
    } catch (error: any) {
      console.error("Query error:", error);
      setStatus("waiting");
    }
  };

  // Auto-poll for payment status
  useEffect(() => {
    if (status === "waiting" && checkoutRequestId && pollCount < 12) {
      const timer = setTimeout(checkPaymentStatus, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, checkoutRequestId, pollCount]);

  const getStatusIcon = () => {
    switch (status) {
      case "initiating":
      case "checking":
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case "waiting":
        return <Smartphone className="h-12 w-12 text-warning animate-pulse" />;
      case "success":
        return (
          <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-6 w-6 text-white" />
          </div>
        );
      case "failed":
        return (
          <div className="h-12 w-12 rounded-full bg-destructive flex items-center justify-center">
            <X className="h-6 w-6 text-white" />
          </div>
        );
      default:
        return <Smartphone className="h-12 w-12 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-lg">M-Pesa Express</p>
          <p className="text-sm text-muted-foreground">Pay instantly with M-Pesa</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} disabled={status === "initiating"}>
          Change
        </Button>
      </div>

      {status === "idle" && (
        <>
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-center">
              You will receive an M-Pesa prompt on your phone to complete payment of{" "}
              <span className="font-bold text-green-600">KES {Math.ceil(amount)}</span>
            </p>
          </div>

          <div>
            <Label htmlFor="phone">M-Pesa Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0712345678 or 254712345678"
              className="mt-1 text-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the phone number registered with M-Pesa
            </p>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            onClick={initiatePayment}
            disabled={!phoneNumber.trim()}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Pay KES {Math.ceil(amount)} with M-Pesa
          </Button>
        </>
      )}

      {(status === "initiating" || status === "waiting" || status === "checking") && (
        <div className="py-8 text-center space-y-4">
          <div className="flex justify-center">{getStatusIcon()}</div>
          <div>
            <p className="font-semibold">{statusMessage}</p>
            {status === "waiting" && (
              <p className="text-sm text-muted-foreground mt-2">
                Enter your M-Pesa PIN on your phone to complete payment
              </p>
            )}
          </div>
          
          {status === "waiting" && (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={checkPaymentStatus}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Payment Status
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStatus("idle");
                  setPollCount(0);
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {status === "success" && (
        <div className="py-8 text-center space-y-4">
          <div className="flex justify-center">{getStatusIcon()}</div>
          <div>
            <p className="font-semibold text-green-600">Payment Successful!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting you to your dashboard...
            </p>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="py-8 text-center space-y-4">
          <div className="flex justify-center">{getStatusIcon()}</div>
          <div>
            <p className="font-semibold text-destructive">{statusMessage}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try again or use a different payment method
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStatus("idle");
              setPollCount(0);
              setStatusMessage("");
            }}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;
