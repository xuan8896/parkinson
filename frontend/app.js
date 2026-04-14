const dashboardData = window.dashboardData;
const appMode = window.__APP_MODE__ || "dynamic";
const isStaticDemo = appMode === "static";

const state = {
  dataset: "gold",
  hand: "all",
  query: "",
  serverConfig: null,
  currentJobId: null,
  pollTimer: null,
};

function assetPath(relativePath) {
  return `../${relativePath}`;
}

function formatPct(value, digits = 1) {
  return `${Number(value).toFixed(digits)}%`;
}

function formatPlain(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function quoteArg(value) {
  const text = String(value ?? "");
  return /\s/.test(text) ? `"${text}"` : text;
}

function createPill([label, count]) {
  return `<span class="pill">${label}<strong>${count}</strong></span>`;
}

function createHighlightCard(item, dataset) {
  const image = assetPath(item.figure);
  const title = `${item.patient} · ${item.hand}`;
  const meta =
    dataset === "video"
      ? `
        <div class="mini-metrics">
          <span>组别: ${item.group}</span>
          <span>特征: ${item.feature}</span>
          <span>峰值: ${formatPlain(item.peakHz)} Hz</span>
          <span>置信度: ${formatPlain(item.confidence)}</span>
        </div>
      `
      : `
        <div class="mini-metrics">
          <span>组别: ${item.group}</span>
          <span>特征: ${item.feature}</span>
          <span>视频 / 金标: ${formatPlain(item.videoPeakHz)} / ${formatPlain(item.goldPeakHz)} Hz</span>
          <span>准确率: ${formatPct(item.accuracy, 2)}</span>
        </div>
      `;

  return `
    <article class="highlight-card">
      <img src="${image}" alt="${title}" loading="lazy" />
      <div>
        <h4>${title}<\/h4>
        <small>${dataset === "video" ? "纯视频推断" : item.session}<\/small>
      </div>
      ${meta}
    </article>
  `;
}

function setMetricText(id, value) {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = value;
  }
}

function setRing(id, value, label) {
  const ring = document.getElementById(id);
  if (!ring) {
    return;
  }
  const angle = Math.max(0, Math.min(360, value * 3.6));
  ring.style.setProperty("--ring-angle", `${angle}deg`);
  ring.querySelector("span").textContent = label;
}

function renderHighlights() {
  document.getElementById("video-highlight-grid").innerHTML = dashboardData.highlights.videoTop
    .map((item) => createHighlightCard(item, "video"))
    .join("");

  document.getElementById("gold-best-grid").innerHTML = dashboardData.highlights.goldBest
    .map((item) => createHighlightCard(item, "gold"))
    .join("");

  document.getElementById("gold-watch-grid").innerHTML = dashboardData.highlights.goldWatchlist
    .map((item) => createHighlightCard(item, "gold"))
    .join("");
}

function renderSummary() {
  const { summary } = dashboardData;
  setMetricText("hero-run-date", summary.runDate);
  setMetricText("hero-accuracy", formatPct(summary.avgAccuracy, 2));
  setMetricText("metric-video-count", summary.videoOnlyCount);
  setMetricText("metric-gold-count", summary.goldGuidedCount);
  setMetricText("metric-error", `${formatPlain(summary.avgErrorHz)} Hz`);
  setMetricText("metric-skipped", summary.skippedCount);
  setMetricText("video-confidence", formatPlain(summary.avgConfidence));
  setMetricText("video-peak", `${formatPlain(summary.avgVideoPeakHz)} Hz`);
  setMetricText("video-hands", `${summary.videoLeftCount} / ${summary.videoRightCount}`);
  setMetricText("gold-accuracy", formatPct(summary.avgAccuracy, 3));
  setMetricText("gold-similarity", formatPlain(summary.avgSimilarity));
  setMetricText("gold-range", `${formatPct(summary.bestAccuracy, 3)} / ${formatPct(summary.worstAccuracy, 3)}`);

  document.getElementById("video-feature-pills").innerHTML = summary.videoFeatureLeaders
    .map(createPill)
    .join("");
  document.getElementById("gold-feature-pills").innerHTML = summary.goldFeatureLeaders
    .map(createPill)
    .join("");

  const skippedGroups = dashboardData.skippedRows.reduce((acc, row) => {
    acc[row.group] = (acc[row.group] || 0) + 1;
    return acc;
  }, {});

  document.getElementById("skip-group-pills").innerHTML = Object.entries(skippedGroups)
    .map(([group, count]) => `<span class="pill">${group}<strong>${count}</strong></span>`)
    .join("");

  setRing("accuracy-ring", summary.avgAccuracy, formatPct(summary.avgAccuracy, 2));
  setRing("similarity-ring", summary.avgSimilarity * 100, formatPlain(summary.avgSimilarity));
}

