import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { Gesture, GestureController, IonTabs, IonTabBar, IonTabButton, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';

/** La pestaña que se arrastra con el dedo y la vecina que se asoma a su lado. */
interface Arrastre {
  actual: HTMLElement;
  ancho: number;
  tab?: string; // la vecina
  vecina?: HTMLElement;
  soltado?: boolean;
}

const TRANSICION = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon],
})
export class TabsPage implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private el = inject(ElementRef<HTMLElement>);
  private gestureCtrl = inject(GestureController);
  private ionTabs = viewChild.required(IonTabs);
  private deslizar?: Gesture;
  private arrastre?: Arrastre;
  // Al abrir se crean todas las pestañas (sin mostrarlas) para que al deslizar la vecina ya exista
  private precarga: 'pendiente' | 'en-curso' | 'lista' = 'pendiente';
  private tabInicial = '';

  private tabs = ['semana', 'comidas', 'mercado', 'nevera', 'agua'];
  private isDragging = false;
  // Posición del indicador que se desliza bajo la pestaña seleccionada
  private tabActual = signal('semana');
  indiceTab = computed(() => Math.max(this.tabs.indexOf(this.tabActual()), 0));

  ngAfterViewInit(): void {
    this.el.nativeElement.style.visibility = 'hidden';
    // Deslizar a los lados sobre el contenido arrastra la pestaña y trae la vecina
    this.deslizar = this.gestureCtrl.create({
      el: this.el.nativeElement,
      gestureName: 'deslizar-pestanas',
      direction: 'x',
      threshold: 15,
      disableScroll: true,
      canStart: (d) =>
        this.precarga === 'lista' && !this.arrastre && !(d.event.target as Element).closest('ion-tab-bar'),
      onStart: () => this.empezarArrastre(),
      onMove: (d) => this.moverArrastre(d.deltaX),
      onEnd: (d) => void this.soltarArrastre(d.deltaX, d.velocityX),
    });
    this.deslizar.enable();
  }

  ngOnDestroy(): void {
    this.deslizar?.destroy();
  }

  alCambiarTab(tab: string): void {
    if (this.precarga !== 'en-curso') this.tabActual.set(tab);
  }

  async alMostrarTab(tab: string): Promise<void> {
    if (this.precarga === 'pendiente') {
      this.precarga = 'en-curso';
      this.tabInicial = tab;
      for (const t of this.tabs) {
        if (!this.vista(t)) await this.router.navigateByUrl('/' + t, { skipLocationChange: true });
      }
      if (this.router.url === '/' + tab) this.terminarPrecarga();
      else await this.router.navigateByUrl('/' + tab, { skipLocationChange: true });
    } else if (this.precarga === 'en-curso') {
      if (tab === this.tabInicial) this.terminarPrecarga();
    } else if (this.arrastre?.soltado) {
      this.limpiar(this.arrastre.actual);
      if (this.arrastre.vecina) this.limpiar(this.arrastre.vecina);
      this.arrastre = undefined;
    }
  }

  alPulsarTab(event: Event): void {
    event.stopPropagation();
    this.irATab((event as CustomEvent).detail.tab);
  }

  onTouchStart(event: TouchEvent): void {
    this.isDragging = true;
    this.seleccionarPorX(event.touches[0].clientX, event.currentTarget as HTMLElement);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.seleccionarPorX(event.touches[0].clientX, event.currentTarget as HTMLElement);
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  private seleccionarPorX(x: number, tabBar: HTMLElement): void {
    const rect = tabBar.getBoundingClientRect();
    const relX = x - rect.left;
    const tabWidth = rect.width / this.tabs.length;
    const index = Math.floor(relX / tabWidth);
    if (index >= 0 && index < this.tabs.length) {
      this.irATab(this.tabs[index]);
    }
  }

  private terminarPrecarga(): void {
    this.precarga = 'lista';
    this.el.nativeElement.style.removeProperty('visibility');
  }

  private vista(tab: string) {
    return this.ionTabs().outlet.getLastRouteView(tab);
  }

  private empezarArrastre(): void {
    const actual = this.vista(this.tabActual())?.element;
    if (actual) this.arrastre = { actual, ancho: this.el.nativeElement.clientWidth };
  }

  private moverArrastre(dx: number): void {
    const a = this.arrastre;
    if (!a || a.soltado) return;
    const tab = this.tabs[this.indiceTab() + (dx < 0 ? 1 : -1)];
    if (tab !== a.tab) {
      this.ocultarVecina(a);
      a.tab = tab;
      a.vecina = tab ? this.mostrarVecina(tab) : undefined;
    }
    // En la primera y la última pestaña se resiste: no hay a cuál pasar
    const x = a.vecina ? dx : dx / 4;
    this.mover(a.actual, x);
    if (a.vecina) this.mover(a.vecina, x + (dx < 0 ? a.ancho : -a.ancho));
  }

  private async soltarArrastre(dx: number, vx: number): Promise<void> {
    const a = this.arrastre;
    if (!a) return;
    a.soltado = true;
    const pasa =
      !!a.vecina && (Math.abs(dx) > a.ancho / 3 || (Math.abs(vx) > 0.2 && Math.sign(vx) === Math.sign(dx)));
    const fin = pasa ? (dx < 0 ? -a.ancho : a.ancho) : 0;
    this.mover(a.actual, fin, true);
    if (a.vecina) this.mover(a.vecina, fin + (dx < 0 ? a.ancho : -a.ancho), true);
    await new Promise((r) => setTimeout(r, 300));

    if (pasa && a.vecina && a.tab) {
      a.vecina.style.opacity = '1'; // Ionic la deja invisible un instante al activarla
      if (await this.navegar(a.tab)) return; // se termina de limpiar en alMostrarTab
    }
    this.ocultarVecina(a);
    this.limpiar(a.actual);
    this.arrastre = undefined;
  }

  private mostrarVecina(tab: string): HTMLElement | undefined {
    const vista = this.vista(tab);
    if (!vista) return undefined;
    vista.ref.changeDetectorRef.reattach();
    vista.element.classList.remove('ion-page-hidden');
    vista.element.dispatchEvent(new CustomEvent('ionViewWillEnter')); // recarga sus datos, como al entrar
    return vista.element;
  }

  private ocultarVecina(a: Arrastre): void {
    if (!a.vecina || !a.tab) return;
    a.vecina.classList.add('ion-page-hidden');
    this.limpiar(a.vecina);
    this.vista(a.tab)?.ref.changeDetectorRef.detach();
    a.vecina = undefined;
  }

  private mover(el: HTMLElement, x: number, animado = false): void {
    el.style.transition = animado ? TRANSICION : 'none';
    el.style.transform = `translateX(${x}px)`;
  }

  private limpiar(el: HTMLElement): void {
    el.style.removeProperty('transform');
    el.style.removeProperty('transition');
    el.style.removeProperty('opacity');
  }

  private irATab(tab: string): void {
    if (this.precarga === 'lista' && !this.arrastre) this.navegar(tab);
  }

  private async navegar(tab: string): Promise<boolean> {
    const url = '/' + tab;
    return this.router.url !== url && this.router.navigateByUrl(url);
  }
}
