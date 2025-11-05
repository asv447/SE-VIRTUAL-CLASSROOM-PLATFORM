'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { fabric } from 'fabric';
import { Worker } from '@react-pdf-viewer/core';

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

export default function WhiteboardViewer({ pdfUrl }) {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let pdfDoc = null;
    let canvas = null;

    const initializePDF = async () => {
      try {
        setLoading(true);
        
        // Create fabric.js canvas
        if (!fabricCanvas) {
          canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: true,
            width: 800,
            height: 600,
          });
          setFabricCanvas(canvas);
        }

        // Load and render PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        
        // Get first page
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        // Set canvas dimensions to match PDF page
        canvas.setDimensions({
          width: viewport.width,
          height: viewport.height,
        });

        // Create a separate canvas for PDF rendering
        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        const context = pdfCanvas.getContext('2d');

        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert PDF canvas to fabric.js image
        fabric.Image.fromURL(pdfCanvas.toDataURL(), (img) => {
          img.set({
            selectable: false,
            evented: false,
          });
          canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializePDF();

    // Cleanup
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, [pdfUrl, fabricCanvas]);

  if (error) {
    return <div>Error loading PDF: {error}</div>;
  }

  if (loading) {
    return <div>Loading PDF...</div>;
  }

  return (
    <div className="whiteboard-container">
      <canvas ref={canvasRef} />
      <style jsx>{`
        .whiteboard-container {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f5f5f5;
          padding: 20px;
        }
        canvas {
          border: 1px solid #ccc;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}