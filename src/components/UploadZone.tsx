
"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { Upload, FileArchive, Loader2, FileCode } from "lucide-react";
import { parseXml } from "@/lib/xml-parser";
import { DetailedSaleRow } from "@/lib/types";
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
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith(".zip")) {
          // Processar arquivo ZIP
          const zip = new JSZip();
          const content = await zip.loadAsync(file);

          const xmlPromises = Object.keys(content.files)
            .filter(name => !content.files[name].dir && name.toLowerCase().endsWith(".xml"))
            .map(async (name) => {
              const xmlContent = await content.files[name].async("string");
              return parseXml(xmlContent);
            });

          const rows = await Promise.all(xmlPromises);
          rows.forEach(r => {
            if (r) allRows.push(r);
          });
        } else if (fileName.endsWith(".xml")) {
          // Processar arquivo XML direto
          const xmlContent = await file.text();
          const row = parseXml(xmlContent);
          if (row) allRows.push(row);
        }
      }

      if (allRows.length === 0) {
        toast({
          title: "Nenhum dado válido",
          description: "Nenhum arquivo XML de venda (NF-e/NFC-e) foi identificado nos arquivos selecionados.",
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
      console.error("Erro no processamento:", error);
      toast({
        title: "Erro ao processar",
        description: "Ocorreu um erro ao ler os arquivos. Verifique se o ZIP está íntegro.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Limpar o input para permitir selecionar os mesmos arquivos novamente se necessário
      event.target.value = "";
    }
  };

  return (
    <div className="relative border-2 border-dashed border-primary/30 rounded-2xl p-12 bg-card hover:border-primary/60 transition-colors flex flex-col items-center justify-center gap-4 group">
      <input
        type="file"
        multiple
        accept=".zip,.xml"
        onChange={handleFileUpload}
        disabled={isProcessing}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        {isProcessing ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : (
          <div className="relative">
            <FileArchive className="w-8 h-8" />
            <FileCode className="w-4 h-4 absolute -bottom-1 -right-1 bg-card rounded-full" />
          </div>
        )}
      </div>
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-1">
          {isProcessing ? "Processando arquivos..." : "Arraste seus arquivos aqui"}
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Selecione arquivos ZIP contendo XMLs ou os próprios arquivos XML de NF-e/NFC-e
        </p>
      </div>
      <Button variant="outline" className="mt-2 pointer-events-none" disabled={isProcessing}>
        <Upload className="w-4 h-4 mr-2" />
        Escolher Arquivos
      </Button>
    </div>
  );
}
