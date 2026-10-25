export type Decoy = {
  id: string; name: string; type: 'File' | 'Credential' | 'Server'; location: string;
  realismScore: number; status: 'Active' | 'Inactive'; triggerCount: number; lastTriggered: string;
};
export type NodeItem = {
  id: string; name: string; kind: 'Real' | 'Decoy'; fictionalIp: string; operatingSystem: string;
  role: string; decoyStatus: 'Protected' | 'Armed' | 'Triggered' | 'Offline'; interactionCount: number; riskLevel: number;
};
export type Alert = { id: string; timestamp: string; source: string; destination: string; severity: 'Low' | 'Medium' | 'High' | 'Critical'; message: string };
export type TimelineEvent = { id: string; timestamp: string; event: string; source: string; destination: string; technique: string; severity: Alert['severity'] };
export type LedgerBlock = { index: number; timestamp: string; eventData: string; previousHash: string; hash: string };
export type SimState = {
  decoys: Decoy[]; nodes: NodeItem[]; alerts: Alert[]; timeline: TimelineEvent[]; ledger: LedgerBlock[];
  logs: { id: string; time: string; message: string; tone: string }[];
  risk: number; running: boolean; contained: boolean; scenario: string; path: string[];
};
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
export const scenarios = [
  { id: 'phishing', name: 'Phishing → lateral movement', detail: 'A compromised HR workstation follows a trail of believable decoys.' },
  { id: 'credential', name: 'Credential stuffing', detail: 'Repeated fictional sign-in attempts encounter a monitored credential decoy.' },
  { id: 'insider', name: 'Insider data theft', detail: 'Unusual access to synthetic archive files triggers decoy telemetry.' },
  { id: 'ransomware', name: 'Ransomware reconnaissance', detail: 'A simulated host maps synthetic services before containment.' },
] as const;
const decoyNames = [
  ['Payroll_Q4_forecast.xlsx', 'File', 'HR / Share / Finance', 96],
  ['svc_backup_ro', 'Credential', 'Credential Vault / Legacy', 91],
  ['Northstar-DB-Replica', 'Server', 'Segment 04 / Finance', 93],
  ['acquisition_notes_draft.docx', 'File', 'Executive / Archive', 88],
  ['vpn_recovery_codes.txt', 'Credential', 'Identity / Recovery', 98],
  ['legacy-sql-02', 'Server', 'Segment 02 / Data', 90],
  ['board_compensation_2025.pdf', 'File', 'Executive / Board', 94],
  ['svc_hr_import', 'Credential', 'HR / Integrations', 89],
  ['staging-customer-api', 'Server', 'Segment 06 / Apps', 92],
  ['wire_instructions_pending.pdf', 'File', 'Finance / AP', 97],
  ['ops_admin_backup', 'Credential', 'Operations / Legacy', 90],
  ['Northstar-AD-Mirror', 'Server', 'Segment 01 / Identity', 95],
] as const;
export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export async function buildInitialLedger(): Promise<LedgerBlock[]> {
  const blocks: LedgerBlock[] = [];
  let previousHash = '0'.repeat(64);
  for (let i = 1; i <= 8; i++) {
    const eventData = `Northstar Systems evidence record #${String(i).padStart(3, '0')} · local sample`;
    const timestamp = ago(120 - i * 11);
    const hash = await sha256(`${i}|${timestamp}|${eventData}|${previousHash}`);
    blocks.push({ index: i, timestamp, eventData, previousHash, hash });
    previousHash = hash;
  }
  return blocks;
}
export async function extendLedger(blocks: LedgerBlock[], eventData: string): Promise<LedgerBlock[]> {
  const index = blocks.length ? Math.max(...blocks.map(b => b.index)) + 1 : 1;
  const timestamp = new Date().toISOString();
  const previousHash = blocks.at(-1)?.hash ?? '0'.repeat(64);
  const hash = await sha256(`${index}|${timestamp}|${eventData}|${previousHash}`);
  return [...blocks, { index, timestamp, eventData, previousHash, hash }];
}
const nodeSeeds = [
  ['node-01','HR-WS-014','10.42.1.14','Windows 11','HR workstation',14],
  ['node-02','ENG-MBP-022','10.42.2.22','macOS 14','Engineering laptop',9],
  ['node-03','FIN-WS-008','10.42.3.8','Windows 11','Finance workstation',21],
  ['node-04','NS-CORE-01','10.42.0.10','Ubuntu 22.04','Core services',8],
  ['node-05','NS-IDP-01','10.42.0.11','Red Hat 9','Identity provider',5],
  ['node-06','NS-FILE-02','10.42.0.22','Windows Server 2022','File services',12],
  ['node-07','NS-APP-03','10.42.0.33','Ubuntu 22.04','Customer portal',17],
  ['node-08','NS-DB-01','10.42.0.41','PostgreSQL 15','Customer database',10],
  ['node-09','NS-OPS-01','10.42.0.51','Ubuntu 22.04','Operations console',6],
  ['node-10','NS-BACKUP-01','10.42.0.61','Windows Server 2022','Backup repository',4],
  ['node-11','DECOY-DB-04','10.42.4.40','Ubuntu 20.04','Synthetic database',0],
  ['node-12','DECOY-AD-01','10.42.1.90','Windows Server 2019','Synthetic directory',0],
  ['node-13','DECOY-SHARE-02','10.42.6.52','Windows Server 2019','Synthetic file share',0],
] as const;
export function createInitialState(ledger: LedgerBlock[]): SimState {
  const nodes: NodeItem[] = nodeSeeds.map((n, i) => ({
    id:n[0], name:n[1], kind:i<10?'Real':'Decoy', fictionalIp:n[2], operatingSystem:n[3], role:n[4],
    decoyStatus:i < 10 ? 'Protected' : 'Armed', interactionCount:Number(n[5]), riskLevel:i < 10 ? ([12,18,24,9,7,13,22,16,11,8][i] ?? 0) : 0,
  }));
  const decoys: Decoy[] = decoyNames.map((d,i)=>({
    id:`decoy-${String(i+1).padStart(2,'0')}`, name:d[0], type:d[1], location:d[2], realismScore:d[3],
    status:'Active', triggerCount:[0,1,0,2,0,0,1,0,0,0,0,0][i], lastTriggered:i===1?ago(28):i===3?ago(92):'Never',
  }));
  const severities: Alert['severity'][]=['Low','Medium','High','Low','Medium','High','Low','Medium','High','Critical','Low','Medium','High','Low','Medium','High','Low','Medium','High','Critical'];
  const alerts: Alert[] = Array.from({length:20},(_,i)=>({
    id:`alert-${i+1}`, timestamp:ago((19-i)*7+2), source:['HR-WS-014','ENG-MBP-022','FIN-WS-008','10.42.7.23'][i%4] ?? 'HR-WS-014',
    destination:['DECOY-SHARE-02','NS-FILE-02','DECOY-DB-04','NS-CORE-01'][i%4] ?? 'NS-CORE-01', severity:severities[i] ?? 'Low',
    message:['Unusual directory traversal observed','Synthetic service enumeration','Decoy credential reference detected','Access pattern outside baseline'][i%4],
  }));
  const timeline: TimelineEvent[] = Array.from({length:10},(_,i)=>({
    id:`event-${i+1}`, timestamp:ago((9-i)*13+4), event:['Baseline check completed','Unusual workstation access','Synthetic file opened','Service discovery observed','Decoy credential touched','Connection to replica attempted','Privilege boundary evaluated','Alert correlation completed','Incident route reconstructed','Threat contained'][i] ?? 'Synthetic event',
    source:['NS-CORE-01','HR-WS-014','FIN-WS-008','HR-WS-014','ENG-MBP-022'][i%5] ?? 'NS-CORE-01',
    destination:['NS-IDP-01','DECOY-SHARE-02','NS-FILE-02','DECOY-DB-04','NS-DB-01'][i%5] ?? 'NS-IDP-01',
    technique:['T1078 · Valid Accounts (simulated)','T1083 · File and Directory Discovery (simulated)','T1018 · Remote System Discovery (simulated)','T1555 · Credentials from Password Stores (simulated)','T1021 · Remote Services (simulated)'][i%5] ?? 'T1078 · Valid Accounts (simulated)',
    severity:(['Low','Medium','High','Medium','Critical'][i%5] ?? 'Low') as Alert['severity'],
  }));
  const logs = [
    {id:'log-1',time:new Date().toLocaleTimeString(),message:'Local simulation workspace initialized.',tone:'success'},
    {id:'log-2',time:new Date().toLocaleTimeString(),message:'Northstar Systems fictional topology loaded: 10 protected · 3 decoys.',tone:''},
    {id:'log-3',time:new Date().toLocaleTimeString(),message:'No network connections are made by this application.',tone:'success'},
  ];
  return {decoys,nodes,alerts,timeline,ledger,logs,risk:18,running:false,contained:false,scenario:'phishing',path:[]};
}
