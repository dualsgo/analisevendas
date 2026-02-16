
"use client";

import React from "react";
import { DetailedSaleRow } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface ThermalReceiptProps {
  data: DetailedSaleRow;
}

export function ThermalReceipt({ data }: ThermalReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col items-center">
      <Button 
        onClick={handlePrint} 
        className="mb-6 print:hidden bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl gap-2 h-12 px-8"
      >
        <Printer className="w-4 h-4" /> IMPRIMIR 80MM
      </Button>

      <div 
        id="thermal-receipt" 
        className="w-[80mm] bg-white text-black p-4 font-mono text-[10px] leading-tight select-none print:shadow-none shadow-lg border"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Cabeçalho Fiscal */}
        <div className="text-center space-y-1 mb-3">
          <p className="font-bold text-xs">{data.emitente?.xNome || "EMISSOR DESCONHECIDO"}</p>
          <p>CNPJ: {data.emitente?.cnpj || "00.000.000/0000-00"}</p>
          <p>IE: {data.emitente?.ie || ""}</p>
          <p className="text-[8px]">{data.emitente?.endereco}</p>
          <div className="border-b border-dashed border-black my-1" />
          <p className="font-bold">DANFE NFC-e - Documento Auxiliar</p>
          <p className="font-bold">da Nota Fiscal de Consumidor Eletrônica</p>
          <p>Não permite crédito de ICMS</p>
          <div className="border-b border-dashed border-black my-1" />
          <div className="flex justify-between text-[9px] px-2">
            <span>MOD: {data.modelo || "65"}</span>
            <span>SÉRIE: {data.serie || "0"}</span>
            <span>Nº: {data.nf}</span>
          </div>
          <p>Emissão: {data.dhEmi ? format(parseISO(data.dhEmi), "dd/MM/yyyy HH:mm:ss") : "--"}</p>
        </div>

        {/* Consumidor */}
        <div className="mb-3">
          <p className="font-bold uppercase mb-1">Consumidor</p>
          {data.cpf_cnpj_dest ? (
            <div className="text-[9px]">
              <p>NOME: {data.nome_dest || "NÃO INFORMADO"}</p>
              <p>CPF: {data.cpf_cnpj_dest}</p>
            </div>
          ) : (
            <p className="text-[9px]">Consumidor não identificado</p>
          )}
          <div className="border-b border-dashed border-black my-1" />
        </div>

        {/* Itens */}
        <div className="mb-3">
          <div className="flex justify-between font-bold mb-1">
            <span>ITEM / DESCRIÇÃO / CÓDIGO</span>
          </div>
          <div className="flex justify-between font-bold text-[9px] mb-1">
            <span>QTD x VL UN</span>
            <span>VL TOTAL</span>
          </div>
          
          <div className="space-y-2">
            {data.itens.map((item, idx) => (
              <div key={idx} className="text-[9px]">
                <p className="uppercase">{idx + 1} {item.xProd}</p>
                <p>Cód: {item.cProd}</p>
                <div className="flex justify-between">
                  <span>{item.qCom.toFixed(3)} x {formatBRL(item.vProd / item.qCom)}</span>
                  <span>{formatBRL(item.vProd)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-b border-dashed border-black my-1" />
        </div>

        {/* Totais */}
        <div className="space-y-1 mb-3 text-[10px]">
          <div className="flex justify-between">
            <span>Qtd. Total de Itens</span>
            <span>{data.itens.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Valor Total Produtos</span>
            <span>{formatBRL(data.itens.reduce((acc, i) => acc + i.vProd, 0))}</span>
          </div>
          {parseFloat(data.desconto_total) > 0 && (
            <div className="flex justify-between">
              <span>Desconto</span>
              <span>-{formatBRL(parseFloat(data.desconto_total))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
            <span>VALOR A PAGAR R$</span>
            <span>{formatBRL(parseFloat(data.vNF))}</span>
          </div>
        </div>

        {/* Pagamentos */}
        <div className="mb-3 text-[9px]">
          <p className="font-bold uppercase mb-1">Forma de Pagamento</p>
          <div className="space-y-1">
            {data.pagamentos_detalhe && data.pagamentos_detalhe.length > 0 ? (
              data.pagamentos_detalhe.map((pag, pIdx) => (
                <div key={pIdx} className="flex justify-between">
                  <span>{getTPagLabel(pag.tPag)}</span>
                  <span>{formatBRL(pag.vPag)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between">
                <span>Não Identificado</span>
                <span>{formatBRL(parseFloat(data.vNF))}</span>
              </div>
            )}
          </div>
          <div className="border-b border-dashed border-black my-1" />
        </div>

        {/* Informações Complementares */}
        {data.infCpl && (
          <div className="mb-3 text-[8px] leading-tight">
            <p className="font-bold mb-1">Informações Complementares</p>
            <p className="whitespace-pre-wrap">{data.infCpl}</p>
            <div className="border-b border-dashed border-black my-1" />
          </div>
        )}

        {/* Autorização SEFAZ */}
        <div className="text-[8px] space-y-1 text-center">
          <p className="font-bold">CHAVE DE ACESSO</p>
          <p className="break-all">{data.chave || "0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"}</p>
          <div className="py-2">
            <p className="font-bold">PROTOCOLO DE AUTORIZAÇÃO</p>
            <p>{data.protocolo?.nProt || "---"} {data.protocolo?.dhRecbto ? format(parseISO(data.protocolo.dhRecbto), "dd/MM/yyyy HH:mm:ss") : ""}</p>
          </div>
          <p className="mt-4">Consulte pela Chave de Acesso em:</p>
          <p>www.sefaz.gov.br/consulta</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            border: none;
            padding: 0;
            margin: 0;
            box-shadow: none;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

function getTPagLabel(tPag: string): string {
  const map: Record<string, string> = {
    "01": "Dinheiro",
    "02": "Cheque",
    "03": "Cartão de Crédito",
    "04": "Cartão de Débito",
    "05": "Crédito Loja (Troca)",
    "10": "Vale Alimentação",
    "11": "Vale Refeição",
    "12": "Vale Presente",
    "13": "Vale Combustível",
    "15": "Boleto Bancário",
    "17": "Pagamento Instantâneo (PIX)",
    "90": "Sem Pagamento",
    "99": "Outros"
  };
  return map[tPag] || "Outros";
}
