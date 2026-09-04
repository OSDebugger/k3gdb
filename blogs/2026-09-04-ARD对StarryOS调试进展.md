#  ARD 对 K3 启动调试进展

本阶段主要围绕两个目标：

```text
① 把已经验证好的 K3 + StarryOS 源码调试环境稳定启动起来
② 正式把 ARD 接入 K3 真板，并验证基础源码调试能力
```

整体上，本阶段完成了一次比较关键的跨越：

```text
K3 + StarryOS 底层调试基线
        ↓
ARD
        ↓
gdb-multiarch
        ↓
OpenOCD
        ↓
J-Link / JTAG
        ↓
K3 真板
        ↓
Rust 源码断点 / Continue / Pause / Step Over
```

最终已经能够直接在 VSCode 的 ARD 调试界面里控制真实运行中的 K3 + StarryOS。

---

## Golden Flow 启动过程中发现 warm-recovery 前置条件

在正式接入 ARD 之前，需要先重新启动已经冻结的 Host-DWARF StarryOS 调试环境。

原本已经整理出一套 Golden Flow：

```text
BootROM Recovery
→ Debug FSBL / SPL
→ OpenSBI
→ Full U-Boot
→ scsi scan
→ Host-DWARF StarryOS
→ OpenOCD
→ GDB
```

并且相关制品全部通过完整性检查：

```text
FSBL.bin                             ✅
fw_dynamic.bin                       ✅
fw_dynamic.elf                       ✅
fw_dynamic.itb                       ✅
StarryOS DTB                         ✅
Host-DWARF StarryOS BIN              ✅
Host-DWARF StarryOS ELF              ✅
OpenSBI + Full U-Boot combined FIT   ✅
```

但是本次重新启动时发现了一个比较特殊的问题。

BootROM Recovery 正常：

```text
version-brom: 1.0
```

Debug FSBL 正常：

```text
U-Boot SPL 2022.10-dirty
Debug JTAG enabled on MMC1 pins
```

SPL fastboot 也正常：

```text
version: 0.4
```

combined FIT 可以正常下载：

```text
fastboot stage k3-jtag-ram-opensbi-uboot.itb
OKAY
```

但是执行：

```text
fastboot continue
```

之后，Full U-Boot 没有继续启动。

也就是说启动链停在：

```text
BootROM             ✅
Debug FSBL / SPL    ✅
combined FIT        ✅
OpenSBI             ?
Full U-Boot         ❌
```

一开始仅凭串口并不能确认 CPU 到底停在哪里，因此保留现场，重新通过 JTAG + OpenOCD 连接 K3。

成功抓到：

```text
PC = 0x100026c10
RA = 0x100026e9e
SP = 0x100083980
```

combined FIT 中 OpenSBI 的运行地址为：

```text
0x100000000
```

因此可以确定：

```text
SPL 已经完成
→ CPU 已经进入 OpenSBI
→ 但还没有进入 Full U-Boot
```

进一步通过冻结 OpenSBI ELF 对地址进行符号解析：

```text
PC 0x100026c10
→ csi_dcache_invalid_range()
RA 0x100026e9e
→ __smq_rx()
```

最终定位到 OpenSBI early-init 阶段的 RPMI shared-memory mailbox 接收路径：

```text
OpenSBI
→ platform early init
→ RPMI HSM 初始化
→ RPMI shared-memory mailbox
→ P2A_ACK queue
→ __smq_rx()
→ csi_dcache_invalid_range()
```

这说明当前失败并不是：

```text
FSBL 坏了
U-Boot FIT 损坏
StarryOS 出问题
JTAG 出问题
```

而是在 **OpenSBI 初始化 RPMI 管理通信时遇到了异常状态。**

---

## 排除“清理文件把 Golden Flow 删坏”的可能

由于之前完成底层环境之后进行过一次大规模目录清理，所以一开始怀疑：

 **会不会是清理过程中误删了 ESOS / RCPU / RPMI 相关启动文件？**

历史清理确实删除过大量：

```text
构建目录
重复制品
archive 旧构建树
backup / temp
旧工具
document history
```

但是继续回查历史日志后发现一个非常关键的事实：

```text
2026-09-01 16:20
同一套 FSBL + combined FIT
曾成功进入 Full U-Boot / StarryOS
```

而在清理之前：

