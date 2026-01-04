"use client";

import { useState } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { z } from "zod";
import JSZip from "jszip";
import LabelPreview, { LabelData } from "@/components/LabelPreview";

// Schema definition for client-side type inference if needed, 
// though useObject is generic.
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

  const { object, submit, isLoading } = useObject({
    api: "/api/generate",
    schema: schema,
    onFinish: (result) => {
      if (result.object?.labels) {
        // Merge or replace? Let's append if user wants, but for now replace to keep simple loop?
        // UseState 'labels' tracks the confirmed list.
        // 'object' tracks the streaming result.
      }
    },
  });

  // Sync streaming object to labels state for preview
  const currentLabels = object?.labels || labels;

  // Manual Form State
  const [manualForm, setManualForm] = useState<LabelData>({
    name: "LAVANDA",
    prop1: "RELAJANTE",
    prop2: "AROMÁTICA",
    type: "CORPORAL",
  });

  const handleManualAdd = () => {
    setLabels((prev) => [...prev, { ...manualForm }]);
    //reset form
    setManualForm((prev) => ({ ...prev, name: "" }));
  };

  const dlZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder("etiquetas");

    // Check if we have all blobs
    // Note: currentLabels might include streaming partials. verify completeness?
    // We only download what is in 'labels' (manual) or 'object.labels' (ai)
    const targetLabels = mode === 'ai' ? (object?.labels || []) : labels;

    // We need to wait for blobs if they are not ready?
    // Simplified: We rely on the 'blobs' state being populated by the rendered components.

    let count = 0;
    targetLabels.forEach((label, idx) => {
      const blob = blobs[idx];
      if (blob && folder && label) {
        folder.file(`${label.name}-${idx}.png`, blob);
        count++;
      }
    });

    if (count === 0) {
      alert("No hay imágenes listas para descargar. Espera a que se generen.");
      return;
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "etiquetas_alquimara.zip";
    a.click();
    URL.revokeObjectURL(url);
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
        {/* LEFT PANEL: CONTROLS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-stone-200">
            <button
              onClick={() => { setMode("ai"); setLabels([]); }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "ai"
                ? "bg-fuchsia-100 text-fuchsia-900"
                : "text-stone-500 hover:text-stone-700"
                }`}
            >
              ✨ IA Generadora
            </button>
            <button
              onClick={() => { setMode("manual"); }} // Don't clear labels in manual to allow accumulation
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${mode === "manual"
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
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: Hazme una de Romero (capilar, fuerte) y otra de Miel (facial, suave)..."
                  className="w-full h-32 p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent outline-none resize-none"
                />
                <button
                  onClick={() => submit({ prompt: input })}
                  disabled={isLoading || !input}
                  className="w-full py-3 bg-gradient from-fuchsia-700 to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nombre</label>
                  <input
                    type="text"
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
                      value={manualForm.prop1}
                      onChange={(e) => setManualForm({ ...manualForm, prop1: e.target.value.toUpperCase() })}
                      className="w-full p-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-fuchsia-200 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Propiedad 2</label>
                    <input
                      type="text"
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
                    value={manualForm.type}
                    onChange={(e) => setManualForm({ ...manualForm, type: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-stone-300 rounded-md focus:ring-1 focus:ring-fuchsia-200 outline-none text-sm"
                  />
                </div>
                <button
                  onClick={handleManualAdd}
                  className="w-full py-3 bg-stone-800 text-white rounded-lg font-medium hover:bg-black transition-all"
                >
                  + Agregar a la Lista
                </button>
              </div>
            )}
          </div>

          {/* Download Button */}
          <div className="bg-fuchsia-50 p-4 rounded-xl border border-fuchsia-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-fuchsia-900">
                Etiquetas Listas: {mode === 'ai' ? (currentLabels?.length || 0) : labels.length}
              </span>
              <span className="text-xs text-fuchsia-600 bg-fuchsia-200 px-2 py-1 rounded-full">
                {Object.keys(blobs).length} Renderizadas
              </span>
            </div>
            <button
              onClick={dlZip}
              className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2"
            >
              📥 Descargar ZIP
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: PREVIEWS */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(mode === 'ai' ? (currentLabels || []) : labels).map((label, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex flex-col items-center relative group">
                {/* Delete button (Manual mode only?) - Optional */}
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

            {/* Empty State */}
            {((mode === 'ai' && (!currentLabels || currentLabels.length === 0)) || (mode === 'manual' && labels.length === 0)) && (
              <div className="col-span-full py-20 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
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
