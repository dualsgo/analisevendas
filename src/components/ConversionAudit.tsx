
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  ArrowRight,
  ShoppingBag,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Target,
  Zap,
  AlertTriangle,
  ChevronRight,
  Smartphone,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface ConversionAuditProps {
  data: DetailedSaleRow[];
}

export function ConversionAudit({ data }: ConversionAuditProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAdicional, setFilterAdicional] = useState<"all" | "with" | "without">("all");
  const [selectedOrder, setSelectedOrder] = useState<DetailedSaleRow | null>(null);

  // Filtrar apenas pedidos de Retirada Online
  const pickupOrders = useMemo(() => {
    return data.filter(r => r.canal === "RETIRADA_ONLINE" && !r.is_cancelada);
  }, [data]);

  // Mapear adicionais vinculados para acesso rápido
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

  // Aplicar filtros de pesquisa e status
  const filteredOrders = useMemo(() => {
    return pickupOrders.filter(order => {
      const matchesSearch = 
        order.nf.includes(searchTerm) || 
        order.cpf_cnpj_dest.includes(searchTerm) || 
        order.nome_dest.toLowerCase().includes(searchTerm.toLowerCase());
      
      const hasAdicional = !!vinculadosMap[order.chave];
      const matchesAdicional = 
        filterAdicional === "all" || 
        (filterAdicional === "with" && hasAdicional) || 
        (filterAdicional === "without" && !hasAdicional);

      return matchesSearch && matchesAdicional;
    });
  }, [pickupOrders, searchTerm, filterAdicional, vinculadosMap]);

  // KPIs do Canal
  const stats = useMemo(() => {
    const total = pickupOrders.length;
    const comAdicional = pickupOrders.filter(o => !!vinculadosMap[o.chave]).length;
    const valorPickup = pickupOrders.reduce((acc, o) => acc + parseFloat(o.vNF), 0);
    const valorAdicional = Object.values(vinculadosMap).flat().reduce((acc, o) => acc + parseFloat(o.vNF), 0);
    const taxaConversao = total > 0 ? (comAdicional / total) * 100 : 0;
    
    // Oportunidade perdida: 1 item e sem adicional
    const oportunidadesPerdidas = pickupOrders.filter(o => parseInt(o.itens_qtd) === 1 && !vinculadosMap[o.chave]).length;

    return {
      total,
      valorPickup,
      comAdicional,
      valorAdicional,
      taxaConversao,
      oportunidadesPerdidas,
      tkm: total > 0 ? valorPickup / total : 0,
      pa: total > 0 ? pickupOrders.reduce((acc, o) => acc + parseInt(o.itens_qtd), 0) / total : 0
    };
  }, [pickupOrders, vinculadosMap]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Resumo do Canal Pickup */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIStat label="Pedidos Pickup" value={stats.total} icon={Smartphone} color="text-sky-500" />
        <KPIStat label="Taxa Conversão" value={`${stats.taxaConversao.toFixed(1)}%`} icon={Target} color="text-orange-500" />
        <KPIStat label="Venda Adicional" value={formatBRL(stats.valorAdicional)} icon={Zap} color="text-emerald-500" />
        <KPIStat 
          label="Oport. Perdidas" 
          value={stats.oportunidadesPerdidas} 
          icon={AlertTriangle} 
          color="text-rose-500" 
          subLabel="1 item s/ adicional"
        />
      </div>

      {/* Filtros */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <div className="p-4 bg-white flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por Pedido, CPF ou Cliente..." 
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterAdicional} onValueChange={(v: any) => setFilterAdicional(v)}>
            <SelectTrigger className="w-full md:w-64 rounded-xl border-slate-100 bg-slate-50/50">
              <SelectValue placeholder="Status Adicional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Pedidos</SelectItem>
              <SelectItem value="with">Com Adicional</SelectItem>
              <SelectItem value="without">Sem Adicional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Listagem Responsiva */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Auditoria de Pedidos ({filteredOrders.length})</h3>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-xl shadow-slate-100/50">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-50">
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Pedido/Data</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Cliente</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Vendedor</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Valor Pickup</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Status Adicional</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const adicionais = vinculadosMap[order.chave] || [];
                const hasAdicional = adicionais.length > 0;
                const valorAdicional = adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);

                return (
                  <TableRow key={order.chave} className="hover:bg-sky-50/30 border-slate-50 cursor-pointer group" onClick={() => setSelectedOrder(order)}>
                    <TableCell>
                      <p className="text-xs font-black text-slate-700">#{order.nf}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(order.dhEmi), "dd/MM HH:mm")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-black text-slate-700 uppercase truncate max-w-[150px]">{order.nome_dest}</p>
                      <p className="text-[10px] text-slate-400 font-bold">***.{order.cpf_cnpj_dest.slice(-4)}-**</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500">
                        {order.vendedor}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-xs font-black text-slate-700">{formatBRL(parseFloat(order.vNF))}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{order.itens_qtd} ITENS</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasAdicional ? (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-black">COM ADICIONAL</Badge>
                          <p className="text-[10px] text-emerald-600 font-black mt-1">+{formatBRL(valorAdicional)}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[9px] font-black">SEM ADICIONAL</Badge>
                      )}
                    </TableCell>
                    <TableCell><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-3">
          {filteredOrders.map((order) => {
            const adicionais = vinculadosMap[order.chave] || [];
            const hasAdicional = adicionais.length > 0;
            const valorAdicional = adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);

            return (
              <div key={order.chave} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-3" onClick={() => setSelectedOrder(order)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-sm font-black text-slate-800">Pedido #{order.nf}</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(order.dhEmi), "dd/MM/yy HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{formatBRL(parseFloat(order.vNF))}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{order.itens_qtd} ITENS</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 py-2 border-y border-slate-50">
                  <div className="p-2 bg-slate-50 rounded-lg"><User className="w-3 h-3 text-slate-400" /></div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-slate-700 uppercase truncate">{order.nome_dest}</p>
                    <p className="text-[9px] text-slate-400 font-bold">CPF: ***.{order.cpf_cnpj_dest.slice(-4)}-**</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">{order.vendedor}</span>
                  </div>
                  {hasAdicional ? (
                    <div className="text-right">
                      <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black">CONVERTIDO</Badge>
                      <p className="text-[10px] text-emerald-600 font-black">+{formatBRL(valorAdicional)}</p>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-300 border-slate-200 text-[8px] font-black uppercase">Oportunidade</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhamento do Pedido (Sheet) */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-sky-500 p-0 overflow-y-auto">
          {selectedOrder && (
            <div className="h-full flex flex-col">
              {/* Header Pickup */}
              <div className="bg-sky-500 p-6 md:p-8 space-y-4 text-white">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6" />
                  <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white">Pedido #{selectedOrder.nf}</SheetTitle>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">Data Retirada</p>
                    <p className="text-sm font-black">{format(parseISO(selectedOrder.dhEmi), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase opacity-80">Valor do Site</p>
                    <p className="text-xl font-black">{formatBRL(parseFloat(selectedOrder.vNF))}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8 flex-1">
                {/* Itens do Pickup */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-3 h-3" /> Itens Originais do Site
                  </h4>
                  <div className="space-y-2">
                    {selectedOrder.itens.map((item, idx) => (
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

                {/* Seção Adicional */}
                <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3 text-orange-500" /> Venda Adicional (Loja)
                  </h4>
                  
                  {vinculadosMap[selectedOrder.chave] ? (
                    <div className="space-y-6">
                      {vinculadosMap[selectedOrder.chave].map((adic, aIdx) => (
                        <div key={aIdx} className="space-y-4">
                          <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 flex justify-between items-center">
                            <div>
                              <p className="text-[9px] font-black text-emerald-600 uppercase">Cupom Adicional</p>
                              <p className="text-base font-black text-emerald-800">#{adic.nf}</p>
                              <p className="text-[10px] font-bold text-emerald-600/70">{adic.vendedor} • {format(parseISO(adic.dhEmi), "HH:mm")}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-black text-emerald-600 uppercase">Valor Extra</p>
                              <p className="text-xl font-black text-emerald-800">{formatBRL(parseFloat(adic.vNF))}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {adic.itens.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border-2 border-emerald-50">
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-xs font-black text-slate-700 truncate uppercase">{item.xProd}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">Qtd: {item.qCom}</p>
                                </div>
                                <p className="text-xs font-black text-emerald-600">{formatBRL(item.vProd)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 text-center space-y-3">
                       <XCircle className="w-10 h-10 text-slate-300 mx-auto" />
                       <p className="text-sm font-black text-slate-400 uppercase tracking-tight">Nenhuma venda adicional vinculada</p>
                       <p className="text-[10px] text-slate-400 font-medium px-4">O cliente retirou apenas os produtos do site. Oportunidade de oferecer acessórios ou itens de impulso.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedOrder(null)} className="w-full bg-sky-500 hover:bg-sky-600 font-black rounded-xl py-6">FECHAR AUDITORIA</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
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

