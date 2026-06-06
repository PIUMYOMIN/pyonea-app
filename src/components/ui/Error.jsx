// src/components/ui/Error.jsx
const Error = ({ message, onRetry }) =>
  <div className="text-center py-8">
    <div className="text-red-500 mb-4">
      {message}
    </div>
    {onRetry &&
      <button
        onClick={onRetry}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Retry
      </button>}
  </div>;

export default Error;
