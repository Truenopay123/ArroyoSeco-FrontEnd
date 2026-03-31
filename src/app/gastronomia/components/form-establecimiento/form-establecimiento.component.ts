import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GastronomiaService, EstablecimientoDto } from '../../services/gastronomia.service';
import { ToastService } from '../../../shared/services/toast.service';
import { first } from 'rxjs/operators';
import { MapPickerComponent } from '../../../shared/components/map-picker/map-picker.component';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gastronomiaService: GastronomiaService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Ya no cargamos Google Maps - usamos campos simples
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
    if (!this.establecimiento.nombre || !this.establecimiento.ubicacion) {
      this.toast.error('Completa los campos obligatorios');
      return;
    }

    // Las coordenadas son opcionales ahora
    if (!this.establecimiento.latitud || !this.establecimiento.longitud) {
      console.warn('Sin coordenadas, guardando solo con ubicación de texto');
    }

    this.submitting = true;
    // Map fotos array to fotoPrincipal + fotosUrls
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
}
