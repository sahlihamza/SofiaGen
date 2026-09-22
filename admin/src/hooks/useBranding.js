import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import requests from "@/services/httpService";

const BRANDING_QUERY_KEY = ["publicBranding"];

export const fetchBranding = async () => {
  const data = await requests.get("/public/contact");
  return {
    logo: data?.logo || "",
    favicon: data?.favicon || "",
    platformName: data?.platformName || "SofiaGen",
    whatsappNumber: data?.whatsappNumber || "",
  };
};

const ensureFaviconLink = () => {
  let link = document.querySelector("link[data-dynamic-favicon='true']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("data-dynamic-favicon", "true");
    document.head.appendChild(link);
  }
  return link;
};

const applyFavicon = (faviconUrl) => {
  if (!faviconUrl || typeof document === "undefined") return;
  const link = ensureFaviconLink();
  const separator = faviconUrl.includes("?") ? "&" : "?";
  link.href = `${faviconUrl}${separator}v=${Date.now()}`;
};

const applyTitle = (platformName) => {
  if (!platformName || typeof document === "undefined") return;
  const base = "Admin Dashboard";
  const desired = `${platformName} | ${base}`;
  if (document.title !== desired) {
    document.title = desired;
  }
};

export const useBranding = () => {
  const queryClient = useQueryClient();
  const [hasApplied, setHasApplied] = useState(false);

  const query = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = query.data;

  useEffect(() => {
    if (!data || hasApplied) return;
    if (data.favicon) applyFavicon(data.favicon);
    if (data.platformName) applyTitle(data.platformName);
    setHasApplied(true);
  }, [data, hasApplied]);

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
    };
    window.addEventListener("branding:refresh", handler);
    return () => window.removeEventListener("branding:refresh", handler);
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
  }, [queryClient]);

  return { ...query, refresh };
};

export const refreshBranding = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("branding:refresh"));
  }
};
