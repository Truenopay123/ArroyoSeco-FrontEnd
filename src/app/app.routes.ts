import { Routes } from '@angular/router';
// AdminLoginComponent removed — unified login at /login
import { AdminLayoutComponent } from './alojamiento/components/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './alojamiento/components/admin-dashboard/admin-dashboard.component';
import { AdminOferentesComponent } from './alojamiento/components/admin-oferentes/admin-oferentes.component';
import { AdminNotificacionesComponent } from './alojamiento/components/admin-notificaciones/admin-notificaciones.component';
// OferenteLoginComponent removed — unified login at /login
import { OferenteLayoutComponent } from './alojamiento/components/oferente-layout/oferente-layout.component';
import { OferenteDashboardComponent } from './alojamiento/components/oferente-dashboard/oferente-dashboard.component';
import { GestionHospedajesComponent } from './alojamiento/components/gestion-hospedajes/gestion-hospedajes.component';
import { GestionReservasComponent } from './alojamiento/components/gestion-reservas/gestion-reservas.component';
import { OferenteNotificacionesComponent } from './alojamiento/components/oferente-notificaciones/oferente-notificaciones.component';
import { OferenteConfiguracionComponent } from './alojamiento/components/oferente-configuracion/oferente-configuracion.component';
import { LoginSelectorComponent } from './alojamiento/components/login-selector/login-selector.component';
import { FormRegistroAlojamientoComponent } from './alojamiento/components/form-registro-alojamiento/form-registro-alojamiento.component';
import { OferenteSolicitudComponent } from './alojamiento/components/oferente-solicitud/oferente-solicitud.component';
// ClienteLoginComponent removed — unified login at /login
import { ClienteRegisterComponent } from './alojamiento/components/cliente-register/cliente-register.component';
import { ClienteLayoutComponent } from './alojamiento/components/cliente-layout/cliente-layout.component';
import { ListaAlojamientosComponent } from './alojamiento/components/lista-alojamientos/lista-alojamientos.component';
import { DetalleAlojamientoComponent } from './alojamiento/components/detalle-alojamiento/detalle-alojamiento.component';
import { ClienteReservasComponent } from './alojamiento/components/cliente-reservas/cliente-reservas.component';
import { ClienteNotificacionesComponent } from './alojamiento/components/cliente-notificaciones/cliente-notificaciones.component';
import { ClientePerfilComponent } from './alojamiento/components/cliente-perfil/cliente-perfil.component';
import { ClienteFavoritosComponent } from './alojamiento/components/cliente-favoritos/cliente-favoritos.component';
import { HomeSelectorComponent } from './shared/components/home-selector/home-selector.component';
import { AdminHomeSelectorComponent } from './shared/components/admin-home-selector/admin-home-selector.component';
import { OferenteHomeSelectorComponent } from './shared/components/oferente-home-selector/oferente-home-selector.component';
import { PublicLayoutComponent } from './shared/components/public-layout/public-layout.component';
// Gastronomía imports
import { ClienteLayoutGastronomiaComponent } from './gastronomia/components/cliente-layout-gastronomia/cliente-layout-gastronomia.component';
import { ListaGastronomiaComponent } from './gastronomia/components/lista-gastronomia/lista-gastronomia.component';
import { DetalleGastronomiaComponent } from './gastronomia/components/detalle-gastronomia/detalle-gastronomia.component';
import { ClienteReservasGastronomiaComponent } from './gastronomia/components/cliente-reservas-gastronomia/cliente-reservas-gastronomia.component';
import { OferenteLayoutGastronomiaComponent } from './gastronomia/components/oferente-layout-gastronomia/oferente-layout-gastronomia.component';
import { OferenteDashboardGastronomiaComponent } from './gastronomia/components/oferente-dashboard-gastronomia/oferente-dashboard-gastronomia.component';
import { GestionEstablecimientosComponent } from './gastronomia/components/gestion-establecimientos/gestion-establecimientos.component';
import { FormEstablecimientoComponent } from './gastronomia/components/form-establecimiento/form-establecimiento.component';
import { DetalleEstablecimientoOferenteComponent } from './gastronomia/components/detalle-establecimiento-oferente/detalle-establecimiento-oferente.component';
import { OferenteReservasGastronomiaComponent } from './gastronomia/components/oferente-reservas-gastronomia/oferente-reservas-gastronomia.component';
import { AdminDashboardGastronomiaComponent } from './alojamiento/components/admin-dashboard-gastronomia/admin-dashboard-gastronomia.component';
import { AdminOferentesGastronomiaComponent } from './alojamiento/components/admin-oferentes-gastronomia/admin-oferentes-gastronomia.component';
import { AdminSolicitudesComponent } from './alojamiento/components/admin-solicitudes/admin-solicitudes.component';
import { CheckoutComponent } from './alojamiento/components/checkout/checkout.component';
import { CambiarPasswordForzadoComponent } from './shared/components/cambiar-password-forzado/cambiar-password-forzado.component';
import { ConfirmEmailComponent } from './shared/components/confirm-email/confirm-email.component';
import { ForgotPasswordComponent } from './shared/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './shared/components/reset-password/reset-password.component';
import { cambioPasswordGuard } from './core/guards/cambio-password.guard';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { ForbiddenComponent } from './shared/components/forbidden/forbidden.component';
import { TotpSetupComponent } from './alojamiento/components/totp-setup/totp-setup.component';
import { PagoResultadoComponent } from './alojamiento/components/pago-resultado/pago-resultado.component';
import { AdminResenasComponent } from './alojamiento/components/admin-resenas/admin-resenas.component';
import { AdminEstadisticasComponent } from './alojamiento/components/admin-estadisticas/admin-estadisticas.component';

