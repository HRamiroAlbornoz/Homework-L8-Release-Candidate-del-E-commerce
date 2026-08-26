import { formatPrice } from "../lib/formatPrice";

interface PriceTagProps {
  amount: number;
  variant?: "tag" | "inline";
}

// "tag": la etiqueta física del almacén (agujerito + rotación fija), reservada
// a los momentos de cierre/resumen (tarjeta de producto, totales). "inline"
// (default): la misma tipografía mono sin el efecto visual, para listas y
// tablas densas — un "tag" por fila se leería como un carnaval de etiquetas.
export function PriceTag({ amount, variant = "inline" }: PriceTagProps) {
  const formatted = formatPrice(amount);

  if (variant === "tag") {
    return (
      <span className="price-tag price-tag--tag">
        <span className="price-tag__hole" aria-hidden="true" />
        {formatted}
      </span>
    );
  }

  return <span className="price-tag price-tag--inline">{formatted}</span>;
}
