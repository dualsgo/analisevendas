"use client";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, Info, Link2, ShoppingCart, Zap } from "lucide-react";
import { DetailedSaleRow } from "@/lib/types";

export function MatrizAfinidade({ data }: { data: DetailedSaleRow[] }) {
  const affinitiesResult = useMemo(() => {
    const saidas = data.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada);
    const coOccurrences: Record<string, { count: number; prodA: string; prodB: string; totalA: number }> = {};
    const productFrequency: Record<string, number> = {};

    // 1. Contar frequência individual de cada produto
    saidas.forEach(sale => {
      const uniqueProdsInSale = new Set(sale.itens.map(i => i.xProd));
      uniqueProdsInSale.forEach(p => {
        productFrequency[p] = (productFrequency[p] || 0) + 1;
      });
    });

    // 2. Contar co-ocorrências
    saidas.forEach(sale => {
      const prods = Array.from(new Set(sale.itens.map(i => i.xProd)));
      if (prods.length < 2) return;

      for (let i = 0; i < prods.length; i++) {
        for (let j = i + 1; j < prods.length; j++) {
          const pair = [prods[i], prods[j]].sort().join(" + ");
          if (!coOccurrences[pair]) {
            coOccurrences[pair] = { 
              count: 0, 
              prodA: prods[i], 
              prodB: prods[j],
              totalA: 0 // Será preenchido depois
            };
          }
          coOccurrences[pair].count++;
        }
      }
    });

    // 3. Calcular Score de Afinidade (Confiança)
    const dates = saidas.map(r => r.dhEmi.split('T')[0]);
    const isSingleDay = new Set(dates).size <= 1;

    const affinitiesData = Object.values(coOccurrences)
      .map(pair => {
        const freqA = productFrequency[pair.prodA] || 1;
        const freqB = productFrequency[pair.prodB] || 1;
        
        // Usamos a maior frequência como base para o score de afinidade principal
        const score = (pair.count / Math.min(freqA, freqB)) * 100;

        return {
          ...pair,
          score,
          freqA,
          freqB
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12); // Top 12 afinidades

    return {
      affinities: affinitiesData,
      isSingleDay
    };
  }, [data]);

  const { affinities, isSingleDay } = affinitiesResult;

  if (affinities.length === 0) return (
    <div className="p-8 text-center text-slate-500 italic border-2 border-dashed rounded-xl">
      Aguardando dados de vendas com mais de um item por cupom para calcular afinidades...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            Matriz de Afinidade
          </h2>
          <p className="text-xs text-slate-500 font-medium">Produtos que "andam juntos" nas cestas dos clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSingleDay && (
            <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 border border-amber-100">
              <Zap className="w-3 h-3" />
              Hoje
            </div>
          )}
          <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 border border-indigo-100">
            <Info className="w-3 h-3" />
            Market Basket Analysis
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {affinities.map((pair: any, idx: number) => (
          <Card key={idx} className="ri-card group hover:border-indigo-300 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
               <Link2 className="w-12 h-12 text-indigo-600" />
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <ShoppingCart className="w-2.5 h-2.5" />
                      Combinação Frequente
                    </p>
                    <div className="text-sm font-bold text-slate-700 leading-tight">
                      <p className="line-clamp-1">{pair.prodA}</p>
                      <p className="text-indigo-500 text-[10px] my-0.5">&</p>
                      <p className="line-clamp-1">{pair.prodB}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600 leading-none">{pair.count}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Cestas</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Índice de Afinidade</span>
                  <span className="text-xs font-black text-emerald-600">{pair.score.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(pair.score, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 leading-tight italic">
                  Em {pair.score.toFixed(0)}% das vezes que um desses itens é vendido, o outro o acompanha.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 text-white overflow-hidden border-none shadow-xl">
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <Link2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-tight">Oportunidade Tática</h4>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mt-1">
                Utilize as combinações acima para criar <strong>ilhas promocionais</strong> ou <strong>pontas de gôndola</strong> experimentais. 
                Se dois produtos têm alta afinidade mas estão em corredores opostos, aproximá-los fisicamente costuma elevar o faturamento sem depender de descontos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
