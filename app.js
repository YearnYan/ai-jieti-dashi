/**
 * AI解题大师 - 智能题目结构解析平台
 * 拆解题目结构，看透出题套路
 */

// API Configuration
const API_CONFIG = {
    url: 'https://api.linapi.net/v1/chat/completions',
    apiKey: 'sk-mTmMGee98f7ANa2LdRHsrKKRlCiw0P6AOFJfw9AfSvysO3VX',
    model: 'gemini-3-pro-preview'
};

// Gene Database (simulated local storage)
let geneDatabase = {
    conditions: [],
    patterns: [],
    solutions: [],
    questions: []
};

// DOM Elements
const elements = {
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.section'),
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    questionInput: document.getElementById('questionInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    resultZone: document.getElementById('resultZone'),
    dnaLoader: document.getElementById('dnaLoader'),
    geneResult: document.getElementById('geneResult'),
    toast: document.getElementById('toast')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initUpload();
    initAnalyzer();
    initMutation();
    initAssembly();
    bootstrapDataView();
});

// Navigation
function initNavigation() {
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;

            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            elements.sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
        });
    });
}

// File Upload
let uploadedImage = null;
let uploadedFileName = '';
let lastAnalyzedText = '';

// 当前用于跨模块联动的原题ID
let linkedQuestionId = null;

function initUpload() {
    const { uploadArea, fileInput } = elements;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('请上传图片文件');
        return;
    }

    uploadedFileName = file.name || '';

    const currentInputText = cleanDisplayText(elements.questionInput?.value || '');
    if (currentInputText && currentInputText === lastAnalyzedText) {
        elements.questionInput.value = '';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage = e.target.result;
        showImagePreview(uploadedImage);
        showToast('题目图片已上传，点击开始解析题目');
    };
    reader.readAsDataURL(file);
}

function showImagePreview(src) {
    const existingPreview = document.querySelector('.image-preview');
    if (existingPreview) existingPreview.remove();

    const img = document.createElement('img');
    img.src = src;
    img.className = 'image-preview';
    elements.uploadArea.appendChild(img);
}

function clearImagePreview() {
    const existingPreview = document.querySelector('.image-preview');
    if (existingPreview) existingPreview.remove();
}

function resetQuestionInputState() {
    uploadedImage = null;
    uploadedFileName = '';

    if (elements.fileInput) {
        elements.fileInput.value = '';
    }

    if (elements.questionInput) {
        elements.questionInput.value = '';
    }

    clearImagePreview();
}

