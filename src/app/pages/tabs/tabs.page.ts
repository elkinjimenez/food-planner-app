import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { Gesture, GestureController, IonTabs, IonTabBar, IonTabButton, IonIcon } from '@ionic/angular';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon],
})
export class TabsPage implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private location = inject(Location);
  private el = inject(ElementRef<HTMLElement>);
  private gestureCtrl = inject(GestureController);
  private deslizar?: Gesture;

  private tabs = ['semana', 'comidas', 'mercado', 'nevera', 'agua'];
  private isDragging = false;
  // Posición del indicador que se desliza bajo la pestaña seleccionada
  private tabActual = signal('semana');
  indiceTab = computed(() => Math.max(this.tabs.indexOf(this.tabActual()), 0));

  ngAfterViewInit(): void {
    // Deslizar a los lados sobre el contenido pasa a la pestaña vecina
    this.deslizar = this.gestureCtrl.create({
      el: this.el.nativeElement,
      gestureName: 'deslizar-pestanas',
      direction: 'x',
      threshold: 15,
      canStart: (d) => !(d.event.target as Element).closest('ion-tab-bar'),
      onEnd: (d) => {
        if (Math.abs(d.deltaX) < 50) return;
        const index = this.indiceTab() + (d.deltaX < 0 ? 1 : -1);
        if (index >= 0 && index < this.tabs.length) this.irATab(this.tabs[index]);
      },
    });
    this.deslizar.enable();
  }

  ngOnDestroy(): void {
    this.deslizar?.destroy();
  }

  alCambiarTab(tab: string): void {
    this.tabActual.set(tab);
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

  // Cambiar de pestaña reemplaza la entrada del historial: el gesto atrás no salta entre pestañas.
  // No se usa replaceUrl porque Ionic destruiría la pestaña que se deja.
  private async irATab(tab: string): Promise<void> {
    const url = '/' + tab;
    if (this.router.url === url) return;
    const ok = await this.router.navigateByUrl(url, { skipLocationChange: true });
    if (ok) this.location.replaceState(url, '', this.location.getState());
  }
}