function goldColumns() {
  return [
    ["患者", (row) => row.patient],
    ["手侧", (row) => row.hand],
    ["组别", (row) => row.group],
    ["特征", (row) => row.feature],
    ["视频 Hz", (row) => formatPlain(row.videoPeakHz)],
    ["金标 Hz", (row) => formatPlain(row.goldPeakHz)],
    ["误差 Hz", (row) => formatPlain(row.errorHz)],
    ["准确率", (row) => formatPct(row.accuracy, 2)],
    ["谱相似度", (row) => formatPlain(row.similarity)],
    ["图", (row) => `<a class="table-link" href="${assetPath(row.figure)}" target="_blank" rel="noreferrer">查看</a>`],
  ];
}

function videoColumns() {
  return [
    ["患者", (row) => row.patient],
    ["手侧", (row) => row.hand],
    ["组别", (row) => row.group],
    ["特征", (row) => row.feature],
    ["峰值 Hz", (row) => formatPlain(row.peakHz)],
    ["置信度", (row) => formatPlain(row.confidence)],
    ["FPS", (row) => formatPlain(row.analysisFps, 1)],
    ["图", (row) => `<a class="table-link" href="${assetPath(row.figure)}" target="_blank" rel="noreferrer">查看</a>`],
  ];
}

function skippedColumns() {
  return [
    ["患者", (row) => row.patient],
    ["组别", (row) => row.group],
    ["原因", (row) => row.reason],
  ];
}

function getActiveRows() {
  let rows =
    state.dataset === "gold"
      ? dashboardData.goldRows
      : state.dataset === "video"
        ? dashboardData.videoRows
        : dashboardData.skippedRows;

  if (state.dataset !== "skipped" && state.hand !== "all") {
    rows = rows.filter((row) => row.hand === state.hand);
  }

  if (state.query) {
    const query = state.query.toLowerCase();
    rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }

  return rows;
}

function getColumns() {
  if (state.dataset === "gold") {
    return goldColumns();
  }
  if (state.dataset === "video") {
    return videoColumns();
  }
  return skippedColumns();
}

function getDatasetTitle() {
  if (state.dataset === "gold") {
    return "Gold-Guided Results";
  }
  if (state.dataset === "video") {
    return "Video-Only Results";
  }
  return "Skipped Items";
}

function renderTable() {
  const rows = getActiveRows();
  const columns = getColumns();

  document.getElementById("table-title").textContent = getDatasetTitle();
  document.getElementById("table-count").textContent = `${rows.length} rows`;
  document.getElementById("table-head").innerHTML = `<tr>${columns
    .map(([title]) => `<th>${title}</th>`)
    .join("")}</tr>`;

  const body = document.getElementById("table-body");
  if (!rows.length) {
    body.innerHTML = `<tr><td class="empty-state" colspan="${columns.length}">没有匹配当前筛选条件的数据。</td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map((row) => `<tr>${columns.map(([, render]) => `<td>${render(row)}</td>`).join("")}</tr>`)
    .join("");
}

function syncButtons(containerId, key, value) {
  document.querySelectorAll(`#${containerId} button`).forEach((button) => {
    button.classList.toggle("is-active", button.dataset[key] === value);
  });
}

