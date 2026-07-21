Frontend
React (Vite como bundler — más liviano que Next.js si no necesitás SSR; si querés SEO o rutas server-side, Next.js es la alternativa)
TypeScript — fuertemente recomendado dado que hay muchas entidades relacionadas (escenas, actores, locaciones)
React Router (si usás Vite) para navegación entre módulos
UI / Estilos
Tailwind CSS — utilidades rápidas
shadcn/ui — componentes accesibles (modals, dropdowns, tablas) que se integran bien con Tailwind
Lucide icons — set de íconos consistente
Calendario / Scheduling
FullCalendar (@fullcalendar/react) — para la vista de calendario de rodaje
dnd-kit — si querés drag & drop más custom (ej. reordenar escenas en un stripboard), FullCalendar solo no alcanza para vistas tipo Gantt/stripboard
Formularios
React Hook Form + Zod para validación de formularios (casting, locaciones, presupuesto)
Estado global
Zustand — más simple que Redux para este tamaño de app
TanStack Query (React Query) — para el manejo de datos del servidor (cache, refetch, mutaciones)
Backend

Opciones según cuánto querés manejar vos mismo:

Opción A (más rápida de arrancar):

Supabase — Postgres + Auth + Storage + API autogenerada. Ideal para MVP, tiene RLS (row level security) para manejar permisos por rol.


Almacenamiento de archivos
Supabase Storage  — para fotos de locaciones, self-tapes de casting, guiones en PDF
Generación de PDFs (call sheets)
react-pdf (@react-pdf/renderer) — genera PDFs desde componentes React, ideal para call sheets con formato fijo
Mapas (locaciones)
Google Maps API (@react-google-maps/api) o Mapbox si preferís algo más customizable/económico
Gráficos (presupuesto)
Recharts — simple y con buena integración en React
Notificaciones/emails
SendGrid — para enviar call sheets por email automáticamente
Deploy
Vercel (frontend + si usás Next.js API routes)
Supabase
Estructura de carpetas sugerida (Vite + React)
src/
├── components/       # componentes reutilizables (Button, Table, Modal)
├── features/
│   ├── casting/
│   ├── locations/
│   ├── schedule/
│   ├── budget/
│   ├── callsheets/
│   ├── continuity/
│   └── script/
├── layouts/           # Sidebar, Header
├── lib/               # helpers, api client, zod schemas
├── hooks/
├── store/             # zustand stores
└── pages/             # rutas principales