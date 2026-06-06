import React from "react";
import { Spinner } from "./Loading";

// Thin wrapper kept for backward compatibility.
// Prefers the shared Spinner internally for consistency.
const LoadingSpinner = ({
  size = "medium",
  color = "green",
  label = "",
  className = "",
}) => {
  const sizeAlias = { small: "sm", medium: "md", large: "lg" };
  const colorAlias = { green: "green", white: "white", gray: "gray" };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Spinner
        size={sizeAlias[size] ?? size}
        color={colorAlias[color] ?? color}
      />
      {label && (
        <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
