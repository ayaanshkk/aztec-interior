"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export interface SignatureData {
  type: 'draw' | 'type' | 'none';
  imageData?: string; // base64 PNG for draw mode
  text?: string;      // typed text for type mode
  name: string;
  date: string;
}

interface SignatureFieldProps {
  customerName?: string;
  date?: string;
  onChange?: (data: SignatureData) => void;
  initialData?: SignatureData;
}

export function SignatureField({ customerName = '', date = '', onChange, initialData }: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'type'>(initialData?.type === 'type' ? 'type' : 'draw');
  const [typedSig, setTypedSig] = useState(initialData?.text || '');
  const [sigName, setSigName] = useState(initialData?.name || customerName);
  const [sigDate, setSigDate] = useState(initialData?.date || date || new Date().toLocaleDateString('en-GB'));
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (customerName && !sigName) setSigName(customerName);
  }, [customerName]);

  // Restore drawn signature from initialData
  useEffect(() => {
    if (initialData?.type === 'draw' && initialData.imageData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasDrawn(true);
      };
      img.src = initialData.imageData;
    }
  }, []);

  const emitChange = useCallback((overrides: Partial<SignatureData> = {}) => {
    if (!onChange) return;
    const canvas = canvasRef.current;
    const imageData = (mode === 'draw' && hasDrawn && canvas)
      ? canvas.toDataURL('image/png')
      : undefined;
    onChange({
      type: mode === 'draw' ? (hasDrawn ? 'draw' : 'none') : (typedSig ? 'type' : 'none'),
      imageData,
      text: typedSig,
      name: sigName,
      date: sigDate,
      ...overrides,
    });
  }, [mode, hasDrawn, typedSig, sigName, sigDate, onChange]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
    if (hasDrawn) emitChange();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    emitChange({ type: 'none', imageData: undefined });
  };

  return (
    <div className="border-t border-gray-200 pt-8 print:pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Authorisation</p>

      {/* Signature row */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 w-40 flex-shrink-0">Customer Signature</span>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${mode === 'draw' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600 border border-gray-200'}`}
            >
              Draw
            </button>
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${mode === 'type' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600 border border-gray-200'}`}
            >
              Type
            </button>
            {mode === 'draw' && hasDrawn && (
              <button type="button" onClick={clearCanvas} className="text-xs text-gray-400 hover:text-red-400 ml-1">Clear</button>
            )}
          </div>
        </div>

        {mode === 'draw' ? (
          <div className="flex-1 relative">
            <canvas
              ref={canvasRef}
              width={900}
              height={100}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              className="w-full h-20 border-b border-gray-300 cursor-crosshair touch-none print:border-gray-400"
              style={{ touchAction: 'none' }}
            />
            {!hasDrawn && (
              <span className="absolute inset-0 flex items-center justify-start pl-1 text-xs text-gray-300 pointer-events-none print:hidden">
                Sign here
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1">
            <input
              type="text"
              value={typedSig}
              onChange={e => { setTypedSig(e.target.value); emitChange({ text: e.target.value, type: e.target.value ? 'type' : 'none' }); }}
              placeholder="Type your full name"
              className="w-full border-b border-gray-300 bg-transparent focus:outline-none focus:border-gray-500 py-1 print:hidden text-sm"
            />
            {typedSig && (
              <div
                className="mt-1 h-12 flex items-center"
                style={{ fontFamily: "'Brush Script MT', 'Bradley Hand', 'Segoe Script', cursive", fontSize: '28px', color: '#1a1a2e' }}
              >
                {typedSig}
              </div>
            )}
            {!typedSig && (
              <div className="hidden print:block border-b border-gray-300 h-12" />
            )}
          </div>
        )}
      </div>

      {/* Customer Name row */}
      <div className="flex items-end gap-6 mb-6">
        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Customer Name</span>
        <div className="flex-1">
          <input
            type="text"
            value={sigName}
            onChange={e => { setSigName(e.target.value); emitChange({ name: e.target.value }); }}
            className="w-full border-b border-gray-300 bg-transparent focus:outline-none focus:border-gray-500 py-1 text-sm text-gray-700 print:border-gray-400"
          />
        </div>
      </div>

      {/* Date row */}
      <div className="flex items-end gap-6">
        <span className="text-sm text-gray-500 w-40 flex-shrink-0">Date</span>
        <div className="flex-1">
          <input
            type="text"
            value={sigDate}
            onChange={e => { setSigDate(e.target.value); emitChange({ date: e.target.value }); }}
            className="w-full border-b border-gray-300 bg-transparent focus:outline-none focus:border-gray-500 py-1 text-sm text-gray-700 print:border-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
