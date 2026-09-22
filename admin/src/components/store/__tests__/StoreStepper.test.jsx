import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useStoreSubmit from "@/hooks/useStoreSubmit";
import { SidebarContext } from "@/context/SidebarContext";
import { AdminContext } from "@/context/AdminContext";
import StoreServices from "@/services/StoreServices";
import { Button } from "@sofia/ui";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithProviders = (ui, { sidebar = {}, admin = {} } = {}) =>
  render(
    <QueryClientProvider client={queryClient}>
      <SidebarContext.Provider value={sidebar}>{ui}</SidebarContext.Provider>
    </QueryClientProvider>
  );

const TestHarness = ({ data, sidebar }) => {
  const { onSubmit } = useStoreSubmit();
  return (
    <div>
      <Button onClick={() => onSubmit(data)}>Submit</Button>
    </div>
  );
};

describe("useStoreSubmit harness", () => {
  const sidebarContextValue = { toggleDrawer: vi.fn(), isUpdate: false, setIsUpdate: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(StoreServices, "addStore").mockResolvedValue({ data: { _id: "store_1" } });
  });

  it("submits store data and calls addStore", async () => {
    const data = {
      name: "Vita Shop",
      slug: "vita-shop",
      subdomain: "vitashop",
      country: "Tunisia",
      language: "fr",
      currency: "TND",
      timezone: "Africa/Tunis",
      plan: "pro",
      planId: "plan_2",
      planName: "Pro",
      planSlug: "pro",
      theme: "emerald-default",
      ownerEmail: "owner@example.com",
      ownerName: "Test Owner",
      ownerFirstName: "Test",
      ownerLastName: "Owner",
      ownerPhone: "12345678",
    };

    renderWithProviders(<TestHarness data={data} />, { sidebar: sidebarContextValue });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(StoreServices.addStore).toHaveBeenCalledWith(expect.objectContaining(data));
    });

    expect(sidebarContextValue.toggleDrawer).toHaveBeenCalled();
  });
});
