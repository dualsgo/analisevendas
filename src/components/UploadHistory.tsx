import { useState, useMemo } from "react";
import { History, Calendar, ChevronRight, ArrowUpDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadHistoryItem } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UploadHistoryProps {
  history: UploadHistoryItem[];
  onReopen: (item: UploadHistoryItem) => void;
  onClear: () => void;
}

type SortOption = "date" | "value" | "count";

export function UploadHistory({ history, onReopen, onClear }: UploadHistoryProps) {
  const [sortBy, setSortBy] = useState<SortOption>("date");

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case "value":
          return b.valorTotal - a.valorTotal;
        case "count":
          return b.totalNotas - a.totalNotas;
        default:
          return 0;
      }
    });
  }, [history, sortBy]);

  if (history.length === 0) return null;

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Tem certeza que deseja limpar todo o histórico de uploads recentes?")) {
      onClear();
    }
  };

  return (
    <section className="lg:col-span-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-700 px-2">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Uploads Recentes
        </h3>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold text-slate-500 hover:text-orange-600 gap-1">
                <ArrowUpDown className="w-3 h-3" />
                {sortBy === "date" ? "DATA" : sortBy === "value" ? "VALOR" : "QTD"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("date")} className="text-xs font-bold font-body">Mais Recentes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("value")} className="text-xs font-bold font-body">Maior Valor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("count")} className="text-xs font-bold font-body">Mais Notas</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClear} 
            className="text-[9px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full h-7"
          >
            LIMPAR
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        <TooltipProvider>
          {sortedHistory.map((item) => {
            const isDataLost = !item.data || item.data.length === 0;
            
            return (
              <div 
                key={item.id} 
                onClick={() => onReopen(item)}
                className="bg-white/60 hover:bg-white p-4 rounded-[1.25rem] border-2 border-slate-100 hover:border-orange-200 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-orange-50 rounded-xl group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs md:text-sm font-black text-slate-700 uppercase leading-none">{item.periodo}</p>
                      {isDataLost && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-[10px] font-bold">Dados expirados. Requer novo upload.</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      {item.totalNotas} notas • {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
              </div>
            );
          })}
        </TooltipProvider>
      </div>
    </section>
  );
}
