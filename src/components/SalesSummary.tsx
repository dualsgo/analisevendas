
"use client";

import React, { useMemo, useState } from "react";
import { 
  DetailedSaleRow, 
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
  Store, 
  TrendingUp, 
  Target, 
  AlertCircle, 
  LayoutDashboard, 
  ArrowRightLeft, 
  FileText, 
  MessageCircle, 
  Sparkles, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  User, 
  UserCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar as CalendarIcon,
  BarChart3,
  Smartphone,
  Zap,
  Download
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
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface SalesSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

const META_CONVERSAO = 22.0;
const META_CADASTRO = 80.0;

const formatCurrency = (val: number | string) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function SalesSummary({ data = [], vinculos = [] }: SalesSummaryProps) {
  const [activeTab, setActiveTab] = useState("geral");
  const [showWelcome, setShowWelcome] = useState(true);
  const [considerExchanges, setConsiderExchanges] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCpf, setSearchCpf] = useState("");
  const [filterChannel, setFilterChannel] = useState("ALL");
  const [filterVendor, setFilterVendor] = useState("ALL");
  const { setOpenMobile } = useSidebar();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpenMobile(false);
  };

  const entradas = useMemo(() => (data || []).filter(r => r.tpNF === 0 || r.is_devolucao), [data]);
  const saidas = useMemo(() => (data || []).filter(r => r.tpNF === 1 && !r.is_devolucao), [data]);

  const formatCanal = (canal: string) => {
    switch (canal) {
      case "LOJA_FISICA": return "Venda Direta";
      case "RETIRADA_ONLINE": return "Entrega Online";
      case "RETIRADA_ADICIONAL": return "Venda Adicional";
      case "TROCA_COM_DIFERENÇA": return "Troca Adicional";
      case "TROCA_SEM_DIFERENÇA": return "Troca Igual";
      case "VENDA_LOJA": return "Venda Loja";
      case "TROCA": return "Trocas";
      default: return canal.replace(/_/g, " ");
    }
  };

  const trocasComAdicional = useMemo(() => vinculos.filter(v => v.valor_diferenca > 0.05), [vinculos]);
  const trocasIguais = useMemo(() => vinculos.filter(v => v.valor_diferenca <= 0.05), [vinculos]);

  const cancelamentos = useMemo(() => {
    const vinculadas = new Set(vinculos.map(v => v.chave_entrada));
    return entradas.filter(e => !vinculadas.has(e.chave));
  }, [entradas, vinculos]);

  const channelMetrics = useMemo(() => {
    const sum = (arr: DetailedSaleRow[]) => arr.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const itemsCount = (arr: DetailedSaleRow[]) => arr.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);

    const physical = saidas.filter(r => r.canal_consolidado === "VENDA_LOJA");
    const online = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    const additional = saidas.filter(r => r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito);

    const calcTkm = (v: number, c: number) => c > 0 ? v / c : 0;
    const calcPa = (i: number, c: number) => c > 0 ? i / c : 0;

    return {
      physical: { 
        v: sum(physical), 
        i: itemsCount(physical), 
        c: physical.length,
        tkm: calcTkm(sum(physical), physical.length),
        pa: calcPa(itemsCount(physical), physical.length)
      },
      online: { 
        v: sum(online), 
        i: itemsCount(online), 
        c: online.length,
        tkm: calcTkm(sum(online), online.length),
        pa: calcPa(itemsCount(online), online.length)
      },
      additional: { 
        v: sum(additional), 
        i: itemsCount(additional), 
        c: additional.length,
        tkm: calcTkm(sum(additional), additional.length),
        pa: calcPa(itemsCount(additional), additional.length)
      }
    };
  }, [saidas]);

  const consolidadoTotal = useMemo(() => {
    const normais = saidas.filter(r => r.canal_consolidado !== "TROCA");
    const vNormais = normais.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const iNormais = normais.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    const cNormais = normais.length;

    const saldoTrocasVenda = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const saldoTrocasItens = vinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);
    const cTrocas = vinculos.length;

    const vTotal = vNormais + (considerExchanges ? saldoTrocasVenda : 0);
    const cTotal = cNormais + (considerExchanges ? cTrocas : 0);
    const iTotal = iNormais + (considerExchanges ? saldoTrocasItens : 0);

    return {
      venda: vTotal,
      cupons: cTotal,
      itens: iTotal,
      tkm: cTotal > 0 ? vTotal / cTotal : 0,
      pa: cTotal > 0 ? iTotal / cTotal : 0
    };
  }, [saidas, vinculos, considerExchanges]);

  const dailyPerformance = useMemo(() => {
    const groups: Record<string, DetailedSaleRow[]> = {};
    saidas.forEach(r => {
      const date = r.dhEmi.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });

    return Object.entries(groups).map(([date, rows]) => {
      const venda = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const itens = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
      const cupons = rows.length;
      return {
        date: date.split('-').reverse().join('/'),
        fullDate: date,
        venda,
        cupons,
        itens,
        tkm: cupons > 0 ? venda / cupons : 0,
        pa: cupons > 0 ? itens / cupons : 0
      };
    }).sort((a, b) => b.fullDate.localeCompare(a.fullDate));
  }, [saidas]);

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
      text += `💰 Venda: ${formatCurrency(v.Venda_Total)}\n`;
      text += `🎟️ Cupons: ${v.Cupons} | 📦 Itens: ${v.Itens_Total}\n`;
      text += `👤 Cadastro: ${v.TaxaCadastro}% | 📊 TKM: ${formatCurrency(v.TKM)} | 📈 PA: ${v.PA}\n`;
      text += `🎯 ${ops} retirada / ${adics} adicional (${taxaConv}%)\n\n`;
    });
    return text.trim();
  }, [resumoVendaLoja, saidas]);

  const navItems = [
    { id: "geral", label: "Visão Geral", icon: LayoutDashboard },
    { id: "diario", label: "Performance Diária", icon: CalendarIcon },
    { id: "venda_loja", label: "Performance Venda", icon: TrendingUp },
    { id: "conversao", label: "Conversão Online", icon: Target },
    { id: "auditoria", label: "Auditoria Descontos", icon: AlertCircle },
    { id: "trocas", label: "Gestão de Trocas", icon: ArrowRightLeft },
    { id: "transacoes", label: "Todas Transações", icon: FileText },
    { id: "whatsapp", label: "Relatório WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      <Sidebar className="border-r border-orange-100 bg-white" collapsible="offcanvas">
        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Menu de Navegação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={activeTab === item.id} 
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        "rounded-xl py-6 px-4 transition-all duration-300",
                        activeTab === item.id 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-100 font-black" 
                          : "hover:bg-orange-50 text-slate-500 font-bold"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 mr-3", activeTab !== item.id && item.color)} />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-amber-50/20 p-3 md:p-8 flex flex-col gap-4 md:gap-8 scroll-smooth scrollbar-hide">
        {showWelcome && (
          <section className="bg-gradient-to-r from-orange-500 to-[#F37021] rounded-2xl md:rounded-[2.5rem] p-5 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center gap-4 relative animate-in slide-in-from-top-4 duration-500">
            <Button variant="ghost" size="icon" onClick={() => setShowWelcome(false)} className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </Button>
            <div className="bg-white/20 p-3 rounded-full hidden lg:block"><Sparkles className="w-8 h-8 text-white" /></div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter">Painel de Performance Mágico</h2>
              <p className="text-orange-50 font-medium text-[11px] md:text-sm">Acompanhe a saúde da sua loja. Valores em Verde superam as metas!</p>
            </div>
          </section>
        )}

        {activeTab === "geral" && (
          <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
            <Card className="ri-card border-orange-200 border-2 overflow-hidden bg-white">
              <div className="p-4 bg-orange-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-orange-100">
                 <div className="flex items-center gap-3">
                   <Zap className="w-5 h-5 text-orange-500" />
                   <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase">Resultado Consolidado da Loja</h3>
                 </div>
                 <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-orange-200 shadow-sm self-stretch sm:self-auto justify-between">
                   <Label htmlFor="toggle-trocas" className="text-[9px] font-black text-orange-600 uppercase">Incluir Saldo de Trocas?</Label>
                   <Switch id="toggle-trocas" checked={considerExchanges} onCheckedChange={setConsiderExchanges} className="data-[state=checked]:bg-orange-500 scale-90" />
                 </div>
              </div>
              <CardContent className="p-4 md:p-8">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-8 text-center sm:text-left">
                  <div className="space-y-1 col-span-2 lg:col-span-1">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">Venda Líquida</p>
                    <p className="text-lg md:text-3xl font-black text-slate-800">{formatCurrency(consolidadoTotal.venda)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">Tickets</p>
                    <p className="text-lg md:text-2xl font-black text-slate-600">{consolidadoTotal.cupons}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase">Peças Totais</p>
                    <p className="text-lg md:text-2xl font-black text-slate-600">{consolidadoTotal.itens}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] md:text-[10px] font-black text-orange-400 uppercase">Valor Médio</p>
                    <p className="text-lg md:text-2xl font-black text-orange-500">{formatCurrency(consolidadoTotal.tkm)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] md:text-[10px] font-black text-sky-400 uppercase">Peças/Venda</p>
                    <p className="text-lg md:text-2xl font-black text-sky-500">{consolidadoTotal.pa.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <Card className="ri-card border-slate-100 border-2 bg-white overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Store className="w-4 h-4" /> Venda Loja Física</h4>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(channelMetrics.physical.v)}</p>
                </div>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Cupons</p>
                    <p className="text-base font-black text-slate-700">{channelMetrics.physical.c}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Peças</p>
                    <p className="text-base font-black text-slate-700">{channelMetrics.physical.i}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-orange-400 uppercase">TKM</p>
                    <p className="text-base font-black text-orange-600">{formatCurrency(channelMetrics.physical.tkm)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-sky-400 uppercase">PA</p>
                    <p className="text-base font-black text-sky-600">{channelMetrics.physical.pa.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card border-sky-100 border-2 bg-sky-50/10 overflow-hidden">
                <div className="p-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-sky-600 uppercase flex items-center gap-2"><Smartphone className="w-4 h-4" /> Retirada Online</h4>
                  <p className="text-lg font-black text-sky-700">{formatCurrency(channelMetrics.online.v)}</p>
                </div>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-sky-400 uppercase">Tickets</p>
                    <p className="text-base font-black text-sky-700">{channelMetrics.online.c}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-sky-400 uppercase">Peças</p>
                    <p className="text-base font-black text-sky-700">{channelMetrics.online.i}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-orange-400 uppercase">TKM</p>
                    <p className="text-base font-black text-orange-600">{formatCurrency(channelMetrics.online.tkm)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">PA</p>
                    <p className="text-base font-black text-emerald-600">{channelMetrics.online.pa.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card border-emerald-100 border-2 bg-emerald-50/10 overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><Zap className="w-4 h-4" /> Venda Adicional</h4>
                  <p className="text-lg font-black text-emerald-700">{formatCurrency(channelMetrics.additional.v)}</p>
                </div>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Conv.</p>
                    <p className="text-base font-black text-emerald-700">{channelMetrics.additional.c}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Peças</p>
                    <p className="text-base font-black text-emerald-700">{channelMetrics.additional.i}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-orange-400 uppercase">TKM</p>
                    <p className="text-base font-black text-orange-600">{formatCurrency(channelMetrics.additional.tkm)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-sky-400 uppercase">PA</p>
                    <p className="text-base font-black text-sky-600">{channelMetrics.additional.pa.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card border-purple-100 border-2 bg-purple-50/10 overflow-hidden">
                <div className="p-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Troca de Valor Igual</h4>
                  <p className="text-lg font-black text-purple-700">{trocasIguais.length} Atendimentos</p>
                </div>
                <CardContent className="p-6 grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-red-400 uppercase">Itens In</p>
                    <p className="text-base font-black text-red-600">{trocasIguais.reduce((acc, v) => acc + v.itens_devolvidos, 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Itens Out</p>
                    <p className="text-base font-black text-emerald-600">{trocasIguais.reduce((acc, v) => acc + v.itens_trocados, 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-purple-400 uppercase">Saldo Peças</p>
                    <p className="text-base font-black text-purple-700">{trocasIguais.reduce((acc, v) => acc + v.diferenca_itens, 0)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card border-orange-100 border-2 bg-orange-50/10 overflow-hidden">
                <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Troca com Valor Adicional</h4>
                  <p className="text-lg font-black text-orange-700">{formatCurrency(trocasComAdicional.reduce((acc, v) => acc + v.valor_diferenca, 0))}</p>
                </div>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-orange-400 uppercase">Tickets</p>
                    <p className="text-base font-black text-orange-700">{trocasComAdicional.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-red-400 uppercase">Itens In</p>
                    <p className="text-base font-black text-red-600">{trocasComAdicional.reduce((acc, v) => acc + v.itens_devolvidos, 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Itens Out</p>
                    <p className="text-base font-black text-emerald-600">{trocasComAdicional.reduce((acc, v) => acc + v.itens_trocados, 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-sky-400 uppercase">Saldo Peças</p>
                    <p className="text-base font-black text-sky-700">{trocasComAdicional.reduce((acc, v) => acc + v.diferenca_itens, 0)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="ri-card border-slate-900 border-2 bg-slate-900 text-white overflow-hidden">
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                  <h4 className="text-[10px] font-black opacity-60 uppercase flex items-center gap-2"><Package className="w-4 h-4" /> Status da Operação Loja</h4>
                  <p className="text-lg font-black text-orange-400">{data.length} XMLs</p>
                </div>
                <CardContent className="p-6 grid grid-cols-3 gap-6 text-center">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black opacity-50 uppercase">Notas de Saída</p>
                    <p className="text-base font-black text-emerald-400">{saidas.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black opacity-50 uppercase">Notas de Entrada</p>
                    <p className="text-base font-black text-sky-400">{entradas.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black opacity-50 uppercase">Notas Canceladas</p>
                    <p className="text-base font-black text-red-400">{cancelamentos.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "diario" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-white rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-xl border-2 border-slate-50">
                <h3 className="text-sm md:text-base font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" /> Tendência de Vendas
                </h3>
                <div className="h-[250px] md:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} fontWeight="bold" tick={{fill: '#94a3b8'}} />
                      <YAxis fontSize={10} fontWeight="bold" tick={{fill: '#94a3b8'}} />
                      <RechartsTooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : v} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} />
                      <Legend />
                      <Line type="monotone" dataKey="venda" name="Venda Total" stroke="#f97316" strokeWidth={4} dot={{ r: 6, fill: '#f97316' }} />
                      <Line type="monotone" dataKey="cupons" name="Tickets" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4, fill: '#0ea5e9' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="px-4 py-4 font-black uppercase text-[10px]">Data</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Venda Total</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Tickets</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px] hidden sm:table-cell">Média</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">P/V</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyPerformance.map((d) => (
                      <TableRow key={d.date} className="hover:bg-orange-50/30 transition-colors">
                        <TableCell className="px-4 py-4 font-black text-slate-700 text-xs">{d.date}</TableCell>
                        <TableCell className="text-right font-black text-xs">{formatCurrency(d.venda)}</TableCell>
                        <TableCell className="text-center font-bold text-slate-500 text-xs">{d.cupons}</TableCell>
                        <TableCell className="text-center font-black text-orange-500 text-xs hidden sm:table-cell">{formatCurrency(d.tkm)}</TableCell>
                        <TableCell className="text-center font-black text-sky-500 text-xs">{d.pa.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
          </div>
        )}

        {activeTab === "venda_loja" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 md:p-6">
              <h3 className="text-emerald-800 font-black uppercase text-base leading-tight">Ranking de Performance Venda</h3>
              <p className="text-emerald-600 text-[10px] md:text-xs font-medium mt-1">Valores em <span className="font-black">Verde</span> superam a média de faturamento da loja.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-50 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="px-4 py-4 font-black uppercase text-[10px]">Colaborador</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px] hidden sm:table-cell">Cadastro (%)</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px]">Venda Total</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] hidden md:table-cell">Média</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px]">P/V</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoVendaLoja.map((v) => (
                    <TableRow key={v.Vendedor} className="hover:bg-orange-50/30 transition-colors">
                      <TableCell className={cn("px-4 py-4 font-black text-xs", getStatusColor(parseFloat(v.Venda_Total), mediasLoja?.venda || 0))}>{v.Vendedor}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black", parseFloat(v.TaxaCadastro) >= META_CADASTRO ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                          {v.TaxaCadastro}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-xs">{formatCurrency(v.Venda_Total)}</TableCell>
                      <TableCell className="text-right font-black text-orange-500 text-xs hidden md:table-cell">{formatCurrency(v.TKM)}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black", parseFloat(v.PA) >= (mediasLoja?.pa || 0) ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600")}>
                          {v.PA}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-900 text-white font-black sticky bottom-0 z-10">
                    <TableCell className="px-4 py-4 text-orange-400 uppercase text-[9px] tracking-widest">MÉDIA LOJA</TableCell>
                    <TableCell className="text-center hidden sm:table-cell text-xs">{mediasLoja?.taxaCadastro.toFixed(1)}%</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(mediasLoja?.venda || 0)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell text-xs">{formatCurrency(mediasLoja?.tkm || 0)}</TableCell>
                    <TableCell className="text-center text-xs">{mediasLoja?.pa.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "conversao" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 md:p-6">
               <h3 className="text-sky-800 font-black uppercase text-base">Conversão Online em Física</h3>
               <p className="text-sky-600 text-[10px] md:text-xs font-medium mt-1">Meta de Conversão: <span className="font-black">{META_CONVERSAO}%</span>.</p>
             </div>
             <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-sky-50/30">
                    <TableRow>
                      <TableHead className="px-4 py-4 font-black uppercase text-[10px]">Colaborador</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Retiradas</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px] text-emerald-600">Adicionais</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Taxa %</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px] hidden sm:table-cell">Venda Extra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumoVendaLoja.filter(v => saidas.filter(r => r.vendedor === v.Vendedor && r.is_retirada_online).length > 0).map((v) => {
                      const ops = saidas.filter(r => r.vendedor === v.Vendedor && r.is_retirada_online).length;
                      const adics = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito)).length;
                      const valorAdic = saidas.filter(r => r.vendedor === v.Vendedor && (r.is_adicional || r.is_adicional_suspeito)).reduce((acc, r) => acc + parseFloat(r.vNF), 0);
                      const taxa = ((adics / ops) * 100).toFixed(1);
                      return (
                        <TableRow key={v.Vendedor} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell className="px-4 py-4 font-black text-slate-700 text-xs">{v.Vendedor}</TableCell>
                          <TableCell className="text-center font-bold text-slate-400 text-xs">{ops}</TableCell>
                          <TableCell className="text-center font-black text-emerald-600 text-xs">{adics}</TableCell>
                          <TableCell className={cn("text-center font-black text-sm", parseFloat(taxa) >= META_CONVERSAO ? "text-emerald-600" : "text-red-500")}>{taxa}%</TableCell>
                          <TableCell className="text-right font-black text-slate-800 text-xs hidden sm:table-cell">{formatCurrency(valorAdic)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
             </div>
          </div>
        )}

        {activeTab === "auditoria" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-pink-50 border-2 border-pink-100 rounded-2xl p-4 md:p-6">
                <h3 className="text-pink-800 font-black uppercase text-base">Auditoria de Descontos</h3>
                <p className="text-pink-600 text-[10px] md:text-xs font-medium">Audite apenas vendas fora dos padrões (Adicional 8-12% ou Mostruário ~5%).</p>
             </div>
             <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow>
                      <TableHead className="px-4 py-4 font-black uppercase text-[10px]">Colaborador</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Valor NF</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Desconto</TableHead>
                      <TableHead className="text-center font-black uppercase text-[10px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saidas.filter(r => r.tem_desconto).map((r, i) => {
                      const isAuditNeeded = r.status_auditoria === "FORA DO PADRÃO";
                      return (
                        <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="px-4 py-4 font-black text-slate-700 text-xs">{r.vendedor}</TableCell>
                          <TableCell className="text-right font-black text-xs">{formatCurrency(r.vNF)}</TableCell>
                          <TableCell className="text-right font-black text-pink-600 text-xs">{formatCurrency(r.desconto_total)} ({(parseFloat(r.percentual_desconto)*100).toFixed(1)}%)</TableCell>
                          <TableCell className="text-center">
                             <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase", isAuditNeeded ? "bg-red-50 text-red-600" : "bg-emerald-100 text-emerald-700")}>
                                {isAuditNeeded ? "AUDITAR" : "OK (" + r.tipo_desconto + ")"}
                             </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
             </div>
          </div>
        )}

        {activeTab === "trocas" && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-4 md:p-6">
                <h3 className="text-purple-800 font-black uppercase text-base">Gestão de Trocas Detalhada</h3>
                <p className="text-purple-600 text-[10px] md:text-xs font-medium mt-1">Acompanhamento de créditos, devoluções e novos faturamentos.</p>
             </div>
             <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-purple-50/30">
                    <TableRow>
                      <TableHead className="w-10 px-4 py-4"></TableHead>
                      <TableHead className="font-black uppercase text-[10px]">Cliente</TableHead>
                      <TableHead className="text-right font-black uppercase text-[10px]">Crédito</TableHead>
                      <TableHead className="text-right font-black uppercase text-orange-600 px-4 text-[10px]">Saldo Pago</TableHead>
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
        )}

        {activeTab === "transacoes" && (
          <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-50 grid grid-cols-1 sm:grid-cols-4 gap-4 shadow-sm">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <input type="text" placeholder="Nota, Operador..." className="w-full pl-8 pr-4 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-50 focus:border-orange-200 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="relative">
                <UserCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <input type="text" placeholder="Filtrar por CPF..." className="w-full pl-8 pr-4 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-50 focus:border-orange-200 outline-none" value={searchCpf} onChange={(e) => setSearchCpf(e.target.value)} />
              </div>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="rounded-lg h-8 text-[11px] font-black"><SelectValue placeholder="Todos Canais" /></SelectTrigger>
                <SelectContent className="font-bold">
                  <SelectItem value="ALL">Todos os Canais</SelectItem>
                  {Array.from(new Set(data.map(r => r.canal))).map(c => <SelectItem key={c} value={c}>{formatCanal(c)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger className="rounded-lg h-8 text-[11px] font-black"><SelectValue placeholder="Todos Operadores" /></SelectTrigger>
                <SelectContent className="font-bold">
                  <SelectItem value="ALL">Todos os Operadores</SelectItem>
                  {Array.from(new Set(data.map(r => r.vendedor))).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-50 overflow-hidden">
               <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-10 px-4 py-4"></TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Nota / Data</TableHead>
                    <TableHead className="font-black uppercase text-[10px]">Cliente / CPF</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px]">Valor</TableHead>
                    <TableHead className="text-center font-black uppercase text-[10px]">Peças</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.filter(r => {
                    const matchSearch = r.nf.includes(searchTerm) || r.vendedor.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchCpf = searchCpf === "" || (r.cpf_cnpj_dest && r.cpf_cnpj_dest.includes(searchCpf));
                    const matchChannel = filterChannel === "ALL" || r.canal === filterChannel;
                    const matchVendor = filterVendor === "ALL" || r.vendedor === filterVendor;
                    return matchSearch && matchCpf && matchChannel && matchVendor;
                  }).slice(0, 100).map((r, i) => (
                    <ExpandableRow key={i} row={r} formatCanal={formatCanal} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <section className="bg-white rounded-[2rem] border-4 border-emerald-50 p-6 flex flex-col items-center animate-in zoom-in duration-500 max-w-4xl mx-auto w-full">
             <div className="w-full flex flex-col md:flex-row justify-between items-center mb-8 gap-6 text-center md:text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-2xl"><MessageCircle className="w-8 h-8 text-emerald-600" /></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase">Relatório WhatsApp</h3>
                    <p className="text-xs font-bold text-emerald-600">Pronto para compartilhar!</p>
                  </div>
                </div>
                <Button onClick={() => { navigator.clipboard.writeText(whatsReport); alert("Copiado!"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full px-8 py-6 uppercase text-xs shadow-lg shadow-emerald-100 w-full md:w-auto">Copiar Relatório</Button>
             </div>
             <pre className="w-full h-[400px] p-6 bg-slate-900 text-emerald-400 border-4 border-slate-800 rounded-[1.5rem] font-mono text-[10px] md:text-sm overflow-auto shadow-2xl whitespace-pre-wrap leading-relaxed">
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
      <TableRow className={cn("cursor-pointer hover:bg-orange-50/50", isOpen && "bg-orange-50/50")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="px-4 py-4">{isOpen ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}</TableCell>
        <TableCell className="text-[10px] font-black">
          <p className="text-orange-600">NF {row.nf}</p>
          <p className="text-slate-400 font-bold mt-0.5">{row.dhEmi.substring(0, 10)}</p>
        </TableCell>
        <TableCell className="text-[10px] font-bold">
          <p className="text-slate-700 truncate max-w-[150px]">{row.nome_dest || "Balcão"}</p>
          <p className="text-slate-400 font-mono text-[9px] mt-0.5">{row.cpf_cnpj_dest || "Não Identificado"}</p>
        </TableCell>
        <TableCell className="text-right font-black text-xs">{formatCurrency(row.vNF)}</TableCell>
        <TableCell className="text-center font-black text-xs">{row.itens_qtd}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/30">
          <TableCell colSpan={5} className="p-4 border-b border-orange-100">
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Colaborador: <span className="text-slate-700">{row.vendedor}</span></p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Canal: <span className="text-slate-700">{formatCanal(row.canal)}</span></p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Cadastro: <span className={cn(row.tem_destinatario ? "text-emerald-600" : "text-red-500")}>{row.tem_destinatario ? (row.nome_dest || "IDENTIFICADO") : "NÃO IDENTIFICADO"}</span></p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Status: <span className="text-pink-600">{row.status_auditoria}</span></p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-[8px] font-black uppercase px-3 py-2">Produto</TableHead>
                      <TableHead className="text-center text-[8px] font-black uppercase">Qtd</TableHead>
                      <TableHead className="text-right text-[8px] font-black uppercase px-3">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {row.itens.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-transparent">
                        <TableCell className="text-[9px] font-bold px-3 py-2 line-clamp-1">{item.xProd}</TableCell>
                        <TableCell className="text-center text-[9px] font-black">{item.qCom}</TableCell>
                        <TableCell className="text-right text-[9px] font-black px-3">{formatCurrency(item.vProd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
      <TableRow className={cn("cursor-pointer hover:bg-purple-50/50", isOpen && "bg-purple-50/50")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="px-4 py-4">{isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}</TableCell>
        <TableCell className="text-[10px] font-black truncate max-w-[120px]">
          <p className="text-slate-800 uppercase">{vinculo.nome_cliente || "BALCÃO"}</p>
          <p className="text-slate-400 font-mono text-[8px] mt-0.5">{vinculo.cpf_cliente || "-"}</p>
        </TableCell>
        <TableCell className="text-right font-black text-[10px] text-slate-400">{formatCurrency(vinculo.valor_devolvido)}</TableCell>
        <TableCell className="text-right font-black text-orange-600 px-4 text-xs">{formatCurrency(vinculo.valor_diferenca)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-slate-50/30">
          <TableCell colSpan={4} className="p-4 border-b border-purple-100">
            <div className="space-y-4 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-red-500" /> Entrada (Devolução)</h4>
                   <div className="bg-white rounded-xl border border-red-50 overflow-hidden shadow-sm">
                      <Table>
                        <TableBody>
                          {nEntrada?.itens.map((it, idx) => (
                            <TableRow key={idx} className="hover:bg-transparent">
                              <TableCell className="text-[9px] font-bold px-3 py-1.5">{it.xProd}</TableCell>
                              <TableCell className="text-center text-[9px] font-black">{it.qCom}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </div>
                <div className="space-y-2">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-500" /> Saída (Troca)</h4>
                   <div className="bg-white rounded-xl border border-emerald-50 overflow-hidden shadow-sm">
                      <Table>
                        <TableBody>
                          {nSaida?.itens.map((it, idx) => (
                            <TableRow key={idx} className="hover:bg-transparent">
                              <TableCell className="text-[9px] font-bold px-3 py-1.5">{it.xProd}</TableCell>
                              <TableCell className="text-center text-[9px] font-black">{it.qCom}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </div>
              </div>
              <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-xl">
                 <div>
                    <p className="text-[9px] font-black text-orange-400 uppercase leading-none">Análise da Troca</p>
                    <p className="text-[8px] font-bold opacity-60 mt-1">Operador: {vinculo.vendedor}</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="text-center">
                       <p className="text-[7px] font-black text-slate-400 uppercase">Dif. Peças</p>
                       <p className={cn("text-sm font-black mt-0.5", vinculo.diferenca_itens >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {vinculo.diferenca_itens > 0 ? `+${vinculo.diferenca_itens}` : vinculo.diferenca_itens}
                       </p>
                    </div>
                    <div className="text-center border-l border-white/10 pl-4">
                       <p className="text-[7px] font-black text-orange-400 uppercase">Saldo Pago</p>
                       <p className="text-sm font-black text-emerald-400 mt-0.5">{formatCurrency(vinculo.valor_diferenca)}</p>
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
