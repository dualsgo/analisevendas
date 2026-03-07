
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

  // ── Método 3: CPF igual + proximidade temporal (72h) ─────────────────────
  // Captura trocas onde o valor mudou (cliente comprou algo diferente) mas o
  // CPF bate e a devolução ocorreu próximo da saída com Crédito Loja.
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    const cpfEntrada = entrada.cpf_cnpj_dest?.trim();
    if (!cpfEntrada) return;
    const tEntrada = new Date(entrada.dhEmi).getTime();

    // Candidatas: saídas com is_troca, mesmo CPF, ainda não vinculadas
    const candidatas = saidasDeTroca
      .filter(s =>
        !saidasVinculadas.has(s.chave) &&
        s.cpf_cnpj_dest?.trim() === cpfEntrada
      )
      .map(s => ({ s, diff: Math.abs(new Date(s.dhEmi).getTime() - tEntrada) }))
      .filter(({ diff }) => diff <= 72 * 60 * 60 * 1000) // janela de 72h
      .sort((a, b) => a.diff - b.diff); // mais próxima temporal primeiro

    if (candidatas.length > 0) {
      const { s: match } = candidatas[0];
      vinculos.push(criarVinculo(entrada, match, "CPF + Proximidade Temporal"));
      saidasVinculadas.add(match.chave);
      entradasVinculadas.add(entrada.chave);
    }
  });

  // ── Método 4: Trocas Órfãs (Sem XML de Entrada) ──────────────────────────
  saidasDeTroca.forEach(saida => {
    if (!saidasVinculadas.has(saida.chave)) {
      const vDiferenca = parseFloat(saida.dif_troca);
      const valorDevolvido = parseFloat(saida.vTroca) || 0; // Crédito gerado pela troca

      let score = 50;
      if (vDiferenca > 0.1) score += 20;
      if (vDiferenca > 100) score += 15;
      if (vDiferenca < -0.1) score -= 30;
      if (saida.cpf_cnpj_dest) score += 10;

      let diag = "Troca Sem XML";
      if (score >= 80) diag = "Ótima (Sem XML Entrada)";
      else if (score < 40) diag = "Baixa Eficiência (Sem XML)";

      vinculos.push({
        chave_entrada: "SEM_XML_" + saida.chave,
        chave_saida: saida.chave,
        cpf_cliente: saida.cpf_cnpj_dest || "",
        nome_cliente: saida.nome_dest || "",
        vendedor: saida.vendedor,
        data_entrada: saida.dhEmi,
        data_saida: saida.dhEmi,
        itens_devolvidos: 0,
        itens_trocados: parseInt(saida.itens_qtd),
        diferenca_itens: parseInt(saida.itens_qtd),
        valor_devolvido: valorDevolvido,
        valor_trocado: parseFloat(saida.vNF),
        valor_credito: parseFloat(saida.vTroca) || valorDevolvido,
        valor_diferenca: vDiferenca,
        metodo_vinculo: "Órfã (Apenas Saída)",
        confianca: 0.5,
        score_qualidade: Math.max(0, Math.min(100, score)),
        diagnostico: diag
      });
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
