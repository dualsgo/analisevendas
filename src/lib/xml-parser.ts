
import { DetailedSaleRow, Item } from "./types";

const ADICIONAL_PERCENT_MIN = 0.08;
const ADICIONAL_PERCENT_MAX = 0.12;
const TPAG_ONLINE_OK = new Set(["03", "04", "17"]);

function normText(s: string): string {
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

function getNS(doc: Document): string | null {
  const root = doc.documentElement;
  return root.getAttribute("xmlns") || null;
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const ns = getNS(xmlDoc);

  const getElement = (parent: Element | Document, name: string) => {
    return ns ? parent.getElementsByTagNameNS(ns, name)[0] : parent.getElementsByTagName(name)[0];
  };

  const getElements = (parent: Element | Document, name: string) => {
    return ns ? parent.getElementsByTagNameNS(ns, name) : parent.getElementsByTagName(name);
  };

  const infNFe = getElement(xmlDoc, "infNFe");
  if (!infNFe) return null;

  const ide = getElement(infNFe, "ide");
  const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
  const nf = getElement(ide!, "nNF")?.textContent || "";
  const serie = getElement(ide!, "serie")?.textContent || "";
  const modelo = getElement(ide!, "mod")?.textContent || "";
  const tpNF = parseInt(getElement(ide!, "tpNF")?.textContent || "1");
  const finNFe = parseInt(getElement(ide!, "finNFe")?.textContent || "1");
  const natOp = getElement(ide!, "natOp")?.textContent || "";
  const dhEmi = getElement(ide!, "dhEmi")?.textContent || "";

  // Destinatário
  const dest = getElement(infNFe, "dest");
  const cpf_cnpj = getElement(dest!, "CPF")?.textContent || getElement(dest!, "CNPJ")?.textContent || "";
  const nome_dest = getElement(dest!, "xNome")?.textContent || "";
  const enderDest = getElement(dest!, "enderDest");
  const cep_dest = (getElement(enderDest!, "CEP")?.textContent || "").replace(/\D/g, "");
  
  const addrParts = [
    getElement(enderDest!, "xLgr")?.textContent,
    getElement(enderDest!, "nro")?.textContent,
    getElement(enderDest!, "xBairro")?.textContent,
    getElement(enderDest!, "xMun")?.textContent,
    getElement(enderDest!, "UF")?.textContent
  ].filter(Boolean);
  const endereco_dest = addrParts.join(" - ");

  // Emitente (Loja)
  const emit = getElement(infNFe, "emit");
  const enderEmit = getElement(emit!, "enderEmit");
  const cep_loja = (getElement(enderEmit!, "CEP")?.textContent || "").replace(/\D/g, "");

  // Totais
  const total = getElement(infNFe, "total");
  const icmsTot = getElement(total!, "ICMSTot");
  const vNF = parseFloat(getElement(icmsTot!, "vNF")?.textContent || "0");

  // Itens
  const items: Item[] = [];
  const dets = getElements(infNFe, "det");
  for (let i = 0; i < dets.length; i++) {
    const prod = getElement(dets[i], "prod");
    items.push({
      cProd: getElement(prod!, "cProd")?.textContent || "",
      xProd: getElement(prod!, "xProd")?.textContent || "",
      qCom: parseFloat(getElement(prod!, "qCom")?.textContent || "0"),
      vProd: parseFloat(getElement(prod!, "vProd")?.textContent || "0"),
      vDesc: parseFloat(getElement(prod!, "vDesc")?.textContent || "0"),
    });
  }

  // Pagamentos e Troco
  const pagamentos: Record<string, number> = {};
  let vTroco = 0;
  let tpIntegra = "";
  
  const pag = getElement(infNFe, "pag");
  if (pag) {
    const vTrocoEl = getElement(pag, "vTroco");
    if (vTrocoEl) vTroco = parseFloat(vTrocoEl.textContent || "0");
    
    const detPags = getElements(pag, "detPag");
    for (let i = 0; i < detPags.length; i++) {
      const tPag = getElement(detPags[i], "tPag")?.textContent || "";
      const vPag = parseFloat(getElement(detPags[i], "vPag")?.textContent || "0");
      pagamentos[tPag] = (pagamentos[tPag] || 0) + vPag;
      
      const card = getElement(detPags[i], "card");
      if (card) {
        tpIntegra = getElement(card, "tpIntegra")?.textContent || tpIntegra;
      }
    }
  }

  // Notas Referenciadas
  const refNFes: string[] = [];
  const ideRef = getElements(ide!, "NFref");
  for (let i = 0; i < ideRef.length; i++) {
    const r = getElement(ideRef[i], "refNFe")?.textContent;
    if (r) refNFes.push(r);
  }

  // Vendedor
  const infAdic = getElement(infNFe, "infAdic");
  const infCpl = getElement(infAdic!, "infCpl")?.textContent || "";
  const vendedor = extractVendedor(infCpl) || "SEM_VENDEDOR";

  // Lógica de Classificação
  const isPresencialPorTroco = vTroco > 0 || (pagamentos["01"] || 0) > 0;
  const isEnderecoReal = !!cep_dest && !!cep_loja && cep_dest !== cep_loja;
  const vTrocaVal = pagamentos["05"] || 0;
  const isTroca = vTrocaVal > 0;
  const difTroca = vNF - vTrocaVal;

  const valorTotalProds = items.reduce((acc, it) => acc + it.vProd, 0);
  const descontoTotal = items.reduce((acc, it) => acc + it.vDesc, 0);
  const percentualDesconto = valorTotalProds > 0 ? descontoTotal / valorTotalProds : 0;
  const isAdicionalDoc = percentualDesconto >= ADICIONAL_PERCENT_MIN && percentualDesconto <= ADICIONAL_PERCENT_MAX;

  const isOperacaoNaoPresencial = tpIntegra === "2";
  const isRetiradaOnline = isOperacaoNaoPresencial && isEnderecoReal && !isPresencialPorTroco;
  const isDevolucao = tpNF === 0 && (finNFe === 4 || natOp.toLowerCase().includes("devolucao"));

  let canal = "LOJA_FISICA";
  let subcanal = "LOJA_FISICA";
  let canalConsolidado = "VENDA_LOJA";
  let isAdicional = false;
  let motivoAdicional = "NAO_ADICIONAL";

  if (tpNF === 1) {
    if (isTroca) {
      canal = difTroca > 0.01 ? "TROCA_COM_DIFERENCA" : "TROCA_SEM_DIFERENCA";
      subcanal = canal;
      canalConsolidado = "TROCA";
    } else if (isPresencialPorTroco) {
      canal = "LOJA_FISICA";
      canalConsolidado = "VENDA_LOJA";
    } else if (isRetiradaOnline) {
      canal = "RETIRADA_ONLINE";
      subcanal = "RETIRADA_ONLINE";
      canalConsolidado = "RETIRADA_ONLINE";
    } else if (isAdicionalDoc) {
      canal = "RETIRADA_ADICIONAL";
      subcanal = "ADICIONAL";
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
    canal, subcanal, canal_consolidado: canalConsolidado,
    is_adicional: isAdicional,
    is_adicional_suspeito: false,
    motivo_adicional: motivoAdicional,
    vNF: vNF.toFixed(2),
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
