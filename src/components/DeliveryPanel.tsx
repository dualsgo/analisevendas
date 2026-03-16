"use client";

import React, { useMemo, useState } from "react";
import { DetailedSaleRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Truck,
  Search,
  Users,
  ShoppingBag,
  TrendingUp,
  Package,
  User,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

interface DeliveryPanelProps {
  data: DetailedSaleRow[];
}

const formatBRL = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DeliveryPanel({ data }: DeliveryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTx, setSelectedTx] = useState<DetailedSaleRow | null>(null);

  const deliveries = useMemo(() => {
    return data
      .filter(r => r.canal === "DELIVERY" && !r.is_cancelada && r.tpNF === 1)
      .sort((a, b) => b.dhEmi.localeCompare(a.dhEmi));
  }, [data]);

  const filtered = useMemo(() => {
    return deliveries.filter(d => {
      const term = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        d.nf.includes(term) ||
        d.nome_dest.toLowerCase().includes(term) ||
        d.cpf_cnpj_dest.includes(term) ||
        d.vendedor.toLowerCase().includes(term)
      );
    });
  }, [deliveries, searchTerm]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const totalValor = filtered.reduce((acc, d) => acc + parseFloat(d.vNF), 0);
    const avgTicket = total > 0 ? totalValor / total : 0;
    const identified = filtered.filter(d => d.cpf_cnpj_dest && d.cpf_cnpj_dest.length > 5).length;
    
    return { total, totalValor, avgTicket, identified };
  }, [filtered]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Delivery"
          value={kpis.total.toString()}
          icon={Truck}
          color="rose"
        />
        <KpiCard
          label="Faturamento Total"
          value={formatBRL(kpis.totalValor)}
          icon={DollarSign}
          color="emerald"
        />
        <KpiCard
          label="Ticket Médio"
          value={formatBRL(kpis.avgTicket)}
          icon={TrendingUp}
          color="indigo"
        />
        <KpiCard
          label="Identificados (CPF)"
          value={kpis.identified.toString()}
          icon={Users}
          color="amber"
        />
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-slate-100">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por NF, Cliente, Vendedor..."
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-sm font-medium text-slate-700"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end">
            <Badge
              variant="outline"
              className="h-11 px-4 bg-slate-50 border-slate-100 text-slate-500 font-bold text-xs"
            >
              {filtered.length} transações
            </Badge>
          </div>
        </div>
      </Card>

      {/* Grid of Deliveries */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Truck className="w-12 h-12 opacity-30" />
            <p className="font-bold text-sm uppercase">Nenhuma entrega encontrada</p>
          </div>
        )}
        {filtered.map(d => (
          <motion.div
            key={d.chave}
            variants={itemAnim}
            whileHover={{ y: -2 }}
            className="group cursor-pointer"
            onClick={() => setSelectedTx(d)}
          >
            <Card className="h-full border-slate-100 hover:border-rose-200 transition-all overflow-hidden shadow-sm hover:shadow-md">
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase">NF #{d.nf}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {d.dhEmi ? format(parseISO(d.dhEmi), "dd/MM HH:mm") : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-800">{formatBRL(parseFloat(d.vNF))}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Cliente</p>
                  <p className="text-xs font-bold text-slate-700 uppercase truncate">{d.nome_dest || "Não informado"}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{d.vendedor}</span>
                  </div>
                  <Badge className="bg-rose-50 text-rose-600 border-rose-100 text-[9px] font-black uppercase">
                    Delivery
                  </Badge>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Side panel detail */}
      <Sheet open={!!selectedTx} onOpenChange={open => !open && setSelectedTx(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-white border-l-4 border-rose-500 p-0 overflow-y-auto">
          {selectedTx && (
            <div>
              <div className="p-6 bg-rose-500 text-white space-y-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5" />
                  <SheetTitle className="text-lg font-black text-white uppercase">
                    Venda Delivery (iFood/Rappi) — NF #{selectedTx.nf}
                  </SheetTitle>
                </div>
                <p className="text-sm font-bold opacity-80">
                  {selectedTx.dhEmi ? format(parseISO(selectedTx.dhEmi), "dd/MM/yyyy HH:mm") : "—"}
                </p>
                <p className="text-2xl font-black">{formatBRL(parseFloat(selectedTx.vNF))}</p>
              </div>
              <div className="p-6 space-y-6">
                <DetailItem label="Cliente" value={selectedTx.nome_dest || "Consumidor Final"} />
                <DetailItem label="CPF/CNPJ" value={selectedTx.cpf_cnpj_dest || "Não Identificado"} />
                <DetailItem label="CEP de Destino" value={selectedTx.cep_dest || "Não informado"} />
                <DetailItem label="Colaborador" value={selectedTx.vendedor} />
                
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Itens do Pedido</p>
                  <div className="space-y-2">
                    {(selectedTx.itens || []).map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                        <div>
                          <p className="text-xs font-bold text-slate-700 uppercase">{item.xProd}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-600">{formatBRL(item.vProd)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                   <div className="flex items-center gap-2 text-rose-600">
                     <Clock className="w-4 h-4" />
                     <p className="text-[10px] font-black uppercase">Informações de Rota</p>
                   </div>
                   <p className="text-xs text-slate-600 font-medium leading-relaxed">
                     Esta venda foi originada por uma plataforma de delivery. 
                     O endereço de destino cadastrado no XML é idêntico ao CEP da loja, 
                     o que é comum em pedidos onde o entregador coleta o pacote.
                   </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };
  return (
    <Card className={cn("border border-transparent shadow-sm", colors[color])}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 opacity-70">
          <Icon className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</p>
        </div>
        <p className="text-xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-700 uppercase">{value}</p>
    </div>
  );
}
