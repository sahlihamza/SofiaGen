// @vitest-environment jsdom
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import React, { useState } from "react";
import { SidebarContext } from "@/context/SidebarContext";
import useToggleDrawer from "./useToggleDrawer";
import { Button } from "@sofia/ui";

let container;
let root;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
});

const HookConsumer = ({ label }) => {
  const { serviceId, handleUpdate } = useToggleDrawer();

  return (
    <div>
      <span>{label}:{serviceId || "none"}</span>
      <Button onClick={() => handleUpdate("plan-123")}>set</Button>
    </div>
  );
};

const TestProvider = ({ children }) => {
  const [drawerId, setDrawerId] = useState("");

  return (
    <SidebarContext.Provider
      value={{
        isDrawerOpen: false,
        toggleDrawer: vi.fn(),
        toggleModal: vi.fn(),
        toggleBulkDrawer: vi.fn(),
        drawerId,
        setDrawerId,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

describe("useToggleDrawer", () => {
  it("shares the selected drawer id across hook consumers", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <TestProvider>
          <HookConsumer label="A" />
          <HookConsumer label="B" />
        </TestProvider>
      );
    });

    const button = container.querySelector("button");
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("A:plan-123");
    expect(container.textContent).toContain("B:plan-123");
  });
});
