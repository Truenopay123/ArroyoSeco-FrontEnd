import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GastronomiaService, EstablecimientoDto, MenuDto, MenuItemDto, MesaDto } from '../../services/gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { first } from 'rxjs/operators';

const PALABRAS_PROHIBIDAS = [
  'chinga', 'chingada', 'chingado', 'chingar', 'pendejo', 'pendeja',
  'cabron', 'cabrona', 'puto', 'puta', 'putamadre', 'verga', 'vergon',
  'mierda', 'culo', 'culero', 'culera', 'mamón', 'mamon', 'mamona',
  'huevon', 'huevona', 'joder', 'jodido', 'jodida', 'pinche',
  'estupido', 'estupida', 'idiota', 'imbecil', 'tarado', 'tarada',
  'baboso', 'babosa', 'menso', 'mensa', 'wey', 'guey', 'naco', 'naca',
  'perra', 'perro', 'zorra', 'bastardo', 'bastarda', 'cagar', 'cagada',
  'chingón', 'chingon', 'ojete', 'nalgas', 'prostituta', 'pene', 'vagina',
  'coger', 'cogida', 'marica', 'joto', 'puñal', 'punal',
  'fuck', 'shit', 'bitch', 'ass', 'asshole', 'damn', 'bastard', 'dick',
  'pussy', 'crap', 'whore', 'slut', 'nigger', 'faggot'
];

