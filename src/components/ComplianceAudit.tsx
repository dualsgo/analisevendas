
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
  Search,
  ShieldAlert,
  AlertTriangle,
  User,
  ShoppingBag,
  Download,
  Filter,
  BarChart3,
  TrendingDown,
  Info,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { exportToCsv } from "@/lib/csv-utils";

interface ComplianceAuditProps {
  data: DetailedSaleRow[];
}

export function ComplianceAudit({ data }: ComplianceAuditProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [threshold, setThreshold] = useState(0.10); // Valor de corte editável

  const suspectedSales = useMemo(() => {
    const list: any[] = [];
    
    data.forEach(sale => {
      if (sale.is_cancelada) return;
      
      // REGRA: Desconsiderar se houver Crédito de Loja (tPag = 05)
      // Em trocas, itens de valor baixo podem ser ajustes legítimos de saldo
      const hasStoreCredit = sale.pagamentos_detalhe?.some(p => p.tPag === "05") || sale.is_troca;
      if (hasStoreCredit) return;

      const suspiciousItems = sale.itens.filter(item => {
        const unitPrice = item.vProd / item.qCom;
        return unitPrice > 0 && unitPrice <= threshold;
      });

      if (suspiciousItems.length > 0) {
        list.push({
          ...sale,
          suspiciousItems,
          totalSuspiciousValue: suspiciousItems.reduce((acc, it) => acc + it.vProd, 0)
        });
      }
    });

    return list;
  }, [data, threshold]);

  const vendorRanking = useMemo(() => {
    const vendors: Record<string, any> = {};
    suspectedSales.forEach(s => {
      const v = s.vendedor || "NÃO IDENTIFICADO";
      if (!vendors[v]) vendors[v] = { name: v, count: 0, items: 0 };
      vendors[v].count++;
      vendors[v].items += s.suspiciousItems.length;
    });
    return Object.values(vendors).sort((a, b) => b.items - a.items);
  }, [suspectedSales]);

  const stats = useMemo(() => {
    const totalCupons = data.filter(s => !s.is_cancelada && s.tpNF === 1).length;
    const suspectedCount = suspectedSales.length;
    const impactPerc = totalCupons > 0 ? (suspectedCount / totalCupons) * 100 : 0;
    
    return {
      totalCupons,
      suspectedCount,
      impactPerc,
      totalVendors: vendorRanking.length
    };
  }, [data, suspectedSales, vendorRanking]);

  const filteredSales = useMemo(() => {
    return suspectedSales.filter(s => 
      s.nf.includes(searchTerm) || 
      s.vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.suspiciousItems.some((it: any) => it.cProd.includes(searchTerm) || it.xProd.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suspectedSales, searchTerm]);

  const handleExport = () => {
    const headers = ["NF", "Data", "Vendedor", "Cod Item", "Nome Item", "Valor Item", "Qtd Item"];
    const rows: any[] = [];
    
    filteredSales.forEach(s => {
      s.suspiciousItems.forEach((it: any) => {
        rows.push({
          "NF": s.nf,
          "Data": s.dhEmi,
          "Vendedor": s.vendedor,
          "Cod Item": it.cProd,
          "Nome Item": it.xProd,
          "Valor Item": it.vProd.toFixed(2),
          "Qtd Item": it.qCom
        });
      });
    });
    
    exportToCsv(`Auditoria_PA_Corte_RS_${threshold.toFixed(2)}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Informativo */}
      <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-2xl space-y-2">
        <div className="flex items-center gap-3 text-rose-700">
          <ShieldAlert className="w-6 h-6" />
          <h2 className="text-xl font-black uppercase">Monitoramento de Integridade de PA</h2>
        </div>
        <p className="text-sm text-rose-600/80 font-medium max-w-3xl">
          Identificação de itens com valor unitário inferior a <strong>R$ {threshold.toFixed(2)}</strong>. 
          Esta prática é frequentemente usada para inflar o indicador de Peças por Atendimento (PA).
          <br/>
          <span className="text-[10px] font-black uppercase mt-2 block bg-white/50 w-fit px-2 py-0.5 rounded">
            Nota: Vendas com Crédito de Loja (Trocas) são automaticamente desconsideradas desta análise.
          </span>
        </p>
      </div>

      {/* KPIs de Risco */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ComplianceStat label="Cupons Suspeitos" value={stats.suspectedCount} icon={AlertTriangle} color="text-rose-500" />
        <ComplianceStat label="Índice de Alerta" value={`${stats.impactPerc.toFixed(1)}%`} icon={BarChart3} color="text-amber-500" subLabel="do total de vendas" />
        <ComplianceStat label="Vendedores Envolvidos" value={stats.totalVendors} icon={User} color="text-slate-500" />
        <ComplianceStat label="Corte Atual" value={`R$ ${threshold.toFixed(2)}`} icon={Settings2} color="text-sky-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking de Vendedores */}
        <Card className="ri-card border-none shadow-sm lg:col-span-1">
          <CardHeader className="bg-slate-50/50 border-b p-4">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ranking por Colaborador</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/30 border-slate-50">
                  <TableHead className="text-[9px] font-black uppercase">Vendedor</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right">Itens Suspeitos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorRanking.map((v, i) => (
                  <TableRow key={i} className="border-slate-50">
                    <TableCell className="text-[10px] font-black text-slate-700 uppercase">{v.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-rose-100 text-rose-700 border-none font-black h-5">{v.items}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {vendorRanking.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-slate-400 font-bold text-[10px]">Nenhuma anomalia detectada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Relatório Detalhado */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="ri-card border-none shadow-sm overflow-hidden">
            <div className="p-4 bg-white flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1">Busca Geral</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar NF, Vendedor ou Produto..." 
                    className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-xs font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1">Corte Auditoria (R$)</label>
                <div className="relative">
                  <Settings2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <Input 
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.10" 
                    className="pl-9 rounded-xl border-orange-100 bg-orange-50/20 h-11 text-xs font-black text-orange-700"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Button onClick={handleExport} variant="outline" className="rounded-xl h-11 font-black text-[10px] gap-2 border-slate-200 text-slate-600">
                <Download className="w-4 h-4" /> EXPORTAR
              </Button>
            </div>
          </Card>

          <div className="bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-50">
                  <TableHead className="text-[9px] font-black uppercase">NF / Data</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Vendedor</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">Item Suspeito</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-right">Valor Unit.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale, i) => (
                  <React.Fragment key={i}>
                    {sale.suspiciousItems.map((item: any, idx: number) => (
                      <TableRow key={`${i}-${idx}`} className="hover:bg-rose-50/20 border-slate-50">
                        <TableCell>
                          <p className="text-[10px] font-black text-slate-700">#{sale.nf}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM HH:mm")}</p>
                        </TableCell>
                        <TableCell className="text-[10px] font-black text-slate-600 uppercase">{sale.vendedor}</TableCell>
                        <TableCell>
                          <p className="text-[10px] font-black text-rose-600 uppercase truncate max-w-[200px]">{item.xProd}</p>
                          <p className="text-[8px] text-slate-400 font-bold">CÓD: {item.cProd}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-[10px] font-black text-rose-700">R$ {(item.vProd / item.qCom).toFixed(2)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                {filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-300 font-black uppercase text-xs">
                      Limpo: Sem itens abaixo do corte identificados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceStat({ label, value, icon: Icon, color, subLabel }: any) {
  return (
    <Card className="ri-card border-none bg-white p-4 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {subLabel && <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{subLabel}</span>}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
    </Card>
  );
}
