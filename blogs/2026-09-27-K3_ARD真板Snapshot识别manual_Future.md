# K3 + ARD 调试进展：真板 Snapshot 已能识别 manual Future

这一阶段继续推进 ARD 在 K3 COM260 + StarryOS 真板上的异步调试能力。这次把重点放到了 ARD 真正关心的问题上：

**当 StarryOS 中的异步任务真实运行时，ARD 到底能不能识别正在执行的 Future？**

目前这个问题已经有了一个比较明确的真板验证结果。

## 1. K3 调试链现在基本稳定了

目前 K3 的基础调试链已经可以稳定工作。

StarryOS 通过完整启动链进入系统：

```text
BootROM
↓
Debug FSBL / SPL
↓
OpenSBI
↓
Full U-Boot
↓
UFS
↓
StarryOS
```

之后通过 J-Link 和 OpenOCD 接入 K3 的 RISC-V 核心，再由 `gdb-multiarch` 连接：

```text
localhost:3333
```

ARD 则直接使用这条 GDB 调试链。

之前已经验证过：

```text
PC → Rust 函数
PC → Rust 源文件
源码断点
源码级 next
```

因此目前 K3 这边不再把重点放在“GDB 能不能连上”，而是开始验证 ARD 自己的运行时异步观测能力。

为了避免以后每次重新手动拼启动流程，这次也把 K3 相关流程整理进了：

```text
testcases/k3-starryos/
```

其中包括启动状态机、OpenOCD 配置、launch 示例以及 baseline 配置模板。

自动启动状态机目前已经真实跑通过：

```text
BOOTROM_READY
→ SPL_READY
→ FULL_UBOOT_READY
→ UFS_READY
→ KERNEL_LOADED
→ DTB_LOADED
→ STARRYOS_READY
```

也就是说，K3 这部分已经从早期的手工实验流程整理成了一个可重复使用的 testcase

## 2. Observer 和 Snapshot 的区别终于在真板上看清楚了

这次测试主要使用了 StarryOS 中的两个函数：

```text
ax_task::future::time::sleep_until::{async_fn#0}

ax_task::future::time::{impl#1}::poll
```

ARD 的 Observer Tree 能够观察到真实运行关系：

```text
sleep_until::{async_fn#0}
        ↓
ax_task::future::time::{impl#1}::poll
```

这里顺便把两个概念重新明确了一下。

**Observer Tree** 更像运行历史。

它记录：

```text
哪些异步函数执行过
谁调用了谁
执行了多少次
当前是否还 active
```

而 **Snapshot Tree** 表示的是：

> 当前 GDB 停下来的这一刻，仍然活跃的异步执行路径。

所以之前有时候点击 Snapshot 得到：

```text
"empty": true
```

并不一定代表 Snapshot 坏了。

如果 GDB 恰好停在普通同步代码中，而当前没有活跃的异步 poll，那么 Snapshot 本来就应该为空。

这次我们直接在：

```text
ax_task::future::time::{impl#1}::poll
```

上打断点，再触发 `sleep 1`。

断点命中以后立刻获取 Snapshot，终于稳定看到了当前正在执行的 Future。

## 3. 一个比较典型的问题：manual Future

StarryOS 里的 `TimerFuture` 并不是普通的 `async fn` 自动生成状态机，而是手动实现的 Future。

代码逻辑类似：

```rust
pub struct TimerFuture(TimerKey);

impl Future for TimerFuture {
    type Output = ();

    fn poll(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Self::Output> {
        ...
    }
}
```

这类 Future 和：

```rust
async fn foo() {
    ...
}
```

生成出来的 Future 有一个很重要的区别。

对于 compiler-generated async Future，Rust 编译器通常会生成类似：

```text
{async_fn_env#0}
```

这样的内部类型。

ARD 之前就是通过：

```text
{async_fn#0}
        ↓
{async_fn_env#0}
```

去寻找 DWARF 中的 Future 状态。

但 `TimerFuture` 是手写：

```rust
impl Future for TimerFuture
```

它根本不存在这个命名关系。

于是之前 K3 上虽然能捕获：

```text
ax_task::future::time::{impl#1}::poll
```

Snapshot 却只能得到：

```text
"future_type": null,
"future_type_source": "unknown"
```

以及：

```text
"error": "unsupported poll symbol"
```

