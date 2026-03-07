
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * Detecta fragmentação de cupons (divisão artificial de compras).
 * Regra: Vendas com diferença de tempo < 3 minutos para o mesmo CPF ou mesmo Vendedor com valores baixos.
 */
export function detectarFragmentacao(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  const saidas = [...rows]
    .filter(r => r.tpNF === 1 && !r.is_cancelada)
    .sort((a, b) => new Date(a.dhEmi).getTime() - new Date(b.dhEmi).getTime());

  for (let i = 1; i < saidas.length; i++) {
    const atual = saidas[i];
    const anterior = saidas[i - 1];

    const tAtual = new Date(atual.dhEmi).getTime();
    const tAnterior = new Date(anterior.dhEmi).getTime();
    const diffMin = (tAtual - tAnterior) / 60000;

    if (diffMin <= 3) {
      const mesmoCpf = atual.cpf_cnpj_dest && atual.cpf_cnpj_dest === anterior.cpf_cnpj_dest;
      const mesmoVendedor = atual.vendedor === anterior.vendedor;

      if (mesmoCpf || (mesmoVendedor && parseInt(atual.itens_qtd) === 1 && parseInt(anterior.itens_qtd) === 1)) {
        atual.is_fragmentada = true;
        anterior.is_fragmentada = true;
      }
    }
  }
  return rows;
}

export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  // Primeiro detecta fragmentação para não confundir com adicional legítimo
  const withFragmented = detectarFragmentacao(rows);

  const retiradas = withFragmented.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  const candidatos = withFragmented.filter(r =>
    r.tpNF === 1 &&
    r.canal !== "RETIRADA_ONLINE" &&
    !r.is_cancelada &&
    !r.is_troca &&
    !r.tem_suspeita_preco_errado &&
    !r.is_fragmentada // Fragmentado não é adicional seguro
  );

  const pickupsPorCpf = new Map<string, DetailedSaleRow[]>();
  retiradas.forEach(r => {
    if (r.cpf_cnpj_dest) {
      if (!pickupsPorCpf.has(r.cpf_cnpj_dest)) pickupsPorCpf.set(r.cpf_cnpj_dest, []);
      pickupsPorCpf.get(r.cpf_cnpj_dest)!.push(r);
    }
  });

  candidatos.forEach(nota => {
    const cpf = nota.cpf_cnpj_dest;
    if (!cpf) return;

    const pickupsDoCliente = pickupsPorCpf.get(cpf) || [];
    const timeNota = new Date(nota.dhEmi).getTime();

    const pickupVinculada = pickupsDoCliente.find(p => {
      const timePickup = new Date(p.dhEmi).getTime();
      const diffMinutes = Math.abs(timeNota - timePickup) / (1000 * 60);
      return diffMinutes <= 30;
    });

    if (pickupVinculada) {
      nota.chave_retirada_associada = pickupVinculada.chave;
      nota.data_retirada_associada = pickupVinculada.dhEmi;
      nota.canal = "RETIRADA_ADICIONAL";
      nota.canal_consolidado = "RETIRADA_ADICIONAL";

      const perc = parseFloat(nota.percentual_desconto);
      const temDescontoEstrategico = perc >= 0.08 && perc <= 0.12;

      if (temDescontoEstrategico) {
        nota.is_adicional = true;
        nota.tipo_desconto = "ADICIONAL";
        nota.status_auditoria = "ADICIONAL CONFIRMADO (10%)";
      } else {
        nota.is_adicional_suspeito = true;
        nota.status_auditoria = "ADICIONAL (VÍNCULO CPF)";
      }
    }
  });

  return withFragmented;
}

export function vincularTrocas(rows: DetailedSaleRow[]): VinculoTroca[] {
  // Limpando possível marcação prévia incorreta de 'is_troca' setada pelo parse inicial
  rows.forEach(r => {
    if (r.tpNF === 1 && r.canal_consolidado === "TROCA") {
      r.is_troca = false;
      r.canal = "LOJA_FISICA";
      r.canal_consolidado = "VENDA_LOJA";
    }
    if (r.tpNF === 0) {
      r.is_troca = false;
      r.canal = "LOJA_FISICA";
      r.canal_consolidado = "VENDA_LOJA";
    }
  });

  const entradas = rows.filter(r => r.tpNF === 0 || r.is_devolucao);
  const saidasDeTrocaCand = rows.filter(r => r.tpNF === 1 && r.vTroca && parseFloat(r.vTroca) > 0 && !r.is_cancelada);

  const vinculos: VinculoTroca[] = [];
  const saidasVinculadas = new Set<string>();
  const entradasVinculadas = new Set<string>();

  entradas.forEach(entrada => {
    const cpfEntrada = entrada.cpf_cnpj_dest?.trim();
    if (!cpfEntrada) return; // Exigência: deve ter o mesmo CPF, então CPF precisa existir

    const valorEntrada = parseFloat(entrada.vNF).toFixed(2);

    const match = saidasDeTrocaCand.find(s => {
      if (saidasVinculadas.has(s.chave)) return false;
      const cpfSaida = s.cpf_cnpj_dest?.trim();
      if (cpfSaida !== cpfEntrada) return false;

      const valorCreditoLoja = parseFloat(s.vTroca).toFixed(2);
      if (valorCreditoLoja !== valorEntrada) return false;

      return true;
    });

    if (match) {
      vinculos.push(criarVinculo(entrada, match, "CPF + Crédito de Loja Exato"));
      saidasVinculadas.add(match.chave);
      entradasVinculadas.add(entrada.chave);

      // Atualiza os registros para refletir que são oficialmente parte de uma troca validada
      entrada.is_troca = true;
      entrada.canal = "TROCA";
      entrada.canal_consolidado = "TROCA";

      match.is_troca = true;
      match.canal = "TROCA";
      match.canal_consolidado = "TROCA";
    }
  });

  return vinculos;
}

function criarVinculo(entrada: DetailedSaleRow, saida: DetailedSaleRow, metodo: string): VinculoTroca {
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
    valor_devolvido: parseFloat(entrada.vNF),
    valor_trocado: parseFloat(saida.vNF),
    valor_credito: parseFloat(saida.vTroca),
    valor_diferenca: vDiferenca,
    metodo_vinculo: metodo,
    confianca: metodo.includes("Fiscal") ? 1.0 : metodo.includes("CPF + Valor") ? 0.9 : metodo.includes("Proximidade") ? 0.75 : 0.7,
    score_qualidade: Math.max(0, Math.min(100, score)),
    diagnostico: diag
  };
}