function bootstrapDataView() {
    updateSectionRelationHints();
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function cleanDisplayText(value) {
    if (value === undefined || value === null) return '';

    let text = String(value)
        .replace(/\r\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/```(?:json|markdown|text)?/gi, '')
        .replace(/```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
        .replace(/\$([^$\n]+?)\$/g, '$1')
        .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
        .replace(/\\\(([\s\S]*?)\\\)/g, '$1');

    const latexMap = [
        [/\\times/g, '×'],
        [/\\cdot/g, '·'],
        [/\\div/g, '÷'],
        [/\\leq/g, '≤'],
        [/\\geq/g, '≥'],
        [/\\neq/g, '≠'],
        [/\\pm/g, '±'],
        [/\\to|\\rightarrow/g, '→'],
        [/\\infty/g, '∞'],
        [/\\degree/g, '°']
    ];

    latexMap.forEach(([pattern, replacement]) => {
        text = text.replace(pattern, replacement);
    });

    let prevText = '';
    while (prevText !== text) {
        prevText = text;
        text = text
            .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
            .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');
    }

    text = text
        .replace(/\\([(){}\[\]])/g, '$1')
        .replace(/\\([a-zA-Z]+)/g, '$1')
        .replace(/\$+/g, '')
        .replace(/[\t ]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return text;
}

function formatDisplayHtml(value) {
    const text = cleanDisplayText(value);
    if (!text) return '';
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function setFormattedContent(element, value, emptyText = '暂无内容') {
    if (!element) return;
    const html = formatDisplayHtml(value);
    element.innerHTML = html || `<span class="placeholder-text">${escapeHtml(emptyText)}</span>`;
}

function buildSvgPromptSnippet(svg, maxLength = 8000) {
    const safeSvg = cleanDisplayText(svg);
    if (!safeSvg) return '无';
    if (safeSvg.length <= maxLength) return safeSvg;
    return `${safeSvg.slice(0, maxLength)}...(已截断，共${safeSvg.length}字符)`;
}

function getUniversalFigureRulesText() {
    return [
        '【图形超细粒度重建协议】（数学/物理/化学/生物/地理通用，强约束）',
        '阶段1：元素穷举（禁止跳步）',
        '1) 必须先建立“元素总表”，再绘制SVG；元素总表未完成不得开始作图。',
        '2) 图元元素必须全覆盖：点/线段/射线/直线/曲线/圆弧/角/多边形/坐标轴/函数图像/箭头/仪器/结构轮廓等。',
        '3) 符号元素必须全覆盖：字母、数字、角标、上下标、单位、希腊字母、向量箭头、正负号、运算符、倍率符号。',
        '4) 每个元素必须唯一命名并可回溯到题干原文，禁止改名、合并、拆分错位。',
        '阶段2：空间关系矩阵（逐对校验）',
        '5) 对每对相关元素显式判定关系：上/下、左/右、内/外、中间、邻接、相交、重合、接触、包含、平行、垂直、共线、同心、对称。',
        '6) 点-线-面关系必须精确：点在线上/线外、点在面内/面外、线与线交点、线与面边界接触点都要可见且可验证。',
        '7) 题干出现“在…上/下/左/右/内/外/之间/相切/平行/垂直”等词，SVG必须一眼可见同关系，严禁语义正确但图像错误。',
        '8) 关系必须满足拓扑一致性：要求相交就必须有交点；要求重合就必须共轨迹；要求接触就只在规定接触点接触。',
        '阶段3：锚点与坐标（保证可复核）',
        '9) 先确定锚点（圆心、交点、端点、受力点、器官中心、地理目标区、关键节点）再放置其他元素，禁止锚点漂移。',
        '10) 关键元素必须给出可验证坐标/方位描述；同一元素在elements、spatial、svg中的位置表达必须一致。',
        '11) 比例必须反映题意（长短、高低、远近、角度大小、相对面积）；不可用“差不多”示意比例。',
        '阶段4：一一映射与禁止项',
        '12) elements中的每个元素必须在SVG中唯一对应，SVG中的每个可见元素也必须能回溯到elements。',
        '13) 严禁漏画、错画、错位、越界、镜像翻转错误、方向颠倒、标签错绑。',
        '14) 严禁添加题干未出现的装饰图元、背景纹理、无关图例、无关标注。',
        '15) 线条与文字统一白色，禁止黑色；推荐viewBox=320x180；必须输出完整<svg>...</svg>。',
        '阶段5：输出前强制三重自检',
        '16) 自检1（元素）：数量、名称、符号、状态逐项核对，不一致立即重绘。',
        '17) 自检2（关系）：逐条核对spatial关系与图像是否一致，不一致立即重绘。',
        '18) 自检3（学科）：是否符合物理世界与学科事实，不一致立即重绘。'
    ].join('\n');
}

function getFigureFieldGranularityText() {
    return [
        '【figure字段超细颗粒度模板（有图时强制）】',
        '1) figure.elements必须“每个元素一行”，格式固定：元素ID|元素名|类型|符号文本|数量/状态|绝对位置(上中下+左中右)|关键坐标|几何/语义约束|关联元素ID。',
        '2) 元素ID必须唯一且稳定（如P1/L1/A1/Label1），禁止同名不同物、禁止一物多ID。',
        '3) figure.elements必须同时覆盖图元元素与符号元素；符号不可省略（如A、B、θ、F1、Δx、+、-、→）。',
        '4) figure.spatial必须“每条关系一行”，格式固定：关系ID|主体ID|关系类型|客体ID|方向/角度/距离/接触点/包含边界|判定依据。',
        '5) figure.spatial必须覆盖题干全部可判定关系；禁止写“关系正确”“如图所示”等空泛语句。',
        '6) figure.spatial末尾必须追加“真实世界一致性校验”至少3行，逐条写明：约束条件|是否满足|依据。',
        '7) figure.description需摘要“构图目标+关键锚点+最重要三条关系”，不得写泛化描述。',
        '8) 若无图：figure.type=none，figure.description/figure.spatial/figure.elements/figure.svg均返回空字符串。'
    ].join('\n');
}

function getFigureRenderOrderRulesText() {
    return [
        '【SVG绘制顺序（必须执行，禁止跳步）】',
        'a) 先定viewBox、坐标基准与关键锚点，再画主轮廓，再画内部结构，再画关系线/箭头，最后放置标签。',
        'b) 点/线/面遵循“先骨架后细节”：先固定点位再连线，避免线反向牵引导致错位。',
        'c) 标签必须就近且不遮挡：点名靠近对应点，角符号贴角内侧，长度/距离标注贴近目标线段中点。',
        'd) 任何“接触/相切/相交/重合”关系都要在图上保留可视证据（接触点、交点、重合边）。',
        'e) 若标签或图元重叠导致歧义，必须重排布局，直到关系可一眼判定。'
    ].join('\n');
}

function getPhysicsFigureRuleText() {
    return [
        '【真实世界一致性硬约束（强制执行）】',
        '总则1：图形必须满足真实世界/学科世界的可实现性；禁止“看起来像但物理上不可能”的示意。',
        '总则2：禁止任何穿透/穿模/漂浮/错层/反向接触/无支撑悬空（题干明确悬挂、飞行、受外力托举除外）。',
        '总则3：若无法同时满足题意与真实世界一致性，必须判定该图无效并重绘；仍无法满足则返回figure.type=none、figure.svg空串。',
        '力学约束：物块/滑块/小车必须位于约束表面边界或其上方合理接触处，禁止进入表面内部；接触点必须可见。',
        '力学约束：重力方向统一竖直向下；支持力垂直接触面；摩擦力沿接触面切向且方向与相对运动趋势一致。',
        '约束运动：轨道运动必须沿轨道；摆球到悬点距离恒定；绳约束两端连接真实存在且方向连续。',
        '电学约束：导线连接必须闭合或与题干一致；支路连接点要明确，交叉导线若不连接不得画节点。',
        '几何约束：平行/垂直/相切/相交/重合必须可见可检验，禁止标注与几何事实冲突。',
        '化学约束：键型、键角、取代位点、立体方向必须与题干一致，禁止价键不守恒的结构示意。',
        '生物约束：结构层级与内外边界必须正确，细胞器/组织/器官不得跨越错误边界。',
        '地理约束：方向、比例尺、地物-图例映射一致，禁止图例错绑、区域错位、上下游/迎背风方向颠倒。',
        '输出前必须完成“真实世界一致性清单”逐条核验；任一不满足即判失败并重绘。'
    ].join('\n');
}

function normalizeFigureType(type) {
    const value = cleanDisplayText(type).toLowerCase();
    if (!value) return 'none';

    if (value.includes('none') || value.includes('无图')) return 'none';
    if (value.includes('math') || value.includes('几何') || value.includes('函数') || value.includes('坐标') || value.includes('数学')) return 'math';
    if (value.includes('physics') || value.includes('受力') || value.includes('电路') || value.includes('运动') || value.includes('物理')) return 'physics';
    if (value.includes('chemistry') || value.includes('化学') || value.includes('结构式') || value.includes('实验')) return 'chemistry';
    if (value.includes('biology') || value.includes('生物') || value.includes('细胞') || value.includes('遗传')) return 'biology';
    if (value.includes('geography') || value.includes('地理') || value.includes('地图') || value.includes('地形')) return 'geography';

    return 'other';
}

function normalizeSpatialRelation(value) {
    return cleanDisplayText(value);
}

function normalizeFigureElements(value) {
    return cleanDisplayText(value);
}

function normalizeSvgContent(svg) {
    const raw = cleanDisplayText(svg);
    if (!raw) return '';
    const match = raw.match(/<svg[\s\S]*<\/svg>/i);
    if (!match) return '';

    let safeSvg = match[0]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/\bhref\s*=\s*"\s*javascript:[^"]*"/gi, '')
        .replace(/\bhref\s*=\s*'\s*javascript:[^']*'/gi, '');

    safeSvg = safeSvg.replace(
        /<rect\b(?=[^>]*\bwidth\s*=\s*["'](?:100%|420|400|360|340|320)["'])(?=[^>]*\bheight\s*=\s*["'](?:100%|240|220|200|180|160)["'])(?=[^>]*\bfill\s*=\s*["'](?:#0d1117|#1c2128|#000|#000000|black|rgb\(0,\s*0,\s*0\))["'])[^>]*\/?>/gi,
        ''
    );

    safeSvg = safeSvg.replace(/<svg\b([^>]*)>/i, (full, attrs) => {
        let normalizedAttrs = attrs || '';

        if (!/\bxmlns\s*=/.test(normalizedAttrs)) {
            normalizedAttrs += ' xmlns="http://www.w3.org/2000/svg"';
        }
        if (!/\bpreserveAspectRatio\s*=/.test(normalizedAttrs)) {
            normalizedAttrs += ' preserveAspectRatio="xMidYMid meet"';
        }

        if (!/\bviewBox\s*=/.test(normalizedAttrs)) {
            normalizedAttrs += ' viewBox="0 0 320 180"';
        }

        if (!/\bclass\s*=/.test(normalizedAttrs)) {
            normalizedAttrs += ' class="ai-figure"';
        } else if (!/\bai-figure\b/.test(normalizedAttrs)) {
            normalizedAttrs = normalizedAttrs.replace(/\bclass\s*=\s*"([^"]*)"/i, (m, className) => `class="${className} ai-figure"`);
            normalizedAttrs = normalizedAttrs.replace(/\bclass\s*=\s*'([^']*)'/i, (m, className) => `class="${className} ai-figure"`);
        }

        if (!/\bstyle\s*=/.test(normalizedAttrs)) {
            normalizedAttrs += ' style="color:#ffffff"';
        } else if (!/color\s*:/i.test(normalizedAttrs)) {
            normalizedAttrs = normalizedAttrs.replace(/\bstyle\s*=\s*"([^"]*)"/i, (m, styleValue) => `style="${styleValue};color:#ffffff"`);
            normalizedAttrs = normalizedAttrs.replace(/\bstyle\s*=\s*'([^']*)'/i, (m, styleValue) => `style='${styleValue};color:#ffffff'`);
        }

        return `<svg${normalizedAttrs}>`;
    });

    safeSvg = safeSvg
        .replace(/\b(stroke|fill|color)\s*=\s*"(?:#000|#000000|#111|#111111|#0d1117|#1c2128|black|rgb\(0\s*,\s*0\s*,\s*0\s*\)|rgb\(13\s*,\s*17\s*,\s*23\s*\)|rgb\(28\s*,\s*33\s*,\s*40\s*\))"/gi, '$1="#ffffff"')
        .replace(/\b(stroke|fill|color)\s*=\s*'(?:#000|#000000|#111|#111111|#0d1117|#1c2128|black|rgb\(0\s*,\s*0\s*,\s*0\s*\)|rgb\(13\s*,\s*17\s*,\s*23\s*\)|rgb\(28\s*,\s*33\s*,\s*40\s*\))'/gi, '$1="#ffffff"');

    return safeSvg;
}

