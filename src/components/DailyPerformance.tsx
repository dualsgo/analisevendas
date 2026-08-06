"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, Item } from "@/lib/types";
import { format, parseISO, startOfDay, addDays, differenceInDays, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  TrendingUp, Calendar, UserCheck, BarChart3, ArrowUpRight, ArrowDownRight, Target,
  Smartphone, Bike
} from "lucide-react";
import { cn } from "@/lib/utils";

const SLP_CODES = ['5135238', '5135269', '5135270', '5135273', '5146458', '5146469', '5146470', '5146471', '5146472', '5146473', '5146474', '5146475', '5146476', '5146501', '5146504', '5146505', '5141894', '5141895', '5141896', '5141897', '5141898', '5141899', '5141900', '5141902', '5141903', '5141904', '5141905', '5141907', '5141909', '5141910', '5141911', '5141912', '5141913', '5141914', '5141915', '5141916', '5141917', '5141920', '5141949', '5141978', '5140469', '5140475', '5140476', '5140477', '5140478', '5140479', '5146477', '5146478', '5146502', '5146503'];
const SOCIAL_CODES = ['5057181', '5055875', '5135601', '5129270', '5129271', '5129247', '5129262', '5122642', '5122641', '5135612', '5122639', '5122638', '5133676', '5113644', '5113641', '5113642', '5113643', '5129267', '5129255', '5143422', '5139528', '5143423', '5145833', '5139527', '5147797', '5147796', '5145834', '5079753', '5079752', '5106673', '5106671', '5106674', '5106672', '5088519', '5097336', '5097335', '5011918', '5136558'];
const BARALHO_CODES = ['5147797', '5147796', '5149977', '5149978'];
const SACOLA_CODES = ['5133676', '5113644'];

const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNum = (val: number, precision = 2) => val.toLocaleString('pt-BR', { minimumFractionDigits: precision, maximumFractionDigits: precision });

export interface VendorAggregate {
  name: string;
  venda: number;
  cupons: number;
  itens: number;
  ident: number;
  slpQty: number;
  baralhoQty: number;
  sacolaQty: number;
  pickups: number;
  adicionais: number;
  pa: number;
  tkm: number;
  pm: number;
  identPerc: number;
  conv: number;
}

export interface GroupedDailyData {
  key: string;
  label: string;
  venda: number;
  cupons: number;
  itens: number;
  ident: number;
  pa: number;
  tkm: number;
  pm: number;
  identPerc: number;
  conv: number;
  slpQty: number;
  baralhoQty: number;
  sacolaQty: number;
  pickups: number;
  adicionais: number;
  vendors: VendorAggregate[];
}

interface DailyPerformanceProps {
  data: DetailedSaleRow[];
}

type MetricType = 'venda' | 'cupons' | 'itens' | 'tkm' | 'pa' | 'identPerc';

