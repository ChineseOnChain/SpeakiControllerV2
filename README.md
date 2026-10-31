<div align="center">
  <a href="https://speakirpg.overture.io.kr/"><img width="165" alt="SpeakiControllerV2" src="https://github.com/user-attachments/assets/77a1d811-01ad-41a8-9723-9fe9390a29cf" /></a>
<h1 align="center">SpeakiControllerV2 · 斯皮奇手柄V2 🎮</h1>


  **<h3><em>一个给 <a href="https://speakirpg.overture.io.kr/">SpeakiRPG</a> 加上手柄支持和 Tab-Target 敌人选择功能的 mod</em></h3>**


  中文 · <a href="#日本語">日本語</a> · <a href="#english">English</a> · <a href="#한국어">한국어</a>
</div>

---
**斯皮奇手柄V2（SpeakiControllerV2）** 是个轻量级 Chrome 扩展，给网页游戏 **《[斯皮奇养成](https://speakirpg.overture.io.kr/)》** （英文名为 ***「SpeakiRPG」***，韩文名为 ***「스피키 키우기」***，日文名为 ***「スピキ育成」*** / ***「スピキMMO」***）加上完整的手柄支持，并内置 Tab-Target 选敌和一套直观的设置界面。这游戏原本完全依赖键鼠操作，长时间刷怪容易让手吃不消；有了这个扩展，移动和战斗都能用手柄完整玩下来。

## 功能亮点

### 自定义 Tab-Targeting

这是斯皮奇手柄V2最拿得出手的功能。

斯皮奇手柄V2内置了一套 Tab-Target 选敌逻辑，思路参考经典 MMO 的 Tab-Target。它不像有些方案那样只按“离得最近”来选敌人，而是在侦测范围内扫描敌人，综合“可见性”和“距离”打分，再按总分循环切换目标。它还处理了一些边界情况：当前目标死亡后，系统会记住其大致位置；敌人短暂跑出侦测范围时，也会留一点缓冲。这样切目标会更顺，不至于动不动就断。

- **60% 权重：镜头视野内的可见性** —— 根据玩家视角计算
- **40% 权重：相对距离** —— 越近的敌人得分越高

理论上，它会优先选你“正在看着的”敌人，而不是单纯“离得最近的”敌人，手感接近传统 MMO 的 Tab-Target。这个功能目前还偏实验性，谈不上完美，但日常玩下来基本够用，至少比单纯的“就近选敌”强不少。


<div align="center">
<img height="300" alt="Tab-Target1" src="https://github.com/user-attachments/assets/52bf1693-fe1b-4f1b-80d3-04ea3fa4c454" />
<img height="300" alt="Tab-Target2" src="https://github.com/user-attachments/assets/d2ba3290-c24f-40d1-805f-2710dac9ca87" />
</div>


### 其他

- 🎮 **标准手柄支持** —— 基于 Gamepad API，兼容 Xbox、PlayStation 等常见手柄
- ⚙️ **自带设置界面** —— 可改键、调视角速度、开关震动、反转 X/Y 轴。界面参考游戏自身菜单设计，用起来比较自然
- ⚡ **轻量、非侵入式** —— 不改游戏文件，也不需要特殊权限
- 🌏 **多语言支持** —— 除中文外，还支持游戏自带的日语、英语和韩语

<a href="https://github.com/ChineseOnChain/SpeakiControllerV2/#"><img width="1128" height="674" alt="设置" src="https://github.com/user-attachments/assets/f0fda7ce-f8f5-4bc8-b3ec-3b3b703f75a5" /></a>



## 已知限制

先说在前头，免得你装完发现不对劲：

- **菜单和 NPC 对话没法用手柄操作。** 游戏内的菜单、商店、对话框这类 UI 交互，还是得靠鼠标和键盘，本扩展没有覆盖这部分。
- **只能保证刷怪和团本 / Raid 场景下的常规移动和战斗正常工作。**
- **目前只支持 Chrome。** 其他浏览器还没测过，不排除以后能行，但现在别指望。

## 安装

本 mod 只在 GitHub 上发布，没上架 Chrome 网上应用店。

1. 到 [Releases](https://github.com/ChineseOnChain/SpeakiControllerV2/releases) 页面下载最新版本的压缩包，解压出来
2. 在地址栏输入 `chrome://extensions/` 回车
3. 打开页面**右上角**的「开发者模式」
4. 点击**左上角**的「加载已解压的扩展程序」，选中刚才解压出来的文件夹
5. 打开 <https://speakirpg.overture.io.kr/> 开玩

<a href="https://github.com/ChineseOnChain/SpeakiControllerV2/#"><img width="720" alt="扩展程序" src="https://github.com/user-attachments/assets/3f033ce1-1094-42e0-8445-d05fa217f1e4" /></a>


想跟进开发或者自己改代码的话，也可以直接克隆仓库：

```
git clone https://github.com/ChineseOnChain/SpeakiControllerV2.git
```


它的工作方式是这样的：

- `background.js` 负责把游戏状态暴露出来，并注入 `main-world-controller.js`
- 所有逻辑都在 mod 内部自己跑，完全自包含

不读你的浏览记录，不碰别的标签页，不向网络发送数据。

## 常见问题

**Q：用这个会被封号吗？**

SpeakiRPG 的 GM 公开说过：不影响其他玩家、也不制造不公平优势的 mod 不会被处罚。斯皮奇手柄V2 的设计目标就是符合这条原则——它只是把键鼠输入换成手柄输入，不修改游戏数据，不提供任何自动化或者额外优势。

不过最终解释权在游戏方，这话我们只能转述，没法替他们打包票。

**Q：菜单和 NPC 对话能用手柄吗？**

不能，见上面「已知限制」。

**Q：会支持 Edge / Firefox 吗？**

目前没计划。Chrome 是唯一确认可用的平台。

---

## 日本語

**SpeakiControllerV2** は、[スピキ育成](https://speakirpg.overture.io.kr/)（通称「スピキMMO」）にゲームパッド対応を追加する MOD です。パッドを挿せばそのまま遊べます —— 狩り中にマウスを連打する必要も、キーボードで指を痛めることもありません。接続するだけで動作し、キー割り当て変更・カメラ速度・振動オンオフ・X/Y軸反転を設定できる直感的な設定画面も用意していますが、これらは任意で必須のセットアップではありません。

**最大の特徴 —— 独自のタブターゲット。** ただ「一番近い敵」を取るだけのコントローラー MOD とは違い、SpeakiControllerV2 にはクラシック MMO のタブターゲットを踏襲した独自機能を搭載しています。周囲の敵を **カメラ視界内での見えやすさ 60%** ＋ **相対距離 40%** の合成スコアで順に切り替えます。「一番近い敵」ではなく「見ている敵」を選ぶ仕組みです。まだ実験的な機能ですが、通常のプレイでは問題なく機能するはずです。

**搭載内容：** Gamepad API 対応の標準パッド（Xbox、PlayStation など）／UI の多言語対応／スキル1〜4、ジャンプ、エモート、ポータル、基本攻撃、町へ帰還、HPポーション、復活、視点リセット、敵選択の完全リバインド。

**既知の制限：** ゲーム内メニューおよび NPC との会話はゲームパッドで**操作できません** —— これらには引き続きマウスとキーボードが必要です。狩りやレイドにおける通常の移動と戦闘のみ動作を保証します。現時点では Chrome のみ対応で、他のブラウザは未対応です。

**インストール：** [Releases](https://github.com/ChineseOnChain/SpeakiControllerV2/releases) ページから最新版をダウンロードして解凍し、`chrome://extensions/` を開いて右上のデベロッパーモードを有効化、左上の「パッケージ化されていない拡張機能を読み込む」で解凍したフォルダを選択してください。開発を追いたい場合はリポジトリをクローンする方法もあります。

**フェアプレイについて：** GM は、他のプレイヤーに迷惑をかけず不公平な優位性を生まない MOD は処罰しないと公言しています。SpeakiControllerV2 はこれに準拠する設計です —— 入力方式を変換するだけで、ゲームデータの改変や自動化は行いません。最終的な判断は運営に帰属します。

## English

**SpeakiControllerV2** is a mod for [SpeakiRPG](https://speakirpg.overture.io.kr/) that adds gamepad support. Plug in a pad and play — no mouse-clicking and no keyboard cramp while grinding. It works out of the box, there's an intuitive built-in settings panel for rebinding, camera speed, rumble toggle, X/Y axis inversion — but is optional, not a required setup step.

**Standout feature — custom tab targeting.** Unlike controller mods that just grab the nearest enemy, SpeakiControllerV2 features custom tab targeting modeled on the classic MMO approach: nearby enemies are cycled by a combined score of **60% camera-view line of sight** and **40% relative distance**. It picks what you're *looking at*, not merely what's *closest*. This is experimental but should function well during normal gameplay.

**Includes:** standard Gamepad API support (Xbox, PlayStation, etc.) · localized UI · full rebinding for skills 1–4, jump, emote, portal, basic attack, return to town, HP potion, respawn, camera reset and tab-target.

**Known limitations:** In-game menus and NPC dialogue **cannot** be navigated with a gamepad — mouse and keyboard are still required for those. Only standard movement and combat, for grinding and raids, are guaranteed to work. Chrome only for now; other browsers aren't supported.

**Installation:** download the latest release from the [Releases](https://github.com/ChineseOnChain/SpeakiControllerV2/releases) page and unzip it, then open `chrome://extensions/`, enable Developer Mode (top right), click "Load unpacked" (top left), and select the extracted folder. Cloning the repo works too if you want to follow development. 

**Fair play:** The GM has stated publicly that mods which don't disturb other players and don't create unfair advantages will not be punished. SpeakiControllerV2 is designed to comply with that — it only translates input; it doesn't modify game data or automate anything. Final say rests with the game's operators.

## 한국어

**SpeakiControllerV2**는 [스피키 키우기](https://speakirpg.overture.io.kr/)에 게임패드 지원을 추가하는 모드입니다. 패드만 꽂으면 바로 플레이할 수 있습니다 —— 사냥하면서 마우스를 연타할 일도, 키보드로 손가락 아플 일도 없습니다. 연결만 하면 바로 동작하며, 키 리바인딩·카메라 속도·진동 토글·X/Y축 반전을 설정할 수 있는 직관적인 설정 패널도 들어 있습니다. 다만 이는 선택 사항이고 필수 설정 단계는 아닙니다.

**가장 큰 특징 —— 자체 탭 타겟팅.** 그냥 '가장 가까운 적'을 잡는 컨트롤러 모드와 달리, SpeakiControllerV2에는 클래식 MMO의 탭 타겟팅을 본뜬 자체 기능이 들어 있습니다. 주변 적을 **카메라 시야 내 가시성 60%** + **상대 거리 40%** 의 합산 점수로 순환 선택합니다. '가장 가까운 적'이 아니라 '보고 있는 적'을 고르는 방식입니다. 아직 실험적인 기능이지만 일반적인 플레이에서는 문제없이 동작할 것입니다.

**포함 사항:** Gamepad API 지원 표준 패드(Xbox, PlayStation 등) / UI 다국어 지원 / 스킬 1~4, 점프, 감정표현, 포탈, 기본 공격, 마을 귀환, HP 포션, 부활, 카메라 리셋, 적 선택 완전 리바인딩.

**알려진 제한:** 게임 내 메뉴와 NPC 대화는 게임패드로 **조작할 수 없습니다** —— 해당 부분은 여전히 마우스와 키보드가 필요합니다. 사냥과 레이드에서의 일반 이동과 전투만 동작을 보장합니다. 현재 Chrome만 지원하며 다른 브라우저는 미지원입니다.

**설치:** [Releases](https://github.com/ChineseOnChain/SpeakiControllerV2/releases) 페이지에서 최신 버전을 내려받아 압축을 푼 뒤, `chrome://extensions/`를 열고 우측 상단의 개발자 모드를 켠 다음, 좌측 상단의 '압축해제된 확장 프로그램을 로드'로 압축을 푼 폴더를 선택하세요. 개발을 따라가고 싶다면 저장소를 클론하는 방법도 있습니다.

**공정성 안내:** GM은 다른 플레이어에게 피해를 주지 않고 불공정한 우위를 만들지 않는 모드는 제재하지 않는다고 공개적으로 밝힌 바 있습니다. SpeakiControllerV2는 이를 준수하도록 설계되었습니다 —— 입력 방식을 변환할 뿐, 게임 데이터를 수정하거나 자동화하지 않습니다. 최종 판단은 운영 측에 있습니다.


---
<div align="center">
<a href="https://x.com/yupi_yupapa9/status/2098812065284792540"><img width="2472" alt="SpeakiRPG" src="https://github.com/user-attachments/assets/58fbb923-e10e-4d0b-9e02-40b0034e90a5" />

  **SpeakiRPG** 由 [단특](https://www.youtube.com/@단특) 开发。本 mod 与官方无隶属关系，也未获官方认可。

<sub><a href="https://github.com/ChineseOnChain">Chairman</a></sub>
</div>
