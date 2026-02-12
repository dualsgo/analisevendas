
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow } from "@/ai/flows/ai-sales-summary-report-flow";
import { FileBarChart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);

  const handleReset = () => {
    setParsedRows([]);
  };

  return (
    <main className="min-h-screen pb-20 bg-background font-body">
      <header className="border-b bg-card py-6 mb-8 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">XML Sales Analyzer</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Dashboard de Performance Comercial</p>
            </div>
          </div>
          {parsedRows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reiniciar Análise
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-6xl">
        {parsedRows.length === 0 ? (
          <div className="flex flex-col gap-12 max-w-2xl mx-auto pt-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Analise suas vendas a partir de <span className="text-primary italic">arquivos XML</span> em segundos.
              </h2>
              <p className="text-muted-foreground text-lg">
                Transforme dados fiscais brutos em insights estratégicos por canal e colaborador.
                Suporte nativo para NF-e e NFC-e via ZIP.
              </p>
            </div>
            <UploadZone onDataParsed={setParsedRows} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <p className="font-bold text-2xl text-primary">ZIP</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Processamento</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-2xl text-primary">XML</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Extração Nativa</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-2xl text-primary">CSV</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Exportação Livre</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-2xl text-primary">AI</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">Relatório Analítico</p>
              </div>
            </div>
          </div>
        ) : (
          <SalesSummary data={parsedRows} />
        )}
      </div>
      <Toaster />
    </main>
  );
}
