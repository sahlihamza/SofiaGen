/**
 * Theme Editor Services
 * API calls for theme management
 */

import httpService from "./httpService";
import { getAccessToken } from "./tokenStore";
import Cookies from "js-cookie";

const ThemeEditorServices = {
  // Get all themes
  getAllThemes: async (storeId, enableFallback = true) => {
    const unwrap = (r) => {
      if (!r) return [];
      if (Array.isArray(r)) return r;
      if (Array.isArray(r.data)) return r.data;
      if (Array.isArray(r.data?.data)) return r.data.data;
      return [];
    };

    try {
      if (storeId) {
        const url = `/themes?storeId=${storeId}`;
        const response = await httpService.get(url);
        const list = unwrap(response || response.data);
        if (list.length > 0) return list;

        // fallback: try to find any theme in DB and adopt its storeId
        if (!enableFallback) return [];
        const allResp = await httpService.get("/themes");
        const allList = unwrap(allResp || allResp.data);
        if (allList.length === 0) return [];

        const fallbackStoreId = allList[0].storeId || allList[0].store || allList[0].company || allList[0].store_id || null;
        if (fallbackStoreId) {
          const cookieTimeOut = 0.5;
          const cookieOptions = {
            expires: cookieTimeOut,
            sameSite: window.location.protocol === "https:" ? "None" : "Lax",
            secure: window.location.protocol === "https:",
          };
          Cookies.set("company", fallbackStoreId, cookieOptions);
          // try again with the discovered storeId
          const resp2 = await httpService.get(`/themes?storeId=${fallbackStoreId}`);
          return unwrap(resp2 || resp2.data);
        }

        return [];
      }

      const response = await httpService.get("/themes");
      return unwrap(response || response.data);
    } catch (error) {
      console.error("Error fetching themes:", error);
      throw error;
    }
  },

  // Get theme by ID
  getThemeById: async (id) => {
    try {
      const response = await httpService.get(`/themes/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching theme:", error);
      throw error;
    }
  },

  // Create new theme
  createTheme: async (data) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/themes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Create theme failed");
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error("Error creating theme:", error);
      throw error;
    }
  },

  // Update theme
  updateTheme: async (id, data) => {
    try {
      const response = await httpService.put(`/themes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Error updating theme:", error);
      throw error;
    }
  },

  // Activate theme
  activateTheme: async (id) => {
    try {
      const response = await httpService.post(`/themes/${id}/publish`);
      return response.data || response;
    } catch (error) {
      console.error("Error activating theme:", error);
      throw error;
    }
  },

  // Delete theme
  deleteTheme: async (id) => {
    try {
      const response = await httpService.delete(`/themes/${id}`);
      return response.data || response;
    } catch (error) {
      console.error("Error deleting theme:", error);
      throw error;
    }
  },

  // Duplicate theme
  duplicateTheme: async (id) => {
    try {
      const response = await httpService.post(`/themes/${id}/duplicate`);
      return response.data || response;
    } catch (error) {
      console.error("Error duplicating theme:", error);
      throw error;
    }
  },

  // Export theme
  exportTheme: async (id) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/themes/${id}/export`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting theme:", error);
      throw error;
    }
  },

  // Import theme
  importTheme: async (storeId, file) => {
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("storeId", storeId);
      formData.append("file", file);

      const response = await fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/themes/import`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${token}`
        },
        body: formData
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Import failed");
      }
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error("Error importing theme:", error);
      throw error;
    }
  },

  // Save template (store)
  saveTemplate: async (storeId, templateData) => {
    try {
      const response = await httpService.post(`/stores/${storeId}/templates`, templateData);
      return response.data;
    } catch (error) {
      console.error("Error saving template:", error);
      throw error;
    }
  },

  // Get templates by type
  getTemplates: async (storeId, type = "page") => {
    try {
      const response = await httpService.get(`/stores/${storeId}/templates?type=${type}`);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  },

  getTemplateById: async (storeId, templateId) => {
    try {
      const response = await httpService.get(`/stores/${storeId}/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      throw error;
    }
  },

  deleteTemplate: async (storeId, templateId) => {
    try {
      const response = await httpService.delete(`/stores/${storeId}/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },

  updateTemplate: async (storeId, templateId, updates) => {
    try {
      const response = await httpService.put(`/stores/${storeId}/templates/${templateId}`, updates);
      return response.data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  searchLibrary: async (storeId, { q, type, category, favoritesOnly } = {}) => {
    try {
      const response = await httpService.get(`/stores/${storeId}/library/search`, {
        q,
        type,
        category,
        favoritesOnly,
      });
      return response;
    } catch (error) {
      console.error("Error searching library:", error);
      throw error;
    }
  },

  toggleFavorite: async (itemType, itemId) => {
    try {
      const response = await httpService.post(`/library/${itemType}/${itemId}/favorite`);
      return response;
    } catch (error) {
      console.error("Error toggling favorite:", error);
      throw error;
    }
  },

  duplicateTemplate: async (storeId, templateId) => {
    try {
      const response = await httpService.post(`/stores/${storeId}/templates/${templateId}/duplicate`);
      return response.data || response;
    } catch (error) {
      console.error("Error duplicating template:", error);
      throw error;
    }
  },

  //    Theme = design system (per store)                               
  getActiveTheme: async (storeId) => {
    try {
      // Returns the Theme doc directly (not wrapped)
      const res = await httpService.get(`/stores/${storeId}/theme`);
      return res;
    } catch (error) {
      console.error("Error fetching active theme:", error);
      throw error;
    }
  },

  updateThemeSettings: async (storeId, settings) => {
    try {
      // Returns the updated Theme doc directly (not wrapped)
      const res = await httpService.put(`/stores/${storeId}/theme/settings`, { settings });
      return res;
    } catch (error) {
      console.error("Error updating theme settings:", error);
      throw error;
    }
  },

  // THEME-02: whether this store's Plan includes the Level 2 canvas
  // builder  purely a UX routing decision (which screen to open); every
  // actual canvas write is independently re-checked server-side regardless
  // of what this returns.
  getBuilderAccess: async (storeId) => {
    try {
      const res = await httpService.get(`/stores/${storeId}/theme-builder-access`);
      return Boolean(res?.hasAccess);
    } catch (error) {
      console.error("Error checking theme builder access:", error);
      return false;
    }
  },

  //    Pages = content per store                                       
  getStorePages: async (storeId) => {
    try {
      const res = await httpService.get(`/pages`, { storeId });
      return Array.isArray(res) ? res : (res.data || []);
    } catch (error) {
      console.error("Error fetching store pages:", error);
      throw error;
    }
  },

  createPage: async (storeId, { name, slug, projectData, themeId, compiledHtml, compiledCss } = {}) => {
    if (!storeId) {
      const err = new Error("createPage: storeId is required");
      console.error(err);
      throw err;
    }
    try {
      // Backend /stores/:storeId/pages returns the created Page doc directly
      const payload = { name, slug, projectData };
      if (themeId) payload.themeId = themeId;
      if (compiledHtml !== undefined) payload.compiledHtml = compiledHtml;
      if (compiledCss !== undefined) payload.compiledCss = compiledCss;
      const res = await httpService.post(`/stores/${storeId}/pages`, payload);
      return res; // already the Page doc
    } catch (error) {
      // Log server response body if available to aid debugging
      if (error?.response?.data) console.error("Server error creating page:", error.response.data);
      console.error("Error creating page:", error);
      throw error;
    }
  },

  getPageContent: async (pageId) => {
    try {
      // Backend GET /pages/:id returns { success, data: page }
      const res = await httpService.get(`/pages/${pageId}`);
      return res.data || res; // unwrap if wrapped
    } catch (error) {
      console.error("Error fetching page content:", error);
      throw error;
    }
  },

  updatePageContent: async (pageId, updates = {}) => {
    try {
      // updates may contain: projectData, compiledHtml, compiledCss
      const response = await httpService.put(`/pages/${pageId}`, updates);
      return response.data;
    } catch (error) {
      console.error("Error saving page content:", error);
      throw error;
    }
  },

  getPageVersions: async (pageId) => {
    try {
      const response = await httpService.get(`/pages/${pageId}/versions`);
      return response.data || response;
    } catch (error) {
      console.error("Error fetching page versions:", error);
      throw error;
    }
  },

  restorePageVersion: async (pageId, versionNumber) => {
    try {
      const response = await httpService.post(`/pages/${pageId}/versions/${versionNumber}/restore`);
      return response.data || response;
    } catch (error) {
      console.error("Error restoring page version:", error);
      throw error;
    }
  },

  comparePageVersions: async (pageId, from, to) => {
    try {
      const response = await httpService.get(`/pages/${pageId}/versions/compare`, { params: { from, to } });
      return response.data || response;
    } catch (error) {
      console.error("Error comparing page versions:", error);
      throw error;
    }
  },

  updatePageSettings: async (pageId, updates) => {
    try {
      // updates can contain: title, slug, isPublished, etc.
      const response = await httpService.put(`/pages/${pageId}`, updates);
      return response.data || response;
    } catch (error) {
      console.error("Error updating page settings:", error);
      throw error;
    }
  },

  schedulePage: async (pageId, scheduledAt) => {
    try {
      const response = await httpService.post(`/pages/${pageId}/schedule`, { scheduledAt });
      return response.data || response;
    } catch (error) {
      console.error("Error scheduling page:", error);
      throw error;
    }
  },

  cancelSchedule: async (pageId) => {
    try {
      const response = await httpService.post(`/pages/${pageId}/schedule/cancel`);
      return response.data || response;
    } catch (error) {
      console.error("Error cancelling page schedule:", error);
      throw error;
    }
  },

  duplicatePage: async (pageId) => {
    try {
      const response = await httpService.post(`/pages/${pageId}/duplicate`);
      return response.data || response;
    } catch (error) {
      console.error("Error duplicating page:", error);
      throw error;
    }
  },

  setHomePage: async (pageId) => {
    try {
      const response = await httpService.post(`/pages/${pageId}/set-home`);
      return response.data || response;
    } catch (error) {
      console.error("Error setting home page:", error);
      throw error;
    }
  },

  deletePage: async (pageId) => {
    try {
      const response = await httpService.delete(`/pages/${pageId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting page:", error);
      throw error;
    }
  },

  previewPage: async (pageId) => {
    try {
      const response = await httpService.get(`/pages/${pageId}/preview`);
      return response.data || response;
    } catch (error) {
      console.error("Error fetching page preview:", error);
      throw error;
    }
  },

  // Upload asset
  uploadAsset: async (formData) => {
    try {
      const response = await httpService.post("/assets/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading asset:", error);
      throw error;
    }
  },

  //    Menus                                       
  getMenusByStore: async (storeId, location) => {
    try {
      const url = location ? `/stores/${storeId}/menus?location=${location}` : `/stores/${storeId}/menus`;
      const response = await httpService.get(url);
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error("Error fetching menus:", error);
      throw error;
    }
  },
  getMenuById: async (id) => {
    try {
      const response = await httpService.get(`/menus/${id}`);
      return response.data || response;
    } catch (error) {
      console.error("Error fetching menu:", error);
      throw error;
    }
  },
  createMenu: async (data) => {
    try {
      const response = await httpService.post("/menus", data);
      return response.data || response;
    } catch (error) {
      console.error("Error creating menu:", error);
      throw error;
    }
  },
  updateMenu: async (id, data) => {
    try {
      const response = await httpService.put(`/menus/${id}`, data);
      return response.data || response;
    } catch (error) {
      console.error("Error updating menu:", error);
      throw error;
    }
  },
  deleteMenu: async (id) => {
    try {
      const response = await httpService.delete(`/menus/${id}`);
      return response.data || response;
    } catch (error) {
      console.error("Error deleting menu:", error);
      throw error;
    }
  },
  duplicateMenu: async (id) => {
    try {
      const response = await httpService.post(`/menus/${id}/duplicate`);
      return response.data || response;
    } catch (error) {
      console.error("Error duplicating menu:", error);
      throw error;
    }
  },
};

export default ThemeEditorServices;
