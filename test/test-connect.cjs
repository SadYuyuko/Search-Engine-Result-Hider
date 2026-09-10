const fs = require('fs');
const path = require('path');

const scriptDir = path.join(__dirname, '..');
const scriptFiles = fs.readdirSync(scriptDir).filter((name) => name.endsWith('.js')).sort();
if (!scriptFiles.length) throw new Error('no .js script found in ' + scriptDir);
const file = path.join(scriptDir, scriptFiles[0]);
console.log('Testing', file);
const src = fs.readFileSync(file, 'utf8');

const header = src.slice(0, src.indexOf('==/UserScript=='));
const connectLines = [...header.matchAll(/^\/\/\s*@connect\s+(\S+)/gm)].map((m) => m[1]);

function connectAllows(host) {
  return connectLines.some((p) => p === '*' || host === p || host.endsWith('.' + p));
}

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

assert('N1: 声明了 @connect', connectLines.length > 0);
assert('N2: 允许任意主机', connectLines.includes('*'));
assert('N3: 订阅主机放行', connectAllows('raw.githubusercontent.com'));
assert('N4: 坚果云 WebDAV 放行', connectAllows('dav.jianguoyun.com'));
assert('N5: 其他 WebDAV 主机放行', connectAllows('webdav.example.com'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