function hasAnyKeyword(text, keywords) {
    const source = cleanDisplayText(text);
    if (!source) return false;
    return keywords.some(keyword => source.includes(keyword));
}

function isInclineBlockScenario(text) {
    const hasSlope = hasAnyKeyword(text, ['斜面', '斜坡', '坡面', '斜轨']);
    const hasBlock = hasAnyKeyword(text, ['滑块', '小滑块', '物块', '木块', '小车']);
    return hasSlope && hasBlock;
}

function getNumericSvgAttr(tag, attrName) {
    if (!tag) return null;
    const doubleQuoteMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*"([\\d.-]+)"`, 'i'));
    if (doubleQuoteMatch) return Number(doubleQuoteMatch[1]);

    const singleQuoteMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*'([\\d.-]+)'`, 'i'));
    if (singleQuoteMatch) return Number(singleQuoteMatch[1]);

    return null;
}

function replaceSvgNumericAttr(tag, attrName, nextValue) {
    if (!tag) return tag;
    const value = Number.isFinite(nextValue) ? String(nextValue) : `${nextValue}`;

    if (new RegExp(`\\b${attrName}\\s*=\\s*"`, 'i').test(tag)) {
        return tag.replace(new RegExp(`(\\b${attrName}\\s*=\\s*")([^"]*)(")`, 'i'), `$1${value}$3`);
    }

    if (new RegExp(`\\b${attrName}\\s*=\\s*'`, 'i').test(tag)) {
        return tag.replace(new RegExp(`(\\b${attrName}\\s*=\\s*')([^']*)(')`, 'i'), `$1${value}$3`);
    }

    return tag;
}

function repairInclineBlockPenetration(svgText) {
    const lineMatches = [...svgText.matchAll(/<line\b[^>]*>/gi)].map(item => item[0]);
    const slopeLines = lineMatches
        .map(tag => {
            const x1 = getNumericSvgAttr(tag, 'x1');
            const y1 = getNumericSvgAttr(tag, 'y1');
            const x2 = getNumericSvgAttr(tag, 'x2');
            const y2 = getNumericSvgAttr(tag, 'y2');
            if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.hypot(dx, dy);
            const isSlope = Math.abs(dx) > 24 && Math.abs(dy) > 10;

            if (!isSlope) return null;
            return { tag, x1, y1, x2, y2, length };
        })
        .filter(Boolean)
        .sort((left, right) => right.length - left.length);

    if (!slopeLines.length) return svgText;
    const slopeLine = slopeLines[0];

    const rectMatches = [...svgText.matchAll(/<rect\b[^>]*>/gi)].map(item => item[0]);
    const blockCandidates = rectMatches
        .map(tag => {
            const x = getNumericSvgAttr(tag, 'x');
            const y = getNumericSvgAttr(tag, 'y');
            const width = getNumericSvgAttr(tag, 'width');
            const height = getNumericSvgAttr(tag, 'height');
            if (![x, y, width, height].every(Number.isFinite)) return null;

            const area = width * height;
            const isBlock = width >= 10 && width <= 120 && height >= 8 && height <= 80 && area <= 12000;
            if (!isBlock) return null;

            return { tag, x, y, width, height, area };
        })
        .filter(Boolean)
        .sort((left, right) => left.area - right.area);

    if (!blockCandidates.length) return svgText;
    const block = blockCandidates[0];

    const lineDx = slopeLine.x2 - slopeLine.x1;
    if (Math.abs(lineDx) < 1e-6) return svgText;

    const blockCenterX = block.x + (block.width / 2);
    const t = (blockCenterX - slopeLine.x1) / lineDx;
    if (!Number.isFinite(t)) return svgText;

    const lineY = slopeLine.y1 + t * (slopeLine.y2 - slopeLine.y1);
    const currentBottomY = block.y + block.height;
    const expectedBottomY = lineY - 2.5;

    if (currentBottomY <= expectedBottomY) return svgText;

    const nextY = Math.max(2, Math.round((expectedBottomY - block.height) * 10) / 10);
    const nextRectTag = replaceSvgNumericAttr(block.tag, 'y', nextY);
    return svgText.replace(block.tag, nextRectTag);
}

function repairFigureSpatialConsistency(svgText, figureData = {}, fallbackSummary = '') {
    const safeSvg = cleanDisplayText(svgText);
    if (!safeSvg) return '';

    const figureType = normalizeFigureType(figureData?.type);
    const contextText = cleanDisplayText(`${fallbackSummary || ''} ${figureData?.description || ''} ${figureData?.spatial || ''} ${figureData?.elements || ''}`);

    if (figureType === 'physics' && isInclineBlockScenario(contextText)) {
        return repairInclineBlockPenetration(safeSvg);
    }

    return safeSvg;
}

