import React from "react";
import { useHistory, useParams } from "react-router-dom";

//internal import
import ProductForm from "@/components/Product_components/ProductForm";
import { C, FONT } from "@/components/Product_components/styles";

// Full-page Duplicate Product form. The source product id comes from the route
// (/products/:id/duplicate). The form is pre-filled with the source data but
// starts as a brand new product: saving creates a fresh record and leaves the
// original untouched. Cancel or a successful save returns to the products list.
const DuplicateProduct = () => {
  const history = useHistory();
  const { id } = useParams();
  const goToList = () => history.push("/products");

  return (
    <div
      className="w-full max-w-screen-2xl mx-auto rounded-lg shadow-xs overflow-hidden mt-4 mb-8"
      style={{ background: C.bg, fontFamily: FONT }}
    >
      <ProductForm
        duplicateFrom={id}
        isPage
        onCancel={goToList}
        onSuccess={goToList}
      />
    </div>
  );
};

export default DuplicateProduct;
