import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { AdminOferentesService, OferenteDto, TipoOferente } from '../../services/admin-oferentes.service';
import { first } from 'rxjs/operators';

interface Oferente {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  establecimientos: number;
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
  tipo: TipoOferente;
}

@Component({
  selector: 'app-admin-oferentes-gastronomia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-oferentes-gastronomia.component.html',
  styleUrl: './admin-oferentes-gastronomia.component.scss'
})
export class AdminOferentesGastronomiaComponent implements OnInit {
  private toastService = inject(ToastService);
  private adminService = inject(AdminOferentesService);

  searchTerm = '';
  oferentes: Oferente[] = [];

  modalDetallesAbierto = false;
  modalRegistroAbierto = false;
  modalEditarAbierto = false;
  seleccionado: Oferente | null = null;

  nuevo: Partial<Oferente> = { 
    nombre: '', 
    correo: '', 
    telefono: '', 
    establecimientos: 0, 
    estado: 'Pendiente',
    tipo: TipoOferente.Gastronomia
  };
  editar: Partial<Oferente> | null = null;

  get filteredOferentes(): Oferente[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.oferentes;
    }

    return this.oferentes.filter((o) =>
      [o.nombre, o.correo, o.telefono, o.estado]
        .some((value) => value?.toLowerCase().includes(term))
    );
  }

  ngOnInit(): void {
    this.loadOferentes();
  }

  private loadOferentes() {
    this.adminService.listGastronomia().pipe(first()).subscribe({
      next: (data) => {
        this.oferentes = (data || []).map((d: OferenteDto) => ({
          id: d.id,
          nombre: d.nombre,
          correo: d.email || '',
          telefono: d.telefono || '',
          establecimientos: d.numeroAlojamientos ?? d.alojamientos ?? 0,
          estado: (d.estado as any) || 'Pendiente',
          tipo: d.tipo ?? TipoOferente.Gastronomia
        }));
      },
      error: (err) => this.toastService.error('Error al cargar oferentes de gastronomía')
    });
  }

  abrirDetalles(o: Oferente) {
    this.seleccionado = o;
    this.modalDetallesAbierto = true;
  }

  cerrarDetalles() {
    this.modalDetallesAbierto = false;
    this.seleccionado = null;
  }

  getTipoTexto(tipo: TipoOferente): string {
    switch (tipo) {
      case TipoOferente.Alojamiento: return 'Alojamiento';
      case TipoOferente.Gastronomia: return 'Gastronomía';
      case TipoOferente.Ambos: return 'Ambos';
      default: return 'Desconocido';
    }
  }

  toggleEstado(o: Oferente) {
    const nuevoEstado = o.estado === 'Activo' ? 'Inactivo' : 'Activo';
    
    this.adminService.cambiarEstado(o.id, nuevoEstado).pipe(first()).subscribe({
      next: () => {
        o.estado = nuevoEstado as any;
        if (nuevoEstado === 'Activo') {
          this.toastService.success(`Oferente ${o.nombre} activado`);
        } else {
          this.toastService.warning(`Oferente ${o.nombre} desactivado`);
        }
        this.loadOferentes();
      },
      error: (err) => {
        this.toastService.error('Error al cambiar estado del oferente');
        console.error('Error toggleEstado:', err);
      }
    });
  }

  abrirRegistro() {
    this.nuevo = { 
      nombre: '', 
      correo: '', 
      telefono: '', 
      establecimientos: 0, 
      estado: 'Pendiente',
      tipo: TipoOferente.Gastronomia
    };
    this.modalRegistroAbierto = true;
  }

  cerrarRegistro() {
    this.modalRegistroAbierto = false;
  }

  registrar(form: NgForm) {
    if (form.invalid) return;
    const payload = {
      email: this.nuevo.correo!,
      nombre: this.nuevo.nombre!,
      telefono: this.nuevo.telefono!,
      tipo: this.nuevo.tipo ?? TipoOferente.Gastronomia
    };
    console.log('📝 Creando oferente con payload:', payload);
    this.adminService.createUsuarioOferente(payload).pipe(first()).subscribe({
      next: (response) => {
        console.log('✅ Oferente creado exitosamente:', response);
        this.toastService.success(`Oferente ${this.nuevo.nombre} registrado exitosamente`);
        this.cerrarRegistro();
        this.loadOferentes();
      },
      error: (err) => {
        console.error('❌ Error al registrar oferente:', err);
        if (err.status === 409) {
          this.toastService.error('El correo electrónico ya está registrado');
        } else {
          this.toastService.error('Error al registrar oferente: ' + (err.error?.message || err.message));
        }
      }
    });
  }

  abrirEditar(o: Oferente) {
    this.editar = { ...o };
    this.modalEditarAbierto = true;
  }

  cerrarEditar() {
    this.modalEditarAbierto = false;
    this.editar = null;
  }

  guardarEditar(form: NgForm) {
    if (form.invalid || !this.editar?.id) return;
    const id = this.editar!.id;
    const payload = { 
      nombre: this.editar!.nombre,
      email: this.editar!.correo,
      telefono: this.editar!.telefono,
      tipo: this.editar!.tipo
    };
    this.adminService.update(id, payload).pipe(first()).subscribe({
      next: () => {
        this.toastService.success(`Oferente ${this.editar!.nombre} actualizado`);
        this.loadOferentes();
        this.cerrarEditar();
      },
      error: (err) => {
        console.error('Error al actualizar oferente:', err);
        this.toastService.error('Error al actualizar oferente');
        this.cerrarEditar();
      }
    });
  }

  cambiarTipo(o: Oferente, nuevoTipo: TipoOferente) {
    this.adminService.cambiarTipo(o.id, nuevoTipo).pipe(first()).subscribe({
      next: () => {
        o.tipo = nuevoTipo;
        this.toastService.success(`Tipo de oferente actualizado a ${this.getTipoTexto(nuevoTipo)}`);
      },
      error: () => this.toastService.error('Error al cambiar tipo de oferente')
    });
  }

  eliminar(o: Oferente) {
    const ok = confirm(`¿Eliminar al oferente "${o.nombre}"?`);
    if (!ok) return;
    this.adminService.delete(o.id).pipe(first()).subscribe({
      next: () => {
        this.oferentes = this.oferentes.filter(x => x.id !== o.id);
        this.toastService.success(`Oferente ${o.nombre} eliminado`);
      },
      error: () => this.toastService.error('Error al eliminar oferente')
    });
  }
}
