# Production Checklist — E-commerce Release Candidate

Repo: `HRamiroAlbornoz/Homework-L9-Release-Candidate-del-E-commerce`
Producción: https://homework-l9-release-candidate-del-e.vercel.app/

## Build & Quality Gates

- [x] `npm run build` pasa localmente
- [x] `npm run test` pasa (3 corridas seguidas)
      Nota: corrido 3 veces consecutivas en el Paso 5 (interacción de `AddToCartButton`) para descartar intermitencia — mismo resultado (25/25, luego 30/30 tras sumar los flows) las tres veces.
- [x] Tests deterministas (sin calls reales a internet/Firebase/S3)
      Nota: `src/test/setup.ts` corre MSW con `onUnhandledRequest: "error"` — cualquier request real que se escape rompe el test en vez de salir a la red. `AuthContext`, `ProductsContext`, `lib/firebase` y `ordersService`/`productsService` se mockean puntualmente donde hace falta (nunca se monta el `AuthProvider`/`ProductsProvider` reales en tests, porque arrastran `lib/env.ts` y revientan sin `.env`).

## Seguridad & Variables de Entorno

- [x] No hay secretos en el repo (`.env*` ignorados, sin keys en código)
      Nota: `.gitignore` ya excluía `.env`/`.env.local` desde el proyecto anterior; se verificó antes del primer commit.
- [x] Variables públicas de cliente usan `VITE_` y se consumen con `import.meta.env`
- [x] Secretos NO usan `VITE_` (solo server / Vercel Functions con `process.env`)
      Nota: 10 variables cargadas en Vercel — 6 `VITE_FIREBASE_*` (cliente) + 4 `S3_*` (solo `api/uploads/presign.ts`, vía `process.env`). Ninguna se pegó nunca en esta conversación; se cargaron directo en el dashboard de Vercel.
- [ ] Se redeployeó luego de cambios de env vars en Vercel
      No aplicable todavía: las 10 variables se cargaron ANTES del primer deploy, así que no hubo un cambio posterior que forzara un redeploy. Queda sin marcar (no "hecho") a propósito — la próxima vez que se agregue o cambie una variable, hay que volver acá y sí tildarlo tras confirmar el redeploy.

## App Smoke Tests (Production)

Verificado en el navegador (Chrome DevTools MCP) contra la URL de producción, con las cuentas de prueba reales.

**Nota sobre el flujo preview → producción**: este fue el primer deploy del proyecto (importación inicial desde GitHub), así que no existía todavía un preview previo contra el cual probar antes de promover — el primer build importado se convierte directamente en la producción, no hay nada que "promover" todavía. La regla de probar en preview antes de producción aplica de acá en adelante: el PR #9 ya generó su propio preview deploy automático, confirmando que el flujo está andando. El costo de no haber podido aplicarla en este primer deploy se ve en la nota del ítem de upload de imagen más abajo: el problema de CORS se descubrió recién en producción, exactamente el tipo de falla que ese paso existe para atrapar antes.

- [x] La home/catálogo carga sin errores — sin mensajes en consola, productos con precio y categoría correctos.
- [x] Login / Logout funciona — probado con cuenta `customer` y cuenta `admin`.
- [x] Carrito: agregar funciona (probado); actualizar cantidad y vaciar ya cubiertos por los tests automatizados (`cartReducer.test.ts`, `useCart.test.ts`).
- [x] El usuario customer no puede acceder a pantallas/admin actions
      Nota: `/admin` con sesión `customer` redirige a `/` (verificado en producción); `/admin` sin sesión redirige a `/login`.
- [x] Checkout crea order y muestra confirmación
      Nota: orden real creada en producción (`v32AMGC312wxNq0DmDUp`), carrito vaciado tras la compra, aparece en `/admin/orders` con estado "Pendiente".
- [x] Admin crea producto / upload imagen funciona
      Nota: falló la primera vez por CORS (el bucket de S3 solo tenía habilitado el dominio de un deploy anterior); se agregó el origin nuevo a `AllowedOrigins` del bucket y funcionó — imagen real subida y visible (`https://henry-l7-ecommerce-images.s3.us-east-1.amazonaws.com/products/...png`).

## Observabilidad mínima (manual)

- [x] Revisé Network tab ante fallos (status codes, payloads)
      Nota: se revisó vía `list_console_messages` de Chrome DevTools MCP durante todo el recorrido (catálogo, login, carrito, checkout, alta de producto) — cero errores o warnings. No se necesitó inspeccionar payloads de Network en detalle porque cada flujo confirmó éxito por su resultado visible (confirmación de compra, producto creado).
- [ ] Revisé logs de Vercel (Build / Runtime / Functions) ante fallos
      Pendiente: no hizo falta durante este smoke test porque todo funcionó al primer intento (salvo el CORS, que se diagnosticó por el error de red típico de CORS, no por logs de Vercel). Si algo falla más adelante, revisar Project → Deployments → Functions → `api/uploads/presign`.

