"use client";

import { DetailedSaleRow, Item } from "./types";

const SLP_CODES = [
  '5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', 
  '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', 
  '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', 
  '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', 
  '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', 
  '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', 
  '5146502', '5146503'
];

const NEAR_FREE_MAX = 0.10;
const RESIDUAL_MAX = 0.10;
const UNIT_BRUTO_MIN = 1.00;

function dec(s: string | null | undefined): number {
  if (!s) return 0;
  const cleanS = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const num = parseFloat(cleanS);
  return isNaN(num) ? 0 : num;
}

const delimiters = ["Email:", "E-mail:", "Telefone:", "ID PIX", ".::", ";", "ID:", "CPF:", "CNPJ:", "Endereço:", "Data:", "Op:", "Mat:"];

function extractVendedor(infCpl: string): string {
  if (!infCpl) return "COLABORADOR NÃO IDENTIFICADO";
  const vLabel = /Vendedor:|Vend:|Atendente:|Op:|Operador:/i;
  const match = infCpl.match(vLabel);
  if (!match || match.index === undefined) return "COLABORADOR NÃO IDENTIFICADO";
  const startIdx = match.index + match[0].length;
  let candidate = infCpl.substring(startIdx).trim();

  let endIdx = candidate.length;
  for (const d of delimiters) {
    const dIdx = candidate.toUpperCase().indexOf(d.toUpperCase());
    if (dIdx !== -1 && dIdx < endIdx) endIdx = dIdx;
  }
  
  let result = candidate.substring(0, endIdx).trim().toUpperCase();
  const trailingIdMatch = result.match(/\s+\d+$/);
  if (trailingIdMatch && trailingIdMatch.index) {
    result = result.substring(0, trailingIdMatch.index).trim();
  }

  if (result === "LIDIANE B" || result === "BARBOSA") return "BARBOSA";
  if (result === "LIDIANE" || result === "LIDI") return "LIDI";

  return result || "COLABORADOR NÃO IDENTIFICADO";
}

function getMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function parseXml(xmlString: string): DetailedSaleRow | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // FUNÇÕES AUXILIARES DE BUSCA UNIVERSAL (Ignoram Namespaces)
    const findByLocalName = (parent: Element | Document, name: string): Element | null => {
      const all = parent.getElementsByTagName("*");
      for (let i = 0; i < all.length; i++) {
        if (all[i].localName === name) return all[i];
      }
      return null;
    };

    const findAllByLocalName = (parent: Element | Document, name: string): Element[] => {
      const results: Element[] = [];
      const all = parent.getElementsByTagName("*");
      for (let i = 0; i < all.length; i++) {
        if (all[i].localName === name) results.push(all[i]);
      }
      return results;
    };

    // Detecção de cancelamento
    if (findByLocalName(xmlDoc, "procEventoNFe") || findByLocalName(xmlDoc, "retCancNFe")) {
      return {
        is_cancelada: true,
        chave: findByLocalName(xmlDoc, "chNFe")?.textContent || "DESC",
        nf: "CANCELADA",
        dhEmi: "", vendedor: "", tpNF: 1, finNFe: 1, natOp: "CANCELAMENTO", indPres: 0,
        canal: "CANCELADA", subcanal: "", canal_consolidado: "CANCELADA",
        is_adicional: false, is_adicional_suspeito: false, motivo_adicional: "",
        vNF: "0.00", itens_qtd: "0", desconto_total: "0.00", percentual_desconto: "0.00",
        is_troca: false, vTroca: "0.00", dif_troca: "0.00", is_devolucao: false,
        refNFe: [], refNFe_normalizadas: [], is_retirada_online: false, vTroco: "0.00",
        is_presencial_por_troco: false, tpIntegra: "", tem_desconto: false, tipo_desconto: "",
        status_auditoria: "", cep_dest: "", cep_loja: "", is_cep_diferente_da_loja: false,
        is_endereco_real: false, cpf_cnpj_dest: "", nome_dest: "", endereco_dest: "",
        tem_destinatario: false, itens: [], serie: "", modelo: "", pickup_match_fields: 0
      };
    }

    const infNFe = findByLocalName(xmlDoc, "infNFe");
    if (!infNFe) return null;
    
    const ide = findByLocalName(infNFe, "ide");
    if (!ide) return null;

    const chave = infNFe.getAttribute("Id")?.replace("NFe", "") || "";
    const nf = findByLocalName(ide, "nNF")?.textContent || "";
    const tpNF = parseInt(findByLocalName(ide, "tpNF")?.textContent || "1");
    const finNFe = parseInt(findByLocalName(ide, "finNFe")?.textContent || "1");
    const natOp = findByLocalName(ide, "natOp")?.textContent || "";
    const dhEmi = findByLocalName(ide, "dhEmi")?.textContent || findByLocalName(ide, "dEmi")?.textContent || "";
    const indPres = parseInt(findByLocalName(ide, "indPres")?.textContent || "0");

    const dest = findByLocalName(infNFe, "dest");
    const cpf_cnpj = dest ? (findByLocalName(dest, "CPF")?.textContent || findByLocalName(dest, "CNPJ")?.textContent || "") : "";
    const nome_dest = dest ? (findByLocalName(dest, "xNome")?.textContent || "") : "";
    
    const enderDest = dest ? findByLocalName(dest, "enderDest") : null;
    const cep_dest = enderDest ? (findByLocalName(enderDest, "CEP")?.textContent || "").replace(/\D/g, "") : "";
    const nro_dest = enderDest ? (findByLocalName(enderDest, "nro")?.textContent || "") : "";

    const total = findByLocalName(infNFe, "total");
    const icmsTot = total ? findByLocalName(total, "ICMSTot") : null;
    const vNFValue = icmsTot ? dec(findByLocalName(icmsTot, "vNF")?.textContent) : 0;

    const itemsList: Item[] = [];
    let nearFreeCount = 0;
    let residualCount = 0;
    const unitPricesBruto: number[] = [];
    let totalDescontoNota = 0;

    findAllByLocalName(infNFe, "det").forEach(det => {
      const prod = findByLocalName(det, "prod");
      if (prod) {
        const cProd = findByLocalName(prod, "cProd")?.textContent || "";
        const vProd = dec(findByLocalName(prod, "vProd")?.textContent);
        const vDesc = dec(findByLocalName(prod, "vDesc")?.textContent);
        const qCom = dec(findByLocalName(prod, "qCom")?.textContent);
        
        const unitBruto = vProd / qCom;
        const unitFinal = (vProd - vDesc) / qCom;
        const unitDesc = vDesc / qCom;

        if (unitBruto >= UNIT_BRUTO_MIN) {
          unitPricesBruto.push(unitBruto);
          totalDescontoNota += vDesc;
          if (unitFinal > 0 && unitFinal <= NEAR_FREE_MAX) nearFreeCount++;
          if (unitDesc > 0 && unitDesc <= RESIDUAL_MAX) residualCount++;
        }

        itemsList.push({
          cProd,
          xProd: findByLocalName(prod, "xProd")?.textContent || "",
          qCom, vProd, vDesc, is_campanha: false
        });
      }
    });

    const precoBase = getMedian(unitPricesBruto);
    let isCampanhaNota = precoBase > 0 && (nearFreeCount >= 1) && (residualCount >= 1 || nearFreeCount >= 2);

    if (isCampanhaNota) {
      itemsList.forEach(item => { item.is_campanha = true; });
    }

    const pagamentosDet: Array<{ tPag: string, vPag: number, tpIntegra?: string }> = [];
    let vTrocoPag = 0;
    let tpIntegraValue = "";
    const pag = findByLocalName(infNFe, "pag");
    if (pag) {
      vTrocoPag = dec(findByLocalName(pag, "vTroco")?.textContent);
      findAllByLocalName(pag, "detPag").forEach(detPag => {
        const tPag = findByLocalName(detPag, "tPag")?.textContent || "";
        const vPag = dec(findByLocalName(detPag, "vPag")?.textContent);
        const card = findByLocalName(detPag, "card");
        const tpInt = card ? findByLocalName(card, "tpIntegra")?.textContent || "" : undefined;
        pagamentosDet.push({ tPag, vPag, tpIntegra: tpInt });
        if (tpInt) tpIntegraValue = tpInt;
      });
    }

    const protNFe = findByLocalName(xmlDoc, "protNFe");
    const infProt = protNFe ? findByLocalName(protNFe, "infProt") : null;
    const protocoloData = infProt ? {
      nProt: findByLocalName(infProt, "nProt")?.textContent || "",
      dhRecbto: findByLocalName(infProt, "dhRecbto")?.textContent || "",
      cStat: findByLocalName(infProt, "cStat")?.textContent || "",
      xMotivo: findByLocalName(infProt, "xMotivo")?.textContent || ""
    } : undefined;

    const infAdic = findByLocalName(infNFe, "infAdic");
    const infCpl = findByLocalName(infAdic || xmlDoc, "infCpl")?.textContent || "";
    const vendedorRaw = extractVendedor(infCpl);

    // Lógica de Retirada Online (Carioca Shopping / Padrão Ri Happy)
    const isEnderecoLoja = (cep_dest === "21210623" || cep_dest === "21211007") && nro_dest === "909";
    const hasTextualPickupEvidence = /RETIRADA|PICKUP|SITE|ECOMM/i.test(infCpl);
    const isRetiradaOnline = isEnderecoLoja && tpIntegraValue === "2" || (isEnderecoLoja && hasTextualPickupEvidence);

    const vTrocaCredito = pagamentosDet.filter(p => p.tPag === "05").reduce((acc, p) => acc + p.vPag, 0);
    const isTroca = vTrocaCredito > 0;
    
    const valorTotalProds = itemsList.reduce((acc, it) => acc + it.vProd, 0);
    const descontoTotal = itemsList.reduce((acc, it) => acc + it.vDesc, 0);
    const percentualDesconto = valorTotalProds > 0 ? (descontoTotal / valorTotalProds) : 0;

    const hasSlpDiscount = itemsList.some(it => SLP_CODES.includes(it.cProd) && it.vDesc > 0);
    let tipoDescontoFinal = "PADRÃO";
    if (hasSlpDiscount) tipoDescontoFinal = itemsList.some(it => !SLP_CODES.includes(it.cProd) && it.vDesc > 0) ? "CAMPANHA + ALERTA" : "CAMPANHA";
    else if (isCampanhaNota) tipoDescontoFinal = "CAMPANHA";
    else if (percentualDesconto >= 0.08 && percentualDesconto <= 0.12) tipoDescontoFinal = "ADICIONAL";

    return {
      chave, nf, dhEmi, vendedor: vendedorRaw, tpNF, finNFe, natOp, indPres,
      serie: findByLocalName(ide, "serie")?.textContent || "",
      modelo: findByLocalName(ide, "mod")?.textContent || "",
      canal: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "LOJA_FISICA"),
      canal_consolidado: isTroca ? "TROCA" : (isRetiradaOnline ? "RETIRADA_ONLINE" : "VENDA_LOJA"),
      subcanal: "", is_adicional: false, is_adicional_suspeito: false, motivo_adicional: "",
      vNF: vNFValue.toFixed(2), itens_qtd: itemsList.reduce((acc, it) => acc + it.qCom, 0).toString(),
      desconto_total: descontoTotal.toFixed(2), percentual_desconto: percentualDesconto.toFixed(4),
      is_troca, vTroca: vTrocaCredito.toFixed(2), dif_troca: (vNFValue - vTrocaCredito).toFixed(2),
      is_devolucao: tpNF === 0 && (finNFe === 4 || natOp.toLowerCase().includes("devolucao")),
      refNFe: findAllByLocalName(ide, "NFref").map(r => findByLocalName(r, "refNFe")?.textContent || ""),
      refNFe_normalizadas: findAllByLocalName(ide, "NFref").map(r => (findByLocalName(r, "refNFe")?.textContent || "").replace(/\D/g, "")),
      is_retirada_online: isRetiradaOnline, vTroco: vTrocoPag.toFixed(2), is_presencial_por_troco: !isRetiradaOnline,
      tpIntegra: tpIntegraValue, tem_desconto: descontoTotal > 0, tipo_desconto: tipoDescontoFinal,
      status_auditoria: descontoTotal > 0 ? "DESCONTO" : "LIMPO",
      cep_dest, cep_loja: "", is_cep_diferente_da_loja: false, is_endereco_real: !!cep_dest,
      cpf_cnpj_dest: cpf_cnpj, nome_dest, endereco_dest: "", tem_destinatario: !!cpf_cnpj,
      itens: itemsList, is_cancelada: false, pickup_match_fields: isEnderecoLoja ? 5 : 0,
      protocolo: protocoloData, pagamentos_detalhe: pagamentosDet, infCpl
    };
  } catch (e) { return null; }
}
