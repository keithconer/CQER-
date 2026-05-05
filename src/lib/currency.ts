function toFiniteNumber(value: number | string | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

const phpCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const phpNumberFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPhpCurrency(value: number | string | null | undefined) {
  return phpCurrencyFormatter.format(toFiniteNumber(value));
}

export function formatPhpAmount(value: number | string | null | undefined) {
  return phpNumberFormatter.format(toFiniteNumber(value));
}

export function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  const decimalIndex = normalized.indexOf(".");
  const wholePart =
    decimalIndex >= 0 ? normalized.slice(0, decimalIndex) : normalized;
  const decimalPart =
    decimalIndex >= 0 ? normalized.slice(decimalIndex + 1).replace(/\./g, "") : "";

  return {
    hasDecimal: decimalIndex >= 0,
    wholePart,
    decimalPart: decimalPart.slice(0, 2),
  };
}

export function formatDecimalInput(value: string) {
  const { hasDecimal, wholePart, decimalPart } = sanitizeDecimalInput(value);

  if (!wholePart && !decimalPart && !hasDecimal) {
    return { display: "", numericValue: null as number | null };
  }

  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const formattedWhole = Number(normalizedWhole).toLocaleString("en-PH");
  const display = hasDecimal
    ? `${formattedWhole}.${decimalPart}`
    : formattedWhole;
  const numericValue = Number(
    `${normalizedWhole}${hasDecimal ? `.${decimalPart}` : ""}`
  );

  return {
    display,
    numericValue: Number.isFinite(numericValue) ? numericValue : null,
  };
}
