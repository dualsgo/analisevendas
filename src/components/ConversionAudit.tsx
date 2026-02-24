
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Target,
  Zap,
  ChevronRight,
  Smartphone,
  Trophy,
  Users,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  History,
  ShoppingBag,
  Star,
  Activity,
  Award,
  Flame,
  Boxes
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversionAuditProps {
  data: DetailedSaleRow[];
}

export function ConversionAudit({ data }: ConversionAuditProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<DetailedSaleRow | null>(null);
  const [activeView, setActiveView] = useState("colaborador");

  const pickupOrders = useMemo(() => {
    return data.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  }, [data]);

  const vinculadosMap = useMemo(() => {
    const map: Record<string, DetailedSaleRow[]> = {};
    data.forEach(r => {
      if (r.chave_retirada_associada) {
        if (!map[r.chave_retirada_associada]) map[r.chave_retirada_associada] = [];
        map[r.chave_retirada_associada].push(r);
      }
    });
    return map;
  }, [data]);

  // --- ESTATÍSTICAS MULTIDIMENSIONAIS POR COLABORADOR ---
  const statsByVendor = useMemo(() => {
    const vendors: Record<string, any> = {};
    
    pickupOrders.forEach(order => {
      const adicionais = vinculadosMap[order.chave] || [];
      
      adicionais.forEach(adic => {
        const vName = adic.vendedor || "OUTROS";
        const dateKey = adic.dhEmi.substring(0, 10);

        if (!vendors[vName]) {
          vendors[vName] = { 
            name: vName, 
            converted: 0, 
            rev: 0, 
            items: 0, 
            dailyCounts: {} as Record<string, number>,
            complexBaskets: 0 // Vendas com PA > 2
          };
        }

        vendors[vName].converted++;
        vendors[vName].rev += parseFloat(adic.vNF);
        const qItens = parseInt(adic.itens_qtd);
        vendors[vName].items += qItens;
        
        if (qItens >= 2) vendors[vName].complexBaskets++;
        
        vendors[vName].dailyCounts[dateKey] = (vendors[vName].dailyCounts[dateKey] || 0) + 1;
      });
    });

    return Object.values(vendors).map(v => {
      const avgPA = v.converted > 0 ? v.items / v.converted : 0;
      const tkm = v.converted > 0 ? v.rev / v.converted : 0;
      
      // Análise de Consistência
      const daysActive = Object.keys(v.dailyCounts).length;
      const multiConversionDays = Object.values(v.dailyCounts).filter((c: any) => c > 1).length;
      const hattricks = Object.values(v.dailyCounts).filter((c: any) => c >= 3).length;

      // Cálculo do IQ de Conversão (0-100)
      // Pesos: Volume (30%), Profundidade PA (30%), Consistência/Hattricks (20%), Valor Financeiro (20%)
      let score = (Math.min(v.converted / 10, 1) * 30) + 
                  (Math.min(avgPA / 2.5, 1) * 30) + 
                  (Math.min(multiConversionDays / 3, 1) * 20) + 
                  (Math.min(tkm / 200, 1) * 20);

      let level: 'SNIPER' | 'VOLUME' | 'EVOLUCAO' = 'VOLUME';
      if (score >= 75 || hattricks > 0) level = 'SNIPER';
      else if (score < 40) level = 'EVOLUCAO';

      return { ...v, avgPA, tkm, score, level, multiConversionDays, hattricks, daysActive };
    }).sort((a, b) => b.score - a.score);
  }, [pickupOrders, vinculadosMap]);

  const statsByDay = useMemo(() => {
    const days: Record<string, any> = {};
    pickupOrders.forEach(order => {
      const day = order.dhEmi.substring(0, 10);
      if (!days[day]) days[day] = { day, total: 0, converted: 0, rev: 0 };
      days[day].total++;
      if (vinculadosMap[order.chave]) {
        days[day].converted++;
        days[day].rev += vinculadosMap[order.chave].reduce((acc, a) => acc + parseFloat(a.vNF), 0);
      }
    });
    return Object.values(days).sort((a, b) => b.day.localeCompare(a.day));
  }, [pickupOrders, vinculadosMap]);

  const filteredOrders = useMemo(() => {
    return pickupOrders.filter(order => 
      order.nf.includes(searchTerm) || 
      order.nome_dest.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.cpf_cnpj_dest || "").includes(searchTerm)
    ).sort((a, b) => b.dhEmi.localeCompare(a.dhEmi));
  }, [pickupOrders, searchTerm]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Guia Didático de Gestão */}
      <div className="bg-white rounded-[2rem] p-6 border-2 border-sky-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="bg-sky-500 p-4 rounded-3xl text-white shadow-lg shadow-sky-100 shrink-0">
          <Trophy className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800 italic">Matriz de Delegação Sniper</h1>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Não olhamos apenas para a taxa. Premiamos quem traz <strong>profundidade de itens</strong> e <strong>consistência diária</strong>. 
            Priorize a entrega de pickups para os colaboradores de nível <span className="text-orange-500 font-black">SNIPER ELITE</span>.
          </p>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border-2 border-slate-100 rounded-2xl h-14 p-1 shadow-sm">
          <TabsTrigger value="colaborador" className="rounded-xl font-black text-[10px] md:text-xs uppercase data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            <Users className="w-3.5 h-3.5 mr-2" /> Inteligência Individual
          </TabsTrigger>
          <TabsTrigger value="dia" className="rounded-xl font-black text-[10px] md:text-xs uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Calendar className="w-3.5 h-3.5 mr-2" /> Ritmo Diário
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="rounded-xl font-black text-[10px] md:text-xs uppercase data-[state=active]:bg-slate-800 data-[state=active]:text-white">
            <Activity className="w-3.5 h-3.5 mr-2" /> Log de Transações
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* VISÃO POR COLABORADOR - NOVA LÓGICA */}
          <TabsContent value="colaborador" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statsByVendor.map((v, i) => (
                <Card key={i} className="ri-card border-none bg-white overflow-hidden shadow-md flex flex-col">
                  <div className={cn(
                    "p-5 flex justify-between items-start",
                    v.level === 'SNIPER' ? "bg-slate-900 text-white" : "bg-white"
                  )}>
                    <div className="space-y-1">
                      <p className={cn("text-xs font-black uppercase", v.level === 'SNIPER' ? "text-orange-400" : "text-slate-800")}>{v.name}</p>
                      <div className="flex items-center gap-2">
                        {v.level === 'SNIPER' ? (
                          <Badge className="bg-orange-500 text-white border-none font-black text-[8px] uppercase gap-1">
                            <Flame className="w-2.5 h-2.5" /> Sniper Elite
                          </Badge>
                        ) : v.level === 'EVOLUCAO' ? (
                          <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[8px] uppercase">Focar Abordagem</Badge>
                        ) : (
                          <Badge className="bg-sky-100 text-sky-700 border-none font-black text-[8px] uppercase">Consistent Volume</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[8px] font-black uppercase opacity-60", v.level === 'SNIPER' ? "text-white" : "text-slate-400")}>Conversão IQ</p>
                      <p className={cn("text-2xl font-black", v.level === 'SNIPER' ? "text-white" : "text-sky-600")}>{v.score.toFixed(0)}</p>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-5 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Vendas Realizadas</p>
                        <p className="text-sm font-black text-slate-700">{v.converted} atend.</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Faturamento Extra</p>
                        <p className="text-sm font-black text-emerald-600">{formatBRL(v.rev)}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase">PA Médio</p>
                        <p className={cn("text-xs font-black", v.avgPA >= 2 ? "text-emerald-600" : "text-slate-600")}>{v.avgPA.toFixed(2)}</p>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <p className="text-[7px] font-black text-slate-400 uppercase">Multi-Day</p>
                        <p className="text-xs font-black text-slate-600">{v.multiConversionDays} d</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[7px] font-black text-slate-400 uppercase">Hattricks</p>
                        <p className={cn("text-xs font-black", v.hattricks > 0 ? "text-orange-500" : "text-slate-300")}>{v.hattricks}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Índice de Cesta Complexa</p>
                          <span className="text-[9px] font-black text-slate-700">{((v.complexBaskets / v.converted || 0) * 100).toFixed(0)}%</span>
                       </div>
                       <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-1000", v.level === 'SNIPER' ? "bg-orange-500" : "bg-sky-500")} 
                            style={{ width: `${(v.complexBaskets / v.converted || 0) * 100}%` }} 
                          />
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* VISÃO POR DIA */}
          <TabsContent value="dia" className="space-y-4">
            <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-50">
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-8">Data</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Retiradas</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Conversões</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Taxa Sucesso</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right pr-8">Venda Incremental</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsByDay.map((d, i) => (
                    <TableRow key={i} className="hover:bg-slate-50 border-slate-50 h-14">
                      <TableCell className="pl-8 font-black text-slate-700 uppercase text-xs">
                        {format(parseISO(d.day), "dd/MM (eee)", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-500">{d.total}</TableCell>
                      <TableCell className="text-center font-bold text-sky-600">{d.converted}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "font-black border-none",
                          (d.converted / d.total) >= 0.2 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {((d.converted / d.total) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8 font-black text-emerald-600">{formatBRL(d.rev)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* VISÃO TRANSAÇÕES */}
          <TabsContent value="atendimentos" className="space-y-4">
            <Card className="ri-card border-none shadow-sm overflow-hidden mb-4">
              <div className="p-3 bg-white flex items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por NF, CPF ou Cliente..." 
                    className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-10 text-xs font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-50">
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-8">NF / Data</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Cliente</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Valor Site</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Status Adicional</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const adicionais = vinculadosMap[order.chave] || [];
                    const hasAdicional = adicionais.length > 0;
                    const valorAdicional = adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);

                    return (
                      <TableRow key={order.chave} className="hover:bg-slate-50 border-slate-50 cursor-pointer group h-16" onClick={() => setSelectedOrder(order)}>
                        <TableCell className="pl-8">
                          <p className="text-xs font-black text-slate-700">#{order.nf}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{format(parseISO(order.dhEmi), "dd/MM HH:mm")}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-black text-slate-700 uppercase truncate max-w-[180px]">{order.nome_dest}</p>
                          <p className="text-[9px] text-slate-400 font-bold">CPF: {order.cpf_cnpj_dest ? `***.${order.cpf_cnpj_dest.slice(-4)}` : "---"}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-xs font-black text-slate-700">{formatBRL(parseFloat(order.vNF))}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          {hasAdicional ? (
                            <div className="flex flex-col items-center">
                              <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase px-2 h-4">Convertido</Badge>
                              <p className="text-[9px] text-emerald-600 font-black mt-0.5">+{formatBRL(valorAdicional)}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-300 border-slate-200 text-[8px] font-black uppercase px-2 h-4">Sem Adicional</Badge>
                          )}
                        </TableCell>
                        <TableCell><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-all" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-sky-500 p-0 overflow-y-auto">
          {selectedOrder && (
            <div className="h-full flex flex-col">
              <div className="p-8 bg-sky-500 text-white space-y-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6" />
                  <div>
                    <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white leading-none">Auditoria NF #{selectedOrder.nf}</SheetTitle>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Retirada Online</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">Cliente</p>
                    <p className="text-sm font-black uppercase">{selectedOrder.nome_dest}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase opacity-80">Valor Pedido Site</p>
                    <p className="text-xl font-black">{formatBRL(parseFloat(selectedOrder.vNF))}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" /> Itens Originais do Site
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="min-w-0 pr-4">
                          <p className="text-xs font-black text-slate-700 truncate uppercase">{item.xProd}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                        </div>
                        <p className="text-xs font-black text-slate-600">{formatBRL(item.vProd)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Atendimento Adicional Presencial
                  </h4>
                  {vinculadosMap[selectedOrder.chave] ? (
                    <div className="space-y-4">
                      {vinculadosMap[selectedOrder.chave].map((adic, aIdx) => (
                        <div key={aIdx} className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-100 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="text-xs font-black text-emerald-800 uppercase leading-none">{adic.vendedor}</p>
                              <p className="text-[10px] font-bold text-emerald-600 uppercase">Cupom #{adic.nf} • {format(parseISO(adic.dhEmi), "dd/MM HH:mm")}</p>
                            </div>
                            <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase border-none">Sucesso</Badge>
                          </div>
                          
                          <div className="space-y-2 border-t border-emerald-100 pt-3">
                            {adic.itens.map((it, iIdx) => (
                              <div key={iIdx} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-emerald-700 uppercase truncate max-w-[200px]">{it.xProd}</span>
                                <span className="font-black text-emerald-800">{formatBRL(it.vProd)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-end pt-2 border-t border-emerald-100">
                            <p className="text-[9px] font-bold text-emerald-600 uppercase">Valor Incremental:</p>
                            <p className="text-base font-black text-emerald-800">{formatBRL(parseFloat(adic.vNF))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-10 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                      <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-black text-slate-400 uppercase">Oportunidade Perdida</p>
                      <p className="text-[10px] text-slate-400 font-medium px-4 mt-1">Nenhum registro presencial vinculado a este CPF no dia.</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedOrder(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl py-6 uppercase">CONCLUIR AUDITORIA</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
