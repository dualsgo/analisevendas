"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
const SOCIAL_CODES = [
  '5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', 
  '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', 
  '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', 
  '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', 
  '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', 
  '5097335', '5011918', '5136558'
];

const BARALHO_CODES = ['5147797', '5147796'];
const LANCHINHO_CODES = ['5132632', '5135912', '5132608', '5135830', '5135839'];

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
  BarChart3,
  Heart,
  Coffee
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

    // Ação Social & Lanchinhos & Sazonal
    let totalSocial = 0;
    let cuponsSociais = 0;
    let totalLanchinhos = 0;
    let cuponsLanchinhos = 0;
    let totalSazonal = 0;
    let cuponsSazonal = 0;

    const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];

    const isSazonal = (it: any) => {
      if (SLP_CODES.includes(it.cProd)) return true;
      return it.xProd.toUpperCase().includes("SLP");
    };

    const isSocial = (it: any) => {
      if (SOCIAL_CODES.includes(it.cProd) || BARALHO_CODES.includes(it.cProd) || LANCHINHO_CODES.includes(it.cProd)) return true;
      const p = it.xProd.toUpperCase();
      return p.includes("BARALHO") || p.includes("ACAO SOCIAL") || p.includes("DOACAO") || p.includes("ALMANAQUE") || p.includes("SACOLA");
    };

    activeSales.forEach(sale => {
      let hasSocialInCupom = false;
      let hasLanchinhoInCupom = false;
      let hasSazonalInCupom = false;
      
      sale.itens.forEach(it => {
        if (LANCHINHO_CODES.includes(it.cProd)) {
          totalLanchinhos += it.qCom;
          hasLanchinhoInCupom = true;
        }
        
        if (isSocial(it)) {
          totalSocial += it.qCom;
          hasSocialInCupom = true;
        }

        if (isSazonal(it)) {
          totalSazonal += it.qCom;
          hasSazonalInCupom = true;
        }
      });
      if (hasSocialInCupom) cuponsSociais++;
      if (hasLanchinhoInCupom) cuponsLanchinhos++;
      if (hasSazonalInCupom) cuponsSazonal++;
    });

    // Melhor Mês
    const monthSales: Record<string, number> = {};
    activeSales.forEach(s => {
      const m = s.dhEmi.substring(0, 7); // YYYY-MM
      monthSales[m] = (monthSales[m] || 0) + parseFloat(s.vNF);
    });
    const topMonth = Object.entries(monthSales).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    const hasMultipleMonths = Object.keys(monthSales).length > 1;

    const calcStats = (sales: DetailedSaleRow[]) => {
      const v = sales.reduce((acc, s) => acc + parseFloat(s.vNF), 0);
      const c = sales.length;
      const i = sales.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
      return { 
        venda: v, 
        cupons: c, 
        itens: i, 
        tkm: c > 0 ? v / c : 0, 
        pa: c > 0 ? i / c : 0,
        pm: i > 0 ? v / i : 0
      };
    };

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
      channelsDetail: {
        fisica: calcStats(fisica),
        pickup: calcStats(pickup),
        adicional: calcStats(adicional)
      },
      topVendor: { name: topVendor[0], value: topVendor[1] },
      topDay: { date: topDay[0], value: topDay[1] },
      topMonth: { date: topMonth[0], value: topMonth[1] },
      hasMultipleMonths,
      social: { items: totalSocial, participation: totalCupons > 0 ? (cuponsSociais / totalCupons) * 100 : 0 },
      lanchinhos: { items: totalLanchinhos, participation: totalCupons > 0 ? (cuponsLanchinhos / totalCupons) * 100 : 0 },
      sazonal: { items: totalSazonal, participation: totalCupons > 0 ? (cuponsSazonal / totalCupons) * 100 : 0 },
      monthList: Object.entries(monthSales).map(([month, venda]) => {
        const monthRows = activeSales.filter(s => s.dhEmi.substring(0, 7) === month);
        const cupons = monthRows.length;
        return {
          month,
          venda,
          cupons,
          tkm: cupons > 0 ? venda / cupons : 0
        };
      }).sort((a, b) => a.month.localeCompare(b.month)),
      pickupConv: pickup.length > 0 ? (adicional.length / pickup.length) * 100 : 0
    };
  }, [activeSales, vinculos]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Compact Hero Section */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-4 md:px-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
           <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
             <Sparkles className="w-5 h-5" />
           </div>
           <div>
             <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">{formatBRL(stats.venda)}</h1>
             <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1">Faturamento Total Consolidado</p>
           </div>
        </div>
        <div className="flex items-center justify-center gap-6 md:gap-8 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
           <div className="text-center lg:text-right">
             <p className="text-lg md:text-xl font-black text-slate-800 leading-none">{stats.cupons}</p>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tickets</p>
           </div>
           <div className="text-center lg:text-right">
             <p className="text-lg md:text-xl font-black text-slate-800 leading-none">{stats.itens}</p>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Peças</p>
           </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          label="Ação Social" 
          value={`${stats.social.participation.toFixed(1)}%`} 
          desc={`${stats.social.items} Itens (Baralhos/Sacolas/Lanchinhos)`} 
          icon={Heart} 
          color="text-rose-600" 
          tooltip="Percentual de cupons que possuem itens de Ação Social."
        />
        <MetricCard 
          label="Sazonal (SLP)" 
          value={`${stats.sazonal.participation.toFixed(1)}%`} 
          desc={`${stats.sazonal.items} Itens (SLP)`} 
          icon={ShoppingBag} 
          color="text-fuchsia-600" 
          tooltip="Percentual de cupons que possuem itens Sazonais (SLP)."
        />

        <div onClick={() => onSwitchTab?.("pickup_dashboard")} className="cursor-pointer">
          <MetricCard 
            label="Conversão Pickup" 
            value={`${stats.pickupConv.toFixed(1)}%`} 
            desc="Fórmula: Adicionais / Pickups" 
            icon={Smartphone} 
            color="text-indigo-600" 
            tooltip="Percentual de clientes que vieram retirar um pedido online e acabaram comprando algo a mais na loja."
          />
        </div>
      </div>

      {/* Main Insights Content (Redistributed) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        
        {/* Composição por Canal (Compact) */}
        <Card className="ri-card border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <PieChart className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight">Composição por Canal</h3>
          </div>
          <CardContent className="p-4 flex-1 flex flex-col justify-center">
            <div className="space-y-4">
              <ChannelProgress label="Loja Física" value={stats.channels.fisica} total={stats.venda} color="bg-slate-800" icon={Calendar} />
              <ChannelProgress label="Pickup Online" value={stats.channels.pickup} total={stats.venda} color="bg-sky-500" icon={Smartphone} />
              <ChannelProgress label="Venda Adicional" value={stats.channels.adicional} total={stats.venda} color="bg-emerald-500" icon={Zap} />
              <ChannelProgress label="Diferença Troca" value={stats.channels.troca} total={stats.venda} color="bg-purple-500" icon={ArrowRightLeft} />
            </div>
          </CardContent>
        </Card>

        {/* Destaques do Período */}
        <Card className="ri-card bg-slate-900 text-white border-none p-4 shadow-xl flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Destaques</h3>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Melhor Vendedor</p>
              <p className="text-lg md:text-xl font-black text-white uppercase tracking-tight">{stats.topVendor.name}</p>
              <p className="text-[10px] font-bold text-orange-400">{formatBRL(stats.topVendor.value)}</p>
            </div>
            <div className="border-t border-slate-800 pt-3">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Melhor Dia (Faturamento)</p>
              <p className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                {stats.topDay.date !== "-" ? format(parseISO(stats.topDay.date), "dd 'de' MMMM", { locale: ptBR }) : "-"}
              </p>
              <p className="text-[10px] font-bold text-emerald-400">{formatBRL(stats.topDay.value)}</p>
            </div>
          </div>
        </Card>

        {/* Evolução Mensal ou Card de Preenchimento */}
        {stats.hasMultipleMonths ? (
          <Card className="ri-card border-slate-100 p-4 overflow-hidden flex flex-col lg:col-span-2 xl:col-span-1">
             <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-tight">Evolução Mensal</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {stats.monthList.map((m: any, i: number) => (
                <div key={m.month} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none">
                  <div>
                    <p className="text-[10px] font-black text-slate-700 uppercase">{format(parseISO(m.month + "-01"), "MMM yy", { locale: ptBR })}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{m.cupons} Tickets</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-slate-900">{formatBRL(m.venda)}</p>
                    <p className="text-[9px] font-bold text-indigo-600">{formatBRL(m.tkm)} TKM</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
           <Card className="ri-card bg-indigo-600 text-white border-none p-4 shadow-xl flex flex-col justify-center items-center text-center lg:col-span-2 xl:col-span-1 opacity-90 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full pointer-events-none" />
             <Sparkles className="w-8 h-8 mb-3 text-indigo-300" />
             <h3 className="text-lg font-black uppercase tracking-widest text-white mb-1">Análise Concluída</h3>
             <p className="text-[10px] font-medium text-indigo-200">As métricas do período selecionado foram calculadas com sucesso.</p>
           </Card>
        )}
      </div>

      {/* Channel Performance Detailed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChannelStatsCard title="Loja Física" stats={stats.channelsDetail.fisica} icon={Calendar} theme="bg-slate-800 text-white" accent="text-slate-400" border="border-slate-700" />
        <ChannelStatsCard title="Pickup Online" stats={stats.channelsDetail.pickup} icon={Smartphone} theme="bg-sky-50 text-sky-900" accent="text-sky-600" border="border-sky-100" />
        <ChannelStatsCard title="Venda Adicional" stats={stats.channelsDetail.adicional} icon={Zap} theme="bg-emerald-50 text-emerald-900" accent="text-emerald-600" border="border-emerald-100" />
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

function ChannelStatsCard({ title, stats, icon: Icon, theme, accent, border }: any) {
  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <Card className={cn("p-6 ri-card flex flex-col gap-5", theme, border)}>
      <div className="flex items-center justify-between pb-4 border-b border-black/5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl bg-white/20 shadow-sm")}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-black uppercase tracking-tight text-sm">{title}</h3>
        </div>
        <p className="text-xl font-black">{formatBRL(stats.venda)}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className={cn("text-[9px] font-black uppercase tracking-widest", accent)}>Tickets</p>
          <p className="text-lg font-black">{stats.cupons}</p>
        </div>
        <div>
          <p className={cn("text-[9px] font-black uppercase tracking-widest", accent)}>Itens</p>
          <p className="text-lg font-black">{stats.itens}</p>
        </div>
        <div>
          <p className={cn("text-[9px] font-black uppercase tracking-widest", accent)}>Ticket Médio</p>
          <p className="text-lg font-black">{formatBRL(stats.tkm)}</p>
        </div>
        <div>
          <p className={cn("text-[9px] font-black uppercase tracking-widest", accent)}>P.A.</p>
          <p className="text-lg font-black">{stats.pa.toFixed(2)}</p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className={cn("text-[9px] font-black uppercase tracking-widest", accent)}>P.M. (Preço Médio)</p>
          <p className="text-lg font-black">{formatBRL(stats.pm)}</p>
        </div>
      </div>
    </Card>
  );
}
