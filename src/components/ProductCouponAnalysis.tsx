"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  ShoppingBag, 
  Search, 
  Flame, 
  Layers, 
  TrendingDown, 
  Target, 
  Boxes, 
  Users, 
  X, 
  DollarSign, 
  Sparkles,
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCouponAnalysisProps {
  data: DetailedSaleRow[];
}

export type Archetype = "ALL" | "BASKET_DRIVER" | "SINGLE_ANCHOR" | "COMPANION" | "LOW_TRACTION";

export interface ProductMetric {
  cProd: string;
  xProd: string;
  totalRevenue: number;
  totalQty: number;
  totalCoupons: number;
  unitCoupons: number; // cupons com 1 item
  multiCoupons: number; // cupons com 2+ itens
  unitRate: number; // % cupons unitários
  multiRate: number; // % cupons múltiplos
  avgBasketValue: number; // ticket médio das vendas com este produto
  avgPA: number; // PA médio dos cupons com este produto
  archetype: Archetype;
  companionMap: Record<string, { xProd: string; count: number }>;
  sellerMap: Record<string, { name: string; unitCount: number; multiCount: number; totalQty: number }>;
  channelMap: Record<string, { unit: number; multi: number }>;
}

export function ProductCouponAnalysis({ data }: ProductCouponAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>("ALL");
  const [selectedChannel, setSelectedChannel] = useState<"ALL" | "LOJA_FISICA" | "RETIRADA_ONLINE" | "DELIVERY">("ALL");
  const [sortBy, setSortBy] = useState<"revenue" | "qty" | "unitRate" | "multiRate" | "coupons">("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedProduct, setSelectedProduct] = useState<ProductMetric | null>(null);

  // Parse search term into individual tokens (for multi-code search)
  const searchTokens = useMemo(() => {
    if (!searchTerm.trim()) return [];
    // Split by comma, space, semicolon or newline
    return searchTerm
      .split(/[\s,;\n]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
  }, [searchTerm]);

  // Aggregate stats per product
  const productsAnalysis = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1 && !s.is_devolucao && s.itens?.length > 0);
    
    // Filter by channel if selected
    const filteredSales = selectedChannel === "ALL" 
      ? activeSales 
      : activeSales.filter(s => {
          if (selectedChannel === "LOJA_FISICA") return s.canal === "LOJA_FISICA" && !s.is_troca;
          if (selectedChannel === "RETIRADA_ONLINE") return s.canal === "RETIRADA_ONLINE";
          if (selectedChannel === "DELIVERY") return s.canal === "DELIVERY";
          return true;
        });

    const productMap: Record<string, {
      cProd: string;
      xProd: string;
      totalRevenue: number;
      totalQty: number;
      coupons: Set<string>;
      unitCoupons: number;
      multiCoupons: number;
      sumBasketValue: number;
      sumPA: number;
      companionMap: Record<string, { xProd: string; count: number }>;
      sellerMap: Record<string, { name: string; unitCount: number; multiCount: number; totalQty: number }>;
      channelMap: Record<string, { unit: number; multi: number }>;
    }> = {};

    filteredSales.forEach(sale => {
      const itemsCount = sale.itens.length;
      const isUnitary = itemsCount === 1;
      const basketValue = parseFloat(sale.vNF) || 0;
      const pa = parseFloat(sale.itens_qtd) || itemsCount;
      const sellerName = sale.vendedor || "NÃO IDENTIFICADO";
      const channelName = sale.canal || "LOJA_FISICA";

      sale.itens.forEach(item => {
        const code = (item.cProd || "OUTROS").trim();
        const name = (item.xProd || "PRODUTO SEM NOME").trim();

        if (!productMap[code]) {
          productMap[code] = {
            cProd: code,
            xProd: name,
            totalRevenue: 0,
            totalQty: 0,
            coupons: new Set(),
            unitCoupons: 0,
            multiCoupons: 0,
            sumBasketValue: 0,
            sumPA: 0,
            companionMap: {},
            sellerMap: {},
            channelMap: {}
          };
        }

        const p = productMap[code];
        p.totalRevenue += item.vProd || 0;
        p.totalQty += item.qCom || 1;
        p.coupons.add(sale.chave);
        p.sumBasketValue += basketValue;
        p.sumPA += pa;

        if (isUnitary) {
          p.unitCoupons++;
        } else {
          p.multiCoupons++;
        }

        // Track companion items in multi-item coupons
        if (!isUnitary) {
          sale.itens.forEach(otherItem => {
            const otherCode = (otherItem.cProd || "").trim();
            if (otherCode && otherCode !== code) {
              if (!p.companionMap[otherCode]) {
                p.companionMap[otherCode] = { xProd: otherItem.xProd, count: 0 };
              }
              p.companionMap[otherCode].count += otherItem.qCom || 1;
            }
          });
        }

        // Track seller performance
        if (!p.sellerMap[sellerName]) {
          p.sellerMap[sellerName] = { name: sellerName, unitCount: 0, multiCount: 0, totalQty: 0 };
        }
        p.sellerMap[sellerName].totalQty += item.qCom || 1;
        if (isUnitary) p.sellerMap[sellerName].unitCount++;
        else p.sellerMap[sellerName].multiCount++;

        // Track channel breakdown
        if (!p.channelMap[channelName]) {
          p.channelMap[channelName] = { unit: 0, multi: 0 };
        }
        if (isUnitary) p.channelMap[channelName].unit++;
        else p.channelMap[channelName].multi++;
      });
    });

    // Calculate archetype and final rates
    const list: ProductMetric[] = Object.values(productMap).map(p => {
      const totalCoupons = p.unitCoupons + p.multiCoupons;
      const unitRate = totalCoupons > 0 ? (p.unitCoupons / totalCoupons) * 100 : 0;
      const multiRate = totalCoupons > 0 ? (p.multiCoupons / totalCoupons) * 100 : 0;
      const avgBasketValue = totalCoupons > 0 ? p.sumBasketValue / totalCoupons : 0;
      const avgPA = totalCoupons > 0 ? p.sumPA / totalCoupons : 0;

      // Classify Archetype
      let archetype: Archetype = "LOW_TRACTION";
      if (totalCoupons >= 5) {
        if (multiRate >= 65 && p.totalQty >= 10) {
          archetype = "BASKET_DRIVER"; // Gerador de Cesta
        } else if (unitRate >= 50 && p.totalQty >= 8) {
          archetype = "SINGLE_ANCHOR"; // Âncora Isolada
        } else if (multiRate >= 75 && p.totalQty < 10) {
          archetype = "COMPANION"; // Item Acompanhante
        }
      }

      return {
        cProd: p.cProd,
        xProd: p.xProd,
        totalRevenue: p.totalRevenue,
        totalQty: p.totalQty,
        totalCoupons,
        unitCoupons: p.unitCoupons,
        multiCoupons: p.multiCoupons,
        unitRate,
        multiRate,
        avgBasketValue,
        avgPA,
        archetype,
        companionMap: p.companionMap,
        sellerMap: p.sellerMap,
        channelMap: p.channelMap
      };
    });

    return list;
  }, [data, selectedChannel]);

  // Executive KPI summary calculations
  const globalSummary = useMemo(() => {
    const totalSKUs = productsAnalysis.length;
    if (totalSKUs === 0) {
      return {
        totalSKUs: 0,
        avgUnitRate: 0,
        topBasketDriver: null,
        topSingleAnchor: null,
        potentialRevenue: 0
      };
    }

    const sumUnitRate = productsAnalysis.reduce((acc, p) => acc + p.unitRate, 0);
    const avgUnitRate = sumUnitRate / totalSKUs;

    // Top Basket Driver (most multi-item coupons)
    const sortedBasket = [...productsAnalysis]
      .filter(p => p.totalCoupons >= 3)
      .sort((a, b) => b.multiCoupons - a.multiCoupons);
    const topBasketDriver = sortedBasket[0] || null;

    // Top Single Anchor (most solo sales)
    const sortedSolo = [...productsAnalysis]
      .filter(p => p.totalCoupons >= 3)
      .sort((a, b) => b.unitCoupons - a.unitCoupons);
    const topSingleAnchor = sortedSolo[0] || null;

    // Estimate cross-sell potential: if 15% of solo coupons of single anchors convert into 2-item baskets with avg item price (~R$ 45)
    const soloAnchors = productsAnalysis.filter(p => p.unitRate >= 50);
    const totalSoloCouponsInAnchors = soloAnchors.reduce((acc, p) => acc + p.unitCoupons, 0);
    const avgTicket = productsAnalysis.reduce((acc, p) => acc + (p.totalRevenue / (p.totalQty || 1)), 0) / (totalSKUs || 1);
    const potentialRevenue = totalSoloCouponsInAnchors * 0.15 * (avgTicket * 0.4);

    return {
      totalSKUs,
      avgUnitRate,
      topBasketDriver,
      topSingleAnchor,
      potentialRevenue
    };
  }, [productsAnalysis]);

  // Counts per archetype for filter tabs
  const archetypeCounts = useMemo(() => {
    return {
      ALL: productsAnalysis.length,
      BASKET_DRIVER: productsAnalysis.filter(p => p.archetype === "BASKET_DRIVER").length,
      SINGLE_ANCHOR: productsAnalysis.filter(p => p.archetype === "SINGLE_ANCHOR").length,
      COMPANION: productsAnalysis.filter(p => p.archetype === "COMPANION").length,
      LOW_TRACTION: productsAnalysis.filter(p => p.archetype === "LOW_TRACTION").length,
    };
  }, [productsAnalysis]);

  // Filtered & Sorted products for table display
  const filteredProducts = useMemo(() => {
    return productsAnalysis.filter(p => {
      // Archetype filter
      if (selectedArchetype !== "ALL" && p.archetype !== selectedArchetype) {
        return false;
      }

      // Multi-code & Text search logic
      if (searchTokens.length > 0) {
        const codeLower = p.cProd.toLowerCase();
        const nameLower = p.xProd.toLowerCase();

        // Check if ANY token matches the product code exactly or partially, OR matches product name
        const matchesToken = searchTokens.some(token => {
          return codeLower.includes(token) || nameLower.includes(token);
        });

        if (!matchesToken) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "revenue") { valA = a.totalRevenue; valB = b.totalRevenue; }
      else if (sortBy === "qty") { valA = a.totalQty; valB = b.totalQty; }
      else if (sortBy === "unitRate") { valA = a.unitRate; valB = b.unitRate; }
      else if (sortBy === "multiRate") { valA = a.multiRate; valB = b.multiRate; }
      else if (sortBy === "coupons") { valA = a.totalCoupons; valB = b.totalCoupons; }

      return sortOrder === "desc" ? valB - valA : valA - valB;
    });
  }, [productsAnalysis, selectedArchetype, searchTokens, sortBy, sortOrder]);

  const fmtBRL = (val?: number | string | null) => (Number(val) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getArchetypeBadge = (arch: Archetype) => {
    switch(arch) {
      case "BASKET_DRIVER":
        return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 font-bold text-[9px] uppercase">🟢 Gerador de Cesta</Badge>;
      case "SINGLE_ANCHOR":
        return <Badge className="bg-rose-500/10 text-rose-700 border-rose-200 font-bold text-[9px] uppercase">🔴 Âncora Isolada</Badge>;
      case "COMPANION":
        return <Badge className="bg-sky-500/10 text-sky-700 border-sky-200 font-bold text-[9px] uppercase">🔵 Acompanhante</Badge>;
      case "LOW_TRACTION":
      default:
        return <Badge className="bg-slate-100 text-slate-500 border-slate-200 font-bold text-[9px] uppercase">⚪ Baixa Tração</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-950 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl border border-indigo-800/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Inteligência de Mix & Cesta
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight uppercase leading-none">
              Análise de Produto: Cupons Solo vs. Múltiplos
            </h2>
            <p className="text-slate-300 font-medium text-xs md:text-sm leading-relaxed">
              Mapeie como cada item se comporta nas vendas — identificando produtos que vendem isolados (falha de venda casada) e produtos que alavancam a cesta de compras.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <p className="text-[9px] font-black uppercase text-indigo-200 tracking-wider">SKUs Analisados</p>
              <p className="text-xl md:text-2xl font-black">{globalSummary.totalSKUs}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <p className="text-[9px] font-black uppercase text-rose-200 tracking-wider">Taxa Solo Média</p>
              <p className="text-xl md:text-2xl font-black text-rose-300">{globalSummary.avgUnitRate.toFixed(1)}%</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <p className="text-[9px] font-black uppercase text-emerald-200 tracking-wider">Top Gerador Cesta</p>
              <p className="text-xs font-black text-emerald-300 truncate max-w-[110px] mx-auto" title={globalSummary.topBasketDriver?.xProd}>
                {globalSummary.topBasketDriver?.xProd || "N/A"}
              </p>
              <span className="text-[9px] font-bold text-emerald-400/80">{globalSummary.topBasketDriver?.multiRate.toFixed(0)}% Múltiplo</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-center">
              <p className="text-[9px] font-black uppercase text-amber-200 tracking-wider">Oportunidade Est.</p>
              <p className="text-lg md:text-xl font-black text-amber-300">{fmtBRL(globalSummary.potentialRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Archetype Filter Cards (4 Quadrantes) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedArchetype("ALL")}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between select-none",
            selectedArchetype === "ALL"
              ? "bg-slate-900 border-slate-800 text-white shadow-md scale-[1.02]"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
          )}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Todos os SKUs</span>
            <Boxes className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black">{archetypeCounts.ALL}</p>
        </button>

        <button
          onClick={() => setSelectedArchetype("BASKET_DRIVER")}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between select-none",
            selectedArchetype === "BASKET_DRIVER"
              ? "bg-emerald-600 border-emerald-700 text-white shadow-md scale-[1.02]"
              : "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/80 text-emerald-900"
          )}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">🟢 Geradores de Cesta</span>
            <Flame className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black">{archetypeCounts.BASKET_DRIVER}</p>
        </button>

        <button
          onClick={() => setSelectedArchetype("SINGLE_ANCHOR")}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between select-none",
            selectedArchetype === "SINGLE_ANCHOR"
              ? "bg-rose-600 border-rose-700 text-white shadow-md scale-[1.02]"
              : "bg-rose-50/60 border-rose-200 hover:bg-rose-100/80 text-rose-900"
          )}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">🔴 Âncoras Isoladas</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black">{archetypeCounts.SINGLE_ANCHOR}</p>
        </button>

        <button
          onClick={() => setSelectedArchetype("COMPANION")}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between select-none",
            selectedArchetype === "COMPANION"
              ? "bg-sky-600 border-sky-700 text-white shadow-md scale-[1.02]"
              : "bg-sky-50/60 border-sky-200 hover:bg-sky-100/80 text-sky-900"
          )}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">🔵 Acompanhantes</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black">{archetypeCounts.COMPANION}</p>
        </button>

        <button
          onClick={() => setSelectedArchetype("LOW_TRACTION")}
          className={cn(
            "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between select-none col-span-2 sm:col-span-1",
            selectedArchetype === "LOW_TRACTION"
              ? "bg-slate-700 border-slate-800 text-white shadow-md scale-[1.02]"
              : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
          )}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">⚪ Baixa Tração</span>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black">{archetypeCounts.LOW_TRACTION}</p>
        </button>
      </div>

      {/* Controls & Search Bar */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Multi-Code Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquise por Nome ou Código(s) (ex: 100234, 100567)..."
                className="pl-10 pr-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-xs font-medium text-slate-800 shadow-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter by Channel & Sort By */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Channel Switcher */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 text-[10px] font-bold uppercase">
                <button
                  onClick={() => setSelectedChannel("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    selectedChannel === "ALL" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Todos Canais
                </button>
                <button
                  onClick={() => setSelectedChannel("LOJA_FISICA")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    selectedChannel === "LOJA_FISICA" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Loja Física
                </button>
                <button
                  onClick={() => setSelectedChannel("RETIRADA_ONLINE")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    selectedChannel === "RETIRADA_ONLINE" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Pickup
                </button>
                <button
                  onClick={() => setSelectedChannel("DELIVERY")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    selectedChannel === "DELIVERY" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Delivery
                </button>
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs font-bold uppercase text-slate-700 focus:outline-none"
              >
                <option value="revenue">Ordenar por: Receita (R$)</option>
                <option value="qty">Ordenar por: Qtd Vendida</option>
                <option value="unitRate">Ordenar por: % Cupons Solo</option>
                <option value="multiRate">Ordenar por: % Cupons Múltiplos</option>
                <option value="coupons">Ordenar por: Total de Cupons</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                className="h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 hover:bg-slate-100"
              >
                {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
              </button>
            </div>
          </div>

          {/* Active Tokens Indicator */}
          {searchTokens.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Filtro de Código/Nome Ativo:</span>
              {searchTokens.map((token, idx) => (
                <Badge key={idx} variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono font-bold">
                  {token}
                </Badge>
              ))}
              <span className="text-[10px] font-bold text-slate-400">({filteredProducts.length} itens encontrados)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-5 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            Matriz de Participação dos Produtos ({filteredProducts.length} itens)
          </CardTitle>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Clique no produto para o Raio-X</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="p-4">Código & Produto</th>
                  <th className="p-4">Arquétipo</th>
                  <th className="p-4 text-right">Faturamento / Qtd</th>
                  <th className="p-4 text-center">Cupons (Solo / Múltiplo)</th>
                  <th className="p-4 min-w-[180px]">Proporção Visual Solo vs. Múltiplo</th>
                  <th className="p-4 text-right">Ticket Médio Cupom</th>
                  <th className="p-4 text-right">PA Médio</th>
                  <th className="p-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  return (
                    <tr 
                      key={p.cProd}
                      onClick={() => setSelectedProduct(p)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col min-w-0 max-w-[280px]">
                          <span className="font-mono text-[10px] font-bold text-slate-400 leading-none mb-1">
                            #{p.cProd}
                          </span>
                          <span className="font-black text-slate-800 text-xs truncate group-hover:text-indigo-600 transition-colors" title={p.xProd}>
                            {p.xProd}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        {getArchetypeBadge(p.archetype)}
                      </td>

                      <td className="p-4 text-right">
                        <p className="font-black text-slate-900 leading-none">{fmtBRL(p.totalRevenue)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{p.totalQty} un. ({p.totalCoupons} cupons)</p>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100" title="Cupons Solo (1 item)">
                            {p.unitCoupons} 1-item
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100" title="Cupons Múltiplos (2+ itens)">
                            {p.multiCoupons} 2+ itens
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-black">
                            <span className="text-rose-600">Solo: {p.unitRate.toFixed(0)}%</span>
                            <span className="text-emerald-600">Múltiplo: {p.multiRate.toFixed(0)}%</span>
                          </div>
                          {/* Dual Bar */}
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div 
                              style={{ width: `${p.unitRate}%` }} 
                              className="bg-rose-500 h-full transition-all" 
                              title={`Solo: ${p.unitRate.toFixed(1)}%`}
                            />
                            <div 
                              style={{ width: `${p.multiRate}%` }} 
                              className="bg-emerald-500 h-full transition-all" 
                              title={`Múltiplo: ${p.multiRate.toFixed(1)}%`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right font-black text-slate-800">
                        {fmtBRL(p.avgBasketValue)}
                      </td>

                      <td className="p-4 text-right font-black text-slate-800">
                        {p.avgPA.toFixed(2)}
                      </td>

                      <td className="p-4 text-center">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 text-indigo-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 italic font-bold uppercase tracking-widest text-xs">
                      Nenhum produto encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product Deep Dive Sheet Modal */}
      <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-white overflow-y-auto p-6 space-y-6">
          {selectedProduct && (
            <>
              <SheetHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-[10px] text-slate-500 border-slate-200">
                    SKU #{selectedProduct.cProd}
                  </Badge>
                  {getArchetypeBadge(selectedProduct.archetype)}
                </div>
                <SheetTitle className="text-xl font-black uppercase text-slate-900 leading-tight">
                  {selectedProduct.xProd}
                </SheetTitle>
                <SheetDescription className="text-xs font-medium text-slate-500">
                  Raio-X de comportamento do produto em cupons unitários vs. múltiplos.
                </SheetDescription>
              </SheetHeader>

              {/* Top Stats Cards in Sheet */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Faturamento</p>
                  <p className="text-base font-black text-slate-900">{fmtBRL(selectedProduct.totalRevenue)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Unidades</p>
                  <p className="text-base font-black text-slate-900">{selectedProduct.totalQty} pçs</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
                  <p className="text-[9px] font-black text-rose-500 uppercase">% Cupons Solo</p>
                  <p className="text-base font-black text-rose-700">{selectedProduct.unitRate.toFixed(1)}%</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[9px] font-black text-emerald-500 uppercase">% Cupons Múltiplos</p>
                  <p className="text-base font-black text-emerald-700">{selectedProduct.multiRate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Actionable Strategy Recommendation */}
              <div className="p-4 rounded-2xl bg-indigo-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Diagnóstico Tático
                </div>
                <p className="text-xs font-medium leading-relaxed text-indigo-100">
                  {selectedProduct.unitRate >= 60 ? (
                    <>
                      Este item é vendido <strong className="text-amber-300">{selectedProduct.unitRate.toFixed(0)}% das vezes sozinho</strong>. Trata-se de um produto soberano/isolado. A equipe está deixando passar oportunidades de cross-selling. Recomenda-se posicionar acompanhantes diretos fisicamente próximos ao item e incentivar oferta de checkout.
                    </>
                  ) : selectedProduct.multiRate >= 60 ? (
                    <>
                      Este item é um forte <strong className="text-emerald-300">Gerador de Cesta ({selectedProduct.multiRate.toFixed(0)}% das vezes com outros itens)</strong>. Quando o cliente escolhe este produto, ele tende a comprar mais peças no mesmo atendimento.
                    </>
                  ) : (
                    <>
                      Este produto possui uma distribuição equilibrada entre vendas isoladas ({selectedProduct.unitRate.toFixed(0)}%) e vendas compostas ({selectedProduct.multiRate.toFixed(0)}%).
                    </>
                  )}
                </p>
              </div>

              {/* Top 5 Companion Products */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  Top Produtos Acompanhantes (Comprados Junto)
                </h4>

                {Object.keys(selectedProduct.companionMap).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(selectedProduct.companionMap)
                      .map(([code, data]) => ({ code, ...data }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((comp, idx) => (
                        <div key={comp.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate" title={comp.xProd}>{comp.xProd}</p>
                              <p className="text-[9px] font-mono text-slate-400">SKU #{comp.code}</p>
                            </div>
                          </div>
                          <Badge className="bg-indigo-50 text-indigo-700 font-bold border-indigo-200 text-[10px]">
                            {comp.count} vezes junto
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl">
                    Nenhum produto acompanhante registrado (todas as vendas foram unitárias).
                  </p>
                )}
              </div>

              {/* Top Seller Cross-Sell Champions */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Performance por Colaborador neste Produto
                </h4>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {Object.values(selectedProduct.sellerMap)
                    .sort((a, b) => (b.multiCount / (b.unitCount + b.multiCount || 1)) - (a.unitCount / (a.unitCount + a.multiCount || 1)))
                    .map((sel) => {
                      const totalS = sel.unitCount + sel.multiCount;
                      const multiPct = totalS > 0 ? (sel.multiCount / totalS) * 100 : 0;
                      return (
                        <div key={sel.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="text-xs font-black text-slate-800">{sel.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{sel.totalQty} pçs vendidas ({sel.unitCount} solo / {sel.multiCount} múltiplo)</p>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-xs font-black px-2.5 py-1 rounded-lg border",
                              multiPct >= 50 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {multiPct.toFixed(0)}% Múltiplo
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
