
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * ETAPA 2: Classificar Adicional
 * Aplica-se APENAS após a Etapa 1 (Pickup já identificado no parser)
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  // 1. Isolar Pickups confirmadas na Etapa 1
  const retiradas = rows.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  
  // 2. Isolar notas que NÃO são retiradas para verificar se são adicionais
  const candidatos = rows.filter(r => r.tpNF === 1 && r.canal !== "RETIRADA_ONLINE" && !r.is_cancelada && !r.is_troca);

  // Mapear Pickups por CPF para busca rápida
  const pickupsPorCpf = new Map<string, DetailedSaleRow[]>();
  retiradas.forEach(r => {
    if (r.cpf_cnpj_dest) {
      if (!pickupsPorCpf.has(r.cpf_cnpj_dest)) pickupsPorCpf.set(r.cpf_cnpj_dest, []);
      pickupsPorCpf.get(r.cpf_cnpj_dest)!.push(r);
    }
  });

  // 3. Processar cada nota física para verificar vínculo
  candidatos.forEach(nota => {
    const cpf = nota.cpf_cnpj_dest;
    const temDescontoEstrategico = parseFloat(nota.percentual_desconto) >= 0.08 && parseFloat(nota.percentual_desconto) <= 0.12;

    if (!cpf) {
      // Se não tem CPF mas tem desconto de 10%, é um falso positivo de adicional
      if (nota.is_adicional) {
        nota.is_adicional = false;
        nota.canal = "LOJA_FISICA";
        nota.status_auditoria = "DESCONTO SEM VÍNCULO (CPF AUSENTE)";
      }
      return;
    }

    const pickupsDoCliente = pickupsPorCpf.get(cpf) || [];
    const dataNota = nota.dhEmi.substring(0, 10);
    
    // Vínculo: Mesmo CPF + Mesma Data
    const pickupVinculada = pickupsDoCliente.find(p => p.dhEmi.substring(0, 10) === dataNota);

    if (pickupVinculada) {
      nota.chave_retirada_associada = pickupVinculada.chave;
      nota.data_retirada_associada = pickupVinculada.dhEmi;
      nota.canal = "RETIRADA_ADICIONAL";
      
      if (temDescontoEstrategico) {
        nota.is_adicional = true;
        nota.is_adicional_suspeito = false;
        nota.tipo_desconto = "ADICIONAL";
        nota.status_auditoria = "ADICIONAL CONFIRMADO";
      } else {
        nota.is_adicional = false;
        nota.is_adicional_suspeito = true;
        nota.motivo_adicional = "Vínculo CPF/Data (Sem desconto)";
        nota.status_auditoria = "ADICIONAL SUSPEITO";
      }
    } else {
      // FILTRO DE FALSO POSITIVO: Se tinha desconto de 10% mas não tem pickup no dia, REBAIXA
      if (nota.is_adicional || temDescontoEstrategico) {
        nota.is_adicional = false;
        nota.is_adicional_suspeito = false;
        nota.canal = "LOJA_FISICA";
        nota.status_auditoria = "DESCONTO AVULSO (SEM PICKUP NO DIA)";
      }
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

  // CRITÉRIO A: Vínculo por Referência Fiscal (NFref)
  entradas.forEach(entrada => {
    const refs = (entrada.refNFe_normalizadas || []);
    for (const ref of refs) {
      const saida = saidasPorChaveNorm.get(ref);
      if (saida && !saidasVinculadas.has(saida.chave)) {
        vinculos.push(criarVinculo(entrada, saida, "Referência Fiscal (NFref)", rows));
        saidasVinculadas.add(saida.chave);
        entradasVinculadas.add(entrada.chave);
        break;
      }
    }
  });

  // CRITÉRIO B: Vínculo por CPF + Valor de Crédito exato
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    
    const valorEntrada = parseFloat(entrada.vNF).toFixed(2);
    const cpfEntrada = entrada.cpf_cnpj_dest;

    if (cpfEntrada) {
      const match = saidasDeTroca.find(s => 
        !saidasVinculadas.has(s.chave) && 
        s.cpf_cnpj_dest === cpfEntrada &&
        parseFloat(s.vTroca).toFixed(2) === valorEntrada
      );

      if (match) {
        vinculos.push(criarVinculo(entrada, match, "CPF + Valor de Crédito", rows));
        saidasVinculadas.add(match.chave);
        entradasVinculadas.add(entrada.chave);
      }
    }
  });

  // CRITÉRIO C: Vínculo por Coincidência de Valor (Sem Identificação)
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    
    const valorEntrada = parseFloat(entrada.vNF).toFixed(2);

    const match = saidasDeTroca.find(s => 
      !saidasVinculadas.has(s.chave) && 
      parseFloat(s.vTroca).toFixed(2) === valorEntrada
    );

    if (match) {
      vinculos.push(criarVinculo(entrada, match, "Valor de Crédito (Sem Identif.)", rows));
      saidasVinculadas.add(match.chave);
      entradasVinculadas.add(entrada.chave);
    }
  });

  return vinculos;
}

