"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// PDF.js CDN configuration
const PDF_VERSION = "3.11.174";
const PDF_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.min.js`;
const WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_VERSION}/pdf.worker.min.js`;

const WhiteboardViewer = ({ pdfUrl, onClose }) => {
  const { toast } = useToast();
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentTool, setCurrentTool] = useState("pen"); // 'pen' | 'highlighter' | 'eraser' | 'text-notes'
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(2);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [canvas, setCanvas] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notesPlainText, setNotesPlainText] = useState("");
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const notesContainerRef = useRef(null);
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const pageStatesRef = useRef({}); // per-page annotation JSON

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
    bgCanvasRef.current.style.transformOrigin = "top left";

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
      console.log(
        "loadPdfJs: using existing window.pdfjsLib",
        window.pdfjsLib && window.pdfjsLib.version
      );
      return window.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDF_URL;
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js"));
      document.head.appendChild(script);
    });
  };

  const initializeCanvas = async () => {
    if (typeof window === "undefined") return null;
    if (!containerRef.current) return null;
    try {
      let fabricImport = await import("fabric");
      // Some builds put fabric under .default
      const fabric = fabricImport.default
        ? fabricImport.default
        : fabricImport.fabric
        ? fabricImport.fabric
        : fabricImport;
      console.log("WHITEBOARD_FABRIC_IMPORT", fabric);
      if (!canvasRef.current) {
        console.warn("initializeCanvas: canvasRef not ready");
        return null;
      }
      const widthFallback =
        (containerRef.current && containerRef.current.offsetWidth) || 800;
      const heightFallback =
        (containerRef.current && containerRef.current.offsetHeight) || 600;
      if (!fabric || !fabric.Canvas) {
        console.error("WHITEBOARD_FABRIC_CANVAS_UNDEFINED", { fabric });
        return null;
      }
      // create fabric canvas
      const newCanvas = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: currentTool !== "text-notes",
      });
      newCanvas.setWidth(widthFallback);
      newCanvas.setHeight(heightFallback);
      // default brush
      newCanvas.freeDrawingBrush = new fabric.PencilBrush(newCanvas);
      newCanvas.freeDrawingBrush.width = brushSize;
      newCanvas.freeDrawingBrush.color = brushColor;
      // log some canvas events to help debug drawing activity
      try {
        newCanvas.on("mouse:down", () =>
          console.log("WHITEBOARD_CANVAS_MOUSE_DOWN")
        );
        newCanvas.on("mouse:up", () =>
          console.log("WHITEBOARD_CANVAS_MOUSE_UP")
        );
        newCanvas.on("path:created", () =>
          console.log("WHITEBOARD_CANVAS_PATH_CREATED")
        );
      } catch (e) {
        console.warn("WHITEBOARD_EVENT_ATTACH_FAILED", e);
      }
      setCanvas(newCanvas);
      console.log("initializeCanvas: fabric canvas created", {
        width: newCanvas.getWidth(),
        height: newCanvas.getHeight(),
      });

      return newCanvas;
    } catch (err) {
      console.error("initializeCanvas error", err);
      return null;
    }
  };

  // Load and render PDF page to background canvas
  const renderPdfPage = async (url, pageNumber) => {
    if (typeof window === "undefined") return;

    // Wait for container and bg/canvas refs to be attached (avoid early return which caused black screen)
    const maxAttempts = 20;
    let attempt = 0;
    while (
      (!containerRef.current || !bgCanvasRef.current || !canvasRef.current) &&
      attempt < maxAttempts
    ) {
      // wait a short time for the DOM to mount
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 50));
      attempt += 1;
    }

    if (!containerRef.current) {
      console.warn("renderPdfPage: containerRef not available after wait");
      return;
    }

    try {
      setIsLoading(true);
      console.log("renderPdfPage: start", { url, pageNumber });

      // Initialize PDF.js if needed
      const pdfjs = await loadPdfJs();
      console.log("renderPdfPage: pdfjs loaded", pdfjs && pdfjs.version);
      if (!pdfjs) {
        throw new Error("pdfjs not available after load");
      }
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
      } catch (e) {
        // ignore worker assignment failures
      }

      const loadingTask = pdfjs.getDocument(url);
      const pdf = await loadingTask.promise;
      console.log("renderPdfPage: pdf loaded numPages=", pdf.numPages);
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);

      const page = await pdf.getPage(pageNumber);
      // guard: determine container width, fall back if zero
      const containerWidthRaw =
        containerRef.current.offsetWidth ||
        containerRef.current.clientWidth ||
        0;
      const containerWidth =
        containerWidthRaw > 10
          ? containerWidthRaw
          : Math.min(window.innerWidth * 0.8, 1200);
      const viewport = page.getViewport({ scale: 1 });
      // Base scale calculation, will be modified by zoom
      const scale = (containerWidth - 40) / viewport.width; // Account for padding
      const scaledViewport = page.getViewport({ scale });

      const canvasEl = bgCanvasRef.current;
      if (!canvasEl) {
        console.warn("renderPdfPage: bgCanvasRef not ready");
        setIsLoading(false);
        return;
      }
      canvasEl.width = Math.round(scaledViewport.width);
      canvasEl.height = Math.round(scaledViewport.height);
      canvasEl.style.width = `${Math.round(scaledViewport.width)}px`;
      canvasEl.style.height = `${Math.round(scaledViewport.height)}px`;
      canvasEl.style.position = "absolute";
      canvasEl.style.left = "0";
      canvasEl.style.top = "0";
      canvasEl.style.zIndex = "0";

      const renderContext = {
        canvasContext: canvasEl.getContext("2d"),
        viewport: scaledViewport,
      };
      await page.render(renderContext).promise;
      console.log("renderPdfPage: page rendered to bg canvas", {
        width: canvasEl.width,
        height: canvasEl.height,
      });
      try {
        console.log("WHITEBOARD_BG_CANVAS_UPDATED");
      } catch (e) {}

      // Resize and clear fabric canvas to match background
      if (!canvas) {
        // try to initialize canvas if it wasn't ready yet
        const created = await initializeCanvas();
        if (created) {
          created.setWidth(canvasEl.width);
          created.setHeight(canvasEl.height);
          created.calcOffset && created.calcOffset();
          created.backgroundColor = "rgba(0,0,0,0)";
          created.renderAll();
          console.log(
            "renderPdfPage: initialized and resized fabric canvas to match bg"
          );
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
          canvas.backgroundColor = "rgba(0,0,0,0)";
          // When switching pages, restore per-page annotations if any, else clear
          const saved = pageStatesRef.current[pageNumber];
          if (saved) {
            canvas.loadFromJSON(saved, () => {
              canvas.renderAll();
              canvas.isDrawingMode = currentTool !== "text-notes";
              applyBrushSettings();
            });
          } else {
            canvas.clear();
            canvas.renderAll();
          }

          canvas.upperCanvasEl.style.position = "absolute";
          canvas.upperCanvasEl.style.left = "0";
          canvas.upperCanvasEl.style.top = "0";
          canvas.upperCanvasEl.style.zIndex = "10";
          console.log(
            "renderPdfPage: resized fabric canvas to match bg (no clear)"
          );
        } catch (e) {
          console.warn(
            "renderPdfPage: could not resize existing fabric canvas",
            e
          );
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Error rendering PDF page:", err);
    }
  };

  // Ensure pdfjs worker is set on client only
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("pdfjs-dist/legacy/build/pdf").then((pdfjs) => {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleToolChange = async (tool) => {
    setCurrentTool(tool);
    if (!canvas) return;

    // determine drawing mode: pen, highlighter, eraser are drawing; text-notes is object/text mode
    const drawingTools = ["pen", "highlighter", "eraser"];
    canvas.isDrawingMode = drawingTools.includes(tool);

    if (typeof window === "undefined") return;
    let fabricImport = await import("fabric");
    const fabric = fabricImport.default
      ? fabricImport.default
      : fabricImport.fabric
      ? fabricImport.fabric
      : fabricImport;

    // Clean previous listeners on canvas (path and mouse handlers)
    try {
      canvas.off("path:created");
    } catch (_) {}
    try {
      canvas.off("mouse:down");
    } catch (_) {}

    switch (tool) {
      case "pen": {
        const pen = new fabric.PencilBrush(canvas);
        pen.color = brushColor;
        pen.width = brushSize;
        canvas.freeDrawingBrush = pen;
        break;
      }
      case "highlighter": {
        const hl = new fabric.PencilBrush(canvas);
        hl.color = "rgba(255,255,0,0.4)";
        hl.width = 15;
        hl.opacity = 0.4;
        canvas.freeDrawingBrush = hl;
        break;
      }
      case "eraser": {
        // Eraser: create a brush that draws a path which is then removed immediately
        // This erases only the stroke being drawn, not entire connected lines
        const eraser = new fabric.PencilBrush(canvas);
        eraser.width = 20;
        eraser.color = "rgba(255,255,255,0.2)"; // very light/transparent so user sees erase cursor
        canvas.freeDrawingBrush = eraser;

        // When a path is created by eraser, immediately remove it and any overlapping objects
        canvas.on("path:created", (e) => {
          try {
            const eraserPath = e.path;
            // Get bounds of the eraser stroke
            const bounds = eraserPath.getBoundingRect();
            // Remove the eraser path itself (no visible mark)
            canvas.remove(eraserPath);

            // Find all objects that intersect with eraser bounds and remove them
            const objectsToRemove = [];
            canvas.forEachObject((obj) => {
              if (obj === eraserPath) return;
              try {
                const objBounds = obj.getBoundingRect();
                // Check if bounds intersect
                const intersects = !(
                  bounds.left > objBounds.left + objBounds.width ||
                  bounds.left + bounds.width < objBounds.left ||
                  bounds.top > objBounds.top + objBounds.height ||
                  bounds.top + bounds.height < objBounds.top
                );
                if (intersects) {
                  objectsToRemove.push(obj);
                }
              } catch (_) {}
            });
            objectsToRemove.forEach((obj) => canvas.remove(obj));
            canvas.requestRenderAll();
          } catch (err) {
            console.warn("Eraser error:", err);
          }
        });
        break;
      }
      case "text-notes": {
        // Disable drawing mode for text tool - focus only on notes textarea
        canvas.isDrawingMode = false;

        // Auto-focus the notes textarea in right panel
        if (notesContainerRef.current) {
          const ta = notesContainerRef.current.querySelector(
            "textarea[data-notes-input]"
          );
          if (ta) {
            setTimeout(() => {
              ta.focus();
              // Place cursor at end
              ta.selectionStart = ta.value.length;
              ta.selectionEnd = ta.value.length;
            }, 50);
          }
        }
        break;
      }
      default:
        break;
    }
  };

  const saveCurrentPageState = () => {
    try {
      if (canvas && currentPage) {
        const state = canvas.toJSON();
        if (state && state.objects && state.objects.length > 0) {
          pageStatesRef.current[currentPage] = state;
        } else {
          delete pageStatesRef.current[currentPage];
        }
      }
    } catch (e) {
      console.warn("Failed to save page state", e);
    }
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

  const handleCopyNotes = () => {
    if (!notesPlainText) {
      toast({
        title: "No notes to copy",
        description: "Please add some notes first.",
        variant: "default",
      });
      return;
    }
    
    navigator.clipboard.writeText(notesPlainText)
      .then(() => {
        toast({
          title: "Copied!",
          description: "Notes copied to clipboard.",
          variant: "default",
        });
      })
      .catch((err) => {
        console.error("Failed to copy notes:", err);
        toast({
          title: "Copy failed",
          description: "Could not copy notes to clipboard.",
          variant: "destructive",
        });
      });
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
              variant={currentTool === "pen" ? "default" : "outline"}
              onClick={() => handleToolChange("pen")}
            >
              Pen
            </Button>
            <div className="border-l mx-2"></div>
            <Button
              variant={currentTool === "highlighter" ? "default" : "outline"}
              onClick={() => handleToolChange("highlighter")}
            >
              Highlighter
            </Button>
            <Button
              variant={currentTool === "eraser" ? "default" : "outline"}
              onClick={() => handleToolChange("eraser")}
            >
              Eraser
            </Button>
            <Button
              variant={currentTool === "text-notes" ? "default" : "outline"}
              onClick={() => handleToolChange("text-notes")}
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
                if (canvas?.freeDrawingBrush)
                  canvas.freeDrawingBrush.color = e.target.value;
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
                if (canvas?.freeDrawingBrush)
                  canvas.freeDrawingBrush.width = val;
              }}
            />
            <div className="border-l mx-2"></div>
            <Button onClick={handleUndo} variant="outline">
              Undo
            </Button>
            <Button onClick={handleClearAll} variant="outline">
              Clear All
            </Button>
            <div className="border-l mx-2"></div>
            <Button onClick={handleZoomOut} variant="outline" className="px-3">
              <span className="text-lg">-</span>
            </Button>
            <Button
              onClick={handleFitToScreen}
              variant="outline"
              className="px-3"
            >
              <span className="text-sm">Fit</span>
            </Button>
            <Button onClick={handleZoomIn} variant="outline" className="px-3">
              <span className="text-lg">+</span>
            </Button>
            <div className="border-l mx-2"></div>
            <Button onClick={toggleFullScreen}>
              {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 h-full">
              {/* Left: PDF page with overlay */}
              <div
                className="relative overflow-auto border rounded-md"
                style={{ minHeight: "400px" }}
              >
                <div className="relative" style={{ padding: "20px" }}>
                  <canvas
                    ref={bgCanvasRef}
                    className="absolute left-0 top-0 z-0"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute left-0 top-0 z-10"
                  />
                </div>
              </div>

              {/* Right: Professional Notes Editor Panel */}
              <div className="flex flex-col bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-base font-semibold text-gray-800">
                    📝 Notes
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Add your notes and observations here
                  </p>
                </div>

                {/* Text Editor Area */}
                <textarea
                  ref={notesContainerRef}
                  data-notes-input
                  value={notesPlainText}
                  onChange={(e) => {
                    setNotesPlainText(e.target.value);
                    console.log(
                      "Notes updated:",
                      e.target.value.length,
                      "chars"
                    );
                  }}
                  placeholder="Click here to start typing your notes..."
                  className="flex-1 p-4 outline-none resize-none text-base leading-relaxed"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    fontSize: "15px",
                  }}
                />

                {/* Footer with Character Count */}
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs text-gray-600">
                    {notesPlainText.length} characters •{" "}
                    {notesPlainText.split("\n").length} lines
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyNotes}
                      className="text-xs px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setNotesPlainText("")}
                      className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <div className="flex gap-2">
              <Button disabled={currentPage <= 1} onClick={gotoPrev}>
                Previous
              </Button>
              <Button disabled={currentPage >= numPages} onClick={gotoNext}>
                Next
              </Button>
              <span className="self-center">
                Page {currentPage} of {numPages}
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhiteboardViewer;
