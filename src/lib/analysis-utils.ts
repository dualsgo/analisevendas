
import { DetailedSaleRow, VinculoTroca } from "./types";

export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  const retiradas = rows.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  const candidatos = rows.filter(r =>
    r.tpNF === 1 &&
    r.canal === "LOJA_FISICA" && // Somente vendas de balcão (físicas) podem ser consideradas "Adicionais" a uma retirada
    !r.is_cancelada &&
    !r.is_troca &&
    !r.tem_suspeita_preco_errado
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
    if (pickupsDoCliente.length === 0) return;

    const dateNotaStr = nota.dhEmi.split('T')[0];
    const tNota = new Date(nota.dhEmi).getTime();
    
    // Encontrar a retirada mais próxima (pode ser antes ou depois)
    let pickupVinculada = pickupsDoCliente[0];
    let minDiff = Math.abs(new Date(pickupVinculada.dhEmi).getTime() - tNota);

    pickupsDoCliente.forEach(p => {
      const diff = Math.abs(new Date(p.dhEmi).getTime() - tNota);
      if (diff < minDiff) {
        minDiff = diff;
        pickupVinculada = p;
      }
    });

    const perc = parseFloat(nota.percentual_desconto);
    const temDesconto10 = perc >= 0.08 && perc <= 0.12;
    const ehMesmoDia = pickupVinculada.dhEmi.split('T')[0] === dateNotaStr;

    // Se tem desconto de 10% e o CPF bate com uma retirada, classificamos como adicional
    // Ou se é no mesmo dia (vínculo temporal forte)
    if (temDesconto10 || ehMesmoDia) {
      const tPickup = new Date(pickupVinculada.dhEmi).getTime();

      nota.chave_retirada_associada = pickupVinculada.chave;
      nota.data_retirada_associada = pickupVinculada.dhEmi;
      nota.tipo_retirada_associada = tNota < tPickup ? "ANTES" : "DEPOIS";
      nota.canal = "RETIRADA_ADICIONAL";
      nota.canal_consolidado = "RETIRADA_ADICIONAL";
      nota.is_adicional = true;

      if (temDesconto10) {
        nota.tipo_desconto = "ADICIONAL";
        nota.status_auditoria = ehMesmoDia 
          ? "ADICIONAL CONFIRMADO (CPF + DESCONTO 10% NO MESMO DIA)" 
          : "ADICIONAL IDENTIFICADO (CPF + DESCONTO 10% EM DIA DISTINTO)";
      } else {
        nota.status_auditoria = "ADICIONAL PROVÁVEL (MESMO CPF NO DIA DA RETIRADA)";
      }
    }
  });

  // 3. Pós-processamento: Identifica descontos "ADICIONAL" (10%) que NÃO possuem retirada vinculada
  // Isso indica um possível uso indevido do desconto de adicional sem uma retirada real.
  rows.forEach(nota => {
    if (nota.tipo_desconto === "ADICIONAL" && !nota.is_adicional && !nota.is_cancelada) {
      nota.is_adicional_suspeito = true;
      nota.motivo_adicional = "DESCONTO_SEM_RETIRADA";
      nota.status_auditoria = "ALERTA: DESCONTO 10% SEM RETIRADA IDENTIFICADA";
    }
  });

  return rows;
}

export function vincularTrocas(rows: DetailedSaleRow[]): VinculoTroca[] {
  const entradas = rows.filter(r => r.tpNF === 0 || r.is_devolucao);
  const saidasDeTroca = rows.filter(r => r.tpNF === 1 && r.is_troca && !r.is_cancelada);

  const vinculos: VinculoTroca[] = [];
  const saidasVinculadas = new Set<string>();
  const entradasVinculadas = new Set<string>();

  const saidasPorChaveNorm = new Map(saidasDeTroca.map(s => [s.chave.replace(/\D/g, ""), s]));

  const entradasPorChaveNorm = new Map(entradas.map(e => [e.chave.replace(/\D/g, ""), e]));

  // Método 1A: Entrada (Devolução) referencia a Saída (Nova Venda) - Incomum
  entradas.forEach(entrada => {
    const refs = (entrada.refNFe_normalizadas || []);
    for (const ref of refs) {
      const saida = saidasPorChaveNorm.get(ref);
      if (saida && !saidasVinculadas.has(saida.chave) && !entradasVinculadas.has(entrada.chave)) {
        vinculos.push(criarVinculo(entrada, saida, "Referência Fiscal (NFref)"));
        saidasVinculadas.add(saida.chave);
        entradasVinculadas.add(entrada.chave);
        break;
      }
    }
  });

  // Método 1B: Saída (Nova Venda) referencia a Entrada (Devolução) - Muito comum
  saidasDeTroca.forEach(saida => {
    if (saidasVinculadas.has(saida.chave)) return;
    const refs = (saida.refNFe_normalizadas || []);
    for (const ref of refs) {
      const entrada = entradasPorChaveNorm.get(ref);
      if (entrada && !entradasVinculadas.has(entrada.chave)) {
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
    const tEntrada = new Date(entrada.dhEmi).getTime();
    
    let match: DetailedSaleRow | undefined = undefined;
    let metodo = "";

    // Método 2A: CPF + Valor de Crédito
    if (cpfEntrada) {
      match = saidasDeTroca.find(s => !saidasVinculadas.has(s.chave) && s.cpf_cnpj_dest === cpfEntrada && parseFloat(s.vTroca).toFixed(2) === valorEntrada);
      if (match) metodo = "CPF + Valor de Crédito";
    }

    // Método 2B: Se não achou pelo CPF (ou se não tem CPF), procura apenas pelo Valor Exato + Proximidade (até 12h)
    // Isso resolve casos onde o cliente não informou CPF na devolução, ou informou o CPF do marido na devolução e da esposa na compra
    if (!match) {
      const candidatasVal = saidasDeTroca.filter(s => 
        !saidasVinculadas.has(s.chave) && 
        parseFloat(s.vTroca).toFixed(2) === valorEntrada &&
        Math.abs(new Date(s.dhEmi).getTime() - tEntrada) <= 12 * 60 * 60 * 1000
      ).sort((a, b) => Math.abs(new Date(a.dhEmi).getTime() - tEntrada) - Math.abs(new Date(b.dhEmi).getTime() - tEntrada));
      
      if (candidatasVal.length > 0) {
        match = candidatasVal[0];
        metodo = "Valor Exato + Proximidade (Indep. de CPF)";
      }
    }

    if (match) {
      vinculos.push(criarVinculo(entrada, match, metodo));
      saidasVinculadas.add(match.chave);
      entradasVinculadas.add(entrada.chave);
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
