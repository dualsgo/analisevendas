
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * ETAPA 2: Classificar Adicional (REGRA ANTI-BRECHA)
 * Só permite ADICIONAL se houver vínculo CPF+Data com uma Retirada Online.
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  // 1. Isolar Pickups confirmadas na Etapa 1 (Parser)
  const retiradas = rows.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  
  // 2. Isolar notas candidatas (Loja Física que não são troca nem cancelamento)
  const candidatos = rows.filter(r => r.tpNF === 1 && r.canal !== "RETIRADA_ONLINE" && !r.is_cancelada && !r.is_troca);

  // Mapear Pickups por CPF para busca rápida
  const pickupsPorCpf = new Map<string, DetailedSaleRow[]>();
  retiradas.forEach(r => {
    if (r.cpf_cnpj_dest) {
      if (!pickupsPorCpf.has(r.cpf_cnpj_dest)) pickupsPorCpf.set(r.cpf_cnpj_dest, []);
      pickupsPorCpf.get(r.cpf_cnpj_dest)!.push(r);
    }
  });

  // 3. Processar cada nota física para verificar vínculo obrigatório
  candidatos.forEach(nota => {
    // BLINDAGEM: Se a nota é CAMPANHA ou AJUSTE DE PREÇO, ela não entra no fluxo de adicional seguro.
    if (nota.tipo_desconto === "CAMPANHA" || nota.tipo_desconto === "AJUSTE DE PREÇO") {
      nota.is_adicional = false;
      return;
    }

    const cpf = nota.cpf_cnpj_dest;
    const perc = parseFloat(nota.percentual_desconto);
    const temDescontoEstrategico = perc >= 0.08 && perc <= 0.12; // Faixa de 10%

    // Se não tem CPF, é impossível garantir que é adicional de uma retirada específica
    if (!cpf) {
      if (temDescontoEstrategico) {
        nota.canal = "LOJA_FISICA";
        nota.status_auditoria = "DESCONTO SEM VÍNCULO (CPF AUSENTE)";
      }
      nota.is_adicional = false;
      return;
    }

    const pickupsDoCliente = pickupsPorCpf.get(cpf) || [];
    const dataNota = nota.dhEmi.substring(0, 10);
    
    // Vínculo Anti-Brecha: Mesmo CPF + Mesma Data (Dia do Atendimento)
    const pickupVinculada = pickupsDoCliente.find(p => p.dhEmi.substring(0, 10) === dataNota);

    if (pickupVinculada) {
      nota.chave_retirada_associada = pickupVinculada.chave;
      nota.data_retirada_associada = pickupVinculada.dhEmi;
      
      if (temDescontoEstrategico) {
        // CASO IDEAL: Link confirmado + Desconto de 10%
        nota.canal = "RETIRADA_ADICIONAL";
        nota.is_adicional = true;
        nota.is_adicional_suspeito = false;
        nota.tipo_desconto = "ADICIONAL";
        nota.status_auditoria = "ADICIONAL CONFIRMADO";
      } else {
        // CASO SUSPEITO: Link de CPF existe, mas o desconto não foi o padrão ou não existiu
        nota.canal = "RETIRADA_ADICIONAL";
        nota.is_adicional = false;
        nota.is_adicional_suspeito = true;
        nota.motivo_adicional = "Vínculo CPF/Data Identificado";
        nota.status_auditoria = "ADICIONAL SEM DESCONTO PADRÃO";
      }
    } else {
      // FALHA DE VÍNCULO: Se o vendedor deu 10% mas não tinha pickup no dia
      if (temDescontoEstrategico) {
        nota.canal = "LOJA_FISICA";
        nota.is_adicional = false;
        nota.is_adicional_suspeito = false;
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
        vinculos.push(criarVinculo(entrada, saida, "Referência Fiscal (NFref)"));
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
        vinculos.push(criarVinculo(entrada, match, "CPF + Valor de Crédito"));
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
  const vCredito = parseFloat(saida.vTroca);
  const vDiferenca = parseFloat(saida.dif_troca);

  let score = 50;
  let diag = "Troca Operacional";

  // Métrica 1: Valor Financeiro (Upsell) - Peso 40
  if (vDiferenca > 0.1) score += 20; 
  if (vDiferenca > 100) score += 15;
  if (vDiferenca < -0.1) score -= 30; 
  
  // Métrica 2: Peças por Atendimento (PA) - Peso 30
  const diffItens = parseInt(saida.itens_qtd) - parseInt(entrada.itens_qtd);
  if (diffItens > 0) score += 20; 
  if (diffItens < 0) score -= 20; 

  // Métrica 3: Identificação de Cliente - Peso 10
  if (saida.cpf_cnpj_dest) score += 10;

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
    valor_credito: vCredito,
    valor_diferenca: vDiferenca,
    metodo_vinculo: metodo,
    confianca: metodo.includes("Fiscal") ? 1.0 : (metodo.includes("CPF") ? 0.9 : 0.7),
    score_qualidade: Math.max(0, Math.min(100, score)),
    diagnostico: diag
  };
}
