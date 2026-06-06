// components/DeliveryChoice.jsx
import React, { useState } from 'react';

const DeliveryChoice = ({ order, onDeliveryMethodChoose }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [platformDeliveryFee, setPlatformDeliveryFee] = useState(0);

  const calculatePlatformFee = () => {
    // Calculate based on distance, weight, etc.
    const baseFee = 5000;
    const weightFee = order.total_weight * 100; // 100 MMK per kg
    const distanceFee = calculateDistanceFee(order.shipping_address);
    return baseFee + weightFee + distanceFee;
  };

  const handleSubmit = async () => {
    try {
      const response = await api.post(`/orders/${order.id}/delivery-method`, {
        delivery_method: selectedMethod,
        delivery_fee: selectedMethod === 'platform' ? platformDeliveryFee : 0
      });
      
      onDeliveryMethodChoose(response.data.data);
    } catch (error) {
      console.error('Failed to set delivery method:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Choose Delivery Method</h3>
      
      <div className="space-y-4">
        <div 
          className={`border-2 rounded-lg p-4 cursor-pointer ${
            selectedMethod === 'supplier' ? 'border-green-500 bg-green-50' : 'border-gray-200'
          }`}
          onClick={() => setSelectedMethod('supplier')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Self Delivery</h4>
              <p className="text-sm text-gray-600">
                You arrange and pay for delivery yourself
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>• You control the delivery process</li>
                <li>• No platform delivery fees</li>
                <li>• You handle customer delivery communication</li>
              </ul>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-600">Free</p>
              <p className="text-xs text-gray-500">No platform fee</p>
            </div>
          </div>
        </div>

        <div 
          className={`border-2 rounded-lg p-4 cursor-pointer ${
            selectedMethod === 'platform' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
          onClick={() => {
            setSelectedMethod('platform');
            setPlatformDeliveryFee(calculatePlatformFee());
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Platform Logistics</h4>
              <p className="text-sm text-gray-600">
                We handle delivery for you
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-1">
                <li>• Professional logistics service</li>
                <li>• Real-time tracking</li>
                <li>• Delivery confirmation & proof</li>
                <li>• Platform manages customer communication</li>
              </ul>
            </div>
            <div className="text-right">
              <p className="font-semibold text-blue-600">
                {formatMMK(platformDeliveryFee)}
              </p>
              <p className="text-xs text-gray-500">Platform service fee</p>
            </div>
          </div>
        </div>
      </div>

      {selectedMethod && (
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Confirm Delivery Method
          </button>
        </div>
      )}
    </div>
  );
};

export default DeliveryChoice;