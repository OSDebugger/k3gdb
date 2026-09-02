# K3 + ARD 调试进展


一开始目标就是先让 StarryOS 在 K3 COM260 上稳定运行，再把 ARD 调试器真正接到这块板子上。

所以主线得到确定：

```text
StarryOS 真板启动
→ 建立 JTAG 调试链
→ OpenOCD
→ GDB
→ 最后接入 ARD 调试器
```

中间则是需要补齐“稳定、可重复、可调试几个条件。

---

## 让 StarryOS 跑起来

最开始先解决的是：**StarryOS 在 K3 这块板子上跑起来**

 K3 的启动过程：

```text
芯片上电
→ 第一阶段启动程序
→ OpenSBI
→ U-Boot
→ StarryOS
→ UFS 根文件系统
```

期间发现，StarryOS 想正常访问 UFS，需要前面的 U-Boot 先帮忙把 UFS 初始化。

于是最后形成了一套已经验证成功的启动流程：

```text
进入恢复模式
→ 临时加载自己的启动程序
→ 进入 U-Boot
→ 初始化 UFS
→ 加载 StarryOS
→ 启动
→ 进入 StarryOS shell
```

到这里算是第一次真正完成了：

```text
K3 + StarryOS 真板运行 ✅
```

后来为了方便输入指令，还把这套流程做成了自动启动脚本。

---

## 解决 JTAG

StarryOS 能跑以后就可以正式转为： **让电脑直接控制 K3 CPU**

链路：

```text
电脑
→ J-Link
→ JTAG
→ K3 CPU
```

但是一开始一直遇到：

```text
JTAG all zeroes
```

简单说就是：电脑正常，J-Link 也正常，但 K3 根本没有把真正的 JTAG 信号接出来。

后来查了官方资料确认 **K3 的 JTAG 和 TF/MMC1 引脚是复用的。**


于是我修改了启动程序，让它在启动时完成：

```text
把 MMC1 引脚切换成 JTAG
```

串口随后出现了：

```text
Debug JTAG enabled on MMC1 pins
```

从这以后，J-Link 终于真正识别到了 K3。我们第一次打通了：

```text
OpenOCD
→ J-Link
→ K3
```

---

## 控制 CPU

JTAG 接通以后，需要验证最基础的 CPU 调试能力，于是依次完成了：

```text
识别 CPU ✅
暂停 CPU ✅
读取寄存器 ✅
查看当前运行位置 ✅
继续运行 ✅
```

这一步它证明了一件事：**已经能从外部停住 K3 CPU。**

到这里，硬件调试链就算正式成立。

---

##  接入GDB

接下来需要在 OpenOCD 上面接入 GDB。

链路变成：

```text
GDB
↓
OpenOCD
↓
J-Link
↓
K3
↓
正在运行的 StarryOS
```

这一阶段我们验证了：

```text
GDB 连接 K3 ✅
读取寄存器 ✅
查看程序地址 ✅
暂停和继续运行 ✅
```

随后又往前走了一步：

> **让 GDB 根据当前地址，找到 StarryOS 里的对应函数。**

我们把板子上正在运行的 StarryOS，配上同一次编译得到的 ELF 文件，成功看到了：

```text
当前运行地址
→ 对应到 StarryOS 中的某个函数
```

这说明板子上的程序和电脑上的符号文件已经对应起来了。

---

## 函数断点命中

然后做了一个很关键的实验：直接在 StarryOS 的某个函数上设置断点。

```text
设置断点
→ 继续运行
→ CPU 真的停在这个函数里
```

而且不是偶然成功一次，而是可以反复命中：

```text
continue
→ 再次命中
→ continue
→ 再次命中
```

到这里，则是可以说已经完成了：

```text
K3 真板硬件调试 ✅
OpenOCD ✅
GDB ✅
StarryOS 函数级断点 ✅
```


---

## 源码级调试


GDB 已经能看到：

```text
函数名
```

但还不能很好地看到：

```text
具体源码文件
第几行代码
变量信息
```

原因不是 GDB 有问题，而是原来运行的 StarryOS 虽然带有函数符号，却没有完整的源码调试信息。

所以当时可以做到：

```text
break memcpy       ✅
```

但我们真正想要的是：

```text
break k3_ufs.rs:1799
```

也就是 **直接按源码文件和行号调试。**


---

