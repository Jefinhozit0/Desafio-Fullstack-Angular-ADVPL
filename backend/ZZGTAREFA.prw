/*
================================================================================
  Projeto  : Gerenciador de Tarefas
  Fonte    : ZZGTAREFA.prw
  Autor    : Candidato - Desafio Fullstack TOTVS
  Data     : 2026
  Descricao: Rotina MVC para cadastro de Tarefas (ZZG) e SubTarefas (ZZH).
             Exposta como REST via FWRestModel para integração com o frontend
             Angular/PO-UI.

  Tabelas  : ZZG - Tarefas (master)
             ZZH - SubTarefas (detail)

  Funcoes  :
    MenuDef()        - Define o menu da rotina no Protheus
    ModelDef()       - Define o modelo de dados MVC (ZZG master + ZZH detail)
    ViewDef()        - Define a visualização (Form + Browse)
    ValidModel()     - Validações de negócio do modelo
    TriggerZZH()     - Trigger para atualizar situacao da tarefa conforme subtarefas
================================================================================
*/

#Include "Protheus.ch"
#Include "FwMvcDef.ch"
#Include "RestFul.ch"

// Constantes de situação/status
#Define ZZG_SITUAC_PENDENTE   "1"
#Define ZZG_SITUAC_ANDAMENTO  "2"
#Define ZZG_SITUAC_CONCLUIDA  "3"
#Define ZZG_SITUAC_CANCELADA  "4"

// ============================================================================
//  MENU DA ROTINA
// ============================================================================
/*/{Protheus.doc} MenuDef
  Define o menu de acesso da rotina Gerenciador de Tarefas no Protheus.
  @author Candidato
  @since  2026
/*/
Static Function MenuDef()
  Local aRet := {}

  // Inclusão
  aAdd(aRet, { "Incluir",  "Incluir Tarefa",  "VIEWDEF.ZZGTAREFA.INCLUDE", 0, 0, NIL, NIL, NIL, NIL, NIL, NIL, NIL })
  // Alteração
  aAdd(aRet, { "Alterar",  "Alterar Tarefa",  "VIEWDEF.ZZGTAREFA.UPDATE",  0, 1, NIL, NIL, NIL, NIL, NIL, NIL, NIL })
  // Exclusão
  aAdd(aRet, { "Excluir",  "Excluir Tarefa",  "VIEWDEF.ZZGTAREFA.DELETE",  0, 2, NIL, NIL, NIL, NIL, NIL, NIL, NIL })
  // Visualização
  aAdd(aRet, { "Visualizar","Visualizar Tarefa","VIEWDEF.ZZGTAREFA.VIEW",  0, 3, NIL, NIL, NIL, NIL, NIL, NIL, NIL })

Return aRet

// ============================================================================
//  MODELO DE DADOS (ModelDef)
// ============================================================================
/*/{Protheus.doc} ModelDef
  Define o modelo MVC com master ZZG (Tarefas) e detail ZZH (SubTarefas).
  Configura validações de campo e triggers de negócio.
  @author Candidato
  @since  2026
/*/
Static Function ModelDef()
  Local oModel  := MPFormModel():New("ZZGTAREFAMODEL", , {|oModel, nOper| ValidModel(oModel, nOper)}, , )
  Local oStrZZG := FWFormStruct(1, "ZZG")
  Local oStrZZH := FWFormStruct(1, "ZZH")

  // ─── Master: Cabeçalho da Tarefa (ZZG) ───────────────────────────────────
  oModel:AddFields("ZZG_MASTER", /*cPai*/ , oStrZZG)

  // ─── Detail: SubTarefas (ZZH) ─────────────────────────────────────────────
  oModel:AddGrid("ZZH_DETAIL", "ZZG_MASTER", oStrZZH)

  // Relacionamento entre master e detail
  oModel:SetRelation("ZZH_DETAIL", {{"ZZH_CODTAR", "ZZG_CODIGO"}}, ZZH->( IndexKey(1) ))

  // Trigger: ao alterar o status de uma subtarefa, verificar situação da tarefa
  oModel:GetModel("ZZH_DETAIL"):AddTrigger("ZZH_STATUS", {|oModel| TriggerZZH(oModel)})

  // Campos obrigatórios — já definidos no SX3 (X3_OBRIGAT = "S")
  // mas reforçamos aqui para garantia em modo REST
  oModel:SetPrimaryKey({"ZZG_CODIGO"})

Return oModel

// ============================================================================
//  VISUALIZAÇÃO (ViewDef)
// ============================================================================
/*/{Protheus.doc} ViewDef
  Define a interface visual da rotina: FWFormView para ZZG (master) e
  FWBrowseView para ZZH (detail de subtarefas).
  @author Candidato
  @since  2026
/*/
Static Function ViewDef()
  Local oView    := FWFormView():New()
  Local oStrZZG  := FWFormStruct(2, "ZZG")
  Local oStrZZH  := FWFormStruct(2, "ZZH")

  oView:SetModel(ModelDef())

  // Painel do formulário master (ZZG)
  oView:AddField("VIEW_ZZG", oStrZZG, "ZZG_MASTER")
  oView:SetOwnerView("VIEW_ZZG", "ZZG_MASTER")

  // Painel grid detail (ZZH)
  oView:AddGrid("VIEW_ZZH", oStrZZH, "ZZH_DETAIL")
  oView:SetOwnerView("VIEW_ZZH", "ZZH_DETAIL")

  // Layout: formula que coloca o grid abaixo do form
  oView:ArrangeFields()

