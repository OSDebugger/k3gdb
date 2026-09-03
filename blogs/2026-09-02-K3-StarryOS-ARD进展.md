# K3 + ARD 调试进展

本阶段是围绕“让 K3 硬件成为可进行 Rust 源码级调试的目标平台”完成了一次完整的调试环境适配。

首先，通过实验梳理并固定了 K3 的调试启动链：

```text
BootROM
→ Debug FSBL / SPL
→ OpenSBI
→ Full U-Boot
→ UFS 初始化
→ StarryOS
→ OpenOCD
→ J-Link / JTAG
→ GDB
```

在此基础上，对启动环境进行了必要改造。

---

## 让 StarryOS 跑起来

想要实现最终目标，最开始先解决的是：**StarryOS 在 K3 这块板子上跑起来**

 K3 的启动过程：

```text
芯片上电
→ 第一阶段启动程序
→ OpenSBI
→ U-Boot
→ StarryOS
→ UFS 根文件系统
```

在部署期间发现，StarryOS 想正常访问 UFS，需要前面的 U-Boot 先帮忙把 UFS 初始化。

于是在解决这个问题之后形成了一套验证成功的启动流程：

```text
进入恢复模式
→ 临时加载自己的启动程序
→ 进入 U-Boot
→ 初始化 UFS
→ 加载 StarryOS
→ 启动
→ 进入 StarryOS shell
```

算是第一次真正完成了：

```text
K3 + StarryOS 真板运行 ✅
```

后来为了方便输入指令，还把这套流程做成了一个自动输入指令的启动脚本。

---

## 解决 JTAG 与 控制 CPU

StarryOS 能跑以后就可以正式思考**如何让电脑直接控制 K3 CPU**

根据我们调试的链路来看似乎是成立的：

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

简单说，就是电脑正常，J-Link 也正常，但 K3 根本没有把真正的 JTAG 信号接出来。

后来我通过官方资料用户手册确认 **K3 的 JTAG 和 TF/MMC1 引脚是复用的。**


于是我修改了启动程序，让它在启动时完成把 MMC1 引脚切换成 JTAG 的设置，不出所料，串口出现了：

```text
Debug JTAG enabled on MMC1 pins
```

从这以后，J-Link 终于真正识别到了 K3，我们则是第一次打通了JTAG的通路：

```text
OpenOCD
→ J-Link
→ K3
```

JTAG 接通以后，我开始让电脑直接控制 K3 CPU进行一系列的基础控制，完成了：

```text
识别 CPU ✅
暂停 CPU ✅
读取寄存器 ✅
查看当前运行位置 ✅
继续运行 ✅
```
的基础调试。这一步又可以证明了一件事：**已经能从外部停住 K3 CPU。** 

到这里，硬件调试链就算正式成立。

---

##  接入GDB并命中函数断点

硬件调试链通了，那接下来需要接入 GDB。但是 GDB 自己其实并不会直接控制 K3 芯片的 JTAG 引脚，我们需要一个连接 GDB 和真板硬件之间的“调试中间层”，它就是 OpenOCD 。

OpenOCD在链路中的位置是在这里：

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

在这一阶段，我们验证了：

```text
GDB 连接 K3   ✅
读取寄存器     ✅
查看程序地址   ✅
暂停和继续运行 ✅
```

随后又往前走了一步：

 **让 GDB 根据当前地址，找到 StarryOS 里的对应函数。**

我们把板子上正在运行的 StarryOS，配上同一次编译得到的 ELF 文件，成功看到了：

```text
当前运行地址
→ 对应到 StarryOS 中的某个函数
```

这说明板子上的程序和电脑上的符号文件已经成功对应起来了。


然后做了一个很关键的实验：直接在 StarryOS 的某个函数上设置断点。

```text
设置断点
→ 继续运行
→ CPU 停在这个函数
```

经过反复命中的验证：

```text
continue
→ 再次命中
→ continue
→ 再次命中
```

可以说，已经完成了基本打通 GDB 到 K3 之间的调试链路的任务：

```text
K3 硬件调试       ✅
OpenOCD          ✅
GDB              ✅
StarryOS 函数断点 ✅
```


GDB 已经能看到函数名了。但是，为了接入我们的ARD函数调试器，我们需要看到：

```text
具体源码文件
第几行代码
变量信息
```

但是原来运行的 StarryOS 虽然带有函数符号，却没有完整的源码调试信息。

所以当时可以做到：

```text
break memcpy       ✅
```

这是没问题的，但想满足我们调试器的需求，真正需要的是：

```text
break k3_ufs.rs:1799
```

也就是 **直接按源码文件和行号调试。**


---

## 重新编译验证带debug编译信息的StarryOS

一开始重新编译之后确实尝试过普通的 **--debug** ，但它有一个弊端，就是会把整个 StarryOS 从 release 版本，变成“开发版本”，很多编译行为都会跟着发生变化。但想满足调试器控制硬件需求，最理想的情况是：**板子上跑的程序仍然保持原来的 release 逻辑，只让电脑上的 ELF 多带一些调试信息。**

