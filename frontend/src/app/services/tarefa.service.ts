import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Tarefa } from '../models/tarefa.model';
import { Subtarefa } from '../models/subtarefa.model';

/**
 * Headers padrão para requisições ao Protheus.
 * X-PO-No-Message: suprime o modal de erro automático do PoTemplatesModule.
 * Os erros serão tratados pelas notificações de cada operação no componente.
 */
const HTTP_HEADERS = new HttpHeaders({ 'X-PO-No-Message': 'true' });

/**
 * TarefaService
 * Responsável pela comunicação com o Protheus via API REST (FWRestModel).
 * A URL base aponta para o servidor Protheus configurado.
 * Em ambiente de desenvolvimento sem Protheus, opera inteiramente em memória (Mock CRUD).
 */
@Injectable({
  providedIn: 'root',
})
export class TarefaService {
  /**
   * URL base da API REST do Protheus.
   * Altere para o endereço real do servidor Protheus (ex: http://localhost:8080).
   * O endpoint segue o padrão gerado pelo FWRestModel para a rotina ZZGTAREFA.
   */
  private readonly apiUrl = 'http://localhost:8080/rest/ZZGTAREFA';

  // ──────────────────────────────────────────────────────────────────
  // MEMÓRIA LOCAL (MOCK CRUD FALLBACK)
  // ──────────────────────────────────────────────────────────────────
  private localTarefas: Tarefa[] = [...MOCK_TAREFAS];

  private localSubtarefas: Record<string, Subtarefa[]> = {
    '000001': [
      { codigo: '100001', codigoTarefa: '000001', descricao: 'Configurar dicionário no Protheus', responsavel: 'Lucas Lima', status: '3', dataConclusao: '2026-06-10' },
      { codigo: '100002', codigoTarefa: '000001', descricao: 'Desenvolver rotinas ADVPL MVC', responsavel: 'Jefferson Silva', status: '2' }
    ],
    '000002': [
      { codigo: '200001', codigoTarefa: '000002', descricao: 'Conferir lançamentos contábeis', responsavel: 'Amanda Souza', status: '1' },
      { codigo: '200002', codigoTarefa: '000002', descricao: 'Ajustar saldos pendentes do Q2', responsavel: 'Jefferson Silva', status: '1' }
    ],
    '000003': [
      { codigo: '300001', codigoTarefa: '000003', descricao: 'Elaborar material didático', responsavel: 'Carlos Santos', status: '3', dataConclusao: '2026-06-01' },
      { codigo: '300002', codigoTarefa: '000003', descricao: 'Ministrar aulas de MVC', responsavel: 'Amanda Souza', status: '3', dataConclusao: '2026-06-15' }
    ],
    '000004': [
      { codigo: '400001', codigoTarefa: '000004', descricao: 'Extrair planilhas do sistema antigo', responsavel: 'Lucas Lima', status: '1' },
      { codigo: '400002', codigoTarefa: '000004', descricao: 'Escrever script de carga (.prw)', responsavel: 'Jefferson Silva', status: '2' }
    ],
    '000005': [
      { codigo: '500001', codigoTarefa: '000005', descricao: 'Exportar logs de acessos do SIGACFG', responsavel: 'Carlos Santos', status: '4' }
    ],
    '000006': [
      { codigo: '600001', codigoTarefa: '000006', descricao: 'Modelar contratos de JSON da API', responsavel: 'Amanda Souza', status: '2' },
      { codigo: '600002', codigoTarefa: '000006', descricao: 'Gerar chaves de validação JWT', responsavel: 'Lucas Lima', status: '3', dataConclusao: '2026-06-28' }
    ],
    '000007': [
      { codigo: '700001', codigoTarefa: '000007', descricao: 'Atualizar AppServer para build 2410', responsavel: 'Carlos Santos', status: '1' },
      { codigo: '700002', codigoTarefa: '000007', descricao: 'Testar browse da rotina de Faturamento', responsavel: 'Jefferson Silva', status: '1' }
    ],
    '000008': [
      { codigo: '800001', codigoTarefa: '000008', descricao: 'Mapear itens de estoque (grupo, tipo)', responsavel: 'Amanda Souza', status: '1' },
      { codigo: '800002', codigoTarefa: '000008', descricao: 'Conferir saldo físico de inventário', responsavel: 'Carlos Santos', status: '1' }
    ],
    '000009': [
      { codigo: '900001', codigoTarefa: '000009', descricao: 'Definir regras de alçada de compras', responsavel: 'Carlos Santos', status: '3', dataConclusao: '2026-07-04' },
      { codigo: '900002', codigoTarefa: '000009', descricao: 'Cadastrar aprovadores na tabela SCR', responsavel: 'Lucas Lima', status: '2' }
    ],
    '000010': [
      { codigo: '1000001', codigoTarefa: '000010', descricao: 'Efetuar backup do banco SQL Server', responsavel: 'Lucas Lima', status: '3', dataConclusao: '2026-06-20' },
      { codigo: '1000002', codigoTarefa: '000010', descricao: 'Executar compatibilizador UPDDIF', responsavel: 'Lucas Lima', status: '3', dataConclusao: '2026-06-25' }
    ],
    '000011': [
      { codigo: '1100001', codigoTarefa: '000011', descricao: 'Obter pacotes acumulados de folha GPE', responsavel: 'Jefferson Silva', status: '3', dataConclusao: '2026-07-04' },
      { codigo: '1100002', codigoTarefa: '000011', descricao: 'Configurar novos eventos do eSocial', responsavel: 'Jefferson Silva', status: '1' }
    ],
    '000012': [
      { codigo: '1200001', codigoTarefa: '000012', descricao: 'Habilitar SSL/TLS no AppServer', responsavel: 'Lucas Lima', status: '4' }
    ],
    '000013': [
      { codigo: '1300001', codigoTarefa: '000013', descricao: 'Ajustar webhook de integração de pedidos', responsavel: 'Amanda Souza', status: '3', dataConclusao: '2026-07-05' },
      { codigo: '1300002', codigoTarefa: '000013', descricao: 'Testar emissão de nota de devolução', responsavel: 'Amanda Souza', status: '2' }
    ]
  };

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────
  // TAREFAS
  // ─────────────────────────────────────────────

