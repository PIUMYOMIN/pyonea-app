import React from "react";
import { Link } from "react-router-dom";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useCompare } from "../../context/CompareContext";

const FloatingCompareButton = () => {
  const { compareCount } = useCompare();

  if (!compareCount) return null;

  return (
    <Link
      to="/compare"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-green-700"
      aria-label={`Compare ${compareCount} products`}
    >
      <ArrowsRightLeftIcon className="h-4 w-4" />
      Compare ({compareCount})
    </Link>
  );
};

export default FloatingCompareButton;

