# TS First E07 — 有界性能与原生观察

2026-11-05。固定代码`9a95c9fcb7adeccfa885e18835bbff4132c6bb70`，基线`48cf8f52be833d56fa219569bd2e980366a4d4a0`。37原Node+4DOM strict，46产物；完整迁移继续。

## Delivered

performance-series、process-memory、native-layout接入strict。原deadline/Abort、enable结果未知仍disable、原会话清理、采样过程PID变化停止与已采样保留、ActivityManager前后身份复查与失效memory丢弃、原生布局文本省略/ID摘要保持。设备端与CDP结果通过unknown视图读取，进程成员不被当成renderer归属，计数不被当成泄漏诊断。

修复性能采样的错误码映射：原对象原型属性会把toString/constructor等变成错误原因，数组可强制转成已知错误码。现在只接受实际字符串和自有有限映射，否则unknown；不新增操作重试。新增用例旧实现先失败（实际返回函数），新实现通过。独立静态审查未发现生命周期阻断；采纳其建议保留crypto.createHash加载时捕获，未独立跑测试。

## Validated

- `node tools/typescript/build.cjs --check`37Node+4DOM/46产物一致；`node tools/typescript/check-types.cjs`58指定负例。
- `node --test tests/performance-series.test.cjs tests/process-memory.test.cjs tests/native-layout.test.cjs`7/7；`node --test tools/typescript/test/build.test.cjs`5/5。
- `npm test`549项：548通过、0失败、1Windows跳过。
- 源码树外固定独立包无node_modules，最低Node26.0.0父进程`--no-strip-types --experimental-sqlite`同7项通过。ADB、进程、协议、Android CLI均为合成替身；没有连接设备、执行Android CLI或取得游戏资源。
- ZIP335文件逐一匹配Git blob/CRC/export集合，SHA-256`c76c932074d6ec64fa45575700defd698622637fb1edadecf1027e7e2dcc3c9a`。[逐文件清单](package-e07-manifest.json)、[结果](batch-e07-results.json)。Mac环境同E06。

## Not validated / Known limitations

本批未新跑Chrome；没有改变浏览器探针/业务指纹，协议失败与cleanup由定向替身测试覆盖，E06真实Chrome证据保留原身份。Windows、Android设备/WebView、真实游戏仍未验证，解析/替身测试不能证明真实设备格式或响应。类型保留部分采样与失败状态，不承诺连续采样同时发生或PID证明进程代次。E/F/G剩余迁移继续。
