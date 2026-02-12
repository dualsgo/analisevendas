
import { DetailedSaleRow } from "@/ai/flows/ai-sales-summary-report-flow";

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

function getNSResolver(prefix: string) {
  if (prefix === 'nfe') return 'http://www.portalfiscal.inf.br/nfe';
  return null;
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const ns = "http://www.portalfiscal.inf.br/nfe";

  const infNFe = xmlDoc.getElementsByTagNameNS(ns, "infNFe")[0];
  if (!infNFe) return null;

  const ide = infNFe.getElementsByTagNameNS(ns, "ide")[0];
  const tpNF = ide?.getElementsByTagNameNS(ns, "tpNF")[0]?.textContent;
  if (tpNF !== "1") return null;

  const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
  const nf = ide?.getElementsByTagNameNS(ns, "nNF")[0]?.textContent || "";
  const dhEmi = ide?.getElementsByTagNameNS(ns, "dhEmi")[0]?.textContent || "";

  const dest = infNFe.getElementsByTagNameNS(ns, "dest")[0];
  const enderDest = dest?.getElementsByTagNameNS(ns, "enderDest")[0];
  const emit = infNFe.getElementsByTagNameNS(ns, "emit")[0];
  const enderEmit = emit?.getElementsByTagNameNS(ns, "enderEmit")[0];

  const getAddr = (parent: Element | undefined) => ({
    xLgr: normAddr(parent?.getElementsByTagNameNS(ns, "xLgr")[0]?.textContent || ""),
    nro: normAddr(parent?.getElementsByTagNameNS(ns, "nro")[0]?.textContent || ""),
    xBairro: normAddr(parent?.getElementsByTagNameNS(ns, "xBairro")[0]?.textContent || ""),
    cMun: normAddr(parent?.getElementsByTagNameNS(ns, "cMun")[0]?.textContent || ""),
    UF: normAddr(parent?.getElementsByTagNameNS(ns, "UF")[0]?.textContent || ""),
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

  const vNF = parseFloat(infNFe.getElementsByTagNameNS(ns, "total")[0]?.getElementsByTagNameNS(ns, "vNF")[0]?.textContent || "0");
  
  const items: ParsedItem[] = [];
  const dets = infNFe.getElementsByTagNameNS(ns, "det");
  for (let i = 0; i < dets.length; i++) {
    const prod = dets[i].getElementsByTagNameNS(ns, "prod")[0];
    items.push({
      cProd: prod?.getElementsByTagNameNS(ns, "cProd")[0]?.textContent || "",
      xProd: prod?.getElementsByTagNameNS(ns, "xProd")[0]?.textContent || "",
      qCom: parseFloat(prod?.getElementsByTagNameNS(ns, "qCom")[0]?.textContent || "0"),
      vProd: parseFloat(prod?.getElementsByTagNameNS(ns, "vProd")[0]?.textContent || "0"),
      vDesc: parseFloat(prod?.getElementsByTagNameNS(ns, "vDesc")[0]?.textContent || "0"),
    });
  }

  const pagamentos: Record<string, number> = {};
  const detPags = infNFe.getElementsByTagNameNS(ns, "detPag");
  for (let i = 0; i < detPags.length; i++) {
    const tPag = detPags[i].getElementsByTagNameNS(ns, "tPag")[0]?.textContent || "";
    const vPag = parseFloat(detPags[i].getElementsByTagNameNS(ns, "vPag")[0]?.textContent || "0");
    pagamentos[tPag] = (pagamentos[tPag] || 0) + vPag;
  }

  const infCpl = infNFe.getElementsByTagNameNS(ns, "infAdic")[0]?.getElementsByTagNameNS(ns, "infCpl")[0]?.textContent || "";
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
