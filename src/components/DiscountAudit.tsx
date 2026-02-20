
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
  ShieldCheck,
  ShieldAlert,
  Zap,
  Star,
  Tags
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

  const HI_DISCOUNT_THRESHOLD = 15;

  const discountSales = useMemo(() => {
    return data.filter(r => r.tem_desconto && !r.is_cancelada);
  }, [data]);

  const vendorsList = useMemo(() => {
    const list = new Set(discountSales.map(r => r.vendedor).filter(Boolean));
    return Array.from(list).sort();
  }, [discountSales]);

  // REGRA DE SEGURANÇA: 
  // - Seguros: Campanhas (Motor Matemático) e Adicionais (Venda Sugerida Vinculada).
  // - Risco: Todo o resto, com prioridade para Ajuste de Preço (Erro de Loja).
  const { auditData, registryData } = useMemo(() => {
    const registry = discountSales.filter(r => r.tipo_desconto === "ADICIONAL" || r.tipo_desconto === "CAMPANHA");
    const audit = discountSales.filter(r => r.tipo_desconto !== "ADICIONAL" && r.tipo_desconto !== "CAMPANHA");
    return { auditData: audit, registryData: registry };
  }, [discountSales]);

  const currentDataset = activeView === "audit" ? auditData : registryData;

  const filteredData = useMemo(() => {
    return currentDataset.filter(sale => {
      const matchesSearch = 
        sale.nf.includes(searchTerm) || 
        (sale.cpf_cnpj_dest || "").includes(searchTerm) || 
        (sale.nome_dest || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVendor = selectedVendor === "all" || sale.vendedor === selectedVendor;
      const matchesPercent = parseFloat(sale.percentual_desconto) * 100 >= parseFloat(minDiscountPercent);

      return matchesSearch && matchesVendor && matchesPercent;
    });
  }, [currentDataset, searchTerm, selectedVendor, minDiscountPercent]);

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
      tkm: filteredData.length > 0 ? totalVenda / filteredData.length : 0,
      precoErradoCount: filteredData.filter(s => s.tem_suspeita_preco_errado).length
    };
  }, [filteredData]);

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExport = () => {
    const headers = ["NF", "Data", "Vendedor", "Cliente", "Tipo", "Valor Original", "Desconto R$", "% Desconto", "Valor Final", "Suspeita Ajuste"];
    const rows = filteredData.map(sale => {
      const vFinal = parseFloat(sale.vNF);
      const vDesc = parseFloat(sale.desconto_total);
      return {
        "NF": sale.nf,
        "Data": sale.dhEmi,
        "Vendedor": sale.vendedor,
        "Cliente": sale.nome_dest,
        "Tipo": sale.tipo_desconto,
        "Valor Original": (vFinal + vDesc).toFixed(2),
        "Desconto R$": vDesc.toFixed(2),
        "% Desconto": (parseFloat(sale.percentual_desconto) * 100).toFixed(2),
        "Valor Final": vFinal.toFixed(2),
        "Suspeita Ajuste": sale.tem_suspeita_preco_errado ? "SIM" : "NÃO"
      };
    });
    exportToCsv(`Auditoria_Descontos_${activeView}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Guia Didático de Segurança */}
      <div className={cn(
        "p-6 rounded-[2rem] border-2 flex flex-col md:flex-row items-center gap-6 shadow-sm",
        activeView === 'audit' ? "bg-rose-50 border-rose-100" : "bg-sky-50 border-sky-100"
      )}>
        <div className={cn(
          "p-4 rounded-3xl shrink-0",
          activeView === 'audit' ? "bg-white text-rose-500 shadow-rose-100" : "bg-white text-sky-500 shadow-sky-100"
        )}>
          {activeView === 'audit' ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h2 className={cn("text-xl font-black uppercase tracking-tight", activeView === 'audit' ? "text-rose-800" : "text-sky-800")}>
            {activeView === 'audit' ? "Auditoria de Descontos Críticos" : "Filtro de Descontos Seguros"}
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            {activeView === 'audit' 
              ? "Identificando descontos manuais, avulsos ou suspeitos de correção de preço errado (ajustes para final psicológico 1, 5 ou 9)." 
              : "Exibindo Campanhas oficiais validas pelo motor matemático e Vendas Adicionais confirmadas."}
          </p>
        </div>
        <div className="hidden lg:block w-px h-12 bg-slate-200" />
        <div className="grid grid-cols-2 gap-8 text-center md:text-left">
           <div>
             <p className="text-[9px] font-black text-slate-400 uppercase">Alertas Ativos</p>
             <p className="text-xl font-black text-slate-700">{stats.count} Notas</p>
           </div>
           {activeView === 'audit' && (
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Suspeita Ajuste</p>
               <p className="text-xl font-black text-orange-600">{stats.precoErradoCount}</p>
             </div>
           )}
        </div>
      </div>

      <Tabs defaultValue="audit" onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-slate-100 rounded-2xl h-14 p-1 shadow-sm">
          <TabsTrigger value="audit" className="rounded-xl font-black text-xs uppercase data-[state=active]:bg-rose-500 data-[state=active]:text-white">
            <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Risco Operacional
          </TabsTrigger>
          <TabsTrigger value="registry" className="rounded-xl font-black text-xs uppercase data-[state=active]:bg-sky-600 data-[state=active]:text-white">
            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Estratégicos (Seguros)
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <Card className="ri-card border-none shadow-sm overflow-hidden">
            <div className="p-4 bg-white space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar por NF, Cliente ou CPF..." 
                    className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-xs font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleExport} className="rounded-xl h-11 font-black text-[10px] border-slate-200 text-slate-600 gap-2">
                  <Download className="w-4 h-4" /> EXPORTAR
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Colaborador</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold text-[10px] uppercase">
                      <SelectValue placeholder="Todos os Vendedores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos os Vendedores</SelectItem>
                      {vendorsList.map(v => (
                        <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Desconto Mínimo (%)</label>
                  <Select value={minDiscountPercent} onValueChange={setMinDiscountPercent}>
                    <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold text-[10px] uppercase">
                      <SelectValue placeholder="Qualquer Desconto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-xs">Qualquer Desconto</SelectItem>
                      <SelectItem value="5" className="text-xs">Acima de 5%</SelectItem>
                      <SelectItem value="10" className="text-xs">Acima de 10%</SelectItem>
                      <SelectItem value="15" className="text-xs">Acima de 15%</SelectItem>
                      <SelectItem value="20" className="text-xs">Acima de 20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                   <Badge variant="outline" className="h-10 w-full justify-center bg-slate-50 border-slate-100 text-slate-400 font-black text-[9px] uppercase">
                     Mostrando {filteredData.length} vendas
                   </Badge>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-xl shadow-slate-100/20">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 h-12">
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-8">NF / Data</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400">Tipo Desconto</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Venda Bruta</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Desconto</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">% Real</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((sale) => {
                    const vFinal = parseFloat(sale.vNF);
                    const vDesc = parseFloat(sale.desconto_total);
                    const perc = parseFloat(sale.percentual_desconto) * 100;
                    const isHigh = perc >= HI_DISCOUNT_THRESHOLD && activeView === 'audit';

                    return (
                      <TableRow key={sale.chave} className="hover:bg-slate-50 border-slate-50 cursor-pointer group transition-colors h-16" onClick={() => setSelectedSale(sale)}>
                        <TableCell className="pl-8">
                          <p className="text-xs font-black text-slate-700">#{sale.nf}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM HH:mm")}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-black text-slate-600 uppercase truncate max-w-[120px]">{sale.vendedor}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[8px] font-black uppercase px-2 h-5 border-none",
                            sale.tipo_desconto === 'CAMPANHA' ? "bg-sky-100 text-sky-700" :
                            sale.tipo_desconto === 'ADICIONAL' ? "bg-emerald-100 text-emerald-700" :
                            sale.tipo_desconto === 'AJUSTE DE PREÇO' ? "bg-orange-100 text-orange-700 animate-pulse" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {sale.tipo_desconto === 'CAMPANHA' ? <Star className="w-2.5 h-2.5 mr-1 fill-current" /> : (sale.tipo_desconto === 'AJUSTE DE PREÇO' ? <Tags className="w-2.5 h-2.5 mr-1" /> : <Zap className="w-2.5 h-2.5 mr-1 fill-current" />)}
                            {sale.tipo_desconto}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-[10px] font-bold text-slate-300 line-through leading-none mb-1">{formatBRL(vFinal + vDesc)}</p>
                          <p className="text-xs font-black text-slate-700 leading-none">{formatBRL(vFinal)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className={cn("text-xs font-black", activeView === 'audit' ? "text-rose-600" : "text-emerald-600")}>
                            -{formatBRL(vDesc)}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "text-[10px] font-black border-none px-3 h-6",
                            isHigh ? "bg-rose-600 text-white" : 
                            activeView === 'audit' ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700"
                          )}>
                            {perc.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell><ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-all group-hover:translate-x-1" /></TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-slate-300 font-black uppercase text-xs">
                        Nenhum registro encontrado para estes filtros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="lg:hidden space-y-3">
              {filteredData.map((sale) => {
                const vFinal = parseFloat(sale.vNF);
                const vDesc = parseFloat(sale.desconto_total);
                const perc = parseFloat(sale.percentual_desconto) * 100;

                return (
                  <div key={sale.chave} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4" onClick={() => setSelectedSale(sale)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-sm font-black text-slate-800">NF #{sale.nf}</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{format(parseISO(sale.dhEmi), "dd/MM/yy HH:mm")}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-black border-none h-6",
                        activeView === 'audit' ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700"
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
                        <p className={cn("text-[10px] font-black", activeView === 'audit' ? "text-rose-600" : "text-sky-600")}>-{formatBRL(vDesc)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 text-slate-400">{sale.tipo_desconto}</Badge>
                      <p className="text-sm font-black text-slate-900">{formatBRL(vFinal)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Tabs>

      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-white border-l-4 border-orange-500 p-0 overflow-y-auto">
          {selectedSale && (
            <div className="h-full flex flex-col">
              <div className={cn(
                "p-8 md:p-10 space-y-4 text-white",
                selectedSale.tipo_desconto === 'CAMPANHA' ? "bg-sky-500" :
                selectedSale.tipo_desconto === 'ADICIONAL' ? "bg-emerald-500" : 
                selectedSale.tipo_desconto === 'AJUSTE DE PREÇO' ? "bg-orange-500" : "bg-slate-800"
              )}>
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <Percent className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-black uppercase text-white leading-none">Auditoria NF #{selectedSale.nf}</SheetTitle>
                    <Badge className="bg-white/20 text-white border-none mt-2 text-[10px] font-black uppercase">
                      {selectedSale.status_auditoria}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-80">Vendedor</p>
                    <p className="text-sm font-black uppercase">{selectedSale.vendedor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase opacity-80">Desconto Total (%)</p>
                    <p className="text-2xl font-black">{(parseFloat(selectedSale.percentual_desconto) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-10 space-y-10 flex-1">
                {/* Alerta de Ajuste Manual */}
                {selectedSale.tem_suspeita_preco_errado && (
                  <section className="bg-orange-50 border-2 border-orange-100 p-6 rounded-[2rem] space-y-3">
                    <div className="flex items-center gap-2 text-orange-700">
                      <AlertTriangle className="w-5 h-5" />
                      <h4 className="text-xs font-black uppercase tracking-widest">Suspeita de Correção Manual</h4>
                    </div>
                    <p className="text-sm font-medium text-orange-800 leading-relaxed italic">
                      "Identificamos que um ou mais itens deste cupom foram ajustados para terminar em final psicológico (1, 5 ou 9). Isso geralmente indica correção de preço de prateleira via desconto direto no PDV."
                    </p>
                  </section>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <ValueDetail label="Valor Bruto" value={formatBRL(parseFloat(selectedSale.vNF) + parseFloat(selectedSale.desconto_total))} color="text-slate-400" strike />
                  <ValueDetail label="Desconto" value={formatBRL(parseFloat(selectedSale.desconto_total))} color="text-rose-500" />
                  <ValueDetail label="Valor Final" value={formatBRL(parseFloat(selectedSale.vNF))} color="text-slate-800" />
                </div>

                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Detalhamento por Item</h4>
                  <div className="space-y-3">
                    {selectedSale.itens.map((item, idx) => {
                      const unitBruto = item.vProd / item.qCom;
                      const unitDesc = item.vDesc / item.qCom;
                      const unitLiq = unitBruto - unitDesc;
                      const perc = unitBruto > 0 ? (unitDesc / unitBruto) * 100 : 0;

                      return (
                        <div key={idx} className={cn(
                          "p-4 rounded-2xl border transition-all",
                          item.is_preco_errado ? "bg-orange-50 border-orange-200 shadow-sm" : "bg-white border-slate-100"
                        )}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold text-slate-700 truncate uppercase">{item.xProd}</p>
                              <p className="text-xs text-slate-400 font-medium uppercase">Cod: {item.cProd} • Qtd: {item.qCom}</p>
                            </div>
                            {item.is_preco_errado && (
                              <Badge className="bg-orange-500 text-white text-[8px] font-black uppercase">AJUSTE</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-50 mt-2">
                             <ItemMetric label="Preço Bruto" val={formatBRL(unitBruto)} />
                             <ItemMetric label="Desconto" val={`-${formatBRL(unitDesc)}`} color="text-rose-600" />
                             <ItemMetric label="Preço Final" val={formatBRL(unitLiq)} color="text-slate-800" />
                          </div>

                          {item.evidencia_preco_errado && (
                            <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-orange-600 uppercase bg-white/50 p-2 rounded-lg">
                               <Info className="w-3 h-3" />
                               {item.evidencia_preco_errado} ({perc.toFixed(1)}%)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="p-8 border-t bg-slate-50 mt-auto">
                <Button onClick={() => setSelectedSale(null)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl h-16 uppercase shadow-lg">CONCLUIR AUDITORIA</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ValueDetail({ label, value, color, strike = false }: any) {
  return (
    <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-xs md:text-sm font-black tracking-tight", color, strike && "line-through opacity-50")}>{value}</p>
    </div>
  );
}

function ItemMetric({ label, val, color = "text-slate-500" }: any) {
  return (
    <div>
      <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">{label}</p>
      <p className={cn("text-[10px] font-bold", color)}>{val}</p>
    </div>
  );
}
