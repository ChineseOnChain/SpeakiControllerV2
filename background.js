(() => {
  const TAG = '[SpeakiInjector]';
  const GAME_SCRIPT_PATTERN = /assets\/index-.*\.js/;
  const ORIGIN = location.origin;

  console.log(TAG, 'loaded at', document.readyState);

  // 给游戏主包打补丁，把 GameState 实例挂到 window.gameState
  function patchSource(code) {
    // 相对 import 改绝对，注入 blob 后路径才不会断
    let src = code;
    if (/from\s*"\.\//.test(src)) {
      src = src.replaceAll(/from\s*"\.\//g, `from "${ORIGIN}/assets/`);
      console.log(TAG, 'rewrote "./" imports to absolute');
    }

    // 两套匹配策略，优先用更精确的
    const strategies = [
      // 打在 GameState.connect 方法体里，requestedChannel= 是唯一特征
      {
        name: 'connect-method-def',
        test: /connect\((\w+)\)\{this\.requestedChannel=/,
        apply: s => s.replace(
          /connect\((\w+)\)\{this\.requestedChannel=/,
          'connect($1){window.gameState=this,this.requestedChannel='
        ),
        verify: p => /window\.gameState\s*=\s*this/.test(p)
      },
      // 老版本构建用分号+逗号的调用点，留着兼容
      {
        name: 'semicolon+comma',
        test: /;\s*((\w+)\.connect\(\w+\)),/,
        apply: s => s.replace(
          /;\s*((\w+)\.connect\(\w+\)),/,
          ';((window.gameState = $2), $1),'
        ),
        verify: p => /window\.gameState\s*=\s*\w+/.test(p)
      }
    ];

    for (const strat of strategies) {
      if (!strat.test.test(src)) {
        console.log(TAG, `strategy "${strat.name}" — pattern not present`);
        continue;
      }
      const attempt = strat.apply(src);
      if (strat.verify(attempt) && attempt !== src) {
        console.log(TAG, `strategy "${strat.name}" — ✅ APPLIED`);
        return attempt;
      }
      console.warn(TAG, `strategy "${strat.name}" — pattern matched but no change`);
    }

    console.error(TAG, '❌ no strategy applied. Dumping first 2000 chars for analysis:');
    console.log(src.slice(0, 2000));
    return null;
  }

  function injectPatched(code) {
    const blob = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const s = document.createElement('script');
    s.type = 'module';
    s.crossOrigin = '';
    s.src = blob;
    document.head.appendChild(s);
    console.log(TAG, '✅ patched script injected');
  }

  // 劫持 fetch：<script src>、modulepreload、动态 import 都会经过这里
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input
              : input instanceof URL ? input.href
              : input instanceof Request ? input.url
              : String(input);

    const isGameBundle = GAME_SCRIPT_PATTERN.test(url)
      && !url.startsWith('blob:')
      && !url.startsWith('chrome-extension:');

    const response = await origFetch(input, init);
    if (!isGameBundle) return response;

    console.log(TAG, 'fetch() intercepted:', url);
    try {
      const code = await response.clone().text();
      const patched = patchSource(code);
      if (patched) {
        return new Response(patched, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
      // 补丁没打上，退回原样让游戏正常跑
      return new Response(code, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (e) {
      console.error(TAG, 'fetch interception error:', e);
      return response;
    }
  };

  // 兜底：MutationObserver 抓漏网的 script 标签
  const observer = new MutationObserver(mutations => {
    for (const mut of mutations) {
      for (const node of mut.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName?.toLowerCase() !== 'script') continue;
        const src = node.getAttribute('src');
        if (src && GAME_SCRIPT_PATTERN.test(src)) {
          console.log(TAG, 'script tag caught via observer:', src);
          observer.disconnect();
          node.remove();
          origFetch(src).then(r => r.text()).then(code => {
            const patched = patchSource(code);
            injectPatched(patched || code);
          });
          return;
        }
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });

  // 页面里已经有 script 的情况再手动处理一次
  const existing = document.querySelector('script[src*="/assets/index-"]');
  if (existing) {
    console.log(TAG, 'script already present in DOM');
    const src = existing.getAttribute('src');
    if (src && GAME_SCRIPT_PATTERN.test(src)) {
      existing.remove();
      origFetch(src).then(r => r.text()).then(code => {
        const patched = patchSource(code);
        injectPatched(patched || code);
      });
    }
  }

  // 控制器脚本无条件注入，内部自己会等 gameState
  const controllerScript = document.createElement('script');
  controllerScript.src = chrome.runtime.getURL('main-world-controller.js');
  controllerScript.onload = () => controllerScript.remove();
  (document.head || document.documentElement).appendChild(controllerScript);

  console.log(TAG, 'all interception paths armed');
})();