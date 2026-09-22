import React from "react";
import { Input } from "@windmill/react-ui";

const InputArea = ({
  register,
  value,
  defaultValue,
  required,
  name,
  label,
  type,
  autoComplete,
  placeholder,
  rules,
  preventAutofillSuggestion,
  onChange,
  onFocus,
  onBlur,
}) => {
  const registerProps = register
    ? register(`${name}`, {
        required: required ? `${label} is required!` : false,
        ...rules,
      })
    : {};

  const {
    onChange: registerOnChange,
    onBlur: registerOnBlur,
    ref,
    ...restRegister
  } = registerProps || {};

  const handleChange = (event) => {
    if (registerOnChange) {
      registerOnChange(event);
    }
    if (onChange) {
      onChange(event);
    }
  };

  const handleBlur = (event) => {
    if (registerOnBlur) {
      registerOnBlur(event);
    }
    if (onBlur) {
      onBlur(event);
    }
  };

  const handleFocus = (event) => {
    if (onFocus) {
      onFocus(event);
    }
  };

  return (
    <>
      <Input
        {...restRegister}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        type={type}
        placeholder={placeholder}
        name={name}
        autoComplete={autoComplete}
        className="mr-2 h-12 p-2"
        // Chrome's "suggest a strong password" overlay silently pre-fills
        // password fields that look like a signup form (autocomplete="new-password").
        // Starting the field readOnly, then dropping that attribute on focus,
        // is the standard workaround: it stops Chrome from offering/injecting
        // a generated password before the admin has typed anything.
        {...(preventAutofillSuggestion
          ? {
              readOnly: true,
              onFocus: (e) => e.target.removeAttribute("readonly"),
            }
          : {})}
      />
    </>
  );
};

export default InputArea;