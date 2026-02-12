'use server';
/**
 * @fileOverview A Genkit flow for generating an AI sales summary report based on XML sales data.
 *
 * - aiSalesSummaryReport - A function that triggers the AI to analyze sales data and provide a summary report.
 * - AISalesSummaryReportInput - The input type for the aiSalesSummaryReport function.
 * - AISalesSummaryReportOutput - The return type for the aiSalesSummaryReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define Zod schema for ChannelSummaryRow
const ChannelSummaryRowSchema = z.object({
  Canal: z.string().describe('Sales channel name.'),
  Cupons: z.string().describe('Total number of coupons/transactions.'),
  Venda_Total: z.string().describe('Total sales value, formatted as a string (e.g., "1234.56").'),
  Itens_Total: z.string().describe('Total number of items sold.'),
  TKM: z.string().describe('Ticket médio (average transaction value), formatted as a string.'),
  PA: z.string().describe('Peças por atendimento (items per transaction), formatted as a string.'),
});
export type ChannelSummaryRow = z.infer<typeof ChannelSummaryRowSchema>;

// Define Zod schema for VendorSummaryRow
const VendorSummaryRowSchema = z.object({
  Canal: z.string().describe('Sales channel name.'),
  Vendedor: z.string().describe('Vendor name.'),
  Cupons: z.string().describe('Total number of coupons/transactions for this vendor.'),
  Venda_Total: z.string().describe('Total sales value for this vendor, formatted as a string.'),
  Itens_Total: z.string().describe('Total number of items sold by this vendor.'),
  TKM: z.string().describe('Ticket médio (average transaction value) for this vendor, formatted as a string.'),
  PA: z.string().describe('Peças por atendimento (items per transaction) for this vendor, formatted as a string.'),
});
export type VendorSummaryRow = z.infer<typeof VendorSummaryRowSchema>;

// Define Zod schema for DetailedSaleRow (based on Python's DocRow, with Decimal converted to string for output consistency)
const DetailedSaleRowSchema = z.object({
  chave: z.string().describe('Unique identifier for the sales document.'),
  nf: z.string().describe('Invoice number.'),
  dhEmi: z.string().describe('Date and time of emission in ISO format.'),
  vendedor: z.string().describe('Name of the seller.'),
  canal: z.string().describe('Sales channel classification.'),
  vNF: z.string().describe('Total value of the sales document, formatted as a string.'),
  itens_qtd: z.string().describe('Total quantity of items in the sales document, formatted as a string.'),
  is_troca: z.boolean().describe('True if this is an exchange document.'),
  vTroca: z.string().describe('Value of the exchange, formatted as a string.'),
  dif_troca: z.string().describe('Difference value in case of an exchange, formatted as a string.'),
  is_retirada: z.boolean().describe('True if the sale is for online pickup.'),
  is_retirada_adicional: z.boolean().describe('True if the sale is for additional online pickup.'),
  pickup_match_fields: z.number().describe('Number of matching fields for pickup location determination.'),
});
export type DetailedSaleRow = z.infer<typeof DetailedSaleRowSchema>;

// Input schema for the AI sales summary report flow
const AISalesSummaryReportInputSchema = z.object({
  channelSummary: z.array(ChannelSummaryRowSchema).describe('Aggregated sales data by channel.'),
  vendorSummary: z.array(VendorSummaryRowSchema).describe('Aggregated sales data by vendor and channel.'),
  detailedSalesData: z.array(DetailedSaleRowSchema).describe('Detailed row-by-row sales data.'),
});
export type AISalesSummaryReportInput = z.infer<typeof AISalesSummaryReportInputSchema>;

// Output schema for the AI sales summary report flow
const AISalesSummaryReportOutputSchema = z.object({
  summary: z.string().describe('A comprehensive AI-generated summary report of the sales data.'),
});
export type AISalesSummaryReportOutput = z.infer<typeof AISalesSummaryReportOutputSchema>;

// Wrapper function to call the Genkit flow
export async function aiSalesSummaryReport(
  input: AISalesSummaryReportInput
): Promise<AISalesSummaryReportOutput> {
  return aiSalesSummaryReportFlow(input);
}

const AISalesSummaryReportPrompt = ai.definePrompt({
  name: 'aiSalesSummaryReportPrompt',
  input: { schema: AISalesSummaryReportInputSchema },
  output: { schema: AISalesSummaryReportOutputSchema },
  prompt: `You are an expert sales analyst. Your task is to analyze the provided sales data and generate a comprehensive summary report.
The report should highlight key performance indicators (KPIs), identify top-performing channels and vendors, and point out any significant trends or outliers.
Focus on actionable insights that a sales manager or executive would find valuable.

The input data is provided in three sections:

### 1. Sales Summary by Channel:
This section provides aggregated sales metrics for each sales channel.
Each item in the list has the following fields:
- Canal: Sales channel name (e.g., LOJA_FISICA, RETIRADA_ONLINE, TROCA_COM_DIFERENCA).
- Cupons: Total number of transactions/coupons.
- Venda_Total: Total sales value.
- Itens_Total: Total number of items sold.
- TKM: Ticket médio (average transaction value).
- PA: Peças por atendimento (average items per transaction).

Sales Summary Data by Channel:
{{#if channelSummary}}
{{#each channelSummary}}
- Canal: {{{Canal}}}, Cupons: {{{Cupons}}}, Venda Total: R$ {{{Venda_Total}}}, Itens Total: {{{Itens_Total}}}, TKM: R$ {{{TKM}}}, PA: {{{PA}}}
{{/each}}
{{else}}
No channel summary data available.
{{/if}}

### 2. Sales Summary by Vendor (per Channel):
This section provides aggregated sales metrics for each vendor within their respective sales channels.
Each item in the list has the following fields:
- Canal: Sales channel name.
- Vendedor: Vendor name.
- Cupons: Total number of transactions/coupons for this vendor.
- Venda_Total: Total sales value for this vendor.
- Itens_Total: Total number of items sold by this vendor.
- TKM: Ticket médio (average transaction value) for this vendor.
- PA: Peças por atendimento (average items per transaction) for this vendor.

Sales Summary Data by Vendor:
{{#if vendorSummary}}
{{#each vendorSummary}}
- Canal: {{{Canal}}}, Vendedor: {{{Vendedor}}}, Cupons: {{{Cupons}}}, Venda Total: R$ {{{Venda_Total}}}, Itens Total: {{{Itens_Total}}}, TKM: R$ {{{TKM}}}, PA: {{{PA}}}
{{/each}}
{{else}}
No vendor summary data available.
{{/if}}

### 3. Detailed Sales Data (Note-by-Note):
This section provides individual sales document details. This can be used for deeper analysis if needed.
Each item in the list has the following fields:
- chave: Unique identifier for the sales document.
- nf: Invoice number.
- dhEmi: Date and time of emission.
- vendedor: Name of the seller.
- canal: Sales channel classification.
- vNF: Total value of the sales document.
- itens_qtd: Total quantity of items in the sales document.
- is_troca: True if an exchange.
- vTroca: Value of exchange.
- dif_troca: Difference in exchange.
- is_retirada: True if online pickup.
- is_retirada_adicional: True if additional online pickup.
- pickup_match_fields: Number of matching fields for pickup.

Detailed Sales Data:
{{#if detailedSalesData}}
{{#each detailedSalesData}}
- Chave: {{{chave}}}, NF: {{{nf}}}, Data: {{{dhEmi}}}, Vendedor: {{{vendedor}}}, Canal: {{{canal}}}, Valor NF: R$ {{{vNF}}}, Itens Qtd: {{{itens_qtd}}}, É Troca: {{{is_troca}}}, Valor Troca: R$ {{{vTroca}}}, Diferença Troca: R$ {{{dif_troca}}}, É Retirada: {{{is_retirada}}}, É Retirada Adicional: {{{is_retirada_adicional}}}, Campos Pickup Match: {{{pickup_match_fields}}}
{{/each}}
{{else}}
No detailed sales data available.
{{/if}}

Please provide your summary report in markdown format, with clear headings for different sections (e.g., "Visão Geral", "Canais de Destaque", "Vendedores Top", "Tendências e Anomalias", "Recomendações").
Ensure the language is professional and directly addresses the sales analyst's need for actionable insights.
Quantify observations where possible (e.g., "Channel X represents Y% of total sales").
`
});

const aiSalesSummaryReportFlow = ai.defineFlow(
  {
    name: 'aiSalesSummaryReportFlow',
    inputSchema: AISalesSummaryReportInputSchema,
    outputSchema: AISalesSummaryReportOutputSchema,
  },
  async (input) => {
    // Call the prompt with the input data
    const { output } = await AISalesSummaryReportPrompt(input);
    return output!;
  }
);
