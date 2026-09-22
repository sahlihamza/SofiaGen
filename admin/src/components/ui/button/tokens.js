const sizes = {
  sm: "px-3 h-8 text-xs",
  md: "px-4 h-10 text-sm",
  lg: "px-5 h-12 text-base",
};

const radius = "rounded-lg";

const baseLayout = [
  "inline-flex items-center justify-center gap-2",
  radius,
  "border font-medium whitespace-nowrap",
  "transition focus:outline-none focus:ring-2 focus:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "dark:focus:ring-offset-gray-900",
].join(" ");

const iconOnly = {
  sm: "h-8 w-8 p-0",
  md: "h-10 w-10 p-0",
  lg: "h-12 w-12 p-0",
};

const spinner = "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent";

const variants = {
  primary: [
    "border-emerald-600 bg-emerald-600 text-white",
    "hover:bg-emerald-700 active:bg-emerald-800",
    "focus:ring-emerald-500",
  ].join(" "),

  secondary: [
    "border-gray-300 bg-white text-gray-700",
    "hover:bg-gray-50 active:bg-gray-100",
    "focus:ring-gray-300",
    "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
    "dark:hover:bg-gray-700 dark:active:bg-gray-600",
  ].join(" "),

  outline: [
    "border-gray-300 bg-transparent text-gray-700",
    "hover:bg-gray-50 active:bg-gray-100",
    "focus:ring-gray-300",
    "dark:border-gray-600 dark:text-gray-200",
    "dark:hover:bg-gray-700 dark:active:bg-gray-600",
  ].join(" "),

  ghost: [
    "border-transparent bg-transparent text-gray-700",
    "hover:bg-gray-100 active:bg-gray-200",
    "focus:ring-gray-300",
    "dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600",
  ].join(" "),

  danger: [
    "border-red-600 bg-red-600 text-white",
    "hover:bg-red-700 active:bg-red-800",
    "focus:ring-red-500",
  ].join(" "),

  success: [
    "border-emerald-600 bg-emerald-600 text-white",
    "hover:bg-emerald-700 active:bg-emerald-800",
    "focus:ring-emerald-500",
  ].join(" "),

  warning: [
    "border-amber-500 bg-amber-500 text-white",
    "hover:bg-amber-600 active:bg-amber-700",
    "focus:ring-amber-400",
  ].join(" "),
};

const iconOnlyVariants = {
  primary: "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  secondary: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
  outline: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
  ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
  danger: "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
  success: "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  warning: "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20",
};

export const buttonTokens = {
  sizes,
  iconOnly,
  baseLayout,
  spinner,
  variants,
  iconOnlyVariants,
};

export default buttonTokens;
