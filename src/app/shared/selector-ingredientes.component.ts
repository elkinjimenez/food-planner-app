import { Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonInput } from '@ionic/angular';
import { Ingrediente } from '../models/comida.model';
import { CategoriaMercado, ItemMercado } from '../models/item-mercado.model';
import { normalizarTexto } from '../utils/texto';
import { productosEnNombre } from '../utils/productos-en-nombre';
import { DURACIONES } from '../utils/duracion';
import { uuid } from '../utils/uuid';

const MAX_SUGERENCIAS = 6;
const MAX_SUGERIDOS = 8;

interface Categoria {
  valor: CategoriaMercado;
  texto: string;
  icono: string;
  tono: string;
}

const CATEGORIAS: Categoria[] = [
  { valor: 'supermercado', texto: 'Supermercado', icono: 'cart-outline', tono: 'tono-supermercado' },
  { valor: 'fruver', texto: 'Fruver', icono: 'leaf-outline', tono: 'tono-fruver' },
];

/**
 * Elige los ingredientes entre los productos de Mercado: se buscan por nombre y, si no está,
 * se crea. Lo creado va en `nuevos`: se guarda en Mercado junto con la comida (si se cancela, no).
 */
@Component({
  selector: 'app-selector-ingredientes',
  template: `
    <ion-input
      class="field-input"
      fill="solid"
      placeholder="Buscar en Mercado"
      autocapitalize="sentences"
      [clearInput]="true"
      [ngModel]="busqueda()"
      (ngModelChange)="escribir($event ?? '')"
      (keyup.enter)="alPresionarEnter()"
    >
      <ion-icon slot="start" name="search-outline" aria-hidden="true"></ion-icon>
    </ion-input>

    @if (busqueda().trim()) {
      <!-- pointerdown sin acción: el foco se queda en el buscador y el teclado no se cierra -->
      <div class="resultados">
        @for (item of sugerencias(); track item.id) {
          <button type="button" class="resultado" (pointerdown)="$event.preventDefault()" (click)="elegir(item)">
            <span class="resultado-icono {{ categoria(item).tono }}">
              <ion-icon [name]="categoria(item).icono"></ion-icon>
            </span>
            <span class="resultado-nombre">{{ item.nombre }}</span>
            @if (esNuevo(item.id)) {
              <span class="etiqueta-nuevo">Nuevo</span>
            }
          </button>
        }
        @if (puedeCrear()) {
          <div class="crear">
            @if (categoriaElegida(); as categoria) {
              <!-- Segundo paso: la duración, para la fecha de vencimiento en la Nevera -->
              <span class="crear-texto">
                <button
                  type="button"
                  class="crear-volver"
                  aria-label="Cambiar categoría"
                  (pointerdown)="$event.preventDefault()"
                  (click)="categoriaElegida.set(null)"
                >
                  <ion-icon name="chevron-back-outline"></ion-icon>
                </button>
                <ion-icon [name]="categoria.icono"></ion-icon>
                ¿Cuánto dura «{{ busqueda().trim() }}»?
              </span>
              <div class="crear-opciones">
                @for (d of duraciones; track d) {
                  <button type="button" class="crear-duracion" (pointerdown)="$event.preventDefault()" (click)="crear(categoria.valor, d)">
                    {{ d }}
                  </button>
                }
                <button
                  type="button"
                  class="crear-duracion crear-duracion--omitir"
                  (pointerdown)="$event.preventDefault()"
                  (click)="crear(categoria.valor, '')"
                >
                  Omitir
                </button>
              </div>
            } @else {
              <span class="crear-texto">
                <ion-icon name="add-outline"></ion-icon>
                Crear «{{ busqueda().trim() }}» en Mercado
              </span>
              <div class="crear-opciones">
                @for (c of categorias; track c.valor) {
                  <button type="button" class="crear-categoria" (pointerdown)="$event.preventDefault()" (click)="categoriaElegida.set(c)">
                    <ion-icon [name]="c.icono"></ion-icon>
                    {{ c.texto }}
                  </button>
                }
              </div>
            }
          </div>
        } @else if (sugerencias().length === 0) {
          <span class="sin-resultados">Ya está en la lista</span>
        }
      </div>
    }

    @if (ingredientes().length > 0) {
      <div class="chips">
        @for (i of ingredientes(); track $index) {
          @if (itemDe(i); as item) {
            <span class="chip">
              <ion-icon class="chip-icono" [name]="categoria(item).icono"></ion-icon>
              {{ item.nombre }}
              @if (esNuevo(item.id)) {
                <span class="etiqueta-nuevo">Nuevo</span>
              }
              <button type="button" class="chip-quitar" [attr.aria-label]="'Quitar ' + item.nombre" (click)="quitar(i)">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </span>
          } @else {
            <span class="chip chip--sin-enlazar">
              <button type="button" class="chip-nombre" [attr.aria-label]="'Buscar ' + i.nombre + ' en Mercado'" (click)="buscarEnMercado(i)">
                {{ i.nombre }}
              </button>
              <button type="button" class="chip-quitar" [attr.aria-label]="'Quitar ' + i.nombre" (click)="quitar(i)">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </span>
          }
        }
      </div>
      @if (haySinEnlazar()) {
        <span class="nota">Los de borde punteado no están en Mercado: tócalos para buscarlos.</span>
      }
    }

    @if (!busqueda().trim() && sugeridos().length > 0) {
      <div class="sugeridos">
        <div class="sugeridos-titulo">
          <span>Sugeridos del mercado</span>
          <button type="button" class="sugeridos-todos" (click)="agregarSugeridos()">Agregar todos</button>
        </div>
        <div class="chips">
          @for (item of sugeridos(); track item.id) {
            <button type="button" class="chip chip--sugerido" [attr.aria-label]="'Agregar ' + item.nombre" (click)="elegir(item)">
              <ion-icon class="chip-icono" name="add-outline"></ion-icon>
              {{ item.nombre }}
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    ion-input ion-icon {
      margin-inline-end: 8px;
      color: var(--color-texto-tenue);
    }

    .resultados {
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      background: var(--fondo-tarjeta);
      overflow: hidden;
    }

    .resultado {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      background: none;
      font: inherit;
      color: var(--color-texto);
      text-align: start;
      cursor: pointer;

      &:active {
        background: var(--fondo-presionado);
      }
    }

    .resultado + .resultado,
    .resultado + .crear,
    .resultado + .sin-resultados {
      border-top: 1px solid var(--borde-suave);
    }

    .resultado-icono {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      font-size: 16px;
    }

    .resultado-nombre {
      flex: 1;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .crear {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
    }

    .crear-texto {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .crear-opciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .crear-categoria,
    .crear-duracion {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      border: none;
      border-radius: 10px;
      background: var(--fondo-primario-tenue);
      color: var(--color-primario-texto);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }

    // Cuatro por fila, como los atajos de duración del modal de Mercado
    .crear-duracion {
      flex: 1 0 calc(25% - 6px);
      padding: 8px 4px;
    }

    .crear-duracion--omitir {
      background: var(--fondo-suave);
      color: var(--color-texto-secundario);
    }

    .crear-volver {
      display: flex;
      align-items: center;
      margin-left: -4px;
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      font-size: 18px;
      cursor: pointer;
    }

    .sin-resultados {
      padding: 10px 12px;
      font-size: 0.85rem;
      color: var(--color-texto-tenue);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 4px 4px 10px;
      border-radius: 10px;
      background: var(--fondo-tarjeta);
      color: var(--color-texto);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .chip--sin-enlazar {
      background: none;
      border: 1.5px dashed var(--borde);
      color: var(--color-texto-secundario);
    }

    .chip-icono {
      font-size: 14px;
      color: var(--ion-color-primary);
    }

    .chip-nombre {
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }

    .chip-quitar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: none;
      color: var(--color-texto-secundario);
      font-size: 18px;
      cursor: pointer;
    }

    .etiqueta-nuevo {
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--ion-color-primary);
      color: var(--color-sobre-primario);
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .nota {
      font-size: 0.78rem;
      color: var(--color-texto-tenue);
    }

    .sugeridos {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sugeridos-titulo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-texto-tenue);
    }

    .sugeridos-todos {
      padding: 4px 0;
      border: none;
      background: none;
      font: inherit;
      color: var(--ion-color-primary);
      cursor: pointer;
    }

    .chip--sugerido {
      padding: 6px 12px 6px 8px;
      border: none;
      background: var(--fondo-primario-tenue);
      color: var(--color-primario-texto);
      font-family: inherit;
      cursor: pointer;

      .chip-icono {
        color: inherit;
      }
    }
  `],
  imports: [FormsModule, IonInput, IonIcon],
})
export class SelectorIngredientesComponent {
  mercado = input.required<ItemMercado[]>();
  nombreComida = input(''); // de él salen los sugeridos
  ingredientes = model.required<Ingrediente[]>();
  nuevos = model.required<ItemMercado[]>();

