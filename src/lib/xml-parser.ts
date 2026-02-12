
import { DetailedSaleRow } from "./types";

const ADICIONAL_DESC_MIN = 0.080;
const ADICIONAL_DESC_MAX = 0.105;
const TPAG_ONLINE_OK = new Set(["03", "04"]);

export interface ParsedItem {
  cProd: string;
  xProd: string;
  qCom: number;
  vProd: number;
  vDesc: number;
}

function normAddr(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[.,;:/\\()\[\]{}\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVendedor(infCpl: string): string {
  if (!infCpl) return "SEM_VENDEDOR";
  const m = infCpl.match(/Vendedor:\s*(.+?)(?:\s+E-?mail:|\s+Email:|\s+Telefone:|\s+ID\s+PIX|\s+\.\:\:|\s*$)/i);
  if (m) return m[1].trim();
  const m2 = infCpl.match(/Vendedor:\s*(.+)$/i);
  return m2 ? m2[1].trim() : "SEM_VENDEDOR";
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  // Tenta encontrar a tag infNFe independente do namespace, pois alguns geradores variam
  let infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
  if (!infNFe) {
    const ns = "http://www.portalfiscal.inf.br/nfe";
    infNFe = xmlDoc.getElementsByTagNameNS(ns, "infNFe")[0];
  }

  if (!infNFe) return null;

  const ide = infNFe.getElementsByTagName("ide")[0] || infNFe.getElementsByTagNameNS("*", "ide")[0];
  
  // Alguns arquivos podem não ter tpNF explicitamente como esperado, mas ainda ser válidos
  // Para análise de vendas, tpNF="1" é Saída.
  const tpNF = ide?.getElementsByTagName("tpNF")[0]?.textContent || ide?.getElementsByTagNameNS("*", "tpNF")[0]?.textContent;
  
  // Se for entrada (tpNF=0), ignoramos para análise de vendas
  if (tpNF === "0") return null;

  const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
  const nf = ide?.getElementsByTagName("nNF")[0]?.textContent || ide?.getElementsByTagNameNS("*", "nNF")[0]?.textContent || "";
  const dhEmi = ide?.getElementsByTagName("dhEmi")[0]?.textContent || ide?.getElementsByTagNameNS("*", "dhEmi")[0]?.textContent || "";

  const dest = infNFe.getElementsByTagName("dest")[0] || infNFe.getElementsByTagNameNS("*", "dest")[0];
  const enderDest = dest?.getElementsByTagName("enderDest")[0] || dest?.getElementsByTagNameNS("*", "enderDest")[0];
  const emit = infNFe.getElementsByTagName("emit")[0] || infNFe.getElementsByTagNameNS("*", "emit")[0];
  const enderEmit = emit?.getElementsByTagName("enderEmit")[0] || emit?.getElementsByTagNameNS("*", "enderEmit")[0];

  const getAddr = (parent: Element | undefined) => ({
    xLgr: normAddr(parent?.getElementsByTagName("xLgr")[0]?.textContent || parent?.getElementsByTagNameNS("*", "xLgr")[0]?.textContent || ""),
    nro: normAddr(parent?.getElementsByTagName("nro")[0]?.textContent || parent?.getElementsByTagNameNS("*", "nro")[0]?.textContent || ""),
    xBairro: normAddr(parent?.getElementsByTagName("xBairro")[0]?.textContent || parent?.getElementsByTagNameNS("*", "xBairro")[0]?.textContent || ""),
    cMun: normAddr(parent?.getElementsByTagName("cMun")[0]?.textContent || parent?.getElementsByTagNameNS("*", "cMun")[0]?.textContent || ""),
    UF: normAddr(parent?.getElementsByTagName("UF")[0]?.textContent || parent?.getElementsByTagNameNS("*", "UF")[0]?.textContent || ""),
  });

  const addrDest = getAddr(enderDest);
  const addrEmit = getAddr(enderEmit);

  let pickupMatch = 0;
  if (enderDest) {
    if (addrDest.xLgr === addrEmit.xLgr && addrDest.xLgr) pickupMatch++;
    if (addrDest.nro === addrEmit.nro && addrDest.nro) pickupMatch++;
    if (addrDest.xBairro === addrEmit.xBairro && addrDest.xBairro) pickupMatch++;
    if (addrDest.cMun === addrEmit.cMun && addrDest.cMun) pickupMatch++;
    if (addrDest.UF === addrEmit.UF && addrDest.UF) pickupMatch++;
  }

  const totalTag = infNFe.getElementsByTagName("total")[0] || infNFe.getElementsByTagNameNS("*", "total")[0];
  const vNFTag = totalTag?.getElementsByTagName("vNF")[0] || totalTag?.getElementsByTagNameNS("*", "vNF")[0];
  const vNF = parseFloat(vNFTag?.textContent || "0");
  
  const items: ParsedItem[] = [];
  const dets = infNFe.getElementsByTagName("det").length > 0 ? infNFe.getElementsByTagName("det") : infNFe.getElementsByTagNameNS("*", "det");
  
  for (let i = 0; i < dets.length; i++) {
    const prod = dets[i].getElementsByTagName("prod")[0] || dets[i].getElementsByTagNameNS("*", "prod")[0];
    items.push({
      cProd: prod?.getElementsByTagName("cProd")[0]?.textContent || prod?.getElementsByTagNameNS("*", "cProd")[0]?.textContent || "",
      xProd: prod?.getElementsByTagName("xProd")[0]?.textContent || prod?.getElementsByTagNameNS("*", "xProd")[0]?.textContent || "",
      qCom: parseFloat(prod?.getElementsByTagName("qCom")[0]?.textContent || prod?.getElementsByTagNameNS("*", "qCom")[0]?.textContent || "0"),
      vProd: parseFloat(prod?.getElementsByTagName("vProd")[0]?.textContent || prod?.getElementsByTagNameNS("*", "vProd")[0]?.textContent || "0"),
      vDesc: parseFloat(prod?.getElementsByTagName("vDesc")[0]?.textContent || prod?.getElementsByTagNameNS("*", "vDesc")[0]?.textContent || "0"),
    });
  }

  const pagamentos: Record<string, number> = {};
  const detPags = infNFe.getElementsByTagName("detPag").length > 0 ? infNFe.getElementsByTagName("detPag") : infNFe.getElementsByTagNameNS("*", "detPag");
  
  for (let i = 0; i < detPags.length; i++) {
    const tPag = detPags[i].getElementsByTagName("tPag")[0]?.textContent || detPags[i].getElementsByTagNameNS("*", "tPag")[0]?.textContent || "";
    const vPag = parseFloat(detPags[i].getElementsByTagName("vPag")[0]?.textContent || detPags[i].getElementsByTagNameNS("*", "vPag")[0]?.textContent || "0");
    pagamentos[tPag] = (pagamentos[tPag] || 0) + vPag;
  }

  const infAdic = infNFe.getElementsByTagName("infAdic")[0] || infNFe.getElementsByTagNameNS("*", "infAdic")[0];
  const infCpl = infAdic?.getElementsByTagName("infCpl")[0]?.textContent || infAdic?.getElementsByTagNameNS("*", "infCpl")[0]?.textContent || "";
  const vendedor = extractVendedor(infCpl);

  const totalItems = items.reduce((acc, it) => acc + it.qCom, 0);
  const vTroca = pagamentos["05"] || 0;
  const isTroca = vTroca > 0;
  const difTroca = vNF - vTroca;

  const tpagsNon05 = Object.keys(pagamentos).filter(k => k !== "05" && pagamentos[k] > 0);
  const isOnlinePayment = tpagsNon05.length > 0 && tpagsNon05.every(k => TPAG_ONLINE_OK.has(k));

  const isAdicionalDoc = items.some(it => {
    if (it.vProd <= 0 || it.vDesc <= 0) return false;
    const ratio = it.vDesc / it.vProd;
    return ratio >= ADICIONAL_DESC_MIN && ratio <= ADICIONAL_DESC_MAX;
  });

  const isRetirada = !isTroca && !!enderDest && pickupMatch >= 3 && isOnlinePayment;
  const isRetiradaAdicional = isRetirada && isAdicionalDoc;

  let canal = "LOJA_FISICA";
  if (isTroca) {
    canal = difTroca > 0.01 ? "TROCA_COM_DIFERENCA" : "TROCA_SEM_DIFERENCA";
  } else if (isRetirada) {
    canal = isRetiradaAdicional ? "RETIRADA_ADICIONAL" : "RETIRADA_ONLINE";
  }

  return {
    chave,
    nf,
    dhEmi,
    vendedor,
    canal,
    vNF: vNF.toFixed(2),
    itens_qtd: totalItems.toString(),
    is_troca: isTroca,
    vTroca: vTroca.toFixed(2),
    dif_troca: difTroca.toFixed(2),
    is_retirada: isRetirada,
    is_retirada_adicional: isRetiradaAdicional,
    pickup_match_fields: pickupMatch,
  };
}
