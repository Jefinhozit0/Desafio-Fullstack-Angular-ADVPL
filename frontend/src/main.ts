import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Bootstrap via NgModule (compatível com o AppModule que importa PoModule, etc.)
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
