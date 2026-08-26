import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { productFixture } from "@/test/fixtures";
import { useProducts } from "@/contexts/ProductsContext";
import { ProductsPage } from "./ProductsPage";

// Se mockea useProducts (no se monta el ProductsProvider real): el provider
// real llama a productsService, que arrastra lib/firebase.ts -> lib/env.ts, y
// eso revienta en CI sin un .env. Mockeando el hook, ProductsPage se testea
// igual (es quien decide qué mostrar según loading/error/products), sin tocar
// Firebase para nada.
vi.mock("@/contexts/ProductsContext", () => ({
  useProducts: vi.fn(),
}));

const mockedUseProducts = vi.mocked(useProducts);

function mockProductsState(overrides: Partial<ReturnType<typeof useProducts>>) {
  mockedUseProducts.mockReturnValue({
    products: [],
    loading: false,
    loadingMore: false,
    error: null,
    lastDoc: null,
    hasMore: false,
    loadFirstPage: vi.fn(),
    loadMore: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  });
}

describe("ProductsPage", () => {
  it("estado de carga: muestra el spinner mientras loading es true", () => {
    mockProductsState({ loading: true });

    renderWithProviders(<ProductsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando productos...");
  });

  it("estado de error: muestra el mensaje y el botón de reintentar", () => {
    mockProductsState({ error: "No se pudo conectar con el servidor." });

    renderWithProviders(<ProductsPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar con el servidor.");
    expect(
      screen.getByRole("button", { name: "Reintentar la consulta de productos" }),
    ).toBeInTheDocument();
  });

  it("estado vacío: muestra el mensaje de catálogo vacío cuando no hay productos", () => {
    mockProductsState({ products: [] });

    renderWithProviders(<ProductsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay productos.");
  });

  it("estado de éxito: muestra los productos cargados", () => {
    mockProductsState({ products: [productFixture] });

    renderWithProviders(<ProductsPage />);

    expect(screen.getByRole("heading", { name: productFixture.name })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Agregar al carrito ${productFixture.name}` }),
    ).toBeInTheDocument();
  });
});
