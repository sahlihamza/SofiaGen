import React, { useContext, useEffect, memo } from "react";
import Drawer from "rc-drawer";
import "rc-drawer/assets/index.css";
import { FiX } from "react-icons/fi";
import { SidebarContext } from "@/context/SidebarContext";
import { IconButton } from "@sofia/ui";

/**
 * AppDrawer — generic right-side drawer that unifies the 5 standalone

 * Pattern-B drawers (CreateStaff, CreateTeam, InviteUser, ProfileView,
 * BulkAction) that each previously rendered `rc-drawer` themselves.
 *
 * Open state: pass `isOpen`/`onClose` props for explicit control, or
 * leave them off to use the SidebarContext (matching MainDrawer's API).
 *
 * Slots: `title` (top header text), `description` (subtitle), `children`
 * (body), `footer` (sticky bottom). The close button is rendered by
 * default; pass `hideCloseButton` to suppress it.
 */
const AppDrawer = ({
  isOpen: isOpenProp,
  onClose: onCloseProp,
  title,
  description,
  children,
  footer,
  width = "560px",
  placement = "right",
  hideCloseButton = false,
  className = "",
  bodyClassName = "px-6 pt-6 pb-32 flex-grow scrollbar-hide w-full max-h-full space-y-6",
  headerClassName = "px-6 py-4 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
}) => {
  const { isDrawerOpen, closeDrawer } = useContext(SidebarContext);

  const isOpen = isOpenProp !== undefined ? isOpenProp : isDrawerOpen;
  const onClose = onCloseProp || closeDrawer;

  useEffect(() => {
    // rc-drawer manages its own body scroll lock; nothing to do here.
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      placement={placement}
      width={width}
      className={`z-50 ${className}`}
      handler={false}
    >
      {(title || !hideCloseButton) && (
        <div className={headerClassName}>
          <div className="flex items-center justify-between">
            <div>
              {title && <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
              {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            {!hideCloseButton && (
              <IconButton
                variant="ghost"
                size="sm"
                iconOnly
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close drawer"
              >
                <FiX size={20} />
              </IconButton>
            )}
          </div>
        </div>
      )}

      <div className={bodyClassName}>{children}</div>

      {footer && (
        <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          {footer}
        </div>
      )}
    </Drawer>
  );
};

export default memo(AppDrawer);
