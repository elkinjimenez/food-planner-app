**CONTEXTO DEL PROYECTO**

Soy desarrollador FullStack con experiencia en Ionic + Angular. Quiero construir una app personal de planeación de comidas y control de mercado. Es solo para uso personal, sin backend, sin autenticación por ahora.

**Stack:**
- Ionic con Angular standalone components
- TypeScript
- Indexed para persistencia
- Sin backend, sin auth aún, sin base de datos externa

---

**OBJETIVO DE LA APP**

App móvil personal para:
1. Planear desayunos y cenas semanalmente
2. Gestionar lista de mercado con checks
3. Controlar qué hay en la nevera y fechas de vencimiento
4. Recordatorio de hidratación (agua)

---

**PANTALLAS (4)**

**1. Home — Planeador semanal**
- Vista Lunes a Domingo
- Cada día muestra: Desayuno y Cena
- Tap en cualquier comida → abre selector para cambiarla
- Botón "Generar semana aleatoria" que asigna comidas al azar desde la lista disponible
- Persistencia en Indexed

**2. Mis comidas**
- Dos secciones: Desayunos y Cenas
- CRUD completo: agregar, editar, eliminar comidas
- Cada comida tiene: nombre e ingredientes principales (opcional)
- Datos precargados con estas opciones:

*Desayunos:*
- Granola + yogur griego + fruta + chía
- Huevos revueltos con tomate y cebolla
- Pan integral + mantequilla + mermelada
- Arepa precocida + queso campesino
- Huevos fritos + arepa + queso
- Pan integral + queso campesino + tomate

*Cenas:*
- Huevos revueltos + pan integral + aguacate
- Arepa + queso derretido
- Yogur griego + granola + fruta + chía
- Pan con jamón + queso + tomate
- Huevos fritos + arepa
- Pan + mantequilla + arequipe + leche

**3. Mercado**
- Dos secciones: Supermercado y Fruver
- Cada ítem tiene: nombre, duración aproximada y checkbox para tachar
- Botón "Desmarcar todo" para reiniciar la lista
- Datos precargados con esta lista:

*Supermercado:*
- Huevos (cubeta x30) — 3 semanas en nevera
- Queso campesino — 1-2 semanas en nevera
- Jamón — 1 semana abierto
- Yogur griego Dejamu — 2-3 semanas sin abrir
- Mantequilla — 1-2 meses en nevera
- Leche larga vida — 3-4 meses sin abrir / 5 días abierta
- Crema de leche — 2-3 semanas abierta
- Avena en hojuelas — 6-12 meses en despensa
- Granola (baja en azúcar) — 3-6 meses en despensa
- Semillas de chía — 6-12 meses en despensa
- Pan integral tajado — 1 semana / congelar si no usa rápido
- Arepas precocidas (Valle o Zenú) — según empaque
- Mermelada — 3-6 meses abierta en nevera
- Salsa de tomate — 3-6 meses abierta en nevera
- Galletas integrales o de arroz — 3-6 meses en despensa
- Barras de cereal — 3-6 meses en despensa
- Cereal integral bajo en azúcar — 3-6 meses en despensa
- Jugo natural en cartón — 6 meses sin abrir / 5 días abierto
- Chocolate en barra o cocoa — 6-12 meses en despensa
- Café molido o instantáneo — 6-12 meses en despensa
- Miel de abeja — años
- Arequipe — 2-3 meses abierto en nevera

*Fruver:*
- Bananos — 3-5 días maduros
- Manzanas — 2-3 semanas en nevera
- Mandarinas — 1-2 semanas en nevera
- Aguacates (verdes) — 3-5 días para madurar
- Uvas — 1-2 semanas en nevera
- Fresas — 3-5 días en nevera
- Limones — 3-4 semanas en nevera
- Zanahoria baby — 2-3 semanas en nevera
- Tomate — 1 semana en nevera
- Cebolla — 2-3 semanas en nevera

**4. Nevera**
- Lista de productos actualmente en nevera
- Cada producto tiene: nombre y fecha de vencimiento aproximada
- Indicador visual de estado:
  - 🟢 Verde — más de 5 días
  - 🟡 Amarillo — 2 a 5 días
  - 🔴 Rojo — vence hoy o mañana
- CRUD: agregar, editar, eliminar productos

---

**NAVEGACIÓN**
- Tab bar inferior con 4 tabs: Semana / Comidas / Mercado / Nevera
- Iconos Ionicons para cada tab

---

**REQUERIMIENTOS TÉCNICOS**
- Ionic con Angular standalone
- Cada pantalla es un standalone component
- Servicio centralizado (StorageService) que maneja todo el Indexed
- Modelos TypeScript definidos para: Comida, ItemMercado, ProductoNevera, PlanSemanal
- Tema visual: paleta de colores verde, diseño materialista, animaciones, y estilo novedoso

---

**LO QUE NO DEBE HACER**
- No agregar backend
- No agregar autenticación aún
- No sobre-complicar la arquitectura
- No agregar librerías innecesarias
- Empezar minimalista, bonito, funcional y limpio

---

**ORDEN DE CONSTRUCCIÓN SUGERIDO**
1. Estructura base del proyecto y StorageService
2. Pantalla Mercado
3. Pantalla Mis comidas
4. Pantalla Planeador semanal
5. Pantalla Nevera