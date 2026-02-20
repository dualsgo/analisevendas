
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * PIPELINE DE AUDITORIA: Detecção de Adicionais (Upsell)
 * 
 * CAMADA 1: Identificação de Retiradas (Já feita no Parser)
 * CAMADA 2: Vínculo Mandatório por CPF (Se houve retirada, a outra nota é Adicional)
 * CAMADA 3: Confirmação por Assinatura de Desconto (10%)
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  // 1. Isolar Retiradas confirmadas (Âncora do atendimento)
  const retiradas = rows.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  
  // 2. Isolar notas candidatas (Vendas Físicas Ativas)
  // Notas de Troca e Ajuste Manual são excluídas do fluxo de Adicional Seguro por compliance
  const candidatos = rows.filter(r => 
    r.tpNF === 1 && 
    r.canal !== "RETIRADA_ONLINE" && 
    !r.is_cancelada && 
    !r.is_troca &&
    !r.tem_suspeita_preco_errado
  );

  // Mapear Pickups por CPF para busca rápida (Janela de 30 minutos para cobrir o atendimento completo)
  const pickupsPorCpf = new Map<string, DetailedSaleRow[]>();
  retiradas.forEach(r => {
    if (r.cpf_cnpj_dest) {
      if (!pickupsPorCpf.has(r.cpf_cnpj_dest)) pickupsPorCpf.set(r.cpf_cnpj_dest, []);
      pickupsPorCpf.get(r.cpf_cnpj_dest)!.push(r);
    }
  });

  // 3. Processar cada nota física para verificar vínculo mandatório
  candidatos.forEach(nota => {
    const cpf = nota.cpf_cnpj_dest;
    if (!cpf) return;

    const pickupsDoCliente = pickupsPorCpf.get(cpf) || [];
    const timeNota = new Date(nota.dhEmi).getTime();
    
    // REGRA DE VÍNCULO OBRIGATÓRIO (CAMADA 2: MESMO CPF + JANELA 30 MIN)
    const pickupVinculada = pickupsDoCliente.find(p => {
      const timePickup = new Date(p.dhEmi).getTime();
      const diffMinutes = Math.abs(timeNota - timePickup) / (1000 * 60);
      return diffMinutes <= 30; // Janela operacional segura
    });

    if (pickupVinculada) {
      nota.chave_retirada_associada = pickupVinculada.chave;
      nota.data_retirada_associada = pickupVinculada.dhEmi;
      
      // Classificação Mandatória: Se houve retirada, esta nota É um esforço adicional
      nota.canal = "RETIRADA_ADICIONAL";
      nota.canal_consolidado = "RETIRADA_ADICIONAL";

      // CAMADA 3: CONFIRMAÇÃO POR ASSINATURA DE DESCONTO (≈10%)
      const perc = parseFloat(nota.percentual_desconto);
      const temDescontoEstrategico = perc >= 0.08 && perc <= 0.12;

      if (temDescontoEstrategico) {
        nota.is_adicional = true;
        nota.is_adicional_suspeito = false;
        nota.tipo_desconto = "ADICIONAL";
        nota.status_auditoria = "ADICIONAL CONFIRMADO (10%)";
        nota.motivo_adicional = "CPF + PICKUP + DESCONTO";
      } else {
        // Vínculo obrigatório mesmo sem o desconto de 10%
        nota.is_adicional = false;
        nota.is_adicional_suspeito = true;
        nota.status_auditoria = "ADICIONAL (SEM DESCONTO PADRÃO)";
        nota.motivo_adicional = "VÍNCULO OBRIGATÓRIO POR CPF";
      }
    }
  });

  // Limpeza de Segurança: Notas com risco operacional (Ajuste Manual) nunca são "limpas" como Adicionais
  rows.forEach(r => {
    if (r.tem_suspeita_preco_errado) {
      r.is_adicional = false;
      r.is_adicional_suspeito = false;
      r.status_auditoria = "RISCO: SUSPEITA DE AJUSTE MANUAL";
      // Se era Adicional, volta para Venda Loja para auditoria de margem
      if (r.canal === "RETIRADA_ADICIONAL") {
        r.canal = "LOJA_FISICA";
        r.canal_consolidado = "VENDA_LOJA";
      }
    }
  });

  return rows;
}

/**
 * Vincula notas de devolução (entrada) com as respectivas notas de troca (saída)
 * Utiliza Referência Fiscal, CPF e Valor para garantir rastreabilidade.
 */
