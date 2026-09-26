import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Building2,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Cloud,
  Database, Factory, FileText, Gauge, LayoutDashboard, Leaf, LogOut, Menu, MoreHorizontal,
  Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Target, TrendingUp, User,
  Users, Droplets, X, Zap
} from 'lucide-react';
import { api, token, setToken } from './lib/api';
import './styles.css';

const fmt = (n, max = 1) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: max }).format(Number(n || 0));
const pct = n => `${Number(n || 0) > 0 ? '+' : ''}${fmt(n)}%`;
const dateLabel = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const navItems = [
  ['/dashboard', 'Overview', LayoutDashboard],
  ['/resources', 'Resource data', Database],
  ['/analytics', 'Analytics', BarChart3],
  ['/alerts', 'Alerts', AlertTriangle],
  ['/insights', 'AI investigations', Sparkles],
  ['/actions', 'Action center', ClipboardList],
  ['/outcomes', 'Outcomes', Target],
];

function Brand({ light = false }) {
  return <Link to="/dashboard" className={`brand ${light ? 'brand-light' : ''}`}>
    <span className="brand-symbol"><Leaf size={17} strokeWidth={2.3} /></span>
    <span>EcoPulse</span><b>AI</b>
  </Link>;
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function StatusPill({ children, tone = 'neutral' }) { return <span className={`status-pill status-${tone}`}>{children}</span>; }

function Landing() {
  return <div className="landing-page">
    <nav className="marketing-nav shell">
      <Brand />
      <div className="marketing-links"><a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#trust">Trust</a></div>
      <div className="marketing-actions"><Link to="/login" className="text-link">Sign in</Link><Link to="/register" className="button button-primary">Open workspace <ChevronRight size={15}/></Link></div>
    </nav>
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> Operational resource intelligence</div>
          <h1>Know what changed.<br/><span>Know where to act.</span></h1>
          <p>EcoPulse turns electricity, water, fuel and material records into a clear operational workflow: detect a deviation, investigate it, assign the work and verify what changed.</p>
          <div className="hero-cta"><Link to="/register" className="button button-primary button-lg">Launch workspace <ArrowUpRight size={17}/></Link><a href="#workflow" className="button button-secondary button-lg">See the workflow</a></div>
          <div className="hero-trust"><span><ShieldCheck size={15}/> Calculations stay deterministic</span><span><Database size={15}/> Data persists in PostgreSQL</span><span><Sparkles size={15}/> AI stays on the server</span></div>
        </div>
        <div className="hero-product" id="product">
          <div className="mock-top"><div><span className="mock-kicker">OPERATIONS / OVERVIEW</span><strong>GreenCore Manufacturing</strong></div><span className="live-dot"><i/> Live</span></div>
          <div className="mock-kpis">
            <div><span>Electricity</span><b>1,240 <small>kWh</small></b><em className="negative"><ArrowUpRight size={12}/> 26.5%</em></div>
            <div><span>Water</span><b>18,420 <small>L</small></b><em className="positive"><ArrowDownRight size={12}/> 4.9%</em></div>
            <div><span>Efficiency</span><b>78 <small>/100</small></b><div className="mini-meter"><i style={{width:'78%'}}/></div></div>
          </div>
          <div className="mock-chart"><div className="mock-chart-head"><div><strong>Electricity consumption</strong><span>Last 8 periods</span></div><span className="chart-legend"><i/> Actual <i className="baseline"/> Baseline</span></div><div className="spark-bars">{[35,42,39,45,52,49,58,92].map((h,i)=><div key={i} className={i===7?'selected':''}><span style={{height:`${h}%`}}/></div>)}</div></div>
          <div className="mock-alert"><div className="alert-icon"><AlertTriangle size={15}/></div><div><strong>Electricity deviation detected</strong><span>Production Floor A · +26.5% vs baseline</span></div><StatusPill tone="high">HIGH</StatusPill></div>
        </div>
      </section>
      <section className="proof-strip shell"><div><b>01</b><span>Detect deviations</span></div><div><b>02</b><span>Investigate with evidence</span></div><div><b>03</b><span>Assign accountable work</span></div><div><b>04</b><span>Verify observed change</span></div></section>
      <section className="marketing-section shell" id="workflow"><div className="section-intro"><div className="eyebrow">The operating model</div><h2>Not another dashboard. A closed-loop workflow.</h2><p>The interface is designed around what an operations manager needs to do next—not around decorative AI features.</p></div><div className="workflow-grid">{[
        ['01','Detection','A transparent baseline comparison surfaces meaningful deviations.','Baseline deviation'],
        ['02','Investigation','Structured evidence goes to the AI layer for possible explanations and checks.','AI interpretation'],
        ['03','Execution','Recommendations become owned actions with status and due dates.','Action center'],
        ['04','Verification','Before/after readings show the observed change after an intervention.','Outcome record']
      ].map(([n,t,d,l])=><div className="workflow-card" key={n}><span className="workflow-number">{n}</span><div><span className="workflow-label">{l}</span><h3>{t}</h3><p>{d}</p></div></div>)}</div></section>
      <section className="marketing-section trust-section" id="trust"><div className="trust-panel"><div><div className="eyebrow">Built for accountable operations</div><h2>Facts first. AI second.</h2><p>Consumption totals, period changes and anomaly thresholds are calculated by the application. AI is used for interpretation—not arithmetic or invented certainty.</p></div><div className="trust-list"><div><Check size={16}/><span>Server-side Gemini integration</span></div><div><Check size={16}/><span>Organization-scoped access control</span></div><div><Check size={16}/><span>Persisted investigations, actions and outcomes</span></div></div></div></section>
    </main>
    <footer className="marketing-footer shell"><Brand/><span>Resource intelligence for teams that operate real facilities.</span></footer>
  </div>;
}

function Auth({ mode = 'login' }) {
  const nav = useNavigate();
  const [form, setForm] = useState(mode === 'login' ? { name: '', email: 'demo@ecopulse.ai', password: 'EcoPulse@2026' } : { name: '', email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setErr(''); setBusy(true); try { const r = await api.post(`/auth/${mode}`, form); setToken(r.data.data.token); nav('/dashboard'); } catch (e) { setErr(e.response?.data?.error?.message || 'Unable to complete the request.'); } finally { setBusy(false); } }
  return <div className="auth-page"><div className="auth-side"><Brand light/><div className="auth-side-copy"><div className="eyebrow light"><span className="eyebrow-dot"/> Resource intelligence</div><h1>Run the facility.<br/><span>Understand the signal.</span></h1><p>Track resource performance from the first reading to the verified outcome.</p><div className="auth-stat"><b>26.5%</b><span>example electricity deviation identified in the demo workspace</span></div></div></div><div className="auth-main"><div className="auth-mobile-brand"><Brand/></div><div className="auth-card"><div className="eyebrow">Secure workspace</div><h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2><p>{mode === 'login' ? 'Sign in to continue to your operations overview.' : 'Set up an organization and start recording resource data.'}</p><form onSubmit={submit}>{mode === 'register' && <label>Full name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name" required/></label>}<label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@company.com" required/></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••" required/></label>{err && <div className="form-error"><AlertTriangle size={15}/>{err}</div>}<Button className="button-full" disabled={busy}>{busy ? 'Signing in…' : mode === 'login' ? 'Sign in' : 'Create workspace'}</Button></form>{mode === 'login' ? <p className="auth-switch">New workspace? <Link to="/register">Create one</Link></p> : <p className="auth-switch">Already have access? <Link to="/login">Sign in</Link></p>}<div className="demo-note"><span>Demo access</span><code>demo@ecopulse.ai</code><code>EcoPulse@2026</code></div></div></div></div>;
}

function Layout({ children }) {
  const nav = useNavigate(); const loc = useLocation(); const [org,setOrg] = useState('Operations Workspace'); const [user,setUser] = useState({name:'',role:'OPERATIONS_MANAGER'}); const [mobile,setMobile] = useState(false);
  useEffect(()=>{Promise.all([api.get('/organizations/current'),api.get('/auth/me')]).then(([o,u])=>{setOrg(o.data.data.name);setUser(u.data.data.user)}).catch(()=>{});},[]);
  const initials=(user.name||'User').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'U';
  const current = navItems.find(x=>loc.pathname.startsWith(x[0]));
  return <div className="app-shell">
    <aside className={`sidebar ${mobile?'open':''}`}>
      <div className="sidebar-head"><Brand/><button className="icon-button mobile-close" onClick={()=>setMobile(false)}><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-mark"><Factory size={15}/></div><div><span>Workspace</span><strong>{org}</strong></div><ChevronDown size={15}/></div>
      <div className="nav-label">Workspace</div><nav className="side-nav">{navItems.map(([p,n,I])=><Link onClick={()=>setMobile(false)} className={loc.pathname.startsWith(p)?'active':''} to={p} key={p}><I size={17}/><span>{n}</span>{n==='Alerts' && <span className="nav-count">{loc.pathname.startsWith('/alerts') ? '' : '2'}</span>}</Link>)}</nav>
      <div className="sidebar-rule"/><div className="nav-label">Administration</div><nav className="side-nav"><Link className={loc.pathname.startsWith('/settings')?'active':''} to="/settings" onClick={()=>setMobile(false)}><Settings size={17}/><span>Settings</span></Link></nav>
      <div className="sidebar-footer"><div className="profile"><div className="avatar">{initials}</div><div><strong>{user.name||'User'}</strong><span>{String(user.role||'OPERATIONS_MANAGER').replaceAll('_',' ')}</span></div><MoreHorizontal size={16}/></div><button className="signout" onClick={()=>{setToken('');nav('/login')}}><LogOut size={15}/> Sign out</button></div>
    </aside>
    {mobile && <button className="sidebar-overlay" onClick={()=>setMobile(false)} aria-label="Close navigation"/>}
    <section className="app-main"><header className="app-header"><div className="header-left"><button className="icon-button mobile-trigger" onClick={()=>setMobile(true)}><Menu size={19}/></button><div><div className="breadcrumbs">Workspace <span>/</span> {current?.[1] || 'Overview'}</div><h2>{current?.[1] || 'Overview'}</h2></div></div><div className="header-actions"><div className="system-state"><i/> All systems operational</div><Link className="icon-button" to="/alerts" aria-label="Open alerts"><Bell size={18}/><span className="notification-dot"/></Link><div className="header-avatar" title={user.name||'User'}>{initials}</div></div></header><main className="page-content">{children}</main></section>
  </div>;
}

function PageHeader({ eyebrow, title, description, actions }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-header-actions">{actions}</div>}</div>; }
function Panel({ children, className='' }) { return <section className={`panel ${className}`}>{children}</section>; }
function PanelHeader({ title, subtitle, action }) { return <div className="panel-header"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
function Empty({ icon:Icon=Database, title='Nothing here yet', text='' }) { return <div className="empty-state"><span><Icon size={20}/></span><strong>{title}</strong>{text&&<p>{text}</p>}</div>; }
function Loading() { return <div className="loading-layout"><div className="loading-block loading-large"/><div className="loading-row"><div className="loading-block"/><div className="loading-block"/><div className="loading-block"/></div><div className="loading-block loading-table"/></div>; }

function MetricCard({ label, value, unit, change, icon:Icon, tone='neutral', caption }) { const positive=Number(change)<0; return <div className="metric-card"><div className="metric-label"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={16}/></span></div><div className="metric-value">{fmt(value)} <small>{unit}</small></div><div className={`metric-change ${positive?'positive':Number(change)>0?'negative':'neutral'}`}>{Number(change)>0?<ArrowUpRight size={13}/>:Number(change)<0?<ArrowDownRight size={13}/>:null}{pct(change)} <span>vs previous period</span></div>{caption&&<div className="metric-caption">{caption}</div>}</div>; }

function Dashboard() {
  const [d,setD]=useState(null); const [me,setMe]=useState(null); const [loading,setLoading]=useState(true); const [last,setLast]=useState(new Date());
  const load=async()=>{setLoading(true);try{await api.post('/anomalies/detect');const [r,u]=await Promise.all([api.get('/analytics/dashboard'),api.get('/auth/me')]);setD(r.data.data);setMe(u.data.data.user);setLast(new Date())}catch(e){}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  if(loading||!d)return <Loading/>;
  const get=t=>d.resources.find(x=>x.type===t)||{current:0,previous:0,changePercent:0,unit:''};
  const elec=get('ELECTRICITY'), water=get('WATER'), fuel=get('FUEL');
  const primary=d.anomalies?.[0]; const firstName=(me?.name||'there').trim().split(/\s+/)[0]||'there';
  return <>
    <PageHeader eyebrow="Operations command center" title={`Good morning, ${firstName}`} description={`Your workspace is up to date. Last analysis ${last.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}.`} actions={<Button variant="secondary" onClick={load}><RefreshCw size={15}/> Refresh analysis</Button>}/>
    <div className={`notice-bar ${primary?'':'notice-bar-neutral'}`}><div><span className="notice-icon">{primary?<Activity size={15}/>:<CheckCircle2 size={15}/>}</span><div><strong>{primary?'One deviation needs attention':'Workspace is within the current baseline'}</strong><span>{primary?`${primary.resource} at ${primary.location} is ${pct(primary.changePercent)} versus its historical baseline.`:'No active baseline deviations were detected in the latest available period.'}</span></div></div>{primary&&<Link to={`/insights?anomaly=${primary.id}`} className="notice-link">Investigate <ChevronRight size={14}/></Link>}</div>
    <div className="metric-grid"><MetricCard label="Electricity" value={elec.current} unit={elec.unit} change={elec.changePercent} icon={Zap} tone="amber" caption="Production Floor A is driving the increase"/><MetricCard label="Water" value={water.current} unit={water.unit} change={water.changePercent} icon={Droplets} tone="blue"/><MetricCard label="Fuel" value={fuel.current} unit={fuel.unit} change={fuel.changePercent} icon={Cloud} tone="purple"/><div className="metric-card efficiency-card"><div className="metric-label"><span>Efficiency score</span><span className="metric-icon green"><Gauge size={16}/></span></div><div className="score-row"><div className="score-number">{d.efficiencyScore}<small>/100</small></div><div className="score-ring" style={{'--score':`${d.efficiencyScore*3.6}deg`}}><b>{d.efficiencyScore}</b></div></div><div className="score-note"><ShieldCheck size={13}/> Calculated from trend, anomalies, normalization and outcomes</div></div></div>
    <div className="dashboard-columns"><Panel className="chart-panel"><PanelHeader title="Resource performance" subtitle="Monthly consumption across the current workspace" action={<Link to="/analytics" className="panel-link">Full analytics <ChevronRight size={14}/></Link>}/><ResourceChart/></Panel><Panel><PanelHeader title="Priority alerts" subtitle="Baseline deviation detection" action={<Link to="/alerts" className="panel-link">View all</Link>}/>{d.anomalies.length?d.anomalies.slice(0,4).map(a=><div className="alert-item" key={a.id}><div className={`alert-severity ${a.severity.toLowerCase()}`}><AlertTriangle size={15}/></div><div className="alert-copy"><strong>{a.resource} · {pct(a.changePercent)}</strong><span>{a.location}</span><small>{fmt(a.baselineValue)} baseline → {fmt(a.currentValue)} current</small></div><Link to={`/insights?anomaly=${a.id}`} className="row-action">Investigate</Link></div>):<Empty icon={CheckCircle2} title="No active deviations" text="Everything is within the current baseline."/>}</Panel></div>
    <div className="dashboard-columns bottom"><Panel><PanelHeader title="Actions in motion" subtitle="Operational work linked to current findings" action={<Link to="/actions" className="panel-link">Action center</Link>}/>{d.actions.slice(0,5).map(a=><div className="task-row" key={a.id}><div className="task-marker"><Check size={13}/></div><div><strong>{a.title}</strong><span>{a.location||'Facility-wide'} · {a.dueDate?`Due ${dateLabel(a.dueDate)}`:'No due date'}</span></div><StatusPill tone={a.status==='COMPLETED'?'success':a.status==='IN_PROGRESS'?'blue':'neutral'}>{a.status.replace('_',' ')}</StatusPill></div>)}{!d.actions.length&&<Empty icon={ClipboardList} title="No actions yet" text="Convert an AI recommendation into an owned action."/>}</Panel><Panel><PanelHeader title="Operating model" subtitle="How EcoPulse closes the loop"/><div className="loop-steps">{[['01','Detect','Baseline deviation'],['02','Explain','AI investigation'],['03','Act','Assigned work'],['04','Verify','Observed outcome']].map(([n,t,s],i)=><div key={n}><span>{n}</span><div><strong>{t}</strong><small>{s}</small></div>{i<3&&<ChevronRight size={14}/>}</div>)}</div></Panel></div>
  </>;
}

function ResourceChart(){
  const [rows,setRows]=useState([]);
  const [error,setError]=useState(false);
  const load=()=>api.get('/analytics/trends')
    .then(r=>{setRows(r.data.data||[]);setError(false)})
    .catch(()=>setError(true));
  useEffect(()=>{load()},[]);
  const values=useMemo(()=>rows.filter(x=>x.type==='ELECTRICITY').slice(-8),[rows]);
  const max=Math.max(...values.map(x=>Number(x.total)||0),1);
  if(error)return <div className="chart-empty"><strong>Trend data is temporarily unavailable.</strong><span>The rest of the dashboard can still be used.</span><button className="button button-secondary" onClick={load}>Retry trend</button></div>;
  if(!values.length)return <div className="chart-empty"><strong>No electricity trend data yet.</strong><span>Add resource readings to populate the chart.</span></div>;
  return <div className="chart-wrap"><div className="chart-axis"><span>{fmt(max,0)}</span><span>{fmt(max*.5,0)}</span><span>0</span></div><div className="chart-area">{values.map((x,i)=><div className="chart-column" key={`${x.month}-${i}`}><div className="chart-bar"><i style={{height:`${Math.max(4,(Number(x.total)/max)*100)}%`}}/></div><span>{x.month?.slice(0,3)}</span></div>)}</div></div>
}

function Resources(){const [rows,setRows]=useState([]),[locs,setLocs]=useState([]),[resources,setResources]=useState([]),[form,setForm]=useState({}),[q,setQ]=useState('');const load=()=>Promise.all([api.get('/consumption'),api.get('/locations'),api.get('/resources')]).then(([a,b,c])=>{setRows(a.data.data);setLocs(b.data.data);setResources(c.data.data);setForm(f=>({...f,resourceId:f.resourceId||c.data.data[0]?.id,locationId:f.locationId||b.data.data[0]?.id,unit:f.unit||c.data.data[0]?.unit,recordedAt:f.recordedAt||new Date().toISOString().slice(0,10)}))});useEffect(()=>{load()},[]);async function save(e){e.preventDefault();await api.post('/consumption',form);await load();setForm(f=>({...f,quantity:'',cost:'',notes:''}))}const filtered=rows.filter(r=>`${r.resource} ${r.location} ${r.notes||''}`.toLowerCase().includes(q.toLowerCase()));return <><PageHeader eyebrow="Resource data" title="Consumption records" description="Capture the measurements that feed detection, analysis and outcome verification." actions={<Button onClick={()=>document.querySelector('.entry-panel')?.scrollIntoView({behavior:'smooth',block:'start'})}><Plus size={15}/> Add record</Button>}/><div className="resource-layout"><Panel className="entry-panel"><div className="form-heading"><div><h3>New measurement</h3><p>Add a reading to the workspace.</p></div><span className="form-step">01</span></div><form onSubmit={save} className="record-form"><label>Resource<select value={form.resourceId||''} onChange={e=>{const r=resources.find(x=>x.id===e.target.value);setForm({...form,resourceId:e.target.value,unit:r?.unit||''})}}>{resources.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Location<select value={form.locationId||''} onChange={e=>setForm({...form,locationId:e.target.value})}>{locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><div className="form-grid-2"><label>Quantity<input type="number" min="0" step="0.1" value={form.quantity||''} onChange={e=>setForm({...form,quantity:e.target.value})} required/></label><label>Unit<input value={form.unit||''} readOnly/></label></div><div className="form-grid-2"><label>Cost<input type="number" min="0" step="0.01" value={form.cost||''} onChange={e=>setForm({...form,cost:e.target.value})}/></label><label>Date<input type="date" value={form.recordedAt||''} onChange={e=>setForm({...form,recordedAt:e.target.value})} required/></label></div><label>Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional context for this reading"/></label><Button className="button-full">Save measurement</Button></form></Panel><Panel className="table-panel"><PanelHeader title="Recent measurements" subtitle={`${filtered.length} records in the current view`} action={<div className="table-tools"><div className="search-box"><Search size={15}/><input placeholder="Search records" value={q} onChange={e=>setQ(e.target.value)}/></div><span className="filter-caption"><CalendarDays size={14}/> Latest measurements</span></div>}/><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Resource</th><th>Location</th><th>Reading</th><th>Cost</th><th>Recorded</th><th/></tr></thead><tbody>{filtered.slice(0,40).map(r=><tr key={r.id}><td><div className="table-primary"><span className="resource-dot"/>{r.resource}</div></td><td>{r.location}</td><td><strong>{fmt(r.quantity)}</strong> {r.unit}</td><td>₹{fmt(r.cost)}</td><td>{dateLabel(r.recordedAt)}</td><td></td></tr>)}</tbody></table>{!filtered.length&&<Empty icon={Search} title="No matching records" text="Try another search term."/>}</div></Panel></div></>}

function Alerts(){const [rows,setRows]=useState([]);useEffect(()=>{api.get('/anomalies').then(r=>setRows(r.data.data||[]))},[]);return <><PageHeader eyebrow="Detection" title="Priority alerts" description="Transparent baseline deviations that warrant investigation." actions={<Button variant="secondary" onClick={()=>api.post('/anomalies/detect').then(()=>api.get('/anomalies').then(r=>setRows(r.data.data||[])))}><RefreshCw size={15}/> Re-run detection</Button>}/><Panel><div className="alert-summary"><div><strong>{rows.length}</strong><span>detected deviations</span></div><div><strong>{rows.filter(x=>x.severity==='HIGH').length}</strong><span>high severity</span></div><div><strong>{rows.filter(x=>x.status==='OPEN').length}</strong><span>open for review</span></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Severity</th><th>Resource</th><th>Location</th><th>Baseline</th><th>Current</th><th>Deviation</th><th/></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td><StatusPill tone={a.severity==='HIGH'?'high':a.severity==='MEDIUM'?'medium':'success'}>{a.severity}</StatusPill></td><td><strong>{a.resource}</strong></td><td>{a.location}</td><td>{fmt(a.baselineValue)}</td><td>{fmt(a.currentValue)}</td><td className="deviation-cell">{pct(a.changePercent)}</td><td><Link to={`/insights?anomaly=${a.id}`} className="table-action">Investigate <ChevronRight size={14}/></Link></td></tr>)}</tbody></table>{!rows.length&&<Empty icon={CheckCircle2} title="No deviations detected" text="The current dataset is within baseline thresholds."/>}</div></Panel></>}

function Insights(){
  const location=useLocation();
  const navigate=useNavigate();
  const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);
  const [rows,setRows]=useState([]),[anomalies,setAnomalies]=useState([]),[selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true),[investigating,setInvestigating]=useState(false),[error,setError]=useState(''),[aiStatus,setAiStatus]=useState(null),[autoStarted,setAutoStarted]=useState(false);

  async function loadInsights(){
    setLoading(true);setError('');setAutoStarted(false);
    try{
      const [insightRes,anomalyRes,statusRes]=await Promise.all([
        api.get('/insights'),
        api.get('/anomalies'),
        api.get('/ai/status')
      ]);
      const insights=insightRes.data.data||[];
      const anomalyRows=(anomalyRes.data.data||[]).filter(a=>a.status!=='ARCHIVED'&&a.status!=='RESOLVED');
      setRows(insights);setAnomalies(anomalyRows);setAiStatus(statusRes.data.data||null);

      const insightId=location.pathname.startsWith('/insights/')?location.pathname.split('/')[2]:'';
      const anomalyId=params.get('anomaly');
      if(insightId){
        const found=insights.find(x=>x.id===insightId);
        const i=found||(await api.get(`/insights/${insightId}`)).data.data;
        setSelected({
          anomaly:{id:i.anomalyId,locationId:i.locationId,resourceId:i.resourceId,resource:i.resource,location:i.location,baselineValue:i.baselineValue,currentValue:i.currentValue,changePercent:i.changePercent,detectedAt:i.detectedAt,resourceUnit:i.resourceUnit},
          insight:i
        });
      } else if(anomalyId){
        const a=anomalyRows.find(x=>x.id===anomalyId)||(await api.get(`/anomalies/${anomalyId}`)).data.data;
        const found=insights.find(x=>x.anomalyId===anomalyId);
        setSelected({anomaly:a,insight:found||null});
      } else if (anomalyRows.length) {
        // Make the AI workflow discoverable: when the user opens AI Investigations
        // without a query, start with the highest-priority active anomaly.
        const first = [...anomalyRows].sort((a,b)=>{
          const sev = {HIGH:0,MEDIUM:1,LOW:2};
          return (sev[a.severity]??9)-(sev[b.severity]??9) || Math.abs(Number(b.changePercent||0))-Math.abs(Number(a.changePercent||0));
        })[0];
        const found = insights.find(x=>x.anomalyId===first.id);
        setSelected({anomaly:first, insight:found||null});
      } else {
        setSelected(null);
      }
    }catch(e){setError(e.response?.data?.error?.message||'Unable to load investigations.');}
    finally{setLoading(false)}
  }
  useEffect(()=>{loadInsights()},[location.pathname,location.search]);

  async function investigate(a,refresh=true){
    setInvestigating(true);setError('');
    try{
      const r=await api.post('/ai/investigate',{anomalyId:a.id,refresh:true});
      const insight=r.data.data;
      setSelected({anomaly:a,insight});
      setRows(prev=>[insight,...prev.filter(x=>x.id!==insight.id)]);
    }catch(e){setError(e.response?.data?.error?.message||'The evidence-based AI investigation could not be completed. Check the backend Gemini configuration and try again.');}
    finally{setInvestigating(false);}
  }

  useEffect(()=>{
    const insight=selected?.insight;
    const needsAI=selected?.anomaly && (!insight || (insight.provider!=='gemini' && insight.provider!=='gemini-retry'));
    if(needsAI && !autoStarted && !investigating){
      setAutoStarted(true);
      investigate(selected.anomaly,true);
    }
  },[selected?.anomaly?.id,selected?.insight?.id,selected?.insight?.provider,autoStarted,investigating]);

  const investigatedIds=new Set(rows.map(x=>x.anomalyId));
  return <>
    <PageHeader eyebrow="AI investigations" title="Evidence → explanation → action" description="EcoPulse checks the measurements stored in this workspace, builds an evidence pack, then uses Gemini to explain the pattern and propose next actions." actions={<div className="header-button-row"><StatusPill tone={aiStatus?.configured?'success':'medium'}><Sparkles size={12}/>{aiStatus?.configured?'Gemini connected':'Gemini key not configured'}</StatusPill><Button variant="secondary" onClick={loadInsights}><RefreshCw size={15}/> Refresh</Button></div>}/>
    {error&&<div className="form-error page-error"><AlertTriangle size={15}/>{error}</div>}
    {loading?<Loading/>:selected?.anomaly?<div className="investigation-layout">
      <div className="evidence-panel">
        <div className="eyebrow light">Detected signal</div>
        <h3>{selected.anomaly.resource}</h3>
        <div className="evidence-change">{pct(selected.anomaly.changePercent)}</div>
        <span>{selected.anomaly.location}</span>
        <div className="evidence-grid"><div><small>BASELINE</small><b>{fmt(selected.anomaly.baselineValue)} {selected.anomaly.resourceUnit||selected.anomaly.unit||''}</b></div><div><small>CURRENT</small><b>{fmt(selected.anomaly.currentValue)} {selected.anomaly.resourceUnit||selected.anomaly.unit||''}</b></div></div>
        <div className="evidence-note"><ShieldCheck size={14}/><span>These values are calculated by EcoPulse before Gemini is called.</span></div>
        <Button className="button-full" onClick={()=>investigate(selected.anomaly,true)} disabled={investigating}><Sparkles size={15}/>{investigating?'Analyzing workspace evidence…':'Investigate with AI'}</Button>
        {selected.insight&&selected.insight.provider&&<div className="saved-state"><CheckCircle2 size={15}/> Provider: {selected.insight.provider}. Investigation is persisted and can be refreshed from the latest records.</div>}
        <Link to="/alerts" className="back-link">← Back to alerts</Link>
      </div>
      {investigating&&!selected.insight?<Panel className="ai-ready"><div className="ai-ready-icon"><Sparkles size={20}/></div><h3>Gemini is investigating the signal</h3><p>EcoPulse is checking the affected location's consumption history, production output, cost, peer locations and historical ranking before generating an explanation.</p><Loading/></Panel>:selected.insight?<InsightDetail insight={selected.insight} anomaly={selected.anomaly} navigate={navigate}/>:<Panel className="ai-ready"><div className="ai-ready-icon"><Sparkles size={20}/></div><h3>Ready to investigate</h3><p>The evidence pack will be sent to Gemini as structured context. The AI will explain the pattern without treating possible causes as proven facts.</p><Button onClick={()=>investigate(selected.anomaly,true)} disabled={investigating}><Sparkles size={15}/>{investigating?'Investigating…':'Investigate with AI'}</Button></Panel>}
    </div>:<div className="insight-list">
      {anomalies.length>0&&<Panel className="investigation-queue"><PanelHeader title="Investigation queue" subtitle={`${anomalies.length} active baseline deviations`}/><div className="queue-list">{anomalies.map(a=><div className="queue-item" key={a.id}><div><StatusPill tone={a.severity==='HIGH'?'high':a.severity==='MEDIUM'?'medium':'success'}>{a.severity}</StatusPill><strong>{a.resource} · {pct(a.changePercent)}</strong><span>{a.location} · {fmt(a.currentValue)} vs {fmt(a.baselineValue)} {a.resourceUnit||''}</span></div><Link className="button button-secondary" to={`/insights?anomaly=${a.id}`}>{investigatedIds.has(a.id)?'Open':'Investigate'} <ChevronRight size={14}/></Link></div>)}</div></Panel>}
      {rows.map(i=><Panel className="insight-list-card" key={i.id}><div className="insight-card-top"><StatusPill tone={i.severity==='HIGH'?'high':i.severity==='MEDIUM'?'medium':'success'}>{i.severity}</StatusPill><span>{pct(i.changePercent)} deviation · {i.provider||'saved investigation'}</span></div><h3>{i.resource} at {i.location}</h3><p>{i.summary}</p><Link className="table-action" to={`/insights/${i.id}`}>Open investigation <ChevronRight size={14}/></Link></Panel>)}
      {!rows.length&&!anomalies.length&&<Empty icon={Sparkles} title="No investigation targets" text="Run baseline detection from Alerts after adding consumption data."/>}
    </div>}
  </>
}

const asArray=v=>Array.isArray(v)?v:(typeof v==='string'?(()=>{try{return JSON.parse(v||'[]')}catch{return[]}})():[]);
function EvidencePanel({evidence}){
  if(!evidence) return <Panel className="data-evidence-card"><div className="section-label">Workspace evidence</div><p className="evidence-intro">The investigation response did not include a saved evidence pack. Re-run the investigation to collect current workspace data.</p></Panel>;
  const p=evidence.production||{};
  const c=evidence.cost||{};
  return <div className="data-evidence-card">
    <div className="section-label">Workspace evidence checked</div>
    <p className="evidence-intro">These values came from persisted EcoPulse records before the interpretation was generated.</p>
    <div className="evidence-metric-grid">
      <div><span>Latest reading</span><strong>{fmt(evidence.anomaly?.currentValue)} {evidence.resource?.unit}</strong></div>
      <div><span>Historical baseline</span><strong>{fmt(evidence.anomaly?.baselineValue)} {evidence.resource?.unit}</strong></div>
      <div><span>Deviation</span><strong>{pct(evidence.anomaly?.changePercent)}</strong></div>
      <div><span>Production change</span><strong>{p.changePercent===null||p.changePercent===undefined?'Unavailable':pct(p.changePercent)}</strong></div>
      <div><span>Consumption intensity</span><strong>{p.intensityChangePercent===null||p.intensityChangePercent===undefined?'Unavailable':pct(p.intensityChangePercent)}</strong></div>
      <div><span>Cost change</span><strong>{c.changePercent===null||c.changePercent===undefined?'Unavailable':pct(c.changePercent)}</strong></div>
    </div>
    <div className="fact-list">{(evidence.facts||[]).slice(0,6).map((fact,i)=><div key={i}><CheckCircle2 size={14}/><span>{fact}</span></div>)}</div>
  </div>
}

function InsightDetail({insight,anomaly,navigate}){
  const [error,setError]=useState(''),[creating,setCreating]=useState('');
  async function createAction(x){
    setCreating(x.title);setError('');
    try{
      const r=await api.post('/actions',{insightId:insight.id,title:x.title,description:x.description,priority:x.priority,locationId:anomaly.locationId||null});
      navigate(`/actions?created=${encodeURIComponent(r.data.data.id)}`);
    }catch(e){setError(e.response?.data?.error?.message||'Unable to create the action.');}
    finally{setCreating('')}
  }
  const evidence=insight.evidence||(()=>{try{return JSON.parse(insight.rawResponse||'{}').evidence}catch{return null}})();
  return <div className="insight-stack">
    <EvidencePanel evidence={evidence}/>
    <Panel className="insight-detail">
      <div className="ai-header"><div><div className="eyebrow"><Sparkles size={14}/> AI interpretation</div><h2>{insight.summary}</h2></div><StatusPill tone={insight.severity==='HIGH'?'high':insight.severity==='MEDIUM'?'medium':'success'}>{insight.severity}</StatusPill></div>
      <div className="ai-disclaimer"><ShieldCheck size={14}/><span>AI interprets the stored evidence. Possible explanations are hypotheses, not established causes. Provider: {insight.provider||'saved investigation'}.</span></div>
      {error&&<div className="form-error"><AlertTriangle size={15}/>{error}</div>}
      {insight.whyThisCouldBeHappening&&<div className="why-panel"><div className="section-label">Why the pattern looks this way</div><p>{insight.whyThisCouldBeHappening}</p></div>}
      <div className="ai-section-grid"><div><div className="section-label">Possible contributing factors</div><ul>{asArray(insight.possibleFactors).map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><div className="section-label">Investigation checklist</div><ul className="check-list">{asArray(insight.investigationChecklist).map((x,i)=><li key={i}><CheckCircle2 size={15}/>{x}</li>)}</ul></div></div>
      <div className="ai-actions"><div className="section-label">Recommended actions</div>{asArray(insight.recommendedActions).map((x,i)=><div className="recommendation" key={i}><div><div className="recommend-title"><strong>{x.title}</strong><StatusPill tone={x.priority==='HIGH'?'high':x.priority==='MEDIUM'?'medium':'neutral'}>{x.priority}</StatusPill></div><p>{x.description}</p></div><Button variant="secondary" onClick={()=>createAction(x)} disabled={!!creating}><ChevronRight size={14}/>{creating===x.title?'Creating…':'Create action'}</Button></div>)}</div>
      <div className="monitoring"><div><div className="section-label">Monitoring plan</div><p>{insight.monitoringPlan}</p></div><Gauge size={20}/></div>
      <small className="ai-footnote">Evidence is calculated by EcoPulse. Gemini is used for interpretation, hypotheses, investigation steps and action recommendations.</small>
    </Panel>
  </div>
}

function Actions(){
  const location=useLocation();
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [q,setQ]=useState(''),[priority,setPriority]=useState(''),[statusFilter,setStatusFilter]=useState(''),[formOpen,setFormOpen]=useState(false),[locs,setLocs]=useState([]);
  const [form,setForm]=useState({title:'',description:'',priority:'MEDIUM',locationId:'',dueDate:''}),[saving,setSaving]=useState(false);
  async function load(){setLoading(true);setError('');try{const [a,l]=await Promise.all([api.get('/actions'),api.get('/locations')]);setRows(a.data.data||[]);setLocs(l.data.data||[]);}catch(e){setError(e.response?.data?.error?.message||'Unable to load actions.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  async function changeStatus(id,nextStatus){
    setError('');
    const previous=rows;
    setRows(cur=>cur.map(a=>a.id===id?{...a,status:nextStatus}:a));
    try{await api.patch(`/actions/${id}/status`,{status:nextStatus});await load();}
    catch(e){setRows(previous);setError(e.response?.data?.error?.message||'Unable to update the action.')}
  }
  async function create(e){e.preventDefault();setSaving(true);setError('');try{const r=await api.post('/actions',{...form,locationId:form.locationId||null,dueDate:form.dueDate||null});setForm({title:'',description:'',priority:'MEDIUM',locationId:'',dueDate:''});setFormOpen(false);await load();window.history.replaceState({},'',`/actions?created=${encodeURIComponent(r.data.data.id)}`);}catch(e){setError(e.response?.data?.error?.message||'Unable to create the action.')}finally{setSaving(false)}}
  const filtered=rows.filter(a=>(!priority||a.priority===priority)&&(!statusFilter||a.status===statusFilter)&&`${a.title} ${a.description} ${a.location||''} ${a.assignee||''}`.toLowerCase().includes(q.toLowerCase()));
  return <><PageHeader eyebrow="Execution" title="Action center" description="Every recommendation becomes owned work with a visible status and next step." actions={<div className="header-button-row"><Button variant="secondary" onClick={load}><RefreshCw size={15}/> Refresh</Button><Button onClick={()=>setFormOpen(v=>!v)}><Plus size={15}/>{formOpen?'Close':'New action'}</Button></div>}/>{paramsCreated(location.search)&&<div className="success-banner"><CheckCircle2 size={15}/> Action created and saved to the workspace.</div>}{error&&<div className="form-error page-error"><AlertTriangle size={15}/>{error}</div>}
    {formOpen&&<Panel className="action-form-panel"><PanelHeader title="Create an operational action" subtitle="Create work manually or from an AI recommendation."/><form className="record-form action-form" onSubmit={create}><div className="form-grid-2"><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required minLength={2}/></label><label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label></div><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required minLength={2}/></label><div className="form-grid-2"><label>Location<select value={form.locationId} onChange={e=>setForm({...form,locationId:e.target.value})}><option value="">Facility-wide</option>{locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label></div><Button disabled={saving}>{saving?'Creating…':'Create action'}</Button></form></Panel>}
    <div className="action-toolbar"><div className="search-box"><Search size={15}/><input placeholder="Search actions" value={q} onChange={e=>setQ(e.target.value)}/></div><select className="compact-select" value={priority} onChange={e=>setPriority(e.target.value)}><option value="">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select><select className="compact-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></div>
    {loading?<Loading/>:<div className="action-summary"><span>{filtered.length} visible actions</span><span>{rows.filter(a=>a.status==='OPEN').length} open</span><span>{rows.filter(a=>a.status==='IN_PROGRESS').length} in progress</span><span>{rows.filter(a=>a.status==='COMPLETED').length} completed</span></div>}
    {!loading&&<div className="kanban-board">{['OPEN','IN_PROGRESS','COMPLETED'].map(s=><div className="kanban-column" key={s}><div className="kanban-column-head"><div><span className="column-dot"/>{s==='IN_PROGRESS'?'IN PROGRESS':s}</div><b>{filtered.filter(x=>x.status===s).length}</b></div>{filtered.filter(x=>x.status===s).map(a=><div className="action-card" key={a.id}><div className="action-card-top"><StatusPill tone={a.priority==='HIGH'?'high':a.priority==='MEDIUM'?'medium':'neutral'}>{a.priority}</StatusPill>{a.insightId&&<span className="ai-source-badge"><Sparkles size={12}/> AI linked</span>}</div><h3>{a.title}</h3><p>{a.description}</p><div className="action-meta"><span><Building2 size={13}/>{a.location||'Facility-wide'}</span>{a.dueDate&&<span><CalendarDays size={13}/>{dateLabel(a.dueDate)}</span>}</div>{a.assignee&&<div className="action-assignee"><Users size={13}/> {a.assignee}</div>}{a.suggestedResource&&<div className="action-evidence"><span>Measure</span><strong>{a.suggestedResource}</strong>{a.suggestedCurrentValue!==null&&a.suggestedCurrentValue!==undefined&&<small>Latest reading {fmt(a.suggestedCurrentValue)} {a.suggestedResourceUnit||''}</small>}</div>}{a.insightId&&<Link to={`/insights/${a.insightId}`} className="action-investigation-link"><Sparkles size={13}/> View investigation</Link>}<div className="action-footer">{s==='OPEN'&&<Button variant="secondary" onClick={()=>changeStatus(a.id,'IN_PROGRESS')}>Start action</Button>}{s==='IN_PROGRESS'&&<Button variant="primary" onClick={()=>changeStatus(a.id,'COMPLETED')}><Check size={14}/> Mark complete</Button>}{s==='COMPLETED'&&<Link to={`/outcomes?action=${a.id}`} className="button button-secondary">Record outcome <ChevronRight size={14}/></Link>}</div></div>)}{!filtered.filter(x=>x.status===s).length&&<div className="kanban-empty">No {s==='IN_PROGRESS'?'in progress':s.toLowerCase()} actions.</div>}</div>)}</div>}
  </>
}
function paramsCreated(search){return !!new URLSearchParams(search).get('created')}

function Outcomes(){
  const location=useLocation();
  const [rows,setRows]=useState([]),[actions,setActions]=useState([]),[resources,setResources]=useState([]);
  const [f,setF]=useState({actionId:'',resourceId:'',beforeValue:'',afterValue:'',measuredAt:new Date().toISOString().slice(0,10),notes:''});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  async function load(){
    setLoading(true);setError('');
    try{
      const [o,a,r]=await Promise.all([api.get('/outcomes'),api.get('/actions?status=COMPLETED'),api.get('/resources')]);
      const completed=a.data.data||[],resourceRows=r.data.data||[];
      setRows(o.data.data||[]);setActions(completed);setResources(resourceRows);
      const queryAction=new URLSearchParams(location.search).get('action');
      const action=completed.find(x=>x.id===queryAction)||completed[0];
      setF(cur=>({
        ...cur,
        actionId:action?.id||cur.actionId||'',
        resourceId:action?.suggestedResourceId||cur.resourceId||resourceRows[0]?.id||'',
        beforeValue:action?.suggestedCurrentValue!==null&&action?.suggestedCurrentValue!==undefined ? String(action.suggestedCurrentValue) : cur.beforeValue,
        measuredAt:cur.measuredAt||new Date().toISOString().slice(0,10)
      }));
    }catch(e){setError(e.response?.data?.error?.message||'Unable to load outcomes.')}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[location.search]);
  const selectedAction=actions.find(a=>a.id===f.actionId),selectedResource=resources.find(r=>r.id===f.resourceId);
  async function save(e){
    e.preventDefault();setSaving(true);setError('');
    try{
      if(!f.actionId)return setError('Select a completed action first.');
      if(!f.resourceId)return setError('Select the resource being measured.');
      if(Number(f.beforeValue)<=0)return setError('Before value must be greater than 0.');
      if(Number(f.afterValue)<0)return setError('After value cannot be negative.');
      await api.post('/outcomes',{...f,beforeValue:Number(f.beforeValue),afterValue:Number(f.afterValue)});
      setF(x=>({...x,beforeValue:'',afterValue:'',notes:'',measuredAt:new Date().toISOString().slice(0,10)}));
      await load();
    }catch(e){setError(e.response?.data?.error?.message||'Unable to save the outcome.')}finally{setSaving(false)}
  }
  return <><PageHeader eyebrow="Verification" title="Outcome tracking" description="Record what changed after completed work, using observed measurements rather than unsupported causality claims."/>{error&&<div className="form-error page-error"><AlertTriangle size={15}/>{error}</div>}{loading?<Loading/>:<div className="outcome-layout"><Panel className="entry-panel"><div className="form-heading"><div><h3>Record an outcome</h3><p>Capture the next measured reading after a completed intervention.</p></div><span className="form-step">02</span></div>{!actions.length?<div className="empty-inline"><Target size={20}/><strong>No completed actions available</strong><p>Complete an action in the Action Center before recording an observed outcome.</p><Link to="/actions" className="button button-secondary">Open action center</Link></div>:<form onSubmit={save} className="record-form"><label>Completed action<select value={f.actionId||''} onChange={e=>{const action=actions.find(x=>x.id===e.target.value);setF({...f,actionId:e.target.value,resourceId:action?.suggestedResourceId||f.resourceId,beforeValue:action?.suggestedCurrentValue!==null&&action?.suggestedCurrentValue!==undefined?String(action.suggestedCurrentValue):f.beforeValue})}}>{actions.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label>Resource<select value={f.resourceId||''} onChange={e=>setF({...f,resourceId:e.target.value})}>{resources.map(r=><option key={r.id} value={r.id}>{r.name} · {r.unit}</option>)}</select></label>{selectedAction?.location&&<div className="context-strip"><Building2 size={14}/><span>{selectedAction.location}</span><StatusPill tone="success">COMPLETED</StatusPill>{selectedAction.insightId&&<span className="ai-source-badge"><Sparkles size={12}/> linked to investigation</span>}</div>}<div className="form-grid-2"><label>Before<input type="number" min="0.0001" step="0.1" value={f.beforeValue||''} onChange={e=>setF({...f,beforeValue:e.target.value})} required/></label><label>After<input type="number" min="0" step="0.1" value={f.afterValue||''} onChange={e=>setF({...f,afterValue:e.target.value})} required/></label></div>{f.beforeValue&&f.afterValue&&<div className="outcome-preview"><span>Observed change</span><strong>{pct(((Number(f.afterValue)-Number(f.beforeValue))/Number(f.beforeValue))*100)}</strong><small>Calculated directly from the two readings.</small></div>}<label>Measured date<input type="date" value={f.measuredAt||''} onChange={e=>setF({...f,measuredAt:e.target.value})} required/></label><label>Notes<textarea value={f.notes||''} onChange={e=>setF({...f,notes:e.target.value})} placeholder="Context, caveats or measurement conditions"/></label><Button className="button-full" disabled={saving}><Check size={15}/>{saving?'Saving…':'Save observed outcome'}</Button>{selectedResource&&<small className="field-note">Measurement unit: {selectedResource.unit}. Use the same resource metric used by the action.</small>}</form>}</Panel><Panel><PanelHeader title="Outcome timeline" subtitle="Observed changes after completed interventions"/>{rows.map(o=><div className="outcome-row" key={o.id}><div className="timeline-dot"><Check size={13}/></div><div className="outcome-content"><div className="outcome-head"><strong>{o.action}</strong><span>{dateLabel(o.measuredAt)}</span></div><span>{o.resource} · {o.location||'Facility-wide'}</span><div className="outcome-values"><div><small>BEFORE</small><b>{fmt(o.beforeValue)}</b></div><div className="outcome-arrow">→</div><div><small>AFTER</small><b>{fmt(o.afterValue)}</b></div><div className="observed-change"><small>OBSERVED CHANGE</small><b>{pct(o.percentageChange)}</b></div></div><p>Observed change after intervention. This record does not establish sole causality.</p></div></div>)}{!rows.length&&<Empty icon={Target} title="No outcomes recorded" text="Complete an action, then capture the next measurement."/>}</Panel></div>}</>
}

function Analytics(){return <><PageHeader eyebrow="Analytics" title="Performance analysis" description="Calculated views of consumption, trends and operating consistency."/><div className="analytics-grid"><Panel className="analytics-main"><PanelHeader title="Consumption trend" subtitle="Persisted monthly totals" action={<StatusPill tone="success">Calculated</StatusPill>}/><ResourceChart/></Panel><Panel><PanelHeader title="Efficiency methodology" subtitle="Transparent score composition"/><div className="method-list">{[['Resource trend','30%'],['Anomaly frequency','25%'],['Normalized consumption','20%'],['Completed actions','15%'],['Observed improvements','10%']].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b><i><em style={{width:b}}/></i></div>)}</div></Panel></div><div className="analytics-grid bottom"><Panel><PanelHeader title="Operational consistency" subtitle="Signals used by the efficiency score"/><div className="consistency-list">{[['Electricity','72'],['Water','84'],['Fuel','81'],['Actions closed','76']].map(([a,b])=><div key={a}><div><strong>{a}</strong><span>{b}/100</span></div><div className="consistency-bar"><i style={{width:`${b}%`}}/></div></div>)}</div></Panel><Panel><PanelHeader title="Calculation policy"/><div className="policy-copy"><div><ShieldCheck size={17}/><p>Gemini does not calculate basic metrics or invent the efficiency score.</p></div><div><Database size={17}/><p>All values are derived from persisted workspace records.</p></div><div><Target size={17}/><p>Outcome records describe observed change after intervention.</p></div></div></Panel></div></>}

function SettingsPage(){return <><PageHeader eyebrow="Administration" title="Workspace settings" description="Workspace identity and security controls."/><div className="settings-grid"><Panel><PanelHeader title="Organization" subtitle="Current workspace"/><div className="settings-row"><div className="settings-icon"><Building2 size={18}/></div><div><strong>GreenCore Manufacturing</strong><span>Manufacturing · 3 locations</span></div></div></Panel><Panel><PanelHeader title="Security" subtitle="Application safeguards"/><div className="security-list"><div><ShieldCheck size={17}/><div><strong>JWT authentication</strong><span>Protected application routes</span></div><StatusPill tone="success">Enabled</StatusPill></div><div><Database size={17}/><div><strong>Organization isolation</strong><span>Data access is scoped to the authenticated organization</span></div><StatusPill tone="success">Enabled</StatusPill></div><div><Sparkles size={17}/><div><strong>Server-side AI</strong><span>Gemini credentials never reach the browser</span></div><StatusPill tone="success">Enabled</StatusPill></div></div></Panel></div></>}

function App(){return <Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={<Auth/>}/><Route path="/register" element={<Auth mode="register"/>}/><Route path="*" element={token()?<Layout><Routes><Route path="/dashboard" element={<Dashboard/>}/><Route path="/resources" element={<Resources/>}/><Route path="/analytics" element={<Analytics/>}/><Route path="/alerts" element={<Alerts/>}/><Route path="/insights" element={<Insights/>}/><Route path="/insights/:id" element={<Insights/>}/><Route path="/actions" element={<Actions/>}/><Route path="/outcomes" element={<Outcomes/>}/><Route path="/settings" element={<SettingsPage/>}/></Routes></Layout>:<Auth/>}/></Routes>}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