function wireDashboardControls() {
  document.getElementById("dataset-switch").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-dataset]");
    if (!button) {
      return;
    }
    state.dataset = button.dataset.dataset;
    syncButtons("dataset-switch", "dataset", state.dataset);
    renderTable();
  });

  document.getElementById("hand-switch").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-hand]");
    if (!button) {
      return;
    }
    state.hand = button.dataset.hand;
    syncButtons("hand-switch", "hand", state.hand);
    renderTable();
  });

  document.getElementById("search-input").addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderTable();
  });
}

function enableReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 },
  );

  targets.forEach((target) => observer.observe(target));
}

function getInputValue(id) {
  return document.getElementById(id).value.trim();
}

function getSelectedFile(id) {
  const input = document.getElementById(id);
  return input.files && input.files[0] ? input.files[0] : null;
}

function getAccessToken() {
  return getInputValue("access-token");
}

function buildHeaders(extraHeaders = {}, includeAuth = true) {
  const headers = new Headers(extraHeaders);
  if (includeAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return headers;
}

function getFormValues() {
  return {
    videoPath: getInputValue("video-path"),
    goldPath: getInputValue("gold-path"),
    mode: document.getElementById("mode-select").value,
    hand: document.getElementById("hand-select").value,
    outputDir: getInputValue("output-dir"),
    trimSeconds: Number(document.getElementById("trim-seconds").value),
    frameHeight: Number(document.getElementById("frame-height").value),
    maxAnalysisFps: Number(document.getElementById("max-analysis-fps").value),
    modelComplexity: Number(document.getElementById("model-complexity").value),
  };
}

function setStatusChip(status) {
  const chip = document.getElementById("job-status-chip");
  const normalized = String(status || "idle").toLowerCase();
  chip.textContent = status;
  chip.className = `status-chip ${normalized}`;
}

function setLogText(text) {
  document.getElementById("job-log").textContent = text;
}

function setResultPreview(figureUrl) {
  const shell = document.getElementById("result-preview-shell");
  const image = document.getElementById("result-image");
  const link = document.getElementById("result-image-link");
  if (!figureUrl) {
    shell.hidden = true;
    image.removeAttribute("src");
    link.href = "#";
    return;
  }
  shell.hidden = false;
  image.src = figureUrl;
  link.href = figureUrl;
}

function updateCommandPreview(payload = getFormValues()) {
  const videoUpload = getSelectedFile("video-file");
  const goldUpload = getSelectedFile("gold-file");
  const videoValue = videoUpload ? `[upload] ${videoUpload.name}` : payload.videoPath || "<video>";
  const goldValue = goldUpload ? `[upload] ${goldUpload.name}` : payload.goldPath;

  const command = [
    "python",
    "parkinson_detection.py",
    "--video",
    quoteArg(videoValue),
    "--output",
    quoteArg(payload.outputDir || "results/ui_runs/run_时间戳_uuid"),
    "--mode",
    payload.mode || "gold_guided",
    "--hand",
    payload.hand || "Right",
    "--trim-seconds",
    String(payload.trimSeconds ?? 1.0),
    "--frame-height",
    String(payload.frameHeight ?? 600),
    "--max-analysis-fps",
    String(payload.maxAnalysisFps ?? 60),
    "--model-complexity",
    String(payload.modelComplexity ?? 1),
    "--no-gui",
  ];

  if (goldValue && payload.mode === "gold_guided") {
    command.push("--gold", quoteArg(goldValue));
  }

  document.getElementById("job-command-preview").textContent = command.join(" ");
}

function fillExample(type) {
  if (!state.serverConfig) {
    return;
  }

  const sample =
    type === "gold"
      ? state.serverConfig.examples.goldGuided
      : state.serverConfig.examples.videoOnly;
  const mode = type === "gold" ? "gold_guided" : "video_only";

  document.getElementById("video-file").value = "";
  document.getElementById("gold-file").value = "";
  document.getElementById("video-path").value = sample.videoPath || "";
  document.getElementById("gold-path").value = sample.goldPath || "";
  document.getElementById("hand-select").value = sample.hand || "Right";
  document.getElementById("mode-select").value = mode;
  syncGoldFieldState();
  updateCommandPreview();
}

function syncGoldFieldState() {
  const mode = document.getElementById("mode-select").value;
  const goldPathInput = document.getElementById("gold-path");
  const goldFileInput = document.getElementById("gold-file");
  const isGoldGuided = mode === "gold_guided";
  goldPathInput.placeholder = isGoldGuided
    ? "若不上传文件，可填服务器上的金标准路径"
    : "video_only 模式下可留空";
  goldFileInput.required = false;
}

function lockForm(isLocked) {
  document.querySelectorAll("#analysis-form input, #analysis-form select, #analysis-form button").forEach((node) => {
    node.disabled = isLocked;
  });
}

function applyStaticDemoMode() {
  lockForm(true);
  document.getElementById("job-command-preview").textContent = "Static demo mode: online analysis is disabled";
  document.getElementById("server-mode-note").textContent =
    "当前页面部署在静态托管上，只展示结果面板；上传分析需要本地或云端运行 ui_server.py。";
  setStatusChip("static");
  setMetricText("job-output-dir", "GitHub Pages");
  setMetricText("job-return-code", "N/A");
  setResultPreview(null);
  setLogText(
    "静态演示模式：GitHub Pages 只托管页面和结果图，不提供 /api 分析接口。\n\n如需上传视频并运行分析，请启动 `python ui_server.py --host 0.0.0.0 --port 8765`，再打开本地或服务器上的 frontend/index.html。",
  );
}

async function fetchJson(url, options = {}, includeAuth = true) {
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers || {}, includeAuth),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function renderJobResponse(job) {
  setStatusChip(job.status || "idle");
  setMetricText("job-output-dir", job.outputDir || "未开始");
  setMetricText(
    "job-return-code",
    job.returnCode === null || job.returnCode === undefined ? job.status : String(job.returnCode),
  );
  if (Array.isArray(job.command)) {
    document.getElementById("job-command-preview").textContent = job.command.map(quoteArg).join(" ");
  }
  if (typeof job.log === "string") {
    setLogText(job.log || "任务已创建，等待日志...");
  }
  if (job.error) {
    setLogText(`${job.log || ""}\n${job.error}`.trim());
  }
  setResultPreview(job.figureUrl);
}

function stopPolling() {
  if (state.pollTimer) {
    clearTimeout(state.pollTimer);
    state.pollTimer = null;
  }
}

async function pollJob(jobId) {
  try {
    const job = await fetchJson(`/api/jobs/${jobId}`);
    renderJobResponse(job);
    if (job.status === "running" || job.status === "queued") {
      state.pollTimer = setTimeout(() => pollJob(jobId), 1200);
      return;
    }
    lockForm(false);
  } catch (error) {
    setStatusChip("failed");
    setLogText(`轮询任务失败：${error.message}`);
    lockForm(false);
  }
}

function buildSubmitFormData() {
  const payload = getFormValues();
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, String(value ?? ""));
  });

  const videoFile = getSelectedFile("video-file");
  const goldFile = getSelectedFile("gold-file");
  if (videoFile) {
    formData.append("videoFile", videoFile);
  }
  if (goldFile) {
    formData.append("goldFile", goldFile);
  }

  return { payload, formData, videoFile, goldFile };
}

