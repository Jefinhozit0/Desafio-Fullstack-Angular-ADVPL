// Model que representa uma Tarefa (tabela ZZG)
export interface Tarefa {
  /** ZZG_CODIGO — Código único gerado automaticamente */
  codigo: string;

  /** ZZG_TITULO — Título da tarefa (máx 50 chars) */
  titulo: string;

  /** ZZG_DESCRI — Descrição completa (Memo) */
  descricao: string;

  /**
   * ZZG_SITUAC — Situação da tarefa
   * '1' = Pendente | '2' = Andamento | '3' = Concluída | '4' = Cancelada
   */
  situacao: '1' | '2' | '3' | '4';

  /** ZZG_USUINC — Usuário que incluiu o registro */
  usuarioInclusao: string;

  /** ZZG_DTINC — Data de inclusão */
  dataInclusao: string; // formato ISO: 'YYYY-MM-DD'

  /** ZZG_DTCONC — Data de conclusão (opcional) */
  dataConclusao?: string; // formato ISO: 'YYYY-MM-DD'

  /** ZZG_RESPON — Responsável/delegado da tarefa (máx 50 chars) */
  responsavel?: string;
}

/** Labels amigáveis para situação da tarefa */
export const SITUACAO_LABELS: Record<string, string> = {
  '1': 'Pendente',
  '2': 'Andamento',
  '3': 'Concluída',
  '4': 'Cancelada',
};

/** Opções para po-select de situação */
export const SITUACAO_OPTIONS = [
  { label: 'Pendente', value: '1' },
  { label: 'Andamento', value: '2' },
  { label: 'Concluída', value: '3' },
  { label: 'Cancelada', value: '4' },
];
