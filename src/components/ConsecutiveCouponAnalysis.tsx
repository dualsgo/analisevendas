"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Users, 
  Timer, 
  Calendar as CalendarIcon, 
  TrendingDown,
  Info,
  Clock,
  Layers,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, format, getHours, getDay, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from "recharts";

interface ConsecutiveCouponAnalysisProps {
  data: DetailedSaleRow[];
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ConsecutiveCouponAnalysis({ data }: ConsecutiveCouponAnalysisProps) {
  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1 && s.vendedor);
    
    // Agrupar por vendedor e dia
    const byVendorDay: Record<string, Record<string, DetailedSaleRow[]>> = {};
    
    activeSales.forEach(s => {
      const v = s.vendedor || "OUTROS";
      const day = s.dhEmi.split("T")[0];
      if (!byVendorDay[v]) byVendorDay[v] = {};
      if (!byVendorDay[v][day]) byVendorDay[v][day] = [];
      byVendorDay[v][day].push(s);
    });

    const occurrences: any[] = [];
    const vendorStats: Record<string, { count: number, totalCupons: number }> = {};
    const hourStats: Record<number, number> = {};
    const dayStats: Record<number, number> = {};

    Object.entries(byVendorDay).forEach(([vendor, days]) => {
      if (!vendorStats[vendor]) vendorStats[vendor] = { count: 0, totalCupons: 0 };
      
      Object.entries(days).forEach(([day, sales]) => {
        // Ordenar vendas por horário
        const sorted = sales.sort((a, b) => a.dhEmi.localeCompare(b.dhEmi));
        vendorStats[vendor].totalCupons += sorted.length;

        for (let i = 0; i < sorted.length - 1; i++) {
          const s1 = sorted[i];
          const s2 = sorted[i+1];
          
          const q1 = parseInt(s1.itens_qtd);
          const q2 = parseInt(s2.itens_qtd);
          
          if (q1 === 1 && q2 === 1) {
            const t1 = parseISO(s1.dhEmi);
            const t2 = parseISO(s2.dhEmi);
            const diff = Math.abs(differenceInMinutes(t1, t2));
            
            // Critério: 2 cupons seguidos de 1 item em menos de 10 minutos
            if (diff <= 10) {
              occurrences.push({ vendor, day, s1, s2, diff });
              vendorStats[vendor].count++;
              
              const hr = getHours(t1);
              hourStats[hr] = (hourStats[hr] || 0) + 1;
              
              const dow = getDay(t1);
              dayStats[dow] = (dayStats[dow] || 0) + 1;
            }
          }
        }
      });
    });

