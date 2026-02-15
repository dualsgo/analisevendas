
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
import { Toaster } from "@/components/ui/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2, BarChart3 } from "lucide-react";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    setStatus("processing");
    
    // Simular processamento para feedback visual
    setTimeout(() => {
      const withSuspects = detectarAdicionaisSuspeitos(rows);
      const exchangeLinks = vincularTrocas(withSuspects);
      
      setParsedRows(withSuspects);
      setVinculos(exchangeLinks);
      setStatus("success");
    }, 800);
  };

  return (
    <main className="min-h-screen bg-slate-50 font-body pb-12">
      {/* Cabeçalho Principal */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-200" />
            <h1 className="text-xl font-bold tracking-tight">Analisador Ri Happy</h1>
          </div>
          <div className="text-xs font-medium text-indigo-200 uppercase tracking-widest hidden sm:block">
            Módulo: Conversão de Adicionais
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-7xl pt-8">
        {/* Seção de Importação */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="max-w-3xl mx-auto text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Importação de Dados</h2>
            <p className="text-sm text-slate-500">Selecione arquivos XML ou pacotes ZIP para iniciar a análise.</p>
          </div>
          
          <UploadZone onDataParsed={handleDataParsed} isProcessing={status === "processing"} />

          {status === "processing" && (
            <div className="mt-6 flex items-center justify-center gap-3 text-indigo-600 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Processando informações...</span>
            </div>
          )}

          {status === "success" && (
            <div className="mt-6 max-w-2xl mx-auto">
              <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="font-bold">Processamento Concluído</AlertTitle>
                <AlertDescription className="text-sm">
                  {parsedRows.filter(r => r.tpNF === 1).length} notas processadas e {vinculos.length} vínculos de troca identificados.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </section>

        {/* Dashboard Resultante */}
        {parsedRows.length > 0 && status === "success" && (
          <SalesSummary data={parsedRows} vinculos={vinculos} />
        )}
      </div>
      <Toaster />
    </main>
  );
}
