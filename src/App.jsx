import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SpeedTest from '@cloudflare/speedtest';
import {
  Activity,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Cloud,
  Download,
  Gauge,
  Globe2,
  History,
  Info,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  Wifi,
  X,
  Zap, Gamepad2, Video, Clapperboard, MonitorSmartphone, FileDown, DownloadCloud, Network,
  AlertTriangle, Smartphone, Laptop, RefreshCw, UploadCloud, Timer,
} from 'lucide-react';
import { analyzeQuality, buildMeasurements, measurementCount, plannedBytes, deviceSummary, parseImportedHistory, TEST_PROFILES } from './diagnostics.js';
import { browserAndPlatform, lookupNetwork } from './network.js';
import { downloadPdfReport } from './report.js';
import { estimateBandwidth, formatSpeed, formatLatency, precisionText } from './precision.js';
import { mergeUploadRetry, safeSpeedtestOptions, uploadRetryPlan, explainMeasurementFailure } from './recovery.js';

const HISTORY_KEY = 'speedly-test-history-v1';
const PREFERENCES_KEY = 'speedly-preferences-v1';
const MAX_HISTORY = 100;

const DEFAULT_PREFERENCES = {
  theme: 'light',
  unit: 'Mbps',
  mode: 'standard',
  autoStart: false,
  budgetMb: 100,
  maxSeconds: 180,
  deviceLabel: '',
  networkType: 'Unknown',
};

const WORDS = {
  en: {
    subtitle: 'A clearer picture of your connection.',
    hero: 'Your internet speed is',
    idle: 'Ready when you are',
    measuring: 'Measuring your connection',
    paused: 'Test paused',
    complete: 'Test completed',
    previous: 'Viewing a previous test',
    error: 'Test could not be completed',
    start: 'Start speed test',
    pause: 'Pause test',
    resume: 'Resume test',
    restart: 'Test again',
    new: 'Run a new test',
    back: 'Back to latest result',
    download: 'Download',
    upload: 'Upload',
    latency: 'Latency',
    unloaded: 'Unloaded',
    loaded: 'Loaded',
    jitter: 'Jitter',
    server: 'Testing server',
    network: 'Network',
    metrics: 'Connection details',
    history: 'Test history',
    historySub: 'Your previous speed tests, saved on this device.',
    settings: 'Settings',
    privacy: 'Privacy',
    more: 'Show details',
    less: 'Hide details',
    noHistory: 'Your speed test history will appear here',
    noHistorySub: 'Run your first test to start tracking your connection over time.',
    time: 'Date & time',
    actions: 'Actions',
    clear: 'Clear history',
    export: 'Export CSV',
    share: 'Share results',
    connection: 'Connection quality',
    latest: 'Latest results',
    change: 'Compared to previous test',
    trend: 'Speed trend',
    trendSub: 'Download and upload speeds across your recent tests.',
    powered: 'Measurement powered by',
    bottom: 'Built for clarity. Your history stays in this browser.',
    progressLatency: 'Checking latency…',
    progressDownload: 'Testing download speed…',
    progressUpload: 'Testing upload speed…',
    progressReady: 'Start a test to measure your connection',
    privacyText: 'Speedly does not operate a measurement server or upload your saved history. Speed measurements are performed against Cloudflare’s network using its public speed-test engine. Cloudflare may collect measurement results as described in its own documentation. Test history and preferences are stored locally in your browser; clearing browser data removes them.',
    settingsDesc: 'Make Speedly work the way you want.',
    appearance: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    units: 'Speed units',
    testMode: 'Test duration',
    quick: 'Quick',
    standard: 'Standard',
    quickDesc: 'Faster and uses less data.',
    standardDesc: 'More samples for a more stable estimate.',
    autoStart: 'Auto-start speed test',
    autoStartDesc: 'Run a test automatically when you open the page.',
    dataNotice: 'Tests download and upload real data. Mobile data charges may apply.',
    close: 'Close',
    live: 'Live test',
    select: 'View result',
    delete: 'Delete result',
    nothing: 'No measurement yet',
  },
  si: {
    subtitle: 'ඔබගේ අන්තර්ජාල සම්බන්ධතාවය පිළිබඳ පැහැදිලි තොරතුරු.', hero: 'ඔබගේ අන්තර්ජාල වේගය',
    idle: 'පරීක්ෂාවට සූදානම්', measuring: 'සම්බන්ධතාවය පරීක්ෂා කරමින්', paused: 'පරීක්ෂාව නවතා ඇත', complete: 'පරීක්ෂාව අවසන්',
    previous: 'පෙර පරීක්ෂාවක්', error: 'පරීක්ෂාව අසාර්ථක විය', start: 'වේග පරීක්ෂාව අරඹන්න', pause: 'නවත්වන්න', resume: 'නැවත අරඹන්න',
    restart: 'නැවත පරීක්ෂා කරන්න', new: 'අලුත් පරීක්ෂාවක්', back: 'අලුත්ම ප්‍රතිඵලයට', download: 'බාගත වේගය', upload: 'උඩුගත වේගය',
    latency: 'ප්‍රමාදය', unloaded: 'භාරයකින් තොර', loaded: 'භාරය සහිත', jitter: 'වෙනස්වීම', server: 'පරීක්ෂණ සේවාදායකය', network: 'ජාලය',
    metrics: 'සම්බන්ධතා විස්තර', history: 'පෙර පරීක්ෂණ', historySub: 'මෙම උපාංගයේ සුරකින ලද ප්‍රතිඵල.', settings: 'සැකසුම්', privacy: 'පෞද්ගලිකත්වය',
    more: 'විස්තර පෙන්වන්න', less: 'විස්තර සඟවන්න', noHistory: 'පෙර පරීක්ෂණ මෙහි පෙන්වනු ඇත', noHistorySub: 'මුල් පරීක්ෂාව අරඹන්න.',
    time: 'දිනය සහ වේලාව', actions: 'ක්‍රියා', clear: 'ඉතිහාසය මකන්න', export: 'CSV බාගන්න', share: 'බෙදාගන්න',
    connection: 'සම්බන්ධතාවයේ ගුණාත්මකභාවය', latest: 'අලුත්ම ප්‍රතිඵල', change: 'පෙර පරීක්ෂාවට සාපේක්ෂව', trend: 'වේග වෙනස්වීම',
    trendSub: 'මෑත පරීක්ෂණවල බාගත සහ උඩුගත වේග.', powered: 'පරීක්ෂණ තාක්ෂණය', bottom: 'ඔබේ පෙර පරීක්ෂණ බ්‍රවුසරය තුළ පමණක් සුරැකේ.',
    progressLatency: 'ප්‍රමාදය පරීක්ෂා කරමින්…', progressDownload: 'බාගත වේගය පරීක්ෂා කරමින්…', progressUpload: 'උඩුගත වේගය පරීක්ෂා කරමින්…',
    progressReady: 'පරීක්ෂාවක් අරඹන්න', settingsDesc: 'ඔබට ගැළපෙන ලෙස වෙනස් කරන්න.', appearance: 'පෙනුම', light: 'ආලෝක', dark: 'අඳුරු', units: 'වේග ඒකක',
    testMode: 'පරීක්ෂණ කාලය', quick: 'ඉක්මන්', standard: 'සාමාන්‍ය', quickDesc: 'අඩු දත්ත ප්‍රමාණයක් භාවිතා කරයි.',
    standardDesc: 'වඩා ස්ථාවර මිනුමක්.', autoStart: 'ස්වයංක්‍රීයව අරඹන්න', autoStartDesc: 'පිටුව විවෘත කිරීමේදී පරීක්ෂා කරන්න.',
    dataNotice: 'පරීක්ෂණයේදී සැබෑ අන්තර්ජාල දත්ත භාවිතා වේ.', close: 'වසන්න', live: 'සජීවී පරීක්ෂාව', select: 'ප්‍රතිඵලය බලන්න',
    delete: 'මකන්න', nothing: 'තවම මිනුමක් නැත', privacyText: 'Speedly සේවාව ඔබගේ පෙර පරීක්ෂණ වෙනත් සේවාදායකයකට යවන්නේ නැත. වේග පරීක්ෂාව Cloudflare ජාලය සමඟ සිදු කෙරේ. Cloudflare ආයතනය තම ප්‍රතිපත්ති අනුව මිනුම් දත්ත රැස් කළ හැක. පෙර ප්‍රතිඵල සහ සැකසුම් ඔබගේ බ්‍රවුසරයේ පමණක් සුරැකේ.',
  },
  ta: {
    subtitle: 'உங்கள் இணைய இணைப்பைத் தெளிவாக அறிந்துகொள்ளுங்கள்.', hero: 'உங்கள் இணைய வேகம்', idle: 'சோதனைக்குத் தயார்',
    measuring: 'இணைப்பு சோதிக்கப்படுகிறது', paused: 'சோதனை இடைநிறுத்தப்பட்டது', complete: 'சோதனை முடிந்தது', previous: 'முந்தைய சோதனை',
    error: 'சோதனை தோல்வியடைந்தது', start: 'வேகச் சோதனையைத் தொடங்கவும்', pause: 'இடைநிறுத்து', resume: 'மீண்டும் தொடங்கு',
    restart: 'மீண்டும் சோதிக்கவும்', new: 'புதிய சோதனை', back: 'சமீபத்திய முடிவுக்கு', download: 'பதிவிறக்கம்', upload: 'பதிவேற்றம்',
    latency: 'தாமதம்', unloaded: 'சுமையின்றி', loaded: 'சுமையுடன்', jitter: 'அலைவு', server: 'சோதனை சேவையகம்', network: 'வலையமைப்பு',
    metrics: 'இணைப்பு விவரங்கள்', history: 'சோதனை வரலாறு', historySub: 'இந்தச் சாதனத்தில் சேமிக்கப்பட்ட முந்தைய முடிவுகள்.',
    settings: 'அமைப்புகள்', privacy: 'தனியுரிமை', more: 'விவரங்களைக் காட்டு', less: 'விவரங்களை மறை',
    noHistory: 'உங்கள் சோதனை வரலாறு இங்கே தோன்றும்', noHistorySub: 'முதல் சோதனையைத் தொடங்குங்கள்.', time: 'தேதி மற்றும் நேரம்',
    actions: 'செயல்கள்', clear: 'வரலாற்றை அழி', export: 'CSV பதிவிறக்கம்', share: 'பகிரவும்', connection: 'இணைப்பின் தரம்',
    latest: 'சமீபத்திய முடிவுகள்', change: 'முந்தைய சோதனையுடன் ஒப்பிடுக', trend: 'வேகப் போக்கு', trendSub: 'சமீபத்திய சோதனைகளின் வேகம்.',
    powered: 'சோதனை மூலம்', bottom: 'உங்கள் வரலாறு இந்த உலாவியில் மட்டுமே இருக்கும்.', progressLatency: 'தாமதம் அளவிடப்படுகிறது…',
    progressDownload: 'பதிவிறக்க வேகம் அளவிடப்படுகிறது…', progressUpload: 'பதிவேற்ற வேகம் அளவிடப்படுகிறது…',
    progressReady: 'சோதனையைத் தொடங்குங்கள்', settingsDesc: 'உங்கள் விருப்பத்திற்கு ஏற்ப மாற்றுங்கள்.', appearance: 'தோற்றம்', light: 'வெளிர்',
    dark: 'இருள்', units: 'வேக அலகு', testMode: 'சோதனை நேரம்', quick: 'விரைவு', standard: 'இயல்பான',
    quickDesc: 'குறைந்த தரவைப் பயன்படுத்தும்.', standardDesc: 'மேலும் நிலையான மதிப்பீடு.', autoStart: 'தானாகச் சோதனை தொடங்கு',
    autoStartDesc: 'பக்கத்தைத் திறக்கும்போது சோதனை தொடங்கும்.', dataNotice: 'சோதனையில் உண்மையான இணையத் தரவு பயன்படுத்தப்படும்.',
    close: 'மூடு', live: 'நேரடிச் சோதனை', select: 'முடிவைக் காண்', delete: 'நீக்கு', nothing: 'இன்னும் அளவீடு இல்லை',
    privacyText: 'Speedly உங்கள் சேமிக்கப்பட்ட வரலாற்றைத் தனி சேவையகத்திற்கு அனுப்பாது. வேகச் சோதனைகள் Cloudflare வலையமைப்பில் மேற்கொள்ளப்படுகின்றன. Cloudflare தனது கொள்கைகளின்படி அளவீடுகளைச் சேகரிக்கலாம். வரலாறும் அமைப்புகளும் உங்கள் உலாவியில் மட்டுமே சேமிக்கப்படும்.',
  },
};