## Auditoría de accesibilidad — Rediseño visual (PRs #10-13)

Verificación final tras el rediseño "Almacén / Ficha de Inventario" (paleta kraft, tipografías auto-hospedadas, componente `PriceTag`) aplicado a catálogo, carrito, checkout, admin y órdenes.

- [x] Accesibilidad automatizada (Lighthouse/axe) en 100/100
      Nota: corrido contra catálogo, carrito, checkout, admin/órdenes y admin/productos — 100/100 en accesibilidad en las 5 pantallas. Confirma con una herramienta real (no solo la fórmula manual) los contrastes ya documentados como comentarios en `index.css`.
- [x] Foco visible verificado por teclado en el `<select>` restylado de `CategoryFilter`
      Nota: el anillo de `:focus-visible` se mantiene con el nuevo tratamiento de pestaña (borde inferior de acento + tipografía mono).
- [x] Breakpoints 768px/1024px revisados con la tipografía condensada
      Nota: catálogo y la tabla de `AdminOrdersPage` (7 columnas, `min-width: 900px`) — a 768px activa su scroll horizontal propio, a 1024px entra sin scroll; la fuente condensada no rompe ningún layout.
- [ ] QA cross-browser del `<select>` (Firefox/Safari)
      Pendiente: la verificación automatizada de esta sesión solo cubre Chrome. El CSS no usa nada específico de un motor (sin `-webkit-appearance` ni hacks), así que el riesgo es bajo, pero queda para que Hernán lo confirme a mano si quiere cerrarlo del todo.
- **Decisión: no se consolidaron los ~13 bloques de `prefers-reduced-motion` dispersos en `index.css`.** Cada uno vive junto a la transición que anula; agruparlos en un bloque único al final del archivo perdería esa localidad — el riesgo real es borrar un componente y olvidarse de borrar su override en una lista separada.

## Notas de debugging

1. **CI rojo en el primer push a `main`** (bootstrap): `vitest run` salió con código 1 porque en ese momento `src/test/` estaba vacío a propósito (se habían borrado los tests del proyecto anterior para reescribirlos). Se resolvió solo al mergear el Paso 1 (primer test real).
2. **Warning de `act()` en el test de doble-submit del checkout**: resolvía manualmente una promesa mockeada (`resolveOrder?.(...)`) después de que el test ya había hecho su aserción, sin envolver esa resolución en `act()`. La actualización de estado de React (`clearCart`, `setOrderId`) quedaba corriendo fuera del test. Se corrigió no resolviendo nunca la promesa — a diferencia de un timer, una promesa sin resolver no deja nada corriendo.
3. **Warning de MSW por query params en el patrón del handler**: se registró `http.put(uploadUrl, ...)` con el query string (`?X-Amz-Signature=...`) incluido en el patrón. MSW lo desaconseja: el patrón debe matchear solo el path, y el query se inspecciona del lado de la request. Se corrigió separando `FAKE_UPLOAD_PATH` (para el patrón del handler) de `FAKE_UPLOAD_URL` (con query, el valor real que devuelve la respuesta mockeada).
4. **CORS bloqueando la subida de imágenes en el dominio nuevo**: el bucket de S3 se reusa entre varios homeworks, y su configuración de CORS solo tenía habilitado el origin de un deploy de Vercel anterior (L7). Hubo que agregar el nuevo dominio (`homework-l9-release-candidate-del-e.vercel.app`) a `AllowedOrigins` antes de que la subida de imágenes funcionara en producción.
5. **Glitch de terminal durante un rename**: un paste con caracteres de control (`[200~git checkout -b ...`) hizo que `git checkout -b` fallara en silencio, y los comandos siguientes terminaron committeando directo sobre `main` (protegida). Se resolvió creando la rama parada en ese mismo commit y devolviendo `main` local a `origin/main` con `git reset --hard` — seguro en ese caso puntual porque el commit ya estaba a salvo en la rama nueva antes de tocar `main`, y `main` nunca había llegado a pushearse con ese commit de más.
6. **`fill`/`fill_form` de Chrome DevTools MCP no siempre dispara el evento de React al vaciar un campo de texto**: durante la revisión de flujos del rediseño, limpiar el buscador del catálogo con estas herramientas dejaba el DOM visualmente vacío pero nunca disparaba el `onChange` de React, así que el filtro quedaba pegado en el último resultado buscado. Escribir texto SÍ funciona con las mismas herramientas — el problema es específico de la transición a vacío. Se confirmó que era un artefacto de la herramienta de testing (no un bug de la app): se agregaron logs de debug temporales, se reprodujo la misma limpieza con teclado real (Backspace tecla por tecla), y el catálogo se restauró correctamente. Los logs se sacaron antes de commitear. Para probar "vaciar un campo" con esta MCP, usar teclado real en vez de `fill`/`fill_form`.
