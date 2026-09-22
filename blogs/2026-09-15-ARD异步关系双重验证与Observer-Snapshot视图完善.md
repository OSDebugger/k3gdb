# ARD 异步关系双重验证与 Observer / Snapshot 视图完善

前面阶段已经把 ARD 的异步观察链路在 K3 + StarryOS 上跑通：白名单能够生成，真实 RuntimeEvent 能被记录，History 中可以形成节点和关系，Snapshot 能恢复当前异步路径，Observer Tree 也能够按照选定 Trace Root 展示历史执行子树。

所以这一阶段，继续解决两个问题：

**第一，历史上已经成立的异步关系，到了下一次暂停时还算不算“当前有效”？**

**第二，当前 Snapshot 既然已经能够恢复异步状态，能不能像 Observer 一样直接以树形方式展示，而不是只看 JSON？**

除此以外，本轮还把 OSMachine 的 remote launch / attach 接入重新补齐，并处理了一类 poll 退出以后调试上下文残留的问题。

最终，本阶段已经完成：**关系建立验证 + 当前有效性重验证的双重验证链路、Poll Activation Token 执行上下文管理、Observer / Snapshot 统一树形视图，以及 OSMachine remote launch / attach 自动化回归。**

本阶段工作围绕 ARD 的两条主线展开：

| 主线 | 当前目标 |
|---|---|
| 异步调试 | 提高异步关系恢复的准确性，并区分历史关系和当前状态 |
| OS 调试 | 保留并继续验证 OSMachine 的 kernel / user 状态管理能力 |

这一阶段主要工作集中在 ARD 自身的运行时关系判断、调试状态管理和 Async Inspector 展示层。

---

## OSMachine remote launch / attach 接入

前面的 OSMachine 主要围绕操作系统调试状态、断点组以及 kernel / user 切换进行工作。

这一阶段先把它重新接入当前 async-integration 主线中的 remote launch / attach 路径。

增加了一个显式开关：

```text
enableOsDebug
```

当它关闭时，ARD 继续按照普通 Rust / remote 调试流程运行；当它开启时，才初始化 OSMachine 相关配置。

同时把 OS 调试需要的配置继续接入 launch / attach，例如：

```text
program_counter_id
first_breakpoint_group
kernel_memory_ranges
user_memory_ranges
border_breakpoints
breakpoint group mapping
```

来让当前异步调试主线仍然能够正确启动原来的 OS 调试状态机。

针对这部分新增了专门的测试：

```text
src/test/testOSDebugLaunch.ts
```

测试覆盖：

- remote launch + OS debug
- remote launch 不启用 OS debug
- 普通 local launch
- 非法 OS debug 配置
- remote attach
- attach 配置错误
- debug-ready 后的状态初始化

最终结果：

```text
OS-debug launch/attach: 7 scenarios PASS
```

这一步说明：**当前 async-integration 主线仍然保留了 OSMachine 的启动入口，并且普通调试与 OS 调试两种路径可以区分。**


---

## 从“一次验证”到“双重验证”

前面的异步关系恢复 ARD 已经有第一层 Runtime Relation Validation：

```text
候选异步关系
        +
真实 child poll 执行
        +
Future 类型 / 地址
        +
执行上下文
        ↓
关系验证
        ↓
Validated Relation
```

只有运行时证据能够支持时，才确认：

```text
Future A → Future B
```

这一层解决的是：

**“这条异步等待关系是否真实发生过？”**

但是继续验证以后，又遇到了一个很具体的 bug：

**一次 poll 已经物理返回，但 TLS 里还残留着旧的 active 信息，导致 Snapshot 误以为这个 activation 仍然处于 Current 状态。**后来引入了 activation token，用 (store_generation, origin_tid, CID, poll_occurrence) 去精确标识一次 poll invocation，把已经退出的 activation 正确退休掉。所以本次把这个已经存在、而且确实解决真实问题的机制提炼出来了，同时对这套机制做得更严谨了一些。

就是在时间 T1：

```text
Future A
    ↓ await
Future B
```

这条关系已经经过真实运行证据验证，所以 History 中保存：

```text
A → B
```

但程序继续运行到时间 T2 时，A 已经结束这次等待，或者开始等待另一个 Future C。

实际上，历史上成立并不意味着当前仍然成立。

因此在已有第一阶段关系验证基础上，又增加了：

**Current Revalidation（当前有效性重验证）。**

当程序再次暂停并请求 Snapshot 时，不再直接把历史关系当成当前状态。

新的流程是：

```text
历史上已经验证成立的关系 A → B

        +

重新读取 Parent 当前状态

        +

当前等待对象

        +

当前 poll / activation 信息

        +

已保存的运行时验证证据

        ↓

Current Revalidation

        ↓

当前仍成立 / 当前证据不足或已失效
```

如果重新验证仍然通过：

```text
Snapshot:
A → B
```

如果重新验证失败：

```text
Snapshot:
不再把 A → B 作为当前有效 await 关系
```

