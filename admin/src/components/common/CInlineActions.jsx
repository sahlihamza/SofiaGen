import React from "react";

const CInlineActions = ({ actions = [], className = "" }) => {
  if (!actions.length) return null;

  return (
    <div className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      {actions.map((action, index) => (
        <React.Fragment key={action.key || index}>{action}</React.Fragment>
      ))}
    </div>
  );
};

export default CInlineActions;