  /**
   * Lista todas as tarefas, com filtro opcional por título ou descrição.
   * GET /rest/ZZGTAREFA?titulo=...&descricao=...
   */
  listarTarefas(filtro?: { titulo?: string; descricao?: string }): Observable<Tarefa[]> {
    let params = new HttpParams();
    if (filtro?.titulo) params = params.set('titulo', filtro.titulo);
    if (filtro?.descricao) params = params.set('descricao', filtro.descricao);

    return this.http
      .get<{ items: Tarefa[] }>(this.apiUrl, { params, headers: HTTP_HEADERS })
      .pipe(
        map((res) => res.items ?? []),
        // Fallback em memória
        catchError(() => {
          let lista: Tarefa[] = this.localTarefas;
          if (filtro?.titulo) {
            lista = lista.filter((t: Tarefa) =>
              t.titulo.toLowerCase().includes(filtro.titulo!.toLowerCase())
            );
          }
          if (filtro?.descricao) {
            lista = lista.filter((t: Tarefa) =>
              t.descricao.toLowerCase().includes(filtro.descricao!.toLowerCase())
            );
          }
          return of(lista);
        })
      );
  }

  /**
   * Busca uma tarefa pelo código.
   * GET /rest/ZZGTAREFA/:codigo
   */
  buscarTarefa(codigo: string): Observable<Tarefa> {
    return this.http.get<Tarefa>(`${this.apiUrl}/${codigo}`, { headers: HTTP_HEADERS }).pipe(
      catchError(() => {
        const t = this.localTarefas.find((x) => x.codigo === codigo);
        return t ? of(t) : throwError(() => new Error('Tarefa não encontrada.'));
      })
    );
  }

