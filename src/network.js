export function browserAndPlatform() {
  const agent = navigator.userAgent || '';
  const browser = /Edg\//.test(agent) ? 'Microsoft Edge' : /OPR\//.test(agent) ? 'Opera'
    : /Firefox\//.test(agent) ? 'Firefox' : /CriOS|Chrome\//.test(agent) ? 'Chrome'
    : /Safari\//.test(agent) ? 'Safari' : 'Unknown browser';
  const platform = navigator.userAgentData?.platform || (/Android/i.test(agent) ? 'Android'
    : /iPad|iPhone|iPod/i.test(agent) ? 'iOS/iPadOS' : /Windows/i.test(agent) ? 'Windows'
    : /Macintosh/i.test(agent) ? 'macOS' : /Linux/i.test(agent) ? 'Linux' : 'Unknown platform');
  const category = /Mobile|iPhone|Android.+Mobile/i.test(agent) ? 'Mobile' : /iPad|Tablet|Android/i.test(agent) ? 'Tablet' : 'Desktop';
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return { browser, platform, category, apiType: connection?.type || null, effectiveType: connection?.effectiveType || null, downlink: connection?.downlink ?? null, online: navigator.onLine };
}
export async function lookupNetwork(signal) {
  const response = await fetch('https://speed.cloudflare.com/meta', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('IP/ISP lookup is unavailable.');
  const data = await response.json();
  return { ip: data.clientIp || data.ip || 'Not returned', isp: data.asOrganization || 'Not returned', asn: data.asn || 'Not returned', city: data.city || '', country: data.country || '', colo: data.colo || '' };
}
