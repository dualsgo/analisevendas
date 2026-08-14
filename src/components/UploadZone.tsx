"use client";

import React, { useState, useCallback } from "react";
import JSZip from "jszip";
import { Upload, Loader2, FileCheck, FileX, AlertCircle, LayoutDashboard, ShieldAlert, Sparkles } from "lucide-react";
import { parseXml } from "@/lib/xml-parser";
import { DetailedSaleRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onDataParsed: (rows: DetailedSaleRow[]) => void;
  isProcessing: boolean;
}

export function UploadZone({ onDataParsed, isProcessing }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [isReading, setIsReading] = useState(false);
  const { toast } = useToast();

  const processXmlListInChunks = async (xmlStrings: string[]): Promise<DetailedSaleRow[]> => {
    const total = xmlStrings.length;
    const parsed: DetailedSaleRow[] = [];
    let errors = 0;
    const CHUNK_SIZE = 150; // Processa em fatias para não bloquear o frame do navegador

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
      setProgressStatus(`Decodificando ${processedCount.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} notas fiscais (${pct}%)...`);
      
      // Libera a main-thread brevemente
      await new Promise(r => setTimeout(r, 0));
    }

    if (errors > 0) setErrorCount(errors);
    return parsed;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    setIsReading(true);
    setSelectedCount(files.length);
    setErrorCount(0);
    setProgressPercent(5);
    setProgressStatus("Carregando arquivos selecionados...");

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
          } else {
            localErrorCount++;
          }
        } catch {
          localErrorCount++;
        }
      }

      if (xmlStringsToParse.length === 0) {
        setIsReading(false);
        toast({
          title: "Falha na leitura",
          description: "Nenhum XML válido no padrão SEFAZ (Modelo 65/55) foi identificado.",
          variant: "destructive",
        });
        setSelectedCount(0);
        return;
      }

      setProgressStatus(`Iniciando análise de ${xmlStringsToParse.length.toLocaleString('pt-BR')} notas fiscais...`);
      setProgressPercent(15);

      const allRows = await processXmlListInChunks(xmlStringsToParse);

      if (allRows.length > 0) {
        setProgressPercent(100);
        setProgressStatus(`Concluído! ${allRows.length.toLocaleString('pt-BR')} notas processadas com sucesso.`);
        setTimeout(() => {
          setIsReading(false);
          onDataParsed(allRows);
        }, 200);
      } else {
        setIsReading(false);
        toast({
          title: "Sem registros válidos",
          description: "Os arquivos não contêm dados fiscais válidos.",
          variant: "destructive",
        });
      }
    } catch (e) {
      setIsReading(false);
      console.error(e);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro durante a leitura dos arquivos.",
        variant: "destructive",
      });
    }
  }, [onDataParsed, toast]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const isBusy = isProcessing || isReading;

  return (
    <div className="w-full space-y-6">
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-3xl p-8 md:p-14 transition-all duration-500 flex flex-col items-center justify-center gap-6 group min-h-[300px] overflow-hidden",
          dragActive 
            ? "border-2 border-indigo-500 bg-indigo-50/90 scale-[1.01] shadow-2xl shadow-indigo-500/20" 
            : "border-2 border-dashed border-indigo-200/80 bg-gradient-to-b from-slate-50/80 to-white/90 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10",
          selectedCount > 0 && !isBusy && "border-solid border-emerald-500 bg-emerald-50/80 shadow-emerald-500/20"
        )}
      >
        {/* Animated background rings for idle state */}
        {!dragActive && selectedCount === 0 && !isBusy && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
             <div className="w-64 h-64 border-2 border-indigo-300 rounded-full animate-ping [animation-duration:3.5s]" />
             <div className="w-48 h-48 border border-indigo-400 rounded-full animate-ping [animation-duration:2.5s] absolute" />
          </div>
        )}

        <input
          type="file"
          multiple
          accept=".zip,.xml"
          onChange={handleChange}
          disabled={isBusy}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        
        <div className={cn(
          "relative z-10 p-5 md:p-6 rounded-2xl bg-white transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1.5 border shadow-lg shadow-slate-200/60",
          selectedCount > 0 ? "border-emerald-200 text-emerald-600" : dragActive ? "border-indigo-300 text-indigo-600" : "border-indigo-100 text-indigo-600"
        )}>
          {isBusy ? (
            <Loader2 className="w-9 h-9 md:w-10 md:h-10 animate-spin text-indigo-600" />
          ) : selectedCount > 0 ? (
            <FileCheck className="w-9 h-9 md:w-10 md:h-10 text-emerald-600" />
          ) : (
            <Upload className="w-9 h-9 md:w-10 md:h-10 text-indigo-600" />
          )}
        </div>

        <div className="text-center space-y-2 relative z-10 w-full max-w-md">
          <p className="text-xl md:text-2xl font-headline font-extrabold text-slate-900 tracking-tight">
            {isBusy ? "Processando Inteligência Fiscal..." : 
             selectedCount > 0 ? `${selectedCount} arquivos carregados` : 
             "Importar Dados Fiscais"}
          </p>
          <p className="text-xs md:text-sm text-slate-500 font-semibold tracking-wide max-w-xs mx-auto leading-relaxed">
            {isBusy ? (progressStatus || "Extraindo indicadores de performance...") :
             selectedCount > 0 ? "Dados prontos para o painel estratégico" : 
             "Arraste e solte seus pacotes ZIP ou XMLs da SEFAZ"}
          </p>

          {isBusy && (
            <div className="w-full mt-4 space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                <span>Progresso</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2.5 bg-indigo-100" />
            </div>
          )}
        </div>

        {errorCount > 0 && !isBusy && (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-5 py-2 rounded-full border border-rose-200 shadow-2xs relative z-10">
            <FileX className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{errorCount} arquivos inválidos</span>
          </div>
        )}
      </div>

      {!isBusy && selectedCount === 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-500 w-full">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xs border border-slate-200/80 transition-colors hover:border-slate-300">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Privacidade 100% Local (IndexedDB)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xs border border-slate-200/80 transition-colors hover:border-slate-300">
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Processamento em Chunks</span>
          </div>
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xs border border-slate-200/80 transition-colors hover:border-slate-300">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Padrão SEFAZ (65/55)</span>
          </div>
        </div>
      )}
    </div>
  );
}
