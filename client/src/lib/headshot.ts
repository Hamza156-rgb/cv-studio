const MAX_DIMENSION = 800;
const MAX_BYTES = 2 * 1024 * 1024;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("We could not read that image. Try a JPG, PNG, or WebP file.")); };
    image.src = url;
  });
}

/** Downscales any browser-decodable image to a JPEG data URL that fits the 2 MB upload limit. */
export async function prepareHeadshot(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("We could not process that image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if ((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75 <= MAX_BYTES) return dataUrl;
  }
  throw new Error("That image is too large to use as a headshot.");
}
