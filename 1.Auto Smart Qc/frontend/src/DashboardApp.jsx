import React, { useState, useEffect, Component } from 'react';
import { 
  LayoutDashboard, User, BarChart2, Folder, Kanban, Calendar, 
  Zap, Building2, DollarSign, FileInput, History, Settings,
  LogOut, ChevronRight, Search, Bell, Monitor, Edit2, Play, CheckCircle2, Rocket, ArrowLeft, Loader2, RefreshCw, Home, Eye, EyeOff, FileText
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import './styles/App.css';

// *** กรุณาเปลี่ยน URL นี้ให้เป็น URL ที่ได้จากการ Deploy ของคุณ ***
const BASE_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#9333ea', '#6b7280'];

// Simple Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{color:'white', padding: 40, textAlign: 'center'}}>
          <h2 style={{color: '#ef4444'}}>Something went wrong</h2>
          <pre style={{background: '#121212', padding: 20, borderRadius: 8}}>{this.state.error?.toString()}</pre>
          <button className="auth-button" style={{maxWidth: 200, margin: '20px auto'}} onClick={() => window.location.reload()}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <DashboardApp />
    </ErrorBoundary>
  );
}

function DashboardApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [authStep, setAuthStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const logged = localStorage.getItem('isLoggedIn') === 'true';
    const loginTime = localStorage.getItem('loginTimestamp');
    if (logged && loginTime && Date.now() - parseInt(loginTime) < 10 * 60 * 1000) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('loginTimestamp');
    setIsLoggedIn(false); setAuthStep(1); setPassword(""); setOtp("");
  };

  const fetchData = async (site = "All Sites") => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${BASE_URL}?action=getData&site=${encodeURIComponent(site)}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) { setError("Connect Error: " + e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const timer = setInterval(() => {
        if (Date.now() - parseInt(localStorage.getItem('loginTimestamp')) > 10 * 60 * 1000) handleLogout();
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault(); setError(null);
    try {
      if (authStep === 1) setAuthStep(2);
      else if (authStep === 2) {
        setLoading(true);
        const res = await fetch(`${BASE_URL}?action=checkPassword&email=${email.trim()}&password=${encodeURIComponent(password)}`);
        const json = await res.json();
        if (json.success) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('loginTimestamp', Date.now().toString());
          setIsLoggedIn(true);
        } else throw new Error(json.error);
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo"><Zap size={24} fill="white" /></div>
          <h1 className="auth-title">Welcome back</h1>
          {error && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '16px', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>{error}</div>}
          <form onSubmit={handleLogin}>
            {authStep === 1 ? (
              <><input className="auth-input" type="text" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required /><button type="submit" className="auth-button">Continue <ChevronRight size={16} /></button></>
            ) : (
              <><input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus /><button type="submit" className="auth-button" disabled={loading}>{loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}</button></>
            )}
          </form>
          <div className="auth-footer">Powered by <b>TLN AI Automation</b></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}><Monitor size={20} color="#3b82f6" /><span style={{ fontSize: '18px', fontWeight: '700' }}>Teloneer AI</span></div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <NavItem icon={<Zap size={18} />} label="AI Smart QC" active={activeView === 'batch'} onClick={() => setActiveView('batch')} />
          <NavItem icon={<FileText size={18} />} label="PAT Generate" active={activeView === 'pat'} onClick={() => setActiveView('pat')} />
          <div style={{ marginTop: 'auto', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }} onClick={handleLogout}><LogOut size={18} /> <span>Sign Out</span></div>
        </nav>
      </aside>
      <main className="main-content">
        {activeView === 'dashboard' ? <DashboardContent data={data} loading={loading} /> : 
         activeView === 'batch' ? <BatchProcessView setActiveView={setActiveView} /> :
         <PATGenerateView />}
      </main>
    </div>
  );
}

function PATGenerateView() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { fetchFolders(); }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=listFolders&root=1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7`);
      const json = await res.json();
      setFolders(Array.isArray(json.folders) ? json.folders : []);
    } catch (e) { setError("Connect Error: " + e.message); } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!selectedFolder) return;
    try {
      setGenerating(true); setError(null);
      // เพิ่มความอดทนในการรอ (Timeout) ด้วยการเช็คสถานะจาก JSON โดยตรง
      const res = await fetch(`${BASE_URL}?action=generatePAT&folderId=${selectedFolder.id}&siteName=${encodeURIComponent(selectedFolder.name)}`);
      
      if (!res.ok) throw new Error("Server disconnected. Try fewer images or check Drive space.");
      
      const json = await res.json();
      if (json.success) setResult(json);
      else throw new Error(json.error || "Generation failed");
    } catch (e) { 
      console.error("PAT Error:", e);
      setError(e.message === "Failed to fetch" ? "Request Timeout: ระบบใช้เวลาสร้างไฟล์นานเกินไป โปรดลองใหม่อีกครั้ง" : e.message); 
    } finally { setGenerating(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="process-card" style={{background: 'var(--card-dark)', textAlign: 'center'}}>
        <h2 style={{ color: '#fff', marginBottom: 24 }}>PAT Report Generator</h2>
        {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}
        {!selectedFolder ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {folders.map(f => <div key={f.id} onClick={() => setSelectedFolder(f)} className="folder-selection-card" style={{padding: 16}}><Building2 size={20} color="#10b981" /> <div style={{fontSize: 14, marginTop: 8}}>{f.name}</div></div>)}
          </div>
        ) : (
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 32, borderRadius: 16, border: '1px dashed #3b82f6' }}>
            <Building2 size={48} color="#3b82f6" style={{margin: '0 auto 16px'}} />
            <h3 style={{fontSize: 20, marginBottom: 8}}>{selectedFolder.name}</h3>
            {result ? (
              <div style={{background: '#10b981', padding: '16px', borderRadius: '12px', color: 'white', cursor: 'pointer'}} onClick={() => window.open(result.url, '_blank')}><b>Download PAT Report</b></div>
            ) : (
              <button className="auth-button" onClick={handleGenerate} disabled={generating}>{generating ? <Loader2 size={20} className="animate-spin" /> : "Generate Excel"}</button>
            )}
            <button className="auth-button" style={{marginTop: 12, background: 'transparent', border: 'none', color: '#666'}} onClick={() => {setSelectedFolder(null); setResult(null);}}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardContent({ data, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 size={48} className="animate-spin" color="#3b82f6" /></div>;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: 24 }}>
        <MetricCard title="Work Orders" value={data?.metrics?.workOrders || 0} theme="blue" icon={<LayoutDashboard color="white" size={20}/>} />
        <MetricCard title="Completion" value={`${data?.metrics?.rate || 0}%`} theme="orange" icon={<Calendar color="white" size={20}/>} />
      </div>
      <div className="chart-container" style={{height: 400}}>
        <h3 style={{marginBottom: 20}}>Status Overview</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data?.statusBreakdown || []} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
              {data?.statusBreakdown?.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function BatchProcessView({ setActiveView }) {
  const [step, setStep] = useState(2); 
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const PROJECTS = ["HAE", "TME", "TMT", "HAT", "HTB", "HSN", "TMB", "HNN"];
  const TYPES = ["MBB", "POWER", "SOLACELL", "SMALL DC", "IPRAN", "SSR"];

  const fetchTemplates = async (type, project = selectedProject) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=listTemplates&type=${encodeURIComponent(type)}&project=${encodeURIComponent(project)}`);
      const json = await res.json();
      setTemplates(Array.isArray(json) ? json : []);
      setStep(4.5);
    } catch (e) { setError("Connect Error"); } finally { setLoading(false); }
  };

  const selectFolder = async (folder) => {
    setSelectedFolder(folder);
    try {
      setLoading(true);
      const parts = folder.name.split('_');
      const detProj = PROJECTS.find(p => parts.includes(p)) || parts[0];
      const detType = TYPES.find(t => parts.includes(t)) || parts[1];
      setSelectedProject(detProj); setSelectedType(detType);
      const res = await fetch(`${BASE_URL}?action=listFiles&folderId=${folder.id}`);
      const json = await res.json();
      setFiles(json);
      if (!selectedTemplate) await fetchTemplates(detType, detProj);
    } catch (e) { setError("Connect Error"); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=createSiteFolder&project=${selectedProject}&type=${selectedType}&site=${siteName}`);
      const json = await res.json();
      if (json.id) { setSelectedFolder(json); await fetchTemplates(selectedType); }
    } catch (e) { setError("Connect Error"); } finally { setLoading(false); }
  };

  const handleProcess = async () => {
    try {
      setProcessing(true); setStep(6); setProgress(10);
      const res = await fetch(`${BASE_URL}?action=processFolder&folderId=${selectedFolder.id}&templateId=${selectedTemplate?.id || ""}`);
      const json = await res.json();
      setProgress(100); setResult(json);
    } catch (e) { setError("AI Error"); } finally { setProcessing(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="step-indicator" style={{display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 30}}>
        {[1,2,3,4,5].map(i => <div key={i} style={{width: 30, height: 30, borderRadius: '50%', background: step >= i+1 ? '#3b82f6' : '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i}</div>)}
      </div>

      {step === 2 && (
        <div className="process-card">
          <h2 style={{textAlign: 'center', marginBottom: 20}}>1. Select Project</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {PROJECTS.map(p => <div key={p} className="folder-selection-card" style={{padding: 15, textAlign: 'center'}} onClick={() => {setSelectedProject(p); setStep(3);}}>{p}</div>)}
          </div>
          <button className="auth-button" style={{marginTop: 20, background: 'transparent', border: '1px solid #3b82f6'}} onClick={async () => {setStep(5); setLoading(true); const res = await fetch(`${BASE_URL}?action=listFolders`); const json = await res.json(); setFolders(json.folders); setLoading(false);}}>Use Existing Folder</button>
        </div>
      )}

      {step === 3 && (
        <div className="process-card">
          <h2 style={{textAlign: 'center', marginBottom: 20}}>2. Select Work Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {TYPES.map(t => <div key={t} className="folder-selection-card" style={{padding: 15, textAlign: 'center'}} onClick={() => {setSelectedType(t); setStep(4);}}>{t}</div>)}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="process-card">
          <h2 style={{textAlign: 'center', marginBottom: 20}}>3. Enter Site Name</h2>
          <input className="auth-input" value={siteName} onChange={(e) => setSiteName(e.target.value.toUpperCase())} placeholder="e.g. BKK0001" style={{textAlign: 'center', fontSize: 20}} />
          <button className="auth-button" style={{marginTop: 15}} onClick={handleCreate} disabled={!siteName || loading}>Continue</button>
        </div>
      )}

      {step === 4.5 && (
        <div className="process-card">
          <h2 style={{textAlign: 'center', marginBottom: 20}}>4. Select Template</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {templates.map(t => <div key={t.id} className="folder-selection-card" style={{padding: 15, display: 'flex', alignItems: 'center', gap: 10}} onClick={() => {setSelectedTemplate(t); setStep(5);}}><FileText size={18} /> {t.name}</div>)}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="process-card">
          <h2 style={{textAlign: 'center', marginBottom: 20}}>5. Ready to Process</h2>
          {selectedFolder ? (
            <div style={{padding: 20, border: '1px dashed #3b82f6', borderRadius: 12}}>
              <div style={{fontSize: 20, fontWeight: 'bold', marginBottom: 10}}>{selectedFolder.name}</div>
              <div style={{color: '#3b82f6', marginBottom: 15}}>Using Template: {selectedTemplate?.name}</div>
              <button className="auth-button" style={{background: '#10b981'}} onClick={() => window.open(selectedFolder.url, '_blank')}>Upload Images</button>
              <button className="auth-button" style={{marginTop: 10}} onClick={handleProcess}>Process Now</button>
            </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>{folders.map(f => <div key={f.id} className="folder-selection-card" style={{padding: 15}} onClick={() => selectFolder(f)}>{f.name}</div>)}</div>
          )}
        </div>
      )}

      {step === 6 && (
        <div className="process-card" style={{textAlign: 'center'}}>
          {processing ? <div className="progress-bar-container"><div className="progress-bar-fill" style={{width: `${progress}%`}} /></div> : <h2>Completed! Success: {result?.pass}</h2>}
          <button className="auth-button" style={{marginTop: 20}} onClick={() => window.location.reload()}>Home</button>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', cursor: 'pointer', background: active ? '#262626' : 'transparent', color: active ? 'white' : '#9ca3af' }}>{icon} <span>{label}</span></div>;
}

function MetricCard({ title, value, icon, theme }) {
  return <div className={`metric-card metric-${theme}`}><div><div style={{fontSize: 13}}>{title}</div><div style={{fontSize: 28, fontWeight: 'bold'}}>{value}</div></div>{icon}</div>;
}
