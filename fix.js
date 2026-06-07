const fs = require('fs');
const files = [
  'src/components/AdditionalItemsAnalysis.tsx',
  'src/components/AdvancedAnalytics.tsx',
  'src/components/PickupDashboard.tsx',
  'src/components/SalesEnergy.tsx',
  'src/components/SocialActionPanel.tsx'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/shadow: 'none'/g, "boxShadow: 'none'");
    fs.writeFileSync(f, content);
  }
});
const cal = 'src/components/ui/calendar.tsx';
if (fs.existsSync(cal)) {
  let content = fs.readFileSync(cal, 'utf8');
  content = content.replace(/components=\{\{[\s\S]*?\}\}/, '');
  fs.writeFileSync(cal, content);
}
console.log('Fixed scripts');
