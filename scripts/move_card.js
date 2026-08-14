const fs = require('fs');

const file = 'src/components/SalesSummary.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Change collapsible="icon" to collapsible="none"
content = content.replace('collapsible="icon"', 'collapsible="none"');

// 2. Add import for createPortal and useState if not present
if (!content.includes('import { createPortal }')) {
  content = content.replace('import React, { useState, useMemo, useEffect } from "react";', 'import React, { useState, useMemo, useEffect } from "react";\nimport { createPortal } from "react-dom";');
}

// 3. Add mounted state to SalesSummary component
// Look for `export function SalesSummary({ data, vinculos }: SalesSummaryProps) {`
const componentDecl = 'export function SalesSummary({ data, vinculos }: SalesSummaryProps) {';
if (content.includes(componentDecl) && !content.includes('const [mounted, setMounted] = useState(false);')) {
  content = content.replace(
    componentDecl,
    componentDecl + '\n  const [mounted, setMounted] = useState(false);\n  useEffect(() => setMounted(true), []);\n'
  );
}

// 4. Wrap Sheet with portal and remove SidebarTrigger
const headerStartStr = '{/* Simplified Header */}';
const headerStartIdx = content.indexOf(headerStartStr);

if (headerStartIdx !== -1) {
  const sheetStartStr = '<Sheet>';
  const sheetEndStr = '</Sheet>';
  
  const sheetStartIdx = content.indexOf(sheetStartStr, headerStartIdx);
  const sheetEndIdx = content.indexOf(sheetEndStr, sheetStartIdx) + sheetEndStr.length;
  
  const sheetContent = content.substring(sheetStartIdx, sheetEndIdx);
  
  // also find the end of the simplified header div
  const triggerStr = '<SidebarTrigger className="md:hidden" />';
  const endDivIdx = content.indexOf('</div>', sheetEndIdx);
  
  const portalBlock = `
        {mounted && document.getElementById("header-actions") ? createPortal(
          ${sheetContent.replace('variant="outline"', 'variant="outline" bg="white"').replace('bg-white', '')},
          document.getElementById("header-actions")
        ) : null}
`;

  // We want to replace everything from headerStartStr to endDivIdx + 6
  const toReplace = content.substring(headerStartIdx, endDivIdx + 6);
  
  // Actually, wait, replacing the exact sheet content.
  // The 'bg-white' removal was a bit hacky above, let's just use the exact sheetContent.
  const cleanPortalBlock = `
        {/* Equipe Portal to Header */}
        {mounted && document.getElementById("header-actions") ? createPortal(
          ${sheetContent},
          document.getElementById("header-actions")
        ) : null}
  `;
  
  content = content.replace(toReplace, cleanPortalBlock);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done moving team card');
