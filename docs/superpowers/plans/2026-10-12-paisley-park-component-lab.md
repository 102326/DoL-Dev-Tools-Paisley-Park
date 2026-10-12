# Paisley Park 5.0 Mac 先行原型

范围：4.0.1 `cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1` 与 UI 2.5 `1cf35e901cbb7c78aebc0555d40bb10c6eca6dfc` 的独立 clone。旧 ACT4 工作区已按用户追加授权删除；UI 2.6、全局 GER/Store、全局 Skill 与正式分支保持原状；仅本地提交。

1. UI 单独 component-lab HTML/App/Vite 配置直接 import Toolbar/GameButton/正式样式。必要时仅提取共享 cu utilities，保持 production CSS 顺序；不启动 main/startShop。
2. 三个真实 props 场景和内存回调、占位 aria-controls 目标；报告手动 narrow/compact 与真实宽度接线分别覆盖，不伪造游戏状态。
3. UI 生成小型版本化 source index：Git revision、dirty、明确相关文件 byte SHA、相对候选、角色与有限回调来源。Lab owned host 提供组件/实例 clue，HMR 更新后刷新或报告 stale。
4. Dev Tools 可选 Soft & Wet 的本地 Source Link Recipe：显式 root/index/clue，校验路径与摘要、old revision/同 HEAD dirty 负例，给出匹配/过期/未知和独立证据限度。无新 Inspector/Runtime。
5. 实际 Chrome + Playwright 检查场景、回调、键盘、几何及源码/样式 HMR；记录 cold/iteration 时间。验证中文/空格路径与非 root cwd、仅 loopback/限定 fs，以及只关闭本轮进程。
6. 复跑相关类型/构建/单元，核对普通 ZIP 清单无 Lab/index/maps；只修实际 Mac Python/启动接缝。Windows/Android/真实游戏标明未验收。
7. 本地报告/两个提交/限定 Git bundle，隐私检查。不推送、PR、Tag 或 Release。

验收：一个真实组件联合证明 Lab 可用与 Source Link 确实能消费，负例不阻止 Debug。缺设备不阻断 scoped Done；不是完整 5.0 或自动修复验收。
