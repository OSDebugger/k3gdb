import{_ as a,o as n,c as p,a2 as e}from"./chunks/framework.Ca9F9Y59.js";const r=JSON.parse('{"title":"K3 → StarryOS 一键自动启动闭环","description":"","frontmatter":{},"headers":[],"relativePath":"2026-09-22-K3到StarryOS启动脚本.md","filePath":"2026-09-22-K3到StarryOS启动脚本.md"}'),t={name:"2026-09-22-K3到StarryOS启动脚本.md"};function l(i,s,o,c,d,h){return n(),p("div",null,[...s[0]||(s[0]=[e(`<h1 id="k3-→-starryos-一键自动启动闭环" tabindex="-1">K3 → StarryOS 一键自动启动闭环 <a class="header-anchor" href="#k3-→-starryos-一键自动启动闭环" aria-label="Permalink to &quot;K3 → StarryOS 一键自动启动闭环&quot;">​</a></h1><p>这一阶段主要解决：</p><blockquote><p>现在 K3 启动 StarryOS 的步骤太多，能不能把人工流程自动化。</p></blockquote><p>前一阶段已经确认，K3 不需要先启动 Bianbu Linux，也不需要 warm reboot，严格冷启动就可以直接走 Debug Golden Flow 进入 StarryOS。</p><p>也就是说，底层启动链本身已经跑通，接下来要解决的就是：</p><blockquote><p>怎么把这条已经验证过的人工流程，变成真正的一键自动启动流程。</p></blockquote><h2 id="_1-原来的人工启动到底麻烦在哪" tabindex="-1">1. 原来的人工启动到底麻烦在哪 <a class="header-anchor" href="#_1-原来的人工启动到底麻烦在哪" aria-label="Permalink to &quot;1. 原来的人工启动到底麻烦在哪&quot;">​</a></h2><p>之前虽然已经有 <code>boot_golden_flow.sh</code>，但它更像是一个“命令封装脚本”。</p><p>很多关键步骤仍然需要人工完成，比如：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>观察 BootROM 是否进入 Recovery</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>手动确认 version-brom</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>上传 FSBL</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>看串口确认 SPL 是否启动</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>等待 fastboot 重新枚举</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>上传 OpenSBI + U-Boot FIT</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>看 Full U-Boot 是否启动</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>人工输入 scsi scan</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>确认 KINGSTON</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>人工进入 kernel fastboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>上传 StarryOS kernel</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>人工进入 DTB fastboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>上传 DTB</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>人工输入 booti</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>看 Welcome to Starry OS!</span></span></code></pre></div><p>也就是说，虽然 Host 侧的一部分命令已经写进脚本，但真正决定“下一步能不能走”的判断，还是人在做。</p><p>这类脚本最大的问题是：</p><blockquote><p>它自动执行了命令，但没有真正理解板子当前处于什么状态。</p></blockquote><p>所以这一阶段的核心，不是单纯少输几条命令，而是把整个流程改造成一个真正的<strong>状态机</strong>。</p><h2 id="_2-什么叫状态驱动启动" tabindex="-1">2. 什么叫状态驱动启动 <a class="header-anchor" href="#_2-什么叫状态驱动启动" aria-label="Permalink to &quot;2. 什么叫状态驱动启动&quot;">​</a></h2><p>这次自动化最重要的思想是：</p><blockquote><p>只有看到板子真的进入下一个状态，脚本才执行下一步。</p></blockquote><p>比如不能写成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>上传 FSBL</span></span>
<span class="line"><span>sleep 5 秒</span></span>
<span class="line"><span>继续下一步</span></span></code></pre></div><p>因为不同启动阶段耗时可能变化，USB 重新枚举速度也不固定。</p><p>更可靠的方式是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>上传 FSBL</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>等待 UART 出现：</span></span>
<span class="line"><span>U-Boot SPL 2022.10-dirty</span></span>
<span class="line"><span>Debug JTAG enabled on MMC1 pins</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>等待 SPL fastboot gadget 真正重新枚举</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>执行 getvar version</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>确认 version: 0.4</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>才进入下一阶段</span></span></code></pre></div><p>所以现在整个自动化流程被拆成了：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>BOOTROM_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>SPL_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>FULL_UBOOT_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>UFS_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>KERNEL_LOADED</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>DTB_LOADED</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>STARRYOS_READY</span></span></code></pre></div><p>这样每一步都有明确的“成功判据”。</p><h2 id="_3-第一次真板测试-bootrom-serial-出问题" tabindex="-1">3. 第一次真板测试：BootROM serial 出问题 <a class="header-anchor" href="#_3-第一次真板测试-bootrom-serial-出问题" aria-label="Permalink to &quot;3. 第一次真板测试：BootROM serial 出问题&quot;">​</a></h2><p>自动化脚本第一次真板运行时，在最开始就停住了。</p><p>脚本一直显示：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>&lt; waiting for ???????????? &gt;</span></span></code></pre></div><p>手工检查：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot devices</span></span></code></pre></div><p>结果是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>????????????    DFU download</span></span></code></pre></div><p>但是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot getvar version-brom</span></span></code></pre></div><p>又可以正常返回：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>version-brom: 1.0</span></span></code></pre></div><p>这说明 K3 的 BootROM Recovery 阶段没有一个正常可用的 fastboot serial。</p><p>脚本第一版错误地认为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>只要找到 fastboot device</span></span>
<span class="line"><span>→ 就一定有可靠 serial</span></span>
<span class="line"><span>→ fastboot -s SERIAL ...</span></span></code></pre></div><p>于是实际变成了：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot -s ???????????? ...</span></span></code></pre></div><p>当然就找不到设备。</p><p>后来把逻辑改成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>如果只有一个 fastboot device：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>正常 serial</span></span>
<span class="line"><span>→ 使用 -s SERIAL</span></span>
<span class="line"><span></span></span>
<span class="line"><span>serial 是 ????????????</span></span>
<span class="line"><span>→ 不使用 -s</span></span>
<span class="line"><span>→ 直接 fastboot getvar / stage / continue</span></span></code></pre></div><p>而且 BootROM 是否 ready，不再依赖 serial，而是依赖真正的：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>version-brom: 1.0</span></span></code></pre></div><p>第二次真板测试以后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[STATE] BOOTROM_READY</span></span></code></pre></div><p>成功出现。</p><p>说明第一个真实环境问题解决了。</p><h2 id="_4-第二次真板测试-full-u-boot-中间还藏了一层-fastboot" tabindex="-1">4. 第二次真板测试：Full U-Boot 中间还藏了一层 fastboot <a class="header-anchor" href="#_4-第二次真板测试-full-u-boot-中间还藏了一层-fastboot" aria-label="Permalink to &quot;4. 第二次真板测试：Full U-Boot 中间还藏了一层 fastboot&quot;">​</a></h2><p>继续往后跑以后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>BOOTROM_READY</span></span>
<span class="line"><span>✅</span></span>
<span class="line"><span></span></span>
<span class="line"><span>SPL_READY</span></span>
<span class="line"><span>✅</span></span></code></pre></div><p>combined FIT 也正常上传：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>OpenSBI + Full U-Boot</span></span></code></pre></div><p>然后串口已经明确出现：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>U-Boot 2022.10-dirty</span></span>
<span class="line"><span>CPU: rv64imafdcvh</span></span>
<span class="line"><span>Model: spacemit k3 com260 ifx board</span></span></code></pre></div><p>说明 Full U-Boot 已经启动了。</p><p>但是脚本一直等：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>=&gt;</span></span></code></pre></div><p>等不到。</p><p>后来重新对照人工流程才发现，中间实际上还漏了一层：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>SPL fastboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>上传 combined FIT</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>OpenSBI</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Full U-Boot 启动</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Full U-Boot 自己再次进入 fastboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Host 需要再执行一次 fastboot continue</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>才会真正进入 U-Boot shell</span></span></code></pre></div><p>第一版状态机误写成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Full U-Boot banner</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>直接等待 =&gt;</span></span></code></pre></div><p>所以第二次真板测试实际帮我们发现了一个以前人工操作时没有特别意识到的隐藏启动阶段。</p><p>后来改成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>SPL_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>stage combined FIT</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>SPL fastboot continue</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>等待 Full U-Boot banner</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>等待 Full U-Boot fastboot gadget</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>实际 getvar 探测 ready</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Full U-Boot fastboot continue</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>等待新的 =&gt;</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>FULL_UBOOT_READY</span></span></code></pre></div><p>而且两个 <code>continue</code> 都只允许执行一次，不能为了重试而盲目重复。</p><h2 id="_5-又发现一个很有意思的人工隐含动作-5-秒-autoboot" tabindex="-1">5. 又发现一个很有意思的人工隐含动作：5 秒 autoboot <a class="header-anchor" href="#_5-又发现一个很有意思的人工隐含动作-5-秒-autoboot" aria-label="Permalink to &quot;5. 又发现一个很有意思的人工隐含动作：5 秒 autoboot&quot;">​</a></h2><p>第三次运行时又发现了一个以前人工操作时很容易忽略的细节。</p><p>Full U-Boot 启动以后，会出现类似：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Hit any key to stop autoboot: 5</span></span></code></pre></div><p>如果这时候什么都不做，U-Boot 就会继续执行默认启动路径，很可能又走到官方系统。</p><p>人工调试的时候，我们一般会随手按一个键，所以以前并没有特别意识到：</p><blockquote><p>“按键打断 autoboot”本身其实也是 Golden Flow 的一部分。</p></blockquote><p>自动化以后，这个动作必须明确写出来。</p><p>所以脚本现在会在检测到 autoboot 倒计时以后，自动发送一个字符：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>s</span></span></code></pre></div><p>这里的 <code>s</code> 没有特殊命令含义，只是相当于：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>按下任意键</span></span></code></pre></div><p>作用是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>打断默认 autoboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>进入 U-Boot shell</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>出现 =&gt;</span></span></code></pre></div><p>这也是这次自动化过程中很有代表性的一个发现：</p><blockquote><p>人工流程里很多“下意识完成”的动作，到了自动化阶段都必须显式建模。</p></blockquote><h2 id="_6-ufs-也改成自动判断" tabindex="-1">6. UFS 也改成自动判断 <a class="header-anchor" href="#_6-ufs-也改成自动判断" aria-label="Permalink to &quot;6. UFS 也改成自动判断&quot;">​</a></h2><p>进入 U-Boot shell 以后，脚本会自动发送：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>scsi scan</span></span></code></pre></div><p>然后不是等几秒就继续，而是必须看到：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>KINGSTON</span></span></code></pre></div><p>才能认为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[STATE] UFS_READY</span></span></code></pre></div><p>这一步的作用就是确认：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>UFS 控制器初始化成功</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>真实存储设备已经枚举出来</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>后面的 StarryOS rootfs 路径才有意义</span></span></code></pre></div><p>所以现在不是“命令执行过了就算成功”，而是：</p><blockquote><p>必须看到真实设备结果才进入下一状态。</p></blockquote><h2 id="_7-kernel-和-dtb-也全部自动加载" tabindex="-1">7. kernel 和 DTB 也全部自动加载 <a class="header-anchor" href="#_7-kernel-和-dtb-也全部自动加载" aria-label="Permalink to &quot;7. kernel 和 DTB 也全部自动加载&quot;">​</a></h2><p>UFS ready 之后，脚本会自动进入 kernel fastboot：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot -l 0x140000000 -s 0x02000000 usb 0</span></span></code></pre></div><p>然后 Host 自动上传：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>starryos_host_dwarf_release.bin</span></span></code></pre></div><p>对应地址：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>0x140000000</span></span></code></pre></div><p>上传完成以后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[KERNEL_LOADED]</span></span></code></pre></div><p>然后继续进入 DTB fastboot：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fastboot -l 0x138000000 -s 0x00800000 usb 0</span></span></code></pre></div><p>自动上传：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>spacemit-k3-com260-ifx.dtb</span></span></code></pre></div><p>对应地址：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>0x138000000</span></span></code></pre></div><p>完成后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[STATE] DTB_LOADED</span></span></code></pre></div><p>整个过程已经不需要人工切换终端、复制路径或者手动执行 <code>fastboot stage</code>。</p><h2 id="_8-最终自动执行-booti" tabindex="-1">8. 最终自动执行 booti <a class="header-anchor" href="#_8-最终自动执行-booti" aria-label="Permalink to &quot;8. 最终自动执行 booti&quot;">​</a></h2><p>kernel 和 DTB 都加载完成以后，脚本自动发送：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>booti 0x140000000 - 0x138000000</span></span></code></pre></div><p>然后等待：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Welcome to Starry OS!</span></span></code></pre></div><p>最终经过多轮真板验证，StarryOS 可以稳定启动，并由状态机正确识别 <code>Welcome to Starry OS!</code>。</p><p>也就是说，现在实际流程已经变成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>人工：</span></span>
<span class="line"><span>完全断电</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>FORCE_RECOVERY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>上电</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>接 USB / UART</span></span>
<span class="line"><span></span></span>
<span class="line"><span>然后只执行：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>./boot_golden_flow.sh</span></span>
<span class="line"><span></span></span>
<span class="line"><span>脚本自动完成：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>BootROM Recovery</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Debug FSBL</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>SPL</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>OpenSBI</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Full U-Boot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>打断 autoboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>U-Boot shell</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>scsi scan</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>KINGSTON</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>加载 StarryOS kernel</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>加载 DTB</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>booti</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>Welcome to Starry OS!</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>STARRYOS_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>释放 Python 对 /dev/ttyUSB0 的占用</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>sudo minicom -o -D /dev/ttyUSB0 -b 115200</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>minicom 接管长期串口观察</span></span></code></pre></div><p>启动状态机只负责“把系统送到 STARRYOS_READY”，长期串口交互交给成熟的 minicom 工具，而不是在 Python 中重复实现一个串口终端。</p><p>这次已经真正实现：</p><blockquote><p><strong>K3 → StarryOS 软件启动流程一键闭环。</strong></p></blockquote><h2 id="_9-最后一个自动化问题-终端看到-welcome-状态机却识别不到" tabindex="-1">9. 最后一个自动化问题：终端看到 Welcome，状态机却识别不到 <a class="header-anchor" href="#_9-最后一个自动化问题-终端看到-welcome-状态机却识别不到" aria-label="Permalink to &quot;9. 最后一个自动化问题：终端看到 Welcome，状态机却识别不到&quot;">​</a></h2><p>真板运行时曾出现一个比较隐蔽的问题。</p><p>终端已经显示：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Welcome to Starry OS!</span></span></code></pre></div><p>但是状态机仍然等待，最终 180 秒超时。</p><p>加入 raw UART 诊断以后发现，实际串口字节并不是简单的纯文本，而是包含 ANSI 颜色控制码：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Welcome to \\x1b[96m\\x1b[1mStarry OS\\x1b[0m!</span></span></code></pre></div><p>也就是说：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>人眼看到的文本</span></span>
<span class="line"><span>≠</span></span>
<span class="line"><span>程序实际接收到的字节流</span></span></code></pre></div><p>串口输出可能包含 ANSI 颜色控制码，肉眼显示正常，但直接字符串匹配会失败。最终将 UART 原始数据用于日志保存和终端显示，同时建立 ANSI 清洗后的分析流，所有状态判据统一基于清洗后的文本。</p><p>最终处理方式是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>原始 UART</span></span>
<span class="line"><span>→ 原样保存 raw log</span></span>
<span class="line"><span>→ 原样输出到终端</span></span></code></pre></div><p>同时：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>原始 UART</span></span>
<span class="line"><span>→ 去除 ANSI 控制序列</span></span>
<span class="line"><span>→ 状态机文本分析</span></span>
<span class="line"><span>→ Welcome / KINGSTON / U-Boot banner / =&gt; 等统一匹配</span></span></code></pre></div><p>这样既保留了完整现场日志，又避免颜色控制字符干扰自动状态判断。</p><p>检测到 Welcome 后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>STARRYOS_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>释放 UART fd / flock / TIOCEXCL</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>exec sudo minicom -o -D /dev/ttyUSB0 -b 115200</span></span></code></pre></div><p>这里释放的是 Python 持有的串口文件描述符、文件锁和串口独占状态，让 minicom 能够接手同一个串口。后续长期串口交互由 minicom 接管。</p><h2 id="_10-这次自动化真正解决了什么" tabindex="-1">10. 这次自动化真正解决了什么 <a class="header-anchor" href="#_10-这次自动化真正解决了什么" aria-label="Permalink to &quot;10. 这次自动化真正解决了什么&quot;">​</a></h2><p>这一阶段不只是写了一个脚本。</p><p>真正解决的是以前人工流程里面几个容易出问题的地方：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>BootROM fastboot serial 不可靠</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>兼容无 serial 场景</span></span>
<span class="line"><span></span></span>
<span class="line"><span>USB gadget 会多次重新枚举</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>不再依赖固定 sleep</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Full U-Boot 中间还有一次 fastboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>补齐真实 boot stage</span></span>
<span class="line"><span></span></span>
<span class="line"><span>U-Boot 有 5 秒 autoboot</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>自动打断并接管 shell</span></span>
<span class="line"><span></span></span>
<span class="line"><span>旧 UART prompt 可能误判</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>使用新的串口观察边界</span></span>
<span class="line"><span></span></span>
<span class="line"><span>continue 具有状态改变副作用</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>不允许盲目 retry</span></span>
<span class="line"><span></span></span>
<span class="line"><span>UFS 是否成功</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>必须看到 KINGSTON</span></span>
<span class="line"><span></span></span>
<span class="line"><span>StarryOS 是否启动</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>在 ANSI 清洗后的文本中匹配 Welcome to Starry OS!</span></span>
<span class="line"><span></span></span>
<span class="line"><span>启动完成后的长期串口交互</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>释放串口占用，自动交给 minicom</span></span></code></pre></div><p>所以现在这套启动器已经不再只是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>自动执行一串命令</span></span></code></pre></div><p>而是：</p><blockquote><p><strong>根据板子真实运行状态推进的启动状态机。</strong></p></blockquote><h2 id="_11-当前阶段结论" tabindex="-1">11. 当前阶段结论 <a class="header-anchor" href="#_11-当前阶段结论" aria-label="Permalink to &quot;11. 当前阶段结论&quot;">​</a></h2><p>老师之前提出两个问题：</p><p>第一：</p><blockquote><p>K3 能不能不经过 Bianbu，真正 cold boot 直接进入 StarryOS。</p></blockquote><p>已经验证：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>严格 cold</span></span>
<span class="line"><span>→ BootROM</span></span>
<span class="line"><span>→ Debug FSBL</span></span>
<span class="line"><span>→ OpenSBI</span></span>
<span class="line"><span>→ Full U-Boot</span></span>
<span class="line"><span>→ UFS</span></span>
<span class="line"><span>→ StarryOS</span></span></code></pre></div><p>成功。</p><p>第二：</p><blockquote><p>现在的人工启动流程能不能自动化。</p></blockquote><p>目前也已经验证：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>./boot_golden_flow.sh</span></span></code></pre></div><p>可以自动完成整个软件启动链，正确识别 StarryOS 启动完成，并自动交接给 minicom：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>./boot_golden_flow.sh</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>StarryOS</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>STARRYOS_READY</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>释放 Python 串口占用</span></span>
<span class="line"><span>↓</span></span>
<span class="line"><span>minicom 接管长期串口交互</span></span></code></pre></div><p>所以到目前为止：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>K3 cold direct StarryOS</span></span>
<span class="line"><span>✅</span></span>
<span class="line"><span></span></span>
<span class="line"><span>K3 → StarryOS 一键自动启动</span></span>
<span class="line"><span>✅</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ANSI 清洗后的启动状态识别</span></span>
<span class="line"><span>✅</span></span>
<span class="line"><span></span></span>
<span class="line"><span>启动完成后自动交接 minicom</span></span>
<span class="line"><span>✅</span></span></code></pre></div><p>这一阶段最大的收获其实是：把原来人工调试过程中隐含的判断、等待、交互和异常条件，真正整理成了一套可以自动执行的状态机。</p>`,168)])])}const u=a(t,[["render",l]]);export{r as __pageData,u as default};