于是找到了一个更加合适的方案：Host-DWARF，就是把源码调试信息留在电脑上的 ELF 文件里，不让这些信息去膨胀板子实际运行的 kernel。这个方案成功得到了：

```text
一个正常大小的 StarryOS kernel + 一个带完整源码信息的 ELF
```

电脑端的静态验证确定可以找到源码文件与源码行，并且可以按源码行设置断点，所以毫无疑问 Host-DWARF 构建的方案是成功的。

于是开始上版，新的 Host-DWARF kernel 通过 fastboot 

```text
成功加载到地址：0x140000000 
对应 DTB 加载到：0x138000000
```
随后在 U-Boot 中执行：
```text
scsi scan 
```
确认 UFS 可以正常识别，然后执行：

```text
booti 0x140000000 - 0x138000000  
```
最终串口成功出现：Welcome to Starry OS! 

这说明新的带 debug 编译信息的 StarryOS 已经能够在 K3 真板正常启动。同时，本次启动使用的 Debug FSBL 成功输出：
```text
Debug JTAG enabled on MMC1 pins 
```
说明 JTAG pinmux 已正确建立。

随后使用之前已验证 OpenOCD 配置，成功连接 K3，并得到了：

```text
JTAG tap: k3.cpu enabled
[k3.x100.0] Examined RISC-V core
XLEN=64
[k3.x100.0] Examination succeed
Listening on port 3333 for gdb connections
```
说明 Host-DWARF StarryOS + JTAG + OpenOCD 已经能够同时正常工作。

随后使用与当前运行 kernel 同一次构建生成的 Host-DWARF ELF 启动 GDB：

```text
gdb-multiarch starryos_host_dwarf_release.elf
```
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
说明已经完成了：

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

```text
platforms/axplat-dyn/src/generic_timer.rs:58
```
因此验证：

```text
Host-DWARF 构建成功                        ✅
Host-DWARF StarryOS 真板启动成功           ✅
Debug FSBL / JTAG pinmux                  ✅
OpenOCD 真板连接                           ✅
GDB remote                                ✅
PC → Rust 函数映射                         ✅
PC → source file:line 映射                 ✅
源码行断点解析                              ✅
源码行断点真板命中                          ✅
源码级 next                                ✅
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
K3 + StarryOS 的底层源码调试环境已经完成验证，底层硬件调试链已经打通，下一阶段主要工作就是把 ARD 调试器适配已经验证的 GDB/OpenOCD/StarryOS 真板链路上。

## 本阶段完成的工作与贡献

1. 修改 FSBL / SPL 的板级初始化，使 MMC1 复用引脚切换为 PRI JTAG，并通过：

```text
Debug JTAG enabled on MMC1 pins
```
确认 JTAG pinmux 已建立。

2. 保证 Full U-Boot 阶段不会重新占用该组 JTAG 引脚，使 JTAG 链路能够在 StarryOS 启动后继续保持有效。

3. 通过真板反复验证，确定 K3 当前稳定的 OpenOCD 调试参数，最终固定为 100 kHz、cluster0/core0 的单核调试配置。

4. 在启动过程中发现 StarryOS 的 K3 UFS 初始化依赖 U-Boot 前级状态。通过对照实验确认，在启动 StarryOS 前执行：

```text
scsi scan
```
可以使后续 StarryOS 正常完成 MPHY、UFS Link、rootfs 挂载并进入 shell，因此该步骤被正式纳入当前 Golden Flow。

5. 在基础硬件调试链建立以后，又对 StarryOS 的构建方式进行了扩展。原始 release 版本虽然保留函数符号，但缺少完整 DWARF 源码调试信息，只能做到：PC地址 → 函数名。

为此新增 Host-DWARF 构建方式，使板子上运行的 kernel 仍保持 release 运行逻辑和正常体积，而调试主机上的 ELF 保留完整源码调试信息。最终形成：正常大小的 StarryOS release kernel + 与其同一次构建生成的 Host-DWARF ELF

并在 K3 真板上进一步完成：

```text
PC → Rust 函数
PC → Rust 源文件
PC → 源码行号
源码行断点解析
源码行断点真板命中
源码级 next
```
 本阶段的核心成果：K3 COM260 + StarryOS 真正建设成了一个可以进行 Rust 源码级硬件调试的目标平台，同时完成了 ARD 真板接入所需的底层环境准备。

后续 ARD 不再需要重新解决 JTAG、OpenOCD、StarryOS 启动和源码符号问题，而只需要在已经验证成功的链路之上完成 GDB/MI、launch 配置、源码路径、断点管理和调试状态机等适配。

该阶段工作可以简要概括为：

```text
K3 + StarryOS 真板运行环境建立
→ K3 JTAG 调试能力开启
→ OpenOCD/GDB 真板链打通
→ StarryOS Host-DWARF 构建能力补充
→ Rust 源码级硬件调试闭环完成
→ 为 ARD 真板接入建立稳定底层基线
```