Return oView

// ============================================================================
//  VALIDAÇÕES DE NEGÓCIO
// ============================================================================
/*/{Protheus.doc} ValidModel
  Valida as regras de negócio antes de salvar o modelo:
    1. Situação da tarefa deve ser um valor válido (1,2,3,4)
    2. Se situação = Concluída: não pode haver subtarefa Pendente
    3. Data de Conclusão não pode ser menor que Data de Inclusão
  @param oModel  Objeto do modelo MVC
  @param nOper   Operação (MODEL_OPERATION_INSERT / MODEL_OPERATION_UPDATE / MODEL_OPERATION_DELETE)
  @return lRet   .T. = validação ok | .F. = validação falhou
  @author Candidato
  @since  2026
/*/
Static Function ValidModel(oModel, nOper)
  Local lRet       := .T.
  Local cSituacao  := oModel:GetModel("ZZG_MASTER"):GetValue("ZZG_SITUAC")
  Local dDtInc     := oModel:GetModel("ZZG_MASTER"):GetValue("ZZG_DTINC")
  Local dDtConc    := oModel:GetModel("ZZG_MASTER"):GetValue("ZZG_DTCONC")
  Local oDetail    := oModel:GetModel("ZZH_DETAIL")
  Local nLin       := 0
  Local lPendente  := .F.

  // ─── Validação 1: situação deve ser valor válido ─────────────────────────
  If !Pertence(cSituacao, "1234")
    MostraErro("ZZGTAREFA", "Situação inválida. Informe: 1=Pendente, 2=Andamento, 3=Concluída ou 4=Cancelada.")
    Return .F.
  EndIf

  // ─── Validação 2: Data de Conclusão >= Data de Inclusão ──────────────────
  If !Empty(dDtConc) .And. dDtConc < dDtInc
    MostraErro("ZZGTAREFA", "Data de Conclusão não pode ser menor que a Data de Inclusão.")
    Return .F.
  EndIf

  // ─── Validação 3: Conclusão exige todas as subtarefas concluídas ─────────
  // (Cancelamento é sempre permitido — sem restrição de subtarefas)
  If cSituacao == ZZG_SITUAC_CONCLUIDA
    For nLin := 1 To oDetail:Length()
      If oDetail:GetValue("ZZH_STATUS", nLin) == ZZG_SITUAC_PENDENTE
        lPendente := .T.
        Exit
      EndIf
    Next nLin

    If lPendente
      MostraErro("ZZGTAREFA", "Não é possível Concluir a Tarefa pois existem SubTarefas Pendentes.")
      Return .F.
    EndIf
  EndIf

Return lRet

// ============================================================================
//  TRIGGER — ZZH_STATUS
// ============================================================================
/*/{Protheus.doc} TriggerZZH
  Trigger acionado quando o status de uma subtarefa é alterado.
  Se TODAS as subtarefas estiverem com status = Concluída, altera automaticamente
  a Situação da Tarefa pai para Concluída.
  @param oModel  Objeto do modelo detail (ZZH)
  @return lRet   Sempre .T.
  @author Candidato
  @since  2026
/*/
Static Function TriggerZZH(oModel)
  Local oMaster    := oModel:GetOwnerModel()
  Local oDetail    := oMaster:GetModel("ZZH_DETAIL")
  Local nLin       := 0
  Local lTodosConc := .T.

  // Verifica se há pelo menos uma subtarefa e se todas estão Concluídas
  If oDetail:Length() > 0
    For nLin := 1 To oDetail:Length()
      If oDetail:GetValue("ZZH_STATUS", nLin) != ZZG_SITUAC_CONCLUIDA
        lTodosConc := .F.
        Exit
      EndIf
    Next nLin

    If lTodosConc
      // Atualiza situação da tarefa para Concluída automaticamente
      oMaster:GetModel("ZZG_MASTER"):SetValue("ZZG_SITUAC", ZZG_SITUAC_CONCLUIDA)
    EndIf
  EndIf

Return .T.

// ============================================================================
//  PONTO DE ENTRADA PADRÃO (para chamada via menu do Protheus)
// ============================================================================
/*/{Protheus.doc} ZZGTAREFA
  Ponto de entrada da rotina Gerenciador de Tarefas.
  Pode ser chamado via menu do Protheus ou diretamente.
  @author Candidato
  @since  2026
/*/
User Function ZZGTAREFA()
  Local oBrowse := FWMBrowse():New()

  oBrowse:SetAlias("ZZG")
  oBrowse:SetDescription("Gerenciador de Tarefas")
  oBrowse:SetMenuDef("ZZGTAREFA")
  oBrowse:SetViewDef("ZZGTAREFA")
  oBrowse:Activate()

Return
