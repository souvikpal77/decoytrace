import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, BookOpen, Boxes, CheckCircle2, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, Database, Download, Fingerprint, GitBranch, Hash, LockKeyhole,
  Network, Play, Radar, RefreshCw, RotateCcw, Search, Shield, ShieldAlert, ShieldCheck, Square,
  Terminal, X, Zap,
} from 'lucide-react';
import {
  Alert, Decoy, LedgerBlock, NodeItem, SimState, TimelineEvent, buildInitialLedger, createInitialState,
  extendLedger, scenarios, sha256,
} from './simulation';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from 'recharts';

const queryClient = new QueryClient();
const navItems = [
  { href: '/dashboard', label: 'Command Center', icon: Activity },
  { href: '/network', label: 'Network Map', icon: Network },
  { href: '/decoys', label: 'Decoy Assets', icon: Boxes },
  { href: '/simulator', label: 'Simulation Lab', icon: Terminal },
  { href: '/incidents', label: 'Incident Reconstruction', icon: GitBranch },
  { href: '/ledger', label: 'Evidence Ledger', icon: Fingerprint },
];
type AppContext = {
  state: SimState; setState: Dispatch<SetStateAction<SimState>>; pushEvent: (message: string, severity?: Alert['severity'], source?: string, destination?: string, technique?: string) => void;
  startSimulation: () => void; stopSimulation: () => void; runDemo: () => void; stopDemo: () => void;
  demoCaption: string; demoStep: number; showTour: () => void;
};
function tip(text: string) {
  return <span className="tip" tabIndex={0} aria-label={text} data-tip={text}><CircleHelp size={13}/></span>;
}
function severityClass(level: string) {
  return level === 'Critical' || level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'green';
}
function shortTime(value: string) {
  if (value === 'Never') return 'Never';
  return new Date(value).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
function pageTitle(path: string) { return navItems.find(item => item.href === path)?.label ?? 'Welcome'; }

function AppRouter() {
  const [location, setLocation] = useLocation();
  const [state, setState] = useState<SimState | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [demoCaption, setDemoCaption] = useState('');
  const [demoStep, setDemoStep] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const timerRefs = useRef<number[]>([]);
  const initialized = useRef(false);
  const showTour = useCallback(() => { setTourIndex(0); setTourOpen(true); }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const initialLedger = await buildInitialLedger();
      let restored: SimState | null = null;
      try {
        const raw = localStorage.getItem('decoytrace-state-v1');
        if (raw) restored = JSON.parse(raw) as SimState;
      } catch { localStorage.removeItem('decoytrace-state-v1'); }
      if (!alive) return;
      setState(restored ? { ...createInitialState(initialLedger), ...restored, running:false } : createInitialState(initialLedger));
      initialized.current = true;
      if (!localStorage.getItem('decoytrace-tour-complete')) setTourOpen(true);
    };
    void load();
    return () => { alive = false; timerRefs.current.forEach(window.clearTimeout); };
  }, []);

  useEffect(() => {
    if (state && initialized.current) {
      const safe = { ...state, running: false };
      localStorage.setItem('decoytrace-state-v1', JSON.stringify(safe));
    }
  }, [state]);
  const pushEvent = useCallback((message: string, severity: Alert['severity']='Medium', source='HR-WS-014', destination='DECOY-SHARE-02', technique='T1083 · File and Directory Discovery (simulated)') => {
    const timestamp = new Date().toISOString();
    const id = `sim-${Date.now()}-${Math.floor(Math.random()*9999)}`;
    const alert: Alert = { id, timestamp, source, destination, severity, message };
    const event: TimelineEvent = { id:`event-${id}`, timestamp, event:message, source, destination, technique, severity };
    setState(current => {
      if (!current) return current;
      const relatedDecoy = destination === 'DECOY-SHARE-02' ? 'Payroll_Q4_forecast.xlsx'
        : destination === 'DECOY-DB-04' ? 'Northstar-DB-Replica'
          : destination === 'DECOY-AD-01' ? 'svc_backup_ro' : destination;
      const decoys = current.decoys.map(d => d.name === relatedDecoy && d.status==='Active' ? { ...d, triggerCount:d.triggerCount+1, lastTriggered:timestamp } : d);
      const destinationDecoy = current.decoys.find(d=>d.name===relatedDecoy);
      const nodes = current.nodes.map(n => n.name === source ? {...n, interactionCount:n.interactionCount+1, riskLevel:Math.min(99,n.riskLevel+5)} : n.name === destination && n.kind==='Decoy' && destinationDecoy?.status==='Active' ? {...n, interactionCount:n.interactionCount+1, decoyStatus:'Triggered' as const,riskLevel:Math.min(99,n.riskLevel+36)} : n);
      return {
        ...current, alerts:[alert,...current.alerts].slice(0,50), timeline:[event,...current.timeline].slice(0,50), decoys, nodes,
        risk:Math.min(99,Math.max(current.risk+7,severity==='Critical'?86:current.risk+3)), contained:false,
        path:[...current.path,source,destination].slice(-10),
        logs:[{id:`log-${id}`,time:new Date().toLocaleTimeString(),message:`${severity.toUpperCase()} · ${message} [${source} → ${destination}]`,tone:severity==='Critical'?'critical':severity==='High'?'alert':''},...current.logs].slice(0,100),
      };
    });
    setState(current => current ? { ...current, ledger: current.ledger } : current);
    void (async()=>{
      const latest = await new Promise<SimState | null>(resolve => setState(current => { resolve(current); return current; }));
      if (!latest) return;
      const ledger = await extendLedger(latest.ledger, `${severity} · ${message} · ${source} → ${destination}`);
      setState(current => current ? {...current,ledger} : current);
    })();
  }, []);
  const startSimulation = useCallback(() => {
    setState(current => current ? {...current,running:true,contained:false,logs:[{id:`log-${Date.now()}`,time:new Date().toLocaleTimeString(),message:'Scenario started. All activity is synthetic and local.',tone:'success'},...current.logs]} : current);
    const selected = scenarios.find(s=>s.id===state?.scenario) ?? scenarios[0];
    const route = state?.scenario === 'credential'
      ? ['ENG-MBP-022','DECOY-AD-01','DECOY-DB-04']
      : state?.scenario === 'insider'
        ? ['FIN-WS-008','DECOY-SHARE-02','DECOY-DB-04']
        : state?.scenario === 'ransomware'
          ? ['HR-WS-014','NS-CORE-01','DECOY-DB-04']
          : ['HR-WS-014','DECOY-SHARE-02','DECOY-DB-04'];
    void selected;
    const events = [
      ['Synthetic entry pattern observed','Medium',route[0],'NS-IDP-01','T1566 · Phishing (simulated)'],
      ['Reconnaissance touched a planted file decoy','High',route[0],route[1],'T1083 · File and Directory Discovery (simulated)'],
      ['Synthetic credential use against decoy database','Critical',route[1],route[2],'T1078 · Valid Accounts (simulated)'],
    ] as const;
    events.forEach((event,index) => {
      const id = window.setTimeout(() => {
        pushEvent(event[0],event[1],event[2],event[3],event[4]);
        if (index===2) {
          const containedTimer=window.setTimeout(()=>setState(current=>current?{...current,running:false,contained:true,risk:94,logs:[{id:`contained-${Date.now()}`,time:new Date().toLocaleTimeString(),message:'Containment complete · route isolated in simulation.',tone:'success'},...current.logs]}:current),900);
          timerRefs.current.push(containedTimer);
        }
      }, (index+1)*2300);
      timerRefs.current.push(id);
    });
  }, [pushEvent, state?.scenario]);
  const stopSimulation = useCallback(() => {
    timerRefs.current.forEach(window.clearTimeout); timerRefs.current=[];
    if(demoActive){setDemoActive(false);setDemoCaption('Demo stopped. Replay is ready whenever you are.');}
    setState(current => current ? {...current,running:false,logs:[{id:`stop-${Date.now()}`,time:new Date().toLocaleTimeString(),message:'Scenario stopped by operator.',tone:'alert'},...current.logs]} : current);
  }, [demoActive]);
  const stopDemo = useCallback(() => {
    timerRefs.current.forEach(window.clearTimeout); timerRefs.current=[];
    setDemoActive(false); setDemoCaption('Demo stopped. Replay is ready whenever you are.');
    setState(current=>current?{...current,running:false}:current);
  }, []);
  const runDemo = useCallback(() => {
    timerRefs.current.forEach(window.clearTimeout); timerRefs.current=[];
    setDemoActive(true); setDemoStep(0);
    setState(current=>current?{...current,running:true,contained:false,scenario:'phishing',risk:18,path:[],logs:[{id:`demo-start-${Date.now()}`,time:new Date().toLocaleTimeString(),message:'AUTODEMO · fictional Northstar environment boot sequence.',tone:'success'},...current.logs]}:current);
    const script: {caption:string; at:number; action?:()=>void}[] = [
      {caption:'01 / Network online — Northstar’s fictional environment is ready.',at:0},
      {caption:'02 / Simulated phishing at HR laptop — no message is sent.',at:3200,action:()=>pushEvent('Simulated phishing signal at HR laptop','Medium','HR-WS-014','NS-IDP-01','T1566 · Phishing (simulated)')},
      {caption:'03 / Recon — synthetic file browsing leaves a visible trail.',at:6500,action:()=>pushEvent('Reconnaissance touched a planted file decoy','High','HR-WS-014','DECOY-SHARE-02','T1083 · File and Directory Discovery (simulated)')},
      {caption:'04 / Fake password file discovered — the decoy records an interaction.',at:9800,action:()=>pushEvent('Fake password file discovered','High','HR-WS-014','vpn_recovery_codes.txt','T1555 · Credentials from Password Stores (simulated)')},
      {caption:'05 / Fake credentials used on decoy DB — the route is now visible.',at:13100,action:()=>pushEvent('Fake credentials used against decoy DB','Critical','DECOY-SHARE-02','DECOY-DB-04','T1078 · Valid Accounts (simulated)')},
      {caption:'06 / Critical decoy alert — suspicious movement is caught before a real asset.',at:16400,action:()=>pushEvent('Critical decoy interaction; real database remains untouched','Critical','DECOY-DB-04','NS-DB-01','T1021 · Remote Services (simulated)')},
      {caption:'07 / Reconstructed route — HR laptop → file decoy → decoy database.',at:19700},
      {caption:'08 / Incident timeline — every synthetic step has a timestamp and technique mapping.',at:23000},
      {caption:'09 / Evidence test — modifying old block #004; checking stored SHA-256…',at:26300,action:()=>{
        const oldBlock=state?.ledger.find(b=>b.index===4);
        setState(current=>current?{...current,ledger:current.ledger.map(b=>b.index===4?{...b,eventData:`${b.eventData} · tampered`}:b)}:current);
        if(oldBlock) void sha256(`${oldBlock.index}|${oldBlock.timestamp}|${oldBlock.eventData} · tampered|${oldBlock.previousHash}`).then(hash=>{
          if(hash!==oldBlock.hash)setDemoCaption('09 / CHAIN VERIFICATION FAILED at block #004 — edited data does not match its stored digest.');
        });
      }},
      {caption:'10 / THREAT CONTAINED — local simulation complete. No real systems were attacked.',at:29600,action:()=>setState(current=>current?{...current,running:false,contained:true,risk:94,logs:[{id:`done-${Date.now()}`,time:new Date().toLocaleTimeString(),message:'AUTODEMO COMPLETE · threat contained · synthetic route isolated.',tone:'success'},...current.logs]}:current)},
    ];
    script.forEach((item,index)=> {
      const timer = window.setTimeout(()=>{setDemoCaption(item.caption);setDemoStep(index+1);item.action?.();if(index===script.length-1)setDemoActive(false);},item.at);
      timerRefs.current.push(timer);
    });
  },[pushEvent,state]);
  if (!state) return <div className="app-shell" style={{padding:32}}><div className="panel" style={{height:120,opacity:.65}}/><div className="panel" style={{height:320,marginTop:16,opacity:.4}}/></div>;
  const updateState: Dispatch<SetStateAction<SimState>> = action => setState(current => {
    if (!current) return current;
    return typeof action === 'function' ? action(current) : action;
  });
  const context: AppContext = {state,setState:updateState,pushEvent,startSimulation,stopSimulation,runDemo,stopDemo,demoCaption,demoStep,showTour};
  const isWelcome = location === '/';
  return (
    <div className="app-shell">
      {!isWelcome && <Shell location={location} showTour={showTour} demoActive={demoActive} onStopDemo={stopDemo}/>}
      <Switch>
        <Route path="/" component={()=><Welcome onExplore={()=>setLocation('/dashboard')} runDemo={()=>{setLocation('/dashboard');window.setTimeout(runDemo,100);}}/>}/>
        <Route path="/dashboard" component={()=><Dashboard context={context}/>}/>
        <Route path="/network" component={()=><NetworkPage context={context}/>}/>
        <Route path="/decoys" component={()=><DecoysPage context={context}/>}/>
        <Route path="/simulator" component={()=><SimulatorPage context={context}/>}/>
        <Route path="/incidents" component={()=><IncidentsPage context={context}/>}/>
        <Route path="/ledger" component={()=><LedgerPage context={context}/>}/>
        <Route component={NotFound}/>
      </Switch>
      {tourOpen && <Tour index={tourIndex} setIndex={setTourIndex} close={()=>{setTourOpen(false);localStorage.setItem('decoytrace-tour-complete','yes');}}/>}
      {demoActive && <div className="demo-caption" role="status" data-testid="demo-caption"><span className="online-dot"/>{demoCaption}<button className="btn btn-small btn-quiet" onClick={stopDemo} data-testid="button-stop-demo"><Square size={12}/> Stop demo</button></div>}
      {!demoActive && demoCaption && demoStep>0 && <div className="demo-finished" role="status" data-testid="demo-final-status"><CheckCircle2 size={15}/><span>{demoCaption}</span><button className="btn btn-small btn-quiet" onClick={runDemo} data-testid="button-replay-demo"><RotateCcw size={12}/> Replay</button></div>}
    </div>
  );
}

