
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow } from "@/lib/types";
import { FileBarChart, RefreshCw, BarChart3, Database, FileSpreadsheet } from "lucide-react";
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
          <div className="flex flex-col gap-12 max-w-3xl mx-auto pt-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Analise suas vendas a partir de <span className="text-primary italic">arquivos XML</span> em segundos.
              </h2>
              <p className="text-muted-foreground text-lg">
                Transforme dados fiscais brutos em métricas estratégicas por canal e vendedor.
                Processamento local rápido e seguro de NF-e e NFC-e.
              </p>
            </div>
            <UploadZone onDataParsed={setParsedRows} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold">Processamento de Dados</h3>
                <p className="text-sm text-muted-foreground">Extração automática de valores, canais e vendedores diretamente dos XMLs.</p>
              </div>
              <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold">Análise Multicanal</h3>
                <p className="text-sm text-muted-foreground">Visão clara de performance entre Loja Física, Online e Trocas.</p>
              </div>
              <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold">Exportação CSV</h3>
                <p className="text-sm text-muted-foreground">Gere planilhas prontas para uso em ferramentas de BI ou Excel.</p>
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
