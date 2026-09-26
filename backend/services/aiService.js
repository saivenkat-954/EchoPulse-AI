const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');

const GeminiInsightSchema = z.object({
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  summary: z.string().min(1),
  possibleContributingFactors: z.array(z.string().min(1)).min(1),
  investigationChecklist: z.array(z.string().min(1)).min(1),
  recommendedActions: z.array(z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  })).min(1),
  monitoringPlan: z.string().min(1),
  whyThisCouldBeHappening: z.string().min(1).optional().default('')
});

function n(v) { return Number(v || 0); }
function round(v, digits = 1) {
  const x = Number(v);
  if (!Number.isFinite(x)) return 0;
  return Number(x.toFixed(digits));
}
function pct(current, baseline) {
  const c = n(current), b = n(baseline);
  if (b === 0) return c === 0 ? 0 : 100;
  return round(((c - b) / b) * 100, 1);
}

/**
 * Build a deterministic evidence pack before Gemini is called.
 * Gemini receives this pack and interprets it; it does not calculate the metrics.
 */
function buildEvidencePack(ctx) {
  const series = (ctx.history || []).map(x => ({
    month: x.month,
    quantity: n(x.quantity),
    cost: n(x.cost),
    recordCount: n(x.recordCount),
    notes: x.notes || ''
  })).sort((a, b) => String(a.month).localeCompare(String(b.month)));

  const current = n(ctx.currentValue);
  const baseline = n(ctx.baselineValue);
  const productionSeries = (ctx.productionHistory || []).map(x => ({
    month: x.month,
    outputQuantity: n(x.outputQuantity)
  })).sort((a, b) => String(a.month).localeCompare(String(b.month)));

  const previous = series.length > 1 ? series[series.length - 2] : null;
  const priorSeries = series.filter(x => x.month !== ctx.latestMonth).slice(-6);
  const avgPriorQuantity = priorSeries.length ? priorSeries.reduce((s, x) => s + x.quantity, 0) / priorSeries.length : baseline;
  const avgPriorCost = priorSeries.length ? priorSeries.reduce((s, x) => s + x.cost, 0) / priorSeries.length : 0;

  const currentProduction = productionSeries.find(x => x.month === ctx.latestMonth)?.outputQuantity ?? n(ctx.productionData?.outputQuantity);
  const priorProduction = productionSeries.filter(x => x.month !== ctx.latestMonth).slice(-6);
  const avgPriorProduction = priorProduction.length
    ? priorProduction.reduce((s, x) => s + x.outputQuantity, 0) / priorProduction.length
    : n(ctx.productionBaseline);

  const currentIntensity = currentProduction > 0 ? current / currentProduction : null;
  const baselineIntensity = avgPriorProduction > 0 ? baseline / avgPriorProduction : null;
  const intensityChange = currentIntensity !== null && baselineIntensity !== null
    ? pct(currentIntensity, baselineIntensity)
    : null;

  const currentCost = series.find(x => x.month === ctx.latestMonth)?.cost ?? n(ctx.currentCost);
  const costChange = avgPriorCost > 0 ? pct(currentCost, avgPriorCost) : null;

  const highestHistorical = series.length ? Math.max(...series.map(x => x.quantity)) : current;
  const lowestHistorical = series.length ? Math.min(...series.map(x => x.quantity)) : current;
  const rankFromHigh = series.filter(x => x.quantity > current).length + 1;

  const peerLocations = (ctx.peerLocationConsumption || []).map(x => ({
    location: x.location,
    quantity: n(x.quantity)
  })).sort((a, b) => b.quantity - a.quantity);

  const peerResources = (ctx.peerResourceConsumption || []).map(x => ({
    resource: x.resource,
    type: x.type,
    quantity: n(x.quantity),
    unit: x.unit
  })).sort((a, b) => b.quantity - a.quantity);

  const facts = [];
  facts.push(`${ctx.resource.name} at ${ctx.location.name} is ${current} ${ctx.resource.unit} versus a calculated baseline of ${baseline} ${ctx.resource.unit} (${ctx.changePercent >= 0 ? '+' : ''}${round(ctx.changePercent)}%).`);
  if (previous) facts.push(`The immediately previous monthly reading was ${previous.quantity} ${ctx.resource.unit}; the latest month is ${current - previous.quantity >= 0 ? '+' : ''}${round(current - previous.quantity)} ${ctx.resource.unit} versus that reading.`);
  if (currentProduction > 0 && avgPriorProduction > 0) {
    facts.push(`Production at ${ctx.location.name} is ${round(currentProduction)} units in the latest month versus ${round(avgPriorProduction)} units average across prior available months (${pct(currentProduction, avgPriorProduction) >= 0 ? '+' : ''}${round(pct(currentProduction, avgPriorProduction))}%).`);
  } else {
    facts.push('No sufficient production history is available to calculate production-normalized consumption.');
  }
  if (intensityChange !== null) facts.push(`Consumption intensity is ${round(currentIntensity, 3)} ${ctx.resource.unit}/unit versus ${round(baselineIntensity, 3)} baseline (${intensityChange >= 0 ? '+' : ''}${round(intensityChange)}%).`);
  if (costChange !== null) facts.push(`Recorded cost is ${round(currentCost, 2)} versus ${round(avgPriorCost, 2)} average prior cost (${costChange >= 0 ? '+' : ''}${round(costChange)}%).`);
  facts.push(`The latest reading is ranked ${rankFromHigh} out of ${series.length || 1} available monthly readings from highest consumption to lowest.`);
  if (peerLocations.length > 1) facts.push(`Across locations for this resource, ${peerLocations[0].location} has the highest latest-period quantity at ${round(peerLocations[0].quantity)} ${ctx.resource.unit}.`);

  return {
    latestMonth: ctx.latestMonth,
    resource: ctx.resource,
    location: ctx.location,
    anomaly: {
      currentValue: current,
      baselineValue: baseline,
      changePercent: round(ctx.changePercent),
      severity: ctx.severity
    },
    previousReading: previous,
    production: {
      current: currentProduction || null,
      priorAverage: avgPriorProduction || null,
      changePercent: currentProduction > 0 && avgPriorProduction > 0 ? pct(currentProduction, avgPriorProduction) : null,
      intensityCurrent: currentIntensity,
      intensityBaseline: baselineIntensity,
      intensityChangePercent: intensityChange
    },
    cost: { current: currentCost || null, priorAverage: avgPriorCost || null, changePercent: costChange },
    historical: series,
    peerLocations,
    peerResources,
    facts
  };
}

