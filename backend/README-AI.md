# AI Investigation behavior

`POST /api/ai/investigate` builds an evidence pack from the authenticated organization's stored data before calling Gemini.

Evidence includes:
- latest anomaly reading and calculated baseline/deviation
- prior monthly readings and costs
- production history for the anomaly location
- production-normalized consumption intensity when production exists
- latest-period comparison across workspace locations for the same resource
- latest-period comparison across resources at the anomaly location
- deterministic evidence facts and historical rank

Gemini is only used to interpret this structured evidence. It must not invent causes or calculate metrics. The complete evidence pack is persisted inside `ai_insights.rawResponse.evidence`, so the UI can show what data was checked.

If Gemini is unavailable or returns invalid output twice, the application uses a deterministic evidence-backed fallback instead of presenting generic AI content.
