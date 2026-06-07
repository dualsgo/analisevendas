"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Heart, 
  Zap, 
  TrendingUp, 
  Users, 
  Calendar,
  Star,
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

// LISTA OFICIAL DE CÓDIGOS AÇÃO SOCIAL (Baralhos, Sacolas, Livros Doação)
const SOCIAL_CODES = [
  '5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', 
  '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', 
  '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', 
  '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', 
  '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', 
  '5097335', '5011918', '5136558'
];

const BARALHO_CODES = ['5147797', '5147796'];
const SACOLA_CODES = ['5133676', '5113644'];

export function AdditionalItemsAnalysis({ data }: AdditionalItemsAnalysisProps) {
  const [activeCategory, setActiveCategory] = useState<"slp" | "social">("slp");

  const analytics = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    // 1. Identificação de Itens por Código ou Texto (Segurança Dupla)
    const isSlpItem = (item: any) => {
      return SLP_CODES.includes(item.cProd) || item.xProd.toUpperCase().includes("SLP ");
    };

    const isSocialItem = (item: any) => {
      if (SOCIAL_CODES.includes(item.cProd)) return true;
      const p = item.xProd.toUpperCase();
      return p.includes("BARALHO") || p.includes("SACOLA") || p.includes("ACAO SOCIAL") || p.includes("DOACAO") || p.includes("ALMANAQUE");
    };

    const processCategory = (filterFn: (item: any) => boolean) => {
      const vendors: Record<string, any> = {};
      const daily: Record<string, any> = {};
      let totalQty = 0;
      let totalValue = 0;
      let totalCouponsWithItem = 0;

      activeSales.forEach(sale => {
        const day = sale.dhEmi.substring(0, 10);
        const matchingItems = sale.itens.filter(it => filterFn(it));
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
    };

    const isSocialBaralho = (it: any) => {
      if (BARALHO_CODES.includes(it.cProd)) return true;
      const p = it.xProd.toUpperCase();
      return p.includes("BARALHO") || p.includes("ACAO SOCIAL") || p.includes("DOACAO") || p.includes("ALMANAQUE");
    };
    
    const isSocialSacola = (it: any) => {
      if (SACOLA_CODES.includes(it.cProd)) return true;
      const p = it.xProd.toUpperCase();
      return p.includes("SACOLA");
    };

    const processSocial = () => {
      const vendors: Record<string, any> = {};
      const daily: Record<string, any> = {};
      let totalQty = 0;
      let totalValue = 0;
      let totalCouponsWithItem = 0;
      let totalBaralhos = 0;
      let totalSacolas = 0;

      activeSales.forEach(sale => {
        const day = sale.dhEmi.substring(0, 10);
        const matchingItems = sale.itens.filter(it => isSocialItem(it));
        const vName = sale.vendedor || "OUTROS";

        if (!vendors[vName]) vendors[vName] = { name: vName, qty: 0, value: 0, coupons: 0, totalSales: 0, baralhos: 0, sacolas: 0 };
        if (!daily[day]) daily[day] = { day, qty: 0, value: 0, baralhos: 0, sacolas: 0 };

        vendors[vName].totalSales++;

        if (matchingItems.length > 0) {
          const q = matchingItems.reduce((acc, i) => acc + i.qCom, 0);
          const v = matchingItems.reduce((acc, i) => acc + i.vProd, 0);
          
          vendors[vName].qty += q;
          vendors[vName].value += v;
          vendors[vName].coupons++;
          
          matchingItems.forEach(it => {
            if (isSocialBaralho(it)) {
              vendors[vName].baralhos += it.qCom;
              daily[day].baralhos += it.qCom;
              totalBaralhos += it.qCom;
            } else if (isSocialSacola(it)) {
              vendors[vName].sacolas += it.qCom;
              daily[day].sacolas += it.qCom;
              totalSacolas += it.qCom;
            }
          });

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
        value: d.value,
        baralhos: d.baralhos,
        sacolas: d.sacolas
      }));

      return { vendorRanking, chartData, totalQty, totalValue, totalCouponsWithItem, totalActiveCoupons: activeSales.length, totalBaralhos, totalSacolas };
    };

    return {
      slp: processCategory(isSlpItem),
      social: processSocial()
    };
  }, [data]);

  const currentData = activeCategory === "slp" ? analytics.slp : analytics.social;
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
          Este painel monitora os itens de **checkout e lançamentos**. Vender um brinquedo caro é técnica, mas garantir que cada cliente leve um **SLP** ou contribua com a **Ação Social** é disciplina e consistência de atendimento.
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={(v: any) => setActiveCategory(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-slate-100 rounded-2xl h-14 p-1 shadow-sm">
          <TabsTrigger value="slp" className="rounded-xl font-black text-[10px] md:text-xs uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Star className="w-3.5 h-3.5 mr-2" /> Campanha SLP (Colecionáveis)
          </TabsTrigger>
          <TabsTrigger value="social" className="rounded-xl font-black text-[10px] md:text-xs uppercase data-[state=active]:bg-rose-500 data-[state=active]:text-white">
            <Heart className="w-3.5 h-3.5 mr-2" /> Ação Social (🃏 & 🛍️)
          </TabsTrigger>
        </TabsList>

        <div className="mt-8 space-y-8">
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPIItem 
              label={activeCategory === 'slp' ? "Total Vendido (Qtd)" : "Total Social (Qtd)"} 
              value={activeCategory === 'slp' ? currentData.totalQty : `${(currentData as any).totalBaralhos} 🃏 + ${(currentData as any).totalSacolas} 🛍️`} 
              subValue="Itens no período" 
              icon={Package} 
              color={activeCategory === 'slp' ? 'text-orange-500' : 'text-rose-500'} 
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
                <Badge variant="outline" className="bg-white text-[10px] font-black uppercase">{activeCategory}</Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentData.chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeCategory === 'slp' ? "#F37021" : "#E4007C"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={activeCategory === 'slp' ? "#F37021" : "#E4007C"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                      <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: 'none' }} />
                      <Area type="monotone" dataKey="qty" stroke={activeCategory === 'slp' ? "#F37021" : "#E4007C"} strokeWidth={3} fill="url(#colorValue)" name="Itens" />
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
                          {activeCategory === 'slp' ? `${v.qty} itens` : `🃏${v.baralhos} + 🛍️${v.sacolas}`} em {v.coupons} cupons
                        </p>
                      </div>
                      {i === 0 && <Award className="w-5 h-5 text-orange-500" />}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black">
                        <span className="text-slate-400 uppercase">Participação</span>
                        <span className="text-orange-600">{v.participation.toFixed(1)}%</span>
                      </div>
                      <Progress value={v.participation} className={cn("h-1.5", activeCategory === 'slp' ? "bg-orange-100" : "bg-rose-100")} />
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
                          <div className={cn("h-full", activeCategory === 'slp' ? 'bg-orange-500' : 'bg-rose-500')} style={{ width: `${v.participation}%` }} />
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
      </Tabs>
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