function safeStored(key, fallback) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function fromGetter(results, methodName) {
  try { return finite(results[methodName]()); }
  catch { return null; }
}

function getPoints(results, methodName) {
  try {
    const raw = results[methodName]();
    return Array.isArray(raw) ? raw
      .map((point) => finite(point?.bps))
      .filter((v) => v !== null).map((v) => v / 1_000_000) : [];
  } catch { return []; }
}

function bytesFromPoints(results, methodName) {
  try {
    const points = results[methodName]();
    if (!Array.isArray(points)) return 0;
    return points.reduce((total, item) => total + (finite(item?.bytes) || 0), 0);
  } catch { return 0; }
}

// Each reading is the median of genuine completed Cloudflare transfer samples.
// Sustained requests (>=100 ms) take priority over short transfers. A short-
// sample-only result is explicitly flagged instead of claiming high certainty.
function readBandwidth(results, pointsGetter) {
  try { return estimateBandwidth(results[pointsGetter]()); }
  catch { return estimateBandwidth([]); }
}

function extractResults(results) {
  const down = readBandwidth(results, 'getDownloadBandwidthPoints');
  const up = readBandwidth(results, 'getUploadBandwidthPoints');
  return {
    download: down.bps, upload: up.bps,
    downValidSamples: down.count, upValidSamples: up.count,
    downVariation: down.spreadPct, upVariation: up.spreadPct,
    downEvidence: down.evidence, upEvidence: up.evidence,
    downProvisional: down.provisional, upProvisional: up.provisional,
    ping: fromGetter(results, 'getUnloadedLatency'),
    loadedPing: fromGetter(results, 'getDownLoadedLatency'),
    uploadLoadedPing: fromGetter(results, 'getUpLoadedLatency'),
    jitter: fromGetter(results, 'getUnloadedJitter'),
    downPoints: getPoints(results, 'getDownloadBandwidthPoints'),
    upPoints: getPoints(results, 'getUploadBandwidthPoints'),
    downBytes: bytesFromPoints(results, 'getDownloadBandwidthPoints'),
    upBytes: bytesFromPoints(results, 'getUploadBandwidthPoints'),
    latencyPoints: (() => { try {return results.getUnloadedLatencyPoints()?.length || 0;}catch{return 0;} })(),
  };
}

const INITIAL_METRICS = {
  download: null, upload: null, ping: null, loadedPing: null, uploadLoadedPing: null,
  jitter: null, downPoints: [], upPoints: [], downBytes: 0, upBytes: 0, latencyPoints: 0,
  downValidSamples: 0, upValidSamples: 0, downVariation: null, upVariation: null,
  downEvidence: 'Unavailable', upEvidence: 'Unavailable', downProvisional: false, upProvisional: false,
};

function compactSpeed(bps) { return formatSpeed(bps); }
function ms(value) { return formatLatency(value); }

function bytesLabel(value) {
  const v = Number(value) || 0;
  if (v < 1_000_000) return `${Math.round(v / 1000)} KB`;
  if (v < 1_000_000_000) return `${(v / 1_000_000).toFixed(1)} MB`;
  return `${(v / 1_000_000_000).toFixed(2)} GB`;
}

