const path = require('path');
const process = require('process');

// Force CWD to the mobile folder
process.chdir(__dirname);

console.log('CLI Wrapper: CWD is now', process.cwd());

let args = process.argv.slice(2);

// Make paths absolute to avoid confusion between root and mobile folders
for (let i = 0; i < args.length; i++) {
    if (['--entry-file', '--bundle-output', '--assets-dest', '--sourcemap-output', '--config'].includes(args[i]) && args[i+1]) {
        if (!path.isAbsolute(args[i+1])) {
            const original = args[i+1];
            args[i+1] = path.resolve(__dirname, args[i+1]);
            console.log(`CLI Wrapper: Fixed ${args[i]} from ${original} to ${args[i+1]}`);
        }
    }
}

// Expo's internal argument parser expects the project root to be at the end of the arguments list
if (args[0] === 'export:embed') {
    console.log('CLI Wrapper: Appending project root argument at the end:', __dirname);
    args.push(__dirname); // Use absolute path
}

// Re-construct process.argv
process.argv = [process.argv[0], process.argv[1], ...args];

const expoCliPath = 'D:/Projeler/ServisBot/node_modules/@expo/cli/build/bin/cli';
require(expoCliPath);
