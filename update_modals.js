const fs = require('fs');
const path = require('path');

const dir = 'client/src/app/components/admin';
const files = ['TripFormModal.tsx', 'FestivalFormModal.tsx', 'CircuitFormModal.tsx'];

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace colors
  content = content.replace(/#c8a96e/g, '#b59410');
  content = content.replace(/#b8943a/g, '#8a710c');
  content = content.replace(/bg-amber-50/g, 'bg-gray-50');
  content = content.replace(/text-amber-600/g, 'text-[#b59410]');
  content = content.replace(/ring-amber-500/g, 'ring-[#b59410]');
  
  // Update DialogContent classes to match Ethereal Voyager
  // Remove messy !w-[calc...] and give it a clean wide modal style
  content = content.replace(/<DialogContent[^>]*>/, '<DialogContent className="!w-[calc(100%-0.75rem)] !max-h-[calc(100dvh-0.75rem)] sm:max-w-[800px] overflow-y-auto p-0 border-0 shadow-xl md:!w-full md:!max-h-[90vh] bg-white rounded-xl overflow-hidden">');
  
  // Try to find the immediate child wrapper of DialogContent and add padding if missing
  // Many of these modals have a form right after DialogHeader
  content = content.replace(/<DialogHeader>/g, '<div className="p-6 sm:p-8">\n          <DialogHeader className="mb-6 border-b border-gray-100 pb-4">');
  content = content.replace(/<\/form>\n\s*<\/DialogContent>/g, '</form>\n        </div>\n      </DialogContent>');
  content = content.replace(/<\/div>\n\s*<\/DialogContent>/g, '</div>\n        </div>\n      </DialogContent>'); // If it's not a form at root

  // Minimalist inputs
  content = content.replace(/<Input\s+([^>]*?)className="([^"]*?)"/g, (match, p1, p2) => {
    return `<Input ${p1}className="rounded-none border-0 border-b border-gray-200 px-0 focus-visible:border-[#b59410] focus-visible:ring-0 shadow-none text-base bg-transparent ${p2.replace(/border /g, '')}"`;
  });
  
  content = content.replace(/<Textarea\s+([^>]*?)className="([^"]*?)"/g, (match, p1, p2) => {
    return `<Textarea ${p1}className="rounded-none border-0 border-b border-gray-200 px-0 focus-visible:border-[#b59410] focus-visible:ring-0 shadow-none text-base resize-none bg-transparent ${p2.replace(/border /g, '')}"`;
  });
  
  // Make labels minimalist
  content = content.replace(/<Label/g, '<Label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block"');
  // Or standard html labels
  content = content.replace(/<label className="[^"]*"/g, '<label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2 block"');
  
  // If there are standard inputs without className, we inject
  content = content.replace(/<Input(?!\s+[^>]*?className)([^>]*)>/g, '<Input className="rounded-none border-0 border-b border-gray-200 px-0 focus-visible:border-[#b59410] focus-visible:ring-0 shadow-none text-base bg-transparent"$1>');
  content = content.replace(/<Textarea(?!\s+[^>]*?className)([^>]*)>/g, '<Textarea className="rounded-none border-0 border-b border-gray-200 px-0 focus-visible:border-[#b59410] focus-visible:ring-0 shadow-none text-base resize-none bg-transparent"$1>');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
