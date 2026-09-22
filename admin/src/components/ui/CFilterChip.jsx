import React from "react";
import { Button } from "@sofia/ui";

const CFilterChip = ({ label, active = false, onClick, className = "" }) => {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "outline"}
      size="sm"
      onClick={onClick}
      className={["rounded-full px-3 py-1.5", className].filter(Boolean).join(" ")}
    >
      {label}
    </Button>
  );
};

export default CFilterChip;
