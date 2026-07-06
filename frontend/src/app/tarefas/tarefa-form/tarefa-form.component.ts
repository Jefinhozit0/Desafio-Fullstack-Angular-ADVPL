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
import { SITUACAO_LABELS, SITUACAO_OPTIONS, Tarefa } from '../../models/tarefa.model';
import { Subtarefa } from '../../models/subtarefa.model';
import { TarefaService } from '../../services/tarefa.service';
import {
  PoNotificationService,
  PoTableColumn,
  PoTableAction,
  PoModalComponent,
  PoModalAction,
  PoTableColumnSpacing,
} from '@po-ui/ng-components';

/**
 * TarefaFormComponent
 * Modal para inclusão e edição de tarefas, incluindo grid de subtarefas inline.
 * Comunica-se com o Protheus via TarefaService.
 */
@Component({
  selector: 'app-tarefa-form',
  templateUrl: './tarefa-form.component.html',
  styleUrls: ['./tarefa-form.component.css'],
})
export class TarefaFormComponent implements OnChanges {
  /** Tarefa a ser editada; null = modo inclusão */
  @Input() tarefaEdicao: Tarefa | null = null;

  /** Quando true, abre o modal */
  @Input() isOpen = false;

  /** Emite quando o modal é fechado (true = houve salvar) */
  @Output() fechar = new EventEmitter<boolean>();

  @ViewChild('modalTarefaRef') modalRef!: PoModalComponent;
  @ViewChild('modalExcluirSubtarefaRef') modalExcluirSubRef!: PoModalComponent;

  readonly situacaoOptions = SITUACAO_OPTIONS;
  readonly tableSpacing = PoTableColumnSpacing.Small;

  /** Literais customizadas para o po-table de subtarefas */
  readonly literaisSubtarefas = { noData: 'Nenhuma subtarefa cadastrada.' };

  form!: FormGroup;
  isLoading = false;

  // Subtarefas
  subtarefas: Subtarefa[] = [];
  isLoadingSubtarefas = false;
  subtarefaEmEdicao: Subtarefa | null = null;
  modalSubtarefaAberta = false;
  codigoSubtarefaExcluir: string | null = null;

  /** Colunas da tabela de subtarefas */
  colunasSubtarefas: PoTableColumn[] = [
    { property: 'descricao', label: 'Descrição', width: '35%' },
    { property: 'responsavel', label: 'Responsável', width: '25%' },
    {
      property: 'status',
      label: 'Status',
      width: '20%',
      type: 'label',
      labels: [
        { value: '1', label: 'Pendente', color: 'color-07' },
        { value: '2', label: 'Andamento', color: 'color-08' },
        { value: '3', label: 'Concluída', color: 'color-10' },
        { value: '4', label: 'Cancelada', color: 'color-06' },
      ],
    },
    { property: 'dataConclusao', label: 'Data Conclusão', type: 'date', width: '20%' },
  ];

  /** Ações disponíveis por linha da tabela de subtarefas */
  acoesSubtarefas: PoTableAction[] = [
    {
      label: 'Editar',
      action: (row: Subtarefa) => this.abrirEdicaoSubtarefa(row),
      icon: 'po-icon-edit',
    },
    {
      label: 'Excluir',
      action: (row: Subtarefa) => this.confirmarExclusaoSubtarefa(row.codigo),
      icon: 'po-icon-delete',
      type: 'danger',
    },
  ];

  get modoEdicao(): boolean {
    return !!this.tarefaEdicao;
  }

  get tituloModal(): string {
    return this.modoEdicao ? 'Editar Tarefa' : 'Nova Tarefa';
  }

  get codigoExibicao(): string {
    return this.tarefaEdicao?.codigo ?? 'Novo registro';
  }

  get statusAtual(): string {
    return this.form?.get('situacao')?.value ?? this.tarefaEdicao?.situacao ?? '1';
  }

  get statusAtualLabel(): string {
    return SITUACAO_LABELS[this.statusAtual] ?? 'Pendente';
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

  get subtarefasConcluidas(): number {
    return this.subtarefas.filter((subtarefa) => subtarefa.status === '3').length;
  }

  get percentualSubtarefas(): number {
    if (!this.subtarefas.length) {
      return 0;
    }

    return Math.round((this.subtarefasConcluidas / this.subtarefas.length) * 100);
  }

  get primaryAction(): PoModalAction {
    return {
      label: 'Salvar',
      loading: this.isLoading,
      action: () => this.salvar(),
    };
  }

  get secondaryAction(): PoModalAction {
    return { label: 'Cancelar', action: () => this.cancelar() };
  }

  get acaoConfirmarExclusaoSubtarefa(): PoModalAction {
    return {
      label: 'Excluir',
      danger: true,
      action: () => this.executarExclusaoSubtarefa(),
    };
  }

  get acaoCancelarExclusaoSubtarefa(): PoModalAction {
    return {
      label: 'Cancelar',
      action: () => this.modalExcluirSubRef?.close(),
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
        if (this.modoEdicao) {
          this.carregarSubtarefas();
        } else {
          this.subtarefas = [];
        }
        setTimeout(() => this.modalRef?.open(), 0);
      } else {
        this.modalRef?.close();
      }
    }
  }

