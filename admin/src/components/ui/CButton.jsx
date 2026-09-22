import React from "react";
import Button from "@sofia/ui";
import { resolveIcon } from "./button/icons";
import { Button } from "@sofia/ui";

const CButton = ({

  children,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = "left",
  iconOnly = false,
  leftIcon = null,
  rightIcon = null,
  fullWidth = false,
  as: Component = "button",
  "aria-label": ariaLabel,
  ...props
}) => {
  const resolvedIcon = resolveIcon(icon);
  const resolvedLeft = leftIcon != null ? leftIcon : iconPosition === "left" ? resolvedIcon : null;
  const resolvedRight = rightIcon != null ? rightIcon : iconPosition === "right" ? resolvedIcon : null;

  return (
    <Button
      variant={variant}
      size={size}
      type={type}
      className={className}
      disabled={disabled}
      loading={loading}
      iconOnly={iconOnly}
      leftIcon={resolvedLeft}
      rightIcon={resolvedRight}
      fullWidth={fullWidth}
      as={Component}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Button>
  );
};

export default CButton;
