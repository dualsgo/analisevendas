
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
    reset,
    reopenHistory,
    clearHistory,
    loadPeriod,
    availablePeriods,
    status: processorStatus
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

                  {processorStatus === "idle" && (
                    <motion.div 
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                      className={cn(history.length > 0 || availablePeriods.length > 0 ? "lg:col-span-5 flex flex-col gap-6" : "")}
                    >
                      {availablePeriods.length > 0 && (
                        <Card className="ri-card bg-white border-2 border-indigo-100 p-6 rounded-[2rem] shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                              <History className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Análises Salvas</h3>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MongoDB Atlas Cloud</p>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {availablePeriods.map((p, i) => (
                              <button
                                key={i}
                                onClick={() => loadPeriod(p.year, p.month)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs uppercase group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                    {p.month}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-black text-slate-700">{p.year}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Período Completo</p>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                              </button>
                            ))}
                          </div>
                        </Card>
                      )}

                      <UploadHistory 
                        history={history} 
                        onReopen={reopenHistory} 
                        onClear={clearHistory} 
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
              >
                <div className="flex flex-col gap-6">
                  {processorStatus === "loading_db" && (
                    <div className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest">Buscando dados no MongoDB...</span>
                    </div>
                  )}
                  <UploadDiagnosis data={parsedRows} vinculos={vinculos} onConfirm={confirmDashboard} />
                </div>
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