function dateLabel(iso, short = false) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric',
    ...(short ? {} : { year: 'numeric' }),
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function GaugeLogo({ large = false }) {
  return (
    <div className={`brand ${large ? 'brand--large' : ''}`} aria-label="Speedly">
      <svg className="brand-gauge" viewBox="0 0 66 48" fill="none" aria-hidden="true">
        <path d="M5 40a28 28 0 0 1 56 0" stroke="currentColor" strokeWidth="7" strokeLinecap="square" />
        <path d="M17 40a16 16 0 0 1 32 0" stroke="currentColor" strokeWidth="6" strokeLinecap="square" />
        <path d="M28 40a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
        <path d="M33 40 36 6" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="33" cy="40" r="5.2" fill="var(--ink)" />
      </svg>
      <span className="brand-text">SPEEDLY<span className="brand-period">.</span></span>
    </div>
  );
}

function Graph({ points = [], secondary = [], title, mutedLabel = 'Mbps', showLegend = true }) {
  const width = 640;
  const height = 156;
  const margin = { top: 18, bottom: 16, left: 8, right: 8 };
  const max = Math.max(0.1, ...points, ...secondary) * 1.18;
  const x = (index, length) => margin.left + (length < 2 ? (width - margin.left - margin.right) / 2 : (index / (length - 1)) * (width - margin.left - margin.right));
  const y = (value) => height - margin.bottom - value / max * (height - margin.top - margin.bottom);
  const coords = (list) => list.map((n, i) => `${x(i, list.length)},${y(n)}`).join(' ');
  const primaryPath = coords(points);
  const secondaryPath = coords(secondary);
  return (
    <div className="graph-wrap">
      <div className="graph-meta"><span>{title}</span><span>{mutedLabel}</span></div>
      <svg role="img" aria-label={title} className="graph" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e80824" stopOpacity=".18"/><stop offset="100%" stopColor="#e80824" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((n) => <line key={n} x1="0" x2={width} y1={y(max * n)} y2={y(max * n)} stroke="var(--line)" strokeDasharray="4 6" />)}
        {points.length > 1 && <>
          <polygon points={`${margin.left},${height - margin.bottom} ${primaryPath} ${width-margin.right},${height-margin.bottom}`} fill="url(#graphFill)" />
          <polyline points={primaryPath} stroke="var(--red)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </>}
        {secondary.length > 1 && <polyline points={secondaryPath} stroke="#8a9eb6" strokeWidth="2.7" fill="none" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {points.length <= 1 && secondary.length <= 1 && <text x={width/2} y={height/2+5} fill="var(--subtle)" textAnchor="middle" fontSize="16">Your speed readings will appear here</text>}
      </svg>
      {showLegend && <div className="graph-legend"><span><i className="legend-red" /> Download</span><span><i className="legend-gray" /> Upload</span></div>}
    </div>
  );
}

function Metric({ icon: Icon, title, value, suffix, tint }) {
  return <div className="metric">
    <div className={`metric-icon ${tint || ''}`}><Icon size={20} strokeWidth={1.9} /></div>
    <span className="metric-title">{title}</span>
    <div className="metric-reading"><strong>{value}</strong><span>{suffix}</span></div>
  </div>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', fn); document.body.classList.remove('modal-open'); };
  }, [onClose]);
  return <div className="modal-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-top"><h2>{title}</h2><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={21}/></button></div>
      {children}
    </section>
  </div>;
}

