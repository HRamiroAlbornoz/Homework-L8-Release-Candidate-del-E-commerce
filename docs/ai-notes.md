# Notas de uso de IA — Release Candidate del E-commerce (Homework L9)

Este documento deja evidencia de cómo se usó IA (Claude Code) durante este homework: tres intervenciones (más que el mínimo de 2 que pide el enunciado), con el prompt real, un resumen de la respuesta, y qué se aceptó, qué se corrigió y cómo se verificó cada cosa.

---

## Intervención 1 — Tests de `cartReducer` (edge cases priorizados por impacto)

**Prompt (resumen fiel del pedido real, hecho a través de la conversación guiada por el enunciado):**
> Escribí los tests unitarios de `cartReducer` siguiendo el Paso 3 del enunciado: patrón Given/When/Then, al menos 4 casos con al menos 2 edge cases, verificando que los totales sean siempre consistentes con los items.

**Resumen de la respuesta:**
Se propuso una suite de 14 tests agrupados por acción (`ADD_ITEM`, `REMOVE_ITEM`, `UPDATE_QUANTITY`, `CLEAR_CART`) más un grupo de "consistencia de totales". Los edge cases identificados y priorizados por impacto real sobre el negocio (no solo cobertura de líneas):

- Tope `MAX_QUANTITY_PER_ITEM` (evita que un error de tipeo o un click sostenido generen una cantidad absurda).
- `quantity <= 0` en `UPDATE_QUANTITY` elimina el ítem (comportamiento silencioso, fácil de romper sin darse cuenta).
- `Math.floor` sobre cantidades decimales.
- Misma referencia de estado cuando el `productId` no existe (optimización real del código, evita un re-render de React).
- Redondeo a centavos para no arrastrar el error clásico de punto flotante (`0.1 + 0.2`), priorizado porque toca dinero directamente.

**Qué acepté:** toda la propuesta, reutilizando `withRecalculatedTotals` (ya exportado por el propio `cartReducer.ts` para este fin) en vez de duplicar la lógica de cálculo de totales en los tests.

**Qué rechacé:** nada en esta intervención puntual — la propuesta ya seguía la regla del proyecto de reusar código existente en vez de reimplementarlo.

**Evidencia:**
```
✓ src/features/cart/cartReducer.test.ts (14 tests) 7ms
Test Files  2 passed (2)
     Tests  16 passed (16)
```
(salida real de `npm run test` al cerrar el Paso 3, ver PR #3)

---

## Intervención 2 — Flow tests del Paso 6 (checkout con mocks + admin upload con MSW)

**Prompt (resumen fiel):**
> Vamos a cumplir todos los criterios BASE y PLUS del enunciado. Para el Paso 6 eso significa hacer los DOS flows: Opción A (checkout con mocks, incluyendo el caso de no-doble-submit) y Opción B (admin sube una imagen, interceptando presign + PUT con MSW).

**Resumen de la respuesta:**
Se propuso mockear solo los bordes externos reales de cada flujo, no la lógica de negocio:
- **Checkout**: mockear `useAuth` y `ordersService` (Firebase/Firestore), pero mantener el `CartProvider` REAL vía `renderWithProviders`, de modo que "el carrito se vació" sea un efecto observable de verdad (se renderiza `CartBadge` al lado como testigo), no una aserción sobre una función mockeada.
- **Admin upload**: mockear `lib/firebase` (para `auth.currentUser`) y `productsService` (Firestore no pasa por `fetch`), pero dejar correr el código REAL de `uploadsService.ts` interceptado por MSW — así se prueba el contrato HTTP real (dos requests, en orden: `POST /api/uploads/presign` y `PUT` a la URL firmada).

**Qué acepté:** el diseño completo, incluyendo el caso PLUS de doble-submit en checkout (mockear `createOrderFromCart` con una promesa que nunca resuelve durante el test, y verificar `toHaveBeenCalledTimes(1)` tras un `dblClick`).

**Qué rechacé / corregí:** un `/code-review` posterior encontró un bug real en los tests propuestos: `uploadUrl` y `publicUrl` en los fixtures de MSW eran literalmente el mismo string, así que el test **no podía detectar** una regresión real (guardar la URL firmada en vez de la pública como imagen del producto). Se corrigió dándoles valores distintos. El mismo ajuste generó un segundo problema (un warning de MSW por poner el query string dentro del patrón del handler en vez de solo en el path), que también se corrigió.

**Evidencia:**
```
✓ src/pages/CheckoutPage.test.tsx (3 tests) 262ms
✓ src/features/admin/components/CreateProductForm.test.tsx (2 tests) 1164ms
Test Files  7 passed (7)
     Tests  30 passed (30)
```
Hallazgo del code-review (textual): *"the test's presign mock sets `publicUrl: uploadUrl`... so the assertion... cannot detect a regression where the app persists the signed upload URL instead of the public URL."* — ver PR #6 y PR #7.

---

## Intervención 3 — Deploy y checklist de producción para Vercel + Vite + Functions

**Prompt (resumen fiel):**
> ¿Cómo hacemos el deploy en Vercel? Quiero cargar las variables de entorno de forma segura, y necesito saber qué separar entre públicas y secretas.

**Resumen de la respuesta:**
Se propuso: (1) reusar el mismo proyecto de Firebase y bucket de S3 del homework anterior en vez de crear infraestructura nueva; (2) la lista exacta de las 10 variables que van a Vercel (6 `VITE_FIREBASE_*` + 4 `S3_*`, ambas en Production y Preview) leída directamente de `.env.example`, descartando `FIREBASE_SERVICE_ACCOUNT_JSON` y las `TEST_*` (solo para scripts locales); (3) importar el repo desde la web de Vercel en vez de la CLI, por preferencia explícita de no manejar secretos por comandos de terminal compartidos con la IA.

**Qué acepté:** el método por dashboard web (en vez de la Vercel CLI que se había propuesto primero), y la decisión de nunca pasar valores reales de variables de entorno por este chat.

**Qué rechacé / se ajustó sobre la marcha:** al revisar el repo se detectó que el nombre del proyecto llevaba "L8" cuando correspondía "L9" (conflictuaba con el homework anterior, que es el L8 real) — se corrigió el repo de GitHub, `package.json` y `README.md` ANTES de conectar Vercel, para no tener que reconectarlo después. También apareció un problema real de CORS en S3 al probar la subida de imágenes en el dominio nuevo, no anticipado en la propuesta original, que se diagnosticó y corrigió agregando el origin al bucket.

**Evidencia:** deploy funcionando en producción, verificado con un smoke test completo vía Chrome DevTools MCP:
```
https://homework-l9-release-candidate-del-e.vercel.app/
- Login customer + /admin bloqueado: OK
- Login admin + acceso a /admin: OK
- Checkout: orden v32AMGC312wxNq0DmDUp creada, carrito vaciado
- Alta de producto con imagen: subida real a S3, sin errores de consola
```

---

## Criterio de aceptación aplicado

En las tres intervenciones se rechazó (o nunca se llegó a proponer) cualquier sugerencia que:
- expusiera secretos por `process.env` en el cliente o los pegara en esta conversación,
- testeara implementación interna (se verificó siempre estado observable: `items`/`totalItems`/`totalPrice`, nunca llamadas a `dispatch`),
- requiriera herramientas fuera del alcance del enunciado (no se propuso Cypress/Playwright, CI avanzado más allá de lint+test+build+type-check, ni Sentry/observabilidad de terceros).
