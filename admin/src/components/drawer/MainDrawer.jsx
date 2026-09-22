import React, { useContext, useEffect, useState, memo } from "react";
import { useLocation } from "react-router-dom";

import { SidebarContext } from "@/context/SidebarContext";
import { Drawer } from "@sofia/ui";

const MainDrawer = ({ children, product, hideCloseButton = false, isOpen, onClose }) => {
  const { isDrawerOpen, closeDrawer, windowDimension } = useContext(SidebarContext);

  const drawerOpen = isOpen !== undefined ? isOpen : isDrawerOpen;
  const handleClose = onClose || closeDrawer;
  const [isProduct, setIsProduct] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/products") {
      setIsProduct(true);
    }
  }, []);

  const drawerWidth = windowDimension <= 575
    ? "100%"
    : product || isProduct
      ? "85%"
      : "70%";

  return (
    <Drawer
      isOpen={drawerOpen}
      onClose={handleClose}
      placement="right"
      width={drawerWidth}
      hideCloseButton={hideCloseButton}
    >
      <div className="flex flex-col w-full h-full justify-between">
        {children}
      </div>
    </Drawer>
  );
};

export default memo(MainDrawer);
