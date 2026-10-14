import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
    onSignatureChange: (signatureDataUrl: string | null) => void;
    height?: number;
    disabled?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
    onSignatureChange,
    height = 160,
    disabled = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [hasDrawnStroke, setHasDrawnStroke] = useState(false);

    // Setup canvas size with DPI scaling for ultra-sharp lines on mobile screens
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(ratio, ratio);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#0f172a'; // slate-900 dark elegant ink
        }
    }, []);

    useEffect(() => {
        initCanvas();
        const handleResize = () => {
            // Note: resizing canvas clears it, but keeping it responsive
            initCanvas();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [initCanvas]);

    // Get pointer coordinates relative to canvas
    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawnStroke(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();

        if (isEmpty) {
            setIsEmpty(false);
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Export as PNG
        if (hasDrawnStroke) {
            setIsEmpty(false);
            const dataUrl = canvas.toDataURL('image/png');
            onSignatureChange(dataUrl);
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
        setHasDrawnStroke(false);
        onSignatureChange(null);
    };

    return (
        <div className="w-full flex flex-col space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <PenTool size={14} className="text-blue-600" />
                    <span>Veli İmzası (Dokunmatik İmza Alanı)</span>
                    <span className="text-red-500 font-bold">*</span>
                </label>

                <div className="flex items-center gap-2">
                    {!isEmpty && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={12} />
                            İmza Alındı
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={clearSignature}
                        disabled={disabled || isEmpty}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        title="İmzayı Temizle"
                    >
                        <RotateCcw size={12} />
                        Temizle
                    </button>
                </div>
            </div>

            <div 
                className={`relative w-full rounded-2xl border-2 transition-all overflow-hidden bg-slate-50/70 ${
                    isEmpty 
                        ? 'border-dashed border-slate-300 hover:border-blue-400' 
                        : 'border-solid border-blue-500 bg-white ring-2 ring-blue-500/10'
                }`}
                style={{ height: `${height}px` }}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                        touchAction: 'none',
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        cursor: disabled ? 'not-allowed' : 'crosshair'
                    }}
                />

                {/* Subtle watermark instruction when empty */}
                {isEmpty && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 select-none p-4 text-center">
                        <PenTool size={26} className="mb-1 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-500">
                            Lütfen bu kutunun içine parmağınızla imzanızı atınız
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                            (Cep telefonundan parmağınızla ekrana dokunarak imzalayabilirsiniz)
                        </span>
                    </div>
                )}

                {/* Dotted Baseline */}
                <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-200 pointer-events-none flex justify-end">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold mr-1">İmza Çizgisi</span>
                </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
                * Bu alana atacağınız imza, öğrenci servis sözleşmesi üzerinde dijital olarak saklanacak ve senet niteliği taşıyan sözleşmenin ayrılmaz bir parçası olacaktır.
            </p>
        </div>
    );
};

export default SignaturePad;
