import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GastronomiaService, EstablecimientoDto } from '../../services/gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';
import { MapPickerComponent } from '../../../shared/components/map-picker/map-picker.component';

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
  selector: 'app-form-establecimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapPickerComponent],
  templateUrl: './form-establecimiento.component.html',
  styleUrl: './form-establecimiento.component.scss'
})
export class FormEstablecimientoComponent implements OnInit {
  establecimiento: EstablecimientoDto = {
    nombre: '',
    ubicacion: '',
    descripcion: '',
    fotoPrincipal: ''
  };

  fotos: string[] = [];
  subiendoFoto = false;
  isEdit = false;
  submitting = false;
  errores: { [campo: string]: string } = {};
  addressToGeocode = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gastronomiaService: GastronomiaService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.loadEstablecimiento(Number(id));
    }
  }

  private loadEstablecimiento(id: number) {
    this.gastronomiaService.getById(id).pipe(first()).subscribe({
      next: (data) => {
        this.establecimiento = data;
        this.fotos = [data.fotoPrincipal, ...((data as any).fotosUrls || [])].filter(Boolean) as string[];
      },
      error: () => {
        this.toast.error('Error al cargar establecimiento');
        this.router.navigate(['/oferente/gastronomia/establecimientos']);
      }
    });
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.subiendoFoto) return;

    if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
      this.toast.error('Solo se permiten imágenes (JPG, PNG, WEBP, GIF, BMP)');
      input.value = '';
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_ARCHIVO_MB) {
      this.toast.error(`La imagen no debe superar ${MAX_ARCHIVO_MB} MB (tamaño actual: ${sizeMb.toFixed(1)} MB)`);
      input.value = '';
      return;
    }

    this.subiendoFoto = true;
    this.gastronomiaService.uploadImage(file).pipe(first()).subscribe({
      next: (res: any) => {
        if (res?.url) {
          this.fotos.push(res.url);
          this.toast.success('Imagen subida correctamente');
        } else {
          this.toast.error('No se recibió URL de la imagen');
        }
        this.subiendoFoto = false;
        input.value = '';
      },
      error: () => {
        this.toast.error('No se pudo subir la imagen');
        this.subiendoFoto = false;
        input.value = '';
      }
    });
  }

  eliminarFoto(idx: number) {
    this.fotos.splice(idx, 1);
  }

  submit() {
    if (!this.validarFormulario()) return;

    if (!this.establecimiento.latitud || !this.establecimiento.longitud) {
      console.warn('Sin coordenadas, guardando solo con ubicación de texto');
    }

    this.submitting = true;
    this.establecimiento.fotoPrincipal = this.fotos[0] || '';
    (this.establecimiento as any).fotosUrls = this.fotos.slice(1);

    const request = this.isEdit && this.establecimiento.id
      ? this.gastronomiaService.update(this.establecimiento.id, this.establecimiento)
      : this.gastronomiaService.create(this.establecimiento);

    request.pipe(first()).subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Establecimiento actualizado' : 'Establecimiento creado');
        this.router.navigate(['/oferente/gastronomia/establecimientos']);
      },
      error: () => {
        this.toast.error('Error al guardar');
        this.submitting = false;
      }
    });
  }

  onLocationSelected(data: { lat: number; lng: number; address?: string }) {
    this.establecimiento.latitud = data.lat;
    this.establecimiento.longitud = data.lng;
    if (data.address) {
      this.establecimiento.direccion = data.address;
      this.establecimiento.ubicacion = data.address;
      this.toast.success(`📍 ${data.address}`);
    } else {
      this.toast.success('📍 Ubicación marcada en el mapa');
    }
  }

  geocodificarUbicacion(): void {
    const ubicacion = this.establecimiento.ubicacion.trim();
    if (ubicacion.length >= 5 && !/^\d+$/.test(ubicacion)) {
      this.addressToGeocode = ubicacion;
    }
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
      case 'nombre': this.validarNombre(); break;
      case 'ubicacion': this.validarUbicacion(); break;
      case 'descripcion': this.validarDescripcion(); break;
    }
  }

  private validarNombre(): boolean {
    const nombre = this.establecimiento.nombre.trim();
    if (!nombre) {
      this.errores['nombre'] = 'El nombre del establecimiento es obligatorio';
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

  private validarUbicacion(): boolean {
    const ubicacion = this.establecimiento.ubicacion.trim();
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

  private validarDescripcion(): boolean {
    const desc = this.establecimiento.descripcion.trim();
    if (desc.length > 500) {
      this.errores['descripcion'] = 'La descripción no debe superar los 500 caracteres';
      return false;
    }
    if (desc && desc.length < 10) {
      this.errores['descripcion'] = 'La descripción debe tener al menos 10 caracteres';
      return false;
    }
    if (desc && /^\d+$/.test(desc)) {
      this.errores['descripcion'] = 'La descripción no puede ser solo números';
      return false;
    }
    if (desc && this.contienePalabrasProhibidas(desc)) {
      this.errores['descripcion'] = 'La descripción contiene lenguaje inapropiado';
      return false;
    }
    return true;
  }

  validarFormulario(): boolean {
    this.errores = {};
    const nombreOk = this.validarNombre();
    const ubicacionOk = this.validarUbicacion();
    const descripcionOk = this.validarDescripcion();

    const todosValidos = nombreOk && ubicacionOk && descripcionOk;

    if (!todosValidos) {
      const primerError = Object.values(this.errores)[0];
      this.toast.error(primerError || 'Revisa los campos marcados en rojo');
    }

    return todosValidos;
  }
}
