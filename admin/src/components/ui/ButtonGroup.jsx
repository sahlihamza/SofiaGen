import React from "react";

const orientationClasses = {
  horizontal: "flex-row",
  vertical: "flex-col",
};

const ButtonGroup = ({
  children,
  orientation = "horizontal",
  spacing = "gap-2",
  attached = false,
  className = "",
  ...props
}) => {
  const childrenArray = React.Children.toArray(children);

  if (attached && childrenArray.length > 1) {
    return (
      <div
        role="group"
        className={["inline-flex", orientationClasses[orientation], className].filter(Boolean).join(" ")}
        {...props}
      >
        {childrenArray.map((child, index) => {
          if (!React.isValidElement(child)) return child;
          const isFirst = index === 0;
          const isLast = index === childrenArray.length - 1;
          const roundedClass =
            orientation === "horizontal"
              ? [
                  isFirst ? "rounded-l-lg rounded-r-none" : "",
                  !isFirst && !isLast ? "rounded-none" : "",
                  isLast ? "rounded-r-lg rounded-l-none" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              : [
                  isFirst ? "rounded-t-lg rounded-b-none" : "",
                  !isFirst && !isLast ? "rounded-none" : "",
                  isLast ? "rounded-b-lg rounded-t-none" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

          const borderClass =
            orientation === "horizontal"
              ? !isLast ? "-ml-px" : ""
              : !isLast ? "-mt-px" : "";

          return React.cloneElement(child, {
            key: child.key ?? index,
            className: [child.props.className, roundedClass, borderClass].filter(Boolean).join(" "),
          });
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      className={["inline-flex", orientationClasses[orientation], spacing, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
};

export default ButtonGroup;