function Shell({location,showTour,demoActive,onStopDemo}:{location:string;showTour:()=>void;demoActive:boolean;onStopDemo:()=>void}) {
  return <>
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark"><Radar size={19}/></span><span><span className="brand-name">DECOYTRACE</span><span className="brand-sub">Northstar Systems</span></span></Link>
      <div className="nav-label">Workspace</div><nav className="nav-list" aria-label="Main navigation">{navItems.map(item=><Link key={item.href} href={item.href} className={`nav-link ${location===item.href?'active':''}`} data-testid={`link-nav-${item.href.slice(1)}`}><item.icon size={16}/>{item.label}</Link>)}</nav>
      <div className="sidebar-foot">
        <button className="nav-link" onClick={showTour} data-testid="button-reopen-tour"><BookOpen size={16}/> Guided tour</button>
        <div className="safe-card"><strong><ShieldCheck size={14}/> LOCAL SIMULATION</strong><p>All assets are fictional. No network requests, scanning, or real credentials.</p></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <div className="mobile-menu"><span className="brand-mark"><Radar size={17}/></span><span className="brand-name">DECOYTRACE</span></div>
        <div className="top-title">{pageTitle(location)} <span style={{color:'#506174'}}> / </span> Northstar Systems</div>
        <div className="top-status"><span className="online-dot"/><span className="status-copy">SIMULATION ENVIRONMENT</span><button className="btn btn-small btn-quiet" onClick={showTour} aria-label="Open guided tour" data-testid="button-tour-top"><CircleHelp size={14}/></button>{demoActive&&<button className="btn btn-small btn-danger" onClick={onStopDemo} data-testid="button-stop-demo-top"><Square size={12}/> Stop</button>}</div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(item=><Link key={item.href} href={item.href} className={`nav-link ${location===item.href?'active':''}`} data-testid={`mobile-link-${item.href.slice(1)}`}><item.icon size={14}/>{item.label}</Link>)}</nav>
    </div>
  </>;
}