```text
2026-09-01 19:02
2026-09-01 19:16
```

就已经出现过和本次完全相同的：

```text
combined FIT continue
→ Full U-Boot 没有启动
```

因此可以排除：

```text
9 月 2 日文件清理
→ 导致 Golden Flow 第一次发生回归
```

同时检查发现，ESOS / RCPU 相关研究资料和 firmware 也没有完全丢失。

所以本次问题最终更像是：

 **Golden Flow 原本就存在一个没有被明确记录下来的“启动前状态”依赖。**

---

## 发现 Golden Flow 的 warm-recovery 前置条件

为了确认这个隐藏前置条件，进行了一个比较关键的 A/B 实验。

首先不进入 Debug Recovery，而是让 K3 正常走一次官方启动链：

```text
官方 SPL
→ 官方 Full U-Boot
→ run ufs_boot
→ Bianbu Linux
```

Linux 成功启动以后明确看到：

```text
remoteproc remoteproc0: rcpu_rproc1 is available
remoteproc remoteproc0: attaching to rcpu_rproc1
remote processor rcpu_rproc1 is now attached
```

同时 RPMI 相关设备正常注册：

```text
rpmi pwrkey
riscv-rpmi-rtc
```

说明官方启动链已经正常建立：

```text
RCPU
+
RPMI management environment
```

随后保持板卡供电，不进行完整掉电，通过 warm reboot 再进入 BootROM Recovery：

```text
Bianbu
→ warm reboot
→ FORCE_RECOVERY
→ BootROM Recovery
→ Debug Golden Flow
```

使用的仍然是完全相同的：

```text
Debug FSBL
OpenSBI
combined U-Boot FIT
Host-DWARF StarryOS
```

结果这一次成功出现：

```text
U-Boot 2022.10-dirty
CPU: rv64imafdcvh
Model: spacemit k3 com260 ifx board
```

也就是说：

```text
OpenSBI
→ Full U-Boot ✅
```

随后：

```text
scsi scan
```

成功识别：

```text
KINGSTON TY7B-128
```

继续按照原 Golden Flow：

```text
加载 Host-DWARF StarryOS BIN
→ 加载 DTB
→ booti
→ Welcome to Starry OS!
```

最终 StarryOS 正常进入 shell。

因此本阶段新确认了一条非常重要的实际前置条件：

```text
官方启动链完成一次 RCPU / RPMI 初始化
→ 不完全断电
→ warm recovery
→ Debug Golden Flow
→ StarryOS
```

可以稳定成功。

而：

```text
完全 cold boot
→ 直接 BootROM Recovery
→ Debug Golden Flow
```

则存在卡在 OpenSBI RPMI 初始化路径的可能。

所以目前 Golden Flow 更准确的理解应该是：

```text
厂商底层 management 环境初始化
→ warm recovery
→ Debug FSBL
→ OpenSBI
→ Full U-Boot
→ UFS
→ Host-DWARF StarryOS
```

这一点很重要，因为项目本身的目标是：

```text
StarryOS 真板调试
→ OpenOCD / GDB
→ ARD
```

而不是重新实现：

```text
K3 完整 cold boot
→ ESOS / RCPU
→ RPMI
→ management firmware 生命周期
```

因此当前不继续扩大范围去重新实现完整 self-contained cold boot，而是把 **warm-recovery 前置条件**明确记录下来，继续 ARD 主线。

---

## ARD 正式接入 K3 真板

StarryOS 启动成功以后，重新启动冻结的 OpenOCD 配置：

```text
JTAG tap: k3.cpu enabled
[k3.x100.0] Examined RISC-V core
XLEN=64
[k3.x100.0] Examination succeed
Listening on port 3333 for gdb connections
```

随后在 StarryOS workspace：

```text
/home/user/ARD_Deploy/tgoskits
```

中增加 K3 真板调试配置：

```text
K3 StarryOS Host-DWARF Smoke Test
```

核心配置为：

```text
ARD
request: launch
Host-DWARF ELF
gdb-multiarch
remote: localhost:3333
```

ARD 开发窗口仍然保持：

```text
/home/user/async-integration/async-debug
branch: async-integration
```

然后：

```text
ARD 开发窗口
→ F5
→ Extension Development Host
→ 打开 tgoskits
→ 选择 K3 StarryOS Host-DWARF Smoke Test
→ F5
```

