/**
 * Finding a colour to glow with.
 *
 * Three strategies, best first. The first two can legitimately fail -- YouTube
 * serves video from googlevideo.com and thumbnails from i.ytimg.com, neither of
 * which hands us a CORS-friendly response, and a tainted canvas throws instead
 * of returning black. So the last one is not a fallback of convenience, it is the
 * path that always works: a stable colour derived from the video id. Every
 * strategy returns the same shape, so nothing downstream cares which one won.
 */
(() => {
  'use strict';

  const SAMPLE = 24; // downscale target; big enough to average, small enough to be fast

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image blocked'));
      img.src = url;
    });
  }

  function pixels(source, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h, 0, 0, SAMPLE, SAMPLE);
    // Throws SecurityError if the source was cross-origin without CORS.
    return ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
  }

  function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const [r, g, b] = [
      [v, t, p],
      [q, v, p],
      [p, v, t],
      [p, q, v],
      [t, p, v],
      [v, p, q]
    ][i % 6];
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Average, then push away from grey. A straight average of a thumbnail is
   * almost always mud; the point of the glow is the video's colour, not its
   * average of every colour in the frame.
   */
  function dominant(data, saturationBoost) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    r /= n;
    g /= n;
    b /= n;

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const d = max - min;
    let h = 0;
    let s = 0;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) / 6;
      else h = ((r / 255 - g / 255) / d + 4) / 6;
    }

    s = Math.min(1, s * saturationBoost);
    // Keep it in a band that reads as a glow on black: not black, not white.
    const v = Math.max(0.32, Math.min(0.92, max * 0.9 + 0.18));
    return hsvToRgb(h, s, v);
  }

  function fromVideo(video, saturationBoost) {
    if (!video || !video.videoWidth) return null;
    try {
      return dominant(pixels(video, video.videoWidth, video.videoHeight), saturationBoost);
    } catch {
      return null;
    }
  }

  async function fromThumbnail(videoId, saturationBoost) {
    try {
      const img = await loadImage(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
      return dominant(pixels(img, img.naturalWidth, img.naturalHeight), saturationBoost);
    } catch {
      return null;
    }
  }

  /** Always works, always the same for the same video, never ugly on purpose. */
  function fromId(videoId, saturationBoost) {
    let hash = 0;
    for (let i = 0; i < videoId.length; i++) hash = (hash * 31 + videoId.charCodeAt(i)) >>> 0;
    const h = (hash % 360) / 360;
    return hsvToRgb(h, Math.min(1, 0.55 * saturationBoost), 0.62);
  }

  async function resolve(videoId, video, saturationBoost) {
    const boost = saturationBoost / 100;
    return (
      fromVideo(video, boost) ||
      (videoId ? await fromThumbnail(videoId, boost) : null) ||
      fromId(videoId || 'syt', boost)
    );
  }

  window.SYT_AMBIENT_COLOR = { resolve, fromId };
})();
