const fs = require('fs');

const files = [
  'client/src/app/components/admin/TripFormModal.tsx',
  'client/src/app/components/admin/FestivalFormModal.tsx',
  'client/src/app/components/admin/CircuitFormModal.tsx'
];

for(let file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Make overview optional
    content = content.replace(/overview:\s*z\.string\(\)\.min\(\d+,\s*"[^"]+"\)/g, 'overview: z.string().optional()');
    
    // Make inclusions array optional (remove .min(1, ...))
    content = content.replace(/inclusions:\s*z\s*\.array\(z\.object\(\{ value: z\.string\(\)\.min\(\d+,\s*"[^"]+"\)\s*\}\)\)\s*\.min\(\d+,\s*"[^"]+"\)/g, 'inclusions: z.array(z.object({ value: z.string().optional() })).optional()');
    
    // Make exclusions array optional
    content = content.replace(/exclusions:\s*z\s*\.array\(z\.object\(\{ value: z\.string\(\)\.min\(\d+,\s*"[^"]+"\)\s*\}\)\)\s*\.min\(\d+,\s*"[^"]+"\)/g, 'exclusions: z.array(z.object({ value: z.string().optional() })).optional()');

    // Remove min(1) from faqs
    content = content.replace(/question:\s*z\.string\(\)\.min\(\d+,\s*"[^"]+"\)/g, 'question: z.string().optional()');
    content = content.replace(/answer:\s*z\.string\(\)\.min\(\d+,\s*"[^"]+"\)/g, 'answer: z.string().optional()');

    // Fix the display of error toast
    content = content.replace(/\{missing\.map\(\(m, i\) => <li key=\{i\}>\{m\}<\/li>\)\}/g, "{missing.map((m, i) => <li key={i}>{m.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</li>)}");

    fs.writeFileSync(file, content);
  }
}
