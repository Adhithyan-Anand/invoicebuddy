import { useEffect } from "react";
import { useLocation } from "wouter";

// Helper to get query params
function useQuery() {
  return new URLSearchParams(window.location.search);
}

export default function PayInvoicePage() {
  const [location, navigate] = useLocation();

  // Extract token from /pay/:token
  const match = location.match(/\/pay\/(.+)/);
  const token = match ? match[1] : null;

  useEffect(() => {
    if (!token) return;

    const startPayment = async () => {
      try {
        // Fetch payment details from backend
        const res = await fetch(`/api/invoices/payment/${token}`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Invalid or expired payment link.");
          return;
        }

        // Load Razorpay checkout
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: "Invoice Payment",
          description: `Invoice Payment` ,
          order_id: data.orderId,
          handler: function (response: any) {
            // Verify payment on backend
            fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
              .then((res) => res.json())
              .then((result) => {
                if (result.success) {
                  alert("Payment successful! Thank you.");
                  navigate(`/thank-you?amount=${(data.amount / 100).toFixed(2)}`);
                } else {
                  alert("Payment verification failed. Please contact support.");
                }
              });
          },
          theme: { color: "#2563eb" },
        };

        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        alert("Failed to initialize payment. Please try again.");
      }
    };

    startPayment();
  }, [token, navigate]);

  useEffect(() => {
    // Dynamically load Razorpay script if not already present
    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing Payment...</h1>
        <p>Please wait while we redirect you to the payment gateway.</p>
      </div>
    </div>
  );
} 