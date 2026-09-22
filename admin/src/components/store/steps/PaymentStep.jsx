import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCreditCard, FiCheck, FiX, FiInfo, FiLock, FiClock } from "react-icons/fi";
import requests from "@/services/httpService";
import { Button } from "@sofia/ui";

const SectionCard = ({ icon: Icon, title, subtitle, children, className = "" }) => (
  <section className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
    <header className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      {Icon && (
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Icon size={17} />
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
    <div className="px-5 py-5">{children}</div>
  </section>
);

const PaymentMethodButton = ({ method, icon, label, description, isSelected, onClick, disabled }) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`w-full h-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
      isSelected
        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20 shadow-sm"
        : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-700"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
      isSelected ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-700"
    }`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${isSelected ? "text-emerald-700 dark:text-emerald-300" : "text-gray-800 dark:text-gray-200"}`}>
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
    </div>
    <span
      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        isSelected ? "border-emerald-500 bg-emerald-500" : "border-gray-300 dark:border-gray-600"
      }`}
    >
      {isSelected && <FiCheck size={12} className="text-white" />}
    </span>
  </Button>
);

const PaymentStep = ({
  formData,
  onDataChange,
  storeId,
  planId,
  plans = [],
  onPaymentComplete,
  onPaymentError,
  onSkipPayment,
}) => {
  const { t } = useTranslation();
  const [selectedGateway, setSelectedGateway] = useState(formData.paymentGateway || "manual");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);

  const plan = plans.find((p) => p._id === formData.planId) || formData.selectedPlan;
  const price = formData.billingCycle === "yearly" ? plan?.pricing?.yearly : plan?.pricing?.monthly;
  const currency = plan?.pricing?.currency || "USD";
  const total = Math.max((price || 0) - (formData.discount?.discountAmount || 0), 0);
  const paymentStoreId = formData.tempStoreId || storeId;

  useEffect(() => {
    onDataChange({ paymentGateway: selectedGateway });
  }, [selectedGateway, onDataChange]);

  const handleCreatePaymentIntent = async () => {
    if (!paymentStoreId) {
      setError(t("CreateStoreFirst") || "Please create the store first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentResult(null);

    try {
      const result = await requests.post("/platform/payments/create-intent", {
        storeId: paymentStoreId,
        planId: formData.planId,
        billingCycle: formData.billingCycle || "monthly",
        gateway: selectedGateway,
        couponCode: formData.couponCode,
        trialDays: plan?.pricing?.trialDays || 0,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create payment intent");
      }

      setPaymentResult(result.data);
      if (selectedGateway === "manual") {
        onPaymentComplete?.(result.data);
      } else if (selectedGateway === "stripe" && result.data.gateway?.clientSecret) {
        initializeStripe(result.data.gateway.clientSecret, result.data.payment._id);
      } else if (selectedGateway === "paypal" && result.data.gateway?.approvalUrl) {
        window.location.href = result.data.gateway.approvalUrl;
      } else if (selectedGateway === "razorpay" && result.data.gateway?.keyId) {
        initializeRazorpay(result.data.gateway, result.data.payment._id);
      }
    } catch (err) {
      setError(err.message);
      onPaymentError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const initializeStripe = async (clientSecret, paymentId) => {
    if (!window.Stripe) {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      document.body.appendChild(script);
      await new Promise((resolve) => {
        script.onload = resolve;
        setTimeout(resolve, 2000);
      });
    }

    const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");
    if (!stripe) {
      setError("Stripe failed to load");
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: {
          number: "4242424242424242",
          exp_month: 12,
          exp_year: 2028,
          cvc: "123",
        },
        billing_details: {
          name: "Store Admin",
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message);
      onPaymentError?.(stripeError.message);
    } else if (paymentIntent.status === "succeeded") {
      setPaymentResult((prev) => ({ ...prev, status: "paid" }));
      onPaymentComplete?.(paymentIntent);
    }
  };

  const initializeRazorpay = (gatewayData, paymentId) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);

    script.onload = () => {
      const options = {
        key: gatewayData.keyId,
        amount: gatewayData.amount,
        currency: gatewayData.currency,
        name: "Sofiagen",
        description: `Plan subscription: ${plan?.name}`,
        order_id: gatewayData.orderId,
          handler: async (response) => {
            try {
              const result = await requests.post(`/platform/payments/${paymentId}/confirm`, {
                transactionId: response.razorpay_payment_id,
                gatewayResponse: response,
              });
            if (result.success) {
              setPaymentResult((prev) => ({ ...prev, status: "paid" }));
              onPaymentComplete?.(result.data);
            } else {
              setError(result.message || "Payment failed");
              onPaymentError?.(result.message);
            }
          } catch {
            setError("Payment confirmation failed");
            onPaymentError?.("Payment confirmation failed");
          }
        },
        theme: { color: "#10b981" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    };
  };

  const handleManualConfirm = async () => {
    if (!paymentStoreId) {
      setError(t("CreateStoreFirst") || "Please create the store first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const result = await requests.post("/platform/payments/create-intent", {
        storeId: paymentStoreId,
        planId: formData.planId,
        billingCycle: formData.billingCycle || "monthly",
        gateway: "manual",
        couponCode: formData.couponCode,
        trialDays: plan?.pricing?.trialDays || 0,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create payment");
      }

      setPaymentResult(result.data);
      onPaymentComplete?.(result.data);
    } catch (err) {
      setError(err.message);
      onPaymentError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setPaymentResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 w-full">
      {!paymentResult ? (
        <>
          <SectionCard
            icon={FiCreditCard}
            title={t("PaymentMethod") || "Payment Method"}
            subtitle={t("PaymentMethodDesc") || "Select how you want to pay for this subscription."}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PaymentMethodButton
                method="stripe"
                icon={<span className="text-indigo-600 font-bold text-xs">S</span>}
                label={t("Stripe") || "Stripe"}
                description={t("Pay by card via Stripe") || "Pay by card via Stripe"}
                isSelected={selectedGateway === "stripe"}
                onClick={() => setSelectedGateway("stripe")}
                disabled={isProcessing}
              />
              <PaymentMethodButton
                method="paypal"
                icon={<span className="text-blue-600 font-bold text-xs">P</span>}
                label={t("PayPal") || "PayPal"}
                description={t("Pay with your PayPal account") || "Pay with your PayPal account"}
                isSelected={selectedGateway === "paypal"}
                onClick={() => setSelectedGateway("paypal")}
                disabled={isProcessing}
              />
              <PaymentMethodButton
                method="razorpay"
                icon={<span className="text-green-600 font-bold text-xs">R</span>}
                label={t("Razorpay") || "Razorpay"}
                description={t("Pay via Razorpay") || "Pay via Razorpay"}
                isSelected={selectedGateway === "razorpay"}
                onClick={() => setSelectedGateway("razorpay")}
                disabled={isProcessing}
              />
              <PaymentMethodButton
                method="manual"
                icon={<FiLock size={18} className="text-gray-500" />}
                label={t("ManualPayment") || "Manual Payment"}
                description={t("Pay later via bank transfer") || "Pay later via bank transfer"}
                isSelected={selectedGateway === "manual"}
                onClick={() => setSelectedGateway("manual")}
                disabled={isProcessing}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={FiInfo}
            title={t("PaymentSummary") || "Payment Summary"}
            subtitle={t("PaymentSummaryDesc") || "Review the charges before completing payment."}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{plan?.name} - {formData.billingCycle}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{price} {currency}</span>
              </div>
              {formData.discount?.discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("Discount") || "Discount"}</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">-{formData.discount.discountAmount} {currency}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Total") || "Total"}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{total} {currency}</span>
              </div>
            </div>
            <div className="mt-4">
              {!paymentStoreId && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-3">
                  <FiInfo size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t("CreateStoreFirst") || "Please create the store first by clicking \"Create Store (Pay Later)\" below, then you can complete the payment."}
                  </p>
                </div>
              )}
              <Button
                type="button"
                onClick={selectedGateway === "manual" ? handleManualConfirm : handleCreatePaymentIntent}
                disabled={isProcessing || !total || !paymentStoreId}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("Processing") || "Processing"}
                  </>
                ) : selectedGateway === "manual" ? (
                  <>
                    <FiCheck size={16} />
                    {t("ConfirmManualPayment") || "Confirm Manual Payment"}
                  </>
                ) : (
                  <>
                    <FiLock size={14} />
                    {t("PayNow") || "Pay Now"}
                  </>
                )}
              </Button>
              {onSkipPayment && (
                <Button
                  type="button"
                  onClick={onSkipPayment}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-3"
                >
                  <FiClock size={16} />
                  {t("SkipPayment") || "Pay Later â€” Create Store Without Payment"}
                </Button>
              )}
            </div>
          </SectionCard>
        </>
      ) : (
        <SectionCard
          icon={FiCheck}
          title={paymentResult.status === "paid" ? t("PaymentSuccessful") || "Payment Successful" : t("PaymentPending") || "Payment Pending"}
          subtitle={paymentResult.status === "paid" ? t("PaymentSuccessDesc") || "Your payment has been processed." : t("PaymentPendingDesc") || "Your payment is being processed."}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("PaymentId") || "Payment ID"}</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">{paymentResult.payment._id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("Amount") || "Amount"}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{paymentResult.payment.amount} {paymentResult.payment.currency}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t("Status") || "Status"}</span>
              <span className={`text-sm font-medium ${paymentResult.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                {paymentResult.status === "paid" ? (t("Paid") || "Paid") : (t("Pending") || "Pending")}
              </span>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  {t("Retry") || "Retry"}
                </Button>
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default PaymentStep;
