"use client";
import { useEffect, useRef } from "react";

export interface LabelData {
    name: string;
    prop1: string;
    prop2: string;
    type: string;
}

interface LabelPreviewProps {
    data: LabelData;
    onBlobReady?: (blob: Blob | null) => void;
    className?: string;
}

export default function LabelPreview({ data, onBlobReady, className }: LabelPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Load Image
        const img = new Image();
        img.src = "/base-label-limpia.png";
        img.crossOrigin = "anonymous";

        img.onload = async () => {
            // 1. Setup Match Dimensions
            canvas.width = img.width;
            canvas.height = img.height;
            const W = img.width;
            const H = img.height;

            // 2. Draw Base
            ctx.drawImage(img, 0, 0);

            // 3. Prepare Font
            await document.fonts.ready;
            const fontName = "Merienda, cursive";

            // 5. Draw Text and Elements
            ctx.textAlign = "center";
            const brandColor = "#963d7b";
            ctx.fillStyle = brandColor;
            ctx.strokeStyle = brandColor;
            ctx.lineWidth = 2;

            // --- TÍTULO (RECTO - NEGRITA) ---
            const fontSizeTitle = W * 0.045;
            ctx.font = `bold ${fontSizeTitle}px ${fontName}`;
            const titleY = H * 0.26;
            ctx.fillText(data.name.toUpperCase(), (W / 2) + (fontSizeTitle / 2), titleY);

            const lineTopY = H * 0.72;
            const lineBottomY = H * 0.83;

            // --- PROPIEDADES (NORMAL) ---
            const fontSizeProps = W * 0.023;
            ctx.font = `400 ${fontSizeProps}px ${fontName}`;
            const propsY = (lineTopY + lineBottomY) / 2 + (fontSizeProps / 3);

            ctx.fillText(data.prop1.toUpperCase(), W * 0.42, propsY);
            ctx.fillText(data.prop2.toUpperCase(), W * 0.62, propsY);

            // --- TIPO (NORMAL) ---
            const fontSizeType = W * 0.023;
            ctx.font = `400 ${fontSizeType}px ${fontName}`;
            const typeY = H * 0.90;
            ctx.fillText(data.type.toUpperCase(), W * 0.52, typeY);

            // Notify Ready
            canvas.toBlob((blob) => {
                if (onBlobReady) onBlobReady(blob);
            });
        };
    }, [data]);

    return <canvas ref={canvasRef} className={`max-w-full h-auto shadow-sm ${className}`} />;
}
