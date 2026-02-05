# 真机调试无法滚动问题说明

## 现象
在 iPhone 14 Plus 真机调试中，复利计算器页面无法滚动，但开发者工具中正常。

## 主要原因
- 页面使用 `navigationStyle: custom` + 自定义导航栏。
- 页面内的布局容器受到全局样式或高度限制影响，导致页面高度被锁死，真机无法滚动。

## 解决方案（已采用）
使用 `scroll-view` 明确承载页面内容滚动，避免依赖页面级滚动行为：

- `pages/compound/index.wxml`
  - 内容包进 `<scroll-view class="compound-scroll" scroll-y>`
- `pages/compound/index.wxss`
  - `.compound-container` 使用 `height: 100vh`
  - `.compound-scroll` 使用 `height: calc(100vh - 44px - env(safe-area-inset-top))`
  - 通过 `margin-top` 让出自定义导航栏高度

该方案在真机调试中恢复了正常滚动。

## 辅助排查
- 在页面顶部增加 `Build` 标签，确认真机加载的是最新代码。

## 结论
在自定义导航栏 + 真机调试场景下，建议优先使用 `scroll-view` 管理页面滚动，避免页面高度被全局样式或系统渲染差异锁死。
