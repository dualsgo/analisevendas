
import { DetailedSaleRow, VinculoTroca } from "./types";

/**
 * Identifica vendas presenciais que ocorreram no mesmo dia de uma retirada online (Pickup)
 * para o mesmo CPF, classificando-as como vendas adicionais (incrementais).
 * 
 * Regra Ri Happy: 
 * - ADICIONAL: Desconto ~10% + Mesmo CPF + Mesma Data de um Pickup.
 * - ADICIONAL SUSPEITO: Sem Desconto 10% + Mesmo CPF + Mesma Data de um Pickup.
 * - PADRÃO: Desconto 10% SEM Pickup no dia (reclassificado para Venda Normal).
 */
export function detectarAdicionaisSuspeitos(rows: DetailedSaleRow[]): DetailedSaleRow[] {
  const notasPorCpf: Record<string, DetailedSaleRow[]> = {};
  
  // Primeiro passo: Mapear todas as notas de saída por CPF
  rows.forEach(r => {
    if (r.tpNF === 1 && r.cpf_cnpj_dest && !r.is_cancelada) {
      if (!notasPorCpf[r.cpf_cnpj_dest]) notasPorCpf[r.cpf_cnpj_dest] = [];
      notasPorCpf[r.cpf_cnpj_dest].push(r);
    }
  });

  // Segundo passo: Validar vendas que o parser marcou como Adicional apenas pelo desconto
  // Se não houver pickup no dia para aquele CPF, ela não é uma venda adicional estratégica.
  rows.forEach(r => {
    if (r.tpNF === 1 && !r.is_cancelada && r.cpf_cnpj_dest) {
      const date = r.dhEmi.substring(0, 10);
      const vendasCpf = notasPorCpf[r.cpf_cnpj_dest] || [];
      const temPickupNoDia = vendasCpf.some(v => v.is_retirada_online && v.dhEmi.substring(0, 10) === date);

      // Se foi marcada como ADICIONAL (pelo desconto de 10%) mas não tem pickup no dia
      if (r.is_adicional && !temPickupNoDia) {
        r.is_adicional = false;
        r.tipo_desconto = "PADRÃO";
        r.canal = "LOJA_FISICA";
        r.status_auditoria = "DESCONTO APLICADO";
      }

      // Limpar flags de suspeito para re-análise
      r.is_adicional_suspeito = false;
      r.chave_retirada_associada = undefined;
      r.data_retirada_associada = undefined;
    }
  });

  // Terceiro passo: Vincular logicamente as vendas aos pickups existentes
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
      // "Outras" são vendas presenciais (não retirada, não troca)
      const outras = notasDia.filter(n => !n.is_retirada_online && !n.is_troca);

      if (retiradas.length > 0 && outras.length > 0) {
        // Vincula todas as outras vendas presenciais do dia ao primeiro pickup encontrado
        const retRef = retiradas[0];
        outras.forEach(outra => {
          outra.chave_retirada_associada = retRef.chave;
          outra.data_retirada_associada = retRef.dhEmi;
          
          // Análise de ordem cronológica
          const tOutra = new Date(outra.dhEmi).getTime();
          const tRet = new Date(retRef.dhEmi).getTime();
          outra.tipo_retirada_associada = tOutra < tRet ? "ANTES" : "DEPOIS";

          // Se já era um adicional (pelo desconto de 10% validado), apenas confirma
          // Se não era (venda normal), marca como suspeito (venda casada sem desconto oficial)
          if (!outra.is_adicional) {
            outra.is_adicional_suspeito = true;
            outra.motivo_adicional = "Venda presencial no mesmo dia de uma retirada online";
          }
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
