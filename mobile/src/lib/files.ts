import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { prepareHeadshot } from "@web/lib/headshot";
import type { PdfFile } from "../api/client";

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("We could not read that file."));
    reader.readAsDataURL(blob);
  });
}

/** Lets the user pick a file; resolves null if they cancel. */
export function pickFile(accept: string) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

/**
 * Takes or chooses a headshot and shrinks it with the website's own resizer, so it always
 * fits the 2 MB upload limit. Resolves null if the user cancels.
 */
export async function pickHeadshot(): Promise<{ fileName: string; dataUrl: string } | null> {
  let file: File | null;
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({ resultType: CameraResultType.Uri, source: CameraSource.Prompt, quality: 90, width: 1200, correctOrientation: true });
      if (!photo.webPath) return null;
      const blob = await (await fetch(photo.webPath)).blob();
      file = new File([blob], `headshot.${photo.format || "jpg"}`, { type: blob.type || "image/jpeg" });
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) return null;
      throw error;
    }
  } else file = await pickFile("image/*");
  if (!file) return null;
  return { fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg", dataUrl: await prepareHeadshot(file) };
}

/** Saves a PDF: on a phone it opens the share sheet (Files, Mail, WhatsApp…); in a browser it downloads. */
export async function savePdf({ blob, fileName }: PdfFile) {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const base64 = (await blobToDataUrl(blob)).split(",")[1];
  const { uri } = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
  await Share.share({ title: fileName, url: uri, dialogTitle: "Save or send your CV" });
}
