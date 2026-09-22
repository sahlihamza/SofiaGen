import React, { useContext } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import { C, FONT } from "@/components/Product_components/styles";
import ProductForm from "@/components/Product_components/ProductForm";

const ProductDrawer = ({ id }) => {
  const { toggleDrawer } = useContext(SidebarContext);

  return (
    <Scrollbars
      className="w-full relative"
      style={{ background: C.bg, fontFamily: FONT }}
    >
      <ProductForm id={id} onCancel={toggleDrawer} />
    </Scrollbars>
  );
};

export default React.memo(ProductDrawer);