但是原来的历史事实不会被删除：

```text
History Store:
A → B
```

因此现在 ARD 中明确形成了：

```text
Historical Validity
        ≠
Current Validity
```


这就是本阶段形成的“双重验证”：

| 阶段 | 回答的问题 |
|---|---|
| 第一次 Runtime Relation Validation | 这条关系是否真实发生过？ |
| 第二次 Current Revalidation | 这条历史关系现在是否仍然成立？ |

Snapshot 查询仍保持 read-only，不会因为查看当前状态而反向制造 History 事件、增加 poll 次数或修改关系数据库。

---

## Poll Activation Token

在 Current Revalidation 的真实并发验证过程中，发现了一类运行上下文残留问题。

原来一次 poll 进入以后，ARD 会把当前异步执行节点压入线程局部的活动栈。

正常情况下：

```text
poll enter
↓
活动状态建立
↓
poll return
↓
活动状态退出
```

但在调试环境下，GDB 的 FinishBreakpoint 可能因为执行路径变化而进入 out_of_scope。

这时程序实际上已经离开对应 poll，但旧活动状态没有被精确清掉，就可能继续影响后续 Snapshot。

真实测试中曾出现：

```text
poll 已经返回
↓
物理调用栈中已经没有该 poll
↓
TLS 中仍然残留旧活动
↓
Current 仍然错误认为它处于 active
```

因此本阶段为一次实际观察到的 poll 动态执行建立：

```text
Poll Activation Token
```

当前 token 由：

```text
store_generation
+
origin thread id
+
CID
+
poll occurrence
```

组合得到。

它的作用不是给 Future 建立永久生命周期 ID，而是：

**区分一次调试观察域中的具体 poll 动态执行活动。**

于是退出时不再按照 CID 猜测“应该删除哪一个活动”，而是按照对应 token 精确退休：

```text
poll activation
↓
绑定 token
↓
正常 return / out_of_scope
↓
只退休对应 activation
```

同时 out_of_scope 只表示：

```text
当前活动状态失效
```

不会伪造：

```text
PollExit
call_exit
```

等正常历史执行事件。

这样可以避免为了清理 Current 状态，反而污染 History。

---

## Observer Tree 和 Snapshot Tree

完成 Current Revalidation 后，Snapshot 后端实际上已经能够恢复当前异步路径。

但原来的 Async Inspector 中，两种查看方式并不统一：

```text
Execution Graph / Observer
→ 树形展示

Snapshot
→ 主要输出 JSON
```

这一阶段把两者统一到了同一个树形显示区域。

最终界面概念确定为：

```text
             Async Inspector
                    │
        ┌───────────┴───────────┐
        │                       │
     Observer                Snapshot
        │                       │
        ▼                       ▼
 Observer Tree           Snapshot Tree
```

两个模式共用原来的：

```text
renderTree()
createTreeNode()
```

没有重新实现第二套独立 TreeView。

---

## 三类数据对象的区别

为了避免后续再把 History、Observer 和 Snapshot 混在一起，本阶段正式固定三种概念。

### History Store / Database

保存运行过程中累计产生的完整执行历史。

可以理解成：

```text
完整 Runtime History
```

它是底层历史数据来源。

---

### Observer Tree

Observer Tree 不是完整 History。

它根据用户选择的：

```text
ACTIVE_TRACE_ROOT
```

从 History Store 中投影出与该 Trace Root 有关的一棵历史观察子树。

数据链是：

```text
Observer Button
↓
ardb-get-observer-tree
↓
History Store
↓
按照 Trace Root 选取历史子树
↓
Observer Tree
```

所以 Observer 回答：**“以这个函数为观察根，之前运行过程中观察到了什么？”**

---

### Snapshot Tree

Snapshot Tree 来自当前暂停状态。

数据链是：

```text
Snapshot Button
↓
ardb-get-snapshot
↓
读取当前 Future / poll / awaitee
↓
Current Revalidation
↓
Snapshot Tree
```

所以 Snapshot 回答： **“程序现在这一刻仍然能够确认什么？”**

如果 Observer 中存在历史关系：

```text
A
└── B
```

但 Current Revalidation 已经失败，那么 Snapshot 不会为了让树“看起来完整”而继续补这条边。

可能显示成：

```text
A

B
```

也就是两个独立节点。

---

## 模式切换

现在 Async Inspector 中使用：

```text
[ Observer ] [ Snapshot ]
```

点击 Observer：

```text
切换 observer mode
↓
请求最新 Observer Tree
↓
刷新主树
```

点击 Snapshot：

```text
切换 snapshot mode
↓
获取当前 Snapshot
↓
Current Revalidation
↓
刷新同一个主树
```

同时处理了模式切换过程中一个容易出现的问题：

**旧请求返回得比较慢时，不能把用户刚切换的新模式覆盖掉。**

因此增加了请求编号和模式检查。

即使操作：

