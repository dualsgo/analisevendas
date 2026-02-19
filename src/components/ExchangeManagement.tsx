
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
  ArrowRight,
  Clock,
  Zap,
  Users,
  Trophy
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

  const vendors = useMemo(() => {
    const v = new Set(vinculos.map(v => v.vendedor).filter(Boolean));
    return Array.from(v).sort();
  }, [vinculos]);

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

  const stats = useMemo(() => {
    const count = filteredVinculos.length;
    const totalDiferenca = filteredVinculos.reduce((acc, v) => acc + v.valor_diferenca, 0);
    const avgTime = count > 0 ? filteredVinculos.reduce((acc, v) => acc + v.tempo_atendimento_min, 0) / count : 0;
    const avgScore = count > 0 ? filteredVinculos.reduce((acc, v) => acc + v.score_qualidade, 0) / count : 0;

    return {
      count,
      totalDiferenca,
      avgTime,
      avgScore,
      excelentes: filteredVinculos.filter(v => v.score_qualidade >= 80).length
    };
  }, [filteredVinculos]);

  const getSaleData = (chave: string) => data.find(d => d.chave === chave);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* KPIs Estratégicos de Troca */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIStat label="Total de Trocas" value={stats.count} icon={ArrowRightLeft} color="text-slate-500" />
        <KPIStat label="Impacto Venda" value={formatBRL(stats.totalDiferenca)} icon={TrendingUp} color="text-emerald-500" />
        <KPIStat label="Tempo Médio" value={`${stats.avgTime.toFixed(0)} min`} icon={Clock} color="text-sky-500" />
        <KPIStat 
          label="Trocas de Ouro" 
          value={stats.excelentes} 
          icon={Trophy} 
          color="text-orange-500" 
          subLabel={`Score Médio: ${stats.avgScore.toFixed(0)}`}
        />
      </div>

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

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Análise de Eficiência ({filteredVinculos.length})</h3>
        
        <Accordion type="single" collapsible className="space-y-4">
          {filteredVinculos.map((vinc, idx) => {
            const entryNote = getSaleData(vinc.chave_entrada);
            const exitNote = getSaleData(vinc.chave_saida);
            const isGood = vinc.score_qualidade >= 60;
            const isCritical = vinc.score_qualidade < 40;

            return (
              <AccordionItem key={idx} value={`troca-${idx}`} className="ri-card border-none bg-white overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline px-4 md:px-6 py-4">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 items-center text-left">
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-xs font-black text-slate-800 uppercase truncate">{vinc.nome_cliente || "Final Consumidor"}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{vinc.vendedor}</p>
                    </div>
                    
                    <div className="hidden md:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Tempo</p>
                      <div className="flex items-center gap-1.5">
                        <Clock className={cn("w-3 h-3", vinc.tempo_atendimento_min > 25 ? "text-rose-500" : "text-sky-500")} />
                        <span className="text-xs font-black text-slate-600">{vinc.tempo_atendimento_min} min</span>
                      </div>
                    </div>

                    <div className="hidden md:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Diferença</p>
                      <p className={cn("text-xs font-black", vinc.valor_diferenca > 0 ? "text-emerald-600" : (vinc.valor_diferenca < 0 ? "text-rose-600" : "text-orange-600"))}>
                        {vinc.valor_diferenca > 0 ? "+" : ""}{formatBRL(vinc.valor_diferenca)}
                      </p>
                    </div>

                    <div className="text-right md:text-left">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Score Qualidade</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[60px] hidden sm:block">
                          <div 
                            className={cn("h-full rounded-full", isGood ? "bg-emerald-500" : (isCritical ? "bg-rose-500" : "bg-orange-500"))} 
                            style={{ width: `${vinc.score_qualidade}%` }} 
                          />
                        </div>
                        <span className="text-xs font-black text-slate-700">{vinc.score_qualidade}</span>
                      </div>
                    </div>

                    <div className="col-span-1 md:text-right">
                      <Badge className={cn(
                        "text-[8px] font-black uppercase border-none",
                        isGood ? "bg-emerald-500 text-white" : (isCritical ? "bg-rose-500 text-white" : "bg-orange-500 text-white")
                      )}>
                        {vinc.diagnostico.split(' ')[0]}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 md:px-6 pb-6 pt-2 border-t border-slate-50 space-y-6">
                  {/* Dashboard de Eficiência da Troca */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="bg-slate-50 border-none p-4 flex flex-col justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Clock className="w-4 h-4 text-sky-500" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Tempo de Atendimento</p>
                          <p className="text-lg font-black text-slate-700">{vinc.tempo_atendimento_min} minutos</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Início: {format(parseISO(vinc.data_entrada), "HH:mm")}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Fim: {format(parseISO(vinc.data_saida), "HH:mm")}</p>
                      </div>
                    </Card>

                    <Card className="bg-slate-50 border-none p-4 flex flex-col justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Users className="w-4 h-4 text-purple-500" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Custo de Oportunidade</p>
                          <p className="text-lg font-black text-slate-700">{vinc.atendimentos_loja_intervalo} Vendas na Loja</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Vendedor atendeu +{vinc.atendimentos_vendedor_intervalo} clientes</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Enquanto processava esta troca</p>
                      </div>
                    </Card>

                    <Card className={cn("border-none p-4 flex flex-col justify-between gap-4", isGood ? "bg-emerald-50" : (isCritical ? "bg-rose-50" : "bg-orange-50"))}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Zap className={cn("w-4 h-4", isGood ? "text-emerald-500" : "text-orange-500")} /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Diagnóstico Ri Happy</p>
                          <p className={cn("text-sm font-black uppercase", isGood ? "text-emerald-700" : "text-orange-700")}>{vinc.diagnostico}</p>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 leading-tight uppercase">
                        Score {vinc.score_qualidade}/100 baseado em Upsell, PA e Eficiência Temporal.
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* Detalhe da Devolução */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-rose-500 flex items-center gap-2">
                        <ArrowDownCircle className="w-3 h-3" /> Devolução (Entrada) - NF {entryNote?.nf}
                      </h4>
                      <div className="space-y-2">
                        {entryNote?.itens.map((it, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                            <span className="text-[10px] font-black text-slate-700 uppercase truncate">{it.xProd}</span>
                            <span className="text-[10px] font-black text-slate-600">{formatBRL(it.vProd)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detalhe da Troca */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2">
                        <ArrowUpCircle className="w-3 h-3" /> Nova Venda (Saída) - NF {exitNote?.nf}
                      </h4>
                      <div className="space-y-2">
                        {exitNote?.itens.map((it, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded-lg">
                            <span className="text-[10px] font-black text-slate-700 uppercase truncate">{it.xProd}</span>
                            <span className="text-[10px] font-black text-emerald-600">{formatBRL(it.vProd)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
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