简单来说就是：

> ARD 知道这个 poll 正在执行，但不知道这个 poll 背后的 Future 到底是什么类型。

## 4. 这次改成直接从 DWARF 里找真实类型

这次没有继续根据函数名字猜类型，而是换了一条更稳妥的路线。

在 poll 执行现场，GDB/DWARF 本身能够看到：

```text
self: Pin<&mut T>
```

那么 ARD 就尝试从这个 `self` 中恢复真实的：

```text
T
```

对于当前 K3：

```text
T = ax_task::future::time::TimerFuture
```

这里还碰到了一个挺典型的小坑。

不同 DWARF / Rust wrapper 布局中，`Pin` 内部指针字段不一定都叫：

```text
__pointer
```

K3 当前实际使用的是：

```text
pointer
```

所以后来把这类已知 wrapper 字段做了兼容，例如：

```text
__pointer
pointer
data
inner
value
```

不过这里仍然保持了一个比较重要的原则：

**不能因为想把 Snapshot 填满，就随便猜。**

因此恢复出来的 `self` 地址还必须和 ARD 运行时已经记录的：

```text
future_address
```

严格一致。

如果地址对不上，就直接判定恢复失败，而不是继续猜类型。

## 5. K3 真板最终结果


断点：

```text
ax_task::future::time::{impl#1}::poll
```

实际命中：

```text
os/arceos/modules/axtask/src/future/time.rs:113
```

此时 Observer 中：

```text
sleep_until::{async_fn#0}
        ↓
ax_task::future::time::{impl#1}::poll
```

其中 `TimerFuture::poll` 为：

```text
active = yes
currentlyInLatestSnapshot = true
```

随后 Snapshot 得到了关键结果：

```json
{
  "function": "ax_task::future::time::{impl#1}::poll",
  "future_address": "0xffffffc2f8e409c8",
  "future_type": "ax_task::future::time::TimerFuture",
  "future_type_source": "dwarf",
  "poll": {
    "sequence": 1,
    "state": null,
    "status": "unsupported",
    "error": "There is no member named __state."
  },
  "active": true
}
```

这里最重要的其实只有两行：

```text
future_type = ax_task::future::time::TimerFuture
future_type_source = dwarf
```

这说明 ARD 已经不只是知道：

> “有一个 poll 正在运行。”

而是能够进一步知道：

> “现在正在 poll 的真实 Future 是 `TimerFuture`。”

而且这个类型不是根据函数名硬编码出来的，而是来自 DWARF 调试信息。

## 6. `state = null` 不是失败

这里还有一个很容易误解的地方。

当前结果中仍然存在：

```text
"state": null,
"status": "unsupported",
"error": "There is no member named __state."
```

这个结果目前是合理的。

ARD 当前 Snapshot 中的：

```text
poll.state
```

指的是 compiler-generated async Future 中的内部状态机 discriminant，也就是 DWARF 中的：

```text
__state
```

它**不是**：

```text
Poll::Pending
```

或者：

```text
Poll::Ready
```

`TimerFuture` 是手写 Future，本身没有 compiler-generated `__state`，所以：

```text
future_type 能识别
```

并不意味着：

```text
一定存在 __state
```

因此这次没有为了让界面“看起来更完整”去读某个随便的字段，也没有直接把 RISC-V 返回寄存器里的值塞进 `state`。

如果以后确实需要观察：

```text
Pending / Ready
```

应该把它作为：

> 某一次 poll 调用的返回结果

单独设计运行时观测逻辑，而不是和 Future 内部状态机混在一起。

## 7. 当前阶段结论

到这里，K3 这一阶段总结：

> ARD 已在 K3 COM260 + StarryOS 真板环境中验证 manual Future 的真实 poll 捕获，并能够基于 DWARF 从运行时上下文恢复 concrete Future type。

目前已经验证的是：

```text
manual Future poll
        ↓
运行时捕获
        ↓
DWARF self
        ↓
Pin<&mut T>
        ↓
TimerFuture
```

但还不能说：

```text
所有 manual Future 的内部状态都已经支持
```

因为手写 Future 并不存在统一的 `__state` 结构。

这也是当前实现刻意保留的边界。


K3 + StarryOS 到 ARD 的底层接入现在可以暂时作为冻结基线。

