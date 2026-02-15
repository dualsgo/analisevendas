
"use client";

import React, { useMemo, useState } from "react";
import { 
  DetailedSaleRow, 
  ChannelSummaryRow, 
  VendorSummaryRow,
  VinculoTroca
} from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, Users, ShoppingBag, Gift, AlertTriangle, RefreshCw, BarChart, TrendingUp, AlertCircle, RefreshCcw } from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesSummary({ data, vinculos }: SalesSummaryProps) {
  const { toast } = useToast();
  const saidas = useMemo(() => data.filter(r => r.tpNF === 1), [data]);

  // Agregações de Dados
  const channelSummary = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    saidas.forEach(r => {
      const canal = r.canal;
      if (!agg[canal]) agg[canal] = { cupons: 0, venda: 0, itens: 0 };
      agg[canal].cupons++;
      agg[canal].venda += parseFloat(r.vNF);
      agg[canal].itens += parseFloat(r.itens_qtd);
    });

    return Object.entries(agg).map(([canal, d]): ChannelSummaryRow => ({
      Canal: canal,
      Cupons: d.cupons.toString(),
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens.toString(),
      TKM: (d.venda / d.cupons).toFixed(2),
      PA: (d.itens / d.cupons).toFixed(2),
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const totalOperador = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    saidas.forEach(r => {
      if (!agg[r.vendedor]) agg[r.vendedor] = { cupons: 0, venda: 0, itens: 0 };
      agg[r.vendedor].cupons++;
      agg[r.vendedor].venda += parseFloat(r.vNF);
      agg[r.vendedor].itens += parseFloat(r.itens_qtd);
    });
    return Object.entries(agg).map(([vend, d]) => ({
      Vendedor: vend,
      Cupons: d.cupons,
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens,
      TKM: (d.venda / d.cupons).toFixed(2),
      PA: (d.itens / d.cupons).toFixed(2),
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const auditDescontos = useMemo(() => saidas.filter(r => r.tem_desconto && !r.is_troca), [saidas]);
  const suspeitos = useMemo(() => saidas.filter(r => r.is_adicional_suspeito), [saidas]);
  const totalAdicionaisValidos = useMemo(() => saidas.filter(r => r.is_adicional).length, [saidas]);

  // WhatsApp
  const copyWhats = () => {
    let text = "📊 *RESUMO DE PERFORMANCE*\n\n";
    totalOperador.forEach(v => {
      text += `🧑‍💼 *${v.Vendedor}*\n`;
      text += `   Venda: R$ ${parseFloat(v.Venda_Total).toLocaleString('pt-BR')}\n`;
      text += `   PA: ${v.PA} | TKM: R$ ${v.TKM}\n\n`;
    });
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Relatório copiado para o WhatsApp." });
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Menu de Abas Horizontal */}
      <Tabs defaultValue="geral" className="w-full">
        <div className="sticky top-16 bg-slate-50 z-30 pt-2 pb-4 border-b border-slate-200 overflow-x-auto">
          <TabsList className="bg-transparent p-0 flex justify-start h-auto gap-6 min-w-max">
            <TabsTrigger value="geral" className="tab-trigger-custom">Visão Geral</TabsTrigger>
            <TabsTrigger value="conversao" className="tab-trigger-custom flex items-center gap-2">
              Conversão por Vendedor 
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {totalAdicionaisValidos + suspeitos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="venda-loja" className="tab-trigger-custom">Venda Loja</TabsTrigger>
            <TabsTrigger value="suspeitos" className="tab-trigger-custom flex items-center gap-2">
              Suspeitos 
              <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {suspeitos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="matriz" className="tab-trigger-custom">Matriz Canal x Operador</TabsTrigger>
            <TabsTrigger value="trocas" className="tab-trigger-custom">Trocas</TabsTrigger>
            <TabsTrigger value="whatsapp" className="tab-trigger-custom">WhatsApp</TabsTrigger>
          </TabsList>
        </div>

        {/* --- ABA VISÃO GERAL --- */}
        <TabsContent value="geral" className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {channelSummary.map((c) => (
              <Card key={c.Canal} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="p-5 border-b border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.Canal}</p>
                  <CardTitle className="text-xl font-black text-slate-800">
                    R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <ul className="space-y-2">
                    <li className="flex justify-between text-xs">
                      <span className="text-slate-500">Cupons:</span>
                      <span className="font-bold text-slate-700">{c.Cupons}</span>
                    </li>
                    <li className="flex justify-between text-xs">
                      <span className="text-slate-500">Itens:</span>
                      <span className="font-bold text-slate-700">{c.Itens_Total}</span>
                    </li>
                    <li className="flex justify-between text-xs">
                      <span className="text-slate-500">TKM:</span>
                      <span className="font-bold text-indigo-600">R$ {c.TKM}</span>
                    </li>
                    <li className="flex justify-between text-xs">
                      <span className="text-slate-500">PA:</span>
                      <span className="font-bold text-emerald-600">{c.PA}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Detalhamento por Canal</h3>
              <Button variant="ghost" size="sm" onClick={() => exportToCsv("canais.csv", channelSummary, ["Canal", "Cupons", "Venda_Total", "PA"])} className="text-indigo-600 text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1" /> EXPORTAR
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Canal</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Itens</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Venda Total</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">TKM</TableHead>
                  <TableHead className="text-center text-[10px] font-bold uppercase">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelSummary.map((r) => (
                  <TableRow key={r.Canal} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-700 py-3">{r.Canal}</TableCell>
                    <TableCell className="text-right text-slate-600">{r.Cupons}</TableCell>
                    <TableCell className="text-right text-slate-600">{r.Itens_Total}</TableCell>
                    <TableCell className="text-right font-mono font-bold">R$ {parseFloat(r.Venda_Total).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right text-indigo-600 font-medium">R$ {r.TKM}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{r.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Total por Operador</h3>
              <Button variant="ghost" size="sm" onClick={() => exportToCsv("operadores.csv", totalOperador, ["Vendedor", "Venda_Total"])} className="text-indigo-600 text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1" /> EXPORTAR
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Venda Total</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">TKM</TableHead>
                  <TableHead className="text-center text-[10px] font-bold uppercase">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => (
                  <TableRow key={v.Vendedor}>
                    <TableCell className="font-semibold text-slate-700">{v.Vendedor}</TableCell>
                    <TableCell className="text-right">{v.Cupons}</TableCell>
                    <TableCell className="text-right font-mono font-bold">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right text-indigo-600">R$ {v.TKM}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{v.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA CONVERSÃO POR VENDEDOR --- */}
        <TabsContent value="conversao" className="mt-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <p className="text-3xl font-black text-indigo-600">{saidas.filter(r => r.is_retirada_online).length}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Atendimentos</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <p className="text-3xl font-black text-emerald-600">{totalAdicionaisValidos}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Adicionais</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <p className="text-3xl font-black text-orange-600">{suspeitos.length}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Suspeitos</p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <p className="text-3xl font-black text-blue-600">
                {saidas.filter(r => r.is_retirada_online).length > 0 
                  ? ((totalAdicionaisValidos + suspeitos.length) / saidas.filter(r => r.is_retirada_online).length * 100).toFixed(1) 
                  : "0"}%
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Conversão</p>
            </div>
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <h3 className="font-bold text-slate-800 text-sm">Conversão de Adicionais por Vendedor</h3>
              <Button variant="ghost" size="sm" className="text-indigo-600 text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1" /> EXPORTAR
              </Button>
            </div>
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="bg-slate-100/80">
                  <TableHead rowSpan={2} className="border-r font-bold">Operador</TableHead>
                  <TableHead colSpan={2} className="text-center border-r font-bold text-slate-500 uppercase text-[10px]">Atendimentos</TableHead>
                  <TableHead colSpan={2} className="text-center border-r font-bold text-emerald-600 uppercase text-[10px]">Adicionais</TableHead>
                  <TableHead colSpan={2} className="text-center font-bold text-blue-600 uppercase text-[10px]">Métricas</TableHead>
                </TableRow>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-center text-[10px] border-r">QTD</TableHead>
                  <TableHead className="text-center text-[10px] border-r">VALOR</TableHead>
                  <TableHead className="text-center text-[10px] border-r">QTD</TableHead>
                  <TableHead className="text-center text-[10px] border-r">VALOR</TableHead>
                  <TableHead className="text-center text-[10px] border-r">TAXA %</TableHead>
                  <TableHead className="text-center text-[10px]">TKM/PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => {
                  const ops = saidas.filter(r => r.vendedor === v.Vendedor && r.is_retirada_online);
                  const adics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito));
                  const valorAdics = adics.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                  const valorOps = ops.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                  const taxa = ops.length > 0 ? (adics.length / ops.length * 100).toFixed(1) : "0";
                  
                  return (
                    <TableRow key={v.Vendedor}>
                      <TableCell className="font-bold border-r">{v.Vendedor}</TableCell>
                      <TableCell className="text-center border-r">{ops.length}</TableCell>
                      <TableCell className="text-right border-r">R$ {valorOps.toFixed(2)}</TableCell>
                      <TableCell className="text-center border-r font-bold text-emerald-700">{adics.length}</TableCell>
                      <TableCell className="text-right border-r font-bold text-emerald-700">R$ {valorAdics.toFixed(2)}</TableCell>
                      <TableCell className="text-center border-r font-black text-blue-600">{taxa}%</TableCell>
                      <TableCell className="text-center text-[10px]">
                        R$ {(valorAdics / (adics.length || 1)).toFixed(2)} <br/>
                        PA {(adics.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0) / (adics.length || 1)).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA VENDA LOJA / AUDITORIA --- */}
        <TabsContent value="venda-loja" className="mt-6 space-y-8">
           <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
              <h3 className="font-bold text-emerald-800 text-sm">Venda Loja (Física + Adicional)</h3>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Vendedor</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Venda Total</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">TKM</TableHead>
                  <TableHead className="text-center text-[10px] font-bold uppercase">PA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => {
                   const loja = saidas.filter(r => r.vendedor === v.Vendedor && r.canal_consolidado === "VENDA_LOJA");
                   const totalVenda = loja.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                   const totalItens = loja.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
                   if (loja.length === 0) return null;
                   return (
                    <TableRow key={v.Vendedor}>
                      <TableCell className="font-semibold">{v.Vendedor}</TableCell>
                      <TableCell className="text-right">{loja.length}</TableCell>
                      <TableCell className="text-right font-bold">R$ {totalVenda.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {(totalVenda / loja.length).toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">{(totalItens / loja.length).toFixed(2)}</TableCell>
                    </TableRow>
                   );
                })}
              </TableBody>
            </Table>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
              <p className="text-3xl font-black text-amber-600">R$ {auditDescontos.reduce((acc, r) => acc + parseFloat(r.desconto_total), 0).toFixed(2)}</p>
              <p className="text-[10px] text-amber-800 font-bold uppercase">Total de Descontos</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
              <p className="text-3xl font-black text-emerald-600">{auditDescontos.filter(r => r.status_auditoria === "ADICIONAL").length}</p>
              <p className="text-[10px] text-emerald-800 font-bold uppercase">Vendas Classificadas</p>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm">
              <p className="text-3xl font-black text-red-600">{auditDescontos.filter(r => r.status_auditoria === "FORA_DO_PADRAO").length}</p>
              <p className="text-[10px] text-red-800 font-bold uppercase">Fora do Padrão</p>
            </div>
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Descontos por Operador</h3>
              <Button variant="outline" size="sm" className="text-xs font-bold h-7">LISTA DETALHADA</Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold">Vendedor</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">TOTAL DESCONTO</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-emerald-700">QTD ADICIONAL</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-emerald-700">VALOR ADIC.</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-red-600">QTD FORA</TableHead>
                  <TableHead className="text-right text-[10px] font-bold text-red-600">VALOR FORA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => {
                  const descs = auditDescontos.filter(r => r.vendedor === v.Vendedor);
                  const adics = descs.filter(r => r.status_auditoria === "ADICIONAL");
                  const foras = descs.filter(r => r.status_auditoria === "FORA_DO_PADRAO");
                  if (descs.length === 0) return null;
                  return (
                    <TableRow key={v.Vendedor}>
                      <TableCell className="font-semibold">{v.Vendedor}</TableCell>
                      <TableCell className="text-right font-bold text-amber-700">R$ {descs.reduce((acc, r) => acc + parseFloat(r.desconto_total), 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{adics.length}</TableCell>
                      <TableCell className="text-right text-emerald-700">R$ {adics.reduce((acc, r) => acc + parseFloat(r.vNF), 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{foras.length}</TableCell>
                      <TableCell className="text-right text-red-600">R$ {foras.reduce((acc, r) => acc + parseFloat(r.vNF), 0).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA SUSPEITOS --- */}
        <TabsContent value="suspeitos" className="mt-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-orange-100 flex justify-between items-center bg-orange-50/50">
              <h3 className="font-bold text-orange-900 text-sm">Adicionais Suspeitos (Mesmo Dia)</h3>
              <Button variant="ghost" size="sm" onClick={() => exportToCsv("suspeitos.csv", suspeitos, ["Vendedor", "Nome_Dest", "DhEmi"])} className="text-orange-700 text-xs font-bold">
                <Download className="w-3.5 h-3.5 mr-1" /> EXPORTAR
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-orange-50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold">Vendedor</TableHead>
                  <TableHead className="text-[10px] font-bold">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold">CPF</TableHead>
                  <TableHead className="text-[10px] font-bold">Data</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">Valor</TableHead>
                  <TableHead className="text-center text-[10px] font-bold">Ordem</TableHead>
                  <TableHead className="text-[10px] font-bold">Retirada Ref.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspeitos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{r.vendedor}</TableCell>
                    <TableCell className="text-xs">{r.nome_dest}</TableCell>
                    <TableCell className="text-xs font-mono">{r.cpf_cnpj_dest}</TableCell>
                    <TableCell className="text-xs">{r.dhEmi.substring(0, 16)}</TableCell>
                    <TableCell className="text-right font-bold">R$ {parseFloat(r.vNF).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-black",
                        r.tipo_retirada_associada === "ANTES" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      )}>{r.tipo_retirada_associada}</span>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-400 font-mono">{r.chave_retirada_associada?.slice(-8)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* --- ABA MATRIZ --- */}
        <TabsContent value="matriz" className="mt-6">
           <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Matriz Canal x Operador</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableHead className="text-white font-bold border-r border-slate-700 min-w-[200px]">Canal</TableHead>
                    {totalOperador.map(v => (
                      <TableHead key={v.Vendedor} className="text-white font-bold text-center border-r border-slate-700 min-w-[150px]">{v.Vendedor}</TableHead>
                    ))}
                    <TableHead className="text-white font-bold text-right bg-slate-700 min-w-[150px]">Total Canal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelSummary.map(c => (
                    <TableRow key={c.Canal} className="group">
                      <TableCell className="font-bold text-slate-800 border-r">{c.Canal}</TableCell>
                      {totalOperador.map(v => {
                        const cellData = saidas.filter(r => r.canal === c.Canal && r.vendedor === v.Vendedor);
                        const totalV = cellData.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                        return (
                          <TableCell key={v.Vendedor} className="text-center border-r group-hover:bg-slate-50/50">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-slate-800">R$ {totalV.toFixed(2)}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{cellData.length} CP • {cellData.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0)} IT</span>
                              <div className="flex justify-center gap-2">
                                <span className="text-[9px] text-indigo-600 font-bold">R$ {(totalV / (cellData.length || 1)).toFixed(2)}</span>
                                <span className="text-[9px] text-emerald-600 font-bold">{(cellData.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0) / (cellData.length || 1)).toFixed(1)}</span>
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right bg-slate-50 font-bold text-indigo-700">
                        <div className="flex flex-col">
                          <span>R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR')}</span>
                          <span className="text-[9px] text-slate-400">{c.Cupons} CP • {c.Itens_Total} IT</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        {/* --- ABA TROCAS --- */}
        <TabsContent value="trocas" className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader className="p-6">
                <CardTitle className="text-3xl font-black text-indigo-700">{vinculos.length}</CardTitle>
                <CardDescription className="text-indigo-600 font-bold uppercase text-[10px]">Vínculos Identificados</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="p-6">
                <CardTitle className="text-3xl font-black text-slate-700">{saidas.filter(r => r.is_troca).length}</CardTitle>
                <CardDescription className="text-slate-500 font-bold uppercase text-[10px]">Notas de Saída</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="p-6">
                <CardTitle className="text-3xl font-black text-emerald-700">R$ {vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0).toFixed(2)}</CardTitle>
                <CardDescription className="text-emerald-600 font-bold uppercase text-[10px]">Diferença Total (R$ e Itens: {vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0)})</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-800">
                <TableRow>
                  <TableHead className="text-white font-bold">Vendedor</TableHead>
                  <TableHead className="text-white font-bold text-center">Devolvido</TableHead>
                  <TableHead className="text-white font-bold text-center">Trocado</TableHead>
                  <TableHead className="text-white font-bold text-right bg-emerald-700">Diferença R$</TableHead>
                  <TableHead className="text-white font-bold text-center">Itens Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold">{v.vendedor}</TableCell>
                    <TableCell className="text-center">R$ {v.valor_devolvido.toFixed(2)}</TableCell>
                    <TableCell className="text-center">R$ {v.valor_trocado.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-black text-emerald-600 bg-emerald-50/30">R$ {v.valor_diferenca.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold text-orange-600">{v.diferenca_itens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA WHATSAPP --- */}
        <TabsContent value="whatsapp" className="mt-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Copy className="w-5 h-5 text-emerald-600" /> Relatório para WhatsApp
              </h3>
              <Button onClick={copyWhats} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-8">
                Copiar Texto
              </Button>
            </div>
            <textarea 
              readOnly 
              className="w-full h-[400px] p-6 bg-slate-50 border rounded-xl font-mono text-sm leading-relaxed outline-none"
              value={totalOperador.map(v => `${v.Vendedor}: R$ ${v.Venda_Total} (TKM: ${v.TKM})`).join('\n')}
            />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
