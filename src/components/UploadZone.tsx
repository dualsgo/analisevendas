
"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { Upload, Loader2 } from "lucide-react";
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
  const [selectedCount, setSelectedCount] = useState(0);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setSelectedCount(files.length);
  };

  const processFiles = async () => {
    const fileInput = document.getElementById('hidden-file-input') as HTMLInputElement;
    const files = fileInput?.files;
    if (!files || files.length === 0) return;

    const allRows: DetailedSaleRow[] = [];
    let errorCount = 0;

    try {
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
              } catch (e) {
                console.error(`Erro ao ler XML ${name} dentro do ZIP:`, e);
                errorCount++;
              }
            }
          } else if (fileName.endsWith(".xml")) {
            const xmlContent = await file.text();
            const row = parseXml(xmlContent);
            if (row) allRows.push(row);
          }
        } catch (e) {
          console.error(`Erro ao abrir arquivo ${fileName}:`, e);
          errorCount++;
        }
      }

      if (allRows.length === 0) {
        toast({
          title: "Dados não encontrados",
          description: "Não foi possível extrair notas fiscais válidas dos arquivos selecionados.",
          variant: "destructive",
        });
      } else {
        if (errorCount > 0) {
          toast({
            title: "Processamento parcial",
            description: `Capturadas ${allRows.length} notas. ${errorCount} arquivos falharam.`,
          });
        }
        onDataParsed(allRows);
      }
    } catch (error) {
      console.error("Erro fatal no upload:", error);
      toast({
        title: "Erro crítico no processamento",
        description: "O lote de arquivos não pôde ser lido. Tente enviar menos arquivos por vez.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4">
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-xl p-10 bg-slate-50 transition-all flex flex-col items-center justify-center gap-3",
          selectedCount > 0 ? "border-indigo-400 bg-indigo-50/30" : "border-slate-300 hover:border-slate-400"
        )}
      >
        <input
          id="hidden-file-input"
          type="file"
          multiple
          accept=".zip,.xml"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <Upload className={cn("w-10 h-10", selectedCount > 0 ? "text-indigo-500" : "text-slate-400")} />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            {selectedCount > 0 ? `${selectedCount} arquivos selecionados` : "Arraste seus arquivos .ZIP ou clique aqui"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedCount > 0 ? "Clique em Processar para iniciar a análise" : "Apenas arquivos XML ou ZIP contendo XMLs"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <Button 
          onClick={processFiles}
          disabled={isProcessing || selectedCount === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 rounded-xl font-bold text-base shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            "Processar Dados"
          )}
        </Button>
        <p className="text-[10px] text-slate-400 mt-3 uppercase tracking-tighter">
          {selectedCount > 0 ? "Pronto para processar" : "Aguardando seleção de arquivos"}
        </p>
      </div>
    </div>
  );
}
