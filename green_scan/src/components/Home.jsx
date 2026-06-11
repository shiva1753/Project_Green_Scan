import React, { useState, useEffect, useRef } from 'react';
import { 
  Leaf, Search, Plus, FileText, Droplets, Sparkles, Clock, 
  TrendingUp, AlertTriangle, CheckCircle2, BellRing,
  History, File, X, Layers, Sun, Moon, RefreshCw, Settings
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import '../styles/home.css';

const fallbackChartData = [
  { name: 'Mon', pages: 120 }, { name: 'Tue', pages: 340 },
  { name: 'Wed', pages: 210 }, { name: 'Thu', pages: 450 },
  { name: 'Fri', pages: 380 }, { name: 'Sat', pages: 90 },
  { name: 'Sun', pages: 50 },
];

const fallbackJobs = [
  { _id: '1', docName: 'Q4_Financial_Report.pdf', user: 'Sarah J.', pages: 42, type: 'Black & White', time: '10:45 AM' },
  { _id: '2', docName: 'Marketing_Brochure_v2.docx', user: 'Mike R.', pages: 12, type: 'Color', time: '09:30 AM' },
];

const tonerConfig = [
  { label: 'CYAN',    key: 'cyan',    color: '#06b6d4', alert: '#ef4444' },
  { label: 'MAGENTA', key: 'magenta', color: '#ec4899', alert: '#ef4444' },
  { label: 'YELLOW',  key: 'yellow',  color: '#eab308', alert: '#ef4444' },
  { label: 'BLACK',   key: 'black',   color: '#4b5563', alert: '#ef4444' }
];

const linearRegression = (data) => {
  const n = data.length;
  if (n === 0) return 0;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, v) => sum + v, 0) / n;
  let numerator = 0, denominator = 0;
  data.forEach((y, x) => {
    numerator   += (x - xMean) * (y - yMean);
    denominator += (x - xMean) ** 2;
  });
  const slope     = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  return Math.max(1, intercept + slope * n);
};

const weightedBurnRate = (data) => {
  const n = data.length;
  if (n === 0) return 0;
  let totalWeight = 0, weightedSum = 0;
  data.forEach((v, i) => {
    const weight  = i + 1;
    weightedSum  += v * weight;
    totalWeight  += weight;
  });
  return weightedSum / totalWeight;
};

const capResources = (current, added, max) => Math.min(max, Math.max(0, current) + Math.max(0, added));

