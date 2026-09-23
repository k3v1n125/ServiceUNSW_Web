# ServiceUNSW

Hey team, this is a short guide for getting started with this project so you can start developing straight away. It's a React + TypeScript app built with Vite, so if you've used React before this should feel familiar.

## Prerequisites

Before getting started, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- npm (comes with Node.js)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Running the App

Start the local development server:

```bash
npm run dev
```

This prints a local URL (usually `http://localhost:5173`) — open it in your browser. The dev server supports Hot Module Reloading, so most changes show up instantly without a full page refresh.

## Available Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check with `tsc` and produce a production build in `dist/`
- `npm run preview` — locally preview the production build
- `npm run lint` — run Oxlint over the codebase

## Project Structure

```
src/
  App.tsx              # Route definitions
  components/          # Shared UI components (Sidebar, Calendar, ...)
  pages/                # One file per route/page (Student, Staff, UserSettings)
```

Routing is handled by [react-router-dom](https://reactrouter.com/). Add new pages under `src/pages/` and register them in [App.tsx](src/App.tsx).

## Resources

- [React documentation](https://react.dev/)
- [Vite documentation](https://vite.dev/)
- [React Router documentation](https://reactrouter.com/)

