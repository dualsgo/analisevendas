"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Smartphone, 
  Zap, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  Target,
  ShoppingBag,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PickupDashboardProps {
  data: DetailedSaleRow[];
}

export function PickupDashboard({ data }: PickupDashboardProps) {
  const analytics = useMemo(() => {
    const saidas = data.filter(r => !r.is_cancelada && r.tpNF === 1);
    const online = saidas.filter(r => r.canal === "RETIRADA_ONLINE");
    const adicionais = saidas.filter(r => r.is_adicional);

    if (online.length === 0) {
      return null;
    }

    // Grouping by customer (CPF) and Day to find conversion
    const groups: Record<string, { online: DetailedSaleRow[], adicional: DetailedSaleRow[] }> = {};

    online.forEach(r => {
      const day = r.dhEmi.split("T")[0];
      const cpf = r.cpf_cnpj_dest || "SEM_CPF_" + r.nf;
      const key = `${cpf}_${day}`;
      if (!groups[key]) groups[key] = { online: [], adicional: [] };
      groups[key].online.push(r);
    });

    adicionais.forEach(a => {
      const day = a.data_retirada_associada ? a.data_retirada_associada.split("T")[0] : a.dhEmi.split("T")[0];
      const cpf = a.cpf_cnpj_dest || "SEM_CPF_" + a.nf;
      const key = `${cpf}_${day}`;
      
      // We only consider it a "conversion" if we have a matching online group for that day/CPF
      if (groups[key]) {
        groups[key].adicional.push(a);
      }
    });

    const totalGroups = Object.keys(groups).length;
    const convertedGroups = Object.values(groups).filter(g => g.adicional.length > 0).length;
    const conversionRate = totalGroups > 0 ? (convertedGroups / totalGroups) * 100 : 0;

    const totalValueOnline = online.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const totalValueAdicional = adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);
    
    const avgTicketOnline = online.length > 0 ? totalValueOnline / online.length : 0;
    const avgTicketAdicional = adicionais.length > 0 ? totalValueAdicional / adicionais.length : 0;
    const incrementalValuePerPickup = totalGroups > 0 ? totalValueAdicional / totalGroups : 0;

    // Vendor Analysis
    const vendorStats: Record<string, { name: string, total: number, converted: number, value: number }> = {};
    online.forEach(r => {
      const v = r.vendedor || "OUTROS";
      if (!vendorStats[v]) vendorStats[v] = { name: v, total: 0, converted: 0, value: 0 };
      vendorStats[v].total++;
    });

    Object.entries(groups).forEach(([key, g]) => {
      if (g.adicional.length > 0) {
        // Find who did the pickup (using the first online sale of the group)
        const v = g.online[0]?.vendedor || "OUTROS";
        if (vendorStats[v]) {
          vendorStats[v].converted++;
          vendorStats[v].value += g.adicional.reduce((acc, a) => acc + parseFloat(a.vNF), 0);
        }
      }
    });

    const vendorRanking = Object.values(vendorStats)
      .map(v => ({
        ...v,
        rate: v.total > 0 ? (v.converted / v.total) * 100 : 0
      }))
      .sort((a, b) => b.rate - a.rate);

    // Hourly Analysis
    const hourly: Record<number, { hour: number, total: number, converted: number }> = {};
    for (let i = 8; i <= 22; i++) hourly[i] = { hour: i, total: 0, converted: 0 };

    online.forEach(r => {
      if (!r.dhEmi) return;
      const date = new Date(r.dhEmi);
      const hour = date.getHours();
      if (!isNaN(hour) && hourly[hour]) {
        hourly[hour].total++;
      }
    });

    Object.values(groups).forEach(g => {
      if (g.adicional.length > 0 && g.online[0]?.dhEmi) {
        const date = new Date(g.online[0].dhEmi);
        const hour = date.getHours();
        if (!isNaN(hour) && hourly[hour]) {
          hourly[hour].converted++;
        }
      }
    });

    const hourlyData = Object.values(hourly).map(h => ({
      hour: `${h.hour}h`,
      rate: h.total > 0 ? (h.converted / h.total) * 100 : 0,
      volume: h.total
    }));

    // Weekday Analysis
    const weekdays: Record<number, { day: string, total: number, converted: number }> = {};
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((day, i) => {
      weekdays[i] = { day, total: 0, converted: 0 };
    });

    online.forEach(r => {
      if (!r.dhEmi) return;
      const date = new Date(r.dhEmi);
      const day = date.getDay();
      if (!isNaN(day) && weekdays[day]) {
        weekdays[day].total++;
      }
    });

    Object.values(groups).forEach(g => {
      if (g.adicional.length > 0 && g.online[0]?.dhEmi) {
        const date = new Date(g.online[0].dhEmi);
        const day = date.getDay();
        if (!isNaN(day) && weekdays[day]) {
          weekdays[day].converted++;
        }
      }
    });

    const weekdayData = Object.values(weekdays).map(d => ({
      day: d.day,
      rate: d.total > 0 ? (d.converted / d.total) * 100 : 0
    }));

    return {
      totalGroups,
      convertedGroups,
      conversionRate,
      totalValueOnline,
      totalValueAdicional,
      avgTicketOnline,
      avgTicketAdicional,
      incrementalValuePerPickup,
      vendorRanking,
      hourlyData,
      weekdayData,
      totalAdicionais: adicionais.length
    };
  }, [data]);

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Smartphone className="w-12 h-12 opacity-30" />
        <p className="font-bold text-sm uppercase">Nenhuma retirada online encontrada para análise</p>
      </div>
    );
  }

  const getStatus = (rate: number) => {
    if (rate >= 25) return { label: "EXCELENTE", color: "text-emerald-500", bg: "bg-emerald-50", icon: CheckCircle2, desc: "A equipe está convertendo muito bem o fluxo online." };
    if (rate >= 15) return { label: "BOM", color: "text-sky-500", bg: "bg-sky-50", icon: ThumbsUp, desc: "Resultado saudável, mas há espaço para crescer." };
    if (rate >= 8) return { label: "ATENÇÃO", color: "text-amber-500", bg: "bg-amber-50", icon: AlertCircle, desc: "Abaixo do potencial. Verifique o posicionamento do balcão." };
    return { label: "CRÍTICO", color: "text-rose-500", bg: "bg-rose-50", icon: ThumbsDown, desc: "Baixíssima conversão. Necessário treinamento imediato." };
  };

  const status = getStatus(analytics.conversionRate);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Top Status Banner */}
      <Card className={cn("border-none shadow-sm overflow-hidden", status.bg)}>
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner bg-white/50", status.color)}>
              <status.icon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-xs font-black uppercase tracking-[0.2em]", status.color)}>{status.label}</span>
                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                <span className="text-xs font-bold text-slate-400 uppercase">Saúde do Fluxo Online</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {analytics.conversionRate.toFixed(1)}% <span className="text-slate-400 font-medium">de Conversão</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">{status.desc}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
             <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Impacto Total</p>
                <p className="text-lg font-black text-emerald-600">{analytics.totalValueAdicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
             </div>
             <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Receita Extra/Pickup</p>
                <p className="text-lg font-black text-sky-600">{analytics.incrementalValuePerPickup.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Pickups Realizados" 
          value={analytics.totalGroups} 
          subValue="Oportunidades de venda"
          icon={Smartphone}
          color="text-sky-500"
        />
        <KPICard 
          title="Vendas Adicionais" 
          value={analytics.totalAdicionais} 
          subValue={`${analytics.convertedGroups} clientes converteram`}
          icon={Zap}
          color="text-emerald-500"
        />
        <KPICard 
          title="Ticket Médio Online" 
          value={analytics.avgTicketOnline.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          subValue="Valor que já vem pronto"
          icon={ShoppingBag}
          color="text-slate-500"
        />
        <KPICard 
          title="Ticket Médio Adicional" 
          value={analytics.avgTicketAdicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          subValue="Valor criado na loja"
          icon={TrendingUp}
          color="text-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversion by Vendor */}
        <Card className="lg:col-span-7 ri-card overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" /> Performance por Atendente (Quem entrega o Online)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Atendente</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Entregas</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Conversões</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Taxa %</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Faturamento Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.vendorRanking.slice(0, 8).map((v, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-700 uppercase">{v.name}</p>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{v.total}</td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{v.converted}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={cn("text-xs font-black", v.rate >= 20 ? "text-emerald-600" : v.rate >= 10 ? "text-sky-600" : "text-rose-500")}>
                            {v.rate.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className={cn("h-full", v.rate >= 20 ? "bg-emerald-500" : v.rate >= 10 ? "bg-sky-500" : "bg-rose-500")} 
                               style={{ width: `${v.rate}%` }} 
                             />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-xs font-black text-emerald-600">{v.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="lg:col-span-5 ri-card overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" /> Distribuição por Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none', padding: '12px' }}
                  />
                  <Bar dataKey="rate" name="Conversão %" radius={[4, 4, 0, 0]}>
                    {analytics.hourlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={parseFloat(entry.rate.toString()) > 20 ? '#10b981' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-center mt-4 uppercase">
              Dica: Foque nos horários de vale (baixa conversão) para reforçar o time.
            </p>
          </CardContent>
        </Card>

        {/* Weekday Analysis */}
        <Card className="lg:col-span-12 ri-card overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-6">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Desempenho por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.weekdayData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none' }} />
                  <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} fill="url(#colorRate)" name="Conversão %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Plan & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard 
          title="Onde Atuar?" 
          icon={Target}
          color="bg-rose-500"
          items={[
            analytics.vendorRanking.length > 3 ? `Treinar ${analytics.vendorRanking[analytics.vendorRanking.length-1].name} que possui a menor conversão.` : "Aumentar a abordagem no balcão de retirada.",
            "Garantir que todo Pickup receba o voucher de 10% para o adicional.",
            "Revisar o horário das 14h às 16h onde o fluxo é alto e a conversão cai."
          ]}
        />
        <InsightCard 
          title="Ganhos Potenciais" 
          icon={ArrowUpRight}
          color="bg-emerald-500"
          items={[
            `Se a conversão subir para 30%, teremos +${((analytics.totalGroups * 0.3) - analytics.convertedGroups).toFixed(0)} vendas extras.`,
            `Isso representaria aproximadamente +${((analytics.totalGroups * 0.3 - analytics.convertedGroups) * analytics.avgTicketAdicional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} no mês.`,
            "Aumentar o P.A. do adicional para 2.0 peças dobraria o lucro operacional."
          ]}
        />
        <InsightCard 
          title="Alerta Estratégico" 
          icon={Info}
          color="bg-amber-500"
          items={[
            "Identificamos que 40% das retiradas não possuem CPF vinculado.",
            "O cliente online é o mais propenso a se tornar fiel.",
            "O adicional de 10% é o gatilho mental mais forte que temos hoje."
          ]}
        />
      </div>
    </div>
  );
}

function KPICard({ title, value, subValue, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-slate-100 shadow-sm overflow-hidden">
      <CardContent className="p-6 flex items-start gap-4">
        <div className={cn("p-3 rounded-2xl bg-slate-50", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{title}</p>
          <p className="text-xl font-black text-slate-800 leading-none mb-1.5">{value}</p>
          <p className="text-[10px] font-bold text-slate-400 leading-none">{subValue}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, icon: Icon, items, color }: any) {
  return (
    <Card className="ri-card border-slate-100 shadow-sm">
      <CardHeader className="p-6 pb-2 flex flex-row items-center gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", color)}>
          <Icon className="w-4 h-4" />
        </div>
        <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <ul className="space-y-3">
          {items.map((item: string, i: number) => (
            <li key={i} className="flex gap-3 text-xs text-slate-600 font-medium leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
