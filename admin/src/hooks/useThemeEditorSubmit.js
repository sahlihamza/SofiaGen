/**
 * Hook for handling theme editor form submission
 */

import { useCallback } from "react";
import ThemeEditorServices from "@/services/ThemeEditorServices";
import useNotification from "./useNotification";

const useThemeEditorSubmit = () => {
  const { successMessage, errorMessage } = useNotification();

  const submitTheme = useCallback(
    async (themeData) => {
      try {
        const { id, html, css, name, description } = themeData;

        const payload = {
          name,
          description,
          template: {
            html,
            css,
          },
        };

        if (id) {
          // Update existing theme
          const response = await ThemeEditorServices.updateTheme(id, payload);
          successMessage("Theme updated successfully!");
          return response;
        } else {
          // Create new theme
          const response = await ThemeEditorServices.createTheme(payload);
          successMessage("Theme created successfully!");
          return response;
        }
      } catch (error) {
        errorMessage(error.message || "Error saving theme");
        throw error;
      }
    },
    [successMessage, errorMessage]
  );

  const saveTemplate = useCallback(
    async (themeId, templateData) => {
      try {
        const response = await ThemeEditorServices.saveTemplate(themeId, templateData);
        successMessage("Template saved successfully!");
        return response;
      } catch (error) {
        errorMessage(error.message || "Error saving template");
        throw error;
      }
    },
    [successMessage, errorMessage]
  );

  const uploadAsset = useCallback(
    async (file) => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await ThemeEditorServices.uploadAsset(formData);
        successMessage("Asset uploaded successfully!");
        return response;
      } catch (error) {
        errorMessage(error.message || "Error uploading asset");
        throw error;
      }
    },
    [successMessage, errorMessage]
  );

  return {
    submitTheme,
    saveTemplate,
    uploadAsset,
  };
};

export default useThemeEditorSubmit;
