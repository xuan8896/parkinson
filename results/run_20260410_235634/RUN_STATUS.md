# 本次批处理状态

- 结果目录: `F:\parkinson detection\results\run_20260410_235634`
- 运行时间:
  - `video_only` 完成于 2026-04-11
  - `gold_guided` 完成于 2026-04-11

## 已完成

已完成 `video_only` 全量批处理，使用现有代码对所有可识别任务视频进行了左右手分析。

- 可处理视频总数: 49
- 左手视频: 24
- 右手视频: 25
- 成功输出预测: 49
- 跳过视频: 0
- 输出图像: 49

纯视频结果文件位于:

- `F:\parkinson detection\results\run_20260410_235634\video_only\batch_predictions.csv`
- `F:\parkinson detection\results\run_20260410_235634\video_only\batch_skipped.csv`
- `F:\parkinson detection\results\run_20260410_235634\video_only\figures\`
- `F:\parkinson detection\results\run_20260410_235634\video_only\run.log`

## 金标准结合结果

已完成 `gold_guided` 全量重跑并输出最终结果。

- 进入匹配流程的视频数: 41
- 候选配对数: 248
- 最终匹配数: 41
- 跳过视频数: 8
- 候选配对失败数: 0
- 输出图像: 41

金标准结合结果文件位于:

- `F:\parkinson detection\results\run_20260410_235634\gold_guided\batch_matches.csv`
- `F:\parkinson detection\results\run_20260410_235634\gold_guided\batch_candidates.csv`
- `F:\parkinson detection\results\run_20260410_235634\gold_guided\batch_skipped.csv`
- `F:\parkinson detection\results\run_20260410_235634\gold_guided\batch_failed_candidates.csv`
- `F:\parkinson detection\results\run_20260410_235634\gold_guided\figures\`
- `F:\parkinson detection\results\run_20260410_235634\gold_guided\run_resume_20260411.log`

说明:

- `gold_guided\run.log` 是昨晚中途中断时留下的旧日志。
- `gold_guided\run_resume_20260411.log` 是本次补跑并完成的完整日志。
