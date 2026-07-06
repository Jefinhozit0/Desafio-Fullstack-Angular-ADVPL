import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import {
  PoModalAction,
  PoModalComponent,
  PoNotificationService,
  PoPageAction,
  PoSelectOption,
  PoTableAction,
  PoTableColumn,
  PoTableColumnSpacing,
} from '@po-ui/ng-components';
import { SITUACAO_OPTIONS, Tarefa } from '../../models/tarefa.model';
import { TarefaService } from '../../services/tarefa.service';

type SituacaoTarefa = Tarefa['situacao'];
type ContagemKey = 'pendente' | 'andamento' | 'concluida' | 'cancelada';
type StatusTone = 'pending' | 'progress' | 'success' | 'canceled';

interface StatusCard {
  situacao: SituacaoTarefa;
  key: ContagemKey;
  label: string;
  description: string;
  icon: string;
  tone: StatusTone;
}

@Component({
  selector: 'app-tarefas-list',
  templateUrl: './tarefas-list.component.html',
  styleUrls: ['./tarefas-list.component.css'],
})
export class TarefasListComponent implements OnInit, AfterViewInit {
  @ViewChild('modalExcluirRef') modalExcluirRef!: PoModalComponent;
  @ViewChild('tableFrameRef') tableFrameRef?: ElementRef<HTMLElement>;

  tarefas: Tarefa[] = [];
  isLoading = false;
  tabelaHeight = 420;

  contagem: Record<ContagemKey, number> = {
    pendente: 0,
    andamento: 0,
    concluida: 0,
    cancelada: 0,
  };

  filtroTitulo = '';
  filtroDescricao = '';
  readonly todasSituacoesValue = '__TODAS__';
  filtroSituacao = this.todasSituacoesValue;

  readonly statusCards: StatusCard[] = [
    {
      situacao: '1',
      key: 'pendente',
      label: 'Pendentes',
      description: 'Aguardando início',
      icon: 'po-icon-clock',
      tone: 'pending',
    },
    {
      situacao: '2',
      key: 'andamento',
      label: 'Em andamento',
      description: 'Em execução',
      icon: 'po-icon-settings',
      tone: 'progress',
    },
    {
      situacao: '3',
      key: 'concluida',
      label: 'Concluídas',
      description: 'Finalizadas',
      icon: 'po-icon-ok',
      tone: 'success',
    },
    {
      situacao: '4',
      key: 'cancelada',
      label: 'Canceladas',
      description: 'Fora do fluxo',
      icon: 'po-icon-close',
      tone: 'canceled',
    },
  ];

  readonly situacaoOptions: PoSelectOption[] = [
    { label: 'Todas', value: this.todasSituacoesValue },
    ...SITUACAO_OPTIONS,
  ];

  readonly literais = {
    noData: 'Nenhuma tarefa encontrada.',
  };
  readonly tableSpacing = PoTableColumnSpacing.Small;

  tarefaEmEdicao: Tarefa | null = null;
  modalTarefaAberta = false;
  codigoTarefaExcluir: string | null = null;

  readonly colunas: PoTableColumn[] = [
    { property: 'codigo', label: 'Código', width: '96px' },
    { property: 'titulo', label: 'Título', width: '240px' },
    { property: 'responsavel', label: 'Responsável', width: '180px' },
    { property: 'descricao', label: 'Descrição', width: '320px' },
    {
      property: 'situacao',
      label: 'Situação',
      width: '160px',
      type: 'label',
      labels: [
        { value: '1', label: 'Pendente', color: 'color-07', icon: 'po-icon-clock' },
        { value: '2', label: 'Andamento', color: 'color-08', icon: 'po-icon-settings' },
        { value: '3', label: 'Concluída', color: 'color-10', icon: 'po-icon-ok' },
        { value: '4', label: 'Cancelada', color: 'color-06', icon: 'po-icon-close' },
      ],
    },
    {
      property: 'dataInclusao',
      label: 'Inclusão',
      type: 'date',
      format: 'dd/MM/yyyy',
      width: '128px',
    },
  ];

  readonly acoes: PoTableAction[] = [
    {
      label: 'Editar',
      action: (row: Tarefa) => this.abrirEdicao(row),
      icon: 'po-icon-edit',
    },
    {
      label: 'Excluir',
      action: (row: Tarefa) => this.confirmarExclusao(row.codigo),
      icon: 'po-icon-delete',
      type: 'danger',
    },
  ];

  readonly acoesPagina: PoPageAction[] = [
    { label: 'Nova Tarefa', icon: 'po-icon-plus', action: () => this.abrirInclusao() },
    { label: 'Atualizar', icon: 'po-icon-refresh', action: () => this.carregarTarefas() },
  ];

  constructor(
    private tarefaService: TarefaService,
    private notification: PoNotificationService
  ) {}

