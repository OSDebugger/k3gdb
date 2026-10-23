# ARD + K3 StarryOS N Host-DWARF 帮助教程

本教程面向第一次使用 ARD、StarryOS 和 K3 COM260 的开发者，介绍如何启动已有 OS、使用 `sleep 1` 触发定时 Future，并查看执行历史、Observer Tree 和暂停快照。

本教程统一使用 **N Host-DWARF** 基线。ARD 仓库不提供完整固件、rootfs 或 N 工作区，请先准备已经在自己的板卡上验证过的启动环境。

本文依据当前工作区的脚本和 UI 整理，仅完成源码、ELF 和离线校验，尚未执行本轮真板启动或 GDB/OpenOCD 连接。因此，下文中的“应看到”均为实际操作时的检查目标，历史材料不代表本轮验证结果。

需要分别确认以下四件事：

- StarryOS 启动成功。

- 白名单加载成功。

- 运行事件实际产生。

- 异步关系具有足够的验证证据。

## 0. 准备环境与终端

### 0.1 环境要求

需要准备：

- Linux 主机。

- K3 COM260 开发板。

- 已验证的 J-Link、JTAG 和 UART 连接。

- 匹配的 N Host-DWARF 工作区。

- VS Code，版本不低于 1.80。

- Node.js、npm、Python 3.10+ 和 Git。

- GNU `readelf`。

- 支持 RISC-V 和 Python 的 `gdb-multiarch`。

外部 N 启动入口还依赖配置中指定的固件、BIN/FIT/DTB、fastboot、mkimage、minicom，以及已经准备好的 UFS rootfs。ARD 不负责下载或生成这些资产。

### 0.2 工作区目录

ARD 仓库与 N 工作区是两个不同的目录：

```text
任意主机目录/
├── async-debug/                         ← ARD 仓库，VS Code 窗口 A
│   ├── .vscode/launch.json              ← 启动扩展开发宿主
│   ├── src/
│   ├── async_rust_debugger/
│   └── testcases/k3-starryos/
│
└── K3_COM260_StarryOS_N_HOST_DWARF/      ← N 工作区，VS Code 窗口 B
    ├── .vscode/launch.json              ← 第 4 步创建，启动 ARD 调试会话
    ├── boot_n_candidate.sh
    ├── scripts/
    ├── configs/candidate.json
    ├── artifacts/starryos.elf
    ├── manifest.json
    ├── source/                         ← 与 ELF 匹配的 OS 和依赖源码
    └── temp/                           ← 白名单、ARD 日志与最新快照
```

### 0.3 窗口与终端分工

| 窗口或终端 | 职责 |
| --- | --- |
| 主机终端 T1 | 启动 N，通过 UART/minicom 操作 StarryOS Shell，执行 `sleep 1` |
| 主机终端 T2 | 运行已验证的 OpenOCD，通过 J-Link 连接 K3 JTAG |
| VS Code 窗口 A | 打开 ARD 仓库，按 F5 启动扩展开发宿主 |
| VS Code 窗口 B | 打开 N 工作区，运行 ARD 调试会话，操作 Async Inspector |

整体操作顺序为：

1. T1 启动 StarryOS，进入 UART Shell。

2. T2 启动 OpenOCD。

3. 窗口 A 启动扩展开发宿主。

4. 窗口 B 打开 N 工作区并连接目标。

5. 生成白名单，选择目标函数，设置 Trace Root 和用户断点。

6. 恢复目标，在 T1 执行 `sleep 1`。

7. 命中断点后查看 History、Observer Tree 和 Snapshot。

### 0.4 端口说明

| 端口 | 服务 | 用途 |
| --- | --- | --- |
| `3333` | GDB remote | ARD 的 `remote` 设置为 `localhost:3333` |
| `4444` | OpenOCD Telnet | OpenOCD 管理接口 |
| `6666` | OpenOCD Tcl | OpenOCD Tcl 接口 |

### 0.5 设置路径并检查工作区

在主机终端设置真实路径。以下占位路径均需替换：

```bash
export ARD_REPO=/absolute/path/to/async-debug
export STARRYOS_WORKSPACE=/absolute/path/to/K3_COM260_StarryOS_N_HOST_DWARF
export K3_OPENOCD_LAUNCHER=/absolute/path/to/existing-verified/start_openocd.sh
cd "$ARD_REPO"
command -v gdb-multiarch
python3 testcases/k3-starryos/verify_n_workspace.py \
  --workspace "$STARRYOS_WORKSPACE" \
  --openocd-launcher "$K3_OPENOCD_LAUNCHER"
```

该检查只读取 ELF、manifest 和源码身份，并输出 JSON。

