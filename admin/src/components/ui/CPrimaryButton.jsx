import React from "react";
import CButton from "./CButton";

const PrimaryButton = ({ variant = "primary", ...props }) => {
  return <CButton variant={variant} {...props} />;
};

export default PrimaryButton;
