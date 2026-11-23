---
id: "B47"
order: "7.2"
title: "4DCodeBench"
aliases: []
summary: "给编程 Agent 一段几秒钟的视频，让它写出 Blender 和物理仿真代码把视频里的动态三维场景重建出来，再用程序把重建结果和原视频、真值场景逐项比对。"
domain: "多模态与空间"
subject: "Agent 任务，Harness 也是变量"
task: "终端/容器任务"
scoring: "混合"
access: "全部公开"
sampleCount: "200"
reviewed: "2026-11-18"
links: [{"label": "论文", "url": "https://arxiv.org/abs/2610.03715"}, {"label": "项目页", "url": "https://4dcodebench.com/"}, {"label": "仓库", "url": "https://github.com/4DCodeBench/4DCodeBench"}, {"label": "数据", "url": "https://huggingface.co/4DCodeBench"}]
---

## 评估对象

**能力：** 从视频反推出三维场景及其随时间变化的过程，并用可执行代码表达出来的能力。200 段视频里 100 段是真实拍摄，100 段由十种物理仿真器生成并带真值场景。场景分四类：刚体和铰接体、可变形固体、布料绳索一类的薄和细的结构、颗粒和流体一类的流动物质，涉及碰撞、形变、流动、断裂等现象。被测的是编程 Agent，即 Harness 加模型；仓库支持 Claude Code、Codex CLI、Antigravity CLI，以及用于任意 OpenAI 兼容接口的 Stirrup。

**指标：** Overall，取值 0 到 1，是五组指标得分的平均：感知相似度、二维运动、深度、三维几何、三维运动。另外单独报告 VQA 正确率和由成对比较算出的 Elo。论文（2026 年 10 月）测了 18 个模型，各在 200 题上跑一次，最高是 GPT-6 Astra（Max）Overall 0.79、VQA 87.6%；2026-11-18 访问项目页，仍只列这 18 个。

## 任务格式

Agent 在容器里拿到只读的任务说明（`TASK.md`、`world-format.md`、`render-settings.md`）和一段输入视频 `/input/reference.mp4`，工作目录一开始是空的。它要写代码生成整个场景，用 Blender 的 Cycles 渲染出一段和输入同分辨率、同帧数、同帧率、同相机的视频。可以用 Blender、FFmpeg、NumPy、PyTorch、Taichi、Warp 等工具，以及官方的格式检查器。默认限时 6 小时。把输入视频的像素贴进场景会被判不合格。

**示例（真题 `internet_14_heavy_bowling_ball`）**

- **输入材料：** 一段 928×500、25 帧每秒、200 帧的真实视频。元数据的描述（翻译）：一个沉重的保龄球沿木质球道滚去撞上球瓶，发生刚体碰撞并把球瓶撞散。类别是 `rigid`。
- **原始题目**（题面是一段视频，没有针对单题的文字；所有题共用同一份任务说明，以下节选其开头，全文约 800 词，见仓库 `harness/agent_context/TASK.md`；`{{paths.*}}` 是运行时替换成容器内路径的占位符）：

  ```text
  `input.mp4` is a video of a dynamic scene.
  Your task is to write graphics code that, when rendered, reproduces the observed 4D scene.

  Your reconstruction should model the scene and its dynamics explicitly.
  It should be both visually and physically consistent with the target.
  Render the result in Blender, matching the input's dimensions, framerate, and camera.

  ## Scoring
  Your solution will be scored frame-by-frame.
  It will also be evaluated against the ground-truth 3D geometry.
  Accordingly, solutions that represent motion or appearance in 2D or copy from the video instead of explicitly
  modeling the scene will be strongly penalized.
  The autograder will fail submissions that copy pixels from the input video into the Blender scene for any
  purpose, such as to texture objects; all must be programmatically defined.

  ## Output
  The output should contain two directories:
  1. `{{paths.solution}}` is the program, an executable `build.sh`, and the Python it runs.
  2. `{{paths.world}}` is its output, holding the camera, the render, the geometry at every frame, and the 3D
  state of the moving matter over time.

  `build.sh` takes no arguments, does **not** read the video file, and writes all of `{{paths.world}}` from
  nothing.
  Both are required to verify that the reconstruction is reproducible.
  [……省略约 600 词……]
  ```

  这道题在 `metadata.jsonl` 里的 `description` 字段（全文；按仓库 README，Agent 从题目文件里只拿到视频，这句描述不发给它）：

  ```text
  A heavy bowling ball rolls down a wooden lane and collides with pins, causing rigid-body impact and
  scattering.
  ```
