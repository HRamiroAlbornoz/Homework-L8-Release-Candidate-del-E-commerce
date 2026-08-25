import { cartReducer, initialCartState, withRecalculatedTotals } from "./cartReducer";
import { MAX_QUANTITY_PER_ITEM } from "./cartConstants";
import type { CartItemInput } from "./types";

const productA: CartItemInput = { productId: "p-1", name: "Zapatillas", unitPrice: 100 };
const productB: CartItemInput = { productId: "p-2", name: "Medias", unitPrice: 10 };

describe("cartReducer", () => {
  describe("ADD_ITEM", () => {
    // Given: carrito vacío / When: ADD_ITEM(producto) / Then: items=1, totalItems=1
    it("agrega un producto nuevo a un carrito vacío con quantity 1", () => {
      const result = cartReducer(initialCartState, {
        type: "ADD_ITEM",
        payload: { item: productA },
      });

      expect(result.items).toEqual([{ ...productA, quantity: 1 }]);
      expect(result.totalItems).toBe(1);
      expect(result.totalPrice).toBe(100);
    });

    // Given: producto ya en items / When: ADD_ITEM(mismo) / Then: quantity++, totalItems coherente
    it("si el producto ya está en el carrito, incrementa la cantidad en vez de duplicar la fila", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, { type: "ADD_ITEM", payload: { item: productA } });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.quantity).toBe(2);
      expect(result.totalItems).toBe(2);
      expect(result.totalPrice).toBe(200);
    });

    it("edge case: no supera MAX_QUANTITY_PER_ITEM aunque se lo siga agregando", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: MAX_QUANTITY_PER_ITEM }]);

      const result = cartReducer(state, { type: "ADD_ITEM", payload: { item: productA } });

      expect(result.items[0]?.quantity).toBe(MAX_QUANTITY_PER_ITEM);
    });
  });

  describe("REMOVE_ITEM", () => {
    it("quita el producto indicado y recalcula los totales", () => {
      const state = withRecalculatedTotals([
        { ...productA, quantity: 2 },
        { ...productB, quantity: 1 },
      ]);

      const result = cartReducer(state, {
        type: "REMOVE_ITEM",
        payload: { productId: productA.productId },
      });

      expect(result.items).toEqual([{ ...productB, quantity: 1 }]);
      expect(result.totalItems).toBe(1);
      expect(result.totalPrice).toBe(10);
    });

    it("edge case: si el productId no está en el carrito, devuelve la misma referencia de estado", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, {
        type: "REMOVE_ITEM",
        payload: { productId: "no-existe" },
      });

      // Misma referencia, no un objeto nuevo equivalente: evita un re-render
      // de React por un cambio que en realidad no pasó (ver cartReducer.ts).
      expect(result).toBe(state);
    });
  });

  describe("UPDATE_QUANTITY", () => {
    it("actualiza la cantidad de un producto existente y recalcula los totales", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: productA.productId, quantity: 5 },
      });

      expect(result.items[0]?.quantity).toBe(5);
      expect(result.totalItems).toBe(5);
      expect(result.totalPrice).toBe(500);
    });

    // Given: item con qty=1 / When: UPDATE_QUANTITY(0) / Then: item eliminado
    it("edge case: quantity 0 elimina el ítem del carrito", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: productA.productId, quantity: 0 },
      });

      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalPrice).toBe(0);
    });

    it("edge case: quantity negativa también elimina el ítem", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 3 }]);

      const result = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: productA.productId, quantity: -1 },
      });

      expect(result.items).toEqual([]);
    });

    it("edge case: trunca decimales con Math.floor (2.7 unidades no existen)", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: productA.productId, quantity: 2.7 },
      });

      expect(result.items[0]?.quantity).toBe(2);
    });

    it("edge case: no supera MAX_QUANTITY_PER_ITEM", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: productA.productId, quantity: MAX_QUANTITY_PER_ITEM + 50 },
      });

      expect(result.items[0]?.quantity).toBe(MAX_QUANTITY_PER_ITEM);
    });

    it("edge case: si el productId no está en el carrito, devuelve la misma referencia de estado", () => {
      const state = withRecalculatedTotals([{ ...productA, quantity: 1 }]);

      const result = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: "no-existe", quantity: 5 },
      });

      expect(result).toBe(state);
    });
  });

  describe("CLEAR_CART", () => {
    // Given: carrito con items / When: CLEAR_CART / Then: items=[], totales en 0
    it("vacía el carrito y resetea los totales a 0", () => {
      const state = withRecalculatedTotals([
        { ...productA, quantity: 2 },
        { ...productB, quantity: 3 },
      ]);

      const result = cartReducer(state, { type: "CLEAR_CART" });

      expect(result).toEqual(initialCartState);
    });
  });

  describe("consistencia de totales", () => {
    it("totalItems y totalPrice siempre reflejan la suma real de los items tras una secuencia de acciones", () => {
      let state = initialCartState;
      state = cartReducer(state, { type: "ADD_ITEM", payload: { item: productA } });
      state = cartReducer(state, { type: "ADD_ITEM", payload: { item: productB } });
      state = cartReducer(state, {
        type: "UPDATE_QUANTITY",
        payload: { productId: productA.productId, quantity: 3 },
      });
      state = cartReducer(state, {
        type: "REMOVE_ITEM",
        payload: { productId: productB.productId },
      });

      const expectedTotalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
      const expectedTotalPrice = state.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      expect(state.totalItems).toBe(expectedTotalItems);
      expect(state.totalPrice).toBe(expectedTotalPrice);
    });

    it("edge case: redondea a centavos para no arrastrar errores de punto flotante (0.1 + 0.2)", () => {
      const priceyA: CartItemInput = { productId: "p-a", name: "A", unitPrice: 0.1 };
      const priceyB: CartItemInput = { productId: "p-b", name: "B", unitPrice: 0.2 };

      let state = initialCartState;
      state = cartReducer(state, { type: "ADD_ITEM", payload: { item: priceyA } });
      state = cartReducer(state, { type: "ADD_ITEM", payload: { item: priceyB } });

      expect(state.totalPrice).toBe(0.3);
    });
  });
});
