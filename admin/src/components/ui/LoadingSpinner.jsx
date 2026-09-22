import React from "react";
import spinnerLoadingImage from "@/assets/img/spinner.gif";

const SIZES = {
  sm: { w: 16, h: 8 },
  md: { w: 20, h: 10 },
  lg: { w: 30, h: 15 },
  xl: { w: 40, h: 20 },
};

/**
 * LoadingSpinner — drop-in replacement for the inline `<img src={spinnerLoadingImage} ... />`

 * pattern that was repeated 60+ times across the admin. Use the `size` prop (sm|md|lg|xl)
 * or pass explicit width/height.
 *
 * Examples:
 *   <LoadingSpinner />                       // 20x10 (default)
 *   <LoadingSpinner size="lg" />             // 30x15
 *   <LoadingSpinner width={18} height={18} />
 *   <LoadingSpinner className="animate-spin" />
 */
const LoadingSpinner = ({
  size = "md",
  width,
  height,
  alt = "Loading",
  className = "",
  ...rest
}) => {
  const dims = SIZES[size] || SIZES.md;
  const w = width ?? dims.w;
  const h = height ?? dims.h;
  return (
    <img
      src={spinnerLoadingImage}
      alt={alt}
      width={w}
      height={h}
      className={className}
      aria-busy="true"
      {...rest}
    />
  );
};

export default LoadingSpinner;
