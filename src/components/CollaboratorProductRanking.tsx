
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, Item } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  Search, 
  ShoppingCart, 
  Users, 
  Filter, 
  Calendar,
  Layers,
  TrendingUp,
  Package,
  X,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CollaboratorProductRankingProps {
  data: DetailedSaleRow[];
}

export function CollaboratorProductRanking({ data }: CollaboratorProductRankingProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([]);

  // Extrair todos os itens únicos disponíveis nos dados para sugestão/busca
  const allUniqueItems = useMemo(() => {
    const itemsMap = new Map<string, { cProd: string, xProd: string }>();
    data.forEach(sale => {
      sale.itens?.forEach(item => {
        if (item.cProd && !itemsMap.has(item.cProd)) {
          itemsMap.set(item.cProd, { cProd: item.cProd, xProd: item.xProd });
        }
      });
    });
    return Array.from(itemsMap.values()).sort((a, b) => a.xProd.localeCompare(b.xProd));
  }, [data]);

  // Sugestões baseadas no termo de busca
  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allUniqueItems.filter(item => 
      item.cProd.toLowerCase().includes(term) || 
      item.xProd.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [allUniqueItems, searchTerm]);

  const toggleProduct = (code: string) => {
    setSelectedProductCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const clearSelection = () => {
    setSelectedProductCodes([]);
    setSearchTerm("");
  };

  // Ranking de colaboradores baseado nos produtos selecionados
  const ranking = useMemo(() => {
    if (selectedProductCodes.length === 0) return [];

    const vendors: Record<string, { 
      name: string, 
      matchedQuantity: number, 
      matchedValue: number, 
      matchedCoupons: number,
      totalCouponsVendedor: number
    }> = {};

    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    activeSales.forEach(sale => {
      const v = sale.vendedor || "OUTROS";
      if (!vendors[v]) vendors[v] = { 
        name: v, 
        matchedQuantity: 0, 
        matchedValue: 0, 
        matchedCoupons: 0,
        totalCouponsVendedor: 0
      };

      vendors[v].totalCouponsVendedor++;

      let hasMatchedItem = false;
      sale.itens?.forEach(item => {
        if (selectedProductCodes.includes(item.cProd)) {
          vendors[v].matchedQuantity += item.qCom || 0;
          vendors[v].matchedValue += item.vProd || 0;
          hasMatchedItem = true;
        }
      });

      if (hasMatchedItem) {
        vendors[v].matchedCoupons++;
      }
    });

    return Object.values(vendors)
      .filter(v => v.matchedQuantity > 0)
      .sort((a, b) => b.matchedQuantity - a.matchedQuantity);
  }, [data, selectedProductCodes]);

  const maxQuantity = ranking[0]?.matchedQuantity || 1;

  const formatBRL = (v: number) => 
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-violet-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[120px] -mr-32 -mt-32" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">Ranking por Produto</h2>
              <p className="text-indigo-100 font-medium text-sm mt-1">
                Acompanhe o desempenho sazonal por código ou grupos de itens.
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto md:mx-0">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-indigo-300 group-focus-within:text-white transition-colors" />
              </div>
              <Input
                type="text"
                placeholder="Pesquise por Código ou Nome do Produto..."
                className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-indigo-200 rounded-2xl focus:bg-white/20 focus:border-white/40 transition-all text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2">
                  {suggestions.map((item) => (
                    <button
                      key={item.cProd}
                      onClick={() => {
                        toggleProduct(item.cProd);
                        setSearchTerm("");
                      }}
                      className="w-full px-5 py-4 text-left hover:bg-slate-50 flex items-center justify-between group border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{item.cProd}</p>
                        <p className="text-sm font-bold text-slate-700">{item.xProd}</p>
                      </div>
                      <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {selectedProductCodes.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer px-3 py-1.5 rounded-xl gap-2 transition-colors"
                  onClick={clearSelection}
                >
                  <X className="w-3 h-3" /> Limpar Seleção
                </Badge>
                {selectedProductCodes.map(code => {
                  const item = allUniqueItems.find(i => i.cProd === code);
                  return (
                    <Badge 
                      key={code} 
                      className="bg-indigo-500 text-white px-3 py-1.5 rounded-xl gap-2 shadow-lg shadow-indigo-900/20"
                    >
                      <span className="font-black text-[10px]">{code}</span>
                      <span className="font-medium text-xs opacity-90">{item?.xProd}</span>
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-200 transition-colors" 
                        onClick={() => toggleProduct(code)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {ranking.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 mb-4 px-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Desempenho por Colaborador
            </h3>
            
            {ranking.map((v, i) => (
              <Card key={v.name} className="ri-card border-none shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-5 flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-sm",
                    i === 0 ? "bg-amber-400 text-white" : 
                    i === 1 ? "bg-slate-300 text-white" : 
                    i === 2 ? "bg-orange-400 text-white" : 
                    "bg-slate-100 text-slate-400"
                  )}>
                    {i + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-sm font-black text-slate-700 uppercase truncate">{v.name}</p>
                      <div className="text-right">
                        <span className="text-xs font-black text-indigo-600">{v.matchedQuantity} Pçs</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {formatBRL(v.matchedValue)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            i === 0 ? "bg-amber-400" : 
                            i === 1 ? "bg-slate-300" : 
                            i === 2 ? "bg-orange-400" : 
                            "bg-indigo-500"
                          )}
                          style={{ width: `${(v.matchedQuantity / maxQuantity) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Frequência: {((v.matchedCoupons / v.totalCouponsVendedor) * 100).toFixed(1)}% dos cupons</span>
                        <span>{v.matchedCoupons} Atendimentos</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 mb-4 px-2">
              <Layers className="w-4 h-4 text-violet-500" /> Resumo da Seleção
            </h3>
            
            <Card className="ri-card border-none shadow-sm bg-white overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Vendido (Seleção)</p>
                <p className="text-3xl font-black text-slate-800 tracking-tighter">
                  {ranking.reduce((acc, v) => acc + v.matchedQuantity, 0)} <span className="text-sm font-bold text-slate-400 uppercase">Peças</span>
                </p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento</p>
                      <p className="text-lg font-black text-slate-700">{formatBRL(ranking.reduce((acc, v) => acc + v.matchedValue, 0))}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engajamento</p>
                      <p className="text-lg font-black text-slate-700">{ranking.length} <span className="text-xs text-slate-400 uppercase">Colab.</span></p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-4">Itens Selecionados</p>
                  <div className="space-y-3">
                    {selectedProductCodes.map(code => {
                      const item = allUniqueItems.find(i => i.cProd === code);
                      const totalQty = ranking.reduce((acc, v) => {
                        // Recalcular apenas para este item específico se necessário, ou usar o valor já disponível
                        // Para simplificar, vamos apenas listar os selecionados
                        return acc;
                      }, 0);
                      
                      return (
                        <div key={code} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{item?.xProd}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{code}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <h4 className="text-sm font-black uppercase italic tracking-tight mb-2">Dica Estratégica</h4>
                <p className="text-[11px] font-medium text-indigo-100 leading-relaxed">
                  Utilize esta visão para identificar quem são os especialistas em converter produtos específicos de campanhas sazonais.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="ri-card border-dashed border-2 border-slate-200 bg-slate-50/50 py-24">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <Filter className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Nenhum produto selecionado</p>
              <p className="text-xs text-slate-400 font-medium max-w-[240px]">
                Pesquise e selecione os produtos acima para visualizar o ranking dinâmico de colaboradores.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
