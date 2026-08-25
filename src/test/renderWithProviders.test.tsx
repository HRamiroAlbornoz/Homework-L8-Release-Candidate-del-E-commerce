import { screen } from "@testing-library/react";
import { CartBadge } from "@/features/cart/components/CartBadge";
import { renderWithProviders } from "./renderWithProviders";
import { cartStateWithItemFixture } from "./fixtures";

// Valida el wrapper en sí (Paso 2), no la lógica del carrito: si esto pasa,
// MemoryRouter y CartProvider están bien compuestos. CartBadge sirve de canario
// porque necesita los dos a la vez (useCart y <Link>).
describe("renderWithProviders", () => {
  it("renderiza un componente que depende de CartProvider y MemoryRouter", () => {
    renderWithProviders(<CartBadge />);

    expect(screen.getByRole("link", { name: "Carrito 0 productos" })).toBeInTheDocument();
  });

  it("acepta un estado inicial de carrito vía cartState", () => {
    renderWithProviders(<CartBadge />, { cartState: cartStateWithItemFixture });

    expect(screen.getByRole("link", { name: "Carrito 1 producto" })).toBeInTheDocument();
  });
});
