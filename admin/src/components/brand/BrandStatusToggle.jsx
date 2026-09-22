import { Button } from "@sofia/ui";

const BrandStatusToggle = ({ status, onClick }) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      role="switch"
      aria-checked={status}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none p-0 ${
        status ? "bg-emerald-500" : "bg-red-500"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          status ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </Button>
  );
};

export default BrandStatusToggle;