function Welcome({onExplore,runDemo}:{onExplore:()=>void;runDemo:()=>void}) {
  return <main className="welcome">
    <section className="welcome-copy">
      <Link href="/" className="brand" style={{padding:0}}><span className="brand-mark"><Radar size={19}/></span><span><span className="brand-name">DECOYTRACE</span><span className="brand-sub">Northstar Systems</span></span></Link>
      <div className="eyebrow" style={{marginTop:48}}>A local deception simulation</div>
      <h1>See the signal<br/>before it reaches<br/><span>what matters.</span></h1>
      <p className="welcome-desc">A hands-on command center for understanding how fictional decoy assets reveal suspicious movement. Follow a simulated intrusion, watch the evidence form, and see why the real systems stay untouched.</p>
      <div className="sim-banner" style={{maxWidth:440,marginBottom:22}}><ShieldAlert size={16}/> SIMULATION ONLY — NO REAL SYSTEMS ARE ATTACKED</div>
      <div className="toolbar"><button className="btn btn-primary" onClick={runDemo} data-testid="button-run-auto-demo"><Play size={15} fill="currentColor"/> Run Auto Demo <span style={{fontWeight:400,opacity:.75}}>~30 sec</span></button><button className="btn" onClick={onExplore} data-testid="button-explore-system">Explore system <ArrowRight size={14}/></button></div>
      <div className="welcome-foot"><LockKeyhole size={13}/> BROWSER-ONLY · FICTIONAL DATA · NO EXTERNAL SERVICES</div>
    </section>
    <section className="welcome-art" aria-label="Fictional network diagram"><div className="orbital"><div className="orb-center"><Shield size={38}/></div>{[1,2,3,4,5].map(i=><span key={i} className="orb-node"/>)}<div style={{position:'absolute',top:'4%',left:'62%',color:'#7890a3',font:'9px JetBrains Mono'}}>DECOY LAYER</div><div style={{position:'absolute',bottom:'6%',left:'12%',color:'#7890a3',font:'9px JetBrains Mono'}}>TRUST BOUNDARY</div></div></section>
  </main>;
}

const tourSteps = [
  {title:'Welcome to the command center',text:'This is a fully local simulation of Northstar Systems. Every host, IP, credential, and event is fictional; nothing leaves your browser.'},
  {title:'Read the network map',text:'Protected assets and planted decoys appear together. Click any node to inspect its role, fictional address, and current risk.'},
  {title:'Plant the signal',text:'The Decoy Asset Manager lets you search, filter, generate, and arm believable fake files, credentials, and servers.'},
  {title:'Run a scenario',text:'Choose one of four scenarios in the Simulation Lab. Synthetic telemetry updates the shared dashboard, map, alert feed, timeline, and evidence ledger.'},
  {title:'Verify the evidence',text:'The ledger is a blockchain-inspired local hash-chain demonstration—not a real blockchain or production integrity guarantee. Tamper with an old record and verify the break.'},
];
function Tour({index,setIndex,close}:{index:number;setIndex:(i:number)=>void;close:()=>void}) {
  const step=tourSteps[index];
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="tour-title" data-testid="guided-tour">
    <div className="modal"><div className="eyebrow">Guided orientation · {String(index+1).padStart(2,'0')} / 05</div><div className="tour-count">{'●'.repeat(index+1)}{'○'.repeat(4-index)}</div><h2 id="tour-title" style={{marginTop:12}}>{step.title}</h2><p>{step.text}</p><div className="callout"><ShieldCheck size={16} className="tone-green"/><span><strong>Simulation boundary.</strong> This application makes no network calls and never touches real systems.</span></div><div className="modal-actions"><button className="btn btn-quiet" onClick={close} data-testid="button-skip-tour">Skip tour</button><div className="toolbar">{index>0&&<button className="btn" onClick={()=>setIndex(index-1)} data-testid="button-tour-back"><ChevronLeft size={14}/> Back</button>}<button className="btn btn-primary" onClick={()=>index===tourSteps.length-1?close():setIndex(index+1)} data-testid="button-tour-next">{index===tourSteps.length-1?'Finish':'Continue'}{index<tourSteps.length-1&&<ChevronRight size={14}/>}</button></div></div></div>
  </div>;
}

