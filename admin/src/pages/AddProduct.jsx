import React from "react";
import { useHistory } from "react-router-dom";

//internal import
import ProductForm from "@/components/Product_components/ProductForm";
import { C, FONT } from "@/components/Product_components/styles";

// Full-page Add Product form (rendered inside the main Layout, so the app
// sidebar and header stay visible). Cancel or a successful save returns to
// the products list.
const AddProduct = () => {
  const history = useHistory();
  const goToList = () => history.push("/products");

  return (
    <div
      className="w-full max-w-screen-2xl mx-auto rounded-lg shadow-xs overflow-hidden mt-4 mb-8"
      style={{ background: C.bg, fontFamily: FONT }}
    >
      <ProductForm isPage onCancel={goToList} onSuccess={goToList} />
    </div>
  );
};

export default AddProduct;
