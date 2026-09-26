/** Texto para comparar sin mayúsculas ni tildes: "Plátano " → "platano". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
