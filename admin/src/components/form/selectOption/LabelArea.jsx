import React from "react";
import { Label } from "@windmill/react-ui";

const LabelArea = ({ label, required }) => {
  return (
    <Label className="col-span-4 sm:col-span-2 font-medium text-sm">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
};

export default LabelArea;