export function vincularTrocas(rows: DetailedSaleRow[]): VinculoTroca[] {
  const entradas = rows.filter(r => r.tpNF === 0 || r.is_devolucao);
  const saidasDeTroca = rows.filter(r => r.tpNF === 1 && r.is_troca && !r.is_cancelada);
  
  const vinculos: VinculoTroca[] = [];
  const saidasVinculadas = new Set<string>();
  const entradasVinculadas = new Set<string>();

  const saidasPorChaveNorm = new Map(saidasDeTroca.map(s => [s.chave.replace(/\D/g, ""), s]));

  // 1. Vínculo por Referência Fiscal (NFref) - Confiança 100%
  entradas.forEach(entrada => {
    const refs = (entrada.refNFe_normalizadas || []);
    for (const ref of refs) {
      const saida = saidasPorChaveNorm.get(ref);
      if (saida && !saidasVinculadas.has(saida.chave)) {
        vinculos.push(criarVinculo(entrada, saida, "Referência Fiscal (NFref)"));
        saidasVinculadas.add(saida.chave);
        entradasVinculadas.add(entrada.chave);
        break;
      }
    }
  });

  // 2. Vínculo por CPF + Valor de Crédito - Confiança 90%
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    const valorEntrada = parseFloat(entrada.vNF).toFixed(2);
    const cpfEntrada = entrada.cpf_cnpj_dest;
    if (cpfEntrada) {
      const match = saidasDeTroca.find(s => !saidasVinculadas.has(s.chave) && s.cpf_cnpj_dest === cpfEntrada && parseFloat(s.vTroca).toFixed(2) === valorEntrada);
      if (match) {
        vinculos.push(criarVinculo(entrada, match, "CPF + Valor de Crédito"));
        saidasVinculadas.add(match.chave);
        entradasVinculadas.add(entrada.chave);
      }
    }
  });

  // 3. Vínculo por Valor de Crédito (Último recurso) - Confiança 70%
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    const valorEntrada = parseFloat(entrada.vNF).toFixed(2);
    const match = saidasDeTroca.find(s => !saidasVinculadas.has(s.chave) && parseFloat(s.vTroca).toFixed(2) === valorEntrada);
    if (match) {
      vinculos.push(criarVinculo(entrada, match, "Valor de Crédito (Sem Identif.)"));
      saidasVinculadas.add(match.chave);
      entradasVinculadas.add(entrada.chave);
    }
  });

  return vinculos;
}

function criarVinculo(entrada: DetailedSaleRow, saida: DetailedSaleRow, metodo: string): VinculoTroca {
  const vEntrada = parseFloat(entrada.vNF);
  const vSaida = parseFloat(saida.vNF);
  const vDiferenca = parseFloat(saida.dif_troca);
  const diffItens = parseInt(saida.itens_qtd) - parseInt(entrada.itens_qtd);

  // Score de Qualidade da Troca (Ri Happy Standard)
  let score = 50;
  if (vDiferenca > 0.1) score += 20; // Upsell financeiro
  if (vDiferenca > 100) score += 15; // Upsell alto valor
  if (vDiferenca < -0.1) score -= 30; // Perda de faturamento (Crédito Gerado)
  if (diffItens > 0) score += 20; // Ganho de PA
  if (diffItens < 0) score -= 20; // Perda de PA
  if (saida.cpf_cnpj_dest) score += 10; // Identificação garantida

  let diag = "Troca Operacional";
  if (score >= 80) diag = "Troca de Ouro (Excelente Upsell/PA)";
  else if (score >= 60) diag = "Troca Qualitativa (Resultado Positivo)";
  else if (score < 40) diag = "Troca de Baixa Eficiência";

  return {
    chave_entrada: entrada.chave,
    chave_saida: saida.chave,
    cpf_cliente: entrada.cpf_cnpj_dest || saida.cpf_cnpj_dest,
    nome_cliente: entrada.nome_dest || saida.nome_dest,
    vendedor: saida.vendedor,
    data_entrada: entrada.dhEmi,
    data_saida: saida.dhEmi,
    itens_devolvidos: parseInt(entrada.itens_qtd),
    itens_trocados: parseInt(saida.itens_qtd),
    diferenca_itens: diffItens,
    valor_devolvido: vEntrada,
    valor_trocado: vSaida,
    valor_credito: parseFloat(saida.vTroca),
    valor_diferenca: vDiferenca,
    metodo_vinculo: metodo,
    confianca: metodo.includes("Fiscal") ? 1.0 : (metodo.includes("CPF") ? 0.9 : 0.7),
    score_qualidade: Math.max(0, Math.min(100, score)),
    diagnostico: diag
  };
}