async function submitAnalysis(event) {
  event.preventDefault();
  stopPolling();

  if (isStaticDemo) {
    applyStaticDemoMode();
    return;
  }

  const { payload, formData, videoFile, goldFile } = buildSubmitFormData();
  updateCommandPreview(payload);

  if (!videoFile && !payload.videoPath) {
    setStatusChip("failed");
    setLogText("请至少上传一个视频文件，或填写服务器上的视频路径。");
    return;
  }
  if (payload.mode === "gold_guided" && !goldFile && !payload.goldPath) {
    setStatusChip("failed");
    setLogText("gold_guided 模式下，请上传一个金标准文件，或填写服务器上的金标准路径。");
    return;
  }

  setStatusChip("running");
  setMetricText("job-output-dir", payload.outputDir || "自动生成");
  setMetricText("job-return-code", "运行中");
  setLogText("任务已提交，文件正在上传并等待后端启动分析...");
  setResultPreview(null);
  lockForm(true);

  try {
    const job = await fetchJson(
      "/api/analyze",
      {
        method: "POST",
        body: formData,
      },
      true,
    );
    state.currentJobId = job.jobId;
    renderJobResponse(job);
    pollJob(job.jobId);
  } catch (error) {
    setStatusChip("failed");
    setLogText(`提交失败：${error.message}`);
    setMetricText("job-return-code", "请求失败");
    lockForm(false);
  }
}

