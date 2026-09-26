import { Comida, TipoComida } from '../models/comida.model';
import { CategoriaMercado, ItemMercado } from '../models/item-mercado.model';
import { PlanSemanal } from '../models/plan-semanal.model';
import { normalizarTexto } from '../utils/texto';
import { uuid } from '../utils/uuid';

// ===== Mercado precargado =====
const supermercadoSeed = [
  { nombre: 'Huevos (cubeta x30)', duracion: '3 semanas en nevera' },
  { nombre: 'Queso campesino', duracion: '1-2 semanas en nevera' },
  { nombre: 'Jamón', duracion: '1 semana abierto' },
  { nombre: 'Yogur griego Dejamu', duracion: '2-3 semanas sin abrir' },
  { nombre: 'Mantequilla', duracion: '1-2 meses en nevera' },
  { nombre: 'Leche larga vida', duracion: '3-4 meses sin abrir / 5 días abierta' },
  { nombre: 'Crema de leche', duracion: '2-3 semanas abierta' },
  { nombre: 'Avena en hojuelas', duracion: '6-12 meses en despensa' },
  { nombre: 'Granola (baja en azúcar)', duracion: '3-6 meses en despensa' },
  { nombre: 'Semillas de chía', duracion: '6-12 meses en despensa' },
  { nombre: 'Pan integral tajado', duracion: '1 semana / congelar si no usa rápido' },
  { nombre: 'Arepas precocidas (Valle o Zenú)', duracion: 'según empaque' },
  { nombre: 'Mermelada', duracion: '3-6 meses abierta en nevera' },
  { nombre: 'Salsa de tomate', duracion: '3-6 meses abierta en nevera' },
  { nombre: 'Galletas integrales o de arroz', duracion: '3-6 meses en despensa' },
  { nombre: 'Barras de cereal', duracion: '3-6 meses en despensa' },
  { nombre: 'Cereal integral bajo en azúcar', duracion: '3-6 meses en despensa' },
  { nombre: 'Jugo natural en cartón', duracion: '6 meses sin abrir / 5 días abierto' },
  { nombre: 'Chocolate en barra o cocoa', duracion: '6-12 meses en despensa' },
  { nombre: 'Café molido o instantáneo', duracion: '6-12 meses en despensa' },
  { nombre: 'Miel de abeja', duracion: 'años' },
  { nombre: 'Arequipe', duracion: '2-3 meses abierto en nevera' },
] as const satisfies readonly ItemSeed[];

const fruverSeed = [
  { nombre: 'Bananos', duracion: '3-5 días maduros' },
  { nombre: 'Manzanas', duracion: '2-3 semanas en nevera' },
  { nombre: 'Mandarinas', duracion: '1-2 semanas en nevera' },
  { nombre: 'Aguacates (verdes)', duracion: '3-5 días para madurar' },
  { nombre: 'Uvas', duracion: '1-2 semanas en nevera' },
  { nombre: 'Fresas', duracion: '3-5 días en nevera' },
  { nombre: 'Limones', duracion: '3-4 semanas en nevera' },
  { nombre: 'Zanahoria baby', duracion: '2-3 semanas en nevera' },
  { nombre: 'Tomate', duracion: '1 semana en nevera' },
  { nombre: 'Cebolla', duracion: '2-3 semanas en nevera' },
] as const satisfies readonly ItemSeed[];

type ItemSeed = Omit<ItemMercado, 'id' | 'categoria' | 'comprado'>;
type ProductoSeed = (typeof supermercadoSeed | typeof fruverSeed)[number]['nombre'];

/** Lista de mercado base, con ids nuevos en cada llamada. */
export function mercadoBase(categoria?: CategoriaMercado): ItemMercado[] {
  const todos: ItemMercado[] = [
    ...supermercadoSeed.map((i) => ({
      ...i,
      id: uuid(),
      categoria: 'supermercado' as const,
      comprado: false,
    })),
    ...fruverSeed.map((i) => ({
      ...i,
      id: uuid(),
      categoria: 'fruver' as const,
      comprado: false,
    })),
  ];
  return categoria ? todos.filter((i) => i.categoria === categoria) : todos;
}

