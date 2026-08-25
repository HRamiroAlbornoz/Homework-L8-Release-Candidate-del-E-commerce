import '@testing-library/jest-dom/vitest';

// jsdom comparte un mismo localStorage entre todos los tests de un mismo
// archivo (Vitest aísla por archivo, no por "it"). Sin este afterEach, un
// test que escriba en el carrito (vía CartProvider) dejaría ese resto para
// el siguiente test del mismo archivo.
afterEach(() => {
  window.localStorage.clear();
});
