"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Target, 
  ShoppingBag, 
  Smartphone, 
  Zap, 
  ArrowRightLeft,
  Award,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronRight,
  PieChart,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExecutiveSummaryProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
  onSwitchTab?: (tab: string) => void;
}

export function ExecutiveSummary({ data, vinculos, onSwitchTab }: ExecutiveSummaryProps) {
  const activeSales = useMemo(() => data.filter(s => !s.is_cancelada && s.tpNF === 1), [data]);

  const stats = useMemo(() => {
    const totalVenda = activeSales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
    const totalCupons = activeSales.length;
    const totalItens = activeSales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
    const identified = activeSales.filter(s => s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "").length;

    // Canais
    const fisica = activeSales.filter(s => s.canal === "LOJA_FISICA" && !s.is_adicional && !s.is_adicional_suspeito);
    const pickup = activeSales.filter(s => s.canal === "RETIRADA_ONLINE");
    const adicional = activeSales.filter(s => s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito);
    const trocaVal = vinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);

    // Melhor Vendedor
    const vendorSales: Record<string, number> = {};
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      vendorSales[v] = (vendorSales[v] || 0) + parseFloat(s.vNF);
    });
    const topVendor = Object.entries(vendorSales).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

    // Melhor Dia
    const daySales: Record<string, number> = {};
    activeSales.forEach(s => {
      const d = s.dhEmi.split("T")[0];
      daySales[d] = (daySales[d] || 0) + parseFloat(s.vNF);
    });
    const topDay = Object.entries(daySales).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

    return {
      venda: totalVenda,
      cupons: totalCupons,
      itens: totalItens,
      tkm: totalCupons > 0 ? totalVenda / totalCupons : 0,
      pa: totalCupons > 0 ? totalItens / totalCupons : 0,
      identPerc: totalCupons > 0 ? (identified / totalCupons) * 100 : 0,
      channels: {
        fisica: fisica.reduce((acc, s) => acc + parseFloat(s.vNF), 0),
        pickup: pickup.reduce((acc, s) => acc + parseFloat(s.vNF), 0),
        adicional: adicional.reduce((acc, s) => acc + parseFloat(s.vNF), 0),
        troca: trocaVal
      },
      topVendor: { name: topVendor[0], value: topVendor[1] },
      topDay: { date: topDay[0], value: topDay[1] },
      pickupConv: pickup.length > 0 ? (adicional.length / pickup.length) * 100 : 0
    };
  }, [activeSales, vinculos]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="bg-white rounded-[2.5rem] p-8 border-2 border-indigo-50 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Resumo Estratégico do Período
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter leading-none">
              {formatBRL(stats.venda)}
            </h1>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">Faturamento Total Consolidado</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
             <HighlightCard 
                label="Tickets" 
                value={stats.cupons} 
                icon={ShoppingBag} 
                color="bg-emerald-50 text-emerald-600" 
             />
             <HighlightCard 
                label="Peças" 
                value={stats.itens} 
                icon={Zap} 
                color="bg-amber-50 text-amber-600" 
             />
          </div>
        </div>
      </section>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Ticket Médio" 
          value={formatBRL(stats.tkm)} 
          desc="Valor médio por cupom" 
          icon={Target} 
          color="text-indigo-600" 
        />
        <MetricCard 
          label="P.A. Geral" 
          value={stats.pa.toFixed(2)} 
          desc="Peças por atendimento" 
          icon={Award} 
          color="text-sky-600" 
        />
        <MetricCard 
          label="Identificação" 
          value={`${stats.identPerc.toFixed(1)}%`} 
          desc="Clientes identificados com CPF" 
          icon={Users} 
          color="text-emerald-600" 
        />
        <MetricCard 
          label="Conversão Pickup" 
          value={`${stats.pickupConv.toFixed(1)}%`} 
          desc="Fórmula: Adicionais / Pickups" 
          icon={Smartphone} 
          color="text-orange-600" 
          tooltip="Percentual de clientes que vieram retirar um pedido online e acabaram comprando algo a mais na loja."
        />
      </div>

      {/* Main Insights Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Mix Table */}
        <Card className="ri-card lg:col-span-2 border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PieChart className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Composição por Canal</h3>
            </div>
            <button 
              onClick={() => onSwitchTab?.("composicao")}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1"
            >
              Ver Detalhes <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <CardContent className="p-6">
            <div className="space-y-5">
              <ChannelProgress label="Loja Física" value={stats.channels.fisica} total={stats.venda} color="bg-slate-800" icon={Calendar} />
              <ChannelProgress label="Pickup Online" value={stats.channels.pickup} total={stats.venda} color="bg-sky-500" icon={Smartphone} />
              <ChannelProgress label="Venda Adicional" value={stats.channels.adicional} total={stats.venda} color="bg-emerald-500" icon={Zap} />
              <ChannelProgress label="Diferença Troca" value={stats.channels.troca} total={stats.venda} color="bg-purple-500" icon={ArrowRightLeft} />
            </div>
          </CardContent>
        </Card>

        {/* Highlights Sidebar */}
        <div className="space-y-6">
          <Card className="ri-card bg-slate-900 text-white border-none p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-5 h-5 text-orange-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Destaques do Período</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Melhor Vendedor</p>
                <p className="text-xl font-black text-white uppercase tracking-tight">{stats.topVendor.name}</p>
                <p className="text-xs font-bold text-orange-400">{formatBRL(stats.topVendor.value)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Melhor Dia (Faturamento)</p>
                <p className="text-xl font-black text-white uppercase tracking-tight">
                  {stats.topDay.date !== "-" ? format(parseISO(stats.topDay.date), "dd 'de' MMMM", { locale: ptBR }) : "-"}
                </p>
                <p className="text-xs font-bold text-emerald-400">{formatBRL(stats.topDay.value)}</p>
              </div>
            </div>

          </Card>

        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, desc, icon: Icon, color, tooltip }: any) {
  return (
    <Card className="ri-card p-6 border-slate-100 hover:border-indigo-100 transition-all group overflow-hidden relative">
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all transform group-hover:scale-110">
        <Icon className="w-24 h-24" />
      </div>
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between">
           <div className={cn("p-2 rounded-xl bg-slate-50 inline-block", color)}>
             <Icon className="w-5 h-5" />
           </div>
           {tooltip && (
             <div className="bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                {tooltip}
             </div>
           )}
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black text-slate-800 tracking-tighter">{value}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mt-1">{desc}</p>
        </div>
      </div>
    </Card>
  );
}

function HighlightCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className={cn("rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-1 min-w-[120px]", color)}>
      <Icon className="w-5 h-5 mb-1" />
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">{label}</p>
    </div>
  );
}

function ChannelProgress({ label, value, total, color, icon: Icon }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg bg-slate-50 text-slate-400")}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-black text-slate-800">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          <span className="text-[9px] font-bold text-slate-400 ml-2">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}
