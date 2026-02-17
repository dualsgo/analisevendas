
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.dataTransfer?.files[0] || e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-4 border-dashed rounded-[2rem] p-8 md:p-10 transition-all flex flex-col items-center justify-center gap-4 group min-h-[200px]",
          dragActive ? "border-orange-400 bg-orange-50/50 scale-[1.01]" : "border-slate-100 bg-slate-50 hover:border-orange-200",
          selectedCount > 0 && !isProcessing && "border-emerald-200 bg-emerald-50/20"
        )}
      >
        <input
          type="file"
          multiple
          accept=".zip,.xml"
          onChange={handleChange}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        
        <div className={cn(
          "p-4 rounded-full bg-white shadow-lg transition-transform duration-500 group-hover:scale-110",
          selectedCount > 0 ? "text-emerald-500" : "text-orange-500"
        )}>
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : selectedCount > 0 ? (
            <FileCheck className="w-8 h-8" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-base font-black text-slate-700 uppercase tracking-tight">
            {isProcessing ? "Analisando..." : 
             selectedCount > 0 ? `${selectedCount} arquivos carregados` : 
             "Solte seus XMLs ou ZIP aqui"}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {selectedCount > 0 ? "Diagnóstico em andamento" : "Padrão SEFAZ (Modelo 65 e 55)"}
          </p>
        </div>

        {errorCount > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full">
            <FileX className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase">{errorCount} arquivos inválidos</span>
          </div>
        )}
      </div>

      {!isProcessing && selectedCount === 0 && (
        <div className="flex items-center justify-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase">Seguro</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <LayoutDashboard className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase">Ágil</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" />
            <span className="text-[8px] font-black uppercase">Privado</span>
          </div>
        </div>
      )}
    </div>
  );
}
