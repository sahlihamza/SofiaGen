import dayjs from "dayjs";

/**
 * Formatting helpers for the Super Admin dashboard.
 * Money, compact numbers, percentages, dates, durations.
 */

export const formatMoney = (value, currency = "$", decimals = 2) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return `${currency}0`;
  return `${currency}${num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatMoneyCompact = (value, currency = "$") => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return `${currency}0`;
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${currency}${(num / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${currency}${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${currency}${(num / 1_000).toFixed(1)}K`;
  return `${currency}${num.toFixed(0)}`;
};

export const formatNumber = (value, decimals = 0) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCompact = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return `${num.toFixed(0)}`;
};

export const formatPercent = (value, decimals = 1) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0%";
  return `${num.toFixed(decimals)}%`;
};

export const formatDate = (value, format = "MMM D, YYYY") => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format(format) : "";
};

export const formatDateTime = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("MMM D, YYYY h:mm A") : "";
};

export const timeAgo = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  if (!d.isValid()) return "";
  const diff = dayjs().diff(d, "minute");
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

export const formatUptime = (uptime) => {
  if (uptime === undefined || uptime === null || uptime === "") return "";
  return `${uptime}`;
};

export const formatBytes = (bytes) => {
  const num = Number(bytes || 0);
  if (Number.isNaN(num) || num === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(num) / Math.log(1024));
  return `${(num / 1024 ** i).toFixed(1)} ${units[i]}`;
};

export const pctChange = (current, previous) => {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) return c > 0 ? 100 : 0;
  return ((c - p) / p) * 100;
};

export const trendDirection = (value) => {
  const v = Number(value || 0);
  if (v > 0.05) return "up";
  if (v < -0.05) return "down";
  return "flat";
};

