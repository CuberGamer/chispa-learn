# Chispa Learn

# Chispa — Documentación Funcional y Técnica

> Documento de referencia para que una IA (o vos mismo con ayuda de una IA) programe la aplicación paso a paso, fase por fase.

---

## 1. Visión general

Chispa es una app web donde el usuario recibe un tema (aleatorio o personalizado), tiene un tiempo limitado para investigarlo por su cuenta, y al terminar debe explicar todo lo que aprendió, ya sea escribiendo o dictando. El objetivo es entrenar el aprendizaje autodidacta y la capacidad de explicar conceptos con claridad (técnica de "aprender enseñando" / active recall).

Público objetivo: estudiantes, curiosos, gente que quiere reforzar hábitos de estudio de forma gamificada, estilo Duolingo pero para "cualquier tema" en vez de idiomas.

---

## 2. Identidad de marca

**Mascota: Chispa** — una chispita/rayito con cara, estilo mascota arcade retro.

- **Paleta de colores:** fondo oscuro (grafito/negro azulado) con acentos neón: violeta, cian y amarillo eléctrico. El amarillo eléctrico es el color principal de Chispa (el personaje) y se usa para botones de acción primaria.

- **Tipografía sugerida:** una fuente redondeada y moderna para textos generales (ej. Poppins o Baloo 2) combinada con una fuente más "gamer/pixel" para números, contadores y elementos de gamificación (ej. Press Start 2P, usada con moderación, solo en streaks/logros para no cansar la lectura).

- **Tono de voz:** cercano, motivador, un poco gamer. Chispa "habla" en primera persona en mensajes cortos ("¡Te quedan 2 minutos!", "¡Racha de 5 días, no la cortes!").

- **Estados de Chispa** (expresiones que cambian según contexto):

  - Neutral/esperando

  - Concentrado (durante el cronómetro)

  - Emocionado (racha activa, logro desbloqueado)

  - Triste (se rompió la racha)

  - Sorprendido (primera vez que usás una función)

- **Estilo ilustrativo:** flat design con contornos gruesos y pequeños detalles con glow/neón, animaciones simples (rebote, parpadeo) más que ilustraciones muy detalladas — así es más liviano de programar y mantiene consistencia visual.

---

## 3. Alcance y roadmap por fases

Como es tu primer proyecto de esta escala, conviene ir fase por fase y no intentar todo junto. Cada fase entrega algo funcional y usable antes de pasar a la siguiente.

### Fase 0 — Setup del proyecto

- Repositorio, estructura de carpetas, proyecto de Supabase creado.

- Definir esquema de base de datos inicial (ver sección 7).

- Sistema de diseño base: colores, tipografías, componentes reutilizables (botón, input, card) en React.

### Fase 1 — MVP: el loop principal

- Registro/login con email y contraseña.

- Pantalla de inicio con un tema del día (aleatorio, igual para todos).

- Selector de duración del cronómetro (ej. 5m / 15m / 30m).

- Pantalla de cronómetro corriendo con Chispa en estado "concentrado".

- Sonido/alerta al terminar el tiempo.

- Pantalla de explicación: texto libre O dictado por voz con transcripción automática.

- Guardado de la explicación asociada al usuario y al tema.

- Historial simple: lista de temas ya estudiados por el usuario.

**Al terminar esta fase ya tenés una app usable de punta a punta, aunque sea simple.**

### Fase 2 — Cuentas, rachas y biblioteca de temas

- Sección "Elegir tema": listado con buscador por título y por etiquetas.

- Sistema de etiquetas (historia, matemática, ciencia, programación, IA, cultura, etc.).

- Sistema de rachas (días consecutivos estudiando).

- Estadísticas personales: cantidad de temas estudiados, tiempo total, racha actual/máxima.

- Logros básicos (ej. "10 temas estudiados", "racha de 7 días").

### Fase 3 — Personalización y generación de temas

- Modo "personalizado": el usuario marca etiquetas/temas de interés y el sistema prioriza esos temas.

- Banco de temas curados por vos (base inicial).

- Integración con una IA (API de Claude u otra) para generar temas nuevos automáticamente, con sus etiquetas, cuando la base curada se empieza a quedar corta.

### Fase 4 — Social

- Opción de compartir públicamente la explicación de un tema.

- Ver explicaciones de otros usuarios sobre el mismo tema, y compararlas con la propia.

- Sistema de calificación entre usuarios (likes / puntuación) sobre las explicaciones publicadas.

- Comentarios en las explicaciones.

### Fase 5 — Pulido y extras

- Más variedad de logros y skins/accesorios para Chispa desbloqueables.

- Mejoras de animación e interacción de la mascota.

- Notificaciones (recordatorio para no perder la racha).

- Ajustes de accesibilidad y performance.

> Recomendación: no arranques la Fase 2 hasta que la Fase 1 funcione de principio a fin sin errores. Es mejor tener un MVP chico que funcione, que una app grande a medio hacer.

---

## 4. Flujo de usuario principal (Fase 1)

1. Usuario entra a la app → si no está logueado, ve login/registro.

2. Tras loguearse, llega a la **pantalla de inicio**.

3. Ve el tema del día (o elige uno, en fases posteriores).

4. Elige duración del cronómetro y presiona "Empezar".

5. Investiga por su cuenta (fuera de la app, en internet, libros, etc.) mientras corre el timer.