  ngOnInit(): void {
    this.carregarTarefas();
    this.calcularAlturaTabela();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.calcularAlturaTabela(), 0);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calcularAlturaTabela();
  }

  get totalTarefas(): number {
    return (
      this.contagem.pendente +
      this.contagem.andamento +
      this.contagem.concluida +
      this.contagem.cancelada
    );
  }

  get totalFiltrado(): number {
    return this.tarefas.length;
  }

  get possuiFiltros(): boolean {
    return !!(this.filtroTitulo || this.filtroDescricao || this.situacaoFiltrada);
  }

  get filtroSituacaoLabel(): string {
    return this.situacaoOptions.find((option) => option.value === this.filtroSituacao)?.label ?? 'Todas';
  }

  get resumoFiltros(): string {
    if (!this.possuiFiltros) {
      return 'Todos os registros';
    }

    const filtros = [
      this.filtroTitulo && 'título',
      this.filtroDescricao && 'descrição',
      this.situacaoFiltrada && 'situação',
    ].filter(Boolean);

    return `${filtros.length} filtro(s) aplicado(s)`;
  }

  get acaoConfirmarExclusao(): PoModalAction {
    return { label: 'Excluir', danger: true, action: () => this.executarExclusao() };
  }

  get acaoCancelarExclusao(): PoModalAction {
    return { label: 'Cancelar', action: () => this.modalExcluirRef?.close() };
  }

  carregarTarefas(): void {
    this.isLoading = true;
    const filtro = {
      titulo: this.filtroTitulo || undefined,
      descricao: this.filtroDescricao || undefined,
    };

    this.tarefaService.listarTarefas(filtro).subscribe({
      next: (lista) => {
        const situacao = this.situacaoFiltrada;
        this.tarefas = situacao
          ? lista.filter((tarefa) => tarefa.situacao === situacao)
          : lista;

        this.atualizarContagem(lista);
        this.isLoading = false;
        setTimeout(() => this.calcularAlturaTabela(), 0);
      },
      error: () => {
        this.notification.error('Erro ao carregar tarefas.');
        this.isLoading = false;
      },
    });
  }

  contagemPorChave(chave: ContagemKey): number {
    return this.contagem[chave];
  }

  percentualSituacao(chave: ContagemKey): number {
    if (!this.totalTarefas) {
      return 0;
    }

    return Math.round((this.contagem[chave] / this.totalTarefas) * 100);
  }

  statusCardSelecionado(situacao: SituacaoTarefa): boolean {
    return this.situacaoFiltrada === situacao;
  }

  statusClasses(card: StatusCard): Record<string, boolean> {
    return {
      [`status-widget--${card.tone}`]: true,
      'status-widget--active': this.statusCardSelecionado(card.situacao),
    };
  }

  filtrarPorSituacao(situacao: SituacaoTarefa): void {
    this.filtroSituacao = this.situacaoFiltrada === situacao ? this.todasSituacoesValue : situacao;
  }

  alterarSituacaoFiltro(valor: string): void {
    this.filtroSituacao = valor || this.todasSituacoesValue;
  }

  pesquisar(): void {
    this.carregarTarefas();
  }

  limparFiltros(): void {
    this.filtroTitulo = '';
    this.filtroDescricao = '';
    this.filtroSituacao = this.todasSituacoesValue;
  }

  abrirInclusao(): void {
    this.tarefaEmEdicao = null;
    this.modalTarefaAberta = true;
  }

  abrirEdicao(tarefa: Tarefa): void {
    this.tarefaEmEdicao = tarefa;
    this.modalTarefaAberta = true;
  }

  confirmarExclusao(codigo: string): void {
    this.codigoTarefaExcluir = codigo;
    setTimeout(() => this.modalExcluirRef?.open(), 0);
  }

  executarExclusao(): void {
    if (!this.codigoTarefaExcluir) {
      return;
    }

    this.tarefaService.excluirTarefa(this.codigoTarefaExcluir).subscribe({
      next: () => {
        this.notification.success('Tarefa excluída com sucesso!');
        this.modalExcluirRef?.close();
        this.carregarTarefas();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Erro ao excluir tarefa.';
        this.notification.error(msg);
        this.modalExcluirRef?.close();
      },
    });
  }

  onTarefaFormFechado(houveSalvar: boolean): void {
    this.modalTarefaAberta = false;

    if (houveSalvar) {
      this.carregarTarefas();
    }
  }

  onTableClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const tr = target.closest('tr');

    if (!tr || tr.parentElement?.tagName === 'THEAD') {
      return;
    }

    if (
      target.closest('.po-table-column-actions') ||
      target.closest('.po-popup') ||
      target.tagName === 'BUTTON' ||
      target.closest('button')
    ) {
      return;
    }

    const index = tr.rowIndex - 1;
    if (index >= 0 && index < this.tarefas.length) {
      this.abrirEdicao(this.tarefas[index]);
    }
  }

  private atualizarContagem(lista: Tarefa[]): void {
    this.contagem = {
      pendente: lista.filter((tarefa) => tarefa.situacao === '1').length,
      andamento: lista.filter((tarefa) => tarefa.situacao === '2').length,
      concluida: lista.filter((tarefa) => tarefa.situacao === '3').length,
      cancelada: lista.filter((tarefa) => tarefa.situacao === '4').length,
    };
  }

  private get situacaoFiltrada(): SituacaoTarefa | '' {
    return this.filtroSituacao === this.todasSituacoesValue ? '' : (this.filtroSituacao as SituacaoTarefa);
  }

  private calcularAlturaTabela(): void {
    const tableTop = this.tableFrameRef?.nativeElement.getBoundingClientRect().top ?? 0;
    const isMobile = window.innerWidth < 768;
    const bottomGap = isMobile ? 16 : 28;
    const minHeight = isMobile ? 320 : 440;
    const availableHeight = window.innerHeight - tableTop - bottomGap;

    this.tabelaHeight = Math.max(minHeight, Math.floor(availableHeight));
  }
}
