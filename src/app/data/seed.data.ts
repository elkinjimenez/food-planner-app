import { Comida } from '../models/comida.model';
import { ItemMercado } from '../models/item-mercado.model';
import { ProductoNevera } from '../models/producto-nevera.model';
import { PlanSemanal } from '../models/plan-semanal.model';
import { uuid } from '../utils/uuid';

// ===== Comidas precargadas =====
const desayunosSeed: Omit<Comida, 'id' | 'tipo'>[] = [
  { nombre: 'Granola + yogur griego + fruta + chía' },
  { nombre: 'Huevos revueltos con tomate y cebolla' },
  { nombre: 'Pan integral + mantequilla + mermelada' },
  { nombre: 'Arepa precocida + queso campesino' },
  { nombre: 'Huevos fritos + arepa + queso' },
  { nombre: 'Pan integral + queso campesino + tomate' },
];

const cenasSeed: Omit<Comida, 'id' | 'tipo'>[] = [
  { nombre: 'Huevos revueltos + pan integral + aguacate' },
  { nombre: 'Arepa + queso derretido' },
  { nombre: 'Yogur griego + granola + fruta + chía' },
  { nombre: 'Pan con jamón + queso + tomate' },
  { nombre: 'Huevos fritos + arepa' },
  { nombre: 'Pan + mantequilla + arequipe + leche' },
];

export const comidasSeed: Comida[] = [
  ...desayunosSeed.map((c) => ({ ...c, id: uuid(), tipo: 'desayuno' as const })),
  ...cenasSeed.map((c) => ({ ...c, id: uuid(), tipo: 'cena' as const })),
];

// ===== Mercado precargado =====
const supermercadoSeed: Omit<ItemMercado, 'id' | 'categoria' | 'comprado'>[] = [
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
];

const fruverSeed: Omit<ItemMercado, 'id' | 'categoria' | 'comprado'>[] = [
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
];

export const mercadoSeed: ItemMercado[] = [
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

// ===== Nevera vacía por defecto =====
export const neveraSeed: ProductoNevera[] = [];

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