  /**
   * Inclui uma nova tarefa.
   * POST /rest/ZZGTAREFA
   */
  incluirTarefa(tarefa: Partial<Tarefa>): Observable<Tarefa> {
    return this.http.post<Tarefa>(this.apiUrl, tarefa, { headers: HTTP_HEADERS }).pipe(
      catchError(() => {
        const maxCodigo = this.localTarefas.reduce(
          (max, t) => Math.max(max, parseInt(t.codigo, 10)),
          0
        );
        const novoCodigo = String(maxCodigo + 1).padStart(6, '0');
        const novaTarefa: Tarefa = {
          codigo: novoCodigo,
          titulo: tarefa.titulo || '',
          descricao: tarefa.descricao || '',
          situacao: tarefa.situacao || '1',
          usuarioInclusao: tarefa.usuarioInclusao || 'admin',
          dataInclusao: tarefa.dataInclusao || new Date().toISOString().substring(0, 10),
          dataConclusao: tarefa.dataConclusao,
          responsavel: tarefa.responsavel || '',
        };
        this.localTarefas.push(novaTarefa);
        return of(novaTarefa);
      })
    );
  }

  /**
   * Altera uma tarefa existente.
   * PUT /rest/ZZGTAREFA/:codigo
   */
  alterarTarefa(codigo: string, tarefa: Partial<Tarefa>): Observable<Tarefa> {
    return this.http.put<Tarefa>(`${this.apiUrl}/${codigo}`, tarefa, { headers: HTTP_HEADERS }).pipe(
      catchError(() => {
        const idx = this.localTarefas.findIndex((x) => x.codigo === codigo);
        if (idx !== -1) {
          this.localTarefas[idx] = { ...this.localTarefas[idx], ...tarefa };
          return of(this.localTarefas[idx]);
        }
        return throwError(() => new Error('Tarefa não encontrada para alteração.'));
      })
    );
  }

