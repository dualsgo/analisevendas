
import { DetailedSaleRow, Item } from "./types";

const ADICIONAL_PERCENT_MIN = 0.08;
const ADICIONAL_PERCENT_MAX = 0.12;

function dec(s: string | null | undefined): number {
  if (!s) return 0;
  // Trata formatos como 1.234,56 ou 1234.56
  const cleanS = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const num = parseFloat(cleanS);
  return isNaN(num) ? 0 : num;
}

function extractVendedor(infCpl: string): string {
  if (!infCpl) return "SEM_VENDEDOR";
  
  // Padrão Versão 6.0: Busca "Vendedor:" seguido do nome até o próximo campo delimitador
  const patterns = [
    /Vendedor:\s*(.+?)(?:\s+E-?mail:|\s+Email:|\s+Telefone:|\s+ID\s+PIX|\s+\.\:\:|\s*|;|$)/i,
    /Vendedor:\s*(.+)$/i,
    /Vend:\s*(.+?)(?:\s+|$|;)/i
  ];

  for (const pattern of patterns) {
    const match = infCpl.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name) return name;
    }
  }

  return "SEM_VENDEDOR";
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  if (!xmlDoc.documentElement || xmlDoc.getElementsByTagName("parsererror").length > 0) {
    return null;
  }

  const root = xmlDoc.documentElement;
  const ns = root.getAttribute("xmlns") || "";

  const getElement = (parent: Element | Document | null, name: string): Element | null => {
    if (!parent) return null;
    const elements = ns 
      ? parent.getElementsByTagNameNS(ns, name) 
      : parent.getElementsByTagName(name);
    return elements[0] || null;
  };

  const getElements = (parent: Element | Document | null, name: string): Element[] => {
    if (!parent) return [];
    const elements = ns 
      ? parent.getElementsByTagNameNS(ns, name) 
      : parent.getElementsByTagName(name);
    return Array.from(elements);
  };

  const infNFe = getElement(xmlDoc, "infNFe");
  if (!infNFe) return null;

  const ide = getElement(infNFe, "ide");
  const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
  const nf = getElement(ide, "nNF")?.textContent || "";
  const serie = getElement(ide, "serie")?.textContent || "";
  const modelo = getElement(ide, "mod")?.textContent || "";
  const tpNF = parseInt(getElement(ide, "tpNF")?.textContent || "1");
  const finNFe = parseInt(getElement(ide, "finNFe")?.textContent || "1");
  const natOp = getElement(ide, "natOp")?.textContent || "";
  const dhEmi = getElement(ide, "dhEmi")?.textContent || "";

  // Destinatário
  const dest = getElement(infNFe, "dest");
  const cpf_cnpj = getElement(dest, "CPF")?.textContent || getElement(dest, "CNPJ")?.textContent || "";
  const nome_dest = getElement(dest, "xNome")?.textContent || "";
  const enderDest = getElement(dest, "enderDest");
  const cep_dest = (getElement(enderDest, "CEP")?.textContent || "").replace(/\D/g, "");
  
  const addrParts = [
    getElement(enderDest, "xLgr")?.textContent,
    getElement(enderDest, "nro")?.textContent,
    getElement(enderDest, "xBairro")?.textContent,
    getElement(enderDest, "xMun")?.textContent,
    getElement(enderDest, "UF")?.textContent
  ].filter(Boolean);
  const endereco_dest = addrParts.join(" - ");

  // Emitente (Loja)
  const emit = getElement(infNFe, "emit");
  const enderEmit = getElement(emit, "enderEmit");
  const cep_loja = (getElement(enderEmit, "CEP")?.textContent || "").replace(/\D/g, "");

  // Totais
  const total = getElement(infNFe, "total");
  const icmsTot = getElement(total, "ICMSTot");
  const vNFValue = dec(getElement(icmsTot, "vNF")?.textContent);

  // Itens
  const items: Item[] = [];
  const dets = getElements(infNFe, "det");
  dets.forEach(det => {
    const prod = getElement(det, "prod");
    if (prod) {
      items.push({
        cProd: getElement(prod, "cProd")?.textContent || "",
        xProd: getElement(prod, "xProd")?.textContent || "",
        qCom: dec(getElement(prod, "qCom")?.textContent),
        vProd: dec(getElement(prod, "vProd")?.textContent),
        vDesc: dec(getElement(prod, "vDesc")?.textContent),
      });
    }
  });

  // Pagamentos e Troco
  const pagamentos: Record<string, number> = {};
  let vTroco = 0;
  let tpIntegra = "";
  
  const pag = getElement(infNFe, "pag");
  if (pag) {
    const vTrocoEl = getElement(pag, "vTroco");
    if (vTrocoEl) vTroco = dec(vTrocoEl.textContent);
    
    const detPags = getElements(pag, "detPag");
    detPags.forEach(detPag => {
      const tPag = getElement(detPag, "tPag")?.textContent || "";
      const vPag = dec(getElement(detPag, "vPag")?.textContent);
      pagamentos[tPag] = (pagamentos[tPag] || 0) + vPag;
      
      const card = getElement(detPag, "card");
      if (card) {
        tpIntegra = getElement(card, "tpIntegra")?.textContent || tpIntegra;
      }
    });
  }

  // Notas Referenciadas
  const refNFes: string[] = [];
  const nRefs = getElements(ide, "NFref");
  nRefs.forEach(ref => {
    const r = getElement(ref, "refNFe")?.textContent;
    if (r) refNFes.push(r);
  });

  // Vendedor (Busca em infCpl)
  const infAdic = getElement(infNFe, "infAdic");
  const infCpl = getElement(infAdic, "infCpl")?.textContent || "";
  const vendedor = extractVendedor(infCpl);

  // Lógica de Classificação 6.0
  const isPresencialPorTroco = vTroco > 0 || (pagamentos["01"] || 0) > 0;
  const isEnderecoReal = !!cep_dest && !!cep_loja && cep_dest !== cep_loja;
  const vTrocaVal = pagamentos["05"] || 0;
  const isTroca = vTrocaVal > 0;
  const difTroca = vNFValue - vTrocaVal;

  const valorTotalProds = items.reduce((acc, it) => acc + it.vProd, 0);
  const descontoTotal = items.reduce((acc, it) => acc + it.vDesc, 0);
  const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;
  
  // Regra Adicional 8%-12%
  const isAdicionalDoc = percentualDesconto >= ADICIONAL_PERCENT_MIN && percentualDesconto <= ADICIONAL_PERCENT_MAX;

  const isOperacaoNaoPresencial = tpIntegra === "2";
  const isRetiradaOnline = isOperacaoNaoPresencial && isEnderecoReal && !isPresencialPorTroco;
  const isDevolucao = tpNF === 0 && (finNFe === 4 || natOp.toLowerCase().includes("devolucao"));

  let canal = "LOJA_FISICA";
  let canalConsolidado = "VENDA_LOJA";
  let isAdicional = false;
  let motivoAdicional = "NAO_ADICIONAL";

  if (tpNF === 1) {
    if (isTroca) {
      canal = difTroca > 0.01 ? "TROCA_COM_DIFERENCA" : "TROCA_SEM_DIFERENCA";
      canalConsolidado = "TROCA";
    } else if (isPresencialPorTroco) {
      canal = "LOJA_FISICA";
      canalConsolidado = "VENDA_LOJA";
    } else if (isRetiradaOnline) {
      canal = "RETIRADA_ONLINE";
      canalConsolidated = "RETIRADA_ONLINE";
    } else if (isAdicionalDoc) {
      canal = "RETIRADA_ADICIONAL";
      canalConsolidado = "VENDA_LOJA";
      isAdicional = true;
      motivoAdicional = "COM_DESCONTO";
    }
  }

  let tipoDesconto = "SEM_DESCONTO";
  let statusAuditoria = "SEM_DESCONTO";
  if (descontoTotal > 0 && tpNF === 1 && !isTroca) {
    if (isAdicionalDoc) {
      tipoDesconto = isEnderecoReal ? "ADICIONAL_VALIDO" : "ADICIONAL_ENDERECO_IGUAL";
      statusAuditoria = "ADICIONAL";
    } else {
      tipoDesconto = percentualDesconto < ADICIONAL_PERCENT_MIN ? "FORA_FAIXA_MENOR" : "FORA_FAIXA_MAIOR";
      statusAuditoria = "FORA_DO_PADRAO";
    }
  }

  return {
    chave, nf, serie, modelo, dhEmi, vendedor,
    tpNF, finNFe, natOp,
    canal, subcanal: canal, canal_consolidado: canalConsolidado,
    is_adicional: isAdicional,
    is_adicional_suspeito: false,
    motivo_adicional: motivoAdicional,
    vNF: vNFValue.toFixed(2),
    itens_qtd: items.reduce((acc, it) => acc + it.qCom, 0).toString(),
    desconto_total: descontoTotal.toFixed(2),
    percentual_desconto: percentualDesconto.toFixed(4),
    is_troca: isTroca,
    vTroca: vTrocaVal.toFixed(2),
    dif_troca: difTroca.toFixed(2),
    is_devolucao: isDevolucao,
    refNFe: refNFes,
    refNFe_normalizadas: refNFes.map(r => r.replace(/\D/g, "")),
    is_retirada_online: isRetiradaOnline,
    vTroco: vTroco.toFixed(2),
    is_presencial_por_troco: isPresencialPorTroco,
    tpIntegra,
    tem_desconto: descontoTotal > 0,
    tipo_desconto: tipoDesconto,
    status_auditoria: statusAuditoria,
    cep_dest, cep_loja,
    is_cep_diferente_da_loja: isEnderecoReal,
    is_endereco_real: isEnderecoReal,
    cpf_cnpj_dest: cpf_cnpj,
    nome_dest, endereco_dest,
    tem_destinatario: !!cpf_cnpj
  };
}
