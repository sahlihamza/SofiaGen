import React from "react";
import CButton from "./CButton";

const SecondaryButton = ({ variant = "secondary", ...props }) => {
  return <CButton variant={variant} {...props} />;
};

export default SecondaryButton;
