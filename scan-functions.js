const fs = require("fs");

const file = fs.readFileSync("index.html", "utf8");

// trova funzioni classiche + async
const regex = /(async\s+function|function)\s+([a-zA-Z0-9_]+)/g;

let match;
let functions = [];

while ((match = regex.exec(file)) !== null) {
  functions.push(match[2]);
}

functions.sort();

console.log("\nFUNZIONI TROVATE:\n");

functions.forEach(fn => {
  console.log(fn);
});

console.log("\nTotale:", functions.length);