A 检查未通过时，应先解决身份或配置不匹配的问题。即使 A 为 `PASS`，B–G 和整体状态仍可能是 `PENDING`，不能据此认定真板调试已经通过。

完整文件契约可查看 ARD 仓库中的 `testcases/k3-starryos/README.md`。

修改工作区位置后，还需要核对 `candidate.json` 内的绝对路径、固件依赖和板卡身份约束；这些内容不会自动迁移。

### 0.6 创建本轮记录目录

每次实际调试前，创建独立记录目录，并备份已有白名单、日志和快照：

```bash
cd "$ARD_REPO"
mkdir -p "$ARD_REPO/temp"
RUN_DIR=$(mktemp -d "$ARD_REPO/temp/k3-n-debug-XXXXXXXX")
mkdir -p "$RUN_DIR/before" "$RUN_DIR/after"
for item in poll_functions.txt poll_functions_grouped.json ardb.log ardb_snapshot.json debug; do
  if [ -e "$STARRYOS_WORKSPACE/temp/$item" ]; then
    cp -a "$STARRYOS_WORKSPACE/temp/$item" "$RUN_DIR/before/"
  fi
done
printf '本次记录目录：%s\n' "$RUN_DIR"
```

`RUN_DIR` 用于归档本轮证据；N 工作区的 `temp/` 则是 ARD 实际读写白名单、日志和最新快照的位置。

分析时应区分旧事件与本轮新增事件，避免把历史日志当作当前运行结果。

## 1. 启动 StarryOS：终端 T1

按照已经验证的板卡流程进入 BootROM Recovery，并确认 UART 没有被其他串口程序占用。

在前台交互终端进入 ARD 仓库根目录，执行：

```bash
sudo ./testcases/k3-starryos/boot_golden_flow.sh \
  --workspace /absolute/path/to/K3_COM260_StarryOS_N_HOST_DWARF
```

实际调用链为：

```text
boot_golden_flow.sh
  → k3_boot_state_machine.py --operation boot
  → <N 工作区>/boot_n_candidate.sh --image host-dwarf
  → <N 工作区>/scripts/candidate.py
```

包装器通过 `exec` 交接进程，保留外部入口的终端和退出状态，不复制启动状态机，也不追加 `--boot`、串口或超时参数。

当前 N 入口在未显式指定模式时，默认从 BootROM 开始启动并启用控制台。显式加入 `--boot` 会改变默认起点，因此不要自行补充该参数。

也可以直接运行 N 工作区的启动入口：

```bash
sudo /absolute/path/to/K3_COM260_StarryOS_N_HOST_DWARF/boot_n_candidate.sh \
  --image host-dwarf
```

**以上两种入口选择一种执行。**

正常情况下，应依次看到固件、U-Boot 和 StarryOS 的 UART 输出，最终检测到 Shell 提示符并记录：

```text
N_SHELL_READY
```

当前外部入口默认将 UART 记录和 `boot-result.json` 保存到：

```text
<N 工作区>/logs/<独立运行目录>/
```

随后脚本释放 UART，将控制台交给前台 minicom，并提示：

```text
[CONSOLE] UART released; minicom foreground. Press Enter for a fresh Shell prompt; Ctrl-A Q exits without reset.
```

此时按 Enter，确认出现新的 Shell 提示符。

T1 仍停留在 minicom 内、没有返回主机 Bash，属于正常交接。不要同时打开第二个串口读取器。退出 minicom 时，先按 `Ctrl-A`，再按 `Q`。

如果没有进入 Shell，检查本次运行目录中的：

- `host.log`

- `failure.json`

- `uart.raw`

- 控制台交接记录

N 启动过程可能正常写入可写 rootfs。本教程沿用已经准备好的启动资产和外部入口，不涉及重新刷写或构建流程。

Shell 可用表示 OS 已启动，后续仍需分别验证 ARD 连接、事件采集和异步关系。

## 2. 启动 OpenOCD：终端 T2

在独立终端 T2 中重新设置路径。T1 的环境变量不会自动传递到另一个终端。

```bash
export STARRYOS_WORKSPACE=/absolute/path/to/K3_COM260_StarryOS_N_HOST_DWARF
export K3_OPENOCD_LAUNCHER=/absolute/path/to/existing-verified/start_openocd.sh
cd /absolute/path/to/async-debug
./testcases/k3-starryos/start_openocd.sh
```

也可以使用显式参数：

```bash
./testcases/k3-starryos/start_openocd.sh \
  --workspace /absolute/path/to/K3_COM260_StarryOS_N_HOST_DWARF \
  --openocd-launcher /absolute/path/to/existing-verified/start_openocd.sh
```

配置解析时，Python 命令行参数优先于环境变量，环境变量优先于配置 JSON。

