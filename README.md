# Retreats by Traveon — Frontend

React 18 + Vite + Tailwind CSS frontend.

## Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` and `/uploads` to the backend at `http://localhost:5000`.

## Theme

Theme tokens live as CSS variables in [src/styles/index.css](src/styles/index.css). Tailwind colors map to those variables ([tailwind.config.js](tailwind.config.js)), so changes from the **Theme Management** admin page recolor the whole UI without rebuilding.

- `brand` — primary blue (BookRetreats-style)
- `wellness` — green for wellness-only sections
- `accent` — yellow highlights
- `ink` / `ink-muted` — text
- `surface` / `surface-alt` — backgrounds

## Project layout

```
src/
  context/     # ThemeProvider, AuthProvider
  components/
    public/    # Header, Footer, Hero, etc.
    admin/     # Sidebar, Topbar, ProtectedRoute
  layouts/     # PublicLayout, AdminLayout
  pages/
    public/    # site pages
    admin/     # admin pages
  services/    # axios api client
  styles/      # global Tailwind layers
```