export function DailyPerformance({ data }: DailyPerformanceProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('venda');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState<string>('all');
  
  // Toggles just like ConsolidatedReport
  const [includePickups, setIncludePickups] = useState(false);
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [includeFigurinhas, setIncludeFigurinhas] = useState(true);
  const [includeAlbuns, setIncludeAlbuns] = useState(true);
  const [includeBaralhos, setIncludeBaralhos] = useState(true);
  const [includeSLP, setIncludeSLP] = useState(true);
  const [includeSacolas, setIncludeSacolas] = useState(true);

  const [selectedDateRow, setSelectedDateRow] = useState<GroupedDailyData | null>(null);
  
  // Toggles filtering logic
  const isBaralho = (it: Item) => {
    if (BARALHO_CODES.includes(it.cProd)) return true;
    const p = (it.xProd || "").toUpperCase();
    return p.includes("BARALHO") || p.includes("ACAO SOCIAL") || p.includes("DOACAO") || p.includes("ALMANAQUE");
  };
  
  const isSacola = (it: Item) => {
    if (SACOLA_CODES.includes(it.cProd)) return true;
    const p = (it.xProd || "").toUpperCase();
    return p.includes("SACOLA");
  };

  const performanceData = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    let processedData = activeSales.map(s => {
      const isFisica = s.canal === "LOJA_FISICA" || s.canal === "RETIRADA_ADICIONAL" || s.is_adicional || s.is_adicional_suspeito;
      const isOnline = s.canal === "RETIRADA_ONLINE";
      const isDelivery = s.canal === "DELIVERY";

      const shouldProcess = isFisica || (isOnline && includePickups) || (isDelivery && includeDelivery);
      
      if (!shouldProcess) return null;

      let saleRealVenda = parseFloat(s.vNF);
      let saleRealItens = parseFloat(s.itens_qtd);
      let isIdentified = s.cpf_cnpj_dest && s.cpf_cnpj_dest.trim() !== "" ? 1 : 0;
      
      let saleFilteredVenda = 0;
      let saleFilteredItens = 0;
      let validItemsCount = 0;
      
      let slpQty = 0, baralhoQty = 0, sacolaQty = 0;

      s.itens.forEach(it => {
        if (SLP_CODES.includes(it.cProd)) slpQty += it.qCom;
        if (SOCIAL_CODES.includes(it.cProd) || isBaralho(it) || isSacola(it)) {
          if (isBaralho(it)) baralhoQty += it.qCom;
          else if (isSacola(it)) sacolaQty += it.qCom;
          else baralhoQty += it.qCom;
        }

        const isFig = ["5147790", "5147791", "5149187"].includes(it.cProd);
        const isAlb = it.cProd === "5147812";
        const isBar = isBaralho(it);
        const isSac = isSacola(it);
        const isSlpItem = SLP_CODES.includes(it.cProd);

        let includeItem = true;
        if (isFig && !includeFigurinhas) includeItem = false;
        if (isAlb && !includeAlbuns) includeItem = false;
        if (isBar && !includeBaralhos) includeItem = false;
        if (isSac && !includeSacolas) includeItem = false;
        if (isSlpItem && !includeSLP) includeItem = false;

        if (includeItem) {
            saleFilteredVenda += it.vProd;
            saleFilteredItens += it.qCom;
            validItemsCount++;
        }
      });
      
      if (validItemsCount === 0) {
        saleFilteredVenda = 0;
        saleFilteredItens = 0;
      } else if (validItemsCount === s.itens.length) {
        saleFilteredVenda = saleRealVenda;
        saleFilteredItens = saleRealItens;
      } else {
        const totalVProd = s.itens.reduce((acc, it) => acc + it.vProd, 0);
        const ratio = totalVProd > 0 ? saleRealVenda / totalVProd : 1;
        saleFilteredVenda = saleFilteredVenda * ratio;
      }

      let saleFilteredCupons = validItemsCount > 0 ? 1 : 0;
      let saleFilteredIdent = validItemsCount > 0 ? isIdentified : 0;
      
      let pickupsAtendidas = isOnline ? 1 : 0;
      let adicionaisFeitos = (s.is_adicional || s.is_adicional_suspeito || s.canal === "RETIRADA_ADICIONAL") ? 1 : 0;

      return {
        ...s,
        saleFilteredVenda,
        saleFilteredItens,
        saleFilteredCupons,
        saleFilteredIdent,
        slpQty, baralhoQty, sacolaQty, pickupsAtendidas, adicionaisFeitos
      };
    }).filter(Boolean);

    // Apply Day of Week filter
    if (dayOfWeekFilter !== 'all') {
      processedData = processedData.filter(r => r && getDay(parseISO(r.dhEmi)).toString() === dayOfWeekFilter);
    }

    const sortedData = [...processedData].sort((a: any, b: any) => 
      parseISO(a.dhEmi).getTime() - parseISO(b.dhEmi).getTime()
    );

    if (sortedData.length === 0) return [];

    const groupData = (groups: Record<string, any[]>, getLabel: (key: string, firstRow: any) => string) => {
       return Object.entries(groups).map(([key, rows]) => {
         const venda = rows.reduce((acc, r) => acc + r.saleFilteredVenda, 0);
         const cupons = rows.reduce((acc, r) => acc + r.saleFilteredCupons, 0);
         const itens = rows.reduce((acc, r) => acc + r.saleFilteredItens, 0);
         const ident = rows.reduce((acc, r) => acc + r.saleFilteredIdent, 0);
         const slpQty = rows.reduce((acc, r) => acc + r.slpQty, 0);
         const baralhoQty = rows.reduce((acc, r) => acc + r.baralhoQty, 0);
         const sacolaQty = rows.reduce((acc, r) => acc + r.sacolaQty, 0);
         const pickups = rows.reduce((acc, r) => acc + r.pickupsAtendidas, 0);
         const adicionais = rows.reduce((acc, r) => acc + r.adicionaisFeitos, 0);
         
         const pa = cupons > 0 ? itens / cupons : 0;
         const tkm = cupons > 0 ? venda / cupons : 0;
         const pm = itens > 0 ? venda / itens : 0;
         const identPerc = cupons > 0 ? (ident / cupons) * 100 : 0;
         const conv = pickups > 0 ? (adicionais / pickups) * 100 : 0;

         // Breakdown by vendor
         const vendorGroups: Record<string, any> = {};
         rows.forEach(r => {
           const v = r.vendedor || "OUTROS";
           if (!vendorGroups[v]) {
             vendorGroups[v] = { venda: 0, cupons: 0, itens: 0, ident: 0, slpQty: 0, baralhoQty: 0, sacolaQty: 0, pickups: 0, adicionais: 0 };
           }
           vendorGroups[v].venda += r.saleFilteredVenda;
           vendorGroups[v].cupons += r.saleFilteredCupons;
           vendorGroups[v].itens += r.saleFilteredItens;
           vendorGroups[v].ident += r.saleFilteredIdent;
           vendorGroups[v].slpQty += r.slpQty;
           vendorGroups[v].baralhoQty += r.baralhoQty;
           vendorGroups[v].sacolaQty += r.sacolaQty;
           vendorGroups[v].pickups += r.pickupsAtendidas;
           vendorGroups[v].adicionais += r.adicionaisFeitos;
         });
         
         const vendors = Object.entries(vendorGroups).map(([name, vg]) => ({
           name,
           ...vg,
           pa: vg.cupons > 0 ? vg.itens / vg.cupons : 0,
           tkm: vg.cupons > 0 ? vg.venda / vg.cupons : 0,
           pm: vg.itens > 0 ? vg.venda / vg.itens : 0,
           identPerc: vg.cupons > 0 ? (vg.ident / vg.cupons) * 100 : 0,
           conv: vg.pickups > 0 ? (vg.adicionais / vg.pickups) * 100 : 0,
         })).sort((a,b) => b.venda - a.venda);

         return {
           key,
           label: getLabel(key, rows[0]),
           venda, cupons, itens, ident, pa, tkm, pm, identPerc, conv,
           slpQty, baralhoQty, sacolaQty, pickups, adicionais,
           vendors
         };
       });
    };

    if (viewMode === 'daily') {
      const groups: Record<string, any[]> = {};
      sortedData.forEach(r => {
        const day = (r as any).dhEmi.substring(0, 10);
        if (!groups[day]) groups[day] = [];
        groups[day].push(r);
      });
      return groupData(groups, (key) => format(parseISO(key), "dd/MM/yy (eee)", { locale: ptBR }).toUpperCase());
    } else if (viewMode === 'weekly') {
      const firstDate = startOfDay(parseISO((sortedData[0] as any).dhEmi));
      const groups: Record<string, any[]> = {};
      sortedData.forEach(r => {
        const currentDate = startOfDay(parseISO((r as any).dhEmi));
        const diff = differenceInDays(currentDate, firstDate);
        const weekIndex = Math.floor(diff / 7);
        const weekStart = addDays(firstDate, weekIndex * 7);
        const key = `W${weekIndex}_${format(weekStart, 'yyyy-MM-dd')}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });
      return groupData(groups, (key) => {
        const dStr = key.split('_')[1];
        return `SEM. INIC. ${format(parseISO(dStr), "dd/MM")}`;
      });
    } else {
      const groups: Record<string, any[]> = {};
      sortedData.forEach(r => {
        const month = (r as any).dhEmi.substring(0, 7);
        if (!groups[month]) groups[month] = [];
        groups[month].push(r);
      });
      return groupData(groups, (key) => format(parseISO(key + "-01"), "MMMM yy", { locale: ptBR }).toUpperCase());
    }
  }, [data, viewMode, dayOfWeekFilter, includePickups, includeDelivery, includeFigurinhas, includeAlbuns, includeBaralhos, includeSLP, includeSacolas]);

  const averageValue = useMemo(() => {
    if (performanceData.length === 0) return 0;
    const sum = performanceData.reduce((acc, d) => acc + (d[selectedMetric] as number), 0);
    return sum / performanceData.length;
  }, [performanceData, selectedMetric]);

  const totals = useMemo(() => {
    const sum = performanceData.reduce((acc, v) => ({
      venda: acc.venda + v.venda,
      cupons: acc.cupons + v.cupons,
      itens: acc.itens + v.itens,
      pickups: acc.pickups + v.pickups,
      adicionais: acc.adicionais + v.adicionais,
      ident: acc.ident + v.ident,
      slp: acc.slp + v.slpQty,
      baralhos: acc.baralhos + v.baralhoQty,
      sacolas: acc.sacolas + v.sacolaQty
    }), { venda: 0, cupons: 0, itens: 0, pickups: 0, adicionais: 0, ident: 0, slp: 0, baralhos: 0, sacolas: 0 });

    return {
      ...sum,
      pa: sum.cupons > 0 ? sum.itens / sum.cupons : 0,
      tkm: sum.cupons > 0 ? sum.venda / sum.cupons : 0,
      pm: sum.itens > 0 ? sum.venda / sum.itens : 0,
      identPerc: sum.cupons > 0 ? (Math.min(sum.ident / sum.cupons, 1)) * 100 : 0,
      conv: sum.pickups > 0 ? (sum.adicionais / sum.pickups) * 100 : 0
    };
  }, [performanceData]);

  const metricLabels: Record<MetricType, string> = {
    venda: "Venda Total",
    cupons: "Tickets",
    itens: "Peças",
    tkm: "Ticket Médio",
    pa: "P.A.",
    identPerc: "Identificação (%)"
  };

  const formatValue = (val: number, type: MetricType) => {
    if (type === 'venda' || type === 'tkm') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (type === 'pa' || type === 'identPerc') return val.toFixed(2);
    return val.toString();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Toggles & View Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="space-y-1.5 text-center shrink-0">
            <label className="text-[9px] font-black uppercase text-slate-400 px-1">Visão Temporal</label>
            <div className="flex gap-1 w-full sm:w-auto bg-slate-50 p-1 rounded-xl">
              <Button size="sm" variant={viewMode === 'daily' ? 'default' : 'ghost'} onClick={() => setViewMode('daily')} className="flex-1 h-8 text-[9px] font-black uppercase px-3 shadow-none">Dia</Button>
              <Button size="sm" variant={viewMode === 'weekly' ? 'default' : 'ghost'} onClick={() => setViewMode('weekly')} className="flex-1 h-8 text-[9px] font-black uppercase px-3 shadow-none">Semana</Button>
              <Button size="sm" variant={viewMode === 'monthly' ? 'default' : 'ghost'} onClick={() => setViewMode('monthly')} className="flex-1 h-8 text-[9px] font-black uppercase px-3 shadow-none">Mês</Button>
            </div>
          </div>

          <div className="space-y-1.5 text-center">
            <label className="text-[9px] font-black uppercase text-slate-400 px-1">Filtro de Dia da Semana</label>
            <Select value={dayOfWeekFilter} onValueChange={setDayOfWeekFilter}>
              <SelectTrigger className="h-10 text-[10px] font-bold border-slate-100 bg-slate-50 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">TODOS OS DIAS</SelectItem>
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => <SelectItem key={i} value={i.toString()}>{d.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-1 justify-end w-full xl:w-auto">
          <div className="flex flex-col gap-1 border-r border-slate-200 pr-4">
            <span className="text-[8px] font-black uppercase text-slate-400">Canais Extras</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge onClick={() => setIncludePickups(!includePickups)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includePickups ? "bg-sky-100 text-sky-700 hover:bg-sky-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}><Smartphone className="w-3 h-3 mr-1"/> Retiradas</Badge>
              <Badge onClick={() => setIncludeDelivery(!includeDelivery)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeDelivery ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}><Bike className="w-3 h-3 mr-1"/> Delivery</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-1 hidden lg:flex">
            <span className="text-[8px] font-black uppercase text-slate-400">Considerar Itens</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge onClick={() => setIncludeFigurinhas(!includeFigurinhas)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeFigurinhas ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Figurinhas</Badge>
              <Badge onClick={() => setIncludeAlbuns(!includeAlbuns)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeAlbuns ? "bg-sky-100 text-sky-700 hover:bg-sky-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Álbuns</Badge>
              <Badge onClick={() => setIncludeBaralhos(!includeBaralhos)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeBaralhos ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Baralhos</Badge>
              <Badge onClick={() => setIncludeSLP(!includeSLP)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeSLP ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>SLP</Badge>
              <Badge onClick={() => setIncludeSacolas(!includeSacolas)} className={cn("cursor-pointer font-black text-[9px] uppercase transition-colors shadow-none", includeSacolas ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-white text-slate-400 border-dashed border hover:bg-slate-100")}>Sacolas</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <QuickStat label="Venda" value={formatBRL(totals.venda)} icon={TrendingUp} color="text-orange-500" />
        <QuickStat label="Tickets" value={totals.cupons} icon={Calendar} color="text-sky-500" />
        <QuickStat label="TKM" value={formatBRL(totals.tkm)} icon={Target} color="text-purple-500" />
        <QuickStat label="P.A." value={formatNum(totals.pa)} icon={ArrowUpRight} color="text-pink-500" />
        <QuickStat label="Ident." value={`${formatNum(totals.identPerc, 1)}%`} icon={UserCheck} color="text-blue-500" />
        <QuickStat label="Peças" value={totals.itens.toFixed(0)} icon={BarChart3} color="text-emerald-500" />
      </div>

      <Card className="ri-card overflow-hidden shadow-md">
        <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
             <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Curva de {metricLabels[selectedMetric]}</CardTitle>
             <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricType)}>
               <SelectTrigger className="h-8 text-[10px] font-bold border-slate-200 w-32"><SelectValue /></SelectTrigger>
               <SelectContent>
                 {Object.entries(metricLabels).map(([val, label]) => <SelectItem key={val} value={val} className="text-[10px] font-bold">{label}</SelectItem>)}
               </SelectContent>
             </Select>
          </div>
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

      <Card className="ri-card overflow-hidden">
        <Table className="border border-slate-200">
          <TableHeader className="bg-slate-900">
            <TableRow className="hover:bg-slate-900 border-none h-11 divide-x divide-slate-700">
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle w-32 md:w-40 whitespace-nowrap">Período</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Venda</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Cupons</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Itens</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">PA</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Ticket Méd.</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Preço Méd.</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">CPF</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">SLP</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">BAR</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">SAC</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Retiradas</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Adicionais</TableHead>
              <TableHead className="text-white font-black uppercase text-[9px] text-center align-middle">Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performanceData.map((d, i) => {
              const isAboveVenda = d.venda > (totals.venda / performanceData.length);
              const isBelowVenda = d.venda < (totals.venda / performanceData.length);
              
              return (
                <TableRow 
                  key={d.label + i}
                  onClick={() => setSelectedDateRow(d)}
                  className="border-b border-slate-200 divide-x divide-slate-200 group cursor-pointer h-10 hover:bg-slate-50"
                >
                  <TableCell className="text-center align-middle">
                     <p className="font-black text-slate-800 uppercase leading-none text-[11px] md:text-xs">{d.label}</p>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={cn("font-black text-xs md:text-sm", isAboveVenda ? "text-emerald-700" : isBelowVenda ? "text-rose-600" : "text-slate-800")}>{formatBRL(d.venda)}</span>
                      {isAboveVenda ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : isBelowVenda ? <ArrowDownRight className="w-3 h-3 text-rose-500" /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-middle"><span className="font-black text-slate-700 text-xs md:text-sm">{d.cupons}</span></TableCell>
                  <TableCell className="text-center align-middle"><span className="font-black text-slate-700 text-xs md:text-sm">{d.itens.toFixed(0)}</span></TableCell>
                  <TableCell className="text-center align-middle"><span className="font-black text-slate-700 text-xs md:text-sm">{formatNum(d.pa)}</span></TableCell>
                  <TableCell className="text-center align-middle"><span className="font-black text-slate-700 text-xs md:text-sm">{formatBRL(d.tkm)}</span></TableCell>
                  <TableCell className="text-center align-middle"><span className="font-black text-slate-700 text-xs md:text-sm">{formatBRL(d.pm)}</span></TableCell>
                  <TableCell className="text-center align-middle"><span className="font-black text-slate-700 text-xs md:text-sm">{formatNum(d.identPerc, 0)}%</span></TableCell>
                  <TableCell className="text-center align-middle"><Badge className={cn("font-black border-none px-1.5 text-[10px] h-5", d.slpQty > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-300")}>{d.slpQty}</Badge></TableCell>
                  <TableCell className="text-center align-middle"><Badge className={cn("font-black border-none px-1.5 text-[10px] h-5", d.baralhoQty > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-50 text-slate-300")}>{d.baralhoQty}</Badge></TableCell>
                  <TableCell className="text-center align-middle"><Badge className={cn("font-black border-none px-1.5 text-[10px] h-5", d.sacolaQty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300")}>{d.sacolaQty}</Badge></TableCell>
                  <TableCell className="text-center align-middle"><Badge className={cn("font-black border-none px-1.5 text-[10px] h-5", d.pickups > 0 ? "bg-sky-100 text-sky-700" : "bg-slate-50 text-slate-300")}>{d.pickups}</Badge></TableCell>
                  <TableCell className="text-center align-middle"><Badge className={cn("font-black border-none px-1.5 text-[10px] h-5", d.adicionais > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-300")}>{d.adicionais}</Badge></TableCell>
                  <TableCell className="text-center align-middle"><Badge className={cn("font-black border-none px-1.5 text-[10px] h-5", d.conv >= (totals.conv || 0) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{formatNum(d.conv, 1)}%</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-slate-900">
            <TableRow className="hover:bg-slate-900 border-none h-12 font-black divide-x divide-slate-700">
              <TableCell className="text-center align-middle text-white uppercase text-[11px] md:text-xs whitespace-nowrap">Consolidado ({performanceData.length})</TableCell>
              <TableCell className="text-center align-middle text-emerald-400 text-xs md:text-sm">{formatBRL(totals.venda)}</TableCell>
              <TableCell className="text-center align-middle text-sky-400 text-xs md:text-sm">{totals.cupons}</TableCell>
              <TableCell className="text-center align-middle text-white text-xs md:text-sm">{totals.itens.toFixed(0)}</TableCell>
              <TableCell className="text-center align-middle text-orange-400 text-xs md:text-sm">{formatNum(totals.pa)}</TableCell>
              <TableCell className="text-center align-middle text-purple-400 text-xs md:text-sm">{formatBRL(totals.tkm)}</TableCell>
              <TableCell className="text-center align-middle text-white text-xs md:text-sm">{formatBRL(totals.pm)}</TableCell>
              <TableCell className="text-center align-middle text-white text-xs md:text-sm">{totals.identPerc.toFixed(0)}%</TableCell>
              <TableCell className="text-center align-middle text-orange-400 text-[10px] md:text-xs">{totals.slp}</TableCell>
              <TableCell className="text-center align-middle text-rose-400 text-[10px] md:text-xs">{totals.baralhos}</TableCell>
              <TableCell className="text-center align-middle text-emerald-400 text-[10px] md:text-xs">{totals.sacolas}</TableCell>
              <TableCell className="text-center align-middle text-sky-400 text-[10px] md:text-xs">{totals.pickups}</TableCell>
              <TableCell className="text-center align-middle text-emerald-400 text-[10px] md:text-xs">{totals.adicionais}</TableCell>
              <TableCell className="text-center align-middle text-amber-400 text-[10px] md:text-xs">{formatNum(totals.conv, 1)}%</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>

      <Sheet open={!!selectedDateRow} onOpenChange={(open) => !open && setSelectedDateRow(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-slate-50 p-0 overflow-y-auto border-l-4 border-indigo-500">
          {selectedDateRow && (
            <div className="h-full flex flex-col">
              <div className="bg-slate-900 p-6 md:p-8 border-b-4 border-indigo-500">
                <SheetTitle className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none">{selectedDateRow.label}</SheetTitle>
                <SheetDescription className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] mt-2">Visão Detalhada de Equipe</SheetDescription>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Venda</p>
                    <p className="text-base font-black text-emerald-600">{formatBRL(selectedDateRow.venda)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tickets</p>
                    <p className="text-base font-black text-sky-600">{selectedDateRow.cupons}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">TKM</p>
                    <p className="text-base font-black text-purple-600">{formatBRL(selectedDateRow.tkm)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">P.A.</p>
                    <p className="text-base font-black text-orange-600">{formatNum(selectedDateRow.pa)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow className="h-10 hover:bg-slate-100">
                        <TableHead className="text-[9px] font-black text-slate-500 uppercase">Vendedor</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-500 uppercase text-right">Venda</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-500 uppercase text-center">PA</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-500 uppercase text-center">TKM</TableHead>
                        <TableHead className="text-[9px] font-black text-slate-500 uppercase text-center">SLP/SAC/BAR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDateRow.vendors.map((v: VendorAggregate) => (
                        <TableRow key={v.name} className="h-10">
                          <TableCell className="text-[10px] font-black text-slate-800 uppercase">{v.name}</TableCell>
                          <TableCell className="text-[11px] font-bold text-slate-700 text-right">{formatBRL(v.venda)}</TableCell>
                          <TableCell className="text-[11px] font-bold text-orange-600 text-center">{formatNum(v.pa)}</TableCell>
                          <TableCell className="text-[11px] font-bold text-purple-600 text-center">{formatBRL(v.tkm)}</TableCell>
                          <TableCell className="text-[10px] font-bold text-slate-500 text-center">
                            {v.slpQty} / {v.sacolaQty} / {v.baralhoQty}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function QuickStat({ label, value, icon: Icon, color }: QuickStatProps) {
  return (
    <Card className="ri-card p-4 flex flex-col items-center justify-center text-center gap-3 shadow-sm min-h-[100px]">
      <div className={cn("p-2 rounded-lg bg-slate-50", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
          {label}
        </p>
        <p className="text-sm font-black text-slate-800 truncate leading-none">
          {value}
        </p>
      </div>
    </Card>
  );
}
