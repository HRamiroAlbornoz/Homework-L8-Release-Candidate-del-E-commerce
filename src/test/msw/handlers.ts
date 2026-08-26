import { http, HttpResponse } from "msw";
import { PRESIGN_ENDPOINT } from "@/constants/uploads";

// URL falsa de "S3": no existe en la red real, MSW la intercepta antes de que
// cualquier request salga de este proceso.
export const FAKE_UPLOAD_URL = "https://fake-bucket.s3.test/uploads/fake-key.jpg";
export const FAKE_PUBLIC_URL = "https://fake-bucket.s3.test/uploads/fake-key.jpg";

// Handlers por default: éxito en las dos requests del flujo de upload
// (presign + PUT). Los tests que necesiten otra respuesta los pisan
// puntualmente con server.use(), que se resetea solo después de cada test
// (ver src/test/setup.ts).
export const handlers = [
  http.post(PRESIGN_ENDPOINT, () =>
    HttpResponse.json({
      uploadUrl: FAKE_UPLOAD_URL,
      publicUrl: FAKE_PUBLIC_URL,
      key: "fake-key.jpg",
    }),
  ),
  http.put(FAKE_UPLOAD_URL, () => new HttpResponse(null, { status: 200 })),
];
