import { Sparkles, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopBarStats } from "./TopBarStats";

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
    <header className="bg-[#FFD100] border-b-4 border-orange-500 text-orange-900 shadow-md h-16 md:h-20 flex items-center sticky top-0 z-[60] shrink-0">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {status === "success" && (
            <SidebarTrigger className="md:hidden bg-white/20 hover:bg-white/40 border-0" />
          )}
          <div className="bg-white p-1 rounded-xl md:rounded-2xl shadow-sm rotate-3 border-2 border-orange-400">
            <Sparkles className="w-5 h-5 md:w-7 h-7 text-orange-500" />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none flex gap-0.5">
              <span className="text-[#E4007C]">Ri</span>
              <span className="text-[#36B7E1]">H</span>
              <span className="text-[#F37021]">a</span>
              <span className="text-[#662D91]">p</span>
              <span className="text-[#39B54A]">p</span>
              <span className="text-[#ED1C24]">y</span>
            </h1>
            <p className="hidden md:block text-[9px] font-bold uppercase tracking-widest text-orange-700 opacity-80 mt-0.5">Analisador de Performance</p>
          </div>
        </div>

        {/* Top Bar Stats */}
        {status === "success" && fileStats && (
          <TopBarStats stats={fileStats} />
        )}
        
        {(status === "success" || status === "analyzed") && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            className="bg-white border-orange-500 text-orange-600 hover:bg-orange-50 gap-1.5 font-black rounded-full shadow-sm text-[10px] md:text-xs h-9 md:h-10 px-4 md:px-6"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NOVO UPLOAD</span>
            <span className="sm:hidden uppercase">Novo</span>
          </Button>
        )}
      </div>
    </header>
  );
}
