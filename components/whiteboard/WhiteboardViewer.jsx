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
  const [currentTool, setCurrentTool] = useState('pen');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvas, setCanvas] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const pdfRef = useRef(null);

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
        isDrawingMode: true,
      });
      newCanvas.setWidth(widthFallback);
      newCanvas.setHeight(heightFallback);
      // default brush
      newCanvas.freeDrawingBrush = new fabric.PencilBrush(newCanvas);
      newCanvas.freeDrawingBrush.width = 2;
      newCanvas.freeDrawingBrush.color = '#000000';
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
        }
      } else {
        try {
          // Do NOT clear canvas when resizing or changing page
          canvas.setWidth(canvasEl.width);
          canvas.setHeight(canvasEl.height);
          canvas.calcOffset && canvas.calcOffset();
          canvas.backgroundColor = 'rgba(0,0,0,0)';
          canvas.renderAll();
          canvas.upperCanvasEl.style.position = 'absolute';
          canvas.upperCanvasEl.style.left = '0';
          canvas.upperCanvasEl.style.top = '0';
          canvas.upperCanvasEl.style.zIndex = '10';
          console.log('renderPdfPage: resized fabric canvas to match bg (no clear)');
        } catch (e) {
          console.warn('renderPdfPage: could not resize existing fabric canvas', e);
        }
      }
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
      // Do NOT clear canvas when changing page
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleToolChange = async (tool) => {
    setCurrentTool(tool);
    if (!canvas) return;

    canvas.isDrawingMode = true;

    if (typeof window !== 'undefined') {
      let fabricImport = await import('fabric');
      const fabric = fabricImport.default ? fabricImport.default : fabricImport.fabric ? fabricImport.fabric : fabricImport;
      // Remove any previous eraser event listeners
      canvas.off('path:created');
      switch (tool) {
        case 'pen':
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = '#000000';
          canvas.freeDrawingBrush.width = 2;
          break;
        case 'highlighter':
          const highlighterBrush = new fabric.PencilBrush(canvas);
          highlighterBrush.color = 'rgba(255,255,0,0.4)';
          highlighterBrush.width = 15;
          highlighterBrush.opacity = 0.4;
          canvas.freeDrawingBrush = highlighterBrush;
          break;
        case 'eraser':
          // Always remove path after creation for eraser
          const eraserBrush = new fabric.PencilBrush(canvas);
          eraserBrush.color = 'rgba(0,0,0,0)';
          eraserBrush.width = 20;
          canvas.freeDrawingBrush = eraserBrush;
          canvas.on('path:created', (e) => {
            canvas.remove(e.path);
          });
          break;
        default:
          break;
      }
    }
          // Area erase: remove objects under cursor on click/drag
          let isErasing = false;
          let eraseHandler = (opt) => {
            if (!isErasing) return;
            const pointer = canvas.getPointer(opt.e);
            const objects = canvas.getObjects();
            objects.forEach((obj) => {
              if (obj.containsPoint && obj.containsPoint(pointer)) {
                canvas.remove(obj);
              }
            });
            canvas.renderAll();
          };
          canvas.on('mouse:down', () => { isErasing = true; });
          canvas.on('mouse:move', eraseHandler);
          canvas.on('mouse:up', () => { isErasing = false; });
  };

  const handleSave = async () => {
    if (!canvas || !bgCanvasRef.current) return;

    // Composite background PDF canvas and drawing canvas into a single image
    const bg = bgCanvasRef.current;
    const tmp = document.createElement('canvas');
    tmp.width = bg.width;
    tmp.height = bg.height;
    const ctx = tmp.getContext('2d');
    // Draw PDF background
    ctx.drawImage(bg, 0, 0);
    // Draw all visible objects from fabric canvas
    const drawingURL = canvas.toDataURL({ format: 'png', multiplier: 1 });
    const drawingImg = new window.Image();
    drawingImg.onload = async () => {
      ctx.drawImage(drawingImg, 0, 0);
      const dataURL = tmp.toDataURL('image/png');
      // Create a new filename with _edited suffix
      const originalFilename = pdfUrl.split('/').pop();
      const newFilename = originalFilename.replace('.pdf', '_edited.png');
      // Call the onSave callback with the image data and filename
      await onSave(dataURL, newFilename);
    };
    drawingImg.src = drawingURL;
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

  return (
    <Dialog open={true} onOpenChange={onClose} className="max-w-4xl">
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Whiteboard Editor</DialogTitle>
          <DialogDescription>
            Edit and annotate the PDF document
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col h-full" ref={containerRef}>
          <div className="flex gap-2 mb-4 flex-wrap">
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

          <div className="relative flex-1 overflow-auto" style={{ padding: '20px' }}>
            <canvas ref={bgCanvasRef} className="absolute left-0 top-0 z-0" />
            <canvas ref={canvasRef} className="absolute left-0 top-0 z-10" />
          </div>

          <div className="flex justify-between mt-4">
            <div className="flex gap-2">
              <Button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage(currentPage + 1)}
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