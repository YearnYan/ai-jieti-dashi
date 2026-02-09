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
        summary: cleanDisplayText(safeResult.summary || buildSummaryFallback(sourceText))
    };
}

function extractJsonObject(content) {
    if (!content) return null;

    const raw = String(content).trim();
    try {
        return JSON.parse(raw);
    } catch (error) {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
            return null;
        }
    }
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
        return bTime - aTime;
    });
}

function getLinkedQuestion() {
    if (!geneDatabase.questions.length) return null;
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

        uploadedImage = null;
        uploadedFileName = '';
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

输出要求：
- 结果必须是学生可直接阅读的中文纯文本，不要返回代码块
- 不要使用$...$或\\(...\\)这类公式包裹格式
- 公式请用常见可读写法，例如 x²、√(a+b)、(x+1)/(x-1)

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
    "summary": "题目的一句话概括"
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
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const parsed = extractJsonObject(content);
    if (!parsed) {
        throw new Error('Invalid response format');
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
        console.error('Mutation error:', error);
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

请用JSON格式返回：
{
    "mutations": [
        {"level": "简单", "probability": 85, "description": "变形方式说明", "example": "完整的变形题目"},
        {"level": "中等", "probability": 60, "description": "变形方式说明", "example": "完整的变形题目"},
        {"level": "综合", "probability": 25, "description": "变形方式说明", "example": "完整的变形题目"}
    ]
}`
    }, {
        role: 'user',
        content: `请严格基于以下原题及结构预测变形题：
原题题干: ${question.sourceText || question.summary}
原题概括: ${question.summary}
已知条件: ${question.condition.sequence} - ${question.condition.content}
问题类型: ${question.pattern.sequence} - ${question.pattern.content}
解题思路: ${question.solution.sequence} - ${question.solution.content}`
    }];

    const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
            model: API_CONFIG.model,
            messages: messages,
            temperature: 0.8,
            max_tokens: 2000
        })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(content);

    if (!parsed || !Array.isArray(parsed.mutations)) {
        return { mutations: [] };
    }

    const normalizedMutations = parsed.mutations.slice(0, 3).map((item, index) => ({
        level: cleanDisplayText(item?.level || ['简单', '中等', '综合'][index] || '变形'),
        probability: Number(item?.probability) || [85, 60, 25][index] || 30,
        description: cleanDisplayText(item?.description || ''),
        example: cleanDisplayText(item?.example || '')
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
            `;
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
        console.error('Synthesis error:', error);
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

请用JSON格式返回：
{
    "question": "完整的题目内容",
    "analysis": "这道题的解题思路和关键步骤"
}`
    }, {
        role: 'user',
        content: `请仅基于以下“上次解析题目”创造新题目：
原题题干: ${linkedQuestion?.sourceText || linkedQuestion?.summary || '暂无'}
原题概括: ${linkedQuestion?.summary || '暂无'}
条件拆解: ${linkedQuestion?.condition?.sequence || slots.condition} - ${linkedQuestion?.condition?.content || '暂无'}
问题类型: ${linkedQuestion?.pattern?.sequence || slots.pattern} - ${linkedQuestion?.pattern?.content || '暂无'}
解题思路: ${linkedQuestion?.solution?.sequence || slots.solution} - ${linkedQuestion?.solution?.content || '暂无'}`
    }];

    const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
            model: API_CONFIG.model,
            messages: messages,
            temperature: 0.9,
            max_tokens: 1500
        })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(content);

    if (!parsed) {
        return { question: '', analysis: '' };
    }

    return {
        question: cleanDisplayText(parsed.question || ''),
        analysis: cleanDisplayText(parsed.analysis || '')
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
