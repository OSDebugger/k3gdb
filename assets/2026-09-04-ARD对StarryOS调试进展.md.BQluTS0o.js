import{_ as a,o as n,c as p,a2 as e}from"./chunks/framework.Ca9F9Y59.js";const g=JSON.parse('{"title":"ARD 对 K3 启动调试进展","description":"","frontmatter":{},"headers":[],"relativePath":"2026-09-04-ARD对StarryOS调试进展.md","filePath":"2026-09-04-ARD对StarryOS调试进展.md"}'),t={name:"2026-09-04-ARD对StarryOS调试进展.md"};function i(l,s,c,o,d,h){return n(),p("div",null,[...s[0]||(s[0]=[e(`<h1 id="ard-对-k3-启动调试进展" tabindex="-1">ARD 对 K3 启动调试进展 <a class="header-anchor" href="#ard-对-k3-启动调试进展" aria-label="Permalink to &quot;ARD 对 K3 启动调试进展&quot;">​</a></h1><p>本阶段主要围绕两个目标：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>① 把已经验证好的 K3 + StarryOS 源码调试环境稳定启动起来</span></span>
<span class="line"><span>② 正式把 ARD 接入 K3 真板，并验证基础源码调试能力</span></span></code></pre></div><p>整体上，本阶段完成了一次比较关键的跨越：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>K3 + StarryOS 底层调试基线</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>ARD</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>gdb-multiarch</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>OpenOCD</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>J-Link / JTAG</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>K3 真板</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>Rust 源码断点 / Continue / Pause / Step Over</span></span></code></pre></div><p>最终已经能够直接在 VSCode 的 ARD 调试界面里控制真实运行中的 K3 + StarryOS。</p><hr><h2 id="golden-flow-启动过程中发现-warm-recovery-前置条件" tabindex="-1">Golden Flow 启动过程中发现 warm-recovery 前置条件 <a class="header-anchor" href="#golden-flow-启动过程中发现-warm-recovery-前置条件" aria-label="Permalink to &quot;Golden Flow 启动过程中发现 warm-recovery 前置条件&quot;">​</a></h2><p>在正式接入 ARD 之前，需要先重新启动已经冻结的 Host-DWARF StarryOS 调试环境。</p><p>原本已经整理出一套 Golden Flow：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>BootROM Recovery</span></span>
<span class="line"><span>→ Debug FSBL / SPL</span></span>
<span class="line"><span>→ OpenSBI</span></span>
<span class="line"><span>→ Full U-Boot</span></span>
<span class="line"><span>→ scsi scan</span></span>
<span class="line"><span>→ Host-DWARF StarryOS</span></span>
<span class="line"><span>→ OpenOCD</span></span>
<span class="line"><span>→ GDB</span></span></code></pre></div><p>并且相关制品全部通过完整性检查：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>FSBL.bin                             ✅</span></span>
<span class="line"><span>fw_dynamic.bin                       ✅</span></span>
<span class="line"><span>fw_dynamic.elf                       ✅</span></span>
<span class="line"><span>fw_dynamic.itb                       ✅</span></span>
<span class="line"><span>StarryOS DTB                         ✅</span></span>
<span class="line"><span>Host-DWARF StarryOS BIN              ✅</span></span>
<span class="line"><span>Host-DWARF StarryOS ELF              ✅</span></span>
<span class="line"><span>OpenSBI + Full U-Boot combined FIT   ✅</span></span></code></pre></div><p>但是本次重新启动时发现了一个比较特殊的问题。</p><p>BootROM Recovery 正常：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>version-brom: 1.0</span></span></code></pre></div><p>Debug FSBL 正常：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>U-Boot SPL 2022.10-dirty</span></span>
<span class="line"><span>Debug JTAG enabled on MMC1 pins</span></span></code></pre></div><p>SPL fastboot 也正常：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>version: 0.4</span></span></code></pre></div><p>combined FIT 可以正常下载：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot stage k3-jtag-ram-opensbi-uboot.itb</span></span>
<span class="line"><span>OKAY</span></span></code></pre></div><p>但是执行：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot continue</span></span></code></pre></div><p>之后，Full U-Boot 没有继续启动。</p><p>也就是说启动链停在：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>BootROM             ✅</span></span>
<span class="line"><span>Debug FSBL / SPL    ✅</span></span>
<span class="line"><span>combined FIT        ✅</span></span>
<span class="line"><span>OpenSBI             ?</span></span>
<span class="line"><span>Full U-Boot         ❌</span></span></code></pre></div><p>一开始仅凭串口并不能确认 CPU 到底停在哪里，因此保留现场，重新通过 JTAG + OpenOCD 连接 K3。</p><p>成功抓到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>PC = 0x100026c10</span></span>
<span class="line"><span>RA = 0x100026e9e</span></span>
<span class="line"><span>SP = 0x100083980</span></span></code></pre></div><p>combined FIT 中 OpenSBI 的运行地址为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>0x100000000</span></span></code></pre></div><p>因此可以确定：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>SPL 已经完成</span></span>
<span class="line"><span>→ CPU 已经进入 OpenSBI</span></span>
<span class="line"><span>→ 但还没有进入 Full U-Boot</span></span></code></pre></div><p>进一步通过冻结 OpenSBI ELF 对地址进行符号解析：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>PC 0x100026c10</span></span>
<span class="line"><span>→ csi_dcache_invalid_range()</span></span>
<span class="line"><span>RA 0x100026e9e</span></span>
<span class="line"><span>→ __smq_rx()</span></span></code></pre></div><p>最终定位到 OpenSBI early-init 阶段的 RPMI shared-memory mailbox 接收路径：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>OpenSBI</span></span>
<span class="line"><span>→ platform early init</span></span>
<span class="line"><span>→ RPMI HSM 初始化</span></span>
<span class="line"><span>→ RPMI shared-memory mailbox</span></span>
<span class="line"><span>→ P2A_ACK queue</span></span>
<span class="line"><span>→ __smq_rx()</span></span>
<span class="line"><span>→ csi_dcache_invalid_range()</span></span></code></pre></div><p>这说明当前失败并不是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>FSBL 坏了</span></span>
<span class="line"><span>U-Boot FIT 损坏</span></span>
<span class="line"><span>StarryOS 出问题</span></span>
<span class="line"><span>JTAG 出问题</span></span></code></pre></div><p>而是在 <strong>OpenSBI 初始化 RPMI 管理通信时遇到了异常状态。</strong></p><hr><h2 id="排除-清理文件把-golden-flow-删坏-的可能" tabindex="-1">排除“清理文件把 Golden Flow 删坏”的可能 <a class="header-anchor" href="#排除-清理文件把-golden-flow-删坏-的可能" aria-label="Permalink to &quot;排除“清理文件把 Golden Flow 删坏”的可能&quot;">​</a></h2><p>由于之前完成底层环境之后进行过一次大规模目录清理，所以一开始怀疑：</p><p><strong>会不会是清理过程中误删了 ESOS / RCPU / RPMI 相关启动文件？</strong></p><p>历史清理确实删除过大量：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>构建目录</span></span>
<span class="line"><span>重复制品</span></span>
<span class="line"><span>archive 旧构建树</span></span>
<span class="line"><span>backup / temp</span></span>
<span class="line"><span>旧工具</span></span>
<span class="line"><span>document history</span></span></code></pre></div><p>但是继续回查历史日志后发现一个非常关键的事实：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>2026-09-01 16:20</span></span>
<span class="line"><span>同一套 FSBL + combined FIT</span></span>
<span class="line"><span>曾成功进入 Full U-Boot / StarryOS</span></span></code></pre></div><p>而在清理之前：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>2026-09-01 19:02</span></span>
<span class="line"><span>2026-09-01 19:16</span></span></code></pre></div><p>就已经出现过和本次完全相同的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>combined FIT continue</span></span>
<span class="line"><span>→ Full U-Boot 没有启动</span></span></code></pre></div><p>因此可以排除：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>9 月 2 日文件清理</span></span>
<span class="line"><span>→ 导致 Golden Flow 第一次发生回归</span></span></code></pre></div><p>同时检查发现，ESOS / RCPU 相关研究资料和 firmware 也没有完全丢失。</p><p>所以本次问题最终更像是：</p><p><strong>Golden Flow 原本就存在一个没有被明确记录下来的“启动前状态”依赖。</strong></p><hr><h2 id="发现-golden-flow-的-warm-recovery-前置条件" tabindex="-1">发现 Golden Flow 的 warm-recovery 前置条件 <a class="header-anchor" href="#发现-golden-flow-的-warm-recovery-前置条件" aria-label="Permalink to &quot;发现 Golden Flow 的 warm-recovery 前置条件&quot;">​</a></h2><p>为了确认这个隐藏前置条件，进行了一个比较关键的 A/B 实验。</p><p>首先不进入 Debug Recovery，而是让 K3 正常走一次官方启动链：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>官方 SPL</span></span>
<span class="line"><span>→ 官方 Full U-Boot</span></span>
<span class="line"><span>→ run ufs_boot</span></span>
<span class="line"><span>→ Bianbu Linux</span></span></code></pre></div><p>Linux 成功启动以后明确看到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>remoteproc remoteproc0: rcpu_rproc1 is available</span></span>
<span class="line"><span>remoteproc remoteproc0: attaching to rcpu_rproc1</span></span>
<span class="line"><span>remote processor rcpu_rproc1 is now attached</span></span></code></pre></div><p>同时 RPMI 相关设备正常注册：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>rpmi pwrkey</span></span>
<span class="line"><span>riscv-rpmi-rtc</span></span></code></pre></div><p>说明官方启动链已经正常建立：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>RCPU</span></span>
<span class="line"><span>+</span></span>
<span class="line"><span>RPMI management environment</span></span></code></pre></div><p>随后保持板卡供电，不进行完整掉电，通过 warm reboot 再进入 BootROM Recovery：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Bianbu</span></span>
<span class="line"><span>→ warm reboot</span></span>
<span class="line"><span>→ FORCE_RECOVERY</span></span>
<span class="line"><span>→ BootROM Recovery</span></span>
<span class="line"><span>→ Debug Golden Flow</span></span></code></pre></div><p>使用的仍然是完全相同的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Debug FSBL</span></span>
<span class="line"><span>OpenSBI</span></span>
<span class="line"><span>combined U-Boot FIT</span></span>
<span class="line"><span>Host-DWARF StarryOS</span></span></code></pre></div><p>结果这一次成功出现：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>U-Boot 2022.10-dirty</span></span>
<span class="line"><span>CPU: rv64imafdcvh</span></span>
<span class="line"><span>Model: spacemit k3 com260 ifx board</span></span></code></pre></div><p>也就是说：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>OpenSBI</span></span>
<span class="line"><span>→ Full U-Boot ✅</span></span></code></pre></div><p>随后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>scsi scan</span></span></code></pre></div><p>成功识别：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>KINGSTON TY7B-128</span></span></code></pre></div><p>继续按照原 Golden Flow：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>加载 Host-DWARF StarryOS BIN</span></span>
<span class="line"><span>→ 加载 DTB</span></span>
<span class="line"><span>→ booti</span></span>
<span class="line"><span>→ Welcome to Starry OS!</span></span></code></pre></div><p>最终 StarryOS 正常进入 shell。</p><p>因此本阶段新确认了一条非常重要的实际前置条件：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>官方启动链完成一次 RCPU / RPMI 初始化</span></span>
<span class="line"><span>→ 不完全断电</span></span>
<span class="line"><span>→ warm recovery</span></span>
<span class="line"><span>→ Debug Golden Flow</span></span>
<span class="line"><span>→ StarryOS</span></span></code></pre></div><p>可以稳定成功。</p><p>而：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>完全 cold boot</span></span>
<span class="line"><span>→ 直接 BootROM Recovery</span></span>
<span class="line"><span>→ Debug Golden Flow</span></span></code></pre></div><p>则存在卡在 OpenSBI RPMI 初始化路径的可能。</p><p>所以目前 Golden Flow 更准确的理解应该是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>厂商底层 management 环境初始化</span></span>
<span class="line"><span>→ warm recovery</span></span>
<span class="line"><span>→ Debug FSBL</span></span>
<span class="line"><span>→ OpenSBI</span></span>
<span class="line"><span>→ Full U-Boot</span></span>
<span class="line"><span>→ UFS</span></span>
<span class="line"><span>→ Host-DWARF StarryOS</span></span></code></pre></div><p>这一点很重要，因为项目本身的目标是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>StarryOS 真板调试</span></span>
<span class="line"><span>→ OpenOCD / GDB</span></span>
<span class="line"><span>→ ARD</span></span></code></pre></div><p>而不是重新实现：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>K3 完整 cold boot</span></span>
<span class="line"><span>→ ESOS / RCPU</span></span>
<span class="line"><span>→ RPMI</span></span>
<span class="line"><span>→ management firmware 生命周期</span></span></code></pre></div><p>因此当前不继续扩大范围去重新实现完整 self-contained cold boot，而是把 <strong>warm-recovery 前置条件</strong>明确记录下来，继续 ARD 主线。</p><hr><h2 id="ard-正式接入-k3-真板" tabindex="-1">ARD 正式接入 K3 真板 <a class="header-anchor" href="#ard-正式接入-k3-真板" aria-label="Permalink to &quot;ARD 正式接入 K3 真板&quot;">​</a></h2><p>StarryOS 启动成功以后，重新启动冻结的 OpenOCD 配置：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>JTAG tap: k3.cpu enabled</span></span>
<span class="line"><span>[k3.x100.0] Examined RISC-V core</span></span>
<span class="line"><span>XLEN=64</span></span>
<span class="line"><span>[k3.x100.0] Examination succeed</span></span>
<span class="line"><span>Listening on port 3333 for gdb connections</span></span></code></pre></div><p>随后在 StarryOS workspace：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>/home/user/ARD_Deploy/tgoskits</span></span></code></pre></div><p>中增加 K3 真板调试配置：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>K3 StarryOS Host-DWARF Smoke Test</span></span></code></pre></div><p>核心配置为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD</span></span>
<span class="line"><span>request: launch</span></span>
<span class="line"><span>Host-DWARF ELF</span></span>
<span class="line"><span>gdb-multiarch</span></span>
<span class="line"><span>remote: localhost:3333</span></span></code></pre></div><p>ARD 开发窗口仍然保持：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>/home/user/async-integration/async-debug</span></span>
<span class="line"><span>branch: async-integration</span></span></code></pre></div><p>然后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD 开发窗口</span></span>
<span class="line"><span>→ F5</span></span>
<span class="line"><span>→ Extension Development Host</span></span>
<span class="line"><span>→ 打开 tgoskits</span></span>
<span class="line"><span>→ 选择 K3 StarryOS Host-DWARF Smoke Test</span></span>
<span class="line"><span>→ F5</span></span></code></pre></div><p>OpenOCD 随即出现：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>accepting &#39;gdb&#39; connection on tcp/3333</span></span>
<span class="line"><span>k3.x100.0 halted due to debug-request.</span></span></code></pre></div><p>说明第一次真正完成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD</span></span>
<span class="line"><span>→ gdb-multiarch</span></span>
<span class="line"><span>→ OpenOCD</span></span>
<span class="line"><span>→ J-Link / JTAG</span></span>
<span class="line"><span>→ K3 真板</span></span></code></pre></div><hr><h2 id="ard-第一次直接看到-k3-rust-源码" tabindex="-1">ARD 第一次直接看到 K3 Rust 源码 <a class="header-anchor" href="#ard-第一次直接看到-k3-rust-源码" aria-label="Permalink to &quot;ARD 第一次直接看到 K3 Rust 源码&quot;">​</a></h2><p>ARD 连接以后，VSCode 成功显示当前真板执行位置。</p><p>第一次暂停时直接看到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ax_std::os::libc_compat::memcpy</span></span>
<span class="line"><span>os/arceos/ulib/axstd/src/os/libc_compat.rs:499</span></span></code></pre></div><p>并且左侧调试界面正常出现：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Call Stack</span></span>
<span class="line"><span>Arguments</span></span>
<span class="line"><span>Locals</span></span>
<span class="line"><span>当前线程</span></span>
<span class="line"><span>源码位置</span></span></code></pre></div><p>也就是说，之前已经由手工 GDB 验证的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>PC</span></span>
<span class="line"><span>→ Rust 函数</span></span>
<span class="line"><span>→ Rust 源文件</span></span>
<span class="line"><span>→ 源码行</span></span></code></pre></div><p>现在已经成功搬到了 ARD / VSCode 调试界面中。</p><p>因此第一次完成了：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD 真板连接                   ✅</span></span>
<span class="line"><span>ARD 获取 K3 PC                ✅</span></span>
<span class="line"><span>ARD Rust source 定位          ✅</span></span>
<span class="line"><span>ARD Call Stack                ✅</span></span>
<span class="line"><span>ARD Arguments / Locals        ✅</span></span></code></pre></div><hr><h2 id="ard-真板源码断点与-f10-验证" tabindex="-1">ARD 真板源码断点与 F10 验证 <a class="header-anchor" href="#ard-真板源码断点与-f10-验证" aria-label="Permalink to &quot;ARD 真板源码断点与 F10 验证&quot;">​</a></h2><p>接下来直接复用了之前手工 GDB 已经冻结的验证点：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>platforms/ax-plat/src/time.rs:23</span></span></code></pre></div><p>在 ARD 中直接设置源码断点：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>time.rs:23</span></span></code></pre></div><p>然后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>F5 / Continue</span></span></code></pre></div><p>真板成功命中：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Breakpoint</span></span>
<span class="line"><span>ax_plat::time::current_ticks ()</span></span>
<span class="line"><span>at platforms/ax-plat/src/time.rs:23</span></span></code></pre></div><p>这说明：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>VSCode source breakpoint</span></span>
<span class="line"><span>→ ARD</span></span>
<span class="line"><span>→ GDB/MI</span></span>
<span class="line"><span>→ GDB</span></span>
<span class="line"><span>→ OpenOCD</span></span>
<span class="line"><span>→ K3</span></span>
<span class="line"><span>→ 真板命中</span></span></code></pre></div><p>整条链已经真正成立。</p><p>随后在 VSCode 中直接执行：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>F10 / Step Over</span></span></code></pre></div><p>最终源码位置移动到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>platforms/axplat-dyn/src/generic_timer.rs:58</span></span></code></pre></div><p>和之前手工 GDB：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>next</span></span></code></pre></div><p>得到的结果完全一致。</p><p>因此已经完成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD source breakpoint              ✅</span></span>
<span class="line"><span>ARD 真板 breakpoint hit            ✅</span></span>
<span class="line"><span>ARD F10 / Step Over                ✅</span></span>
<span class="line"><span>ARD 跨文件 Rust source 跳转        ✅</span></span></code></pre></div><p>这一步意味着之前的手工 GDB 基线已经真正被 ARD 接管。</p><hr><h2 id="发现-ard-pause-被错误显示成-出现异常" tabindex="-1">发现 ARD Pause 被错误显示成“出现异常” <a class="header-anchor" href="#发现-ard-pause-被错误显示成-出现异常" aria-label="Permalink to &quot;发现 ARD Pause 被错误显示成“出现异常”&quot;">​</a></h2><p>基础源码调试成功以后，又测试了一项最基本的状态切换：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>F5 Continue</span></span>
<span class="line"><span>→ Pause</span></span></code></pre></div><p>实际底层行为完全正常：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Program received signal SIGINT, Interrupt.</span></span>
<span class="line"><span>ax_plat::time::monotonic_time ()</span></span>
<span class="line"><span>at platforms/ax-plat/src/time.rs:57</span></span></code></pre></div><p>并且 VSCode 能正常恢复：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>源码位置</span></span>
<span class="line"><span>黄色执行箭头</span></span>
<span class="line"><span>Call Stack</span></span>
<span class="line"><span>Arguments / Locals</span></span></code></pre></div><p>说明：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Continue ✅</span></span>
<span class="line"><span>Pause ✅</span></span>
<span class="line"><span>CPU halt ✅</span></span>
<span class="line"><span>源码恢复 ✅</span></span></code></pre></div><p>但是 VSCode 界面却显示：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>出现异常</span></span></code></pre></div><p>Call Stack 里也把停止原因显示成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Signal: SIGINT</span></span></code></pre></div><p>连续两次：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Continue</span></span>
<span class="line"><span>→ Pause</span></span></code></pre></div><p>都能稳定复现。</p><p>因此可以确定，这不是硬件问题，也不是 GDB 或 OpenOCD 问题，而是 ARD 的 <strong>DAP stop reason 映射问题</strong>。</p><p>实际链路为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>用户点击 Pause</span></span>
<span class="line"><span>→ ARD pauseRequest()</span></span>
<span class="line"><span>→ GDB -exec-interrupt</span></span>
<span class="line"><span>→ GDB 返回 signal-received / SIGINT</span></span>
<span class="line"><span>→ ARD 把所有 signal-stop 都映射成 exception</span></span>
<span class="line"><span>→ VSCode 显示“出现异常”</span></span></code></pre></div><p>实际上用户主动 Pause 导致的 SIGINT 应该被解释为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pause</span></span></code></pre></div><p>而不是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>exception</span></span></code></pre></div><hr><h2 id="修复-pause-stop-reason" tabindex="-1">修复 Pause stop-reason <a class="header-anchor" href="#修复-pause-stop-reason" aria-label="Permalink to &quot;修复 Pause stop-reason&quot;">​</a></h2><p>本次修复保持在 ARD 自身范围内，没有修改：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>K3</span></span>
<span class="line"><span>StarryOS</span></span>
<span class="line"><span>FSBL</span></span>
<span class="line"><span>OpenSBI</span></span>
<span class="line"><span>U-Boot</span></span>
<span class="line"><span>OpenOCD</span></span>
<span class="line"><span>JTAG</span></span></code></pre></div><p>也没有修改：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>RuntimeEventGraph</span></span>
<span class="line"><span>History</span></span>
<span class="line"><span>Snapshot</span></span>
<span class="line"><span>OSStateMachine</span></span></code></pre></div><p>主要修复位置：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>src/gdbDebugSession.ts</span></span></code></pre></div><p>原来的逻辑是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>signal-received</span></span>
<span class="line"><span>→ signal-stop</span></span>
<span class="line"><span>→ StoppedEvent(&quot;exception&quot;)</span></span></code></pre></div><p>因此无论 SIGINT 是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>目标程序自己产生</span></span></code></pre></div><p>还是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>用户点击 Pause 产生</span></span></code></pre></div><p>都会被认为是 exception。</p><p>现在增加一次性的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pendingUserPause</span></span></code></pre></div><p>当用户点击 Pause：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pendingUserPause = true</span></span>
<span class="line"><span>→ -exec-interrupt</span></span></code></pre></div><p>随后收到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>SIGINT</span></span></code></pre></div><p>如果这是刚才 Pause 发起的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pendingUserPause + SIGINT</span></span>
<span class="line"><span>→ DAP reason = pause</span></span></code></pre></div><p>否则真正由 target 自己产生的 SIGINT 仍然保持：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>DAP reason = exception</span></span></code></pre></div><p>同时还处理了：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>breakpoint 与 Pause 竞争</span></span>
<span class="line"><span>step 与 Pause 竞争</span></span>
<span class="line"><span>非 SIGINT signal</span></span>
<span class="line"><span>interrupt 失败</span></span>
<span class="line"><span>disconnect</span></span>
<span class="line"><span>新 session</span></span></code></pre></div><p>避免 pending 状态残留到下一次停止事件。</p><hr><h2 id="pause-修复测试" tabindex="-1">Pause 修复测试 <a class="header-anchor" href="#pause-修复测试" aria-label="Permalink to &quot;Pause 修复测试&quot;">​</a></h2><p>修改后完成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>npm run compile                  PASS</span></span>
<span class="line"><span>Stop reason tests               5 / 5 PASS</span></span>
<span class="line"><span>MI parser                       57 / 57 PASS</span></span>
<span class="line"><span>OSStateMachine                  37 / 37 PASS</span></span>
<span class="line"><span>OS debug flow                   28 / 28 PASS</span></span>
<span class="line"><span>git diff --check                PASS</span></span></code></pre></div><p>随后重新加载 ARD 扩展，并回到 K3 真板验证。</p><p>连续两次：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>F5 Continue</span></span>
<span class="line"><span>→ Pause</span></span></code></pre></div><p>均成功完成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>源码重新定位             ✅</span></span>
<span class="line"><span>Call Stack              ✅</span></span>
<span class="line"><span>黄色执行箭头             ✅</span></span>
<span class="line"><span>Pause 正常               ✅</span></span>
<span class="line"><span>不再显示“出现异常”       ✅</span></span></code></pre></div><p>GDB Debug Console 仍然会显示：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Program received signal SIGINT, Interrupt.</span></span></code></pre></div><p>这是正常现象。</p><p>因为底层 GDB 实际仍然是通过 SIGINT 中断正在运行的目标，修复的是 ARD / DAP 对这个停止事件的解释：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>底层：</span></span>
<span class="line"><span>SIGINT</span></span></code></pre></div><p>但是上层 VSCode：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Pause</span></span></code></pre></div><p>这才是正确的行为。</p><p>随后再次进行源码断点回归：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>time.rs:23</span></span>
<span class="line"><span>→ F5</span></span>
<span class="line"><span>→ 真板命中</span></span>
<span class="line"><span>→ F10</span></span>
<span class="line"><span>→ generic_timer.rs:58</span></span></code></pre></div><p>仍然正常。</p><p>说明此次 stop-reason 修复没有破坏：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>breakpoint</span></span>
<span class="line"><span>continue</span></span>
<span class="line"><span>step</span></span>
<span class="line"><span>source mapping</span></span></code></pre></div><p>等既有功能。</p><hr><h2 id="ard-调试-session-重建验证" tabindex="-1">ARD 调试 Session 重建验证 <a class="header-anchor" href="#ard-调试-session-重建验证" aria-label="Permalink to &quot;ARD 调试 Session 重建验证&quot;">​</a></h2><p>为了避免一次成功只是偶发现象，最后又测试了完整 session 重新建立：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD 当前 session</span></span>
<span class="line"><span>→ Shift + F5 Stop</span></span>
<span class="line"><span>→ 不重启板子</span></span>
<span class="line"><span>→ 不重启 OpenOCD</span></span>
<span class="line"><span>→ 再次启动 K3 StarryOS Host-DWARF Smoke Test</span></span></code></pre></div><p>重新启动以后仍然能够：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD 重新连接 :3333          ✅</span></span>
<span class="line"><span>出现当前暂停源码             ✅</span></span>
<span class="line"><span>Call Stack 正常              ✅</span></span>
<span class="line"><span>F5 Continue                 ✅</span></span>
<span class="line"><span>Pause                       ✅</span></span>
<span class="line"><span>重新恢复源码                 ✅</span></span></code></pre></div><p>说明：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>GDB-MI session</span></span>
<span class="line"><span>pendingUserPause</span></span>
<span class="line"><span>断点状态</span></span>
<span class="line"><span>ARD stop state</span></span></code></pre></div><p>没有因为上一次调试会话产生异常残留。</p><hr><h2 id="当前异步-snapshot-observer-tree-状态" tabindex="-1">当前异步 Snapshot / Observer Tree 状态 <a class="header-anchor" href="#当前异步-snapshot-observer-tree-状态" aria-label="Permalink to &quot;当前异步 Snapshot / Observer Tree 状态&quot;">​</a></h2><p>在每次暂停时，目前 ARD 还会自动打印类似：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>observer_root = null</span></span>
<span class="line"><span>roots = []</span></span>
<span class="line"><span>relation_annotations = []</span></span></code></pre></div><p>以及：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>snapshot</span></span>
<span class="line"><span>ok = true</span></span>
<span class="line"><span>empty = true</span></span>
<span class="line"><span>privilege = unknown</span></span>
<span class="line"><span>transition = none</span></span>
<span class="line"><span>async_path = []</span></span></code></pre></div><p>目前这些信息暂时不算错误。</p><p>因为当前阶段还没有为 K3 + StarryOS：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>生成 whitelist</span></span>
<span class="line"><span>ardb-load-whitelist</span></span>
<span class="line"><span>选择 async trace root</span></span>
<span class="line"><span>ardb-trace</span></span>
<span class="line"><span>运行对应异步路径</span></span></code></pre></div><p>所以现在：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Observer Tree 为空</span></span>
<span class="line"><span>Snapshot 为空</span></span>
<span class="line"><span>async_path 为空</span></span></code></pre></div><p>符合当前测试阶段。</p><p>后续会参考原 Embassy 等案例的工作方式，逐步补充：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>生成 K3 / StarryOS whitelist</span></span>
<span class="line"><span>→ ardb-load-whitelist</span></span>
<span class="line"><span>→ ardb-trace</span></span>
<span class="line"><span>→ 设置异步断点</span></span>
<span class="line"><span>→ continue</span></span>
<span class="line"><span>→ History</span></span>
<span class="line"><span>→ Snapshot</span></span></code></pre></div><p>目前不提前扩大这一阶段范围。</p><hr><h2 id="本阶段完成的工作与贡献" tabindex="-1">本阶段完成的工作与贡献 <a class="header-anchor" href="#本阶段完成的工作与贡献" aria-label="Permalink to &quot;本阶段完成的工作与贡献&quot;">​</a></h2><ol><li>重新验证 Golden Flow 时发现 cold boot 条件下存在 OpenSBI RPMI 初始化异常，并通过 JTAG 抓取真实 PC：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>PC = 0x100026c10</span></span>
<span class="line"><span>→ csi_dcache_invalid_range()</span></span>
<span class="line"><span>RA = 0x100026e9e</span></span>
<span class="line"><span>→ __smq_rx()</span></span></code></pre></div><p>确认故障发生在：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>OpenSBI early-init</span></span>
<span class="line"><span>→ RPMI shared-memory mailbox</span></span></code></pre></div><p>而不是 SPL、Full U-Boot、StarryOS 或 JTAG。</p><ol start="2"><li>通过官方 Bianbu 启动链验证：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>RCPU attach ✅</span></span>
<span class="line"><span>RPMI pwrkey ✅</span></span>
<span class="line"><span>RPMI RTC ✅</span></span></code></pre></div><p>随后在不断电情况下 warm recovery，再执行完全相同 Golden Flow，成功进入：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Debug Full U-Boot</span></span>
<span class="line"><span>→ UFS</span></span>
<span class="line"><span>→ Host-DWARF StarryOS</span></span></code></pre></div><p>由此确认当前调试流程存在：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>厂商 management/RPMI 初始化</span></span>
<span class="line"><span>→ warm recovery</span></span></code></pre></div><p>这一实际前置条件。</p><ol start="3"><li>明确收缩项目职责边界：</li></ol><p>当前目标仍然是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>StarryOS</span></span>
<span class="line"><span>→ JTAG / OpenOCD / GDB</span></span>
<span class="line"><span>→ ARD</span></span></code></pre></div><p>不继续把工作扩大到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>完整 K3 cold-boot</span></span>
<span class="line"><span>→ ESOS / RCPU</span></span>
<span class="line"><span>→ RPMI management firmware</span></span></code></pre></div><p>的重新实现。</p><ol start="4"><li>在 StarryOS 真板环境第一次正式完成：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ARD</span></span>
<span class="line"><span>→ gdb-multiarch</span></span>
<span class="line"><span>→ OpenOCD</span></span>
<span class="line"><span>→ J-Link / JTAG</span></span>
<span class="line"><span>→ K3</span></span></code></pre></div><p>真板连接。</p><ol start="5"><li>ARD 成功读取真实 K3 当前状态，并直接展示：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Rust source</span></span>
<span class="line"><span>Call Stack</span></span>
<span class="line"><span>Arguments</span></span>
<span class="line"><span>Locals</span></span>
<span class="line"><span>当前源码行</span></span></code></pre></div><ol start="6"><li>使用已经冻结的人工 GDB 验证点：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>platforms/ax-plat/src/time.rs:23</span></span></code></pre></div><p>在 ARD 中完成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>source breakpoint</span></span>
<span class="line"><span>→ Continue</span></span>
<span class="line"><span>→ K3 真板命中</span></span>
<span class="line"><span>→ F10</span></span>
<span class="line"><span>→ generic_timer.rs:58</span></span></code></pre></div><p>说明手工 GDB 的源码调试基线已经被 ARD 完整接管。</p><ol start="7"><li>发现并修复 ARD 用户主动 Pause 时：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>SIGINT</span></span>
<span class="line"><span>→ exception</span></span></code></pre></div><p>的错误 DAP 映射。</p><p>修复以后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>用户 Pause</span></span>
<span class="line"><span>→ SIGINT</span></span>
<span class="line"><span>→ DAP reason = pause</span></span></code></pre></div><p>同时真正由 target 自己产生的 SIGINT 仍保持 exception。</p><ol start="8"><li>修复完成后通过自动测试以及 K3 真板测试确认：</li></ol><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Continue → Pause           ✅</span></span>
<span class="line"><span>Pause stop reason          ✅</span></span>
<span class="line"><span>Source breakpoint          ✅</span></span>
<span class="line"><span>Step Over                  ✅</span></span>
<span class="line"><span>Stop → Restart session     ✅</span></span></code></pre></div><p>均稳定工作。</p><hr><h2 id="当前阶段结果" tabindex="-1">当前阶段结果 <a class="header-anchor" href="#当前阶段结果" aria-label="Permalink to &quot;当前阶段结果&quot;">​</a></h2><p>目前 K3 + StarryOS + ARD 基础真板调试链已经达到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Rust 源码</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>Host-DWARF ELF</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>ARD</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>GDB / MI</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>gdb-multiarch</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>OpenOCD</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>J-Link / JTAG</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>K3 RISC-V Debug Module</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>运行中的 StarryOS</span></span></code></pre></div><p>当前已经验证：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Golden Flow warm-recovery 启动                   ✅</span></span>
<span class="line"><span>Host-DWARF StarryOS                              ✅</span></span>
<span class="line"><span>OpenOCD / JTAG                                   ✅</span></span>
<span class="line"><span>ARD → GDB → OpenOCD → K3                        ✅</span></span>
<span class="line"><span>ARD Rust source 显示                            ✅</span></span>
<span class="line"><span>Call Stack / Arguments / Locals                 ✅</span></span>
<span class="line"><span>源码断点                                         ✅</span></span>
<span class="line"><span>源码断点真板命中                                 ✅</span></span>
<span class="line"><span>Continue                                         ✅</span></span>
<span class="line"><span>Pause                                            ✅</span></span>
<span class="line"><span>Pause stop-reason                               ✅</span></span>
<span class="line"><span>F10 / Step Over                                 ✅</span></span>
<span class="line"><span>跨 Rust 源文件跳转                               ✅</span></span>
<span class="line"><span>ARD session Stop → Restart                      ✅</span></span></code></pre></div><p>本阶段的核心成果可以概括为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>发现 Golden Flow cold-boot 隐藏状态依赖</span></span>
<span class="line"><span>→ 通过官方初始化 + warm recovery 恢复稳定调试启动</span></span>
<span class="line"><span>→ 保持 K3 底层环境不继续扩大设计范围</span></span>
<span class="line"><span>→ ARD 第一次正式连接 K3 真板</span></span>
<span class="line"><span>→ ARD 直接显示 StarryOS Rust 源码</span></span>
<span class="line"><span>→ ARD 源码断点真板命中</span></span>
<span class="line"><span>→ ARD F10 源码级执行成功</span></span>
<span class="line"><span>→ 修复 Pause 被误判为 exception</span></span>
<span class="line"><span>→ 完成基础 ARD 真板调试闭环</span></span></code></pre></div><p>至此，<strong>K3 COM260 + StarryOS 已经不仅是一个可以通过手工 GDB 进行 Rust 源码调试的目标平台，也已经真正接入 ARD，并完成了基础源码级真板调试闭环。</strong></p><p>下一阶段不再回头修改已经验证的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>FSBL</span></span>
<span class="line"><span>OpenSBI</span></span>
<span class="line"><span>U-Boot</span></span>
<span class="line"><span>StarryOS 启动</span></span>
<span class="line"><span>JTAG</span></span>
<span class="line"><span>OpenOCD</span></span>
<span class="line"><span>Host-DWARF</span></span></code></pre></div><p>除非手工 GDB 基线本身重新失效。</p><p>后续工作将开始逐步验证 ARD 更高层能力，包括：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>OSStateMachine / kernel-user 状态</span></span>
<span class="line"><span>→ K3 + StarryOS whitelist 生成</span></span>
<span class="line"><span>→ ardb-load-whitelist</span></span>
<span class="line"><span>→ ardb-trace</span></span>
<span class="line"><span>→ 异步断点</span></span>
<span class="line"><span>→ History</span></span>
<span class="line"><span>→ Snapshot / Observer Tree</span></span>
<span class="line"><span>→ RuntimeEventGraph</span></span></code></pre></div><p>并逐渐把原来 Embassy、ReL4 等环境中已经验证过的 ARD 使用流程，迁移到 K3 + StarryOS 真板环境中。</p>`,303)])])}const u=a(t,[["render",i]]);export{g as __pageData,u as default};
