import React from "react";

import { Button } from "@sofia/ui";

const ActiveButton = ({ tapValue, activeValue, handleProductTap }) => {
  return (
    <Button
      className={`inline-block px-4 py-2 text-base ${
        tapValue === activeValue &&
        "text-emerald-600 border-emerald-600 dark:text-emerald-500 dark:border-emerald-500 rounded-t-lg border-b-2"
      } focus:outline-none`}
      aria-current="page"
      onClick={() => handleProductTap(activeValue, false, tapValue)}
    >
      {activeValue}
    </Button>
  );
};

export default ActiveButton;
