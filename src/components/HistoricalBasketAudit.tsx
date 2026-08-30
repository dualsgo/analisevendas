"use client";

import React, { useState, useMemo, useCallback } from "react";
import JSZip from "jszip";
import { 
  Upload, 
  Loader2, 
  Copy, 
  Download, 
  Check, 
  BarChart3, 
  Calendar, 
  Sparkles, 
  Target, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  RotateCcw,
  Store,
  Smartphone,
  Zap,
  Truck,
  ArrowRightLeft,
  Filter
} from "lucide-react";
import { DetailedSaleRow } from "@/lib/types";
import { parseXml } from "@/lib/xml-parser";
import { 
  computeHistoricalBasketAudit, 
  generateMarkdownReportForAI, 
  HistoricalAuditReport,
  CANAL_LABELS
} from "@/lib/historical-basket-audit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  LineChart, 
  Line 
} from "recharts";
import { cn } from "@/lib/utils";

interface HistoricalBasketAuditProps {
  initialData?: DetailedSaleRow[];
}

export function HistoricalBasketAudit({ initialData }: HistoricalBasketAuditProps) {
  const [salesData, setSalesData] = useState<DetailedSaleRow[]>(initialData || []);
  const [selectedCanal, setSelectedCanal] = useState<string>("ALL");
  const [isReading, setIsReading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [, setErrorCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Computa o relatório analítico baseado no canal selecionado
  const auditReport: HistoricalAuditReport = useMemo(() => {
    return computeHistoricalBasketAudit(salesData, selectedCanal);
  }, [salesData, selectedCanal]);

  // Texto em Markdown para exportação
  const markdownReport = useMemo(() => {
    return generateMarkdownReportForAI(auditReport);
  }, [auditReport]);

  // Processador em lote (Streaming Chunks)
  const processXmlListInChunks = async (xmlStrings: string[]): Promise<DetailedSaleRow[]> => {
    const total = xmlStrings.length;
    const parsed: DetailedSaleRow[] = [];
    let errors = 0;
    const CHUNK_SIZE = 150;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = xmlStrings.slice(i, i + CHUNK_SIZE);
      for (const xmlStr of chunk) {
        try {
          const row = parseXml(xmlStr);
          if (row) parsed.push(row);
          else errors++;
        } catch {
          errors++;
        }
      }
      const processedCount = Math.min(i + CHUNK_SIZE, total);
      const pct = Math.round((processedCount / total) * 100);
      setProgressPercent(pct);
      setProgressStatus(`Processando ${processedCount.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} notas fiscais (${pct}%)...`);
      await new Promise(r => setTimeout(r, 0));
    }

    if (errors > 0) setErrorCount(errors);
    return parsed;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    setIsReading(true);
    setErrorCount(0);
    setProgressPercent(5);
    setProgressStatus("Lendo arquivos...");

    const xmlStringsToParse: string[] = [];
    let localErrorCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name.toLowerCase();
        setProgressStatus(`Extraindo pacote: ${file.name} (${i + 1}/${files.length})...`);

        try {
          if (fileName.endsWith(".zip")) {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            const xmlEntries = Object.keys(content.files).filter(
              name => !content.files[name].dir && name.toLowerCase().endsWith(".xml")
            );
            for (const name of xmlEntries) {
              try {
                const xmlContent = await content.files[name].async("string");
                xmlStringsToParse.push(xmlContent);
              } catch {
                localErrorCount++;
              }
            }
          } else if (fileName.endsWith(".xml")) {
            const xmlContent = await file.text();
            xmlStringsToParse.push(xmlContent);
          }
        } catch {
          localErrorCount++;
        }
      }

      if (xmlStringsToParse.length > 0) {
        const rows = await processXmlListInChunks(xmlStringsToParse);
        setSalesData(rows);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReading(false);
      setProgressPercent(100);
      setProgressStatus("Processamento concluído!");
    }
  }, []);

  const handleCopyReport = () => {
    navigator.clipboard.writeText(markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-auditoria-cestas-canal-${selectedCanal}-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dados-auditoria-cestas-canal-${selectedCanal}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasData = auditReport.channelStats.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* 1. CABEÇALHO DO LABORATÓRIO DE AUDITORIA */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs px-3 py-1 uppercase tracking-wider">
              🧪 Laboratório Standalone
            </Badge>
            <span className="text-xs font-bold text-indigo-200 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Benchmark Histórico por Canal (Jan a Ago)
            </span>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/50 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Offline e Seguro no Navegador
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5 text-white">
                <Target className="w-7 h-7 text-indigo-400 shrink-0" />
                Auditoria de Proporções de Cestas & Metas por Canal
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                Compare as proporções de <strong>Loja Física (Presencial)</strong> vs <strong>Retiradas Online</strong> vs <strong>Delivery</strong> de Janeiro a Agosto para definir metas realistas e personalizadas por canal.
              </p>
            </div>

            {hasData && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button 
                  onClick={handleCopyReport}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs h-11 px-5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Relatório Copiado!" : "Copiar Relatório p/ o Gemini"}
                </Button>
                <Button 
                  onClick={handleDownloadMarkdown}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-11 px-4 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Baixar .md
                </Button>
                <Button 
                  onClick={handleDownloadJson}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-11 px-4 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  JSON
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. ZONA DE CARREGAMENTO MULTI-ARQUIVOS */}
      <Card className="ri-card p-6 border-dashed border-2 border-indigo-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Carregar Pacotes de Vendas (ZIPs ou XMLs de Jan a Ago)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Você pode selecionar de uma só vez múltiplos arquivos ZIP contendo as notas fiscais de cada mês.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="cursor-pointer">
              <input 
                type="file" 
                multiple 
                accept=".zip,.xml" 
                className="hidden" 
                onChange={e => e.target.files && handleFiles(e.target.files)} 
              />
              <Button 
                type="button" 
                asChild
                disabled={isReading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl cursor-pointer shadow-sm"
              >
                <span>
                  {isReading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Lendo Arquivos...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivos ZIP / XML
                    </>
                  )}
                </span>
              </Button>
            </label>

            {salesData.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSalesData([])}
                className="h-10 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {isReading && (
          <div className="space-y-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex justify-between text-xs font-bold text-indigo-900">
              <span>{progressStatus}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-indigo-200" />
          </div>
        )}
      </Card>

      {!hasData ? (
        <Card className="ri-card p-12 text-center space-y-4 bg-white border-slate-200">
          <HelpCircle className="w-12 h-12 text-indigo-400 mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Nenhum dado carregado ainda</h3>
            <p className="text-xs text-slate-500 font-medium">
              Selecione os arquivos ZIP de vendas dos meses desejados acima para iniciar o raio-x estatístico das cestas por canal.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* 3. COMPARATIVO GERAL ENTRE CANAIS DE VENDA */}
          <Card className="ri-card p-6 space-y-6 bg-white border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Comparativo de PA e Proporções Entre Canais de Venda
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Veja como a dinâmica de cestas varia entre o atendimento presencial de balcão vs pedidos de retirada online e delivery.
                </p>
              </div>
            </div>

            {/* Tabela Comparativa de Canais */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Canal de Venda</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% Mix</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Sustentado (1-5)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-rose-700 text-center">% 1 Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-cyan-700 text-center">% 2 Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-indigo-700 text-center">% 3+ Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Ticket Médio</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditReport.channelStats.map(c => {
                    const isSelected = selectedCanal === c.canal;
                    return (
                      <TableRow 
                        key={c.canal} 
                        className={cn(
                          "h-12 hover:bg-slate-50/80 transition-colors cursor-pointer",
                          isSelected && "bg-indigo-50/60 font-bold"
                        )}
                        onClick={() => setSelectedCanal(c.canal)}
                      >
                        <TableCell className="font-black text-slate-900 text-xs">
                          <div className="flex items-center gap-2">
                            {c.canal === "LOJA_FISICA" ? <Store className="w-4 h-4 text-indigo-600" /> :
                             c.canal === "RETIRADA_ONLINE" ? <Smartphone className="w-4 h-4 text-emerald-600" /> :
                             c.canal === "RETIRADA_ADICIONAL" ? <Zap className="w-4 h-4 text-amber-500" /> :
                             c.canal === "DELIVERY" ? <Truck className="w-4 h-4 text-rose-500" /> :
                             <ArrowRightLeft className="w-4 h-4 text-slate-500" />}
                            <span>{c.canalLabel}</span>
                            {isSelected && <Badge className="bg-indigo-600 text-white text-[8px] font-black uppercase">Ativo</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-700">{c.totalCupons.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-center font-bold text-slate-500 text-xs">{c.cuponsRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-black text-slate-900 text-sm">{c.paReal.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-black text-emerald-700 text-sm">{c.paSustentado1to5.toFixed(2)}</TableCell>
                        <TableCell className={cn("text-center font-black text-xs", c.unitRate <= 50 ? "text-emerald-700" : "text-rose-600")}>
                          {c.unitRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className={cn("text-center font-black text-xs", c.twoItemsRate >= 30 ? "text-emerald-700" : "text-amber-600")}>
                          {c.twoItemsRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center font-black text-indigo-600 text-xs">
                          {c.threePlusRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-700 text-xs">
                          R$ {c.avgTicket.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCanal(isSelected ? "ALL" : c.canal);
                            }}
                            className={cn("h-7 text-[10px] font-bold rounded-lg", isSelected ? "bg-indigo-600 text-white" : "text-slate-700")}
                          >
                            {isSelected ? "Ver Todos" : "Isolar Canal"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* 4. BARRA DE SELEÇÃO DE CANAL ATIVO */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black uppercase text-indigo-950">Visualização Atual:</span>
              <Badge className="bg-indigo-600 text-white font-black text-xs px-3 py-0.5">
                {CANAL_LABELS[selectedCanal] || selectedCanal}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={selectedCanal === "ALL" ? "default" : "outline"}
                onClick={() => setSelectedCanal("ALL")}
                className={cn("h-8 text-xs font-bold rounded-xl", selectedCanal === "ALL" && "bg-indigo-600 text-white")}
              >
                Todos Consolidados
              </Button>
              {auditReport.channelStats.map(c => (
                <Button
                  key={c.canal}
                  size="sm"
                  variant={selectedCanal === c.canal ? "default" : "outline"}
                  onClick={() => setSelectedCanal(c.canal)}
                  className={cn("h-8 text-xs font-bold rounded-xl", selectedCanal === c.canal && "bg-indigo-600 text-white")}
                >
                  {c.canal === "LOJA_FISICA" ? "🏪 Loja Física" :
                   c.canal === "RETIRADA_ONLINE" ? "📦 Retirada Online" :
                   c.canal === "RETIRADA_ADICIONAL" ? "⚡ Venda Adicional" :
                   c.canal === "DELIVERY" ? "🛵 Delivery" : c.canalLabel}
                </Button>
              ))}
            </div>
          </div>

          {/* 5. GRID DE KPIS DO CANAL SELECIONADO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="ri-card bg-white p-4 space-y-1 border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Cupons</span>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {auditReport.activeSalesCount.toLocaleString("pt-BR")}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {auditReport.dateRange.monthsCount} meses analisados
              </p>
            </Card>

            <Card className="ri-card bg-white p-4 space-y-1 border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400">PA Real</span>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-indigo-600 tracking-tight">{auditReport.overallPaReal.toFixed(2)}</p>
                <span className="text-xs font-bold text-slate-400">pçs/cup</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                {auditReport.totalPieces.toLocaleString("pt-BR")} peças no total
              </p>
            </Card>

            <Card className="ri-card bg-white p-4 space-y-1 border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400">PA Sustentado (1-5)</span>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black text-emerald-600 tracking-tight">{auditReport.overallPaSustentado.toFixed(2)}</p>
                <span className="text-xs font-bold text-slate-400">sem 6+</span>
              </div>
              <p className="text-[10px] text-purple-600 font-bold">
                Δ Outliers: +{(auditReport.overallPaReal - auditReport.overallPaSustentado).toFixed(2)} PA
              </p>
            </Card>

            <Card className="ri-card bg-white p-4 space-y-1 border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400">% 1 Item</span>
                <Badge variant="outline" className={cn("text-[8px] font-black uppercase", auditReport.benchmark.avgUnitRate <= 50 ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-rose-300 text-rose-700 bg-rose-50")}>
                  Meta ≤ 50%
                </Badge>
              </div>
              <p className={cn("text-2xl font-black tracking-tight", auditReport.benchmark.avgUnitRate <= 50 ? "text-emerald-600" : "text-rose-600")}>
                {auditReport.benchmark.avgUnitRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Mín: {auditReport.benchmark.minUnitRate.toFixed(1)}% | Máx: {auditReport.benchmark.maxUnitRate.toFixed(1)}%
              </p>
            </Card>

            <Card className="ri-card bg-white p-4 space-y-1 border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400">% 2 Itens</span>
                <Badge variant="outline" className={cn("text-[8px] font-black uppercase", auditReport.benchmark.avgTwoItemsRate >= 30 ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-amber-300 text-amber-700 bg-amber-50")}>
                  Meta ≥ 30%
                </Badge>
              </div>
              <p className={cn("text-2xl font-black tracking-tight", auditReport.benchmark.avgTwoItemsRate >= 30 ? "text-emerald-600" : "text-amber-600")}>
                {auditReport.benchmark.avgTwoItemsRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Mín: {auditReport.benchmark.minTwoItemsRate.toFixed(1)}% | Máx: {auditReport.benchmark.maxTwoItemsRate.toFixed(1)}%
              </p>
            </Card>

            <Card className="ri-card bg-white p-4 space-y-1 border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400">% 3+ Itens</span>
              <p className="text-2xl font-black text-indigo-600 tracking-tight">
                {auditReport.benchmark.avgThreePlusRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Profundidade consolidada
              </p>
            </Card>
          </div>

          {/* 6. VEREDITO ESTATÍSTICO DE ADERÊNCIA À REALIDADE */}
          <Card className="ri-card p-6 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 border-indigo-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                  Diagnóstico Estatístico: {CANAL_LABELS[selectedCanal] || selectedCanal}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  "text-[10px] font-black uppercase",
                  auditReport.benchmark.realityVerdict1Item === "REALISTA" ? "bg-emerald-600 text-white" :
                  auditReport.benchmark.realityVerdict1Item === "DESAFIADOR" ? "bg-amber-500 text-white" : "bg-rose-600 text-white"
                )}>
                  1 Item: {auditReport.benchmark.realityVerdict1Item}
                </Badge>
                <Badge className={cn(
                  "text-[10px] font-black uppercase",
                  auditReport.benchmark.realityVerdict2Items === "REALISTA" ? "bg-emerald-600 text-white" :
                  auditReport.benchmark.realityVerdict2Items === "DESAFIADOR" ? "bg-amber-500 text-white" : "bg-purple-600 text-white"
                )}>
                  2 Itens: {auditReport.benchmark.realityVerdict2Items}
                </Badge>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-800 leading-relaxed">
              {auditReport.benchmark.summaryText}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs font-semibold text-slate-700">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Aderência à Meta de 1 Item (≤ 50%)</span>
                <p className="text-base font-black text-slate-900">
                  {auditReport.benchmark.monthsHitting1ItemRule} de {auditReport.monthlyStats.length} meses ({auditReport.benchmark.pctMonthsHitting1ItemRule.toFixed(0)}%)
                </p>
                <p className="text-[10px] text-slate-500">Média histórica: {auditReport.benchmark.avgUnitRate.toFixed(1)}%</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Aderência à Meta de 2 Itens (≥ 30%)</span>
                <p className="text-base font-black text-slate-900">
                  {auditReport.benchmark.monthsHitting2ItemsRule} de {auditReport.monthlyStats.length} meses ({auditReport.benchmark.pctMonthsHitting2ItemsRule.toFixed(0)}%)
                </p>
                <p className="text-[10px] text-slate-500">Média histórica: {auditReport.benchmark.avgTwoItemsRate.toFixed(1)}%</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Parâmetro Sugerido Base Real</span>
                <p className="text-base font-black text-indigo-600">
                  1 Item: ≤ {auditReport.benchmark.recommendedUnitTarget}% | 2 Itens: ≥ {auditReport.benchmark.recommendedTwoItemsTarget}%
                </p>
                <p className="text-[10px] text-slate-500">Saldo 3+: ≥ {(100 - auditReport.benchmark.recommendedUnitTarget - auditReport.benchmark.recommendedTwoItemsTarget)}%</p>
              </div>
            </div>
          </Card>

          {/* 7. TABELA DE DISTRIBUIÇÃO GRANULAR (1 A 15+ ITENS) */}
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Distribuição Granular de Peças por Cupom — [{CANAL_LABELS[selectedCanal] || selectedCanal}]
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Análise detalhada da participação exata de cada tamanho de cesta no fluxo e no faturamento.
                </p>
              </div>
            </div>

            {/* Gráfico de Barras Granular */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditReport.granularBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: string) => [
                      `${Number(val).toFixed(2)}%`, 
                      name === "couponsRate" ? "% dos Cupons" : "% das Peças"
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                  <Bar dataKey="couponsRate" name="% dos Cupons" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="piecesRate" name="% das Peças" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Granular */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Tamanho da Cesta</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Peças</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% Peças</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Receita Total</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% Receita</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Ticket Médio</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-indigo-700 text-center">Contrib. no PA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditReport.granularBuckets.map(b => (
                    <TableRow key={b.itemCount} className="h-11 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">
                        {b.label}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{b.couponsCount.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-xs">
                        <span className={cn(
                          b.itemCount === 1 && b.couponsRate > 50 ? "text-rose-600 font-black" :
                          b.itemCount === 2 && b.couponsRate < 30 ? "text-amber-600 font-black" : "text-slate-900"
                        )}>
                          {b.couponsRate.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{b.piecesCount.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600 text-xs">{b.piecesRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-xs">
                        R$ {b.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-xs">{b.revenueRate.toFixed(2)}%</TableCell>
                      <TableCell className="text-center font-bold text-indigo-600 text-xs">
                        R$ {b.avgTicket.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-black text-indigo-700 text-xs">
                        +{b.paContribution.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* 8. MATRIZ MÊS A MÊS (JANEIRO A AGOSTO) */}
          <Card className="ri-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Evolução Mensal das Cestas — [{CANAL_LABELS[selectedCanal] || selectedCanal}]
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Audite o comportamento de cada mês e veja em quais períodos a meta de 1 item (≤ 50%) e 2 itens (≥ 30%) foi atingida.
                </p>
              </div>
            </div>

            {/* Gráfico de Evolução Mensal das Metas */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={auditReport.monthlyStats} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthShort" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} domain={[1, 'auto']} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fontWeight: 700, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(val: any, name: string) => [
                      name.includes("%") ? `${Number(val).toFixed(1)}%` : Number(val).toFixed(2),
                      name
                    ]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: 700 }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="paReal" name="PA Real Oficial" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="paSustentado1to5" name="PA Sustentado (Sem 6+)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="unitRate" name="% 1 Item (Meta ≤50%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="twoItemsRate" name="% 2 Itens (Meta ≥30%)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Mês a Mês */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-10">
                    <TableHead className="text-[10px] font-black uppercase text-slate-600">Mês</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">Cupons</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">PA Real</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-emerald-700 text-center">PA Sustentado (1-5)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 1 Item (Meta ≤50%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 2 Itens (Meta ≥30%)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 3 Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-600 text-center">% 4-5 Itens</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-purple-700 text-center">Vendas Atípicas (6+)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditReport.monthlyStats.map(m => (
                    <TableRow key={m.monthKey} className="h-12 hover:bg-slate-50/80">
                      <TableCell className="font-black text-slate-900 text-xs">
                        {m.monthLabel}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{m.totalCupons.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm">{m.paReal.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-black text-emerald-700 text-sm">{m.paSustentado1to5.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[9px] font-bold uppercase",
                          m.unitRuleSuccess ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"
                        )}>
                          {m.unitRate.toFixed(1)}% {m.unitRuleSuccess ? "✓" : "⚠"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[9px] font-bold uppercase",
                          m.twoItemsRuleSuccess ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"
                        )}>
                          {m.twoItemsRate.toFixed(1)}% {m.twoItemsRuleSuccess ? "✓" : "✗"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-xs">{m.threeItemsRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-slate-700 text-xs">{m.fourToFiveRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-bold text-purple-700 text-xs">
                        {m.outlierCouponsCount > 0 ? `${m.outlierCouponsCount} cup (${m.outlierPiecesCount} pçs)` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* 9. PREVIEW DO RELATÓRIO PRONTO PARA A IA */}
          <Card className="ri-card p-6 space-y-4 bg-slate-900 text-slate-100 border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Pré-visualização do Relatório para Análise da IA
                </h3>
              </div>
              <Button 
                onClick={handleCopyReport}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado com Sucesso!" : "Copiar Texto Completo"}
              </Button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-80 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 whitespace-pre-wrap leading-relaxed">
              {markdownReport}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
