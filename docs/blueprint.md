# **App Name**: XML Sales Analyzer

## Core Features:

- XML File Upload: Allow users to upload one or more ZIP files containing XML files (NF-e/NFC-e).
- Data Extraction & Parsing: Parse uploaded XML files to extract relevant data such as invoice number, date, vendor, channel, total value, and item details.
- Channel Classification: Automatically classify sales channels (e.g., LOJA_FISICA, RETIRADA_ONLINE, TROCA_*) based on the parsed XML data, using the provided logic.
- Data Summarization: Uses AI to reason across the total data set, automatically identify key trends, and add these key points to the channel/sales summaries.
- Table Views: Display summarized data in tables, broken down by channel and vendor, showing key metrics like total sales, item count, and transaction averages. Sortable columns, for rapid data analysis.
- CSV Export: Enable users to download data in CSV format, including summary and detailed reports for further analysis and reporting.

## Style Guidelines:

- Primary color: Deep Indigo (#4B0082) to inspire trust and focus on financial data. The selection of indigo is aligned to the history of record keeping and accounting.
- Background color: Very light lavender (#F0F8FF) to ensure clear data readability.
- Accent color: Electric violet (#8F00FF) for highlighting key interactive elements and important data insights.
- Body and headline font: 'Inter', a grotesque-style sans-serif known for its readability and neutral appearance, suitable for both headlines and body text.
- Use simple, professional icons from a set like Material Design Icons to represent different data types and actions. Consistency and clarity are a priority.
- Maintain a clean, tabular layout for presenting summarized data. Ensure good spacing and alignment to avoid visual clutter. Keep key summary elements fixed on-screen via scrolling. Utilize standard breakpoints for responsiveness.
- Use subtle transitions and animations (e.g., when sorting tables or exporting data) to provide feedback and enhance user experience without being distracting.