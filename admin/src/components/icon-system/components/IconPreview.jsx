import React from "react";

export function IconPreview({ icon, size = 24, color = "currentColor", className = "", style = {} }) {
  if (!icon) return null;

  if (icon.svgContent) {
    return (
      <svg
        className={className}
        style={{ width: size, height: size, color, ...style }}
        viewBox={icon.viewBox || "0 0 24 24"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: icon.svgContent }}
        aria-label={icon.name}
        role="img"
      />
    );
  }

  if (icon.content) {
    return (
      <svg
        className={className}
        style={{ width: size, height: size, color, ...style }}
        viewBox={icon.viewBox || "0 0 24 24"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: icon.content }}
        aria-label={icon.name}
        role="img"
      />
    );
  }

  if (icon.svg) {
    return (
      <svg
        className={className}
        style={{ width: size, height: size, color, ...style }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: icon.svg }}
        aria-label={icon.name}
        role="img"
      />
    );
  }

  return (
    <span className={className} style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }} aria-label={icon.name}>
      {icon.name}
    </span>
  );
}
