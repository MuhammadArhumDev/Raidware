const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Boxed stuff and sidebars (usually border border-gray-200 or border-r border-gray-200)
  content = content.replace(/\bborder border-gray-200\b/g, 'border-[1.5px] border-gray-200');
  content = content.replace(/\bborder-r border-gray-200\b/g, 'border-r-[1.5px] border-gray-200');
  content = content.replace(/\bborder-b border-gray-200\b/g, 'border-b-[1.5px] border-gray-200');
  content = content.replace(/\bborder-t border-gray-200\b/g, 'border-t-[1.5px] border-gray-200');

  // Input styles
  // Typical existing: border border-gray-300 rounded-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
  // We want: border-[1.5px] border-gray-300 rounded-none focus:ring-0 focus:border-black
  content = content.replace(/\bborder border-gray-300\b/g, 'border-[1.5px] border-gray-300');
  content = content.replace(/\bfocus:ring-2 focus:ring-indigo-500 focus:border-transparent\b/g, 'focus:ring-0 focus:border-black');
  
  // Other potential input focus classes
  content = content.replace(/\bfocus:ring-indigo-500\b/g, 'focus:ring-black focus:border-black');
  content = content.replace(/\bfocus:border-indigo-500\b/g, 'focus:border-black');

  // If there are standard borders that we missed, but they are explicit:
  // content = content.replace(/\bborder\b/, ...) is too risky as it could hit `border-transparent` or similar.

  fs.writeFileSync(f, content, 'utf8');
});

console.log(`Processed ${files.length} files successfully for 1.5px borders!`);
