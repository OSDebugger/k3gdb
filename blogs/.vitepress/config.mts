import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'

export default withSidebar(
  defineConfig({
    title: 'ARD 开发日志',

    description: 'ARD 项目每周工作汇报与开发日志',

    base: '/k3gdb/',

    themeConfig: {
      search: {
        provider: 'local'
      },

      outline: {
        level: [2, 3],
        label: '本页目录'
      }
    }
  }),

  {
    documentRootPath: '/',

    excludeByGlobPattern: [
      'node_modules/**',
      '.vitepress/**',
      'assets/**',
      'temp/**',
      'index.md'
    ],

    sortMenusOrderByDescending: true,
    sortMenusByFileDatePrefix: true,

    useTitleFromFrontmatter: true
  }
)