import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ARD 开发日志',

  description: 'ARD 项目每周工作汇报与开发日志',

  base: '/k3gdb/',

  themeConfig: {
        sidebar: [
      {
        text: 'ARD 开发日志',
        items: [
          {
            text: '2026-09-02 K3 / StarryOS / ARD 进展',
            link: '/2026-09-02-K3-StarryOS-ARD进展'
          },
          {
            text: '2026-08-04 融合 OS 调试的异步调试器关键问题总结',
            link: '/2026-08-04-融合OS调试的异步调试器关键问题总结'
          },
          {
            text: '2026-07-27 ARD 融合分支架构',
            link: '/2026-07-27-ARD融合分支架构'
          },
          {
            text: '2026-07-26 K3 阶段验证信息',
            link: '/2026-07-26-K3阶段验证信息'
          }
        ]
      }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    }
  }
})