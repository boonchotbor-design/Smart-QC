import React, { useState, useEffect, Component } from 'react';
import { 
  LayoutDashboard, User, BarChart2, Folder, Kanban, Calendar, 
  Zap, Building2, DollarSign, FileInput, History, Settings,
  LogOut, ChevronRight, Search, Bell, Monitor, Edit2, Play, CheckCircle2, Rocket, ArrowLeft, Loader2, RefreshCw, Home, Eye, EyeOff, FileText, Globe, Sun, Moon
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import './styles/App.css';
import logoTln from './logo-tln.jpg';

const VERSION = "V.138 (STABLE)"; 
const BASE_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#9333ea', '#6b7280'];

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div style={{padding: 40, textAlign: 'center', color: 'white'}}><h2>Something went wrong</h2><button onClick={() => window.location.reload()}>Reload App</button></div>;
    return this.props.children;
  }
}

export default function App() { return <ErrorBoundary><DashboardApp /></ErrorBoundary>; }

function DashboardApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [authStep, setAuthStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('EN');

  useEffect(() => {
    const savedLogin = localStorage.getItem('isLoggedIn');
    const savedEmail = localStorage.getItem('userEmail');
    if (savedLogin === 'true') setIsLoggedIn(true);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    // Note: We keep userEmail in localStorage for auto-fill convenience
    setIsLoggedIn(false); setAuthStep(1); setPassword(""); setShowPassword(false);
  };

  const fetchData = async (site = "All Sites") => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${BASE_URL}?action=getData&site=${encodeURIComponent(site)}`);
      const json = await res.json();
      setData(json);
    } catch (e) { setError("Connect Error"); } finally { setLoading(false); }
  };

  useEffect(() => { if (isLoggedIn) fetchData(); }, [isLoggedIn]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (authStep === 1) {
      setAuthStep(2);
    }
    else {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        const json = await res.json();
        
        if (json.success) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userEmail', email);
          setIsLoggedIn(true);
        } else {
          setError(json.error || "Login Failed: Incorrect email or password");
        }
      } catch (err) {
        setError("Network Error: Could not connect to authentication server");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-wrapper">
        <header className="auth-header">
          <h1>AI Automation Portal</h1>
          <p>Teloneer Co., Ltd. - Intelligent Solutions</p>
        </header>

        <div className="auth-card">
          <div className="auth-logo-container">
            <img src={logoTln} height="55" alt="Teloneer" style={{ borderRadius: '8px' }} />
          </div>
          
          {error && <div style={{color: '#f87171', marginBottom: 20, textAlign: 'center', fontSize: 14, padding: '10px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '8px'}}>{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="auth-input-group">
              <label className="auth-label">Email Address</label>
              <input 
                className="auth-input" 
                type="text" 
                placeholder="name@company.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            {authStep === 2 && (
              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="auth-input" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    autoFocus 
                  />
                  <div 
                    onClick={() => setShowPassword(!showPassword)} 
                    style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3af', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </div>
                </div>
              </div>
            )}
            
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : (authStep === 1 ? "Continue" : "Sign In")}
            </button>
          </form>
          
          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
            {VERSION} • Protected by Enterprise Security
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: theme === 'dark' ? '#0f172a' : '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: theme === 'dark' ? 'white' : '#1e293b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* Top Header Bar */}
      <header style={{ background: '#3b82f6', padding: '12px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <Zap size={24} fill="white" />
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: 15 }}>
            <div style={{ fontWeight: '800', fontSize: '20px' }}>AI Automation Portal</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>Teloneer Co., Ltd. - Intelligent Solutions</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: 20, gap: 5, cursor: 'pointer' }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <div style={{ padding: '4px 10px', borderRadius: 15, background: theme === 'light' ? 'white' : 'transparent' }}><Sun size={14} color={theme === 'light' ? '#3b82f6' : '#fff'} /></div>
            <div style={{ padding: '4px 10px', borderRadius: 15, background: theme === 'dark' ? 'white' : 'transparent' }}><Moon size={14} color={theme === 'dark' ? '#3b82f6' : '#fff'} /></div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => setLang('TH')} style={{ background: lang === 'TH' ? 'white' : 'rgba(255,255,255,0.1)', color: lang === 'TH' ? '#3b82f6' : 'white', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>TH</button>
            <button onClick={() => setLang('EN')} style={{ background: lang === 'EN' ? 'white' : 'rgba(255,255,255,0.1)', color: lang === 'EN' ? '#3b82f6' : 'white', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>EN</button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar Navigation */}
        <aside className="sidebar" style={{ background: theme === 'dark' ? '#1e293b' : 'white', borderRight: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, width: 260, padding: '30px 15px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div style={{ color: '#94a3af', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', padding: '10px 15px', letterSpacing: '2px', opacity: 0.9 }}>Overview</div>
            <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} theme={theme} />
            
            <div style={{ color: '#94a3af', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', padding: '30px 15px 10px 15px', letterSpacing: '2px', opacity: 0.9 }}>Automations</div>
            <NavItem icon={<Zap size={20} />} label="AI Smart QC" active={activeView === 'batch'} onClick={() => setActiveView('batch')} theme={theme} />
            <NavItem icon={<FileText size={20} />} label="PAT Generate" active={activeView === 'pat'} onClick={() => setActiveView('pat')} theme={theme} />
          </div>
          
          <div style={{ marginTop: 'auto', padding: '10px' }}>
            <button 
              style={{ width: '100%', cursor: 'pointer', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#f87171', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', transition: 'all 0.2s' }} 
              onClick={handleLogout}
              className="logout-button"
            >
              <LogOut size={20} /> <span style={{fontSize: '16px', fontWeight: 'bold'}}>Log Out</span>
            </button>
            <div style={{ textAlign: 'center', marginTop: 15, fontSize: 10, color: '#94a3af', opacity: 0.6 }}>{VERSION} - Automation Pro</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content" style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
          {activeView === 'dashboard' ? <DashboardContent data={data} loading={loading} theme={theme} /> : 
           activeView === 'batch' ? <BatchProcessView theme={theme} /> :
           <PATGenerateView theme={theme} />}
        </main>
      </div>
    </div>
  );
}

function DashboardContent({ data, loading, theme }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 size={48} className="animate-spin" color="#3b82f6" /></div>;
  return (
    <div style={{maxWidth: 1000, margin: '0 auto'}}>
      <header style={{ marginBottom: '40px' }}><h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Executive Dashboard</h1></header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '25px', marginBottom: 30 }}>
        <MetricCard title="Total Work Orders" value={data?.metrics?.workOrders || 0} theme="blue" icon={<LayoutDashboard color="white" size={20}/>} subtitle="All Sites" currentTheme={theme} />
        <MetricCard title="Completion Rate" value={`${data?.metrics?.rate || 0}%`} theme="orange" icon={<Calendar color="white" size={20}/>} subtitle="Completed + On Service" currentTheme={theme} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '25px' }}>
        <div className="chart-container" style={{background: theme === 'dark' ? '#1e293b' : 'white', padding: 25, borderRadius: 20, border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`}}>
          <h3 style={{fontSize: 16, marginBottom: 20}}>Status Breakdown</h3>
          <div style={{height: 300}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.statusBreakdown || []} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{(data?.statusBreakdown || []).map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </div>
        <div className="chart-container" style={{background: theme === 'dark' ? '#1e293b' : 'white', padding: 25, borderRadius: 20, border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`}}>
          <h3 style={{fontSize: 16, marginBottom: 20}}>Team Workload</h3>
          <div style={{height: 300}}><ResponsiveContainer width="100%" height="100%"><BarChart data={[]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e5e7eb'} /><XAxis dataKey="name" stroke="#94a3af" /><YAxis stroke="#94a3af" /><Tooltip /><Bar dataKey="val" fill="#3b82f6" /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}

function BatchProcessView({ theme }) {
  const [step, setStep] = useState(1); 
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const PROJECTS = ["HAE", "TME", "TMT", "HAT", "HTB", "HSN", "TMB", "HNN"];
  const TYPES = ["MBB", "POWER", "SOLACELL", "SMALL DC", "IPRAN", "SSR"];

  const handleUpload = async (e) => {
    const filesToUpload = e.target.files || e.dataTransfer.files;
    if (!filesToUpload || filesToUpload.length === 0) return;
    
    setUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const reader = new FileReader();
      
      const uploadPromise = new Promise((resolve, reject) => {
        reader.onload = async (event) => {
          try {
            const base64Data = event.target.result.split(',')[1];
            const mimeType = file.type;
            
            const res = await fetch(BASE_URL, {
              method: 'POST',
              body: JSON.stringify({
                action: "uploadfile",
                folderId: selectedFolder.id,
                fileName: file.name,
                mimeType: mimeType,
                base64Data: base64Data
              })
            });
            const json = await res.json();
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      try {
        await uploadPromise;
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));
      } catch (err) {
        console.error("Upload failed for " + file.name, err);
      }
    }
    
    setUploading(false);
    fetchFiles(selectedFolder.id); // Refresh file list
  };

  // AUTO-SELECT TEMPLATE AND SKIP STEP 4
  const fetchTemplates = async (type, project = selectedProject, folder = selectedFolder) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}?action=listTemplates&type=${encodeURIComponent(type)}&project=${encodeURIComponent(project)}`);
      const json = await res.json();
      setTemplates(json);
      if (json && json.length > 0) {
        setSelectedTemplate(json[0]); // Auto-pick first template
        setStep(5); // Skip directly to Ready to Process
        if (folder) fetchFiles(folder.id);
      } else {
        setStep(5); // Skip even if no template found
      }
    } catch (e) { setStep(5); } finally { setLoading(false); }
  };

  const fetchFiles = async (folderId) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}?action=listFiles&folderId=${folderId}`);
      const json = await res.json();
      if (json.files) {
        setFiles(json.files);
        if (json.totalInFolder === "Empty") {
           // Maybe show alert?
        }
      } else if (Array.isArray(json)) {
        setFiles(json);
      } else {
        setFiles([]);
      }
    } catch (e) {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}?action=createSiteFolder&project=${selectedProject}&type=${selectedType}&site=${siteName}`);
      const json = await res.json();
      setSelectedFolder(json);
      await fetchTemplates(selectedType, selectedProject, json);
    } catch (e) {
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  // AUTO-REFRESH FILE COUNT IN STEP 5
  useEffect(() => {
    let interval;
    if (step === 5 && selectedFolder) {
      interval = setInterval(() => {
        if (!loading && !processing) fetchFiles(selectedFolder.id);
      }, 5000); // Check every 5 seconds
    }
    return () => clearInterval(interval);
  }, [step, selectedFolder, loading, processing]);

  const handleProcess = async () => {
    setProcessing(true); setStep(6); setProgress(0);
    let cumulativeResult = { total: 0, pass: 0, fail: 0, details: [] };
    let hasMore = true;
    let totalFilesToProcess = files.length; // Initial estimate
    let processedSoFar = 0;
    
    while (hasMore) {
      try {
        const res = await fetch(`${BASE_URL}?action=processFolder&folderId=${selectedFolder.id}&templateId=${selectedTemplate?.id || ""}`);
        const json = await res.json();
        
        if (json.error) {
          setResult({ ...cumulativeResult, error: json.error });
          hasMore = false;
        } else {
          // Sync total from server if it's different
          if (json.totalUnprocessed !== undefined) {
            totalFilesToProcess = processedSoFar + json.totalUnprocessed;
          }

          cumulativeResult.total += (json.processedInBatch || json.total || 0);
          cumulativeResult.pass += (json.pass || 0);
          cumulativeResult.fail += (json.fail || 0);
          cumulativeResult.details = [...(json.details || []), ...cumulativeResult.details];
          cumulativeResult.message = json.message;
          
          processedSoFar = cumulativeResult.total;
          const currentProgress = totalFilesToProcess > 0 
            ? Math.round((processedSoFar / totalFilesToProcess) * 100) 
            : 100;
            
          setProgress(Math.min(currentProgress, 99)); // Keep at 99 until truly done
          setResult({ ...cumulativeResult });
          
          hasMore = json.hasMore;
          if (hasMore) {
            await new Promise(r => setTimeout(r, 500)); // Short pause for UI
          } else {
            setProgress(100);
          }
        }
      } catch (e) {
        setResult({ ...cumulativeResult, error: "Connection Error: " + e.toString() });
        hasMore = false;
      }
    }
    setProcessing(false);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 50 }}>
        {[1, 2, 3].map(i => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: (i===1 && step>=1) || (i===2 && step>=5) || (i===3 && step===6) ? '#10b981' : ( (i===1 && step<1) || (i===2 && step<5) || (i===3 && step===6) ? '#3b82f6' : theme === 'dark' ? '#334155' : '#e2e8f0' ), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {(i === 1 && step >= 5) || (i === 2 && step >= 6) || (i === 3 && step === 6 && !processing) ? <CheckCircle2 size={20} /> : i}
              </div>
              <span style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3af' }}>{i === 1 ? "Login" : i === 2 ? "File" : "Result"}</span>
            </div>
            {i < 3 && <div style={{ width: 60, height: 2, background: (i === 1 && step >= 5) || (i === 2 && step >= 6) ? '#10b981' : theme === 'dark' ? '#334155' : '#e2e8f0', marginTop: -20 }} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ minHeight: 400 }}>
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 40, fontWeight: 'bold' }}>1. Select Project</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {PROJECTS.map(p => <div key={p} className="folder-selection-card" style={{ background: theme === 'dark' ? '#1e293b' : 'white', border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, padding: 30, borderRadius: 15, color: theme === 'dark' ? 'white' : '#1e293b', fontWeight: 'bold' }} onClick={() => { setSelectedProject(p); setStep(2); }}>{p}</div>)}
            </div>
            <button className="auth-button" style={{ marginTop: 40, background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', width: 250 }} onClick={async () => { setLoading(true); const r = await fetch(`${BASE_URL}?action=listFolders`); const j = await r.json(); setFolders(j.folders); setStep(5); setLoading(false); }}>Use Existing Folder</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 40, fontWeight: 'bold' }}>2. Select Work Type</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {TYPES.map(t => <div key={t} className="folder-selection-card" style={{ background: theme === 'dark' ? '#1e293b' : 'white', border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, padding: 30, borderRadius: 15, color: theme === 'dark' ? 'white' : '#1e293b', fontWeight: 'bold' }} onClick={() => { setSelectedType(t); setStep(3); }}>{t}</div>)}
            </div>
            <button className="auth-button" style={{ marginTop: 40, background: 'none', border: 'none', color: '#94a3af' }} onClick={() => setStep(1)}>← Back</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 40, fontWeight: 'bold' }}>3. Enter Site Name</h2>
            <input className="auth-input" style={{ background: theme === 'dark' ? '#1e293b' : 'white', border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, color: theme === 'dark' ? 'white' : '#1e293b', textAlign: 'center', fontSize: 32, padding: 25, width: '100%', maxWidth: 500, fontWeight: 'bold' }} value={siteName} onChange={(e) => setSiteName(e.target.value.toUpperCase())} placeholder="e.g. BKK0001" />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 40 }}>
              <button className="auth-button" style={{ background: 'none', border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, color: '#94a3af', width: 200 }} onClick={() => setStep(2)}>Back</button>
              <button className="auth-button" style={{ background: '#3b82f6', width: 200, fontWeight: 'bold' }} onClick={handleCreate} disabled={!siteName || loading}>Continue</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <h2 style={{ fontSize: 28, marginBottom: 10, fontWeight: 'bold' }}>Ready to Process</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
              <span style={{ background: '#10b98133', color: '#10b981', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 'bold' }}>{selectedProject || "Admin"}</span>
              <span style={{ background: '#3b82f633', color: '#3b82f6', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 'bold' }}>{selectedFolder?.name || "No Folder"}/</span>
              <span style={{ color: '#94a3af', fontSize: 13, padding: '4px 0' }}>{files.length} files detected {selectedFolder?.totalInFolder && `(Folder Status: ${selectedFolder.totalInFolder})`}</span>
            </div>
            
            {selectedFolder ? (
              <div 
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  handleUpload(e);
                }}
                style={{ padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: 25, border: '2px dashed #334155', maxWidth: 700, margin: '0 auto 40px', transition: 'all 0.3s' }}
              >
                {uploading ? (
                  <div style={{ padding: '20px 0' }}>
                    <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 20px', color: '#3b82f6' }} />
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6', marginBottom: 10 }}>Uploading Images...</div>
                    <div style={{ fontSize: 16, color: '#94a3af' }}>Processing {uploadProgress.current} of {uploadProgress.total} files</div>
                    <div style={{ width: '100%', maxWidth: 300, height: 6, background: '#334155', borderRadius: 10, margin: '20px auto 0', overflow: 'hidden' }}>
                      <div style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>{selectedFolder.name}</div>
                    <div style={{ color: '#3b82f6', fontSize: 14, marginBottom: 30 }}>Auto-selected Template: <b>{selectedTemplate?.key || "Default"}</b> ({selectedTemplate?.name || "Default Template"})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 15, marginBottom: 20 }}>
                      <input type="file" id="fileInput" multiple accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                      <button className="auth-button" style={{ background: '#3b82f6', width: 220, fontSize: 16 }} onClick={() => document.getElementById('fileInput').click()}><FileInput size={18} /> Select Local Files</button>
                      <button className="auth-button" style={{ background: '#10b981', width: 220, fontSize: 16 }} onClick={() => selectedFolder?.url ? window.open(selectedFolder.url, '_blank') : alert("ไม่พบ URL ของโฟลเดอร์ กรุณาลองใหม่อีกครั้ง")}><Folder size={18} /> Open Drive Folder</button>
                      <button onClick={() => fetchFiles(selectedFolder.id)} style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '10px 25px', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Check Files
                      </button>
                    </div>
                    <div style={{ fontSize: 13, color: '#94a3af', marginTop: 10 }}>💡 Tip: You can drag and drop multiple images here to upload</div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15, maxHeight: 400, overflowY: 'auto' }}>
                {folders.map(f => <div key={f.id} className="folder-selection-card" style={{ background: theme === 'dark' ? '#1e293b' : 'white', border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, color: theme === 'dark' ? 'white' : '#1e293b' }} onClick={() => {setSelectedFolder(f); fetchFiles(f.id);}}>{f.name}</div>)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
              <button className="auth-button" style={{ background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', width: 200 }} onClick={() => { setSelectedFolder(null); setStep(1); }}>← Back</button>
              <button className="auth-button" style={{ background: '#3b82f6', width: 200, fontWeight: 'bold' }} onClick={handleProcess} disabled={!selectedFolder || files.length === 0}>🚀 Process Now</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div style={{ textAlign: 'center' }}>
            {processing ? (
              <div>
                <h2 style={{ marginBottom: 30, color: '#3b82f6', fontSize: 32, fontWeight: 'bold' }}>Validating...</h2>
                <div style={{ width: '100%', maxWidth: 700, height: 12, background: theme === 'dark' ? '#334155' : '#e2e8f0', borderRadius: 10, margin: '0 auto 20px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{progress}%</div>
                <div style={{ marginTop: 60, fontSize: 12, color: '#94a3af' }}>Powered by TLN AI Automation V.137</div>
              </div>
            ) : (
              <div className="process-card" style={{background: 'white', color: '#1e293b', padding: 40, borderRadius: 25, textAlign: 'center', maxWidth: 850, margin: '0 auto', boxShadow: '0 20px 25px rgba(0,0,0,0.1)'}}>
                <div style={{background: result?.error ? '#ef4444' : '#10b981', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>{result?.error ? <div style={{color:'white', fontSize: 30, fontWeight:'bold'}}>!</div> : <CheckCircle2 size={35} color="white" />}</div>
                <h2 style={{color: result?.error ? '#ef4444' : '#10b981', fontSize: 28, fontWeight: 'bold'}}>{result?.error ? "Process Error" : "Process Completed!"}</h2>
                <div style={{color: '#64748b', marginBottom: 10}}>{selectedFolder?.name}</div>
                {result?.message && <div style={{color: '#3b82f6', marginBottom: 20, fontWeight: 'bold'}}>{result.message}</div>}
                {result?.error && <div style={{color: '#ef4444', marginBottom: 20, background: '#fee2e2', padding: 10, borderRadius: 10}}>{result.error}</div>}
                
                <div style={{display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 35}}>
                  <div style={{flex: 1, background: '#f8fafc', padding: 20, borderRadius: 15, border: '1px solid #e2e8f0'}}>
                    <div style={{fontSize: 24, fontWeight: 'bold', color: '#3b82f6'}}>{result?.total}</div><div style={{fontSize: 12, color: '#64748b'}}>Total</div>
                  </div>
                  <div style={{flex: 1, background: '#f8fafc', padding: 20, borderRadius: 15, border: '1px solid #e2e8f0'}}>
                    <div style={{fontSize: 24, fontWeight: 'bold', color: '#10b981'}}>{result?.pass}</div><div style={{fontSize: 12, color: '#64748b'}}>Success</div>
                  </div>
                  <div style={{flex: 1, background: '#f8fafc', padding: 20, borderRadius: 15, border: '1px solid #e2e8f0'}}>
                    <div style={{fontSize: 24, fontWeight: 'bold', color: '#ef4444'}}>{result?.fail}</div><div style={{fontSize: 12, color: '#64748b'}}>Fail</div>
                  </div>
                </div>
                <div style={{textAlign: 'left', background: 'white', border: '1px solid #e2e8f0', borderRadius: 15, padding: 20, marginBottom: 30, maxHeight: 350, overflowY: 'auto'}}>
                  <h4 style={{marginBottom: 15, color: '#1e293b', fontWeight: 'bold'}}>Detailed Logs</h4>
                  {result?.details?.map((log, i) => (
                    <div key={i} style={{fontSize: 13, marginBottom: 12, display: 'flex', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f8fafc'}}>
                      {log.status === 'PASS' ? <CheckCircle2 size={16} color="#10b981" /> : <div style={{width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10}}>!</div>} 
                      <div>
                        <b>{log.name}</b><br/>
                        <span style={{color: log.status === 'PASS' ? '#10b981' : '#ef4444'}}>{log.status === 'PASS' ? '✅ อนุมัติ: ' : '❌ พบข้อผิดพลาด: '} {log.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="auth-button" style={{background: '#3b82f6', height: 60, width: '100%', fontSize: 18, fontWeight: 'bold', borderRadius: 15}} onClick={() => window.location.reload()}><Home size={20} /> Back to Home</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PATGenerateView({ theme }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}?action=listFolders&root=1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7`)
      .then(r => r.json()).then(json => { setFolders(json.folders || []); setLoading(false); });
  }, []);

  const handleGenerate = async () => {
    if (!selectedFolder) return;
    setLoading(true); setProgress(10);
    const timer = setInterval(() => setProgress(p => p < 95 ? p + 2 : p), 1000);
    try {
      const res = await fetch(`${BASE_URL}?action=generatePAT&folderId=${selectedFolder.id}&siteName=${encodeURIComponent(selectedFolder.name)}`);
      const json = await res.json();
      clearInterval(timer); setProgress(100);
      setResult(json);
    } catch (e) { clearInterval(timer); setProgress(0); } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: theme === 'dark' ? '#1e293b' : 'white', padding: 40, borderRadius: 20, textAlign: 'center', border: `1px solid ${theme === 'dark' ? '#334155' : '#e5e7eb'}`, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: 30 }}>PAT Report Generator</h2>
      {!selectedFolder ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
          {folders.map(f => <div key={f.id} className="folder-selection-card" style={{ background: theme === 'dark' ? '#0f172a' : '#f8fafc', border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`, color: theme === 'dark' ? 'white' : '#1e293b', fontWeight: 'bold' }} onClick={() => setSelectedFolder(f)}>{f.name}</div>)}
        </div>
      ) : (
        <div>
          <h3 style={{color: '#3b82f6'}}>{selectedFolder.name}</h3>
          
          {loading ? (
            <div style={{marginTop: 30}}>
              <div style={{width: '100%', height: 12, background: theme === 'dark' ? '#334155' : '#e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 10}}>
                <div style={{width: `${progress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s'}}></div>
              </div>
              <div style={{fontWeight: 'bold', color: '#3b82f6', fontSize: 20}}>{progress}% Generating...</div>
            </div>
          ) : result ? (
            <div style={{marginTop: 30}}>
              {result.url && <button className="auth-button" style={{ background: '#10b981', width: '100%', height: 55, fontWeight: 'bold' }} onClick={() => window.open(result.url, '_blank')}>Download PAT Report</button>}
              {result.error && <div style={{ color: '#ef4444', marginBottom: 20 }}>{result.error}</div>}
              
              {result.logs && result.logs.length > 0 && (
                <div style={{ marginTop: 25, textAlign: 'left', background: theme === 'dark' ? '#0f172a' : '#f1f5f9', padding: 15, borderRadius: 10, fontSize: 13, border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}` }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 10, color: theme === 'dark' ? '#94a3af' : '#475569' }}>System Logs:</div>
                  {result.logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: 4, color: log.includes('Error') || log.includes('not found') ? '#f87171' : (theme === 'dark' ? '#cbd5e1' : '#1e293b') }}>
                      • {log}
                    </div>
                  ))}
                </div>
              )}
              
              <button className="auth-button" style={{ marginTop: 15, background: 'none', border: 'none', color: '#94a3af' }} onClick={() => {setSelectedFolder(null); setResult(null); setProgress(0);}}>Start New Report</button>
            </div>
          ) : (
            <div style={{marginTop: 30}}>
              <button className="auth-button" style={{ background: '#3b82f6', width: '100%', height: 55, fontWeight: 'bold' }} onClick={handleGenerate}>Generate Excel</button>
              <button className="auth-button" style={{ marginTop: 15, background: 'none', border: 'none', color: '#94a3af' }} onClick={() => setSelectedFolder(null)}>Back</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function NavItem({ icon, label, active, onClick, theme }) {
  const activeBg = theme === 'dark' ? '#3b82f6' : '#eff6ff';
  const activeColor = theme === 'dark' ? 'white' : '#3b82f6';
  const idleColor = theme === 'dark' ? '#94a3af' : '#64748b';
  return <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', cursor: 'pointer', background: active ? activeBg : 'transparent', color: active ? activeColor : idleColor, fontWeight: active ? 'bold' : 'normal', marginBottom: 5 }}>{icon} <span style={{fontSize: '14px'}}>{label}</span></div>;
}

function MetricCard({ title, value, icon, theme, subtitle, currentTheme }) {
  const iconColor = theme === 'blue' ? '#3b82f6' : '#f97316';
  const bgColor = currentTheme === 'dark' ? '#0f172a' : '#f8fafc';
  return <div style={{ background: currentTheme === 'dark' ? '#1e293b' : 'white', padding: 30, borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid ${currentTheme === 'dark' ? '#334155' : '#e5e7eb'}` }}><div><div style={{ fontSize: 14, color: '#94a3af', marginBottom: 5 }}>{title}</div><div style={{ fontSize: 36, fontWeight: 'bold' }}>{value}</div><div style={{fontSize: 12, color: '#64748b'}}>{subtitle}</div></div><div style={{ background: bgColor, padding: 15, borderRadius: 15 }}>{React.cloneElement(icon, { size: 30, color: iconColor })}</div></div>;
}
