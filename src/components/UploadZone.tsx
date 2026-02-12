
"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { Upload, FileArchive, Loader2 } from "lucide-react";
import { parseXml } from "@/lib/xml-parser";
import { DetailedSaleRow } from "@/ai/flows/ai-sales-summary-report-flow";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onDataParsed: (rows: DetailedSaleRow[]) => void;
}

export function UploadZone({ onDataParsed }: UploadZoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const allRows: DetailedSaleRow[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith(".zip")) continue;

        const zip = new JSZip();
        const content = await zip.loadAsync(file);

        const xmlPromises = Object.keys(content.files)
          .filter(fileName => fileName.toLowerCase().endsWith(".xml"))
          .map(async (fileName) => {
            const xmlContent = await content.files[fileName].async("string");
            return parseXml(xmlContent);
          });

        const rows = await Promise.all(xmlPromises);
        rows.forEach(r => {
          if (r) allRows.push(r);
        });
      }

      if (allRows.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Nenhum arquivo XML válido foi encontrado nos ZIPs selecionados.",
          variant: "destructive",
        });
      } else {
        onDataParsed(allRows);
        toast({
          title: "Processamento concluído",
          description: `${allRows.length} notas fiscais processadas com sucesso.`,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao processar",
        description: "Ocorreu um erro ao ler os arquivos ZIP. Verifique se estão corrompidos.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative border-2 border-dashed border-primary/30 rounded-2xl p-12 bg-card hover:border-primary/60 transition-colors flex flex-col items-center justify-center gap-4 group">
      <input
        type="file"
        multiple
        accept=".zip"
        onChange={handleFileUpload}
        disabled={isProcessing}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        {isProcessing ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : (
          <FileArchive className="w-8 h-8" />
        )}
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-1">
          {isProcessing ? "Processando arquivos..." : "Arraste seus arquivos ZIP aqui"}
        </h3>
        <p className="text-muted-foreground text-sm">
          Selecione um ou mais arquivos ZIP contendo XMLs de NF-e/NFC-e
        </p>
      </div>
      <Button variant="outline" className="mt-2" disabled={isProcessing}>
        <Upload className="w-4 h-4 mr-2" />
        Escolher Arquivos
      </Button>
    </div>
  );
}
