
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
import { Toaster } from "@/components/ui/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, BarChart3, RefreshCcw } from "lucide-react";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    setStatus("processing");
    
    // Simular processamento para feedback visual
    setTimeout(() => {
      const withSuspects = detectarAdicionaisSuspeitos(rows);
      const { vinculos: exchangeLinks } = vincularTrocas(withSuspects);
      
      setParsedRows(withSuspects);
      setVinculos(exchangeLinks || []);
      setStatus("success");
    }, 800);
  };

  const handleReset = () => {
    setParsedRows([]);
    setVinculos([]);
    setStatus("idle");
  };

  return (
    <main className="min-h-screen bg-slate-50 font-body pb-12">
      {/* Cabeçalho Principal */}
      <header className="bg-indigo-700 text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-200" />
            <h1 className="text-xl font-bold tracking-tight">Analisador Ri Happy</h1>
          </div>
          <div className="flex items-center gap-4">
            {status === "success" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleReset}
                className="text-indigo-100 hover:bg-indigo-600 hover:text-white gap-2 text-xs uppercase font-bold"
              >
                <RefreshCcw className="w-4 h-4" />
                Importar Novamente
              </Button>
            )}
            <div className="text-xs font-medium text-indigo-200 uppercase tracking-widest hidden sm:block">
              Módulo: Conversão de Adicionais
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-7xl pt-8">
        {/* Seção de Importação - Esconde após sucesso */}
        {status !== "success" && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto text-center mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Importação de Dados</h2>
              <p className="text-sm text-slate-500">Selecione arquivos XML ou pacotes ZIP contendo as notas fiscais.</p>
            </div>
            
            <UploadZone onDataParsed={handleDataParsed} isProcessing={status === "processing"} />

            {status === "processing" && (
              <div className="mt-6 flex items-center justify-center gap-3 text-indigo-600 animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Analisando chaves e vinculando trocas...</span>
              </div>
            )}
          </section>
        )}

        {status === "success" && parsedRows.length === 0 && (
          <div className="max-w-md mx-auto text-center py-20">
            <Alert variant="destructive">
              <AlertTitle>Nenhum dado válido</AlertTitle>
              <AlertDescription>Não encontramos notas fiscais válidas nos arquivos enviados.</AlertDescription>
            </Alert>
            <Button onClick={handleReset} className="mt-4">Tentar novamente</Button>
          </div>
        )}

        {/* Dashboard Resultante */}
        {parsedRows.length > 0 && status === "success" && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Painel de Performance</h2>
                <p className="text-sm text-slate-500 font-medium">Resultados consolidados da análise de arquivos.</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl flex items-center gap-3">
                <div className="bg-indigo-600 rounded-full p-1">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-bold text-indigo-700 uppercase">
                  {parsedRows.filter(r => r.tpNF === 1).length} Notas Analisadas
                </span>
              </div>
            </div>
            <SalesSummary data={parsedRows} vinculos={vinculos} />
          </div>
        )}
      </div>
      <Toaster />
    </main>
  );
}
