import React from "react";
import { Button } from "@sofia/ui";

const CStatusSwitch = ({ checked = false, onChange, label, disabled = false, className = "" }) => {
  return (
    <label className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}>
      <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={[
          "relative inline-flex h-6 w-11 items-center rounded-full transition p-0",
          checked ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].filter(Boolean).join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-1",
          ].filter(Boolean).join(" ")}
        />
      </Button>
    </label>
  );
};

export default CStatusSwitch;
