
"use client";

import { useState, useMemo } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { DetailedSaleRow, VinculoTroca } from "@/lib/types";
import { detectarAdicionaisSuspeitos, vincularTrocas } from "@/lib/analysis-utils";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCcw, Loader2, FileText, ArrowDownLeft, ArrowUpRight, Ban } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Home() {
  const [parsedRows, setParsedRows] = useState<DetailedSaleRow[]>([]);
  const [vinculos, setVinculos] = useState<VinculoTroca[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  const handleDataParsed = (rows: DetailedSaleRow[]) => {
    setStatus("processing");
    
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

  // Estatísticas de Arquivos para o Top Bar
  const fileStats = useMemo(() => {
    const total = parsedRows.length;
    const entradas = parsedRows.filter(r => (r.tpNF === 0 || r.is_devolucao) && !r.is_cancelada).length;
    const saidas = parsedRows.filter(r => r.tpNF === 1 && !r.is_devolucao && !r.is_cancelada).length;
    const canceladas = parsedRows.filter(r => r.is_cancelada).length;
    
    return { total, entradas, saidas, canceladas };
  }, [parsedRows]);

  return (
    <SidebarProvider>
      <main className="min-h-screen bg-amber-50/30 font-body w-full flex flex-col">
        {/* Header Fixo Ri Happy Style */}
        <header className="bg-[#FFD100] border-b-4 border-orange-500 text-orange-900 shadow-md h-16 md:h-20 flex items-center sticky top-0 z-[60] shrink-0">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              {status === "success" && (
                <SidebarTrigger className="md:hidden bg-white/20 hover:bg-white/40 border-0" />
              )}
              <div className="bg-white p-1 rounded-xl md:rounded-2xl shadow-sm rotate-3 border-2 border-orange-400">
                <Sparkles className="w-5 h-5 md:w-8 h-8 text-orange-500" />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none flex gap-0.5 md:gap-1">
                  <span className="text-[#E4007C]">Ri</span>
                  <span className="text-[#36B7E1]">H</span>
                  <span className="text-[#F37021]">a</span>
                  <span className="text-[#662D91]">p</span>
                  <span className="text-[#39B54A]">p</span>
                  <span className="text-[#ED1C24]">y</span>
                </h1>
                <p className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-orange-700 opacity-80">Analisador de Performance</p>
              </div>
            </div>

            {/* Top Bar Stats */}
            {status === "success" && (
              <div className="hidden lg:flex items-center gap-6 bg-white/40 backdrop-blur-sm px-6 py-2 rounded-full border border-white/50 shadow-inner mx-4">
                <StatItem icon={ArrowUpRight} label="Saídas" value={fileStats.saidas} color="text-emerald-600" />
                <StatItem icon={ArrowDownLeft} label="Entradas" value={fileStats.entradas} color="text-blue-600" />
                <StatItem icon={Ban} label="Canceladas" value={fileStats.canceladas} color="text-red-500" />
                <div className="w-px h-6 bg-orange-300/50" />
                <div className="flex items-center gap-2">
                   <FileText className="w-4 h-4 text-orange-700" />
                   <span className="text-xs font-black text-orange-900">{fileStats.total} <span className="text-[10px] opacity-70">TOTAL</span></span>
                </div>
              </div>
            )}
            
            {status === "success" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="bg-white border-orange-500 text-orange-600 hover:bg-orange-50 gap-1 md:gap-2 font-black rounded-full shadow-sm text-[10px] md:text-xs"
              >
                <RefreshCcw className="w-3 h-3 md:w-4 h-4" />
                <span className="hidden sm:inline">IMPORTAR NOVAMENTE</span>
                <span className="sm:hidden">RESET</span>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {status !== "success" ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <section className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-orange-100 border-4 border-white p-6 md:p-12 text-center animate-in zoom-in duration-500 max-w-2xl w-full">
                <div className="mb-6 md:mb-10">
                  <div className="inline-block bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase mb-4 tracking-widest">Início da Jornada</div>
                  <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter mb-4 leading-tight uppercase">Pronto para encontrar oportunidades?</h2>
                  <p className="text-slate-500 font-medium text-sm md:text-lg leading-relaxed">
                    Arraste seus pacotes <span className="text-orange-500 font-bold">ZIP</span> ou <span className="text-orange-500 font-bold">XMLs</span> das notas fiscais. O Solzinho fará todo o trabalho pesado!
                  </p>
                </div>
                
                <UploadZone onDataParsed={handleDataParsed} isProcessing={status === "processing"} />

                {status === "processing" && (
                  <div className="mt-8 md:mt-12 flex flex-col items-center gap-4 md:gap-6 text-orange-600">
                    <div className="relative">
                       <Loader2 className="w-10 h-10 md:w-16 h-16 animate-spin opacity-20" />
                       <Sparkles className="w-5 h-5 md:w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                    </div>
                    <span className="text-sm md:text-xl font-black animate-pulse tracking-tight">O Solzinho está analisando nota por nota...</span>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <SalesSummary data={parsedRows} vinculos={vinculos} />
          )}
        </div>
        <Toaster />
      </main>
    </SidebarProvider>
  );
}

function StatItem({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Icon className={cn("w-3 h-3", color)} />
        <span className={cn("text-xs font-black", color)}>{value}</span>
      </div>
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-none">{label}</span>
    </div>
  );
}
