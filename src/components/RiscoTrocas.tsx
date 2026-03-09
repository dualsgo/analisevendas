"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, ArrowDownCircle, PackageSearch, TrendingUp } from "lucide-react";
import { DetailedSaleRow } from "@/lib/types";

export function RiscoTrocas({ data }: { data: DetailedSaleRow[] }) {
  const skuRisk = useMemo(() => {
    const salesBySku: Record<string, { name: string; sold: number; returned: number }> = {};

    data.forEach(sale => {
      const isReturn = sale.tpNF === 0 || sale.is_devolucao;
      
      sale.itens.forEach(item => {
        const sku = item.cProd;
        if (!salesBySku[sku]) {
          salesBySku[sku] = { name: item.xProd, sold: 0, returned: 0 };
        }
        
        if (isReturn) {
          salesBySku[sku].returned += item.qCom;
        } else {
          salesBySku[sku].sold += item.qCom;
        }
      });
    });

    return Object.entries(salesBySku)
      .map(([sku, stats]) => {
        const total = stats.sold + stats.returned;
        const rate = stats.sold > 0 ? (stats.returned / stats.sold) * 100 : 0;
        return {
          sku,
          ...stats,
          rate,
          impact: stats.returned // Volume total de "sangria"
        };
      })
      .filter(item => item.returned > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 15);
  }, [data]);

  if (skuRisk.length === 0) return (
    <div className="p-8 text-center text-slate-500 italic border-2 border-dashed rounded-xl">
      Nenhuma devolução detectada nos XMLs processados.
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Mapa de Risco de Trocas
          </h2>
          <p className="text-xs text-slate-500 font-medium">Identificação de SKUs com alto índice de devolução (Sangria).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {skuRisk.map((item, idx) => (
          <Card key={idx} className={cn(
            "ri-card border-l-4 transition-all hover:bg-slate-50",
            item.rate > 20 ? "border-l-rose-500" : item.rate > 10 ? "border-l-amber-500" : "border-l-slate-300"
          )}>
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "p-3 rounded-xl shrink-0",
                    item.rate > 20 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                  )}>
                    <PackageSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">SKU: {item.sku}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 md:flex items-center gap-4 md:gap-8 w-full md:w-auto">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1 text-center">Vendido</p>
                    <p className="text-sm font-black text-slate-600">{item.sold.toFixed(0)}</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-rose-400 uppercase leading-none mb-1 text-center">Devolvido</p>
                    <p className="text-sm font-black text-rose-600">{item.returned.toFixed(0)}</p>
                  </div>
                  <div className="text-center md:text-right min-w-[80px]">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1 text-center">Taxa Risco</p>
                    <div className="flex items-center justify-center md:justify-end gap-1">
                      <p className={cn(
                        "text-lg font-black leading-none",
                        item.rate > 20 ? "text-rose-600" : item.rate > 10 ? "text-amber-600" : "text-slate-600"
                      )}>
                        {item.rate.toFixed(1)}%
                      </p>
                      {item.rate > 20 && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-rose-100 bg-rose-50/20">
        <CardContent className="p-4 flex gap-4 items-start">
          <ArrowDownCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-rose-700 uppercase">Diagnóstico de Lote</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              SKUs com taxa de devolução acima de <strong>15%</strong> podem indicar problemas de <strong>qualidade (lote defeituoso)</strong> ou expectativa errada na venda. 
              Considere a retenção preventiva do estoque físico destes itens para inspeção técnica imediata.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
