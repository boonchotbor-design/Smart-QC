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

const BASE_URL = "https://script.google.com/macros/s/AKfycbwlhZ_vy7_gZ8gQOvnY0PIu_1O_VVEuOFLtvXIORtT76F1bX4fSd4Frj6tUkY3-pd2YAg/exec";
const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f97316', '#9333ea', '#6b7280'];
const PAT_TEMPLATE_ID = "1Pxdkd0Nxn-HzObefgkzcNFlCTDHrrVkj";
const ALLOWED_USERS = [
  "adisak.chanmao@teloneer.com",
  "boonchot.boriwut@teloneer.com",
  "apichart.kampuang@teloneer.com",
  "nattawoot.suwan@teloneer.com",
  "payon.sapphat@teloneer.com",
  "palagon.prommueangma@teloneer.com",
  "thossapol.chaloemrit@teloneer.com",
  "auttaseth.klomthaisong@teloneer.com",
  "nammon.manakiat@teloneer.com",
  "pakpoom.t@teloneer.com"
];

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
    const TEN_MINUTES = 10 * 60 * 1000;
    
    if (logged && loginTime) {
      const isExpired = Date.now() - parseInt(loginTime) > TEN_MINUTES;
      if (isExpired) {
        handleLogout();
      } else {
        setIsLoggedIn(true);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('loginTimestamp');
    setIsLoggedIn(false);
    setAuthStep(1);
    setPassword("");
    setOtp("");
  };

  const fetchData = async (site = "All Sites") => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${BASE_URL}?action=getData&site=${encodeURIComponent(site)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      console.error("Fetch Error:", e);
      setError("Fetch Failed: " + e.message + ". Please check GAS deployment settings (Access: Anyone).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      const checkSession = setInterval(() => {
        const loginTime = localStorage.getItem('loginTimestamp');
        if (loginTime && Date.now() - parseInt(loginTime) > 10 * 60 * 1000) {
          handleLogout();
          alert("Session expired (10 mins). Please login again.");
        }
      }, 30000); // Check every 30 seconds
      
      fetchData();
      return () => clearInterval(checkSession);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    try {
      if (authStep === 1 && email) {
        if (ALLOWED_USERS.includes(email.toLowerCase().trim())) {
          setAuthStep(2);
        } else {
          setError("ขออภัย คุณไม่ได้รับอนุญาตให้เข้าใช้งานระบบนี้");
        }
      } else if (authStep === 2 && password) {
        setLoading(true);
        const deviceVerifiedKey = `deviceVerified_${email.toLowerCase().trim()}`;
        const isDeviceVerified = localStorage.getItem(deviceVerifiedKey) === 'true';

        if (isDeviceVerified) {
          const res = await fetch(`${BASE_URL}?action=checkPassword&email=${email.toLowerCase().trim()}&password=${encodeURIComponent(password)}`);
          const json = await res.json();
          if (json.success) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            localStorage.setItem('loginTimestamp', Date.now().toString());
            setIsLoggedIn(true);
          } else {
            throw new Error(json.error || "รหัสผ่านไม่ถูกต้อง");
          }
        } else {
          const res = await fetch(`${BASE_URL}?action=sendOTP&email=${email.toLowerCase().trim()}&password=${encodeURIComponent(password)}`);
          const json = await res.json();
          if (json.success) {
            setAuthStep(3);
          } else {
            throw new Error(json.error || "Failed to send verification code");
          }
        }
      } else if (authStep === 3 && otp) {
        setLoading(true);
        const res = await fetch(`${BASE_URL}?action=verifyOTP&email=${email.toLowerCase().trim()}&otp=${otp}`);
        const json = await res.json();
        if (json.success) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userEmail', email);
          localStorage.setItem('loginTimestamp', Date.now().toString());
          localStorage.setItem(`deviceVerified_${email.toLowerCase().trim()}`, 'true');
          setIsLoggedIn(true);
        } else {
          throw new Error("รหัสยืนยันไม่ถูกต้องหรือหมดอายุ");
        }
      } else if (authStep === 4 && email) {
        setLoading(true);
        const res = await fetch(`${BASE_URL}?action=sendResetOTP&email=${email.toLowerCase().trim()}`);
        const json = await res.json();
        if (json.success) {
          setAuthStep(5);
        } else {
          throw new Error(json.error || "Failed to send reset code");
        }
      } else if (authStep === 5 && otp && password) {
        setLoading(true);
        const res = await fetch(`${BASE_URL}?action=resetPassword&email=${email.toLowerCase().trim()}&otp=${otp}&newPassword=${encodeURIComponent(password)}`);
        const json = await res.json();
        if (json.success) {
          localStorage.setItem(`deviceVerified_${email.toLowerCase().trim()}`, 'true');
          setAuthStep(2);
          setPassword("");
          setOtp("");
          setError("เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
        } else {
          throw new Error(json.error || "Reset failed");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo"><Zap size={24} fill="white" /></div>
          <h1 className="auth-title">
            {authStep === 3 ? "Verify Email" : (authStep >= 4 ? "Reset Password" : "Welcome back")}
          </h1>
          <p className="auth-subtitle">
            {authStep === 3 ? `Enter the 6-digit code sent to ${email}` : 
             authStep === 5 ? "Enter OTP and your new password" :
             "Sign in with your authorized email"}
          </p>

          {error && <div style={{ color: error.includes("สำเร็จ") ? '#10b981' : '#ef4444', fontSize: '13px', textAlign: 'center', marginBottom: '16px', background: error.includes("สำเร็จ") ? '#f0fdf4' : '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid ' + (error.includes("สำเร็จ") ? '#bbf7d0' : '#fee2e2') }}>{error}</div>}

          <form onSubmit={handleLogin}>
            {authStep === 1 && (
              <>
                <button type="button" className="auth-input" style={{ background: '#fff', textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <img src="https://www.google.com/favicon.ico" width="16" alt="G" /> Continue with Google
                </button>
                <input className="auth-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button type="submit" className="auth-button">Continue <ChevronRight size={16} /></button>
              </>
            )}

            {authStep === 2 && (
              <>
                <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ fontSize: '14px', color: '#000' }}>{email}</span>
                  <Edit2 size={14} style={{ cursor: 'pointer', color: '#000' }} onClick={() => setAuthStep(1)} />
                </div>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus style={{ marginBottom: 0 }} />
                  <div 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
                </button>
                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#3b82f6', cursor: 'pointer' }} onClick={() => setAuthStep(4)}>
                  Forgot Password?
                </p>
              </>
            )}

            {authStep === 3 && (
              <>
                <input 
                  className="auth-input" 
                  type="text" 
                  placeholder="6-digit code" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} 
                  required 
                  autoFocus 
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                />
                <button type="submit" className="auth-button" disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify Code"}
                </button>
                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#666' }}>
                  Didn't receive the code? <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => { setOtp(""); handleLogin(); }}>Resend</span>
                </p>
              </>
            )}

            {authStep === 4 && (
              <>
                <input className="auth-input" type="email" placeholder="Confirm your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Request Reset OTP"}
                </button>
                <button type="button" className="auth-button" style={{ marginTop: '10px', background: 'transparent', color: '#666', border: '1px solid #ccc' }} onClick={() => setAuthStep(2)}>Back</button>
              </>
            )}

            {authStep === 5 && (
              <>
                <input 
                  className="auth-input" 
                  type="text" 
                  placeholder="6-digit OTP" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} 
                  required 
                  style={{ textAlign: 'center', fontSize: '20px' }}
                />
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Enter New Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginBottom: 0 }} />
                  <div 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#666' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
                <button type="submit" className="auth-button" disabled={loading || otp.length < 6 || !password}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Reset & Save Password"}
                </button>
                <button type="button" className="auth-button" style={{ marginTop: '10px', background: 'transparent', color: '#666', border: '1px solid #ccc' }} onClick={() => setAuthStep(4)}>Back</button>
              </>
            )}
          </form>

          <div className="auth-footer">
            Powered by <b>TLN AI Automation</b> v1.20
          </div>
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
          <NavItem icon={<FileText size={18} />} label="PAT Generate" active={activeView === 'pat'} onClick={() => setActiveView('pat')} />
          <div style={{ marginTop: 'auto', padding: '10px' }}>
            <div style={{ cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }} onClick={() => { localStorage.removeItem('isLoggedIn'); setIsLoggedIn(false); setAuthStep(1); setPassword(""); setOtp(""); }}>
              <LogOut size={18} /> <span>Sign Out</span>
            </div>
          </div>
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
      const ARCHIVE_ROOT = "1dYRMNaTQsQfxsS-4z9GaWMIA3gQHq6h7";
      const res = await fetch(`${BASE_URL}?action=listFolders&root=${ARCHIVE_ROOT}`);
      const json = await res.json();
      setFolders(Array.isArray(json.folders) ? json.folders : []);
    } catch (e) { setError("Failed to load folders"); } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!selectedFolder) return;
    try {
      setGenerating(true); setError(null);
      const res = await fetch(`${BASE_URL}?action=generatePAT&folderId=${selectedFolder.id}&siteName=${encodeURIComponent(selectedFolder.name)}`);
      const json = await res.json();
      if (json.success) setResult(json);
      else throw new Error(json.error || "Generation failed");
    } catch (e) { setError(e.message); } finally { setGenerating(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="process-card" style={{background: 'var(--card-dark)', textAlign: 'center'}}>
        <h2 style={{ color: '#fff', marginBottom: 24 }}>PAT Report Generator</h2>
        
        {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

        {!selectedFolder ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px', maxHeight: '400px', overflowY: 'auto' }}>
            {folders.map(f => (
              <div key={f.id} onClick={() => setSelectedFolder(f)} className="folder-selection-card" style={{padding: 16}}>
                <Building2 size={20} color="#10b981" /> 
                <div style={{fontSize: 14, marginTop: 8, fontWeight: '600'}}>{f.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 32, borderRadius: 16, border: '1px dashed #3b82f6', marginBottom: 24 }}>
            <Building2 size={48} color="#3b82f6" style={{margin: '0 auto 16px'}} />
            <h3 style={{fontSize: 20, marginBottom: 8}}>{selectedFolder.name}</h3>
            <p style={{color: '#94a3b8', fontSize: 14, marginBottom: 24}}>Ready to generate PAT Excel report using the latest audit results.</p>
            
            {result ? (
              <div style={{background: '#10b981', padding: '16px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer'}} onClick={() => window.open(result.url, '_blank')}>
                <FileText size={20} /> <b>Download PAT Report</b>
              </div>
            ) : (
              <button className="auth-button" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 size={20} className="animate-spin" /> : <><Rocket size={20} /> Generate Excel</>}
              </button>
            )}
            
            <button className="auth-button" style={{marginTop: 12, background: 'transparent', color: '#666', border: 'none'}} onClick={() => {setSelectedFolder(null); setResult(null);}}>
              Select Different Site
            </button>
          </div>
        )}
      </div>
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
                <Pie data={Array.isArray(data?.statusBreakdown) ? data.statusBreakdown : []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {(Array.isArray(data?.statusBreakdown) ? data.statusBreakdown : []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
              <BarChart data={Array.isArray(data?.teamWorkload) ? data.teamWorkload : []}>
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
  const [step, setStep] = useState(2); 
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [siteName, setSiteName] = useState("");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [rootName, setRootName] = useState("");

  const PROJECTS = ["HAE", "TME", "TMT", "HAT", "HTB", "HSN", "TMB", "HNN"];
  const TYPES = ["MBB", "POWER", "SOLACELL", "SMALL DC", "IPRAN"];

  useEffect(() => { 
    if (step === 5 && !selectedFolder) fetchFolders(); 
  }, [step, selectedFolder]);

  const fetchFolders = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${BASE_URL}?action=listFolders`);
      const json = await res.json();
      setFolders(Array.isArray(json.folders) ? json.folders : []);
      setRootName(json.rootName || "");
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const selectFolder = async (folder) => {
    setSelectedFolder(folder);
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=listFiles&folderId=${folder.id}`);
      const json = await res.json();
      setFiles(Array.isArray(json) ? json : []);
    } catch (e) { setError("Failed to load files."); } finally { setLoading(false); }
  };

  const handleCreateFolder = async () => {
    if (!siteName) return;
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}?action=createSiteFolder&project=${selectedProject}&type=${selectedType}&site=${siteName.toUpperCase()}`);
      const json = await res.json();
      setStep(5);
      await selectFolder(json);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const handleProcess = async () => {
    if (!selectedFolder) return;
    try {
      setProcessing(true); setStep(6); setProgress(10);
      const timer = setInterval(() => {
        setProgress(p => p < 90 ? p + 10 : p);
      }, 1000);
      
      const res = await fetch(`${BASE_URL}?action=processFolder&folderId=${selectedFolder.id}`);
      const json = await res.json();
      clearInterval(timer);
      setProgress(100);
      setResult(json);
    } catch (e) { setResult({ error: e.toString() }); } finally { setProcessing(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Modern Step Indicator */}
      <div className="step-indicator">
        <div className={`step-circle ${step >= 1 ? 'done' : 'pending'}`}>
          {step > 1 ? <CheckCircle2 size={16} /> : 1}
          <span className="step-label">Login</span>
        </div>
        <div className={`step-connector ${step > 2 ? 'done' : ''}`} />
        <div className={`step-circle ${step === 5 ? 'active' : (step > 5 ? 'done' : 'pending')}`}>
          {step > 5 ? <CheckCircle2 size={16} /> : 2}
          <span className="step-label">File</span>
        </div>
        <div className={`step-connector ${step > 5 ? 'done' : ''}`} />
        <div className={`step-circle ${step === 6 ? 'active' : 'pending'}`}>
          3
          <span className="step-label">Result</span>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>{error}</div>}
      
      {step === 2 && (
        <div className="process-card" style={{background: 'var(--card-dark)'}}>
          <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: 24 }}>Select Project</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {PROJECTS.map(p => <SelectionCard key={p} label={p} selected={selectedProject === p} onClick={() => { setSelectedProject(p); setStep(3); }} icon={<Folder size={20} color="#10b981" />} />)}
          </div>
          <button className="auth-button" style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6' }} onClick={() => setStep(5)}>Use Existing Folder</button>
        </div>
      )}

      {step === 3 && (
        <div className="process-card" style={{background: 'var(--card-dark)'}}>
          <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: 24 }}>Select Work Type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {TYPES.map(t => <SelectionCard key={t} label={t} selected={selectedType === t} onClick={() => { setSelectedType(t); setStep(4); }} icon={<Zap size={20} color="#9333ea" />} />)}
          </div>
          <button className="auth-button" style={{ background: 'transparent', border: '1px solid #666', color: '#666' }} onClick={() => setStep(2)}>Back</button>
        </div>
      )}

      {step === 4 && (
        <div className="process-card" style={{background: 'var(--card-dark)'}}>
          <h2 style={{ color: '#fff', marginBottom: 24 }}>Enter Site Name</h2>
          <input className="auth-input" style={{ textAlign: 'center', fontSize: 20, background: '#1a1a1a', border: '1px solid #333', color: '#fff' }} value={siteName} onChange={(e) => setSiteName(e.target.value.toUpperCase())} placeholder="e.g. BKK0001" />
          <button className="auth-button" onClick={handleCreateFolder} style={{marginTop: 10}} disabled={!siteName}>Create & Continue</button>
          <button className="auth-button" onClick={() => setStep(3)} style={{marginTop: 10, background: 'transparent', border: 'none', color: '#666'}}>Back</button>
        </div>
      )}

      {step === 5 && (
        <div className="process-card" style={{background: 'var(--card-dark)', textAlign: 'left'}}>
          <h2 style={{ color: '#fff', marginBottom: 20, textAlign: 'center' }}>
            {selectedFolder ? `Ready to Process` : `Select Site Folder`}
          </h2>
          
          {selectedFolder ? (
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 20, borderRadius: 12, border: '1px dashed #3b82f6', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Building2 color="#3b82f6" />
                  <span style={{ fontWeight: 'bold', fontSize: 18 }}>{selectedFolder.name}</span>
                </div>
                <button 
                  onClick={() => selectFolder(selectedFolder)} 
                  style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Check Files
                </button>
              </div>

              <button 
                className="auth-button" 
                style={{ background: '#10b981', marginBottom: 12 }}
                onClick={() => window.open(selectedFolder.url, '_blank')}
              >
                <Folder size={18} /> Open Folder to Upload Images
              </button>

              <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 10 }}>
                {loading ? "Checking for new files..." : (files.length > 0 ? `Detected ${files.length} images:` : "No images found yet. Please upload images to the folder, then click 'Check Files'.")}
              </div>

              {files.length > 0 && (
                <div className="file-list-mini">
                  {files.map(f => (
                    <div key={f.id} className="file-item-mini">
                      <FileInput size={14} color="#3b82f6" /> {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto', paddingRight: 5 }}>
              {folders.map(f => (
                <div key={f.id} onClick={() => selectFolder(f)} className="folder-selection-card" style={{padding: 12}}>
                  <Building2 size={16} color="#10b981" /> <div style={{fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{f.name}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button className="auth-button" style={{ background: 'transparent', border: '1px solid #666', color: '#666' }} onClick={() => selectedFolder ? setSelectedFolder(null) : setStep(2)}>Back</button>
            <button className="auth-button" onClick={handleProcess} disabled={!selectedFolder || files.length === 0}>
              <Rocket size={18} /> Process Now
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="process-card" style={{background: '#f8fafc', color: '#1e293b', textAlign: 'center'}}>
          {processing ? (
            <>
              <h3 style={{ marginBottom: 16, color: '#3b82f6' }}>Validating...</h3>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 'bold' }}>{progress}%</div>
            </>
          ) : (
            <>
              <div style={{ background: '#10b981', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={32} color="white" />
              </div>
              <h2 style={{ marginBottom: 8, color: '#10b981' }}>Process Completed!</h2>
              <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>{selectedFolder?.name}</p>
              
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: 32 }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{result?.total || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Total</div>
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>{result?.pass || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Success</div>
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>{result?.fail || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Fail</div>
                </div>
              </div>

              {/* Detailed Logs */}
              <div style={{ textAlign: 'left', background: 'white', borderRadius: 12, padding: 20, marginBottom: 24, maxHeight: 300, overflowY: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>Detailed Logs</h4>
                {result?.details ? result.details.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: idx === result.details.length -1 ? 'none' : '1px solid #f8fafc', display: 'flex', gap: 12 }}>
                    <div style={{ marginTop: 2 }}>
                      {item.status === 'PASS' ? <CheckCircle2 size={16} color="#10b981" /> : <div style={{width: 16, height: 16, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span style={{color: 'white', fontSize: 10}}>!</span></div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: item.status === 'PASS' ? '#10b981' : '#ef4444' }}>
                        {item.status === 'PASS' ? '✅ อนุมัติ: ' : '❌ ตรวจพบข้อผิดพลาด: '} {item.reason}
                      </div>
                    </div>
                  </div>
                )) : <div style={{color: '#94a3b8', textAlign: 'center', fontSize: 12}}>No logs available</div>}
              </div>

              <button className="auth-button" onClick={() => { setStep(2); setSelectedFolder(null); setResult(null); }} style={{ width: '100%', marginBottom: '12px' }}>
                <Home size={18} /> Back to Home
              </button>

              <button 
                className="auth-button" 
                style={{ width: '100%', background: '#3b82f6' }}
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await fetch(`${BASE_URL}?action=generatePAT&folderId=${selectedFolder.id}&siteName=${encodeURIComponent(selectedFolder.name)}`);
                    const json = await res.json();
                    if (json.success) window.open(json.url, '_blank');
                    else alert("Generation failed: " + (json.error || "Unknown error"));
                  } catch (e) { alert("Error: " + e.message); } finally { setLoading(false); }
                }}
              >
                <FileText size={18} /> Generate PAT Report
              </button>
            </>
          )}
          <div style={{ marginTop: 32, fontSize: 11, color: '#94a3b8' }}>
            Powered by <b style={{color: '#3b82f6'}}>TLN AI Automation</b> v5.0
          </div>
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
    <div onClick={onClick} style={{ padding: '16px', background: selected ? '#2563eb' : '#1a1a1a', border: '1px solid #333', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {icon} <div style={{ fontWeight: '600', color: '#fff', fontSize: 13 }}>{label}</div>
    </div>
  );
}