// ===== Comidas precargadas =====
interface ComidaSeed {
  nombre: string;
  ingredientes: ProductoSeed[];
}

const desayunosSeed: ComidaSeed[] = [
  {
    nombre: 'Granola + yogur griego + fruta + chía',
    ingredientes: ['Granola (baja en azúcar)', 'Yogur griego Dejamu', 'Bananos', 'Semillas de chía'],
  },
  { nombre: 'Huevos revueltos con tomate y cebolla', ingredientes: ['Huevos (cubeta x30)', 'Tomate', 'Cebolla'] },
  { nombre: 'Pan integral + mantequilla + mermelada', ingredientes: ['Pan integral tajado', 'Mantequilla', 'Mermelada'] },
  { nombre: 'Arepa precocida + queso campesino', ingredientes: ['Arepas precocidas (Valle o Zenú)', 'Queso campesino'] },
  {
    nombre: 'Huevos fritos + arepa + queso',
    ingredientes: ['Huevos (cubeta x30)', 'Arepas precocidas (Valle o Zenú)', 'Queso campesino'],
  },
  { nombre: 'Pan integral + queso campesino + tomate', ingredientes: ['Pan integral tajado', 'Queso campesino', 'Tomate'] },
];

const cenasSeed: ComidaSeed[] = [
  {
    nombre: 'Huevos revueltos + pan integral + aguacate',
    ingredientes: ['Huevos (cubeta x30)', 'Pan integral tajado', 'Aguacates (verdes)'],
  },
  { nombre: 'Arepa + queso derretido', ingredientes: ['Arepas precocidas (Valle o Zenú)', 'Queso campesino'] },
  {
    nombre: 'Yogur griego + granola + fruta + chía',
    ingredientes: ['Yogur griego Dejamu', 'Granola (baja en azúcar)', 'Fresas', 'Semillas de chía'],
  },
  {
    nombre: 'Pan con jamón + queso + tomate',
    ingredientes: ['Pan integral tajado', 'Jamón', 'Queso campesino', 'Tomate'],
  },
  { nombre: 'Huevos fritos + arepa', ingredientes: ['Huevos (cubeta x30)', 'Arepas precocidas (Valle o Zenú)'] },
  {
    nombre: 'Pan + mantequilla + arequipe + leche',
    ingredientes: ['Pan integral tajado', 'Mantequilla', 'Arequipe', 'Leche larga vida'],
  },
];

/**
 * Comidas base, con ids nuevos en cada llamada (al crear la base de datos o al restaurarlas).
 * Sus ingredientes se enlazan por nombre con los productos de `mercado`; los que no estén quedan sin enlazar.
 */
export function comidasBase(mercado: ItemMercado[], tipo?: TipoComida): Comida[] {
  const porNombre = new Map(mercado.map((i) => [normalizarTexto(i.nombre), i]));
  const crear = (c: ComidaSeed, tipoComida: TipoComida): Comida => ({
    id: uuid(),
    nombre: c.nombre,
    tipo: tipoComida,
    ingredientes: c.ingredientes.map((nombre) => {
      const item = porNombre.get(normalizarTexto(nombre));
      return item ? { nombre: item.nombre, itemMercadoId: item.id } : { nombre };
    }),
  });
  const todas = [...desayunosSeed.map((c) => crear(c, 'desayuno')), ...cenasSeed.map((c) => crear(c, 'cena'))];
  return tipo ? todas.filter((c) => c.tipo === tipo) : todas;
}

// ===== Plan semanal vacío por defecto =====
export function planSemanalVacio(): PlanSemanal {
  return {
    lunes: {},
    martes: {},
    miercoles: {},
    jueves: {},
    viernes: {},
    sabado: {},
    domingo: {},
  };
}