function Page({context,eyebrow,title,description,children,actions}:{context:AppContext;eyebrow:string;title:string;description:string;children:ReactNode;actions?:ReactNode}) {
  return <div className="main-wrap"><main className="page" data-risk-score={context.state.risk}><div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="page-desc">{description}</p></div>{actions}</div>{children}</main></div>;
}
function Stat({label,value,meta,icon:Icon,tone='cyan',hint}:{label:string;value:string|number;meta:string;icon:typeof Activity;tone?:string;hint?:string}) {
  return <div className="panel stat-card" data-testid={`stat-${label.toLowerCase().replaceAll(' ','-')}`}><div className="stat-top"><span>{label} {hint&&tip(hint)}</span><Icon size={16} className={`tone-${tone}`}/></div><div className={`stat-value tone-${tone}`}>{value}</div><div className="stat-meta">{meta}</div></div>;
}
function AlertTable({alerts,limit=6}:{alerts:Alert[];limit?:number}) {
  return <div className="table-wrap"><table><thead><tr><th>Time</th><th>Source → destination</th><th>Severity</th><th>Signal</th></tr></thead><tbody>{alerts.slice(0,limit).map(a=><tr key={a.id} data-testid={`row-alert-${a.id}`}><td className="mono-text">{shortTime(a.timestamp)}</td><td><span className="mono-text">{a.source}</span><br/><span className="muted" style={{fontSize:10}}>→ {a.destination}</span></td><td><span className={`badge ${severityClass(a.severity)}`}>{a.severity}</span></td><td>{a.message}</td></tr>)}</tbody></table></div>;
}
function Dashboard({context}:{context:AppContext}) {
  const {state,runDemo,demoCaption,demoStep}=context;
  const chartData=useMemo(()=>state.alerts.slice(0,14).reverse().map((a,i)=>({time:new Date(a.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),alerts:i+1,critical:a.severity==='Critical'?1:0})),[state.alerts]);
  const decoyTriggers=state.decoys.reduce((sum,d)=>sum+d.triggerCount,0);
  const run=()=>runDemo();
  return <Page context={context} eyebrow="Security operations / overview" title="Security Command Center" description="One view of the fictional Northstar environment. Watch a decoy catch suspicious movement before it reaches a protected asset." actions={<button className="btn btn-primary" onClick={run} data-testid="button-dashboard-demo"><Play size={14} fill="currentColor"/> {demoStep?'Replay auto demo':'Run auto demo'}</button>}>
    <div className="sim-banner" style={{marginBottom:16}}><ShieldAlert size={15}/> SIMULATION ONLY — NO REAL SYSTEMS ARE ATTACKED <span style={{marginLeft:'auto',fontWeight:400,letterSpacing:0}}>Browser-local · synthetic telemetry</span></div>
    {demoCaption&&<div className="callout" style={{marginBottom:15}}><Activity size={16}/><span data-testid="demo-caption-dashboard">{demoCaption}</span></div>}
    <div className="stat-grid">
      <Stat label="Protected nodes" value="10" meta="All fictional assets" icon={ShieldCheck} tone="green"/>
      <Stat label="Armed decoys" value={`${state.decoys.filter(d=>d.status==='Active').length} / ${state.decoys.length}`} meta="Files · credentials · servers" icon={Boxes} tone="orange" hint="Decoys are believable fictional assets designed to surface suspicious interactions."/>
      <Stat label="Decoy interactions" value={decoyTriggers} meta="Cumulative trigger count" icon={Zap} tone="cyan"/>
      <Stat label="Risk score" value={`${state.risk}/100`} meta={state.contained?'Contained in simulation':'Based on synthetic signals'} icon={Activity} tone={state.risk>70?'red':'purple'} hint="Transparent teaching indicator from 0 to 100; synthetic severity and decoy events raise it. It is not a real risk assessment."/>
    </div>
    <div className="grid-2">
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Alert activity</div><div className="panel-kicker">Recent synthetic signals over time</div></div><span className="badge cyan">LIVE SIM</span></div><div className="panel-body"><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{top:8,right:8,left:-22,bottom:0}}><defs><linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5bd8e8" stopOpacity={.25}/><stop offset="100%" stopColor="#5bd8e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#233243" strokeDasharray="3 6" vertical={false}/><XAxis dataKey="time" tick={{fill:'#718398',fontSize:9}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:'#718398',fontSize:9}} axisLine={false} tickLine={false}/><ChartTooltip contentStyle={{background:'#111d2a',border:'1px solid #33475a',borderRadius:8,color:'#dce7f1',fontSize:11}}/><Area type="monotone" dataKey="alerts" stroke="#5bd8e8" strokeWidth={2} fill="url(#alertFill)" activeDot={{r:4,fill:'#5bd8e8'}}/></AreaChart></ResponsiveContainer></div><div className="muted" style={{fontSize:10}}>Local sample history + events from the active simulation</div></div></section>
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Risk posture {tip('A transparent synthetic 0–100 score for this demo. It summarizes generated events and is not a security product assessment.')}</div><div className="panel-kicker">Signal-weighted · local simulation only</div></div><Activity size={16} className="tone-purple"/></div><div className="panel-body"><div className="risk-score"><div className={`risk-score-num ${state.risk>70?'tone-red':'tone-cyan'}`}>{state.risk}</div><div><div style={{fontSize:13,fontWeight:600}}>{state.contained?'Threat contained':state.risk>70?'Elevated signal':'Low observed risk'}</div><div className="muted" style={{fontSize:10,marginTop:5}}>out of 100 synthetic points</div></div></div><div className="risk-bar" style={{margin:'17px 0 11px'}}><span style={{width:`${state.risk}%`}}/></div><div className="toolbar" style={{justifyContent:'space-between',fontSize:10}}><span className="tone-green">0 · quiet</span><span className="tone-orange">50 · watch</span><span className="tone-red">100 · critical</span></div><div className="callout" style={{marginTop:18}}><Shield size={15}/><span>Decoy telemetry offers an early warning layer. Real nodes remain fictional and are never contacted.</span></div></div></section>
    </div>
    <section className="panel section-gap"><div className="panel-head"><div><div className="panel-title">Recent alerts</div><div className="panel-kicker">{state.alerts.length} local entries · newest first</div></div><Link href="/incidents" className="btn btn-small btn-quiet" data-testid="link-all-incidents">View reconstruction <ArrowRight size={13}/></Link></div><AlertTable alerts={state.alerts} limit={5}/></section>
  </Page>;
}

