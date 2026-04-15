import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { AlojamientoService, AlojamientoDto } from '../../services/alojamiento.service';
import { first } from 'rxjs/operators';
import { MapPickerComponent } from '../../../shared/components/map-picker/map-picker.component';

interface AlojamientoForm {
  nombre: string;
  ubicacion: string;
  latitud: number | null;
  longitud: number | null;
  direccion: string;
  huespedes: number;
  habitaciones: number;
  banos: number;
  precio: number;
  fotos: string[];
  amenidades: string[];
  condicionesUso: string[];
}

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

const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
const MAX_ARCHIVO_MB = 10;

@Component({
  selector: 'app-form-registro-alojamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapPickerComponent],
  templateUrl: './form-registro-alojamiento.component.html',
  styleUrl: './form-registro-alojamiento.component.scss'
})
export class FormRegistroAlojamientoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly alojamientosService = inject(AlojamientoService);

  idEdicion: string | null = null;
  formModel: AlojamientoForm = {
    nombre: '',
    ubicacion: '',
    latitud: null,
    longitud: null,
    direccion: '',
    huespedes: 1,
    habitaciones: 1,
    banos: 1,
    precio: 0,
    fotos: [],
    amenidades: [],
    condicionesUso: []
  };
  nuevaCondicion = '';

  readonly amenidadesDisponibles = [
    'WiFi',
    'Estacionamiento',
    'Alberca',
    'Aire acondicionado',
    'Cocina equipada',
    'TV',
    'Asador',
    'Pet friendly'
  ];
  subiendoFoto = false;
  errores: { [campo: string]: string } = {};

  autocomplete: any;
  busquedaDireccion = '';
  addressToGeocode = '';

  constructor() {
    this.idEdicion = this.route.snapshot.paramMap.get('id');
  }

  ngOnInit(): void {
    // Ya no cargamos Google Maps - usamos campos simples
    if (this.idEdicion) {
      const id = Number.parseInt(this.idEdicion, 10);
      if (id) {
        this.alojamientosService.getById(id).pipe(first()).subscribe({
          next: (a: AlojamientoDto) => {
            this.formModel = {
              nombre: a.nombre,
              ubicacion: a.ubicacion,
              latitud: a.latitud || null,
              longitud: a.longitud || null,
              direccion: a.direccion || a.ubicacion,
              huespedes: a.maxHuespedes,
              habitaciones: a.habitaciones,
              banos: a.banos,
              precio: a.precioPorNoche,
              fotos: [a.fotoPrincipal, ...(a.fotosUrls || [])].filter(Boolean) as string[],
              amenidades: a.amenidades || [],
              condicionesUso: a.condicionesUso || []
            };
            this.busquedaDireccion = a.direccion || a.ubicacion;
          },
          error: () => this.toastService.error('No se pudo cargar el alojamiento')
        });
      }
    }
  }

  get modoTitulo(): string {
    return this.idEdicion ? 'Editar Alojamiento' : 'Agregar Alojamiento';
  }

  onLocationSelected(data: { lat: number; lng: number; address?: string }) {
    this.formModel.latitud = data.lat;
    this.formModel.longitud = data.lng;
    if (data.address) {
      this.formModel.direccion = data.address;
      this.formModel.ubicacion = data.address;
      this.toastService.success(`📍 ${data.address}`);
    } else {
      this.toastService.success('📍 Ubicación marcada en el mapa');
    }
  }

  geocodificarUbicacion(): void {
    const ubicacion = this.formModel.ubicacion.trim();
    if (ubicacion.length >= 5 && !/^\d+$/.test(ubicacion)) {
      this.addressToGeocode = ubicacion;
    }
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.subiendoFoto) return;

    if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
      this.toastService.error('Solo se permiten imágenes (JPG, PNG, WEBP, GIF, BMP)');
      input.value = '';
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_ARCHIVO_MB) {
      this.toastService.error(`La imagen no debe superar ${MAX_ARCHIVO_MB} MB (tamaño actual: ${sizeMb.toFixed(1)} MB)`);
      input.value = '';
      return;
    }

    this.subiendoFoto = true;
    this.alojamientosService.uploadImage(file).pipe(first()).subscribe({
      next: (res) => {
        if (res?.url) {
          this.formModel.fotos.push(res.url);
          this.toastService.success('Imagen subida correctamente');
        } else {
          this.toastService.error('No se recibió URL de la imagen');
        }
        this.subiendoFoto = false;
        input.value = '';
      },
      error: () => {
        this.toastService.error('No se pudo subir la imagen');
        this.subiendoFoto = false;
        input.value = '';
      }
    });
  }

  eliminarFoto(idx: number) {
    this.formModel.fotos.splice(idx, 1);
  }

  toggleAmenidad(amenidad: string, checked: boolean) {
    if (checked) {
      if (!this.formModel.amenidades.includes(amenidad)) {
        this.formModel.amenidades.push(amenidad);
      }
      return;
    }
    this.formModel.amenidades = this.formModel.amenidades.filter(a => a !== amenidad);
  }

  agregarCondicion() {
    const text = this.nuevaCondicion.trim();
    if (!text) return;
    if (text.length < 5) {
      this.toastService.error('La condición debe tener al menos 5 caracteres');
      return;
    }
    if (text.length > 200) {
      this.toastService.error('La condición no debe superar los 200 caracteres');
      return;
    }
    if (this.contienePalabrasProhibidas(text)) {
      this.toastService.error('La condición contiene lenguaje inapropiado');
      return;
    }
    if (this.formModel.condicionesUso.includes(text)) return;
    this.formModel.condicionesUso.push(text);
    this.nuevaCondicion = '';
  }

  eliminarCondicion(index: number) {
    this.formModel.condicionesUso.splice(index, 1);
  }

  onSubmit(form: NgForm) {
    if (form.invalid) return;
    if (!this.validarFormulario()) return;

    // Las coordenadas son opcionales
    if (!this.formModel.latitud || !this.formModel.longitud) {
      console.warn('Sin coordenadas GPS, guardando solo con ubicación de texto');
    }

    const payload: AlojamientoDto = {
      nombre: this.formModel.nombre,
      ubicacion: this.formModel.ubicacion,
      latitud: this.formModel.latitud,
      longitud: this.formModel.longitud,
      direccion: this.formModel.direccion,
      maxHuespedes: this.formModel.huespedes,
      habitaciones: this.formModel.habitaciones,
      banos: this.formModel.banos,
      precioPorNoche: this.formModel.precio,
      fotoPrincipal: this.formModel.fotos[0] || '',
      fotosUrls: this.formModel.fotos.slice(1),
      amenidades: [
        ...this.formModel.amenidades,
        ...this.formModel.condicionesUso
          .map(c => c.trim())
          .filter(Boolean)
          .map(c => `CONDICION::${c}`)
      ]
    };
    const obs = this.idEdicion
      ? this.alojamientosService.update(Number.parseInt(this.idEdicion ?? '0', 10), payload)
      : this.alojamientosService.create(payload);

    obs.pipe(first()).subscribe({
      next: () => {
        const accion = this.idEdicion ? 'actualizado' : 'registrado';
        this.toastService.success(`Alojamiento ${accion} exitosamente`);
        this.router.navigateByUrl('/oferente/hospedajes');
      },
      error: () => this.toastService.error('No se pudo guardar el alojamiento')
    });
  }

  // ── Validaciones ──

  contienePalabrasProhibidas(texto: string): boolean {
    const lower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return PALABRAS_PROHIBIDAS.some(p => {
      const regex = new RegExp(`\\b${p}\\b`, 'i');
      return regex.test(lower);
    });
  }

  validarCampo(campo: string): void {
    delete this.errores[campo];
    switch (campo) {
      case 'nombre':
        this.validarNombre();
        break;
      case 'precio':
        this.validarPrecio();
        break;
      case 'ubicacion':
        this.validarUbicacion();
        break;
      case 'huespedes':
        this.validarHuespedes();
        break;
      case 'habitaciones':
        this.validarHabitaciones();
        break;
      case 'banos':
        this.validarBanos();
        break;
    }
  }

  private validarNombre(): boolean {
    const nombre = this.formModel.nombre.trim();
    if (!nombre) {
      this.errores['nombre'] = 'El nombre del alojamiento es obligatorio';
      return false;
    }
    if (nombre.length < 3) {
      this.errores['nombre'] = 'El nombre debe tener al menos 3 caracteres';
      return false;
    }
    if (nombre.length > 100) {
      this.errores['nombre'] = 'El nombre no debe superar los 100 caracteres';
      return false;
    }
    if (/^\d+$/.test(nombre)) {
      this.errores['nombre'] = 'El nombre no puede ser solo números';
      return false;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-,.'""()]+$/.test(nombre)) {
      this.errores['nombre'] = 'El nombre contiene caracteres no permitidos';
      return false;
    }
    if (this.contienePalabrasProhibidas(nombre)) {
      this.errores['nombre'] = 'El nombre contiene lenguaje inapropiado';
      return false;
    }
    return true;
  }

  private validarPrecio(): boolean {
    const precio = this.formModel.precio;
    if (precio === null || precio === undefined) {
      this.errores['precio'] = 'El precio es obligatorio';
      return false;
    }
    if (precio <= 0) {
      this.errores['precio'] = 'El precio debe ser mayor a $0. Ingresa un precio válido por noche';
      return false;
    }
    if (precio < 50) {
      this.errores['precio'] = 'El precio mínimo por noche es de $50 MXN';
      return false;
    }
    if (precio > 50000) {
      this.errores['precio'] = 'El precio máximo por noche es de $50,000 MXN';
      return false;
    }
    const precioStr = precio.toString();
    if (precioStr.includes('.') && precioStr.split('.')[1].length > 2) {
      this.errores['precio'] = 'El precio solo puede tener hasta 2 decimales';
      return false;
    }
    return true;
  }

  private validarUbicacion(): boolean {
    const ubicacion = this.formModel.ubicacion.trim();
    if (!ubicacion) {
      this.errores['ubicacion'] = 'La ubicación es obligatoria';
      return false;
    }
    if (ubicacion.length < 5) {
      this.errores['ubicacion'] = 'La ubicación debe ser más descriptiva (mínimo 5 caracteres)';
      return false;
    }
    if (ubicacion.length > 200) {
      this.errores['ubicacion'] = 'La ubicación no debe superar los 200 caracteres';
      return false;
    }
    if (/^\d+$/.test(ubicacion)) {
      this.errores['ubicacion'] = 'La ubicación no puede ser solo números';
      return false;
    }
    if (this.contienePalabrasProhibidas(ubicacion)) {
      this.errores['ubicacion'] = 'La ubicación contiene lenguaje inapropiado';
      return false;
    }
    return true;
  }

  private validarHuespedes(): boolean {
    const huespedes = this.formModel.huespedes;
    if (!huespedes || huespedes < 1) {
      this.errores['huespedes'] = 'Debe haber al menos 1 huésped';
      return false;
    }
    if (!Number.isInteger(huespedes)) {
      this.errores['huespedes'] = 'El número de huéspedes debe ser un número entero';
      return false;
    }
    if (huespedes > 50) {
      this.errores['huespedes'] = 'El máximo de huéspedes permitido es 50';
      return false;
    }
    return true;
  }

  private validarHabitaciones(): boolean {
    const habitaciones = this.formModel.habitaciones;
    if (!habitaciones || habitaciones < 1) {
      this.errores['habitaciones'] = 'Debe haber al menos 1 habitación';
      return false;
    }
    if (!Number.isInteger(habitaciones)) {
      this.errores['habitaciones'] = 'El número de habitaciones debe ser un número entero';
      return false;
    }
    if (habitaciones > 30) {
      this.errores['habitaciones'] = 'El máximo de habitaciones permitido es 30';
      return false;
    }
    return true;
  }

  private validarBanos(): boolean {
    const banos = this.formModel.banos;
    if (!banos || banos < 1) {
      this.errores['banos'] = 'Debe haber al menos 1 baño';
      return false;
    }
    if (!Number.isInteger(banos)) {
      this.errores['banos'] = 'El número de baños debe ser un número entero';
      return false;
    }
    if (banos > 20) {
      this.errores['banos'] = 'El máximo de baños permitido es 20';
      return false;
    }
    return true;
  }

  validarFormulario(): boolean {
    this.errores = {};
    const nombreOk = this.validarNombre();
    const precioOk = this.validarPrecio();
    const ubicacionOk = this.validarUbicacion();
    const huespedesOk = this.validarHuespedes();
    const habitacionesOk = this.validarHabitaciones();
    const banosOk = this.validarBanos();

    const todosValidos = nombreOk && precioOk && ubicacionOk && huespedesOk && habitacionesOk && banosOk;

    if (!todosValidos) {
      const primerError = Object.values(this.errores)[0];
      this.toastService.error(primerError || 'Revisa los campos marcados en rojo');
    }

    return todosValidos;
  }
}
