import React from "react";

const Error = ({ errorName }) => {
  return (
    <>
      {errorName && (
        <p className="text-red-400 text-sm mt-2">{errorName.message}</p>
      )}
    </>
  );
};

export default Error;