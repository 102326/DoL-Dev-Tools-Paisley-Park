# DoL Dev Tools: Paisley Park — 短录像的离线取帧

```powershell
node scripts/dol-dev.cjs animation-frames --input LOCAL_VIDEO.mp4 --out artifacts/frames-001 --interval-ms 250 --max-frames 30
```

使用已有可选ffprobe/ffmpeg，或进程环境DOL_FFPROBE/DOL_FFMPEG指定检查过的可执行文件。不自动安装。输入为录制已经结束、不会被替换的本地MP4/WebM，最多128MiB、30秒、800万像素；interval-ms=100..5000，max-frames=1..30。输出目录须不存在、父目录已存在，不覆盖旧制品。

读取输入签名及受限元数据，禁用其它输入协议；ffprobe上限5秒，ffmpeg上限30秒、单线程解码/编码、固定映射第一视频流，排除音频/字幕/元数据。输出每帧SHA、尺寸、采样间隔、truncated、源SHA与状态；每帧最多64MiB。成功工具退出但缺帧/无帧、无效PNG、执行失败或结束时源SHA改变，都不报告complete；已有有效帧保留。源复核不能防止恶意瞬时替换，稳定输入是前提。

frameAtSeconds是fps采样序号推算，未恢复原始PTS；容器时长与可解码视频可能不同。达到max-frames会标truncated，complete仅表示所选有限抽帧任务完成。PNG去除嵌入元数据仍含真实屏幕像素，必须人工审查后分享。

受控2秒视频实际提取8帧通过；这是离线解码与输出校验，未验证真实Drawer/Modal动画质量。可将明确时刻的帧用于现有region visual-diff；调用者核对平台、viewport、状态与时序，不能自动替换Golden或把像素差当作动画通过。