const positions: Record<string,{x:number;y:number}> = {
  'node-01':{x:90,y:88},'node-02':{x:90,y:182},'node-03':{x:90,y:276},
  'node-04':{x:300,y:104},'node-05':{x:300,y:214},'node-06':{x:300,y:324},
  'node-07':{x:510,y:104},'node-08':{x:510,y:214},'node-09':{x:510,y:324},
  'node-10':{x:710,y:214},'node-11':{x:710,y:85},'node-12':{x:710,y:324},'node-13':{x:900,y:214},
};
function NetworkPage({context}:{context:AppContext}) {
  const {state}=context; const [selected,setSelected]=useState<NodeItem|null>(null);
  const edges=[['node-01','node-04'],['node-02','node-04'],['node-03','node-05'],['node-04','node-05'],['node-04','node-06'],['node-05','node-07'],['node-06','node-07'],['node-06','node-08'],['node-07','node-08'],['node-08','node-09'],['node-08','node-10'],['node-04','node-11'],['node-06','node-12'],['node-09','node-13']];
  return <Page context={context} eyebrow="Topology / interactive map" title="Network Map" description="A fictional trust map of 10 protected nodes and 3 decoys. Select a node to inspect details; animated paths reflect local simulation events." actions={<span className="badge green"><span className="online-dot"/> 13 fictional nodes</span>}>
    <div className="grid-2-even">
      <section className="panel" style={{overflow:'hidden'}}><div className="panel-head"><div><div className="panel-title">Northstar trust topology</div><div className="panel-kicker">Click any node for its details · dashed edges are decoy branches {tip('A path is a sequence of synthetic hops shown only to explain suspicious movement. It is not a live network route.')}</div></div><span className="badge cyan">SVG MAP</span></div><div style={{padding:'8px 10px 14px',overflowX:'auto'}}><svg viewBox="0 0 980 410" className="network-svg" role="img" aria-label="Fictional network topology with ten protected nodes and three decoy nodes">
        <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="none" stroke="#486075" strokeWidth="1"/></marker></defs>
        {edges.map(([a,b],i)=>{const p1=positions[a],p2=positions[b];const decoy=Number(b.slice(-2))>10;if(!p1||!p2)return null;return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={decoy?'#d9904e':'#34495f'} strokeWidth="1.3" strokeDasharray={decoy?'4 5':undefined} opacity=".68" markerEnd="url(#arrow)"/>})}
        {state.path.length>1&&state.path.slice(1).map((name,i)=>{const from=state.nodes.find(n=>n.name===state.path[i]);const to=state.nodes.find(n=>n.name===name);if(!from||!to)return null;const a=positions[from.id],b=positions[to.id];if(!a||!b)return null;return <line key={`path${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f0797c" strokeWidth="3" opacity=".8" className="flow-line"/>})}
        {state.nodes.map(node=>{const p=positions[node.id];if(!p)return null;const decoy=node.kind==='Decoy';const color=decoy?(node.decoyStatus==='Triggered'?'#f0797c':'#f2a65a'):(node.riskLevel>40?'#f0797c':'#5bd8e8');const labelX=p.x+19;return <g key={node.id} onClick={()=>setSelected(node)} className="node-circle" role="button" tabIndex={0} aria-label={`Select ${node.name}, ${node.kind} node`} data-testid={`network-node-${node.id}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelected(node);}}>
          <circle cx={p.x} cy={p.y} r="18" fill={decoy?'rgba(242,166,90,.1)':'rgba(91,216,232,.09)'} stroke={color} strokeWidth={selected?.id===node.id?2.5:1.4}/>
          <circle cx={p.x} cy={p.y} r="4" fill={color}/>{node.decoyStatus==='Triggered'&&<circle cx={p.x} cy={p.y} r="23" fill="none" stroke="#f0797c" opacity=".6" className="flow-line"/>}
          <text x={labelX} y={p.y-2} className="node-label">{node.name}</text><text x={labelX} y={p.y+12} className="node-ip">{node.fictionalIp}</text>
        </g>})}
      </svg></div><div className="panel-body" style={{paddingTop:0,display:'flex',gap:18,flexWrap:'wrap'}}><span className="toolbar"><span style={{width:8,height:8,borderRadius:'50%',background:'var(--cyan)'}}/> Protected asset</span><span className="toolbar"><span style={{width:8,height:8,borderRadius:'50%',background:'var(--orange)'}}/> Decoy {tip('A synthetic asset deliberately placed to attract and record suspicious interactions, revealing movement without exposing a real system.')}</span><span className="toolbar"><span style={{width:20,borderTop:'2px dashed var(--orange)'}}/> Deception branch</span></div></section>
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Node details</div><div className="panel-kicker">Selection panel</div></div><Database size={16} className="tone-cyan"/></div>{selected?<div className="panel-body">
        <div className="toolbar" style={{justifyContent:'space-between'}}><div><span className={`badge ${selected.kind==='Decoy'?'orange':'cyan'}`}>{selected.kind} node</span><h2 style={{fontSize:21,margin:'13px 0 5px'}}>{selected.name}</h2><span className="mono-text">{selected.fictionalIp}</span></div><button className="btn btn-small btn-quiet" onClick={()=>setSelected(null)} aria-label="Close details" data-testid="button-close-node"><X size={14}/></button></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13,marginTop:20}}><Detail label="Operating system" value={selected.operatingSystem}/><Detail label="Role" value={selected.role}/><Detail label="Decoy status" value={selected.decoyStatus}/><Detail label="Interactions" value={selected.interactionCount}/></div><div style={{marginTop:18}}><div className="stat-top"><span>Risk level</span><span className="mono-text">{selected.riskLevel}/100</span></div><div className="risk-bar" style={{marginTop:10}}><span style={{width:`${selected.riskLevel}%`}}/></div></div>
        <div className="callout" style={{marginTop:18}}><LockKeyhole size={15}/><span>Fictional sample only. IP ranges are documentation-only and never contacted.</span></div>
      </div>:<div className="empty-state"><Network size={26} style={{marginBottom:12,opacity:.6}}/><div>Select a map node to inspect its fictional details.</div></div>}
      </section>
    </div>
    <section className="panel section-gap"><div className="panel-head"><div><div className="panel-title">Node inventory</div><div className="panel-kicker">Protected and deception-layer endpoints</div></div></div><div className="table-wrap"><table><thead><tr><th>Asset</th><th>Class</th><th>Fictional IP</th><th>Role</th><th>Interactions</th><th>Status</th></tr></thead><tbody>{state.nodes.map(n=><tr key={n.id} onClick={()=>setSelected(n)} style={{cursor:'pointer'}} data-testid={`row-node-${n.id}`}><td>{n.name}</td><td><span className={`badge ${n.kind==='Decoy'?'orange':'cyan'}`}>{n.kind}</span></td><td className="mono-text">{n.fictionalIp}</td><td>{n.role}</td><td className="mono-text">{n.interactionCount}</td><td><span className={`badge ${n.decoyStatus==='Triggered'?'red':n.decoyStatus==='Armed'?'orange':'green'}`}>{n.decoyStatus}</span></td></tr>)}</tbody></table></div></section>
  </Page>;
}
function Detail({label,value}:{label:string;value:string|number}) {return <div><div className="muted" style={{fontSize:10,marginBottom:6}}>{label}</div><div style={{fontSize:12}}>{value}</div></div>}

