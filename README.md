# El Prode '26 ⚽

App de pronósticos del Mundial 2026 para jugar con amigos. Cuentas reales, ligas
privadas, pronóstico partido a partido con cierre automático al arrancar cada
partido, y tabla de posiciones. Sin servidor propio: **Supabase** (base de datos +
auth + seguridad) y **frontend estático** (Vite + React).

---

## Qué hace la v1

- Registro / login con email.
- Crear un grupo (te da un código) o unirte con el código de un amigo.
- Cargar el marcador que predecís para cada partido. **Se bloquea solo al arrancar.**
- Puntaje: **+3** marcador exacto · **+1** acertar el resultado (configurable por liga).
- Tabla de posiciones por grupo. Ver los pronósticos de todos una vez cerrado el partido.
- Panel de admin (vos) para cargar los resultados finales → recalcula la tabla.

El **bracket** (predecir quién avanza / campeón) y la **carga automática de resultados
por API** quedan para la v2 (ver roadmap abajo). Los dieciseisavos recién empiezan el
28 jun, así que hay margen.

---

## Puesta en marcha (≈ 20 min)

### 1. Crear el proyecto en Supabase
1. Entrá a https://supabase.com → New project. Anotá la contraseña de la base.
2. En **Project Settings → API** copiá tres cosas:
   - `Project URL`
   - `anon public` key  (va en el frontend, es pública por diseño)
   - `service_role` key  (es secreta, **solo** para el seed; nunca al frontend)

### 2. Crear las tablas y la seguridad
En Supabase → **SQL Editor → New query**, pegá todo `supabase/schema.sql` y dale **Run**.

### 3. Configurar el frontend
```bash
cp .env.example .env
```
Editá `.env` y completá:
```
VITE_SUPABASE_URL=https://TUPROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Instalar y cargar el fixture (los 104 partidos reales)
```bash
npm install

SUPABASE_URL="https://TUPROYECTO.supabase.co" \
SUPABASE_SERVICE_ROLE="tu-service-role-key" \
npm run seed
```
Deberías ver: `✓ Listo. 72 de fase de grupos + 32 de eliminatorias.`

### 5. Levantar la app
```bash
npm run dev
```
Abrí http://localhost:5173 , **registrate**, creá tu grupo y compartí el código.

### 6. Convertirte en admin (para cargar resultados)
Logueado al menos una vez, andá a Supabase → SQL Editor y corré:
```sql
update public.profiles set is_site_admin = true
where id = (select id from auth.users where email = 'TU-EMAIL');
```
Refrescá la app: te aparece la pestaña **Resultados**.

---

## Subirla a internet (deploy)
El frontend es estático. En Netlify / Vercel / Cloudflare Pages:
- Build command: `npm run build`  ·  Output dir: `dist`
- Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

En Supabase → **Authentication → URL Configuration** agregá la URL pública del sitio.

---

## Lo mínimo para estar en vivo HOY
Pasos 1 → 5. Con eso ya se cargan pronósticos para los partidos de mañana. Los
resultados (paso 6) los podés cargar a la noche cuando terminen los partidos.

---

## Cómo está armada la seguridad (lo importante)
Tres reglas se cumplen en el **servidor** (Postgres + RLS), no en el navegador:
- Un pronóstico solo entra si `kickoff > now()` → nadie carga después del inicio.
- Cada usuario solo lee/escribe **sus** pronósticos (los ajenos se ven recién al cerrar,
  vía una función controlada).
- El puntaje lo calcula la base, no el cliente.

Está todo en `supabase/schema.sql`, comentado.

---

## Roadmap v2
- **Resultados automáticos**: reemplazar la carga manual por un job que consulta una API
  (API-Football / football-data.org) y actualiza `matches`. El resto no cambia: la tabla
  ya se recalcula sola.
- **Bracket**: predecir los 2 que salen de cada grupo + los 8 mejores terceros + el cuadro
  de eliminatorias. El fixture ya trae los placeholders (`2A`, `W74`, …); el seed se vuelve
  a correr cuando openfootball completa los cruces.
- **Banderas/escudos**, notificaciones de cierre, modo oscuro.

## Archivos
```
supabase/schema.sql          tablas, RLS, scoring, RPCs
supabase/seed_fixture.mjs     carga el fixture en la base
supabase/fixture_2026.json    fixture real (openfootball, dominio público)
src/App.jsx                   toda la app (auth, ligas, pronósticos, tabla, admin)
src/lib/supabase.js           cliente
src/styles.css                identidad visual "planilla"
```
# prode-worldcup-2026
