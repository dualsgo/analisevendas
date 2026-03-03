
import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ri Happy | Analisador de Performance',
  description: 'Gestão Estratégica de Vendas, Adicionais e Trocas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-slate-50">{children}</body>
    </html>
  );
}