function DecoysPage({context}:{context:AppContext}) {
  const {state,setState,pushEvent}=context;
  const [query,setQuery]=useState('');const [filter,setFilter]=useState('All');const [name,setName]=useState('');const [type,setType]=useState<Decoy['type']>('File');const [location,setLocation]=useState('Operations / Synthetic');const [notice,setNotice]=useState('');
  const filtered=state.decoys.filter(d=>(filter==='All'||d.type===filter)&&(d.name.toLowerCase().includes(query.toLowerCase())||d.location.toLowerCase().includes(query.toLowerCase())));
  const generate=()=>{
    const clean=name.trim()||`${type==='File'?'quarterly_review_notes.docx':type==='Credential'?'svc_archive_read':'NS-Synthetic-Cache'}`;
    const item:Decoy={id:`decoy-${Date.now()}`,name:clean,type,location,realismScore:88+Math.floor(Math.random()*11),status:'Active',triggerCount:0,lastTriggered:'Never'};
    setState(s=>({...s,decoys:[item,...s.decoys],nodes:type==='Server'?[...s.nodes,{id:`node-${Date.now()}`,name:clean,kind:'Decoy',fictionalIp:`10.42.9.${40+s.nodes.length}`,operatingSystem:'Ubuntu 22.04',role:'Synthetic service',decoyStatus:'Armed',interactionCount:0,riskLevel:0}]:s.nodes,logs:[{id:`log-${Date.now()}`,time:new Date().toLocaleTimeString(),message:`Synthetic ${type.toLowerCase()} decoy generated: ${clean}`,tone:'success'},...s.logs]}));
    setName('');setNotice(`${clean} added and armed. This is fictional sample data.`);
  };
  const toggle=(d:Decoy)=>{
    const next=d.status==='Active'?'Inactive':'Active';
    setState(s=>({...s,decoys:s.decoys.map(x=>x.id===d.id?{...x,status:next}:x),nodes:s.nodes.map(n=>n.name===d.name?{...n,decoyStatus:next==='Active'?'Armed':'Offline'}:n)}));
    setNotice(`${d.name} ${next==='Active'?'activated':'deactivated'}.`);
  };
  return <Page context={context} eyebrow="Deception layer / assets" title="Decoy Asset Manager" description="Manage believable synthetic assets. Their value is in being convincing enough to attract a signal—and safe enough to never be real." actions={<span className="badge orange">{state.decoys.length} decoys configured</span>}>
    <div className="grid-2-even">
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Generate a decoy</div><div className="panel-kicker">Create a fictional asset for this browser session</div></div><Boxes size={16} className="tone-orange"/></div><div className="panel-body"><label className="muted" style={{display:'block',fontSize:10,marginBottom:6}}>Asset name</label><input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. payroll_archive_2025.xlsx" data-testid="input-decoy-name"/><div className="grid-2-even" style={{marginTop:12}}><div><label className="muted" style={{display:'block',fontSize:10,marginBottom:6}}>Category</label><select className="field" value={type} onChange={e=>setType(e.target.value as Decoy['type'])} data-testid="select-decoy-type"><option>File</option><option>Credential</option><option>Server</option></select></div><div><label className="muted" style={{display:'block',fontSize:10,marginBottom:6}}>Fictional location</label><input className="field" value={location} onChange={e=>setLocation(e.target.value)} data-testid="input-decoy-location"/></div></div><button className="btn btn-primary" style={{marginTop:14}} onClick={generate} data-testid="button-generate-decoy"><Zap size={14}/> Generate &amp; arm</button>{notice&&<div className="callout" style={{marginTop:13}} role="status" data-testid="status-decoy-action"><CheckCircle2 size={15} className="tone-green"/><span>{notice}</span></div>}</div></section>
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Why decoys work</div><div className="panel-kicker">A transparent teaching model</div></div><Shield size={16} className="tone-cyan"/></div><div className="panel-body"><div className="callout"><Radar size={16}/><span><strong>Decoy</strong> {tip('A decoy is a fake but believable asset. Any interaction is unusual by design, creating a high-confidence signal in this demonstration.')} — a monitored fictional file, credential, or service.</span></div><div style={{display:'grid',gap:12,marginTop:17}}>{[['01','Place','Seed believable decoys in synthetic trust zones.'],['02','Observe','Interactions update the shared local event stream.'],['03','Contain','Use the signal to illustrate early detection before a real asset.']].map(x=><div key={x[0]} className="toolbar"><span className="mono tone-cyan">{x[0]}</span><div><strong style={{fontSize:12}}>{x[1]}</strong><div className="muted" style={{fontSize:10,marginTop:3}}>{x[2]}</div></div></div>)}</div></div></section>
    </div>
    <section className="panel section-gap"><div className="panel-head"><div><div className="panel-title">Decoy inventory</div><div className="panel-kicker">Search and filter 12 fictional samples</div></div><span className="badge green">{state.decoys.filter(d=>d.status==='Active').length} active</span></div><div className="panel-body" style={{paddingBottom:12}}><div className="toolbar"><div className="search-field"><Search size={14}/><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search assets or locations…" aria-label="Search decoy assets" data-testid="input-decoy-search"/></div><div className="toolbar">{['All','File','Credential','Server'].map(t=><button key={t} className={`filter-chip ${filter===t?'active':''}`} onClick={()=>setFilter(t)} data-testid={`filter-decoy-${t.toLowerCase()}`}>{t}</button>)}</div></div></div><div className="table-wrap"><table><thead><tr><th>Fictional asset</th><th>Category</th><th>Location</th><th>Realism</th><th>Interactions</th><th>Last triggered</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map(d=><tr key={d.id} data-testid={`row-decoy-${d.id}`}><td><strong>{d.name}</strong></td><td><span className={`badge ${d.type==='File'?'cyan':d.type==='Credential'?'purple':'orange'}`}>{d.type}</span></td><td>{d.location}</td><td><span className="mono-text">{d.realismScore}%</span></td><td className="mono-text">{d.triggerCount}</td><td className="mono-text">{shortTime(d.lastTriggered)}</td><td><span className={`badge ${d.status==='Active'?'green':'red'}`}>{d.status}</span></td><td><button className={`btn btn-small ${d.status==='Active'?'btn-quiet':'btn-primary'}`} onClick={()=>toggle(d)} data-testid={`button-toggle-decoy-${d.id}`}>{d.status==='Active'?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table>{filtered.length===0&&<div className="empty-state">No decoys match this view. Try another category or search.</div>}</div></section>
  </Page>;
}

