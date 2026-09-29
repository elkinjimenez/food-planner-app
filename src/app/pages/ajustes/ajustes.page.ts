import { Component, OnInit, inject, signal } from '@angular/core';
import {
  ActionSheetController,
  IonBackButton,
  IonCard,
  IonContent,
  IonIcon,
  IonSpinner,
  IonToggle,
  ToggleCustomEvent,
} from '@ionic/angular';
import { version } from '../../../../package.json';
import { AjustesService, Tema } from '../../services/ajustes.service';
import { AlertService } from '../../services/alert.service';
import { AppUpdateService } from '../../services/app-update.service';
import { RespaldoService } from '../../services/respaldo.service';
import { DatosApp, StorageService } from '../../services/storage.service';
import { META_VASOS } from '../../models/historial.model';
import { injectCompartirTexto } from '../../shared/compartir-texto';
import { injectPedirMetaVasos } from '../../shared/pedir-meta-vasos';

@Component({
  selector: 'app-ajustes',
  templateUrl: 'ajustes.page.html',
  styleUrls: ['ajustes.page.scss'],
  imports: [IonContent, IonCard, IonIcon, IonBackButton, IonToggle, IonSpinner],
})
export class AjustesPage implements OnInit {
  private storage = inject(StorageService);
  private respaldo = inject(RespaldoService);
  private alert = inject(AlertService);
  private appUpdate = inject(AppUpdateService);
  private actionSheetCtrl = inject(ActionSheetController);
  private compartir = injectCompartirTexto();
  private pedirMetaVasos = injectPedirMetaVasos();
  ajustes = inject(AjustesService);

  readonly version = version;
  readonly temas: { valor: Tema; nombre: string; icono: string }[] = [
    { valor: 'claro', nombre: 'Claro', icono: 'sunny-outline' },
    { valor: 'oscuro', nombre: 'Oscuro', icono: 'moon-outline' },
    { valor: 'sistema', nombre: 'Sistema', icono: 'contrast-outline' },
  ];
  meta = signal(META_VASOS);
  buscandoVersion = signal(false);
  // Se prepara antes del toque: iOS solo deja compartir o copiar durante el toque, sin esperas de por medio
  private mensajeRespaldo?: string;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.cargarMeta(), this.prepararRespaldo()]);
  }

  cambiarVibracion(event: ToggleCustomEvent): void {
    this.ajustes.cambiarVibracion(event.detail.checked);
  }

  async cambiarMeta(): Promise<void> {
    const meta = await this.pedirMetaVasos(this.meta());
    if (meta === null || meta === this.meta()) return;
    this.meta.set(meta);
    await this.storage.cambiarMetaVasos(meta);
    await this.prepararRespaldo();
  }

  exportar(): void {
    if (!this.mensajeRespaldo) {
      void this.alert.aviso('No se pudo preparar el respaldo', 'Inténtalo de nuevo.');
      void this.prepararRespaldo();
      return;
    }
    void this.compartir(this.mensajeRespaldo, {
      titulo: 'Exportar respaldo',
      copiar: 'Copiar respaldo',
      copiado: 'Respaldo copiado',
    });
  }

  async importar(): Promise<void> {
    const texto = await this.alert.pedirTexto('Importar respaldo', {
      message: 'Pega el mensaje del respaldo que exportaste.',
      placeholder: 'Pega aquí el respaldo',
      aceptar: 'Continuar',
    });
    if (!texto) return;

    let datos: DatosApp;
    try {
      datos = await this.respaldo.leer(texto);
    } catch (error) {
      await this.alert.aviso('No se pudo importar', (error as Error).message);
      return;
    }

    const diasHistorial = new Set([...datos.comidasConfirmadas, ...datos.agua].map((r) => r.fecha)).size;
    const confirmar = await this.alert.confirm(
      '¿Importar respaldo?',
      `Se reemplazarán todos tus datos actuales por los del respaldo: ${datos.comidas.length} comidas, ` +
        `${datos.mercado.length} productos de mercado, ${datos.nevera.length} productos de nevera ` +
        `y ${diasHistorial} días de historial.`,
      { aceptar: 'Reemplazar', destructivo: true },
    );
    if (!confirmar) return;

    try {
      await this.respaldo.importar(datos);
    } catch {
      await this.alert.aviso('No se pudo importar', 'Tus datos no cambiaron. Inténtalo de nuevo.');
      return;
    }
    await this.alert.toast('Respaldo importado', { duration: 1200 });
    // Todas las pantallas vuelven a cargar con los datos importados
    document.location.reload();
  }

  async restablecer(): Promise<void> {
    const opciones = await this.actionSheetCtrl.create({
      header: 'Restablecer datos',
      subHeader:
        'Se borran tus comidas, mercado, nevera, plan e historial. Si quieres conservarlos, exporta un respaldo antes.',
      buttons: [
        { text: 'Volver a los datos de ejemplo', role: 'destructive', data: true },
        { text: 'Borrar todo', role: 'destructive', data: false },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await opciones.present();
    const { data: ejemplos, role } = await opciones.onDidDismiss<boolean>();
    if (role !== 'destructive') return;

    const confirmar = await this.alert.confirm(
      ejemplos ? '¿Volver a los datos de ejemplo?' : '¿Borrar todos los datos?',
      'Esto no se puede deshacer.',
      { aceptar: ejemplos ? 'Restablecer' : 'Borrar todo', destructivo: true },
    );
    if (!confirmar) return;

    try {
      await this.storage.restablecerDatos(!!ejemplos);
    } catch {
      await this.alert.aviso('No se pudo restablecer', 'Tus datos no cambiaron. Inténtalo de nuevo.');
      return;
    }
    await this.alert.toast(ejemplos ? 'Datos de ejemplo cargados' : 'Datos borrados', { duration: 1200 });
    document.location.reload();
  }

  async buscarActualizacion(): Promise<void> {
    this.buscandoVersion.set(true);
    let nueva: boolean;
    try {
      nueva = await this.appUpdate.buscarYAplicar();
    } catch {
      await this.alert.aviso('No se pudo buscar', 'Revisa tu conexión e inténtalo de nuevo.');
      return;
    } finally {
      this.buscandoVersion.set(false);
    }
    if (!nueva) await this.alert.toast('Ya tienes la última versión');
  }

  private async cargarMeta(): Promise<void> {
    this.meta.set(await this.storage.getMetaVasos());
  }

  private async prepararRespaldo(): Promise<void> {
    try {
      this.mensajeRespaldo = await this.respaldo.crearMensaje();
    } catch {
      this.mensajeRespaldo = undefined;
    }
  }
}
