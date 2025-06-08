import { useEffect } from "react";
import { useLocation } from "wouter";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

export default function ThankYou({ amount }: { amount?: string }) {
  const [, navigate] = useLocation();
  const query = useQuery();
  const displayAmount = amount || query.get("amount") || undefined;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold mb-2">Thank You for Your Payment!</h1>
        {displayAmount && (
          <p className="text-xl mb-2">Amount Paid: <span className="font-semibold">₹{parseFloat(displayAmount).toLocaleString()}</span></p>
        )}
        <p className="text-gray-600 mb-4">Your payment was successful.</p>
        <p className="text-gray-600 mb-4">This payment and Invoice process is done by <a href="https://www.invoicebuddy.in" className="text-blue-600 underline">Invoice Buddy</a></p>
        <p className="text-sm text-gray-400">You will be redirected to the Invoice Buddy home page shortly. If you are not redirected, <a href="/" className="text-blue-600 underline">click here</a>.</p>
      </div>
    </div>
  );
} 