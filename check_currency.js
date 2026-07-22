const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if(file.endsWith('.tsx') || file.endsWith('.ts')) {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    // Find $ that is not part of a template literal ${
                    if(line.includes('$') && !line.includes('${') && !line.includes('var(')) {
                        console.log(file + ':' + (index + 1) + ': ' + line.trim());
                    }
                    if(line.includes('€') || line.includes('£')) {
                        console.log(file + ':' + (index + 1) + ': ' + line.trim());
                    }
                });
            }
        }
    });
    return results;
}
walk('src');