  // ─────────────────────────────────────────────
  // FORM
  // ─────────────────────────────────────────────

  private criarForm(): void {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(50)]],
      descricao: ['', Validators.required],
      situacao: ['1', Validators.required],
      dataInclusao: [this.dataHoje(), Validators.required],
      dataConclusao: [null],
      responsavel: ['', [Validators.required, Validators.maxLength(50)]],
    });
  }

  private inicializarForm(): void {
    if (this.tarefaEdicao) {
      this.form.patchValue({
        titulo: this.tarefaEdicao.titulo,
        descricao: this.tarefaEdicao.descricao,
        situacao: this.tarefaEdicao.situacao,
        dataInclusao: this.tarefaEdicao.dataInclusao,
        dataConclusao: this.tarefaEdicao.dataConclusao ?? null,
        responsavel: this.tarefaEdicao.responsavel ?? '',
      });
    } else {
      this.form.reset({
        situacao: '1',
        dataInclusao: this.dataHoje(),
        responsavel: '',
      });
    }
  }

  private dataHoje(): string {
    return new Date().toISOString().substring(0, 10);
  }

  // ─────────────────────────────────────────────
  // TAREFA
  // ─────────────────────────────────────────────

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dados = this.form.value as Partial<Tarefa>;

    // Validação: data de conclusão não pode ser menor que data de inclusão
    if (dados.dataConclusao && dados.dataInclusao && dados.dataConclusao < dados.dataInclusao) {
      this.notification.error('Data de Conclusão não pode ser menor que a Data de Inclusão.');
      return;
    }

    this.isLoading = true;

    const operacao$ = this.modoEdicao
      ? this.tarefaService.alterarTarefa(this.tarefaEdicao!.codigo, dados)
      : this.tarefaService.incluirTarefa(dados);

    operacao$.subscribe({
      next: () => {
        const msg = this.modoEdicao
          ? 'Tarefa alterada com sucesso!'
          : 'Tarefa incluída com sucesso!';
        this.notification.success(msg);
        this.isLoading = false;
        this.modalRef?.close();
        this.fechar.emit(true);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erro ao salvar tarefa.';
        this.notification.error(msg);
        this.isLoading = false;
      },
    });
  }

  cancelar(): void {
    this.modalRef?.close();
    this.fechar.emit(false);
  }

  // ─────────────────────────────────────────────
  // SUBTAREFAS
  // ─────────────────────────────────────────────

  private carregarSubtarefas(): void {
    if (!this.tarefaEdicao) return;
    this.isLoadingSubtarefas = true;
    this.tarefaService.listarSubtarefas(this.tarefaEdicao.codigo).subscribe({
      next: (lista) => {
        this.subtarefas = lista;
        this.isLoadingSubtarefas = false;
      },
      error: () => {
        this.notification.error('Erro ao carregar subtarefas.');
        this.isLoadingSubtarefas = false;
      },
    });
  }

  abrirNovaSubtarefa(): void {
    this.subtarefaEmEdicao = null;
    this.modalSubtarefaAberta = true;
  }

  abrirEdicaoSubtarefa(subtarefa: Subtarefa): void {
    this.subtarefaEmEdicao = subtarefa;
    this.modalSubtarefaAberta = true;
  }

  confirmarExclusaoSubtarefa(codigo: string): void {
    this.codigoSubtarefaExcluir = codigo;
    setTimeout(() => this.modalExcluirSubRef?.open(), 0);
  }

  executarExclusaoSubtarefa(): void {
    if (!this.codigoSubtarefaExcluir || !this.tarefaEdicao) return;
    this.tarefaService
      .excluirSubtarefa(this.tarefaEdicao.codigo, this.codigoSubtarefaExcluir)
      .subscribe({
        next: () => {
          this.notification.success('Subtarefa excluída com sucesso!');
          this.modalExcluirSubRef?.close();
          this.carregarSubtarefas();
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Erro ao excluir subtarefa.';
          this.notification.error(msg);
          this.modalExcluirSubRef?.close();
        },
      });
  }

  onSubtarefaFechada(houveSalvar: boolean): void {
    this.modalSubtarefaAberta = false;
    if (houveSalvar) {
      this.carregarSubtarefas();
    }
  }
}
