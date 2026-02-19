
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * ETAPA 2: Classificar Adicional
 * Aplica-se APENAS após a Etapa 1 (Pickup já identificado no parser)
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  // 1. Separar Pickups das demais notas de saída
  const retiradas = rows.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  const outrasSaidas = rows.filter(r => r.tpNF === 1 && r.canal !== "RETIRADA_ONLINE" && !r.is_cancelada && !r.is_troca);

  // Mapear Pickups por CPF para busca rápida
  const pickupsPorCpf = new Map<string, DetailedSaleRow[]>();
  retiradas.forEach(r => {
    if (r.cpf_cnpj_dest) {
      if (!pickupsPorCpf.has(r.cpf_cnpj_dest)) pickupsPorCpf.set(r.cpf_cnpj_dest, []);
      pickupsPorCpf.get(r.cpf_cnpj_dest)!.push(r);
    }
  });

  // 2. Processar cada nota física para verificar vínculo
  outrasSaidas.forEach(outra => {
    const cpf = outra.cpf_cnpj_dest;
    if (!cpf) {
      if (outra.is_adicional) {
        outra.is_adicional = false;
        outra.canal = "LOJA_FISICA";
        outra.tipo_desconto = "PADRÃO";
        outra.status_auditoria = "DESCONTO SEM VÍNCULO (CPF AUSENTE)";
      }
      return;
    }

    const pickupsDoCliente = pickupsPorCpf.get(cpf) || [];
    const dataOutra = outra.dhEmi.substring(0, 10);
    
    const pickupVinculada = pickupsDoCliente.find(p => p.dhEmi.substring(0, 10) === dataOutra);

    if (pickupVinculada) {
      outra.chave_retirada_associada = pickupVinculada.chave;
      outra.data_retirada_associada = pickupVinculada.dhEmi;
      
      if (outra.is_adicional) {
        outra.canal = "RETIRADA_ADICIONAL";
        outra.tipo_desconto = "ADICIONAL";
        outra.status_auditoria = "ADICIONAL CONFIRMADO";
      } else {
        outra.is_adicional_suspeito = true;
        outra.canal = "RETIRADA_ADICIONAL";
        outra.motivo_adicional = "Vínculo CPF/Data (Sem desconto)";
        outra.status_auditoria = "ADICIONAL SUSPEITO";
      }
    } else {
      if (outra.is_adicional) {
        outra.is_adicional = false;
        outra.canal = "LOJA_FISICA";
        outra.tipo_desconto = "PADRÃO";
        outra.status_auditoria = "DESCONTO APLICADO (SEM PICKUP VINCULADO)";
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

  // Cálculo de Tempo e Produtividade
  const tEntrada = new Date(entrada.dhEmi).getTime();
  const tSaida = new Date(saida.dhEmi).getTime();
  const tempoMin = Math.abs(tSaida - tEntrada) / 60000;

  // Vendas no intervalo (Exclui as próprias notas do vínculo)
  const intervaloVendedor = allRows.filter(r => 
    r.vendedor === saida.vendedor && 
    r.tpNF === 1 && 
    r.chave !== saida.chave &&
    new Date(r.dhEmi).getTime() >= Math.min(tEntrada, tSaida) &&
    new Date(r.dhEmi).getTime() <= Math.max(tEntrada, tSaida)
  ).length;

  const intervaloLoja = allRows.filter(r => 
    r.tpNF === 1 && 
    r.chave !== saida.chave &&
    new Date(r.dhEmi).getTime() >= Math.min(tEntrada, tSaida) &&
    new Date(r.dhEmi).getTime() <= Math.max(tEntrada, tSaida)
  ).length;

  // Score de Qualidade (0-100)
  let score = 50;
  let diag = "Troca Operacional";

  if (vDiferenca > 0.1) score += 20; // Upsell
  if (vDiferenca > 100) score += 10; // Alto Upsell
  if (vDiferenca < -0.1) score -= 20; // Perda de Receita (Crédito)
  
  const diffItens = parseInt(saida.itens_qtd) - parseInt(entrada.itens_qtd);
  if (diffItens > 0) score += 10; // Ganho de PA
  if (diffItens < 0) score -= 15; // Perda de PA

  if (tempoMin < 10) score += 10; // Agilidade
  if (tempoMin > 30 && intervaloLoja > 5) {
    score -= 15; // Ineficiência em pico
    diag = "Troca Ineficiente (Lenta em horário de pico)";
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
