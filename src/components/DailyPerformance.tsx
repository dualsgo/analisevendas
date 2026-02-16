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
  Target,
  Search
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
  const [vendorSearch, setVendorSearch] = useState("");

  // Filtro Inicial: Loja Física + Adicional
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
    const vendors = new Set(baseData.map(r => r.vendedor).filter(v => v && v !== "VENDEDOR NÃO IDENTIFICADO"));
    return Array.from(vendors).sort();
  }, [baseData]);

  const filteredVendorsList = useMemo(() => {
    return allVendors.filter(v => v.toLowerCase().includes(vendorSearch.toLowerCase()));
  }, [allVendors, vendorSearch]);

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
            if (!acc[r.vendedor]) acc[r.vendedor] = [];
            acc[r.vendedor].push(r);
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
            label: `Seman ${weekIndex + 1} (${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")})`,
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
            if (!acc[r.vendedor]) acc[r.vendedor] = [];
            acc[r.vendedor].push(r);
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
    taxaIdentificacao: "Taxa Identificação (%)"
  };

  const formatValue = (val: number, type: MetricType) => {
    if (type === 'venda' || type === 'tkm') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (type === 'pa' || type === 'taxaIdentificacao') return val.toFixed(2);
    return val.toString();
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700">
      {/* Filtros Mobile-Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-white p-5 md:p-8 rounded-[2.5rem] border-2 border-orange-100 shadow-sm">
        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest px-1">Agrupamento</label>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'daily' ? 'default' : 'outline'} 
              onClick={() => setViewMode('daily')}
              className="flex-1 rounded-xl h-12 font-black text-xs uppercase"
            >Diário</Button>
            <Button 
              variant={viewMode === 'weekly' ? 'default' : 'outline'} 
              onClick={() => setViewMode('weekly')}
              className="flex-1 rounded-xl h-12 font-black text-xs uppercase"
            >7 Dias</Button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest px-1">Dia da Semana</label>
          <Select value={dayOfWeekFilter} onValueChange={setDayOfWeekFilter}>
            <SelectTrigger className="rounded-xl h-12 border-2 border-slate-100 font-bold">
              <SelectValue placeholder="Todos os dias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dias</SelectItem>
              <SelectItem value="1">Segunda-feira</SelectItem>
              <SelectItem value="2">Terça-feira</SelectItem>
              <SelectItem value="3">Quarta-feira</SelectItem>
              <SelectItem value="4">Quinta-feira</SelectItem>
              <SelectItem value="5">Sexta-feira</SelectItem>
              <SelectItem value="6">Sábado</SelectItem>
              <SelectItem value="0">Domingo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest px-1">KPI Gráfico</label>
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
            <SelectTrigger className="rounded-xl h-12 border-2 border-slate-100 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(metricLabels).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest px-1">Colaborador</label>
          <Select 
            value={selectedVendors.length === 0 ? "all" : selectedVendors[0]} 
            onValueChange={(v) => setSelectedVendors(v === "all" ? [] : [v])}
          >
            <SelectTrigger className="rounded-xl h-12 border-2 border-slate-100 font-bold">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {allVendors.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards Consolidados Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <QuickStat label="Venda" value={formatValue(consolidatedTotal.venda, 'venda')} icon={TrendingUp} color="text-orange-500" />
        <QuickStat label="Tickets" value={consolidatedTotal.cupons} icon={Calendar} color="text-sky-500" />
        <QuickStat label="Peças" value={consolidatedTotal.itens} icon={BarChart3} color="text-emerald-500" />
        <QuickStat label="TKM" value={formatValue(consolidatedTotal.tkm, 'tkm')} icon={Target} color="text-purple-500" />
        <QuickStat label="P.A." value={consolidatedTotal.pa.toFixed(2)} icon={ArrowUpRight} color="text-pink-500" />
        <QuickStat label="Ident." value={`${consolidatedTotal.taxaIdentificacao.toFixed(1)}%`} icon={UserCheck} color="text-blue-500" />
      </div>

      {/* Gráfico Tendência */}
      <Card className="ri-card overflow-hidden shadow-lg border-none">
        <CardHeader className="bg-slate-50/80 border-b p-6 md:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <CardTitle className="text-xs md:text-base font-black uppercase tracking-[0.1em] text-slate-600">Evolução do Indicador</CardTitle>
              <CardDescription className="text-xs md:text-sm font-bold text-orange-500 uppercase">{metricLabels[selectedMetric]}</CardDescription>
            </div>
            <div className="bg-white px-6 py-2 rounded-full border-2 border-orange-100 shadow-sm mx-auto sm:mx-0 flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase">Média:</span>
               <span className="text-sm font-black text-slate-800">{formatValue(averageValue, selectedMetric)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-12">
          <div className="h-[280px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F37021" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#F37021" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '8px', color: '#1e293b', fontSize: '12px', textTransform: 'uppercase' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke="#F37021" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#colorMetric)" 
                  name={metricLabels[selectedMetric]}
                />
                <ReferenceLine y={averageValue} stroke="#cbd5e1" strokeDasharray="8 4" label={{ position: 'right', value: 'AVG', fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lista Diária como Accordion de Cards (Mobile Optimized) */}
      <div className="space-y-6">
        <h3 className="text-xs md:text-sm font-black uppercase text-slate-500 tracking-[0.2em] px-4">Detalhamento por Período</h3>
        <Accordion type="single" collapsible className="space-y-5">
          {performanceData.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`} 
              className="ri-card border-none px-5 md:px-8 py-2 bg-white shadow-sm"
            >
              <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex-1 flex flex-col sm:grid sm:grid-cols-6 gap-4 text-left">
                  <div className="col-span-1">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Consolidado</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start border-t sm:border-0 pt-3 sm:pt-0 gap-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase sm:mb-1">Venda</p>
                    <p className="text-sm font-black text-slate-700">{formatValue(item.venda, 'venda')}</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start gap-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase sm:mb-1">TKM</p>
                    <p className="text-sm font-black text-orange-600">{formatValue(item.tkm, 'tkm')}</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start gap-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase sm:mb-1">P.A.</p>
                    <p className="text-sm font-black text-sky-600">{item.pa.toFixed(2)}</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start gap-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase sm:mb-1">Identif.</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] py-0.5 px-3 uppercase">
                      {item.taxaIdentificacao.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-6 pb-10 border-t border-slate-50 overflow-x-auto">
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Colaborador</TableHead>
                        <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">Venda</TableHead>
                        <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">Tickets</TableHead>
                        <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">TKM</TableHead>
                        <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">P.A.</TableHead>
                        <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">Identificação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.vendors.map((v, vIndex) => (
                        <TableRow key={vIndex} className="hover:bg-orange-50/50 border-slate-50 transition-colors">
                          <TableCell className="text-sm font-black text-slate-600 uppercase py-4">{v.name}</TableCell>
                          <TableCell className="text-sm font-bold text-slate-700 text-right">{formatValue(v.venda, 'venda')}</TableCell>
                          <TableCell className="text-sm font-bold text-slate-700 text-right">{v.cupons}</TableCell>
                          <TableCell className="text-sm font-bold text-orange-600 text-right">{formatValue(v.tkm, 'tkm')}</TableCell>
                          <TableCell className="text-sm font-bold text-sky-600 text-right">{v.pa.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "text-[11px] font-black px-3 py-1 rounded-full uppercase",
                              v.taxaIdentificacao > 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {v.taxaIdentificacao.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-4">
                   {item.vendors.map((v, vIndex) => (
                     <div key={vIndex} className="bg-slate-50/80 p-5 rounded-2xl space-y-4 shadow-sm border border-slate-100">
                       <div className="flex justify-between items-start border-b border-slate-200/50 pb-3">
                         <span className="text-xs font-black text-slate-800 uppercase leading-tight max-w-[60%]">{v.name}</span>
                         <span className="text-sm font-black text-orange-600">{formatValue(v.venda, 'venda')}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                         <div className="flex justify-between items-center"><span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Tickets:</span> <span className="text-xs font-bold text-slate-700">{v.cupons}</span></div>
                         <div className="flex justify-between items-center"><span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">PA:</span> <span className="text-xs font-bold text-sky-600">{v.pa.toFixed(2)}</span></div>
                         <div className="flex justify-between items-center"><span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">TKM:</span> <span className="text-xs font-bold text-orange-600">{formatValue(v.tkm, 'tkm')}</span></div>
                         <div className="flex justify-between items-center"><span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Ident:</span> <span className="text-[10px] font-black bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">{v.taxaIdentificacao.toFixed(1)}%</span></div>
                       </div>
                     </div>
                   ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

function QuickStat({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  return (
    <Card className="ri-card border-none bg-white p-5 md:p-6 flex items-center gap-4 md:gap-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("p-3 md:p-4 rounded-2xl bg-slate-50 shadow-inner", color)}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-base md:text-lg font-black text-slate-800 leading-none truncate">{value}</p>
      </div>
    </Card>
  );
}
