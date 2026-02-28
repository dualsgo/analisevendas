
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
  Gauge
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

    // 1. Cálculo de Intervalos e Ritmo
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const t1 = new Date(sorted[i-1].dhEmi).getTime();
      const t2 = new Date(sorted[i].dhEmi).getTime();
      const diff = (t2 - t1) / 60000; // minutos
      if (diff < 300) intervals.push(diff);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // 2. Densidade Horária (Energia)
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
      vendorsCount: stats.vendors.size
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    // 3. Ranking de Colaboradores em Momentos de Pressão
    const peakHour = energyData.reduce((prev, current) => (prev.count > current.count) ? prev : current);
    
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

    const maxDensity = Math.max(...energyData.map(d => d.count));
    const maxItemsPerHour = Math.max(...energyData.map(d => d.items));

    return { 
      avgInterval, 
      energyData, 
      maxDensity, 
      maxItemsPerHour,
      peakHour,
      vendorRanking,
      totalSales: sorted.length,
      totalItems: sorted.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0)
    };
  }, [data]);

  if (!metrics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Didático Explicativo */}
      <div className="bg-white rounded-[2rem] p-6 md:p-10 border-2 border-sky-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="bg-sky-500 p-6 rounded-[2.5rem] text-white shadow-xl shadow-sky-100 shrink-0">
          <Gauge className="w-10 h-10 animate-pulse" />
        </div>
        <div className="flex-1 space-y-3 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-800 italic leading-none">Energia Comercial & Ritmo</h1>
          <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed max-w-3xl">
            Este painel não mede apenas o faturamento, mas a <strong>intensidade operacional</strong> da sua unidade. 
            Analisamos o intervalo entre cada nota para entender se a loja opera sob pressão constante ou em picos isolados, 
            ajudando a identificar onde a equipe está ganhando ou perdendo eficiência de registro.
          </p>
        </div>
      </div>

      {/* Indicadores de Intensidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnergyStat 
          label="Intervalo de Fluxo" 
          value={`${metrics.avgInterval.toFixed(1)} min`} 
          desc="Média de tempo entre vendas" 
          icon={Timer} 
          color="text-sky-500" 
        />
        <EnergyStat 
          label="Pico de Pressão" 
          value={`${metrics.maxDensity} vds/h`} 
          desc={`Recorde às ${metrics.peakHour.hour}`} 
          icon={Zap} 
          color="text-orange-500" 
        />
        <EnergyStat 
          label="Carga de Itens" 
          value={`${metrics.maxItemsPerHour.toFixed(0)} it/h`} 
          desc="Máximo processado em 1h" 
          icon={ShoppingBag} 
          color="text-purple-500" 
        />
        <EnergyStat 
          label="Modo da Unidade" 
          value={metrics.avgInterval < 8 ? "CONTÍNUO" : "EXPLOSÃO"} 
          desc={metrics.avgInterval < 8 ? "Fluxo estável de clientes" : "Vendas em rajadas rápidas"} 
          icon={Wind} 
          color="text-emerald-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Aceleração */}
        <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Curva de Aceleração Comercial
              </CardTitle>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Volume de Atendimentos vs Faixa Horária</p>
            </div>
            <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-[8px] font-black text-slate-400 uppercase">Tempo Real via XML</div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full">
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
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', shadow: 'none', fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value: any, name: string) => [
                      name === 'count' ? `${value} Vendas` : (name === 'items' ? `${value.toFixed(0)} Itens` : `R$ ${value.toFixed(2)}`), 
                      name === 'count' ? 'Tickets' : (name === 'items' ? 'Volume' : 'Faturamento')
                    ]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#36B7E1" strokeWidth={4} fill="url(#colorEnergy)" name="count" />
                  <Area type="monotone" dataKey="items" stroke="#F37021" strokeWidth={2} fill="transparent" name="items" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-start gap-4">
                  <Info className="w-6 h-6 text-sky-400 shrink-0 mt-1" />
                  <div className="space-y-1 text-center md:text-left">
                     <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Diagnóstico de Ritmo</p>
                     <p className="text-xs font-medium leading-relaxed opacity-90 italic">
                       {metrics.avgInterval < 8 
                         ? "Sua unidade opera em ALTA PRESSÃO. O intervalo curto indica que o caixa quase não para. Foco total em agilidade de registro para evitar o 'desistência por fila'." 
                         : "Sua unidade opera em MODO EXPLOSÃO. Existem grandes janelas de ociosidade seguidas de rajadas de venda. O foco deve ser a profundidade da cesta (PA) em cada oportunidade, pois elas são mais espaçadas."}
                     </p>
                  </div>
               </div>
               <div className="p-6 bg-orange-50 rounded-[2rem] border-2 border-orange-100 flex items-start gap-4">
                  <Zap className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
                  <div className="space-y-1 text-center md:text-left">
                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Oportunidade Detectada</p>
                     <p className="text-xs font-medium text-orange-800 leading-relaxed italic">
                       No pico de faturamento ({metrics.peakHour.hour}), foram processados <strong>{metrics.peakHour.items.toFixed(0)} itens</strong>. 
                       Se o PA nesse horário for menor que a média do dia, a equipe está 'atropelando' o atendimento para dar conta do volume.
                     </p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking de Energia (Motores da Loja) */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 text-center flex items-center justify-center gap-2">
            <Users className="w-4 h-4" /> Motores de Energia (Top 5)
          </h3>
          
          <div className="space-y-3">
            {metrics.vendorRanking.map((v, i) => (
              <Card key={i} className="ri-card border-none bg-white p-4 shadow-md group hover:scale-[1.02] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">#{i+1}</div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Responsável por {((v.items / metrics.totalItems) * 100).toFixed(1)}% do volume</p>
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
                    <p className="text-[7px] font-black text-slate-400 uppercase">Eficiência</p>
                    <p className="text-[11px] font-black text-orange-600">{(v.items / v.count).toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="ri-card border-none bg-indigo-900 text-white p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-300" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Resiliência Operacional</h4>
              </div>
              <p className="text-[11px] font-medium leading-relaxed opacity-80 italic">
                "Esta lista destaca os colaboradores que sustentam os momentos de maior pressão da unidade. 
                Garantir que eles tenham apoio logístico (sacolas, limpeza de balcão) nos horários de pico é vital para manter a energia da loja alta."
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EnergyStat({ label, value, desc, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-5 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[130px] hover:shadow-md transition-all">
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