function criarVinculo(entrada: DetailedSaleRow, saida: DetailedSaleRow, metodo: string, allRows: DetailedSaleRow[]): VinculoTroca {
  const vEntrada = parseFloat(entrada.vNF);
  const vSaida = parseFloat(saida.vNF);
  const vCredito = parseFloat(saida.vTroca);
  const vDiferenca = parseFloat(saida.dif_troca);

  const tEntrada = new Date(entrada.dhEmi).getTime();
  const tSaida = new Date(saida.dhEmi).getTime();
  
  // O intervalo de atendimento é entre a entrada (devolução) e a saída (nova venda)
  const tStart = Math.min(tEntrada, tSaida);
  const tEnd = Math.max(tEntrada, tSaida);
  const tempoMin = Math.abs(tSaida - tEntrada) / 60000;

  // Analisar atendimentos (outras saídas) dentro deste intervalo
  const atendimentosNoIntervalo = allRows.filter(r => {
    if (r.tpNF !== 1 || r.is_cancelada || r.chave === saida.chave) return false;
    const tNote = new Date(r.dhEmi).getTime();
    return tNote >= tStart && tNote <= tEnd;
  });

  const intervaloVendedor = atendimentosNoIntervalo.filter(r => r.vendedor === saida.vendedor).length;
  const intervaloLoja = atendimentosNoIntervalo.length;

  let score = 50;
  let diag = "Troca Operacional";

  // Métrica 1: Valor Financeiro (Upsell)
  if (vDiferenca > 0.1) score += 20; 
  if (vDiferenca > 100) score += 10;
  if (vDiferenca < -0.1) score -= 20; 
  
  // Métrica 2: Peças por Atendimento (PA)
  const diffItens = parseInt(saida.itens_qtd) - parseInt(entrada.itens_qtd);
  if (diffItens > 0) score += 10; 
  if (diffItens < 0) score -= 15; 

  // Métrica 3: Eficiência de Tempo vs Movimento
  if (tempoMin < 10) score += 10; // Ágil
  
  // Se demorou mais de 25 min e a loja estava com movimento (> 3 vendas), houve custo de oportunidade alto
  if (tempoMin > 25 && intervaloLoja > 3) {
    score -= 20; 
    diag = "Troca Ineficiente (Retenção em horário de pico)";
  } else if (tempoMin > 40) {
    score -= 10;
    diag = "Troca Crítica (Tempo excessivo)";
  }

  if (score >= 80) diag = "Troca de Ouro (Excelente Upsell/PA)";
  else if (score >= 60) diag = "Troca Qualitativa (Resultado Positivo)";
  else if (score < 40) diag = "Troca de Risco (Baixo resultado / Longa)";

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
    valor_credito: vCredito,
    valor_diferenca: vDiferenca,
    metodo_vinculo: metodo,
    confianca: metodo.includes("Fiscal") ? 1.0 : (metodo.includes("CPF") ? 0.9 : 0.7),
    tempo_atendimento_min: Math.round(tempoMin),
    atendimentos_vendedor_intervalo: intervaloVendedor,
    atendimentos_loja_intervalo: intervaloLoja,
    score_qualidade: score,
    diagnostico: diag
  };
}
