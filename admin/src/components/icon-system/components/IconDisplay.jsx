import React from "react";
import { IconPreview } from "../components/IconPreview";

export function IconDisplay({
  icon,
  size = 24,
  color = "currentColor",
  className = "",
  style = {},
  spin = false,
  pulse = false,
  bounce = false,
  shake = false,
  flip = null,
  rotate = 0,
  animationDuration = 1000,
  ariaLabel,
}) {
  const animationClass = [
    spin ? "icon-spin" : "",
    pulse ? "icon-pulse" : "",
    bounce ? "icon-bounce" : "",
    shake ? "icon-shake" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const transform = [
    rotate ? `rotate(${rotate}deg)` : "",
    flip === "horizontal" ? "scaleX(-1)" : "",
    flip === "vertical" ? "scaleY(-1)" : "",
    flip === "both" ? "scale(-1, -1)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={["inline-flex items-center justify-center", animationClass, className].filter(Boolean).join(" ")}
      style={{
        width: size,
        height: size,
        color,
        transform: transform || undefined,
        animationDuration: `${animationDuration}ms`,
        ...style,
      }}
      role="img"
      aria-label={ariaLabel || icon?.name}
    >
      {icon && <IconPreview icon={icon} size={size} color={color} />}
    </span>
  );
}

export const iconAnimationStyles = `
@keyframes icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes icon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes icon-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-25%); }
}
@keyframes icon-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
.icon-spin { animation: icon-spin 1s linear infinite; }
.icon-pulse { animation: icon-pulse 2s ease-in-out infinite; }
.icon-bounce { animation: icon-bounce 1s ease-in-out infinite; }
.icon-shake { animation: icon-shake 0.5s ease-in-out infinite; }
`;
