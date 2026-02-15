
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCcw, Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    setStatus("processing");
    
    // Pequeno delay para feedback visual de análise
    setTimeout(() => {
      const withSuspects = detectarAdicionaisSuspeitos(rows);
      const exchangeLinks = vincularTrocas(withSuspects);
      
      setParsedRows(withSuspects);
      setVinculos(exchangeLinks || []);
      setStatus("success");
    }, 1500);
  };

  const handleReset = () => {
    setParsedRows([]);
    setVinculos([]);
    setStatus("idle");
  };

  return (
    <SidebarProvider>
      <main className="min-h-screen bg-amber-50/30 font-body w-full">
        {/* Header Fixo Ri Happy Style */}
        <header className="bg-[#FFD100] border-b-4 border-orange-500 text-orange-900 shadow-md h-20 flex items-center sticky top-0 z-[60]">
          <div className="container mx-auto px-4 flex items-center justify-between">
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
            
            {status === "success" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="bg-white border-orange-500 text-orange-600 hover:bg-orange-50 gap-2 font-black rounded-full shadow-sm"
              >
                <RefreshCcw className="w-4 h-4" />
                IMPORTAR NOVAMENTE
              </Button>
            )}
          </div>
        </header>

        <div className="flex">
          {status !== "success" ? (
            <div className="flex-1 container mx-auto px-4 max-w-4xl pt-16">
              <section className="bg-white rounded-[2.5rem] shadow-2xl shadow-orange-100 border-4 border-white p-12 text-center animate-in zoom-in duration-500">
                <div className="max-w-xl mx-auto mb-10">
                  <div className="inline-block bg-orange-100 text-orange-600 px-6 py-2 rounded-full text-xs font-black uppercase mb-6 tracking-widest">Início da Jornada</div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-4 leading-tight uppercase">Pronto para encontrar oportunidades?</h2>
                  <p className="text-slate-500 font-medium text-lg leading-relaxed">
                    Arraste seus pacotes <span className="text-orange-500 font-bold">ZIP</span> ou <span className="text-orange-500 font-bold">XMLs</span> das notas fiscais da sua loja. O Solzinho fará todo o trabalho pesado para você!
                  </p>
                </div>
                
                <UploadZone onDataParsed={handleDataParsed} isProcessing={status === "processing"} />

                {status === "processing" && (
                  <div className="mt-12 flex flex-col items-center gap-6 text-orange-600">
                    <div className="relative">
                       <Loader2 className="w-16 h-16 animate-spin opacity-20" />
                       <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                    </div>
                    <span className="text-xl font-black animate-pulse tracking-tight">O Solzinho está analisando nota por nota...</span>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex-1">
              <SalesSummary data={parsedRows} vinculos={vinculos} />
            </div>
          )}
        </div>
        <Toaster />
      </main>
    </SidebarProvider>
  );
}
