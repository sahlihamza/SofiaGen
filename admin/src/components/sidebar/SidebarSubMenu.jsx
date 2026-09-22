import React, { useState } from "react";
import { NavLink, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
import { Button } from "@sofia/ui";
  IoChevronDownOutline,
  IoChevronForwardOutline,
  IoRemoveSharp,
} from "react-icons/io5";

const SidebarSubMenu = ({ route, level = 0 }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(level === 0 ? false : true);

  const hasChildren = route.routes && route.routes.length > 0;
  const isClickable = !hasChildren && route.path;

  return (
    <li className={`relative ${level === 0 ? "px-6 py-3" : "py-1"}`} key={route.name}>
      {isClickable ? (
        <NavLink
          to={route.path}
          className="flex items-center font-serif py-1 text-sm text-gray-600 hover:text-emerald-600 cursor-pointer"
          activeClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-md"
          rel="noreferrer"
        >
          <Route path={route.path} exact={route.exact}>
            <span
              className="absolute inset-y-0 left-0 w-1 bg-emerald-600 rounded-tr-lg rounded-br-lg"
              aria-hidden="true"
            ></span>
          </Route>
          <span className="text-xs text-gray-500 pr-1">
            <IoRemoveSharp />
          </span>
          <span className="text-gray-500 hover:text-emerald-600 dark:hover:text-gray-200">
            {t(route.name, { defaultValue: route.name })}
          </span>
        </NavLink>
      ) : (
        <Button
          className="inline-flex items-center justify-between focus:outline-none w-full text-sm font-semibold transition-colors duration-150 hover:text-emerald-600 dark:hover:text-gray-200"
          onClick={() => setOpen(!open)}
          role="button"
          aria-haspopup="true"
        >
          <span className="inline-flex items-center">
            {route.icon && <route.icon className="w-5 h-5" aria-hidden="true" />}
            <span className={`${level === 0 ? "ml-4 mt-1" : "ml-2"}`}>{t(route.name, { defaultValue: route.name })}</span>
          </span>
          {hasChildren && (
            <span className={`${level === 0 ? "pl-4 mt-1" : "pl-2"}`}>
              {open ? <IoChevronDownOutline /> : <IoChevronForwardOutline />}
            </span>
          )}
        </Button>
      )}
      {open && route.routes && (
        <ul
          className={`${level === 0 ? "p-2" : "ml-4"} overflow-hidden text-sm font-medium text-gray-500 rounded-md dark:text-gray-400 dark:bg-gray-900`}
          aria-label="submenu"
        >
          {route.routes.map((child, i) => (
            <SidebarSubMenu route={child} key={i + 1} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default SidebarSubMenu;
