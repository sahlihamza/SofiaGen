# 🎨 Theme Builder API Documentation

## Models Created
- **Theme.js** - Store themes with colors, fonts, and settings
- **Page.js** - Pages within themes with versioning and publishing
- **Section.js** - Sections within pages with dynamic content

---

## Theme Endpoints

### Create Theme
```
POST /api/themes
Headers: Authorization: Bearer {token}
Body:
{
  "name": "Modern Store",
  "description": "Modern theme",
  "storeId": "xxx"
}
Response: { success: true, data: theme }
```

### Get All Themes
```
GET /api/themes?storeId=xxx
Response: { success: true, data: [themes] }
```

### Get Theme by ID
```
GET /api/themes/:id
Response: { success: true, data: theme }
```

### Update Theme
```
PUT /api/themes/:id
Headers: Authorization: Bearer {token}
Body:
{
  "name": "Updated Name",
  "colors": {
    "primary": "#667eea",
    "secondary": "#764ba2"
  },
  "fonts": {
    "heading": "Arial",
    "body": "Arial"
  }
}
Response: { success: true, data: theme }
```

### Publish Theme
```
POST /api/themes/:id/publish
Headers: Authorization: Bearer {token}
Response: { success: true, data: theme }
```

### Delete Theme
```
DELETE /api/themes/:id
Headers: Authorization: Bearer {token}
Response: { success: true, message: "Theme deleted successfully" }
```

---

## Page Endpoints

### Create Page
```
POST /api/pages
Headers: Authorization: Bearer {token}
Body:
{
  "title": "Home",
  "slug": "home",
  "storeId": "xxx",
  "themeId": "xxx",
  "pageType": "home"  // home, product, category, about, contact, custom
}
Response: { success: true, data: page }
```

### Get All Pages
```
GET /api/pages?storeId=xxx&published=true&themeId=xxx
Response: { success: true, data: [pages] }
```

### Get Page by ID
```
GET /api/pages/:id
Response: { success: true, data: page }
```

### Get Page by Slug (Public)
```
GET /api/pages/slug/:slug?storeId=xxx
Response: { success: true, data: page }
```

### Save Page Draft
```
POST /api/pages/:id/draft
Headers: Authorization: Bearer {token}
Body:
{
  "title": "Home",
  "description": "Home page",
  "html": "<div>...</div>",
  "css": "body { ... }",
  "components": { ... },
  "metaDescription": "...",
  "metaKeywords": "..."
}
Response: { success: true, data: page }
```

### Publish Page
```
POST /api/pages/:id/publish
Headers: Authorization: Bearer {token}
Response: { success: true, data: page }
```

### Unpublish Page
```
POST /api/pages/:id/unpublish
Headers: Authorization: Bearer {token}
Response: { success: true, data: page }
```

### Update Page
```
PUT /api/pages/:id
Headers: Authorization: Bearer {token}
Body:
{
  "title": "Updated Title",
  "description": "...",
  "metaDescription": "...",
  "displayOrder": 1,
  "isVisible": true
}
Response: { success: true, data: page }
```

### Delete Page
```
DELETE /api/pages/:id
Headers: Authorization: Bearer {token}
Response: { success: true, message: "Page deleted successfully" }
```

### Get Page Versions
```
GET /api/pages/:id/versions
Headers: Authorization: Bearer {token}
Response: { success: true, data: [versions] }
```

### Restore Page Version
```
POST /api/pages/:id/restore-version
Headers: Authorization: Bearer {token}
Body:
{
  "versionNumber": 2
}
Response: { success: true, data: page }
```

---

## Section Endpoints

### Create Section
```
POST /api/sections
Headers: Authorization: Bearer {token}
Body:
{
  "name": "Hero Section",
  "type": "hero",  // hero, image-text, rich-text, testimonials, category-grid, product-grid, custom-html
  "pageId": "xxx",
  "storeId": "xxx",
  "componentData": { ... },
  "html": "<div>...</div>",
  "css": "...",
  "displayOrder": 1
}
Response: { success: true, data: section }
```

### Get Sections for Page
```
GET /api/sections?pageId=xxx
Response: { success: true, data: [sections] }
```

### Get Section by ID
```
GET /api/sections/:id
Response: { success: true, data: section }
```

### Update Section
```
PUT /api/sections/:id
Headers: Authorization: Bearer {token}
Body:
{
  "name": "Updated Name",
  "componentData": { ... },
  "html": "...",
  "css": "...",
  "displayOrder": 1,
  "isVisible": true
}
Response: { success: true, data: section }
```

### Delete Section
```
DELETE /api/sections/:id
Headers: Authorization: Bearer {token}
Response: { success: true, message: "Section deleted successfully" }
```

### Reorder Sections
```
POST /api/sections/reorder
Headers: Authorization: Bearer {token}
Body:
{
  "sections": [
    { "id": "xxx", "displayOrder": 1 },
    { "id": "yyy", "displayOrder": 2 }
  ]
}
Response: { success: true, data: [sections] }
```

---

## Key Features

### 1. Draft Saving
- Pages can be saved as drafts before publishing
- Automatic version history tracking
- Ability to restore previous versions

### 2. Publishing
- Draft pages can be published to make them live
- Published pages are visible by their slug
- Unpublish to revert to draft mode

### 3. Versioning
- Each draft save creates a version
- Can view all page versions
- Can restore any previous version

### 4. Role-based Access
- Theme operations require `isAdmin` middleware
- Page operations require `isAdmin` middleware
- Section operations require `isAdmin` middleware
- Public endpoint: `GET /api/pages/slug/:slug` (no auth needed)

---

## Important Notes

1. **Slug Generation**: Theme and Page slugs are auto-generated from names/titles
2. **URL Slug**: Pages use `urlSlug` for frontend routing (converted to lowercase with dashes)
3. **Section Ordering**: Sections are sorted by `displayOrder` when fetched
4. **Version History**: Each draft save increments the version number
5. **Cloudinary Integration**: Asset Manager is configured for Cloudinary uploads

