import{_ as s,o as n,c as p,a2 as e}from"./chunks/framework.Ca9F9Y59.js";const u=JSON.parse('{"title":"ARD 阶段工作与论文计划汇报","description":"","frontmatter":{},"headers":[],"relativePath":"2026-09-29-ARD阶段工作与论文计划汇报.md","filePath":"2026-09-29-ARD阶段工作与论文计划汇报.md"}'),t={name:"2026-09-29-ARD阶段工作与论文计划汇报.md"};function l(i,a,o,c,d,r){return n(),p("div",null,[...a[0]||(a[0]=[e(`<h1 id="ard-阶段工作与论文计划汇报" tabindex="-1">ARD 阶段工作与论文计划汇报 <a class="header-anchor" href="#ard-阶段工作与论文计划汇报" aria-label="Permalink to &quot;ARD 阶段工作与论文计划汇报&quot;">​</a></h1><h2 id="_1-当前个人研究路线" tabindex="-1">1. 当前个人研究路线 <a class="header-anchor" href="#_1-当前个人研究路线" aria-label="Permalink to &quot;1. 当前个人研究路线&quot;">​</a></h2><p>主要成果分别是：</p><ol><li>面向不同 OS、运行时和真实硬件环境的 ARD 适配与验证；</li><li>从运行信息采集到 History、Observer、Snapshot，再到前端展示的异步状态组织架构。</li><li>以异步函数为主体、同步函数作为运行上下文辅助信息的分层观测机制。</li></ol><p>共同回答的是以下几个问题： 大问题：普通调试器难以正确恢复异步函数的连续调用状态。</p><p>小问题： 1.异步函数没有足够的身份标识来互相串联（给每一次异步执行建立可靠身份） 2.如何从离散事件恢复连续执行历史（history树） 3.目前调用栈的正确执行函数和状态是什么（snapshot） 4.大量函数中，用户怎么选择自己想查看的异步函数调用子树（observer） 5.怎么利用同步函数串联异步函数的上下文来丰富函数执行链 6.怎么在多个架构平台和OS中适配 7.怎么通过多个证据源共同验证调用链的正确性，以及证据不足时展示unknown</p><table tabindex="0"><thead><tr><th>证据</th><th>作用</th></tr></thead><tbody><tr><td>静态 Future 分析</td><td>提供候选关系</td></tr><tr><td>poll事件</td><td>证明真实执行</td></tr><tr><td>wake关系</td><td>证明调度关联</td></tr><tr><td>activation信息</td><td>区分实例</td></tr><tr><td>thread/task context</td><td>避免错误连接</td></tr></tbody></table><h2 id="_2-主要工作一-ard-面向不同-os-和运行环境的适配" tabindex="-1">2. 主要工作一：ARD 面向不同 OS 和运行环境的适配 <a class="header-anchor" href="#_2-主要工作一-ard-面向不同-os-和运行环境的适配" aria-label="Permalink to &quot;2. 主要工作一：ARD 面向不同 OS 和运行环境的适配&quot;">​</a></h2><p>持续进行的第一类工作，是把原有异步调试能力从相对单一的测试环境逐步扩展到不同运行环境。</p><p>目前主要涉及：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Minimal</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>Embassy</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>Rel4</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>StarryOS</span></span>
<span class="line"><span>   ↓</span></span>
<span class="line"><span>K3 COM260 + StarryOS 真板</span></span></code></pre></div><p>还有Lilos 已完成 ARM/Cortex-M 环境下的重要适配和异步执行链动态验证；当前可作为跨架构、跨运行时适配的重要历史验证结果，后续计划在最新架构下补充复测。</p><p>不同环境之间不是简单替换一个 ELF 文件，它会涉及：</p><ul><li>native / remote 调试方式差异；</li><li>x86-64 / RISC-V 参数寄存器和 GDB 行为差异；</li><li>QEMU / gdbserver / OpenOCD 等不同 remote target；</li><li>不同 OS 的源码目录、ELF、DWARF 和 launch 配置；</li><li>poll 函数发现和 whitelist生成；</li><li>不同异步运行环境下的 Future 表达；</li><li>真板上的源码路径、断点、单步和符号匹配。</li></ul><p>因此这部分工作的重点是在逐步检查 ARD 的异步关系恢复机制是否依赖某一种运行时或某一种实验环境。</p><p>前序 2025 年方案的重点仍然是通过 DWARF 静态分析获得 Future 依赖关系，再结合 whitelist 和动态 poll 插桩恢复异步调用关系。</p><p>后续的适配工作则更多回答：</p><blockquote><p>当运行环境、架构、调试链和 Future 实现发生变化时，现有异步调试机制是否仍然成立？</p></blockquote><p>因此，这一部分应该更适合作为论文的通用性与外部有效性验证基础。</p><h2 id="_3-主要工作二-多重关系验证与history、observer、snapshot-三层异步状态架构" tabindex="-1">3. 主要工作二：多重关系验证与History、Observer、Snapshot 三层异步状态架构 <a class="header-anchor" href="#_3-主要工作二-多重关系验证与history、observer、snapshot-三层异步状态架构" aria-label="Permalink to &quot;3. 主要工作二：多重关系验证与History、Observer、Snapshot 三层异步状态架构&quot;">​</a></h2><h3 id="_3-1-以前的处理方式" tabindex="-1">3.1 以前的处理方式 <a class="header-anchor" href="#_3-1-以前的处理方式" aria-label="Permalink to &quot;3.1 以前的处理方式&quot;">​</a></h3><p>前面的异步调试工作已经能够：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>采集异步信息</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>恢复调用关系</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>生成异步调用树</span></span>
<span class="line"><span>    ↓</span></span>
<span class="line"><span>展示结果</span></span></code></pre></div><p>但继续采用“采集到什么信息，就直接用于生成和展示当前结果”的方式，会逐渐出现：</p><blockquote><p>历史发生过的关系、用户当前想观察的关系、程序此刻仍然有效的关系，实际上并不是同一个概念。</p></blockquote><p>例如：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>A</span></span>
<span class="line"><span>└── B</span></span></code></pre></div><p>这条关系可能在程序运行过程中真实发生过。</p><p>但是程序继续运行以后：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>B 已经结束</span></span>
<span class="line"><span>A 当前正在等待 C</span></span></code></pre></div><p>此时：</p><ul><li>从历史角度看，A → B 应该继续存在；</li><li>从当前状态角度看，A → B 已经不应该继续显示为 active；</li><li>如果用户只希望观察 A 子树，则又不需要展示整个程序历史。</li></ul><p>因此，单一调用树逐渐无法同时表达这些语义。</p><h3 id="_3-2-当前拆分为三种不同语义" tabindex="-1">3.2 当前拆分为三种不同语义 <a class="header-anchor" href="#_3-2-当前拆分为三种不同语义" aria-label="Permalink to &quot;3.2 当前拆分为三种不同语义&quot;">​</a></h3><p>我将异步执行信息拆分成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>History</span></span>
<span class="line"><span>Observer</span></span>
<span class="line"><span>Snapshot</span></span></code></pre></div><p>三者分别解决三个不同问题。</p><h3 id="三者的关系" tabindex="-1">三者的关系 <a class="header-anchor" href="#三者的关系" aria-label="Permalink to &quot;三者的关系&quot;">​</a></h3><p>目前我对这三者的理解可以概括为：</p><table tabindex="0"><thead><tr><th>结构</th><th>回答的问题</th><th>数据性质</th></tr></thead><tbody><tr><td>History</td><td>过去发生过什么？</td><td>累计历史事实</td></tr><tr><td>Observer</td><td>历史中我现在想看什么？</td><td>History 的观察投影</td></tr><tr><td>Snapshot</td><td>当前此刻还成立什么？</td><td>当前状态重验证</td></tr></tbody></table><p>完整架构可以表示为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>                   程序真实运行</span></span>
<span class="line"><span>                        ↓</span></span>
<span class="line"><span>                 Runtime Breakpoint</span></span>
<span class="line"><span>                        ↓</span></span>
<span class="line"><span>                   RuntimeEvent</span></span>
<span class="line"><span>                        ↓</span></span>
<span class="line"><span>               History Store / Database</span></span>
<span class="line"><span>                        ↓</span></span>
<span class="line"><span>                   History Tree</span></span>
<span class="line"><span>                        │</span></span>
<span class="line"><span>                        ├── 完整历史查询</span></span>
<span class="line"><span>                        │</span></span>
<span class="line"><span>                        └── + ACTIVE_TRACE_ROOT</span></span>
<span class="line"><span>                                 ↓</span></span>
<span class="line"><span>                           Observer Tree</span></span>
<span class="line"><span>                                 ↓</span></span>
<span class="line"><span>                          Async Inspector</span></span></code></pre></div><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>GDB 当前暂停</span></span>
<span class="line"><span>      ↓</span></span>
<span class="line"><span>读取当前 Future / Runtime State</span></span>
<span class="line"><span>      ↓</span></span>
<span class="line"><span>Current Revalidation</span></span>
<span class="line"><span>      ↓</span></span>
<span class="line"><span>Snapshot Tree</span></span>
<span class="line"><span>      ↓</span></span>
<span class="line"><span>Async Inspector</span></span></code></pre></div><p>前端最终只负责消费结构化的数据。</p><p>也就是说，架构从原来更接近：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>采集信息</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>恢复关系</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>直接展示</span></span></code></pre></div><p>逐渐变成：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>运行事实采集</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>长期事实维护</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>不同语义投影</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>统一数据接口</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>前端展示</span></span></code></pre></div><p>调试器开始明确区分：</p><blockquote><p><strong>事实是什么、用户观察什么、当前还成立什么。</strong></p></blockquote><h2 id="_4-补充工作-以异步函数为主体-同步函数辅助恢复执行上下文" tabindex="-1">4. 补充工作：以异步函数为主体，同步函数辅助恢复执行上下文 <a class="header-anchor" href="#_4-补充工作-以异步函数为主体-同步函数辅助恢复执行上下文" aria-label="Permalink to &quot;4. 补充工作：以异步函数为主体，同步函数辅助恢复执行上下文&quot;">​</a></h2><p>随着 whitelist 和 Runtime Trace 范围扩大，还出现了另外一个问题：</p><blockquote><p>程序中并不只有 async 函数。</p></blockquote><p>如果把同步函数和异步函数全部作为同一种节点处理，大量同步函数会进入异步关系恢复过程：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>同步函数</span></span>
<span class="line"><span>异步函数</span></span>
<span class="line"><span>库函数</span></span>
<span class="line"><span>辅助函数</span></span></code></pre></div><p>这样既增加观测开销，也容易让真正的 Future 生命周期关系被大量普通调用信息淹没。</p><p>因此目前的处理方式是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Runtime Trace</span></span>
<span class="line"><span>      ↓</span></span>
<span class="line"><span>函数类型判断</span></span>
<span class="line"><span>      ↓</span></span>
<span class="line"><span> ┌───────────────┐</span></span>
<span class="line"><span> ↓               ↓</span></span>
<span class="line"><span>Async          Sync</span></span>
<span class="line"><span> ↓               ↓</span></span>
<span class="line"><span>Future/CID      Execution Context</span></span>
<span class="line"><span>生命周期         调用位置/环境信息</span></span>
<span class="line"><span> ↓               ↓</span></span>
<span class="line"><span>History /      辅助上下文</span></span>
<span class="line"><span>Snapshot</span></span></code></pre></div><p>核心原则是：</p><blockquote><p><strong>异步关系仍然是主体，同步函数不强行进入 Future 生命周期树，而是作为恢复执行上下文的辅助信息。</strong></p></blockquote><p>这部分是在 Runtime Trace 阶段把两种信息分层处理。当前代码和项目总结中也已经明确区分：异步事件进入 Future 生命周期追踪，普通同步事件主要作为执行上下文保留。</p><h2 id="_5-本周实验" tabindex="-1">5. 本周实验 <a class="header-anchor" href="#_5-本周实验" aria-label="Permalink to &quot;5. 本周实验&quot;">​</a></h2><p>这周重点开始系统检查：</p><blockquote><p>ARD 恢复出来的异步关系到底什么时候可信，什么时候其实只是证据不足。</p></blockquote><p>目前比较重要的是以下几组实验。</p><h3 id="_5-1-优化构建下的证据链审计" tabindex="-1">5.1 优化构建下的证据链审计 <a class="header-anchor" href="#_5-1-优化构建下的证据链审计" aria-label="Permalink to &quot;5.1 优化构建下的证据链审计&quot;">​</a></h3><p>共检查：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>32 个固定 binary</span></span></code></pre></div><p>其中重点分析：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>20 个 A4 失败样本</span></span></code></pre></div><p>结果：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>12 个：</span></span>
<span class="line"><span>R1_NO_ACTIVE_TLS_PARENT</span></span>
<span class="line"><span></span></span>
<span class="line"><span>8 个：</span></span>
<span class="line"><span>R7_NO_CHILD_POLL_EVIDENCE</span></span></code></pre></div><p>一个比较重要的发现是：</p><blockquote><p>这些目标关系都没有真正进入 RuntimeRelationValidator。</p></blockquote><p>也就是说，当前失败并不是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>正确关系</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>Validator 判断错误</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>被删除</span></span></code></pre></div><p>而更接近：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>编译优化</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>parent / child runtime evidence 缺失</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>关系无法形成</span></span>
<span class="line"><span> ↓</span></span>
<span class="line"><span>没有足够证据进入 Validator</span></span></code></pre></div><p>因此现在更倾向于把这类结果判断为：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>NO_EVIDENCE_INSUFFICIENT</span></span></code></pre></div><p>而不是强行恢复一条可能错误的 await 关系。</p><p><strong>当前结论</strong></p><p>这组实验把问题从：</p><blockquote><p>“优化以后算法为什么错了？”</p></blockquote><p>进一步缩小为：</p><blockquote><p>“优化以后，关系验证需要的运行时证据在哪一个环节消失了？”</p></blockquote><h3 id="_5-2-inline-frame-是否可以弥补优化造成的信息缺失" tabindex="-1">5.2 inline frame 是否可以弥补优化造成的信息缺失 <a class="header-anchor" href="#_5-2-inline-frame-是否可以弥补优化造成的信息缺失" aria-label="Permalink to &quot;5.2 inline frame 是否可以弥补优化造成的信息缺失&quot;">​</a></h3><p>针对 optimized binary，又进一步进行了 inline frame 实验。</p><p>实验规模：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>18 个 optimized cell</span></span>
<span class="line"><span>×</span></span>
<span class="line"><span>每个重复 10 次</span></span>
<span class="line"><span></span></span>
<span class="line"><span>=</span></span>
<span class="line"><span>180 次 GDB</span></span></code></pre></div><p>总共记录约：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>540 个停止点</span></span></code></pre></div><p>实验结果：</p><table tabindex="0"><thead><tr><th>项目</th><th>结果</th></tr></thead><tbody><tr><td>inline frame 可稳定观察</td><td>18 / 18</td></tr><tr><td>runtime identity 可恢复</td><td>0 / 18</td></tr><tr><td>poll occurrence 可恢复</td><td>0 / 18</td></tr><tr><td>parent-child binding 可恢复</td><td>0 / 18</td></tr><tr><td>validator-ready</td><td>0 / 18</td></tr></tbody></table><p><strong>当前结论</strong></p><p>这说明：</p><blockquote><p>逻辑函数帧仍然可见，并不等于 Future 实例级关系也能够恢复。</p></blockquote><p>inline frame 可以帮助理解“代码逻辑上在哪里”，但单独依赖 inline frame 还不足以恢复：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>这是哪个 Future 实例</span></span>
<span class="line"><span>        +</span></span>
<span class="line"><span>这是它第几次 poll</span></span>
<span class="line"><span>        +</span></span>
<span class="line"><span>当前 parent 是哪个实例</span></span></code></pre></div><p>因此当前结论是：</p><blockquote><p>PARTIALLY_FEASIBLE，而不是完全可替代原有 runtime evidence。</p></blockquote><h3 id="_5-3-扩大-observer-whitelist-范围是否一定有收益" tabindex="-1">5.3 扩大 Observer / whitelist 范围是否一定有收益 <a class="header-anchor" href="#_5-3-扩大-observer-whitelist-范围是否一定有收益" aria-label="Permalink to &quot;5.3 扩大 Observer / whitelist 范围是否一定有收益&quot;">​</a></h3><p>另一组实验检查：</p><blockquote><p>如果观察更多函数，是不是一定能够恢复更多异步关系？</p></blockquote><p>结果并不是完全一致。</p><p><strong>Minimal</strong></p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Retention:</span></span>
<span class="line"><span>83.3% → 83.3%</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Peak probes:</span></span>
<span class="line"><span>120 → 144</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Median:</span></span>
<span class="line"><span>0.418s → 0.662s</span></span></code></pre></div><p>结果是：</p><blockquote><p>增加了观测成本，但没有增加有效关系。</p></blockquote><p><strong>Embassy</strong></p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Retention:</span></span>
<span class="line"><span>13.3% → 26.7%</span></span></code></pre></div><p>这里则确实观察到了更多有效节点。</p><p>整组正确性和清理检查：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>80 / 80 通过</span></span></code></pre></div><p><strong>当前结论</strong></p><p>因此不能简单写成：</p><blockquote><p>“观察范围越大越好。”</p></blockquote><p>更准确的结论是：</p><blockquote><p>扩大观测范围的收益具有 workload dependency。</p></blockquote><p>论文中真正值得研究的是：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>新增多少观测成本</span></span>
<span class="line"><span>        ↓</span></span>
<span class="line"><span>换来了多少新的有效运行证据</span></span></code></pre></div><p>而不是简单追求更多 breakpoint 或更多函数。</p><h2 id="_6-当前已经确认的边界和失败场景" tabindex="-1">6. 当前已经确认的边界和失败场景 <a class="header-anchor" href="#_6-当前已经确认的边界和失败场景" aria-label="Permalink to &quot;6. 当前已经确认的边界和失败场景&quot;">​</a></h2><p>至少已经发现：</p><ol><li>编译优化可能使 parent identity、child poll evidence、occurrence 等运行时证据缺失；</li><li>inline frame 可以保留逻辑位置，但不能直接恢复 Future 实例身份；</li><li>扩大 Observer 范围有时增加有效信息，有时只是增加调试开销；</li><li>manual Future 可以恢复 concrete type，但不能假定所有 Future 都具有统一内部 <code>__state</code>；</li><li>多 OS 适配能够证明一定通用性，但仍不能直接推出“对所有 Rust async runtime 通用”。</li></ol><p>因此当前的原则是：</p><blockquote><p><strong>证据充分时恢复关系；证据不足时显式保留 unknown / unsupported，而不是为了生成完整的树强行补关系。</strong></p></blockquote><h2 id="_7-论文收束" tabindex="-1">7. 论文收束 <a class="header-anchor" href="#_7-论文收束" aria-label="Permalink to &quot;7. 论文收束&quot;">​</a></h2><p>Contribution 1（模型） 基于可核验证据的 Rust 异步执行表示模型，解决：async 调试中 Future 实例无法持续追踪的问题。 包含：</p><ul><li>CID</li><li>poll occurrence</li><li>activation</li><li>History</li><li>Snapshot 用持久的 Future 身份、每次 poll 的执行记录和生效范围表示 Rust 异步调试会话，并区分当前 Snapshot 状态与累积的 History/Observer 状态。</li></ul><p>Contribution 2（核心方法） 基于多源运行时证据约束的异步关系恢复机制，解决：如何判断 parent-child await 关系真实存在。 证据：</p><ul><li>静态 Future 分析</li><li>poll event</li><li>wake</li><li>thread/task</li><li>activation 充分则重建，不足展示unknown</li></ul><p>Contribution 3（验证和扩展） 面向不同运行环境的异步调试验证与可观测性边界，主要验证：验证方法是否依赖特定环境。 包括：</p><ul><li>普通用户程序，比如Minimal</li><li>Embassy</li><li>Rel4</li><li>lilos</li><li>StarryOS</li><li>K3</li><li>QEMU</li></ul>`,134)])])}const b=s(t,[["render",l]]);export{u as __pageData,b as default};
