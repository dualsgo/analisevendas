
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Percent,
  TrendingUp,
  AlertTriangle,
  User,
  ShoppingBag,
  ArrowRight,
  Info,
  Calendar,
  XCircle,
  CheckCircle2,
  FileText,
  Download,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { exportToCsv } from "@/lib/csv-utils";

interface DiscountAuditProps {
  data: DetailedSaleRow[];
}

export function DiscountAudit({ data }: DiscountAuditProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [minDiscountPercent, setMinDiscountPercent] = useState<string>("0");
  const [selectedSale, setSelectedSale] = useState<DetailedSaleRow | null>(null);
  const [activeView, setActiveView] = useState<"audit" | "registry">("audit");

  const HI_DISCOUNT_THRESHOLD = 15; // 15% é o gatilho de alerta

  // Filtrar vendas com desconto
  const discountSales = useMemo(() => {
    return data.filter(r => r.tem_desconto && !r.is_cancelada);
  }, [data]);

  // Vendedores únicos para o filtro
  const vendorsList = useMemo(() => {
    const list = new Set(discountSales.map(r => r.vendedor).filter(Boolean));
    return Array.from(list).sort();
  }, [discountSales]);

  // Separação de Auditoria vs Registro Adicional
  const { auditData, registryData } = useMemo(() => {
    const audit = discountSales.filter(r => r.tipo_desconto !== "ADICIONAL");
    const registry = discountSales.filter(r => r.tipo_desconto === "ADICIONAL");
    return { auditData: audit, registryData: registry };
  }, [discountSales]);

  const currentDataset = activeView === "audit" ? auditData : registryData;

  // Aplicação dos Filtros
  const filteredData = useMemo(() => {
    return currentDataset.filter(sale => {
      const matchesSearch = 
        sale.nf.includes(searchTerm) || 
        sale.cpf_cnpj_dest.includes(searchTerm) || 
        sale.nome_dest.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVendor = selectedVendor === "all" || sale.vendedor === selectedVendor;
      const matchesPercent = parseFloat(sale.percentual_desconto) * 100 >= parseFloat(minDiscountPercent);

      return matchesSearch && matchesVendor && matchesPercent;
    });
  }, [currentDataset, searchTerm, selectedVendor, minDiscountPercent]);

  // KPIs
  const stats = useMemo(() => {
    const totalVenda = filteredData.reduce((acc, r) => acc + parseFloat(r.vNF), 0);
    const totalDesconto = filteredData.reduce((acc, r) => acc + parseFloat(r.desconto_total), 0);
    const originalVenda = totalVenda + totalDesconto;
    const avgPercent = originalVenda > 0 ? (totalDesconto / originalVenda) * 100 : 0;

    return {
      count: filteredData.length,
      totalVenda,
      totalDesconto,
      avgPercent,
      tkm: filteredData.length > 0 ? totalVenda / filteredData.length : 0
    };
  }, [filteredData]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExport = () => {
    const headers = ["NF", "Data", "Vendedor", "Cliente", "Valor Original", "Desconto R$", "% Desconto", "Valor Final"];
    const rows = filteredData.map(sale => {
      const vFinal = parseFloat(sale.vNF);
      const vDesc = parseFloat(sale.desconto_total);
      return {
        "NF": sale.nf,
        "Data": sale.dhEmi,
        "Vendedor": sale.vendedor,
        "Cliente": sale.nome_dest,
        "Valor Original": (vFinal + vDesc).toFixed(2),
        "Desconto R$": vDesc.toFixed(2),
        "% Desconto": (parseFloat(sale.percentual_desconto) * 100).toFixed(2),
        "Valor Final": vFinal.toFixed(2)
      };
    });
    exportToCsv(`Auditoria_Descontos_${activeView}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Resumo Consolidados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPIStat label="Vendas c/ Desconto" value={stats.count} icon={FileText} color="text-slate-500" />
        <KPIStat label="Total Desconto" value={formatBRL(stats.totalDesconto)} icon={Percent} color="text-rose-500" />
        <KPIStat label="% Médio Desconto" value={`${stats.avgPercent.toFixed(1)}%`} icon={TrendingUp} color="text-orange-500" />
        <KPIStat label="Ticket Médio" value={formatBRL(stats.tkm)} icon={ShoppingBag} color="text-sky-500" />
      </div>

      {/* Tabs Auditoria vs Registro */}
      <Tabs defaultValue="audit" onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-slate-50 rounded-2xl h-14 p-1">
          <TabsTrigger value="audit" className="rounded-xl font-black text-xs uppercase data-[state=active]:bg-orange-500 data-[state=active]:text-white">Auditoria de Descontos</TabsTrigger>
          <TabsTrigger value="registry" className="rounded-xl font-black text-xs uppercase data-[state=active]:bg-slate-700 data-[state=active]:text-white">Registro Adicionais</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          {/* Filtros */}
          <Card className="ri-card border-none shadow-sm overflow-hidden">
            <div className="p-4 bg-white space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar NF, Cliente ou CPF..." 
                    className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleExport} className="rounded-xl h-11 font-bold border-slate-200 text-slate-600 gap-2">
                  <Download className="w-4 h-4" /> EXPORTAR
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Colaborador</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold">
                      <SelectValue placeholder="Todos os Vendedores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Vendedores</SelectItem>
                      {vendorsList.map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Desconto Mínimo (%)</label>
                  <Select value={minDiscountPercent} onValueChange={setMinDiscountPercent}>
                    <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold">
                      <SelectValue placeholder="Qualquer Desconto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Qualquer Desconto</SelectItem>
                      <SelectItem value="5">Acima de 5%</SelectItem>
                      <SelectItem value="10">Acima de 10%</SelectItem>
                      <SelectItem value="15">Acima de 15%</SelectItem>
                      <SelectItem value="20">Acima de 20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                   <Badge variant="outline" className="h-10 w-full justify-center bg-slate-50 border-slate-100 text-slate-400 font-bold text-[10px]">
                     Exibindo {filteredData.length} de {currentDataset.length} vendas
                   </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Listagem */}
          <div className="space-y-4">
            {/* Desktop View */}
            <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-xl shadow-slate-100/50">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-50">
                    <TableHead className="text-[10px] font-black uppercase text-slate-400">NF / Data</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Cliente</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Venda Bruta</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Desconto</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">% Desc</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((sale) => {
                    const vFinal = parseFloat(sale.vNF);
                    const vDesc = parseFloat(sale.desconto_total);
                    const perc = parseFloat(sale.percentual_desconto) * 100;
                    const isHigh = perc >= HI_DISCOUNT_THRESHOLD;

                    return (
                      <TableRow key={sale.chave} className="hover:bg-rose-50/30 border-slate-50 cursor-pointer group" onClick={() => setSelectedSale(sale)}>
                        <TableCell>
                          <p className="text-xs font-black text-slate-700">#{sale.nf}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM HH:mm")}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500">
                            {sale.vendedor}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-black text-slate-700 uppercase truncate max-w-[150px]">{sale.nome_dest || "NÃO IDENTIFICADO"}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{sale.canal_consolidado}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-xs font-bold text-slate-400 line-through mb-0.5">{formatBRL(vFinal + vDesc)}</p>
                          <p className="text-xs font-black text-slate-700">{formatBRL(vFinal)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-xs font-black text-rose-600">-{formatBRL(vDesc)}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "text-[10px] font-black border-none",
                            isHigh ? "bg-rose-500 text-white" : "bg-orange-100 text-orange-700"
                          )}>
                            {perc.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell><ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden space-y-3">
              {filteredData.map((sale) => {
                const vFinal = parseFloat(sale.vNF);
                const vDesc = parseFloat(sale.desconto_total);
                const perc = parseFloat(sale.percentual_desconto) * 100;
                const isHigh = perc >= HI_DISCOUNT_THRESHOLD;

                return (
                  <div key={sale.chave} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4" onClick={() => setSelectedSale(sale)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-sm font-black text-slate-800">NF #{sale.nf}</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM/yy HH:mm")}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-black border-none",
                        isHigh ? "bg-rose-500 text-white" : "bg-orange-100 text-orange-700"
                      )}>
                        {perc.toFixed(1)}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{sale.vendedor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Desconto</p>
                        <p className="text-[10px] font-black text-rose-600">-{formatBRL(vDesc)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[150px]">{sale.nome_dest || "Final Consumidor"}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{sale.canal_consolidado}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">{formatBRL(vFinal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Tabs>

      {/* Detalhamento da Venda (Sheet) */}
      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-rose-500 p-0 overflow-y-auto">
          {selectedSale && (
            <div className="h-full flex flex-col">
              {/* Header Auditoria */}
              <div className="bg-rose-500 p-6 md:p-8 space-y-4 text-white">
                <div className="flex items-center gap-3">
                  <Percent className="w-6 h-6" />
                  <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white">Auditoria NF #{selectedSale.nf}</SheetTitle>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">Data da Venda</p>
                    <p className="text-sm font-black">{format(parseISO(selectedSale.dhEmi), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase opacity-80">Desconto Aplicado</p>
                    <p className="text-xl font-black">{(parseFloat(selectedSale.percentual_desconto) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8 flex-1">
                {/* Resumo de Valores */}
                <div className="grid grid-cols-3 gap-4">
                  <ValueCard label="Valor Bruto" value={formatBRL(parseFloat(selectedSale.vNF) + parseFloat(selectedSale.desconto_total))} color="text-slate-400" isStrikethrough />
                  <ValueCard label="Total Desconto" value={formatBRL(parseFloat(selectedSale.desconto_total))} color="text-rose-500" />
                  <ValueCard label="Valor Final" value={formatBRL(parseFloat(selectedSale.vNF))} color="text-slate-800" />
                </div>

                {/* Dados do Vendedor e Cliente */}
                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">Colaborador:</span>
                    </div>
                    <span className="text-sm font-black text-slate-700 uppercase">{selectedSale.vendedor}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">Cliente:</span>
                    </div>
                    <span className="text-sm font-black text-slate-700 uppercase truncate max-w-[200px]">{selectedSale.nome_dest || "CONSUMIDOR"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">Tipo Desconto:</span>
                    </div>
                    <Badge variant="outline" className="bg-white border-orange-200 text-orange-600 font-black">{selectedSale.tipo_desconto}</Badge>
                  </div>
                </div>

                {/* Itens da Compra */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-3 h-3" /> Itens da Nota
                  </h4>
                  <div className="space-y-2">
                    {selectedSale.itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-black text-slate-700 truncate uppercase">{item.xProd}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-600">{formatBRL(item.vProd)}</p>
                          {item.vDesc > 0 && <p className="text-[9px] font-bold text-rose-500">Desc: -{formatBRL(item.vDesc)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedSale(null)} className="w-full bg-rose-500 hover:bg-rose-600 font-black rounded-xl py-6">CONCLUIR AUDITORIA</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KPIStat({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  return (
    <Card className="ri-card border-none bg-white p-4 md:p-5 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl bg-slate-50", color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm md:text-xl font-black text-slate-800">{value}</p>
      </div>
    </Card>
  );
}

function ValueCard({ label, value, color, isStrikethrough = false }: { label: string, value: string, color: string, isStrikethrough?: boolean }) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-xs font-black", color, isStrikethrough && "line-through opacity-50")}>{value}</p>
    </div>
  );
}

