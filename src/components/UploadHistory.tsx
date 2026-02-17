import { History, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadHistoryItem } from "@/lib/types";

interface UploadHistoryProps {
  history: UploadHistoryItem[];
  onReopen: (item: UploadHistoryItem) => void;
  onClear: () => void;
}

export function UploadHistory({ history, onReopen, onClear }: UploadHistoryProps) {
  if (history.length === 0) return null;

  const handleClear = () => {
    if (confirm("Tem certeza que deseja limpar o histórico?")) {
      onClear();
    }
  };

  return (
    <section className="lg:col-span-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-700 px-2">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Uploads Recentes
        </h3>
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-[9px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full h-7">
          LIMPAR
        </Button>
      </div>
      <div className="space-y-3">
        {history.map((item) => (
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
                <p className="text-xs md:text-sm font-black text-slate-700 uppercase leading-none mb-1">{item.periodo}</p>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                  {item.totalNotas} notas • {item.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>
    </section>
  );
}
