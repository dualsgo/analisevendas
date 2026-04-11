"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Heart, 
  TrendingUp, 
  Users, 
  Calendar,
  Package,
  Award,
  BarChart3,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface SocialActionPanelProps {
  data: DetailedSaleRow[];
}

const SOCIAL_CODES = [
  '5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', 
  '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', 
  '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', 
  '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', 
  '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', 
  '5097335', '5011918', '5136558'
];

export function SocialActionPanel({ data }: SocialActionPanelProps) {
  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const isBaralho = (it: any) => {
      const p = it.xProd.toUpperCase();
      return p.includes("BARALHO") || p.includes("ACAO SOCIAL") || p.includes("DOACAO") || p.includes("ALMANAQUE");
    };
    
    const isSacola = (it: any) => {
      const p = it.xProd.toUpperCase();
      return p.includes("SACOLA");
    };

    const vendorStats: Record<string, { name: string, baralhos: number, sacolas: number, total: number }> = {};
    const dailyStats: Record<string, { day: string, baralhos: number, sacolas: number }> = {};
    const monthlyStats: Record<string, { month: string, baralhos: number, sacolas: number }> = {};

    let totalBaralhos = 0;
    let totalSacolas = 0;

    activeSales.forEach(sale => {
      const v = sale.vendedor || "OUTROS";
      if (!vendorStats[v]) vendorStats[v] = { name: v, baralhos: 0, sacolas: 0, total: 0 };

      const day = sale.dhEmi.substring(0, 10);
      const month = sale.dhEmi.substring(0, 7);

      if (!dailyStats[day]) dailyStats[day] = { day, baralhos: 0, sacolas: 0 };
      if (!monthlyStats[month]) monthlyStats[month] = { month, baralhos: 0, sacolas: 0 };

      sale.itens.forEach(it => {
        const isSocial = SOCIAL_CODES.includes(it.cProd) || isBaralho(it) || isSacola(it);
        
        if (isSocial) {
          if (isBaralho(it)) {
            vendorStats[v].baralhos += it.qCom;
            dailyStats[day].baralhos += it.qCom;
            monthlyStats[month].baralhos += it.qCom;
            totalBaralhos += it.qCom;
          } else if (isSacola(it)) {
            vendorStats[v].sacolas += it.qCom;
            dailyStats[day].sacolas += it.qCom;
            monthlyStats[month].sacolas += it.qCom;
            totalSacolas += it.qCom;
          }
          vendorStats[v].total += it.qCom;
        }
      });
    });

    const topVendors = Object.values(vendorStats).sort((a, b) => b.total - a.total);
    
    const chartDataDaily = Object.values(dailyStats).sort((a, b) => a.day.localeCompare(b.day)).map(d => ({
      label: format(parseISO(d.day), "dd/MM"),
      baralhos: d.baralhos,
      sacolas: d.sacolas
    }));

    const chartDataMonthly = Object.values(monthlyStats).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      label: format(parseISO(m.month + "-01"), "MMM/yy", { locale: ptBR }).toUpperCase(),
      baralhos: m.baralhos,
      sacolas: m.sacolas
    }));

    return {
      totalBaralhos,
      totalSacolas,
      topVendors,
      chartDataDaily,
      chartDataMonthly,
      totalCoupons: activeSales.length
    };
  }, [data]);

  const baralhoParticipation = stats.totalCoupons > 0 ? (stats.totalBaralhos / stats.totalCoupons) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-rose-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-100">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Vendas Ação Social</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monitor de Baralhos e Sacolas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Baralhos</p>
            <p className="text-2xl font-black text-rose-600 leading-none">🃏 {stats.totalBaralhos}</p>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Sacolas</p>
            <p className="text-2xl font-black text-emerald-600 leading-none">🛍️ {stats.totalSacolas}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métricas e Ranking */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="ri-card border-none bg-rose-600 text-white p-6 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">Performance Geral</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase opacity-60">Participação Baralhos</p>
                  <p className="text-3xl font-black tracking-tighter">{baralhoParticipation.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-20" />
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Meta Sugerida: 15%</p>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${Math.min(baralhoParticipation * (100/15), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="ri-card border-slate-100">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ranking por Vendedor</CardTitle>
              <Users className="w-4 h-4 text-slate-300" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {stats.topVendors.slice(0, 10).map((v, i) => (
                  <div key={v.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                        {i + 1}
                      </div>
                      <span className="text-[11px] font-black text-slate-700 uppercase">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                         <span className="text-[10px] font-black text-rose-600">🃏{v.baralhos}</span>
                      </div>
                      <div className="text-center">
                         <span className="text-[10px] font-black text-emerald-600">🛍️{v.sacolas}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos Diário e Mensal */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="ri-card overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Evolução Diária
              </CardTitle>
              <Badge variant="outline" className="bg-white text-[9px] font-black uppercase">Últimos Dias</Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartDataDaily}>
                    <defs>
                      <linearGradient id="colorBaralhos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="baralhos" stroke="#e11d48" strokeWidth={3} fill="url(#colorBaralhos)" name="Baralhos 🃏" />
                    <Area type="monotone" dataKey="sacolas" stroke="#10b981" strokeWidth={2} fill="transparent" name="Sacolas 🛍️" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="ri-card overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Performance Mensal
              </CardTitle>
              <Badge variant="outline" className="bg-white text-[9px] font-black uppercase">Histórico</Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartDataMonthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar dataKey="baralhos" fill="#e11d48" radius={[4, 4, 0, 0]} name="Baralhos 🃏" />
                    <Bar dataKey="sacolas" fill="#10b981" radius={[4, 4, 0, 0]} name="Sacolas 🛍️" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
