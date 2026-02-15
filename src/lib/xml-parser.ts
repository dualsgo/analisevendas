
import { DetailedSaleRow, Item } from "./types";

const ADICIONAL_PERCENT_MIN = 0.08;
const ADICIONAL_PERCENT_MAX = 0.12;

function dec(s: string | null | undefined): number {
  if (!s) return 0;
  const cleanS = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const num = parseFloat(cleanS);
  return isNaN(num) ? 0 : num;
}

function extractVendedor(infCpl: string): string {
  if (!infCpl) return "SEM_VENDEDOR";
  
  // Procura o rótulo "Vendedor:"
  const vLabel = "Vendedor:";
  const vIdx = infCpl.indexOf(vLabel);
  if (vIdx === -1) {
    const vAlt = "Vend:";
    const vAltIdx = infCpl.indexOf(vAlt);
    if (vAltIdx === -1) return "SEM_VENDEDOR";
    let part = infCpl.substring(vAltIdx + vAlt.length).trim();
    // Pega até o próximo delimitador ou fim
    const end = part.search(/;|Email:|Telefone:|\s{2,}/i);
    return (end !== -1 ? part.substring(0, end) : part).trim() || "SEM_VENDEDOR";
  }

  // Pega o texto após "Vendedor:"
  let candidate = infCpl.substring(vIdx + vLabel.length).trim();
  
  // Delimitadores que indicam o fim do nome do vendedor no infCpl
  const delimiters = [
    "Email:", 
    "E-mail:", 
    "Telefone:", 
    "ID PIX", 
    ".::", 
    ";",
    "ID:",
    "CPF:"
  ];

  let endIdx = candidate.length;
  for (const d of delimiters) {
    const dIdx = candidate.indexOf(d);
    if (dIdx !== -1 && dIdx < endIdx) {
      endIdx = dIdx;
    }
  }

  // Também verifica se há uma quebra de linha ou múltiplos espaços (comum em notas fiscais)
  const multiSpace = candidate.match(/\s{2,}/);
  if (multiSpace && multiSpace.index !== undefined && multiSpace.index < endIdx) {
    endIdx = multiSpace.index;
  }

  const name = candidate.substring(0, endIdx).trim();
  return name || "SEM_VENDEDOR";
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
    const p = parent instanceof Document ? parent.documentElement : parent;
    const elements = ns 
      ? p.getElementsByTagNameNS(ns, name) 
      : p.getElementsByTagName(name);
    return elements[0] || null;
  };

  const getElements = (parent: Element | Document | null, name: string): Element[] => {
    if (!parent) return [];
    const p = parent instanceof Document ? parent.documentElement : parent;
    const elements = ns 
      ? p.getElementsByTagNameNS(ns, name) 
      : p.getElementsByTagName(name);
    return Array.from(elements);
  };

  const infNFe = getElement(xmlDoc, "infNFe");
  if (!infNFe) return null;

  const ide = getElement(infNFe, "ide");
  if (!ide) return null;

  const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
  const nf = getElement(ide, "nNF")?.textContent || "";
  const serie = getElement(ide, "serie")?.textContent || "";
  const modelo = getElement(ide, "mod")?.textContent || "";
  const tpNF = parseInt(getElement(ide, "tpNF")?.textContent || "1");
  const finNFe = parseInt(getElement(ide, "finNFe")?.textContent || "1");
  const natOp = getElement(ide, "natOp")?.textContent || "";
  const dhEmi = getElement(ide, "dhEmi")?.textContent || "";

  const dest = getElement(infNFe, "dest");
  const cpf_cnpj = dest ? (getElement(dest, "CPF")?.textContent || getElement(dest, "CNPJ")?.textContent || "") : "";
  const nome_dest = dest ? (getElement(dest, "xNome")?.textContent || "") : "";
  const enderDest = dest ? getElement(dest, "enderDest") : null;
  const cep_dest = enderDest ? (getElement(enderDest, "CEP")?.textContent || "").replace(/\D/g, "") : "";
  
  const addrParts = enderDest ? [
    getElement(enderDest, "xLgr")?.textContent,
    getElement(enderDest, "nro")?.textContent,
    getElement(enderDest, "xBairro")?.textContent,
    getElement(enderDest, "xMun")?.textContent,
    getElement(enderDest, "UF")?.textContent
  ].filter(Boolean) : [];
  const endereco_dest = addrParts.join(" - ");

  const emit = getElement(infNFe, "emit");
  const enderEmit = emit ? getElement(emit, "enderEmit") : null;
  const cep_loja = enderEmit ? (getElement(enderEmit, "CEP")?.textContent || "").replace(/\D/g, "") : "";

  const total = getElement(infNFe, "total");
  const icmsTot = total ? getElement(total, "ICMSTot") : null;
  const vNFValue = icmsTot ? dec(getElement(icmsTot, "vNF")?.textContent) : 0;

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

  const refNFes: string[] = [];
  const nRefs = getElements(ide, "NFref");
  nRefs.forEach(ref => {
    const r = getElement(ref, "refNFe")?.textContent;
    if (r) refNFes.push(r);
  });

  const infAdic = getElement(infNFe, "infAdic");
  const infCpl = infAdic ? (getElement(infAdic, "infCpl")?.textContent || "") : "";
  const vendedor = extractVendedor(infCpl);

  const isPresencialPorTroco = vTroco > 0 || (pagamentos["01"] || 0) > 0;
  const isEnderecoReal = !!cep_dest && !!cep_loja && cep_dest !== cep_loja;
  const vTrocaVal = pagamentos["05"] || 0;
  const isTroca = vTrocaVal > 0;
  const difTroca = vNFValue - vTrocaVal;

  const valorTotalProds = items.reduce((acc, it) => acc + it.vProd, 0);
  const descontoTotal = items.reduce((acc, it) => acc + it.vDesc, 0);
  const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;
  
  const isAdicionalDoc = percentualDesconto >= ADICIONAL_PERCENT_MIN && percentualDesconto <= ADICIONAL_PERCENT_MAX;
  const isRetiradaOnline = tpIntegra === "2" && isEnderecoReal && !isPresencialPorTroco;
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
      canalConsolidado = "RETIRADA_ONLINE";
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
