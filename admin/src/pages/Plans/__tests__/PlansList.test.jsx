import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { SidebarProvider } from "@/context/SidebarContext";
import { StoreProvider } from "@/context/StoreContext";
import { AdminContext } from "@/context/AdminContext";
import PlansList from "@/pages/Plans/PlansList";
import store from "@/reduxStore/store";

let paginationProps;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: () => {}, language: "en" },
  }),
}));

vi.mock("@/hooks/useFilter", () => ({
  default: () => ({
    currentPage: 1,
    handleChangePage: vi.fn(),
    searchText: "",
    setSearchText: vi.fn(),
    statusFilter: "",
    setStatusFilter: vi.fn(),
  }),
}));

vi.mock("@/services/SettingServices", () => ({
  default: {
    getGlobalSetting: () => Promise.resolve({ data: { default_language: "en", default_time_zone: "UTC" } }),
  },
}));

vi.mock("@/services/api/planAPI", () => ({
  default: {
    getAllPlans: vi.fn(() =>
      Promise.resolve({
        data: [],
        pagination: { total: 0, page: 1, limit: 10, pages: 1 },
      })
    ),
    deletePlan: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/hooks/useNotification", () => ({
  default: () => ({
    successMessage: vi.fn(),
    errorMessage: vi.fn(),
  }),
}));

vi.mock("@windmill/react-ui", async () => {
  const actual = await vi.importActual("@windmill/react-ui");

  return {
    ...actual,
    Pagination: (props) => {
      paginationProps = props;
      return <div data-testid="pagination" />;
    },
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockAdminInfo = {
  email: "super@test.com",
  isSuperAdmin: true,
  userType: "superadmin",
  role: [{ name: "Super Admin", permissions: [] }],
};

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Provider store={store}>
          <AdminContext.Provider value={{ state: { adminInfo: mockAdminInfo }, dispatch: () => {} }}>
            <SidebarProvider>
              <StoreProvider>
                {ui}
              </StoreProvider>
            </SidebarProvider>
          </AdminContext.Provider>
        </Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("PlansList", () => {
  beforeEach(() => {
    paginationProps = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders without crashing", async () => {
    renderWithProviders(<PlansList />);
    await waitFor(() => {
      expect(screen.getAllByText(/PlansManagement/i).length).toBeGreaterThan(0);
    });
  });

  it("uses the pagination props supported by the Windmill component", async () => {
    renderWithProviders(<PlansList />);

    await waitFor(() => {
      expect(screen.getAllByTestId("pagination").length).toBeGreaterThan(0);
    });

    expect(paginationProps).toMatchObject({
      totalResults: 0,
      resultsPerPage: 10,
      label: "Table navigation",
    });
    expect(paginationProps).not.toHaveProperty("currentPage");
    expect(paginationProps).not.toHaveProperty("totalPages");
    expect(paginationProps).not.toHaveProperty("onPageChange");
  });
});
