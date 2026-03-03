"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  TrendingDown,
  UserX,
  Smartphone,
  ShoppingBag,
  ArrowRightLeft,
  ChevronRight,
  Search,
  Target,
  Zap,
  CircleAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface LostOpportunitiesProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

type OpportunityFilter = 'all' | 'one_item' | 'no_registration' | 'pickup_no_additional' | 'high_value_low_pa' | 'exchange_loss';

export function LostOpportunities({ data, vinculos }: LostOpportunitiesProps) {
  const [activeFilter, setActiveFilter] = useState<OpportunityFilter>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<DetailedSaleRow | null>(null);

  const HIGH_VALUE_THRESHOLD = 300;
  const LOW_PA_THRESHOLD = 1.5;

  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalCount = activeSales.length;

    const oneItemSales = activeSales.filter(s => parseInt(s.itens_qtd) === 1);
    const oneItemPercent = totalCount > 0 ? (oneItemSales.length / totalCount) * 100 : 0;

    const noRegSales = activeSales.filter(s => !s.cpf_cnpj_dest || s.cpf_cnpj_dest.trim() === "");
    const noRegPercent = totalCount > 0 ? (noRegSales.length / totalCount) * 100 : 0;

    const pickups = activeSales.filter(s => s.canal === "RETIRADA_ONLINE");
    const pickupsNoAdd = pickups.filter(p => !data.some(s => s.chave_retirada_associada === p.chave));
    const pickupNoAddPercent = pickups.length > 0 ? (pickupsNoAdd.length / pickups.length) * 100 : 0;

    const highValueLowPA = activeSales.filter(s => parseFloat(s.vNF) >= HIGH_VALUE_THRESHOLD && parseFloat(s.itens_qtd) <= LOW_PA_THRESHOLD);
    const exchangeLoss = vinculos.filter(v => v.diferenca_itens < 0);

    return {
      totalCount,
      oneItemSales, oneItemPercent,
      noRegSales, noRegPercent,
      pickupsNoAdd, pickupNoAddPercent,
      highValueLowPA, exchangeLoss,
      avgPA: totalCount > 0 ? activeSales.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0) / totalCount : 0
    };
  }, [data, vinculos]);

  const filteredList = useMemo(() => {
    let list = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    if (activeFilter === 'one_item') list = list.filter(s => parseInt(s.itens_qtd) === 1);
    else if (activeFilter === 'no_registration') list = list.filter(s => !s.cpf_cnpj_dest || s.cpf_cnpj_dest.trim() === "");
    else if (activeFilter === 'pickup_no_additional') list = list.filter(s => s.canal === "RETIRADA_ONLINE" && !data.some(o => o.chave_retirada_associada === s.chave));
    else if (activeFilter === 'high_value_low_pa') list = list.filter(s => parseFloat(s.vNF) >= HIGH_VALUE_THRESHOLD && parseFloat(s.itens_qtd) <= LOW_PA_THRESHOLD);
    else if (activeFilter === 'exchange_loss') {
      const keys = new Set(vinculos.filter(v => v.diferenca_itens < 0).map(v => v.chave_saida));
      list = list.filter(s => keys.has(s.chave));
    }
    if (searchTerm) {
      list = list.filter(s => s.nf.includes(searchTerm) || s.vendedor.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [data, activeFilter, searchTerm, vinculos]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <OpportunityCard label="1 Item" value={stats.oneItemSales.length} percent={`${stats.oneItemPercent.toFixed(0)}%`} icon={ShoppingBag} color="text-orange-500" isActive={activeFilter === 'one_item'} onClick={() => setActiveFilter(activeFilter === 'one_item' ? 'all' : 'one_item')} />
        <OpportunityCard label="Pickup s/ Adic" value={stats.pickupsNoAdd.length} percent={`${stats.pickupNoAddPercent.toFixed(0)}%`} icon={Smartphone} color="text-sky-500" isActive={activeFilter === 'pickup_no_additional'} onClick={() => setActiveFilter(activeFilter === 'pickup_no_additional' ? 'all' : 'pickup_no_additional')} />
        <OpportunityCard label="Sem Identif" value={stats.noRegSales.length} percent={`${stats.noRegPercent.toFixed(0)}%`} icon={UserX} color="text-rose-500" isActive={activeFilter === 'no_registration'} onClick={() => setActiveFilter(activeFilter === 'no_registration' ? 'all' : 'no_registration')} />
        <OpportunityCard label="PA Baixo" value={stats.highValueLowPA.length} icon={TrendingDown} color="text-purple-500" isActive={activeFilter === 'high_value_low_pa'} onClick={() => setActiveFilter(activeFilter === 'high_value_low_pa' ? 'all' : 'high_value_low_pa')} />
        <OpportunityCard label="Troca c/ Perda" value={stats.exchangeLoss.length} icon={ArrowRightLeft} color="text-slate-500" isActive={activeFilter === 'exchange_loss'} onClick={() => setActiveFilter(activeFilter === 'exchange_loss' ? 'all' : 'exchange_loss')} />
        <Card className="ri-card bg-emerald-50/50 p-3 flex flex-col items-center justify-center text-center gap-1">
           <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Impacto PA Global</p>
           <p className="text-xl font-black text-emerald-700 leading-none">{stats.avgPA.toFixed(2)}</p>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <CircleAlert className="w-3.5 h-3.5" /> Oportunidades ({filteredList.length})
          </h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input placeholder="NF ou Vendedor..." className="pl-8 h-8 text-[10px] font-bold rounded-lg border-slate-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="hidden lg:block bg-white rounded-2xl border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-10">
                <TableHead className="text-[9px] font-black uppercase">NF / Data</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Colaborador</TableHead>
                <TableHead className="text-[9px] font-black uppercase">Valor</TableHead>
                <TableHead className="text-[9px] font-black uppercase">PA</TableHead>
                <TableHead className="text-[9px] font-black uppercase text-center">Motivos</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((sale) => (
                <TableRow key={sale.chave} className="hover:bg-slate-50 cursor-pointer h-12" onClick={() => setSelectedSale(sale)}>
                  <TableCell>
                    <p className="text-[11px] font-black text-slate-700">#{sale.nf}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM HH:mm")}</p>
                  </TableCell>
                  <TableCell className="text-[11px] font-black text-slate-600 uppercase">{sale.vendedor}</TableCell>
                  <TableCell className="text-[11px] font-black text-slate-900">{formatBRL(parseFloat(sale.vNF))}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] font-black">{sale.itens_qtd} ITENS</Badge></TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {getOpportunityMotifs(sale, data, vinculos, HIGH_VALUE_THRESHOLD, LOW_PA_THRESHOLD).map((m, i) => (
                        <Badge key={i} className={cn("text-[7px] font-black border-none uppercase px-1.5 h-4", m.color)}>{m.label}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><ChevronRight className="w-3.5 h-3.5 text-slate-300" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="lg:hidden space-y-2">
          {filteredList.map((sale) => (
            <div key={sale.chave} className="bg-white border rounded-xl p-3 shadow-sm flex justify-between items-center" onClick={() => setSelectedSale(sale)}>
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-none">#{sale.nf} • {sale.vendedor}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {getOpportunityMotifs(sale, data, vinculos, HIGH_VALUE_THRESHOLD, LOW_PA_THRESHOLD).slice(0, 2).map((m, i) => (
                    <Badge key={i} className={cn("text-[7px] font-black border-none uppercase px-1.5", m.color)}>{m.label}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-[11px] font-black text-slate-900 leading-none">{formatBRL(parseFloat(sale.vNF))}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1">{sale.itens_qtd} ITENS</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="w-full sm:max-w-md bg-white border-l-4 border-orange-500 p-0 overflow-y-auto">
          {selectedSale && (
            <div className="h-full flex flex-col">
              <div className="bg-orange-500 p-6 space-y-2 text-white">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <SheetTitle className="text-lg font-black uppercase text-white">Oportunidade #{selectedSale.nf}</SheetTitle>
                </div>
                <p className="text-[10px] font-bold opacity-80 uppercase">{format(parseISO(selectedSale.dhEmi), "dd/MM/yyyy HH:mm")}</p>
              </div>
              <div className="p-6 space-y-6 flex-1">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-orange-500" /> Diagnóstico</h4>
                  <div className="space-y-2">
                    {getOpportunityMotifs(selectedSale, data, vinculos, HIGH_VALUE_THRESHOLD, LOW_PA_THRESHOLD).map((m, i) => (
                      <div key={i} className={cn("p-3 rounded-lg border-l-4", m.color.replace('text-', 'border-'))}>
                        <p className="text-[10px] font-black uppercase mb-0.5">{m.label}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight">{getMotifDescription(m.label)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> Itens</h4>
                  <div className="space-y-1.5">
                    {selectedSale.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                        <span className="text-[10px] font-black text-slate-700 truncate uppercase max-w-[180px]">{item.xProd}</span>
                        <span className="text-[10px] font-black text-slate-600">{formatBRL(item.vProd)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50 mt-auto"><Button onClick={() => setSelectedSale(null)} className="w-full bg-orange-500 font-black rounded-xl h-12 uppercase">FECHAR</Button></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OpportunityCard({ label, value, percent, icon: Icon, color, isActive, onClick }: any) {
  return (
    <Card onClick={onClick} className={cn("ri-card border-none bg-white p-3 cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center text-center gap-2 min-h-[100px]", isActive ? "ring-2 ring-orange-400 scale-[1.02]" : "hover:bg-slate-50")}>
      <div className="flex items-center justify-center gap-2 w-full">
        <div className={cn("p-1.5 rounded-lg bg-slate-50 shadow-inner", color)}><Icon className="w-4 h-4" /></div>
        {percent && <span className="text-[9px] font-black text-slate-400">{percent}</span>}
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase truncate leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-slate-800 leading-none">{value}</p>
      </div>
    </Card>
  );
}

function getOpportunityMotifs(sale: DetailedSaleRow, allData: DetailedSaleRow[], vinculos: VinculoTroca[], highVal: number, lowPa: number) {
  const motifs: { label: string, color: string }[] = [];
  const vNF = parseFloat(sale.vNF);
  const items = parseInt(sale.itens_qtd);
  if (items === 1) motifs.push({ label: '1 Item', color: 'bg-orange-100 text-orange-700' });
  if (!sale.cpf_cnpj_dest || sale.cpf_cnpj_dest.trim() === "") motifs.push({ label: 'S/ Cadastro', color: 'bg-rose-100 text-rose-700' });
  if (sale.canal === "RETIRADA_ONLINE" && !allData.some(s => s.chave_retirada_associada === sale.chave)) motifs.push({ label: 'S/ Adicional', color: 'bg-sky-100 text-sky-700' });
  if (vNF >= highVal && items / 1 <= lowPa) motifs.push({ label: 'PA Baixo', color: 'bg-purple-100 text-purple-700' });
  if (vinculos.some(v => v.chave_saida === sale.chave && v.diferenca_itens < 0)) motifs.push({ label: 'Troca -PA', color: 'bg-slate-200 text-slate-700' });
  return motifs;
}

function getMotifDescription(label: string): string {
  const map: Record<string, string> = {
    '1 Item': 'Apenas 1 produto. Perda de impulso.',
    'S/ Cadastro': 'Cliente não identificado.',
    'S/ Adicional': 'Retirada online sem upsell.',
    'PA Baixo': 'Valor alto com poucas peças.',
    'Troca -PA': 'Diferença de itens negativa.'
  };
  return map[label] || "";
}
