"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  User,
  ShoppingBag,
  Info,
  Calendar,
  XCircle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface ExchangeManagementProps {
  data: DetailedSaleRow[];
  vinculos: VinculoTroca[];
}

export function ExchangeManagement({ data, vinculos }: ExchangeManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Lista de vendedores únicos
  const vendors = useMemo(() => {
    const v = new Set(vinculos.map(v => v.vendedor).filter(Boolean));
    return Array.from(v).sort();
  }, [vinculos]);

  // Filtrar Vínculos
  const filteredVinculos = useMemo(() => {
    return vinculos.filter(v => {
      const matchesSearch = 
        v.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.cpf_cliente.includes(searchTerm) ||
        v.chave_entrada.includes(searchTerm) ||
        v.chave_saida.includes(searchTerm);
      
      const matchesVendor = vendorFilter === "all" || v.vendedor === vendorFilter;
      
      let matchesStatus = true;
      if (statusFilter === "compensated") matchesStatus = Math.abs(v.valor_diferenca) < 0.1;
      if (statusFilter === "complementary") matchesStatus = v.valor_diferenca > 0.1;
      if (statusFilter === "credit") matchesStatus = v.valor_diferenca < -0.1;

      return matchesSearch && matchesVendor && matchesStatus;
    });
  }, [vinculos, searchTerm, vendorFilter, statusFilter]);

  // KPIs
  const stats = useMemo(() => {
    const count = filteredVinculos.length;
    const totalDevolvido = filteredVinculos.reduce((acc, v) => acc + v.valor_devolvido, 0);
    const totalUtilizado = filteredVinculos.reduce((acc, v) => acc + v.valor_trocado, 0);
    const totalDiferenca = filteredVinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const totalItensDev = filteredVinculos.reduce((acc, v) => acc + v.itens_devolvidos, 0);
    const totalItensTro = filteredVinculos.reduce((acc, v) => acc + v.itens_trocados, 0);

    return {
      count,
      totalDevolvido,
      totalUtilizado,
      totalDiferenca,
      totalItensDev,
      totalItensTro,
      avgDiff: count > 0 ? totalDiferenca / count : 0,
      percCompensado: count > 0 ? (filteredVinculos.filter(v => Math.abs(v.valor_diferenca) < 0.1).length / count) * 100 : 0
    };
  }, [filteredVinculos]);

  // Função para buscar dados da nota no array original
  const getSaleData = (chave: string) => data.find(d => d.chave === chave);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* KPIs do Canal de Trocas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIStat label="Total de Trocas" value={stats.count} icon={ArrowRightLeft} color="text-slate-500" />
        <KPIStat label="Total Devolvido" value={formatBRL(stats.totalDevolvido)} icon={ArrowDownCircle} color="text-rose-500" />
        <KPIStat label="Saldo Gerado" value={formatBRL(stats.totalDiferenca)} icon={TrendingUp} color="text-emerald-500" />
        <KPIStat 
          label="Compensadas" 
          value={`${stats.percCompensado.toFixed(1)}%`} 
          icon={CheckCircle2} 
          color="text-orange-500" 
          subLabel="Saldo Zero"
        />
      </div>

      {/* Filtros */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <div className="p-4 bg-white space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por Cliente, CPF ou Chave da Nota..." 
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Colaborador</label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold">
                  <SelectValue placeholder="Todos os Vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Vendedores</SelectItem>
                  {vendors.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Status Financeiro</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold">
                  <SelectValue placeholder="Qualquer Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer Status</SelectItem>
                  <SelectItem value="compensated">Saldo Compensado</SelectItem>
                  <SelectItem value="complementary">Pagamento Complementar</SelectItem>
                  <SelectItem value="credit">Crédito Gerado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista Agrupada com Accordion */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Gestão de Trocas Vinculadas ({filteredVinculos.length})</h3>
        
        <Accordion type="single" collapsible className="space-y-4">
          {filteredVinculos.map((vinc, idx) => {
            const entryNote = getSaleData(vinc.chave_entrada);
            const exitNote = getSaleData(vinc.chave_saida);
            const statusColor = vinc.valor_diferenca > 0.1 ? "emerald" : (vinc.valor_diferenca < -0.1 ? "rose" : "orange");
            const isLossInPA = vinc.diferenca_itens < 0;

            return (
              <AccordionItem key={idx} value={`troca-${idx}`} className="ri-card border-none bg-white overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline px-4 md:px-6 py-4">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 items-center text-left">
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-xs font-black text-slate-800 uppercase truncate">{vinc.nome_cliente || "Final Consumidor"}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{format(parseISO(vinc.data_entrada), "dd/MM/yy")}</p>
                    </div>
                    
                    <div className="hidden md:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Entrada</p>
                      <p className="text-xs font-black text-slate-600">{formatBRL(vinc.valor_devolvido)}</p>
                    </div>

                    <div className="hidden md:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Saída</p>
                      <p className="text-xs font-black text-slate-600">{formatBRL(vinc.valor_trocado)}</p>
                    </div>

                    <div className="text-right md:text-left">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Diferença</p>
                      <p className={cn("text-xs font-black", vinc.valor_diferenca > 0 ? "text-emerald-600" : (vinc.valor_diferenca < 0 ? "text-rose-600" : "text-orange-600"))}>
                        {vinc.valor_diferenca > 0 ? "+" : ""}{formatBRL(vinc.valor_diferenca)}
                      </p>
                    </div>

                    <div className="col-span-1 md:text-right">
                      <Badge className={cn(
                        "text-[8px] font-black uppercase border-none",
                        statusColor === "emerald" ? "bg-emerald-500 text-white" : (statusColor === "rose" ? "bg-rose-500 text-white" : "bg-orange-500 text-white")
                      )}>
                        {vinc.valor_diferenca > 0.1 ? "Complementar" : (vinc.valor_diferenca < -0.1 ? "Crédito" : "Compensada")}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 md:px-6 pb-6 pt-2 border-t border-slate-50 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Detalhe da Devolução */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-[10px] font-black uppercase text-rose-500 flex items-center gap-2">
                          <ArrowDownCircle className="w-3 h-3" /> Nota de Entrada (Devolução)
                        </h4>
                        <span className="text-[10px] font-black text-slate-400">NF: {entryNote?.nf || "N/A"}</span>
                      </div>
                      <div className="space-y-2">
                        {entryNote?.itens.map((it, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-[10px] font-black text-slate-700 truncate uppercase">{it.xProd}</p>
                              <p className="text-[9px] text-slate-400 font-bold">Qtd: {it.qCom}</p>
                            </div>
                            <span className="text-[10px] font-black text-slate-600">{formatBRL(it.vProd)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detalhe da Troca */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2">
                          <ArrowUpCircle className="w-3 h-3" /> Nota de Saída (Nova Venda)
                        </h4>
                        <span className="text-[10px] font-black text-slate-400">NF: {exitNote?.nf || "N/A"}</span>
                      </div>
                      <div className="space-y-2">
                        {exitNote?.itens.map((it, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-[10px] font-black text-slate-700 truncate uppercase">{it.xProd}</p>
                              <p className="text-[9px] text-slate-400 font-bold">Qtd: {it.qCom}</p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600">{formatBRL(it.vProd)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resumo Final da Sessão */}
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white rounded-xl shadow-sm">
                          <User className="w-4 h-4 text-slate-400" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Colaborador</p>
                          <p className="text-xs font-black text-slate-800 uppercase">{vinc.vendedor}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-6 text-center md:text-right">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Diferença Peças</p>
                          <p className={cn("text-sm font-black", vinc.diferenca_itens >= 0 ? "text-emerald-600" : "text-rose-600")}>
                             {vinc.diferenca_itens > 0 ? "+" : ""}{vinc.diferenca_itens} ITENS
                          </p>
                       </div>
                       <div className="w-px h-8 bg-slate-200 hidden md:block" />
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Impacto Saldo</p>
                          <p className={cn("text-lg font-black", vinc.valor_diferenca >= 0 ? "text-emerald-600" : "text-rose-600")}>
                             {formatBRL(vinc.valor_diferenca)}
                          </p>
                       </div>
                    </div>
                  </div>
                  
                  {isLossInPA && (
                    <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 flex items-center gap-3">
                       <AlertTriangle className="w-4 h-4 shrink-0" />
                       <p className="text-[10px] font-bold">Atenção: Esta troca resultou em redução de PA (Cliente levou menos peças do que devolveu).</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

function KPIStat({ label, value, icon: Icon, color, subLabel }: { label: string, value: string | number, icon: any, color: string, subLabel?: string }) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {subLabel && <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{subLabel}</span>}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm md:text-xl font-black text-slate-800">{value}</p>
      </div>
    </Card>
  );
}
