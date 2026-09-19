# Perfil propio editable + compartir temas con quienes seguís

## 1. Tu perfil (botón PERFIL)

Tu perfil pasa a verse igual que el de otra persona (avatar grande, nombre, racha, métricas), pero editable en el lugar:

- Tocar tu foto abre el selector de imagen (y opción de quitarla).
- Tocar el lápiz junto a tu nombre lo vuelve un campo editable; se guarda con un botón.
- Debajo del nombre, una descripción corta de cuenta, también editable.
- El look de Chispa sigue estando, en un bloque más abajo.

## 2. Paneles de abajo (en tu perfil y en el de otras personas)

Fila de botones que cambian el panel inferior sin salir de la página:

- **TEMAS** — las explicaciones públicas de esa cuenta.
- **SEGUIDOS** — las cuentas que sigue (avatar + nombre, con enlace a su perfil).
- **COMPARTIDOS** — los temas que esa cuenta invitó a hacer.
- **TEMAS GUARDADOS** — solo en tu propio perfil (es información privada).

En el perfil de otra persona se muestran TEMAS, SEGUIDOS y COMPARTIDOS.

## 3. Compartir un tema con quienes seguís

- Al terminar un tema, junto a las opciones de publicar aparece **INVITAR A HACERLO**.
- Se abre una lista de las cuentas que seguís, con casillas para elegir varias, y un botón para enviar.
- Quien recibe la invitación la ve en su inicio, en un bloque "Te invitaron a estos temas", con botón para empezar el tema.
- Lo enviado queda listado en tu panel COMPARTIDOS.

## Detalles técnicos

- Migración: columna `profiles.bio` (text, opcional); tabla `topic_invites` (id, topic_id, sender_id, receiver_id, session_id opcional, created_at) con GRANT a `authenticated`/`service_role`, RLS: insert si `auth.uid() = sender_id` y existe el follow, select si sos emisor o receptor, delete si sos receptor.
- Componentes nuevos: `src/components/paneles-perfil.tsx` (tabs reutilizables con las cuatro pestañas y sus consultas) y `src/components/invitar-tema.tsx` (popover con los seguidos y envío múltiple).
- `src/routes/_authenticated/perfil.tsx` se reescribe con la cabecera estilo `u.$id` + edición inline; `u.$id.tsx` reemplaza su sección TEMAS por el componente de paneles.
- `sesion.tsx`: botón de invitar en la fase de publicación, reutilizando `invitar-tema`.
- `inicio.tsx`: bloque de invitaciones recibidas (consulta `topic_invites` por `receiver_id`).
