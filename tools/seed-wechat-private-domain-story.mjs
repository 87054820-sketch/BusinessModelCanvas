#!/usr/bin/env node

const API_BASE = process.env.API_BASE ?? 'http://localhost:4000';
const DISPLAY_NAME = process.env.DISPLAY_NAME ?? 'CodeBuddy IDE';
const PROJECT_NAME = '微信私域项目';
const CONTENT_DATE = '2023-12';
const CONTENT_DATE_LABEL = '2023年12月';

const BLUE = '#CFE3F5';
const GREEN = '#CFEBD3';
const RED = '#FBD0D9';
const YELLOW = '#FCF1A8';

async function main() {
  const project = await ensureProject();
  const canvases = {
    bmc: await ensureCanvas(project.id, 'business-model-canvas', '微信私域项目 · 商业模式画布'),
    value: await ensureCanvas(project.id, 'value-proposition-canvas', '微信私域项目 · 价值主张画布'),
    criteria: await ensureCanvas(project.id, 'design-criteria-canvas', '微信私域项目 · 设计准则画布'),
    experiment: await ensureCanvas(project.id, 'experiment-canvas', '微信私域项目 · 实验验证画布'),
  };

  await bulkObjects(canvases.bmc.id, businessModelObjects());
  await bulkObjects(canvases.value.id, valuePropositionObjects());
  await bulkObjects(canvases.criteria.id, designCriteriaObjects());
  await bulkObjects(canvases.experiment.id, experimentObjects());

  const story = await ensureStory(project.id, canvases);

  console.log(`Seed complete: ${PROJECT_NAME}`);
  console.log(`Project: ${project.id}`);
  console.log(`Story:   ${story.id}`);
  console.log(`Open:    http://localhost:5173/p/${project.id}/s/${story.id}`);
}

async function ensureProject() {
  const projects = await request('/projects');
  const existing = projects.find((p) => p.name === PROJECT_NAME);
  if (existing) return existing;
  return request('/projects', {
    method: 'POST',
    body: { name: PROJECT_NAME, description: '2023 年 12 月微信私域商业模式规划案例。' },
  });
}

async function ensureCanvas(projectId, defId, title) {
  const canvases = await request(`/projects/${projectId}/canvases`);
  const existing = canvases.find((c) => c.defId === defId && c.title === title);
  const body = {
    title,
    contentDate: CONTENT_DATE,
    contentDatePrecision: 'month',
    contentDateLabel: CONTENT_DATE_LABEL,
  };
  if (existing) return request(`/canvases/${existing.id}`, { method: 'PATCH', body });
  return request('/canvases', {
    method: 'POST',
    body: { projectId, defId, title, language: 'zh', ...body },
  });
}

async function ensureStory(projectId, canvases) {
  const title = '2023年12月规划';
  const content = storyContent(canvases);
  const stories = await request(`/projects/${projectId}/stories`);
  const existing = stories.find((s) => s.title === title && s.contentDate === CONTENT_DATE);
  const body = {
    title,
    content,
    status: 'draft',
    contentDate: CONTENT_DATE,
    contentDatePrecision: 'month',
    contentDateLabel: CONTENT_DATE_LABEL,
  };
  if (existing) return request(`/stories/${existing.id}`, { method: 'PATCH', body });
  return request('/stories', { method: 'POST', body: { projectId, ...body } });
}

async function bulkObjects(canvasId, body) {
  await request(`/canvases/${canvasId}/objects/bulk`, { method: 'POST', body });
}

