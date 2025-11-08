"use client"

"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// PDF.js CDN configuration
const PDF_VERSION = '3.11.174';
const PDF_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.min.js`;
const WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.worker.min.js`;

const WhiteboardViewer = ({ pdfUrl, onSave, onClose }) => {
  // quick console signal for debugging in the browser
  console.log('WHITEBOARD_VIEWER_MOUNT', { pdfUrl });
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'text-notes'
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvas, setCanvas] = useState(null);
  const [notesCanvas, setNotesCanvas] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notesPlainText, setNotesPlainText] = useState('');
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const notesCanvasRef = useRef(null);
  const notesContainerRef = useRef(null);
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const pageStatesRef = useRef({}); // per-page annotation JSON
  const notesTextHandlerRef = useRef(null);
  // Overlay & complex editing removed in favor of a simple textarea

  // Zoom control functions
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 0.1, 2.0); // Max zoom 200%
    setZoomLevel(newZoom);
    updateCanvasZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.1, 0.5); // Min zoom 50%
    setZoomLevel(newZoom);
    updateCanvasZoom(newZoom);
  };

  const handleFitToScreen = () => {
    if (!containerRef.current || !bgCanvasRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const pageWidth = bgCanvasRef.current.width / zoomLevel;
    const pageHeight = bgCanvasRef.current.height / zoomLevel;
    
    const widthRatio = containerWidth / pageWidth;
    const heightRatio = containerHeight / pageHeight;
    const newZoom = Math.min(widthRatio, heightRatio, 1.0); // Don't zoom more than 100%
    
    setZoomLevel(newZoom);
    updateCanvasZoom(newZoom);
  };

  const updateCanvasZoom = (zoom) => {
    if (!canvas || !bgCanvasRef.current) return;

    const width = bgCanvasRef.current.width;
    const height = bgCanvasRef.current.height;

    // Update background canvas scale
    bgCanvasRef.current.style.transform = `scale(${zoom})`;
    bgCanvasRef.current.style.transformOrigin = 'top left';

    // Update fabric canvas scale
    canvas.setZoom(zoom);
    canvas.setWidth(width * zoom);
    canvas.setHeight(height * zoom);
    canvas.renderAll();
  };

  const applyBrushSettings = () => {
    try {
      if (canvas?.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = brushColor;
      }
    } catch (_) {}
  };

  // Undo and Clear All logic
  const handleUndo = () => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  };

  const handleClearAll = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.renderAll();
  };

  const loadPdfJs = async () => {
    if (window.pdfjsLib) {
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      }
      console.log('loadPdfJs: using existing window.pdfjsLib', window.pdfjsLib && window.pdfjsLib.version);
      return window.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDF_URL;
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  };

  const initializeCanvas = async () => {
    if (typeof window === 'undefined') return null;
    if (!containerRef.current) return null;
    try {
      let fabricImport = await import('fabric');
      // Some builds put fabric under .default
      const fabric = fabricImport.default ? fabricImport.default : fabricImport.fabric ? fabricImport.fabric : fabricImport;
      console.log('WHITEBOARD_FABRIC_IMPORT', fabric);
      if (!canvasRef.current) {
        console.warn('initializeCanvas: canvasRef not ready');
        return null;
      }
      const widthFallback = (containerRef.current && containerRef.current.offsetWidth) || 800;
      const heightFallback = (containerRef.current && containerRef.current.offsetHeight) || 600;
      if (!fabric || !fabric.Canvas) {
        console.error('WHITEBOARD_FABRIC_CANVAS_UNDEFINED', { fabric });
        return null;
      }
      // create fabric canvas
      const newCanvas = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: currentTool !== 'text-notes',
      });
      newCanvas.setWidth(widthFallback);
      newCanvas.setHeight(heightFallback);
      // default brush
  newCanvas.freeDrawingBrush = new fabric.PencilBrush(newCanvas);
  newCanvas.freeDrawingBrush.width = brushSize;
  newCanvas.freeDrawingBrush.color = brushColor;
      // log some canvas events to help debug drawing activity
      try {
        newCanvas.on('mouse:down', () => console.log('WHITEBOARD_CANVAS_MOUSE_DOWN'));
        newCanvas.on('mouse:up', () => console.log('WHITEBOARD_CANVAS_MOUSE_UP'));
        newCanvas.on('path:created', () => console.log('WHITEBOARD_CANVAS_PATH_CREATED'));
      } catch (e) {
        console.warn('WHITEBOARD_EVENT_ATTACH_FAILED', e);
      }
      setCanvas(newCanvas);
      console.log('initializeCanvas: fabric canvas created', {
        width: newCanvas.getWidth(),
        height: newCanvas.getHeight(),
      });

      // Create a separate notes canvas on the right
      if (notesCanvasRef.current) {
        const nCanvas = new fabric.Canvas(notesCanvasRef.current, {
          isDrawingMode: false, // notes area is text-only
        });
        // Set a reasonable default size; will stretch via CSS
        nCanvas.setWidth(500);
        nCanvas.setHeight(heightFallback);
        nCanvas.backgroundColor = '#ffffff';
        nCanvas.renderAll();
        // Ensure keyboard focus can be applied to canvas for IText editing
        try {
          nCanvas.upperCanvasEl.setAttribute('tabindex', '0');
          nCanvas.upperCanvasEl.style.outline = 'none';
        } catch (_) {}
        setNotesCanvas(nCanvas);
      }
      return newCanvas;
    } catch (err) {
      console.error('initializeCanvas error', err);
      return null;
    }
  };

  // Load and render PDF page to background canvas
  const renderPdfPage = async (url, pageNumber) => {
    if (typeof window === 'undefined') return;

    // Wait for container and bg/canvas refs to be attached (avoid early return which caused black screen)
    const maxAttempts = 20;
    let attempt = 0;
    while ((!containerRef.current || !bgCanvasRef.current || !canvasRef.current) && attempt < maxAttempts) {
      // wait a short time for the DOM to mount
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 50));
      attempt += 1;
    }

    if (!containerRef.current) {
      console.warn('renderPdfPage: containerRef not available after wait');
      return;
    }

    try {
  setIsLoading(true);
  console.log('renderPdfPage: start', { url, pageNumber });
      
      // Initialize PDF.js if needed
  const pdfjs = await loadPdfJs();
  console.log('renderPdfPage: pdfjs loaded', pdfjs && pdfjs.version);
      if (!pdfjs) {
        throw new Error('pdfjs not available after load');
      }
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
      } catch (e) {
        // ignore worker assignment failures
      }

  const loadingTask = pdfjs.getDocument(url);
    const pdf = await loadingTask.promise;
  console.log('renderPdfPage: pdf loaded numPages=', pdf.numPages);
    pdfRef.current = pdf;
    setNumPages(pdf.numPages);

  const page = await pdf.getPage(pageNumber);
    // guard: determine container width, fall back if zero
    const containerWidthRaw = containerRef.current.offsetWidth || containerRef.current.clientWidth || 0;
    const containerWidth = containerWidthRaw > 10 ? containerWidthRaw : Math.min(window.innerWidth * 0.8, 1200);
    const viewport = page.getViewport({ scale: 1 });
    // Base scale calculation, will be modified by zoom
    const scale = (containerWidth - 40) / viewport.width; // Account for padding
    const scaledViewport = page.getViewport({ scale });

      const canvasEl = bgCanvasRef.current;
      if (!canvasEl) {
        console.warn('renderPdfPage: bgCanvasRef not ready');
        setIsLoading(false);
        return;
      }
      canvasEl.width = Math.round(scaledViewport.width);
      canvasEl.height = Math.round(scaledViewport.height);
      canvasEl.style.width = `${Math.round(scaledViewport.width)}px`;
      canvasEl.style.height = `${Math.round(scaledViewport.height)}px`;
      canvasEl.style.position = 'absolute';
      canvasEl.style.left = '0';
      canvasEl.style.top = '0';
      canvasEl.style.zIndex = '0';

      const renderContext = {
        canvasContext: canvasEl.getContext('2d'),
        viewport: scaledViewport,
      };
  await page.render(renderContext).promise;
  console.log('renderPdfPage: page rendered to bg canvas', { width: canvasEl.width, height: canvasEl.height });
  try {
    console.log('WHITEBOARD_BG_CANVAS_UPDATED');
  } catch (e) {}

      // Resize and clear fabric canvas to match background
      if (!canvas) {
        // try to initialize canvas if it wasn't ready yet
        const created = await initializeCanvas();
        if (created) {
          created.setWidth(canvasEl.width);
          created.setHeight(canvasEl.height);
          created.calcOffset && created.calcOffset();
          created.backgroundColor = 'rgba(0,0,0,0)';
          created.renderAll();
          console.log('renderPdfPage: initialized and resized fabric canvas to match bg');
          // Load page state if present
          const saved = pageStatesRef.current[pageNumber];
          if (saved) {
            created.loadFromJSON(saved, () => created.renderAll());
          } else {
            created.clear();
            created.renderAll();
          }
        }
      } else {
        try {
          // Do NOT clear canvas when resizing or changing page
          canvas.setWidth(canvasEl.width);
          canvas.setHeight(canvasEl.height);
          canvas.calcOffset && canvas.calcOffset();
          canvas.backgroundColor = 'rgba(0,0,0,0)';
          // When switching pages, restore per-page annotations if any, else clear
          const saved = pageStatesRef.current[pageNumber];
          if (saved) {
            canvas.loadFromJSON(saved, () => {
              canvas.renderAll();
              canvas.isDrawingMode = currentTool !== 'text-notes';
              applyBrushSettings();
            });
          } else {
            canvas.clear();
            canvas.renderAll();
          }
          
          canvas.upperCanvasEl.style.position = 'absolute';
          canvas.upperCanvasEl.style.left = '0';
          canvas.upperCanvasEl.style.top = '0';
          canvas.upperCanvasEl.style.zIndex = '10';
          console.log('renderPdfPage: resized fabric canvas to match bg (no clear)');
        } catch (e) {
          console.warn('renderPdfPage: could not resize existing fabric canvas', e);
        }
      }
      // Sync notes canvas height to page height for better alignment
      try {
        if (notesCanvas) {
          notesCanvas.setHeight(canvasEl.height);
          notesCanvas.renderAll();
        }
      } catch (_) {}
      setIsLoading(false);
    } catch (err) {
      console.error('Error rendering PDF page:', err);
    }
  };

  // Ensure pdfjs worker is set on client only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('pdfjs-dist/legacy/build/pdf').then((pdfjs) => {
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        } catch (e) {
          // ignore
        }
      });
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && !canvas) {
      initializeCanvas();
    }

    return () => {
      if (canvas) {
        canvas.dispose();
      }
      if (notesCanvas) {
        notesCanvas.dispose();
      }
    };
  }, [containerRef]);

  // Render PDF when url or page changes
  useEffect(() => {
    if (pdfUrl) {
      // when opening a new PDF start from page 1
      setCurrentPage((p) => (p ? p : 1));
      renderPdfPage(pdfUrl, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  useEffect(() => {
    if (pdfUrl) {
      renderPdfPage(pdfUrl, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleToolChange = async (tool) => {
    setCurrentTool(tool);
    if (!canvas) return;

    // Only PDF annotation canvas can be in drawing mode. Notes canvas stays non-drawing (text only).
    canvas.isDrawingMode = tool !== 'text-notes' && tool !== 'eraser' && tool !== 'highlighter' && tool !== 'pen' ? false : (tool !== 'text-notes');
    if (notesCanvas) notesCanvas.isDrawingMode = false;

    if (typeof window !== 'undefined') {
      let fabricImport = await import('fabric');
      const fabric = fabricImport.default ? fabricImport.default : fabricImport.fabric ? fabricImport.fabric : fabricImport;

      // Clean previous listeners
      canvas.off('path:created');
      if (notesCanvas) {
        notesCanvas.off && notesCanvas.off('path:created');
        if (notesTextHandlerRef.current) {
          notesCanvas.off('mouse:down', notesTextHandlerRef.current);
          notesTextHandlerRef.current = null;
        }
      }

      switch (tool) {
        case 'pen': {
          const pen = new fabric.PencilBrush(canvas);
          pen.color = brushColor;
          pen.width = brushSize;
          canvas.freeDrawingBrush = pen;
          break;
        }
        case 'highlighter': {
          const hl = new fabric.PencilBrush(canvas);
          hl.color = 'rgba(255,255,0,0.4)';
          hl.width = 15;
          hl.opacity = 0.4;
          canvas.freeDrawingBrush = hl;
          break;
        }
        case 'eraser': {
          // Eraser implemented by removing the created path immediately
          const eraser = new fabric.PencilBrush(canvas);
          eraser.color = 'rgba(0,0,0,0)';
          eraser.width = 20;
          canvas.freeDrawingBrush = eraser;
          canvas.on('path:created', (e) => {
            canvas.remove(e.path);
            canvas.renderAll();
          });
          break;
        }
        case 'text-notes': {
          // Just focus the textarea for notes
          if (notesContainerRef.current) {
            const ta = notesContainerRef.current.querySelector('textarea[data-notes-input]');
            if (ta) setTimeout(() => ta.focus(), 0);
          }
          break;
        }
        default:
          break;
      }
    }
  };

  const saveCurrentPageState = () => {
    try {
      if (canvas && currentPage) {
        pageStatesRef.current[currentPage] = canvas.toJSON();
      }
    } catch (e) {
      console.warn('Failed to save page state', e);
    }
  };

  const handleSave = async () => {
    if (!pdfRef.current || !canvas) return;
    // Save current page state before export
    saveCurrentPageState();
    const pdf = pdfRef.current;
    const totalPages = pdf.numPages;

    // Dynamically import jsPDF (ensure dependency added in package.json)
    let jsPDFMod;
    try {
      jsPDFMod = await import('jspdf');
    } catch (e) {
      console.error('jsPDF import failed. Did you install it?', e);
      return;
    }
    const { jsPDF } = jsPDFMod;

    // Determine initial page size from first page
    const first = await pdf.getPage(1);
    const baseScale = 1.5;
    const firstVp = first.getViewport({ scale: baseScale });
    const doc = new jsPDF({ unit: 'px', compress: true, format: [firstVp.width, firstVp.height] });

    for (let p = 1; p <= totalPages; p++) {
      try {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: baseScale });
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = vp.width;
        pageCanvas.height = vp.height;
        const ctx = pageCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        // Create fabric temp canvas to load annotations for this page
        let fabricImport = await import('fabric');
        const fabric = fabricImport.default ? fabricImport.default : fabricImport.fabric ? fabricImport.fabric : fabricImport;
        const tempFabric = new fabric.Canvas(document.createElement('canvas'), { width: vp.width, height: vp.height });
        const savedState = pageStatesRef.current[p];
        if (savedState) {
          await new Promise((res) => tempFabric.loadFromJSON(savedState, () => { tempFabric.renderAll(); res(); }));
        }
        const overlayURL = tempFabric.toDataURL({ format: 'png', multiplier: 1 });
        const overlayImg = new Image();
        await new Promise((res) => { overlayImg.onload = res; overlayImg.src = overlayURL; });
        ctx.drawImage(overlayImg, 0, 0);

        const pageImgData = pageCanvas.toDataURL('image/png');
        if (p === 1) {
          doc.addImage(pageImgData, 'PNG', 0, 0, vp.width, vp.height);
        } else {
          doc.addPage([vp.width, vp.height]);
          doc.addImage(pageImgData, 'PNG', 0, 0, vp.width, vp.height);
        }
        tempFabric.dispose();
      } catch (e) {
        console.warn('Failed to export page', p, e);
      }
    }

    const pdfBlob = doc.output('blob');
    const annotatedPdfUrl = URL.createObjectURL(pdfBlob);
    // Extract notes text objects
    // Notes text comes from the textarea; fall back to any i-text objects on canvas
    let notesText = (notesPlainText || '').trim();
    if (!notesText && notesCanvas) {
      try {
        notesCanvas.getObjects('i-text').forEach((t) => {
          notesText += (t.text || '').trim() + '\n';
        });
        notesText = notesText.trim();
      } catch (_) {}
    }
    const originalFilename = pdfUrl.split('/').pop() || 'material.pdf';
    const newFilename = originalFilename.replace('.pdf', '_annotated.pdf');

    // Pass both annotated pdf blob (converted to base64) and notes text to onSave
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Pdf = reader.result; // data:application/pdf;base64,...
      await onSave({ annotatedPdf: base64Pdf, notesText }, newFilename);
    };
    reader.readAsDataURL(pdfBlob);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Persist current page state before changing page
  const gotoPrev = () => {
    if (currentPage <= 1) return;
    saveCurrentPageState();
    setCurrentPage(currentPage - 1);
  };
  const gotoNext = () => {
    if (!numPages || currentPage >= numPages) return;
    saveCurrentPageState();
    setCurrentPage(currentPage + 1);
  };

  return (
    <Dialog open={true} onOpenChange={onClose} className="max-w-4xl">
      <DialogContent className="max-w-[1200px] w-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Whiteboard Editor</DialogTitle>
          <DialogDescription>
            Edit and annotate the PDF document
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col h-full" ref={containerRef}>
          <div className="flex gap-3 mb-3 flex-wrap items-center">
            <Button
              variant={currentTool === 'pen' ? 'default' : 'outline'}
              onClick={() => handleToolChange('pen')}
            >
              Pen
            </Button>
            <div className="border-l mx-2"></div>
            <Button
              variant={currentTool === 'highlighter' ? 'default' : 'outline'}
              onClick={() => handleToolChange('highlighter')}
            >
              Highlighter
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'outline'}
              onClick={() => handleToolChange('eraser')}
            >
              Eraser
            </Button>
            <Button
              variant={currentTool === 'text-notes' ? 'default' : 'outline'}
              onClick={() => handleToolChange('text-notes')}
            >
              Text (Notes)
            </Button>
            <div className="border-l mx-2"></div>
            <label className="text-sm text-gray-600">Color</label>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => {
                setBrushColor(e.target.value);
                if (canvas?.freeDrawingBrush) canvas.freeDrawingBrush.color = e.target.value;
              }}
            />
            <label className="ml-2 text-sm text-gray-600">Size</label>
            <input
              type="range"
              min="1"
              max="30"
              value={brushSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setBrushSize(val);
                if (canvas?.freeDrawingBrush) canvas.freeDrawingBrush.width = val;
              }}
            />
            <div className="border-l mx-2"></div>
            <Button onClick={handleUndo} variant="outline">Undo</Button>
            <Button onClick={handleClearAll} variant="outline">Clear All</Button>
            <div className="border-l mx-2"></div>
            <Button onClick={handleZoomOut} variant="outline" className="px-3">
              <span className="text-lg">-</span>
            </Button>
            <Button onClick={handleFitToScreen} variant="outline" className="px-3">
              <span className="text-sm">Fit</span>
            </Button>
            <Button onClick={handleZoomIn} variant="outline" className="px-3">
              <span className="text-lg">+</span>
            </Button>
            <div className="border-l mx-2"></div>
            <Button onClick={toggleFullScreen}>
              {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
  // Removed duplicate handler definitions from inside JSX
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 h-full">
              {/* Left: PDF page with overlay */}
              <div className="relative overflow-auto border rounded-md" style={{ minHeight: '400px' }}>
                <div className="relative" style={{ padding: '20px' }}>
                  <canvas ref={bgCanvasRef} className="absolute left-0 top-0 z-0" />
                  <canvas ref={canvasRef} className="absolute left-0 top-0 z-10" />
                </div>
              </div>
              {/* Right: Notes white area */}
              <div className="flex flex-col">
                <div className="text-sm text-gray-600 mb-2">Notes</div>
                <div className="border rounded-md overflow-hidden" style={{ minHeight: '400px' }}>
                  {/* Simple, reliable textarea for notes typing */}
                  <textarea
                    data-notes-input
                    value={notesPlainText}
                    onChange={(e) => setNotesPlainText(e.target.value)}
                    placeholder="Type your notes here..."
                    className="w-full h-40 p-3 outline-none resize-y text-sm"
                    style={{ borderBottom: '1px solid #e5e7eb' }}
                  />
                  {/* Optional drawing space (kept for future shape/text rendering, but disabled for drawing) */}
                  <div ref={notesContainerRef} className="relative">
                    <canvas ref={notesCanvasRef} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <div className="flex gap-2">
              <Button
                disabled={currentPage <= 1}
                onClick={gotoPrev}
              >
                Previous
              </Button>
              <Button
                disabled={currentPage >= numPages}
                onClick={gotoNext}
              >
                Next
              </Button>
              <span className="self-center">
                Page {currentPage} of {numPages}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhiteboardViewer;
