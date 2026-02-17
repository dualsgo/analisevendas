
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  FileText,
  Smartphone,
  Store,
  ArrowRightLeft,
  Percent,
  Calendar,
  User,
  Zap,
  ChevronRight,
  Filter,
  Download,
  Ban,
  Printer,
  Upload,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ThermalReceipt } from "./ThermalReceipt";
import { parseXml } from "@/lib/xml-parser";
import { useToast } from "@/hooks/use-toast";

interface TransactionListProps {
  data: DetailedSaleRow[];
}

export function TransactionList({ data }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<DetailedSaleRow | null>(null);
  const [showThermal, setShowThermal] = useState(false);
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    return data.filter(t => {
      const matchesSearch = 
        t.nf.includes(searchTerm) || 
        t.chave.includes(searchTerm) || 
        t.nome_dest.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.cpf_cnpj_dest.includes(searchTerm);
      
      const matchesChannel = selectedChannel === "all" || t.canal_consolidado === selectedChannel;
      const matchesStatus = selectedStatus === "all" || 
        (selectedStatus === "cancelada" && t.is_cancelada) || 
        (selectedStatus === "ativa" && !t.is_cancelada);

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [data, searchTerm, selectedChannel, selectedStatus]);

  const handleQuickPrint = (t: DetailedSaleRow) => {
    setSelectedTransaction(t);
    setShowThermal(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo XML de nota fiscal.",
        variant: "destructive",
      });
      return;
    }

    try {
      const xmlContent = await file.text();
      const parsed = parseXml(xmlContent);
      if (parsed) {
        setSelectedTransaction(parsed);
        setShowThermal(true);
        toast({
          title: "XML Processado",
          description: `Nota #${parsed.nf} carregada para impressão.`,
        });
      } else {
        throw new Error("Falha no parse");
      }
    } catch (e) {
      toast({
        title: "Erro ao ler XML",
        description: "Não foi possível processar este arquivo fiscal.",
        variant: "destructive",
      });
    }
    // Reset input
    event.target.value = "";
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Upload Rápido para 2ª Via */}
      <Card className="ri-card border-2 border-dashed border-orange-200 bg-orange-50/20 p-6 flex flex-col md:flex-row items-center gap-4 group transition-all hover:border-orange-400">
        <div className="bg-orange-100 p-4 rounded-full group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1 text-center md:text-left space-y-1">
          <h3 className="text-sm font-black text-orange-900 uppercase">Gerar 2ª Via Avulsa</h3>
          <p className="text-[10px] font-bold text-orange-700/70">Arraste um XML aqui para imprimir o cupom de 80mm instantaneamente.</p>
        </div>
        <div className="relative">
          <Input 
            type="file" 
            accept=".xml" 
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl gap-2 h-11 px-8 pointer-events-none text-sm">
            ANEXAR XML
          </Button>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="ri-card border-none shadow-sm overflow-hidden">
        <div className="p-4 bg-white space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por NF, Chave, Cliente ou CPF..." 
              className="pl-9 rounded-xl border-slate-100 bg-slate-50/50 h-11 text-sm text-slate-700 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Canal de Venda</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold text-xs">
                  <SelectValue placeholder="Todos os Canais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-medium">Todos os Canais</SelectItem>
                  <SelectItem value="VENDA_LOJA" className="text-xs font-medium">Venda Loja</SelectItem>
                  <SelectItem value="RETIRADA_ONLINE" className="text-xs font-medium">Retirada Online</SelectItem>
                  <SelectItem value="TROCA" className="text-xs font-medium">Troca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Status SEFAZ</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50/50 h-10 font-bold">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativa">Ativas / Autorizadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
               <Badge variant="outline" className="h-10 w-full justify-center bg-slate-50 border-slate-100 text-slate-500 font-bold text-xs">
                 Total: {filteredData.length} registros
               </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Listagem */}
      <div className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-xl shadow-slate-100/50">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-50">
                <TableHead className="text-xs font-bold uppercase text-slate-500">NF / Emissão</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500">Canal / Tipo</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500">Colaborador</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500">Cliente</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500 text-right">Valor</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((t) => (
                <TableRow key={t.chave} className="hover:bg-slate-50 cursor-pointer group" onClick={() => { setSelectedTransaction(t); setShowThermal(false); }}>
                  <TableCell>
                    <p className="text-sm font-bold text-slate-700">#{t.nf}</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">{t.dhEmi ? format(parseISO(t.dhEmi), "dd/MM HH:mm") : "--"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {getChannelIcon(t.canal_consolidado)}
                       <span className="text-xs font-bold text-slate-600 uppercase">{t.canal_consolidado.replace("_", " ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-bold text-slate-600 uppercase truncate max-w-[120px]">{t.vendedor}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-bold text-slate-700 uppercase truncate max-w-[150px]">{t.nome_dest || "Consumidor"}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.cpf_cnpj_dest ? `***.${t.cpf_cnpj_dest.slice(-4)}-**` : "NÃO IDENTIFICADO"}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatBRL(parseFloat(t.vNF))}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.itens_qtd} ITENS</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                        onClick={(e) => { e.stopPropagation(); handleQuickPrint(t); }}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden space-y-3">
          {filteredData.map((t) => (
            <div key={t.chave} className="bg-white border-2 border-slate-50 rounded-2xl p-4 shadow-sm space-y-4" onClick={() => { setSelectedTransaction(t); setShowThermal(false); }}>
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-sm font-bold text-slate-800">NF #{t.nf}</h5>
                  <p className="text-xs text-slate-400 font-medium uppercase">{t.dhEmi ? format(parseISO(t.dhEmi), "dd/MM/yy HH:mm") : "--"}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-9 w-9 text-orange-500 border-orange-100"
                  onClick={(e) => { e.stopPropagation(); handleQuickPrint(t); }}
                >
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                 <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                   <p className="text-xs font-bold text-slate-700 uppercase">{t.vendedor}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Valor Total</p>
                   <p className="text-sm font-bold text-slate-900">{formatBRL(parseFloat(t.vNF))}</p>
                 </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   {getChannelIcon(t.canal_consolidado)}
                   <span className="text-xs font-bold text-slate-500 uppercase">{t.canal_consolidado}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">{t.itens_qtd} ITENS</span>
                  {t.is_cancelada && <Badge className="bg-red-500 text-white text-[8px] h-4">CANC</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhamento / 2ª Via Sheet */}
      <Sheet open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-white border-l-4 border-slate-800 p-0 overflow-y-auto">
          {selectedTransaction && (
            <div className="h-full flex flex-col">
              {/* Header Detalhe */}
              {!showThermal ? (
                <>
                  <div className="bg-slate-800 p-6 md:p-8 space-y-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6" />
                        <SheetTitle className="text-xl md:text-2xl font-black uppercase text-white">Transação #{selectedTransaction.nf}</SheetTitle>
                      </div>
                      <Button 
                        onClick={() => setShowThermal(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl gap-2 h-12 px-6 shadow-lg shadow-orange-900/20"
                      >
                        <Printer className="w-5 h-5" /> 2ª VIA TÉRMICA
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase opacity-80">Data Emissão</p>
                        <p className="text-sm font-black">{selectedTransaction.dhEmi ? format(parseISO(selectedTransaction.dhEmi), "dd/MM/yyyy HH:mm") : "--"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase opacity-80">Valor da Nota</p>
                        <p className="text-xl font-black">{formatBRL(parseFloat(selectedTransaction.vNF))}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-8 flex-1">
                    {/* Dados Fiscais */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Informações Fiscais
                      </h4>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 font-mono">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Chave de Acesso</p>
                          <p className="text-[10px] break-all text-slate-600 font-bold">{selectedTransaction.chave}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase">Protocolo</p>
                             <p className="text-[10px] text-slate-600 font-bold">{selectedTransaction.protocolo?.nProt || "---"}</p>
                           </div>
                           <div>
                             <p className="text-[8px] font-bold text-slate-400 uppercase">Status</p>
                             <p className="text-xs text-slate-600 font-bold uppercase">{selectedTransaction.protocolo?.xMotivo || "Ativa"}</p>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Smartphone className="w-3 h-3" /> Itens do Documento
                      </h4>
                      <div className="space-y-2">
                        {selectedTransaction.itens.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-bold text-slate-700 truncate uppercase">{item.xProd}</p>
                              <p className="text-xs text-slate-400 font-medium uppercase">Cod: {item.cProd} | Qtd: {item.qCom}</p>
                            </div>
                            <p className="text-sm font-bold text-slate-600">{formatBRL(item.vProd)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Emitter / Dest */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Colaborador</p>
                          <p className="text-xs font-black text-slate-700 uppercase">{selectedTransaction.vendedor}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Cliente</p>
                          <p className="text-xs font-black text-slate-700 uppercase">{selectedTransaction.nome_dest || "Final Consumidor"}</p>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 border-t bg-slate-50 mt-auto">
                    <Button onClick={() => setSelectedTransaction(null)} className="w-full bg-slate-800 hover:bg-slate-900 font-black rounded-xl py-6">FECHAR DETALHES</Button>
                  </div>
                </>
              ) : (
                <div className="p-6 md:p-12 overflow-y-auto">
                   <div className="flex justify-between items-center mb-10">
                      <Button variant="ghost" onClick={() => setShowThermal(false)} className="font-black text-slate-400 hover:text-orange-500">
                        <X className="w-4 h-4 mr-2" /> VOLTAR AO DETALHE
                      </Button>
                      <SheetTitle className="text-sm font-black uppercase tracking-widest">Visualização 2ª Via</SheetTitle>
                   </div>
                   <ThermalReceipt data={selectedTransaction} />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getChannelIcon(channel: string) {
  switch(channel) {
    case "VENDA_LOJA": return <Store className="w-3 h-3 text-slate-400" />;
    case "RETIRADA_ONLINE": return <Smartphone className="w-3 h-3 text-sky-400" />;
    case "TROCA": return <ArrowRightLeft className="w-3 h-3 text-purple-400" />;
    default: return <FileText className="w-3 h-3 text-slate-300" />;
  }
}
