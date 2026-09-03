# ARD_K3_COM260_StarryOS调试部署基线文档

本文档用于固化 K3 COM260 真板运行 StarryOS 以及后续接入 ARD 调试器所需的工程基线。本文档不是操作教程，也不将尚未验证的能力视为已支持。

## 状态标记

| 标记 | 含义 |
| --- | --- |
| **[已验证]** | 已通过当前工程环境、真板操作或直接源码检查确认；具体范围在结论旁说明 |
| **[官方资料确认]** | 来自《K3 CoM260 Kit 用户使用指南 V2.1（2026/07/16）》 |
| **[他人复现确认]** | 来自已复现成功同学提供的仓库、分支和操作记录，当前工程未按同一路径重复验证 |
| **[当前推测]** | 由已有源码、设备树或资料组合推导，但尚未通过目标链路验证 |
| **[待验证]** | 当前没有足够证据，或尚未完成真板实验 |

## 目录

- [1. 项目目标与范围](#1-项目目标与范围)
- [2. 硬件平台基线](#2-硬件平台基线)
- [3. StarryOS K3适配来源](#3-starryos-k3适配来源)
- [4. StarryOS启动流程](#4-starryos启动流程)
- [5. 已完成验证结果](#5-已完成验证结果)
- [6. 已进行的StarryOS适配修改](#6-已进行的starryos适配修改)
- [7. ARD架构分析](#7-ard架构分析)
- [8. StarryOS已有调试基础](#8-starryos已有调试基础)
- [9. K3调试链分析](#9-k3调试链分析)
- [10. K3接口分类](#10-k3接口分类)
- [11. 当前正确技术路线](#11-当前正确技术路线)
- [12. 后续实施计划](#12-后续实施计划)
- [13. TODO列表](#13-todo列表)
- [14. 附录](#14-附录)

---

## 1. 项目目标与范围

### 1.1 总体目标

**[已验证]** 当前项目目标为：在 SpacemiT K3 COM260 Kit 真板运行 StarryOS，并进一步完成 ARD 调试器在该环境中的部署。

```text
K3硬件
   ↓
StarryOS运行环境
   ↓
ARD调试器适配
```

当前状态：

| 工作项 | 状态 |
| --- | --- |
| K3 COM260 真板启动 | **[已验证]** |
| StarryOS kernel 与用户空间运行 | **[已验证]** |
| UFS rootfs 启动 | **[已验证]** |
| ARD 需求与架构分析 | **[已验证]**（源码分析范围） |
| K3 JTAG/OpenOCD 调试链 | **[待验证]** |
| ARD 真板 attach | **[待验证]** |

### 1.2 平台选择与文档边界

- K3 COM260 是本项目已经确定并完成 StarryOS 真板启动验证的目标硬件平台。
- **[待验证]** 原始资料没有记录 K3 COM260 与其他平台之间的选型对比，因此本文档不补充性能、成本或生态方面的选择理由。
- StarryOS 是本项目在 K3 上承载目标程序、用户空间和后续 OS 级调试能力的目标操作系统。
- ARD 是最终需要接入的 VS Code 调试扩展，其关注能力包括异步运行时、kernel/user 切换和 OS 状态分析。

### 1.3 当前工作重点

**[已验证]** K3 + StarryOS 运行环境已经建立。当前工作的重点已经从“让 StarryOS 运行”转为“建立 GDB 到 K3 StarryOS 的底层连接通路”。

自动启动、bootdelay 优化和产品化启动流程不属于当前主线。

---

## 2. 硬件平台基线

### 2.1 核心平台信息

| 项目 | 基线信息 | 状态 |
| --- | --- | --- |
| 开发板 | SpacemiT K3 COM260 Kit | **[已验证]** |
| CPU 架构 | RISC-V | **[官方资料确认]** |
| 启动环境 | U-Boot | **[已验证]** |
| 本地存储 | UFS 2.2 | **[官方资料确认]**；UFS 使用情况已真板验证 |
| 容量 | 128GB/256GB | **[官方资料确认]** |
| 有线网络 | RJ45，1000M Ethernet | **[官方资料确认]**；调试用途未验证 |
| 无线扩展 | WiFi/BT 扩展 | **[官方资料确认]**；调试用途未验证 |
| USB | 4 路 Type-A；1 路 USB 3.0 Type-C OTG | **[官方资料确认]** |
| 调试相关接口 | 40 Pin 标准 GPIO；12 Pin 调试相关接口 | **[官方资料确认]** |

### 2.2 供电与接口职责

**[官方资料确认]** K3 COM260 的供电与数据接口职责分离：

```text
DC圆孔电源
   └── 19V/2.37A 或 12V/5A

USB Type-C
   └── USB 3.0 OTG、固件升级、USB Gadget
       不支持供电

12 Pin
   └── UART Debug、Download、Reset、Power Control、LED
```

Type-C 不能替代 JTAG 硬件调试接口，也不能作为开发板电源输入。

### 2.3 12 Pin 完整定义

**[官方资料确认]** 12 Pin 定义如下：

| Pin | 信号 | 功能 |
| --- | --- | --- |
| 1 | PC_LED- | LED 负极 |
| 2 | PC_LED+ | LED 正极 |
| 3 | UART0_RXD | DEBUG UART RX |
| 4 | UART0_TXD | DEBUG UART TX |
| 5 | BMCU_ACOK | 设置为按键开机 |
| 6 | AUTO_ON_DIS | 与 BMCU_ACOK 短接，设置按键开机 |
| 7 | GND | 电源地 |
| 8 | PMIC_RST_Out | 复位 |
| 9 | GND | 电源地 |
| 10 | FORCE_RECOVERY | Download |
| 11 | GND | 电源地 |
| 12 | SLEEP/WAKE | 开机/关机 |

该定义中没有：

```text
TCK
TMS
TDI
TDO
TRST
SRST
```

因此，不能将 12 Pin 直接认定为 JTAG 接口。

### 2.4 启动、下载与调试选择

#### Boot SEL

**[官方资料确认]** Boot SEL 使用 Strap1、Strap0 选择启动介质：

| Strap1 | Strap0 | 启动路径 |
| --- | --- | --- |
| 0 | 0 | TF Card → eMMC |
| 0 | 1 | TF Card → SPI NOR |
| 1 | 0 | TF Card → SPI NAND |
| 1 | 1 | TF Card → UFS |

当前 UFS 路线对应：

```text
Strap1=1
Strap0=1
```

#### Download SEL

**[官方资料确认]** Download SEL 使用 Strap2：

| Strap2 | 下载方式 |
| --- | --- |
| 0 | USB |
| 1 | UART |

#### JTAG SEL

**[官方资料确认]** 手册存在“Boot Download Sel & JTAG Sel”以及“SEC JTAG SEL & Route”描述，表明板级设计包含 JTAG 路由选择。

**[待验证]** 尚未确认 JTAG SEL 的具体 strap/GPIO 配置、实际引脚位置和真板可访问性。

### 2.5 已确认能力与待验证调试能力

| 能力 | 状态 | 边界说明 |
| --- | --- | --- |
| UART Console | **[已验证]** | 已用于查看启动日志、操作 U-Boot 和进入 StarryOS shell |
| USB OTG/fastboot | **[已验证]** | 已用于上传 kernel 和 DTB |
| USB 通信/ADB 路线 | **[已验证]** | 母库记录为已完成部分软件通信验证 |
| K3 SoC JTAG 复用代码 | **[已验证]**（源码检查） | U-Boot SPL 中存在 `setup_debug_jtag_on_mmc1_pins()` |
| JTAG SEL | **[官方资料确认]** | 只确认存在选择与路由设计 |
| RISC-V Debug Module DTB 描述 | **[已验证]**（设备树检查） | 存在 `compatible = "riscv,debug-v1.0.0";` |
| JTAG 实际连接 | **[待验证]** | 引脚、探针、电压、转接方式未确认 |
| OpenOCD 连接 K3 | **[待验证]** | 尚无 K3 专用配置和真板日志 |
| GDB attach | **[待验证]** | 尚未连接 K3 remote target |

---

## 3. StarryOS K3适配来源

### 3.1 外部复现来源

**[他人复现确认]** K3 板级支持来自复现成功同学提供的仓库分支：

```text
https://github.com/Oveln/tgoskits/tree/feat/k3-board-support
```

分支：

```text
feat/k3-board-support
```

### 3.2 K3 支持内容

**[他人复现确认]** 该分支记录的主要驱动支持：

| 类型 | 模块 | 功能 |
| --- | --- | --- |
| 串口 | PXA UART | UART 通信 |
| 块设备 | K3 SDHCI | SD/eMMC |
| 块设备 | K3 UFS | UFS 存储 |
| 网卡 | K3 GMAC | 以太网 |
| 引脚 | K3 pinctrl | 引脚配置 |

SoC 相关支持：

- APLIC 中断控制器；
- RISC-V zicbom CBO 扩展。

### 3.3 设备树

设备树源码：

```text
os/StarryOS/configs/board/spacemit-k3-com260-ifx.dts
```

当前启动使用的 DTB：

```text
os/StarryOS/configs/board/spacemit-k3-com260-ifx.dtb
```

设备树用于：

- 描述 K3 硬件；
- 控制 bootargs；
- 配置 rootfs 识别。

### 3.4 JTAG 相关源码和设备树证据

**[已验证]**（源码检查）U-Boot SPL 存在：

```text
setup_debug_jtag_on_mmc1_pins()
```

记录的 MMC1/JTAG 复用关系：

| MMC1 | JTAG |
| --- | --- |
| DAT3 | TDI |
| DAT2 | TDO |
| DAT1 | TMS |
| DAT0 | TCK |

默认配置中：

```dts
//spacemit,enable-debug-jtag;
```

处于注释状态。因此默认启动使用 SD/MMC 功能，不能据此认定 JTAG 已经启用。

**[已验证]**（设备树检查）当前 StarryOS 使用的 DTB 描述包含：

```dts
compatible = "riscv,debug-v1.0.0";
```

并描述了 trigger-module 的：

```text
hcontext
mcontext
scontext
```

**[当前推测]** 上述源码和设备树说明 K3 设计具备 RISC-V Debug/JTAG 相关基础，但不等于 OpenOCD 已能连接真板。

---

## 4. StarryOS启动流程

### 4.1 总体启动链

```text
BootROM
   ↓
启动选择（Strap）
   ↓
FSBL / OpenSBI
   ↓
U-Boot
   ↓
fastboot 将镜像加载到 RAM
   ↓
StarryOS kernel
   ↓
UFS GPT 分区
   ↓
Ext4 rootfs
   ↓
StarryOS 用户空间与 shell
```

母库同时记录了以下介质视角的启动结构：

```text
BootROM
   ↓
FSBL
   ↓
OpenSBI
   ↓
U-Boot
   ↓
bootfs
   ↓
StarryOS
   ↓
UFS rootfs
```

### 4.2 标准复现流程

**状态：** **[他人复现确认]**

#### 编译

```bash
cargo starry build \
--config os/StarryOS/configs/board/spacemitk3-com260kit.toml
```

产物：

```text
target/riscv64gc-unknown-none-elf/release/starryos.uimg
```

#### U-Boot 进入 fastboot

```bash
fastboot -l 0x180000000 -s 0x04000000 usb 0
```

#### Host 上传 uImage

```bash
fastboot stage \
target/riscv64gc-unknown-none-elf/release/starryos.uimg
```

#### U-Boot 启动

```bash
bootm 0x180000000
```

### 4.3 当前 ARD_Deploy 验证流程

**状态：** **[已验证]**

kernel 产物：

```text
target/riscv64gc-unknown-linux-musl/release/starryos.bin
```

设备树：

```text
os/StarryOS/configs/board/spacemit-k3-com260-ifx.dtb
```

#### 上传 kernel

U-Boot：

```bash
fastboot -l 0x140000000 -s 0x02000000 usb 0
```

Host：

```bash
fastboot stage \
target/riscv64gc-unknown-linux-musl/release/starryos.bin
```

#### 上传 DTB

U-Boot：

```bash
fastboot -l 0x138000000 -s 0x00800000 usb 0
```

Host：

```bash
fastboot stage \
os/StarryOS/configs/board/spacemit-k3-com260-ifx.dtb
```

#### 启动

U-Boot：

```bash
booti 0x140000000 - 0x138000000
```

### 4.4 两种流程的区别

| 项目 | 标准复现流程 | 当前 ARD_Deploy 流程 |
| --- | --- | --- |
| 状态 | **[他人复现确认]** | **[已验证]** |
| kernel 目标 | `riscv64gc-unknown-none-elf` | `riscv64gc-unknown-linux-musl` |
| 启动产物 | `starryos.uimg` | `starryos.bin` |
| DTB 上传 | 记录中未单独上传 | 单独上传 DTB |
| kernel 地址 | `0x180000000` | `0x140000000` |
| DTB 地址 | 记录中未单列 | `0x138000000` |
| 启动命令 | `bootm 0x180000000` | `booti 0x140000000 - 0x138000000` |

这里仅记录两套已提供流程的事实差异，不推断两种镜像内部结构完全等价。

---

## 5. 已完成验证结果

### 5.1 验证总表

| 验证项 | 验证方式 | 结果 | 可信等级 |
| --- | --- | --- | --- |
| K3 COM260 启动 | 真板进入 U-Boot 并执行加载流程 | 开发板能够完成启动操作 | **[已验证]** |
| StarryOS kernel | `fastboot stage` + `booti` | 输出 `Welcome to Starry OS!` | **[已验证]** |
| 用户空间 | 观察启动结果 | 用户空间完成启动 | **[已验证]** |
| shell | 观察提示符 | 进入 `root@starry:/root #` | **[已验证]** |
| K3 UFS | 启动日志及 rootfs 启动链 | UFS 驱动初始化成功 | **[已验证]** |
| GPT | 启动过程识别 | GPT 分区可识别 | **[已验证]** |
| rootfs 分区 | 启动过程识别 | rootfs 分区可识别 | **[已验证]** |
| Ext4 rootfs | 完成用户空间启动 | Ext4 rootfs 可启动 | **[已验证]** |
| AI Runner 节点 | `ls /dev/k3_airunner` | 返回 `/dev/k3_airunner` | **[已验证]** |
| CPU 信息 | 母库已列入已验证清单 | 已取得 CPU 信息；原始命令和输出未在母库保存 | **[已验证]**（细节待补录） |
| UART Console | USB-TTL + 12 Pin UART0 | 可查看日志、操作 U-Boot/StarryOS | **[已验证]** |
| USB 通信 | Type-C OTG 路线 | 已完成通信验证 | **[已验证]** |

母库记录的 UART 使用链为：

```text
MobaXterm
   ↓
ttyS0
   ↓
K3 UART
```

### 5.2 关键日志

StarryOS 启动成功日志：

```text
Welcome to Starry OS!
```

shell：

```text
root@starry:/root #
```

AI Runner 验证：

```bash
ls /dev/k3_airunner
```

结果：

```text
/dev/k3_airunner
```

### 5.3 当前未完成验证

| 项目 | 状态 |
| --- | --- |
| JTAG 实际连接 | **[待验证]** |
| Probe 型号与连接 | **[待验证]** |
| OpenOCD 识别 K3 | **[待验证]** |
| GDB attach | **[待验证]** |
| kernel ELF/DWARF 加载 | **[待验证]** |
| kernel 断点和单步 | **[待验证]** |
| 多 hart 映射 | **[待验证]** |
| ARD 真板 attach | **[待验证]** |

---

## 6. 已进行的StarryOS适配修改

### 6.1 UFS rootfs 初始问题

启动过程中出现：

```text
configured root device was not found
```

**[已验证]** 问题定位结果：

```text
k3-ufs
   ↓
block device
   ↓
GPT
   ↓
rootfs partition
```

以上链路均正常。问题不是 UFS 驱动错误、UFS 读取失败或 GPT 解析失败。

### 6.2 根因

**[已验证]** StarryOS devfs 中原有块设备映射不足：

```text
/dev/vda
```

原本是占位设备，没有绑定真实的：

```text
k3-ufs
```

### 6.3 修改范围

已修改目录：

```text
os/arceos/modules/axfs-ng
```

以及：

```text
os/StarryOS/kernel/src/pseudofs/dev
```

修改目标：

```text
axfs-ng BlockRuntime
        ↓
获取真实 BlockDeviceHandle
        ↓
StarryOS devfs
        ↓
/dev/vda 映射到 k3-ufs
```

### 6.4 保持不变的部分

以下内容未修改：

- `k3_ufs` 驱动核心；
- U-Boot；
- FIT；
- DTS 启动结构；
- build-helper。

### 6.5 修改定位

这些修改不是为了替代 `feat/k3-board-support`，而是用于打通真实块设备、devfs 和 UFS rootfs，使 StarryOS 具备后续 ARD 真板部署所需的稳定运行环境。

---

## 7. ARD架构分析

### 7.1 ARD 的真实位置

**[已验证]**（ARD 源码分析）ARD 不是运行在 StarryOS 内部的调试器。

```text
VS Code
   ↓ DAP
ARD Debug Adapter
   ↓ GDB/MI2
Host GDB
   ↓ GDB Remote Protocol
Remote Debug Target
   ↓
目标 OS / 程序
```

已确认：

- ARD 是 VS Code 调试扩展；
- ARD 使用 GDB/MI2 控制 Host GDB；
- Python 异步分析逻辑运行在 GDB 侧；
- ARD 本身不直接调用 StarryOS 内核接口。

### 7.2 当前 attach 限制

**[已验证]**（ARD 源码分析）当前 OS attach 流程固定为：

```text
ARD
   ↓
启动 QEMU
   ↓
连接 QEMU GDB stub（当前记录端口为 1234）
```

因此，即使后续 K3 提供：

```text
localhost:3333
```

ARD 当前代码也不能直接复用该 remote target。

### 7.3 ARD 真板适配边界

**[当前推测]** 后续主要改造方向是让 attach backend 支持“已有 remote target”，而不是重写 ARD。

母库记录的设计草案：

```json
{
  "backend": "openocd",
  "gdbTarget": "localhost:3333"
}
```

该配置只是设计记录，尚未实现或验证。

---

## 8. StarryOS已有调试基础

### 8.1 源码已确认的基础能力

以下能力均为 **[已验证]**（StarryOS 源码分析），但不代表已经通过 GDB/OpenOCD 真板调用：

| 能力 | 已有内容 | 当前边界 |
| --- | --- | --- |
| Trap | RISC-V trap 入口、用户态/内核态切换、寄存器保存、`sepc`/`sstatus` 处理 | 尚未通过真板 GDB 断点验证 |
| Syscall | 统一入口 `handle_syscall()` | syscall tracing 接入方式待确定 |
| Task | `TaskId`、用户 TID | 两种 ID 不能混用 |
| Scheduler | scheduler、`sched_switch` tracepoint | GDB task awareness 尚不存在 |
| ptrace | attach、detach、continue、single step | 用户态调试路线尚未完整验证 |
| Register | ptrace 寄存器读取和写入 | 未通过真板 GDB 验证 |
| Memory | ptrace memory peek/poke | 未通过真板 GDB 验证 |
| Breakpoint 基础 | kprobe、uprobe、ptrace | ARD/OpenOCD 断点未验证 |

### 8.2 ARD 需求对照

| 能力 | ARD需求 | StarryOS基线 |
| --- | --- | --- |
| GDB连接 | 必须 | **[待验证]** |
| ELF符号 | 必须 | **[待验证]** |
| DWARF信息 | 必须 | **[待验证]** |
| 寄存器读取 | 必须 | **[已验证]**（源码已有基础） |
| 内存访问 | 必须 | **[已验证]**（源码已有基础） |
| 线程信息 | 必须 | **[已验证]**（源码已有基础） |
| 断点 | 必须 | **[已验证]**（kprobe/uprobe/ptrace 基础） |
| 单步 | 必须 | **[已验证]**（ptrace 基础） |
| 用户/内核边界 | ARD 特性需要 | **[待验证]**（尚未接入 ARD） |

### 8.3 TaskId 与 Thread::tid()

StarryOS 中存在两类标识：

```text
TaskId
Thread::tid()
```

二者不能直接混用。

- 第一阶段调试目标：hart 级别，即 `hart0`、`hart1` 等；
- 第二阶段目标：增加 StarryOS task awareness，使 GDB/ARD 能看到 OS task。

母库记录的候选方向均为 **[当前推测]**：

1. OpenOCD RTOS 插件；
2. ARD 解析 `TASK_TABLE`；
3. StarryOS 增加调试 ABI。

### 8.4 当前优先级结论

StarryOS 已经存在较多调试基础。当前没有证据表明必须优先增加 StarryOS GDB stub 或继续大量修改内核接口。

只有当硬件调试链建立后确认缺少符号、线程信息或 OS 状态，才进入对应的 StarryOS 修改阶段。

### 8.5 软件调试能力记录边界

母库曾将 `ADB + gdbserver` 记录为已验证，同时在后续汇总中将 USB 软件调试标记为“完成部分”，但没有保存对应的 gdbserver 命令、目标程序或 GDB 会话日志。因此本基线采用保守表述：

| 能力 | 基线状态 |
| --- | --- |
| USB OTG/USB 通信 | **[已验证]** |
| ADB 路线 | **[已验证]**（母库记录） |
| gdbserver 完整调试会话 | **[待验证]**（缺少可复核日志） |
| Kernel KGDB UART | **[待验证]**（母库记录为待启用） |
| TCP/IP + gdbserver | **[当前推测]**（基于千兆网口能力，尚未实验） |

---

## 9. K3调试链分析

### 9.1 最终目标链路

```text
VS Code
   ↓
ARD
   ↓ GDB/MI
GDB
   ↓ GDB Remote Protocol
OpenOCD
   ↓ JTAG
K3 RISC-V Debug Module
   ↓
StarryOS Kernel
```

### 9.2 当前总体判断

**[待验证]** 以下完整链路目前尚未建立：

```text
ARD
   ↓
Host GDB
   ↓
GDB Remote Server
   ↓
K3 COM260
   ↓
StarryOS
```

### 9.3 已确认的证据

| 证据 | 状态 | 能够说明的范围 |
| --- | --- | --- |
| K3 COM260 有调试相关接口和 JTAG SEL | **[官方资料确认]** | 板级设计考虑了调试/路由选择 |
| U-Boot SPL 有 `setup_debug_jtag_on_mmc1_pins()` | **[已验证]**（源码检查） | SoC 支持 MMC1/JTAG 引脚复用 |
| MMC1 DAT3/2/1/0 对应 TDI/TDO/TMS/TCK | **[已验证]**（源码检查） | 存在一组 JTAG 信号复用关系 |
| DTB 有 `riscv,debug-v1.0.0` | **[已验证]**（设备树检查） | 存在 Debug Module 描述 |
| trigger-module 有 hcontext/mcontext/scontext | **[已验证]**（设备树检查） | 设备树描述了相关 trigger context |
| `riscv-openocd` 通用支持存在 | **[已验证]**（已有资料检查） | 存在通用工具，不代表支持 K3 |

### 9.4 尚未确认的关键点

| 项目 | 状态 |
| --- | --- |
| JTAG 实际引脚位置 | **[待验证]** |
| 是否需要飞线或转接板 | **[待验证]** |
| JTAG SEL 具体设置方法 | **[待验证]** |
| JTAG 电压 | **[待验证]** |
| Probe 型号和兼容性 | **[待验证]** |
| TAP ID | **[待验证]** |
| IR length | **[待验证]** |
| reset sequence | **[待验证]** |
| hart 数量及枚举 | **[待验证]** |
| 安全限制 | **[待验证]** |
| OpenOCD 真板连接 | **[待验证]** |
| GDB remote server | **[待验证]** |

### 9.5 OpenOCD 当前缺口

已有：

```text
riscv-openocd
```

尚缺：

```text
k3.cfg
k3-board.cfg
```

预期配置内容：

- TAP ID；
- IR length；
- reset sequence；
- target 配置；
- hart 数量。

**[当前推测]** OS 级调试更可能由 OpenOCD/JTAG/RISC-V Debug Module 提供 halt、resume、寄存器、内存和断点能力，而不是优先在 StarryOS 中增加 GDB stub。该路线必须经过真板验证后才能升级为已支持。

---

## 10. K3接口分类

| 接口类型 | 物理/逻辑接口 | 用途 | 状态 |
| --- | --- | --- | --- |
| UART Debug | 12 Pin 的 UART0_RXD、UART0_TXD、GND | 查看 BootROM/OpenSBI/U-Boot/StarryOS 日志，输入 U-Boot 命令，使用 StarryOS shell | **[已验证]** |
| USB OTG | USB 3.0 Type-C | fastboot、固件升级、USB Gadget、ADB/软件通信 | **[官方资料确认]**；fastboot 和 USB 通信 **[已验证]** |
| JTAG Debug | K3 SoC 复用调试路径 | OpenOCD/GDB 硬件级调试 | 路由依据 **[官方资料确认]**；实际连接 **[待验证]** |

### 10.1 12 Pin 边界说明

12 Pin 属于调试相关接口，但公开引脚定义中确认的是：

```text
UART Debug
Reset
Download
Power Control
LED
```

12 Pin 定义中没有 TCK、TMS、TDI、TDO、TRST、SRST。

因此本文档冻结以下结论：

> 12 Pin 不是已确认的 JTAG 接口。JTAG 通过 K3 SoC 复用调试路径实现，具体引脚和选择方式仍需确认。

### 10.2 三种模式不可混淆

```text
Boot SEL
   └── 决定 UFS、SD、SPI NAND、SPI NOR 启动路径

Download SEL
   └── 决定 USB Download 或 UART Download

JTAG SEL
   └── 决定普通复用功能或 JTAG 调试路径
```

---

## 11. 当前正确技术路线

### 11.1 暂不作为第一路线的方向

以下方向当前没有足够证据支持优先实施：

- 继续大量修改 StarryOS 增加调试功能；
- 优先给 StarryOS 增加 kernel GDB server/stub；
- 自行模拟 GDB 调试协议。

这不表示后续绝不需要修改 StarryOS，而是当前缺少“必须先修改”的验证依据。

### 11.2 冻结的实施路线

```text
K3 + StarryOS 运行环境
   ↓
确认 JTAG 物理路径
   ↓
OpenOCD 识别 Debug Module 和 hart
   ↓
建立 GDB remote
   ↓
加载同次构建的 StarryOS ELF/DWARF
   ↓
验证寄存器、内存、断点、单步
   ↓
修改 ARD attach backend
   ↓
ARD 接管真板调试
```

### 11.3 用户态与 OS 级调试路线

用户程序路线：

```text
ARD
   ↓
GDB
   ↓
gdbserver
   ↓
StarryOS用户程序
```

OS 级目标路线：

```text
ARD
   ↓
GDB
   ↓
OpenOCD
   ↓
JTAG
   ↓
StarryOS Kernel
```

项目最终目标偏向 OS 级路线。用户态路线不能替代 kernel early boot、异常现场和内核态调试。

该判断参考了母库记录的《2024操作系统比赛文档》星光板经验：

```text
U-Boot启动OS
   ↓
OpenOCD/JTAG
   ↓
GDB
   ↓
调试器控制OS
```

该经验只作为路线参考，不代表 K3 已复现同一调试链。

---

## 12. 后续实施计划

### 12.1 项目阶段

| Phase | 内容 | 当前状态 |
| --- | --- | --- |
| Phase 0 | K3 硬件运行环境 | **[已验证]** 完成 |
| Phase 1 | StarryOS K3 适配、UFS、rootfs | **[已验证]** 完成 |
| Phase 2 | ARD 架构与需求分析 | **[已验证]**（源码分析）完成 |
| Phase 3 | K3 JTAG/OpenOCD 硬件调试链 | 进行中，核心步骤 **[待验证]** |
| Phase 4 | ARD 真板接入 | **[待验证]**，未开始 |

### 12.2 Phase 3 实施顺序

#### 阶段 A：硬件调试链

不修改 StarryOS，先确认 JTAG 硬件链。

目标：

```text
OpenOCD
   ↓
K3
```

验收日志目标：

```text
riscv debug module detected
hart detected
```

母库中还记录了以下期望日志形式：

```text
Info : RISC-V Debug Module
Info : Examined RISC-V core
Info : RISC-V Hart found
```

以上均为验收目标，不是当前已获得日志。

#### 阶段 B：裸 GDB 连接

脱离 ARD，先验证 GDB：

```bash
riscv64-unknown-elf-gdb starryos
```

```gdb
target remote localhost:3333
info registers
```

验收：能够读取目标寄存器。

#### 阶段 C：符号调试

验证断点：

```gdb
break trap_vector_base
```

或者：

```gdb
break riscv_trap_handler
```

验收：符号能够解析，断点能够命中。

#### 阶段 D：ARD 接入

最后修改 ARD attach backend：

```text
ARD
   ↓
GDB
   ↓
OpenOCD
```

### 12.3 调试构建规范

运行镜像与调试符号必须来自同一次 build：

```text
运行：starryos.uimg / starryos.bin
调试：starryos ELF
```

普通 `starryos.bin` 不适合直接提供 GDB 符号。调试 ELF 需要确认包含：

```text
.symtab
.debug_info
.debug_line
```

母库记录的构建配置方向：

```text
DWARF=y
```

或者：

```text
-Cdebuginfo=2
-Cstrip=none
```

以上调试构建尚未完成 K3 真板验证。

### 12.4 验证 Checklist

#### K3 启动

- [x] StarryOS 启动
- [x] shell 正常
- [x] UFS 正常

#### ELF

- [ ] K3 调试 ELF 存在
- [ ] DWARF 存在
- [ ] 符号加载正常

#### OpenOCD

- [ ] Probe 识别
- [ ] hart 识别
- [ ] halt/resume 正常

#### GDB

- [ ] registers
- [ ] memory
- [ ] breakpoint
- [ ] continue

#### ARD

- [ ] attach
- [ ] breakpoint
- [ ] step
- [ ] thread

---

## 13. TODO列表

### 13.1 硬件

| TODO | 状态 | 需要记录的结果 |
| --- | --- | --- |
| 确认 JTAG 实际引脚 | **[待验证]** | TCK/TMS/TDI/TDO、位置、连接图 |
| 确认 JTAG SEL | **[待验证]** | strap/GPIO、进入和退出调试模式的方法 |
| 确认电压 | **[待验证]** | I/O 电平及 Probe 兼容范围 |
| 确认 Probe | **[待验证]** | 调试器、型号、接口、转接板 |
| 确认是否需要飞线 | **[待验证]** | 板端连接方式 |

Probe 候选仅作为待选项记录，均未确认兼容：

- J-Link；
- FT2232/FT4232；
- DAPLink。

### 13.2 OpenOCD

| TODO | 状态 |
| --- | --- |
| 记录 Ubuntu 版本 | **[待验证]** |
| 记录 OpenOCD 版本 | **[待验证]** |
| 确认安装方式：apt、源码编译或官方 binary | **[待验证]** |
| 获取 TAP ID | **[待验证]** |
| 获取 IR length | **[待验证]** |
| 确认 reset sequence | **[待验证]** |
| 确认 hart 数量 | **[待验证]** |
| 建立 `interface/k3.cfg` | **[待验证]** |
| 建立 `target/k3.cfg` 或 `k3-board.cfg` | **[待验证]** |

OpenOCD 环境记录表：

| 项目 | 内容 |
| --- | --- |
| Ubuntu 版本 | 待填写 |
| OpenOCD 版本 | 待填写 |
| 安装方式 | 待填写 |
| 调试器 | 待填写 |
| 型号 | 待填写 |
| 接口 | JTAG |
| 电压 | 待填写 |
| 转接板 | 待填写 |

### 13.3 GDB 与 ELF/DWARF

| TODO | 状态 |
| --- | --- |
| 生成与运行镜像同次构建的 StarryOS ELF | **[待验证]** |
| 确认 `.symtab` | **[待验证]** |
| 确认 `.debug_info` | **[待验证]** |
| 确认 `.debug_line` | **[待验证]** |
| 确认 kernel 符号加载地址 | **[待验证]** |
| `target remote localhost:3333` | **[待验证]** |
| `info registers` | **[待验证]** |
| memory 访问 | **[待验证]** |
| kernel 断点 | **[待验证]** |
| 单步与 continue | **[待验证]** |
| 多 hart 映射 | **[待验证]** |

### 13.4 ARD

| TODO | 状态 |
| --- | --- |
| attach backend 支持已有 remote target | **[待验证]** |
| 增加 qemu/openocd backend 选择 | **[当前推测]**（设计方向） |
| 真板 attach | **[待验证]** |
| breakpoint/step/thread 验证 | **[待验证]** |
| StarryOS task awareness | **[待验证]** |

### 13.5 风险清单

| 风险 | 当前应对方向 | 状态 |
| --- | --- | --- |
| JTAG 没有可用引出路径 | 继续核对硬件资料、原理图和板端连接 | **[待验证]** |
| OpenOCD 不支持 K3 | 调查并建立 K3 target 配置 | **[当前推测]** |
| ELF 无调试符号 | 使用 DWARF 调试构建 | **[当前推测]** |
| 运行地址与符号地址不匹配 | 调查并调整 symbol load | **[待验证]** |
| 多 hart 状态混乱 | 第一阶段先按单 hart 验证 | **[当前推测]** |
| StarryOS task 对 GDB 不可见 | 后续增加 task awareness | **[当前推测]** |

---

## 14. 附录

### 14.1 关键文件与路径

| 内容 | 路径 |
| --- | --- |
| K3 构建配置 | `os/StarryOS/configs/board/spacemitk3-com260kit.toml` |
| K3 DTS | `os/StarryOS/configs/board/spacemit-k3-com260-ifx.dts` |
| K3 DTB | `os/StarryOS/configs/board/spacemit-k3-com260-ifx.dtb` |
| 标准复现 uImage | `target/riscv64gc-unknown-none-elf/release/starryos.uimg` |
| 当前验证 BIN | `target/riscv64gc-unknown-linux-musl/release/starryos.bin` |
| axfs-ng 修改目录 | `os/arceos/modules/axfs-ng` |
| devfs 修改目录 | `os/StarryOS/kernel/src/pseudofs/dev` |
| 预期 OpenOCD interface 配置 | `interface/k3.cfg` |
| 预期 OpenOCD target 配置 | `target/k3.cfg` |

### 14.2 标准复现构建与启动命令

```bash
cargo starry build \
--config os/StarryOS/configs/board/spacemitk3-com260kit.toml
```

```bash
# U-Boot
fastboot -l 0x180000000 -s 0x04000000 usb 0
```

```bash
# Host
fastboot stage \
target/riscv64gc-unknown-none-elf/release/starryos.uimg
```

```bash
# U-Boot
bootm 0x180000000
```

### 14.3 当前 ARD_Deploy 真板启动命令

```bash
# U-Boot：接收 kernel
fastboot -l 0x140000000 -s 0x02000000 usb 0
```

```bash
# Host：上传 kernel
fastboot stage \
target/riscv64gc-unknown-linux-musl/release/starryos.bin
```

```bash
# U-Boot：接收 DTB
fastboot -l 0x138000000 -s 0x00800000 usb 0
```

```bash
# Host：上传 DTB
fastboot stage \
os/StarryOS/configs/board/spacemit-k3-com260-ifx.dtb
```

```bash
# U-Boot：启动
booti 0x140000000 - 0x138000000
```

### 14.4 U-Boot 环境命令

```bash
setenv bootdelay -1
saveenv
```

作用：禁止 U-Boot 等待。

该设置不等价于自动启动 StarryOS。

### 14.5 已验证命令

```bash
ls /dev/k3_airunner
```

结果：

```text
/dev/k3_airunner
```

母库还记录 USB Download 可解释 TitanTools/Fastboot 的工作路径；本文档仅将实际使用过的 fastboot 流程列为已验证，不扩展 TitanTools 的验证范围。

### 14.6 待验证的 OpenOCD/GDB 命令

以下命令是后续实验目标，不是已验证结果：

```bash
openocd -f k3.cfg
```

```bash
riscv64-unknown-elf-gdb starryos
```

```gdb
target remote localhost:3333
info registers
break trap_vector_base
break riscv_trap_handler
```

### 14.7 避免重复调查

| 问题 | 当前基线答案 |
| --- | --- |
| StarryOS 如何在 K3 启动 | `fastboot stage` + `booti`；外部复现流程为 `bootm` |
| K3 是否支持 UFS | 支持，且当前 UFS rootfs 已验证 |
| rootfs 在哪里 | UFS GPT 分区 |
| 12 Pin 是不是已确认 JTAG | 不是 |
| Type-C 是不是 JTAG 调试口 | 不是，主要用于 OTG、升级和软件通信 |
| JTAG 是否存在 | 有官方路由依据和源码复用依据，实际连接待验证 |
| 是否需要先改 StarryOS | 当前不需要优先修改 |
| ARD 下一步是什么 | 先完成 JTAG/OpenOCD/GDB remote 验证 |

### 14.8 当前基线结论

> **[已验证]** K3 COM260 Kit 已成功运行 StarryOS，启动链、UFS、GPT、Ext4 rootfs、用户空间、shell 和 `/dev/k3_airunner` 已完成验证。  
> **[官方资料确认]** K3 COM260 存在调试相关设计和 JTAG SEL。  
> **[当前推测]** K3 SoC 的 JTAG 复用和 RISC-V Debug Module 描述可作为 OpenOCD/GDB 硬件调试路线的基础。  
> **[待验证]** JTAG 实际引脚、Probe、电压、OpenOCD 配置、GDB attach、ELF/DWARF、断点、单步和 ARD 真板接入均未完成。  
> 当前第一优先级是建立 K3 JTAG + OpenOCD + GDB Remote 调试链，而不是继续无依据地增加 StarryOS 调试接口。

### 14.9 母库认知修正记录

| 早期记录 | V1.0 冻结结论 |
| --- | --- |
| 12 Pin 可能同时承载 UART/JTAG | 12 Pin 公开定义只确认 UART、Download、Reset、Power Control 和 LED；不能作为已确认 JTAG 接口 |
| JTAG Probe 直接连接 12 Pin | 该连接图已被后续完整引脚定义否定；JTAG 应按 SoC 复用路径继续调查 |
| K3 JTAG 已确认 | 只确认 JTAG SEL、复用源码和 Debug Module 描述；真板连接仍待验证 |
| ADB + gdbserver 已验证 | USB/ADB 路线按母库保留为已验证；gdbserver 完整会话因缺少日志保守列为待验证 |