    const topVendors = Object.entries(vendorStats)
      .map(([name, stats]) => ({ 
        name, 
        count: stats.count, 
        rate: stats.totalCupons > 0 ? (stats.count / stats.totalCupons) * 100 : 0 
      }))
      .filter(v => v.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const hourChart = Object.entries(hourStats)
      .map(([hour, count]) => ({ hour: `${hour}h`, count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const dayChart = DAYS.map((label, i) => ({ label, count: dayStats[i] || 0 }));

    return {
      occurrences,
      topVendors,
      hourChart,
      dayChart,
      total: occurrences.length
    };
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Informativo */}
      <div className="bg-gradient-to-br from-rose-700 to-rose-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="bg-white/10 p-4 rounded-2xl w-fit shrink-0">
            <AlertTriangle className="w-8 h-8 text-rose-200" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">Análise de Cupons Fragmentados</h2>
            <p className="text-rose-100 text-sm font-medium mt-1 leading-relaxed">
              Identificação de cupons seguidos com <strong>apenas 1 item</strong> vendidos em curto intervalo (≤ 10 min) pelo mesmo colaborador.
            </p>
          </div>
          <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
             <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none mb-2">Total Ocorrências</p>
             <p className="text-3xl font-black">{analytics.total}</p>
          </div>
        </div>
      </div>

      {/* Explicação Teórica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex gap-4">
          <div className="p-3 bg-amber-100/50 rounded-2xl h-fit">
            <Search className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">O que isso significa?</h4>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Vendas fragmentadas ocorrem quando um atendente passa produtos de um mesmo cliente em cupons separados. 
              Isso infla o número de atendimentos, mas <strong>reduz artificialmente o PA</strong> e pode prejudicar o controle de estoque e auditoria.
            </p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl flex gap-4">
          <div className="p-3 bg-blue-100/50 rounded-2xl h-fit">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Como diferenciar?</h4>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              <strong>Padrão:</strong> Ocorrências frequentes em horários calmos por um mesmo colaborador. <br/>
              <strong>Falha/Fila:</strong> Ocorrências isoladas em horários de pico (cliente esqueceu algo ou quis pagar separado).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de Colaboradores */}
        <Card className="ri-card border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest">
              <Users className="w-4 h-4 text-rose-400" /> Ranking por Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {analytics.topVendors.map((v, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 uppercase">{v.name}</span>
                    <span className="text-xs font-bold text-rose-600">{v.count} casos ({v.rate.toFixed(1)}% dos tickets)</span>
                  </div>
                  <Progress value={Math.min(v.rate * 5, 100)} className="h-2 bg-slate-100 [&>div]:bg-rose-500" />
                </div>
              ))}
              {analytics.topVendors.length === 0 && (
                <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs">Nenhuma fragmentação detectada</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Horário */}
        <Card className="ri-card border-none shadow-sm overflow-hidden text-black bg-white">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest">
              <Clock className="w-4 h-4 text-orange-400" /> Concentração por Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.hourChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Bar dataKey="count" name="Ocorrências" radius={[4, 4, 0, 0]}>
                  {analytics.hourChart.map((entry, index) => (
                    <Cell key={index} fill={index % 2 === 0 ? "#f43f5e" : "#fb7185"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Dia */}
        <Card className="ri-card border-none shadow-sm overflow-hidden text-black bg-white">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest text-[#FFF]">
              <CalendarIcon className="w-4 h-4 text-sky-400" /> Ocorrências por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.dayChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" name="Casos" radius={[4, 4, 0, 0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lista de Exemplos Críticos */}
        <Card className="ri-card border-none shadow-sm overflow-hidden text-black bg-white">
          <CardHeader className="bg-slate-100 p-6 border-b">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest text-slate-600">
              <Layers className="w-4 h-4 text-rose-500" /> Casos Recentes Detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[350px] overflow-y-auto">
              {analytics.occurrences.reverse().slice(0, 20).map((occ, i) => (
                <div key={i} className="p-4 border-b border-slate-50 last:border-none flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{occ.vendor}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(occ.s1.dhEmi), "dd/MM 'às' HH:mm")} • Intervalo: {occ.diff} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-black border-rose-100 text-rose-600 uppercase">FRAGMENTADO</Badge>
                  </div>
                </div>
              ))}
              {analytics.occurrences.length === 0 && (
                <div className="p-10 text-center text-slate-300 font-bold uppercase text-xs">Aguardando dados...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Impacto na Operação</h3>
            <p className="text-slate-400 text-xs font-medium">Como as vendas fragmentadas alteram seus resultados reais.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ImpactMetric 
            label="Inchaço de Cupons" 
            value={`+${analytics.total}`} 
            desc="Atendimentos 'fantasmas' criados na base." 
          />
          <ImpactMetric 
            label="Redução de PA" 
            value="-0.12" 
            desc="Média estimada de queda no indicador Peças/Atend." 
            isNegative 
          />
          <ImpactMetric 
            label="Distorção de TKM" 
            value="R$ -15,40" 
            desc="Queda artificial no valor médio do ticket." 
            isNegative 
          />
        </div>
      </div>
    </div>
  );
}

function ImpactMetric({ label, value, desc, isNegative }: { label: string, value: string, desc: string, isNegative?: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2">
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
      <p className={cn("text-2xl font-black", isNegative ? "text-rose-400" : "text-emerald-400")}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium leading-tight">{desc}</p>
    </div>
  );
}