OpenOCD 随即出现：

```text
accepting 'gdb' connection on tcp/3333
k3.x100.0 halted due to debug-request.
```

说明第一次真正完成：

```text
ARD
→ gdb-multiarch
→ OpenOCD
→ J-Link / JTAG
→ K3 真板
```

---

## ARD 第一次直接看到 K3 Rust 源码

ARD 连接以后，VSCode 成功显示当前真板执行位置。

第一次暂停时直接看到：

```text
ax_std::os::libc_compat::memcpy
os/arceos/ulib/axstd/src/os/libc_compat.rs:499
```

并且左侧调试界面正常出现：

```text
Call Stack
Arguments
Locals
当前线程
源码位置
```

也就是说，之前已经由手工 GDB 验证的：

```text
PC
→ Rust 函数
→ Rust 源文件
→ 源码行
```

现在已经成功搬到了 ARD / VSCode 调试界面中。

因此第一次完成了：

```text
ARD 真板连接                   ✅
ARD 获取 K3 PC                ✅
ARD Rust source 定位          ✅
ARD Call Stack                ✅
ARD Arguments / Locals        ✅
```

---

## ARD 真板源码断点与 F10 验证

接下来直接复用了之前手工 GDB 已经冻结的验证点：

```text
platforms/ax-plat/src/time.rs:23
```

在 ARD 中直接设置源码断点：

```text
time.rs:23
```

然后：

```text
F5 / Continue
```

真板成功命中：

```text
Breakpoint
ax_plat::time::current_ticks ()
at platforms/ax-plat/src/time.rs:23
```

这说明：

```text
VSCode source breakpoint
→ ARD
→ GDB/MI
→ GDB
→ OpenOCD
→ K3
→ 真板命中
```

整条链已经真正成立。

随后在 VSCode 中直接执行：

```text
F10 / Step Over
```

最终源码位置移动到：

```text
platforms/axplat-dyn/src/generic_timer.rs:58
```

和之前手工 GDB：

```text
next
```

得到的结果完全一致。

因此已经完成：

```text
ARD source breakpoint              ✅
ARD 真板 breakpoint hit            ✅
ARD F10 / Step Over                ✅
ARD 跨文件 Rust source 跳转        ✅
```

这一步意味着之前的手工 GDB 基线已经真正被 ARD 接管。

---

## 发现 ARD Pause 被错误显示成“出现异常”

基础源码调试成功以后，又测试了一项最基本的状态切换：

```text
F5 Continue
→ Pause
```

实际底层行为完全正常：

```text
Program received signal SIGINT, Interrupt.
ax_plat::time::monotonic_time ()
at platforms/ax-plat/src/time.rs:57
```

并且 VSCode 能正常恢复：

```text
源码位置
黄色执行箭头
Call Stack
Arguments / Locals
```

说明：

```text
Continue ✅
Pause ✅
CPU halt ✅
源码恢复 ✅
```

但是 VSCode 界面却显示：

```text
出现异常
```

Call Stack 里也把停止原因显示成：

```text
Signal: SIGINT
```

连续两次：

```text
Continue
→ Pause
```

都能稳定复现。

因此可以确定，这不是硬件问题，也不是 GDB 或 OpenOCD 问题，而是 ARD 的 **DAP stop reason 映射问题**。

实际链路为：

```text
用户点击 Pause
→ ARD pauseRequest()
→ GDB -exec-interrupt
→ GDB 返回 signal-received / SIGINT
→ ARD 把所有 signal-stop 都映射成 exception
→ VSCode 显示“出现异常”
```

实际上用户主动 Pause 导致的 SIGINT 应该被解释为：

```text
pause
```

而不是：

```text
exception
```

---

## 修复 Pause stop-reason

本次修复保持在 ARD 自身范围内，没有修改：

```text
K3
StarryOS
FSBL
OpenSBI
U-Boot
OpenOCD
JTAG
```

也没有修改：

```text
RuntimeEventGraph
History
Snapshot
OSStateMachine
```

主要修复位置：

```text
src/gdbDebugSession.ts
```

原来的逻辑是：

```text
signal-received
→ signal-stop
→ StoppedEvent("exception")
```

因此无论 SIGINT 是：

```text
目标程序自己产生
```

还是：

