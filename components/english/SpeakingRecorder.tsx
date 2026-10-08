// Inherits the client boundary from EnglishRoom; callbacks never cross a server boundary.

import { useEffect, useRef, useState } from "react";
import { DownloadSimpleIcon, MicrophoneIcon, StopIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/locale";
import { formatPracticeTime } from "@/lib/english";

export function SpeakingRecorder({ disabled, onRecording, onUnsavedFile }: {
  disabled: boolean; onRecording: (active: boolean) => void; onUnsavedFile: (exists: boolean) => void;
}) {
  const { locale } = useLocale();
  const c = (vi: string, en: string) => locale === "vi" ? vi : en;
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState("");
  const [mime, setMime] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const objectUrl = useRef("");
  const mounted = useRef(false);
  const locked = useRef(false);
  const requestVersion = useRef(0);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacks = useRef({ onRecording, onUnsavedFile });
  callbacks.current = { onRecording, onUnsavedFile };
  function clearTimers() {
    if (limit.current) clearTimeout(limit.current);
    if (ticker.current) clearInterval(ticker.current);
  }
  useEffect(() => {
    const requests = requestVersion;
    mounted.current = true;
    return () => {
      mounted.current = false;
      requests.current++;
      clearTimers();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  function stop() { if (recorder.current?.state === "recording") recorder.current.stop(); }
  function cancelPermission() {
    requestVersion.current++; locked.current = false; setPending(false);
    callbacks.current.onRecording(false);
  }
  async function start() {
    if (locked.current || disabled) return;
    if (url && !window.confirm(c("Ghi lại sẽ thay thế bản ghi hiện tại. Bạn đã tải bản ghi cần giữ chưa?", "Recording again replaces this clip. Have you downloaded the one you want to keep?"))) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(c("Trình duyệt chưa hỗ trợ ghi âm. Dùng HTTPS và Safari/Chrome mới; bạn vẫn có thể luyện nói và lưu tự nhận xét.", "Recording is unavailable. Use HTTPS and a recent Safari/Chrome; you can still practise and save a reflection."));
      return;
    }
    const version = ++requestVersion.current;
    locked.current = true; setPending(true); setError(""); callbacks.current.onRecording(true);
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || version !== requestVersion.current) { audio.getTracks().forEach(track => track.stop()); return; }
      stream.current = audio;
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(t => MediaRecorder.isTypeSupported(t));
      const next = type ? new MediaRecorder(audio, { mimeType: type }) : new MediaRecorder(audio);
      const chunks: BlobPart[] = [];
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        clearTimers(); audio.getTracks().forEach(track => track.stop());
        locked.current = false;
        if (!mounted.current) return;
        setRecording(false); callbacks.current.onRecording(false);
        const blob = new Blob(chunks, { type: next.mimeType || "audio/webm" });
        if (!blob.size) { setError(c("Bản ghi trống. Kiểm tra micro và thử lại.", "The recording is empty. Check your microphone and retry.")); return; }
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = URL.createObjectURL(blob); setUrl(objectUrl.current); setMime(blob.type);
        callbacks.current.onUnsavedFile(true);
      };
      next.onerror = () => {
        stop(); clearTimers(); audio.getTracks().forEach(track => track.stop());
        locked.current = false; setRecording(false); callbacks.current.onRecording(false);
        setError(c("Ghi âm bị gián đoạn. Kiểm tra bản ghi và thử lại.", "Recording was interrupted. Check the clip and retry."));
      };
      recorder.current = next; next.start(); setSeconds(0); setRecording(true);
      const started = Date.now();
      ticker.current = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
      limit.current = setTimeout(() => next.state === "recording" && next.stop(), 300000);
    } catch {
      if (version !== requestVersion.current) return;
      stream.current?.getTracks().forEach(track => track.stop());
      locked.current = false;
      if (mounted.current) {
        callbacks.current.onRecording(false);
        setError(c("Không mở được micro. Cho phép quyền micro, đóng ứng dụng đang dùng micro rồi thử lại.", "Could not open your microphone. Allow microphone access, close other apps using it and retry."));
      }
    } finally { if (mounted.current && version === requestVersion.current) setPending(false); }
  }
  return <section className="space-y-4" aria-label={c("Ghi âm luyện nói", "Speaking recorder")}>
    <p className="text-sm leading-relaxed text-subtle">{c("Bản ghi chỉ ở tab này, tối đa 5 phút. Tải xuống để giữ; máy chủ chỉ lưu tự nhận xét, không lưu audio hoặc chấm phát âm.", "Clips stay in this tab, up to 5 minutes. Download to keep them; the server stores only your reflection, not audio or pronunciation scores.")}</p>
    <div className="flex flex-wrap items-center gap-4">
      {recording ? <button type="button" className="kg-secondary inline-flex items-center gap-2" onClick={stop}><StopIcon size={20} aria-hidden />{c("Dừng ghi", "Stop recording")} · {formatPracticeTime(seconds)}</button>
        : <button type="button" className="kg-button inline-flex items-center gap-2" onClick={() => void start()} disabled={disabled || pending}><MicrophoneIcon size={20} aria-hidden />{pending ? c("Đang mở micro…", "Opening microphone…") : c("Bắt đầu ghi âm", "Start recording")}</button>}
      {pending && <button type="button" className="kg-secondary" onClick={cancelPermission}>{c("Huỷ mở micro", "Cancel microphone request")}</button>}
      <span role="status" className="text-sm text-subtle">{recording ? c("Micro đang bật", "Microphone is on") : c("Micro chỉ bật khi bạn chọn ghi âm", "Microphone starts only with your permission")}</span>
    </div>
    {url && <div className="space-y-3"><audio controls src={url} aria-label={c("Nghe lại bản ghi", "Play your recording")} className="w-full" /><a href={url} download={`english-speaking.${mime.includes("mp4") ? "m4a" : "webm"}`} onClick={() => callbacks.current.onUnsavedFile(false)} className="inline-flex min-h-11 items-center gap-2 font-medium text-accent underline underline-offset-4"><DownloadSimpleIcon size={20} aria-hidden />{c("Tải bản ghi", "Download recording")}</a></div>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}