两个 Shell 包装器还会预先加载 `K3_CONFIG_FILE` 指定的文件，默认是存在时的 `config/baseline.env`。其中的赋值可能覆盖先前的 `export`，因此需要核对最终实际值。本地配置可参考 `config/baseline.env.example`。

`K3_OPENOCD_LAUNCHER` 必须指向：

- 已存在且可执行的外部启动文件。

- 已经验证可用于当前 K3/J-Link 环境的入口。

- 不指回 ARD 自身的包装器。

该变量不能填写带参数的命令字符串。当前包装器以单元素 argv 执行外部入口，不透传额外 OpenOCD 参数。

复用已经验证的 K3/J-Link 配置。当前示例约束为 cluster 0/core 0、100 kHz；OpenOCD 可执行文件和 Tcl 依赖也必须提前准备好。仓库 `openocd/` 下的配置仅供参考，包装器不会自动选择它们。

检查输出，确认 J-Link 和目标初始化完成，并出现类似监听信息：

```text
Listening on port 3333 for gdb connections
Listening on port 4444 for telnet connections
Listening on port 6666 for tcl connections
```

单独出现一行端口信息不足以证明全部初始化完成。

保持 OpenOCD 进程运行。同一设备只保留一个 OpenOCD 实例，后续由 ARD 管理 GDB，避免再连接第二个独立 GDB 客户端。

如果外部入口需要权限，沿用其已经验证的使用方式。使用 `sudo` 时，环境变量可能被清除，可优先使用显式路径参数。

## 3. 打开 ARD 双窗口环境

在主机终端进入 ARD 仓库：

```bash
cd /absolute/path/to/async-debug
npm install
npm run compile
code .
```

按以下顺序操作：

1. **窗口 A** 打开 ARD 仓库。在“运行和调试”中选择 **Extension Development Host**，按 F5。

2. 新出现的 **窗口 B** 是扩展开发宿主。在 B 中选择“文件 → 打开文件夹”，打开 N Host-DWARF 工作区根目录。

3. 确认 B 仍为扩展开发宿主，并已加载当前仓库的扩展。

可以在 B 的命令面板运行：

```text
Developer: Show Running Extensions
```

检查其中是否包含 **Async Rust Debugger**。命令面板还应提供 **Open Async Inspector**，调试配置应识别 `ardb` 类型。

如果 B 变成普通窗口，回到 A 重新启动扩展开发宿主。

两个窗口的配置职责如下：

| 配置位置 | 职责 |
| --- | --- |
| A：ARD 仓库的 `.vscode/launch.json` | 启动扩展开发宿主，通过 `npm: compile` 编译并加载当前扩展 |
| B：N 工作区的 `.vscode/launch.json` | 启动 OS 调试会话，连接 OpenOCD |

后续配置中的 `${workspaceFolder}` 必须指向 **B 当前打开的 N 工作区根目录**。

## 4. 创建 OS 调试配置

在窗口 B 的工作区根目录创建：

```text
.vscode/launch.json
```

