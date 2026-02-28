
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Cell
} from "recharts";
import { 
  Flame, 
  Timer, 
  Zap, 
  Activity, 
  Clock,
  TrendingUp,
  Wind,
  Info,
  Users,
  ShoppingBag,
  Target,
  Gauge,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface SalesEnergyProps {
  data: DetailedSaleRow[];
}

export function SalesEnergy({ data }: SalesEnergyProps) {
  const metrics = useMemo(() => {
    const sorted = [...data]
      .filter(s => s.tpNF === 1 && !s.is_cancelada)
      .sort((a, b) => new Date(a.dhEmi).getTime() - new Date(b.dhEmi).getTime());

    if (sorted.length < 2) return null;

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const t1 = new Date(sorted[i-1].dhEmi).getTime();
      const t2 = new Date(sorted[i].dhEmi).getTime();
      const diff = (t2 - t1) / 60000; 
      if (diff < 300) intervals.push(diff);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const hourlyStats: Record<string, { count: number, items: number, value: number, vendors: Set<string> }> = {};
    sorted.forEach(s => {
      const h = s.dhEmi.substring(11, 13) + "h";
      if (!hourlyStats[h]) hourlyStats[h] = { count: 0, items: 0, value: 0, vendors: new Set() };
      hourlyStats[h].count++;
      hourlyStats[h].items += parseFloat(s.itens_qtd);
      hourlyStats[h].value += parseFloat(s.vNF);
      if (s.vendedor) hourlyStats[h].vendors.add(s.vendedor);
    });

    const energyData = Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour,
      ...stats,
      pa: stats.count > 0 ? stats.items / stats.count : 0,
      vendorsCount: stats.vendors.size
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    const peakHour = energyData.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    const globalPA = sorted.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0) / sorted.length;

    const vendorEnergy: Record<string, { name: string, items: number, value: number, count: number }> = {};
    sorted.forEach(s => {
      const v = s.vendedor || "OUTROS";
      if (!vendorEnergy[v]) vendorEnergy[v] = { name: v, items: 0, value: 0, count: 0 };
      vendorEnergy[v].items += parseFloat(s.itens_qtd);
      vendorEnergy[v].value += parseFloat(s.vNF);
      vendorEnergy[v].count++;
    });

    const vendorRanking = Object.values(vendorEnergy)
      .sort((a, b) => b.items - a.items)
      .slice(0, 5);

    return { 
      avgInterval, 
      energyData, 
      peakHour,
      vendorRanking,
      globalPA,
      totalSales: sorted.length,
      totalItems: sorted.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0)
    };
  }, [data]);

  if (!metrics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnergyStat label="Intervalo de Fluxo" value={`${metrics.avgInterval.toFixed(1)} min`} desc="Média entre vendas" icon={Timer} color="text-sky-500" />
        <EnergyStat label="Pico de Pressão" value={`${metrics.peakHour.count} vds/h`} desc={`Recorde às ${metrics.peakHour.hour}`} icon={Zap} color="text-orange-500" />
        <EnergyStat label="Carga de Itens" value={`${metrics.peakHour.items.toFixed(0)} it/h`} desc="Máximo processado" icon={ShoppingBag} color="text-purple-500" />
        <EnergyStat label="Modo da Unidade" value={metrics.avgInterval < 8 ? "CONTÍNUO" : "EXPLOSÃO"} desc={metrics.avgInterval < 8 ? "Fluxo estável" : "Vendas em rajadas"} icon={Wind} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Curva de Aceleração Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.energyData}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#36B7E1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#36B7E1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="count" stroke="#36B7E1" strokeWidth={4} fill="url(#colorEnergy)" name="Vendas" />
                  <Area type="monotone" dataKey="items" stroke="#F37021" strokeWidth={2} fill="transparent" name="Peças" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-start gap-4">
                  <Info className="w-6 h-6 text-sky-400 shrink-0 mt-1" />
                  <div className="space-y-1 text-center md:text-left">
                     <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Diagnóstico de Gargalo</p>
                     <p className="text-xs font-medium leading-relaxed opacity-90 italic">
                       {metrics.peakHour.pa < metrics.globalPA * 0.9 
                         ? `Detectamos um GARGALO DE VELOCIDADE às ${metrics.peakHour.hour}. O PA caiu para ${metrics.peakHour.pa.toFixed(2)} (Média: ${metrics.globalPA.toFixed(2)}). A equipe está 'atropelando' o atendimento para dar conta da fila. É necessário reforço no balcão de embrulho ou logística.`
                         : `Performance Saudável: Mesmo no pico de fluxo (${metrics.peakHour.hour}), a equipe manteve o PA em ${metrics.peakHour.pa.toFixed(2)}, preservando a técnica de venda sugerida.`}
                     </p>
                  </div>
               </div>
               <div className="p-6 bg-orange-50 rounded-[2rem] border-2 border-orange-100 flex items-start gap-4">
                  <Zap className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
                  <div className="space-y-1 text-center md:text-left">
                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Ritmo Operacional</p>
                     <p className="text-xs font-medium text-orange-800 leading-relaxed italic">
                       {metrics.avgInterval < 5 
                         ? "Sua unidade está em MODO CRÍTICO DE FILA. O intervalo de 5 min indica que o cliente não tem tempo de respirar entre atendimentos. Risco alto de perda de venda adicional por pressão de tempo." 
                         : "Fluxo sob controle. O tempo de intervalo permite que o vendedor realize a abordagem de acessórios sem pressa."}
                     </p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 text-center">Motores de Energia (Top 5)</h3>
          <div className="space-y-3">
            {metrics.vendorRanking.map((v, i) => (
              <Card key={i} className="ri-card border-none bg-white p-4 shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">#{i+1}</div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sustenta {((v.items / metrics.totalItems) * 100).toFixed(1)}% do volume</p>
                    </div>
                  </div>
                  <Flame className={cn("w-4 h-4", i === 0 ? "text-orange-500" : "text-slate-200")} />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase">Peças</p>
                    <p className="text-[11px] font-black text-slate-700">{v.items.toFixed(0)}</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase">Cupons</p>
                    <p className="text-[11px] font-black text-slate-700">{v.count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase">PA Real</p>
                    <p className="text-[11px] font-black text-orange-600">{(v.items / v.count).toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnergyStat({ label, value, desc, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-5 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[130px]">
      <div className={cn("p-3 rounded-[1.25rem] bg-slate-50 shadow-inner", color)}>
        <Icon className="w-6 h-6 md:w-7 md:h-7" />
      </div>
      <div className="space-y-1">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-xl md:text-2xl font-black text-slate-800 leading-none tracking-tight">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase leading-tight">{desc}</p>
      </div>
    </Card>
  );
}
