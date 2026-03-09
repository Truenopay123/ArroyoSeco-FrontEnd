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
}

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
    amenidades: []
  };

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
  
  autocomplete: any;
  busquedaDireccion = '';

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
              amenidades: a.amenidades || []
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

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.subiendoFoto) return;

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

  onSubmit(form: NgForm) {
    if (form.invalid) return;
    
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
      amenidades: this.formModel.amenidades
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
}