function businessModelObjects() {
  return {
    colorLegend: {
      [BLUE]: { label: '业务设计', description: '当时已经验证或明确设计的商业模式要素' },
      [GREEN]: { label: '原则判断', description: '对模式成立方式的关键判断' },
      [YELLOW]: { label: '待沉淀', description: '需要继续沉淀的能力、证据或渠道' },
    },
    stickies: [
      s('key-partners', '核心-内部：模板、情报、工作台', BLUE, 95, 210),
      s('key-partners', '核心-外部：微信/企业微信团队、第三方供应商', BLUE, 100, 330),
      s('key-partners', '其他协作：客服/企点、风讯、UGC、用研', YELLOW, 110, 455),
      s('key-activities', '经营分析陪跑', BLUE, 340, 126),
      s('key-activities', '基础平台建设', BLUE, 340, 178),
      s('key-activities', '案例沉淀与口碑推广', BLUE, 340, 232),
      s('key-resources', '数据分析 + 实时营销底座', BLUE, 340, 390),
      s('key-resources', '方案案例：降成本 + 有效果', GREEN, 340, 450),
      s('key-resources', '业务客户数据资产', BLUE, 340, 508),
      s('value-propositions', '效果驱动', BLUE, 595, 230),
      s('value-propositions', '长期陪伴', GREEN, 595, 292),
      s('value-propositions', '成本优先', GREEN, 595, 354),
      s('value-propositions', '解决方案 + 运营陪跑', BLUE, 595, 452),
      s('customer-relationships', '复购：长期陪跑推荐方案', GREEN, 836, 185),
      s('channels', '以老带新，口碑推荐', GREEN, 838, 430),
      s('customer-segments', '游戏社区运营', BLUE, 1065, 230),
      s('customer-segments', '老游戏成熟期', BLUE, 1065, 310),
      s('customer-segments', '新游发行期', BLUE, 1065, 390),
      s('cost-structure', '自研平台成本', RED, 230, 690),
      s('cost-structure', '第三方采购成本', RED, 420, 690),
      s('cost-structure', '运营陪跑成本', RED, 230, 755),
      s('cost-structure', '定制研发成本', RED, 420, 755),
      s('revenue-streams', '基础平台套餐', BLUE, 755, 690),
      s('revenue-streams', '通用工具收费', BLUE, 935, 690),
      s('revenue-streams', '定制开发收入', GREEN, 755, 755),
      s('revenue-streams', '运营陪跑收入', GREEN, 935, 755),
    ],
  };
}

function valuePropositionObjects() {
  return {
    colorLegend: {
      [GREEN]: { label: '客户收益', description: '客户愿意买单或持续投入的正向结果' },
      [RED]: { label: '客户痛点', description: '私域推进中的成本、组织和资源约束' },
      [BLUE]: { label: '服务承载', description: '团队提供的产品、方案或陪跑能力' },
    },
    stickies: [
      s('gain-creators', 'iOS 支付打通，短期验证渠道费节约价值', GREEN, 310, 235),
      s('gain-creators', '业务商业化解决方案：活动设计 + 投放策略', GREEN, 325, 302),
      s('gain-creators', '用户回流解决方案：激活、召回、复访', GREEN, 335, 370),
      s('pain-relievers', '工具化降低管理与触达成本', BLUE, 330, 510),
      s('pain-relievers', '数据驱动 / 精细化触达，避免盲目群运营', BLUE, 340, 585),
      s('pain-relievers', '方案陪跑降低试错成本', BLUE, 340, 650),
      s('products-and-services', '渠道管理、标签体系、外团工具、舆情告警', BLUE, 180, 520),
      s('gains', '垂直场景 UGC / 活动能带来额外商业化收益', GREEN, 900, 245),
      s('gains', '渠道成本存在较大下降空间', GREEN, 865, 315),
      s('gains', '内测用户反馈跟进带来持续信心', GREEN, 905, 375),
      s('pains', '营销方案成本太高', RED, 830, 510),
      s('pains', '用户资产无法充分利用', RED, 965, 510),
      s('pains', '外团管理、监控与成本压力', RED, 930, 590),
      s('pains', '用户群舆情风险', RED, 785, 590),
      s('customer-jobs', '游戏社区运营', BLUE, 1050, 215),
      s('customer-jobs', '组织外团管理用户', BLUE, 1040, 360),
      s('customer-jobs', '社区 / 社群内容管理', BLUE, 1040, 450),
      s('customer-jobs', '现有渠道管理：公众号、视频号、直播等', BLUE, 1038, 570),
    ],
  };
}

function designCriteriaObjects() {
  return {
    colorLegend: {
      [BLUE]: { label: '应该坚持', description: '需要进入方案设计和销售动作的正向准则' },
      [RED]: { label: '明确不做', description: '会破坏长期信任或 ROI 的排除项' },
    },
    stickies: [
      s('must-have', '客户运营：坚守客户长期价值', BLUE, 310, 158),
      s('must-have', '客户运营：科学度量运营产出', BLUE, 310, 218),
      s('must-have', '产品设计：保证服务稳定性', BLUE, 600, 158),
      s('must-have', '产品设计：给客户降本增效', BLUE, 600, 218),
      s('must-have', '客户销售：关注客户所有痛点', BLUE, 900, 158),
      s('must-have', '客户销售：重视客户关系反馈', BLUE, 900, 218),
      s('should-have', '重视运营服务时效性', BLUE, 310, 335),
      s('should-have', '重视产品使用易用性', BLUE, 600, 335),
      s('should-have', '尽力推广所有能力', BLUE, 900, 335),
      s('could-have', '尽力响应客户全面需求', BLUE, 310, 500),
      s('could-have', '整合采购其他服务降本', BLUE, 600, 500),
      s('could-have', '帮助客户优化订单', BLUE, 900, 500),
      s('wont-have', '短视，推荐不优质服务', RED, 310, 645),
      s('wont-have', '浪费资源在非核心竞争力研发', RED, 600, 645),
      s('wont-have', '提供误导性的案例数据', RED, 900, 645),
    ],
  };
}

