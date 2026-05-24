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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'batch'
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
      setIsLoggedIn(true);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo">
            <Zap size={24} fill="white" />
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue to your account</p>

          <form onSubmit={handleLogin}>
            {authStep === 1 ? (
              <>
                <button type="button" className="auth-input" style={{ background: '#fff', textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <img src="https://www.google.com/favicon.ico" width="16" alt="G" />
                  Continue with Google
                </button>
                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: '#888' }}>
                  <hr style={{ flex: 1, border: '0.5px solid #eee' }} />
                  <span style={{ margin: '0 10px', fontSize: '12px' }}>or</span>
                  <hr style={{ flex: 1, border: '0.5px solid #eee' }} />
                </div>
                <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Email address</label>
                <input 
                  className="auth-input" 
                  type="email" 
                  placeholder="Enter your email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
                <button type="submit" className="auth-button">
                  Continue <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                <div style={{ background: '#f5f5f5', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ fontSize: '14px' }}>{email}</span>
                  <Edit2 size={14} style={{ cursor: 'pointer', color: '#666' }} onClick={() => setAuthStep(1)} />
                </div>
                <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Password</label>
                <input 
                  className="auth-input" 
                  type="password" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button type="submit" className="auth-button">
                  Continue <ChevronRight size={16} />
                </button>
              </>
            )}
          </form>

          <div className="auth-footer">
            Don't have an account? <span style={{ color: '#000', fontWeight: '600', cursor: 'pointer' }}>Sign up</span>
            <div style={{ marginTop: '20px', fontSize: '12px' }}>
              Secured by <span style={{ fontWeight: '700' }}>clerk</span>
            </div>
            <div style={{ color: '#f97316', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>Development mode</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ background: '#3b82f6', padding: '#6px', borderRadius: '6px' }}><Monitor size={20} color="white" /></div>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>Teloneer Smart QC</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ color: '#666', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '10px' }}>Overview</div>
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />

          <div style={{ color: '#666', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '10px', marginTop: '16px' }}>Automations</div>
          <NavItem icon={<Zap size={18} />} label="AI Smart QC" active={activeView === 'batch'} onClick={() => setActiveView('batch')} />
          
          <div style={{ color: '#666', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', padding: '10px', marginTop: '16px' }}>System</div>
          <NavItem icon={<Settings size={18} />} label="Settings" />
          
          <div style={{ marginTop: 'auto', padding: '10px' }}>
            <div style={{ cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }} onClick={() => setIsLoggedIn(false)}>
              <LogOut size={18} /> <span>Sign Out</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeView === 'dashboard' ? (
          <DashboardContent data={data} loading={loading} />
        ) : (
          <BatchProcessView setActiveView={setActiveView} />
        )}
      </main>
    </div>
  );
}