  /**
   * Exclui uma tarefa pelo código.
   * DELETE /rest/ZZGTAREFA/:codigo
   */
  excluirTarefa(codigo: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${codigo}`, { headers: HTTP_HEADERS }).pipe(
      catchError(() => {
        this.localTarefas = this.localTarefas.filter((x) => x.codigo !== codigo);
        delete this.localSubtarefas[codigo];
        return of(undefined);
      })
    );
  }

  // ─────────────────────────────────────────────
  // SUBTAREFAS
  // ─────────────────────────────────────────────

  /**
   * Lista subtarefas de uma tarefa.
   * GET /rest/ZZGTAREFA/:codigoTarefa/subtarefas
   */
  listarSubtarefas(codigoTarefa: string): Observable<Subtarefa[]> {
    return this.http
      .get<{ items: Subtarefa[] }>(`${this.apiUrl}/${codigoTarefa}/subtarefas`, { headers: HTTP_HEADERS })
      .pipe(
        map((res) => res.items ?? []),
        catchError(() => {
          return of(this.localSubtarefas[codigoTarefa] ?? []);
        })
      );
  }

  /**
   * Inclui uma subtarefa em uma tarefa.
   * POST /rest/ZZGTAREFA/:codigoTarefa/subtarefas
   */
  incluirSubtarefa(codigoTarefa: string, subtarefa: Partial<Subtarefa>): Observable<Subtarefa> {
    return this.http
      .post<Subtarefa>(`${this.apiUrl}/${codigoTarefa}/subtarefas`, subtarefa, { headers: HTTP_HEADERS })
      .pipe(
        catchError(() => {
          if (!this.localSubtarefas[codigoTarefa]) {
            this.localSubtarefas[codigoTarefa] = [];
          }
          const maxCodigo = this.localSubtarefas[codigoTarefa].reduce(
            (max, s) => Math.max(max, parseInt(s.codigo, 10)),
            0
          );
          const novoCodigo = String(maxCodigo + 1).padStart(6, '0');
          const novaSub: Subtarefa = {
            codigo: novoCodigo,
            codigoTarefa: codigoTarefa,
            descricao: subtarefa.descricao || '',
            responsavel: subtarefa.responsavel || '',
            status: subtarefa.status || '1',
            dataConclusao: subtarefa.dataConclusao,
          };
          this.localSubtarefas[codigoTarefa].push(novaSub);
          this.atualizarSituacaoTarefaLocal(codigoTarefa);
          return of(novaSub);
        })
      );
  }

  /**
   * Altera uma subtarefa existente.
   * PUT /rest/ZZGTAREFA/:codigoTarefa/subtarefas/:codigo
   */
  alterarSubtarefa(
    codigoTarefa: string,
    codigo: string,
    subtarefa: Partial<Subtarefa>
  ): Observable<Subtarefa> {
    return this.http
      .put<Subtarefa>(`${this.apiUrl}/${codigoTarefa}/subtarefas/${codigo}`, subtarefa, {
        headers: HTTP_HEADERS,
      })
      .pipe(
        catchError(() => {
          const subs = this.localSubtarefas[codigoTarefa] ?? [];
          const idx = subs.findIndex((x) => x.codigo === codigo);
          if (idx !== -1) {
            subs[idx] = { ...subs[idx], ...subtarefa };
            this.atualizarSituacaoTarefaLocal(codigoTarefa);
            return of(subs[idx]);
          }
          return throwError(() => new Error('Subtarefa não encontrada.'));
        })
      );
  }

  /**
   * Exclui uma subtarefa.
   * DELETE /rest/ZZGTAREFA/:codigoTarefa/subtarefas/:codigo
   */
  excluirSubtarefa(codigoTarefa: string, codigo: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${codigoTarefa}/subtarefas/${codigo}`, { headers: HTTP_HEADERS })
      .pipe(
        catchError(() => {
          if (this.localSubtarefas[codigoTarefa]) {
            this.localSubtarefas[codigoTarefa] = this.localSubtarefas[codigoTarefa].filter(
              (x) => x.codigo !== codigo
            );
            this.atualizarSituacaoTarefaLocal(codigoTarefa);
          }
          return of(undefined);
        })
      );
  }

  /**
   * Validação local em caso de falha do Protheus:
   * "Se todas as Subtarefas forem Concluídas -> Alterar a Situação da Tarefa para Concluída"
   */
  private atualizarSituacaoTarefaLocal(codigoTarefa: string): void {
    const subs = this.localSubtarefas[codigoTarefa] ?? [];
    if (subs.length > 0 && subs.every((s) => s.status === '3')) {
      const idx = this.localTarefas.findIndex((x) => x.codigo === codigoTarefa);
      if (idx !== -1) {
        this.localTarefas[idx].situacao = '3';
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════
//  DADOS MOCK INICIAIS
// ══════════════════════════════════════════════════════════════════
const MOCK_TAREFAS: Tarefa[] = [
  {
    codigo: '000001',
    titulo: 'Implementar módulo de estoque',
    descricao: 'Desenvolver as rotinas de entrada e saída de estoque no Protheus, incluindo ajuste de inventário e relatórios gerenciais.',
    situacao: '2',
    usuarioInclusao: 'admin',
    dataInclusao: '2026-06-01',
    dataConclusao: '2026-07-30',
    responsavel: 'Lucas Lima',
  },
  {
    codigo: '000002',
    titulo: 'Revisar relatório financeiro Q2',
    descricao: 'Conferir os lançamentos contábeis do segundo trimestre e validar os saldos com o contador responsável.',
    situacao: '1',
    usuarioInclusao: 'financeiro',
    dataInclusao: '2026-06-10',
    responsavel: 'Jefferson Silva',
  },
  {
    codigo: '000003',
    titulo: 'Treinamento equipe TOTVS Protheus',
    descricao: 'Capacitar a equipe de TI no uso das rotinas MVC, FWModel e geração de relatórios customizados no Protheus 12.',
    situacao: '3',
    usuarioInclusao: 'rh',
    dataInclusao: '2026-05-15',
    dataConclusao: '2026-06-15',
    responsavel: 'Amanda Souza',
  },
  {
    codigo: '000004',
    titulo: 'Migração de dados legados',
    descricao: 'Importar os dados do sistema legado para o Protheus utilizando scripts de carga via planilha e rotinas ADVPL.',
    situacao: '1',
    usuarioInclusao: 'admin',
    dataInclusao: '2026-06-20',
    responsavel: 'Lucas Lima',
  },
  {
    codigo: '000005',
    titulo: 'Auditoria de segurança do sistema',
    descricao: 'Realizar auditoria nos perfis de acesso e permissões dos usuários no SIGACFG, removendo acessos desnecessários.',
    situacao: '4',
    usuarioInclusao: 'seguranca',
    dataInclusao: '2026-05-01',
    responsavel: 'Carlos Santos',
  },
  {
    codigo: '000006',
    titulo: 'Integração API REST com parceiros',
    descricao: 'Desenvolver endpoints REST via FWRestModel para integração com o sistema do parceiro comercial. Incluir autenticação JWT.',
    situacao: '2',
    usuarioInclusao: 'dev',
    dataInclusao: '2026-06-25',
    dataConclusao: '2026-08-15',
    responsavel: 'Amanda Souza',
  },
  {
    codigo: '000007',
    titulo: 'Homologação ambiente de produção',
    descricao: 'Validar o ambiente de produção após atualização do Protheus para a versão 12.1.2410, testando as principais rotinas.',
    situacao: '1',
    usuarioInclusao: 'infra',
    dataInclusao: '2026-07-01',
    responsavel: 'Jefferson Silva',
  },
  {
    codigo: '000008',
    titulo: 'Ajustar parametrização do Bloco K',
    descricao: 'Configurar os parâmetros de controle de estoque e de produção para a correta geração do Bloco K no Sped Fiscal.',
    situacao: '1',
    usuarioInclusao: 'fiscal',
    dataInclusao: '2026-07-02',
    responsavel: 'Amanda Souza',
  },
  {
    codigo: '000009',
    titulo: 'Configurar fluxo de aprovação de compras',
    descricao: 'Criar regras de alçada e aprovação por níveis no módulo SIGACOM para pedidos acima de R$ 50.000.',
    situacao: '2',
    usuarioInclusao: 'compras',
    dataInclusao: '2026-07-03',
    responsavel: 'Carlos Santos',
  },
  {
    codigo: '000010',
    titulo: 'Upgrade dicionário de dados (UPDDIF)',
    descricao: 'Executar compatibilizador de dicionário UPDDIF no ambiente de homologação para nova release do Protheus.',
    situacao: '3',
    usuarioInclusao: 'admin',
    dataInclusao: '2026-06-20',
    dataConclusao: '2026-06-25',
    responsavel: 'Lucas Lima',
  },
  {
    codigo: '000011',
    titulo: 'Instalar patches de eSocial',
    descricao: 'Aplicar pacotes acumulados da Folha de Pagamento (SIGAGPE) referentes às novas tabelas de carga do eSocial.',
    situacao: '1',
    usuarioInclusao: 'dp',
    dataInclusao: '2026-07-04',
    responsavel: 'Jefferson Silva',
  },
  {
    codigo: '000012',
    titulo: 'Revisar segurança da API REST',
    descricao: 'Verificar vulnerabilidades nos endpoints rest e configurar rate-limiting para proteger o AppServer contra ataques.',
    situacao: '4',
    usuarioInclusao: 'seguranca',
    dataInclusao: '2026-06-15',
    responsavel: 'Lucas Lima',
  },
  {
    codigo: '000013',
    titulo: 'Sincronização com e-commerce (SIGAFLG)',
    descricao: 'Ajustar rotina de integração de pedidos web no módulo de faturamento para evitar duplicidade de notas fiscais.',
    situacao: '2',
    usuarioInclusao: 'ti',
    dataInclusao: '2026-07-05',
    responsavel: 'Amanda Souza',
  },
];
