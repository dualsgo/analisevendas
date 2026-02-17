import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Ban, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileStats {
  total: number;
  entradas: number;
  saidas: number;
  canceladas: number;
}

interface TopBarStatsProps {
  stats: FileStats;
}

function StatItem({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className={cn("text-sm font-black", color)}>{value}</span>
      </div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter leading-none mt-0.5">{label}</span>
    </div>
  );
}

export function TopBarStats({ stats }: TopBarStatsProps) {
  return (
    <div className="hidden lg:flex items-center gap-6 bg-white/40 backdrop-blur-sm px-6 py-2.5 rounded-full border border-white/50 shadow-inner mx-4">
      <StatItem icon={ArrowUpRight} label="Saídas" value={stats.saidas} color="text-emerald-600" />
      <StatItem icon={ArrowDownLeft} label="Entradas" value={stats.entradas} color="text-blue-600" />
      <StatItem icon={Ban} label="Canceladas" value={stats.canceladas} color="text-red-500" />
      <div className="w-px h-6 bg-orange-300/50" />
      <div className="flex items-center gap-2">
         <FileText className="w-4 h-4 text-orange-700" />
         <span className="text-xs font-black text-orange-900">{stats.total} <span className="text-[9px] opacity-70">TOTAL</span></span>
      </div>
    </div>
  );
}
