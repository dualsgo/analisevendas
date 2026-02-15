
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
          outra.motivo_adicional = "SUSPEITO_MESMO_DIA";
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
  const entradas = rows.filter(r => r.tpNF === 0 && r.is_devolucao);
  const saidas = rows.filter(r => r.tpNF === 1 && r.is_troca);
  
  const vinculos: VinculoTroca[] = [];
  const saidasVinculadas = new Set<string>();
  const entradasVinculadas = new Set<string>();

  const saidasPorChave = new Map(saidas.map(s => [s.chave, s]));
  const saidasPorChaveNorm = new Map(saidas.map(s => [s.chave.replace(/\D/g, ""), s]));
  
  // 1. Vínculo por NFref
  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    
    for (const ref of entrada.refNFe) {
      let saida = saidasPorChave.get(ref) || saidasPorChaveNorm.get(ref.replace(/\D/g, ""));
      if (saida && !saidasVinculadas.has(saida.chave)) {
        vinculos.push(criarVinculo(entrada, saida, "NFref"));
        saidasVinculadas.add(saida.chave);
        entradasVinculadas.add(entrada.chave);
        break;
      }
    }
  });

  // 2. Vínculo por Valor (Troca sem CPF)
  const saidasPorValor = new Map<string, DetailedSaleRow[]>();
  saidas.forEach(s => {
    if (saidasVinculadas.has(s.chave)) return;
    const v = s.vTroca;
    if (!saidasPorValor.has(v)) saidasPorValor.set(v, []);
    saidasPorValor.get(v)!.push(s);
  });

  entradas.forEach(entrada => {
    if (entradasVinculadas.has(entrada.chave)) return;
    const candidatos = saidasPorValor.get(parseFloat(entrada.vNF).toFixed(2)) || [];
    const valid = candidatos.find(s => !s.tem_destinatario && !saidasVinculadas.has(s.chave));
    if (valid) {
      vinculos.push(criarVinculo(entrada, valid, "valor_sem_cpf"));
      saidasVinculadas.add(valid.chave);
      entradasVinculadas.add(entrada.chave);
    }
  });

  return vinculos;
}

function criarVinculo(entrada: DetailedSaleRow, saida: DetailedSaleRow, metodo: string): VinculoTroca {
  return {
    chave_entrada: entrada.chave,
    chave_saida: saida.chave,
    cpf_cliente: entrada.cpf_cnpj_dest,
    nome_cliente: entrada.nome_dest,
    vendedor: saida.vendedor,
    data_entrada: entrada.dhEmi,
    data_saida: saida.dhEmi,
    itens_devolvidos: parseInt(entrada.itens_qtd),
    itens_trocados: parseInt(saida.itens_qtd),
    diferenca_itens: parseInt(entrada.itens_qtd) - parseInt(saida.itens_qtd),
    valor_devolvido: parseFloat(entrada.vNF),
    valor_trocado: parseFloat(saida.vNF),
    valor_credito: parseFloat(saida.vTroca),
    valor_diferenca: parseFloat(saida.dif_troca),
    metodo_vinculo: metodo,
    confianca: 1.0
  };
}