function experimentObjects() {
  return {
    colorLegend: {
      [GREEN]: { label: '验证结果', description: '实验已经产生的正向证据' },
      [BLUE]: { label: '实验设计', description: '假设、指标、方法和下一步' },
      [RED]: { label: '风险约束', description: '必须关注的冲突、成本和资源问题' },
    },
    stickies: [
      s('riskiest-assumption', '游戏业务愿意并能够通过社群扩大商业化额外收益', BLUE, 235, 200),
      s('falsifiable-hypothesis', '规划业务独立商业化活动，若降低其他活动拓展投放成本并验证效果，则私域能提供增量价值', BLUE, 770, 200),
      s('experiment-setup', '以 Call to Action 触发活动参与，进行 AB Test 与多期实验；重点观察业务场景、商品选择和冲突活动', BLUE, 600, 400),
      s('metrics-criteria', '衡量用户画像、订单金额、触达后行为、投放成本与耗时；多期实验稳定有效才继续扩大', BLUE, 245, 625),
      s('results-conclusion', 'WM 活动 A：多期实验都有成效；活动 B：增量收入 19%', GREEN, 600, 600),
      s('results-conclusion', '结论：在一定业务场景下有效，但需要积累投放策略并关注冲突性活动', GREEN, 600, 680),
      s('next-steps', '找到更多业务，基于不同场景和模式测试；把有效打法沉淀为可复用方案', BLUE, 960, 625),
    ],
  };
}

