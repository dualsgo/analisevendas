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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Resumo do Canal Pickup */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <Card className="ri-card border-none shadow-md overflow-hidden bg-white">
        <div className="p-5 md:p-6 bg-white flex flex-col md:flex-row gap-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por Pedido, CPF ou Cliente..." 
              className="pl-10 rounded-xl border-slate-100 bg-slate-50/50 h-12 text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterAdicional} onValueChange={(v: any) => setFilterAdicional(v)}>
            <SelectTrigger className="w-full md:w-72 rounded-xl border-slate-100 bg-slate-50/50 h-12 font-black text-[11px] uppercase tracking-wide">
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
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Auditoria de Pedidos ({filteredOrders.length})</h3>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block bg-white rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-xl shadow-slate-100/50">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-50">
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-10 py-5">Pedido / Data</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Cliente</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Colaborador</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-right">Valor Pickup</TableHead>
                <TableHead className="text-[11px] font-black uppercase text-slate-400 tracking-widest text-center">Status Adicional</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const adicionais = vinculadosMap[order.chave] || [];
                const hasAdicional = adicionais.length > 0;
                const valorAdicional = adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);

                return (
                  <TableRow key={order.chave} className="hover:bg-sky-50/30 border-slate-50 cursor-pointer group transition-colors" onClick={() => setSelectedOrder(order)}>
                    <TableCell className="py-6 pl-10">
                      <p className="text-sm font-black text-slate-700 tracking-tight">#{order.nf}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1.5">{format(parseISO(order.dhEmi), "dd/MM — HH:mm")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-black text-slate-700 uppercase truncate max-w-[180px]">{order.nome_dest}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">***.{order.cpf_cnpj_dest.slice(-4)}-**</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-black uppercase border-slate-200 text-slate-500 bg-white px-3 py-0.5">
                        {order.vendedor}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-black text-slate-700">{formatBRL(parseFloat(order.vNF))}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{order.itens_qtd} Itens</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasAdicional ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px] font-black px-3">CONVERTIDO</Badge>
                          <p className="text-[11px] text-emerald-600 font-black">+{formatBRL(valorAdicional)}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[10px] font-black uppercase px-3">Sem Adicional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-8"><ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-5">
          {filteredOrders.map((order) => {
            const adicionais = vinculadosMap[order.chave] || [];
            const hasAdicional = adicionais.length > 0;
            const valorAdicional = adicionais.reduce((acc, a) => acc + parseFloat(a.vNF), 0);

            return (
              <div key={order.chave} className="bg-white border-2 border-slate-50 rounded-[1.75rem] p-6 shadow-sm space-y-5 active:scale-[0.98] transition-all" onClick={() => setSelectedOrder(order)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-base font-black text-slate-800 tracking-tight">Pedido #{order.nf}</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{format(parseISO(order.dhEmi), "dd/MM/yy HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">{formatBRL(parseFloat(order.vNF))}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{order.itens_qtd} ITENS</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 py-4 border-y border-slate-50">
                  <div className="p-3 bg-slate-50 rounded-2xl shadow-inner"><User className="w-4 h-4 text-slate-400" /></div>
                  <div className="flex-1 overflow-hidden space-y-1">
                    <p className="text-[11px] font-black text-slate-700 uppercase truncate leading-none">{order.nome_dest}</p>
                    <p className="text-[10px] text-slate-400 font-bold leading-none uppercase">CPF: ***.{order.cpf_cnpj_dest.slice(-4)}-**</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-orange-400" />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{order.vendedor}</span>
                  </div>
                  {hasAdicional ? (
                    <div className="text-right space-y-1">
                      <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase px-2 py-0.5">Convertido</Badge>
                      <p className="text-[11px] text-emerald-600 font-black">+{formatBRL(valorAdicional)}</p>
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-300 border-slate-200 text-[9px] font-black uppercase px-2 py-0.5">Oportunidade</Badge>
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
              <div className="bg-sky-500 p-8 md:p-10 space-y-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <Smartphone className="w-8 h-8" />
                  <SheetTitle className="text-2xl md:text-3xl font-black uppercase text-white tracking-tighter leading-none">Pedido #{selectedOrder.nf}</SheetTitle>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/20">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Data Retirada</p>
                    <p className="text-base font-black tracking-tight">{format(parseISO(selectedOrder.dhEmi), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Valor do Site</p>
                    <p className="text-2xl font-black tracking-tighter">{formatBRL(parseFloat(selectedOrder.vNF))}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-10 space-y-10 flex-1">
                {/* Itens do Pickup */}
                <div className="space-y-5">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4" /> Itens Originais do Site
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex-1 min-w-0 pr-6 space-y-1">
                          <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">{item.xProd}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                        </div>
                        <p className="text-sm font-black text-slate-600 tracking-tight">{formatBRL(item.vProd)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção Adicional */}
                <div className="space-y-6 pt-6 border-t border-dashed border-slate-200">
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-3">
                    <Zap className="w-4 h-4 text-orange-500" /> Venda Adicional (Loja)
                  </h4>
                  
                  {vinculadosMap[selectedOrder.chave] ? (
                    <div className="space-y-8">
                      {vinculadosMap[selectedOrder.chave].map((adic, aIdx) => (
                        <div key={aIdx} className="space-y-5">
                          <div className="bg-emerald-50 p-6 rounded-[1.5rem] border-2 border-emerald-100 flex justify-between items-center shadow-sm">
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Cupom Adicional</p>
                              <p className="text-xl font-black text-emerald-800 tracking-tight leading-none">#{adic.nf}</p>
                              <p className="text-[11px] font-bold text-emerald-600/70 tracking-wide uppercase">{adic.vendedor} • {format(parseISO(adic.dhEmi), "HH:mm")}</p>
                            </div>
                            <div className="text-right space-y-1.5">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valor Extra</p>
                              <p className="text-2xl font-black text-emerald-800 tracking-tighter leading-none">{formatBRL(parseFloat(adic.vNF))}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3 px-2">
                            {adic.itens.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-2xl border-2 border-emerald-50 shadow-sm">
                                <div className="flex-1 min-w-0 pr-6 space-y-1">
                                  <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">{item.xProd}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qtd: {item.qCom}</p>
                                </div>
                                <p className="text-sm font-black text-emerald-600 tracking-tight">{formatBRL(item.vProd)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 p-10 md:p-16 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-5 shadow-inner">
                       <div className="p-5 bg-white rounded-full inline-block shadow-sm">
                          <XCircle className="w-10 h-10 text-slate-300 mx-auto" />
                       </div>
                       <div className="space-y-2">
                          <p className="text-base font-black text-slate-400 uppercase tracking-tight leading-none">Sem adicional vinculado</p>
                          <p className="text-[11px] text-slate-400 font-medium px-6 leading-relaxed max-w-xs mx-auto uppercase tracking-wide">O cliente retirou apenas os itens do site. Oportunidade perdida de ticket incremental.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 md:p-10 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedOrder(null)} className="w-full bg-sky-500 hover:bg-sky-600 font-black rounded-2xl h-16 md:h-20 text-lg shadow-xl shadow-sky-900/10 uppercase tracking-wide">CONCLUIR AUDITORIA</Button>
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
    <Card className="ri-card border-none bg-white p-5 md:p-6 flex flex-col justify-between gap-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-2xl bg-slate-50 shadow-inner", color)}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        {subLabel && <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{subLabel}</span>}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
      </div>
    </Card>
  );
}