function App() {
  const [preferences, setPreferences] = useState(() => {
    const saved = safeStored(PREFERENCES_KEY, {});
    // Upgrade the old v4 default (90 seconds) to the less restrictive default.
    // Do not rewrite other preferences or lose previous speed-test history.
    // If someone needs a strict 90-second cap, it remains selectable in Settings.
    const upgraded = saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...saved } : {};
    if (upgraded.maxSeconds === 90 && !safeStored('speedly-v4-1-duration-migrated', false)) {
      upgraded.maxSeconds = 180;
    }
    return { ...DEFAULT_PREFERENCES, ...upgraded, unit: 'Mbps' }; // restore Mbps without changing saved bps history
  });
  const [language, setLanguage] = useState(() => safeStored('speedly-language-v1', 'en'));
  const [history, setHistory] = useState(() => {
    const v = safeStored(HISTORY_KEY, []);
    return Array.isArray(v) ? v : [];
  });
  const [status, setStatus] = useState('idle');
  const [stage, setStage] = useState('ready');
  const stageRef = useRef('ready');
  const [uploadNotice, setUploadNotice] = useState('');
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [serverInfo, setServerInfo] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [retryNotice, setRetryNotice] = useState('');
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [partialNotice, setPartialNotice] = useState('');
  const importRef = useRef(null);
  const finishRef = useRef(null);
  const elapsedRef = useRef(0);
  const activeSinceRef = useRef(null);
  const maxSecondsRef = useRef(180);
  const runBudgetRef = useRef(100);
  const planCountRef = useRef(1);

  const [selectedId, setSelectedId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [errorText, setErrorText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const engineRef = useRef(null);
  const tokenRef = useRef(0);
  const completedRef = useRef(false);
  const toastTimer = useRef(null);
  const autoStartedRef = useRef(false);
  const t = (key) => WORDS[language]?.[key] || WORDS.en[key] || key;

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
      localStorage.setItem('speedly-v4-1-duration-migrated', JSON.stringify(true));
    } catch {}
  }, [preferences]);
  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} }, [history]);
  useEffect(() => { try { localStorage.setItem('speedly-language-v1', JSON.stringify(language)); } catch {} }, [language]);
  useEffect(() => { document.documentElement.dataset.theme = preferences.theme; }, [preferences.theme]);

  // Network metadata (including the public IP) is fetched only after consent.
  const revealNetwork = async () => {
    const controller = new AbortController();
    setLookupBusy(true); setLookupError('');
    const timeout = setTimeout(() => controller.abort(), 6500);
    try { setServerInfo(await lookupNetwork(controller.signal)); }
    catch (error) { setLookupError(error.name === 'AbortError' ? 'Lookup timed out.' : error.message || 'Lookup failed.'); }
    finally {clearTimeout(timeout); setLookupBusy(false);}
  };

  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const installed = () => { setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.removeEventListener('appinstalled', installed); };
  }, []);

  const installApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else { setModal('install'); }
  };

  // Paused time is excluded from the wall-clock limit. The Cloudflare engine
  // may end early when its adaptive profile reaches stable sample durations.
  useEffect(() => {
    if (status !== 'running') { activeSinceRef.current = null; return; }
    activeSinceRef.current = Date.now();
    const timer = setInterval(() => {
      const seconds = elapsedRef.current + (Date.now() - activeSinceRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSecondsRef.current && finishRef.current) {
        finishRef.current(`Test stopped at your ${maxSecondsRef.current}-second time limit. Results are incomplete. Try Quick mode or increase the limit in Settings.`);
      }
    }, 300);
    return () => {
      elapsedRef.current += (Date.now() - activeSinceRef.current) / 1000;
      clearInterval(timer);
    };
  }, [status]);

  const notify = useCallback((message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3600);
  }, []);

  const startTest = useCallback((retryAttempt = false) => {
    const changeStage = (nextStage) => { stageRef.current = nextStage; setStage(nextStage); };
    const isRetry = retryAttempt === true;
    if (engineRef.current) {
      engineRef.current.onResultsChange = null;
      engineRef.current.onFinish = null;
      engineRef.current.onError = null;
      engineRef.current.onPhaseChange = null;
      try { engineRef.current.pause(); } catch {}
    }
    finishRef.current = null;
    const token = ++tokenRef.current;
    completedRef.current = false;
    elapsedRef.current = 0;
    setElapsed(0);
    setProgress(0);
    setRetryNotice(isRetry ? 'Retrying with a lighter test profile after a network error…' : '');
    setPartialNotice('');
    setSelectedId(null);
    setHasStarted(true);
    setMetrics(INITIAL_METRICS);
    changeStage('latency');
    setStatus('running');
    setErrorText('');
    setUploadNotice('');
    setTab('overview');
    const mode = isRetry ? 'quick' : preferences.mode;
    const budgetMb = Number(preferences.budgetMb) || 100;
    const steps = buildMeasurements(mode, budgetMb);
    planCountRef.current = measurementCount(steps);
    maxSecondsRef.current = Number(preferences.maxSeconds) || 180;
    runBudgetRef.current = budgetMb;
    const client = browserAndPlatform();
    const context = {
      deviceLabel: (preferences.deviceLabel.trim() || `${client.category} · ${client.platform}`).slice(0,48),
      networkType: preferences.networkType,
      browser: client.browser,
      devicePlatform: client.platform,
      profile: mode,
    };
    try {
      // The extra HTTP latency probe during upload uses
      // /__down?during=upload&bytes=0. It is optional and can fail on some
      // networks, interrupting the entire test. Disable that probe while
      // preserving the actual Cloudflare /__up upload bandwidth measurements.
      const test = new SpeedTest(safeSpeedtestOptions(steps));
      engineRef.current = test;
      let uploadRetry = null;
      const readCombined = () => mergeUploadRetry(
        extractResults(test.results),
        uploadRetry ? extractResults(uploadRetry.results) : null
      );

      const finish = (partialReason = '') => {
        if (token !== tokenRef.current || completedRef.current) return;
        completedRef.current = true;
        // Stop outstanding traffic for interrupted tests. The scheduled byte
        // cap is an estimate and does not include request/network overhead.
        if (partialReason) try { engineRef.current?.pause(); } catch {}
        let final;
        try { final = readCombined(); }
        catch { final = INITIAL_METRICS; }
        setMetrics(final);
        if (!partialReason) setProgress(100);
        setPartialNotice(partialReason || (final.download == null || final.upload == null ? 'One or both speed directions could not be measured reliably. This is a partial result.' : ''));
        if (final.upload === null) setUploadNotice('Upload measurement unavailable. The browser may be blocking HTTPS POST requests to speed.cloudflare.com; try disabling blockers or use Quick mode.');
        changeStage('finished');
        setStatus('finished');
        if (final.download !== null || final.upload !== null || final.ping !== null) {
          setHistory((prev) => [{
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(), ...final, ...context,
            partial: Boolean(partialReason || final.download == null || final.upload == null), durationMs: Math.round((elapsedRef.current + (activeSinceRef.current ? (Date.now() - activeSinceRef.current) / 1000 : 0)) * 1000),
          }, ...prev].slice(0, MAX_HISTORY));
        }
      };
      finishRef.current = finish;
      test.onPhaseChange = ({ measurement } = {}) => {
        if (token !== tokenRef.current) return;
        if (measurement?.type === 'upload') changeStage('upload');
        else if (measurement?.type === 'download') changeStage('download');
        else if (measurement?.type === 'latency') changeStage('latency');
      };
      test.onResultsChange = ({ type } = {}) => {
        if (token !== tokenRef.current || completedRef.current) return;
        const result = extractResults(test.results);
        setMetrics(result);
        setProgress(Math.min(95, Math.round((result.downPoints.length + result.upPoints.length + result.latencyPoints) / Math.max(1,planCountRef.current) * 100)));
        if (type === 'upload') changeStage('upload');
        else if (type === 'download') changeStage('download');
        else if (type === 'latency') changeStage('latency');
        if ((result.downBytes + result.upBytes) >= runBudgetRef.current * 1e6) finish('Approximate data budget reached; some network overhead is not counted.');
      };
      test.onFinish = () => finish();
      test.onError = (reason) => {
        if (token !== tokenRef.current || completedRef.current) return;
        const current = readCombined();
        // If only upload failed, keep real download/ping readings and retry
        // upload ONE time, with no background loaded-latency probes.
        // This does not repeat the download test or manufacture a speed value.
        if (current.download != null && current.upload == null && !uploadRetry &&
            elapsedRef.current + (activeSinceRef.current ? (Date.now() - activeSinceRef.current) / 1000 : 0) < maxSecondsRef.current - 15) {
          test.onResultsChange = null;
          test.onFinish = null;
          test.onError = null;
          test.onPhaseChange = null;
          try { test.pause(); } catch {}
          setRetryNotice('Upload connection issue · retrying upload only…');
          changeStage('upload');
          try {
            uploadRetry = new SpeedTest({
              ...safeSpeedtestOptions(uploadRetryPlan()),
              measureDownloadLoadedLatency: false,
            });
            engineRef.current = uploadRetry;
            uploadRetry.onResultsChange = () => {
              if (token !== tokenRef.current || completedRef.current) return;
              const recovered = readCombined();
              setMetrics(recovered);
              changeStage('upload');
            };
            uploadRetry.onFinish = () => {
              if (token !== tokenRef.current || completedRef.current) return;
              const recovered = readCombined();
              finish(recovered.upload == null ? 'Upload could not be measured after one upload-only retry. Download and ping are preserved.' : '');
            };
            uploadRetry.onError = (uploadReason) => {
              if (token !== tokenRef.current || completedRef.current) return;
              finish(`${explainMeasurementFailure(uploadReason, 'upload')} Available results are partial.`);
            };
            uploadRetry.play();
            return;
          } catch (retryError) {
            finish(`${explainMeasurementFailure(retryError, 'upload')} Results are partial.`);
            return;
          }
        }
        if ((current.downPoints.length || current.upPoints.length) && (current.download != null || current.upload != null)) {
          finish(`${explainMeasurementFailure(reason, stageRef.current)} Results are partial.`);
          return;
        }
        if (!isRetry) {
          // Single automatic Quick retry only when no useful bandwidth is available.
          ++tokenRef.current;
          try { test.pause(); } catch {}
          setRetryNotice('Connection issue detected. Retrying once with Quick mode…');
          setTimeout(() => { if (tokenRef.current === token + 1) startTest(true); }, 1000);
          return;
        }
        setErrorText(`Measurement failed after one retry. ${explainMeasurementFailure(reason, stageRef.current)}`);
        changeStage('error');
        setStatus('error');
        try { test.pause(); } catch {}
      };
      test.play();
    } catch (error) {
      setErrorText(error?.message || 'Could not start the test.');
      changeStage('error');
      setStatus('error');
    }
  }, [preferences.mode, preferences.budgetMb, preferences.maxSeconds, preferences.deviceLabel, preferences.networkType]);

  useEffect(() => {
    if (!autoStartedRef.current && preferences.autoStart) {
      const id = setTimeout(() => {
        autoStartedRef.current = true;
        startTest();
      }, 350);
      return () => clearTimeout(id);
    }
  // Intentionally only auto-start once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    ++tokenRef.current;
    if (engineRef.current) {
      engineRef.current.onResultsChange = null;
      engineRef.current.onFinish = null;
      engineRef.current.onError = null;
      try { engineRef.current.pause(); } catch {}
    }
    finishRef.current = null;
    clearTimeout(toastTimer.current);
  }, []);

  const pauseResume = () => {
    const test = engineRef.current;
    if (!test) return;
    if (status === 'running') { test.pause(); setStatus('paused'); }
    else if (status === 'paused') { test.play(); setStatus('running'); }
  };

  const selectedRecord = history.find((record) => record.id === selectedId) || null;
  const shown = selectedRecord || metrics;
  const latest = history[0] || null;
  const previous = history[1] || null;
  const showResult = Boolean(selectedRecord || (hasStarted && (status !== 'idle')));
  const isRunning = !selectedRecord && status === 'running';
  const isLiveUpload = !selectedRecord && (status === 'running' || status === 'paused') && stage === 'upload';
  const heroValue = isLiveUpload ? metrics.upload : shown.download;
  const heroTitle = isLiveUpload ? t('upload') : t('hero');
  const heroUnit = preferences.unit;
  const heroReading = compactSpeed(heroValue);
  const longReading = heroReading.length >= 6;
  const progressText = !showResult ? t('progressReady')
    : selectedRecord ? t('previous')
    : status === 'paused' ? t('paused')
    : status === 'finished' ? (partialNotice ? 'Test incomplete' : t('complete'))
    : status === 'error' ? t('error')
    : stage === 'upload' ? t('progressUpload')
    : stage === 'download' ? t('progressDownload')
    : t('progressLatency');
  const canStart = status === 'idle' || status === 'finished' || status === 'error' || selectedRecord;
  const latestDelta = latest && previous && previous.download > 0 && latest.download !== null
    ? ((latest.download - previous.download) / previous.download) * 100 : null;
  const graphHistory = useMemo(() => history.slice(0, 12).reverse(), [history]);
  const graphDownload = graphHistory.map((r) => (finite(r.download) || 0) / 1_000_000);
  const graphUpload = graphHistory.map((r) => (finite(r.upload) || 0) / 1_000_000);
  const quality = analyzeQuality(shown);
  const comparisons = useMemo(() => deviceSummary(history), [history]);
  const clientInfo = useMemo(() => browserAndPlatform(), []);
  const reportRecord = selectedRecord || (status === 'finished' ? latest : null);
  const downloadPdf = async () => {
    if (!reportRecord) {notify('Complete a test to create a report.');return;}
    setReportBusy(true);
    try { await downloadPdfReport(reportRecord); notify('PDF report downloaded'); }
    catch(error) {notify(`PDF generation failed: ${error?.message || 'unknown error'}`);}
    finally {setReportBusy(false);}
  };
  const saveHistoryJson = () => {
    if (!history.length) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`speedly-history-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    notify('History backup exported');
  };
  const importHistory = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) {notify('Import file exceeds 2 MB.');return;}
    try {
      const imported = parseImportedHistory(JSON.parse(await file.text()),MAX_HISTORY);
      setHistory(old=> [...imported,...old].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).slice(0,MAX_HISTORY));
      notify(`Imported ${imported.length} tests. Keep backups for other devices.`);
      setTab('compare');
    } catch(error) {notify(error.message || 'Unable to import history');}
  };


  const csvExport = () => {
    if (!history.length) return;
    const rows = [['Date','Download Mbps','Upload Mbps','Unloaded latency ms','Loaded download latency ms','Loaded upload latency ms','Jitter ms','Downloaded bytes','Uploaded bytes'],
      ...history.map((r) => [r.timestamp, r.download == null ? '' : (r.download / 1e6).toFixed(3),
        r.upload == null ? '' : (r.upload / 1e6).toFixed(3), r.ping ?? '', r.loadedPing ?? '', r.uploadLoadedPing ?? '', r.jitter ?? '', r.downBytes ?? '', r.upBytes ?? ''])];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }));
    link.href = url;
    link.download = `speedly-history-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('History exported as CSV');
  };

  const shareResults = async () => {
    const record = selectedRecord || latest;
    if (!record) { notify('Run a speed test first'); return; }
    const text = `My measured internet speed on Speedly (${dateLabel(record.timestamp)}): ${compactSpeed(record.download)} Mbps down, ${compactSpeed(record.upload)} Mbps up, ${ms(record.ping)} ms latency.`;
    try {
      if (navigator.share) await navigator.share({ title: 'My internet speed', text });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); notify('Result copied to clipboard'); }
      else notify('Sharing is not supported by this browser');
    } catch (error) { if (error?.name !== 'AbortError') notify('Unable to share results'); }
  };

  const clearHistory = () => {
    if (!window.confirm('Delete all saved speed tests from this browser?')) return;
    setHistory([]); setSelectedId(null);
    notify('History cleared');
  };

  const deleteOne = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
    notify('Result deleted');
  };

  const qualityIsLive = !selectedRecord && status !== 'finished';
  const gradeColor = (grade) => ['A+','A'].includes(grade) ? 'excellent' : grade === 'B' ? 'good' : grade === 'C' ? 'fair' : grade === '—' ? 'missing' : 'poor';
  const plannedMb = (plannedBytes(buildMeasurements(preferences.mode, preferences.budgetMb)) / 1e6).toFixed(1);

  const statusCaption = selectedRecord ? t('previous') : status === 'finished' ? (partialNotice ? 'Partial measurements available' : t('complete'))
    : status === 'running' ? t('measuring') : status === 'paused' ? t('paused')
    : status === 'error' ? t('error') : t('idle');
  const highSpeed = shown.download !== null && shown.download >= 50_000_000;
  const mediumSpeed = shown.download !== null && shown.download >= 10_000_000;
  const signalLabel = shown.download == null ? 'Not measured'
    : highSpeed ? 'Very fast' : mediumSpeed ? 'Good' : shown.download >= 3_000_000 ? 'Moderate' : 'Slow';

  return <div className="app-shell">
    <div className="top-stripe" />
    <header className="site-header">
      <a className="logo-anchor" href="#top" aria-label="Speedly home"><GaugeLogo /></a>
      <div className="top-right">
        <label className="language-picker" aria-label="Language">
          <Globe2 size={16} />
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Select language">
            <option value="en">English (US)</option>
            <option value="si">සිංහල</option>
            <option value="ta">தமிழ்</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <button className="header-link" onClick={() => setModal('privacy')}>{t('privacy')}</button>
        <button type="button" className="header-settings" title="Install Speedly" aria-label="Install Speedly" onClick={installApp}><DownloadCloud size={19}/></button>
        <button type="button" className="header-settings" aria-label={t('settings')} onClick={() => setModal('settings')}><Settings2 size={19}/></button>
      </div>
    </header>

    <main id="top">
      <section className="hero-section">
        <div className="ambient ambient-a" /><div className="ambient ambient-b" />
        <div className="hero-inner">
          <div className={`hero-eyebrow ${isRunning ? 'hero-eyebrow--active' : ''}`} role="status" aria-live="polite"><span className={`eyebrow-dot ${isRunning ? 'eyebrow-dot--active' : ''}`} /> {isRunning ? 'INTERNET PERFORMANCE TEST · LIVE' : 'INTERNET PERFORMANCE TEST'}</div>
          <h1>{heroTitle}</h1>
          <div className="speed-row" aria-live="polite">
            <div className={`hero-number ${isRunning ? 'hero-number--running' : ''} ${longReading ? 'hero-number--long' : ''} ${heroReading.length >= 8 ? 'hero-number--verylong' : ''}`}>{heroReading}</div>
            <div className="hero-speed-side"><span className="speed-unit">{heroUnit}</span>
              <button type="button" className={`speed-control ${isRunning ? 'speed-control--running' : ''}`} onClick={canStart ? startTest : pauseResume}
                aria-label={canStart ? t('start') : status === 'paused' ? t('resume') : t('pause')}
                title={canStart ? t('start') : status === 'paused' ? t('resume') : t('pause')}>
                {isRunning ? <Pause size={24} fill="currentColor" strokeWidth={1.4} /> : status === 'paused' && !selectedRecord ? <Play size={24} fill="currentColor" /> : hasStarted && status === 'finished' && !selectedRecord ? <RotateCcw size={24} strokeWidth={2.5} /> : <Play size={24} fill="currentColor" />}
              </button>
            </div>
          </div>
          <div className="status-line"><span className={`status-pulse ${isRunning ? 'status-pulse--active' : ''} ${status === 'finished' ? 'status-pulse--done' : ''}`} /> {statusCaption}</div>
          {(status === 'idle' || status === 'running') && !selectedRecord && <p className="progress-caption">{progressText}</p>}
          {isRunning && <div className="test-progress"><div className="test-progress-top"><span>{retryNotice || `${stage === 'upload' ? 'Upload' : stage === 'download' ? 'Download' : 'Latency'} sampling`}</span><strong>{progress}% <span>approx.</span></strong></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}} /></div><span>{Math.round(elapsed)}s / {maxSecondsRef.current}s safety limit · {bytesLabel((metrics.downBytes||0)+(metrics.upBytes||0))} measured transfer · Approx. budget {runBudgetRef.current} MB*</span></div>}
          {partialNotice && !selectedRecord && <p className="upload-notice" role="status"><AlertTriangle size={15}/> {partialNotice} <button className="text-retry" onClick={() => startTest(true)}><RefreshCw size={13}/> Retry Quick test</button></p>}
          {status === 'error' && !selectedRecord && <p className="error-message" role="alert">{errorText}</p>}
          {uploadNotice && status === 'finished' && !partialNotice && !selectedRecord && <p className="upload-notice" role="status">{uploadNotice} <button className="text-retry" onClick={() => startTest(true)}><RefreshCw size={13}/> Retry Quick test</button></p>}

          <div className="hero-action-row">
            <button type="button" className="primary-btn" onClick={selectedRecord || status === 'idle' || status === 'finished' || status === 'error' ? startTest : pauseResume}>
              {selectedRecord || status === 'idle' || status === 'finished' || status === 'error' ? <RotateCcw size={18} />
                : status === 'paused' ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
              {selectedRecord ? t('new') : status === 'idle' ? t('start') : status === 'finished' || status === 'error' ? t('restart') : status === 'paused' ? t('resume') : t('pause')}
            </button>
            {selectedRecord && <button className="plain-btn" onClick={() => setSelectedId(null)}>{t('back')} <ArrowRight size={16}/></button>}
            {(status === 'finished' || selectedRecord) && <button type="button" className="secondary-btn" onClick={shareResults}><Share2 size={17}/>{t('share')}</button>}
            {(status === 'finished' || selectedRecord) && <button type="button" className="secondary-btn" onClick={downloadPdf} disabled={reportBusy || !reportRecord}><FileDown size={17}/>{reportBusy ? 'Creating PDF…' : 'PDF report'}</button>}
          </div>
          <div className="hero-info"><ShieldCheck size={16}/><span>Real measurements · Mbps (megabits per second) · two decimals (three below 1 Mbps) · not a guarantee of exact accuracy</span></div>
        </div>
      </section>

      <div className="content-wrap">
        <section className="summary-card" aria-label="Speed summary">
          <div className="summary-half"><div className="summary-heading"><span className="summary-icon summary-icon--red"><ArrowDown size={17}/></span><span>{t('download')}</span>{isRunning && stage !== 'upload' && <span className="mini-loader" />}</div>
            <div className="summary-number">{compactSpeed(shown.download)} <span>{preferences.unit}</span></div><div className="measurement-evidence">{precisionText(shown, 'download')}</div></div>
          <div className="summary-half"><div className="summary-heading"><span className="summary-icon summary-icon--blue"><ArrowUp size={17}/></span><span>{t('upload')}</span>{isRunning && stage === 'upload' && <span className="mini-loader" />}</div>
            <div className="summary-number">{compactSpeed(shown.upload)} <span>{preferences.unit}</span></div><div className="measurement-evidence">{precisionText(shown, 'upload')}</div>{isRunning && stage !== 'upload' && shown.upload === null && <small className="upload-hint">Upload test starts after download</small>}</div>
          <div className="summary-separator" />
          <div className="summary-half summary-half--latency"><div className="summary-heading"><span className="summary-icon summary-icon--gray"><Activity size={17}/></span><span>{t('latency')}</span></div>
            <div className="summary-number">{ms(shown.ping)} <span>ms</span></div><div className="measurement-evidence">Observed latency · rounded to 0.1 ms</div></div>
        </section>

        <div className="workspace-header">
          <div className="workspace-tabs" role="tablist" aria-label="Results sections">
            <button role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}><Activity size={18}/>{t('metrics')}</button>
            <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}><History size={18}/>{t('history')}<span className="history-count">{history.length}</span></button>
            <button role="tab" aria-selected={tab === 'compare'} className={tab === 'compare' ? 'tab active' : 'tab'} onClick={() => setTab('compare')}><MonitorSmartphone size={18}/>Device comparison</button>
          </div>
          <div className="workspace-actions">
            <button className="icon-text-btn" onClick={() => setModal('settings')}><SlidersHorizontal size={17}/>{t('settings')}</button>
          </div>
        </div>

        {tab === 'overview' ? <div className="dashboard-grid">
          <article className="panel latency-panel">
            <div className="panel-heading"><div><span className="overline">THE NUMBERS</span><h2>{t('metrics')}</h2></div><span className="panel-label"><span className="tiny-dot" /> {selectedRecord ? dateLabel(selectedRecord.timestamp, true) : t('live')}</span></div>
            <div className="metrics-grid">
              <Metric icon={Clock3} title={`${t('latency')} · ${t('unloaded')}`} value={ms(shown.ping)} suffix="ms" tint="metric-icon--red" />
              <Metric icon={Gauge} title={`${t('latency')} · ${t('loaded')}`} value={ms(shown.loadedPing ?? shown.uploadLoadedPing)} suffix="ms" tint="metric-icon--blue" />
              <Metric icon={Activity} title={t('jitter')} value={ms(shown.jitter)} suffix="ms" tint="metric-icon--orange" />
              <Metric icon={Wifi} title={t('connection')} value={signalLabel} suffix="" tint="metric-icon--green" />
            </div>
            <button type="button" className="detail-toggle" aria-expanded={detailsOpen} onClick={() => setDetailsOpen(!detailsOpen)}>{detailsOpen ? t('less') : t('more')}<ChevronDown size={16} className={detailsOpen ? 'rotate-180' : ''}/></button>
            {detailsOpen && <div className="extra-details">
              <div><span>{t('server')}</span><strong><Cloud size={15}/> Cloudflare {serverInfo?.colo ? `· ${serverInfo.colo}` : 'edge'}</strong></div>
              <div><span>{t('network')}</span><strong>{serverInfo?.asOrganization || 'Internet connection'}</strong></div>
              {serverInfo?.city && <div><span>Client (approx.)</span><strong><Globe2 size={15}/>{serverInfo.city}{serverInfo.country ? `, ${serverInfo.country}` : ''}</strong></div>}
              <div><span>Downloaded data</span><strong>{bytesLabel(shown.downBytes)}</strong></div>
              <div><span>Uploaded data</span><strong>{bytesLabel(shown.upBytes)}</strong></div>
            </div>}
          </article>
          <article className="panel waveform-panel"><div className="panel-heading"><div><span className="overline">REAL-TIME ANALYSIS</span><h2>Speed measurements</h2></div><span className="panel-label"><TrendingUp size={15}/> {preferences.unit}</span></div>
            <Graph title="Download and upload measurement samples" points={shown.downPoints || []} secondary={shown.upPoints || []} mutedLabel={preferences.unit}/>
            <div className="waveform-foot"><Info size={15}/> Measured against Cloudflare servers. Results may vary by time and network conditions.</div>
          </article>
        </div> : <div className="history-page-heading"><div><span className="overline">{tab === 'compare' ? 'CONNECTION COMPARISON' : 'PAST PERFORMANCE'}</span><h2>{tab === 'compare' ? 'Compare your devices and connections' : t('history')}</h2><p>{tab === 'compare' ? 'Aggregate actual saved tests by device label and connection type.' : t('historySub')}</p></div></div>}

        {tab === 'overview' && <section className="insights-grid" aria-label="Advanced network diagnostics">
          <article className="panel quality-panel">
            <div className="panel-heading"><div><span className="overline">QUALITY INTELLIGENCE</span><h2>Internet quality score</h2></div><span className="panel-label"><ShieldCheck size={15}/> Heuristic grade</span></div>
            <div className="quality-main"><div className={`grade-circle grade-${gradeColor(quality.grade)}`}><strong>{quality.grade}</strong><span>{quality.score == null ? 'No score' : `${quality.score}/100`}</span></div><div><h3>{quality.score == null ? 'Waiting for measurements' : quality.score >= 85 ? 'Great connection' : quality.score >= 70 ? 'Solid performance' : quality.score >= 55 ? 'Mixed performance' : 'Connection needs attention'}</h3><p>{qualityIsLive ? 'Scores will become more reliable after the test completes.' : `Evidence: ${quality.confidence}.`}</p><small>Calculated from measured bandwidth, ping, jitter, latency under load, and sample variation.</small></div></div>
            <div className="app-scores">
              {quality.applications.map(item => <div className="app-score" key={item.key}>
                <div className="app-score-icon">{item.key==='gaming'?<Gamepad2 size={19}/>:item.key==='streaming'?<Clapperboard size={19}/>:item.key==='calls'?<Video size={19}/>:<Globe2 size={19}/>}</div>
                <div className="app-score-body"><strong>{item.name}</strong><span>{item.important}</span><div className="app-score-track"><div style={{width:`${item.score || 0}%`}}/></div></div>
                <div className={`app-grade grade-text-${gradeColor(item.grade)}`}><strong>{item.grade}</strong><span>{item.label}</span></div>
              </div>)}
            </div>
            <p className="insight-note"><Info size={15}/> Application scores estimate suitability only; they do not guarantee performance in a specific game, stream, or call.</p>
          </article>
          <div className="diagnostic-stack">
            <article className="panel compact-panel">
              <div className="panel-heading"><div><span className="overline">RESPONSIVENESS</span><h2>Bufferbloat analysis</h2></div><div className={`grade-pill grade-text-${gradeColor(quality.bufferbloat.grade)}`}>{quality.bufferbloat.grade}</div></div>
              <div className="buffer-number">{quality.bufferbloat.delta == null ? '—' : `+${Math.round(quality.bufferbloat.delta)}`} <span>ms under load</span></div><p>{quality.bufferbloat.rating}</p>
              <div className="buffer-details"><span>Idle <strong>{ms(shown.ping)} ms</strong></span><span>Download load <strong>{ms(shown.loadedPing)} ms</strong></span><span>Upload load <strong>{ms(shown.uploadLoadedPing)} ms</strong></span></div>
              <p className="insight-note"><Info size={15}/> HTTP latency comparison (download load only for new tests); upload-loaded latency is disabled to prevent optional probe failures. Not a standardized bufferbloat certification.</p>
            </article>
            <article className="panel compact-panel">
              <div className="panel-heading"><div><span className="overline">GAMING HEALTH</span><h2>Latency & stability</h2></div><Gamepad2 size={22} className="diag-icon"/></div>
              <div className="gaming-metrics"><div><span>Ping</span><strong>{ms(shown.ping)} <small>ms</small></strong></div><div><span>Jitter</span><strong>{ms(shown.jitter)} <small>ms</small></strong></div><div><span>Packet loss</span><strong>—</strong></div></div>
              <p className="insight-note"><AlertTriangle size={15}/> Packet loss is not measured: accurate UDP testing requires an authorized TURN server. No fabricated loss figure is shown.</p>
            </article>
          </div>
        </section>}

        {tab === 'overview' && <section className="panel network-panel">
          <div className="panel-heading"><div><span className="overline">LOCAL & NETWORK</span><h2>Connection information</h2></div><Network size={21} className="diag-icon"/></div>
          <div className="network-grid">
            <div><span>Device</span><strong>{clientInfo.category} · {clientInfo.platform}</strong></div>
            <div><span>Browser</span><strong>{clientInfo.browser}</strong></div>
            <div><span>Browser connection estimate</span><strong>{clientInfo.effectiveType || 'Not provided'}</strong></div>
            <div><span>Connection label</span><strong>{selectedRecord?.networkType || preferences.networkType}</strong></div>
            <div><span>Browser online status</span><strong>{clientInfo.online ? 'Online' : 'Offline'}</strong></div>
            <div><span>Current test device label</span><strong>{selectedRecord?.deviceLabel || preferences.deviceLabel || `${clientInfo.category} · ${clientInfo.platform}`}</strong></div>
          </div>
          <div className="lookup-container">
            <div><strong>Public IP / ISP (optional)</strong><p>Only fetch when you choose. A request to Cloudflare reveals your IP address to that service.</p></div>
            {serverInfo ? <div className="lookup-results"><strong>{serverInfo.ip}</strong><span>{serverInfo.isp} {serverInfo.city ? `· ${serverInfo.city}` : ''}</span><button className="small-outline" onClick={()=>setServerInfo(null)}>Hide</button></div> : <button type="button" className="small-outline" onClick={revealNetwork} disabled={lookupBusy}><Globe2 size={15}/>{lookupBusy ? 'Looking up…' : 'Show IP & ISP'}</button>}
            {lookupError && <p role="alert" className="lookup-error">{lookupError}</p>}
          </div>
        </section>}

        {tab === 'compare' && <section className="panel compare-panel">
          <div className="section-row"><div><span className="overline">CROSS-DEVICE HISTORY</span><h2>Saved device benchmarks</h2><p>Change the device and connection labels in Settings before testing. To compare another device, export its JSON history there and import it here.</p></div><div className="history-buttons"><button className="small-outline" disabled={!history.length} onClick={saveHistoryJson}><Download size={15}/>Export JSON</button><button className="small-outline" onClick={()=>importRef.current?.click()}><UploadCloud size={15}/>Import JSON</button></div></div>
          <input type="file" accept=".json,application/json" hidden ref={importRef} onChange={importHistory}/>
          {comparisons.length ? <div className="history-scroller"><table className="history-table device-table"><thead><tr><th>Device / connection</th><th>Tests</th><th>Avg. down</th><th>Avg. up</th><th>Avg. ping</th></tr></thead><tbody>{comparisons.map((item,index)=><tr key={`${item.label}-${item.network}-${index}`}><td><strong>{item.label}</strong><small>{item.network}</small></td><td>{item.count}</td><td>{item.down == null ? '—' : item.down.toFixed(2)} <small>Mbps</small></td><td>{item.up == null ? '—' : item.up.toFixed(2)} <small>Mbps</small></td><td>{item.ping == null ? '—' : item.ping.toFixed(1)} <small>ms</small></td></tr>)}</tbody></table></div> : <div className="empty-history"><MonitorSmartphone size={30}/><h3>No devices to compare yet</h3><p>Complete a speed test or import JSON history from another device.</p></div>}
          <div className="insight-note"><Info size={15}/> Comparisons show historical averages, not simultaneous tests. Browser-stored data does not sync between devices without export/import.</div>
        </section>}

        {tab === 'overview' && <section className="history-preview">
          <div className="section-row"><div><span className="overline">OVER TIME</span><h2>{t('trend')}</h2><p>{t('trendSub')}</p></div>{latestDelta !== null && <div className={`delta ${latestDelta >= 0 ? 'delta--up' : 'delta--down'}`}>
            {latestDelta >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>} {Math.abs(latestDelta).toFixed(1)}% <span>{t('change')}</span></div>}
          </div>
          {history.length >= 2 ? <Graph title="Last 12 test results" points={graphDownload} secondary={graphUpload} mutedLabel={preferences.unit}/>
            : <div className="empty-trend"><div className="empty-icon"><TrendingUp size={25}/></div><p>Complete at least two tests to see your speed trend.</p></div>}
        </section>}

        {tab !== 'compare' && <section className={`history-section ${tab === 'history' ? 'history-section--full' : ''}`}>
          <div className="section-row"><div><span className="overline">YOUR RECORDS</span><h2>{tab === 'history' ? t('latest') : t('history')}</h2><p>{t('historySub')}</p></div>
            <div className="history-buttons"><button className="small-outline" disabled={!history.length} onClick={csvExport}><Download size={15}/>{t('export')}</button><button className="small-outline" disabled={!history.length} onClick={saveHistoryJson}><Download size={15}/>JSON backup</button>
              <button className="small-outline small-outline--danger" disabled={!history.length} onClick={clearHistory}><Trash2 size={15}/><span className="clear-label">{t('clear')}</span></button></div>
          </div>
          {history.length ? <div className="history-scroller"><table className="history-table"><thead><tr><th>{t('time')}</th><th>Device</th><th>{t('download')}</th><th>{t('upload')}</th><th>{t('latency')}</th><th className="action-column">{t('actions')}</th></tr></thead>
          <tbody>{history.slice(0, tab === 'overview' ? 5 : MAX_HISTORY).map((item, index) => <tr key={item.id} className={selectedId === item.id ? 'selected-row' : ''}>
            <td><button className="history-date" onClick={() => { setSelectedId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="history-row-icon"><Clock3 size={16}/></span><span>{dateLabel(item.timestamp)}{index === 0 && <em>Latest</em>}</span></button></td>
            <td><strong className="small-device">{item.deviceLabel || 'Legacy device'}</strong><small>{item.networkType || 'Unknown'}</small></td>
            <td><strong>{compactSpeed(item.download)}</strong><small>{preferences.unit}</small></td>
            <td><strong>{compactSpeed(item.upload)}</strong><small>{preferences.unit}</small></td>
            <td><strong>{ms(item.ping)}</strong><small>ms</small></td>
            <td><div className="row-actions"><button type="button" title={t('select')} aria-label={t('select')} onClick={() => { setSelectedId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><ChevronRight size={19}/></button><button type="button" title={t('delete')} aria-label={t('delete')} onClick={() => deleteOne(item.id)}><Trash2 size={16}/></button></div></td>
          </tr>)}</tbody></table></div>
          : <div className="empty-history"><div className="empty-icon"><History size={27}/></div><h3>{t('noHistory')}</h3><p>{t('noHistorySub')}</p><button className="small-primary" onClick={startTest}><Play size={15} fill="currentColor"/>{t('start')}</button></div>}
          {tab === 'overview' && history.length > 5 && <button className="view-all" onClick={() => { setTab('history'); document.querySelector('.workspace-header')?.scrollIntoView({ behavior: 'smooth' }); }}>View all {history.length} tests <ArrowRight size={16}/></button>}
        </section>}
        <aside className="data-notice"><ShieldCheck size={17}/><span>{t('dataNotice')}</span><button onClick={() => setModal('privacy')}>{t('privacy')} <ArrowRight size={14}/></button></aside>
      </div>
    </main>

    <footer className="site-footer"><div className="footer-brand"><GaugeLogo /><span>Know your connection.</span></div><div className="footer-right"><span className="developer-credit">Developed by <strong>SULAKSHAN M</strong></span><span>{t('bottom')}</span><span className="footer-powered">{t('powered')} <strong>Cloudflare</strong></span></div></footer>

    {modal === 'privacy' && <Modal title={t('privacy')} onClose={() => setModal(null)}><div className="privacy-content"><div className="modal-illustration"><ShieldCheck size={30}/></div><p>{t('privacyText')}</p><p>Public IP and ISP information is requested only after you click <strong>Show IP & ISP</strong>. Other metadata such as browser and device type is inferred locally. Only your voluntarily exported JSON files enable cross-device comparisons. Connection-quality grades are heuristic; UDP packet loss is not tested without a configured TURN service.</p><p>Cloudflare speed-test source: <a href="https://github.com/cloudflare/speedtest" target="_blank" rel="noreferrer">github.com/cloudflare/speedtest <ArrowUpRight size={14}/></a></p><button className="primary-btn modal-done" onClick={() => setModal(null)}>{t('close')}</button></div></Modal>}

    {modal === 'settings' && <Modal title={t('settings')} onClose={() => setModal(null)}><div className="settings-content"><p className="settings-intro">{t('settingsDesc')}</p>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Sun size={19}/></div><div><strong>{t('appearance')}</strong></div></div><div className="segmented"><button className={preferences.theme === 'light' ? 'chosen' : ''} onClick={() => setPreferences((p) => ({...p, theme:'light'}))}><Sun size={15}/>{t('light')}</button><button className={preferences.theme === 'dark' ? 'chosen' : ''} onClick={() => setPreferences((p) => ({...p, theme:'dark'}))}><Moon size={15}/>{t('dark')}</button></div></div>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Gauge size={19}/></div><div><strong>{t('units')}</strong><small>All speed readings, charts and exports use megabits per second (1 Mbps = 1,000,000 bits/s).</small></div></div><strong className="fixed-unit">Mbps</strong></div>
      <div className="setting-row setting-row--wrap"><div className="setting-desc"><div className="setting-icon"><Clock3 size={19}/></div><div><strong>Test profile</strong><small>{TEST_PROFILES[preferences.mode]?.description || TEST_PROFILES.standard.description}</small></div></div><div className="segmented">{Object.keys(TEST_PROFILES).map(key=><button key={key} className={preferences.mode === key ? 'chosen' : ''} onClick={() => setPreferences((p) => ({...p, mode:key}))}>{TEST_PROFILES[key].label}</button>)}</div></div>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Download size={19}/></div><div><strong>Approximate data budget</strong><small>{plannedMb} MB of planned payload. Actual network use may be higher.</small></div></div><select className="setting-select" value={preferences.budgetMb} onChange={e=>setPreferences(p=>({...p,budgetMb:Number(e.target.value)}))}>{[25,50,100,250,500].map(v=><option value={v} key={v}>{v} MB</option>)}</select></div>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Timer size={19}/></div><div><strong>Maximum test time</strong><small>Safety limit, not the expected test duration. Slow networks may need more time.</small></div></div><select className="setting-select" value={preferences.maxSeconds} onChange={e=>setPreferences(p=>({...p,maxSeconds:Number(e.target.value)}))}>{[60,90,180,240].map(v=><option key={v} value={v}>{v} seconds</option>)}</select></div>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Laptop size={19}/></div><div><strong>Device label</strong><small>Used to compare tests across imported devices.</small></div></div><input className="setting-input" value={preferences.deviceLabel} maxLength={48} placeholder="e.g. ASUS laptop" onChange={e=>setPreferences(p=>({...p,deviceLabel:e.target.value}))}/></div>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Wifi size={19}/></div><div><strong>Connection type</strong><small>Choose manually; browsers may not detect the actual connection.</small></div></div><select className="setting-select" value={preferences.networkType} onChange={e=>setPreferences(p=>({...p,networkType:e.target.value}))}>{['Unknown','Wi-Fi','Mobile data','Ethernet','Other'].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
      <div className="setting-row"><div className="setting-desc"><div className="setting-icon"><Zap size={19}/></div><div><strong>{t('autoStart')}</strong><small>{t('autoStartDesc')}</small></div></div><button aria-label={t('autoStart')} role="switch" aria-checked={preferences.autoStart} className={`switch ${preferences.autoStart ? 'switch--on' : ''}`} onClick={() => setPreferences((p) => ({...p, autoStart: !p.autoStart}))}><span/></button></div>
      <div className="setting-note"><Info size={18}/>{t('dataNotice')}</div><button className="primary-btn modal-done" onClick={() => setModal(null)}><Check size={17}/>{t('close')}</button>
    </div></Modal>}
    {modal === 'install' && <Modal title="Install Speedly" onClose={() => setModal(null)}><div className="privacy-content"><div className="modal-illustration"><Smartphone size={30}/></div><p>On iPhone or iPad, open Speedly in Safari, tap Share, then <strong>Add to Home Screen</strong>. On Android, use the browser menu and select <strong>Install app</strong> or <strong>Add to Home screen</strong>. On desktop, look for your browser's install icon in the address bar.</p><p>Installation requires HTTPS in production (or localhost). Speed measurements still need an internet connection.</p><button className="primary-btn modal-done" onClick={() => setModal(null)}>Got it</button></div></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

export default App;
