
import { DetailedSaleRow, VinculoTroca } from "./types";

export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  const notasPorCpf: Record<string, DetailedSaleRow[]> = {};
  
  rows.forEach(r => {
    if (r.tpNF === 1 && r.cpf_cnpj_dest) {
      if (!notasPorCpf[r.cpf_cnpj_dest]) notasPorCpf[r.cpf_cnpj_dest] = [];
      notasPorCpf[r.cpf_cnpj_dest].push(r);
    }
  });

  Object.values(notasPorCpf).forEach(notasCpf => {
    const notasPorData: Record<string, DetailedSaleRow[]> = {};
    notasCpf.forEach(n => {
      const data = n.dhEmi.substring(0, 10);
      if (!notasPorData[data]) notasPorData[data] = [];
      notasPorData[data].push(n);
    });

    Object.values(notasPorData).forEach(notasDia => {
      const retiradas = notasDia.filter(n => n.is_retirada_online);
      const outras = notasDia.filter(n => !n.is_retirada_online && !n.is_adicional && !n.is_troca);

      if (retiradas.length > 0 && outras.length > 0) {
        const retRef = retiradas[0];
        outras.forEach(outra => {
          outra.is_adicional_suspeito = true;
          outra.motivo_adicional = "Venda no mesmo dia de uma retirada online (Suspeita de Adicional)";
          outra.chave_retirada_associada = retRef.chave;
          outra.data_retirada_associada = retRef.dhEmi;
          
          const tOutra = new Date(outra.dhEmi).getTime();
          const tRet = new Date(retRef.dhEmi).getTime();
          outra.tipo_retirada_associada = tOutra < tRet ? "ANTES" : "DEPOIS";
        });
      }
    });
  });

  return rows;
}

export function vincularTrocas(rows: DetailedSaleRow[]): VinculoTroca[] {
  // Filtramos entradas (Devoluções) e saídas (Trocas)
  const entradas = rows.filter(r => r.tpNF === 0 || r.is_devolucao);
  const saidas = rows.filter(r => r.tpNF === 1 && r.is_troca);
  
  const vinculos: VinculoTroca[] = [];
  const saidasVinculadas = new Set<string>();
  const entradasVinculadas = new Set<string>();

  // Mapas para busca rápida com chaves normalizadas (apenas números)
  const saidasPorChaveNorm = new Map(saidas.map(s => [s.chave.replace(/\D/g, ""), s]));
  
  // 1. Vínculo por Referência de Chave (NFref)
  // A nota de entrada (devolução) costuma referenciar a nota original ou a de troca
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    
    // Normalizamos as referências da nota de entrada
    const refs = (entrada.refNFe || []).map(r => r.replace(/\D/g, ""));
    
    for (const ref of refs) {
      // Procuramos uma nota de saída que bata com essa referência
      let saida = saidasPorChaveNorm.get(ref);
      
      if (saida && !saidasVinculadas.has(saida.chave)) {
        vinculos.push(criarVinculo(entrada, saida, "Vínculo por Chave de Referência (NFref)"));
        saidasVinculadas.add(saida.chave);
        entradasVinculadas.add(entrada.chave);
        break;
      }
    }
  });

  // 2. Vínculo por Valor e Cliente (Caso a referência esteja ausente)
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;

    const valorEntrada = parseFloat(entrada.vNF).toFixed(2);
    
    const possiveisSaidas = saidas.filter(s => 
      !saidasVinculadas.has(s.chave) && 
      parseFloat(s.vTroca).toFixed(2) === valorEntrada
    );

    // Se houver CPF igual, a confiança é alta
    const matchCpf = possiveisSaidas.find(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest === entrada.cpf_cnpj_dest);
    if (matchCpf) {
      vinculos.push(criarVinculo(entrada, matchCpf, "Vínculo por Valor e Identificação do Cliente"));
      saidasVinculadas.add(matchCpf.chave);
      entradasVinculadas.add(entrada.chave);
      return;
    }

    // Se não tiver CPF em nenhuma, mas o valor bater e não tiver destinatário (venda balcão)
    const matchValorPuro = possiveisSaidas.find(s => !s.tem_destinatario && !entrada.tem_destinatario);
    if (matchValorPuro) {
      vinculos.push(criarVinculo(entrada, matchValorPuro, "Vínculo por Valor Exato (Troca sem Identificação)"));
      saidasVinculadas.add(matchValorPuro.chave);
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
    data_saida: saida.dhEmi,
    itens_devolvidos: parseInt(entrada.itens_qtd),
    itens_trocados: parseInt(saida.itens_qtd),
    diferenca_itens: parseInt(saida.itens_qtd) - parseInt(entrada.itens_qtd),
    valor_devolvido: vEntrada,
    valor_trocado: vSaida,
    valor_credito: vCredito,
    valor_diferenca: vDiferenca,
    metodo_vinculo: metodo,
    confianca: 1.0
  };
}
