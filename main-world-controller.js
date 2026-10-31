(() => {
  if (window.__speakiControllerLoaded) return;
  window.__speakiControllerLoaded = true;

  function initController() {
    // gameState 由游戏包注入，还没挂上就重试
    if (!window.gameState) {
      setTimeout(initController, 100);
      return;
    }

    const DEADZONE = 0.15;
    const CAMERA_SENSITIVITY_DEFAULT = 10;
    const TARGET_MAX_DISTANCE = 15;
    const TARGET_BUFFER_MULTIPLIER = 1.5;
    const STORAGE_KEY = 'speakiControllerSettings';

    const DEFAULT_KEYS = {
      skill1: '1',
      skill2: '2',
      skill3: '3',
      skill4: '4',
      jump: 'G',
      emote: 'T',
      portal: 'F',
      basicAttack: ' ',
      returnToTown: '6',
      hpPotion: '5',
      respawn: 'R',
      cameraReset: 'C',
      rideMount: '=',
      summonMechaPumpkin: '0',
      focusFire: '9'
    };

    const keys = { ...DEFAULT_KEYS };

    // 游戏里同一动作的 trigger 名可能不一致，每个动作备一组别名挨个查
    const ACTION_TRIGGER_ALIASES = {
      skill1: ['skill1'],
      skill2: ['skill2'],
      skill3: ['skill3'],
      skill4: ['skill4'],
      jump: ['jump'],
      emote: ['emote'],
      portal: ['portal', 'teleport'],
      basicAttack: ['basicAttack', 'attack', 'autoAttack'],
      returnToTown: ['returnToTown', 'return', 'returnScroll'],
      hpPotion: ['hpPotion', 'potion', 'heal'],
      respawn: ['respawn'],
      cameraReset: ['cameraReset', 'resetCamera'],
      rideMount: ['rideMount', 'mount', 'rideCart', 'rideMountKey'],
      summonMechaPumpkin: ['summonMechaPumpkin', 'summonMecha', 'mechaPumpkin', 'summonMechaPumpkinKey'],
      focusFire: ['focusFire', 'mechaFocusFire', 'activateMechaDrone', 'mechaFocusFireKey']
    };

    // 把 'KeyF' / 'Digit1' / 'Space' 这类格式还原成 dispatchKey 好处理的原始键
    function interpretKeyValue(v) {
      if (typeof v !== 'string' || v.length === 0) return null;
      if (/^Key[A-Z]$/i.test(v)) return v.slice(3).toLowerCase();
      if (/^Digit\d$/.test(v)) return v.slice(5);
      if (/^Numpad\d$/.test(v)) return v.slice(6);
      if (v === 'Space') return ' ';
      return v;
    }

    // 键位优先级：sr1_settings 覆盖 > 技能栏 keyLabel > 默认值
    function resolveKeybinds() {
      const next = { ...DEFAULT_KEYS };
      const sources = { skills: 0, overrides: 0, defaults: 0 };

      try {
        const raw = localStorage.getItem('sr1_settings');
        if (raw) {
          const s = JSON.parse(raw);
          const ov = s.keybindOverrides || {};
          for (const [action, aliases] of Object.entries(ACTION_TRIGGER_ALIASES)) {
            for (const alias of aliases) {
              if (Object.prototype.hasOwnProperty.call(ov, alias)) {
                const k = interpretKeyValue(ov[alias]);
                if (k !== null) {
                  next[action] = k;
                  sources.overrides++;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {}

      try {
        const gs = window.gameState;
        const slots = gs?.skillHotbar?.slots;
        if (Array.isArray(slots)) {
          for (const slot of slots) {
            const trigger = slot.trigger;
            const label = slot.keyLabel;
            if (!trigger || typeof label !== 'string') continue;
            if (!Object.prototype.hasOwnProperty.call(DEFAULT_KEYS, trigger)) continue;
            const k = interpretKeyValue(label);
            if (k !== null) {
              next[trigger] = k;
              sources.skills++;
            }
          }
        }
      } catch (e) {}

      for (const action of Object.keys(next)) {
        if (next[action] === DEFAULT_KEYS[action]) sources.defaults++;
      }

      for (const k of Object.keys(keys)) delete keys[k];
      Object.assign(keys, next);

      const overridden = [];
      for (const action of Object.keys(keys)) {
        if (keys[action] !== DEFAULT_KEYS[action]) {
          overridden.push(`${action}="${keys[action]}" (was "${DEFAULT_KEYS[action]}")`);
        }
      }
      if (overridden.length > 0) {
        console.info(
          '[SpeakiController] Keybinds resolved (%d skill, %d override):',
          sources.skills, sources.overrides,
          '\n  ' + overridden.join('\n  ')
        );
      } else {
        console.info('[SpeakiController] Keybinds resolved — all defaults.');
      }
    }

    const BUTTON = {
      A: 0, B: 1, X: 2, Y: 3,
      LEFT_BUMPER: 4, RIGHT_BUMPER: 5,
      LEFT_TRIGGER: 6, RIGHT_TRIGGER: 7,
      BACK: 8, START: 9,
      LEFT_STICK: 10, RIGHT_STICK: 11,
      DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15
    };

    const AXIS = {
      LEFT_X: 0, LEFT_Y: 1, RIGHT_X: 2, RIGHT_Y: 3
    };

    // hold 类动作按下和松开要分开处理（比如表情轮盘）
    const ACTIONS = {
      skill1:              { run: () => tapKey(keys.skill1) },
      skill2:              { run: () => tapKey(keys.skill2) },
      skill3:              { run: () => tapKey(keys.skill3) },
      skill4:              { run: () => tapKey(keys.skill4) },
      jump:                { run: () => tapKey(keys.jump) },
      emote: {
        hold: true,
        run: () => {
          emoteHeldKey = keys.emote;
          pressKey(emoteHeldKey);
        },
        release: () => {
          if (emoteHeldKey !== null) {
            releaseKey(emoteHeldKey);
            emoteHeldKey = null;
          }
        }
      },
      portal:              { run: () => tapKey(keys.portal) },
      basicAttack:         { run: () => tapKey(keys.basicAttack) },
      returnToTown:        { run: () => tapKey(keys.returnToTown) },
      hpPotion:            { run: () => tapKey(keys.hpPotion) },
      respawn:             { run: () => tapKey(keys.respawn) },
      cameraReset:         { run: () => tapKey(keys.cameraReset) },
      rideMount:           { run: () => tapKey(keys.rideMount) },
      summonMechaPumpkin:  { run: () => tapKey(keys.summonMechaPumpkin) },
      focusFire:           { run: () => tapKey(keys.focusFire) },
      tabTarget:           { run: () => cycleEnemyTarget() },
      none:                { run: () => {} }
    };

    const L10N = {
      zh: {
        ui: {
          title: 'SpeakiControllerV2 设置',
          leftBumper: '左肩键', leftTrigger: '左扳机',
          dpadUp: '十字键上', dpadLeft: '十字键左',
          dpadRight: '十字键右', dpadDown: '十字键下',
          back: '返回键',
          rightBumper: '右肩键', rightTrigger: '右扳机',
          actionUp: '主按键上', actionLeft: '主按键左',
          actionRight: '主按键右', actionDown: '主按键下',
          cameraSpeed: '视角速度',
          enableVibration: '启用震动',
          invertCameraAxes: '反转X/Y轴',
          language: '语言'
        },
        actions: {
          skill1: '技能1', skill2: '技能2', skill3: '技能3', skill4: '技能4',
          jump: '跳跃', emote: '表情动作', portal: '传送门',
          basicAttack: '普通攻击', returnToTown: '返回城镇', hpPotion: 'HP药水',
          respawn: '复活', cameraReset: '重置镜头',
          rideMount: '骑乘坐骑',
          summonMechaPumpkin: '召唤机甲南瓜',
          focusFire: '启动机甲南瓜 - 集中射击',
          tabTarget: 'Tab-Target', none: '-未绑定-'
        }
      },
      en: {
        ui: {
          title: 'SpeakiControllerV2 Setup',
          leftBumper: 'Left Bumper', leftTrigger: 'Left Trigger',
          dpadUp: 'D-Pad Up', dpadLeft: 'D-Pad Left',
          dpadRight: 'D-Pad Right', dpadDown: 'D-Pad Down',
          back: 'Select',
          rightBumper: 'Right Bumper', rightTrigger: 'Right Trigger',
          actionUp: 'Action Up', actionLeft: 'Action Left',
          actionRight: 'Action Right', actionDown: 'Action Down',
          cameraSpeed: 'Camera Speed',
          enableVibration: 'Enable Vibration',
          invertCameraAxes: 'Invert X/Y Axis',
          language: 'Language'
        },
        actions: {
          skill1: 'Skill 1', skill2: 'Skill 2', skill3: 'Skill 3', skill4: 'Skill 4',
          jump: 'Jump', emote: 'Emote', portal: 'Portal',
          basicAttack: 'Attack', returnToTown: 'Return', hpPotion: 'HP Potion',
          respawn: 'Respawn', cameraReset: 'Reset Camera',
          rideMount: 'Ride mount',
          summonMechaPumpkin: 'Summon Mecha Pumpkin',
          focusFire: 'Activate Mecha Pumpkin - Focus Fire',
          tabTarget: 'Tab-Target', none: '-None-'
        }
      },
      ja: {
        ui: {
          title: 'SpeakiControllerV2 設定',
          leftBumper: '左バンパー', leftTrigger: '左トリガー',
          dpadUp: '十字キー上', dpadLeft: '十字キー左',
          dpadRight: '十字キー右', dpadDown: '十字キー下',
          back: 'バック',
          rightBumper: '右バンパー', rightTrigger: '右トリガー',
          actionUp: 'メインボタン上', actionLeft: 'メインボタン左',
          actionRight: 'メインボタン右', actionDown: 'メインボタン下',
          cameraSpeed: 'カメラ速度',
          enableVibration: '振動を有効にする',
          invertCameraAxes: 'X/Y軸反転',
          language: '言語'
        },
        actions: {
          skill1: 'スキル1', skill2: 'スキル2', skill3: 'スキル3', skill4: 'スキル4',
          jump: 'ジャンプ', emote: 'エモート', portal: 'ポータル',
          basicAttack: '基本攻撃', returnToTown: '町へ帰還', hpPotion: 'HPポーション',
          respawn: '復活', cameraReset: '視点リセット',
          rideMount: '乗り物に乗る',
          summonMechaPumpkin: 'メカカボチャ召喚',
          focusFire: 'メカカボチャ・集中射撃発動',
          tabTarget: '敵選択', none: '-なし-'
        }
      },
      ko: {
        ui: {
          title: 'SpeakiControllerV2 설정',
          leftBumper: '왼쪽 범퍼', leftTrigger: '왼쪽 트리거',
          dpadUp: '십자키 상', dpadLeft: '십자키 좌',
          dpadRight: '십자키 우', dpadDown: '십자키 하',
          back: '백 버튼',
          rightBumper: '오른쪽 범퍼', rightTrigger: '오른쪽 트리거',
          actionUp: '액션 버튼 위', actionLeft: '액션 버튼 왼쪽',
          actionRight: '액션 버튼 오른쪽', actionDown: '액션 버튼 아래',
          cameraSpeed: '카메라 속도',
          enableVibration: '진동 활성화',
          invertCameraAxes: 'X/Y축 반전',
          language: '언어'
        },
        actions: {
          skill1: '스킬 1', skill2: '스킬 2', skill3: '스킬 3', skill4: '스킬 4',
          jump: '점프', emote: '감정표현', portal: '포탈',
          basicAttack: '기본 공격', returnToTown: '마을 귀환', hpPotion: 'HP 포션',
          respawn: '부활', cameraReset: '카메라 리셋',
          rideMount: '탈것 탑승',
          summonMechaPumpkin: '메카 호박 소환',
          focusFire: '메카 호박 - 집중 사격 발동',
          tabTarget: '적 선택', none: '-없음-'
        }
      }
    };

    function getText(category, key) {
      return L10N[uiLanguage]?.[category]?.[key] || L10N.en[category][key] || key;
    }

    const DEFAULT_BINDINGS = {
      [BUTTON.LEFT_BUMPER]: 'returnToTown',
      [BUTTON.LEFT_TRIGGER]: 'hpPotion',
      [BUTTON.DPAD_UP]: 'jump',
      [BUTTON.DPAD_LEFT]: 'rideMount',
      [BUTTON.DPAD_RIGHT]: 'portal',
      [BUTTON.DPAD_DOWN]: 'emote',
      [BUTTON.BACK]: 'respawn',
      [BUTTON.RIGHT_BUMPER]: 'tabTarget',
      [BUTTON.RIGHT_TRIGGER]: 'basicAttack',
      [BUTTON.A]: 'skill1',
      [BUTTON.B]: 'skill2',
      [BUTTON.X]: 'skill3',
      [BUTTON.Y]: 'skill4',
      [BUTTON.RIGHT_STICK]: 'cameraReset'
    };

    let cameraSensitivity = CAMERA_SENSITIVITY_DEFAULT;
    let rumbleEnabled = true;
    let invertCameraAxes = false;
    let bindings = { ...DEFAULT_BINDINGS };
    let uiLanguage = 'zh';

    function loadSettings() {
      // uiLanguage 不落盘，每次从游戏 locale 重新推
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (typeof data.cameraSensitivity === 'number') cameraSensitivity = data.cameraSensitivity;
          if (typeof data.rumbleEnabled === 'boolean') rumbleEnabled = data.rumbleEnabled;
          if (typeof data.invertCameraAxes === 'boolean') invertCameraAxes = data.invertCameraAxes;
          if (data.bindings && typeof data.bindings === 'object') {
            for (const [key, value] of Object.entries(data.bindings)) {
              const idx = Number(key);
              // 老版本里删掉的动作（比如 'dance'）回落到默认
              if (DEFAULT_BINDINGS[idx] !== undefined && ACTIONS[value]) {
                bindings[idx] = value;
              }
            }
          }
        }
      } catch (e) {}

      try {
        const gameRaw = localStorage.getItem('sr1_settings');
        if (gameRaw) {
          const gameSettings = JSON.parse(gameRaw);
          const loc = gameSettings.locale;
          if (typeof loc === 'string') {
            if (loc === 'ko' || loc === 'en' || loc === 'ja') {
              uiLanguage = loc;
            } else if (loc.startsWith('zh')) {
              uiLanguage = 'zh';
            } else {
              uiLanguage = 'zh';
            }
          }
        }
      } catch (e) {}
    }

    function saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          cameraSensitivity,
          rumbleEnabled,
          invertCameraAxes,
          bindings
        }));
      } catch (e) {}
    }

    loadSettings();
    resolveKeybinds();

    const heldKeys = new Set();
    const prevButtons = new Array(16).fill(false);
    let rightMouseDown = false;
    let mouseX = 0, mouseY = 0;
    let canvas = null;

    let lastTargetAngle = null;
    let emoteHeldKey = null;
    let lastHp = null;

    let settingsMenu = null;
    const buttonSelectMap = {};

    // 相机朝向在 XZ 平面的单位向量，相机没好就退回人物朝向
    function getCameraForwardXZ() {
      const cam = window.gameState.camera;
      if (!cam || !cam.matrixWorld || !cam.matrixWorld.elements) {
        const player = window.gameState.playerContainer;
        const m = player.matrixWorld.elements;
        const fx = -m[8], fz = -m[10];
        const len = Math.hypot(fx, fz) || 1;
        return { x: fx / len, z: fz / len };
      }
      cam.updateMatrixWorld();
      const m = cam.matrixWorld.elements;
      const fx = -m[8], fz = -m[10];
      const len = Math.hypot(fx, fz) || 1;
      return { x: fx / len, z: fz / len };
    }

    function getDirectionXZ(fromX, fromZ, toX, toZ) {
      const dx = toX - fromX, dz = toZ - fromZ;
      const len = Math.hypot(dx, dz) || 1;
      return { x: dx / len, z: dz / len };
    }

    function angleBetweenXZ(v1, v2) {
      const dot = v1.x * v2.x + v1.z * v2.z;
      const clamped = Math.max(-1, Math.min(1, dot));
      return Math.acos(clamped);
    }

    // 视野锥内按"角度为主、距离为辅"打分，分数低的排前面；当前目标放宽一点距离
    function getTargetableEnemies(currentTargetId) {
      const gs = window.gameState;
      if (!gs || !gs.playerContainer || !gs.monsters) return [];

      const playerPos = gs.playerContainer.position;
      const cameraPos = gs.camera?.position || playerPos;
      const forward = getCameraForwardXZ();

      const maxNormalDist = TARGET_MAX_DISTANCE;
      const maxBufferDist = TARGET_MAX_DISTANCE * TARGET_BUFFER_MULTIPLIER;

      const enemies = [];

      for (const monster of gs.monsters.values()) {
        if (monster.info.currentHp <= 0) continue;

        const mPos = monster.container.position;
        const dx = mPos.x - playerPos.x;
        const dz = mPos.z - playerPos.z;
        const dist = Math.hypot(dx, dz);

        const isCurrent = monster.info.monsterInstanceId === currentTargetId;
        if (dist > maxNormalDist && !(isCurrent && dist <= maxBufferDist)) continue;

        const dirToEnemy = getDirectionXZ(cameraPos.x, cameraPos.z, mPos.x, mPos.z);
        const angle = angleBetweenXZ(forward, dirToEnemy);

        const angleScore = angle / Math.PI;
        const distanceScore = Math.min(dist / maxNormalDist, 1);
        const score = 0.6 * angleScore + 0.4 * distanceScore;

        enemies.push({ monster, dist, angle, score });
      }

      enemies.sort((a, b) => a.score - b.score);
      return enemies;
    }

    // 循环切怪；目标没了就按上次的角度找最接近的
    function cycleEnemyTarget() {
      try {
        const gs = window.gameState;
        if (!gs) return;

        const currentTargetId = gs.targetMonsterId;
        const enemies = getTargetableEnemies(currentTargetId);
        if (enemies.length === 0) return;

        let nextIndex = 0;

        if (currentTargetId !== null && currentTargetId !== undefined) {
          const currentIdx = enemies.findIndex(
            e => e.monster.info.monsterInstanceId === currentTargetId
          );
          if (currentIdx !== -1) {
            nextIndex = (currentIdx + 1) % enemies.length;
          } else {
            if (lastTargetAngle !== null) {
              let bestDiff = Infinity;
              let bestIndex = 0;
              for (let i = 0; i < enemies.length; i++) {
                const diff = Math.abs(enemies[i].angle - lastTargetAngle);
                if (diff < bestDiff) { bestDiff = diff; bestIndex = i; }
              }
              nextIndex = bestIndex;
            }
          }
        }

        const selected = enemies[nextIndex];
        gs.setTarget(selected.monster.info.monsterInstanceId);
        lastTargetAngle = selected.angle;
      } catch (e) {
        console.error('[SpeakiController] Error in cycleEnemyTarget:', e);
      }
    }

    function triggerRumble(strong = 0.5, weak = 0.5, duration = 200) {
      if (!rumbleEnabled) return;
      const gp = navigator.getGamepads()[0];
      if (!gp || !gp.vibrationActuator) return;
      try {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0, duration,
          weakMagnitude: weak, strongMagnitude: strong
        });
      } catch (e) {}
    }

    function getCanvas() {
      if (!canvas) canvas = document.querySelector('canvas');
      return canvas;
    }

    // 游戏只在 window 上监听 KeyboardEvent，构造完直接派发
    function dispatchKey(key, type) {
      if (typeof key !== 'string' || key.length === 0) return;
      const code = key === ' ' ? 'Space'
                 : key.length === 1 ? 'Key' + key.toUpperCase()
                 : key;
      const event = new KeyboardEvent(type, {
        key: key,
        code: code,
        bubbles: true,
        cancelable: true,
        composed: true
      });
      window.dispatchEvent(event);
    }

    function pressKey(key) {
      if (!heldKeys.has(key)) {
        heldKeys.add(key);
        dispatchKey(key, 'keydown');
      }
    }

    function releaseKey(key) {
      if (heldKeys.has(key)) {
        heldKeys.delete(key);
        dispatchKey(key, 'keyup');
      }
    }

    function tapKey(key) {
      if (typeof key !== 'string' || key.length === 0) return;
      dispatchKey(key, 'keydown');
      setTimeout(() => dispatchKey(key, 'keyup'), 50);
    }

    // 游戏靠右键拖拽转视角，这里模拟 mousedown / mousemove / mouseup
    function simulateRightMouseDown() {
      if (rightMouseDown) return;
      rightMouseDown = true;
      const c = getCanvas();
      if (!c) return;
      const rect = c.getBoundingClientRect();
      mouseX = rect.left + rect.width / 2;
      mouseY = rect.top + rect.height / 2;
      c.dispatchEvent(new MouseEvent('mousedown', {
        button: 2, buttons: 2,
        clientX: mouseX, clientY: mouseY,
        bubbles: true, cancelable: true, composed: true
      }));
    }

    function simulateRightMouseUp() {
      if (!rightMouseDown) return;
      rightMouseDown = false;
      const c = getCanvas();
      if (!c) return;
      c.dispatchEvent(new MouseEvent('mouseup', {
        button: 2, buttons: 0,
        clientX: mouseX, clientY: mouseY,
        bubbles: true, cancelable: true, composed: true
      }));
    }

    function simulateRightMouseMove(dx, dy) {
      if (!rightMouseDown) return;
      const c = getCanvas();
      if (!c) return;
      mouseX += dx; mouseY += dy;
      c.dispatchEvent(new MouseEvent('mousemove', {
        clientX: mouseX, clientY: mouseY, buttons: 2,
        bubbles: true, cancelable: true, composed: true
      }));
    }

    function highlightButtonDropdown(index) {
      const select = buttonSelectMap[index];
      if (!select) return;
      if (!settingsMenu || settingsMenu.style.display !== 'flex') return;

      for (const key in buttonSelectMap) {
        buttonSelectMap[key].classList.remove('speaki-highlight');
      }
      select.classList.add('speaki-highlight');
      setTimeout(() => select.classList.remove('speaki-highlight'), 250);
    }

    function createSettingsMenu() {
      if (settingsMenu) return;

      const style = document.createElement('style');
      style.textContent = `
        .speaki-highlight {
          outline: 2px solid var(--sr-color-secondary-strong, #e0a82e);
          outline-offset: 2px;
          background-color: #fff3c4 !important;
          transition: outline 0.1s ease, background-color 0.1s ease;
        }
      `;
      document.head.appendChild(style);

      const menu = document.createElement('div');
      menu.className = 'sr-panel sr-panel--w-md';
      menu.id = 'speaki-controller-settings';
      menu.style.display = 'none';
      menu.style.position = 'fixed';
      menu.style.top = '50%';
      menu.style.left = '50%';
      menu.style.transform = 'translate(-50%, -50%)';
      menu.style.zIndex = '9999';
      menu.style.width = '40rem';
      menu.style.maxWidth = 'calc(100vw - 2rem)';
      menu.style.background = 'var(--sr-color-panel-bg)';
      menu.style.color = 'var(--sr-color-text)';
      menu.style.border = '.1875rem solid var(--sr-color-border-strong)';
      menu.style.borderRadius = 'var(--sr-radius-lg)';
      menu.style.boxShadow = 'var(--sr-shadow-panel)';
      menu.style.maxHeight = '80vh';
      menu.style.overflowY = 'auto';
      menu.style.overflowX = 'hidden';
      menu.style.boxSizing = 'border-box';
      menu.style.padding = '0';

      const header = document.createElement('div');
      header.className = 'sr-panel__header';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.padding = '0.5rem 1rem';
      header.style.margin = '0';
      menu.appendChild(header);

      const title = document.createElement('div');
      title.className = 'sr-panel__title';
      title.textContent = getText('ui', 'title');
      header.appendChild(title);

      const shortcut = document.createElement('span');
      shortcut.className = 'sr-panel__shortcut';
      shortcut.textContent = '▶';
      header.appendChild(shortcut);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'sr-panel__close';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => {
        menu.style.display = 'none';
        menu.classList.remove('sr-panel--open');
      });
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.className = 'sr-panel__body';
      body.style.padding = '1rem 0';
      body.style.margin = '0';
      menu.appendChild(body);

      const mainRow = document.createElement('div');
      mainRow.style.display = 'flex';
      mainRow.style.width = '100%';
      mainRow.style.margin = '0';
      mainRow.style.padding = '0';
      mainRow.style.gap = '0';
      body.appendChild(mainRow);

      const leftCol = document.createElement('div');
      leftCol.style.flex = '1 1 0%';
      leftCol.style.minWidth = '0';
      mainRow.appendChild(leftCol);

      const spacer = document.createElement('div');
      spacer.style.flex = '0 0 2rem';
      spacer.style.minWidth = '2rem';
      mainRow.appendChild(spacer);

      const rightCol = document.createElement('div');
      rightCol.style.flex = '1 1 0%';
      rightCol.style.minWidth = '0';
      mainRow.appendChild(rightCol);

      function createRow(col, labelKey, buttonIndex, { reversed = false, labelAlign = 'left' } = {}) {
        const row = document.createElement('div');
        row.className = 'sr-panel__row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '0.5rem';
        row.style.padding = '0';
        row.style.boxSizing = 'border-box';
        col.appendChild(row);

        const label = document.createElement('span');
        label.className = 'sr-panel__row-label';
        label.textContent = getText('ui', labelKey);
        label.style.flex = '0 0 auto';
        label.style.whiteSpace = 'nowrap';
        label.style.marginRight = '0.5rem';
        label.style.textAlign = labelAlign;
        if (reversed) {
          label.style.marginRight = '0';
          label.style.marginLeft = '0.5rem';
        }

        const select = document.createElement('select');
        select.className = 'sr-select';
        select.style.flex = '1 1 auto';
        select.style.minWidth = '0';
        select.style.maxWidth = '35%';

        for (const [actionName] of Object.entries(ACTIONS)) {
          const option = document.createElement('option');
          option.value = actionName;
          option.textContent = getText('actions', actionName);
          if (bindings[buttonIndex] === actionName) option.selected = true;
          select.appendChild(option);
        }
        select.addEventListener('change', (e) => {
          bindings[buttonIndex] = e.target.value;
          saveSettings();
        });

        if (reversed) {
          row.appendChild(select);
          row.appendChild(label);
        } else {
          row.appendChild(label);
          row.appendChild(select);
        }

        buttonSelectMap[buttonIndex] = select;
      }

      createRow(leftCol, 'leftBumper', BUTTON.LEFT_BUMPER, { labelAlign: 'right' });
      createRow(leftCol, 'leftTrigger', BUTTON.LEFT_TRIGGER, { labelAlign: 'right' });
      createRow(leftCol, 'dpadUp', BUTTON.DPAD_UP, { labelAlign: 'right' });
      createRow(leftCol, 'dpadLeft', BUTTON.DPAD_LEFT, { labelAlign: 'right' });
      createRow(leftCol, 'dpadRight', BUTTON.DPAD_RIGHT, { labelAlign: 'right' });
      createRow(leftCol, 'dpadDown', BUTTON.DPAD_DOWN, { labelAlign: 'right' });
      createRow(leftCol, 'back', BUTTON.BACK, { labelAlign: 'right' });

      createRow(rightCol, 'rightBumper', BUTTON.RIGHT_BUMPER, { reversed: true, labelAlign: 'left' });
      createRow(rightCol, 'rightTrigger', BUTTON.RIGHT_TRIGGER, { reversed: true, labelAlign: 'left' });
      createRow(rightCol, 'actionUp', BUTTON.X, { reversed: true, labelAlign: 'left' });
      createRow(rightCol, 'actionLeft', BUTTON.Y, { reversed: true, labelAlign: 'left' });
      createRow(rightCol, 'actionRight', BUTTON.B, { reversed: true, labelAlign: 'left' });
      createRow(rightCol, 'actionDown', BUTTON.A, { reversed: true, labelAlign: 'left' });

      const speedRow = document.createElement('div');
      speedRow.className = 'sr-panel__row';
      speedRow.style.display = 'flex';
      speedRow.style.alignItems = 'center';
      speedRow.style.marginTop = '1rem';
      speedRow.style.paddingLeft = '1rem';
      speedRow.style.paddingRight = '1rem';
      body.appendChild(speedRow);

      const speedLabel = document.createElement('span');
      speedLabel.className = 'sr-panel__row-label';
      speedLabel.textContent = getText('ui', 'cameraSpeed');
      speedLabel.style.flex = '0 0 auto';
      speedLabel.style.marginRight = '0.5rem';
      speedRow.appendChild(speedLabel);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '1';
      slider.max = '20';
      slider.step = '1';
      slider.value = String(cameraSensitivity);
      slider.style.flex = '1';
      slider.addEventListener('input', (e) => {
        cameraSensitivity = Number(e.target.value);
        saveSettings();
      });
      speedRow.appendChild(slider);

      const speedValue = document.createElement('span');
      speedValue.style.minWidth = '1.75rem';
      speedValue.style.textAlign = 'right';
      speedValue.textContent = slider.value;
      slider.addEventListener('input', () => { speedValue.textContent = slider.value; });
      speedRow.appendChild(speedValue);

      const rumbleRow = document.createElement('div');
      rumbleRow.className = 'sr-panel__row';
      rumbleRow.style.display = 'flex';
      rumbleRow.style.alignItems = 'center';
      rumbleRow.style.marginTop = '0.5rem';
      rumbleRow.style.paddingLeft = '1rem';
      rumbleRow.style.paddingRight = '1rem';
      body.appendChild(rumbleRow);

      const rumbleCheckbox = document.createElement('input');
      rumbleCheckbox.type = 'checkbox';
      rumbleCheckbox.checked = rumbleEnabled;
      rumbleCheckbox.addEventListener('change', (e) => {
        rumbleEnabled = e.target.checked;
        saveSettings();
      });
      rumbleRow.appendChild(rumbleCheckbox);

      const rumbleLabel = document.createElement('span');
      rumbleLabel.textContent = getText('ui', 'enableVibration');
      rumbleLabel.style.marginLeft = '0.5rem';
      rumbleRow.appendChild(rumbleLabel);

      const invertRow = document.createElement('div');
      invertRow.className = 'sr-panel__row';
      invertRow.style.display = 'flex';
      invertRow.style.alignItems = 'center';
      invertRow.style.marginTop = '0.5rem';
      invertRow.style.paddingLeft = '1rem';
      invertRow.style.paddingRight = '1rem';
      body.appendChild(invertRow);

      const invertCheckbox = document.createElement('input');
      invertCheckbox.type = 'checkbox';
      invertCheckbox.checked = invertCameraAxes;
      invertCheckbox.addEventListener('change', (e) => {
        invertCameraAxes = e.target.checked;
        saveSettings();
      });
      invertRow.appendChild(invertCheckbox);

      const invertLabel = document.createElement('span');
      invertLabel.textContent = getText('ui', 'invertCameraAxes');
      invertLabel.style.marginLeft = '0.5rem';
      invertRow.appendChild(invertLabel);

      const langRow = document.createElement('div');
      langRow.className = 'sr-panel__row';
      langRow.style.display = 'flex';
      langRow.style.alignItems = 'center';
      langRow.style.marginTop = '0.5rem';
      langRow.style.paddingLeft = '1rem';
      langRow.style.paddingRight = '1rem';
      body.appendChild(langRow);

      const langLabel = document.createElement('span');
      langLabel.className = 'sr-panel__row-label';
      langLabel.textContent = getText('ui', 'language');
      langLabel.style.flex = '0 0 auto';
      langLabel.style.marginRight = '0.5rem';
      langRow.appendChild(langLabel);

      const segmented = document.createElement('div');
      segmented.className = 'sr-segmented';
      langRow.appendChild(segmented);

      const languages = [
        { code: 'zh', label: '中文' },
        { code: 'ko', label: '한국어' },
        { code: 'en', label: 'English' },
        { code: 'ja', label: '日本語' }
      ];

      for (const lang of languages) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sr-segmented__btn';
        if (uiLanguage === lang.code) btn.classList.add('sr-segmented__btn--selected');
        btn.textContent = lang.label;
        btn.addEventListener('click', () => {
          uiLanguage = lang.code;
          // 语言只在本次会话生效，不落盘
          rebuildSettingsMenu();
        });
        segmented.appendChild(btn);
      }

      document.body.appendChild(menu);
      settingsMenu = menu;

      menu.addEventListener('mousedown', (e) => e.stopPropagation());
      menu.addEventListener('click', (e) => e.stopPropagation());
      menu.addEventListener('wheel', (e) => e.stopPropagation());
    }

    function rebuildSettingsMenu() {
      const wasOpen = settingsMenu && settingsMenu.style.display === 'flex';
      if (settingsMenu) {
        settingsMenu.remove();
        settingsMenu = null;
      }
      for (const key in buttonSelectMap) delete buttonSelectMap[key];
      createSettingsMenu();
      if (wasOpen) {
        settingsMenu.style.display = 'flex';
        settingsMenu.classList.add('sr-panel--open');
      }
    }

    function toggleSettingsMenu() {
      // 切菜单前先把 hold 键放掉，防止表情轮盘卡住
      if (emoteHeldKey !== null) {
        releaseKey(emoteHeldKey);
        emoteHeldKey = null;
      }

      if (!settingsMenu) createSettingsMenu();
      // 每次开菜单重新解析一次，好让游戏里改的键位生效
      resolveKeybinds();
      const menu = settingsMenu;
      if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';
        menu.classList.add('sr-panel--open');
      } else {
        menu.style.display = 'none';
        menu.classList.remove('sr-panel--open');
      }
    }

    function handleButton(index, pressed) {
      if (index === BUTTON.START) {
        if (!pressed && prevButtons[index]) {
          toggleSettingsMenu();
        }
        prevButtons[index] = pressed;
        return;
      }

      const actionName = bindings[index];
      const action = actionName && ACTIONS[actionName];

      if (pressed && !prevButtons[index]) {
        // 上升沿
        highlightButtonDropdown(index);
        if (action) action.run();
      } else if (!pressed && prevButtons[index]) {
        // 下降沿，只有 hold 类动作才需要收尾
        if (action && action.hold && typeof action.release === 'function') {
          action.release();
        }
      }
      prevButtons[index] = pressed;
    }

    // 左摇杆映射 WASD，右摇杆推右键拖拽转视角
    function handleAxes(gamepad) {
      const lx = gamepad.axes[AXIS.LEFT_X];
      const ly = gamepad.axes[AXIS.LEFT_Y];
      const rx = gamepad.axes[AXIS.RIGHT_X];
      const ry = gamepad.axes[AXIS.RIGHT_Y];

      const threshold = DEADZONE;
      if (lx < -threshold) pressKey('a'); else releaseKey('a');
      if (lx > threshold) pressKey('d'); else releaseKey('d');
      if (ly < -threshold) pressKey('w'); else releaseKey('w');
      if (ly > threshold) pressKey('s'); else releaseKey('s');

      const rightStickActive = Math.abs(rx) > threshold || Math.abs(ry) > threshold;
      if (rightStickActive) {
        if (!rightMouseDown) simulateRightMouseDown();
        const finalRx = invertCameraAxes ? -rx : rx;
        const finalRy = invertCameraAxes ? -ry : ry;
        simulateRightMouseMove(finalRx * cameraSensitivity, finalRy * cameraSensitivity);
      } else {
        if (rightMouseDown) simulateRightMouseUp();
      }
    }

    // 每帧轮询手柄，顺便盯血线做震动
    function poll() {
      try {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[0];

        if (gamepad) {
          handleAxes(gamepad);
          for (let i = 0; i < gamepad.buttons.length; i++) {
            handleButton(i, gamepad.buttons[i].pressed);
          }
        } else {
          for (const key of heldKeys) dispatchKey(key, 'keyup');
          heldKeys.clear();
          emoteHeldKey = null;
          if (rightMouseDown) simulateRightMouseUp();
        }

        try {
          const gs = window.gameState;
          if (gs && gs.myStat) {
            const currentHp = gs.myStat.hp;
            if (lastHp !== null && currentHp < lastHp) {
              triggerRumble(0.7, 0.3, 150);
            }
            lastHp = currentHp;
          }
        } catch (e) {}
      } catch (e) {
        console.error('[SpeakiController] Error in poll loop:', e);
      }

      requestAnimationFrame(poll);
    }

    window.addEventListener('gamepadconnected', () => {
      console.log('Gamepad connected');
    });

    // 切回标签页时重新解析，防止游戏里改了 bind 这边没跟上
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resolveKeybinds();
    });

    createSettingsMenu();
    poll();
  }

  initController();
})();