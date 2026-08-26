import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { productFixture } from "@/test/fixtures";
import { AddToCartButton } from "./AddToCartButton";
import { CartBadge } from "./CartBadge";

// CartBadge se renderiza al lado a propósito: así la aserción mira un efecto
// observable REAL del click (el contador del carrito cambia), en vez de
// confiar únicamente en el feedback visual del propio botón.
describe("AddToCartButton", () => {
  it("al hacer click, agrega el producto al carrito y muestra el feedback momentáneo", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <CartBadge />
        <AddToCartButton product={productFixture} />
      </>,
    );

    const button = screen.getByRole("button", {
      name: `Agregar al carrito ${productFixture.name}`,
    });

    await user.click(button);

    expect(screen.getByRole("link", { name: "Carrito 1 producto" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `¡Agregado! ${productFixture.name}` }),
    ).toBeInTheDocument();
  });

  it("tres clicks seguidos suman tres unidades, sin intermitencia", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <CartBadge />
        <AddToCartButton product={productFixture} />
      </>,
    );

    // Misma referencia de botón en los tres clicks: React no reemplaza el
    // <button> al cambiar su label ("Agregar al carrito" -> "¡Agregado!"),
    // solo actualiza su contenido, así que la referencia sigue siendo válida.
    const button = screen.getByRole("button", {
      name: `Agregar al carrito ${productFixture.name}`,
    });

    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(screen.getByRole("link", { name: "Carrito 3 productos" })).toBeInTheDocument();
  });
});
