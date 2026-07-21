Nombre propuesto: FILMMAKER (podés cambiarlo)

Plataforma web para gestionar todo el proceso de preproducción, producción y postproducción de una película o cortometraje.

Estructura general de navegación

Layout tipo sidebar + contenido principal, típico de herramientas de gestión (Notion, Linear, Monday):

┌─────────────┬──────────────────────────────────┐
│  Sidebar    │         Header (proyecto activo,  │
│  (módulos)  │         usuario, notificaciones)  │
│             ├──────────────────────────────────┤
│  - Dashboard│                                   │
│  - Guion    │         Contenido del módulo      │
│  - Casting  │         seleccionado              │
│  - Locac.   │                                   │
│  - Calendario                                   │
│  - Presup.  │                                   │
│  - Call     │                                   │
│    Sheets   │                                   │
│  - Continuidad                                  │
│  - Post     │                                   │
└─────────────┴──────────────────────────────────┘

El usuario puede tener varios proyectos (varias películas/cortos), seleccionables desde un dropdown en el header.

Módulos / Secciones
1. Dashboard
Resumen del proyecto: día de rodaje actual (ej. "Día 4 de 20"), próximas escenas, alertas (presupuesto, permisos por vencer)
Accesos rápidos a call sheet del día, últimas actualizaciones
2. Guion y desglose (Script breakdown)
Subir/pegar guion (PDF o texto)
Vista de escenas numeradas con etiquetas de color (blanco/azul/rosa/amarillo según revisión)
Desglose por escena: personajes, props, vestuario, locación, efectos, vehículos, extras
Filtros: "todas las escenas donde aparece X personaje/prop"
3. Casting
Base de datos de actores (nombre, foto, rol, contacto, agente)
Estado por personaje: buscando / audicionado / callback / confirmado
Calendario de audiciones
Adjuntar videos/self-tapes y notas de evaluación
4. Locaciones
Galería de locaciones con fotos
Mapa (pin por ubicación)
Estado: en negociación / confirmada / permiso pendiente
Documentos adjuntos (contratos, permisos, seguros)
5. Calendario / Plan de rodaje
Vista de calendario mensual/semanal con los días de rodaje
Vista tipo Gantt/stripboard: escenas agrupadas por locación y disponibilidad de actores
Drag & drop para reordenar escenas entre días
6. Presupuesto
Presupuesto por departamento (arte, vestuario, cámara, etc.)
Gastos reales vs. presupuestados
Gráficos de gasto acumulado
7. Call Sheets
Generador de call sheet diario (auto-completado con datos del calendario + clima + elenco del día)
Exportable a PDF, enviable por email
Historial de call sheets anteriores
8. Continuidad (Script Supervisor)
Ficha por escena/toma: qué se grabó, duración, notas de continuidad, tomas buenas (circle takes)
Fotos de referencia (vestuario, posición de objetos)
9. Postproducción
Lista de tareas de edición
Control de versiones de corte (v1, v2, final)
Checklist de entrega (color, sonido, masters)
10. Configuración
Gestión de usuarios y roles (director, productor, asistente de dirección, etc. con permisos distintos)
Datos generales del proyecto
Roles de usuario (permisos)
Admin/Productor: acceso total
Director/1st AD: edición de calendario, guion, continuidad
Casting director: solo módulo de casting
Miembro de crew: solo lectura de call sheets y calendario