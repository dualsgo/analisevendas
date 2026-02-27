"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Clock,
  Ban,
  ArrowRightLeft,
  Percent,
  Activity,
  User,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface OperationalProductivityProps {
  data: DetailedSaleRow[];
}

export function OperationalProductivity({ data }: OperationalProductivityProps) {
  const [selectedMetric, setSelectedMetric] = useState<"time" | "cancel" | "discount" | "troca">("time");

  const metrics = useMemo(() => {
    const saidas = data.filter(s => s.tpNF === 1);
    const canceladas = data.filter(s => s.is_cancelada);
    
    // 1. Tempo Médio Pickup -> Adicional
    const adicionaisComTempo = saidas.filter(s => 
      (s.is_adicional || s.is_adicional_suspeito) && s.data_retirada_associada
    ).map(s => {
      const t1 = new Date(s.dhEmi).getTime();
      const t2 = new Date(s.data_retirada_associada!).getTime();
      return Math.abs(t1 - t2) / 60000; // em minutos
    });

    const avgTime = adicionaisComTempo.length > 0 
      ? adicionaisComTempo.reduce((a, b) => a + b, 0) / adicionaisComTempo.length 
      : 0;

    // 2. Ranking por Vendedor
    const vendorsMap: Record<string, any> = {};
    data.forEach(s => {
      const v = s.vendedor || "VENDEDOR";
      if (!vendorsMap[v]) vendorsMap[v] = { name: v, total: 0, cancel: 0, trocas: 0, descSum: 0, descCount: 0, times: [] };
      
      vendorsMap[v].total++;
      if (s.is_cancelada) vendorsMap[v].cancel++;
      if (s.is_troca) vendorsMap[v].trocas++;
      if (parseFloat(s.desconto_total) > 0) {
        vendorsMap[v].descSum += parseFloat(s.percentual_desconto);
        vendorsMap[v].descCount++;
      }
      if ((s.is_adicional || s.is_adicional_suspeito) && s.data_retirada_associada) {
        const t1 = new Date(s.dhEmi).getTime();
        const t2 = new Date(s.data_retirada_associada).getTime();
        vendorsMap[v].times.push(Math.abs(t1 - t2) / 60000);
      }
    });

    const vendorRanking = Object.values(vendorsMap).map((v: any) => ({
      ...v,
      percCancel: (v.cancel / v.total) * 100,
      avgDesc: v.descCount > 0 ? (v.descSum / v.descCount) * 100 : 0,
      avgTime: v.times.length > 0 ? v.times.reduce((a: any, b: any) => a + b, 0) / v.times.length : 0
    })).sort((a, b) => b.total - a.total);

    // 3. Dados Temporais (Agrupados por dia)
    const dailyMap: Record<string, any> = {};
    data.forEach(s => {
      if (!s.dhEmi) return;
      const day = s.dhEmi.substring(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { day, time: [], cancel: 0, total: 0, desc: [], troca: 0 };
      
      dailyMap[day].total++;
      if (s.is_cancelada) dailyMap[day].cancel++;
      if (s.is_troca) dailyMap[day].troca++;
      if (parseFloat(s.desconto_total) > 0) dailyMap[day].desc.push(parseFloat(s.percentual_desconto) * 100);
      if ((s.is_adicional || s.is_adicional_suspeito) && s.data_retirada_associada) {
        const t1 = new Date(s.dhEmi).getTime();
        const t2 = new Date(s.data_retirada_associada).getTime();
        dailyMap[day].time.push(Math.abs(t1 - t2) / 60000);
      }
    });

    const chartData = Object.values(dailyMap).map((d: any) => ({
      label: format(parseISO(d.day), "dd/MM"),
      time: d.time.length > 0 ? d.time.reduce((a: any, b: any) => a + b, 0) / d.time.length : 0,
      cancel: (d.cancel / d.total) * 100,
      discount: d.desc.length > 0 ? d.desc.reduce((a: any, b: any) => a + b, 0) / d.desc.length : 0,
      troca: d.troca
    })).sort((a, b) => a.label.localeCompare(b.label));

    return {
      avgTime,
      totalCancel: canceladas.length,
      percCancel: (canceladas.length / data.length) * 100,
      totalTrocas: data.filter(s => s.is_troca).length,
      avgDiscount: (data.filter(s => parseFloat(s.desconto_total) > 0).reduce((acc, s) => acc + parseFloat(s.percentual_desconto), 0) / data.filter(s => parseFloat(s.desconto_total) > 0).length || 0) * 100,
      vendorRanking,
      chartData
    };
  }, [data]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Indicadores Operacionais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <OpStat label="Tempo Médio Adicional" value={`${metrics.avgTime.toFixed(0)} min`} icon={Timer} color="text-orange-500" />
        <OpStat label="Taxa Cancelamento" value={`${metrics.percCancel.toFixed(1)}%`} icon={Ban} color="text-rose-500" />
        <OpStat label="Total Trocas" value={metrics.totalTrocas} icon={ArrowRightLeft} color="text-purple-500" />
        <OpStat label="Desconto Médio" value={`${metrics.avgDiscount.toFixed(1)}%`} icon={Percent} color="text-slate-500" />
      </div>

      {/* Gráfico de Evolução */}
      <Card className="ri-card overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          <div>
            <CardTitle className="text-xs font-black uppercase text-slate-600 flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" /> Evolução Operacional
            </CardTitle>
          </div>
          <Select value={selectedMetric} onValueChange={(v: any) => setSelectedMetric(v)}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-[10px] font-black rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Tempo de Adicional</SelectItem>
              <SelectItem value="cancel">Taxa Cancelamento</SelectItem>
              <SelectItem value="discount">Média Desconto</SelectItem>
              <SelectItem value="troca">Volume Trocas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartData}>
                <defs>
                  <linearGradient id="colorOp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F37021" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F37021" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey={selectedMetric} stroke="#F37021" strokeWidth={3} fill="url(#colorOp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ranking de Produtividade */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2 text-center">Eficiência por Colaborador</h3>
        
        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-50">
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Colaborador</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">T. Médio Adicional</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">% Cancel.</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Trocas</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Desc. Médio</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.vendorRanking.map((v, i) => (
                <TableRow key={i} className="hover:bg-slate-50/50 border-slate-50">
                  <TableCell className="text-xs font-black text-slate-700 uppercase">{v.name}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-bold text-slate-600">{v.avgTime.toFixed(0)} min</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[10px] font-black border-none", v.percCancel > 5 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                      {v.percCancel.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-600">{v.trocas}</TableCell>
                  <TableCell className="text-center font-bold text-slate-600">{v.avgDesc.toFixed(1)}%</TableCell>
                  <TableCell className="text-center">
                    {v.percCancel < 3 ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-orange-400 mx-auto" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-3">
          {metrics.vendorRanking.map((v, i) => (
            <div key={i} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-sm font-black text-slate-800 uppercase">{v.name}</h5>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Produtividade Operacional</p>
                </div>
                {v.percCancel < 3 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-orange-400" />}
              </div>
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">T. Médio Adicional</p>
                  <p className="text-xs font-black text-slate-700">{v.avgTime.toFixed(0)} min</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Cancelamento</p>
                  <p className={cn("text-xs font-black", v.percCancel > 5 ? "text-rose-600" : "text-emerald-600")}>{v.percCancel.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Vol. Trocas</p>
                  <p className="text-xs font-black text-slate-700">{v.trocas} atend.</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Média Desconto</p>
                  <p className="text-xs font-black text-slate-700">{v.avgDesc.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpStat({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col items-center justify-center text-center gap-3 shadow-sm min-h-[110px]">
      <div className={cn("p-2 rounded-xl bg-slate-50 w-fit", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-sm md:text-xl font-black text-slate-800 leading-none">{value}</p>
      </div>
    </Card>
  );
}
