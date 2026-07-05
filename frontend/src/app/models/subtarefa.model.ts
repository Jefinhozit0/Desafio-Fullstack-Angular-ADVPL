// Model que representa uma SubTarefa (tabela ZZH)
export interface Subtarefa {
  /** ZZH_CODIGO — Código único gerado automaticamente */
  codigo: string;

  /** ZZH_CODTAR — FK para a Tarefa pai (ZZG_CODIGO) */
  codigoTarefa: string;

  /** ZZH_DESCRI — Descrição da subtarefa (máx 50 chars) */
  descricao: string;

  /** ZZH_RESPON — Responsável pela subtarefa (campo livre, máx 50 chars) */
  responsavel: string;

  /**
   * ZZH_STATUS — Status da subtarefa
   * '1' = Pendente | '2' = Andamento | '3' = Concluída | '4' = Cancelada
   */
  status: '1' | '2' | '3' | '4';

  /** ZZH_DTCONC — Data de conclusão (opcional) */
  dataConclusao?: string; // formato ISO: 'YYYY-MM-DD'
}

/** Opções para po-select de status da subtarefa */
export const STATUS_OPTIONS = [
  { label: 'Pendente', value: '1' },
  { label: 'Andamento', value: '2' },
  { label: 'Concluída', value: '3' },
  { label: 'Cancelada', value: '4' },
];

/** Labels amigáveis para status da subtarefa */
export const STATUS_LABELS: Record<string, string> = {
  '1': 'Pendente',
  '2': 'Andamento',
  '3': 'Concluída',
  '4': 'Cancelada',
};
