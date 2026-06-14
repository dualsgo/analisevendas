"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
import { 
  ShoppingBag, 
  Zap, 
  TrendingUp, 
  Users, 
  Calendar,
  Package,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface AdditionalItemsAnalysisProps {
  data: DetailedSaleRow[];
}

// LISTA OFICIAL DE CÓDIGOS SLP (Super Lançamento Premiado)
const SLP_CODES = [
  '5135238', '5135269', '5135270', '5135273',
  '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476',
  '5146501', '5146504', '5146505',
  '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900',
  '5141902', '5141903', '5141904', '5141905', '5141907',
  '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920',
  '5141949', '5141978',
  '5140469', '5140475', '5140476', '5140477', '5140478', '5140479',
  '5146477', '5146478', '5146502', '5146503'
];

export function AdditionalItemsAnalysis({ data }: AdditionalItemsAnalysisProps) {
  const currentData = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const isSlpItem = (item: any) => {
      return SLP_CODES.includes(item.cProd) || item.xProd.toUpperCase().includes("SLP ");
    };

    const vendors: Record<string, any> = {};
    const daily: Record<string, any> = {};
    let totalQty = 0;
    let totalValue = 0;
    let totalCouponsWithItem = 0;

    activeSales.forEach(sale => {
      const day = sale.dhEmi.substring(0, 10);
      const matchingItems = sale.itens.filter(it => isSlpItem(it));
      const vName = sale.vendedor || "OUTROS";

      if (!vendors[vName]) vendors[vName] = { name: vName, qty: 0, value: 0, coupons: 0, totalSales: 0 };
      if (!daily[day]) daily[day] = { day, qty: 0, value: 0 };

      vendors[vName].totalSales++;

      if (matchingItems.length > 0) {
        const q = matchingItems.reduce((acc, i) => acc + i.qCom, 0);
        const v = matchingItems.reduce((acc, i) => acc + i.vProd, 0);
        
        vendors[vName].qty += q;
        vendors[vName].value += v;
        vendors[vName].coupons++;
        
        daily[day].qty += q;
        daily[day].value += v;
        
        totalQty += q;
        totalValue += v;
        totalCouponsWithItem++;
      }
    });

    const vendorRanking = Object.values(vendors).map(v => ({
      ...v,
      participation: v.totalSales > 0 ? (v.coupons / v.totalSales) * 100 : 0
    })).sort((a, b) => b.qty - a.qty);

    const chartData = Object.values(daily).sort((a, b) => a.day.localeCompare(b.day)).map(d => ({
      label: format(parseISO(d.day), "dd/MM"),
      qty: d.qty,
      value: d.value
    }));

    return { vendorRanking, chartData, totalQty, totalValue, totalCouponsWithItem, totalActiveCoupons: activeSales.length };
  }, [data]);

  const globalParticipation = currentData.totalActiveCoupons > 0 ? (currentData.totalCouponsWithItem / currentData.totalActiveCoupons) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-orange-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-orange-500 justify-center">
          <Zap className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">O poder do "Um Item a Mais"</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-4xl mx-auto text-center">
          Este painel monitora os itens de **checkout e lançamentos**. Vender um brinquedo caro é técnica, mas garantir que cada cliente leve um **SLP** é disciplina e consistência de atendimento.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPIItem 
            label="Total Vendido (Qtd)" 
            value={currentData.totalQty} 
            subValue="Itens no período" 
            icon={Package} 
            color="text-orange-500" 
          />
          <KPIItem label="Participação Geral" value={`${globalParticipation.toFixed(1)}%`} subValue="De todos os cupons" icon={TrendingUp} color="text-sky-500" />
          <KPIItem label="Faturamento Extra" value={currentData.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} subValue="Receita Incremental" icon={ShoppingBag} color="text-emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Tendência */}
          <Card className="ri-card lg:col-span-8 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Evolução de Vendas Diária
              </CardTitle>
              <Badge variant="outline" className="bg-white text-[10px] font-black uppercase">SLP</Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F37021" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#F37021" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: 'none' }} />
                    <Area type="monotone" dataKey="qty" stroke="#F37021" strokeWidth={3} fill="url(#colorValue)" name="Itens" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Ranking Colaborador */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 text-center">Engajamento por Equipe</h3>
            <div className="space-y-3">
              {currentData.vendorRanking.slice(0, 6).map((v, i) => (
                <Card key={i} className="ri-card p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1.5">
                        {v.qty} itens em {v.coupons} cupons
                      </p>
                    </div>
                    {i === 0 && <Award className="w-5 h-5 text-orange-500" />}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black">
                      <span className="text-slate-400 uppercase">Participação</span>
                      <span className="text-orange-600">{v.participation.toFixed(1)}%</span>
                    </div>
                    <Progress value={v.participation} className="h-1.5 bg-orange-100" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela Detalhada */}
        <Card className="ri-card overflow-hidden shadow-sm">
          <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Relatório Analítico de Colaboradores</h3>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400">{currentData.vendorRanking.length} ATIVOS</span>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-white">
              <TableRow className="border-slate-50">
                <TableHead className="text-[10px] font-black uppercase pl-8">Colaborador</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Itens Vendidos</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Cupons com Item</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Taxa de Adesão</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right pr-8">Receita Extra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.vendorRanking.map((v, i) => (
                <TableRow key={i} className="hover:bg-slate-50/50 border-slate-50 h-14">
                  <TableCell className="pl-8 font-black text-slate-700 text-xs uppercase">{v.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-100 font-black">{v.qty}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-500">{v.coupons}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn("text-[10px] font-black", v.participation >= globalParticipation ? "text-emerald-600" : "text-slate-400")}>
                        {v.participation.toFixed(1)}%
                      </span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${v.participation}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8 font-black text-slate-700">
                    {v.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function KPIItem({ label, value, subValue, icon: Icon, color }: any) {
  return (
    <Card className="ri-card p-5 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[120px]">
      <div className={cn("p-3 rounded-2xl bg-slate-50 shadow-inner", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase leading-none">{subValue}</p>
      </div>
    </Card>
  );
}