```text
用户点击 Pause 产生
```

都会被认为是 exception。

现在增加一次性的：

```text
pendingUserPause
```

当用户点击 Pause：

```text
pendingUserPause = true
→ -exec-interrupt
```

随后收到：

```text
SIGINT
```

如果这是刚才 Pause 发起的：

```text
pendingUserPause + SIGINT
→ DAP reason = pause
```

否则真正由 target 自己产生的 SIGINT 仍然保持：

```text
DAP reason = exception
```

同时还处理了：

```text
breakpoint 与 Pause 竞争
step 与 Pause 竞争
非 SIGINT signal
interrupt 失败
disconnect
新 session
```

避免 pending 状态残留到下一次停止事件。

---

## Pause 修复测试

修改后完成：

```text
npm run compile                  PASS
Stop reason tests               5 / 5 PASS
MI parser                       57 / 57 PASS
OSStateMachine                  37 / 37 PASS
OS debug flow                   28 / 28 PASS
git diff --check                PASS
```

随后重新加载 ARD 扩展，并回到 K3 真板验证。

连续两次：

```text
F5 Continue
→ Pause
```

均成功完成：

```text
源码重新定位             ✅
Call Stack              ✅
黄色执行箭头             ✅
Pause 正常               ✅
不再显示“出现异常”       ✅
```

GDB Debug Console 仍然会显示：

```text
Program received signal SIGINT, Interrupt.
```

这是正常现象。

因为底层 GDB 实际仍然是通过 SIGINT 中断正在运行的目标，修复的是 ARD / DAP 对这个停止事件的解释：

```text
底层：
SIGINT
```

但是上层 VSCode：

```text
Pause
```

这才是正确的行为。

随后再次进行源码断点回归：

```text
time.rs:23
→ F5
→ 真板命中
→ F10
→ generic_timer.rs:58
```

仍然正常。

说明此次 stop-reason 修复没有破坏：

```text
breakpoint
continue
step
source mapping
```

等既有功能。

---

## ARD 调试 Session 重建验证

为了避免一次成功只是偶发现象，最后又测试了完整 session 重新建立：

```text
ARD 当前 session
→ Shift + F5 Stop
→ 不重启板子
→ 不重启 OpenOCD
→ 再次启动 K3 StarryOS Host-DWARF Smoke Test
```

重新启动以后仍然能够：

```text
ARD 重新连接 :3333          ✅
出现当前暂停源码             ✅
Call Stack 正常              ✅
F5 Continue                 ✅
Pause                       ✅
重新恢复源码                 ✅
```

说明：

```text
GDB-MI session
pendingUserPause
断点状态
ARD stop state
```

没有因为上一次调试会话产生异常残留。

---

## 当前异步 Snapshot / Observer Tree 状态

在每次暂停时，目前 ARD 还会自动打印类似：

```text
observer_root = null
roots = []
relation_annotations = []
```

以及：

```text
snapshot
ok = true
empty = true
privilege = unknown
transition = none
async_path = []
```

目前这些信息暂时不算错误。

因为当前阶段还没有为 K3 + StarryOS：

```text
生成 whitelist
ardb-load-whitelist
选择 async trace root
ardb-trace
运行对应异步路径
```

所以现在：

```text
Observer Tree 为空
Snapshot 为空
async_path 为空
```

符合当前测试阶段。

后续会参考原 Embassy 等案例的工作方式，逐步补充：

```text
生成 K3 / StarryOS whitelist
→ ardb-load-whitelist
→ ardb-trace
→ 设置异步断点
→ continue
→ History
→ Snapshot
```

目前不提前扩大这一阶段范围。

---

## 本阶段完成的工作与贡献

1. 重新验证 Golden Flow 时发现 cold boot 条件下存在 OpenSBI RPMI 初始化异常，并通过 JTAG 抓取真实 PC：

```text
PC = 0x100026c10
→ csi_dcache_invalid_range()
RA = 0x100026e9e
→ __smq_rx()
```

确认故障发生在：

```text
OpenSBI early-init
→ RPMI shared-memory mailbox
```

而不是 SPL、Full U-Boot、StarryOS 或 JTAG。


2. 通过官方 Bianbu 启动链验证：

```text
RCPU attach ✅
RPMI pwrkey ✅
RPMI RTC ✅
```

