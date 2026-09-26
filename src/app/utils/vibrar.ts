/** Solo Android: iOS no soporta la Vibration API. Llamar antes de cualquier await del gesto. */
export function vibrar(ms = 50): void {
  navigator.vibrate?.(ms);
}
