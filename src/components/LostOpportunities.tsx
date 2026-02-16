
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
  Filter,
  Search,
  Target,
  Zap,
  Percent,
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

  // Parâmetros de análise
  const HIGH_VALUE_THRESHOLD = 300;
  const LOW_PA_THRESHOLD = 1.5;

  // Cálculos de Oportunidades
  const stats = useMemo(() => {
    const activeSales = data.filter(s => !s.is_cancelada && s.tpNF === 1);
    const totalCount = activeSales.length;

    // 1 Item
    const oneItemSales = activeSales.filter(s => parseInt(s.itens_qtd) === 1);
    const oneItemPercent = totalCount > 0 ? (oneItemSales.length / totalCount) * 100 : 0;

    // Sem Cadastro
    const noRegSales = activeSales.filter(s => !s.cpf_cnpj_dest || s.cpf_cnpj_dest.trim() === "");
    const noRegPercent = totalCount > 0 ? (noRegSales.length / totalCount) * 100 : 0;

    // Pickup sem Adicional
    const pickups = activeSales.filter(s => s.canal === "RETIRADA_ONLINE");
    const pickupsNoAdd = pickups.filter(p => {
      const hasAdd = data.some(s => s.chave_retirada_associada === p.chave);
      return !hasAdd;
    });
    const pickupNoAddPercent = pickups.length > 0 ? (pickupsNoAdd.length / pickups.length) * 100 : 0;

    // Ticket Alto sem Cadastro
    const highTicketNoReg = noRegSales.filter(s => parseFloat(s.vNF) >= HIGH_VALUE_THRESHOLD);

    // Venda Alta com PA Baixo
    const highValueLowPA = activeSales.filter(s => 
      parseFloat(s.vNF) >= HIGH_VALUE_THRESHOLD && 
      parseFloat(s.itens_qtd) / 1 <= LOW_PA_THRESHOLD
    );

    // Trocas com Perda de PA (Diferença de itens negativa)
    const exchangeLoss = vinculos.filter(v => v.diferenca_itens < 0);

    return {
      totalCount,
      oneItemSales,
      oneItemPercent,
      noRegSales,
      noRegPercent,
      pickupsNoAdd,
      pickupNoAddPercent,
      highTicketNoReg,
      highValueLowPA,
      exchangeLoss,
      avgPA: totalCount > 0 ? activeSales.reduce((acc, s) => acc + parseInt(s.itens_qtd), 0) / totalCount : 0
    };
  }, [data, vinculos]);

  // Filtragem da Lista
  const filteredList = useMemo(() => {
    let list = data.filter(s => !s.is_cancelada && s.tpNF === 1);

    if (activeFilter === 'one_item') {
      list = list.filter(s => parseInt(s.itens_qtd) === 1);
    } else if (activeFilter === 'no_registration') {
      list = list.filter(s => !s.cpf_cnpj_dest || s.cpf_cnpj_dest.trim() === "");
    } else if (activeFilter === 'pickup_no_additional') {
      list = list.filter(s => s.canal === "RETIRADA_ONLINE" && !data.some(o => o.chave_retirada_associada === s.chave));
    } else if (activeFilter === 'high_value_low_pa') {
      list = list.filter(s => parseFloat(s.vNF) >= HIGH_VALUE_THRESHOLD && parseFloat(s.itens_qtd) <= LOW_PA_THRESHOLD);
    } else if (activeFilter === 'exchange_loss') {
      const keys = new Set(vinculos.filter(v => v.diferenca_itens < 0).map(v => v.chave_saida));
      list = list.filter(s => keys.has(s.chave));
    }

    if (searchTerm) {
      list = list.filter(s => 
        s.nf.includes(searchTerm) || 
        s.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nome_dest?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return list;
  }, [data, activeFilter, searchTerm, vinculos]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Alertas Estratégicos Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <OpportunityCard 
          label="Vendas c/ 1 Item" 
          value={stats.oneItemSales.length} 
          percent={`${stats.oneItemPercent.toFixed(1)}%`}
          icon={ShoppingBag} 
          color="text-orange-500" 
          isActive={activeFilter === 'one_item'}
          onClick={() => setActiveFilter(activeFilter === 'one_item' ? 'all' : 'one_item')}
          subLabel="Oportunidade de PA"
        />
        <OpportunityCard 
          label="Retiradas s/ Adicional" 
          value={stats.pickupsNoAdd.length} 
          percent={`${stats.pickupNoAddPercent.toFixed(1)}%`}
          icon={Smartphone} 
          color="text-sky-500" 
          isActive={activeFilter === 'pickup_no_additional'}
          onClick={() => setActiveFilter(activeFilter === 'pickup_no_additional' ? 'all' : 'pickup_no_additional')}
          subLabel="Falha de Conversão"
        />
        <OpportunityCard 
          label="Sem Identificação" 
          value={stats.noRegSales.length} 
          percent={`${stats.noRegPercent.toFixed(1)}%`}
          icon={UserX} 
          color="text-rose-500" 
          isActive={activeFilter === 'no_registration'}
          onClick={() => setActiveFilter(activeFilter === 'no_registration' ? 'all' : 'no_registration')}
          subLabel="Perda de Fidelização"
        />
        <OpportunityCard 
          label="Valor Alto / PA Baixo" 
          value={stats.highValueLowPA.length} 
          icon={TrendingDown} 
          color="text-purple-500" 
          isActive={activeFilter === 'high_value_low_pa'}
          onClick={() => setActiveFilter(activeFilter === 'high_value_low_pa' ? 'all' : 'high_value_low_pa')}
          subLabel="Potencial Perdido"
        />
        <OpportunityCard 
          label="Trocas com Perda" 
          value={stats.exchangeLoss.length} 
          icon={ArrowRightLeft} 
          color="text-slate-500" 
          isActive={activeFilter === 'exchange_loss'}
          onClick={() => setActiveFilter(activeFilter === 'exchange_loss' ? 'all' : 'exchange_loss')}
          subLabel="Redução de PA"
        />
        <Card className="ri-card border-none bg-emerald-50/50 p-5 flex flex-col justify-between">
           <div className="flex items-center justify-between">
             <Target className="w-5 h-5 text-emerald-600" />
             <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black">METAS</Badge>
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto no PA Global</p>
             <p className="text-2xl font-black text-emerald-700">{stats.avgPA.toFixed(2)}</p>
           </div>
        </Card>
      </div>

      {/* Lista Detalhada de Casos */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <CircleAlert className="w-4 h-4" /> Detalhamento de Oportunidades ({filteredList.length})
          </h3>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por NF ou Vendedor..." 
              className="pl-9 rounded-xl border-slate-100 bg-white h-10 text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-xl shadow-slate-100/50">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-50">
                <TableHead className="text-[10px] font-black uppercase text-slate-400">NF / Data</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Colaborador</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Valor</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Itens / PA</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Motivo Oportunidade</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((sale) => {
                const motifs = getOpportunityMotifs(sale, data, vinculos, HIGH_VALUE_THRESHOLD, LOW_PA_THRESHOLD);
                return (
                  <TableRow key={sale.chave} className="hover:bg-slate-50 border-slate-50 cursor-pointer group" onClick={() => setSelectedSale(sale)}>
                    <TableCell>
                      <p className="text-xs font-black text-slate-700">#{sale.nf}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM HH:mm")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-black text-slate-600 uppercase">{sale.vendedor}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-black text-slate-900">{formatBRL(parseFloat(sale.vNF))}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-black border-slate-200">{sale.itens_qtd} ITENS</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {motifs.map((m, i) => (
                          <Badge key={i} className={cn("text-[8px] font-black border-none uppercase", m.color)}>
                            {m.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-3">
          {filteredList.map((sale) => {
            const motifs = getOpportunityMotifs(sale, data, vinculos, HIGH_VALUE_THRESHOLD, LOW_PA_THRESHOLD);
            return (
              <div key={sale.chave} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4" onClick={() => setSelectedSale(sale)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-sm font-black text-slate-800">NF #{sale.nf}</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM/yy HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{formatBRL(parseFloat(sale.vNF))}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{sale.itens_qtd} ITENS</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                  <div className="p-2 bg-slate-50 rounded-lg"><Zap className="w-3 h-3 text-orange-400" /></div>
                  <p className="text-[10px] font-black text-slate-600 uppercase">{sale.vendedor}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {motifs.map((m, i) => (
                    <Badge key={i} className={cn("text-[8px] font-black border-none uppercase", m.color)}>
                      {m.label}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhamento Lateral (Sheet) */}
      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-orange-500 p-0 overflow-y-auto">
          {selectedSale && (
            <div className="h-full flex flex-col">
              <div className="bg-orange-500 p-6 md:p-8 space-y-4 text-white">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6" />
                  <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white">Análise de Oportunidade</SheetTitle>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">Transação</p>
                    <p className="text-sm font-black">Nota #{selectedSale.nf}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase opacity-80">Valor</p>
                    <p className="text-xl font-black">{formatBRL(parseFloat(selectedSale.vNF))}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8 flex-1">
                {/* Diagnóstico */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3 text-orange-500" /> Diagnóstico do Sistema
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {getOpportunityMotifs(selectedSale, data, vinculos, HIGH_VALUE_THRESHOLD, LOW_PA_THRESHOLD).map((m, i) => (
                      <div key={i} className={cn("p-4 rounded-xl border-l-4", m.color.replace('bg-', 'bg-').replace('text-', 'border-'))}>
                        <p className="text-xs font-black uppercase mb-1">{m.label}</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{getMotifDescription(m.label)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Itens da Venda */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-3 h-3" /> Itens da Nota
                  </h4>
                  <div className="space-y-2">
                    {selectedSale.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-black text-slate-700 truncate uppercase">{item.xProd}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                        </div>
                        <p className="text-xs font-black text-slate-600">{formatBRL(item.vProd)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedSale(null)} className="w-full bg-orange-500 hover:bg-orange-600 font-black rounded-xl py-6">CONCLUIR ANÁLISE</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OpportunityCard({ label, value, percent, icon: Icon, color, isActive, onClick, subLabel }: any) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "ri-card border-none bg-white p-5 cursor-pointer transition-all duration-300",
        isActive ? "ring-2 ring-orange-400 scale-[1.02]" : "hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-5 h-5" />
        </div>
        {percent && <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[10px]">{percent}</Badge>}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{subLabel || label}</p>
        <p className="text-xl font-black text-slate-800">{value}</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{label}</p>
      </div>
    </Card>
  );
}

function getOpportunityMotifs(sale: DetailedSaleRow, allData: DetailedSaleRow[], vinculos: VinculoTroca[], highVal: number, lowPa: number) {
  const motifs: { label: string, color: string }[] = [];
  
  const vNF = parseFloat(sale.vNF);
  const items = parseInt(sale.itens_qtd);
  const pa = items / 1;

  if (items === 1) motifs.push({ label: 'Item Único', color: 'bg-orange-100 text-orange-700' });
  if (!sale.cpf_cnpj_dest || sale.cpf_cnpj_dest.trim() === "") motifs.push({ label: 'Sem Cadastro', color: 'bg-rose-100 text-rose-700' });
  if (sale.canal === "RETIRADA_ONLINE" && !allData.some(s => s.chave_retirada_associada === sale.chave)) motifs.push({ label: 'Pickup s/ Adicional', color: 'bg-sky-100 text-sky-700' });
  if (vNF >= highVal && pa <= lowPa) motifs.push({ label: 'Potencial PA Baixo', color: 'bg-purple-100 text-purple-700' });
  if (vinculos.some(v => v.chave_saida === sale.chave && v.diferenca_itens < 0)) motifs.push({ label: 'Troca c/ Redução PA', color: 'bg-slate-200 text-slate-700' });

  return motifs;
}

function getMotifDescription(label: string): string {
  const map: Record<string, string> = {
    'Item Único': 'Esta venda possui apenas 1 produto. Oportunidade perdida de oferecer itens de impulso ou complementos no checkout.',
    'Sem Cadastro': 'Cliente não foi identificado no momento da venda. Isso impede ações de fidelização e acompanhamento da jornada de compra.',
    'Pickup s/ Adicional': 'O cliente retirou o pedido online mas não levou nenhum produto adicional da loja física.',
    'Potencial PA Baixo': 'Venda de alto valor mas com poucas peças. Geralmente indica que acessórios ou produtos relacionados foram ignorados.',
    'Troca c/ Redução PA': 'Esta troca resultou em um saldo de peças negativo (cliente devolveu mais peças do que levou novo).'
  };
  return map[label] || "";
}
