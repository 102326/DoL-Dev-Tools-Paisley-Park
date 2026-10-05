# DoL Dev Tools: Paisley Park — 历史：1.5.2：实战Skill指引统一交付

本次将已收口的Skill与文档改进纳入源码包，避免从旧1.5.1包重装时退回旧指引。CLI/Collector/Integration实现、Schema、默认采集和退出语义沿用1.5.1；仅更新包版本与说明。旧ZIP保持冻结。

- 标准能力够用时优先复用；不足、需要灵活查询或直接CDP/ADB/Playwright明显更便宜时保留直接路径。
- 首次零面积、拦截或目标歧义时暂停派发，按缺失问题选择selector-health、hitboxes或overlays，核对原可见控件与事件语义，限定等待；不自动选父节点或重试unknown结果。
- 从受影响唯一DOM范围开始，定位截断原因并按问题收窄；现场结构优先于可选Integration解释。
- 直接探针复用项目记录，保留来源、时间、阶段和动作结果；探索稳定且有复用收益时再提取最小Journey，项目拥有业务断言。
- 优先使用已核对的ADB和测试运行器支持的已有浏览器；版本来源分列，未知根因保持unknown。

这些是按问题选择的提示，不是固定流程。完整指引见[Skill](../.agents/skills/dol-dev-tools-paisley-park/SKILL.md)，重装流程见[SKILL_INSTALL](SKILL_INSTALL.md)，验证见[VALIDATION](VALIDATION.md)。

本轮Done：新包与Git原文一致、文档链接闭合、不含私有现场资料；安装生成最新Skill、从工作区外定位和启动、旧版与Skill备份保留。复用此前源码和现场证据，只验证本轮打包/安装风险。

Not validated：提示对未来任务的实际收益以及更多设备/Mod覆盖。Known limitations：GameVersion unknown原因仍未定位，原Console缓存/DOM范围限制保持；本轮没有消除或掩盖这些限制。
