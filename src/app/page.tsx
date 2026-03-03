
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
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, zoomIn, slideUp } from "@/lib/animations";

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
      <main className="h-screen w-full bg-slate-50 font-body flex flex-col overflow-hidden">
        <Header 
          status={status} 
          fileStats={fileStats} 
          onReset={reset} 
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <AnimatePresence mode="wait">
            {status === "idle" || status === "processing" ? (
              <motion.div 
                key="home-idle"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full flex flex-col items-center justify-center p-4 md:p-8 absolute inset-0 overflow-y-auto"
              >
                <div className={cn(
                  "w-full max-w-6xl flex flex-col gap-6",
                  history.length > 0 && "lg:grid lg:grid-cols-12 lg:gap-8 items-start"
                )}>
                  <motion.section 
                    variants={zoomIn}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200 p-6 md:p-10 text-center",
                      history.length > 0 ? "lg:col-span-7" : "max-w-2xl mx-auto w-full"
                    )}
                  >
                    <div className="mb-6 md:mb-8">
                      <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase mb-4 tracking-widest">Início da Jornada</div>
                      <h2 className="text-xl md:text-3xl font-bold text-slate-800 tracking-tight mb-2 leading-tight">Pronto para encontrar oportunidades?</h2>
                      <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed max-w-md mx-auto">
                        Arraste seus pacotes <span className="text-indigo-600 font-bold">ZIP</span> ou <span className="text-indigo-600 font-bold">XMLs</span>. O sistema fará o resto!
                      </p>
                    </div>
                    
                    <UploadZone onDataParsed={processData} isProcessing={status === "processing"} />

                    {status === "processing" && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="mt-8 flex flex-col items-center gap-4 text-indigo-600"
                      >
                        <div className="relative">
                           <Loader2 className="w-10 h-10 md:w-12 h-12 animate-spin opacity-20" />
                        </div>
                        <span className="text-xs md:text-sm font-bold animate-pulse tracking-tight uppercase">Analisando nota por nota...</span>
                      </motion.div>
                    )}
                  </motion.section>

                  {status === "idle" && (
                    <motion.div 
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                      className={cn(history.length > 0 ? "lg:col-span-5" : "")}
                    >
                      <UploadHistory 
                        history={history} 
                        onReopen={reopenHistory} 
                        onClear={clearHistory} 
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : status === "analyzed" ? (
              <motion.div 
                key="home-analyzed"
                variants={slideUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 p-4 md:p-8 absolute inset-0 overflow-y-auto"
              >
                <UploadDiagnosis data={parsedRows} vinculos={vinculos} onConfirm={confirmDashboard} />
              </motion.div>
            ) : (
              <motion.div 
                key="home-dashboard"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <SalesSummary data={parsedRows} vinculos={vinculos} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Toaster />
      </main>
    </SidebarProvider>
  );
}
