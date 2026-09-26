/** Separa un texto en elementos por "+", "," o saltos de línea: "Pan + queso, tomate" → Pan, queso, tomate. */
export function separarLista(texto: string): string[] {
  return texto
    .split(/[+,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
