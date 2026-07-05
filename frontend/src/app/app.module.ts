import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { PoModule } from '@po-ui/ng-components';
import { PoTemplatesModule } from '@po-ui/ng-templates';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TarefasListComponent } from './tarefas/tarefas-list/tarefas-list.component';
import { TarefaFormComponent } from './tarefas/tarefa-form/tarefa-form.component';
import { SubtarefaFormComponent } from './tarefas/subtarefa-form/subtarefa-form.component';

@NgModule({
  declarations: [
    AppComponent,
    TarefasListComponent,
    TarefaFormComponent,
    SubtarefaFormComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    PoModule,
    PoTemplatesModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
