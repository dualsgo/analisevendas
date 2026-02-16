
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      {/* Filtros Mobile-Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 md:p-6 rounded-[2rem] border-2 border-orange-100 shadow-sm">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Agrupamento</label>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'daily' ? 'default' : 'outline'} 
              onClick={() => setViewMode('daily')}
              className="flex-1 rounded-xl h-11 font-black text-xs"
            >Diário</Button>
            <Button 
              variant={viewMode === 'weekly' ? 'default' : 'outline'} 
              onClick={() => setViewMode('weekly')}
              className="flex-1 rounded-xl h-11 font-black text-xs"
            >7 Dias</Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Dia da Semana</label>
          <Select value={dayOfWeekFilter} onValueChange={setDayOfWeekFilter}>
            <SelectTrigger className="rounded-xl h-11 border-2 border-slate-100 font-bold">
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

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">KPI Gráfico</label>
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
            <SelectTrigger className="rounded-xl h-11 border-2 border-slate-100 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(metricLabels).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Vendedor</label>
          <Select 
            value={selectedVendors.length === 0 ? "all" : selectedVendors[0]} 
            onValueChange={(v) => setSelectedVendors(v === "all" ? [] : [v])}
          >
            <SelectTrigger className="rounded-xl h-11 border-2 border-slate-100 font-bold">
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <QuickStat label="Venda" value={formatValue(consolidatedTotal.venda, 'venda')} icon={TrendingUp} color="text-orange-500" />
        <QuickStat label="Tickets" value={consolidatedTotal.cupons} icon={Calendar} color="text-sky-500" />
        <QuickStat label="Peças" value={consolidatedTotal.itens} icon={BarChart3} color="text-emerald-500" />
        <QuickStat label="TKM" value={formatValue(consolidatedTotal.tkm, 'tkm')} icon={Target} color="text-purple-500" />
        <QuickStat label="P.A." value={consolidatedTotal.pa.toFixed(2)} icon={ArrowUpRight} color="text-pink-500" />
        <QuickStat label="Ident." value={`${consolidatedTotal.taxaIdentificacao.toFixed(1)}%`} icon={UserCheck} color="text-blue-500" />
      </div>

      {/* Gráfico Tendência */}
      <Card className="ri-card overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1 text-center sm:text-left">
              <CardTitle className="text-xs md:text-sm font-black uppercase tracking-tight text-slate-600">Evolução do Indicador</CardTitle>
              <CardDescription className="text-[10px]">{metricLabels[selectedMetric]}</CardDescription>
            </div>
            <Badge variant="outline" className="bg-white border-orange-200 text-orange-600 font-black px-4 py-1 mx-auto sm:mx-0">
              MÉDIA: {formatValue(averageValue, selectedMetric)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-8">
          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F37021" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F37021" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 9, fontWeight: 700}}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#1e293b' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke="#F37021" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorMetric)" 
                  name={metricLabels[selectedMetric]}
                />
                <ReferenceLine y={averageValue} stroke="#cbd5e1" strokeDasharray="8 4" label={{ position: 'right', value: 'AVG', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lista Diária como Accordion de Cards (Mobile Optimized) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest px-2">Detalhamento por Período</h3>
        <Accordion type="single" collapsible className="space-y-4">
          {performanceData.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`} 
              className="ri-card border-none px-4 md:px-6 py-1 md:py-2 bg-white"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex-1 flex flex-col sm:grid sm:grid-cols-6 gap-3 text-left">
                  <div className="col-span-1">
                    <p className="text-xs font-black text-slate-800">{item.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Consolidado</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start border-t sm:border-0 pt-2 sm:pt-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase sm:mb-1">Venda</p>
                    <p className="text-xs font-black text-slate-600">{formatValue(item.venda, 'venda')}</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start">
                    <p className="text-[10px] text-slate-400 font-bold uppercase sm:mb-1">TKM</p>
                    <p className="text-xs font-black text-orange-600">{formatValue(item.tkm, 'tkm')}</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start">
                    <p className="text-[10px] text-slate-400 font-bold uppercase sm:mb-1">P.A.</p>
                    <p className="text-xs font-black text-sky-600">{item.pa.toFixed(2)}</p>
                  </div>
                  <div className="flex sm:flex-col justify-between items-center sm:items-start">
                    <p className="text-[10px] text-slate-400 font-bold uppercase sm:mb-1">Identif.</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] py-0">
                      {item.taxaIdentificacao.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 border-t border-slate-50 overflow-x-auto">
                {/* Mobile: Lista Vertical, Desktop: Tabela */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Colaborador</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Venda</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Tickets</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">TKM</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">P.A.</TableHead>
                        <TableHead className="text-[10px) font-black uppercase text-slate-400 text-right">Identificação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.vendors.map((v, vIndex) => (
                        <TableRow key={vIndex} className="hover:bg-orange-50/50 border-slate-50">
                          <TableCell className="text-xs font-black text-slate-600 uppercase">{v.name}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-700 text-right">{formatValue(v.venda, 'venda')}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-700 text-right">{v.cupons}</TableCell>
                          <TableCell className="text-xs font-bold text-orange-600 text-right">{formatValue(v.tkm, 'tkm')}</TableCell>
                          <TableCell className="text-xs font-bold text-sky-600 text-right">{v.pa.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full",
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
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                   {item.vendors.map((v, vIndex) => (
                     <div key={vIndex} className="bg-slate-50 p-3 rounded-xl space-y-2">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-slate-800 uppercase">{v.name}</span>
                         <span className="text-xs font-black text-orange-600">{formatValue(v.venda, 'venda')}</span>
                       </div>
                       <div className="grid grid-cols-2 gap-2 text-[9px]">
                         <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Tickets:</span> <span className="font-black">{v.cupons}</span></div>
                         <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">PA:</span> <span className="font-black">{v.pa.toFixed(2)}</span></div>
                         <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">TKM:</span> <span className="font-black">{formatValue(v.tkm, 'tkm')}</span></div>
                         <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase">Ident:</span> <span className="font-black">{v.taxaIdentificacao.toFixed(1)}%</span></div>
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
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex items-center gap-3 md:gap-4">
      <div className={cn("p-2 md:p-3 rounded-xl md:rounded-2xl bg-slate-50", color)}>
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <div>
        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm md:text-base font-black text-slate-800">{value}</p>
      </div>
    </Card>
  );
}