如果该文件已经存在，先备份，再将下面的配置合并到 `configurations` 中，保留已有条目。

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "K3 StarryOS N Host-DWARF ARD",
      "type": "ardb",
      "request": "launch",
      "program": "${workspaceFolder}/artifacts/starryos.elf",
      "cwd": "${workspaceFolder}",
      "remote": "localhost:3333",
      "gdbPath": "/usr/bin/gdb-multiarch",
      "enableOsDebug": false
    }
  ]
}
```

### 4.1 字段说明

| 字段 | 用途与检查 |
| --- | --- |
| `type` | ARD 注册类型，固定为 `ardb` |
| `request` | `launch` 启动 ARD 管理的 GDB，并连接已经运行的远端服务 |
| `program` | N 的 Host-DWARF ELF，必须匹配板上镜像与源码，不能使用 BIN/FIT 替代 |
| `cwd` | 当前 N 工作区；白名单等文件使用该会话工作区的 `temp/` |
| `remote` | 设置为 `localhost:3333` |
| `gdbPath` | 使用 `command -v gdb-multiarch` 返回的实际路径，注意字段中的大写 `P` |
| `enableOsDebug` | 保持 `false`，本流程不启用额外 OSStateMachine 或地址空间切换配置 |

PATH 配置可靠时，`gdbPath` 也可以填写：

```json
"gdbPath": "gdb-multiarch"
```

仓库示例中的 `stopOnEntry: false` 未在当前 launch schema 中声明，remote launch 路径也不消费该字段，因此这里省略。

该配置没有启动 OS/OpenOCD 的 `preLaunchTask`。**ARD 不会自动启动 StarryOS 或 OpenOCD。**

### 4.2 启动调试会话

在 B 的“运行和调试”中选择：

```text
K3 StarryOS N Host-DWARF ARD
```

按 F5，检查：

- Debug Console 显示连接完成。

- GDB Python 输出 `[ARD] installed. Commands: ...`。

- Call Stack 和线程信息可用。

- Async Inspector 自动打开。

如果 Inspector 未打开，可运行：

```text
Open Async Inspector
```

初次连接时，目标可能停在 idle、汇编或没有源码的固件位置。后续应通过定时 Future 的用户断点，确认能够映射到匹配的 Rust 源码。

配置白名单和读取快照时，应让目标处于暂停状态。若目标仍在运行，在 B 中点击 Pause。

### 4.3 设置源码路径映射

如果迁移工作区后，DWARF 仍记录旧路径，在 **B 的 Debug Console** 中设置映射：

```text
set substitute-path /original/workspace/source /absolute/path/to/K3_COM260_StarryOS_N_HOST_DWARF/source
```

该命令只修正路径，不能修复 ELF 与源码版本不一致。依赖 crate 的旧路径可能也需要分别映射。

当前 `launchRequest` 没有将 `autorun` 转交给 remote 启动流程，因此本教程直接使用 Debug Console 设置映射。

主机检查器的 `--source-prefix-map` 也不会自动配置 GDB。

## 5. 生成、筛选并加载异步白名单

### 5.1 通过 Inspector 生成白名单

在 B 的暂停会话中点击：

```text
Gen Whitelist
```

该操作调用 `ardb-gen-whitelist`，读取当前 ELF 在 GDB 中的函数信息，并生成：

| 文件 | 内容 |
| --- | --- |
| `temp/poll_functions_grouped.json` | 按 crate 分组的函数元数据，包括 `name`、`file`、`line`、`kind` 等 |
| `temp/poll_functions.txt` | 运行时实际使用的平面白名单 |

Gen 默认生成空白名单，接下来还需要选择 crate 并点击 Apply。

在 Whitelist 区域：

1. 按名称找到并展开 `ax_task`。

2. 取消其他 crate 的勾选。

3. 勾选 `ax_task`。

4. 勾选 **Async only**。

5. 点击 **Apply Whitelist**。

`ax_task` 可能位于 Your Crates，也可能位于 Framework / Library，以实际分组为准。

**Async only** 在点击 Apply 时才生效，筛选条件为：

```text
kind == "async"
```

它不会即时隐藏列表中的 Sync 条目。

当前 UI 为每个符号提供 **Trace** 和 **Locate**，没有逐函数启用复选框。Apply 按 crate 筛选，因此结果通常多于两项。

出现以下通知时：

```text
Whitelist updated: 1 crate(s) enabled
```

还应继续检查 Debug Console 的加载摘要：

```text
[ARD] whitelist updated: ... symbols, observers=...
```

并打开实际的 `poll_functions.txt`，核对写入内容与探针安装情况。

手写 Future 的 `poll` 依赖 grouped 文件中的 async 分类元数据，因此应保留 `poll_functions_grouped.json`。

### 5.2 收敛为两符号场景

本教程使用以下两个完整 GDB 符号，观察定时等待：

```text
ax_task::future::time::sleep_until::{async_fn#0}
ax_task::future::time::{impl#1}::poll
```

对应关系为：

```text
sleep_until::{async_fn#0}
    → TimerFuture::poll
```

为了只跟踪这两项：

1. 保持目标暂停。

2. 备份刚生成的 flat/grouped 文件。

3. 在 B 中编辑 `temp/poll_functions.txt`。

4. 将内容改为上面的两行，不添加编号或引号。

5. 保留 grouped 元数据。

6. 在 B 的 Debug Console 执行：

```text
ardb-load-whitelist
```

该命令使用原生 GDB 格式，不需要添加 `-exec` 前缀。

文件 watcher 可能已经自动重载，显式执行该命令便于核对结果。最小配置应报告：

```text
exact=2 prefix=0 observers=2
```

同时确认文件路径属于当前 N 工作区。

探针数量还需要结合后续真实命中判断。尚未解析或仍处于 pending 的位置，不能计为有效采集。

改为两行后，不要再次点击 Apply 或 Gen，否则白名单会重新生成。

可以在主机终端核对文件：

```bash
cat "$STARRYOS_WORKSPACE/temp/poll_functions.txt"
```

保留完整名称中的 `{async_fn#0}`、`{impl#1}` 和泛型参数。`TimerFuture::poll` 是便于阅读的简称，不能直接替换实际白名单符号。

对于复杂泛型或含空格的符号，应使用无编号的完整单行格式，并与当前 GDB 的 `info functions` 输出核对。本教程使用的两项不涉及复杂泛型空格问题。

### 5.3 睡眠调用路径与目标选择

N 源码中的睡眠路径为：

```text
sys_nanosleep / sys_clock_nanosleep          同步 syscall 入口
  → sleep_impl                             同步函数
    → block_on(interruptible(sleep(dur)))
      → ax_task::future::time::sleep         async fn
        → sleep_until                       async fn
          → TimerFuture(key).await           手写 Future::poll
```

用户态 `sleep` 实际走哪个 syscall，取决于 rootfs 中的程序，应通过本轮停点或事件确认。

| 候选 | 源码与选择依据 |
| --- | --- |
| `ax_task::future::time::sleep_until::{async_fn#0}` | 位于 `source/os/arceos/modules/axtask/src/future/time.rs`，源码显式 await TimerFuture；历史 N 日志存在该完整符号的 poll-entry 事件，选为 Trace Root |
| `ax_task::future::time::{impl#1}::poll` | 同文件中的 `impl Future for TimerFuture`；历史 grouped 标为 async，RuntimeEvent 和 Snapshot 均有记录，选为观测子节点 |
| `starry_kernel::syscall::task::schedule::sys_clock_nanosleep` | 位于 `source/os/StarryOS/kernel/src/syscall/task/schedule.rs`，是普通 `pub fn`，ELF 中存在，但不是异步函数 |
| `starry_kernel::syscall::task::schedule::sleep_impl::<fn() -> core::time::Duration>` | 同文件中的普通函数；此处为 `nm -C` 解码名称，不保证等同于 GDB 可直接接受的命名 |
| `starry_kernel::task::wait_on_pollset<T>` | 位于 `source/os/StarryOS/kernel/src/task/mod.rs`，是异步函数，用于 PollSet 等待；尚未确认属于本例的定时路径，因此不作为替代目标 |

本次只读核对的 N ELF SHA256 为：

```text
c1e2904f86f0540a8f955dbdaf764e7938b86eaf83672a3262055e855edc486e
```

对应静态映射为：

| 目标 | 地址 | DWARF 源码位置 |
| --- | --- | --- |
| TimerFuture poll | `0xffffffff802d8506` | `time.rs:119` |
| sleep_until closure | `0xffffffff8022983a` | `time.rs:136` |

以上地址和行号只适用于该 ELF，重编译后应重新查询。

`nm` 中的 `{closure#0}` 与 GDB/grouped 中的 `{async_fn#0}` 命名可能不同，白名单以当前 GDB 生成结果为准。

2026 年 10 月 12 日的历史 N 日志中，存在上述两类事件及关联 admission `ALLOW`；历史 Snapshot 中也存在 TimerFuture 非空快照。这些材料支持选择该定时场景，但不能代替本轮 `sleep 1`、关系可信性或 enter/exit 完整性的验证。

## 6. 选择 Trace Root 并设置停点

### 6.1 选择 Trace Root

在 Whitelist 中找到：

```text
ax_task::future::time::sleep_until::{async_fn#0}
```

点击右侧 **Trace**。

随后检查：

- Trace Root 区显示该完整名称。

- 通知中出现 `Trace root: ...`。

- Debug Console 中出现 `[ARD] trace root: ...`。

Trace 负责选择显示根节点，白名单负责安装运行时观测探针，两者需要分别完成。点击 Trace 不会恢复目标执行。

### 6.2 检查状态与内部断点

在 B 的 Debug Console 执行：

```text
ardb-trace-status
maint info breakpoints
```

检查：

- `data.roots` 包含所选根。

- `runtime_probe_count` 非零。

- 内部断点的位置与启用状态符合预期。

普通 VS Code Breakpoints 列表或 `info breakpoints` 可能不显示内部断点。

`enabled` 属于另一套 machine trace 控制状态，不能单凭该布尔值判断 UI Trace 是否成功，应结合白名单加载、有效探针和真实事件判断。

### 6.3 设置用户可见断点

当前白名单使用的 `RuntimeEventBP` 为内部断点：

```text
internal=True
```

命中后通常采集事实并自动继续，不会触发用户可见的 DAP `stopped`。

因此，执行板上命令前，还需要设置一个用户断点，用于暂停目标并读取现场。

## 7. 在 UART 执行 `sleep 1`

### 7.1 设置 TimerFuture 用户断点

在 B 的暂停会话中，点击 TimerFuture 条目的 **Locate**，定位到：

```text
source/os/arceos/modules/axtask/src/future/time.rs
```

在 `TimerFuture::poll` 函数体中设置源码断点，优先选择：

```rust
with_current(|r| r.poll(&self.0, cx))
```

所在的可执行行。

断点位置以当前 ELF 的 DWARF 映射为准。本次静态核对的函数入口映射为第 119 行，但不应直接套用于其他构建版本。

也可以在 B 的 Debug Console 查询并设置符号断点：

```text
info line 'ax_task::future::time::{impl#1}::poll'
break 'ax_task::future::time::{impl#1}::poll'
info breakpoints
```

GDB `break` 命令使用单引号保护 Rust 符号；白名单文件中不添加这些引号。

确认源码断点已经验证后，再继续执行。

### 7.2 恢复目标并触发板上命令

在 B 中点击 Continue 或按 F5。

然后切换到 **T1 的 StarryOS UART Shell**，执行：

```sh
sleep 1
```

该命令必须在板上 Shell 中执行。主机 Bash 或 Debug Console 中的 `sleep 1` 不会触发板上的用户进程。

窗口 B 负责控制执行和采集，T1 负责板上命令交互。

命中用户断点后，板上 Shell 暂时不返回提示符属于正常现象。调试开销和人为暂停也会使实际经过的时间超过一秒。

### 7.3 保存停点与事件证据

命中后检查：

- B 的线程和调用栈显示暂停。

- 用户断点高亮。

- PC 与源码映射落在目标函数或相符位置。

在 Debug Console 执行：

```text
p/x $pc
info line *$pc
bt
info threads
```

保存 PC、源码位置、物理调用栈和线程信息。

如果需要协议级证据，另行保存 DAP `stopped` 记录。界面截图只能证明可见的暂停状态。

随后查看 N 工作区 `temp/ardb.log` 的本轮新增部分，核对目标符号对应的：

- `runtime_event create`

- `classify result`

- admission `ALLOW`

并与 `ardb-get-history-tree` 返回的本次事件对应。

还应核对函数、`thread_id`、`cid`、Future 地址和当前调用栈。GDB 的 `thread_id` 不自动等于 OS task ID。如果日志无法确认任务归属，应记录“任务上下文未确认”。

用户断点可能停得较早，入口采集尚未提供完整上下文。此时应先保留现场，再通过受控 Continue 和下一次命中补充证据。

要比较完整 enter/exit，必须允许相应 poll 返回；一直停在入口不会产生对应 exit。

## 8. 查看 History、Observer Tree 和 Snapshot

当前工具栏包含：

- **Gen Whitelist**

- **Snapshot**

- **Observer**

- **Clear History**

当前版本没有独立 History 按钮，也没有事件计数详情表或通用导出按钮。完整 History 通过 GDB 命令读取。

以下命令均在 **B 的 Debug Console** 中、目标暂停时执行。

### 8.1 History：累计执行事实

执行：

```text
ardb-get-history-tree
```

返回 JSON 的主要标识为：

```text
type: history_tree
graph_kind: call_graph
```

重点检查：

| 字段 | 检查内容 |
| --- | --- |
| `nodes` | 是否包含目标函数节点 |
| `edges` | 是否存在预期执行关联及其证据 |
| `roots` | 当前历史图根节点 |
| `events` | 本轮事件、进入与退出信息 |
| `counts` | 累计统计 |
| `enter_count`、`exit_count` | 节点进入和退出计数 |
| `first_enter_event`、`last_enter_event` | 节点事件范围 |

History 保存白名单允许的真实执行事实，但函数级合并节点不等于单个 Future 实例的完整生命周期。

查找 sleep_until、TimerFuture 两个节点及其边，并检查事件中的父子关联来源，不能只依据树形缩进判断关系。

将完整 JSON 复制保存为：

```text
<RUN_DIR>/after/history-1.json
```

不要包含 GDB 提示符。

如果需要比较计数：

1. 允许当前 poll 返回。

2. 在 T1 再次执行 `sleep 1`。

3. 重新命中或暂停目标。

4. 再次读取 History。

5. 保存为 `history-2.json`。

6. 比较相同节点的 enter/exit 计数和事件范围。

长会话中的事件列表有保留上限，因此累计计数可能大于当前可见事件条数。

**两次对比之间不要点击 Clear History。** 当前实现会清空累计图并清除 Trace Root，随后需要重新选择 Trace。该按钮也不等于卸载全部观测断点。

### 8.2 Observer Tree：选择根后的累计子树

点击 **Observer** 切换并刷新。

Observer 模式下，非 entry 的停止也会自动刷新。返回的 `observer_root` 指明当前根节点；只有已经进入 History 的实际命中节点才能组成树。

尚无事件时，即使已经选择 Trace Root，Observer 仍可能为空。

UI 显示：

- ASYNC/SYNC。

- 函数名称。

- 节点层级。

- 点击节点后的源码定位。

地址、计数和完整关系证据需要读取 JSON：

```text
ardb-get-observer-tree
```

重点检查：

- `observer_root`

- `roots[].children`

- 节点 `source`

- `relation_annotations`

父子关系的详细来源继续查看 History 的 `edges` 和 `events`。

将输出保存为：

```text
<RUN_DIR>/after/observer-1.json
```

看到：

```text
sleep_until → TimerFuture::poll
```

说明累计执行树中存在该关联。若关联来源为 `recent_root_thread` 的 `call_edge_accepted`，它支持执行关联，但不足以单独证明 Future 身份与当前 await 关系已经完整验证。证据不足时，应保留 unknown 或未验证状态。

### 8.3 Snapshot：当前暂停时刻

保持目标暂停，点击 **Snapshot**，手动采集并切换到快照树。

Snapshot 不会随着停点变化自动重新采集。继续运行后，旧图可能仍然显示；下一次停止时需要再次点击 Snapshot。

该操作也不会把当前快照写入累计 History。

在 Debug Console 执行：

```text
ardb-get-snapshot
```

检查 envelope：

| 字段 | 含义或检查目标 |
| --- | --- |
| `ok` | 本次请求状态 |
| `data.empty` | 是否为空快照 |
| `data.thread_id` | 采集线程 |
| `data.generation` | 本次采集代次 |
| `data.async_path` | 当前异步路径 |

逐节点检查：

- `function`

- `future_address`

- `future_type`

- `source`

- `active`

- `poll`

- `relation_from_parent`

将这些字段与当前 PC、物理调用栈和任务上下文对应。非空快照、有效地址和可解析类型分别是独立事实，关系可信性仍需要检查对应证据。

当前 UI 主要展示树，详细值应从 JSON 中读取。点击快照节点定位的是该次采集记录的源码位置。

### 8.4 手写 Future 的 poll 状态

应区分：

```text
poll.status: "unsupported"
```

与：

```text
empty: true
```

TimerFuture 是手写 Future，没有编译器生成的 `__state` 字段，因此 poll 状态可能不受支持；同时仍然可以存在：

- `empty=false`

- 正确的 Future 类型与地址。

- 源码位置。

- active 信息。

应保留 `unsupported` 原值，不将其改写为 Ready 或 Pending。

若出现类型 unknown/null、缺少地址或空快照，应分别检查暂停位置、优化与 DWARF、符号解析和实际上下文。

### 8.5 归档本轮结果

ARD 会更新 N 工作区中的最新诊断文件，例如：

```text
temp/ardb_snapshot.json
temp/debug/last_snapshot_v1_envelope.json
```

这些文件不能替代 History 和 Observer 的 JSON。读取快照命令本身也会更新快照，因此连续采集应分别归档。

结束本轮后，在仍保留 `RUN_DIR` 变量的主机终端执行：

```bash
for item in poll_functions.txt poll_functions_grouped.json ardb.log ardb_snapshot.json debug; do
  if [ -e "$STARRYOS_WORKSPACE/temp/$item" ]; then
    cp -a "$STARRYOS_WORKSPACE/temp/$item" "$RUN_DIR/after/"
  fi
done
```

每轮使用独立记录目录，另外保存：

- 启动运行目录。

- OpenOCD 日志或引用位置。

- ELF SHA256 与源码身份。

- PC、调用栈和线程输出。

- History、Observer JSON。

- 用户断点与停止证据。

- 各检查项的成功、失败或待确认状态。

完成阶段验证后，记录一份阶段汇报日志，说明本轮确认了什么、证据保存在哪里，以及还有哪些问题待验证。

## 9. 常见问题与检查方法

| 现象 | 检查位置 | 处理方法 |
| --- | --- | --- |
| remote 连接未建立 | B 的 `remote`、T2 监听日志 | 使用 `localhost:3333`，确认 OpenOCD 完成初始化 |
| 启动后没有 Shell 提示符 | T1、启动日志、minicom 交接记录 | 交接完成后按 Enter，检查串口占用和启动状态 |
| B 中没有 `ardb` 类型或 Inspector | B 的窗口类型、Running Extensions、A 编译输出 | 从 A 重新启动开发宿主，确认加载当前仓库扩展 |
| 找不到调试配置或 ELF | B 打开的目录、`.vscode/launch.json` | 打开 N 根目录，检查 `${workspaceFolder}/artifacts/starryos.elf` |
| 源码位置与预期不符 | `info line *$pc`、manifest、ELF SHA、源码身份 | 先确认版本匹配；只有路径迁移时使用 `set substitute-path` |
| 白名单符号不完整 | grouped/flat、`info functions` | 使用完整 GDB 名称；含空格的符号采用无编号整行格式，再重新加载 |
| Trace Root 已显示但没有事件 | 白名单摘要、trace-status、内部断点、本轮日志 | 确认探针有效，恢复目标后在 UART 触发命令 |
| 内部探针命中后程序继续运行 | 用户断点、内部断点属性 | 内部观测通常自动继续，需要另设用户可见断点 |
| 同步函数未进入 History | grouped 的 `kind`、Async only、探针上下文 | 确认未被过滤且实际调用；本教程优先使用两项已知异步目标 |
| History 有节点但 Observer 缺少预期关联 | `observer_root`、精确函数名、History edges/events | 重新选择正确根，检查实际关联证据并保存缺边情况 |
| Snapshot 为空或类型不可用 | 停点、`async_path`、DWARF、Future 指针与任务上下文 | 在目标 poll 停点重新采集，分别检查上下文和类型解析 |
| Snapshot 的 poll 状态为 unsupported | `poll.status`、`empty`、类型与源码字段 | 保留手写 Future 的状态限制，同时记录其他可用信息 |
| GDB 或 J-Link 被重复连接占用 | 现有终端、OpenOCD 连接日志 | 确认后结束自己重复启动的实例，保留一个 OpenOCD 和一个 ARD GDB |
| History 计数未按预期增加 | 两次事件范围、是否清空历史、是否停在入口 | 允许 poll 返回后重复板上 sleep，分别核对 enter 和 exit |

## 10. 按顺序复现检查表

- [ ] 已准备并验证 N Host-DWARF 工作区、板卡连接、启动依赖和 OpenOCD 入口。

- [ ] 主机 checker 的 A 检查通过，已记录 ELF 和源码身份，并明确 B–G 仍需本轮验证。

- [ ] 已创建独立记录目录，备份已有白名单、日志和快照。

- [ ] T1 已通过 N 启动入口进入 StarryOS Shell，minicom 交接正常。

- [ ] T2 的唯一 OpenOCD 实例已完成初始化。

- [ ] 已明确 `3333`、`4444`、`6666` 的用途。

- [ ] A 已打开 ARD 仓库、完成编译并启动扩展开发宿主。

- [ ] B 已确认加载当前扩展，并打开 N 工作区根目录。

- [ ] B 的 `.vscode/launch.json` 已配置实际 ELF 和 GDB 路径。

- [ ] ARD 已连接 `localhost:3333`，会话可暂停，Inspector 可打开。

- [ ] 已执行 Gen Whitelist → 选择 ax_task → Async only → Apply。

- [ ] 已保留 grouped 元数据，将 flat 收敛为两行完整符号并显式加载。

- [ ] 已核对探针安装情况与有效位置。

- [ ] 已选择 sleep_until 为 Trace Root。

- [ ] 已设置有效的用户源码断点或完整符号断点。

- [ ] B 已恢复执行，T1 已在板上 Shell 执行 `sleep 1`。

- [ ] 用户断点已命中，已保存 PC、源码映射、调用栈和暂停证据。

- [ ] 已确认本轮对应 RuntimeEvent 与 admission `ALLOW`。

- [ ] 已读取并保存 History、Observer JSON，检查实际父子关联及证据来源。

- [ ] 如需比较计数，已允许 poll 返回并重复 sleep，分别保存前后结果。

- [ ] 已在暂停时重新采集 Snapshot，核对地址、类型、源码和 active 信息。

- [ ] 已区分 poll 状态 unsupported 与空快照。

- [ ] 已归档本轮证据，分别标记成功、失败和待确认项。

- [ ] 已记录阶段汇报日志，未将局部成功直接等同于完整 await 关系验证通过。

## 11. 实现依据

以下路径均相对于 ARD 仓库根目录，用于核对具体实现行为。

| 功能 | 源码或配置 |
| --- | --- |
| K3 文件契约与使用说明 | `testcases/k3-starryos/README.md` |
| 启动委托与参数解析 | `testcases/k3-starryos/k3_boot_state_machine.py` |
| 工作区配置解析与主机校验 | `testcases/k3-starryos/verify_n_workspace.py` |
| StarryOS 启动包装器 | `testcases/k3-starryos/boot_golden_flow.sh` |
| OpenOCD 启动包装器 | `testcases/k3-starryos/start_openocd.sh` |
| 本地环境配置示例 | `testcases/k3-starryos/config/baseline.env.example` |
| OS 调试配置示例 | `testcases/k3-starryos/launch.json.example` |
| 扩展开发启动配置 | `.vscode/launch.json` |
| 调试配置 schema | `package.json` |
| 扩展入口与文件 watcher | `src/extension.ts` |
| Inspector 按钮和请求 | `src/webview/asyncInspectorPanel.ts` |
| crate、Async only 与 Trace 前端 | `src/webview/asyncInspector.js` |
| 会话工作区 temp 路径 | `src/debugAdapter.ts` |
| remote launch、Debug Console 与 DAP | `src/gdbDebugSession.ts` |
| 白名单生成 | `async_rust_debugger/static_analysis/gen_whitelist.py` |
| 白名单、探针、Trace、History、Observer 与 Snapshot | `async_rust_debugger/runtime_trace.py` |
