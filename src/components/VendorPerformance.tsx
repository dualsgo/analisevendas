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
  CardDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const baseData = useMemo(() => {
    return data.filter(r => !r.is_cancelada);
  }, [data]);

  const metricsByVendor = useMemo(() => {
    const collaborators: Record<string, DetailedSaleRow[]> = {};
    const onlinePickups = baseData.filter(r => r.canal === "RETIRADA_ONLINE");
    const physicalSales = baseData.filter(r => r.tpNF === 1 && (r.canal === "LOJA_FISICA" || r.canal === "RETIRADA_ADICIONAL" || r.is_adicional || r.is_adicional_suspeito));

    physicalSales.forEach(r => {
      const name = r.vendedor || "COLABORADOR NÃO IDENTIFICADO";
      if (!collaborators[name]) collaborators[name] = [];
      collaborators[name].push(r);
    });

    return Object.entries(collaborators).map(([name, rows]) => {
      const venda = rows.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
      const cupons = rows.length;
      const itens = rows.reduce((acc, r) => acc + parseFloat(r.itens_qtd), 0);
      const cadastros = rows.filter(r => r.cpf_cnpj_dest && r.cpf_cnpj_dest.trim() !== "").length;
      const cpfsDoColaborador = new Set(rows.map(r => r.cpf_cnpj_dest).filter(Boolean));
      const atendimentosOnline = onlinePickups.filter(p => cpfsDoColaborador.has(p.cpf_cnpj_dest)).length;
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
  }, [baseData]);

  const storeAverage = useMemo(() => {
    if (metricsByVendor.length === 0) return null;
    
    const totalVenda = metricsByVendor.reduce((acc, v) => acc + v.venda, 0);
    const totalCupons = metricsByVendor.reduce((acc, v) => acc + v.cupons, 0);
    const totalItens = metricsByVendor.reduce((acc, v) => acc + v.itens, 0);
    const totalCadastros = metricsByVendor.reduce((acc, v) => acc + v.cadastros, 0);
    const totalAtendimentosOnline = metricsByVendor.reduce((acc, v) => acc + v.atendimentosOnline, 0);
    const totalRetiradasComAdicional = metricsByVendor.reduce((acc, v) => acc + v.retiradasComAdicional, 0);

    return {
      venda: totalVenda / metricsByVendor.length,
      tkm: totalCupons > 0 ? totalVenda / totalCupons : 0,
      pa: totalCupons > 0 ? totalItens / totalCupons : 0,
      taxaIdentificacao: totalCupons > 0 ? (totalCadastros / totalCupons) * 100 : 0,
      taxaConversaoOnline: totalAtendimentosOnline > 0 ? (totalRetiradasComAdicional / totalAtendimentosOnline) * 100 : 0,
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

  const formatBRL = (val: number, isMobile = false) => {
    if (isMobile && val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const metricLabels: Record<string, string> = {
    venda: "Venda Total",
    cupons: "Tickets",
    tkm: "TKM",
    pa: "P.A.",
    taxaIdentificacao: "Identificação",
    taxaConversaoOnline: "Conversão Online"
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <SummaryCard label="Venda Loja" value={formatBRL(metricsByVendor.reduce((acc, v) => acc + v.venda, 0), true)} icon={TrendingUp} color="text-orange-500" />
        <SummaryCard label="TKM Médio" value={storeAverage ? formatBRL(storeAverage.tkm, true) : "R$ 0"} icon={Target} color="text-purple-500" />
        <SummaryCard label="P.A. Médio" value={storeAverage ? storeAverage.pa.toFixed(2) : "0"} icon={Zap} color="text-sky-500" />
        <SummaryCard label="Fidelização" value={storeAverage ? `${storeAverage.taxaIdentificacao.toFixed(1)}%` : "0%"} icon={UserCheck} color="text-emerald-500" />
        <SummaryCard label="Conv. Online" value={storeAverage ? `${storeAverage.taxaConversaoOnline.toFixed(1)}%` : "0%"} icon={Smartphone} color="text-pink-500" />
      </div>

      <Card className="ri-card overflow-hidden border-none shadow-xl bg-white">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 md:p-8">
          <div className="space-y-1">
            <CardTitle className="text-sm md:text-base font-black uppercase tracking-tight text-slate-600 flex items-center gap-3">
              Performance de Colaboradores <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 px-3 py-0.5 text-[10px] font-black">{sortedAndFilteredVendors.length}</Badge>
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xs font-medium text-slate-400">Análise de produtividade e qualidade do atendimento individual.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                placeholder="Buscar colaborador..." 
                className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-10 text-xs font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="lg:hidden">
              <Select value={sortConfig.key} onValueChange={(v) => handleSort(v as keyof VendorMetrics)}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-black text-[10px] uppercase tracking-wide">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(metricLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 h-12">
                  <TableHead className="w-[220px] text-[10px] font-black uppercase text-slate-400 tracking-widest pl-8">Colaborador</TableHead>
                  <SortableHead label="Venda" sortKey="venda" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="TKM" sortKey="tkm" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="P.A." sortKey="pa" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="% Ident." sortKey="taxaIdentificacao" currentSort={sortConfig} onSort={handleSort} />
                  <SortableHead label="Conv. Online" sortKey="taxaConversaoOnline" currentSort={sortConfig} onSort={handleSort} />
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredVendors.map((v) => (
                  <TableRow key={v.name} className="hover:bg-orange-50/30 border-slate-50 cursor-pointer group transition-colors h-16" onClick={() => setSelectedVendor(v)}>
                    <TableCell className="pl-8">
                      <p className="text-xs font-black text-slate-700 uppercase leading-none tracking-tight">{v.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">{v.cupons} Tickets</p>
                    </TableCell>
                    <TableCell><ComparisonCell value={formatBRL(v.venda)} isAbove={storeAverage ? v.venda > storeAverage.venda : false} /></TableCell>
                    <TableCell><ComparisonCell value={formatBRL(v.tkm)} isAbove={storeAverage ? v.tkm > storeAverage.tkm : false} /></TableCell>
                    <TableCell><ComparisonCell value={v.pa.toFixed(2)} isAbove={storeAverage ? v.pa > storeAverage.pa : false} /></TableCell>
                    <TableCell><ComparisonCell value={`${v.taxaIdentificacao.toFixed(1)}%`} isAbove={storeAverage ? v.taxaIdentificacao > storeAverage.taxaIdentificacao : false} /></TableCell>
                    <TableCell><ComparisonCell value={`${v.taxaConversaoOnline.toFixed(1)}%`} isAbove={storeAverage ? v.taxaConversaoOnline > storeAverage.taxaConversaoOnline : false} showNeutral={v.atendimentosOnline === 0} /></TableCell>
                    <TableCell className="text-right pr-6"><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="lg:hidden p-4 space-y-4">
            {sortedAndFilteredVendors.map((v) => (
              <div key={v.name} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4 transition-all active:scale-[0.98]" onClick={() => setSelectedVendor(v)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-sm font-black text-slate-800 uppercase leading-tight tracking-tight">{v.name}</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{v.cupons} Cupons</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900 leading-none">{formatBRL(v.venda, true)}</p>
                    <Badge variant="outline" className={cn("mt-1.5 text-[8px] h-4 font-black border-none uppercase px-1.5", v.venda > (storeAverage?.venda || 0) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {v.venda > (storeAverage?.venda || 0) ? <ArrowUp className="w-2 h-2 mr-1" /> : <ArrowDown className="w-2 h-2 mr-1" />}
                      Vs Média
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-3 border-t border-slate-50">
                  <MobileMetric label="Tickets | Peças" value={`${v.cupons} | ${v.itens}`} />
                  <MobileMetric label="TKM" value={formatBRL(v.tkm, true)} isAbove={storeAverage ? v.tkm > storeAverage.tkm : false} />
                  <MobileMetric label="P.A." value={v.pa.toFixed(2)} isAbove={storeAverage ? v.pa > storeAverage.pa : false} />
                  <MobileMetric label="Identificação" value={`${v.taxaIdentificacao.toFixed(1)}%`} isAbove={storeAverage ? v.taxaIdentificacao > storeAverage.taxaIdentificacao : false} />
                  <div className="col-span-2 pt-1">
                    <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
                       <MobileMetric label="Conversão Online" value={`${v.taxaConversaoOnline.toFixed(1)}%`} isAbove={storeAverage ? v.taxaConversaoOnline > storeAverage.taxaConversaoOnline : false} />
                       <Badge className="bg-white text-slate-400 border-slate-100 text-[8px] font-black uppercase">{v.atendimentosOnline} ATEND.</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <SheetContent className="w-full sm:max-w-md bg-white border-l-4 border-orange-500 p-0 overflow-y-auto">
          {selectedVendor && (
            <div className="h-full flex flex-col">
              <div className="bg-[#FFD100] p-6 md:p-8 space-y-2 border-b-4 border-orange-500">
                <SheetTitle className="text-xl md:text-2xl font-black text-orange-900 uppercase tracking-tighter leading-none">{selectedVendor.name}</SheetTitle>
                <SheetDescription className="text-orange-800 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em]">Análise de Performance Individual</SheetDescription>
              </div>
              <div className="p-6 md:p-8 space-y-6 flex-1 text-center">
                <div className="grid grid-cols-2 gap-3">
                  <DetailMiniCard label="Venda Bruta" value={formatBRL(selectedVendor.venda)} />
                  <DetailMiniCard label="Tickets" value={selectedVendor.cupons} />
                  <DetailMiniCard label="TKM" value={formatBRL(selectedVendor.tkm)} />
                  <DetailMiniCard label="P.A." value={selectedVendor.pa.toFixed(2)} />
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Comparativo vs Média Unidade</h4>
                  <div className="space-y-3">
                    <ComparisonRow label="Ticket Médio" value={formatBRL(selectedVendor.tkm)} storeAvg={storeAverage ? formatBRL(storeAverage.tkm) : ""} diff={storeAverage ? (selectedVendor.tkm - storeAverage.tkm) : 0} isCurrency />
                    <ComparisonRow label="P.A. Médio" value={selectedVendor.pa.toFixed(2)} storeAvg={storeAverage ? storeAverage.pa.toFixed(2) : ""} diff={storeAverage ? (selectedVendor.pa - storeAverage.pa) : 0} />
                    <ComparisonRow label="Taxa Fidelização" value={`${selectedVendor.taxaIdentificacao.toFixed(1)}%`} storeAvg={storeAverage ? `${selectedVendor.taxaIdentificacao.toFixed(1)}%` : ""} diff={storeAverage ? (selectedVendor.taxaIdentificacao - storeAverage.taxaIdentificacao) : 0} isPercent />
                    <ComparisonRow label="Conversão Pickup" value={`${selectedVendor.taxaConversaoOnline.toFixed(1)}%`} storeAvg={storeAverage ? `${selectedVendor.taxaConversaoOnline.toFixed(1)}%` : ""} diff={storeAverage ? (selectedVendor.taxaConversaoOnline - storeAverage.taxaConversaoOnline) : 0} isPercent />
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedVendor(null)} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl h-14 md:h-16 text-base shadow-lg uppercase tracking-wide">CONCLUIR ANÁLISE</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col items-center justify-center text-center space-y-3 shadow-sm hover:shadow-md transition-shadow min-h-[110px]">
      <div className={cn("p-2 rounded-xl bg-slate-50 shadow-inner", color)}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-base md:text-xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
      </div>
    </Card>
  );
}

function MobileMetric({ label, value, isAbove, subValue }: { label: string, value: string, isAbove?: boolean, subValue?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-black text-slate-700 leading-none">{value}</span>
        {isAbove !== undefined && (
          isAbove ? <ArrowUp className="w-2.5 h-2.5 text-emerald-500" /> : <ArrowDown className="w-2.5 h-2.5 text-rose-500" />
        )}
      </div>
      {subValue && <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">{subValue}</p>}
    </div>
  );
}

function SortableHead({ label, sortKey, currentSort, onSort }: { label: string, sortKey: keyof VendorMetrics, currentSort: any, onSort: any }) {
  const isActive = currentSort.key === sortKey;
  return (
    <TableHead className="text-[10px] font-black uppercase text-slate-400 cursor-pointer hover:text-orange-500 transition-colors tracking-widest" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1.5">
        {label}
        {isActive && (currentSort.direction === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </div>
    </TableHead>
  );
}

function ComparisonCell({ value, isAbove, showNeutral = false }: { value: string, isAbove: boolean, showNeutral?: boolean }) {
  if (showNeutral) return <span className="text-[10px] font-black text-slate-300">N/A</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-700 tracking-tight">{value}</span>
      <div className={cn("p-0.5 rounded-full", isAbove ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500")}>
        {isAbove ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      </div>
    </div>
  );
}

function DetailMiniCard({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 shadow-inner text-center">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
      <p className="text-sm md:text-base font-black text-slate-800 tracking-tight leading-none">{value}</p>
    </div>
  );
}

function ComparisonRow({ label, value, storeAvg, diff, isCurrency = false, isPercent = false }: { label: string, value: string, storeAvg: string, diff: number, isCurrency?: boolean, isPercent?: boolean }) {
  const isPositive = diff > 0;
  const formattedDiff = isCurrency 
    ? diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', signDisplay: 'always' })
    : (isPercent ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`);

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-slate-50 gap-4 shadow-sm text-left">
      <div className="min-w-0 space-y-0.5">
        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{label}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Média Unidade: {storeAvg}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-black text-slate-700 tracking-tight">{value}</p>
        <span className={cn("text-[10px] font-black flex items-center gap-1 justify-end uppercase", isPositive ? "text-emerald-600" : "text-rose-600")}>
          {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {formattedDiff}
        </span>
      </div>
    </div>
  );
}
