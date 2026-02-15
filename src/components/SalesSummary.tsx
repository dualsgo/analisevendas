
"use client";

import React, { useMemo, useState } from "react";
import { 
  DetailedSaleRow, 
  ChannelSummaryRow, 
  VinculoTroca,
  Item
} from "@/lib/types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  MessageCircle, 
  Store, 
  Users, 
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  FileText,
  CreditCard,
  ArrowRightLeft,
  User,
  Hash,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { exportToCsv } from "@/lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const { toast } = useToast();
  const saidas = useMemo(() => data.filter(r => r.tpNF === 1), [data]);
  const [searchTerm, setSearchTerm] = useState("");

  const formatCanal = (canal: string) => {
    switch (canal) {
      case "LOJA_FISICA": return "Loja Física";
      case "RETIRADA_ONLINE": return "Retirada Online";
      case "RETIRADA_ADICIONAL": return "Venda Adicional";
      case "TROCA_COM_DIFERENÇA": return "Troca com Diferença";
      case "TROCA_SEM_DIFERENÇA": return "Troca sem Diferença";
      case "VENDA_LOJA": return "Venda na Loja";
      case "TROCA": return "Trocas";
      default: return canal.replace(/_/g, " ");
    }
  };

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

  const resumoVendaLoja = useMemo(() => {
    const agg: Record<string, { cupons: number; venda: number; itens: number }> = {};
    saidas.filter(r => r.canal_consolidado === "VENDA_LOJA").forEach(r => {
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
  const adicionaisValidos = useMemo(() => saidas.filter(r => r.is_adicional), [saidas]);
  const atendimentosOnline = useMemo(() => saidas.filter(r => r.is_retirada_online), [saidas]);

  const filteredTransactions = useMemo(() => {
    return data.filter(r => 
      r.nf.includes(searchTerm) || 
      r.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nome_dest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cpf_cnpj_dest.includes(searchTerm)
    );
  }, [data, searchTerm]);

  const whatsReport = useMemo(() => {
    let text = "✨ *RELATÓRIO MÁGICO RI HAPPY* ✨\n\n";
    totalOperador.forEach(v => {
      const vend = v.Vendedor;
      const vLojaData = resumoVendaLoja.find(rv => rv.Vendedor === vend);

      const ops = atendimentosOnline.filter(r => r.vendedor === vend).length;
      const adics = adicionaisValidos.filter(r => r.vendedor === vend).length;
      const susp = suspeitos.filter(r => r.vendedor === vend).length;
      const totalAdic = adics + susp;
      const taxa = ops > 0 ? ((totalAdic / ops) * 100).toFixed(0) : "0";

      text += `🧸 *${vend}*\n`;
      if (vLojaData) {
        text += `💰 Venda Loja: R$ ${parseFloat(vLojaData.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        text += `🎟️ Cupons: ${vLojaData.Cupons} | 📦 Itens: ${vLojaData.Itens_Total}\n`;
        text += `📊 TKM: R$ ${vLojaData.TKM} | 📈 PA: ${vLojaData.PA}\n`;
      } else {
        text += `💰 Venda Loja: R$ 0,00\n`;
      }
      text += `🎯 Conversão: ${ops} retirada / ${totalAdic} adicional (${taxa}%)\n\n`;
    });
    return text.trim();
  }, [totalOperador, resumoVendaLoja, atendimentosOnline, adicionaisValidos, suspeitos]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <Tabs defaultValue="geral" className="w-full">
        <div className="sticky top-20 bg-amber-50/90 backdrop-blur-md z-40 pt-2 pb-4 border-b-2 border-orange-100 overflow-x-auto">
          <TabsList className="bg-transparent p-0 flex justify-start h-auto gap-6 min-w-max px-2">
            <TabsTrigger value="geral" className="tab-trigger-custom">VISÃO GERAL</TabsTrigger>
            <TabsTrigger value="venda_loja" className="tab-trigger-custom">VENDA LOJA</TabsTrigger>
            <TabsTrigger value="operadores" className="tab-trigger-custom">CANAIS X OPERADOR</TabsTrigger>
            <TabsTrigger value="conversao" className="tab-trigger-custom flex items-center gap-2">
              CONVERSÃO
              <span className="bg-[#36B7E1] text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {adicionaisValidos.length + suspeitos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="tab-trigger-custom flex items-center gap-2">
              AUDITORIA
              <span className="bg-[#E4007C] text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {auditDescontos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="trocas" className="tab-trigger-custom flex items-center gap-2">
               TROCAS
              <span className="bg-[#662D91] text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {(vinculos || []).length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="transacoes" className="tab-trigger-custom">TRANSAÇÕES</TabsTrigger>
            <TabsTrigger value="whatsapp" className="tab-trigger-custom flex items-center gap-2 text-[#39B54A]">
              <MessageCircle className="w-3.5 h-3.5" /> WHATSAPP
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- ABA VISÃO GERAL --- */}
        <TabsContent value="geral" className="mt-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {channelSummary.map((c, idx) => {
              const colors = ["bg-[#E4007C]", "bg-[#36B7E1]", "bg-[#F37021]", "bg-[#662D91]", "bg-[#39B54A]", "bg-[#ED1C24]"];
              const color = colors[idx % colors.length];
              return (
                <Card key={c.Canal} className="ri-card overflow-hidden group">
                  <div className={cn("h-2 w-full", color)} />
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">{formatCanal(c.Canal)}</CardTitle>
                      <Store className={cn("w-4 h-4 opacity-30 group-hover:scale-125 transition-transform", color.replace('bg-', 'text-'))} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-2">
                    <div className="text-2xl font-black text-slate-800 mb-6">
                      R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Cupons Emitidos</p>
                        <p className="text-sm font-black text-slate-700">{c.Cupons}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Peças Vendidas</p>
                        <p className="text-sm font-black text-slate-700">{c.Itens_Total}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Valor Médio (TKM)</p>
                        <p className="text-sm font-black text-orange-500">R$ {c.TKM}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Peças por Venda (PA)</p>
                        <p className="text-sm font-black text-sky-500">{c.PA}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <section className="bg-white rounded-3xl shadow-xl shadow-slate-100 border-2 border-slate-50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Performance Geral por Operador</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("operadores_resumo.csv", totalOperador, ["Vendedor", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"])} className="text-orange-600 border-orange-200 rounded-full font-black text-xs hover:bg-orange-50">
                <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase px-8">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Itens Totais</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">TKM (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase px-8">PA (Peças)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => (
                  <TableRow key={v.Vendedor} className="hover:bg-orange-50/30 transition-colors">
                    <TableCell className="font-black text-slate-700 px-8">{v.Vendedor}</TableCell>
                    <TableCell className="text-right font-bold text-slate-500">{v.Cupons}</TableCell>
                    <TableCell className="text-right font-bold text-slate-500">{v.Itens_Total}</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-800">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-orange-600 font-black">R$ {v.TKM}</TableCell>
                    <TableCell className="text-center px-8">
                      <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-[10px] font-black">{v.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA VENDA LOJA --- */}
        <TabsContent value="venda_loja" className="mt-8 space-y-10">
          <section className="bg-white rounded-3xl shadow-xl shadow-emerald-50 border-2 border-emerald-50 overflow-hidden">
            <div className="px-8 py-6 border-b border-emerald-100 flex justify-between items-center bg-[#39B54A]/5">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#39B54A]" />
                <h3 className="font-black text-[#39B54A] text-base tracking-tight uppercase">Performance Somente Venda na Loja</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("venda_loja_resumo.csv", resumoVendaLoja, ["Vendedor", "Cupons", "Venda_Total", "Itens_Total", "TKM", "PA"])} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-full font-black text-xs">
                <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-emerald-50/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase px-8">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Itens Totais</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">TKM (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase px-8">PA (Peças)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoVendaLoja.map((v) => (
                  <TableRow key={v.Vendedor} className="hover:bg-emerald-50/50 transition-colors">
                    <TableCell className="font-black text-slate-700 px-8">{v.Vendedor}</TableCell>
                    <TableCell className="text-right font-bold text-slate-500">{v.Cupons}</TableCell>
                    <TableCell className="text-right font-bold text-slate-500">{v.Itens_Total}</TableCell>
                    <TableCell className="text-right font-mono font-black text-slate-800">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-black">R$ {v.TKM}</TableCell>
                    <TableCell className="text-center px-8">
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black">{v.PA}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA CANAIS X OPERADOR --- */}
        <TabsContent value="operadores" className="mt-8 space-y-10">
           <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Performance Detalhada por Canal de Venda</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                    <TableHead className="text-white font-black text-[10px] uppercase border-r border-slate-700 min-w-[200px] px-8">Canal de Venda</TableHead>
                    {totalOperador.map(v => (
                      <TableHead key={v.Vendedor} className="text-white font-black text-[10px] uppercase text-center border-r border-slate-700 min-w-[150px]">{v.Vendedor}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelSummary.map(c => (
                    <TableRow key={c.Canal}>
                      <TableCell className="font-black text-slate-800 border-r bg-slate-50/50 uppercase text-[11px] px-8">{formatCanal(c.Canal)}</TableCell>
                      {totalOperador.map(v => {
                        const filt = saidas.filter(r => r.canal === c.Canal && r.vendedor === v.Vendedor);
                        const venda = filt.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                        const cupons = filt.length;
                        const itensCount = filt.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
                        const tkm = cupons > 0 ? (venda / cupons).toFixed(2) : "0.00";
                        const pa = cupons > 0 ? (itensCount / cupons).toFixed(2) : "0.00";
                        
                        return (
                          <TableCell key={v.Vendedor} className="border-r p-4">
                            {cupons > 0 ? (
                              <div className="space-y-1 text-center group">
                                <p className="text-[12px] font-black text-slate-800">R$ {venda.toFixed(0)}</p>
                                <div className="flex justify-center gap-2 text-[9px] text-slate-400 font-black uppercase">
                                  <span>{cupons} CP</span>
                                  <span>{itensCount} IT</span>
                                </div>
                                <div className="text-[9px] flex justify-center gap-2 font-black">
                                  <span className="text-orange-500">TKM {tkm}</span>
                                  <span className="text-sky-500">PA {pa}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-slate-200">-</p>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        {/* --- ABA CONVERSÃO --- */}
        <TabsContent value="conversao" className="mt-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="ri-card">
              <CardHeader className="p-6 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Oportunidades de Venda</p>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-4xl font-black text-sky-500">{atendimentosOnline.length}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Retiradas Identificadas</p>
              </CardContent>
            </Card>
            <Card className="ri-card">
              <CardHeader className="p-6 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Vendas Adicionais</p>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-4xl font-black text-emerald-500">{adicionaisValidos.length}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Conversões Identificadas</p>
              </CardContent>
            </Card>
            <Card className="ri-card">
              <CardHeader className="p-6 pb-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Adicionais Suspeitos</p>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-4xl font-black text-[#F37021]">{suspeitos.length}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Vendas no Mesmo Dia</p>
              </CardContent>
            </Card>
            <Card className="ri-card bg-sky-50/50">
              <CardHeader className="p-6 pb-2">
                <p className="text-[10px] text-sky-600 font-black uppercase tracking-widest">Taxa de Conversão</p>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-4xl font-black text-sky-600">
                  {atendimentosOnline.length > 0 
                    ? (((adicionaisValidos.length + suspeitos.length) / atendimentosOnline.length) * 100).toFixed(1) 
                    : "0"}%
                </p>
                <p className="text-[10px] text-sky-400 mt-1 font-bold">Média de Performance</p>
              </CardContent>
            </Card>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden">
             <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-sky-50/30">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-sky-500" />
                <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Performance de Conversão por Operador</h3>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase px-8">Operador</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase">Retiradas</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-emerald-600">Adicionais</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-orange-500">Suspeitos</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-sky-600">Taxa (%)</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase">Venda Adicional</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase">TKM (R$)</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase px-8">PA (Peças)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalOperador.map((v) => {
                  const ops = atendimentosOnline.filter(r => r.vendedor === v.Vendedor).length;
                  const adics = adicionaisValidos.filter(r => r.vendedor === v.Vendedor).length;
                  const susp = suspeitos.filter(r => r.vendedor === v.Vendedor).length;
                  const filteredAdics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito));
                  const valorAdics = filteredAdics.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                  const itensAdics = filteredAdics.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
                  const taxa = ops > 0 ? (((adics + susp) / ops) * 100).toFixed(1) : "0.0";
                  const tkm = (adics + susp) > 0 ? (valorAdics / (adics + susp)).toFixed(2) : "0.00";
                  const pa = (adics + susp) > 0 ? (itensAdics / (adics + susp)).toFixed(2) : "0.00";
                  
                  return (
                    <TableRow key={v.Vendedor} className="hover:bg-slate-50/50">
                      <TableCell className="font-black text-slate-700 px-8">{v.Vendedor}</TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{ops}</TableCell>
                      <TableCell className="text-center font-black text-emerald-600">{adics}</TableCell>
                      <TableCell className="text-center font-black text-orange-500">{susp}</TableCell>
                      <TableCell className="text-center font-black text-sky-600">{taxa}%</TableCell>
                      <TableCell className="text-right font-mono font-black text-slate-800">R$ {valorAdics.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600 font-bold">R$ {tkm}</TableCell>
                      <TableCell className="text-center px-8 font-black text-emerald-600">{pa}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA AUDITORIA --- */}
        <TabsContent value="auditoria" className="mt-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="ri-card border-[#E4007C]/20 bg-[#E4007C]/5">
              <CardHeader className="p-6">
                <CardTitle className="text-4xl font-black text-[#E4007C]">
                  R$ {auditDescontos.reduce((acc, r) => acc + parseFloat(r.desconto_total), 0).toFixed(2)}
                </CardTitle>
                <p className="text-[10px] text-[#E4007C] font-black uppercase mt-1 tracking-widest">Total de Descontos Aplicados</p>
              </CardHeader>
            </Card>
            <Card className="ri-card border-emerald-200 bg-emerald-50/50">
              <CardHeader className="p-6">
                <CardTitle className="text-4xl font-black text-emerald-600">
                  {auditDescontos.filter(r => r.is_adicional).length}
                </CardTitle>
                <p className="text-[10px] text-emerald-800 font-black uppercase mt-1 tracking-widest">Conversões Válidas</p>
              </CardHeader>
            </Card>
            <Card className="ri-card border-red-200 bg-red-50/50">
              <CardHeader className="p-6">
                <CardTitle className="text-4xl font-black text-red-600">
                  {auditDescontos.filter(r => r.status_auditoria.includes("FORA DO PADRÃO")).length}
                </CardTitle>
                <p className="text-[10px] text-red-800 font-black uppercase mt-1 tracking-widest">Fora do Padrão de Adicional</p>
              </CardHeader>
            </Card>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden">
            <div className="p-8 bg-[#E4007C]/5 border-b border-[#E4007C]/10">
              <h3 className="text-base font-black text-[#E4007C] uppercase tracking-tighter">Análise Técnica de Auditoria</h3>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Vendas com descontos entre 8% e 12% são classificadas como adicionais. Valores fora dessa faixa são registrados para auditoria.
              </p>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase px-8">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Bruta</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cupons</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Desconto (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase px-8">Status da Auditoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditDescontos.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="font-black text-xs px-8 text-slate-700">{r.vendedor}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-bold">R$ {r.vNF}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-slate-500">{r.itens_qtd}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-black text-[#E4007C]">R$ {r.desconto_total} ({(parseFloat(r.percentual_desconto) * 100).toFixed(1)}%)</TableCell>
                    <TableCell className="text-center px-8">
                      <span className={cn(
                        "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter",
                        r.is_adicional ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {r.status_auditoria}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA TROCAS --- */}
        <TabsContent value="trocas" className="mt-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="ri-card border-[#662D91]/20 bg-[#662D91]/5">
              <CardHeader className="p-6">
                <CardTitle className="text-4xl font-black text-[#662D91]">{(vinculos || []).length}</CardTitle>
                <p className="text-[10px] text-[#662D91] font-black uppercase mt-1 tracking-widest">Trocas Vinculadas</p>
              </CardHeader>
            </Card>
            <Card className="ri-card border-orange-200 bg-orange-50/50">
              <CardHeader className="p-6">
                <CardTitle className="text-4xl font-black text-orange-600">
                  R$ {vinculos?.reduce((acc, v) => acc + (v.valor_diferenca || 0), 0).toFixed(2)}
                </CardTitle>
                <p className="text-[10px] text-orange-800 font-black uppercase mt-1 tracking-widest">Total de Diferença Recebida</p>
              </CardHeader>
            </Card>
            <Card className="ri-card border-slate-200 bg-slate-50/50">
              <CardHeader className="p-6">
                <CardTitle className="text-4xl font-black text-slate-700">
                  {vinculos?.reduce((acc, v) => acc + (v.diferenca_itens || 0), 0)}
                </CardTitle>
                <p className="text-[10px] text-slate-800 font-black uppercase mt-1 tracking-widest">Saldo de Peças (Diferença)</p>
              </CardHeader>
            </Card>
          </div>

          <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-[#662D91]/5">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-[#662D91]" />
                <h3 className="font-black text-slate-800 text-base tracking-tight uppercase">Histórico de Trocas Detalhadas</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCsv("trocas_detalhadas.csv", vinculos, ["vendedor", "cpf_cliente", "nome_cliente", "data_entrada", "data_saida", "valor_devolvido", "valor_trocado", "valor_diferenca", "diferenca_itens"])} className="text-[#662D91] border-[#662D91]/20 hover:bg-purple-50 rounded-full font-black text-xs">
                <Download className="w-3.5 h-3.5 mr-2" /> EXPORTAR CSV
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 px-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Identificação do Cliente</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">Operador</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Crédito (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Nova Compra (R$)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-orange-600 px-8">Diferença (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vinculos || []).map((v, i) => (
                  <ExpandableTradeRow key={i} vinculo={v} data={data} />
                ))}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        {/* --- ABA TRANSAÇÕES --- */}
        <TabsContent value="transacoes" className="mt-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-4">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar por Nota, Operador ou Cliente..." 
                className="w-full pl-12 pr-6 py-3 rounded-full border-2 border-orange-100 focus:outline-none focus:ring-4 focus:ring-orange-100 text-sm font-bold shadow-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-5 py-2 rounded-full border border-slate-100">
              <FileText className="w-4 h-4 text-orange-500" />
              {filteredTransactions.length} Movimentações Encontradas
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 px-8"></TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Número da Nota / Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Operador Responsável</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Canal de Venda</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Venda Total (R$)</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase px-8">Total Itens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 100).map((r, i) => (
                  <ExpandableRow key={i} row={r} formatCanal={formatCanal} />
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* --- ABA WHATSAPP --- */}
        <TabsContent value="whatsapp" className="mt-8">
          <section className="bg-white rounded-[2.5rem] shadow-xl border-4 border-emerald-50 p-10 flex flex-col items-center">
            <div className="w-full max-w-2xl flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-2xl">
                  <MessageCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Relatório de Performance WhatsApp</h3>
                  <p className="text-sm font-bold text-emerald-600 mt-1">Gere e copie o relatório para seus colaboradores.</p>
                </div>
               </div>
              <Button onClick={() => {
                navigator.clipboard.writeText(whatsReport);
                toast({ title: "Copiado para o WhatsApp!", description: "O relatório já está na sua área de transferência." });
              }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-8 py-6 shadow-lg shadow-emerald-100 transition-all">
                COPIAR RELATÓRIO MÁGICO
              </Button>
            </div>
            <pre className="w-full max-w-2xl h-[500px] p-8 bg-slate-900 text-emerald-400 border-4 border-slate-800 rounded-[2rem] font-mono text-sm leading-relaxed overflow-auto shadow-2xl whitespace-pre-wrap">
              {whatsReport}
            </pre>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpandableRow({ row, formatCanal }: { row: DetailedSaleRow, formatCanal: Function }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-orange-50/50 transition-colors", isOpen && "bg-orange-50/50")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="px-8">
          {isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </TableCell>
        <TableCell className="text-xs">
          <p className="font-black text-orange-600">NF {row.nf}</p>
          <p className="text-slate-400 font-bold">{row.dhEmi}</p>
        </TableCell>
        <TableCell className="text-xs font-black text-slate-700 uppercase">{row.vendedor}</TableCell>
        <TableCell>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
            {formatCanal(row.canal)}
          </span>
        </TableCell>
        <TableCell className="text-right font-mono font-black text-slate-800">R$ {row.vNF}</TableCell>
        <TableCell className="text-center font-black px-8">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableCell colSpan={6} className="p-0 border-b-2 border-orange-100">
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="bg-orange-100 p-1.5 rounded-lg"><Package className="w-4 h-4 text-orange-500" /></div>
                  Produtos da Nota Fiscal
                </h4>
                <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase px-6">Produto</TableHead>
                        <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase px-6">Valor Unit. (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.itens.map((item: Item, idx: number) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="text-[11px] font-bold text-slate-700 px-6">{item.xProd}</TableCell>
                          <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                          <TableCell className="text-right text-[11px] font-mono font-black px-6">R$ {item.vProd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <div className="bg-sky-100 p-1.5 rounded-lg"><User className="w-4 h-4 text-sky-500" /></div>
                  Dados de Identificação do Cliente
                </h4>
                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nome do Cliente</p>
                      <p className="text-sm font-black text-slate-800 mt-1">{row.nome_dest || "NÃO IDENTIFICADO"}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        <Hash className="w-3 h-3 opacity-50" /> {row.cpf_cnpj_dest || "SEM CPF"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Resultado da Auditoria</p>
                      <p className="text-[11px] font-black text-orange-600 uppercase mt-2 leading-tight">
                        {row.status_auditoria}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-2 mb-4 tracking-widest">
                      <CreditCard className="w-3.5 h-3.5 opacity-50" /> Resumo Financeiro
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-black uppercase">Venda Líquida</p>
                        <p className="text-sm font-black text-slate-800">R$ {row.vNF}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <p className="text-[9px] text-orange-400 font-black uppercase">Desconto</p>
                        <p className="text-sm font-black text-orange-600">R$ {row.desconto_total}</p>
                      </div>
                      <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                        <p className="text-[9px] text-sky-400 font-black uppercase">Crédito/Troco</p>
                        <p className="text-sm font-black text-sky-600">R$ {row.vTroco}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ExpandableTradeRow({ vinculo, data }: { vinculo: VinculoTroca, data: DetailedSaleRow[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const notaEntrada = useMemo(() => data.find(r => r.chave === vinculo.chave_entrada), [data, vinculo.chave_entrada]);
  const notaSaida = useMemo(() => data.find(r => r.chave === vinculo.chave_saida), [data, vinculo.chave_saida]);

  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-purple-50/50 transition-colors", isOpen && "bg-purple-50/50")}
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="px-8">
          {isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </TableCell>
        <TableCell className="text-xs">
          <p className="font-black text-slate-800 leading-none">{vinculo.nome_cliente || "TROCA SEM CPF"}</p>
          <p className="text-slate-400 font-mono text-[10px] font-bold mt-1">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-xs font-black text-slate-700 uppercase text-center">{vinculo.vendedor}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600">R$ {vinculo.valor_devolvido.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-slate-600">R$ {vinculo.valor_trocado.toFixed(2)}</TableCell>
        <TableCell className="text-right font-mono font-black text-orange-600 px-8">R$ {vinculo.valor_diferenca.toFixed(2)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableCell colSpan={6} className="p-0 border-b-2 border-purple-100">
            <div className="p-10 space-y-10 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-red-100 p-1.5 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-red-500" /></div>
                    Produtos Devolvidos (Crédito Gerado)
                  </h4>
                  <div className="bg-white rounded-[2rem] border-2 border-red-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-red-50/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-6">Produto</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase px-6">Valor (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaEntrada?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[11px] font-bold text-slate-700 px-6">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                            <TableCell className="text-right text-[11px] font-mono font-black px-6">R$ {item.vProd.toFixed(2)}</TableCell>
                          </TableRow>
                        )) || <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-400 italic py-6">Detalhes não carregados</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="bg-emerald-100 p-1.5 rounded-lg"><ArrowRightLeft className="w-4 h-4 text-emerald-500" /></div>
                    Novos Produtos Levados (Saída)
                  </h4>
                  <div className="bg-white rounded-[2rem] border-2 border-emerald-50 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-emerald-50/30">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-6">Produto</TableHead>
                          <TableHead className="text-center text-[10px] font-black uppercase">Qtd</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase px-6">Valor (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notaSaida?.itens.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-transparent">
                            <TableCell className="text-[11px] font-bold text-slate-700 px-6">{item.xProd}</TableCell>
                            <TableCell className="text-center text-[11px] font-black">{item.qCom}</TableCell>
                            <TableCell className="text-right text-[11px] font-mono font-black px-6">R$ {item.vProd.toFixed(2)}</TableCell>
                          </TableRow>
                        )) || <TableRow><TableCell colSpan={3} className="text-center text-xs text-slate-400 italic py-6">Detalhes não carregados</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl border-b-8 border-slate-800">
                <div className="space-y-2 text-center md:text-left">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">Análise Mágica do Vínculo</p>
                  <p className="text-sm font-bold opacity-80">
                    Vínculo identificado por <span className="text-sky-400">{vinculo.metodo_vinculo.replace(/_/g, " ")}</span> com <span className="text-emerald-400">{(vinculo.confianca * 100).toFixed(0)}% de precisão técnica</span>.
                  </p>
                </div>
                <div className="flex gap-12">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo de Peças</p>
                    <p className="text-3xl font-black">{vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}</p>
                    <p className="text-[9px] text-slate-500 font-bold">DIFERENÇA DE ITENS</p>
                  </div>
                  <div className="text-center border-l-2 border-slate-800 pl-12">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Diferença Paga</p>
                    <p className="text-3xl font-black text-emerald-400">R$ {vinculo.valor_diferenca.toFixed(2)}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">VALOR EM DINHEIRO</p>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
