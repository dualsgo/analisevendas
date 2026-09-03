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
  Zap,
  Trophy,
  Package,
  UserCheck,
  CheckCircle2
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

  const formatBRL = (val?: number | string | null) => (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const vendors = useMemo(() => {
    const v = new Set(vinculos.map(v => v.vendedor).filter(Boolean));
    return Array.from(v).sort();
  }, [vinculos]);

  const filteredVinculos = useMemo(() => {
    return vinculos.filter(v => {
      const name = v.nome_cliente || "";
      const cpf = v.cpf_cliente || "";
      const ce = v.chave_entrada || "";
      const cs = v.chave_saida || "";

      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cpf.includes(searchTerm) ||
        ce.includes(searchTerm) ||
        cs.includes(searchTerm);
      
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
    const avgScore = count > 0 ? filteredVinculos.reduce((acc, v) => acc + v.score_qualidade, 0) / count : 0;
    const itensExtra = filteredVinculos.reduce((acc, v) => acc + v.diferenca_itens, 0);

    return {
      count,
      totalDiferenca,
      avgScore,
      itensExtra,
      excelentes: filteredVinculos.filter(v => v.score_qualidade >= 80).length
    };
  }, [filteredVinculos]);

  const vendorRanking = useMemo(() => {
    const map = new Map<string, { totalTrocas: number, upsellCount: number, saldoLiquido: number, scoreSoma: number, difPecas: number }>();

    filteredVinculos.forEach(v => {
      const vend = v.vendedor || "DESCONHECIDO";
      if (!map.has(vend)) {
        map.set(vend, { totalTrocas: 0, upsellCount: 0, saldoLiquido: 0, scoreSoma: 0, difPecas: 0 });
      }
      const data = map.get(vend)!;
      data.totalTrocas++;
      if (v.valor_diferenca > 0.1) data.upsellCount++; // considera upsell se diferença > 0 (adicionando margem 0.1 por float)
      data.saldoLiquido += v.valor_diferenca;
      data.scoreSoma += v.score_qualidade;
      data.difPecas += v.diferenca_itens;
    });

    return Array.from(map.entries()).map(([nome, data]) => ({
      nome,
      totalTrocas: data.totalTrocas,
      taxaUpsell: (data.upsellCount / data.totalTrocas) * 100,
      saldoLiquido: data.saldoLiquido,
      scoreMedio: data.scoreSoma / data.totalTrocas,
      difPecas: data.difPecas
    })).sort((a, b) => {
       if (b.saldoLiquido !== a.saldoLiquido) return b.saldoLiquido - a.saldoLiquido; // Primeiro por quem gerou mais saldo líquido
       return b.taxaUpsell - a.taxaUpsell; // Desempate por taxa de upsell
    });
  }, [filteredVinculos]);

  const getSaleData = (chave: string) => data.find(d => d.chave === chave);

  // Exibe nome/cpf do veínculo mesmo quando o XML de entrada não foi importado
  const getClienteLabel = (vinc: VinculoTroca) =>
    vinc.nome_cliente?.trim() || (vinc.cpf_cliente ? `CPF: ${vinc.cpf_cliente}` : "Final Consumidor");

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* KPIs Estratégicos de Troca */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIStat label="Total de Trocas" value={stats.count} icon={ArrowRightLeft} color="text-slate-500" />
        <KPIStat label="Impacto Faturamento" value={formatBRL(stats.totalDiferenca)} icon={TrendingUp} color="text-emerald-500" />
        <KPIStat label="Saldo de Itens" value={stats.itensExtra > 0 ? `+${stats.itensExtra}` : stats.itensExtra} icon={Package} color="text-sky-500" />
        <KPIStat 
          label="Trocas de Ouro" 
          value={stats.excelentes} 
          icon={Trophy} 
          color="text-orange-500" 
          subLabel={`Score Médio: ${stats.avgScore.toFixed(0)}`}
        />
      </div>

      <Card className="ri-card shadow-sm overflow-hidden">
        <div className="p-4 bg-white space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por Cliente, CPF ou Chave da Nota..." 
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-center">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Colaborador</label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold text-xs uppercase">
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
            
            <div className="space-y-1.5 text-center">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Status Financeiro</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold text-xs uppercase">
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

      {/* Ranking de Qualidade */}
      {vendorRanking.length > 0 && vendorFilter === "all" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Ranking de Performance em Trocas</h3>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-widest w-12 text-center">Pos</th>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-widest">Colaborador</th>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Trocas Feitas</th>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Taxa de Upsell</th>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Dif. de Peças</th>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-black uppercase text-[10px] tracking-widest text-right">Saldo Líquido</th>
                    <th className="p-3 bg-slate-50 border-b text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Score Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorRanking.map((vr, i) => {
                    const isTop = i === 0;
                    return (
                      <tr key={vr.nome} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center border-r bg-white">
                           <div className={cn("w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-black", 
                              isTop ? "bg-orange-100 text-orange-600" : (i === 1 ? "bg-slate-200 text-slate-600" : (i === 2 ? "bg-amber-100 text-amber-700" : "text-slate-400")))}>
                             {i + 1}
                           </div>
                        </td>
                        <td className="p-3 font-black text-[11px] text-slate-700 uppercase bg-white">{vr.nome}</td>
                        <td className="p-3 text-center text-xs font-bold text-slate-600">{vr.totalTrocas}</td>
                        <td className="p-3 text-center">
                           <Badge className={cn("font-bold text-[10px] uppercase shadow-none", vr.taxaUpsell >= 50 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : (vr.taxaUpsell >= 25 ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"))}>
                             {vr.taxaUpsell.toFixed(0)}%
                           </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <span className={cn("text-xs font-black", vr.difPecas > 0 ? "text-emerald-500" : (vr.difPecas < 0 ? "text-rose-500" : "text-slate-400"))}>
                            {vr.difPecas > 0 ? `+${vr.difPecas}` : vr.difPecas}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={cn("font-black", vr.saldoLiquido > 0 ? "text-emerald-600" : (vr.saldoLiquido < 0 ? "text-rose-600" : "text-slate-500"))}>
                            {vr.saldoLiquido > 0 ? "+" : ""}{formatBRL(vr.saldoLiquido)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", vr.scoreMedio >= 75 ? "bg-emerald-500" : (vr.scoreMedio >= 50 ? "bg-amber-500" : "bg-rose-500"))} style={{ width: `${vr.scoreMedio}%` }} />
                             </div>
                             <span className="text-[10px] font-black text-slate-700 w-6">{vr.scoreMedio.toFixed(0)}</span>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Análise de Qualidade ({filteredVinculos.length})</h3>
        
        <Accordion type="single" collapsible className="space-y-4">
          {filteredVinculos.map((vinc, idx) => {
            const entryNote = getSaleData(vinc.chave_entrada);
            const exitNote = getSaleData(vinc.chave_saida);
            const isGood = vinc.score_qualidade >= 60;
            const isCritical = vinc.score_qualidade < 40;

            return (
              <AccordionItem key={idx} value={`troca-${idx}`} className="ri-card overflow-hidden shadow-sm">
                <AccordionTrigger className="hover:no-underline px-4 md:px-6 py-4">
                  <div className="flex-1 grid grid-cols-2 lg:grid-cols-6 gap-4 items-center text-left">
                    <div className="col-span-2 lg:col-span-1">
                      <p className="text-xs font-black text-slate-800 uppercase truncate">{getClienteLabel(vinc)}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{vinc.vendedor}</p>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Entrada (Devolução)</p>
                      <div className="flex items-center gap-1.5">
                        <ArrowDownCircle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="text-xs font-black text-slate-600 truncate">
                           {entryNote ? `NF ${entryNote.nf}` : "S/ NF"} • {formatBRL(vinc.valor_devolvido)}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                        {vinc.itens_devolvidos} ite{vinc.itens_devolvidos !== 1 ? "ns" : "m"} devolvido{vinc.itens_devolvidos !== 1 ? "s" : ""}
                      </p>
                    </div>
                    
                    <div className="hidden lg:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Saída (Nova Venda)</p>
                      <div className="flex items-center gap-1.5">
                        <ArrowUpCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="text-xs font-black text-slate-600 truncate">
                           {exitNote ? `NF ${exitNote.nf}` : "S/ NF"} • {formatBRL(vinc.valor_trocado)}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                        {vinc.itens_trocados} ite{vinc.itens_trocados !== 1 ? "ns" : "m"} levado{vinc.itens_trocados !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="hidden lg:block">
                      <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Venda Adicional</p>
                      <p className={cn("text-xs font-black", vinc.valor_diferenca > 0 ? "text-emerald-600" : (vinc.valor_diferenca < 0 ? "text-rose-600" : "text-orange-600"))}>
                        {vinc.valor_diferenca > 0 ? "+" : ""}{formatBRL(vinc.valor_diferenca)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Package className={cn("w-2.5 h-2.5", vinc.diferenca_itens > 0 ? "text-emerald-500" : (vinc.diferenca_itens < 0 ? "text-rose-500" : "text-slate-400"))} />
                        <span className="text-[9px] font-black text-slate-500">{vinc.diferenca_itens > 0 ? `+${vinc.diferenca_itens}` : vinc.diferenca_itens} itens</span>
                      </div>
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
                        isGood ? "bg-emerald-500 text-white" : (isCritical ? "bg-rose-500 text-white" : "bg-orange-400 text-white")
                      )}>
                        {vinc.diagnostico.split(' ')[0]}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 md:px-6 pb-6 pt-2 border-t border-slate-50 space-y-6">
                  {/* Dashboard de Inteligência da Troca */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="bg-slate-50 border-none p-4 flex flex-col justify-between gap-4 text-center items-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Impacto Financeiro</p>
                          <p className="text-lg font-black text-slate-700">{vinc.valor_diferenca > 0 ? `Ganho de ${formatBRL(vinc.valor_diferenca)}` : (vinc.valor_diferenca < 0 ? `Perda de ${formatBRL(Math.abs(vinc.valor_diferenca))}` : "Saldo Zero")}</p>
                        </div>
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Valor Devolvido:</span>
                          <span className="text-[9px] font-black text-slate-600">{formatBRL(vinc.valor_devolvido)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Valor Nova Venda:</span>
                          <span className="text-[9px] font-black text-slate-600">{formatBRL(vinc.valor_trocado)}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-slate-50 border-none p-4 flex flex-col justify-between gap-4 text-center items-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Package className="w-4 h-4 text-sky-500" /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Variação de PA</p>
                          <p className="text-lg font-black text-slate-700">{vinc.diferenca_itens > 0 ? `+${vinc.diferenca_itens} itens no cupom` : (vinc.diferenca_itens < 0 ? `${vinc.diferenca_itens} itens (perda)` : "Mesma quantidade")}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-500 leading-tight uppercase">
                          A troca resultou em um PA de {vinc.itens_trocados} itens, contra {vinc.itens_devolvidos} itens devolvidos pelo cliente.
                        </p>
                      </div>
                    </Card>

                    <Card className={cn("border-none p-4 flex flex-col justify-between gap-4 shadow-sm text-center items-center", isGood ? "bg-emerald-50" : (isCritical ? "bg-rose-50" : "bg-orange-50"))}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Zap className={cn("w-4 h-4", isGood ? "text-emerald-500" : "text-orange-500")} /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Conclusão Estratégica</p>
                          <p className={cn("text-sm font-black uppercase leading-tight", isGood ? "text-emerald-700" : "text-orange-700")}>{vinc.diagnostico}</p>
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 leading-tight uppercase">
                        {vinc.cpf_cliente ? "Cliente identificado. Operação rastreável e segura." : "Atenção: Cliente não identificado nesta operação."}
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    {/* Detalhe da Devolução */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-rose-500 flex items-center gap-2">
                        <ArrowDownCircle className="w-3 h-3" /> Itens Devolvidos (Entrada){entryNote ? ` - NF ${entryNote.nf}` : " — XML de entrada não carregado"}
                      </h4>
                      <div className="space-y-2">
                        {entryNote?.itens.map((it, i) => (
                          <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="min-w-0 pr-4">
                              <p className="text-[10px] font-black text-slate-700 uppercase truncate">{it.xProd}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase">Cod: {it.cProd}</p>
                            </div>
                            <span className="text-[10px] font-black text-slate-600 whitespace-nowrap">{formatBRL(it.vProd)}</span>
                          </div>
                        ))}
                        {!entryNote && (
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                            <p className="text-[10px] text-rose-600 font-bold">
                              Valor devolvido: <strong>{formatBRL(vinc.valor_devolvido)}</strong> · {vinc.itens_devolvidos} ite{vinc.itens_devolvidos !== 1 ? "ns" : "m"}
                            </p>
                            <p className="text-[9px] text-rose-400 mt-0.5">Importe o XML de entrada (devolução) para ver os itens.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detalhe da Troca */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2">
                        <ArrowUpCircle className="w-3 h-3" /> Itens Novos (Saída) - NF {exitNote?.nf}
                      </h4>
                      <div className="space-y-2">
                        {exitNote?.itens.map((it, i) => (
                          <div key={i} className="flex justify-between items-center p-2.5 bg-white border-2 border-emerald-50 rounded-xl">
                            <div className="min-w-0 pr-4">
                              <p className="text-[10px] font-black text-slate-700 uppercase truncate">{it.xProd}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase">Cod: {it.cProd}</p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 whitespace-nowrap">{formatBRL(it.vProd)}</span>
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
    <Card className="ri-card p-4 md:p-5 flex flex-col items-center justify-center text-center gap-3 shadow-sm min-h-[110px]">
      <div className="flex items-center justify-center">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-sm md:text-xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
        {subLabel && <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">{subLabel}</p>}
      </div>
    </Card>
  );
}