function fallback(ctx) {
  const e = ctx.evidence || buildEvidencePack(ctx);
  const severity = ctx.severity;
  const type = ctx.resource.type;
  const factors = [];
  const actions = [];

  if (e.production.changePercent !== null) {
    if (Math.abs(e.production.changePercent) < Math.abs(e.anomaly.changePercent)) {
      factors.push(`Consumption rose ${e.anomaly.changePercent >= 0 ? '+' : ''}${e.anomaly.changePercent}% while production changed ${e.production.changePercent >= 0 ? '+' : ''}${e.production.changePercent}%; the data therefore shows weaker resource efficiency per unit of output.`);
      actions.push({
        title: 'Review consumption against production output',
        description: `Compare ${ctx.resource.name} usage with production by month at ${ctx.location.name} and identify periods where consumption rose without a similar output increase.`,
        priority: severity
      });
    }
  }
  if (e.production.intensityChangePercent !== null && e.production.intensityChangePercent >= 10) {
    factors.push(`Production-normalized ${ctx.resource.name} intensity is ${e.production.intensityChangePercent >= 0 ? '+' : ''}${e.production.intensityChangePercent}% above its prior-period baseline.`);
    actions.push({
      title: 'Investigate the highest-intensity operating period',
      description: `Use shift, equipment runtime and maintenance records for ${ctx.location.name} to identify what changed during the elevated intensity period.`,
      priority: 'HIGH'
    });
  }
  if (e.peerLocations.length > 1 && e.peerLocations[0].location === ctx.location.name) {
    factors.push(`${ctx.location.name} is the highest latest-period consumer of ${ctx.resource.name} among the locations in this workspace.`);
  }
  if (type === 'ELECTRICITY') {
    factors.push('A shared operational driver such as longer equipment runtime, HVAC scheduling, idle load or maintenance activity is a possible explanation; the current data does not prove which one caused the deviation.');
    actions.push({ title: 'Review high-load equipment runtime', description: `Compare equipment duty cycles and operating hours at ${ctx.location.name} against the baseline period.`, priority: severity });
    actions.push({ title: 'Validate HVAC and operating schedules', description: 'Check operating hours, setbacks and recent control changes around the latest deviation.', priority: 'MEDIUM' });
  } else if (type === 'WATER') {
    factors.push('A leak, valve issue or changed process/rinse duration is a possible explanation; meter accuracy should also be verified.');
    actions.push({ title: 'Run a leak and valve inspection', description: `Inspect water circuits serving ${ctx.location.name} and compare abnormal flow periods with operating activity.`, priority: severity });
  } else {
    factors.push('A change in runtime, standby conditions, maintenance activity or process conditions is a possible explanation; the available data does not establish a single root cause.');
    actions.push({ title: 'Review operating conditions', description: `Compare runtime, maintenance and process notes for ${ctx.location.name} around the latest reading.`, priority: severity });
  }

  const uniqueActions = [];
  for (const a of actions) if (!uniqueActions.some(x => x.title === a.title)) uniqueActions.push(a);

  return {
    severity,
    summary: e.production.intensityChangePercent !== null
      ? `${ctx.resource.name} at ${ctx.location.name} is ${e.anomaly.changePercent >= 0 ? '+' : ''}${e.anomaly.changePercent}% above the historical baseline. Production changed ${e.production.changePercent >= 0 ? '+' : ''}${e.production.changePercent}%, while consumption intensity changed ${e.production.intensityChangePercent >= 0 ? '+' : ''}${e.production.intensityChangePercent}%. These are the strongest data-backed signals for investigation; they do not prove a single cause.`
      : `${ctx.resource.name} at ${ctx.location.name} is ${e.anomaly.changePercent >= 0 ? '+' : ''}${e.anomaly.changePercent}% above the historical baseline. The available consumption history confirms a significant deviation, but production data is insufficient to establish a normalized cause.`,
    possibleContributingFactors: factors.slice(0, 5),
    investigationChecklist: [
      `Review the ${ctx.resource.name} readings around ${e.latestMonth} against the previous six available months.`,
      `Check equipment/runtime, operating-hour and maintenance records for ${ctx.location.name}.`,
      'Compare the latest meter reading with the source meter or bill.',
      ...(e.production.changePercent !== null ? ['Compare resource intensity with production output before and after the deviation.'] : []),
      ...(e.peerLocations.length > 1 ? ['Compare the same resource across workspace locations to separate local from workspace-wide patterns.'] : [])
    ],
    recommendedActions: uniqueActions.slice(0, 4),
    monitoringPlan: `Re-measure ${ctx.resource.name} at ${ctx.location.name} in the next period. Compare the result with the same baseline method and production-normalized intensity where production data is available.`,
    whyThisCouldBeHappening: factors.length
      ? `The strongest explanation supported by the stored data is a mismatch between resource use and operating output: ${factors[0]} Other causes remain hypotheses until the checklist is verified.`
      : `The stored data confirms an abnormal deviation, but it is not sufficient to identify a single cause. Use the investigation checklist to establish what changed at ${ctx.location.name}.`
  }; 
}

