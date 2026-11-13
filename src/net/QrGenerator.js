// Gerador de QR Code usando a biblioteca `qrcode` (sem dependências externas de rede).
import QRCode from 'qrcode';

export async function renderQrToCanvas(canvas, text, size = 180) {
  if (!canvas || !text) return;
  try {
    await QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      color: { dark: '#1e1108', light: '#fff6e5' }
    });
  } catch (err) {
    console.warn('QR generation error:', err);
  }
}

export async function generateQrDataUrl(text, size = 180) {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: { dark: '#1e1108', light: '#fff6e5' }
    });
  } catch {
    return '';
  }
}