## 重新编译debug版 StarryOS



一开始尝试过普通的 `--debug`，但它会把整个 StarryOS 从：release 版本，变成“开发版本”，很多编译行为都会跟着发生变化。

但最理想的是：**板子上跑的程序仍然保持原来的 release 逻辑，只让电脑上的 ELF 多带一些调试信息。**

后来找到了合适的方案：Host-DWARF，就是把源码调试信息留在电脑上的 ELF 文件里，不让这些信息去膨胀板子实际运行的 kernel。

最后成功得到：

```text
一个正常大小的 StarryOS kernel + 一个带完整源码信息的 ELF
```

电脑端的静态验证也通过：

```text
可以找到源码文件 ✅
可以找到源码行 ✅
可以按源码行设置断点 ✅
```

所以Host-DWARF 构建成功 ✅

---

## 准备上板，启动链却突然卡住

按照原计划，接下来应该很简单：

```text
把新的 StarryOS 放到板子上
→ 启动
→ 用 GDB 做源码行断点
```

结果重新冷启动以后，板子突然卡住了。

发现： **新的 StarryOS 根本还没有被加载，板子在更早的阶段就已经卡住了。**

所以新编译的 StarryOS 坏了，Host-DWARF 很快被排除，不是启动失败原因。

 是为了方便输入指令设计的自动化启动脚本问题，重新改为使用手动输入命令。
 
---

## 重新验证带debug编译信息的StarryOS
重新按照之前已经验证成功的正常启动流程，对新的 StarryOS 进行了真板验证：新的 Host-DWARF kernel 通过 fastboot 成功加载到地址：0x140000000 对应 DTB 加载到：0x138000000

随后在 U-Boot 中执行：scsi scan 确认 UFS 可以正常识别，然后执行：booti 0x140000000 - 0x138000000  
最终串口成功出现：Welcome to Starry OS! 这说明新的带 debug 编译信息的 StarryOS 已经能够在 K3 真板正常启动。

同时，本次启动使用的 Debug FSBL 成功输出：Debug JTAG enabled on MMC1 pins ，说明 JTAG pinmux 已正确建立。

随后使用之前已验证 OpenOCD 配置，成功连接 K3，并得到：

```text
JTAG tap: k3.cpu enabled
[k3.x100.0] Examined RISC-V core
XLEN=64
[k3.x100.0] Examination succeed
Listening on port 3333 for gdb connections
```
说明：

Host-DWARF StarryOS + JTAG + OpenOCD 已经能够同时正常工作。

随后使用与当前运行 kernel 同一次构建生成的 Host-DWARF ELF 启动 GDB：

gdb-multiarch starryos_host_dwarf_release.elf

并连接：
```text
set architecture riscv:rv64
target remote localhost:3333
```
GDB 成功将真板当前 PC 映射为：
```text
ax_plat::time::current_ticks ()
at platforms/ax-plat/src/time.rs:23
```
说明已经完成：
```text
PC → Rust 函数
PC → Rust 源文件
PC → 源码行号
```
随后验证源码断点：
```text
break platforms/ax-plat/src/time.rs:23
continue
```
真板成功命中：
```text
Breakpoint 2.9, ax_plat::time::current_ticks ()
    at platforms/ax-plat/src/time.rs:23
```
进一步执行 next

成功源码级执行到：

platforms/axplat-dyn/src/generic_timer.rs:58

因此当前已经验证：
```text
Host-DWARF 构建成功                         ✅
Host-DWARF StarryOS 真板启动成功            ✅
Debug FSBL / JTAG pinmux                    ✅
OpenOCD 真板连接                            ✅
GDB remote                                  ✅
PC → Rust 函数映射                          ✅
PC → source file:line 映射                  ✅
源码行断点解析                              ✅
源码行断点真板命中                          ✅
源码级 next                                 ✅
```
当前完整调试链已经达到：
```text
Rust 源码
   ↓
Host-DWARF ELF
   ↓
GDB
   ↓
OpenOCD
   ↓
J-Link / JTAG
   ↓
K3 RISC-V Debug Module
   ↓
运行中的 StarryOS
```
因此，K3 + StarryOS 的底层源码调试环境已经完成验证，底层硬件调试链已经打通，下一阶段主要工作就是把 ARD 调试器适配已经验证的 GDB/OpenOCD/StarryOS 真板链路上。
