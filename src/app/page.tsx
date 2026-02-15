
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
import { Toaster } from "@/components/ui/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Sparkles, RefreshCcw } from "lucide-react";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    setStatus("processing");
    
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
    <main className="min-h-screen bg-amber-50/30 font-body pb-12">
      <header className="bg-[#FFD100] border-b-4 border-orange-500 text-orange-900 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm rotate-3 border-2 border-orange-400">
              <Sparkles className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none flex gap-1">
                <span className="text-[#E4007C]">Ri</span>
                <span className="text-[#36B7E1]">H</span>
                <span className="text-[#F37021]">a</span>
                <span className="text-[#662D91]">p</span>
                <span className="text-[#39B54A]">p</span>
                <span className="text-[#ED1C24]">y</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700 opacity-80">Analisador de Performance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {status === "success" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="bg-white border-orange-500 text-orange-600 hover:bg-orange-50 gap-2 font-black rounded-full"
              >
                <RefreshCcw className="w-4 h-4" />
                NOVA ANÁLISE
              </Button>
            )}
            <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter hidden sm:block">
              Módulo: Conversão
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-7xl pt-8">
        {status !== "success" && (
          <section className="bg-white rounded-[2.5rem] shadow-xl shadow-orange-100 border-4 border-white p-8 mb-8 animate-in zoom-in duration-500">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <div className="inline-block bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-xs font-black uppercase mb-4">Área de Importação</div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Vamos começar a analisar?</h2>
              <p className="text-slate-500 font-medium">Arraste seus pacotes ZIP ou XMLs para identificar oportunidades de venda.</p>
            </div>
            
            <UploadZone onDataParsed={handleDataParsed} isProcessing={status === "processing"} />

            {status === "processing" && (
              <div className="mt-8 flex flex-col items-center gap-4 text-orange-600">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span className="text-lg font-black animate-pulse">O Solzinho está lendo suas notas...</span>
              </div>
            )}
          </section>
        )}

        {status === "success" && parsedRows.length === 0 && (
          <div className="max-w-md mx-auto text-center py-20">
            <Alert variant="destructive" className="rounded-3xl border-2">
              <AlertTitle className="font-black">Puxa, nada encontrado!</AlertTitle>
              <AlertDescription className="font-medium">Não conseguimos ler as notas fiscais nesses arquivos.</AlertDescription>
            </Alert>
            <Button onClick={handleReset} className="mt-6 rounded-full bg-orange-500 font-black">Tentar outro arquivo</Button>
          </div>
        )}

        {parsedRows.length > 0 && status === "success" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center md:items-end gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">
                  Painel <span className="text-orange-500">Mágico</span>
                </h2>
                <p className="text-slate-500 font-bold text-lg">Resultados encontrados para sua loja</p>
              </div>
              <div className="bg-[#36B7E1] text-white px-6 py-3 rounded-3xl flex items-center gap-3 shadow-lg shadow-sky-100 border-b-4 border-sky-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-tight">
                  {parsedRows.filter(r => r.tpNF === 1).length} Notas Mapeadas
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
