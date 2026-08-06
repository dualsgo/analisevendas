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
    <section className="lg:col-span-5 space-y-4 px-2">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-indigo-600" /> Uploads Recentes
        </h3>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-slate-600 hover:text-indigo-600 gap-1 rounded-lg">
                <ArrowUpDown className="w-3 h-3" />
                {sortBy === "date" ? "DATA" : sortBy === "value" ? "VALOR" : "QTD"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-md">
              <DropdownMenuItem onClick={() => setSortBy("date")} className="text-xs font-medium">Mais Recentes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("value")} className="text-xs font-medium">Maior Valor</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("count")} className="text-xs font-medium">Mais Notas</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClear} 
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg h-7"
          >
            Limpar
          </Button>
        </div>
      </div>
      <div className="space-y-2.5">
        <TooltipProvider>
          {sortedHistory.map((item) => {
            const isDataLost = !item.data || item.data.length === 0;
            
            return (
              <div 
                key={item.id} 
                onClick={() => onReopen(item)}
                className="bg-white/80 backdrop-blur-md hover:bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex items-center justify-between shadow-2xs hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-indigo-50/80 rounded-xl text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-tight">{item.periodo}</p>
                      {isDataLost && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent className="rounded-lg text-xs font-medium">
                            <p>Dados expirados. Requer novo upload.</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-semibold tracking-wide">
                      {item.totalNotas} notas • {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            );
          })}
        </TooltipProvider>
      </div>
    </section>
  );
}
