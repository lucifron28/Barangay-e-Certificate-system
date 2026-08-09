const PDF_TEXT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  // Repair common UTF-8-as-Windows-1252 mojibake before PDF encoding.
  ["\u00e2\u20ac\u0153", '"'],
  ["\u00e2\u20ac\u009d", '"'],
  ["\u00e2\u20ac\u02dc", "'"],
  ["\u00e2\u20ac\u2122", "'"],
  ["\u00e2\u20ac\u201c", "-"],
  ["\u00e2\u20ac\u201d", "-"],
  ["\u00e2\u201a\u00b1", "PHP"],
  // Also accept the ISO-8859-1 form of the same broken sequences.
  ["\u00e2\u0080\u009c", '"'],
  ["\u00e2\u0080\u009d", '"'],
  ["\u00e2\u0080\u0098", "'"],
  ["\u00e2\u0080\u0099", "'"],
  ["\u00e2\u0080\u0093", "-"],
  ["\u00e2\u0080\u0094", "-"],
  ["\u00e2\u0082\u00b1", "PHP"],
  ["\u201c", '"'],
  ["\u201d", '"'],
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u2013", "-"],
  ["\u2014", "-"],
  ["\u20b1", "PHP"],
];

export function normalizePdfText(value: string) {
  return PDF_TEXT_REPLACEMENTS.reduce(
    (normalized, [source, replacement]) =>
      normalized.split(source).join(replacement),
    value,
  ).normalize("NFC");
}