function SimulatorPage({context}:{context:AppContext}) {
  const {state,setState,startSimulation,stopSimulation,demoCaption,runDemo}=context;
  const activeScenario=scenarios.find(s=>s.id===state.scenario)??scenarios[0];
  return <Page context={context} eyebrow="Scenario engine / local only" title="Attack Simulation Lab" description="Run a controlled, paced sequence of synthetic telemetry through the shared environment. No attack tooling or external network activity is involved." actions={<span className={`badge ${state.running?'orange':'green'}`}>{state.running?'Scenario running':'Ready to simulate'}</span>}>
    <div className="sim-banner" style={{marginBottom:16}}><ShieldAlert size={15}/> SIMULATION ONLY — NO REAL SYSTEMS ARE ATTACKED <span style={{marginLeft:'auto',fontWeight:400}}>Fictional data · browser state</span></div>
    <div className="grid-2-even">
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Choose a scenario</div><div className="panel-kicker">A teaching narrative, not an attack playbook</div></div><Radar size={16} className="tone-cyan"/></div><div className="panel-body"><label htmlFor="scenario-select" className="muted" style={{fontSize:10}}>Scenario profile</label><select id="scenario-select" className="field" style={{marginTop:7}} value={state.scenario} disabled={state.running} onChange={e=>setState(s=>({...s,scenario:e.target.value}))} data-testid="select-scenario">{scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="callout" style={{marginTop:14}}><BookOpen size={15}/><span>{activeScenario.detail}</span></div><div className="toolbar" style={{marginTop:18}}><button className="btn btn-primary" disabled={state.running} onClick={startSimulation} data-testid="button-start-simulation"><Play size={14} fill="currentColor"/> Start simulation</button><button className="btn btn-danger" disabled={!state.running} onClick={stopSimulation} data-testid="button-stop-simulation"><Square size={13} fill="currentColor"/> Stop</button><button className="btn" onClick={runDemo} data-testid="button-start-demo"><Zap size={14}/> Run paced auto demo</button></div><div className="section-gap" style={{borderTop:'1px solid var(--line)',paddingTop:15}}><div className="stat-top"><span>Simulation risk score {tip('A demonstration-only 0–100 indicator. It rises from generated signals; it is not a real security rating.')}</span><span className="mono-text">{state.risk} / 100</span></div><div className="risk-bar" style={{marginTop:9}}><span style={{width:`${state.risk}%`}}/></div></div></div></section>
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Synthetic attack path</div><div className="panel-kicker">Only changes when this app simulates an event</div></div><GitBranch size={16} className="tone-orange"/></div><div className="panel-body">{state.path.length?<div style={{display:'grid',gap:10}}>{state.path.map((n,i)=><div key={`${n}-${i}`} className="toolbar" data-testid={`path-node-${i}`}><span className={`badge ${n.startsWith('DECOY')?'orange':'cyan'}`}>{String(i+1).padStart(2,'0')}</span><div><strong className="mono-text">{n}</strong><div className="muted" style={{fontSize:9,marginTop:3}}>{state.nodes.find(x=>x.name===n)?.role??'Synthetic decoy asset'}</div></div>{i<state.path.length-1&&<ArrowDownRight size={14} className="muted"/>}</div>)}</div>:<div className="empty-state"><GitBranch size={27} style={{marginBottom:10,opacity:.5}}/><div>Run a scenario to build the synthetic route.</div></div>}<div className="callout" style={{marginTop:15}}><LockKeyhole size={15}/><span>Routes never leave the browser. Protected nodes are fictional stand-ins.</span></div></div></section>
    </div>
    <section className="panel section-gap"><div className="panel-head"><div><div className="panel-title">Event terminal</div><div className="panel-kicker">{state.logs.length} local entries · newest first</div></div><span className="badge cyan"><span className="online-dot"/> LOCAL SESSION</span></div><div className="panel-body"><div className="terminal"><div className="terminal-bar"><span><Terminal size={12} style={{display:'inline',verticalAlign:'middle',marginRight:7}}/> decoytrace / synthetic event stream</span><span>READ-ONLY OUTPUT</span></div><div className="terminal-body">{state.logs.slice(0,35).map(log=><div className="terminal-line" key={log.id}><span className="terminal-time">{log.time}</span><span className={`terminal-msg ${log.tone}`}>{log.message}</span></div>)}<div className="terminal-line"><span className="terminal-time">{new Date().toLocaleTimeString()}</span><span className="terminal-msg">{state.running?'waiting for next event':'ready'} <i className="terminal-caret"/></span></div></div></div>{demoCaption&&<div className="callout" style={{marginTop:12}} role="status">{demoCaption}</div>}</div></section>
  </Page>;
}

function downloadReport(state:SimState) {
  const payload={product:'DECOYTRACE',environment:'Northstar Systems (fictional)',generatedAt:new Date().toISOString(),simulationOnly:true,notice:'No real systems were attacked. This report contains local synthetic data.',riskScore:state.risk,nodes:state.nodes,decoys:state.decoys,alerts:state.alerts,timeline:state.timeline,ledger:state.ledger};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`decoytrace-report-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
}
function IncidentsPage({context}:{context:AppContext}) {
  const {state}=context;
  return <Page context={context} eyebrow="Forensics / reconstruction" title="Incident Reconstruction" description="Review the synthetic sequence as a readable timeline. ATT&CK labels are illustrative mappings for learning—not evidence of real activity." actions={<button className="btn btn-primary" onClick={()=>downloadReport(state)} data-testid="button-download-report"><Download size={14}/> Download JSON report</button>}>
    <div className="sim-banner" style={{marginBottom:16}}><ShieldAlert size={15}/> SIMULATION ONLY — ALL EVENTS AND TECHNIQUE MAPPINGS ARE FICTIONAL</div>
    <div className="stat-grid"><Stat label="Timeline events" value={state.timeline.length} meta="Synthetic observations" icon={Clock3} tone="cyan"/><Stat label="Alert signals" value={state.alerts.length} meta="Newest first" icon={AlertTriangle} tone="orange"/><Stat label="Critical events" value={state.timeline.filter(e=>e.severity==='Critical').length} meta="Synthetic severity" icon={ShieldAlert} tone="red"/><Stat label="Affected real assets" value="0" meta="All destinations fictional" icon={ShieldCheck} tone="green"/></div>
    <section className="panel"><div className="panel-head"><div><div className="panel-title">Event timeline</div><div className="panel-kicker">Timestamp · event · source · destination · severity · simulated technique</div></div><span className="badge purple">ATT&amp;CK MAPPING · SIMULATED</span></div><div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>Event</th><th>Source</th><th>Destination</th><th>Severity</th><th>MITRE ATT&amp;CK mapping</th></tr></thead><tbody>{state.timeline.map(event=><tr key={event.id} data-testid={`row-timeline-${event.id}`}><td className="mono-text">{new Date(event.timestamp).toLocaleString()}</td><td>{event.event}</td><td className="mono-text">{event.source}</td><td className="mono-text">{event.destination}</td><td><span className={`badge ${severityClass(event.severity)}`}>{event.severity}</span></td><td><span className="mono-text" style={{color:'#b3a6ed'}}>{event.technique}</span></td></tr>)}</tbody></table></div></section>
    <section className="panel section-gap"><div className="panel-head"><div><div className="panel-title">Alert feed</div><div className="panel-kicker">Every record is synthetic and stored locally</div></div></div><AlertTable alerts={state.alerts} limit={20}/></section>
    <div className="callout section-gap"><BookOpen size={15}/><span><strong>About these mappings:</strong> technique names and IDs are provided as educational labels. They describe a fictional scenario and do not reflect observed activity on a real system.</span></div>
  </Page>;
}

function LedgerPage({context}:{context:AppContext}) {
  const {state,setState}=context;const [verify,setVerify]=useState<'idle'|'checking'|'valid'|'failed'>('idle');const [failedIndex,setFailedIndex]=useState<number|null>(null);const [detail,setDetail]=useState<number|null>(null);
  useEffect(()=>{
    let current=true;
    void (async()=>{
      for(let i=0;i<state.ledger.length;i++){
        const block=state.ledger[i];
        const expectedPrevious=i===0?'0'.repeat(64):state.ledger[i-1].hash;
        const expected=await sha256(`${block.index}|${block.timestamp}|${block.eventData}|${block.previousHash}`);
        if(!current)return;
        if(block.previousHash!==expectedPrevious||block.hash!==expected){setFailedIndex(block.index);setVerify('failed');return;}
      }
      if(current){setFailedIndex(null);setVerify('valid');}
    })();
    return ()=>{current=false;};
  },[state.ledger]);
  const verifyChain=async()=>{
    setVerify('checking');setFailedIndex(null);
    for(let i=0;i<state.ledger.length;i++){
      const block=state.ledger[i];const expectedPrevious=i===0?'0'.repeat(64):state.ledger[i-1].hash;
      const expected=await sha256(`${block.index}|${block.timestamp}|${block.eventData}|${block.previousHash}`);
      if(block.previousHash!==expectedPrevious||block.hash!==expected){setFailedIndex(block.index);setVerify('failed');return;}
    }
    setVerify('valid');
  };
  const tamper=()=>{setState(s=>({...s,ledger:s.ledger.map(b=>b.index===4?{...b,eventData:`${b.eventData} · modified locally`}:b)}));setVerify('idle');setFailedIndex(null);};
  const reset=async()=>{const ledger=await buildInitialLedger();setState(s=>({...s,ledger}));setVerify('idle');setFailedIndex(null);};
  return <Page context={context} eyebrow="Integrity / local hash chain" title="Tamper-Proof Evidence Ledger" description="Inspect the evidence chain, verify every SHA-256 digest, and intentionally break an old record to see how downstream links reveal the change." actions={<button className="btn" onClick={verifyChain} disabled={verify==='checking'} data-testid="button-verify-chain"><RefreshCw size={14} className={verify==='checking'?'spin':''}/>{verify==='checking'?'Verifying…':'Verify chain'}</button>}>
    <div className="callout" style={{marginBottom:16,borderColor:'rgba(169,153,236,.25)',background:'rgba(169,153,236,.045)'}}><Fingerprint size={17} className="tone-purple"/><span><strong>Blockchain-inspired local hash-chain demonstration.</strong> Not a real blockchain, distributed ledger, or production integrity guarantee. SHA-256 runs in your browser; blocks are stored in localStorage.</span></div>
    <div className="grid-2-even">
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Chain status {tip('Each block stores its own digest and the prior block hash. Changing old event data makes the stored digest inconsistent; this browser-only demo does not provide production security.')}</div><div className="panel-kicker">Recompute each record with Web Crypto SHA-256</div></div><Hash size={16} className="tone-purple"/></div><div className="panel-body"><div className="toolbar" style={{justifyContent:'space-between'}}><span className={`badge ${verify==='valid'?'green':verify==='failed'?'red':'cyan'}`}>{verify==='valid'?'VERIFIED':verify==='failed'?'INTEGRITY FAILURE':verify==='checking'?'CHECKING':'NOT CHECKED'}</span><span className="mono-text">{state.ledger.length} blocks</span></div>{verify==='failed'?<div className="callout" style={{marginTop:14,borderColor:'rgba(240,121,124,.3)',background:'rgba(240,121,124,.06)'}}><AlertTriangle size={16} className="tone-red"/><span><strong>Verification failed at block #{String(failedIndex).padStart(3,'0')}.</strong> The event data no longer matches its stored digest. Subsequent blocks still reference the old hash, so the chain is broken.</span></div>:verify==='valid'?<div className="callout" style={{marginTop:14,borderColor:'rgba(112,214,161,.25)',background:'rgba(112,214,161,.05)'}}><CheckCircle2 size={16} className="tone-green"/><span>All stored hashes and previous-hash links match. This only verifies local demonstration data.</span></div>:<div className="callout" style={{marginTop:14}}><CircleHelp size={16}/><span>Run verification to recompute each SHA-256 digest and check that each block points to the prior stored hash.</span></div>}<div className="toolbar" style={{marginTop:17}}><button className="btn btn-danger" onClick={tamper} data-testid="button-tamper-block"><AlertTriangle size={14}/> Modify old block #004</button><button className="btn" onClick={reset} data-testid="button-rebuild-chain"><RotateCcw size={14}/> Reset / rebuild chain</button></div><div className="muted" style={{fontSize:10,marginTop:11}}>The tamper action changes only the old event data; it deliberately does not recalculate that block or later hashes.</div></div></section>
      <section className="panel"><div className="panel-head"><div><div className="panel-title">What the hash chain demonstrates</div><div className="panel-kicker">A small integrity lesson, not a security guarantee</div></div><LockKeyhole size={16} className="tone-cyan"/></div><div className="panel-body"><div style={{display:'grid',gap:13}}>{[['01','Event data','A local event is recorded with its timestamp.'],['02','SHA-256','The browser computes a 256-bit digest for the block.'],['03','Previous hash','Each block references the prior block digest.'],['04','Verify','Any data change no longer matches the stored hash.']].map(row=><div key={row[0]} className="toolbar"><span className="mono tone-purple">{row[0]}</span><div><strong style={{fontSize:12}}>{row[1]}</strong><div className="muted" style={{fontSize:10,marginTop:3}}>{row[2]}</div></div></div>)}</div><div className="callout" style={{marginTop:16}}><ShieldAlert size={15}/><span>LocalStorage can be edited or cleared. This is an educational visualization, not durable evidence preservation.</span></div></div></section>
    </div>
    <section className="panel section-gap"><div className="panel-head"><div><div className="panel-title">Evidence blocks</div><div className="panel-kicker">Stored chain records · select a row to inspect hash fields</div></div><span className="badge purple">SHA-256</span></div><div className="table-wrap"><table><thead><tr><th>Block</th><th>Timestamp</th><th>Event data</th><th>Previous hash</th><th>Stored hash</th><th>Details</th></tr></thead><tbody>{state.ledger.map(block=><tr key={block.index} style={{background:failedIndex===block.index?'rgba(240,121,124,.075)':undefined}} data-testid={`row-ledger-${block.index}`}><td><span className={`badge ${failedIndex===block.index?'red':'purple'}`}>#{String(block.index).padStart(3,'0')}</span></td><td className="mono-text">{new Date(block.timestamp).toLocaleString()}</td><td>{block.eventData}</td><td><span className="hash">{block.previousHash.slice(0,18)}…</span></td><td><span className="hash">{block.hash.slice(0,18)}…</span></td><td><button className="btn btn-small btn-quiet" onClick={()=>setDetail(detail===block.index?null:block.index)} data-testid={`button-ledger-detail-${block.index}`}>{detail===block.index?'Hide':'Inspect'}</button></td></tr>)}</tbody></table></div>{detail!==null&&(()=>{const b=state.ledger.find(x=>x.index===detail);if(!b)return null;return <div className="panel-body" style={{borderTop:'1px solid var(--line)'}}><div className="eyebrow">Block #{String(b.index).padStart(3,'0')} / digest detail</div><Detail label="Event data" value={b.eventData}/><div style={{marginTop:12}}><div className="muted" style={{fontSize:10,marginBottom:5}}>Previous hash</div><div className="hash">{b.previousHash}</div></div><div style={{marginTop:12}}><div className="muted" style={{fontSize:10,marginBottom:5}}>SHA-256 hash</div><div className="hash">{b.hash}</div></div></div>})()}</section>
  </Page>;
}

function RoutedErrorBoundary({children}:{children:ReactNode}) {const [location]=useLocation();return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}><RoutedErrorBoundary><AppRouter/></RoutedErrorBoundary></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
export default App;