function prompt(ctx) {
  return `You are EcoPulse AI, an evidence-first operations investigation assistant.

Use ONLY the evidence supplied below. Do not invent events, equipment, causes, measurements, people or operational facts that are not present in the evidence.

The deterministic analytics engine has already calculated the baseline, deviation, production comparison, intensity comparison, cost comparison and historical ranking. DO NOT recalculate them.

Your job is to explain WHY the anomaly deserves investigation by connecting the supplied facts. Separate:
- OBSERVED FACTS: directly supported by the evidence.
- POSSIBLE CONTRIBUTING FACTORS: hypotheses that could explain those facts.
Never present a hypothesis as a proven cause.
- WHY_THIS_COULD_BE_HAPPENING: a concise evidence-linked explanation of the pattern, not a certainty claim.

When you suggest a factor, tie it to a specific evidence signal. Prefer statements such as “the data is consistent with…”, “possible contributing factor…”, and “investigate…”.

Return ONLY JSON matching the requested schema.

EVIDENCE PACK:
${JSON.stringify(ctx.evidence, null, 2)}
`;
}

async function generateAIInvestigation(ctx) {
  const evidence = ctx.evidence || buildEvidencePack(ctx);
  const enriched = { ...ctx, evidence };
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'YOUR_GEMINI_API_KEY' || !key.trim()) {
    return { result: fallback(enriched), evidence, provider: 'deterministic-fallback' };
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const request = {
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    contents: prompt(enriched),
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          summary: { type: 'string' },
          possibleContributingFactors: { type: 'array', items: { type: 'string' } },
          investigationChecklist: { type: 'array', items: { type: 'string' } },
          recommendedActions: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['HIGH','MEDIUM','LOW'] } }, required: ['title','description','priority'] } },
          monitoringPlan: { type: 'string' },
          whyThisCouldBeHappening: { type: 'string' }
        },
        required: ['severity','summary','possibleContributingFactors','investigationChecklist','recommendedActions','monitoringPlan','whyThisCouldBeHappening']
      }
    }
  };

  const parse = response => JSON.parse((response.text || '').replace(/```json/gi, '').replace(/```/g, '').trim());
  try {
    const response = await ai.models.generateContent(request);
    const valid = GeminiInsightSchema.safeParse(parse(response));
    if (valid.success) return { result: valid.data, evidence, provider: 'gemini' };
    throw new Error(valid.error.message);
  } catch (first) {
    try {
      const retry = await ai.models.generateContent({ ...request, contents: `${prompt(enriched)}\nPrevious response validation failed. Return valid JSON only and preserve evidence-grounded wording.` });
      const valid = GeminiInsightSchema.safeParse(parse(retry));
      if (valid.success) return { result: valid.data, evidence, provider: 'gemini-retry' };
    } catch (second) {
      console.error('[AI] Controlled fallback:', second.message);
    }
    return { result: fallback(enriched), evidence, provider: 'deterministic-fallback' };
  }
}

module.exports = { generateAIInvestigation, GeminiInsightSchema, buildEvidencePack };
