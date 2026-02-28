
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
  Bar
} from "recharts";
import { 
  Flame, 
  Timer, 
  Zap, 
  Activity, 
  Clock,
  TrendingUp,
  Wind,
  Info
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
    const bursts: any[] = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const t1 = new Date(sorted[i-1].dhEmi).getTime();
      const t2 = new Date(sorted[i].dhEmi).getTime();
      const diff = (t2 - t1) / 60000; // minutos
      
      // Filtra intervalos irreais (mudança de dia)
      if (diff < 300) { 
        intervals.push(diff);
      }
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Curva de explosão (vendas por hora em tempo real)
    const hourlyDensity: Record<string, number> = {};
    sorted.forEach(s => {
      const h = s.dhEmi.substring(11, 13) + "h";
      hourlyDensity[h] = (hourlyDensity[h] || 0) + 1;
    });

    const energyData = Object.entries(hourlyDensity).map(([hour, count]) => ({
      hour,
      count
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    const maxDensity = Math.max(...energyData.map(d => d.count));

    return { avgInterval, energyData, maxDensity, totalSales: sorted.length };
  }, [data]);

  if (!metrics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2rem] p-6 border-2 border-sky-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-sky-500 p-4 rounded-3xl text-white shadow-lg shrink-0">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">Energia Comercial</h1>
          <p className="text-sm text-slate-500 font-medium">
            A sua loja vende de forma constante ou em explosões? Analise o ritmo do caixa para otimizar o posicionamento da equipe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EnergyStat label="Intervalo Médio" value={`${metrics.avgInterval.toFixed(1)} min`} desc="Entre atendimentos ativos" icon={Timer} color="text-sky-500" />
        <EnergyStat label="Pico de Pressão" value={`${metrics.maxDensity} vds/h`} desc="Recorde de densidade no lote" icon={Zap} color="text-orange-500" />
        <EnergyStat label="Modo Operacional" value={metrics.avgInterval < 10 ? "CONTÍNUO" : "EXPLOSÃO"} desc={metrics.avgInterval < 10 ? "Fluxo constante de clientes" : "Vendas em blocos isolados"} icon={Wind} color="text-emerald-500" />
      </div>

      <Card className="ri-card border-none bg-white overflow-hidden shadow-xl">
        <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Curva de Aceleração Comercial
          </CardTitle>
          <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-[8px] font-black text-slate-400 uppercase">Volume por Faixa Horária</div>
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
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none' }} />
                <Area type="monotone" dataKey="count" stroke="#36B7E1" strokeWidth={4} fill="url(#colorEnergy)" name="Vendas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white flex items-start gap-4">
             <Info className="w-6 h-6 text-sky-400 shrink-0 mt-1" />
             <div className="space-y-1">
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Leitura do Especialista</p>
                <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                  {metrics.avgInterval < 8 
                    ? "Sua unidade opera em alta pressão. O foco deve ser agilidade de registro e redução de tempo de fila para não perder vendas por desistência." 
                    : "Sua unidade tem intervalos longos. O foco deve ser a profundidade da cesta (PA) em cada oportunidade, já que cada cliente que entra é precioso."}
                </p>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EnergyStat({ label, value, desc, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-5 flex items-center gap-5 shadow-sm">
      <div className={cn("p-3 rounded-2xl bg-slate-50", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{desc}</p>
      </div>
    </Card>
  );
}