function buildFallbackFigureSvg(figureType, summary = '') {
    const safeSummary = escapeHtml(cleanDisplayText(summary || '题目图形'));
    const common = `viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="ai-figure" style="color:#ffffff"`;

    if (figureType === 'math') {
        return `<svg ${common}><title>${safeSummary}</title><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="28" y1="150" x2="296" y2="150"/><line x1="52" y1="20" x2="52" y2="164"/><polyline points="52,132 110,94 176,114 232,74 286,94"/><polygon points="296,150 289,147 289,153" fill="#ffffff"/><polygon points="52,20 49,28 55,28" fill="#ffffff"/></g><g fill="#ffffff" font-size="10"><text x="289" y="165">x</text><text x="60" y="30">y</text><text x="108" y="90">A</text><text x="176" y="110">B</text><text x="232" y="70">C</text></g></svg>`;
    }

    if (figureType === 'physics') {
        return `<svg ${common}><title>${safeSummary}</title><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="24" y1="150" x2="296" y2="150"/><line x1="74" y1="150" x2="204" y2="92"/><line x1="204" y1="92" x2="250" y2="150"/><rect x="150" y="104" width="36" height="24" rx="2"/><line x1="168" y1="104" x2="212" y2="70"/><line x1="168" y1="116" x2="168" y2="152"/><polygon points="212,70 205,71 208,64" fill="#ffffff"/><polygon points="168,152 163,144 173,144" fill="#ffffff"/></g><g fill="#ffffff" font-size="10"><text x="215" y="68">F</text><text x="173" y="161">mg</text><text x="208" y="101">θ</text></g></svg>`;
    }

    if (figureType === 'chemistry') {
        return `<svg ${common}><title>${safeSummary}</title><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="86,90 106,78 126,90 126,114 106,126 86,114"/><line x1="126" y1="90" x2="146" y2="78"/><line x1="126" y1="114" x2="146" y2="126"/><line x1="146" y1="78" x2="166" y2="90"/><line x1="146" y1="126" x2="166" y2="114"/><line x1="166" y1="90" x2="166" y2="114"/><rect x="214" y="58" width="54" height="86" rx="4"/><line x1="241" y1="66" x2="241" y2="122"/><ellipse cx="241" cy="128" rx="14" ry="6"/></g><g fill="#ffffff" font-size="10"><text x="72" y="84">C</text><text x="172" y="86">H</text><text x="173" y="123">O</text><text x="253" y="70">滴定</text></g></svg>`;
    }

    if (figureType === 'biology') {
        return `<svg ${common}><title>${safeSummary}</title><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="128" cy="92" rx="74" ry="46"/><ellipse cx="128" cy="92" rx="26" ry="18"/><ellipse cx="176" cy="82" rx="12" ry="7"/><ellipse cx="84" cy="112" rx="10" ry="6"/><line x1="208" y1="66" x2="262" y2="42"/><line x1="158" y1="100" x2="262" y2="126"/></g><g fill="#ffffff" font-size="10"><text x="266" y="44">细胞膜</text><text x="266" y="129">细胞核</text></g></svg>`;
    }

    if (figureType === 'geography') {
        return `<svg ${common}><title>${safeSummary}</title><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="28" y="28" width="264" height="124" rx="2"/><path d="M54 126 C86 92, 118 88, 152 104 S220 140, 266 112"/><path d="M74 64 L92 54 L110 64 L102 64 L102 86 L82 86 L82 64 Z"/><line x1="214" y1="44" x2="214" y2="134" stroke-dasharray="4 4"/><line x1="54" y1="74" x2="278" y2="74" stroke-dasharray="4 4"/></g><g fill="#ffffff" font-size="10"><text x="220" y="56">经线</text><text x="260" y="70">纬线</text></g></svg>`;
    }

    return `<svg ${common}><title>${safeSummary}</title><g fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="28" y="34" width="264" height="112" rx="4" stroke-dasharray="6 4"/><line x1="28" y1="34" x2="292" y2="146"/></g><text x="160" y="96" text-anchor="middle" fill="#ffffff" font-size="11">图形待生成</text></svg>`;
}

function renderFigure(containerId, figureData, fallbackSummary = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const type = normalizeFigureType(figureData?.type);
    const svg = normalizeSvgContent(figureData?.svg);

    if (type === 'none') {
        container.innerHTML = '<p class="placeholder-text">该题型无需图形展示</p>';
        container.classList.remove('has-figure');
        return;
    }

    const baseSvg = svg || buildFallbackFigureSvg(type, fallbackSummary || figureData?.description);
    const finalSvg = repairFigureSpatialConsistency(baseSvg, figureData, fallbackSummary || figureData?.description);
    container.innerHTML = `<div class="svg-wrap">${finalSvg}</div>`;
    container.classList.add('has-figure');
}

function updateAnalyzeFigurePanel(figureData, summary = '') {
    const typeNode = document.getElementById('analyzeFigureType');
    const descNode = document.getElementById('analyzeFigureDesc');
    const type = normalizeFigureType(figureData?.type);

    const typeMap = {
        none: '无图形',
        math: '数学图形',
        physics: '物理图形',
        chemistry: '化学图形',
        biology: '生物图形',
        geography: '地理图形',
        other: '通用图形'
    };

    if (typeNode) {
        typeNode.textContent = typeMap[type] || '图形';
    }

    if (descNode) {
        const desc = cleanDisplayText(figureData?.description);
        descNode.textContent = desc || (type === 'none'
            ? '当前题目未检测到图形信息。'
            : `已识别${typeMap[type] || '图形'}，后续环节将保持图形关联。`);
    }

    renderFigure('analyzeFigureSvg', figureData, summary);
}

function normalizeSubject(subject) {
    const value = cleanDisplayText(subject).toLowerCase();
    if (value.includes('math') || value.includes('数学')) return 'math';
    if (value.includes('physics') || value.includes('物理')) return 'physics';
    if (value.includes('chemistry') || value.includes('化学')) return 'chemistry';
    if (value.includes('biology') || value.includes('生物')) return 'biology';
    if (value.includes('geography') || value.includes('地理')) return 'geography';
    return 'other';
}

function buildSummaryFallback(sourceText) {
    const cleaned = cleanDisplayText(sourceText);
    if (!cleaned) return '未命名题目';
    return cleaned.length > 24 ? `${cleaned.slice(0, 24)}...` : cleaned;
}

function normalizeAnalysisResult(result, sourceText) {
    const safeResult = result && typeof result === 'object' ? result : {};
    const normalizePart = (part, defaultSeq, defaultContent) => ({
        sequence: cleanDisplayText(part?.sequence || defaultSeq),
        content: cleanDisplayText(part?.content || defaultContent)
    });

    return {
        condition: normalizePart(safeResult.condition, '条件-未分类', '请重新解析后获取条件拆解'),
        pattern: normalizePart(safeResult.pattern, '问题-未分类', '请重新解析后获取问题类型'),
        solution: normalizePart(safeResult.solution, '解法-未分类', '请重新解析后获取解题思路'),
        subject: normalizeSubject(safeResult.subject),
        summary: cleanDisplayText(safeResult.summary || buildSummaryFallback(sourceText)),
        figure: {
            type: normalizeFigureType(safeResult.figure?.type),
            description: cleanDisplayText(safeResult.figure?.description || ''),
            spatial: normalizeSpatialRelation(safeResult.figure?.spatial || safeResult.figure?.spatialRelation),
            elements: normalizeFigureElements(safeResult.figure?.elements || safeResult.figure?.elementList),
            svg: normalizeSvgContent(safeResult.figure?.svg)
        }
    };
}

function normalizeAssistantContent(content) {
    if (content === undefined || content === null) return '';
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
        return content
            .map(item => {
                if (typeof item === 'string') return item;
                if (item && typeof item.text === 'string') return item.text;
                if (item && item.type === 'text' && typeof item.text === 'string') return item.text;
                return '';
            })
            .filter(Boolean)
            .join('\n')
            .trim();
    }

    if (typeof content === 'object') {
        if (typeof content.text === 'string') return content.text;
        if (typeof content.content === 'string') return content.content;
    }

    return String(content);
}

function extractBalancedJsonObject(rawText) {
    const text = String(rawText || '');
    let start = -1;
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (ch === '\\') {
            if (inString) escapeNext = true;
            continue;
        }

        if (ch === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (ch === '{') {
            if (start === -1) start = i;
            depth += 1;
            continue;
        }

        if (ch === '}') {
            if (start === -1) continue;
            depth -= 1;
            if (depth === 0) {
                return text.slice(start, i + 1);
            }
        }
    }

    return '';
}

