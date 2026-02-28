
"use client";

import { UploadZone } from "@/components/UploadZone";
import { SalesSummary } from "@/components/SalesSummary";
import { UploadDiagnosis } from "@/components/UploadDiagnosis";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { UploadHistory } from "@/components/UploadHistory";
import { useSalesProcessor } from "@/hooks/useSalesProcessor";

export default function Home() {
  const {
    parsedRows,
    vinculos,
    status,
    history,
    fileStats,
    processData,
    confirmDashboard,
    reset,
    reopenHistory,
    clearHistory
  } = useSalesProcessor();

  return (
    <SidebarProvider>
      <main className="h-screen w-full bg-amber-50/30 font-body flex flex-col overflow-hidden">
        <Header 
          status={status} 
          fileStats={fileStats} 
          onReset={reset} 
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {status === "idle" || status === "processing" ? (
            <div className="h-full flex flex-col items-center justify-center p-4 md:p-8">
              <div className={cn(
                "w-full max-w-6xl flex flex-col gap-6",
                history.length > 0 && "lg:grid lg:grid-cols-12 lg:gap-8 items-start"
              )}>
                <section className={cn(
                  "bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-orange-100/50 border-4 border-white p-6 md:p-10 text-center animate-in zoom-in duration-500",
                  history.length > 0 ? "lg:col-span-7" : "max-w-2xl mx-auto w-full"
                )}>
                  <div className="mb-6 md:mb-8">
                    <div className="inline-block bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase mb-4 tracking-widest">Início da Jornada</div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter mb-2 leading-tight uppercase">Pronto para encontrar oportunidades?</h2>
                    <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed max-w-md mx-auto">
                      Arraste seus pacotes <span className="text-orange-500 font-bold">ZIP</span> ou <span className="text-orange-500 font-bold">XMLs</span>. O sistema fará o resto!
                    </p>
                  </div>
                  
                  <UploadZone onDataParsed={processData} isProcessing={status === "processing"} />

                  {status === "processing" && (
                    <div className="mt-8 flex flex-col items-center gap-4 text-orange-600">
                      <div className="relative">
                         <Loader2 className="w-10 h-10 md:w-12 h-12 animate-spin opacity-20" />
                      </div>
                      <span className="text-xs md:text-sm font-black animate-pulse tracking-tight uppercase">Analisando nota por nota...</span>
                    </div>
                  )}
                </section>

                {status === "idle" && (
                  <UploadHistory 
                    history={history} 
                    onReopen={reopenHistory} 
                    onClear={clearHistory} 
                  />
                )}
              </div>
            </div>
          ) : status === "analyzed" ? (
            <div className="flex-1 p-4 md:p-8">
              <UploadDiagnosis data={parsedRows} vinculos={vinculos} onConfirm={confirmDashboard} />
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