- **要做的：** 写出 `build.sh` 及其调用的脚本，建出球道、球和球瓶，仿真滚动与碰撞，渲染出视频并导出逐帧网格和运动轨迹。
- **判分：** 程序把渲染视频和原视频比较外观、运动区域、光流、点轨迹和深度。这道题另有若干是非题交给 VLM 回答，例如（翻译）「第一帧里，球道尽头的白色球瓶是否全部直立、没有倒下的？」，参考答案为「是」。

**数据格式：** 每题的输入只有一段视频和一行元数据（`case`、`dataset`、`source`、`width`、`height`、`fps`、`frames`、`categories`、`description` 等）；仿真题另有真值场景文件 `worlds/<case>.h5`，真实题另有运动区域标注 `dynamic_mask.npz`。Agent 的交付物是下面两个目录。

```
workspace/
├── solution/
│   └── build.sh           无参数运行，不读视频、不联网、不装包，从零重新生成整个 world/
└── world/
    ├── camera.json        固定相机的内参和外参
    ├── render.mp4         渲染出的视频
    ├── meshes/<id>.npz    每个被渲染物体逐帧的三角网格
    └── dynamics/<名>.npz  运动物质逐帧的位置，同一列始终是同一块物质
```

## 评估流程

1. **启动：** 在配置文件里写明题目、Agent、模型和推理强度，运行 `python harness/runtime/infer.py --jobs <jobs.toml> --runtime <runtime.toml>`。
2. **环境：** 每次运行起一个 Docker 或 Apptainer 容器，镜像里有 CUDA、Blender 5.2 和 PyTorch，需要 NVIDIA GPU。任务逐个运行，独占整块 GPU。Agent 容器可以联网，因为 CLI 要访问模型服务。
3. **执行：** Agent 自己看视频、写代码、运行、检查渲染结果并反复修改，直到停下或超时。
4. **判分：** 运行 `python harness/runtime/score.py`，判分容器不联网。先过两道门：渲染视频能解码且分辨率、帧数、帧率与输入一致，否则全部指标记为出错；场景通过格式检查且 `build.sh` 存在，否则几何类指标记为出错。然后计算各项指标：DINOv3 相似度和运动区域 IoU 对所有题计算；光流、二维点轨迹、深度误差只对真实题计算，参考值来自 RAFT、CoTracker3、Video Depth Anything 的估计；三维形状的 Chamfer 距离和三维轨迹误差只对仿真题计算，对照真值场景。
5. **算分：** 出错的指标取该指标的最差值，五组指标各自平均后再平均得 Overall。补充评审用 Gemini 3.8 Flash：对每题的是非题（全库 1,251 道）回答后算 VQA 正确率，对不同模型的渲染视频做成对比较后算 Elo。论文称 VLM 的 Elo 与 76 人参与的人工比较结果的 Spearman 相关系数为 0.980。

## 资料依据

依据：论文 arXiv 2610.03715 全文；GitHub 仓库 commit `6c466be`（2026-10-08）里的 README、`docs/spec.md`、`harness/agent_context/TASK.md` 和 `vlm_judge/` 下的题目文件；Hugging Face `4DCodeBench/Dataset-Real-World` 的 `metadata.jsonl`；项目页（访问日期 2026-11-18）。没有核实的内容：没有下载仿真题的真值场景文件（43 GB），其内部结构只读了文档；没有实际运行；项目页之外是否有持续更新的榜单没有查到。