function sanitizeJsonCandidate(raw) {
    if (!raw) return '';
    return String(raw)
        .replace(/^\uFEFF/, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function tryParseJsonCandidate(raw) {
    const candidate = sanitizeJsonCandidate(raw);
    if (!candidate) return null;

    try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object') return parsed;
        if (typeof parsed === 'string') {
            const nested = JSON.parse(parsed);
            if (nested && typeof nested === 'object') return nested;
        }
    } catch (error) {
        return null;
    }

    return null;
}

function extractJsonObject(content) {
    const normalized = normalizeAssistantContent(content);
    if (!normalized) return null;

    const candidates = [];

    candidates.push(normalized);

    const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        candidates.push(fencedMatch[1]);
    }

    const balancedFromRaw = extractBalancedJsonObject(normalized);
    if (balancedFromRaw) candidates.push(balancedFromRaw);

    const rawNoFence = normalized
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    if (rawNoFence && rawNoFence !== normalized) {
        candidates.push(rawNoFence);
        const balancedFromNoFence = extractBalancedJsonObject(rawNoFence);
        if (balancedFromNoFence) candidates.push(balancedFromNoFence);
    }

    const uniqueCandidates = [...new Set(candidates.filter(Boolean))];
    for (const candidate of uniqueCandidates) {
        const parsed = tryParseJsonCandidate(candidate);
        if (parsed) return parsed;
    }

    return null;
}

