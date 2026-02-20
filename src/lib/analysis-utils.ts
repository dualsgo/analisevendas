
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * ETAPA 2: Classificar Adicional (VÍNCULO DETERMINÍSTICO POR JANELA DE ATENDIMENTO)
 * Regra: CPF + Janela de Tempo (10min se vendedor bater, 3min se faltar)
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  // 1. Isolar Retiradas confirmadas
  const retiradas = rows.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  
  // 2. Isolar notas candidatas (Vendas Físicas Ativas)
  const candidatos = rows.filter(r => r.tpNF === 1 && r.canal !== "RETIRADA_ONLINE" && !r.is_cancelada && !r.is_troca);

  // Mapear Pickups por CPF para busca rápida
  const pickupsPorCpf = new Map<string, DetailedSaleRow[]>();
  retiradas.forEach(r => {
    if (r.cpf_cnpj_dest) {
      if (!pickupsPorCpf.has(r.cpf_cnpj_dest)) pickupsPorCpf.set(r.cpf_cnpj_dest, []);
      pickupsPorCpf.get(r.cpf_cnpj_dest)!.push(r);
    }
  });

  // 3. Processar cada nota física para verificar vínculo determinístico
  candidatos.forEach(nota => {
    // BLINDAGEM: Campanhas ou Ajustes não entram no fluxo de adicional seguro
    if (nota.tipo_desconto === "CAMPANHA" || nota.tipo_desconto === "AJUSTE DE PREÇO") {
      nota.is_adicional = false;
      return;
    }

    const cpf = nota.cpf_cnpj_dest;
    const perc = parseFloat(nota.percentual_desconto);
    const temDescontoEstrategico = perc >= 0.08 && perc <= 0.12;

    if (!cpf) {
      if (temDescontoEstrategico) {
        nota.status_auditoria = "DESCONTO SEM VÍNCULO (CPF AUSENTE)";
      }
      return;
    }

    const pickupsDoCliente = pickupsPorCpf.get(cpf) || [];
    const timeNota = new Date(nota.dhEmi).getTime();
    
    // REGRA DE VÍNCULO POR ATENDIMENTO
    const pickupVinculada = pickupsDoCliente.find(p => {
      const timePickup = new Date(p.dhEmi).getTime();
      const diffMinutes = Math.abs(timeNota - timePickup) / (1000 * 60);
      
      const v1 = (nota.vendedor || "").toUpperCase();
      const v2 = (p.vendedor || "").toUpperCase();
      const isSameVendor = v1 !== "COLABORADOR NÃO IDENTIFICADO" && v2 !== "COLABORADOR NÃO IDENTIFICADO" && v1 === v2;

      // Se vendedor bater: janela de 10 min. Se faltar: janela de 3 min.
      const windowLimit = isSameVendor ? 10 : 3;
      return diffMinutes <= windowLimit;
    });

    if (pickupVinculada) {
      nota.chave_retirada_associada = pickupVinculada.chave;
      nota.data_retirada_associada = pickupVinculada.dhEmi;
      
      if (temDescontoEstrategico) {
        nota.canal = "RETIRADA_ADICIONAL";
        nota.canal_consolidado = "RETIRADA_ADICIONAL";
        nota.is_adicional = true;
        nota.tipo_desconto = "ADICIONAL";
        nota.status_auditoria = "ADICIONAL CONFIRMADO";
      } else {
        nota.is_adicional_suspeito = true;
        nota.status_auditoria = "VÍNCULO IDENTIFICADO (SEM DESCONTO 10%)";
      }
    } else if (temDescontoEstrategico) {
      nota.status_auditoria = "DESCONTO AVULSO (FORA DA JANELA DE ATENDIMENTO)";
    }
  });

  return rows;
}

/**
 * Vincula notas de devolução (entrada) com as respectivas notas de troca (saída)
 */
export function vincularTrocas(rows: DetailedSaleRow[]): VinculoTroca[] {
  const entradas = rows.filter(r => r.tpNF === 0 || r.is_devolucao);
  const saidasDeTroca = rows.filter(r => r.tpNF === 1 && r.is_troca && !r.is_cancelada);
  
  const vinculos: VinculoTroca[] = [];
  const saidasVinculadas = new Set<string>();
  const entradasVinculadas = new Set<string>();

  const saidasPorChaveNorm = new Map(saidasDeTroca.map(s => [s.chave.replace(/\D/g, ""), s]));

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

  let score = 50;
  if (vDiferenca > 0.1) score += 20; 
  if (vDiferenca > 100) score += 15;
  if (vDiferenca < -0.1) score -= 30; 
  if (diffItens > 0) score += 20; 
  if (diffItens < 0) score -= 20; 
  if (saida.cpf_cnpj_dest) score += 10;

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
