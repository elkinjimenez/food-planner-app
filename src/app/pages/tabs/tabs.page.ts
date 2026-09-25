import { Component, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon],
})
export class TabsPage {
  private router = inject(Router);

  private tabs = ['semana', 'comidas', 'mercado', 'nevera', 'agua'];
  private isDragging = false;

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
      this.router.navigateByUrl('/' + this.tabs[index]);
    }
  }
}