function storyContent(canvases) {
  return `# 2023年12月规划：微信私域项目的商业模式复盘

> 内容时间：2023 年 12 月  
> 录入时间：由 PinGarden 当前系统自动记录  
> 说明：以下是对 2022 年启动、2023 年底阶段性沉淀的一次历史补录。画布按 2023 年 12 月的业务判断重绘，系统创建时间只表示本次录入时间。

## 一、背景：不是第一个进入私域，但重新定义了进入方式

企业微信开放第三方开发者通道大约发生在 2019 年前后。到 2021 年，很多团队已经看到了企微私域的方向；到 2022 年，我们才在腾讯内部正式启动这个项目。

这意味着我们不是第一个做企微服务、微信服务或私域运营服务的人。相反，当时行业和公司内部已经出现了不少尝试。但这些尝试中有两个问题非常突出：

1. 很多团队做私域，是因为“老板说要做社交”，而不是因为已经看清楚了业务价值。
2. 腾讯内部长期有以群为导向的运营传统。群运营天然需要大量人力和运营成本，如果没有持续计算成本与收益，项目一旦上规模，价值就容易变成“管理了多少用户”，而不是“创造了多少可度量收益”。

这也是我们当时选择换一种切入方式的原因：不把自己定位为卖平台，而是定位为效果驱动的服务团队。

## 二、商业模式：我们卖的不是工具，而是效果陪伴

团队有数据中心和数据平台的底子，所以我们天然更关注效果、成本和可度量性。私域项目外部常见说法是整体成功率低于 20%，而我们在实践中能够把成功率做到 40% 到 50%。核心不是因为我们多做了一个工具，而是因为我们始终围绕成本、效果和业务信心来设计服务。

尤其在业务进入后的前三到六个月，客户是否建立信心非常关键。这个阶段如果只交付一个平台，客户仍然不知道怎么用、怎么投、怎么判断效果。我们真正提供的是：业务分析、方案陪跑、数据度量、案例沉淀和成本优化。

::canvas[business-model-canvas]{canvasId="${canvases.bmc.id}" title="微信私域项目 · 商业模式画布"}

这张商业模式画布里，几个判断非常关键：

- **价值主张**不是“我有一个平台”，而是“效果驱动、长期陪伴、成本优先”。
- **关键资源**不是单点工具，而是数据分析 + 实时营销底座、降成本与有效果的案例、业务客户数据资产。
- **客户关系**不是一次性交付，而是长期陪跑、复购和推荐。
- **渠道**最有效的是口碑推荐、以老带新。后续通过专业文章吸引客户，本质上也是在建立可信的专业声誉。
- **收入流**可以来自基础平台套餐、通用工具、定制开发和运营陪跑，但这些都必须能回到客户 ROI。

## 三、价值设计：私域要让业务主体钱、权、利一致

我们当时反对把游戏私域完全做成代运营。过去很多模式相当于游戏团队把事情整体托管给第三方运营团队，虽然可能也是公司内的另一方，但会带来严重问题：私域用户愿意参与，往往需要游戏业务自己拿出福利、内容、活动和资源。如果运营权被整体外包，外部团队很难调动足够资源，也很难让业务主体真正形成价值认知。

所以我们认可一个原则：游戏私域更像海外的邮件营销。它应该由业务主体承担成本，并获得最大收益。换句话说，钱、权、利益必须一致。

::canvas[value-proposition-canvas]{canvasId="${canvases.value.id}" title="微信私域项目 · 价值主张画布"}

当时最基本的价值设计包括三类：

1. **iOS 渠道费**：这是短平快的价值点，容易被业务理解，也适合早期验证。
2. **用户回流**：很多游戏业务都认可用户回流价值，尤其在成熟期产品中更明显。
3. **商业化价值**：早期因为内部特殊情况不适合强推商业化，但从业务逻辑看存在很多潜在方向。

我们并不只计算自己的成本，也会把客户给外部运营人员的成本、业务资源调动成本、活动冲突成本一起纳入 ROI。这样才能避免“平台看起来便宜，但整体运营很贵”的假象。

## 四、设计准则：长期价值、ROI、真诚积极

为了避免项目越做越散，我们在 2023 年 12 月沉淀了一套准则。它不是抽象口号，而是用于判断产品、运营和销售动作是否值得做的标准。

::canvas[design-criteria-canvas]{canvasId="${canvases.criteria.id}" title="微信私域项目 · 设计准则画布"}

这套准则背后的逻辑是：

- **客户长期价值**：不能为了短期成单推荐不优质服务；要持续沉淀能力，科学度量运营产出。
- **竞争力 + ROI**：产品要稳定、易用，并能证明降本增效；不能把资源浪费在与核心竞争力无关的研发上。
- **真诚 + 积极**：销售和陪跑要关注客户真实痛点，不能提供误导性案例数据。

它把团队的商业模式约束到了日常决策里：哪些必须做，哪些应该做，哪些可以延后，哪些明确不做。

## 五、学习验证：从“做私域”转向“证明哪些场景有效”

当时我们并不假设所有私域都天然有效，而是把关键问题拆成可验证假设：游戏业务是否愿意、并且是否能够通过社群扩大商业化额外收益？

::canvas[experiment-canvas]{canvasId="${canvases.experiment.id}" title="微信私域项目 · 实验验证画布"}

2023 年 12 月的实验结果里有两个重要信号：

- WM 业务活动 A：多期实验都有成效。
- WM 业务活动 B：增量收入达到 19%。

这证明私域在一定业务场景下确实有效，但它不是无脑投放。它需要持续积累投放策略，包括商品选择、场景选择、活动节奏，以及是否与业务已有活动发生冲突。

因此，我们当时的下一步不是简单扩大人群规模，而是寻找更多业务，基于不同场景和模式继续测试，把有效打法沉淀成可复用方案。

## 六、2026 年回看：当时的判断仍然 solid

站在 2026 年回看，2023 年 12 月这套分析仍然相当 solid。它真正解决的不是“要不要做私域”，而是“在什么业务关系、成本结构和价值度量下，私域才值得做”。

这套 Story 的价值在于：它把分散的画布串成了一条业务叙事线。商业模式画布解释我们怎么创造、交付和获取价值；价值主张画布解释客户为什么愿意投入；设计准则画布约束我们不做什么；实验画布证明哪些假设已经被验证。

后续新的情况可以继续追加为新的章节或新的 Story，但 2023 年 12 月这版规划，可以作为微信私域项目早期商业模式判断的基准版本。`;
}

function s(zoneId, text, color, x, y) {
  return { zoneId, text, color, x, y, authorName: DISPLAY_NAME };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'X-Display-Name': encodeURIComponent(DISPLAY_NAME),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? 'GET'} ${path} failed: HTTP ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined;
  return res.json();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
