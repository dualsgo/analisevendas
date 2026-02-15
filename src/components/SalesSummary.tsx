
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
  ArrowRightLeft,
  User,
  Hash,
  Sparkles,
  TrendingUp,
  Target,
  AlertCircle,
  LayoutDashboard,
  X,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  ShoppingCart,
  Boxes,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const META_CONVERSAO = 22.0;
const META_CADASTRO = 80.0;

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [activeTab, setActiveTab] = useState("geral");
  const [showWelcome, setShowWelcome] = useState(true);
  const [considerExchanges, setConsiderExchanges] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterChannel, setFilterChannel] = useState("ALL");
  const [filterVendor, setFilterVendor] = useState("ALL");

  const entradas = useMemo(() => (data || []).filter(r => r.tpNF === 0 || r.is_devolucao), [data]);
  const saidas = useMemo(() => (data || []).filter(r => r.tpNF === 1 && !r.is_devolucao), [data]);

  const formatCanal = (canal: string) => {
    switch (canal) {
      case "LOJA_FISICA": return "Venda Direta na Loja";
      case "RETIRADA_ONLINE": return "Entrega de Pedido Online";
      case "RETIRADA_ADICIONAL": return "Venda Adicional na Retirada";
      case "TROCA_COM_DIFERENÇA": return "Troca com Valor Adicional";
      case "TROCA_SEM_DIFERENÇA": return "Troca Valor Igual";
      case "VENDA_LOJA": return "Total Venda Loja Física";
      case "TROCA": return "Operações de Troca";
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

  const consolidadoTotal = useMemo(() => {
    const normais = saidas.filter(r => r.canal_consolidado !== "TROCA");
    const vNormais = normais.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const iNormais = normais.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    const cNormais = normais.length;

    const saldoTrocasVenda = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const saldoTrocasItens = vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);
    const cTrocas = vinculos.length;

    if (considerExchanges) {
      return {
        venda: vNormais + saldoTrocasVenda,
        cupons: cNormais + cTrocas,
        itens: iNormais + saldoTrocasItens,
        tkm: (cNormais + cTrocas) > 0 ? (vNormais + saldoTrocasVenda) / (cNormais + cTrocas) : 0,
        pa: (cNormais + cTrocas) > 0 ? (iNormais + saldoTrocasItens) / (cNormais + cTrocas) : 0
      };
    } else {
      return {
        venda: vNormais,
        cupons: cNormais,
        itens: iNormais,
        tkm: cNormais > 0 ? vNormais / cNormais : 0,
        pa: cNormais > 0 ? iNormais / cNormais : 0
      };
    }
  }, [saidas, vinculos, considerExchanges]);

  const trocasIguais = useMemo(() => vinculos.filter(v => v.valor_diferenca <= 0.05), [vinculos]);
  const trocasComAdicional = useMemo(() => vinculos.filter(v => v.valor_diferenca > 0.05), [vinculos]);

  const metricsTrocasIguais = useMemo(() => ({
    cupons: trocasIguais.length,
    devolvidos: trocasIguais.reduce((acc, v) => acc + v.itens_devolvidos, 0),
    levados: trocasIguais.reduce((acc, v) => acc + v.itens_trocados, 0),
    diferenca: trocasIguais.reduce((acc, v) => acc + v.diferenca_itens, 0)
  }), [trocasIguais]);

  const metricsTrocasAdicionais = useMemo(() => ({
    cupons: trocasComAdicional.length,
    devolvidos: trocasComAdicional.reduce((acc, v) => acc + v.itens_devolvidos, 0),
    levados: trocasComAdicional.reduce((acc, v) => acc + v.itens_trocados, 0),
    diferenca: trocasComAdicional.reduce((acc, v) => acc + v.diferenca_itens, 0),
    saldo: trocasComAdicional.reduce((acc, v) => acc + v.valor_diferenca, 0)
  }), [trocasComAdicional]);

  const resumoVendaLoja = useMemo(() => {
    const agg: Record<string, { cupons: number; cuponsComCadastro: number; venda: number; itens: number }> = {};
    const filtered = saidas.filter(r => r.canal_consolidado === "VENDA_LOJA");
    
    filtered.forEach(r => {
      if (!agg[r.vendedor]) agg[r.vendedor] = { cupons: 0, cuponsComCadastro: 0, venda: 0, itens: 0 };
      agg[r.vendedor].cupons++;
      if (r.tem_destinatario) agg[r.vendedor].cuponsComCadastro++;
      agg[r.vendedor].venda += parseFloat(r.vNF);
      agg[r.vendedor].itens += parseFloat(r.itens_qtd);
    });

    return Object.entries(agg).map(([vend, d]) => ({
      Vendedor: vend,
      Cupons: d.cupons,
      CuponsComCadastro: d.cuponsComCadastro,
      TaxaCadastro: d.cupons > 0 ? ((d.cuponsComCadastro / d.cupons) * 100).toFixed(1) : "0",
      Venda_Total: d.venda.toFixed(2),
      Itens_Total: d.itens,
      TKM: d.cupons > 0 ? (d.venda / d.cupons).toFixed(2) : "0",
      PA: d.cupons > 0 ? (d.itens / d.cupons).toFixed(2) : "0",
    })).sort((a, b) => parseFloat(b.Venda_Total) - parseFloat(a.Venda_Total));
  }, [saidas]);

  const mediasLoja = useMemo(() => {
    if (resumoVendaLoja.length === 0) return null;
    const total = resumoVendaLoja.reduce((acc, v) => ({
      venda: acc.venda + parseFloat(v.Venda_Total),
      cupons: acc.cupons + v.Cupons,
      itens: acc.itens + v.Itens_Total,
      cadastros: acc.cadastros + v.CuponsComCadastro
    }), { venda: 0, cupons: 0, itens: 0, cadastros: 0 });

    const n = resumoVendaLoja.length;
    return {
      venda: total.venda / n,
      cupons: total.cupons / n,
      itens: total.itens / n,
      tkm: total.cupons > 0 ? total.venda / total.cupons : 0,
      pa: total.cupons > 0 ? total.itens / total.cupons : 0,
      taxaCadastro: total.cupons > 0 ? (total.cadastros / total.cupons) * 100 : 0
    };
  }, [resumoVendaLoja]);

  const navItems = [
    { id: "geral", label: "Visão Geral", icon: LayoutDashboard },
    { id: "venda_loja", label: "Performance Venda", icon: TrendingUp },
    { id: "conversao", label: "Conversão Adicionais", icon: Target },
    { id: "auditoria", label: "Auditoria Descontos", icon: AlertCircle },
    { id: "trocas", label: "Gestão de Trocas", icon: ArrowRightLeft },
    { id: "transacoes", label: "Todas Transações", icon: FileText },
    { id: "whatsapp", label: "Relatório WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  ];

  const getStatusColor = (val: number, media: number) => {
    if (val > media) return "text-emerald-600 font-black";
    if (val < media) return "text-red-600 font-bold";
    return "text-slate-600";
  };

  const whatsReport = useMemo(() => {
    let text = "✨ *RELATÓRIO MÁGICO RI HAPPY* ✨\n\n";
    const atendimentosOnline = saidas.filter(r => r.is_retirada_online);
    const adicionais = saidas.filter(r => r.is_adicional || r.is_adicional_suspeito);

    resumoVendaLoja.forEach(v => {
      const ops = atendimentosOnline.filter(r => r.vendedor === v.Vendedor).length;
      const adics = adicionais.filter(r => r.vendedor === v.Vendedor).length;
      const taxaConv = ops > 0 ? ((adics / ops) * 100).toFixed(0) : "0";

      text += `🧸 *${v.Vendedor}*\n`;
      text += `💰 Venda: R$ ${parseFloat(v.Venda_Total).toLocaleString('pt-BR')}\n`;
      text += `🎟️ Cupons: ${v.Cupons} | 📦 Itens: ${v.Itens_Total}\n`;
      text += `👤 Cadastro: ${v.TaxaCadastro}% | 📊 TKM: R$ ${v.TKM} | 📈 PA: ${v.PA}\n`;
      text += `🎯 ${ops} retirada / ${adics} adicional (${taxaConv}%)\n\n`;
    });
    return text.trim();
  }, [resumoVendaLoja, saidas]);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white hidden md:block">
        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Menu de Gestão</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "rounded-xl py-6 px-4 transition-all duration-300",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-100 font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 mr-2", activeTab !== item.id && item.color)} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-amber-50/20 p-4 md:p-8">
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "outline"}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "rounded-full whitespace-nowrap px-6 text-xs font-black uppercase",
                activeTab === item.id ? "bg-orange-500 border-orange-500" : "text-slate-500 border-slate-200"
              )}
            >
              <item.icon className="w-3.5 h-3.5 mr-2" />
              {item.label}
            </Button>
          ))}
        </div>

        {showWelcome && (
          <section className="bg-gradient-to-r from-orange-500 to-[#F37021] rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl shadow-orange-100 flex flex-col md:flex-row items-center gap-6 mb-8 relative">
            <Button variant="ghost" size="icon" onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-white/20 p-4 rounded-full hidden md:block">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">O Solzinho está de Olho na Performance!</h2>
              <p className="text-orange-50 font-medium text-sm md:text-base">Acompanhe a evolução do faturamento e a qualidade do cadastro da sua loja.</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 bg-white/10 px-6 py-4 rounded-2xl border border-white/20 text-center">
                <p className="text-[9px] font-black uppercase opacity-60">Meta Conversão</p>
                <p className="text-xl font-black">{META_CONVERSAO}%</p>
              </div>
              <div className="flex-1 bg-white/10 px-6 py-4 rounded-2xl border border-white/20 text-center">
                <p className="text-[9px] font-black uppercase opacity-60">Meta Cadastro</p>
                <p className="text-xl font-black">{META_CADASTRO}%</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "geral" && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <Card className="ri-card xl:col-span-3 bg-white border-orange-200 border-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex items-center gap-3 bg-orange-50 rounded-bl-3xl border-l border-b border-orange-100">
                   <Label htmlFor="toggle-trocas" className="text-[10px] font-black text-orange-600 uppercase">Considerar Saldo de Trocas?</Label>
                   <Switch id="toggle-trocas" checked={considerExchanges} onCheckedChange={setConsiderExchanges} className="data-[state=checked]:bg-orange-500" />
                </div>
                <CardHeader>
                  <CardTitle className="text-base font-black text-slate-800 uppercase flex items-center gap-3">
                    <Store className="w-5 h-5 text-orange-500" />
                    Resultado Consolidado da Loja
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Venda Total</p>
                      <p className="text-xl md:text-2xl font-black text-slate-800">R$ {consolidadoTotal.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Cupons</p>
                      <p className="text-lg md:text-xl font-black text-slate-600">{consolidadoTotal.cupons}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Itens Saldo</p>
                      <p className="text-lg md:text-xl font-black text-slate-600">{consolidadoTotal.itens}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-orange-400 uppercase">Média (TKM)</p>
                      <p className="text-lg md:text-xl font-black text-orange-500">R$ {consolidadoTotal.tkm.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-sky-400 uppercase">Pecas/Venda (PA)</p>
                      <p className="text-lg md:text-xl font-black text-sky-500">{consolidadoTotal.pa.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card bg-emerald-500 text-white border-0 flex flex-col justify-center p-6 md:p-8">
                <p className="text-[10px] font-black uppercase opacity-70">Status do Processamento</p>
                <div className="space-y-2 mt-4 text-xs font-black">
                  <div className="flex justify-between border-b border-white/20 pb-1"><span>SAÍDAS:</span><span>{saidas.length}</span></div>
                  <div className="flex justify-between border-b border-white/20 pb-1"><span>ENTRADAS:</span><span>{entradas.length}</span></div>
                  <div className="flex justify-between opacity-60"><span>TOTAL LIDO:</span><span>{data.length}</span></div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="ri-card border-purple-100 border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black text-purple-800 uppercase flex items-center justify-between">
                    Troca com Valor Igual
                    <ArrowRightLeft className="w-4 h-4 opacity-50" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Cupons</p>
                      <p className="text-lg font-black">{metricsTrocasIguais.cupons}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Dif. Itens</p>
                      <p className={cn("text-lg font-black", metricsTrocasIguais.diferenca >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {metricsTrocasIguais.diferenca > 0 ? `+${metricsTrocasIguais.diferenca}` : metricsTrocasIguais.diferenca}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl col-span-2 flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Fluxo Peças</p>
                        <p className="text-xs font-bold text-slate-600">Devolvidas: {metricsTrocasIguais.devolvidos} | Levadas: {metricsTrocasIguais.levados}</p>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card border-orange-200 border-2 bg-orange-50/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black text-orange-800 uppercase flex items-center justify-between">
                    Troca com Valor Adicional
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-orange-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Cupons</p>
                      <p className="text-lg font-black">{metricsTrocasAdicionais.cupons}</p>
                    </div>
                    <div className="bg-orange-500 p-3 rounded-xl text-white shadow-lg shadow-orange-100">
                      <p className="text-[8px] font-black uppercase opacity-80">Saldo Pago a Mais</p>
                      <p className="text-lg font-black">R$ {metricsTrocasAdicionais.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-orange-100 col-span-2 flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Fluxo Peças</p>
                        <p className="text-xs font-bold text-slate-600">Entrada: {metricsTrocasAdicionais.devolvidos} | Saída: {metricsTrocasAdicionais.levados}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Balanço Itens</p>
                        <p className={cn("text-xs font-black", metricsTrocasAdicionais.diferenca >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {metricsTrocasAdicionais.diferenca > 0 ? `+${metricsTrocasAdicionais.diferenca}` : metricsTrocasAdicionais.diferenca}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {channelSummary.map((c, i) => (
                <Card key={c.Canal} className="ri-card group overflow-hidden border-2 border-slate-50">
                  <div className={cn("h-1.5 w-full", ["bg-pink-500", "bg-sky-500", "bg-orange-500", "bg-purple-500", "bg-emerald-500"][i % 5])} />
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatCanal(c.Canal)}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    <p className="text-xl font-black text-slate-800">R$ {parseFloat(c.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-50 text-[10px]">
                      <div className="flex justify-between"><span className="text-slate-400">Tickets:</span><span className="font-black">{c.Cupons}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Itens:</span><span className="font-black">{c.Itens_Total}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Média:</span><span className="font-black text-orange-500">R$ {c.TKM}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">P/V:</span><span className="font-black text-sky-500">{c.PA}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "venda_loja" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <TrendingUp className="w-8 h-8 text-emerald-500" />
                  <div>
                    <h3 className="text-emerald-800 font-black uppercase text-lg">Ranking de Performance Venda</h3>
                    <p className="text-emerald-600 text-sm font-medium">Meta de Cadastro: <span className="font-black">80%</span>. Cores em verde superam a média da loja.</p>
                  </div>
               </div>
               <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-emerald-600"><HelpCircle className="w-5 h-5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4 bg-emerald-900 text-white rounded-xl">
                      <p className="text-xs font-bold">O ranking destaca os colaboradores que trazem mais rentabilidade. TKM (Ticket Médio) indica o gasto por cliente e PA indica quantas peças cada cliente leva.</p>
                    </TooltipContent>
                  </Tooltip>
               </TooltipProvider>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="px-6 py-4 font-black uppercase text-[10px]">Colaborador</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Tickets</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Identificação (%)</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Venda Total</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Valor Médio</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px] px-6">Peças/Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoVendaLoja.map((v) => (
                      <TableRow key={v.Vendedor} className="hover:bg-orange-50/30">
                        <TableCell className={cn("px-6 py-4 font-black whitespace-nowrap", getStatusColor(parseFloat(v.Venda_Total), mediasLoja?.venda || 0))}>{v.Vendedor}</TableCell>
                        <TableCell className="text-right font-bold">{v.Cupons}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("px-3 py-1 rounded-full text-[9px] font-black", parseFloat(v.TaxaCadastro) >= META_CADASTRO ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                            {v.TaxaCadastro}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-black">R$ {parseFloat(v.Venda_Total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right font-black text-orange-500">R$ {v.TKM}</TableCell>
                        <TableCell className="text-center px-6">
                          <span className={cn("px-3 py-1 rounded-full text-[9px] font-black", parseFloat(v.PA) >= (mediasLoja?.pa || 0) ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600")}>
                            {v.PA}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-900 text-white font-black sticky bottom-0">
                      <TableCell className="px-6 py-5 text-orange-400 uppercase text-[10px] tracking-widest">MÉDIA DA LOJA</TableCell>
                      <TableCell className="text-right">{mediasLoja?.cupons.toFixed(0)}</TableCell>
                      <TableCell className="text-center">{mediasLoja?.taxaCadastro.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">R$ {mediasLoja?.venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">R$ {mediasLoja?.tkm.toFixed(2)}</TableCell>
                      <TableCell className="text-center px-6">{mediasLoja?.pa.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "conversao" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-6 flex items-center gap-4">
                <Target className="w-8 h-8 text-sky-500" />
                <div>
                  <h3 className="text-sky-800 font-black uppercase text-lg">Conversão de Atendimentos Online</h3>
                  <p className="text-sky-600 text-sm font-medium">Meta Sugerida: <span className="font-black">{META_CONVERSAO}%</span>. Foco em transformar retiradas em vendas presenciais.</p>
                </div>
             </div>
             <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-sky-50/30">
                      <TableRow>
                        <TableHead className="px-6 py-4 font-black uppercase text-[10px]">Colaborador</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px]">Retiradas</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px] text-emerald-600">Adicionais</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px]">Taxa Conversão</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px]">Valor Adicionado</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px] px-6">Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumoVendaLoja.filter(v => saidas.filter(r => r.vendedor === v.Vendedor && r.is_retirada_online).length > 0).map((v) => {
                        const ops = saidas.filter(r => r.vendedor === v.Vendedor && r.is_retirada_online).length;
                        const adics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito)).length;
                        const valorAdic = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito)).reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                        const taxa = ((adics / ops) * 100).toFixed(1);
                        return (
                          <TableRow key={v.Vendedor} className="hover:bg-slate-50/50">
                            <TableCell className="px-6 py-4 font-black text-slate-700 whitespace-nowrap">{v.Vendedor}</TableCell>
                            <TableCell className="text-center font-bold text-slate-500">{ops}</TableCell>
                            <TableCell className="text-center font-black text-emerald-600">{adics}</TableCell>
                            <TableCell className={cn("text-center font-black text-lg", parseFloat(taxa) >= META_CONVERSAO ? "text-emerald-600" : "text-red-500")}>{taxa}%</TableCell>
                            <TableCell className="text-right font-black text-slate-800">R$ {valorAdic.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-center px-6">
                               <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase whitespace-nowrap", parseFloat(taxa) >= META_CONVERSAO ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600")}>
                                  {parseFloat(taxa) >= META_CONVERSAO ? "ALCANÇOU" : "PENDENTE"}
                               </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
             </div>
          </div>
        )}

        {activeTab === "auditoria" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-pink-50 border-2 border-pink-100 rounded-2xl p-6 flex items-center gap-4">
                <AlertCircle className="w-8 h-8 text-pink-500" />
                <div>
                  <h3 className="text-pink-800 font-black uppercase text-lg">Auditoria de Descontos e Identificação</h3>
                  <p className="text-pink-600 text-sm font-medium">Análise de conformidade: descontos aplicados e presença de cadastro de cliente.</p>
                </div>
             </div>
             <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-slate-50/30">
                        <TableRow>
                          <TableHead className="px-6 py-4 font-black uppercase text-[10px]">Colaborador</TableHead>
                          <TableHead className="font-black uppercase text-[10px]">Cliente / Identificação</TableHead>
                          <TableHead className="text-right font-black uppercase text-[10px]">Total Pago</TableHead>
                          <TableHead className="text-right font-black uppercase text-[10px]">Desconto</TableHead>
                          <TableHead className="text-center font-black uppercase text-[10px] px-6">Status Auditoria</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saidas.filter(r => r.tem_desconto).map((r, i) => (
                          <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="px-6 py-4 font-black text-slate-700 whitespace-nowrap">{r.vendedor}</TableCell>
                            <TableCell className="min-w-[220px]">
                              <p className="font-black text-slate-800 uppercase text-[10px]">{r.nome_dest || "SEM NOME"}</p>
                              <p className={cn("text-[9px] font-bold mt-1", r.tem_destinatario ? "text-emerald-600" : "text-red-500")}>
                                {r.tem_destinatario ? `CPF/CNPJ: ${r.cpf_cnpj_dest}` : "NÃO IDENTIFICADO NO PDV"}
                              </p>
                            </TableCell>
                            <TableCell className="text-right font-black">R$ {parseFloat(r.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-black text-pink-600">R$ {r.desconto_total} ({ (parseFloat(r.percentual_desconto)*100).toFixed(1) }%)</TableCell>
                            <TableCell className="text-center px-6">
                               <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase whitespace-nowrap", r.status_auditoria.includes("PADRÃO") ? "bg-red-50 text-red-600" : "bg-emerald-100 text-emerald-700")}>
                                  {r.status_auditoria.includes("PADRÃO") ? "AUDITORIA NECESSÁRIA" : "PADRÃO OK"}
                               </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                </div>
             </div>
          </div>
        )}

        {activeTab === "trocas" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-6 flex items-center gap-4">
                <ArrowRightLeft className="w-8 h-8 text-purple-500" />
                <div>
                  <h3 className="text-purple-800 font-black uppercase text-lg">Análise Detalhada de Trocas</h3>
                  <p className="text-purple-600 text-sm font-medium">Comparativo entre itens devolvidos e novos itens levados pelo cliente.</p>
                </div>
             </div>
             <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-purple-50/30">
                        <TableRow>
                          <TableHead className="w-12 px-6 py-4"></TableHead>
                          <TableHead className="font-black uppercase text-[10px]">Cliente / CPF</TableHead>
                          <TableHead className="text-center font-black uppercase text-[10px]">Operador</TableHead>
                          <TableHead className="text-right font-black uppercase text-[10px]">Crédito Devolução</TableHead>
                          <TableHead className="text-right font-black uppercase text-[10px]">Novo Valor Total</TableHead>
                          <TableHead className="text-right font-black uppercase text-orange-600 px-6 text-[10px]">Saldo Pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vinculos.map((v, i) => (
                          <ExpandableTradeRow key={i} vinculo={v} data={data} />
                        ))}
                      </TableBody>
                   </Table>
                </div>
             </div>
          </div>
        )}

        {activeTab === "transacoes" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Busca Rápida</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" placeholder="Nota, Operador..." className="w-full pl-10 pr-4 py-2 text-xs font-bold rounded-lg border-2 border-slate-50 focus:border-orange-200 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Canal</Label>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="rounded-lg h-9 text-xs font-black"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="ALL">Todos os Canais</SelectItem>
                    {Array.from(new Set(data.map(r => r.canal))).map(c => <SelectItem key={c} value={c}>{formatCanal(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Colaborador</Label>
                <Select value={filterVendor} onValueChange={setFilterVendor}>
                  <SelectTrigger className="rounded-lg h-9 text-xs font-black"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="font-bold">
                    <SelectItem value="ALL">Todos os Colaboradores</SelectItem>
                    {Array.from(new Set(data.map(r => r.vendedor))).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-12 px-6 py-4"></TableHead>
                        <TableHead className="font-black uppercase text-[10px]">Nota / Data</TableHead>
                        <TableHead className="font-black uppercase text-[10px]">Colaborador</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px]">Identificação</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px]">Valor Total</TableHead>
                        <TableHead className="text-center font-black uppercase text-[10px] px-6">Peças</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.filter(r => {
                        const matchSearch = r.nf.includes(searchTerm) || r.vendedor.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchChannel = filterChannel === "ALL" || r.canal === filterChannel;
                        const matchVendor = filterVendor === "ALL" || r.vendedor === filterVendor;
                        return matchSearch && matchChannel && matchVendor;
                      }).slice(0, 50).map((r, i) => (
                        <ExpandableRow key={i} row={r} formatCanal={formatCanal} />
                      ))}
                    </TableBody>
                  </Table>
               </div>
            </div>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <section className="bg-white rounded-[2rem] border-4 border-emerald-50 p-6 md:p-12 flex flex-col items-center animate-in zoom-in duration-500">
             <div className="w-full max-w-2xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4 text-center md:text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl"><MessageCircle className="w-8 h-8 text-emerald-600" /></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase">Relatório WhatsApp</h3>
                    <p className="text-sm font-bold text-emerald-600">Formato pronto para compartilhar com a equipe!</p>
                  </div>
                </div>
                <Button onClick={() => {
                  navigator.clipboard.writeText(whatsReport);
                  alert("Copiado para a área de transferência!");
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-8 py-6 uppercase text-xs">Copiar Relatório</Button>
             </div>
             <pre className="w-full max-w-2xl h-[450px] p-8 bg-slate-900 text-emerald-400 border-8 border-slate-800 rounded-[2.5rem] font-mono text-sm overflow-auto shadow-2xl whitespace-pre-wrap">
                {whatsReport}
             </pre>
          </section>
        )}
      </div>
    </div>
  );
}

function ExpandableRow({ row, formatCanal }: { row: DetailedSaleRow, formatCanal: Function }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <TableRow className={cn("cursor-pointer hover:bg-orange-50/50 transition-colors", isOpen && "bg-orange-50/50")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="px-6 py-4">{isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}</TableCell>
        <TableCell className="text-[10px] font-black">
          <p className="text-orange-600">NF {row.nf}</p>
          <p className="text-slate-400 font-bold mt-0.5">{row.dhEmi.substring(0, 10)}</p>
        </TableCell>
        <TableCell className="text-[10px] font-black uppercase text-slate-700">{row.vendedor}</TableCell>
        <TableCell className="text-center">
          {row.tem_destinatario ? (
            <div className="flex flex-col items-center"><UserCheck className="w-4 h-4 text-emerald-500" /><span className="text-[7px] font-black text-emerald-600 uppercase">IDENTIFICADO</span></div>
          ) : (
            <div className="flex flex-col items-center opacity-30"><User className="w-4 h-4 text-slate-400" /><span className="text-[7px] font-black text-slate-400 uppercase">BALCÃO</span></div>
          )}
        </TableCell>
        <TableCell className="text-right font-black">R$ {parseFloat(row.vNF).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
        <TableCell className="text-center px-6 font-black">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/30">
          <TableCell colSpan={6} className="p-8 border-b border-orange-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Package className="w-4 h-4 text-orange-500" /> Itens na Nota Fiscal</h4>
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase px-4 py-2">Produto</TableHead>
                        <TableHead className="text-center text-[9px] font-black uppercase">Qtd</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase px-4">Valor (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.itens.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-transparent">
                          <TableCell className="text-[10px] font-bold px-4 py-2">{item.xProd}</TableCell>
                          <TableCell className="text-center text-[10px] font-black">{item.qCom}</TableCell>
                          <TableCell className="text-right text-[10px] font-black px-4">{item.vProd.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><User className="w-4 h-4 text-sky-500" /> Identificação e Auditoria</h4>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
                   <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <p className="font-black text-slate-400 uppercase">Cliente</p>
                        <p className="font-black text-slate-800 mt-1 uppercase">{row.nome_dest || "NÃO IDENTIFICADO"}</p>
                        <p className="font-mono text-slate-500 mt-1">{row.cpf_cnpj_dest || "-"}</p>
                      </div>
                      <div>
                        <p className="font-black text-slate-400 uppercase">Canal / Auditoria</p>
                        <p className="font-black text-slate-600 mt-1 uppercase">{formatCanal(row.canal)}</p>
                        <p className="font-black text-pink-600 mt-0.5 text-[8px] uppercase">{row.status_auditoria}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-slate-50 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Líquido</p>
                        <p className="text-xs font-black">R$ {parseFloat(row.vNF).toFixed(2)}</p>
                      </div>
                      <div className="bg-pink-50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-pink-400 uppercase">Desconto</p>
                        <p className="text-xs font-black text-pink-600">R$ {parseFloat(row.desconto_total).toFixed(2)}</p>
                      </div>
                      <div className="bg-sky-50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-sky-400 uppercase">Troco/Cred.</p>
                        <p className="text-xs font-black text-sky-600">R$ {(parseFloat(row.vTroca) + parseFloat(row.vTroco)).toFixed(2)}</p>
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
  const nEntrada = data.find(r => r.chave === vinculo.chave_entrada);
  const nSaida = data.find(r => r.chave === vinculo.chave_saida);

  return (
    <>
      <TableRow className={cn("cursor-pointer hover:bg-purple-50/50 transition-colors", isOpen && "bg-purple-50/50")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="px-6 py-4">{isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}</TableCell>
        <TableCell className="text-[10px] font-black whitespace-nowrap">
          <p className="text-slate-800 uppercase">{vinculo.nome_cliente || "CLIENTE BALCÃO"}</p>
          <p className="text-slate-400 font-mono text-[9px] mt-0.5">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-center font-black text-[10px] uppercase text-slate-700">{vinculo.vendedor}</TableCell>
        <TableCell className="text-right font-black text-[10px] text-slate-500">R$ {vinculo.valor_devolvido.toFixed(2)}</TableCell>
        <TableCell className="text-right font-black text-[10px] text-slate-500">R$ {vinculo.valor_trocado.toFixed(2)}</TableCell>
        <TableCell className="text-right font-black text-orange-600 px-6">R$ {vinculo.valor_diferenca.toFixed(2)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/30">
          <TableCell colSpan={6} className="p-8 border-b border-purple-100">
            <div className="space-y-8 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-red-500" /> Entrada (Peças Devolvidas)</h4>
                   <div className="bg-white rounded-xl border border-red-50 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-red-50/50">
                          <TableRow>
                            <TableHead className="text-[9px] font-black uppercase px-4 py-2">Produto Original</TableHead>
                            <TableHead className="text-center text-[9px] font-black uppercase">Qtd</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nEntrada?.itens.map((it, idx) => (
                            <TableRow key={idx} className="hover:bg-transparent">
                              <TableCell className="text-[10px] font-bold px-4 py-2">{it.xProd}</TableCell>
                              <TableCell className="text-center text-[10px] font-black">{it.qCom}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-500" /> Saída (Peças Levadas)</h4>
                   <div className="bg-white rounded-xl border border-emerald-50 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-emerald-50/50">
                          <TableRow>
                            <TableHead className="text-[9px] font-black uppercase px-4 py-2">Novo Produto</TableHead>
                            <TableHead className="text-center text-[9px] font-black uppercase">Qtd</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nSaida?.itens.map((it, idx) => (
                            <TableRow key={idx} className="hover:bg-transparent">
                              <TableCell className="text-[10px] font-bold px-4 py-2">{it.xProd}</TableCell>
                              <TableCell className="text-center text-[10px] font-black">{it.qCom}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Resumo Estratégico da Troca</p>
                    <p className="text-xs font-bold opacity-70 mt-1">Comparativo direto de peças e aporte financeiro.</p>
                 </div>
                 <div className="flex gap-12">
                    <div className="text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase">Dif. Itens</p>
                       <p className={cn("text-2xl font-black mt-1", vinculo.diferenca_itens >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}
                       </p>
                    </div>
                    <div className="text-center border-l border-white/10 pl-12">
                       <p className="text-[9px] font-black text-orange-400 uppercase">Saldo Pago</p>
                       <p className="text-2xl font-black text-emerald-400 mt-1">R$ {vinculo.valor_diferenca.toFixed(2)}</p>
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
