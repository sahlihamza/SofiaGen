import React from "react";

const CAvatar = ({
  src,
  alt = "avatar",
  name = "",
  size = "md",
  className = "",
}) => {
  const sizeClasses = {
    xs: "h-7 w-7 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-14 w-14 text-xl",
  };

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={[
        "flex items-center justify-center overflow-hidden rounded-full bg-gray-200 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-100",
        sizeClasses[size] || sizeClasses.md,
        className,
      ].filter(Boolean).join(" ")}
    >
      {src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : initials}
    </div>
  );
};

export default CAvatar;
