import React from "react";
import { Link } from "react-router-dom";

const ActionMenuItem = ({
  to,
  href,
  target,
  rel,
  onClick,
  disabled = false,
  className = "",
  icon,
  trailing,
  children,
}) => {
  const content = (
    <>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {trailing}
    </>
  );

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  if (to) {
    return (
      <Link
        to={to}
        role="menuitem"
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        className={className}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel || (target === "_blank" ? "noreferrer" : undefined)}
        role="menuitem"
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={className}
    >
      {content}
    </button>
  );
};

export default ActionMenuItem;
