import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import {
  PoTableColumn,
  PoTableAction,
  PoNotificationService,
  PoModalAction,
  PoPageAction,
  PoSelectOption,
  PoModalComponent,
} from '@po-ui/ng-components';
import { Tarefa, SITUACAO_OPTIONS } from '../../models/tarefa.model';
import { TarefaService } from '../../services/tarefa.service';

/**
 * TarefasListComponent — Tela principal de browse de tarefas.
 * Exibe cards de resumo por situação, filtros e tabela com CRUD completo.
 */
@Component({
  selector: 'app-tarefas-list',
  templateUrl: './tarefas-list.component.html',
  styleUrls: ['./tarefas-list.component.css'],
})
export class TarefasListComponent implements OnInit {
  @ViewChild('modalExcluirRef') modalExcluirRef!: PoModalComponent;

  tarefas: Tarefa[] = [];
  isLoading = false;

  /** Contagem de tarefas por situação — alimenta os cards de resumo */
  contagem = { pendente: 0, andamento: 0, concluida: 0, cancelada: 0 };

  // Filtros
  filtroTitulo = '';
  filtroDescricao = '';
  filtroSituacao = '';
  readonly situacaoOptions: PoSelectOption[] = [
    { label: 'Todas', value: '' },
    ...SITUACAO_OPTIONS,
  ];

  // Literais para po-table
  readonly literais = {
    noData: 'Nenhuma tarefa encontrada. Clique em "Nova Tarefa" para começar.',
  };

  // Modal Tarefa
  tarefaEmEdicao: Tarefa | null = null;
  modalTarefaAberta = false;

  // Modal de exclusão
  codigoTarefaExcluir: string | null = null;

  /** Colunas da tabela de tarefas */
  colunas: PoTableColumn[] = [
    { property: 'codigo', label: 'Código', width: '8%' },
    { property: 'titulo', label: 'Título', width: '25%' },
    { property: 'responsavel', label: 'Responsável', width: '15%' },
    { property: 'descricao', label: 'Descrição', width: '22%' },
    {
      property: 'situacao',
      label: 'Situação',
      width: '15%',
      type: 'label',
      labels: [
        { value: '1', label: 'Pendente',  color: 'color-07', icon: 'po-icon-clock'    },
        { value: '2', label: 'Andamento', color: 'color-08', icon: 'po-icon-settings' },
        { value: '3', label: 'Concluída', color: 'color-10', icon: 'po-icon-ok'       },
        { value: '4', label: 'Cancelada', color: 'color-06', icon: 'po-icon-close'    },
      ],
    },
    { property: 'dataInclusao', label: 'Data Inclusão', type: 'date', width: '15%' },
  ];

  /** Ações por linha da tabela */
  acoes: PoTableAction[] = [
    { label: 'Editar',  action: (row: Tarefa) => this.abrirEdicao(row),            icon: 'po-icon-edit'   },
    { label: 'Excluir', action: (row: Tarefa) => this.confirmarExclusao(row.codigo), icon: 'po-icon-delete', type: 'danger' },
  ];

  /** Ações da página (botão Nova Tarefa no header) */
  acoespagina: PoPageAction[] = [
    { label: 'Nova Tarefa', icon: 'po-icon-plus', action: () => this.abrirInclusao() },
  ];

  get acaoConfirmarExclusao(): PoModalAction {
    return { label: 'Excluir', danger: true, action: () => this.executarExclusao() };
  }

  get acaoCancelarExclusao(): PoModalAction {
    return { label: 'Cancelar', action: () => this.modalExcluirRef?.close() };
  }

  // Altura dinâmica da tabela
  tabelaHeight = 400;

  constructor(
    private tarefaService: TarefaService,
    private notification: PoNotificationService
  ) {}

  ngOnInit(): void {
    this.carregarTarefas();
    this.calcularAlturaTabela();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.calcularAlturaTabela();
  }

  private calcularAlturaTabela(): void {
    // Calcula espaço disponível para a tabela tirando header, cards e filtros.
    // Espaço real aproximado é de 580px. Mantém o mínimo de 200px.
    const alturaDisponivel = window.innerHeight - 580;
    this.tabelaHeight = Math.max(200, alturaDisponivel);
  }

  // ─────────────────────────────────────────────
  // Carregamento e filtros
  // ─────────────────────────────────────────────

  carregarTarefas(): void {
    this.isLoading = true;
    const filtro = {
      titulo: this.filtroTitulo || undefined,
      descricao: this.filtroDescricao || undefined,
    };

    this.tarefaService.listarTarefas(filtro).subscribe({
      next: (lista) => {
        // Aplica filtro de situação no cliente
        this.tarefas = this.filtroSituacao
          ? lista.filter((t) => t.situacao === this.filtroSituacao)
          : lista;
        // Atualiza contagem dos cards de resumo (sempre com lista completa sem filtro)
        this.atualizarContagem(lista);
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Erro ao carregar tarefas.');
        this.isLoading = false;
      },
    });
  }

  /** Atualiza os contadores dos cards de resumo */
  private atualizarContagem(lista: Tarefa[]): void {
    this.contagem = {
      pendente:  lista.filter((t) => t.situacao === '1').length,
      andamento: lista.filter((t) => t.situacao === '2').length,
      concluida: lista.filter((t) => t.situacao === '3').length,
      cancelada: lista.filter((t) => t.situacao === '4').length,
    };
  }

  /** Clique em um card de resumo → filtra a tabela por aquela situação */
  filtrarPorSituacao(situacao: string): void {
    // Toggle: se já está filtrado pelo mesmo, limpa o filtro
    this.filtroSituacao = this.filtroSituacao === situacao ? '' : situacao;
    this.carregarTarefas();
  }

  pesquisar(): void {
    this.carregarTarefas();
  }

  limparFiltros(): void {
    this.filtroTitulo   = '';
    this.filtroDescricao = '';
    this.filtroSituacao  = '';
    this.carregarTarefas();
  }

  // ─────────────────────────────────────────────
  // CRUD de Tarefas
  // ─────────────────────────────────────────────

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
    if (!this.codigoTarefaExcluir) return;
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
    if (houveSalvar) this.carregarTarefas();
  }

  /**
   * Captura clique em qualquer local da tabela de tarefas.
   * Se for clicado em uma linha de dados (td), abre a tela de edição.
   */
  onTableClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const tr = target.closest('tr');
    if (!tr) return;

    // Ignora cabeçalhos, botões de ação e modais/popups
    if (tr.parentElement?.tagName === 'THEAD') return;
    if (target.closest('.po-table-column-actions') || target.closest('.po-popup') || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }

    // Calcula o índice do item correspondente na lista de tarefas exibida
    // tr.rowIndex - 1 já que a tabela possui 1 linha de cabeçalho no thead
    const index = tr.rowIndex - 1;
    if (index >= 0 && index < this.tarefas.length) {
      this.abrirEdicao(this.tarefas[index]);
    }
  }
}
