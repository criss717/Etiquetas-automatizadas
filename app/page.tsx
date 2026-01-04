"use client";

import { useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { z } from "zod";
import JSZip from "jszip";
import LabelPreview, { LabelData } from "@/components/LabelPreview";

// Schema definition for client-side type inference
const schema = z.object({
  labels: z.array(z.object({
    name: z.string(),
    prop1: z.string(),
    prop2: z.string(),
    type: z.string(),
  })),
});

export default function Home() {
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [input, setInput] = useState("");
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [blobs, setBlobs] = useState<{ [key: number]: Blob }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingA4, setIsDownloadingA4] = useState(false);

  // Unificar etiquetas de IA y manuales para permitir edición/borrado
  const [aiLabels, setAiLabels] = useState<LabelData[]>([]);

  const { object, submit, isLoading } = useObject({
    api: "/api/generate",
    schema: schema,
    onFinish: (result) => {
      if (result.object?.labels) {
        setApiError(null);
        setAiLabels(result.object.labels as LabelData[]);
      }
    },
    onError: (error) => {
      console.error("Error completo:", error);
      const message = (error as any)?.message || String(error);
      const isQuota = message.toLowerCase().includes("quota") ||
        message.includes("429") ||
        (error as any)?.name === "AI_RetryError";

      if (isQuota) {
        setApiError("⚠️ Has excedido el límite gratuito de Gemini. Por favor, espera un minuto antes de reintentar.");
      } else {
        setApiError("❌ Error de comunicación: " + message.substring(0, 100));
      }
    },
  });

  const currentLabels = mode === 'ai'
    ? (isLoading ? (object?.labels || []) : aiLabels)
    : labels;

  const [manualForm, setManualForm] = useState<LabelData>({
    name: "LAVANDA",
    prop1: "RELAJANTE",
    prop2: "AROMÁTICA",
    type: "CORPORAL",
  });

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setLabels((prev) => [...prev, { ...manualForm }]);
  };

  /**
   * Elimina una etiqueta específica por su índice.
   * También limpia el blob asociado y reindexa el estado de blobs.
   * @param index - El índice de la etiqueta a eliminar
   */
  const handleDeleteLabel = (index: number) => {
    if (mode === 'ai') {
      setAiLabels((prev) => prev.filter((_, i) => i !== index));
    } else {
      setLabels((prev) => prev.filter((_, i) => i !== index));
    }

    // Limpiar y reindexar blobs
    setBlobs((prev) => {
      const newBlobs: { [key: number]: Blob } = {};
      const keys = Object.keys(prev).map(Number).sort((a, b) => a - b);

      // Filtramos la clave que coincide con el índice borrado
      // Y desplazamos las claves superiores una posición hacia abajo
      let newIdx = 0;
      keys.forEach((oldIdx) => {
        if (oldIdx !== index) {
          newBlobs[newIdx] = prev[oldIdx];
          newIdx++;
        }
      });
      return newBlobs;
    });
  };

  const dlZip = async () => {
    if (isDownloadingZip) return;
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("etiquetas");
      const targetLabels = currentLabels;

      let count = 0;
      targetLabels.forEach((label, idx) => {
        const blob = blobs[idx];
        if (blob && folder && label) {
          folder.file(`${label.name}-${idx}.png`, blob);
          count++;
        }
      });
      // ... (rest of the functions remain mostly same, but targetLabels = currentLabels)
      if (count === 0) {
        alert("No hay imágenes listas para descargar. Espera a que se generen.");
        setIsDownloadingZip(false);
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "etiquetas_alquimara.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const generateA4Sheet = async () => {
    if (isDownloadingA4) return;
    setIsDownloadingA4(true);
    try {
      const targetLabels = currentLabels;
      if (targetLabels.length === 0) {
        alert("No hay imágenes renderizadas. Espera un momento.");
        setIsDownloadingA4(false);
        return;
      }

      const A4_WIDTH = 2480;
      const A4_HEIGHT = 3508;
      const LABEL_SIZE = 585; // 5cm
      const MARGIN = 25;
      const SPACING = 20;

      // Cálculo de capacidad
      const cols = Math.floor((A4_WIDTH - 2 * MARGIN + SPACING) / (LABEL_SIZE + SPACING));
      const rows = Math.floor((A4_HEIGHT - 2 * MARGIN + SPACING) / (LABEL_SIZE + SPACING));
      const labelsPerPage = cols * rows; // ~24 etiquetas

      const pages: Blob[] = [];
      const totalPages = Math.ceil(targetLabels.length / labelsPerPage);

      for (let p = 0; p < totalPages; p++) {
        const canvas = document.createElement("canvas");
        canvas.width = A4_WIDTH;
        canvas.height = A4_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        const startIdx = p * labelsPerPage;
        const endIdx = Math.min(startIdx + labelsPerPage, targetLabels.length);

        let x = MARGIN;
        let y = MARGIN;

        for (let i = startIdx; i < endIdx; i++) {
          const blob = blobs[i];
          if (!blob) continue;

          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(blob);
          });

          ctx.drawImage(img, x, y, LABEL_SIZE, LABEL_SIZE);

          x += LABEL_SIZE + SPACING;
          if (x + LABEL_SIZE + MARGIN > A4_WIDTH) {
            x = MARGIN;
            y += LABEL_SIZE + SPACING;
          }
        }

        const pageBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (pageBlob) pages.push(pageBlob);
      }

      if (pages.length === 0) throw new Error("No se generaron páginas");

      if (pages.length === 1) {
        // Descarga directa si es solo una página
        const url = URL.createObjectURL(pages[0]);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "hoja_impresion_A4.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // ZIP si son varias páginas
        const zip = new JSZip();
        pages.forEach((blob, idx) => {
          zip.file(`hoja_A4_${idx + 1}.png`, blob);
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "hojas_impresion_A4.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert("Error al generar las hojas A4");
    } finally {
      setIsDownloadingA4(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-8">
      <header className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold font-merienda text-fuchsia-900 mb-2">
          Alquimara Label Factory
        </h1>
        <p className="text-stone-500">
          Generador automático de etiquetas. Usa IA o modo manual.
        </p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-stone-200">
            <button
              onClick={() => { setMode("ai"); setApiError(null); }}
              className={`flex-1 cursor-pointer py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "ai"
                ? "bg-fuchsia-100 text-fuchsia-900"
                : "text-stone-500 hover:text-stone-700"
                }`}
            >
              ✨ IA Generadora
            </button>
            <button
              onClick={() => { setMode("manual"); setApiError(null); }}
              className={`flex-1 cursor-pointer py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "manual"
                ? "bg-fuchsia-100 text-fuchsia-900"
                : "text-stone-500 hover:text-stone-700"
                }`}
            >
              ✍️ Manual
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
            {mode === "ai" ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-stone-700">
                  ¿Qué etiquetas necesitas hoy?
                </label>
                {apiError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg animate-in fade-in slide-in-from-top-2">
                    {apiError}
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: Hazme una de Romero (capilar, fuerte) y otra de Miel (facial, suave)..."
                  className="w-full h-32 p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent outline-none resize-none"
                />
                <button
                  onClick={() => { setApiError(null); submit({ prompt: input }); }}
                  disabled={isLoading || !input}
                  className="w-full cursor-pointer py-3 bg-linear-to-r from-fuchsia-700 to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? "Generando..." : "Generar Lote"}
                </button>
                {isLoading && (
                  <p className="text-xs text-center text-stone-400 animate-pulse">
                    Consultando a la IA...
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre"
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-fuchsia-200 outline-none font-bold text-fuchsia-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Propiedad 1</label>
                    <input
                      type="text"
                      required
                      placeholder="Propiedad 1"
                      value={manualForm.prop1}
                      onChange={(e) => setManualForm({ ...manualForm, prop1: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-fuchsia-200 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Propiedad 2</label>
                    <input
                      type="text"
                      required
                      placeholder="Propiedad 2"
                      value={manualForm.prop2}
                      onChange={(e) => setManualForm({ ...manualForm, prop2: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-fuchsia-200 outline-none text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Tipo</label>
                  <input
                    type="text"
                    required
                    placeholder="Tipo"
                    value={manualForm.type}
                    onChange={(e) => setManualForm({ ...manualForm, type: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-fuchsia-200 outline-none text-sm"
                  />
                </div>
                <button type="submit"
                  className="w-full cursor-pointer py-3 bg-stone-800 text-white rounded-lg font-medium hover:bg-black transition-all"
                >
                  + Agregar a la Lista
                </button>
              </form>
            )}
          </div>

          <div className="bg-fuchsia-50 p-4 rounded-xl border border-fuchsia-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-fuchsia-900">
                Etiquetas Listas: {currentLabels.length}
              </span>
              <span className="text-xs text-fuchsia-600 bg-fuchsia-200 px-2 py-1 rounded-full">
                {Object.keys(blobs).length} Renderizadas
              </span>
            </div>
            <button
              onClick={dlZip}
              disabled={isDownloadingZip || isDownloadingA4}
              className="w-full cursor-pointer py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 mb-2 disabled:opacity-50"
            >
              {isDownloadingZip ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : "📥"} Descargar ZIP
            </button>
            <button
              onClick={generateA4Sheet}
              disabled={isDownloadingZip || isDownloadingA4}
              className="w-full cursor-pointer py-3 bg-stone-800 hover:bg-black text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDownloadingA4 ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : "📄"} Descargar Hoja A4
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentLabels.map((label, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center relative group overflow-hidden">
                {/* Botón Eliminar */}
                <button
                  onClick={() => handleDeleteLabel(idx)}
                  className="absolute top-2 right-2 p-2 bg-red-50 text-red-500 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-red-100 z-20 cursor-pointer shadow-sm border border-red-100"
                  title="Eliminar etiqueta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>

                <LabelPreview
                  data={label as LabelData}
                  className="w-full max-w-[300px]"
                  onBlobReady={(blob) => {
                    if (blob) {
                      setBlobs((prev) => ({ ...prev, [idx]: blob }));
                    }
                  }}
                />
                <div className="mt-4 text-center">
                  <h3 className="font-bold text-stone-800">{label?.name}</h3>
                  <p className="text-xs text-stone-500 uppercase tracking-widest">{label?.type}</p>
                </div>
              </div>
            ))}
            {currentLabels.length === 0 && (
              <div className="col-span-full h-[calc(100vh-10rem)] py-20 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                <p>No hay etiquetas generadas aún.</p>
                <p className="text-sm">Usa el panel izquierdo para comenzar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
