import { Sparkles, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopBarStats } from "./TopBarStats";

import { motion } from "framer-motion";

interface HeaderProps {
  status: "idle" | "processing" | "analyzed" | "success";
  fileStats?: {
    total: number;
    entradas: number;
    saidas: number;
    canceladas: number;
  };
  onReset: () => void;
}

export function Header({ status, fileStats, onReset }: HeaderProps) {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white border-b border-slate-200 text-slate-800 shadow-sm h-16 md:h-16 flex items-center sticky top-0 z-[60] shrink-0 print:hidden"
    >
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {status === "success" && (
            <SidebarTrigger className="hover:bg-slate-100 border-0 text-slate-500" title="Expandir/Recolher Menu" />
          )}
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-800">
              Ri Happy
            </h1>
          </div>
        </div>

        {/* Top Bar Stats */}
        {status === "success" && fileStats && (
          <div className="hidden lg:block">
            <TopBarStats stats={fileStats} />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Button 
            variant="default" 
            size="sm" 
            asChild
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium rounded-full shadow-sm text-xs h-9 px-4 hidden sm:flex"
          >
            <a href="/looker">
              Painel Looker
            </a>
          </Button>
          {(status === "success" || status === "analyzed") && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 font-medium rounded-full shadow-sm text-xs h-9 px-4"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
