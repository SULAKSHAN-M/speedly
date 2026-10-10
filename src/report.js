import { analyzeQuality } from './diagnostics.js';
import { precisionText } from './precision.js';

function fmtNumber(value, digits=2) { return value == null || !Number.isFinite(value) ? 'Not measured' : value.toFixed(digits); }

// Load the PDF engine only when needed, to keep the main app lighter.
export async function downloadPdfReport(record) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit:'mm', format:'a4' });
  const info = analyzeQuality(record);
  const W=210;
  const drawText = (s,x,y,style='normal',size=10,color=[32,43,59]) => { pdf.setFont('helvetica',style); pdf.setFontSize(size); pdf.setTextColor(...color); pdf.text(String(s),x,y); };
  const section = (title,y) => {pdf.setDrawColor(226,231,237); pdf.line(16,y+2,194,y+2);drawText(title,16,y, 'bold',12,[21,29,42]);return y+13;};
  pdf.setFillColor(237,22,58); pdf.rect(0,0,W,8,'F');
  drawText('SPEEDLY.',16,25,'bold',24,[237,22,58]);
  drawText('NETWORK PERFORMANCE REPORT',16,35,'bold',10,[42,54,72]);
  drawText(new Date(record.timestamp).toLocaleString(),16,42,'normal',9,[105,117,133]);
  drawText(`Grade: ${info.grade}   |   Score: ${info.score ?? 'Unrated'} / 100`,16,55,'bold',14,[24,36,50]);
  drawText(`Evidence: ${info.confidence}`,16,62,'normal',9,[105,117,133]);
  let y=76;
  y=section('SPEED & LATENCY',y);
  const fields=[
    ['Download', `${fmtNumber(record.download == null ? null : record.download / 1e6)} Mbps`],
    ['Upload', `${fmtNumber(record.upload == null ? null : record.upload / 1e6)} Mbps`],
    ['Idle ping', `${fmtNumber(record.ping,1)} ms`],
    ['Loaded download ping', `${fmtNumber(record.loadedPing,1)} ms`],
    ['Loaded upload ping', `${fmtNumber(record.uploadLoadedPing,1)} ms`],
    ['Jitter', `${fmtNumber(record.jitter,1)} ms`],
    ['Bufferbloat delta (HTTP)', `${fmtNumber(info.bufferbloat.delta,1)} ms`],
  ];
  fields.forEach(([name, value],i)=> {if(i%2===0){pdf.setFillColor(247,248,250);pdf.rect(16,y-6,178,9,'F');} drawText(name,20,y,'normal',10); drawText(value,190,y,'bold',10,[23,33,47]); y+=10;});
  y+=6;
  drawText(`Download: ${precisionText(record,'download').slice(0,70)}`,18,y,'normal',8,[100,113,131]); y+=7;
  drawText(`Upload: ${precisionText(record,'upload').slice(0,70)}`,18,y,'normal',8,[100,113,131]); y+=9;
  y=section('ACTIVITY READINESS (ESTIMATES)',y);
  info.applications.forEach(app=> {drawText(app.name,20,y);drawText(`${app.grade}  -  ${app.label}`,190,y,'bold',10,[23,33,47]);y+=10;});
  y+=8;
  if (y > 214) { pdf.addPage(); y = 27; }
  y=section('TEST CONTEXT',y);
  const entries=[['Device',record.deviceLabel||'Unlabeled device'],['Connection',record.networkType||'Unknown'],['Browser',record.browser||'Unknown'],['Platform',record.devicePlatform||'Unknown'],['Profile',record.profile||'Standard'],['Transfer',`${fmtNumber((record.downBytes||0)/1e6,2)} MB down / ${fmtNumber((record.upBytes||0)/1e6,2)} MB up`]];
  entries.forEach(([name,value])=>{drawText(name,20,y,'normal',9,[105,117,133]); drawText(String(value).slice(0,75),190,y,'normal',9,[23,33,47]);y+=8;});
  y+=6;
  if (!Number.isFinite(record.uploadLoadedPing)) {drawText('Upload-loaded latency: not measured to avoid optional probe failures.',16,y,'normal',8,[105,117,133]);y+=8;}
  if (record.partial) {drawText('Partial / interrupted test: scores may be less reliable.',16,y,'bold',9,[207,43,61]);y+=8;}
  // Compact vector graph from actual samples (not illustrative values).
  const pts=(record.downPoints||[]).filter(Number.isFinite).map(v=>v);
  const ups=(record.upPoints||[]).filter(Number.isFinite).map(v=>v);
  if (pts.length>1 || ups.length>1) {
    if(y>228){pdf.addPage();y=26;}
    y=section('BANDWIDTH SAMPLES (Mbps)',y);
    const x0=21,x1=190,y0=y+40,y1=y;
    const peak=Math.max(1,...pts,...ups);
    pdf.setDrawColor(220,225,232); pdf.line(x0,y0,x1,y0); pdf.line(x0,y0,x0,y1);
    const plot=(list,rgb)=>{if(list.length<2)return;pdf.setDrawColor(...rgb);pdf.setLineWidth(.7);
      for(let i=1;i<list.length;i++) pdf.line(x0+(i-1)*(x1-x0)/(list.length-1), y0-list[i-1]/peak*(y0-y1), x0+i*(x1-x0)/(list.length-1), y0-list[i]/peak*(y0-y1));};
    plot(pts,[237,22,58]);plot(ups,[75,116,199]);
    drawText('Red: download    Blue: upload',21,y0+7,'normal',8,[105,117,133]);
  }
  const pages = pdf.internal.getNumberOfPages();
  for (let page=1; page<=pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(226,231,237); pdf.line(16,275,194,275);
    drawText('Developed by SULAKSHAN M',16,283,'bold',9,[237,22,58]);
    drawText('Heuristic grades are guidance only, not an SLA or gaming guarantee.',16,289,'normal',7,[105,117,133]);
    drawText(`${page} / ${pages}`,194,283,'normal',8,[105,117,133]);
  }
  pdf.save(`speedly-report-${record.timestamp.slice(0,10)}.pdf`);
}
