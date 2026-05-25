import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, User, BarChart2, Folder, Kanban, Calendar, 
  Zap, Building2, DollarSign, FileInput, History, Settings,
  LogOut, ChevronRight, Search, Bell, Monitor, Edit2, Play, CheckCircle2, Rocket, ArrowLeft, Loader2, RefreshCw
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import './styles/App.css';

const BASE_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#9333ea', '#6b7280'];

export default function DashboardApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [activeView, setActiveView] = useState('dashboard');
  const [authStep, setAuthStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async (site = "All Sites") => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=getData&site=${encodeURIComponent(site)}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (authStep === 1 && email) {
      setAuthStep(2);
    } else if (authStep === 2 && password) {
      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo"><Zap size={24} fill="white" /></div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue to your account</p>
          <form onSubmit={handleLogin}>
            {authStep === 1 ? (
              <>
                <button type="button" className="auth-input" style={{ background: '#fff', textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <img src="https://www.google.com/favicon.ico" width="16" alt="G" /> Continue with Google
                </button>
                <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button type="submit" className="auth-button">Continue <ChevronRight size={16} /></button>
              </>
            ) : (
              <>
                <div style={{ background: '#f5f5f5', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ fontSize: '14px' }}>{email}</span>
                  <Edit2 size={14} style={{ cursor: 'pointer' }} onClick={() => setAuthStep(1)} />
                </div>
                <input className="auth-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit" className="auth-button">Continue <ChevronRight size={16} /></button>
              </>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ background: '#3b82f6', padding: '6px', borderRadius: '6px' }}><Monitor size={20} color="white" /></div>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>Teloneer AI Review</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#666', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '10px' }}>Overview</div>
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <div style={{ color: '#666', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '10px', marginTop: '16px' }}>Automations</div>
          <NavItem icon={<Zap size={18} />} label="AI Smart QC" active={activeView === 'batch'} onClick={() => setActiveView('batch')} />
          <div style={{ marginTop: 'auto', padding: '10px' }}>
            <div style={{ cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }} onClick={() => { localStorage.removeItem('isLoggedIn'); setIsLoggedIn(false); }}>
              <LogOut size={18} /> <span>Sign Out</span>
            </div>
          </div>
        </nav>
      </aside>
      <main className="main-content">
        {activeView === 'dashboard' ? <DashboardContent data={data} loading={loading} /> : <BatchProcessView setActiveView={setActiveView} />}
      </main>
    </div>
  );
}

function DashboardContent({ data, loading }) {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={48} className="animate-spin" color="#3b82f6" /></div>;
  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>Executive Dashboard</h1>
          <p style={{ color: '#666', margin: 0 }}>Work Order analytics and performance overview</p>
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        <MetricCard title="Total Work Orders" value={data?.metrics?.workOrders || 0} subtitle="All Sites" icon={<LayoutDashboard color="white" size={20} />} theme="blue" />
        <MetricCard title="Completion Rate" value={`${data?.metrics?.rate || 0}%`} subtitle="Completed + On Service" icon={<Calendar color="white" size={20} />} theme="orange" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '24px', marginTop: '24px' }}>
        <div className="chart-container">
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Status Breakdown</h3>
          <div style={{ height: '300px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.statusBreakdown || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {(data?.statusBreakdown || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-container">
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Team Workload</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.teamWorkload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip />
                <Bar dataKey="Completed" stackId="a" fill="#10b981" />
                <Bar dataKey="InProgress" stackId="a" fill="#9333ea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

function BatchProcessView({ setActiveView }) {
  const [step, setStep] = useState(2); // 1: Login, 2: Project, 3: Type, 4: Site, 5: File, 6: Result
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [siteName, setSiteName] = useState("");
  const [siteFolder, setSiteFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const PROJECTS = ["HAE", "TME", "TMT", "HAT", "HTB", "HSN", "TMB", "HNN"];
  const TYPES = ["MBB", "POWER", "SOLACELL", "SMALL DC", "IPRAN"];

  useEffect(() => { if (step === 5) { if (siteFolder) selectFolder(siteFolder); else fetchFolders(); } }, [step, siteFolder]);

  const fetchFolders = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${BASE_URL}?action=listFolders`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const prefix = selectedProject && selectedType ? `${selectedProject}_${selectedType}` : "";
      const raw = Array.isArray(json.folders) ? json.folders : [];
      setFolders(prefix ? raw.filter(f => f.name.toLowerCase().startsWith(prefix.toLowerCase())) : raw);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const selectFolder = async (folder) => {
    setSelectedFolder(folder);
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=listFiles&folderId=${folder.id}`);
      const json = await res.json();
      setFiles(Array.isArray(json) ? json : []);
      setSelectedFiles(Array.isArray(json) ? json.map(f => f.id) : []);
    } catch (e) { setError("Failed to load files."); } finally { setLoading(false); }
  };

  const handleCreateFolder = async () => {
    if (!siteName) return;
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=createSiteFolder&project=${selectedProject}&type=${selectedType}&site=${siteName.toUpperCase()}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSiteFolder(json); setStep(5);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleProcess = async () => {
    if (!selectedFolder) return;
    try {
      setProcessing(true); setStep(6);
      const res = await fetch(`${BASE_URL}?action=processFolder&folderId=${selectedFolder.id}`);
      const json = await res.json();
      setResult(json);
    } catch (e) { setResult({ error: e.toString() }); } finally { setProcessing(false); }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #262626', marginBottom: '32px' }}>
        <div style={{ padding: '12px 24px', color: '#2563eb', borderBottom: '2px solid #2563eb', fontWeight: '600' }}>Process</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
        <StepItem num="1" label="Login" active={step >= 1} done={true} />
        <div className="step-line" style={{ background: step > 2 ? '#10b981' : '#262626' }} />
        <StepItem num="2" label="Project" active={step >= 2} done={step > 2} />
        <div className="step-line" style={{ background: step > 3 ? '#10b981' : '#262626' }} />
        <StepItem num="3" label="Type" active={step >= 3} done={step > 3} />
        <div className="step-line" style={{ background: step > 4 ? '#10b981' : '#262626' }} />
        <StepItem num="4" label="Site" active={step >= 4} done={step > 4} />
        <div className="step-line" style={{ background: step > 5 ? '#10b981' : '#262626' }} />
        <StepItem num="5" label="File" active={step >= 5} done={step > 5} />
        <div className="step-line" style={{ background: step > 6 ? '#10b981' : '#262626' }} />
        <StepItem num="6" label="Result" active={step === 6} done={result !== null} />
      </div>

      {step === 2 && (
        <>
          <h2 style={{ textAlign: 'center', marginBottom: '32px', color: '#fff' }}>Select Project</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
            {PROJECTS.map(p => <SelectionCard key={p} label={p} selected={selectedProject === p} onClick={() => { setSelectedProject(p); setStep(3); }} icon={<Folder size={24} color="#10b981" />} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <button className="auth-button back-btn" onClick={() => setActiveView('dashboard')}><ArrowLeft size={18} /> Cancel</button>
            <button className="auth-button" style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6' }} onClick={() => setStep(5)}><Folder size={18} /> Next: Select Existing Folder</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ textAlign: 'center', marginBottom: '32px', color: '#fff' }}>Select Work Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '40px' }}>
            {TYPES.map(t => <SelectionCard key={t} label={t} selected={selectedType === t} onClick={() => { setSelectedType(t); setStep(4); }} icon={<Zap size={24} color="#9333ea" />} />)}
          </div>
          <button className="auth-button back-btn" onClick={() => setStep(2)}><ArrowLeft size={18} /> Back</button>
        </>
      )}

      {step === 4 && (
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '32px', color: '#fff' }}>Enter Site Name</h2>
          <input className="auth-input" style={{ textAlign: 'center', fontSize: '24px' }} placeholder="SITE ID" value={siteName} onChange={(e) => setSiteName(e.target.value.toUpperCase())} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <button className="auth-button back-btn" onClick={() => setStep(3)}><ArrowLeft size={18} /> Back</button>
            <button className="auth-button process-btn" onClick={handleCreateFolder} disabled={!siteName}><Rocket size={18} /> Create New</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <>
          <h2 style={{ textAlign: 'center', marginBottom: '32px', color: '#fff' }}>{selectedFolder ? "Review Images" : "Select Site Folder"}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: selectedFolder ? '1fr' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '40px' }}>
            {loading ? <div style={{ gridColumn: 'span 2', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" /></div> : 
              !selectedFolder ? (
                folders.map(f => (
                  <div key={f.id} onClick={() => selectFolder(f)} className="folder-selection-card">
                    <div className="folder-icon-box"><Building2 size={20} color="#10b981" /></div>
                    <div><div style={{ color: '#fff' }}>{f.name}</div><div style={{ fontSize: '12px', color: '#666' }}>Pending files...</div></div>
                  </div>
                ))
              ) : (
                files.map(f => (
                  <div key={f.id} className="file-selection-card">
                    <div className="folder-icon-box"><FileInput size={20} color="#3b82f6" /></div>
                    <div><div style={{ color: '#fff' }}>{f.name}</div></div>
                  </div>
                ))
              )
            }
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <button className="auth-button back-btn" onClick={() => selectedFolder ? setSelectedFolder(null) : setStep(4)}><ArrowLeft size={18} /> Back</button>
            <button className="auth-button review-btn" onClick={handleProcess} disabled={!selectedFolder}><Search size={18} /> Review AI</button>
            <button className="auth-button process-btn" onClick={handleProcess} disabled={!selectedFolder}><Rocket size={18} /> Process</button>
          </div>
        </>
      )}

      {step === 6 && (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card-dark)', borderRadius: '24px' }}>
          {processing ? <Loader2 size={48} className="animate-spin" /> : 
            <>
              <h2 style={{ color: '#fff' }}>Analysis Complete!</h2>
              <button className="auth-button" style={{ maxWidth: '240px', margin: '20px auto' }} onClick={() => setStep(2)}>Start New Batch</button>
            </>
          }
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '8px', cursor: 'pointer', background: active ? '#262626' : 'transparent', color: active ? 'white' : '#9ca3af' }}>
      {icon} <span style={{ fontSize: '14px' }}>{label}</span>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, theme }) {
  return (
    <div className={`metric-card metric-${theme}`}>
      <div><div style={{ fontSize: '13px', color: '#9ca3af' }}>{title}</div><div style={{ fontSize: '28px', fontWeight: '700' }}>{value}</div><div style={{ fontSize: '12px', color: '#666' }}>{subtitle}</div></div>
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `var(--${theme}-metric)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    </div>
  );
}

function SelectionCard({ label, onClick, icon, selected }) {
  return (
    <div onClick={onClick} style={{ padding: '24px', background: selected ? '#2563eb' : 'var(--card-dark)', border: '1px solid var(--border-color)', borderRadius: '16px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      {icon} <div style={{ fontWeight: '700', color: '#fff' }}>{label}</div>
    </div>
  );
}

function StepItem({ num, label, active, done }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: done ? '#10b981' : (active ? '#3b82f6' : '#262626'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}>
        {done ? <CheckCircle2 size={16} /> : num}
      </div>
      <div style={{ fontSize: '12px', color: done || active ? '#fff' : '#666' }}>{label}</div>
    </div>
  );
}

function FilterSelect({ label }) {
  return (
    <div style={{ background: '#121212', border: '1px solid #262626', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {label} <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
    </div>
  );
}
