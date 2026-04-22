"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisHelpProps {
  title: string;
  description: string;
  className?: string;
  iconClassName?: string;
}

export function AnalysisHelp({ title, description, className, iconClassName }: AnalysisHelpProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors",
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className={cn("w-4 h-4", iconClassName)} />
            <span className="sr-only">Explicação sobre {title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] p-3 bg-slate-900 text-white border-slate-800 shadow-xl rounded-xl">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">{title}</p>
            <p className="text-[11px] leading-relaxed font-medium text-slate-200">
              {description}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
