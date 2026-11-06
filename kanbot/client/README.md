# Kanbot client

React 19 + TypeScript (strict) + Vite. Needs the Kanbot API at `VITE_API_URL` (default `http://localhost:4000/api`).

    cp .env.example .env
    npm install
    npm run dev      # http://localhost:5173
    npm run build    # type-check + production build
    npm run lint     # ESLint
    npm run format   # Prettier

## Demo data

With the API running: `npm run seed`. It creates a demo user (`demo@kanbot.dev` / `Password123!`) with three projects that cover
every screen: completed sprints (history and stats), an active sprint with cards in all four columns, planned sprints (one empty),
a backlog with varied priorities, types, labels, points and due dates (some overdue), a project with no active sprint, and an empty project.
Use `EMAIL=you@x.dev PASSWORD=... npm run seed` for another user, `WITH_SUMMARY=1` to also generate AI summaries.

## Design direction

UI library: none. Plain CSS in `src/styles/` (one file per page under `styles/pages/`, shared pieces alongside) driven by CSS variables, icons from lucide-react.
Mood: soft and calm, from the reference design (frosted white panels on a sky-to-pink gradient, pastel cards), using the Kanbot logo colours.

| Token | Value |
| --- | --- |
| Primary | indigo `#4f46e5` (hover `#4338ca`, tint `#eeedfd`) |
| Accent / success | green `#22c55e` |
| Ink / muted / line | `#131a2a` / `#5b6475` / `#e6e8f0` |
| Danger | `#dc2626` |
| Font | Plus Jakarta Sans, 14px base |
| Radius | buttons and pills 999px, inputs 14px, cards 22px, panels 28px |
| Spacing | 4/8px steps: gaps 8–16px, card padding 18px, panel padding 24px |

Base components (`src/components`): Button, Input (with Field), Modal (dialog), EmptyState, Loader (spinner), Toast.

## Auth

`AuthProvider` keeps the token in `localStorage`, restores the session with `/auth/me` on load, and signs out on any 401.
`ProtectedRoute` guards the app, `GuestRoute` guards login and register. If the token is removed while the app is open,
the next request or navigation signs you out and shows a toast.

## Routes

    /login, /register                      GuestRoute
    /projects                              project list (create, edit, delete)
    /projects/:projectId/backlog|board|sprints   ProjectRoute loads GET /projects/:id, then the page
    /projects/:projectId/sprints/:sprintId       sprint details (stats tiles)

The project lives in the URL, so the sidebar switcher and nav always follow it.

## AI

`GET /ai/status` drives the badge: "Mock AI" without a key, "AI · model" with one. The AI key lives on the backend only, never in this app.
Chat drawer (Markdown replies), generate tasks (editable drafts, bulk save), plan sprint (creates a sprint with the suggested tasks), and a saved sprint summary on the board and on sprint details.

## Status

All features from the contract are built. Everything still needs a pass against the real API.
