import React from "react";
import ImageUploader from "@/components/store/ImageUploader";

const StoreLogoSection = ({ imageUrl, setImageUrl }) => {
  return (
    <div className="sm:col-span-2">
      <ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />
    </div>
  );
};

export default StoreLogoSection;
