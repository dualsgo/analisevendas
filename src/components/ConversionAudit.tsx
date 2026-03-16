
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Target,
  Zap,
  Smartphone,
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  Flame,
  Info,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversionAuditProps {
  data: DetailedSaleRow[];
}

export function ConversionAudit({ data }: ConversionAuditProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("colaborador");
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

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

  const statsByVendor = useMemo(() => {
    const vendors: Record<string, any> = {};
    
    pickupOrders.forEach(order => {
      const adicionais = vinculadosMap[order.chave] || [];
      adicionais.forEach(adic => {
        const vName = adic.vendedor || "OUTROS";
        if (!vendors[vName]) vendors[vName] = { name: vName, converted: 0, rev: 0, items: 0, complexBaskets: 0 };
        vendors[vName].converted++;
        vendors[vName].rev += parseFloat(adic.vNF);
        const qItens = parseInt(adic.itens_qtd);
        vendors[vName].items += qItens;
        if (qItens >= 2) vendors[vName].complexBaskets++;
      });
    });

    return Object.values(vendors).map(v => {
      const avgPA = v.converted > 0 ? v.items / v.converted : 0;
      const score = (Math.min(v.converted / 10, 1) * 40) + (Math.min(avgPA / 2.5, 1) * 60);
      return { ...v, avgPA, score };
    }).sort((a, b) => b.score - a.score);
  }, [pickupOrders, vinculadosMap]);

  const funnelStats = useMemo(() => {
    const totalPickups = pickupOrders.length;
    const withAdicional = pickupOrders.filter(o => vinculadosMap[o.chave]?.length > 0).length;
    const rate = totalPickups > 0 ? (withAdicional / totalPickups) * 100 : 0;
    const totalRev = Object.values(vinculadosMap).flat().reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    return { totalPickups, withAdicional, rate, totalRev };
  }, [pickupOrders, vinculadosMap]);

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="ri-card bg-white p-6 space-y-2 border-none shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Retiradas Online</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-slate-800 leading-none">{funnelStats.totalPickups}</h3>
            <Smartphone className="w-5 h-5 text-slate-300" />
          </div>
        </Card>
        <Card className="ri-card bg-white p-6 space-y-2 border-none shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Com Venda Adicional</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-sky-600 leading-none">{funnelStats.withAdicional}</h3>
            <Zap className="w-5 h-5 text-sky-400" />
          </div>
        </Card>
        <Card className="ri-card bg-emerald-50 p-6 space-y-2 border-none shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Taxa de Conversão</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-black text-emerald-700 leading-none">{funnelStats.rate.toFixed(1)}%</h3>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
        </Card>
        <Card className="ri-card bg-slate-800 p-6 space-y-2 border-none shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Receita Extra Gerada</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-white leading-none">
              {funnelStats.totalRev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
        </Card>
      </div>
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-slate-100 rounded-2xl h-14 p-1 shadow-sm">
          <TabsTrigger value="colaborador" className="rounded-xl font-black text-xs uppercase data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            <Users className="w-3.5 h-3.5 mr-2" /> Inteligência de Conversão
          </TabsTrigger>
          <TabsTrigger value="diagnostico" className="rounded-xl font-black text-xs uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Activity className="w-3.5 h-3.5 mr-2" /> Diagnóstico de Gargalo
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="colaborador" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsByVendor.map((v, i) => (
              <Card 
                key={i} 
                className="ri-card overflow-hidden shadow-md cursor-pointer hover:border-sky-300 transition-all active:scale-[0.98]"
                onClick={() => setSelectedVendor(v.name)}
              >
                <div className="p-5 flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-slate-800">{v.name}</p>
                    <Badge className="bg-sky-100 text-sky-700 border-none font-black text-[8px] uppercase">
                      {v.avgPA >= 2 ? "Perfil Sniper" : "Perfil Volume"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase text-slate-400">IQ Conv.</p>
                    <p className="text-2xl font-black text-sky-600">{v.score.toFixed(0)}</p>
                  </div>
                </div>
                <CardContent className="p-5 border-t space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Vendas Adicionais</span>
                    <span className="text-sm font-black text-slate-700">{v.converted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">PA Médio na Conv.</span>
                    <span className="text-sm font-black text-orange-600">{v.avgPA.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Collaborator Details Drawer */}
          <Sheet open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
            <SheetContent className="w-full sm:max-w-xl bg-white p-0 overflow-y-auto">
              {selectedVendor && (
                <div className="h-full flex flex-col">
                  <div className="p-6 bg-slate-900 text-white">
                    <SheetHeader>
                      <SheetTitle className="text-xl font-black text-white uppercase flex items-center gap-2">
                        <Users className="w-5 h-5 text-sky-400" />
                        Auditoria: {selectedVendor}
                      </SheetTitle>
                      <SheetDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                        Detalhamento das Conversões Adicionais
                      </SheetDescription>
                    </SheetHeader>
                  </div>

                  <div className="flex-1 p-6 space-y-6">
                    {/* Filter for current vendor sales */}
                    {(() => {
                      const vendorSales: any[] = [];
                      pickupOrders.forEach(order => {
                        const adics = (vinculadosMap[order.chave] || [])
                          .filter(a => (a.vendedor || "OUTROS") === selectedVendor);
                        
                        adics.forEach(a => {
                          vendorSales.push({ order, adicional: a });
                        });
                      });

                      if (vendorSales.length === 0) return <p className="text-center py-20 text-slate-400 font-bold uppercase italic">Nenhuma conversão detalhada encontrada.</p>;

                      return (
                        <div className="space-y-4">
                          {vendorSales.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                              <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data/Hora</p>
                                  <p className="text-xs font-black text-slate-700">
                                    {format(parseISO(item.adicional.dhEmi), "dd/MM/yyyy HH:mm")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Valor do Adicional</p>
                                  <p className="text-sm font-black text-emerald-700">
                                    {parseFloat(item.adicional.vNF).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retirada (Âncora)</p>
                                  <p className="text-[11px] font-bold text-slate-600 truncate">NF #{item.order.nf} - {item.order.vendedor}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peças Adicionais</p>
                                  <p className="text-[11px] font-bold text-slate-600 truncate">{item.adicional.itens_qtd} itens</p>
                                </div>
                              </div>

                              <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Itens Vendidos</p>
                                {Object.values(item.adicional.itens).map((prod: any, pIdx: number) => (
                                  <div key={pIdx} className="flex justify-between text-[10px] font-bold text-slate-600">
                                    <span className="uppercase truncate max-w-[200px]">{prod.xProd}</span>
                                    <span>{parseFloat(prod.vProd).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <TabsContent value="diagnostico" className="space-y-6">
            <Card className="ri-card bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-3xl" />
               <div className="relative z-10 flex items-start gap-6">
                  <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md">
                    <AlertTriangle className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Onde a venda está escapando?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Cenário 1: Muita conversão, PA baixo</p>
                          <p className="text-sm font-medium leading-relaxed opacity-80 italic">
                            "A equipe está entregando o pacote e apenas oferecendo um SLP ou item de checkout. Gargalo: Faltam itens complementares de maior valor no balcão de retirada."
                          </p>
                       </div>
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Cenário 2: Baixa conversão geral</p>
                          <p className="text-sm font-medium leading-relaxed opacity-80 italic">
                            "O atendimento está sendo puramente passivo. O colaborador entrega o produto sem iniciar uma nova jornada de venda. Gargalo: Abordagem inicial de 'Boas Vindas' vs 'Entrega de Pacote'."
                          </p>
                       </div>
                    </div>
                  </div>
               </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
