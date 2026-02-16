
import { DetailedSaleRow, Item } from "./types";

const ADICIONAL_PERCENT_MIN = 0.08;
const ADICIONAL_PERCENT_MAX = 0.12;
const MOSTRUARIO_PERCENT_MIN = 0.045;
const MOSTRUARIO_PERCENT_MAX = 0.055;

function dec(s: string | null | undefined): number {
  if (!s) return 0;
  const cleanS = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const num = parseFloat(cleanS);
  return isNaN(num) ? 0 : num;
}

function extractVendedor(infCpl: string): string {
  if (!infCpl) return "VENDEDOR NÃO IDENTIFICADO";
  const vLabel = /Vendedor:|Vend:/i;
  const match = infCpl.match(vLabel);
  if (!match || match.index === undefined) return "VENDEDOR NÃO IDENTIFICADO";
  const startIdx = match.index + match[0].length;
  let candidate = infCpl.substring(startIdx).trim();
  const delimiters = ["Email:", "E-mail:", "Telefone:", "ID PIX", ".::", ";", "ID:", "CPF:", "CNPJ:", "Endereço:", "Data:"];
  let endIdx = candidate.length;
  for (const d of delimiters) {
    const dIdx = candidate.toUpperCase().indexOf(d.toUpperCase());
    if (dIdx !== -1 && dIdx < endIdx) endIdx = dIdx;
  }
  const multiSpace = candidate.match(/\s{2,}/);
  if (multiSpace && multiSpace.index !== undefined && multiSpace.index < endIdx) endIdx = multiSpace.index;
  return candidate.substring(0, endIdx).trim() || "VENDEDOR NÃO IDENTIFICADO";
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Identificação de Cancelamento
    if (xmlDoc.getElementsByTagName("procEventoNFe").length > 0 || xmlDoc.getElementsByTagName("retCancNFe").length > 0) {
      return {
        is_cancelada: true,
        chave: (xmlDoc.getElementsByTagName("chNFe")[0]?.textContent || "DESC"),
        nf: "CANCELADA",
        dhEmi: "", vendedor: "", tpNF: 1, finNFe: 1, natOp: "CANCELAMENTO",
        canal: "CANCELADA", subcanal: "", canal_consolidado: "CANCELADA",
        is_adicional: false, is_adicional_suspeito: false, motivo_adicional: "",
        vNF: "0.00", itens_qtd: "0", desconto_total: "0.00", percentual_desconto: "0.00",
        is_troca: false, vTroca: "0.00", dif_troca: "0.00", is_devolucao: false,
        refNFe: [], refNFe_normalizadas: [], is_retirada_online: false, vTroco: "0.00",
        is_presencial_por_troco: false, tpIntegra: "", tem_desconto: false, tipo_desconto: "",
        status_auditoria: "", cep_dest: "", cep_loja: "", is_cep_diferente_da_loja: false,
        is_endereco_real: false, cpf_cnpj_dest: "", nome_dest: "", endereco_dest: "",
        tem_destinatario: false, itens: [], serie: "", modelo: ""
      };
    }

    if (!xmlDoc.documentElement || xmlDoc.getElementsByTagName("parsererror").length > 0) return null;

    const root = xmlDoc.documentElement;
    const ns = root.getAttribute("xmlns") || "";
    const getElement = (p: Element | Document | null, n: string): Element | null => {
      if (!p) return null;
      const parent = p instanceof Document ? p.documentElement : p;
      return (ns ? parent.getElementsByTagNameNS(ns, n) : parent.getElementsByTagName(n))[0] || null;
    };
    const getElements = (p: Element | Document | null, n: string): Element[] => {
      if (!p) return [];
      const parent = p instanceof Document ? p.documentElement : p;
      return Array.from(ns ? parent.getElementsByTagNameNS(ns, n) : parent.getElementsByTagName(n));
    };

    const infNFe = getElement(xmlDoc, "infNFe");
    if (!infNFe) return null;
    const ide = getElement(infNFe, "ide");
    if (!ide) return null;

    const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
    const nf = getElement(ide, "nNF")?.textContent || "";
    const tpNF = parseInt(getElement(ide, "tpNF")?.textContent || "1");
    const finNFe = parseInt(getElement(ide, "finNFe")?.textContent || "1");
    const natOp = getElement(ide, "natOp")?.textContent || "";
    const dhEmi = getElement(ide, "dhEmi")?.textContent || "";

    const dest = getElement(infNFe, "dest");
    const cpf_cnpj = dest ? (getElement(dest, "CPF")?.textContent || getElement(dest, "CNPJ")?.textContent || "") : "";
    const nome_dest = dest ? (getElement(dest, "xNome")?.textContent || "") : "";
    const enderDest = dest ? getElement(dest, "enderDest") : null;
    const cep_dest = enderDest ? (getElement(enderDest, "CEP")?.textContent || "").replace(/\D/g, "") : "";

    const emit = getElement(infNFe, "emit");
    const enderEmit = emit ? getElement(emit, "enderEmit") : null;
    const cep_loja = enderEmit ? (getElement(enderEmit, "CEP")?.textContent || "").replace(/\D/g, "") : "";

    const total = getElement(infNFe, "total");
    const icmsTot = total ? getElement(total, "ICMSTot") : null;
    const vNFValue = icmsTot ? dec(getElement(icmsTot, "vNF")?.textContent) : 0;

    const itemsList: Item[] = [];
    getElements(infNFe, "det").forEach(det => {
      const prod = getElement(det, "prod");
      if (prod) {
        itemsList.push({
          cProd: getElement(prod, "cProd")?.textContent || "",
          xProd: getElement(prod, "xProd")?.textContent || "",
          qCom: dec(getElement(prod, "qCom")?.textContent),
          vProd: dec(getElement(prod, "vProd")?.textContent),
          vDesc: dec(getElement(prod, "vDesc")?.textContent),
        });
      }
    });

    const pagamentos: Record<string, number> = {};
    let vTrocoPag = 0;
    let tpIntegra = "";
    const pag = getElement(infNFe, "pag");
    if (pag) {
      vTrocoPag = dec(getElement(pag, "vTroco")?.textContent);
      getElements(pag, "detPag").forEach(detPag => {
        const tPag = getElement(detPag, "tPag")?.textContent || "";
        const vPag = dec(getElement(detPag, "vPag")?.textContent);
        pagamentos[tPag] = (pagamentos[tPag] || 0) + vPag;
        const card = getElement(detPag, "card");
        if (card) tpIntegra = getElement(card, "tpIntegra")?.textContent || tpIntegra;
      });
    }

    const refNFes: string[] = [];
    getElements(ide, "NFref").forEach(ref => {
      const r = getElement(ref, "refNFe")?.textContent;
      if (r) refNFes.push(r);
    });

    const infAdic = getElement(infNFe, "infAdic");
    const infCpl = infAdic ? (getElement(infAdic, "infCpl")?.textContent || "") : "";
    const vendedor = extractVendedor(infCpl);

    const isPresencialPorTroco = vTrocoPag > 0 || (pagamentos["01"] || 0) > 0;
    const isEnderecoReal = !!cep_dest && !!cep_loja && cep_dest !== cep_loja;
    
    const vTrocaCredito = pagamentos["05"] || 0;
    const isTroca = vTrocaCredito > 0;
    const difTroca = vNFValue - vTrocaCredito;

    const valorTotalProds = itemsList.reduce((acc, it) => acc + it.vProd, 0);
    const descontoTotal = itemsList.reduce((acc, it) => acc + it.vDesc, 0);
    const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;
    
    const isAdicionalDoc = percentualDesconto >= ADICIONAL_PERCENT_MIN && percentualDesconto <= ADICIONAL_PERCENT_MAX;
    const isMostruario = percentualDesconto >= MOSTRUARIO_PERCENT_MIN && percentualDesconto <= MOSTRUARIO_PERCENT_MAX;
    
    const isRetiradaOnline = tpIntegra === "2" && isEnderecoReal && !isPresencialPorTroco;
    const isDevolucao = tpNF === 0 && (finNFe === 4 || natOp.toLowerCase().includes("devolucao") || natOp.toLowerCase().includes("entrada"));

    // Auditoria Inicial baseada em faixas
    let statusAuditoria = "NÃO CLASSIFICADO";
    if (isAdicionalDoc) statusAuditoria = "PADRÃO ADICIONAL";
    else if (isMostruario) statusAuditoria = "PADRÃO MOSTRUÁRIO";
    else if (descontoTotal > 0) statusAuditoria = "FORA DO PADRÃO";

    return {
      chave, nf, serie: getElement(ide, "serie")?.textContent || "", modelo: getElement(ide, "mod")?.textContent || "", dhEmi, vendedor,
      tpNF, finNFe, natOp,
      canal: isTroca ? (difTroca > 0.01 ? "TROCA_COM_DIFERENÇA" : "TROCA_SEM_DIFERENÇA") : (isRetiradaOnline ? "RETIRADA_ONLINE" : (isAdicionalDoc ? "RETIRADA_ADICIONAL" : "LOJA_FISICA")),
      subcanal: "", canal_consolidado: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "VENDA_LOJA"),
      is_adicional: isAdicionalDoc, is_adicional_suspeito: false, motivo_adicional: isAdicionalDoc ? "DESCONTO PARA ADICIONAL" : "",
      vNF: vNFValue.toFixed(2), itens_qtd: itemsList.reduce((acc, it) => acc + it.qCom, 0).toString(),
      desconto_total: descontoTotal.toFixed(2), percentual_desconto: percentualDesconto.toFixed(4),
      is_troca: isTroca, vTroca: vTrocaCredito.toFixed(2), dif_troca: difTroca.toFixed(2),
      is_devolucao: isDevolucao, refNFe: refNFes, refNFe_normalizadas: refNFes.map(r => r.replace(/\D/g, "")),
      is_retirada_online: isRetiradaOnline, vTroco: vTrocoPag.toFixed(2), is_presencial_por_troco: isPresencialPorTroco, tpIntegra,
      tem_desconto: descontoTotal > 0, tipo_desconto: isAdicionalDoc ? "ADICIONAL" : (isMostruario ? "MOSTRUÁRIO" : "PADRÃO"), 
      status_auditoria: statusAuditoria,
      cep_dest, cep_loja, is_cep_diferente_da_loja: isEnderecoReal, is_endereco_real: isEnderecoReal,
      cpf_cnpj_dest: cpf_cnpj, nome_dest, endereco_dest: "", tem_destinatario: !!cpf_cnpj,
      itens: itemsList,
      is_cancelada: false
    };
  } catch (e) {
    return null;
  }
}