@Component({
  selector: 'app-detalle-establecimiento-oferente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './detalle-establecimiento-oferente.component.html',
  styleUrl: './detalle-establecimiento-oferente.component.scss'
})
export class DetalleEstablecimientoOferenteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gastronomiaService = inject(GastronomiaService);
  private toast = inject(ToastService);
  private offlineQueue = inject(OfflineQueueService);
  private destroyRef = inject(DestroyRef);

  establecimiento: EstablecimientoDto | null = null;
  loading = true;
  isOffline = !navigator.onLine;

  // Modales
  modalMenuAbierto = false;
  modalItemAbierto = false;
  modalMesaAbierto = false;

  // Formularios
  nuevoMenu = { nombre: '' };
  menuSeleccionado: MenuDto | null = null;

  nuevoItem: MenuItemDto = { nombre: '', descripcion: '', precio: 0 };

  nuevaMesa: MesaDto = { numero: 1, capacidad: 2, disponible: true };

  erroresMenu: { [campo: string]: string } = {};
  erroresItem: { [campo: string]: string } = {};
  erroresMesa: { [campo: string]: string } = {};

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEstablecimiento(Number(id));

      // Recargar al sincronizar acciones pendientes (offline → online)
      this.offlineQueue.synced$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadEstablecimiento(Number(id)));
    }

    window.addEventListener('online', () => {
      this.isOffline = false;
      const idReload = this.route.snapshot.paramMap.get('id');
      if (idReload) this.loadEstablecimiento(Number(idReload));
    });
    window.addEventListener('offline', () => {
      this.isOffline = true;
    });
  }

  private loadEstablecimiento(id: number) {
    this.loading = true;
    this.gastronomiaService.getById(id).pipe(first()).subscribe({
      next: (data) => {
        console.log('Establecimiento cargado:', data);
        console.log('Menús recibidos:', data.menus);
        console.log('Mesas recibidas:', data.mesas);
        this.establecimiento = data;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Error al cargar establecimiento');
        this.router.navigate(['/oferente/gastronomia/establecimientos']);
        this.loading = false;
      }
    });
  }

  // ========== MENÚS ==========
  abrirModalMenu() {
    this.nuevoMenu = { nombre: '' };
    this.erroresMenu = {};
    this.modalMenuAbierto = true;
  }

  cerrarModalMenu() {
    this.modalMenuAbierto = false;
  }

  agregarMenu() {
    this.erroresMenu = {};
    const nombre = this.nuevoMenu.nombre.trim();
    if (!nombre) {
      this.erroresMenu['nombre'] = 'El nombre del menú es obligatorio';
      return;
    }
    if (nombre.length < 3) {
      this.erroresMenu['nombre'] = 'El nombre debe tener al menos 3 caracteres';
      return;
    }
    if (nombre.length > 50) {
      this.erroresMenu['nombre'] = 'El nombre no debe superar los 50 caracteres';
      return;
    }
    if (/^\d+$/.test(nombre)) {
      this.erroresMenu['nombre'] = 'El nombre no puede ser solo números';
      return;
    }
    if (this.contienePalabrasProhibidas(nombre)) {
      this.erroresMenu['nombre'] = 'El nombre contiene lenguaje inapropiado';
      return;
    }

    if (!this.establecimiento?.id) return;

    console.log('Agregando menú:', this.nuevoMenu, 'al establecimiento:', this.establecimiento.id);
    this.gastronomiaService.createMenu(this.establecimiento.id, this.nuevoMenu).pipe(first()).subscribe({
      next: (response) => {
        console.log('Menú creado exitosamente:', response);

        // Agregar el menú localmente
        if (this.establecimiento) {
          if (!this.establecimiento.menus) {
            this.establecimiento.menus = [];
          }
          const nuevoMenuConId: MenuDto = {
            ...this.nuevoMenu,
            id: typeof response === 'number' ? response : response?.id,
            establecimientoId: this.establecimiento.id,
            items: []
          };
          this.establecimiento.menus.push(nuevoMenuConId);
        }

        this.toast.success('Menú agregado exitosamente');
        this.cerrarModalMenu();

        // Recargar para sincronizar
        this.loadEstablecimiento(this.establecimiento!.id!);
      },
      error: (err) => {
        console.error('Error al agregar menú:', err);
        this.toast.error('Error al agregar menú: ' + (err.error?.message || err.message));
      }
    });
  }

  // ========== ITEMS DE MENÚ ==========
  abrirModalItem(menu: MenuDto) {
    this.menuSeleccionado = menu;
    this.nuevoItem = { nombre: '', descripcion: '', precio: 0 };
    this.erroresItem = {};
    this.modalItemAbierto = true;
  }

  cerrarModalItem() {
    this.modalItemAbierto = false;
    this.menuSeleccionado = null;
  }

  agregarItem() {
    this.erroresItem = {};
    const nombre = this.nuevoItem.nombre.trim();
    const desc = this.nuevoItem.descripcion.trim();
    const precio = this.nuevoItem.precio;
    let valido = true;

    if (!nombre) {
      this.erroresItem['nombre'] = 'El nombre del platillo es obligatorio';
      valido = false;
    } else if (nombre.length < 3) {
      this.erroresItem['nombre'] = 'El nombre debe tener al menos 3 caracteres';
      valido = false;
    } else if (nombre.length > 100) {
      this.erroresItem['nombre'] = 'El nombre no debe superar los 100 caracteres';
      valido = false;
    } else if (/^\d+$/.test(nombre)) {
      this.erroresItem['nombre'] = 'El nombre no puede ser solo números';
      valido = false;
    } else if (this.contienePalabrasProhibidas(nombre)) {
      this.erroresItem['nombre'] = 'El nombre contiene lenguaje inapropiado';
      valido = false;
    }

    if (desc && desc.length > 200) {
      this.erroresItem['descripcion'] = 'La descripción no debe superar los 200 caracteres';
      valido = false;
    } else if (desc && this.contienePalabrasProhibidas(desc)) {
      this.erroresItem['descripcion'] = 'La descripción contiene lenguaje inapropiado';
      valido = false;
    }

    if (!precio || precio <= 0) {
      this.erroresItem['precio'] = 'El precio debe ser mayor a $0';
      valido = false;
    } else if (precio < 5) {
      this.erroresItem['precio'] = 'El precio mínimo es de $5 MXN';
      valido = false;
    } else if (precio > 50000) {
      this.erroresItem['precio'] = 'El precio máximo es de $50,000 MXN';
      valido = false;
    } else {
      const precioStr = precio.toString();
      if (precioStr.includes('.') && precioStr.split('.')[1].length > 2) {
        this.erroresItem['precio'] = 'El precio solo puede tener hasta 2 decimales';
        valido = false;
      }
    }

    if (!valido) {
      const primerError = Object.values(this.erroresItem)[0];
      this.toast.error(primerError);
      return;
    }

    if (!this.establecimiento?.id || !this.menuSeleccionado?.id) return;

    console.log('Agregando item:', this.nuevoItem, 'al menú:', this.menuSeleccionado.id, 'del establecimiento:', this.establecimiento.id);
    this.gastronomiaService
      .addMenuItem(this.establecimiento.id, this.menuSeleccionado.id, this.nuevoItem)
      .pipe(first())
      .subscribe({
        next: (response) => {
          console.log('Item creado exitosamente:', response);

          // Agregar el item localmente al menú para mostrarlo inmediatamente
          const nuevoItemConId: MenuItemDto = {
            ...this.nuevoItem,
            id: typeof response === 'number' ? response : response?.id,
            menuId: this.menuSeleccionado!.id
          };

          // Buscar el menú en el establecimiento y agregar el item
          const menuEnEstablecimiento = this.establecimiento?.menus?.find(m => m.id === this.menuSeleccionado?.id);
          if (menuEnEstablecimiento) {
            if (!menuEnEstablecimiento.items) {
              menuEnEstablecimiento.items = [];
            }
            menuEnEstablecimiento.items.push(nuevoItemConId);
            console.log('Item agregado localmente al menú. Total items:', menuEnEstablecimiento.items.length);
          }

          this.toast.success('Item agregado al menú');
          this.cerrarModalItem();

          // Opción 2: Recargar desde el backend para asegurar sincronización
          console.log('Recargando establecimiento con ID:', this.establecimiento!.id);
          this.loadEstablecimiento(this.establecimiento!.id!);
        },
        error: (err) => {
          console.error('Error al agregar item:', err);
          this.toast.error('Error al agregar item: ' + (err.error?.message || err.message));
        }
      });
  }

  // ========== MESAS ==========
  abrirModalMesa() {
    this.nuevaMesa = { numero: this.getNextMesaNumber(), capacidad: 2, disponible: true };
    this.erroresMesa = {};
    this.modalMesaAbierto = true;
  }

  cerrarModalMesa() {
    this.modalMesaAbierto = false;
  }

  agregarMesa() {
    this.erroresMesa = {};
    let valido = true;

    if (!this.nuevaMesa.numero || this.nuevaMesa.numero <= 0) {
      this.erroresMesa['numero'] = 'El número de mesa debe ser mayor a 0';
      valido = false;
    } else if (!Number.isInteger(this.nuevaMesa.numero)) {
      this.erroresMesa['numero'] = 'El número de mesa debe ser entero';
      valido = false;
    } else if (this.nuevaMesa.numero > 200) {
      this.erroresMesa['numero'] = 'El número de mesa no puede superar 200';
      valido = false;
    } else if (this.establecimiento?.mesas?.some(m => m.numero === this.nuevaMesa.numero)) {
      this.erroresMesa['numero'] = `Ya existe una mesa con el número ${this.nuevaMesa.numero}`;
      valido = false;
    }

    if (!this.nuevaMesa.capacidad || this.nuevaMesa.capacidad <= 0) {
      this.erroresMesa['capacidad'] = 'La capacidad debe ser mayor a 0';
      valido = false;
    } else if (!Number.isInteger(this.nuevaMesa.capacidad)) {
      this.erroresMesa['capacidad'] = 'La capacidad debe ser un número entero';
      valido = false;
    } else if (this.nuevaMesa.capacidad > 30) {
      this.erroresMesa['capacidad'] = 'La capacidad máxima por mesa es 30 personas';
      valido = false;
    }

    if (!valido) {
      const primerError = Object.values(this.erroresMesa)[0];
      this.toast.error(primerError);
      return;
    }

    if (!this.establecimiento?.id) return;

    console.log('Agregando mesa:', this.nuevaMesa, 'al establecimiento:', this.establecimiento.id);
    this.gastronomiaService.createMesa(this.establecimiento.id, this.nuevaMesa).pipe(first()).subscribe({
      next: (response) => {
        console.log('Mesa creada exitosamente:', response);

        // Agregar la mesa localmente
        if (this.establecimiento) {
          if (!this.establecimiento.mesas) {
            this.establecimiento.mesas = [];
          }
          const nuevaMesaConId: MesaDto = {
            ...this.nuevaMesa,
            id: typeof response === 'number' ? response : response?.id,
            establecimientoId: this.establecimiento.id
          };
          this.establecimiento.mesas.push(nuevaMesaConId);
        }

        this.toast.success('Mesa agregada exitosamente');
        this.cerrarModalMesa();

        // Recargar para sincronizar
        this.loadEstablecimiento(this.establecimiento!.id!);
      },
      error: (err) => {
        console.error('Error al agregar mesa:', err);
        this.toast.error('Error al agregar mesa: ' + (err.error?.message || err.message));
      }
    });
  }

  toggleDisponibilidadMesa(mesa: MesaDto) {
    if (!this.establecimiento?.id || !mesa.id) return;

    const nuevaDisponibilidad = !mesa.disponible;

    this.gastronomiaService
      .updateDisponibilidadMesa(this.establecimiento.id, mesa.id, nuevaDisponibilidad)
      .pipe(first())
      .subscribe({
        next: () => {
          mesa.disponible = nuevaDisponibilidad;
          this.toast.success(
            nuevaDisponibilidad ? 'Mesa marcada como disponible' : 'Mesa marcada como no disponible'
          );
        },
        error: () => {
          this.toast.error('Error al actualizar disponibilidad');
        }
      });
  }

  private getNextMesaNumber(): number {
    if (!this.establecimiento?.mesas || this.establecimiento.mesas.length === 0) {
      return 1;
    }
    const maxNumero = Math.max(...this.establecimiento.mesas.map(m => m.numero || 0));
    return maxNumero + 1;
  }

  volver() {
    this.router.navigate(['/oferente/gastronomia/establecimientos']);
  }

  contienePalabrasProhibidas(texto: string): boolean {
    const lower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return PALABRAS_PROHIBIDAS.some(p => {
      const regex = new RegExp(`\\b${p}\\b`, 'i');
      return regex.test(lower);
    });
  }
}
