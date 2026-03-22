
"use client";

import React, { useMemo } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Egg, 
  Gift, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShoppingBag,
  TrendingUp,
  User,
  Package,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface EasterPanelProps {
  data: DetailedSaleRow[];
}

const CHOCOLATE_CODES = ['5147482', '5142574'];
const GIFT_CODES = [
  '5147476', '5147477', '5147459', '5147452', '5147478', '5147480', 
  '5147454', '5147456', '5147460', '5147461', '5147463', '5147465', 
  '5147466', '5147467', '5147470', '5147471', '5147473', '5147475'
];

export function EasterPanel({ data }: EasterPanelProps) {
  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    
    // Análise de Kits
    let totalKits = 0;
    let separateGifts: any[] = [];
    let separateChocolates: any[] = [];
    const vendorKits: Record<string, { kits: number, giftsOnly: number, chocolateOnly: number }> = {};

    activeSales.forEach(sale => {
      const v = sale.vendedor || "OUTROS";
      if (!vendorKits[v]) vendorKits[v] = { kits: 0, giftsOnly: 0, chocolateOnly: 0 };

      const items = sale.itens;
      const chocoItems = items.filter(it => CHOCOLATE_CODES.includes(it.cProd));
      const giftItems = items.filter(it => GIFT_CODES.includes(it.cProd));

      const chocoQty = chocoItems.reduce((acc, it) => acc + it.qCom, 0);
      const giftQty = giftItems.reduce((acc, it) => acc + it.qCom, 0);

      const kitsInSale = Math.min(chocoQty, giftQty);
      totalKits += kitsInSale;
      vendorKits[v].kits += kitsInSale;

      const extrasGifts = giftQty - kitsInSale;
      const extrasChoco = chocoQty - kitsInSale;

      if (extrasGifts > 0) {
        vendorKits[v].giftsOnly += extrasGifts;
        separateGifts.push({
          nf: sale.nf,
          vendedor: v,
          data: sale.dhEmi,
          itens: giftItems.map(it => it.xProd).join(", "),
          qtd: extrasGifts
        });
      }

      if (extrasChoco > 0) {
        vendorKits[v].chocolateOnly += extrasChoco;
        separateChocolates.push({
          nf: sale.nf,
          vendedor: v,
          data: sale.dhEmi,
          itens: chocoItems.map(it => it.xProd).join(", "),
          qtd: extrasChoco
        });
      }
    });

    const topVendors = Object.entries(vendorKits)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.kits - a.kits);

    return {
      totalKits,
      separateGifts,
      separateChocolates,
      topVendors,
      totalGifts: separateGifts.reduce((acc, s) => acc + s.qtd, 0) + totalKits,
      totalChoco: separateChocolates.reduce((acc, s) => acc + s.qtd, 0) + totalKits
    };
  }, [data]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-indigo-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-2xl text-white shadow-lg shadow-orange-100">
            <Egg className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Monitor de Kits de Páscoa</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acompanhamento de Vendas Chocolate + Brinde</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total de Kits</p>
            <p className="text-2xl font-black text-orange-600 leading-none">{stats.totalKits}</p>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Conversão Kit</p>
            <p className="text-2xl font-black text-emerald-600 leading-none">
              {stats.totalGifts > 0 ? ((stats.totalKits / stats.totalGifts) * 100).toFixed(1) : "0"}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métricas Principais */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="ri-card border-none bg-orange-600 text-white p-6 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">Composição de Páscoa</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase opacity-60">Chocolate Vendido</p>
                  <p className="text-3xl font-black tracking-tighter">{stats.totalChoco}</p>
                </div>
                <Egg className="w-10 h-10 opacity-20" />
              </div>
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase opacity-60">Brindes Vendidos</p>
                  <p className="text-3xl font-black tracking-tighter">{stats.totalGifts}</p>
                </div>
                <Gift className="w-10 h-10 opacity-20" />
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Meta de Combinação: 100%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${stats.totalGifts > 0 ? (stats.totalKits / stats.totalGifts) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="ri-card border-slate-100">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ranking por Vendedor (Kits)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {stats.topVendors.slice(0, 10).map((v, i) => (
                  <div key={v.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                        {i + 1}
                      </div>
                      <span className="text-[11px] font-black text-slate-700 uppercase">{v.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[11px] font-black text-orange-600 leading-none">{v.kits} Kits</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">{(v.kits * 2)} Itens</p>
                      </div>
                      {v.giftsOnly > 0 && (
                        <Badge variant="outline" className="text-[8px] bg-rose-50 text-rose-600 border-rose-100 font-black">
                          {v.giftsOnly} ERR
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas e Listagem */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="ri-card border-rose-100 flex flex-col h-full bg-white shadow-sm overflow-hidden">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black uppercase text-rose-900 tracking-tight">Alertas de Brindes Separados</h3>
              </div>
              <Badge className="bg-rose-600 text-white font-black border-none uppercase text-[10px] px-3 py-1">
                {stats.separateGifts.length} Casos Detectados
              </Badge>
            </div>
            <CardContent className="p-0 flex-1 overflow-auto max-h-[600px]">
              {stats.separateGifts.length === 0 ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase tracking-tight">Operação Perfeita</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Nenhum brinde foi vendido sem chocolate associado.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.separateGifts.map((alert, i) => (
                    <div key={`${alert.nf}-${i}`} className="p-4 hover:bg-rose-50/30 transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] font-black text-slate-800">NF: {alert.nf}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(alert.data), "dd/MM HH:mm")}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                          {alert.itens}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase">{alert.vendedor}</span>
                          </div>
                          <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[9px] uppercase">
                            Qtd: {alert.qtd}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chocolates sem brinde */}
          <Card className="ri-card border-orange-100 flex flex-col bg-white shadow-sm overflow-hidden">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center gap-3">
              <Egg className="w-4 h-4 text-orange-600" />
              <h3 className="text-xs font-black uppercase text-orange-900 tracking-tight">Chocolates Vendidos sem Brinde (Oportunidade)</h3>
            </div>
            <CardContent className="p-0 overflow-auto max-h-[300px]">
              <div className="divide-y divide-slate-100">
                {stats.separateChocolates.map((item, i) => (
                  <div key={`${item.nf}-${i}`} className="p-4 flex items-center justify-between hover:bg-orange-50/20 transition-colors">
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none">NF: {item.nf} • {item.vendedor}</p>
                      <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase">{item.itens}</p>
                    </div>
                    <Badge variant="outline" className="font-black text-[9px] border-orange-200 text-orange-600 uppercase">
                      {item.qtd} UN
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
