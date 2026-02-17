
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * Identifica vendas presenciais que ocorreram próximas a uma retirada online (Pickup)
 * para o mesmo CPF, classificando-as como vendas adicionais (incrementais).
 * 
 * Refino: Janela temporal de 2 horas para evitar falsos positivos de compras independentes.
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  const JANELA_TEMPORAL_MS = 2 * 60 * 60 * 1000; // 2 horas
  const notasPorCpf: Record<string, DetailedSaleRow[]> = {};
  
  // Primeiro passo: Mapear todas as notas de saída válidas por CPF
  rows.forEach(r => {
    if (r.tpNF === 1 && r.cpf_cnpj_dest && !r.is_cancelada) {
      if (!notasPorCpf[r.cpf_cnpj_dest]) notasPorCpf[r.cpf_cnpj_dest] = [];
      notasPorCpf[r.cpf_cnpj_dest].push(r);
    }
  });

  // Segundo passo: Pré-processamento e limpeza de estados anteriores
  rows.forEach(r => {
    if (r.tpNF === 1 && !r.is_cancelada) {
      r.is_adicional_suspeito = false;
      r.chave_retirada_associada = undefined;
      r.data_retirada_associada = undefined;
      r.tipo_retirada_associada = undefined;
    }
  });

  // Terceiro passo: Vínculo por CPF + Janela Temporal
  Object.values(notasPorCpf).forEach(notasCpf => {
    const retiradas = notasCpf.filter(n => n.is_retirada_online);
    const outras = notasCpf.filter(n => !n.is_retirada_online && !n.is_troca);

    outras.forEach(outra => {
      const tOutra = new Date(outra.dhEmi).getTime();
      
      // Encontra a retirada mais próxima dentro da janela de 2h
      let melhorRetirada: DetailedSaleRow | null = null;
      let menorDif = JANELA_TEMPORAL_MS + 1;

      retiradas.forEach(ret => {
        const tRet = new Date(ret.dhEmi).getTime();
        const diff = Math.abs(tOutra - tRet);
        
        if (diff <= JANELA_TEMPORAL_MS && diff < menorDif) {
          menorDif = diff;
          melhorRetirada = ret;
        }
      });

      if (melhorRetirada) {
        const retRef: DetailedSaleRow = melhorRetirada;
        outra.chave_retirada_associada = retRef.chave;
        outra.data_retirada_associada = retRef.dhEmi;
        outra.tipo_retirada_associada = tOutra < new Date(retRef.dhEmi).getTime() ? "ANTES" : "DEPOIS";

        // Classificação A: Tinha desconto de ~10% e agora confirmamos o pickup próximo
        if (outra.is_adicional) {
          outra.canal = "RETIRADA_ADICIONAL";
          outra.tipo_desconto = "ADICIONAL";
        } else {
          // Classificação B: Sem desconto oficial, mas vinculada por proximidade (Suspeito)
          outra.is_adicional_suspeito = true;
          outra.motivo_adicional = "Venda presencial em janela de 2h de uma retirada online";
          outra.canal = "RETIRADA_ADICIONAL";
        }
      } else {
        // QUARTO PASSO: Filtro de Falso Positivo
        // Se tinha 10% de desconto mas não tem pickup em 2h, rebaixa para Loja Física
        if (outra.is_adicional) {
          outra.is_adicional = false;
          outra.tipo_desconto = "PADRÃO";
          outra.canal = "LOJA_FISICA";
          outra.canal_consolidado = "VENDA_LOJA";
          outra.status_auditoria = "DESCONTO APLICADO (SEM PICKUP VINCULADO)";
        }
      }
    });
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

  return {
    chave_entrada: entrada.chave,
    chave_saida: saida.chave,
    cpf_cliente: entrada.cpf_cnpj_dest || saida.cpf_cnpj_dest,
    nome_cliente: entrada.nome_dest || saida.nome_dest,
    vendedor: saida.vendedor,
    data_entrada: entrada.dhEmi,
    data_saida: entrada.dhEmi,
    itens_devolvidos: parseInt(entrada.itens_qtd),
    itens_trocados: parseInt(saida.itens_qtd),
    diferenca_itens: parseInt(saida.itens_qtd) - parseInt(entrada.itens_qtd),
    valor_devolvido: vEntrada,
    valor_trocado: vSaida,
    valor_credito: vCredito,
    valor_diferenca: vDiferenca,
    metodo_vinculo: metodo,
    confianca: metodo.includes("Fiscal") ? 1.0 : (metodo.includes("CPF") ? 0.9 : 0.7)
  };
}
