import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "@/test/renderWithProviders";
import { server } from "@/test/msw/server";
import { PRESIGN_ENDPOINT } from "@/constants/uploads";
import { createProduct } from "@/services/productsService";
import { CreateProductForm } from "./CreateProductForm";

// uploadsService.ts lee auth.currentUser directo de lib/firebase.ts, que
// inicializa Firebase real y valida las env vars al importarse (mismo motivo
// por el que renderWithProviders.tsx no monta el AuthProvider real). Se
// mockea el módulo completo para que el resto de uploadsService (los dos
// fetch: presign + PUT) corra de verdad y pase por los handlers de MSW.
vi.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("fake-id-token"),
    },
  },
}));

// createProduct escribe en Firestore de verdad (addDoc): MSW intercepta
// fetch/HTTP, no el protocolo propio de Firestore, así que este service se
// mockea aparte, igual que ordersService en el flow test de checkout.
vi.mock("@/services/productsService", () => ({
  createProduct: vi.fn(),
}));

const mockedCreateProduct = vi.mocked(createProduct);

const VALID_IMAGE = new File(["contenido-de-prueba"], "producto.png", {
  type: "image/png",
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nombre"), "Zapatillas de prueba");
  await user.type(screen.getByLabelText("Precio"), "100");
  await user.upload(screen.getByLabelText("Imagen"), VALID_IMAGE);
}

describe("CreateProductForm — flow de alta con imagen (MSW)", () => {
  it("sube la imagen (presign + PUT, en ese orden) y crea el producto", async () => {
    const uploadUrl = "https://fake-bucket.s3.test/uploads/orden.png";
    const requestOrder: string[] = [];

    // Se pisan los handlers default con unos que además registran el orden:
    // es la forma concreta de comprobar "la UI hace las requests en orden"
    // que pide el enunciado, no solo que las dos hayan pasado.
    server.use(
      http.post(PRESIGN_ENDPOINT, () => {
        requestOrder.push("presign");
        return HttpResponse.json({ uploadUrl, publicUrl: uploadUrl, key: "orden.png" });
      }),
      http.put(uploadUrl, () => {
        requestOrder.push("put");
        return new HttpResponse(null, { status: 200 });
      }),
    );
    mockedCreateProduct.mockResolvedValueOnce("p-nuevo");

    const user = userEvent.setup();
    renderWithProviders(<CreateProductForm />);
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(
      await screen.findByText("El producto «Zapatillas de prueba» se creó correctamente."),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Zapatillas de prueba" })).toHaveAttribute(
      "src",
      uploadUrl,
    );
    expect(requestOrder).toEqual(["presign", "put"]);
    expect(mockedCreateProduct).toHaveBeenCalledWith({
      name: "Zapatillas de prueba",
      categoryId: "calzado",
      price: 100,
      imageUrl: uploadUrl,
    });
  });

  it("si el presign rechaza la subida, muestra el error y no crea el producto", async () => {
    server.use(
      http.post(PRESIGN_ENDPOINT, () =>
        HttpResponse.json(
          { code: "FORBIDDEN", message: "No tenés permisos para subir imágenes." },
          { status: 403 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<CreateProductForm />);
    await fillValidForm(user);

    await user.click(screen.getByRole("button", { name: "Crear producto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No tenés permisos para subir imágenes.",
    );
    expect(mockedCreateProduct).not.toHaveBeenCalled();
  });
});
