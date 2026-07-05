import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TarefasListComponent } from './tarefas/tarefas-list/tarefas-list.component';

const routes: Routes = [
  // Rota padrão → listagem de tarefas
  { path: '', redirectTo: 'tarefas', pathMatch: 'full' },
  { path: 'tarefas', component: TarefasListComponent },
  // Rota fallback para caminhos inválidos
  { path: '**', redirectTo: 'tarefas' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