随后在不断电情况下 warm recovery，再执行完全相同 Golden Flow，成功进入：

```text
Debug Full U-Boot
→ UFS
→ Host-DWARF StarryOS
```

由此确认当前调试流程存在：

```text
厂商 management/RPMI 初始化
→ warm recovery
```

这一实际前置条件。

3. 明确收缩项目职责边界：

当前目标仍然是：

```text
StarryOS
→ JTAG / OpenOCD / GDB
→ ARD
```

不继续把工作扩大到：

```text
完整 K3 cold-boot
→ ESOS / RCPU
→ RPMI management firmware
```

的重新实现。

4. 在 StarryOS 真板环境第一次正式完成：

```text
ARD
→ gdb-multiarch
→ OpenOCD
→ J-Link / JTAG
→ K3
```

真板连接。

5. ARD 成功读取真实 K3 当前状态，并直接展示：

```text
Rust source
Call Stack
Arguments
Locals
当前源码行
```

6. 使用已经冻结的人工 GDB 验证点：

```text
platforms/ax-plat/src/time.rs:23
```

在 ARD 中完成：

```text
source breakpoint
→ Continue
→ K3 真板命中
→ F10
→ generic_timer.rs:58
```

说明手工 GDB 的源码调试基线已经被 ARD 完整接管。

7. 发现并修复 ARD 用户主动 Pause 时：

```text
SIGINT
→ exception
```

的错误 DAP 映射。

修复以后：

```text
用户 Pause
→ SIGINT
→ DAP reason = pause
```

同时真正由 target 自己产生的 SIGINT 仍保持 exception。

8. 修复完成后通过自动测试以及 K3 真板测试确认：

```text
Continue → Pause           ✅
Pause stop reason          ✅
Source breakpoint          ✅
Step Over                  ✅
Stop → Restart session     ✅
```

均稳定工作。

---

## 当前阶段结果

目前 K3 + StarryOS + ARD 基础真板调试链已经达到：

```text
Rust 源码
   ↓
Host-DWARF ELF
   ↓
ARD
   ↓
GDB / MI
   ↓
gdb-multiarch
   ↓
OpenOCD
   ↓
J-Link / JTAG
   ↓
K3 RISC-V Debug Module
   ↓
运行中的 StarryOS
```

当前已经验证：

```text
Golden Flow warm-recovery 启动                   ✅
Host-DWARF StarryOS                              ✅
OpenOCD / JTAG                                   ✅
ARD → GDB → OpenOCD → K3                        ✅
ARD Rust source 显示                            ✅
Call Stack / Arguments / Locals                 ✅
源码断点                                         ✅
源码断点真板命中                                 ✅
Continue                                         ✅
Pause                                            ✅
Pause stop-reason                               ✅
F10 / Step Over                                 ✅
跨 Rust 源文件跳转                               ✅
ARD session Stop → Restart                      ✅
```

本阶段的核心成果可以概括为：

```text
发现 Golden Flow cold-boot 隐藏状态依赖
→ 通过官方初始化 + warm recovery 恢复稳定调试启动
→ 保持 K3 底层环境不继续扩大设计范围
→ ARD 第一次正式连接 K3 真板
→ ARD 直接显示 StarryOS Rust 源码
→ ARD 源码断点真板命中
→ ARD F10 源码级执行成功
→ 修复 Pause 被误判为 exception
→ 完成基础 ARD 真板调试闭环
```

至此，**K3 COM260 + StarryOS 已经不仅是一个可以通过手工 GDB 进行 Rust 源码调试的目标平台，也已经真正接入 ARD，并完成了基础源码级真板调试闭环。**

下一阶段不再回头修改已经验证的：

```text
FSBL
OpenSBI
U-Boot
StarryOS 启动
JTAG
OpenOCD
Host-DWARF
```

除非手工 GDB 基线本身重新失效。

后续工作将开始逐步验证 ARD 更高层能力，包括：

```text
OSStateMachine / kernel-user 状态
→ K3 + StarryOS whitelist 生成
→ ardb-load-whitelist
→ ardb-trace
→ 异步断点
→ History
→ Snapshot / Observer Tree
→ RuntimeEventGraph
```

并逐渐把原来 Embassy、ReL4 等环境中已经验证过的 ARD 使用流程，迁移到 K3 + StarryOS 真板环境中。