"use client";

import React from "react";
import { OutlierCoupon } from "@/lib/basket-quality-analytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  Receipt, 
  Calendar, 
  User, 
  ShoppingBag, 
  Tag, 
  Flame, 
  Sparkles, 
  FilterX, 
  Check, 
  X,
  Clock,
  Layers,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CouponInspectionModalProps {
  coupon: OutlierCoupon | null;
  open: boolean;
  onClose: () => void;
  isExcluded?: boolean;
  onToggleExclusion?: (chave: string) => void;
}

export function CouponInspectionModal({
  coupon,
  open,
  onClose,
  isExcluded = false,
  onToggleExclusion
}: CouponInspectionModalProps) {
  if (!coupon) return null;

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  Cupom Fiscal: NF #{coupon.nf}
                  <Badge className={cn(
                    "text-[10px] font-black uppercase",
                    coupon.classification === "MEGA_ANOMALIA" 
                      ? "bg-purple-600 text-white" 
                      : coupon.itens_qtd >= 6 
                      ? "bg-amber-500 text-white" 
                      : "bg-indigo-600 text-white"
                  )}>
                    {coupon.itens_qtd} Peças
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Auditoria detalhada da cesta e produtos que compõem este atendimento.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 1. CARDS DE RESUMO DO CUPOM */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400">Total da Venda</span>
            <p className="text-lg font-black text-slate-900">{formatBRL(coupon.vNF)}</p>
            <span className="text-[9px] text-slate-500 font-medium">Valor líquido NF</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400">Peças no Cupom</span>
            <p className="text-lg font-black text-indigo-600">{coupon.itens_qtd} pçs</p>
            <span className="text-[9px] text-slate-500 font-medium">
              PM: {formatBRL(coupon.avgPrice)}/pç
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center space-y-0.5">
            <span className="text-[10px] font-black uppercase text-slate-400">Vendedor(a)</span>
            <p className="text-xs font-black uppercase text-slate-900 truncate" title={coupon.vendedor}>
              {coupon.vendedor}
            </p>
            <span className="text-[9px] text-slate-500 font-medium">{coupon.dateLabel} ({coupon.timeLabel})</span>
          </div>

          <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center space-y-0.5">
            <span className="text-[10px] font-black uppercase text-purple-700">Impacto no PA</span>
            <p className="text-lg font-black text-purple-700">+{coupon.paImpactOnTotal.toFixed(3)}</p>
            <span className="text-[9px] text-purple-800 font-bold">Pontos no PA Geral</span>
          </div>
        </div>

        {/* 2. TABELA COMPLETA DE PRODUTOS / ITENS */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              Itens Comprados no Cupom ({coupon.itensSample.length} itens)
            </h4>
            <span className="text-[10px] text-slate-400 font-bold">
              {coupon.itens_qtd} unidades totais
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="h-9">
                  <TableHead className="text-[10px] font-black uppercase text-slate-600">Cód / Produto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Qtd</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-600 text-right">Preço Unit.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-600 text-right">Desconto</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-600 text-right">Total Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupon.itensSample.map((it, idx) => {
                  const unitPrice = it.vUnCom && it.vUnCom > 0 
                    ? it.vUnCom 
                    : it.qCom > 0 
                    ? (it.vProd + (it.vDesc || 0)) / it.qCom 
                    : it.vProd;

                  return (
                    <TableRow key={idx} className="h-10 hover:bg-slate-50/80">
                      <TableCell className="text-xs font-bold text-slate-800 py-2">
                        <div className="flex flex-col">
                          <span className="text-slate-900 font-black">{it.xProd}</span>
                          {it.cProd && <span className="text-[9px] text-slate-400 font-mono">Cód: {it.cProd}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-indigo-700 text-xs">
                        {it.qCom}x
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-700">
                        {formatBRL(unitPrice)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-rose-600">
                        {it.vDesc && it.vDesc > 0 ? `-${formatBRL(it.vDesc)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-black text-slate-900">
                        {formatBRL(it.vProd)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 3. RODAPÉ E AÇÕES DE EXPURGO */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 mt-2">
          {onToggleExclusion && (
            <Button
              variant={isExcluded ? "default" : "outline"}
              onClick={() => onToggleExclusion(coupon.chave)}
              className={cn(
                "h-9 text-xs font-bold rounded-xl",
                isExcluded ? "bg-rose-600 hover:bg-rose-700 text-white" : "text-rose-600 border-rose-200 hover:bg-rose-50"
              )}
            >
              <FilterX className="w-3.5 h-3.5 mr-1.5" />
              {isExcluded ? "Restaurar Cupom na Análise" : "Expurgar este Cupom da Amostra"}
            </Button>
          )}

          <Button 
            variant="default" 
            onClick={onClose}
            className="h-9 px-6 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            Fechar Inspeção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
