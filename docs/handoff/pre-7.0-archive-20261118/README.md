# Gold Experience 7.0 以前的版本归档

2026-11-18。日常安装使用 [当前正式版本](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/latest)。本次整理以正式 7.2.0 源码 `a8b1dfa235c6ece17d10ef4a3f47c5f658832449` 为对照。

10 个旧 Release 加入历史标识，保留原正文、发布状态及 28 个附件。表中 ZIP 摘要来自 GitHub Release 资产元数据。复现或回退时，请下载对应 Release 中命名的工具 ZIP 并核对摘要。只有 Tag 的版本可从对应 Tag 取得 Git 源码。

| 历史版本 | 源码提交 | 原 ZIP SHA-256 |
| --- | --- | --- |
| [v6.1.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.1.0) | `cfd76a75e6c28efbbdcf447b25679cd9f257ef54` | `e4e5e84f874a92c170e040b97d7d21e1008e58405a37a1238b757ea21bf50ef4` |
| [v6.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.0.0) | `c98ac280f13e9f4820c919fcf97c8d9281a526e4` | `6cf6ae46d5a3a11310983d0c8b877c2218af871fd4290d062d6ba49b9fbf48b4` |
| [v5.1.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v5.1.0) | `fc52a6ce6c5f15a884f775d9473ae19e133a6987` | `0c3c462e5beaac4329e2d9ef5f08439868a08a79a7590398d4813c83c8d9bb25` |
| [v5.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v5.0.0) | `607d2807d8735233e986d048849d8b14b23c4f22` | `b987ec0086e61e652d2a05896a141bf5453999cdae8b4b9e05899ee144f02985` |
| [v4.0.1](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.1) | `cf405fdf132468a8ca9dbb8a3a2c7efbf8e874b1` | `47984daaeacdf8a15e7e9170f6f24880e2f5c1f200e4d0173f1004f42f81cf6c` |
| [v4.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.0) | `4be4cfc180ed4e7a4c21761a38ab829a3b827655` | `66b46b993d3c242c8373dd13f155ee5a547f89915dd55b9ea5beeb775777b8f4` |
| [v3.0.3](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v3.0.3) | `c5363060efdde8b724a5bbc8df3dd5140c32ca09` | `fd873a25be7ecba2b0f3d0eeef6ccd5cee619a464fa8210ceb45192c4a75437e` |
| [v3.0.2](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v3.0.2) | `d57aac2ac49c99746c091e0cc44faa2171b89ff5` | `0c799eff6abf862289b75bc65cd33883bfb6f69352fb8943e455442fb2158f77` |
| [v2.0.1](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v2.0.1) | `7c2b975b30338755a34aa61515c8b47efb59875b` | `189b402ca68824383c451bd7fa53bc8570bf301c175f6f07a4418c697ced1bac` |
| [v2.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v2.0.0) | `259880b385297c16a2e66c6b93688adfd698ec61` | `ddb3d28d7af7ac831a11828a71376cefc2dfc9ff57fc5a2f5affcfd1476c31fd` |
| [v1.5.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/v1.5.0) | `e3693116a16a6fb8972ac3ac78fbb069693ebe51` | — |
| [v1.4.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/v1.4.0) | `bc2c1062883fb1c91ac80c8da855d17a50bc87bc` | — |
| [v1.3.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/v1.3.0) | `e49a11cd0e8fc82ac99a8553c5857528d5ee66af` | — |
| [v1.2.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/v1.2.0) | `7aa9b2411f3625eae54ef0536c16413c96b63db3` | — |
| [v1.1.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/v1.1.0) | `cd0934cef0200ca1117ba97919b5a2d4f9aad9f5` | — |
| [v1.0.0](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/v1.0.0) | `3d3429d9d22bd7dd98ce5fb6bd195aee245288b0` | — |

## 旧测试分支

`test/paisley-park-5.1` 已下线。删除前独立从远端取回 `v5.1.0`，确认其解引用到 `fc52a6ce6c5f15a884f775d9473ae19e133a6987`，与删除前的分支头相同，且在 `main` 历史内。需要原分支名时，在已核对 `origin` 的项目克隆中执行以下命令。若分支名已被重新使用，先比较提交。

```sh
git fetch origin tag v5.1.0
git rev-parse 'v5.1.0^{commit}'
git push origin fc52a6ce6c5f15a884f775d9473ae19e133a6987:refs/heads/test/paisley-park-5.1
```

Mac 的旧 5.1 测试分支本地头是较早的 `6f29ae4954ed9874e41ad4f9f7810f74900482a6`。整理移除重复引用，同一提交仍由本地 `maintenance/paisley-park-5.1` 保持，也可从正式 Tag 的祖先历史取得。

`test/paisley-park-6.1` 保留。它与 `v6.1.0` 指向相同的 `cfd76a75e6c28efbbdcf447b25679cd9f257ef54`，但已发布文档仍通过分支名链接交接页。新增引用可使用 [固定提交的交接页](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/cfd76a75e6c28efbbdcf447b25679cd9f257ef54/docs/HANDOFF_6_1.md)。

## 本地归档

Mac 旧 5.0 原型、配套交接 bundle 和退役实验工作区在同一磁盘移入本地归档，本次移动释放 0 字节。两套工具 bundle 均实际恢复到记录的提交，Git `fsck` 通过。目录可按本地归档记录移回原位置。

正式 7.0 与 7.2 Release、Tag 及资产，7.2 Mac 验收分支和 8.0 调研以各自固定出处为准。当前使用入口见 [CURRENT_STATUS](../../CURRENT_STATUS.md)。