const Dashboard = () => {
  const [isModalOpen,        setIsModalOpen]        = useState(false);
  const [isAllJobsModalOpen, setIsAllJobsModalOpen]  = useState(false);
  const [isRefillModalOpen,  setIsRefillModalOpen]   = useState(false);
  const [isDarkMode,         setIsDarkMode]          = useState(false);

  const [jobData,    setJobData]    = useState({ name: '', pages: '', type: 'Black & White' });
  const [searchTerm, setSearchTerm] = useState('');

  const emptyRefill = { paper: '', cyan: '', magenta: '', yellow: '', black: '' };
  const [refillData, setRefillData] = useState(emptyRefill);

  const [resources,  setResources]  = useState({ paperBalance: 5000, toner: { cyan: 100, magenta: 100, yellow: 100, black: 100 } });
  const [recentJobs, setRecentJobs] = useState([]);
  const [allJobs,    setAllJobs]    = useState([]);
  const [chartData,  setChartData]  = useState(fallbackChartData);

  const activityTableRef = useRef(null);

  const loggedInName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || "User";
  const userInitial  = loggedInName.charAt(0).toUpperCase();

  const paperWeight = jobData.pages ? (jobData.pages * 0.005).toFixed(2) : "0.00";
  const tonerVol    = jobData.pages ? (jobData.pages * 0.6).toFixed(1)   : "0.0";

  const isPaperEmpty   = resources.paperBalance <= 0;
  const isBlackEmpty   = resources.toner.black   <= 0;
  const isCyanEmpty    = resources.toner.cyan    <= 0;
  const isMagentaEmpty = resources.toner.magenta <= 0;
  const isYellowEmpty  = resources.toner.yellow  <= 0;

  const isResourcesExhausted = isPaperEmpty || isBlackEmpty || (isCyanEmpty && isMagentaEmpty && isYellowEmpty);

  const isCurrentJobBlocked = () => {
    if (isPaperEmpty || isBlackEmpty) return true;
    if (jobData.type === 'Color' && (isCyanEmpty || isMagentaEmpty || isYellowEmpty)) return true;
    return false;
  };

  const getBlockedReason = () => {
    if (isPaperEmpty) return 'Paper tray is empty. Please refill paper before logging a new job.';
    if (isBlackEmpty) return 'Black toner is depleted. Please refill supplies before logging a new job.';
    if (jobData.type === 'Color' && (isCyanEmpty || isMagentaEmpty || isYellowEmpty)) {
      const depleted = ['Cyan', 'Magenta', 'Yellow'].filter((_, i) => [isCyanEmpty, isMagentaEmpty, isYellowEmpty][i]);
      return `${depleted.join(', ')} toner${depleted.length > 1 ? 's are' : ' is'} depleted. Color printing is unavailable.`;
    }
    return null;
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const res  = await fetch('https://projectgreenscan-production.up.railway.app/api/dashboard');
      const data = await res.json();
      if (data.resources) setResources(data.resources);
      if (data.jobs && data.jobs.length > 0) setRecentJobs(data.jobs);
      if (data.chartData && data.chartData.length > 0) {
        const totalPages = data.chartData.reduce((sum, day) => sum + (day.pages || 0), 0);
        if (totalPages > 0) setChartData(data.chartData);
      }
      // FIX 1: Always populate allJobs on dashboard load so search works immediately
      const resAll  = await fetch('https://projectgreenscan-production.up.railway.app/api/jobs');
      const allData = await resAll.json();
      if (allData) setAllJobs(allData);
    } catch (error) {
      console.error("Error fetching live dashboard data:", error);
    }
  };

  const fetchAllJobs = async () => {
    try {
      const res  = await fetch('https://projectgreenscan-production.up.railway.app/api/jobs');
      const data = await res.json();
      setAllJobs(data);
      setIsAllJobsModalOpen(true);
    } catch (error) {
      console.error("Error fetching all jobs:", error);
    }
  };

  const handleLogActivity = async () => {
    if (isCurrentJobBlocked()) return;
    if (!jobData.name || !jobData.pages) return alert("Please enter a document name and page count.");
    try {
      const res = await fetch('https://projectgreenscan-production.up.railway.app/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: jobData.name, pages: jobData.pages, type: jobData.type, user: loggedInName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resources) setResources(data.resources);
        fetchDashboardData();
        setIsModalOpen(false);
        setJobData({ name: '', pages: '', type: 'Black & White' });
      } else {
        alert("Failed to log activity.");
      }
    } catch (error) { console.error("Error logging job:", error); }
  };

  const handleCustomRefill = async () => {
    const paper   = parseFloat(refillData.paper)   || 0;
    const cyan    = parseFloat(refillData.cyan)    || 0;
    const magenta = parseFloat(refillData.magenta) || 0;
    const yellow  = parseFloat(refillData.yellow)  || 0;
    const black   = parseFloat(refillData.black)   || 0;

    if (paper === 0 && cyan === 0 && magenta === 0 && yellow === 0 && black === 0) {
      return alert("Please enter at least one refill amount.");
    }

    const updated = {
      paperBalance: capResources(resources.paperBalance, paper,   5000),
      toner: {
        cyan:    capResources(resources.toner.cyan,    cyan,    100),
        magenta: capResources(resources.toner.magenta, magenta, 100),
        yellow:  capResources(resources.toner.yellow,  yellow,  100),
        black:   capResources(resources.toner.black,   black,   100),
      }
    };
    setResources(updated);

    try {
      const res = await fetch('https://projectgreenscan-production.up.railway.app/api/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper, cyan, magenta, yellow, black })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.resources) setResources(data.resources);
        setIsRefillModalOpen(false);
        setRefillData(emptyRefill);
        fetchDashboardData();
      } else {
        fetchDashboardData();
        alert("Failed to refill supplies.");
      }
    } catch (error) {
      console.error("Error refilling supplies:", error);
      fetchDashboardData();
    }
  };

  const executeSearch = (e) => {
    if (e) e.preventDefault();
    if (activityTableRef.current) activityTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // FIX 2: Search falls back to recentJobs if allJobs is empty, so results always appear
  const displayedJobs = searchTerm
    ? (allJobs.length > 0 ? allJobs : recentJobs).filter(job => {
        const q = searchTerm.toLowerCase().trim();
        return String(job.docName || "").toLowerCase().includes(q)
            || String(job.user   || "").toLowerCase().includes(q)
            || String(job.type   || "").toLowerCase().includes(q);
      })
    : recentJobs;

  const calculateAI = () => {
    const pageHistory = chartData.map(d => d.pages || 0);

    const predictedPages      = linearRegression(pageHistory);
    const weightedAvgPages    = weightedBurnRate(pageHistory);
    const effectiveDailyPages = Math.max(predictedPages, weightedAvgPages);

    const jobsToAnalyze = allJobs.length > 0 ? allJobs : fallbackJobs;
    const colorRatio    = jobsToAnalyze.filter(j => j.type === 'Color').length / (jobsToAnalyze.length || 1);
    const bwRatio       = 1 - colorRatio;

    const tonerHistory = {
      cyan:    chartData.map(d => (d.pages || 0) * colorRatio * 0.025),
      magenta: chartData.map(d => (d.pages || 0) * colorRatio * 0.025),
      yellow:  chartData.map(d => (d.pages || 0) * colorRatio * 0.025),
      black:   chartData.map(d => (d.pages || 0) * ((colorRatio * 0.015) + (bwRatio * 0.035))),
    };

    const burnRates = {
      cyan:    Math.max(0.01, weightedBurnRate(tonerHistory.cyan)),
      magenta: Math.max(0.01, weightedBurnRate(tonerHistory.magenta)),
      yellow:  Math.max(0.01, weightedBurnRate(tonerHistory.yellow)),
      black:   Math.max(0.01, weightedBurnRate(tonerHistory.black)),
    };

    const limits = [
      { name: 'Paper',         days: resources.paperBalance      / effectiveDailyPages },
      { name: 'Cyan Toner',    days: resources.toner.cyan        / burnRates.cyan      },
      { name: 'Magenta Toner', days: resources.toner.magenta     / burnRates.magenta   },
      { name: 'Yellow Toner',  days: resources.toner.yellow      / burnRates.yellow    },
      { name: 'Black Toner',   days: resources.toner.black       / burnRates.black     },
    ];

    const bottleneck = limits.reduce((prev, curr) => prev.days < curr.days ? prev : curr);
    const minDays    = Math.max(0, Math.floor(bottleneck.days));

    const firstHalf  = pageHistory.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const secondHalf = pageHistory.slice(4).reduce((a, b) => a + b, 0) / 3;
    const trend      = secondHalf > firstHalf * 1.2 ? '📈 Usage trending up'
                     : secondHalf < firstHalf * 0.8 ? '📉 Usage trending down'
                     : '➡️ Usage stable';

    const avg        = pageHistory.reduce((a, b) => a + b, 0) / pageHistory.length;
    const variance   = pageHistory.reduce((sum, v) => sum + (v - avg) ** 2, 0) / pageHistory.length;
    const cv         = avg > 0 ? (Math.sqrt(variance) / avg) * 100 : 100;
    const confidence = cv < 20 ? 'High' : cv < 50 ? 'Medium' : 'Low';

    const habitText = colorRatio > 0.6 ? 'heavy Color usage' : 'heavy B&W usage';
    const reason    = minDays < 999
      ? `Bottleneck: ${bottleneck.name} · ${habitText} · ${trend} · Confidence: ${confidence}`
      : `Supplies stable · ${trend} · Confidence: ${confidence}`;

    return { days: minDays > 900 ? '99+' : minDays, reason };
  };

  const aiStats = calculateAI();

  const isResourceLow = resources.paperBalance <= 500 || Object.values(resources.toner).some(v => v <= 15);

  const generateAlerts = () => {
    const alerts = [];
    if (Object.values(resources.toner).some(v => v <= 15))
      alerts.push({ id: 1, type: 'red',    icon: AlertTriangle, title: 'Toner Level Critical',     time: 'Just now', desc: 'One or more toners are below 15%. Maintenance required immediately.' });
    if (resources.paperBalance < 500)
      alerts.push({ id: 2, type: 'yellow', icon: AlertTriangle, title: 'Paper Low',                time: 'Recent',   desc: `Only ${Math.max(0, resources.paperBalance)} sheets left in Tray 1. Refill needed.` });
    else if (resources.paperBalance > 4500)
      alerts.push({ id: 3, type: 'blue',   icon: CheckCircle2,  title: 'Paper Fully Stocked',      time: 'System',   desc: 'Tray is well supplied.' });
    const hvj = recentJobs.filter(j => j.pages > 100);
    if (hvj.length > 0)
      alerts.push({ id: 4, type: 'yellow', icon: AlertTriangle, title: 'High Volume Print Detect', time: hvj[0].time || 'Recent', desc: `${hvj[0].pages} pages printed by ${hvj[0].user}.` });
    return alerts.slice(0, 3);
  };
  const activeAlerts = generateAlerts();

  const JobRow = ({ job }) => (
    <tr key={job._id || Math.random()} className="table-row">
      <td className="doc-name-cell">
        <File size={16} className="file-icon" />
        <span className="doc-name-text">{job.docName}</span>
      </td>
      <td className="user-cell">{job.user}</td>
      <td className="pages-cell font-semibold">{job.pages}</td>
      <td>
        <span className={`type-badge ${job.type === 'Color' ? 'badge-color' : 'badge-bw'}`}>
          {job.type === 'Black & White' ? 'B&W' : job.type}
        </span>
      </td>
      <td className="time-cell">{job.time}</td>
    </tr>
  );

  return (
    <div className={`dashboard-wrapper ${isDarkMode ? 'dark' : ''}`}>

      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="logo-section">
          <div className="logo-icon-wrapper">
            <Leaf className="logo-icon" size={20} strokeWidth={2.5} />
          </div>
          <h1 className="logo-text">GreenScan</h1>
        </div>

        <div className="header-actions">
          <div className={`theme-toggle ${isDarkMode ? 'is-dark' : ''}`} onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Dark/Light Mode">
            <div className="theme-toggle-thumb" />
            <Sun  size={14} className="theme-icon sun-icon"  />
            <Moon size={14} className="theme-icon moon-icon" />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search full history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') executeSearch(); }}
              />
            </div>
            <button className="search-go-btn" onClick={executeSearch}>Search</button>
          </div>

          {/* FIX 3: Refill button is ALWAYS visible (removed isResourceLow condition).
              Button keeps both classes so the Selenium selector button.refill-alert-btn works. */}
          <button className="export-btn refill-alert-btn" onClick={() => setIsRefillModalOpen(true)} title="Refill supplies">
            <RefreshCw size={16} /><span>Refill Supplies</span>
          </button>

          <button
            className="log-btn"
            onClick={() => !isResourcesExhausted && setIsModalOpen(true)}
            disabled={isResourcesExhausted}
            title={isResourcesExhausted ? 'Resources exhausted. Please refill supplies.' : 'Log a new print job'}
            style={isResourcesExhausted ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'all' } : {}}
          >
            <Plus size={16} strokeWidth={2.5} /><span>Log Print Job</span>
          </button>

          <div className="avatar-wrapper">
            <div className="user-avatar-initials">{userInitial}</div>
            <span className="status-dot" />
          </div>
        </div>
      </header>

      {/* ── Top Cards ── */}
      <div className="cards-grid">

        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Paper Balance</span>
            <FileText size={18} className="card-icon" />
          </div>
          <div className="card-body">
            <h2 className="main-stat">{Math.max(0, resources.paperBalance).toLocaleString()} / 5,000</h2>
            <p className="sub-stat">Sheets remaining in main tray</p>
            <div className="progress-track mt-auto">
              <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, (resources.paperBalance / 5000) * 100))}%`, backgroundColor: resources.paperBalance <= 500 ? '#ef4444' : '#11b981' }} />
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Toner Levels</span>
            <Droplets size={18} className="card-icon info-blue" />
          </div>
          <div className="toner-list">
            {tonerConfig.map(t => {
              const val = Math.min(100, Math.max(0, resources.toner[t.key]));
              return (
                <div className="toner-item" key={t.key}>
                  <div className="toner-labels">
                    <span className="toner-name">{t.label}</span>
                    <span className="toner-percent">{val.toFixed(1)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${val}%`, backgroundColor: val <= 15 ? t.alert : t.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-card ai-card">
          <div className="card-header">
            <span className="card-title ai-title">Smart Predictor</span>
            <Sparkles size={18} className="card-icon ai-icon" />
          </div>
          <div className="card-body">
            <p className="ai-subtext">ESTIMATED DAYS REMAINING</p>
            <h2 className="main-stat ai-stat">{aiStats.days} Days</h2>
            <div className="depletion-info">
              <Clock size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12px', lineHeight: '1.4' }}>{aiStats.reason}</span>
            </div>
            <div className="ai-footer-note">
              <i>"Predicted using Linear Regression on 7-day usage trend + Weighted Burn Rate analysis per resource."</i>
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle: Chart + Alerts ── */}
      <div className="middle-grid">
        <div className="dashboard-card chart-card">
          <div className="chart-header-row">
            <div>
              <h2 className="section-title">Usage Trends</h2>
              <p className="section-subtitle">Pages printed in the last 7 days</p>
            </div>
            <div className="trend-badge">
              <TrendingUp size={14} /><span>Live Data</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#f3f4f6"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', color: isDarkMode ? '#f9fafb' : '#374151', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="pages" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPages)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-card alerts-card">
          <div className="alerts-header">
            <BellRing size={18} className="alerts-header-icon" />
            <h2 className="section-title">Smart Alerts</h2>
          </div>
          <div className="alerts-list">
            {activeAlerts.length === 0
              ? <p className="no-alerts-msg">No alerts at this time.</p>
              : activeAlerts.map((alert, i) => {
                  const Icon = alert.icon;
                  return (
                    <div key={i} className="alert-item">
                      <div className={`alert-icon-wrapper ${alert.type}-bg`}>
                        <Icon size={16} className={`${alert.type}-text`} />
                      </div>
                      <div className="alert-content">
                        <div className="alert-title-row">
                          <span className="alert-title">{alert.title}</span>
                          <span className="alert-time">{alert.time}</span>
                        </div>
                        <p className="alert-desc">{alert.desc}</p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* ── Activity Table ── */}
      <div className="dashboard-card recent-activity-section" ref={activityTableRef}>
        <div className="activity-header-row">
          <div className="activity-title-group">
            <History className="activity-icon" size={24} />
            <div>
              <h2 className="section-title">{searchTerm ? "Search Results" : "Recent Activity (Last 8 Jobs)"}</h2>
              <p className="section-subtitle">Track and manage individual print jobs</p>
            </div>
          </div>
          <button className="export-btn" onClick={fetchAllJobs}>View All Print Jobs</button>
        </div>

        <div className="table-container">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Document Name</th><th>User</th><th>Pages</th><th>Type</th><th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {displayedJobs.length === 0
                ? <tr><td colSpan="5" className="empty-table-msg">{searchTerm ? `No results found for "${searchTerm}" in database.` : "No print jobs found."}</td></tr>
                : displayedJobs.map(job => <JobRow key={job._id || Math.random()} job={job} />)
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal 1: Log Job ── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title-group">
                <Layers className="modal-icon" size={20} />
                <h2>Log New Print Job</h2>
              </div>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {isCurrentJobBlocked() && (
                <div className="eco-banner" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', marginBottom: '16px' }}>
                  <div className="eco-banner-icon" style={{ color: '#ef4444' }}>
                    <AlertTriangle size={16} />
                  </div>
                  <div className="eco-banner-text">
                    <h4 style={{ color: '#dc2626' }}>Cannot Submit — Resources Exhausted</h4>
                    <p style={{ color: '#b91c1c' }}>{getBlockedReason()}</p>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Document Name</label>
                {/* FIX 4: placeholder matches Selenium XPath exactly */}
                <input
                  type="text"
                  placeholder="Sustainability_Report_2023.pdf"
                  value={jobData.name}
                  onChange={(e) => setJobData({ ...jobData, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group half-width">
                  <label>Page Count</label>
                  {/* FIX 5: placeholder="24" matches Selenium XPath exactly */}
                  <input
                    type="number"
                    placeholder="24"
                    value={jobData.pages}
                    onChange={(e) => setJobData({ ...jobData, pages: e.target.value })}
                  />
                </div>
                <div className="form-group half-width">
                  <label>Print Type</label>
                  <select value={jobData.type} onChange={(e) => setJobData({ ...jobData, type: e.target.value })}>
                    <option value="Black & White">Black & White</option>
                    <option value="Color">Color</option>
                  </select>
                </div>
              </div>
              <div className="eco-banner">
                <div className="eco-banner-icon"><Leaf size={16} /></div>
                <div className="eco-banner-text">
                  <h4>Eco-Impact</h4>
                  <p>This job uses approx. {paperWeight}kg of recycled paper and {tonerVol}ml of organic toner.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button
                className="submit-btn"
                onClick={handleLogActivity}
                disabled={isCurrentJobBlocked()}
                style={isCurrentJobBlocked() ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Refill ── */}
      {isRefillModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title-group">
                <Settings className="modal-icon" size={20} />
                <h2>Maintenance: Refill Supplies</h2>
              </div>
              <button className="close-btn" onClick={() => setIsRefillModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">
                Enter amounts to add. Leave blank to skip. Paper capped at 5,000 sheets; toners capped at 100%.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'Paper', current: resources.paperBalance, add: parseFloat(refillData.paper) || 0, max: 5000, unit: 'sheets' },
                  ...tonerConfig.map(t => ({ label: t.label, current: resources.toner[t.key], add: parseFloat(refillData[t.key]) || 0, max: 100, unit: '%' }))
                ].map(item => {
                  const after = Math.min(item.max, Math.max(0, item.current) + item.add);
                  const changed = item.add > 0;
                  return (
                    <span key={item.label} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', backgroundColor: changed ? '#d1fae5' : '#f3f4f6', color: changed ? '#065f46' : '#6b7280', fontWeight: changed ? 600 : 400 }}>
                      {item.label}: {Math.max(0, item.current).toFixed(item.unit === '%' ? 1 : 0)}{item.unit === '%' ? '%' : ''} → {after.toFixed(item.unit === '%' ? 1 : 0)}{item.unit === '%' ? '%' : ''}
                    </span>
                  );
                })}
              </div>

              {/*
                FIX 6: Refill inputs restructured so label and input are SIBLINGS inside the form-group.
                Selenium XPath: //label[contains(text(),'Add Paper (Sheets)')]/following-sibling::input
                This only works when label and input share the same parent element with no wrapper div between them.
                The form-group div IS the shared parent — label then input, no nested wrapper.
              */}
              <div className="form-group">
                <label>Add Paper (Sheets)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  value={refillData.paper}
                  onChange={(e) => { const v = e.target.value; setRefillData(prev => ({ ...prev, paper: v })); }}
                />
              </div>
              <div className="form-row refill-toner-row">
                {tonerConfig.map(t => (
                  <div className="form-group refill-toner-group" key={`refill-${t.key}`}>
                    {/*
                      FIX 7: Label text is exactly "Add CYAN (%)" / "Add MAGENTA (%)" etc.
                      matching Selenium XPath: //label[contains(text(),'Add CYAN (%)')]
                    */}
                    <label>Add {t.label} (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={refillData[t.key]}
                      onChange={(e) => { const v = e.target.value; setRefillData(prev => ({ ...prev, [t.key]: v })); }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => { setIsRefillModalOpen(false); setRefillData(emptyRefill); }}>Cancel</button>
              <button className="submit-btn" onClick={handleCustomRefill}>Process Refill</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 3: Full History ── */}
      {isAllJobsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container modal-lg">
            <div className="modal-header">
              <div className="modal-title-group">
                <History className="modal-icon" size={20} />
                <h2>Complete Print History</h2>
              </div>
              <button className="close-btn" onClick={() => setIsAllJobsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body modal-body-scroll">
              <table className="activity-table">
                <thead className="sticky-thead">
                  <tr>
                    <th>Document Name</th><th>User</th><th>Pages</th><th>Type</th><th>Date / Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allJobs.length === 0
                    ? <tr><td colSpan="5" className="empty-table-msg">Database is empty.</td></tr>
                    : allJobs.map(job => <JobRow key={job._id} job={job} />)
                  }
                </tbody>
              </table>
            </div>
            {/* FIX 8: span.record-count text starts with "Total Records" exactly as Selenium asserts */}
            <div className="modal-footer modal-footer-spread">
              <span className="record-count">Total Records: {allJobs.length}</span>
              <button className="cancel-btn" onClick={() => setIsAllJobsModalOpen(false)}>Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;