# ARD-K3-StarryOS硬件部署

本仓库属于日志仓库，用于探索和验证：**如何将 ARD（Async Rust Debugger，异步 Rust 调试器）应用到 K3 CoM260 Kit 开发板，并建立从 ARD 到硬件操作系统 OS 的完整源码级调试链。**

项目的阶段进展、调试过程和真板验证记录在：

[ARD 开发日志链接](https://osdebugger.github.io/k3gdb/)

---

## 项目目标

整体调试链为：

```text
ARD
 ↓
GDB
 ↓
OpenOCD
 ↓
J-Link / JTAG
 ↓
K3 RISC-V Debug Module
 ↓
StarryOS
```

其中：

- **ARD** 提供面向 Rust 异步程序的调试能力；
- **GDB** 负责源码级断点、单步、寄存器和程序状态调试；
- **OpenOCD** 把 GDB 的调试命令转换成实际的 JTAG 调试操作；
- **J-Link / JTAG** 建立电脑与 K3 CPU 之间的硬件调试通道；
- **StarryOS** 当前运行在 K3 真板上的目标操作系统。

---

## ARD 异步调试器

ARD （Async Rust Debugger）是一个面向 **Rust 异步程序** 的调试器。

[ARD 项目仓库链接](https://github.com/OSDebugger/async-debug)

传统调试器通常更关注：

```text
线程
函数调用
栈帧
源码断点
```

但 Rust 的 `async / await` 程序在运行时会被拆分成 Future、状态机以及多次暂停和恢复的执行过程，因此仅依靠普通调用栈并不容易还原真实的异步执行关系。

ARD 的目标就是在传统 GDB 调试能力之上，进一步提供以下能力：

- Rust 异步任务状态观察
- Future 关系分析
- 异步执行历史
- Runtime Event Graph
- Snapshot / History
- 异步程序源码级调试

---

## K3 CoM260 Kit

SpacemiT K3-CoM260 开发者套件基于 RISC-V 架构，将 8 核通用 CPU 与 8 核 AI CPU 集成于核心模组与参考载板中，是一套面向端侧 AI 的完整开发与验证平台。

[K3 CoM260 Kit 产品用户使用指南](https://www.spacemit.com/community/document/info?lang=zh&nodepath=hardware/eco/k3_com260/com260_user_guide.md)

当前实验环境中，K3 CoM260 Kit 是运行 StarryOS 的硬件平台，通过 JTAG 建立 ARD 调试链。

---




