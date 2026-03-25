# ArroyoSeco

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.15.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## PWA

La aplicacion incluye una implementacion PWA orientada a cubrir la rubrica de evaluacion:

- Manifest completo en [public/manifest.webmanifest](public/manifest.webmanifest) con nombre, descripcion, theme color, screenshots, shortcuts e iconos any y maskable.
- Service worker registrado desde [src/app/app.config.ts](src/app/app.config.ts) usando Angular Service Worker en produccion.
- Cache de app shell, assets, fuentes externas y contenido publico en [ngsw-config.json](ngsw-config.json).
- Funcionamiento parcial offline para pantallas y recursos previamente visitados, con aviso visual desde [src/app/app.component.ts](src/app/app.component.ts).
- Posibilidad de instalacion mediante beforeinstallprompt, boton de instalacion y metadatos mobile web app en [src/index.html](src/index.html).
- Deteccion de nuevas versiones del service worker con opcion para actualizar la app sin limpiar datos manualmente.

### Como demostrarlo

1. Ejecutar un build de produccion con ng build.
2. Servir la carpeta dist/arroyo-seco/browser desde un servidor estatico.
3. Abrir DevTools y verificar que exista manifest.webmanifest y ngsw-worker.js en Application.
4. Navegar por alojamientos y gastronomia para precargar contenido publico.
5. Desconectar la red y volver a abrir rutas visitadas para comprobar funcionamiento offline parcial.
6. Aceptar el prompt o usar el boton Instalar app para validar instalacion.