6. Cuando el timer llega a 0, suena una alerta y aparece la pantalla de explicación.

7. Usuario escribe o dicta su explicación.

8. Si dictó, el sistema transcribe automáticamente el audio a texto (mostrando el texto editable antes de guardar, por si la transcripción falla).

9. Usuario guarda → se registra el tema como "estudiado" y queda en su historial.

10. Vuelve a la pantalla de inicio.

---

## 5. Roles y permisos

- **Usuario no registrado:** solo puede ver la landing/publicidad de la app, no puede usar el cronómetro ni guardar nada.

- **Usuario registrado:** acceso completo a las funciones de su cuenta (fases 1-3).

- **Usuario registrado (fase 4 en adelante):** además puede publicar, ver y calificar explicaciones de otros.

No se define por ahora un rol de administrador con panel propio; la curación de temas la hacés vos directamente en la base de datos o con un mini panel simple más adelante si hace falta.

---

## 6. Requisitos técnicos

- **Frontend:** React (con Vite como bundler, es liviano y rápido para este tipo de proyecto).

- **Backend/DB/Auth:** Supabase (Postgres + Auth + Storage para los audios).

- **Estilos:** Tailwind CSS, para poder aplicar rápido la identidad visual definida (colores neón, dark mode nativo).

- **Transcripción de audio:** usar la Web Speech API del navegador si es viable (gratis, sin backend extra) o, si se necesita más precisión, un servicio externo de speech-to-text vía API.

- **Generación de temas con IA (Fase 3):** llamadas a la API de Claude (o similar) desde una función backend (Supabase Edge Function), nunca desde el frontend directo, para no exponer la API key.

- **Hosting:** Vercel (gratis para este tipo de proyecto, se integra bien con Vite/React).

---

## 7. Modelo de datos (borrador inicial, Supabase/Postgres)

**users** (maneja Supabase Auth automáticamente, se puede extender con una tabla `profiles`)

- id (uuid, PK, referencia a auth.users)

- username

- avatar_chispa_skin (referencia al accesorio/skin elegido)

- created_at

**topics** (temas)

- id (uuid, PK)

- title

- description

- source ("curado" | "ia_generado" | "usuario")

- duration_suggested (minutos)

- created_at

**tags**

- id (uuid, PK)

- name (ej. "historia", "programación")

**topic_tags** (relación muchos a muchos)

- topic_id (FK)

- tag_id (FK)

**study_sessions** (una sesión = un usuario estudiando un tema)

- id (uuid, PK)

- user_id (FK)

- topic_id (FK)

- duration_minutes

- explanation_text

- explanation_audio_url (nullable, si dictó)

- is_public (boolean)

- created_at

**streaks**

- user_id (FK, PK)

- current_streak

- longest_streak

- last_study_date

**achievements**

- id (uuid, PK)

- name

- description

- icon

**user_achievements**

- user_id (FK)

- achievement_id (FK)

- unlocked_at

**ratings** (Fase 4, calificación entre usuarios)

- id (uuid, PK)

- study_session_id (FK)

- rater_user_id (FK)

- score (ej. 1-5 o like/dislike)

- created_at

**comments** (Fase 4)

- id (uuid, PK)

- study_session_id (FK)

- user_id (FK)

- content

- created_at

---

## 8. Reglas y consideraciones importantes

- El cronómetro corre en el frontend, pero conviene guardar `started_at` en el backend al arrancar la sesión, para evitar que alguien manipule el tiempo desde la consola del navegador y haga trampa fácilmente (esto es opcional para el MVP, pero recomendable a futuro).

- La transcripción de audio debe mostrarse siempre editable antes de guardar: la IA/API de transcripción puede fallar y el usuario tiene que poder corregir.

- Los temas generados por IA (Fase 3) deberían pasar por una validación básica (por ejemplo, que no se dupliquen títulos, que tengan al menos una etiqueta) antes de mostrarse a los usuarios.

- Como no hay corrección automática de contenido (la evaluación es por calificación de otros usuarios), hay que pensar moderación básica de contenido ofensivo en comentarios/explicaciones públicas más adelante (Fase 4+), aunque no es prioridad del MVP.

- Todo el contenido de la app (temas, mensajes de Chispa, etiquetas) en español, ya que el público inicial es hispanohablante.

---

## 9. Notas para la fase de diseño visual

- Pantalla de cronómetro: debe ser la más "wow" visualmente, ya que es el corazón de la experiencia. Chispa animado en el centro, el tiempo bien grande y legible, fondo con detalles neón sutiles (no deben distraer, ya que el usuario probablemente tenga otra pestaña abierta investigando).

- Pantalla de logros/racha: usar la estética más "gamer" (fuente pixel, glow) ya que es la parte más gamificada.

- Pantalla de explicación y biblioteca de temas: más sobria y legible, priorizando la lectura cómoda por sobre el efecto neón.

---

## 10. Siguiente paso sugerido

Empezar por la Fase 0 y Fase 1 tal como están descriptas acá. Este mismo documento se le puede pasar completo a una IA de código (por ejemplo dentro de Claude Code o similar) pidiéndole que arranque por la Fase 0, y avanzar fase por fase, revisando que cada una funcione antes de seguir con la próxima.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hispa-study-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/30cefda3-3699-4cb3-b82a-e4416817dd04).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
