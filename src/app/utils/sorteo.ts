/**
 * Reparte las opciones en los días al azar: no repite ninguna hasta haberlas usado todas y
 * nunca pone la misma dos días seguidos (el último día va seguido del primero, porque el plan
 * se repite cada semana). Los días que ya traen valor en `fijos` lo conservan y cuentan como usados.
 * Si no hay otra forma, primero se repite antes de tiempo y, como último recurso, se deja
 * la misma en el salto de una semana a la siguiente, nunca dentro de la semana.
 */
export function sortearDias(opciones: string[], fijos: (string | undefined)[]): (string | undefined)[] {
  const dias = [...fijos];
  const n = dias.length;
  if (opciones.length === 0) return dias;
  const usos = new Map(opciones.map((id) => [id, fijos.filter((f) => f === id).length]));

  /** Al azar entre las menos usadas que no choquen con `evitar`. */
  const elegir = (evitar: (string | undefined)[]): string | undefined => {
    const libres = opciones.filter((id) => !evitar.includes(id));
    const minimo = Math.min(...libres.map((id) => usos.get(id)!));
    const menos = libres.filter((id) => usos.get(id) === minimo);
    return menos[Math.floor(Math.random() * menos.length)];
  };

  for (let i = 0; i < n; i++) {
    if (dias[i]) continue;
    const seguidos = [dias[i - 1], dias[i + 1]];
    const conSalto = [...seguidos, dias[(i - 1 + n) % n], dias[(i + 1) % n]];
    const id = elegir(conSalto) ?? elegir(seguidos) ?? elegir([])!;
    dias[i] = id;
    usos.set(id, usos.get(id)! + 1);
  }
  return dias;
}
