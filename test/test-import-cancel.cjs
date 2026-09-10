const fs = require('fs');
const path = require('path');

const scriptDir = path.join(__dirname, '..');
const scriptFiles = fs.readdirSync(scriptDir).filter((name) => name.endsWith('.js')).sort();
if (!scriptFiles.length) throw new Error('no .js script found in ' + scriptDir);
const file = path.join(scriptDir, scriptFiles[0]);
console.log('Testing', file);
const src = fs.readFileSync(file, 'utf8');

function extractFn(text, fnName) {
  const marker = `function ${fnName}(`;
  let idx = text.indexOf(marker);
  if (idx === -1) throw new Error('fn not found: ' + fnName);
  const start = idx;
  const open = text.indexOf('{', idx);
  let depth = 0;
  let i = open;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return text.slice(start, i + 1);
}

const parseSyncHeaderFn = extractFn(src, 'parseSyncHeader');
const importRulesFromFileFn = extractFn(src, 'importRulesFromFile');

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

function createEnv() {
  const env = {
    bodyChildren: [],
    windowListeners: {},
    textarea: { value: '' },
    hooks: { updateLineNumbersCalls: 0 },
    input: null,
  };

  const fakeInput = {
    type: '',
    accept: '',
    style: {},
    files: [],
    parentElement: null,
    onchange: null,
    listeners: {},
    addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
    },
    remove() {
      const idx = env.bodyChildren.indexOf(this);
      if (idx !== -1) env.bodyChildren.splice(idx, 1);
      this.parentElement = null;
    },
    click() {},
  };
  env.input = fakeInput;

  const documentStub = {
    body: {
      appendChild(el) {
        el.parentElement = documentStub.body;
        env.bodyChildren.push(el);
        return el;
      },
    },
    createElement(tag) { return tag === 'input' ? fakeInput : {}; },
    getElementById(id) { return id === 'searchfilter-rules' ? env.textarea : null; },
  };

  const windowStub = {
    addEventListener(type, fn) {
      (env.windowListeners[type] = env.windowListeners[type] || []).push(fn);
    },
    removeEventListener(type, fn) {
      const arr = env.windowListeners[type] || [];
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    },
  };

  class FakeFileReader {
    readAsText(fileToRead) {
      this.result = fileToRead._content;
      if (this.onload) this.onload({ target: this });
    }
  }

  const factory = new Function('document', 'window', 'FileReader', 'currentConfig', 'hooks', `
    let preventPanelClose = false;
    ${parseSyncHeaderFn}
    function updateLineNumbers() { hooks.updateLineNumbersCalls++; }
    ${importRulesFromFileFn}
    return {
      importRulesFromFile,
      isPreventPanelClose: () => preventPanelClose,
    };
  `);

  const api = factory(documentStub, windowStub, FakeFileReader, { debug: false }, env.hooks);
  return { env, api, fakeInput };
}

(async () => {
  // 1. 浏览器触发 cancel 事件
  {
    const { env, api, fakeInput } = createEnv();
    api.importRulesFromFile();
    assert('C1: 打开选择器后锁定面板关闭', api.isPreventPanelClose() === true);
    assert('C2: input 已加入 DOM', env.bodyChildren.includes(fakeInput));
    fakeInput.listeners.cancel[0]();
    assert('C3: cancel 事件后解锁', api.isPreventPanelClose() === false);
    assert('C4: cancel 事件后移除 input', !env.bodyChildren.includes(fakeInput));
  }

  // 2. 老浏览器无 cancel 事件，靠窗口焦点回落兜底
  {
    const { env, api, fakeInput } = createEnv();
    api.importRulesFromFile();
    env.windowListeners.focus[0]();
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert('C5: 焦点回落后解锁', api.isPreventPanelClose() === false);
    assert('C6: 焦点回落后移除 input', !env.bodyChildren.includes(fakeInput));
  }

  // 3. 正常选择文件
  {
    const { env, api, fakeInput } = createEnv();
    api.importRulesFromFile();
    fakeInput.files = [{ _content: 'rule1\nrule2' }];
    fakeInput.onchange({ target: fakeInput });
    assert('C7: 文件内容写入编辑区', env.textarea.value === 'rule1\nrule2');
    assert('C8: 读取完成后解锁', api.isPreventPanelClose() === false);
    assert('C9: 读取完成后移除 input', !env.bodyChildren.includes(fakeInput));
    assert('C10: 更新行号被调用', env.hooks.updateLineNumbersCalls === 1);
  }

  // 4. onchange 但未选中文件
  {
    const { env, api, fakeInput } = createEnv();
    api.importRulesFromFile();
    fakeInput.onchange({ target: { files: [] } });
    assert('C11: 未选择文件时解锁', api.isPreventPanelClose() === false);
    assert('C12: 未选择文件时移除 input', !env.bodyChildren.includes(fakeInput));
  }

  // 5. 同步配置头被剥离
  {
    const { env, api, fakeInput } = createEnv();
    api.importRulesFromFile();
    fakeInput.files = [{ _content: '# ScriptConfig: {"a":1}\nrule1\nrule2' }];
    fakeInput.onchange({ target: fakeInput });
    assert('C13: 同步配置头被剥离', env.textarea.value === 'rule1\nrule2');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
