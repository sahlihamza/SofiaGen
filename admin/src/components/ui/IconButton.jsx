import React from "react";
import { buttonTokens } from "./button/tokens";
import { resolveIcon } from "./button/icons";
import { Button } from "@sofia/ui";

const IconButton = ({
  icon,
  variant = "ghost",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  "aria-label": ariaLabel,
  type = "button",
  ...props
}) => {
  const resolvedIcon = resolveIcon(icon);

  if (!ariaLabel && typeof icon === "string") {
    ariaLabel = icon;
  }

  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;
  const iconNode = resolvedIcon
    ? React.isValidElement(resolvedIcon)
      ? resolvedIcon
      : React.createElement(resolvedIcon, { size: iconSize })
    : null;

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      iconOnly
      disabled={disabled}
      loading={loading}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={[
        "rounded-lg border border-transparent",
        "transition focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "dark:focus:ring-offset-gray-900",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {iconNode && <span className="inline-flex items-center" aria-hidden="true">{iconNode}</span>}
    </Button>
  );
};

export default IconButton;
