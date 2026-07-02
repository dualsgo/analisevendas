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
          "relative rounded-[2.5rem] p-10 md:p-16 transition-all duration-500 flex flex-col items-center justify-center gap-6 group min-h-[320px] overflow-hidden",
          dragActive 
            ? "border-2 border-indigo-500 bg-indigo-50/80 scale-[1.02] shadow-2xl shadow-indigo-500/20" 
            : "border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/10",
          selectedCount > 0 && !isProcessing && "border-solid border-emerald-500 bg-emerald-50/80 shadow-emerald-500/20"
        )}
      >
        {/* Animated background rings for idle state */}
        {!dragActive && selectedCount === 0 && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <div className="w-64 h-64 border-2 border-indigo-200 rounded-full animate-ping [animation-duration:3s]" />
             <div className="w-48 h-48 border border-indigo-300 rounded-full animate-ping [animation-duration:2s] absolute" />
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
          "relative z-10 p-6 rounded-3xl bg-white transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 border shadow-xl shadow-slate-200/50",
          selectedCount > 0 ? "border-emerald-100 text-emerald-500" : dragActive ? "border-indigo-300 text-indigo-600" : "border-slate-100 text-indigo-500"
        )}>
          {isProcessing ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : selectedCount > 0 ? (
            <FileCheck className="w-10 h-10" />
          ) : (
            <Upload className="w-10 h-10" />
          )}
        </div>

        <div className="text-center space-y-2 relative z-10">
          <p className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
            {isProcessing ? "Analisando Inteligência..." : 
             selectedCount > 0 ? `${selectedCount} arquivos carregados` : 
             "Importar Dados Fiscais"}
          </p>
          <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
            {selectedCount > 0 ? "Extraindo indicadores de performance" : "Solte seus pacotes ZIP ou XMLs da SEFAZ"}
          </p>
        </div>

        {errorCount > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-5 py-2.5 rounded-full border border-rose-100 shadow-sm relative z-10">
            <FileX className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">{errorCount} arquivos inválidos</span>
          </div>
        )}
      </div>

      {!isProcessing && selectedCount === 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500 w-full">
          <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 transition-colors hover:border-slate-200">
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Privacidade Local</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 transition-colors hover:border-slate-200">
            <LayoutDashboard className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Análise em 3s</span>
          </div>
          <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 transition-colors hover:border-slate-200">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Padrão SEFAZ</span>
          </div>
        </div>
      )}
    </div>
  );
}
