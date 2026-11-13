// Gravador de Clipes Curtos (Ideia 142): captura stream WebGL do canvas em .webm.

export class ClipRecorder {
  constructor(canvas) {
    this.canvas = canvas;
    this.recorder = null;
    this.chunks = [];
    this.recording = false;
  }

  isSupported() {
    return typeof MediaRecorder !== 'undefined' && typeof this.canvas?.captureStream === 'function';
  }

  start(onAutoStop) {
    if (!this.isSupported() || this.recording) return false;
    try {
      const stream = this.canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      this.chunks = [];
      this.recorder = new MediaRecorder(stream, { mimeType: mime });
      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.onstop = () => {
        this.recording = false;
        const blob = new Blob(this.chunks, { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dino-dash-3d-clipe-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        onAutoStop?.();
      };
      this.recorder.start();
      this.recording = true;
      // Limite automático de 12s para manter arquivo leve
      this._timeout = setTimeout(() => this.stop(), 12000);
      return true;
    } catch {
      this.recording = false;
      return false;
    }
  }

  stop() {
    clearTimeout(this._timeout);
    if (this.recorder && this.recording && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
  }
}
