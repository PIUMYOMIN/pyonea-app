import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import CODPayment from "../payments/CODPayment";
import MMQRPayment from "../payments/MMQRPayment";
// import WalletPayment from "./WalletPayment";
import WalletPayment from "../payments/WalletPayment"; // Assuming this is the correct path

function formatMMK(amount) {
  return amount.toLocaleString("en-MM", {
    style: "currency",
    currency: "MMK",
    minimumFractionDigits: 0
  });
}

const PaymentMethod = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // In a real app, you would get the total from location state or from a global state
  const total = 125000; // Example total

  const paymentMethods = [
    {
      id: "cod",
      name: "Cash on Delivery",
      component: <CODPayment />,
      icon: (
        <svg
          className="h-6 w-6 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )
    },
    {
      id: "mmqr",
      name: "MMQR Payment",
      component: <MMQRPayment />,
      icon: (
        <svg
          className="h-6 w-6 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      )
    },
    {
      id: "wallet",
      name: "Mobile Wallet",
      component: <WalletPayment />,
      icon: (
        <svg
          className="h-6 w-6 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      )
    }
  ];

  const [selectedMethod, setSelectedMethod] = React.useState(null);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Back to checkout
      </button>

      <h1 className="text-2xl font-bold mb-6">Select Payment Method</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Order Total</h2>
            <span className="text-lg font-semibold">
              {formatMMK(total)}
            </span>
          </div>
        </div>

        {!selectedMethod
          ? <div className="p-4">
              <h3 className="text-lg font-medium mb-4">
                Available Payment Methods
              </h3>
              <div className="space-y-3">
                {paymentMethods.map(method =>
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method)}
                    className="w-full flex items-center p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="mr-4">
                      {method.icon}
                    </div>
                    <div className="text-left">
                      <h4 className="font-medium">
                        {method.name}
                      </h4>
                    </div>
                  </button>
                )}
              </div>
            </div>
          : <div className="p-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                Back to payment methods
              </button>

              <h3 className="text-lg font-medium mb-4">
                {selectedMethod.name}
              </h3>
              {selectedMethod.component}

              <button
                onClick={() => {
                  // Handle payment submission
                  alert(`Processing ${selectedMethod.name} payment`);
                  // In a real app, you would process the payment here
                  // Then navigate to order confirmation page
                  navigate("/order-confirmation");
                }}
                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium"
              >
                Pay with {selectedMethod.name}
              </button>
            </div>}
      </div>
    </div>
  );
};

export default PaymentMethod;
