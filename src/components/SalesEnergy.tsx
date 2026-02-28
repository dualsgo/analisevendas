
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
  ReferenceLine
} from "recharts";
import { 
  Timer, 
  Zap, 
  Activity, 
  Wind, 
  Info, 
  ShoppingBag, 
  Users, 
  AlertTriangle,
  TrendingDown,
  UserPlus,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesEnergyProps {
  data: DetailedSaleRow[];
}

export function SalesEnergy({ data }: SalesEnergyProps) {
  const metrics = useMemo(() => {
    const sorted = [...data]
      .filter(s => s.tpNF === 1 && !s.is_cancelada)
      .sort((a, b) => new Date(a.dhEmi).getTime() - new Date(b.dhEmi).getTime());

    if (sorted.length < 2) return null;

    // 1. Médias Globais para Comparação
    const totalSales = sorted.length;
    const totalItems = sorted.reduce((acc, s) => acc + parseFloat(s.itens_qtd), 0);
    const globalPA = totalItems / totalSales;
    const globalTKM = sorted.reduce((acc, s) => acc + parseFloat(s.vNF), 0) / totalSales;

    // 2. Intervalo Médio
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const t1 = new Date(sorted[i-1].dhEmi).getTime();
      const t2 = new Date(sorted[i].dhEmi).getTime();
      const diff = (t2 - t1) / 60000; 
      if (diff < 300) intervals.push(diff);
    }
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

    // 3. Estatísticas por Hora
    const hourlyStats: Record<string, { count: number, items: number, value: number, vendors: Set<string> }> = {};
    sorted.forEach(s => {
      const h = s.dhEmi.substring(11, 13) + "h";
      if (!hourlyStats[h]) hourlyStats[h] = { count: 0, items: 0, value: 0, vendors: new Set() };
      hourlyStats[h].count++;
      hourlyStats[h].items += parseFloat(s.itens_qtd);
      hourlyStats[h].value += parseFloat(s.vNF);
      if (s.vendedor) hourlyStats[h].vendors.add(s.vendedor);
    });

    const energyData = Object.entries(hourlyStats).map(([hour, stats]) => {
      const hourPA = stats.count > 0 ? stats.items / stats.count : 0;
      const hourTKM = stats.count > 0 ? stats.value / stats.count : 0;
      return {
        hour,
        ...stats,
        pa: hourPA,
        tkm: hourTKM,
        vendorsCount: stats.vendors.size,
        paVar: ((hourPA / globalPA) - 1) * 100,
        tkmVar: ((hourTKM / globalTKM) - 1) * 100,
        loadPerVendor: stats.vendors.size > 0 ? stats.count / stats.vendors.size : 0
      };
    }).sort((a, b) => a.hour.localeCompare(b.hour));

    const peakHour = energyData.reduce((prev, current) => (prev.count > current.count) ? prev : current);

    // 4. Ranking de Vendedores
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
      globalTKM,
      totalSales,
      totalItems
    };
  }, [data]);

  if (!metrics) return null;

  const peakHourStaffing = metrics.peakHour.loadPerVendor > 8 ? "CRÍTICO" : metrics.peakHour.loadPerVendor > 5 ? "ALERTA" : "OK";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* KPIs de Energia e Escala */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EnergyStat 
          label="Intervalo de Fluxo" 
          value={`${metrics.avgInterval.toFixed(1)} min`} 
          desc="Média entre atendimentos" 
          icon={Timer} 
          color="text-sky-500" 
        />
        <EnergyStat 
          label="Pressão de Venda" 
          value={`${metrics.peakHour.count} vds/h`} 
          desc={`Recorde às ${metrics.peakHour.hour}`} 
          icon={Zap} 
          color="text-orange-500" 
          variant={metrics.peakHour.paVar < -5 ? 'warning' : 'success'}
        />
        <EnergyStat 
          label="Capacidade de Escala" 
          value={`${metrics.peakHour.vendorsCount} pessoas`} 
          desc={`Carga: ${metrics.peakHour.loadPerVendor.toFixed(1)} vds/colab`} 
          icon={Users} 
          color="text-purple-500" 
          variant={peakHourStaffing === 'CRÍTICO' ? 'danger' : peakHourStaffing === 'ALERTA' ? 'warning' : 'success'}
        />
        <EnergyStat 
          label="Modo da Unidade" 
          value={metrics.avgInterval < 8 ? "CONTÍNUO" : "EXPLOSÃO"} 
          desc={metrics.avgInterval < 8 ? "Equipe sob demanda firme" : "Picos isolados de fluxo"} 
          icon={Wind} 
          color="text-emerald-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Aceleração */}
        <Card className="ri-card border-none bg-white overflow-hidden shadow-xl lg:col-span-8">
          <CardHeader className="bg-slate-50 border-b p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4" /> Curva de Aceleração e Escala
            </CardTitle>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-sky-400 rounded-full" /> <span className="text-[9px] font-bold text-slate-400 uppercase">Vendas</span></div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-orange-400 rounded-full" /> <span className="text-[9px] font-bold text-slate-400 uppercase">Peças</span></div>
            </div>
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
            
            {/* Seção de Alertas de Variação e Escala */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className={cn(
                 "p-6 rounded-[2rem] border-2 flex flex-col justify-center gap-4 transition-all",
                 metrics.peakHour.paVar < -5 ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"
               )}>
                  <div className="flex items-center gap-3">
                    {metrics.peakHour.paVar < -5 ? <TrendingDown className="w-6 h-6 text-rose-500" /> : <UserCheck className="w-6 h-6 text-emerald-500" />}
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Qualidade no Pico ({metrics.peakHour.hour})</p>
                      <p className={cn("text-lg font-black leading-none mt-1", metrics.peakHour.paVar < -5 ? "text-rose-600" : "text-emerald-600")}>
                        PA: {metrics.peakHour.pa.toFixed(2)} ({metrics.peakHour.paVar > 0 ? '+' : ''}{metrics.peakHour.paVar.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                    {metrics.peakHour.paVar < -5 
                      ? "ALERTA DE ATROPELAMENTO: A qualidade do atendimento caiu significativamente no horário de maior fluxo. A equipe está focada em reduzir a fila e perdendo a técnica de venda adicional."
                      : "EXCELÊNCIA MANTIDA: Mesmo com a pressão do pico, a equipe conseguiu manter ou elevar a média de peças por cliente. Processo de balcão está maduro."}
                  </p>
               </div>

               <div className={cn(
                 "p-6 rounded-[2rem] border-2 flex flex-col justify-center gap-4 transition-all",
                 peakHourStaffing === 'OK' ? "bg-sky-50 border-sky-100" : "bg-orange-50 border-orange-100"
               )}>
                  <div className="flex items-center gap-3">
                    {peakHourStaffing === 'OK' ? <CheckCircle2 className="w-6 h-6 text-sky-500" /> : <UserPlus className="w-6 h-6 text-orange-500" />}
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Status de Contingência</p>
                      <p className={cn("text-lg font-black leading-none mt-1", peakHourStaffing === 'OK' ? "text-sky-600" : "text-orange-600")}>
                        {metrics.peakHour.vendorsCount} Colaboradores Ativos
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                    {peakHourStaffing === 'CRÍTICO' 
                      ? `SOBRECARGA DETECTADA: Temos apenas ${metrics.peakHour.vendorsCount} pessoas para ${metrics.peakHour.count} atendimentos/hora. Cada colaborador está gerindo ${metrics.peakHour.loadPerVendor.toFixed(1)} clientes simultaneamente. Falta contingência.`
                      : peakHourStaffing === 'ALERTA'
                        ? "EQUIPE NO LIMITE: A escala está no limite máximo de segurança. Qualquer imprevisto ou saída de vendedor para almoço/apoio causará fila imediata."
                        : "ESCALA EQUILIBRADA: O número de atendentes identificados nos XMLs é compatível com o volume de cupons emitidos nesta faixa horária."}
                  </p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Motores de Energia */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 text-center">Motores de Volume (Top 5)</h3>
          <div className="space-y-3">
            {metrics.vendorRanking.map((v, i) => (
              <Card key={i} className="ri-card border-none bg-white p-4 shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">#{i+1}</div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Sustenta {((v.items / metrics.totalItems) * 100).toFixed(1)}% da carga</p>
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

          <Card className="ri-card border-none bg-slate-900 text-white p-6 shadow-xl space-y-4">
             <div className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">Nota Técnica</span>
             </div>
             <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
               A quantidade de pessoas é baseada nos vendedores que emitiram pelo menos um XML na faixa horária. Se houver colaboradores apenas no apoio/caixa sem identificação na nota, a capacidade de escala real pode ser maior que a indicada.
             </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EnergyStat({ label, value, desc, icon: Icon, color, variant }: any) {
  return (
    <Card className={cn(
      "ri-card border-none bg-white p-5 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[130px] transition-all",
      variant === 'warning' ? "border-l-4 border-l-orange-400" : variant === 'danger' ? "border-l-4 border-l-rose-500" : ""
    )}>
      <div className={cn("p-3 rounded-[1.25rem] bg-slate-50 shadow-inner", color)}>
        <Icon className="w-6 h-6 md:w-7 md:h-7" />
      </div>
      <div className="space-y-1">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-xl md:text-2xl font-black text-slate-800 leading-none tracking-tight flex items-center justify-center gap-2">
          {value}
          {variant === 'warning' && <ArrowDownRight className="w-4 h-4 text-orange-500" />}
          {variant === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
        </p>
        <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase leading-tight">{desc}</p>
      </div>
    </Card>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
