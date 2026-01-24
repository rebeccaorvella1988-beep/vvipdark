import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, Check, X, RefreshCw } from "lucide-react";

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
          accountReference: itemName.substring(0, 12).replace(/[^a-zA-Z0-9]/g, "") || "Payment",
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

  // Custom spinning loader component
  const SpinningLoader = ({ size = "lg" }: { size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = {
      sm: "w-6 h-6",
      md: "w-10 h-10",
      lg: "w-16 h-16",
    };
    
    return (
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-primary/20`} />
        {/* Spinning arc */}
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-4 border-transparent border-t-green-500 border-r-green-500/50 animate-spin`}
          style={{ animationDuration: "0.8s" }}
        />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5"} rounded-full bg-green-500 animate-pulse`} />
        </div>
      </div>
    );
  };

  const getStatusDisplay = () => {
    switch (status) {
      case "initiating":
        return (
          <div className="flex flex-col items-center gap-4">
            <SpinningLoader size="lg" />
            <div className="text-center">
              <p className="font-semibold text-lg">Sending Request...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contacting M-Pesa servers
              </p>
            </div>
          </div>
        );
      case "waiting":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                <Smartphone className="h-10 w-10 text-green-500" />
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-ping" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg text-green-400">Check Your Phone</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your M-Pesa PIN to complete payment
              </p>
            </div>
            {/* Progress indicator */}
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Waiting for confirmation</span>
                <span>{pollCount}/12</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${(pollCount / 12) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      case "checking":
        return (
          <div className="flex flex-col items-center gap-4">
            <SpinningLoader size="lg" />
            <div className="text-center">
              <p className="font-semibold text-lg">Verifying Payment...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Checking transaction status
              </p>
            </div>
          </div>
        );
      case "success":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
              <Check className="h-10 w-10 text-white" />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl text-green-400">Payment Successful!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Redirecting you to your dashboard...
              </p>
            </div>
          </div>
        );
      case "failed":
        return (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
              <X className="h-10 w-10 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg text-destructive">{statusMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try again or use a different payment method
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Smartphone className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-lg">M-Pesa Express</p>
            <p className="text-sm text-muted-foreground">Pay instantly with M-Pesa</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} disabled={status === "initiating" || status === "checking"}>
          Change
        </Button>
      </div>

      {/* Currency Badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="text-xs font-medium text-muted-foreground">Currency:</span>
          <span className="font-bold text-green-400">KES (Kenyan Shilling)</span>
        </div>
      </div>

      {status === "idle" && (
        <>
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl">
            <p className="text-sm text-center">
              You will receive an M-Pesa prompt on your phone to complete payment of{" "}
            </p>
            <p className="text-2xl font-bold text-center text-green-400 mt-2">
              KES {Math.ceil(amount).toLocaleString()}
            </p>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium">M-Pesa Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0712345678 or 254712345678"
              className="mt-1.5 text-lg h-12"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter the phone number registered with M-Pesa
            </p>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25"
            onClick={initiatePayment}
            disabled={!phoneNumber.trim()}
          >
            <Smartphone className="h-5 w-5 mr-2" />
            Pay KES {Math.ceil(amount).toLocaleString()} with M-Pesa
          </Button>
        </>
      )}

      {(status === "initiating" || status === "waiting" || status === "checking") && (
        <div className="py-10">
          {getStatusDisplay()}
          
          {status === "waiting" && (
            <div className="flex flex-col gap-3 mt-8">
              <Button
                variant="outline"
                className="w-full"
                onClick={checkPaymentStatus}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Payment Status
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStatus("idle");
                  setPollCount(0);
                }}
              >
                Try Again with Different Number
              </Button>
            </div>
          )}
        </div>
      )}

      {status === "success" && (
        <div className="py-10">
          {getStatusDisplay()}
        </div>
      )}

      {status === "failed" && (
        <div className="py-10">
          {getStatusDisplay()}
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStatus("idle");
                setPollCount(0);
                setStatusMessage("");
              }}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;
