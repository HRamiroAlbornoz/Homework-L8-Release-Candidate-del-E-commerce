import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { cartStateWithItemFixture, userCustomerFixture } from "@/test/fixtures";
import { useAuth } from "@/contexts/AuthContext";
import { CartBadge } from "@/features/cart/components/CartBadge";
import { createOrderFromCart, createOrderId } from "@/services/ordersService";
import { OrderError } from "@/lib/orderErrors";
import { ORDER_ERROR_CODES } from "@/lib/orderErrorCodes";
import { CheckoutPage } from "./CheckoutPage";

// Se mockean los dos bordes externos de CheckoutPage:
// - useAuth: el AuthProvider real se suscribe a Firebase (ver renderWithProviders.tsx).
// - ordersService: createOrderFromCart/createOrderId escriben en Firestore de verdad.
// useCart, en cambio, es el CartProvider REAL (vía renderWithProviders): así
// "vaciar el carrito" es un efecto observable de verdad, no un mock que dice
// que se llamó.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/ordersService", () => ({
  createOrderFromCart: vi.fn(),
  createOrderId: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedCreateOrderFromCart = vi.mocked(createOrderFromCart);
const mockedCreateOrderId = vi.mocked(createOrderId);

// CartBadge al lado de CheckoutPage, mismo patrón que en AddToCartButton.test.tsx:
// permite comprobar "el carrito se vació" mirando un efecto real, no implementación interna.
function renderCheckout() {
  return renderWithProviders(
    <>
      <CartBadge />
      <CheckoutPage />
    </>,
    { route: "/checkout", cartState: cartStateWithItemFixture },
  );
}

describe("CheckoutPage — flow de compra (mocks)", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: userCustomerFixture,
      loading: false,
      error: null,
      signup: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    mockedCreateOrderId.mockReturnValue("order-123");
  });

  afterEach(() => {
    // mockImplementation (usado en el test de doble submit) no se limpia solo
    // con clearMocks: true (eso solo borra el historial de llamadas). Sin este
    // reset, quedaría pisando el mockResolvedValueOnce/mockRejectedValueOnce
    // de los otros tests si el orden de ejecución cambiara.
    mockedCreateOrderFromCart.mockReset();
  });

  it("éxito: crea la orden, muestra la confirmación y vacía el carrito", async () => {
    mockedCreateOrderFromCart.mockResolvedValueOnce("order-123");
    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar compra" }));

    expect(
      await screen.findByRole("heading", { name: "¡Gracias por tu compra!" }),
    ).toBeInTheDocument();
    expect(screen.getByText("order-123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Carrito 0 productos" })).toBeInTheDocument();
  });

  it("error: muestra el mensaje y NO vacía el carrito", async () => {
    mockedCreateOrderFromCart.mockRejectedValueOnce(
      new OrderError(
        ORDER_ERROR_CODES.NETWORK_ERROR,
        "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.",
        { retryable: true },
      ),
    );
    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar compra" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos conectarnos con el servidor.",
    );
    expect(screen.getByRole("link", { name: "Carrito 1 producto" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "¡Gracias por tu compra!" }),
    ).not.toBeInTheDocument();
  });

  it("PLUS: un doble click no duplica el envío de la compra", async () => {
    // Promesa que nunca resuelve, a propósito: mientras createOrderFromCart
    // siga "en vuelo", isSubmittingRef sigue en true, que es justo la ventana
    // donde un doble click real podría duplicar el envío. No hace falta
    // resolverla al final: a diferencia de un timer o una suscripción, una
    // promesa sin resolver no deja nada corriendo ni necesita limpieza — y
    // resolverla fuera de act() después de la aserción sería lo que en
    // realidad generaría un update de React fuera de test (warning de act()).
    mockedCreateOrderFromCart.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderCheckout();

    await user.dblClick(screen.getByRole("button", { name: "Confirmar compra" }));

    expect(mockedCreateOrderFromCart).toHaveBeenCalledTimes(1);
  });
});