  readonly categorias = CATEGORIAS;
  readonly duraciones = DURACIONES;
  busqueda = signal('');
  // Al crear un producto: con la categoría elegida se pide la duración
  categoriaElegida = signal<Categoria | null>(null);

  // Mercado más lo creado aquí, por id
  private porId = computed(() => new Map([...this.mercado(), ...this.nuevos()].map((m) => [m.id, m])));

  /** Los productos que tienen todas las palabras buscadas; primero los que empiezan así. Sin los ya elegidos. */
  sugerencias = computed(() => {
    const palabras = normalizarTexto(this.busqueda()).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return [];
    const elegidos = new Set(this.ingredientes().map((i) => i.itemMercadoId));
    return [...this.porId().values()]
      .filter((m) => !elegidos.has(m.id))
      .map((item) => ({ item, nombre: normalizarTexto(item.nombre) }))
      .filter(({ nombre }) => palabras.every((p) => nombre.includes(p)))
      .sort((a, b) => a.nombre.indexOf(palabras[0]) - b.nombre.indexOf(palabras[0]) || a.nombre.localeCompare(b.nombre))
      .slice(0, MAX_SUGERENCIAS)
      .map(({ item }) => item);
  });

  // Se crea solo si ningún producto se llama exactamente así (aunque cambien mayúsculas o tildes)
  puedeCrear = computed(() => {
    const texto = normalizarTexto(this.busqueda());
    return !!texto && ![...this.porId().values()].some((m) => normalizarTexto(m.nombre) === texto);
  });

