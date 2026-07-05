import { Component } from '@angular/core';

/**
 * AppComponent — Componente raiz da aplicação.
 * Renderiza a barra de navegação (po-toolbar) e o router-outlet.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Gerenciador de Tarefas';
}