```text
Observer
→ Snapshot
→ Observer
→ Snapshot
```

连续快速切换，迟到的旧响应也不会重新覆盖当前显示。

---

## stopped 自动刷新

原来的 Observer Tree 会在非 entry 的 DAP stopped 事件发生以后自动刷新。

现在有两个模式以后，如果仍然无条件刷新 Observer，就会出现：

```text
用户正在查看 Snapshot
↓
程序停止
↓
界面突然自动切回 Observer
```

因此当前规则变成：

| 当前模式 | stopped 后行为 |
|---|---|
| Observer | 自动刷新 Observer Tree |
| Snapshot | 保持已经捕获的 Snapshot，不自动切回 Observer |

Snapshot 仍然采用手动刷新：

```text
再次点击 Snapshot
↓
重新读取当前状态
↓
生成新的 Snapshot Tree
```

这样能够明确区分“之前手动捕获的当前快照”和“新的暂停状态”。

---

## 自动化验证

Observer / Snapshot 统一以后，对相关功能进行了完整回归。

主要结果包括：

| 测试 | 结果 |
|---|---|
| TypeScript compile | ✅ PASS |
| Observer / Snapshot Unified Tree | ✅ 14 scenarios PASS |
| Current Revalidation | ✅ 15 tests PASS |
| Snapshot readonly 连续验证 | ✅ PASS |
| OSMachine StateMachine | ✅ 37 passed |
| OS Debug Flow | ✅ 28 passed |
| OSMachine remote launch / attach | ✅ 7 scenarios PASS |
| Stop Reason | ✅ 5 passed |
| MI Parser | ✅ 57 passed |
| Async-only Whitelist payload | ✅ 3 passed |
| Async-only Whitelist UI | ✅ PASS |
| Async-only Whitelist Python | ✅ 7 tests PASS |

其中 Snapshot readonly 还连续执行了多轮当前状态查询，确认：

```text
History events
Relation Store
poll count
TLS activity
call graph
```

不会因为读取 Snapshot 而发生额外修改，且目前自动化测试没有发现新的失败。

---

## 本阶段完成的工作与贡献

这一阶段主要完成了四件事。

1. **重新接通 OSMachine 的 remote launch / attach 入口。**  
   当前 async-integration 主线可以根据 enableOsDebug 选择是否初始化 OSStateMachine，并完成了 7 个 launch / attach 场景的自动化验证，为后续继续做 K3 kernel / user 状态切换验证保留了 OS 调试基础。

2. **形成异步关系的“双重验证”机制。**  
   在已有 Runtime Relation Validation 基础上增加 Current Revalidation：第一次验证用于确认关系是否真实发生，第二次验证用于判断同一历史关系在当前暂停时刻是否仍然成立，实现 Historical Validity 与 Current Validity 的分离。

3. **引入 Poll Activation Token 管理动态 poll 活动。**  
   通过观察域、线程、CID 和 poll occurrence 区分具体 poll 动态执行活动，在正常返回或 observer 失效时精确退休对应活动，避免旧 TLS / 调试上下文继续污染 Current 状态，同时不伪造 History 退出事件。

4. **把 Snapshot 从 JSON 查看推进为与 Observer 共用的树形视图。**  
   Async Inspector 现在具有 Observer / Snapshot 两种明确模式：Observer 展示 Trace Root 对应的历史观察子树，Snapshot 展示当前暂停时经过 Current Revalidation 的状态树。两者共用 renderer，但数据来源和语义保持独立，并补充了模式切换、迟到响应、stopped 自动刷新和 Clear History 的处理。

---

## 当前阶段结果

本轮结果汇总如下：

| 能力 | 状态 |
|---|---|
| OSMachine remote launch | ✅ PASS |
| OSMachine remote attach | ✅ PASS |
| 普通调试 / OS debug 路径区分 | ✅ PASS |
| Runtime Relation Validation | ✅ PASS |
| Current Revalidation | ✅ PASS |
| Historical / Current validity 分离 | ✅ PASS |
| Poll Activation Token | ✅ PASS |
| out_of_scope activation retirement | ✅ PASS |
| Snapshot read-only | ✅ PASS |
| Observer Tree | ✅ PASS |
| Snapshot Tree | ✅ PASS |
| Observer / Snapshot 共用 renderer | ✅ PASS |
| Observer / Snapshot 模式切换 | ✅ PASS |
| stale response 防护 | ✅ PASS |
| Observer stopped 自动刷新 | ✅ PASS |
| Snapshot stopped 保持手动快照 | ✅ PASS |
| Clear History / Snapshot 状态分离 | ✅ PASS |
| Observer / Snapshot 自动化回归 | ✅ PASS |

因此，本阶段已经把 ARD 继续推进到不仅能够判断一条历史异步关系当前是否仍然有效，还能够分别展示历史观察结果和当前状态结果。

也就是现在 ARD 不只回答：**“之前发生过什么？”**

还开始能够回答：**“现在仍然成立什么？”**

---