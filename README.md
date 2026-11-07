# dsh-seedance-prompt · Seedance 提示词专家

DeepSeek Harness（dsh）插件：**AI 短视频分镜提示词生成专家**——5 套互斥方法论（电商带货/TVC 品牌广告/通用分镜/真人感视频/剧情短剧），6 篇方法论文档 + 7 篇广告提示词模板，纯技能零 API key。

技能来自 [make-prompt-seedance2](https://github.com/liangdabiao/make-prompt-seedance2)（社区作者：藏师傅、袋鼠帝、小禾、奋力等）。生成的提示词直接复制到 Seedance 2.0（[即梦](https://jimeng.jianying.com) / [小云雀](https://xyq.jianying.com) / 豆包）使用。

## 装上以后有什么

| 能力 | 说明 |
|---|---|
| `seedance-video-prompt` 技能 | `/seedance-video-prompt` 斜杠命令 + 模型自主触发：路由到正确方法论 → 收集必要信息 → 生成完整提示词。覆盖带货/TVC/通用/真人感/短剧/产品展示/UI 宣传片/家装漫游/口播/音乐卡点 |
| 侧栏「Seedance 提示词」面板 | 📖 使用指南 + 📋 方法论目录（6 篇参考文档速览） |

## 5 套互斥方法论

| 方法论 | 什么时候用 | 文档 |
|---|---|---|
| 电商带货 | 抖音/TikTok 带货视频、产品展示 | `references/ecommerce-douyin.md` + `ecommerce-playbook.md` |
| TVC 品牌广告 | 品牌宣传片、产品广告片 | `references/tvc-ad.md` |
| 通用分镜 | 叙事/风景旅拍/剧情/短剧 | `references/general-storyboard.md` |
| 真人感视频 | 种草/探店/口播（伪纪录片感） | `references/realperson-video.md` |
| 补充规则 | 真人感补充约束 | `references/realperson-supplement.md` |

另有 `references/structured-prompt-guide.md`（完整结构化提示词教程）和 `references/ads-prompt/`（7 篇广告提示词模板）。

## 使用

对话里一句话：**「帮我写一个保温杯的带货视频提示词」**或**「写一个科技感产品展示的 TVC 分镜」**。

模型会：路由到正确方法论 → 如有参考图先逐张分析 → 收集必要信息 → 生成可直接复制到即梦/小云雀使用的完整提示词（写入工作区文件）。

## 怎么实现的

纯技能零 API key。生成的提示词是纯文本——用户复制到即梦/小云雀/豆包平台使用，不需要调用任何 API。

## 自检

```bash
npm install && npm test && npm run selftest && npm run build
```

- `npm test`：5 个单测（快照合规/触发词覆盖/addendum/references 6 篇/面板鉴权）
- `npm run selftest`：快照+provider+方法论目录+面板 API，零网络
- `npm run build`：打包 dist/client.js 并做产物三自检

## 许可

MIT。方法论文档来自社区作者（藏师傅、袋鼠帝、小禾、奋力等），详见上游仓库 [make-prompt-seedance2](https://github.com/liangdabiao/make-prompt-seedance2) 的 docs/ 目录。

特别致谢社区支持：https://linux.do
