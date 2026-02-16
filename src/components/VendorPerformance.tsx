
"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  TrendingUp,
  Target,
  UserCheck,
  Smartphone,
  Zap,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorPerformanceProps {
  data: DetailedSaleRow[];
}

interface VendorMetrics {
  name: string;
  venda: number;
  cupons: number;
  itens: number;
  tkm: number;
  pa: number;
  cadastros: number;
  taxaIdentificacao: number;
  atendimentosOnline: number;
  retiradasComAdicional: number;
  taxaConversaoOnline: number;
}

export function VendorPerformance({ data }: VendorPerformanceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorMetrics | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof VendorMetrics; direction: 'asc' | 'desc' }>({
    key: 'venda',
    direction: 'desc'
  });

  // Filtro de base: Físico + Adicionais
  const baseData = useMemo(() => {
    return data.filter(r => !r.is_cancelada);
  }, [data]);

  const metricsByVendor = useMemo(() => {
    const vendors: Record<string, DetailedSaleRow[]> = {};
    const onlinePickups = baseData.filter(r => r.canal === "RETIRADA_ONLINE");
    const physicalSales = baseData.filter(r => r.tpNF === 1 && (r.canal === "LOJA_FISICA" || r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito));

    // Agrupar vendas físicas/adicionais por vendedor
    physicalSales.forEach(r => {
      const name = r.vendedor || "VENDEDOR NÃO IDENTIFICADO";
      if (!vendors[name]) vendors[name] = [];
      vendors[name].push(r);
    });

    // Calcular métricas
    const results: VendorMetrics[] = Object.entries(vendors).map(([name, rows]) => {
      const venda = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const cupons = rows.length;
      const itens = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
      const cadastros = rows.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;
      
      // Atendimentos Online vinculados (Onde este vendedor fez o adicional para o mesmo CPF/Dia)
      const cpfsDoVendedor = new Set(rows.map(r => r.cpf_cnpj_dest).filter(Boolean));
      const atendimentosOnline = onlinePickups.filter(p => cpfsDoVendedor.has(p.cpf_cnpj_dest)).length;
      const retiradasComAdicional = rows.filter(r => (r.is_adicional || r.is_adicional_suspeito) && r.chave_retirada_associada).length;

      return {
        name,
        venda,
        cupons,
        itens,
        tkm: cupons > 0 ? venda / cupons : 0,
        pa: cupons > 0 ? itens / cupons : 0,
        cadastros,
        taxaIdentificacao: cupons > 0 ? (cadastros / cupons) * 100 : 0,
        atendimentosOnline,
        retiradasComAdicional,
        taxaConversaoOnline: atendimentosOnline > 0 ? (retiradasComAdicional / atendimentosOnline) * 100 : 0
      };
    });

    return results;
  }, [baseData]);

  const storeAverage = useMemo(() => {
    if (metricsByVendor.length === 0) return null;
    const count = metricsByVendor.length;
    
    return {
      venda: metricsByVendor.reduce((acc, v) => acc + v.venda, 0) / count,
      tkm: metricsByVendor.reduce((acc, v) => acc + v.tkm, 0) / count,
      pa: metricsByVendor.reduce((acc, v) => acc + v.pa, 0) / count,
      taxaIdentificacao: metricsByVendor.reduce((acc, v) => acc + v.taxaIdentificacao, 0) / count,
      taxaConversaoOnline: metricsByVendor.reduce((acc, v) => acc + v.taxaConversaoOnline, 0) / count,
    };
  }, [metricsByVendor]);

  const sortedAndFilteredVendors = useMemo(() => {
    return metricsByVendor
      .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [metricsByVendor, searchTerm, sortConfig]);

  const handleSort = (key: keyof VendorMetrics) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Resumo da Loja */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard 
          label="Venda (Física+Adic)" 
          value={formatBRL(metricsByVendor.reduce((acc, v) => acc + v.venda, 0))} 
          avg={storeAverage ? formatBRL(storeAverage.venda) : ""}
          icon={TrendingUp} 
          color="text-orange-500" 
        />
        <SummaryCard 
          label="TKM Médio Loja" 
          value={storeAverage ? formatBRL(storeAverage.tkm) : "R$ 0,00"} 
          icon={Target} 
          color="text-purple-500" 
        />
        <SummaryCard 
          label="P.A. Médio Loja" 
          value={storeAverage ? storeAverage.pa.toFixed(2) : "0.00"} 
          icon={Zap} 
          color="text-sky-500" 
        />
        <SummaryCard 
          label="Taxa Identificação" 
          value={storeAverage ? `${storeAverage.taxaIdentificacao.toFixed(1)}%` : "0%"} 
          icon={UserCheck} 
          color="text-emerald-500" 
        />
        <SummaryCard 
          label="Conversão Online" 
          value={storeAverage ? `${storeAverage.taxaConversaoOnline.toFixed(1)}%` : "0%"} 
          icon={Smartphone} 
          color="text-pink-500" 
        />
      </div>

      {/* Controles e Tabela */}
      <Card className="ri-card overflow-hidden border-none shadow-xl">
        <CardHeader className="bg-white border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
          <div className="space-y-1">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-600 flex items-center gap-2">
              Ranking de Performance <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100">{sortedAndFilteredVendors.length} Vendedores</Badge>
            </CardTitle>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar colaborador..." 
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-50">
                  <TableHead className="w-[200px] text-[10px] font-black uppercase text-slate-400">Colaborador</TableHead>
                  <SortableHead label="Venda Total" sortKey="venda" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="TKM" sortKey="tkm" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="P.A." sortKey="pa" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="% Identif." sortKey="taxaIdentificacao" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="Conv. Online" sortKey="taxaConversaoOnline" currentSort={sortConfig} onSort={handleSort} />
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredVendors.map((v) => (
                  <TableRow 
                    key={v.name} 
                    className="hover:bg-orange-50/30 border-slate-50 cursor-pointer group"
                    onClick={() => setSelectedVendor(v)}
                  >
                    <TableCell className="py-4">
                      <p className="text-xs font-black text-slate-700 uppercase leading-none">{v.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{v.cupons} Tickets</p>
                    </TableCell>
                    <TableCell>
                      <ComparisonCell 
                        value={formatBRL(v.venda)} 
                        isAbove={storeAverage ? v.venda > storeAverage.venda : false} 
                      />
                    </TableCell>
                    <TableCell>
                      <ComparisonCell 
                        value={formatBRL(v.tkm)} 
                        isAbove={storeAverage ? v.tkm > storeAverage.tkm : false} 
                      />
                    </TableCell>
                    <TableCell>
                      <ComparisonCell 
                        value={v.pa.toFixed(2)} 
                        isAbove={storeAverage ? v.pa > storeAverage.pa : false} 
                      />
                    </TableCell>
                    <TableCell>
                      <ComparisonCell 
                        value={`${v.taxaIdentificacao.toFixed(1)}%`} 
                        isAbove={storeAverage ? v.taxaIdentificacao > storeAverage.taxaIdentificacao : false} 
                      />
                    </TableCell>
                    <TableCell>
                      <ComparisonCell 
                        value={`${v.taxaConversaoOnline.toFixed(1)}%`} 
                        isAbove={storeAverage ? v.taxaConversaoOnline > storeAverage.taxaConversaoOnline : false} 
                        showNeutral={v.atendimentosOnline === 0}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhamento Lateral */}
      <Sheet open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <SheetContent className="w-full sm:max-w-md bg-white border-l-4 border-orange-500 p-0 overflow-y-auto">
          {selectedVendor && (
            <div className="h-full flex flex-col">
              <div className="bg-[#FFD100] p-8 space-y-2 border-b-4 border-orange-500">
                <SheetTitle className="text-2xl font-black text-orange-900 uppercase tracking-tighter">{selectedVendor.name}</SheetTitle>
                <SheetDescription className="text-orange-800 font-bold uppercase text-[10px] tracking-widest">Detalhamento Individual de Performance</SheetDescription>
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <DetailMiniCard label="Venda Bruta" value={formatBRL(selectedVendor.venda)} />
                  <DetailMiniCard label="Tickets" value={selectedVendor.cupons} />
                  <DetailMiniCard label="Peças" value={selectedVendor.itens} />
                  <DetailMiniCard label="Retiradas Atendidas" value={selectedVendor.atendimentosOnline} />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> Comparação com Média da Loja
                  </h4>
                  <div className="space-y-3">
                    <ComparisonRow 
                      label="Ticket Médio" 
                      value={formatBRL(selectedVendor.tkm)} 
                      storeAvg={storeAverage ? formatBRL(storeAverage.tkm) : ""} 
                      diff={storeAverage ? (selectedVendor.tkm - storeAverage.tkm) : 0} 
                      isCurrency 
                    />
                    <ComparisonRow 
                      label="Peças por Atendimento" 
                      value={selectedVendor.pa.toFixed(2)} 
                      storeAvg={storeAverage ? storeAverage.pa.toFixed(2) : ""} 
                      diff={storeAverage ? (selectedVendor.pa - storeAverage.pa) : 0} 
                    />
                    <ComparisonRow 
                      label="Taxa de Identificação" 
                      value={`${selectedVendor.taxaIdentificacao.toFixed(1)}%`} 
                      storeAvg={storeAverage ? `${storeAverage.taxaIdentificacao.toFixed(1)}%` : ""} 
                      diff={storeAverage ? (selectedVendor.taxaIdentificacao - storeAverage.taxaIdentificacao) : 0} 
                      isPercent
                    />
                    <ComparisonRow 
                      label="Conversão Online" 
                      value={`${selectedVendor.taxaConversaoOnline.toFixed(1)}%`} 
                      storeAvg={storeAverage ? `${storeAverage.taxaConversaoOnline.toFixed(1)}%` : ""} 
                      diff={storeAverage ? (selectedVendor.taxaConversaoOnline - storeAverage.taxaConversaoOnline) : 0} 
                      isPercent
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex gap-4">
                  <div className="p-3 bg-white rounded-full"><Info className="w-5 h-5 text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Insight Estratégico</p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                      {selectedVendor.taxaConversaoOnline > (storeAverage?.taxaConversaoOnline || 0) 
                        ? "Este colaborador possui forte habilidade em converter retiradas online em vendas presenciais." 
                        : "Há oportunidade de melhoria na abordagem de upsell durante o atendimento de retiradas online."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t bg-slate-50">
                <Button onClick={() => setSelectedVendor(null)} className="w-full bg-orange-500 hover:bg-orange-600 font-black rounded-xl py-6">FECHAR DETALHES</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({ label, value, avg, icon: Icon, color }: { label: string, value: string, avg?: string, icon: any, color: string }) {
  return (
    <Card className="ri-card border-none bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {avg && <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Avg: {avg}</span>}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
    </Card>
  );
}

function SortableHead({ label, sortKey, currentSort, onSort }: { label: string, sortKey: keyof VendorMetrics, currentSort: any, onSort: any }) {
  const isActive = currentSort.key === sortKey;
  return (
    <TableHead 
      className="text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-orange-500 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (currentSort.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </div>
    </TableHead>
  );
}

function ComparisonCell({ value, isAbove, showNeutral = false }: { value: string, isAbove: boolean, showNeutral?: boolean }) {
  if (showNeutral) return <span className="text-xs font-bold text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-700">{value}</span>
      {isAbove ? (
        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50 px-1 py-0 h-4 min-w-[32px] justify-center"><ArrowUp className="w-2 h-2" /></Badge>
      ) : (
        <Badge className="bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-50 px-1 py-0 h-4 min-w-[32px] justify-center"><ArrowDown className="w-2 h-2" /></Badge>
      )}
    </div>
  );
}

function DetailMiniCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-base font-black text-slate-800">{value}</p>
    </div>
  );
}

function ComparisonRow({ label, value, storeAvg, diff, isCurrency = false, isPercent = false }: { label: string, value: string, storeAvg: string, diff: number, isCurrency?: boolean, isPercent?: boolean }) {
  const isPositive = diff > 0;
  const formattedDiff = isCurrency 
    ? diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', signDisplay: 'always' })
    : (isPercent ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`);

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-50">
      <div>
        <p className="text-xs font-black text-slate-800">{label}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase">Média Loja: {storeAvg}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-slate-700">{value}</p>
        <span className={cn(
          "text-[10px] font-black flex items-center gap-1 justify-end",
          isPositive ? "text-emerald-600" : "text-rose-600"
        )}>
          {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {formattedDiff}
        </span>
      </div>
    </div>
  );
}
