"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  TrendingDown,
  Users, 
  Calendar,
  Package,
  Award,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface AdditionalItemsAnalysisProps {
  data: DetailedSaleRow[];
}

// LISTA OFICIAL DE CÓDIGOS SLP (Super Lançamento Premiado)
const SLP_DDC_CODES = ['5149138']; // Campanha Atual (SLP DDC)
const SLP_OUTROS_CODES = [
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
const SLP_CODES = [...SLP_DDC_CODES, ...SLP_OUTROS_CODES];

const TICKET_THRESHOLD = 49.99;

export function AdditionalItemsAnalysis({ data }: AdditionalItemsAnalysisProps) {
  const currentData = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    const isSlpItem = (item: any) => {
      return SLP_CODES.includes(item.cProd) || item.xProd.toUpperCase().includes("SLP ");
    };

    const vendors: Record<string, any> = {};
    const daily: Record<string, any> = {};
    
    let totalSlpQty = 0;
    let totalSlpValue = 0;
    let totalOpportunities = 0;
    let totalConverted = 0;
    let totalExtraSlp = 0;
    
    let totalVenda = 0;
    let totalCupons = 0;
    let totalItens = 0;
    
    let vendaSemSlp = 0;
    let itensSemSlp = 0;

    activeSales.forEach(sale => {
      const day = sale.dhEmi.substring(0, 10);
      const slpItems = sale.itens.filter(it => isSlpItem(it));
      const hasSlp = slpItems.length > 0;
      const vName = sale.vendedor || "OUTROS";

      if (!vendors[vName]) {
        vendors[vName] = { 
          name: vName, 
          qty: 0, 
          value: 0, 
          coupons: 0, 
          totalSales: 0,
          withSlp: { venda: 0, cupons: 0, itens: 0 },
          withoutSlp: { venda: 0, cupons: 0, itens: 0 },
          opportunities: 0,
          converted: 0,
          extraSlp: 0
        };
      }
      if (!daily[day]) daily[day] = { day, qty: 0, value: 0 };

      const slpQty = slpItems.reduce((acc, i) => acc + i.qCom, 0);
      const slpVal = slpItems.reduce((acc, i) => acc + i.vProd, 0);
      
      const val = parseFloat(sale.vNF);
      const qItens = parseFloat(sale.itens_qtd);
      
      const normalValue = val - slpVal;
      const normalQty = qItens - slpQty;
      
      // Calculate Opportunities
      const opps = Math.floor(normalValue / TICKET_THRESHOLD);
      const converted = Math.min(opps, slpQty);
      const extra = Math.max(0, slpQty - opps);
      
      totalOpportunities += opps;
      totalConverted += converted;
      totalExtraSlp += extra;
      
      totalSlpQty += slpQty;
      totalSlpValue += slpVal;
      
      totalVenda += val;
      totalCupons++;
      totalItens += qItens;
      
      vendaSemSlp += normalValue;
      itensSemSlp += normalQty;

      vendors[vName].totalSales++;
      vendors[vName].opportunities += opps;
      vendors[vName].converted += converted;
      vendors[vName].extraSlp += extra;
      
      vendors[vName].withSlp.venda += val;
      vendors[vName].withSlp.cupons += 1;
      vendors[vName].withSlp.itens += qItens;
      
      vendors[vName].withoutSlp.venda += normalValue;
      vendors[vName].withoutSlp.cupons += 1;
      vendors[vName].withoutSlp.itens += normalQty;

      if (hasSlp) {
        vendors[vName].qty += slpQty;
        vendors[vName].value += slpVal;
        vendors[vName].coupons++;
        
        daily[day].qty += slpQty;
        daily[day].value += slpVal;
      }
    });

    const vendorRanking = Object.values(vendors).map(v => {
      const participation = v.totalSales > 0 ? (v.coupons / v.totalSales) * 100 : 0;
      const conversionRate = v.opportunities > 0 ? (v.converted / v.opportunities) * 100 : 0;
      return { ...v, participation, conversionRate };
    }).sort((a, b) => b.qty - a.qty);

    const chartData = Object.values(daily).sort((a, b) => a.day.localeCompare(b.day)).map(d => ({
      label: format(parseISO(d.day), "dd/MM"),
      qty: d.qty,
      value: d.value
    }));
    
    const conversionRate = totalOpportunities > 0 ? (totalConverted / totalOpportunities) * 100 : 0;

    return { 
      vendorRanking, 
      chartData, 
      totalSlpQty, 
      totalSlpValue, 
      totalActiveCoupons: activeSales.length,
      totalOpportunities,
      totalConverted,
      conversionRate,
      totalVenda,
      totalCupons,
      totalItens,
      vendaSemSlp,
      itensSemSlp
    };
  }, [data]);

  const formatBRL = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const tkmCom = currentData.totalCupons > 0 ? currentData.totalVenda / currentData.totalCupons : 0;
  const tkmSem = currentData.totalCupons > 0 ? currentData.vendaSemSlp / currentData.totalCupons : 0;
  
  const paCom = currentData.totalCupons > 0 ? currentData.totalItens / currentData.totalCupons : 0;
  const paSem = currentData.totalCupons > 0 ? currentData.itensSemSlp / currentData.totalCupons : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Didático */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 border-2 border-orange-100 shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShoppingBag className="w-32 h-32 text-orange-500" />
        </div>
        
        <div className="flex items-center gap-3 text-orange-500 justify-center relative z-10">
          <Zap className="w-6 h-6" />
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">O poder do "Um Item a Mais" (SLP)</h1>
        </div>
        <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-4xl mx-auto text-center relative z-10">
          A cada <strong>R$ 49,99</strong> em produtos regulares, o cliente pode levar um item da campanha SLP (Super Lançamento Premiado) com desconto. Este painel monitora o funil dessa promoção e o impacto real no TKM.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {/* KPIs Principais - Funil */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPIItem 
            label="Faturamento SLP" 
            value={formatBRL(currentData.totalSlpValue)} 
            subValue={`${currentData.totalSlpQty} itens vendidos`} 
            icon={ShoppingBag} 
            color="text-orange-500" 
          />
          <KPIItem 
            label="Oportunidades (A cada R$ 50)" 
            value={currentData.totalOpportunities} 
            subValue="Potencial de Venda" 
            icon={Target} 
            color="text-sky-500" 
          />
          <KPIItem 
            label="Convertidas na Promo" 
            value={currentData.totalConverted} 
            subValue={`${currentData.conversionRate.toFixed(1)}% Conversão`} 
            icon={TrendingUp} 
            color="text-emerald-500" 
          />
          <KPIItem 
            label="Perdidas (Deixou na Mesa)" 
            value={currentData.totalOpportunities - currentData.totalConverted} 
            subValue={`${(100 - currentData.conversionRate).toFixed(1)}% Desperdiçado`} 
            icon={TrendingDown} 
            color="text-rose-500" 
          />
        </div>

        {/* Impact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] uppercase">Venda Média (TKM)</Badge>
                {tkmCom > tkmSem ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
              </div>
              <CardTitle className="text-2xl font-black text-slate-800">
                +{formatBRL(tkmCom - tkmSem)}
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Incremento por SLP</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2 mt-2">
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6">Com<br/>SLP</p>
                    <p className="text-sm font-black text-slate-700">{formatBRL(tkmCom)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6" title="Descontando os itens SLP">Sem<br/>SLP</p>
                    <p className="text-sm font-black text-indigo-600">{formatBRL(tkmSem)}</p>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="ri-card border-slate-200 overflow-hidden bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100 font-black text-[10px] uppercase">Itens por Venda (P.A.)</Badge>
                {paCom > paSem ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
              </div>
              <CardTitle className="text-2xl font-black text-slate-800">
                +{(paCom - paSem).toFixed(2)}
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-tight">Adicional de Itens na Sacola</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2 mt-2">
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6">Com<br/>SLP</p>
                    <p className="text-sm font-black text-slate-700">{paCom.toFixed(2)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight h-6" title="Descontando os itens SLP">Sem<br/>SLP</p>
                    <p className="text-sm font-black text-sky-600">{paSem.toFixed(2)}</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Tendência */}
          <Card className="ri-card lg:col-span-12 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Evolução de Itens SLP Vendidos
              </CardTitle>
              <Badge variant="outline" className="bg-white text-[10px] font-black uppercase border-orange-200 text-orange-600">Ritmo Diário</Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px] w-full">
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
        </div>

        {/* Tabela Detalhada com Funil */}
        <Card className="ri-card overflow-hidden shadow-sm border-slate-200">
          <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                Performance da Equipe em SLP
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Impacto e Conversão individual</p>
            </div>
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 uppercase font-black text-[10px]">
              {currentData.vendorRanking.length} Vendedores
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase pl-6 text-slate-500">Colaborador</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center text-slate-500">TKM Real vs S/ SLP</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center text-slate-500">Oportunidades<br/>(A cada R$50)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center text-slate-500">Convertidos<br/>(Resgates)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center text-slate-500">Avulso<br/>(Preço Cheio)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6 text-slate-500">Taxa de Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-50">
                {currentData.vendorRanking
                  .sort((a, b) => b.conversionRate - a.conversionRate || b.opportunities - a.opportunities)
                  .map((v, i) => {
                  const tkmReal = v.withSlp.cupons > 0 ? v.withSlp.venda / v.withSlp.cupons : 0;
                  const tkmSem = v.withoutSlp.cupons > 0 ? v.withoutSlp.venda / v.withoutSlp.cupons : 0;
                  
                  return (
                    <TableRow key={i} className="hover:bg-slate-50/50 transition-colors h-16">
                      <TableCell className="pl-6">
                        <div className="font-black text-xs text-slate-700 uppercase">{v.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{v.totalSales} vendas totais</div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 line-through">{formatBRL(tkmSem)}</span>
                            <span className="text-xs font-black text-orange-600">{formatBRL(tkmReal)}</span>
                          </div>
                          <div className="text-[8px] font-black uppercase px-1 rounded-sm mt-0.5 text-orange-500">
                            +{formatBRL(tkmReal - tkmSem)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="text-sm font-black text-sky-600">{v.opportunities}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Geradas</p>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="text-sm font-black text-emerald-600">{v.converted}</span>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">SLP Ativados</p>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className={cn("text-xs font-black", v.extraSlp > 0 ? "text-amber-500" : "text-slate-300")}>{v.extraSlp}</span>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge className={cn(
                            "font-black text-[10px] py-0.5",
                            v.conversionRate >= currentData.conversionRate ? "bg-emerald-500" : "bg-rose-500"
                          )}>
                            {v.conversionRate.toFixed(1)}%
                          </Badge>
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full", v.conversionRate >= currentData.conversionRate ? "bg-emerald-500" : "bg-rose-500")} 
                              style={{ width: `${v.conversionRate}%` }} 
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPIItem({ label, value, subValue, icon: Icon, color }: any) {
  return (
    <Card className="ri-card p-5 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[130px]">
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
