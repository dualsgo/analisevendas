
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
  Target,
  Zap,
  AlertTriangle,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  XCircle,
  User,
  ShoppingBag,
  Info,
  Calendar,
  AlertCircle,
  FileText
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

  // Filtrar apenas pedidos de Retirada Online (Canal ou com alto score de pickup)
  const pickupOrders = useMemo(() => {
    return data.filter(r => (r.canal === "RETIRADA_ONLINE" || r.pickup_match_fields >= 3) && !r.is_cancelada);
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

  const stats = useMemo(() => {
    const total = pickupOrders.length;
    const comAdicional = pickupOrders.filter(o => !!vinculadosMap[o.chave]).length;
    const valorAdicional = Object.values(vinculadosMap).flat().reduce((acc, o) => acc + parseFloat(o.vNF), 0);
    const taxaConversao = total > 0 ? (comAdicional / total) * 100 : 0;
    const suspeitos = pickupOrders.filter(o => o.pickup_match_fields < 4).length;

    return { total, comAdicional, valorAdicional, taxaConversao, suspeitos };
  }, [pickupOrders, vinculadosMap]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Resumo do Canal Pickup */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIStat label="Pedidos Pickup" value={stats.total} icon={Smartphone} color="text-sky-500" />
        <KPIStat label="Taxa Conversão" value={`${stats.taxaConversao.toFixed(1)}%`} icon={Target} color="text-orange-500" />
        <KPIStat label="Venda Incremental" value={formatBRL(stats.valorAdicional)} icon={Zap} color="text-emerald-500" />
        <KPIStat 
          label="Pedidos Suspeitos" 
          value={stats.suspeitos} 
          icon={AlertCircle} 
          color="text-amber-500" 
          subLabel="Score < 4"
        />
      </div>

      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <div className="p-4 bg-white flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por NF, CPF ou Cliente..." 
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterAdicional} onValueChange={(v: any) => setFilterAdicional(v)}>
            <SelectTrigger className="w-full md:w-64 rounded-xl border-slate-100 bg-slate-50/50 h-11 font-black text-[10px] uppercase">
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

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Auditoria de Pedidos ({filteredOrders.length})</h3>

        <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-50 h-12">
                <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-8">NF / Data</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400">Cliente</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Score Auditoria</TableHead>
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
                const isSuspect = order.pickup_match_fields < 4;

                return (
                  <TableRow key={order.chave} className="hover:bg-sky-50/30 border-slate-50 cursor-pointer group transition-colors h-16" onClick={() => setSelectedOrder(order)}>
                    <TableCell className="pl-8">
                      <p className="text-xs font-black text-slate-700">#{order.nf}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{format(parseISO(order.dhEmi), "dd/MM HH:mm")}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-black text-slate-700 uppercase truncate max-w-[150px]">{order.nome_dest}</p>
                      <p className="text-[9px] text-slate-400 font-bold">CPF: ***.{order.cpf_cnpj_dest.slice(-4)}-**</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge className={cn(
                          "text-[9px] font-black border-none px-2",
                          order.pickup_match_fields >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {order.pickup_match_fields}/5 CRITÉRIOS
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-xs font-black text-slate-700">{formatBRL(parseFloat(order.vNF))}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{order.itens_qtd} ITENS</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasAdicional ? (
                        <div className="flex flex-col items-center">
                          <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase px-2">Convertido</Badge>
                          <p className="text-[10px] text-emerald-600 font-black mt-1">+{formatBRL(valorAdicional)}</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-300 border-slate-200 text-[8px] font-black uppercase px-2">Oportunidade</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right"><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-all" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.chave} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4" onClick={() => setSelectedOrder(order)}>
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-sm font-black text-slate-800">Pedido #{order.nf}</h5>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{format(parseISO(order.dhEmi), "dd/MM/yy HH:mm")}</p>
                </div>
                <Badge className={cn("text-[8px] font-black px-2", order.pickup_match_fields >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                  {order.pickup_match_fields}/5
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-y border-slate-50">
                <span className="text-[10px] font-black text-slate-500 uppercase">{order.nome_dest}</span>
                <span className="text-xs font-black text-slate-900">{formatBRL(parseFloat(order.vNF))}</span>
              </div>
              <div className="flex justify-between items-center">
                {vinculadosMap[order.chave] ? (
                  <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase">Adicional Vinculado</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-300 text-[8px] font-black uppercase">Sem Adicional</Badge>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-sky-500 p-0 overflow-y-auto">
          {selectedOrder && (
            <div className="h-full flex flex-col">
              <div className="bg-sky-500 p-6 md:p-8 space-y-4 text-white">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6" />
                  <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white">Auditoria NF #{selectedOrder.nf}</SheetTitle>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">Cliente</p>
                    <p className="text-sm font-black uppercase">{selectedOrder.nome_dest}</p>
                    <p className="text-[10px] font-bold opacity-70">CPF: {selectedOrder.cpf_cnpj_dest}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase opacity-80">Valor Site</p>
                    <p className="text-xl font-black">{formatBRL(parseFloat(selectedOrder.vNF))}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8 flex-1">
                {/* MATRIZ DE CRITÉRIOS */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Matriz de Classificação (Audit)
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <CriteriaItem label="Integração Digital (tpIntegra: 2)" met={selectedOrder.tpIntegra === "2"} />
                    <CriteriaItem label="Ausência de Troco (Venda Líquida)" met={parseFloat(selectedOrder.vTroco) === 0} />
                    <CriteriaItem label="Sem Pagamento em Dinheiro" met={selectedOrder.pagamentos_detalhe?.every(p => p.tPag !== "01") ?? true} />
                    <CriteriaItem label="Keywords Fiscais (RETIRADA/SITE)" met={/RETIRADA|PICKUP|SITE|OMNI/i.test(selectedOrder.infCpl || "")} />
                    <CriteriaItem label="Emissor Externo/E-commerce" met={selectedOrder.vendedor === "VENDEDOR NÃO IDENTIFICADO" || /SITE|ECOMM/i.test(selectedOrder.vendedor)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5" /> Itens do Pedido Original
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

                {/* ADICIONAL VINCULADO */}
                <div className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Venda Adicional Identificada
                  </h4>
                  {vinculadosMap[selectedOrder.chave] ? (
                    <div className="space-y-4">
                      {vinculadosMap[selectedOrder.chave].map((adic, aIdx) => (
                        <div key={aIdx} className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-100 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase">Cupom #{adic.nf}</p>
                            <p className="text-sm font-black text-emerald-800 uppercase">{adic.vendedor}</p>
                            <p className="text-[9px] font-bold text-emerald-600">EMISSÃO: {format(parseISO(adic.dhEmi), "HH:mm")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-800">{formatBRL(parseFloat(adic.vNF))}</p>
                            <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase">Vínculo CPF</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                      <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-black text-slate-400 uppercase">Nenhum adicional vinculado</p>
                      <p className="text-[10px] text-slate-400 font-medium px-4 mt-1">O cliente não realizou compras presenciais no dia desta retirada.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedOrder(null)} className="w-full bg-sky-500 hover:bg-sky-600 font-black rounded-xl py-6 uppercase">CONCLUIR AUDITORIA</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KPIStat({ label, value, icon: Icon, color, subLabel }: any) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col justify-between gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50 shadow-inner", color)}><Icon className="w-4 h-4 md:w-5 md:h-5" /></div>
        {subLabel && <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{subLabel}</span>}
      </div>
      <div>
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-base md:text-xl font-black text-slate-800 leading-none">{value}</p>
      </div>
    </Card>
  );
}

function CriteriaItem({ label, met }: { label: string, met: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white">
      <span className={cn("text-[10px] font-bold uppercase", met ? "text-slate-600" : "text-slate-400")}>{label}</span>
      {met ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
    </div>
  );
}