function DashboardContent({ data, loading }) {
  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>Executive Dashboard</h1>
          <p style={{ color: '#666', margin: 0 }}>Work Order analytics and performance overview</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
           <FilterSelect label="2026" />
           <FilterSelect label="All Months" />
           <FilterSelect label="All Regions" />
           <FilterSelect label="All Teams" />
           <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bell size={20} color="#666" />
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ec4899', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>BB</div>
           </div>
        </div>
      </header>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <MetricCard 
          title="Total Work Orders" 
          value={data?.metrics?.workOrders || 0} 
          subtitle="All Sites"
          icon={<LayoutDashboard color="white" size={20} />}
          theme="blue"
        />
        <MetricCard 
          title="Estimate Plan" 
          value={`฿${data?.metrics?.plan || 0}M`} 
          subtitle="Total planned budget"
          icon={<DollarSign color="white" size={20} />}
          theme="purple"
        />
        <MetricCard 
          title="Estimate Income" 
          value={`฿${data?.metrics?.income || 0}M`} 
          subtitle="Expected revenue"
          icon={<BarChart2 color="white" size={20} />}
          theme="green"
        />
        <MetricCard 
          title="Completion Rate" 
          value={`${data?.metrics?.rate || 0}%`} 
          subtitle="Completed + On Service"
          icon={<Calendar color="white" size={20} />}
          theme="orange"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '24px', marginTop: '24px' }}>
        <div className="chart-container">
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Status Breakdown</h3>
          <p style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>Work orders by status</p>
          <div style={{ height: '300px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.statusBreakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(data?.statusBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#121212', border: '1px solid #262626' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{data?.metrics?.workOrders || 0}</div>
              <div style={{ fontSize: '10px', color: '#666' }}>Total</div>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Team Workload</h3>
          <p style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>Work order distribution</p>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.teamWorkload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#121212', border: '1px solid #262626' }} />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="InProgress" stackId="a" fill="#9333ea" />
                <Bar dataKey="OnService" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Pending" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
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
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    const url = `${BASE_URL}?action=listFolders`;
    console.log("Fetching Folders from:", url);
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(url);
      
      console.log("Response Status:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      
      const json = await res.json();
      console.log("Response JSON:", json);
      if (json.error) throw new Error(json.error);
      
      setFolders(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error("Detailed Folder Fetch Error:", e);
      let msg = e.message;
      if (e.name === "TypeError" && e.message === "Failed to fetch") {
        msg = "Network Blocked (CORS). This usually happens if you are logged into multiple Google accounts or if the Web App is not set to 'Anyone'.";
      }
      setError(
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '16px', fontWeight: '700' }}>{msg}</p>
          <div style={{ background: '#000', padding: '12px', borderRadius: '8px', textAlign: 'left', fontSize: '11px', marginBottom: '16px', border: '1px solid #444' }}>
             <p style={{ color: '#10b981', margin: '0 0 8px 0' }}>✅ Check these 3 steps in Google Apps Script:</p>
             <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Click <b>Deploy</b> (Top Right) → <b>Manage deployments</b></li>
                <li>Ensure the <b>"Deploy"</b> button at the bottom right has been clicked (It must not be blue).</li>
                <li>Verify <b>"Who has access"</b> is set to <b>"Anyone"</b>.</li>
             </ol>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
             <button onClick={fetchFolders} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Retry Connection</button>
             <a href={url} target="_blank" rel="noreferrer" style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>Check in Browser</a>
          </div>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const selectFolder = async (folder) => {
    setSelectedFolder(folder);
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BASE_URL}?action=listFiles&folderId=${folder.id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setFiles(Array.isArray(json) ? json : []);
      setSelectedFiles(Array.isArray(json) ? json.map(f => f.id) : []);
    } catch (e) {
      setError("Failed to load files from this folder.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedFolder) return;
    try {
      setProcessing(true);
      setStep(3);
      setError(null);
      const res = await fetch(`${BASE_URL}?action=processFolder&folderId=${selectedFolder.id}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json);
    } catch (e) {
      console.error("Process Error:", e);
      setResult({ error: e.toString() });
    } finally {
      setProcessing(false);
    }
  };

  const toggleFile = (id) => {
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #262626', marginBottom: '32px', paddingLeft: '40px' }}>
        <div style={{ padding: '12px 24px', color: '#2563eb', borderBottom: '2px solid #2563eb', fontWeight: '600', cursor: 'pointer' }}>Process</div>
        <div style={{ padding: '12px 24px', color: '#666', cursor: 'pointer' }} onClick={() => setActiveView('dashboard')}>History</div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        <StepItem num="1" label="Login" active={step >= 1} done={step > 1} />
        <div style={{ width: '40px', height: '2px', background: step > 1 ? '#10b981' : '#262626' }} />
        <StepItem num="2" label="File" active={step === 2} done={step > 2} />
        <div style={{ width: '40px', height: '2px', background: step > 2 ? '#10b981' : '#262626' }} />
        <StepItem num="3" label="Result" active={step === 3} done={result !== null} />
      </div>

      {step === 2 && (
        <>
          <h2 style={{ textAlign: 'center', fontSize: '22px', fontWeight: '700', marginBottom: '12px', color: '#fff' }}>
            {selectedFolder ? "Select File from Google Drive" : "Select Site from Google Drive"}
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            <span style={{ background: '#064e3b', color: '#10b981', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>Boonchot</span>
            {selectedFolder && (
              <>
                <span style={{ background: '#1e3a8a', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>{selectedFolder.name}/</span>
                <span style={{ color: '#666', padding: '4px 0', fontSize: '13px' }}>{files.length} files</span>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '40px', minHeight: '100px', maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={32} className="animate-spin" color="#3b82f6" /></div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444', background: '#450a0a', borderRadius: '12px', border: '1px solid #991b1b' }}>
                <p>{error}</p>
                <button onClick={fetchFolders} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', marginTop: '8px', cursor: 'pointer' }}>Retry</button>
              </div>
            ) : !selectedFolder ? (
              folders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No subfolders found in PHOTO folder.</div>
              ) : (
                folders.map(f => (
                  <div 
                    key={f.id} 
                    onClick={() => selectFolder(f)}
                    style={{ 
                      display: 'flex', alignItems: 'center', padding: '16px 20px', background: 'var(--card-dark)', 
                      border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ background: '#064e3b', padding: '10px', borderRadius: '10px', marginRight: '16px' }}>
                      <Folder size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff' }}>{f.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{f.fileCount} pending files</div>
                    </div>
                    <ChevronRight size={18} color="#666" style={{ marginLeft: 'auto' }} />
                  </div>
                ))
              )
            ) : (
              files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No unchecked images found in this site.</div>
              ) : (
                files.map(f => (
                  <div 
                    key={f.id} 
                    onClick={() => toggleFile(f.id)}
                    style={{ 
                      display: 'flex', alignItems: 'center', padding: '16px 20px', background: 'var(--card-dark)',
                      border: selectedFiles.includes(f.id) ? '2px solid #2563eb' : '1px solid var(--border-color)',
                      borderRadius: '12px', cursor: 'pointer', position: 'relative'
                    }}
                  >
                    <div style={{ background: '#064e3b', padding: '10px', borderRadius: '10px', marginRight: '16px' }}>
                      <FileInput size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '15px' }}>{f.name}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{f.date} &nbsp; {f.size}</div>
                    </div>
                    {selectedFiles.includes(f.id) && (
                      <div style={{ marginLeft: 'auto', background: '#2563eb', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={16} color="white" />
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <button 
              className="auth-button" 
              style={{ background: 'transparent', border: '1px solid #2563eb', color: '#2563eb', fontSize: '15px' }}
              onClick={() => selectedFolder ? setSelectedFolder(null) : setActiveView('dashboard')}
            >
              <ArrowLeft size={18} style={{ marginRight: '8px' }} /> Back
            </button>
            <button 
              className="auth-button" 
              style={{ background: '#10b981', fontSize: '15px' }}
              onClick={handleProcess}
              disabled={!selectedFolder || files.length === 0}
            >
              <Search size={18} style={{ marginRight: '8px' }} /> Review AI
            </button>
            <button 
              className="auth-button" 
              style={{ background: '#2563eb', fontSize: '15px' }} 
              onClick={handleProcess} 
              disabled={!selectedFolder || selectedFiles.length === 0}
            >
              <Rocket size={18} style={{ marginRight: '8px' }} /> Process
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--card-dark)', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
          {processing ? (
            <>
              <div style={{ marginBottom: '24px' }}><Loader2 size={48} className="animate-spin" style={{ margin: '0 auto', color: '#2563eb' }} /></div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>AI Analyzing...</h2>
              <p style={{ color: '#666' }}>We are checking your files in {selectedFolder?.name}</p>
            </>
          ) : result?.error ? (
            <>
              <div style={{ color: '#ef4444', marginBottom: '24px' }}><Zap size={48} fill="#450a0a" /></div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>Process Failed</h2>
              <p style={{ color: '#666' }}>{result.error}</p>
              <button className="auth-button" style={{ marginTop: '32px', maxWidth: '200px', margin: '32px auto' }} onClick={() => setStep(2)}>Try Again</button>
            </>
          ) : (
            <>
              <div style={{ color: '#10b981', marginBottom: '24px' }}><CheckCircle2 size={64} fill="#064e3b" /></div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#fff' }}>Analysis Complete!</h2>
              <p style={{ color: '#666', marginBottom: '32px' }}>Processed {result.total} files in {selectedFolder?.name}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
                <div style={{ background: '#064e3b', padding: '24px', borderRadius: '16px', border: '1px solid #065f46' }}>
                  <div style={{ color: '#10b981', fontSize: '32px', fontWeight: '800' }}>{result.pass}</div>
                  <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>Passed</div>
                </div>
                <div style={{ background: '#450a0a', padding: '24px', borderRadius: '16px', border: '1px solid #7f1d1d' }}>
                  <div style={{ color: '#ef4444', fontSize: '32px', fontWeight: '800' }}>{result.fail}</div>
                  <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>Rejected</div>
                </div>
              </div>

              {/* Detailed Results List */}
              <div style={{ textAlign: 'left', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: '#fff' }}>Detailed Review List</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {result.details?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: item.status === 'PASS' ? '#064e3b' : '#450a0a', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {item.status === 'PASS' ? <CheckCircle2 size={18} color="#10b981" /> : <Zap size={18} color="#ef4444" />}
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{item.name}</div>
                          {item.reason && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{item.reason}</div>}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: item.status === 'PASS' ? '#10b981' : '#ef4444' }}>
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="auth-button" style={{ maxWidth: '240px', margin: '0 auto' }} onClick={() => { setStep(2); setSelectedFolder(null); setResult(null); }}>Start New Batch</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StepItem({ num, label, active, done }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ 
        width: '32px', 
        height: '32px', 
        borderRadius: '50%', 
        background: done ? '#10b981' : (active ? '#3b82f6' : '#262626'),
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '700'
      }}>
        {done ? <CheckCircle2 size={16} /> : num}
      </div>
      <div style={{ fontSize: '12px', color: done || active ? '#fff' : '#666', fontWeight: active ? '600' : '400' }}>{label}</div>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '10px', 
        borderRadius: '8px', 
        cursor: 'pointer',
        background: active ? '#262626' : 'transparent',
        color: active ? 'white' : '#9ca3af',
        transition: 'all 0.2s'
      }}
    >
      {icon} <span style={{ fontSize: '14px', fontWeight: active ? '600' : '400' }}>{label}</span>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, theme }) {
  return (
    <div className={`metric-card metric-${theme}`}>
      <div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>{title}</div>
        <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#666' }}>{subtitle}</div>
      </div>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '8px', 
        background: `var(--${theme}-metric)`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        opacity: 0.8
      }}>
        {icon}
      </div>
    </div>
  );
}

function FilterSelect({ label }) {
  return (
    <div style={{ 
      background: '#121212', 
      border: '1px solid #262626', 
      padding: '6px 12px', 
      borderRadius: '6px', 
      fontSize: '12px', 
      color: '#9ca3af',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    }}>
      {label} <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
    </div>
  );
}
