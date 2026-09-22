import React from "react";

const PageSpinner = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-t-transparent border-emerald-400 rounded-full animate-spin"></div>
        <div
          className="absolute inset-2 border-4 border-t-transparent border-blue-400 rounded-full animate-spin"
          style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
        ></div>
        <div
          className="absolute inset-4 border-4 border-t-transparent border-purple-400 rounded-full animate-spin"
          style={{ animationDuration: "2s" }}
        ></div>
      </div>
    </div>
  );
};

export default PageSpinner;
