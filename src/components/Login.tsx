
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface LoginProps {
  onLogin: (key: string) => void;
  isError?: boolean;
}

export function Login({ onLogin, isError }: LoginProps) {
  const [key, setKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(key);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100 mb-4 text-white">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ri Happy</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Strategic Analyzer</p>
        </div>

        <Card className="ri-card border-none shadow-2xl shadow-slate-200/50 overflow-hidden">
          <div className="h-1.5 w-full bg-indigo-600" />
          <CardHeader className="space-y-1 p-8 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              Acesso Restrito
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500">
              Digite a chave de acesso para liberar as funcionalidades do painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Chave de Acesso"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className={isError ? "border-rose-300 focus-visible:ring-rose-200" : ""}
                />
                {isError && (
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Chave incorreta. Tente novamente.</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-black gap-2 shadow-lg shadow-indigo-100 group"
              >
                AUTENTICAR
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-4 grayscale opacity-40">
           <div className="flex items-center gap-1.5 grayscale">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">AES-256 Enabled</span>
           </div>
           <div className="w-1 h-1 bg-slate-300 rounded-full" />
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Database Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
}
