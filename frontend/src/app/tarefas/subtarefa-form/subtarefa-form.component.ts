import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { STATUS_LABELS, STATUS_OPTIONS, Subtarefa } from '../../models/subtarefa.model';
import { TarefaService } from '../../services/tarefa.service';
import { PoNotificationService, PoModalComponent, PoModalAction } from '@po-ui/ng-components';

/**
 * SubtarefaFormComponent
 * Modal para inclusão e edição de subtarefas vinculadas a uma tarefa.
 */
@Component({
  selector: 'app-subtarefa-form',
  templateUrl: './subtarefa-form.component.html',
  styleUrls: ['./subtarefa-form.component.css'],
})
export class SubtarefaFormComponent implements OnChanges {
  /** Código da tarefa pai — obrigatório para vincular a subtarefa */
  @Input() codigoTarefa!: string;

  /** Subtarefa a ser editada; null = modo inclusão */
  @Input() subtarefaEdicao: Subtarefa | null = null;

  /** Controla visibilidade do modal — quando true, abre o modal */
  @Input() isOpen = false;

  /** Emite quando o modal é fechado (true = houve salvar) */
  @Output() fechar = new EventEmitter<boolean>();

  @ViewChild('modalSubtarefaRef') modalRef!: PoModalComponent;

  readonly statusOptions = STATUS_OPTIONS;

  form!: FormGroup;
  isLoading = false;

  get modoEdicao(): boolean {
    return !!this.subtarefaEdicao;
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Subtarefa' : 'Nova Subtarefa';
  }

  get codigoExibicao(): string {
    return this.subtarefaEdicao?.codigo ?? 'Novo registro';
  }

  get statusAtual(): string {
    return this.form?.get('status')?.value ?? this.subtarefaEdicao?.status ?? '1';
  }

  get statusAtualLabel(): string {
    return STATUS_LABELS[this.statusAtual] ?? 'Pendente';
  }

  get statusAtualClasse(): string {
    const classes: Record<string, string> = {
      '1': 'task-status--warning',
      '2': 'task-status--info',
      '3': 'task-status--success',
      '4': 'task-status--neutral',
    };

    return classes[this.statusAtual] ?? classes['1'];
  }

  get primaryAction(): PoModalAction {
    return {
      label: 'Salvar',
      loading: this.isLoading,
      action: () => this.salvar(),
    };
  }

  get secondaryAction(): PoModalAction {
    return {
      label: 'Cancelar',
      action: () => this.cancelar(),
    };
  }

  constructor(
    private fb: FormBuilder,
    private tarefaService: TarefaService,
    private notification: PoNotificationService
  ) {
    this.criarForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.inicializarForm();
        // Adia a abertura para garantir que o ViewChild esteja disponível
        setTimeout(() => this.modalRef?.open(), 0);
      } else {
        this.modalRef?.close();
      }
    }
  }

  /** Cria a estrutura do formulário com validações */
  private criarForm(): void {
    this.form = this.fb.group({
      descricao: ['', [Validators.required, Validators.maxLength(50)]],
      responsavel: ['', [Validators.required, Validators.maxLength(50)]],
      status: ['1', Validators.required],
      dataConclusao: [null],
    });
  }

  /** Preenche o form com dados da subtarefa em edição ou reseta para inclusão */
  private inicializarForm(): void {
    if (this.subtarefaEdicao) {
      this.form.patchValue({
        descricao: this.subtarefaEdicao.descricao,
        responsavel: this.subtarefaEdicao.responsavel,
        status: this.subtarefaEdicao.status,
        dataConclusao: this.subtarefaEdicao.dataConclusao ?? null,
      });
    } else {
      this.form.reset({ status: '1' });
    }
  }

  /** Salva a subtarefa via API e fecha o modal */
  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const dados = this.form.value as Partial<Subtarefa>;

    const operacao$ = this.modoEdicao
      ? this.tarefaService.alterarSubtarefa(this.codigoTarefa, this.subtarefaEdicao!.codigo, dados)
      : this.tarefaService.incluirSubtarefa(this.codigoTarefa, dados);

    operacao$.subscribe({
      next: () => {
        const msg = this.modoEdicao
          ? 'Subtarefa alterada com sucesso!'
          : 'Subtarefa incluída com sucesso!';
        this.notification.success(msg);
        this.isLoading = false;
        this.modalRef?.close();
        this.fechar.emit(true);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erro ao salvar subtarefa.';
        this.notification.error(msg);
        this.isLoading = false;
      },
    });
  }

  /** Fecha o modal sem salvar */
  cancelar(): void {
    this.modalRef?.close();
    this.fechar.emit(false);
  }
}
