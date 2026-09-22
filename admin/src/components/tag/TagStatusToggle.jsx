import { Button } from "@sofia/ui";
const TagStatusToggle = ({ status, onClick }) => {
  const isActive = status === "active";

  return (
    <Button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={isActive}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        isActive ? "bg-emerald-500" : "bg-red-500"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </Button>
  );
};

export default TagStatusToggle;
