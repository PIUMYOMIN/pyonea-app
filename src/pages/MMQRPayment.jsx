// components/MMQRPayment.jsx
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const MMQRPayment = ({ amount, orderNumber, onPaymentSuccess, onPaymentFailed }) => {
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  // Generate a static QR code data for demo
  const qrData = JSON.stringify({
    amount: amount,
    order_id: orderNumber,
    merchant: "Your B2B Platform",
    account: "09123456789", // Demo merchant account
    timestamp: new Date().toISOString(),
    note: `Payment for order ${orderNumber}`
  });

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && paymentStatus === 'pending') {
      setPaymentStatus('failed');
      onPaymentFailed('Payment timeout');
    }
  }, [countdown, paymentStatus]);

  // Simulate payment processing
  const simulatePayment = () => {
    setPaymentStatus('processing');

    // Simulate API call to check payment
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2; // 80% success rate for demo
      if (isSuccess) {
        setPaymentStatus('success');
        onPaymentSuccess({
          transactionId: 'MMQR_' + Date.now(),
          amount: amount,
          paidAt: new Date().toISOString()
        });
      } else {
        setPaymentStatus('failed');
        onPaymentFailed('Payment failed. Please try again.');
      }
    }, 3000);
  };

  const handleManualConfirm = () => {
    // Only allow confirmation if status is pending
    if (paymentStatus !== 'pending') {
      return;
    }

    setPaymentStatus('processing');

    // Simulate API call to check payment
    setTimeout(() => {
      const isSuccess = Math.random() > 0.2; // 80% success rate for demo
      if (isSuccess) {
        setPaymentStatus('success');
        onPaymentSuccess({
          transactionId: 'MMQR_' + Date.now(),
          amount: amount,
          paidAt: new Date().toISOString()
        });
      } else {
        setPaymentStatus('failed');
        onPaymentFailed('Payment failed. Please try again.');
      }
    }, 3000);
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">MMQR Payment</h3>
        <p className="text-sm text-gray-600 mt-1">
          Scan the QR code with your mobile banking app
        </p>
      </div>

      {/* Payment Status */}
      {paymentStatus === 'pending' && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">
              Time remaining: {formatTime(countdown)}
            </span>
            <ClockIcon className="h-5 w-5 text-yellow-600" />
          </div>
        </div>
      )}

      {paymentStatus === 'processing' && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium text-blue-800">
              Verifying payment...
            </span>
          </div>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Payment successful!
            </span>
          </div>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <XCircleIcon className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              Payment failed
            </span>
          </div>
        </div>
      )}

      {/* QR Code */}
      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
        <div className="flex justify-center">
          <QRCodeSVG
            value={qrData}
            size={200}
            level="M"
            includeMargin={true}
          />
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Amount:</span>
          <span className="font-semibold">{formatMMK(amount)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Order:</span>
          <span className="font-mono text-sm">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Merchant:</span>
          <span className="text-sm">Your B2B Platform</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-600 mb-4">
        <p className="font-medium mb-1">How to pay:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Open your mobile banking app</li>
          <li>Tap on 'Scan QR' or 'MMQR'</li>
          <li>Scan the QR code above</li>
          <li>Confirm the payment details</li>
          <li>Enter your PIN to complete</li>
        </ol>
      </div>

      {/* Demo Controls */}
      <div className="border-t pt-4">
        <p className="text-xs text-gray-500 text-center mb-3">
          Demo Controls (Development Only)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleManualConfirm}
            disabled={paymentStatus !== 'pending'}
            className="bg-green-600 text-white py-2 px-3 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simulate Success
          </button>
          <button
            onClick={() => {
              if (paymentStatus === 'pending') {
                setPaymentStatus('failed');
                onPaymentFailed('Payment was cancelled');
              }
            }}
            disabled={paymentStatus !== 'pending'}
            className="bg-red-600 text-white py-2 px-3 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simulate Failure
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility function (make sure to define this or import)
function formatMMK(amount) {
  return new Intl.NumberFormat('en-MM', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0
  }).format(amount);
}

export default MMQRPayment;