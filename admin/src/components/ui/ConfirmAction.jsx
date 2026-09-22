import React, { useState } from "react";
import CButton from "./CButton";
import CConfirmModal from "../modals/CConfirmModal";
import { resolveIcon } from "./button/icons";

const ConfirmAction = ({
  children,
  variant = "danger",
  size = "md",
  icon = null,
  iconPosition = "left",
  type = "button",
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  triggerClassName = "",

  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant,
  modalSize = "sm",

  onConfirm,
  onCancel,

  asIconButton = false,
  "aria-label": ariaLabel,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (disabled || loading) return;
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onCancel?.();
  };

  const handleConfirm = async (e) => {
    await onConfirm?.(e);
    setOpen(false);
  };

  const resolvedIcon = resolveIcon(icon);
  const finalConfirmVariant = confirmVariant || variant;

  return (
    <>
      {asIconButton ? (
        <CButton
          type={type}
          iconOnly
          variant={variant}
          size={size}
          icon={icon}
          aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
          disabled={disabled}
          loading={loading}
          onClick={handleOpen}
          className={[className, triggerClassName].filter(Boolean).join(" ")}
          {...props}
        />
      ) : (
        <CButton
          type={type}
          variant={variant}
          size={size}
          icon={icon}
          iconPosition={iconPosition}
          disabled={disabled}
          loading={loading}
          fullWidth={fullWidth}
          onClick={handleOpen}
          className={[className, triggerClassName].filter(Boolean).join(" ")}
          leftIcon={iconPosition === "left" ? resolvedIcon : null}
          rightIcon={iconPosition === "right" ? resolvedIcon : null}
          {...props}
        >
          {children}
        </CButton>
      )}

      <CConfirmModal
        isOpen={open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={title}
        description={description}
        confirmLabel={confirmText}
        cancelLabel={cancelText}
        danger={variant === "danger"}
        loading={loading}
        size={modalSize}
        confirmButtonProps={{ variant: finalConfirmVariant }}
      />
    </>
  );
};

export default ConfirmAction;