function applyServerConfig(config) {
  state.serverConfig = config;
  document.getElementById("mode-select").value = config.defaults.mode;
  document.getElementById("hand-select").value = config.defaults.hand;
  document.getElementById("trim-seconds").value = config.defaults.trimSeconds;
  document.getElementById("frame-height").value = config.defaults.frameHeight;
  document.getElementById("max-analysis-fps").value = config.defaults.maxAnalysisFps;
  document.getElementById("model-complexity").value = config.defaults.modelComplexity;
  syncGoldFieldState();
  updateCommandPreview();

  const modeNote = document.getElementById("server-mode-note");
  const urls = (config.network && config.network.urls) || [];
  const authText = config.network && config.network.authEnabled ? "已开启令牌保护" : "未开启令牌保护";
  modeNote.textContent = urls.length
    ? `当前 HTTP 服务地址：${urls[0]}。${authText}。互联网访问时推荐直接上传文件。`
    : `服务已连接。${authText}。互联网访问时推荐直接上传文件。`;
}

async function bootstrapServerConfig() {
  if (isStaticDemo) {
    syncGoldFieldState();
    updateCommandPreview();
    applyStaticDemoMode();
    return;
  }

  try {
    const config = await fetchJson("/api/config", {}, false);
    applyServerConfig(config);
    setLogText("后端服务已连接。你可以直接上传视频和金标准文件，或填入服务器上的文件路径。");
  } catch (error) {
    syncGoldFieldState();
    updateCommandPreview();
    setLogText(
      "当前没有连上 HTTP 服务。先执行 `python ui_server.py --host 0.0.0.0 --port 8765`，再通过公网域名或 http://127.0.0.1:8765/frontend/index.html 打开页面。\n\n" +
        `连接错误：${error.message}`,
    );
    document.getElementById("server-mode-note").textContent = "尚未连上服务器。";
  }
}

function wireLabControls() {
  document.getElementById("analysis-form").addEventListener("submit", submitAnalysis);
  document.getElementById("mode-select").addEventListener("change", () => {
    syncGoldFieldState();
    updateCommandPreview();
  });

  [
    "video-path",
    "gold-path",
    "hand-select",
    "output-dir",
    "trim-seconds",
    "frame-height",
    "max-analysis-fps",
    "model-complexity",
    "access-token",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => updateCommandPreview());
    document.getElementById(id).addEventListener("change", () => updateCommandPreview());
  });

  ["video-file", "gold-file"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => updateCommandPreview());
  });

  document.getElementById("fill-gold-example").addEventListener("click", () => fillExample("gold"));
  document.getElementById("fill-video-example").addEventListener("click", () => fillExample("video"));
  document.getElementById("clear-log-button").addEventListener("click", () => setLogText(""));
}

function boot() {
  renderSummary();
  renderHighlights();
  wireDashboardControls();
  renderTable();
  wireLabControls();
  bootstrapServerConfig();
  enableReveal();
}

boot();
