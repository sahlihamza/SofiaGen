import { registerLibrary } from "../../utils/iconRegistry";

const remixOutline = [
  { id: "ri-home-line", name: "home-line", tags: ["house", "outline"], svg: '<path d="M20 9.57V19a2 2 0 01-2 2H6a2 2 0 01-2-2V9.57" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 7L12 2 5 7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 7v11a2 2 0 002 2h10a2 2 0 002-2V7" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-heart-line", name: "heart-line", tags: ["love", "outline"], svg: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-user-line", name: "user-line", tags: ["person", "outline"], svg: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-search-line", name: "search-line", tags: ["find", "outline"], svg: '<circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-settings-4-line", name: "settings-4-line", tags: ["config", "outline"], svg: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-star-line", name: "star-line", tags: ["favorite", "outline"], svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-delete-bin-line", name: "delete-bin-line", tags: ["remove", "outline"], svg: '<path d="M3 6h18" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" stroke-width="2"/><line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-edit-line", name: "edit-line", tags: ["modify", "outline"], svg: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-add-line", name: "add-line", tags: ["add", "outline"], svg: '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-close-line", name: "close-line", tags: ["close", "outline"], svg: '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-arrow-right-line", name: "arrow-right-line", tags: ["next", "outline"], svg: '<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/><polyline points="12 5 19 12 12 19" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-check-line", name: "check-line", tags: ["done", "outline"], svg: '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-image-line", name: "image-line", tags: ["photo", "outline"], svg: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="21 15 16 10 5 21" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-link", name: "link", tags: ["url", "outline"], svg: '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-notification-3-line", name: "notification-3-line", tags: ["alert", "outline"], svg: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13.73 21a2 2 0 01-3.46 0" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-mail-line", name: "mail-line", tags: ["email", "outline"], svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-calendar-line", name: "calendar-line", tags: ["date", "outline"], svg: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>' },
  { id: "ri-lock-line", name: "lock-line", tags: ["security", "outline"], svg: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke="currentColor" stroke-width="2"/>' },
];

const remixFilled = [
  { id: "ri-home-fill", name: "home-fill", tags: ["house", "filled"], svg: '<path d="M20 9.57V19a2 2 0 01-2 2H6a2 2 0 01-2-2V9.57" fill="currentColor"/><path d="M19 7L12 2 5 7" fill="currentColor"/><path d="M5 7v11a2 2 0 002 2h10a2 2 0 002-2V7" fill="currentColor"/>' },
  { id: "ri-heart-fill", name: "heart-fill", tags: ["love", "filled"], svg: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor"/>' },
  { id: "ri-user-fill", name: "user-fill", tags: ["person", "filled"], svg: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="currentColor"/><circle cx="12" cy="7" r="4" fill="currentColor"/>' },
  { id: "ri-star-fill", name: "star-fill", tags: ["favorite", "filled"], svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>' },
  { id: "ri-delete-bin-fill", name: "delete-bin-fill", tags: ["remove", "filled"], svg: '<path d="M3 6h18" stroke="currentColor" stroke-width="2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" fill="currentColor"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="currentColor"/>' },
  { id: "ri-check-fill", name: "check-fill", tags: ["done", "filled"], svg: '<polyline points="20 6 9 17 4 12" fill="currentColor"/>' },
  { id: "ri-mail-fill", name: "mail-fill", tags: ["email", "filled"], svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="currentColor"/><polyline points="22,6 12,13 2,6" fill="currentColor"/>' },
];

registerLibrary({
  id: "remix-outline",
  name: "Remix Icon (Outline)",
  category: "remix",
  tags: ["outline", "remix"],
  iconCount: remixOutline.length,
  getIcons: async () => remixOutline.map((r) => ({ ...r, libraryId: "remix-outline", libraryName: "Remix Icon (Outline)", category: "remix" })),
});

registerLibrary({
  id: "remix-filled",
  name: "Remix Icon (Filled)",
  category: "remix",
  tags: ["filled", "remix"],
  iconCount: remixFilled.length,
  getIcons: async () => remixFilled.map((r) => ({ ...r, libraryId: "remix-filled", libraryName: "Remix Icon (Filled)", category: "remix" })),
});
