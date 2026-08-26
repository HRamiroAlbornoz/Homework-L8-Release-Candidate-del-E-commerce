import '@testing-library/jest-dom/vitest';
import { server } from './msw/server';

// jsdom comparte un mismo localStorage entre todos los tests de un mismo
// archivo (Vitest aísla por archivo, no por "it"). Sin este afterEach, un
// test que escriba en el carrito (vía CartProvider) dejaría ese resto para
// el siguiente test del mismo archivo.
afterEach(() => {
  window.localStorage.clear();
});

// onUnhandledRequest: "error" es la pieza clave: cualquier request sin
// handler (una llamada real a Firebase/S3/internet que se coló) rompe el
// test en vez de salir a la red en silencio. Así la suite queda verificable
// "sin internet" (ver enunciado del homework).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
