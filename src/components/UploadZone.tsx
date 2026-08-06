"use client";

import React, { useState, useCallback } from "react";
import JSZip from "jszip";
import { Upload, Loader2, FileCheck, FileX, AlertCircle, LayoutDashboard, ShieldAlert } from "lucide-react";
import { parseXml } from "@/lib/xml-parser";
import { DetailedSaleRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
  const { toast } = useToast();

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    setSelectedCount(files.length);
    setErrorCount(0);
    
    const allRows: DetailedSaleRow[] = [];
    let localErrorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();

      try {
        if (fileName.endsWith(".zip")) {
          const zip = new JSZip();
          const content = await zip.loadAsync(file);
          const xmlEntries = Object.keys(content.files).filter(name => !content.files[name].dir && name.toLowerCase().endsWith(".xml"));
          
          for (const name of xmlEntries) {
            try {
              const xmlContent = await content.files[name].async("string");
              const row = parseXml(xmlContent);
              if (row) allRows.push(row);
              else localErrorCount++;
            } catch (e) {
              localErrorCount++;
            }
          }
        } else if (fileName.endsWith(".xml")) {
          const xmlContent = await file.text();
          const row = parseXml(xmlContent);
          if (row) allRows.push(row);
          else localErrorCount++;
        } else {
          localErrorCount++;
        }
      } catch (e) {
        localErrorCount++;
      }
    }

    if (allRows.length > 0) {
      setErrorCount(localErrorCount);
      onDataParsed(allRows);
    } else {
      toast({
        title: "Falha na leitura",
        description: "Nenhum XML válido no padrão SEFAZ (Modelo 65/55) foi identificado.",
        variant: "destructive",
      });
      setSelectedCount(0);
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
          selectedCount > 0 && !isProcessing && "border-solid border-emerald-500 bg-emerald-50/80 shadow-emerald-500/20"
        )}
      >
        {/* Animated background rings for idle state */}
        {!dragActive && selectedCount === 0 && !isProcessing && (
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
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        
        <div className={cn(
          "relative z-10 p-5 md:p-6 rounded-2xl bg-white transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1.5 border shadow-lg shadow-slate-200/60",
          selectedCount > 0 ? "border-emerald-200 text-emerald-600" : dragActive ? "border-indigo-300 text-indigo-600" : "border-indigo-100 text-indigo-600"
        )}>
          {isProcessing ? (
            <Loader2 className="w-9 h-9 md:w-10 md:h-10 animate-spin text-indigo-600" />
          ) : selectedCount > 0 ? (
            <FileCheck className="w-9 h-9 md:w-10 md:h-10 text-emerald-600" />
          ) : (
            <Upload className="w-9 h-9 md:w-10 md:h-10 text-indigo-600" />
          )}
        </div>

        <div className="text-center space-y-2 relative z-10">
          <p className="text-xl md:text-2xl font-headline font-extrabold text-slate-900 tracking-tight">
            {isProcessing ? "Analisando Inteligência..." : 
             selectedCount > 0 ? `${selectedCount} arquivos carregados` : 
             "Importar Dados Fiscais"}
          </p>
          <p className="text-xs md:text-sm text-slate-500 font-semibold tracking-wide max-w-xs mx-auto leading-relaxed">
            {selectedCount > 0 ? "Extraindo indicadores de performance" : "Arraste e solte seus pacotes ZIP ou XMLs da SEFAZ"}
          </p>
        </div>

        {errorCount > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-5 py-2 rounded-full border border-rose-200 shadow-2xs relative z-10">
            <FileX className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{errorCount} arquivos inválidos</span>
          </div>
        )}
      </div>

      {!isProcessing && selectedCount === 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-500 w-full">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xs border border-slate-200/80 transition-colors hover:border-slate-300">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Privacidade 100% Local</span>
          </div>
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-2xs border border-slate-200/80 transition-colors hover:border-slate-300">
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Processamento Ultra Rápido</span>
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
