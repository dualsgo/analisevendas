
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * Identifica vendas presenciais que ocorreram no mesmo dia de uma retirada online (Pickup)
 * para o mesmo CPF, classificando-as como vendas adicionais (incrementais).
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  const notasPorCpf: Record<string, DetailedSaleRow[]> = {};
  
  // Agrupar apenas notas de saída ativas por CPF
  rows.forEach(r => {
    if (r.tpNF === 1 && r.cpf_cnpj_dest && !r.is_cancelada) {
      if (!notasPorCpf[r.cpf_cnpj_dest]) notasPorCpf[r.cpf_cnpj_dest] = [];
      notasPorCpf[r.cpf_cnpj_dest].push(r);
    }
  });

  Object.values(notasPorCpf).forEach(notasCpf => {
    // Agrupar notas do cliente por data
    const notasPorData: Record<string, DetailedSaleRow[]> = {};
    notasCpf.forEach(n => {
      const data = n.dhEmi.substring(0, 10);
      if (!notasPorData[data]) notasPorData[data] = [];
      notasPorData[data].push(n);
    });

    Object.values(notasPorData).forEach(notasDia => {
      const retiradas = notasDia.filter(n => n.is_retirada_online);
      // "Outras" são vendas presenciais que não são a própria retirada
      const outras = notasDia.filter(n => !n.is_retirada_online && !n.is_troca);

      if (retiradas.length > 0 && outras.length > 0) {
        // Vincula todas as outras vendas presenciais do dia ao primeiro pickup encontrado
        const retRef = retiradas[0];
        outras.forEach(outra => {
          // Se já era um adicional (pelo desconto), apenas vincula a chave da retirada
          // Se não era, marca como suspeito e vincula
          if (!outra.is_adicional) {
            outra.is_adicional_suspeito = true;
            outra.motivo_adicional = "Venda presencial no mesmo dia de uma retirada online";
          }
          
          outra.chave_retirada_associada = retRef.chave;
          outra.data_retirada_associada = retRef.dhEmi;
          
          // Análise de ordem cronológica
          const tOutra = new Date(outra.dhEmi).getTime();
          const tRet = new Date(retRef.dhEmi).getTime();
          outra.tipo_retirada_associada = tOutra < tRet ? "ANTES" : "DEPOIS";
        });
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