  haySinEnlazar = computed(() => this.ingredientes().some((i) => !this.itemDe(i)));

  // Productos que aparecen en el nombre de la comida y aún no están en la lista
  sugeridos = computed(() => {
    const elegidos = new Set(this.ingredientes().map((i) => i.itemMercadoId));
    return productosEnNombre(this.nombreComida(), this.mercado())
      .filter((m) => !elegidos.has(m.id))
      .slice(0, MAX_SUGERIDOS);
  });

  itemDe(ingrediente: Ingrediente): ItemMercado | undefined {
    return this.porId().get(ingrediente.itemMercadoId ?? '');
  }

  categoria(item: ItemMercado): Categoria {
    return CATEGORIAS.find((c) => c.valor === item.categoria) ?? CATEGORIAS[0];
  }

  esNuevo(id: string): boolean {
    return this.nuevos().some((m) => m.id === id);
  }

  escribir(texto: string): void {
    this.busqueda.set(texto);
    if (!texto.trim()) this.categoriaElegida.set(null);
  }

  elegir(item: ItemMercado): void {
    this.ingredientes.update((lista) => [...lista, { nombre: item.nombre, itemMercadoId: item.id }]);
    this.escribir('');
  }

  agregarSugeridos(): void {
    const sugeridos = this.sugeridos().map((item) => ({ nombre: item.nombre, itemMercadoId: item.id }));
    this.ingredientes.update((lista) => [...lista, ...sugeridos]);
  }

  /** Sin duración ("Omitir"), al comprarlo la Nevera le pone 30 días. */
  crear(categoria: CategoriaMercado, duracion: string): void {
    const item: ItemMercado = { id: uuid(), nombre: this.busqueda().trim(), duracion, categoria, comprado: false };
    this.nuevos.update((lista) => [...lista, item]);
    this.elegir(item);
  }

  quitar(ingrediente: Ingrediente): void {
    this.ingredientes.update((lista) => lista.filter((i) => i !== ingrediente));
    // Si se había creado aquí, ya no se agrega a Mercado
    this.nuevos.update((lista) => lista.filter((m) => m.id !== ingrediente.itemMercadoId));
  }

  /** Un ingrediente sin enlazar (de antes, o cuyo producto se borró) se reemplaza buscándolo en Mercado. */
  buscarEnMercado(ingrediente: Ingrediente): void {
    this.quitar(ingrediente);
    this.busqueda.set(ingrediente.nombre);
  }

  /** Enter: elige la primera sugerencia o, si no hay, pasa a crearlo en Supermercado (falta la duración). */
  alPresionarEnter(): void {
    const [primera] = this.sugerencias();
    if (primera) this.elegir(primera);
    else if (this.puedeCrear() && !this.categoriaElegida()) this.categoriaElegida.set(CATEGORIAS[0]);
  }
}
