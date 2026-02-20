
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { format, parseISO, startOfDay, addDays, differenceInDays, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  TrendingUp, 
  Calendar, 
  UserCheck, 
  BarChart3,
  ArrowUpRight,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyPerformanceProps {
  data: DetailedSaleRow[];
}

type MetricType = 'venda' | 'cupons' | 'itens' | 'tkm' | 'pa' | 'cadastros' | 'taxaIdentificacao';

export function DailyPerformance({ data }: DailyPerformanceProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('venda');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState<string>('all');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);

  const baseData = useMemo(() => {
    return data.filter(r => 
      (r.canal === "LOJA_FISICA" || 
       r.canal === "RETIRADA_ADICIONAL" || 
       r.is_adicional || 
       r.is_adicional_suspeito) && 
      r.tpNF === 1 && 
      !r.is_cancelada
    );
  }, [data]);

  const allVendors = useMemo(() => {
    const vendors = new Set(baseData.map(r => r.vendedor).filter(v => v && v !== "COLABORADOR NÃO IDENTIFICADO"));
    return Array.from(vendors).sort();
  }, [baseData]);

  const filteredByVendor = useMemo(() => {
    if (selectedVendors.length === 0) return baseData;
    return baseData.filter(r => selectedVendors.includes(r.vendedor));
  }, [baseData, selectedVendors]);

  const filteredByDayOfWeek = useMemo(() => {
    if (dayOfWeekFilter === 'all') return filteredByVendor;
    return filteredByVendor.filter(r => {
      const date = parseISO(r.dhEmi);
      return getDay(date).toString() === dayOfWeekFilter;
    });
  }, [filteredByVendor, dayOfWeekFilter]);

  const calculateMetrics = (rows: DetailedSaleRow[]) => {
    const venda = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const cupons = rows.length;
    const itens = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
    const cadastros = rows.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;
    
    return {
      venda,
      cupons,
      itens,
      tkm: cupons > 0 ? venda / cupons : 0,
      pa: cupons > 0 ? itens / cupons : 0,
      cadastros,
      taxaIdentificacao: cupons > 0 ? (cadastros / cupons) * 100 : 0
    };
  };

  const performanceData = useMemo(() => {
    if (filteredByDayOfWeek.length === 0) return [];

    const sortedData = [...filteredByDayOfWeek].sort((a, b) => 
      parseISO(a.dhEmi).getTime() - parseISO(b.dhEmi).getTime()
    );

    if (viewMode === 'daily') {
      const groups: Record<string, DetailedSaleRow[]> = {};
      sortedData.forEach(r => {
        const day = r.dhEmi.substring(0, 10);
        if (!groups[day]) groups[day] = [];
        groups[day].push(r);
      });

      return Object.entries(groups).map(([date, rows]) => ({
        label: format(parseISO(date), "dd/MM (eee)", { locale: ptBR }),
        fullDate: date,
        ...calculateMetrics(rows),
        vendors: Object.entries(
          rows.reduce((acc, r) => {
            const v = r.vendedor || "COLABORADOR";
            if (!acc[v]) acc[v] = [];
            acc[v].push(r);
            return acc;
          }, {} as Record<string, DetailedSaleRow[]>)
        ).map(([name, vRows]) => ({ name, ...calculateMetrics(vRows) }))
      }));
    } else {
      const firstDate = startOfDay(parseISO(sortedData[0].dhEmi));
      const weeks: { label: string; rows: DetailedSaleRow[] }[] = [];
      
      sortedData.forEach(r => {
        const currentDate = startOfDay(parseISO(r.dhEmi));
        const diff = differenceInDays(currentDate, firstDate);
        const weekIndex = Math.floor(diff / 7);
        
        if (!weeks[weekIndex]) {
          const weekStart = addDays(firstDate, weekIndex * 7);
          const weekEnd = addDays(weekStart, 6);
          weeks[weekIndex] = {
            label: `Sem. ${weekIndex + 1} (${format(weekStart, "dd/MM")})`,
            rows: []
          };
        }
        weeks[weekIndex].rows.push(r);
      });

      return weeks.filter(Boolean).map(w => ({
        label: w.label,
        ...calculateMetrics(w.rows),
        vendors: Object.entries(
          w.rows.reduce((acc, r) => {
            const v = r.vendedor || "COLABORADOR";
            if (!acc[v]) acc[v] = [];
            acc[v].push(r);
            return acc;
          }, {} as Record<string, DetailedSaleRow[]>)
        ).map(([name, vRows]) => ({ name, ...calculateMetrics(vRows) }))
      }));
    }
  }, [filteredByDayOfWeek, viewMode]);

  const averageValue = useMemo(() => {
    if (performanceData.length === 0) return 0;
    const sum = performanceData.reduce((acc, d) => acc + (d[selectedMetric] as number), 0);
    return sum / performanceData.length;
  }, [performanceData, selectedMetric]);

  const consolidatedTotal = useMemo(() => calculateMetrics(filteredByDayOfWeek), [filteredByDayOfWeek]);

  const metricLabels: Record<MetricType, string> = {
    venda: "Venda Total",
    cupons: "Tickets",
    itens: "Peças",
    tkm: "Ticket Médio",
    pa: "P.A.",
    cadastros: "Cadastros",
    taxaIdentificacao: "Identificação (%)"
  };

  const formatValue = (val: number, type: MetricType) => {
    if (type === 'venda' || type === 'tkm') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (type === 'pa' || type === 'taxaIdentificacao') return val.toFixed(2);
    return val.toString();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Filtros Otimizados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 px-1">Visão</label>
          <div className="flex gap-1">
            <Button size="sm" variant={viewMode === 'daily' ? 'default' : 'outline'} onClick={() => setViewMode('daily')} className="flex-1 h-8 text-[10px] font-black uppercase">Dia</Button>
            <Button size="sm" variant={viewMode === 'weekly' ? 'default' : 'outline'} onClick={() => setViewMode('weekly')} className="flex-1 h-8 text-[10px] font-black uppercase">7D</Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 px-1">Indicador</label>
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
            <SelectTrigger className="h-8 text-[10px] font-bold border-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(metricLabels).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 px-1">Semana</label>
          <Select value={dayOfWeekFilter} onValueChange={setDayOfWeekFilter}>
            <SelectTrigger className="h-8 text-[10px] font-bold border-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => <SelectItem key={i} value={i.toString()}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase text-slate-400 px-1">Colaborador</label>
          <Select value={selectedVendors[0] || "all"} onValueChange={(v) => setSelectedVendors(v === "all" ? [] : [v])}>
            <SelectTrigger className="h-8 text-[10px] font-bold border-slate-100"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {allVendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <QuickStat label="Venda" value={formatValue(consolidatedTotal.venda, 'venda')} icon={TrendingUp} color="text-orange-500" />
        <QuickStat label="Tickets" value={consolidatedTotal.cupons} icon={Calendar} color="text-sky-500" />
        <QuickStat label="TKM" value={formatValue(consolidatedTotal.tkm, 'tkm')} icon={Target} color="text-purple-500" />
        <QuickStat label="P.A." value={consolidatedTotal.pa.toFixed(2)} icon={ArrowUpRight} color="text-pink-500" />
        <QuickStat label="Ident." value={`${consolidatedTotal.taxaIdentificacao.toFixed(1)}%`} icon={UserCheck} color="text-blue-500" />
        <QuickStat label="Peças" value={consolidatedTotal.itens} icon={BarChart3} color="text-emerald-500" />
      </div>

      <Card className="ri-card overflow-hidden shadow-md border-none">
        <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">{metricLabels[selectedMetric]}</CardTitle>
          <Badge variant="outline" className="bg-white text-[10px] font-black">AVG: {formatValue(averageValue, selectedMetric)}</Badge>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F37021" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#F37021" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey={selectedMetric} stroke="#F37021" strokeWidth={3} fill="url(#colorMetric)" name={metricLabels[selectedMetric]} />
                <ReferenceLine y={averageValue} stroke="#cbd5e1" strokeDasharray="8 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-2">
        {performanceData.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="bg-white border rounded-xl px-4 py-1 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex-1 flex justify-between items-center text-left pr-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-800 uppercase truncate">{item.label}</p>
                </div>
                <div className="flex gap-6">
                  <MiniMetric label="VENDA" value={formatValue(item.venda, 'venda')} />
                  <MiniMetric label="PA" value={item.pa.toFixed(2)} />
                  <MiniMetric label="IDENT" value={`${item.taxaIdentificacao.toFixed(0)}%`} />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2 border-t">
              <div className="space-y-2">
                {item.vendors.map((v, vIndex) => (
                  <div key={vIndex} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                    <span className="text-[10px] font-black text-slate-600 uppercase">{v.name}</span>
                    <div className="flex gap-4">
                      <span className="text-[10px] font-bold text-slate-700">{formatValue(v.venda, 'venda')}</span>
                      <span className="text-[10px] font-bold text-orange-600">{v.pa.toFixed(2)} PA</span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function QuickStat({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="ri-card border-none bg-white p-3 flex items-center gap-3 shadow-sm">
      <div className={cn("p-2 rounded-lg bg-slate-50", color)}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-slate-800 truncate">{value}</p>
      </div>
    </Card>
  );
}

function MiniMetric({ label, value }: any) {
  return (
    <div className="hidden sm:block">
      <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{label}</p>
      <p className="text-[10px] font-black text-slate-700">{value}</p>
    </div>
  );
}
