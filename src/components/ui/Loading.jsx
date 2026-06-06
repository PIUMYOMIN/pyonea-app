import React from "react";

const sizeMap = {
  sm:  "h-5 w-5",
  md:  "h-8 w-8",
  lg:  "h-12 w-12",
  xl:  "h-16 w-16",
};

const colorMap = {
  green: "border-green-600 dark:border-green-400",
  white: "border-white",
  gray:  "border-gray-400 dark:border-slate-500",
};

// Spinner — a single spinning ring
const Spinner = ({ size = "lg", color = "green", className = "" }) => (
  <div
    className={`
      animate-spin rounded-full border-t-2 border-b-2
      ${sizeMap[size] ?? sizeMap.lg}
      ${colorMap[color] ?? colorMap.green}
      ${className}
    `}
  />
);

// Loading — centered spinner, optionally full-page
const Loading = ({
  size = "lg",
  color = "green",
  fullPage = false,
  message = "",
  className = "",
}) => {
  const wrapper = fullPage
    ? "min-h-screen flex flex-col items-center justify-center gap-3"
    : "flex flex-col items-center justify-center gap-3 py-12";

  return (
    <div className={`${wrapper} ${className}`}>
      <Spinner size={size} color={color} />
      {message && (
        <p className="text-sm text-gray-500 dark:text-slate-400">{message}</p>
      )}
    </div>
  );
};

export { Spinner };
export default Loading;