function buildRawContentDebug(content, maxLength = 400) {
    const text = normalizeAssistantContent(content);
    if (!text) return '空响应';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...(已截断，原始长度${text.length})`;
}

async function requestJsonResponseWithRetry(baseMessages, options = {}) {
    const {
        temperature = 0.3,
        maxTokens = 2800,
        scene = '任务',
        validator = null,
        retryHint = '上一条输出未通过解析。请仅返回一个合法JSON对象，不要代码块，不要额外说明。'
    } = options;

    const attempts = [
        baseMessages,
        [...baseMessages, { role: 'user', content: retryHint }]
    ];

    let lastError = null;

    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
        const response = await fetch(API_CONFIG.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages: attempts[attemptIndex],
                temperature,
                max_tokens: maxTokens
            })
        });

        const rawPayload = await response.text();
        let payload = null;
        try {
            payload = JSON.parse(rawPayload);
        } catch (error) {
            payload = null;
        }

        if (!response.ok) {
            const detail = cleanDisplayText(payload?.error?.message || payload?.message || rawPayload)
                .slice(0, 300);
            lastError = new Error(`API error: ${response.status} ${detail}`);
            continue;
        }

        if (!payload || !payload.choices?.length) {
            lastError = new Error(`${scene}接口返回异常(第${attemptIndex + 1}次)：${cleanDisplayText(rawPayload).slice(0, 300)}`);
            continue;
        }

        const content = payload.choices?.[0]?.message?.content;
        const parsed = extractJsonObject(content);

        if (parsed && (!validator || validator(parsed))) {
            return parsed;
        }

        const finishReason = payload.choices?.[0]?.finish_reason
            ? `，finish_reason=${payload.choices[0].finish_reason}`
            : '';
        lastError = new Error(`${scene}响应格式无效(第${attemptIndex + 1}次${finishReason})：${buildRawContentDebug(content)}`);
    }

    throw lastError || new Error(`${scene}请求失败`);
}

function buildSourceText(textInput, hasImage) {
    const cleanedInput = cleanDisplayText(textInput);
    if (cleanedInput) return cleanedInput;
    if (hasImage && uploadedFileName) return `用户上传图片：${cleanDisplayText(uploadedFileName)}`;
    if (hasImage) return '用户上传图片题目';
    return '用户上传题目';
}

function getQuestionById(questionId) {
    return geneDatabase.questions.find(q => q.id === questionId) || null;
}

function getOrderedQuestions() {
    return [...geneDatabase.questions].sort((a, b) => {
        const bTime = new Date(b.parsedAt || 0).getTime() || Number(b.id) || 0;
        const aTime = new Date(a.parsedAt || 0).getTime() || Number(a.id) || 0;
        if (bTime === aTime) {
            return (Number(b.id) || 0) - (Number(a.id) || 0);
        }
        return bTime - aTime;
    });
}

function getLinkedQuestion() {
    if (!geneDatabase.questions.length) return null;
    if (linkedQuestionId !== null) {
        const linkedQuestion = getQuestionById(linkedQuestionId);
        if (linkedQuestion) return linkedQuestion;
    }
    return getOrderedQuestions()[0];
}

function setLinkedQuestion(questionId) {
    const question = getQuestionById(questionId);
    if (!question) return;

    linkedQuestionId = question.id;

    updateSectionRelationHints(question);
}

function updateSectionRelationHints(question = getLinkedQuestion()) {
    const noDataText = '请先在“题目解析”中上传并解析题目。';

    const mutationHint = document.getElementById('mutationRelationHint');
    const createHint = document.getElementById('createRelationHint');
    const mutationPreview = document.getElementById('mutationSourcePreview');
    const createPreview = document.getElementById('createSourcePreview');

    const summaryText = question
        ? `基准原题（上次解析）：${cleanDisplayText(question.summary)}`
        : noDataText;

    const sourceText = question
        ? `原题内容：${cleanDisplayText(question.sourceText || question.summary)}`
        : noDataText;

    if (mutationHint) mutationHint.textContent = summaryText;
    if (createHint) createHint.textContent = summaryText;
    if (mutationPreview) mutationPreview.textContent = sourceText;
    if (createPreview) createPreview.textContent = sourceText;
}

function resetDownstreamPanels() {
    const mutationContainers = [
        document.getElementById('mutation1'),
        document.getElementById('mutation2'),
        document.getElementById('mutation3')
    ];

    mutationContainers.forEach((container, index) => {
        if (!container) return;
        container.innerHTML = `<p class="placeholder-text">已切换为上次解析题目，请点击“生成变形题”刷新结果（层级${index + 1}）</p>`;
    });

    const createPreview = document.getElementById('questionPreview');
    const createAnalysis = document.getElementById('questionAnalysis');

    if (createPreview) {
        createPreview.innerHTML = '<p class="placeholder-text">已切换为上次解析题目，请点击“生成练习题”刷新结果</p>';
    }

    if (createAnalysis) {
        createAnalysis.innerHTML = '';
    }

    const questionFigure = document.getElementById('questionFigure');
    if (questionFigure) {
        questionFigure.innerHTML = '<p class="placeholder-text">如题目涉及图形，生成后会显示对应图形</p>';
        questionFigure.classList.remove('has-figure');
    }
}

// Analyzer
function initAnalyzer() {
    elements.analyzeBtn.addEventListener('click', analyzeQuestion);
}

async function analyzeQuestion() {
    const textInput = elements.questionInput.value.trim();

    if (!textInput && !uploadedImage) {
        showToast('请输入题目文本或上传题目图片');
        return;
    }

    showLoader(true);
    elements.analyzeBtn.disabled = true;

    try {
        const sourceText = buildSourceText(textInput, Boolean(uploadedImage));
        const rawResult = await callAI(textInput, uploadedImage);
        const result = normalizeAnalysisResult(rawResult, sourceText);

        displayGeneResult(result);
        const savedQuestion = saveToDatabase(result, sourceText);
        setLinkedQuestion(savedQuestion.id);
        resetDownstreamPanels();
        lastAnalyzedText = cleanDisplayText(textInput);
        resetQuestionInputState();
    } catch (error) {
        console.error('Analysis error:', error);
        showToast('题目解析失败，请检查网络后重试');
    } finally {
        showLoader(false);
        elements.analyzeBtn.disabled = false;
    }
}

async function callAI(text, image) {
    const messages = [{
        role: 'system',
        content: `你是一个专业的题目结构分析专家，帮助学生深度理解题目。请将题目拆解为三个维度：

1. 已知条件拆解: 分析题目给出的已知条件、数据、约束，帮助学生理清"题目给了什么"
2. 问题类型识别: 分析题目的提问方式、求解目标，帮助学生明确"题目问什么"
3. 解题思路分析: 分析适用的解题方法、思路框架，帮助学生知道"应该怎么做"

4. 图形识别与重建: 如果题目含图形（数学/物理/化学/生物/地理），识别图形类型并给出可直接显示的SVG

输出要求：
- 结果必须是学生可直接阅读的中文纯文本，不要返回代码块
- 不要使用$...$或\\(...\\)这类公式包裹格式
- 公式请用常见可读写法，例如 x²、√(a+b)、(x+1)/(x-1)
- 如果题目有图，figure.svg必须返回完整<svg>...</svg>，保证前端可直接渲染
- figure.svg必须与题干图形逐项对应（元素、数量、方向、标注名、相对位置）
- 图形必须精细，禁止泛化示意图、禁止加入题干未出现的对象
- 图形线条和文字统一使用白色，禁止黑色；默认建议viewBox 320x180
- 必须提取并填写figure.spatial（空间关系）和figure.elements（关键元素清单）
- figure.elements必须逐行列出，格式固定为：元素ID|元素名|类型|符号文本|数量/状态|绝对位置(上中下+左中右)|关键坐标|几何/语义约束|关联元素ID
- figure.spatial必须逐行列出，格式固定为：关系ID|主体ID|关系类型|客体ID|方向/角度/距离/接触点/包含边界|判定依据
- 必须覆盖每一个图元元素与每一个符号元素（字母/数字/角标/单位/希腊字母/运算符），并保持ID一一对应
- 严禁空间关系错误、拓扑错误与物理常识错误：例如穿模、错层、错误接触、图例错绑、标签错绑
- 必须追加“真实世界一致性校验”结论；若任何约束不满足，必须重绘，仍不满足则返回figure.type=none且figure.svg留空
- 如果题目无图，figure.type返回none，figure.svg留空

请用JSON格式返回，包含以下字段：
{
    "condition": {
        "content": "已知条件的详细拆解分析，用通俗易懂的语言",
        "sequence": "题型编码，如 条件-数值方程-双变量"
    },
    "pattern": {
        "content": "问题类型的详细分析",
        "sequence": "题型编码，如 问题-求最值"
    },
    "solution": {
        "content": "解题思路的详细分析，包括关键步骤",
        "sequence": "题型编码，如 解法-导数法"
    },
    "subject": "学科分类(math/physics/chemistry等)",
    "summary": "题目的一句话概括",
    "figure": {
        "type": "none/math/physics/chemistry/biology/geography/other",
        "description": "图形要点说明；无图填空字符串",
        "spatial": "图形空间关系说明；无图填空字符串",
        "elements": "图形关键元素清单；无图填空字符串",
        "svg": "完整SVG字符串；无图填空字符串"
    }
}`
    }];

    const userContent = [];

    if (text) {
        userContent.push({ type: 'text', text: `请分析以下题目：\n${text}` });
    }

    if (image) {
        userContent.push({
            type: 'image_url',
            image_url: { url: image }
        });
        if (!text) {
            userContent.unshift({ type: 'text', text: '请分析图片中的题目：' });
        }
    }

    userContent.push({
        type: 'text',
        text: getUniversalFigureRulesText()
    });

    userContent.push({
        type: 'text',
        text: getFigureFieldGranularityText()
    });

    userContent.push({
        type: 'text',
        text: getFigureRenderOrderRulesText()
    });

    userContent.push({
        type: 'text',
        text: getPhysicsFigureRuleText()
    });

    messages.push({ role: 'user', content: userContent });

    const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
            model: API_CONFIG.model,
            messages: messages,
            temperature: 0.2,
            max_tokens: 3200
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    const parsed = extractJsonObject(content);
    if (!parsed) {
        throw new Error(`Invalid response format: ${buildRawContentDebug(content)}`);
    }

    if (!parsed.condition || !parsed.pattern || !parsed.solution) {
        throw new Error('Invalid response schema: 缺少 condition/pattern/solution');
    }

    return parsed;
}

function displayGeneResult(result) {
    setFormattedContent(document.getElementById('conditionContent'), result.condition.content, '暂无条件拆解');
    document.getElementById('conditionSeq').textContent = cleanDisplayText(result.condition.sequence);

    setFormattedContent(document.getElementById('patternContent'), result.pattern.content, '暂无问题类型');
    document.getElementById('patternSeq').textContent = cleanDisplayText(result.pattern.sequence);

    setFormattedContent(document.getElementById('solutionContent'), result.solution.content, '暂无解题思路');
    document.getElementById('solutionSeq').textContent = cleanDisplayText(result.solution.sequence);

    updateAnalyzeFigurePanel(result.figure, result.summary);

    elements.geneResult.classList.add('active');
    showToast('题目解析完成！');
}

function upsertGeneRecord(targetList, nextGene) {
    const existing = targetList.find(item => item.sequence === nextGene.sequence);
    if (existing) {
        existing.count = (existing.count || 1) + 1;
        if (!existing.content && nextGene.content) {
            existing.content = nextGene.content;
        }
        return;
    }

    targetList.push({
        sequence: nextGene.sequence,
        content: nextGene.content,
        count: 1
    });
}

function saveToDatabase(result, sourceText = '') {
    const question = {
        id: Date.now(),
        summary: cleanDisplayText(result.summary),
        subject: normalizeSubject(result.subject),
        condition: {
            sequence: cleanDisplayText(result.condition?.sequence),
            content: cleanDisplayText(result.condition?.content)
        },
        pattern: {
            sequence: cleanDisplayText(result.pattern?.sequence),
            content: cleanDisplayText(result.pattern?.content)
        },
        solution: {
            sequence: cleanDisplayText(result.solution?.sequence),
            content: cleanDisplayText(result.solution?.content)
        },
        figure: {
            type: normalizeFigureType(result.figure?.type),
            description: cleanDisplayText(result.figure?.description || ''),
            spatial: normalizeSpatialRelation(result.figure?.spatial || result.figure?.spatialRelation),
            elements: normalizeFigureElements(result.figure?.elements || result.figure?.elementList),
            svg: normalizeSvgContent(result.figure?.svg)
        },
        sourceText: cleanDisplayText(sourceText),
        parsedAt: new Date().toISOString()
    };

    geneDatabase.questions.push(question);

    upsertGeneRecord(geneDatabase.conditions, question.condition);
    upsertGeneRecord(geneDatabase.patterns, question.pattern);
    upsertGeneRecord(geneDatabase.solutions, question.solution);

    updateSectionRelationHints(question);

    return question;
}

function showLoader(show) {
    elements.dnaLoader.classList.toggle('active', show);
    elements.geneResult.classList.toggle('active', !show);
}

// Mutation Prediction
function initMutation() {
    const mutateBtn = document.getElementById('mutateBtn');
    if (mutateBtn) {
        mutateBtn.addEventListener('click', predictMutations);
    }
}

async function predictMutations() {
    const linkedQuestion = getLinkedQuestion();
    if (!linkedQuestion) {
        showToast('请先在题目解析中解析题目');
        return;
    }

    const question = linkedQuestion;

    setLinkedQuestion(question.id);

    // 显示加载状态
    const loader = document.getElementById('mutationLoader');
    const cards = document.getElementById('mutationCards');
    const btn = document.getElementById('mutateBtn');

    if (loader) loader.classList.add('active');
    if (cards) cards.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
        const mutations = await callMutationAI(question);
        displayMutations(mutations);
    } catch (error) {
        console.error('Mutation error:', error?.message || error);
        showToast('变形题生成失败，请重试');
    } finally {
        // 隐藏加载状态
        if (loader) loader.classList.remove('active');
        if (cards) cards.classList.remove('hidden');
        if (btn) btn.disabled = false;
    }
}

async function callMutationAI(question) {
    const messages = [{
        role: 'system',
        content: `你是一个题目变形预测专家，帮助学生预测考试可能出现的变形题。基于给定的题目结构，预测三种可能的变形题：
1. 简单变形：仅改变数值或简单条件，题型本质不变
2. 中等变形：改变问法或增加条件，需要灵活应对
3. 综合变形：综合多个知识点或改变解法方向，难度提升

输出要求：
- 必须基于“原题”进行变形，体现和原题的关系
- 结果必须是学生可直接阅读的中文文本
- 不要使用$...$、\\(...\\)、代码块标记等格式符号
- 公式请写成常见可读形式，例如 x²、√(a+b)、(x+1)/(x-1)
- 若原题有图，三道变形题都要给出匹配学科特点的SVG图，保证前端可直接显示
- 每道变形题的figure.svg必须逐项匹配该题题干（元素、数量、方向、标注、相对位置）
- 图形必须精细，禁止仅画通用占位图，禁止出现与题干无关对象
- 图形线条和文字统一使用白色，禁止黑色；默认建议viewBox 320x180
- 每道变形题必须返回figure.spatial与figure.elements，且与该题题干完全一致
- 每道题的figure.elements必须逐行列出，格式固定：元素ID|元素名|类型|符号文本|数量/状态|绝对位置(上中下+左中右)|关键坐标|几何/语义约束|关联元素ID
- 每道题的figure.spatial必须逐行列出，格式固定：关系ID|主体ID|关系类型|客体ID|方向/角度/距离/接触点/包含边界|判定依据
- 必须覆盖每一个图元元素与每一个符号元素（字母/数字/角标/单位/希腊字母/运算符），并保持ID一一对应
- 严禁空间关系错误、拓扑错误与物理常识错误：例如穿模、错层、错误接触、图例错绑、标签错绑
- 每道题都必须追加“真实世界一致性校验”结论；若任何约束不满足，必须重绘，仍不满足则该题figure.type=none且figure.svg留空
- 若原题无图，figure.type返回none且figure.svg留空

请用JSON格式返回：
{
    "mutations": [
        {
            "level": "简单",
            "probability": 85,
            "description": "变形方式说明",
            "example": "完整的变形题目",
            "figure": {
                "type": "none/math/physics/chemistry/biology/geography/other",
                "description": "图形说明",
                "spatial": "空间关系说明",
                "elements": "关键元素清单",
                "svg": "完整SVG字符串"
            }
        },
        {
            "level": "中等",
            "probability": 60,
            "description": "变形方式说明",
            "example": "完整的变形题目",
            "figure": {
                "type": "none/math/physics/chemistry/biology/geography/other",
                "description": "图形说明",
                "spatial": "空间关系说明",
                "elements": "关键元素清单",
                "svg": "完整SVG字符串"
            }
        },
        {
            "level": "综合",
            "probability": 25,
            "description": "变形方式说明",
            "example": "完整的变形题目",
            "figure": {
                "type": "none/math/physics/chemistry/biology/geography/other",
                "description": "图形说明",
                "spatial": "空间关系说明",
                "elements": "关键元素清单",
                "svg": "完整SVG字符串"
            }
        }
    ]
}`
    }, {
        role: 'user',
        content: `请严格基于以下原题及结构预测变形题：
原题题干: ${question.sourceText || question.summary}
原题概括: ${question.summary}
已知条件: ${question.condition.sequence} - ${question.condition.content}
问题类型: ${question.pattern.sequence} - ${question.pattern.content}
解题思路: ${question.solution.sequence} - ${question.solution.content}
原题图形类型: ${question.figure?.type || 'none'}
原题图形说明: ${question.figure?.description || '无'}
原题图形空间关系: ${question.figure?.spatial || '无'}
原题图形关键元素: ${question.figure?.elements || '无'}
原题图形SVG(原文): ${buildSvgPromptSnippet(question.figure?.svg)}
请严格输出三道题各自的空间关系与元素清单，并确保SVG与题干逐项一致。`
    }];

    messages.push({
        role: 'user',
        content: getUniversalFigureRulesText()
    });

    messages.push({
        role: 'user',
        content: getFigureFieldGranularityText()
    });

    messages.push({
        role: 'user',
        content: getFigureRenderOrderRulesText()
    });

    messages.push({
        role: 'user',
        content: getPhysicsFigureRuleText()
    });

    const parsed = await requestJsonResponseWithRetry(messages, {
        temperature: 0.3,
        maxTokens: 3200,
        scene: '变形预测',
        validator: payload => Array.isArray(payload?.mutations),
        retryHint: '上一条输出不是合法JSON或缺少mutations数组。请仅返回JSON对象，且必须包含mutations数组(3项)。'
    });

    const normalizedMutations = parsed.mutations.slice(0, 3).map((item, index) => ({
        level: cleanDisplayText(item?.level || ['简单', '中等', '综合'][index] || '变形'),
        probability: Number(item?.probability) || [85, 60, 25][index] || 30,
        description: cleanDisplayText(item?.description || ''),
        example: cleanDisplayText(item?.example || ''),
        figure: {
            type: normalizeFigureType(item?.figure?.type || question.figure?.type || 'none'),
            description: cleanDisplayText(item?.figure?.description || ''),
            spatial: normalizeSpatialRelation(item?.figure?.spatial || item?.figure?.spatialRelation),
            elements: normalizeFigureElements(item?.figure?.elements || item?.figure?.elementList),
            svg: normalizeSvgContent(item?.figure?.svg)
        }
    }));

    return { mutations: normalizedMutations };
}

function displayMutations(result) {
    const mutations = result.mutations || [];

    const linkedQuestion = getLinkedQuestion();
    const sourceTip = linkedQuestion
        ? `<p class="source-tip">基于原题：${escapeHtml(cleanDisplayText(linkedQuestion.summary))}</p>`
        : '';

    mutations.forEach((m, i) => {
        const container = document.getElementById(`mutation${i + 1}`);
        if (container) {
            container.innerHTML = `
                ${sourceTip}
                <p><strong>${escapeHtml(cleanDisplayText(m.description || '暂无说明'))}</strong></p>
                <p style="margin-top: 0.5rem; color: var(--text-primary);">${formatDisplayHtml(m.example || '暂无变形题')}</p>
                <div class="generated-figure-box" id="mutationFigure${i + 1}"></div>
            `;

            renderFigure(`mutationFigure${i + 1}`, m.figure, m.example);
        }

        const card = container?.closest('.mutation-card');
        const probNode = card?.querySelector('.mutation-prob');
        if (probNode) {
            const probability = Number(m.probability);
            probNode.textContent = `考试出现率: ${Number.isFinite(probability) ? probability : 0}%`;
        }
    });

    for (let index = mutations.length; index < 3; index += 1) {
        const container = document.getElementById(`mutation${index + 1}`);
        if (container) {
            container.innerHTML = '<p class="placeholder-text">该层级暂未生成变形题</p>';
        }
    }

    showToast('变形题生成完成！');
}

function initAssembly() {
    const createBtn = document.getElementById('createBtn');
    if (createBtn) {
        createBtn.addEventListener('click', synthesizeQuestion);
    }
}

async function synthesizeQuestion() {
    const linkedQuestion = getLinkedQuestion();
    if (!linkedQuestion) {
        showToast('请先在题目解析中解析一道原题');
        return;
    }

    const linkedSlots = {
        condition: cleanDisplayText(linkedQuestion.condition?.sequence),
        pattern: cleanDisplayText(linkedQuestion.pattern?.sequence),
        solution: cleanDisplayText(linkedQuestion.solution?.sequence)
    };

    if (!linkedSlots.condition || !linkedSlots.pattern || !linkedSlots.solution) {
        showToast('上次解析题目的题型信息不完整，请重新解析该题');
        return;
    }

    setLinkedQuestion(linkedQuestion.id);

    // 显示加载状态
    const loader = document.getElementById('createLoader');
    const results = document.getElementById('createResults');
    const btn = document.getElementById('createBtn');

    if (loader) loader.classList.add('active');
    if (results) results.classList.add('hidden');
    if (btn) btn.disabled = true;

    try {
        const result = await callSynthesisAI(linkedQuestion, linkedSlots);
        displaySynthesizedQuestion(result);
    } catch (error) {
        console.error('Synthesis error:', error?.message || error);
        showToast('练习题生成失败，请重试');
    } finally {
        // 隐藏加载状态
        if (loader) loader.classList.remove('active');
        if (results) results.classList.remove('hidden');
        if (btn) btn.disabled = false;
    }
}

async function callSynthesisAI(linkedQuestion, slots) {

    const messages = [{
        role: 'system',
        content: `你是一个题目创作专家，帮助学生通过举一反三加深理解。基于给定的三种题型要素，创造一道全新的练习题。

输出要求：
- 必须和原题保持同一知识主线，体现“由原题迁移”
- 不要照抄原题，需给出有变化的新题
- 结果必须是学生可直接阅读的中文文本
- 不要使用$...$、\\(...\\)、代码块标记等格式符号
- 公式请写成常见可读形式，例如 x²、√(a+b)、(x+1)/(x-1)
- 若原题有图，必须生成对应学科风格图形SVG
- figure.svg必须逐项匹配新题题干（元素、数量、方向、标注、相对位置）
- 图形必须精细，禁止泛化占位图，禁止加入题干无关细节
- 图形线条和文字统一使用白色，禁止黑色；默认建议viewBox 320x180
- 必须返回figure.spatial与figure.elements，并逐项对应新题题干
- figure.elements必须逐行列出，格式固定：元素ID|元素名|类型|符号文本|数量/状态|绝对位置(上中下+左中右)|关键坐标|几何/语义约束|关联元素ID
- figure.spatial必须逐行列出，格式固定：关系ID|主体ID|关系类型|客体ID|方向/角度/距离/接触点/包含边界|判定依据
- 必须覆盖每一个图元元素与每一个符号元素（字母/数字/角标/单位/希腊字母/运算符），并保持ID一一对应
- 严禁空间关系错误、拓扑错误与物理常识错误：例如穿模、错层、错误接触、图例错绑、标签错绑
- 必须追加“真实世界一致性校验”结论；若任何约束不满足，必须重绘，仍不满足则返回figure.type=none且figure.svg留空
- 若原题无图，figure.type返回none且figure.svg留空

请用JSON格式返回：
{
    "question": "完整的题目内容",
    "analysis": "这道题的解题思路和关键步骤",
    "figure": {
        "type": "none/math/physics/chemistry/biology/geography/other",
        "description": "图形说明",
        "spatial": "空间关系说明",
        "elements": "关键元素清单",
        "svg": "完整SVG字符串"
    }
}`
    }, {
        role: 'user',
        content: `请仅基于以下“上次解析题目”创造新题目：
原题题干: ${linkedQuestion?.sourceText || linkedQuestion?.summary || '暂无'}
原题概括: ${linkedQuestion?.summary || '暂无'}
条件拆解: ${linkedQuestion?.condition?.sequence || slots.condition} - ${linkedQuestion?.condition?.content || '暂无'}
问题类型: ${linkedQuestion?.pattern?.sequence || slots.pattern} - ${linkedQuestion?.pattern?.content || '暂无'}
解题思路: ${linkedQuestion?.solution?.sequence || slots.solution} - ${linkedQuestion?.solution?.content || '暂无'}
原题图形类型: ${linkedQuestion?.figure?.type || 'none'}
原题图形说明: ${linkedQuestion?.figure?.description || '无'}
原题图形空间关系: ${linkedQuestion?.figure?.spatial || '无'}
原题图形关键元素: ${linkedQuestion?.figure?.elements || '无'}
原题图形SVG(原文): ${buildSvgPromptSnippet(linkedQuestion?.figure?.svg)}
请严格输出新题对应的空间关系与元素清单，并确保SVG与新题题干100%一致。`
    }];

    messages.push({
        role: 'user',
        content: getUniversalFigureRulesText()
    });

    messages.push({
        role: 'user',
        content: getFigureFieldGranularityText()
    });

    messages.push({
        role: 'user',
        content: getFigureRenderOrderRulesText()
    });

    messages.push({
        role: 'user',
        content: getPhysicsFigureRuleText()
    });

    const parsed = await requestJsonResponseWithRetry(messages, {
        temperature: 0.3,
        maxTokens: 2800,
        scene: '举一反三',
        validator: payload => typeof payload === 'object' && payload !== null,
        retryHint: '上一条输出不是合法JSON。请仅返回JSON对象，且必须包含question与analysis字段。'
    });

    return {
        question: cleanDisplayText(parsed.question || ''),
        analysis: cleanDisplayText(parsed.analysis || ''),
        figure: {
            type: normalizeFigureType(parsed.figure?.type || linkedQuestion?.figure?.type || 'none'),
            description: cleanDisplayText(parsed.figure?.description || ''),
            spatial: normalizeSpatialRelation(parsed.figure?.spatial || parsed.figure?.spatialRelation),
            elements: normalizeFigureElements(parsed.figure?.elements || parsed.figure?.elementList),
            svg: normalizeSvgContent(parsed.figure?.svg)
        }
    };
}

function displaySynthesizedQuestion(result) {
    const preview = document.getElementById('questionPreview');
    const analysis = document.getElementById('questionAnalysis');

    const linkedQuestion = getLinkedQuestion();

    if (preview) {
        const sourceTip = linkedQuestion
            ? `<p class="source-tip">基于原题：${escapeHtml(cleanDisplayText(linkedQuestion.summary))}</p>`
            : '';

        preview.innerHTML = `${sourceTip}${formatDisplayHtml(result.question || '生成失败')}`;
    }

    renderFigure('questionFigure', result.figure, result.question);

    if (analysis) {
        analysis.innerHTML = `<strong>解题思路：</strong><br>${formatDisplayHtml(result.analysis || '')}`;
    }

    showToast('练习题生成完成！');
}

// Toast Notification
function showToast(message) {
    const toast = elements.toast;
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