export const routes: Routes = [
  { path: 'login', component: LoginSelectorComponent },
  { path: 'confirm-email', component: ConfirmEmailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'cambiar-password', component: CambiarPasswordForzadoComponent },
  { path: 'forbidden', component: ForbiddenComponent },

  // Rutas públicas - sin autenticación
  {
    path: 'publica',
    component: PublicLayoutComponent,
    children: [
      {
        path: 'alojamientos',
        component: ListaAlojamientosComponent,
        data: {
          heroTitle: 'Encuentra tu hospedaje ideal',
          heroSubtitle: 'Explora opciones en Arroyo Seco y sus alrededores.',
          heroImage: 'assets/images/RioAyutla3.jpeg'
        }
      },
      {
        path: 'alojamientos/:id',
        component: DetalleAlojamientoComponent,
        data: {
          heroTitle: 'Detalles del alojamiento',
          heroImage: 'assets/images/RioAyutla.jpeg'
        }
      },
      {
        path: 'gastronomia',
        component: ListaGastronomiaComponent,
        data: {
          heroTitle: 'Descubre la gastronomía local',
          heroSubtitle: 'Explora restaurantes en Arroyo Seco.',
          heroImage: 'assets/images/RioAyutla.jpeg'
        }
      },
      {
        path: 'gastronomia/:id',
        component: DetalleGastronomiaComponent,
        data: {
          heroTitle: 'Detalles del restaurante',
          heroImage: 'assets/images/RioAyutla.jpeg'
        }
      },
      { path: '', redirectTo: 'alojamientos', pathMatch: 'full' }
    ]
  },

  {
    path: 'admin',
    children: [
      { path: 'login', redirectTo: '/login', pathMatch: 'full' },
      { path: 'home', component: AdminHomeSelectorComponent, canActivate: [adminGuard, cambioPasswordGuard] },
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [adminGuard, cambioPasswordGuard],
        children: [
          {
            path: 'dashboard',
            component: AdminDashboardComponent,
            data: {
              heroTitle: '¡Bienvenido Administrador!',
              heroSubtitle: 'Gestiona la actividad turística de Arroyo Seco.',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          {
            path: 'oferentes',
            component: AdminOferentesComponent,
            data: {
              heroTitle: '¡Gestión de oferentes!',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          {
            path: 'notificaciones',
            component: AdminNotificacionesComponent,
            data: {
              heroTitle: '¡Gestión de notificaciones!',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          {
            path: 'solicitudes',
            component: AdminSolicitudesComponent,
            data: {
              heroTitle: 'Solicitudes de Oferentes',
              heroSubtitle: 'Revisa y aprueba nuevas solicitudes',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          {
            path: 'resenas',
            component: AdminResenasComponent,
            data: {
              heroTitle: 'Moderación de Reseñas',
              heroSubtitle: 'Revisa y aprueba reseñas de visitantes.',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          {
            path: 'estadisticas',
            component: AdminEstadisticasComponent,
            data: {
              heroTitle: 'Estadísticas Turísticas',
              heroSubtitle: 'Análisis de visitantes y reservas.',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      // Rutas de gastronomía para admin
      {
        path: 'gastronomia',
        component: AdminLayoutComponent,
        canActivate: [adminGuard, cambioPasswordGuard],
        children: [
          {
            path: 'dashboard',
            component: AdminDashboardGastronomiaComponent,
            data: {
              heroTitle: 'Dashboard de Gastronomía',
              heroSubtitle: 'Gestiona restaurantes y reservas.',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          {
            path: 'establecimientos',
            component: AdminOferentesGastronomiaComponent,
            data: {
              heroTitle: 'Gestión de Oferentes de Gastronomía',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          {
            path: 'oferentes',
            component: AdminOferentesGastronomiaComponent,
            data: {
              heroTitle: 'Gestión de Oferentes de Gastronomía',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          {
            path: 'reservas',
            component: AdminNotificacionesComponent,
            data: {
              heroTitle: 'Gestión de Reservas',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          {
            path: 'solicitudes',
            component: AdminSolicitudesComponent,
            data: {
              heroTitle: 'Solicitudes de Oferentes - Gastronomía',
              heroSubtitle: 'Revisa y aprueba nuevas solicitudes de gastronomía',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          {
            path: 'notificaciones',
            component: AdminNotificacionesComponent,
            data: {
              heroTitle: 'Notificaciones - Gastronomía',
              heroSubtitle: 'Gestiona notificaciones del módulo de gastronomía',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      }
    ]
  },
  {
    path: 'oferente',
    children: [
      { path: 'login', redirectTo: '/login', pathMatch: 'full' },
      { path: 'solicitud', component: OferenteSolicitudComponent },
      { path: 'home', component: OferenteHomeSelectorComponent, canActivate: [authGuard, cambioPasswordGuard], data: { roles: ['Oferente'] } },
      {
        path: '',
        component: OferenteLayoutComponent,
        canActivate: [authGuard, cambioPasswordGuard],
        data: { roles: ['Oferente'] },
        children: [
          {
            path: 'dashboard',
            component: OferenteDashboardComponent,
            data: {
              heroTitle: '¡Bienvenido Oferente!',
              heroSubtitle: 'Gestiona tus hospedajes y reservas.',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'hospedajes',
            component: GestionHospedajesComponent,
            data: {
              heroTitle: 'Gestión de hospedajes',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'hospedajes/agregar',
            component: FormRegistroAlojamientoComponent,
            data: {
              heroTitle: 'Agregar alojamiento',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'hospedajes/:id/editar',
            component: FormRegistroAlojamientoComponent,
            data: {
              heroTitle: 'Editar alojamiento',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'hospedajes/:id',
            component: GestionReservasComponent,
            data: {
              heroTitle: 'Reservas del alojamiento',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'reservas',
            component: GestionReservasComponent,
            data: {
              heroTitle: 'Gestión de reservas',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'notificaciones',
            component: OferenteNotificacionesComponent,
            data: {
              heroTitle: 'Notificaciones',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'configuracion',
            component: OferenteConfiguracionComponent,
            data: {
              heroTitle: 'Configuración',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      }
    ]
  },
  {
    path: 'cliente',
    children: [
      { path: 'login', redirectTo: '/login', pathMatch: 'full' },
      { path: 'registrar', component: ClienteRegisterComponent },
      { path: 'home', component: HomeSelectorComponent, canActivate: [authGuard, cambioPasswordGuard], data: { roles: ['Cliente'] } },
      {
        path: '',
        component: ClienteLayoutComponent,
        canActivate: [authGuard, cambioPasswordGuard],
        data: { roles: ['Cliente'] },
        children: [
          {
            path: 'alojamientos',
            component: ListaAlojamientosComponent,
            data: {
              heroTitle: 'Encuentra tu hospedaje ideal',
              heroSubtitle: 'Descubre rincones para descansar entre montañas, ríos y paisajes inolvidables de Arroyo Seco.',
              heroImage: 'assets/images/RioAyutla3.jpeg'
            }
          },
          {
            path: 'alojamientos/:id',
            component: DetalleAlojamientoComponent,
            data: {
              heroTitle: 'Detalles del alojamiento',
              heroImage: 'assets/images/PuenteRio.jpeg'
            }
          },
          {
            path: 'checkout',
            component: CheckoutComponent,
            data: {
              heroTitle: 'Completar Reserva',
              heroSubtitle: 'Revisa y confirma tu reserva.',
              heroImage: 'assets/images/PuenteRio2.jpeg'
            }
          },
          {
            path: 'reservas',
            component: ClienteReservasComponent,
            data: {
              heroTitle: 'Mis Reservas',
              heroSubtitle: 'Sigue tus solicitudes, estancias activas y viajes ya vividos en un solo lugar.',
              heroImage: 'assets/images/RioAyutla7.jpeg'
            }
          },
          {
            path: 'notificaciones',
            component: ClienteNotificacionesComponent,
            data: {
              heroTitle: 'Notificaciones',
              heroSubtitle: 'Mantente al tanto de respuestas, novedades y movimientos importantes de tu cuenta.',
              heroImage: 'assets/images/RioAyutla8.jpeg'
            }
          },
          {
            path: 'perfil',
            component: ClientePerfilComponent,
            data: {
              heroTitle: 'Mi Perfil',
              heroSubtitle: 'Personaliza tu cuenta para viajar con todo listo y guardar tu información importante.',
              heroImage: 'assets/images/PaisajeCabaña.png'
            }
          },
          {
            path: 'favoritos',
            component: ClienteFavoritosComponent,
            data: {
              heroTitle: 'Mis Favoritos',
              heroSubtitle: 'Guarda esos lugares que te hicieron decir “aquí sí me quedo”.',
              heroImage: 'assets/images/ConcaLetras.jpeg'
            }
          },
          {
            path: 'seguridad',
            component: TotpSetupComponent,
            data: {
              heroTitle: 'Seguridad',
              heroSubtitle: 'Protege tu cuenta y mantén seguras tus reservas, datos y accesos.',
              heroImage: 'assets/images/RioAyutla.jpeg'
            }
          },
          {
            path: 'pagos/resultado',
            component: PagoResultadoComponent,
            data: {
              heroTitle: 'Resultado del Pago',
              heroSubtitle: 'Estado de tu pago con Mercado Pago.',
              heroImage: 'assets/images/RioAyutla2.jpeg'
            }
          },
          { path: '', redirectTo: 'alojamientos', pathMatch: 'full' }
        ]
      },
      // Rutas de gastronomía para clientes
      {
        path: 'gastronomia',
        component: ClienteLayoutGastronomiaComponent,
        canActivate: [authGuard, cambioPasswordGuard],
        data: { roles: ['Cliente'] },
        children: [
          {
            path: '',
            component: ListaGastronomiaComponent,
            data: {
              heroTitle: 'Descubre la gastronomía local',
              heroSubtitle: 'Explora sabores regionales, cocinas con identidad y paradas que también forman parte del viaje.',
              heroImage: 'assets/images/RioAyutla3.jpeg'
            }
          },
          {
            path: 'reservas',
            component: ClienteReservasGastronomiaComponent,
            data: {
              heroTitle: 'Mis Reservas de Restaurantes',
              heroSubtitle: 'Consulta tus mesas apartadas, próximas visitas y experiencias gastronómicas guardadas.',
              heroImage: 'assets/images/RioAyutla7.jpeg'
            }
          },
          {
            path: 'notificaciones',
            component: ClienteNotificacionesComponent,
            data: {
              heroTitle: 'Notificaciones',
              heroSubtitle: 'Recibe avisos de tus reservas, cambios y novedades gastronómicas importantes.',
              heroImage: 'assets/images/RioAyutla4.jpeg'
            }
          },
          {
            path: 'perfil',
            component: ClientePerfilComponent,
            data: {
              heroTitle: 'Mi Perfil',
              heroSubtitle: 'Ten tus datos listos para reservar más rápido y disfrutar sin fricción.',
              heroImage: 'assets/images/RioAyutla5.jpeg'
            }
          },
          {
            path: ':id',
            component: DetalleGastronomiaComponent,
            data: {
              heroTitle: 'Detalles del restaurante',
              heroImage: 'assets/images/ConcaLetras.jpeg'
            }
          }
        ]
      }
    ]
  },
  // Rutas de oferente gastronomía
  {
    path: 'oferente/gastronomia',
    component: OferenteLayoutGastronomiaComponent,
    canActivate: [authGuard, cambioPasswordGuard],
    data: { roles: ['Oferente'] },
    children: [
      {
        path: 'dashboard',
        component: OferenteDashboardGastronomiaComponent,
        data: {
          heroTitle: '¡Bienvenido Oferente de Gastronomía!',
          heroSubtitle: 'Gestiona tus restaurantes y reservas.',
          heroImage: 'assets/images/hero-dashboard.svg'
        }
      },
      {
        path: 'establecimientos',
        component: GestionEstablecimientosComponent,
        data: {
          heroTitle: 'Gestión de Restaurantes',
          heroImage: 'assets/images/hero-oferentes.svg'
        }
      },
      {
        path: 'establecimientos/agregar',
        component: FormEstablecimientoComponent,
        data: {
          heroTitle: 'Nuevo Restaurante',
          heroImage: 'assets/images/hero-oferentes.svg'
        }
      },
      {
        path: 'establecimientos/:id/editar',
        component: FormEstablecimientoComponent,
        data: {
          heroTitle: 'Editar Restaurante',
          heroImage: 'assets/images/hero-oferentes.svg'
        }
      },
      {
        path: 'establecimientos/:id',
        component: DetalleEstablecimientoOferenteComponent,
        data: {
          heroTitle: 'Detalle de Restaurante',
          heroImage: 'assets/images/hero-oferentes.svg'
        }
      },
      {
        path: 'reservas',
        component: OferenteReservasGastronomiaComponent,
        data: {
          heroTitle: 'Gestión de Reservas',
          heroImage: 'assets/images/hero-notificaciones.svg'
        }
      },
      {
        path: 'notificaciones',
        component: OferenteNotificacionesComponent,
        data: {
          heroTitle: 'Notificaciones',
          heroImage: 'assets/images/hero-notificaciones.svg'
        }
      },
      {
        path: 'configuracion',
        component: OferenteConfiguracionComponent,
        data: {
          heroTitle: 'Configuración',
          heroImage: 'assets/images/hero-dashboard.svg'
        }
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '', redirectTo: 'publica/alojamientos', pathMatch: 'full' },
  { path: '**', redirectTo: 'publica/alojamientos' }
];
