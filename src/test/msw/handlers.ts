import { http, HttpResponse } from "msw";
import { PRESIGN_ENDPOINT } from "@/constants/uploads";

// URLs falsas de "S3": no existen en la red real, MSW las intercepta antes de
// que cualquier request salga de este proceso.
//
// Deliberadamente DISTINTAS (no la misma string para las dos): uploadUrl es la
// URL firmada de corta duración que solo sirve para el PUT, publicUrl es la
// que queda guardada y se muestra después. Si fueran iguales, un test no
// podría detectar el bug de guardar la firmada en vez de la pública — pasaría
// igual aunque el código las confundiera.
const FAKE_UPLOAD_PATH = "https://fake-bucket.s3.test/uploads/fake-key.jpg";
export const FAKE_UPLOAD_URL = `${FAKE_UPLOAD_PATH}?X-Amz-Signature=fake`;
export const FAKE_PUBLIC_URL = FAKE_UPLOAD_PATH;

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
  // Se matchea contra el path SIN el query string a propósito: MSW ignora el
  // query de la request entrante cuando el patrón del handler no lo incluye
  // (es el comportamiento default, sin warnings). Declarar el query dentro del
  // patrón del handler es justo lo que MSW desaconseja.
  http.put(FAKE_UPLOAD_PATH, () => new HttpResponse(null, { status: 200 })),
];
