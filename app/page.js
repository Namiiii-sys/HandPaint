'use client';
import { useEffect, useState, useRef } from 'react';
import { FaHandPaper, FaHandPointUp, FaHandRock} from 'react-icons/fa'

const Page = () => {

  // ____________CANVAS & VIDEO DOM REFERENCES________
  const drawCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const liveCanvasRef = useRef(null);
  const predictionBuffer = useRef([]);
  const [currentColor, setCurrentColor] = useState('#ff0000');

 
  const [Isloading, setIsloading] = useState(true);
  const [error, setError] = useState(null);

  const prevPos = useRef({ x: null, y: null });
  const pointercolor = useRef('#ff0000');


  // ____________IMPORTING MODEL & MAIN LOGIC_______________

  useEffect(() => {
    let model = null;
    let intervalid = null;

    const initHandtracking = async () => {
      try {
        const handtrack = await import('handtrackjs');
      
        const drawCanvas = drawCanvasRef.current;
        const video = videoRef.current;
        const liveCanvas = liveCanvasRef.current;

        if (!drawCanvas || !video || !liveCanvas) return;

        const contwidth = window.innerWidth / 2;
        const contheight = window.innerHeight;

        drawCanvas.width = contwidth;
        drawCanvas.height = contheight;
        liveCanvas.width = contwidth;
        liveCanvas.height = contheight;

        const drawCtx = drawCanvas.getContext('2d');
        const liveCtx = liveCanvas.getContext('2d');

        const ModelParams = {
          flipHorizontal: true,
          maxNumBoxes: 5,
          iouThreshold: 0.5,
          scoreThreshold: 0.6,
        };
      
        // ________STARTING WEBCAM & MODEL LOADING________

        const status = await handtrack.startVideo(video);
        if (!status) {
          throw new Error('Failed to start the video');
        }

        model = await handtrack.load(ModelParams);
        setIsloading(false);
        console.log('handtrack module', handtrack)

        
      //  _________Helper functions____________

        const getRandomclr = () => {
          const letters = '0123456789ABCDEF';
          let color = '#';
          for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
          }
          return color;
        };

        const resetDrawing = () => {
          prevPos.current = { x: null, y: null };
        };

        const drawfromHand = (x, y, isClosed, isOpen) => {
          if (prevPos.current.x === null || prevPos.current.y === null) {
            prevPos.current = { x, y };
            return;
        }

        if (isOpen) {
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            resetDrawing();
            return;
        }

        if (isClosed) {
           const newColor = getRandomclr();
           pointercolor.current = newColor;
           setCurrentColor(newColor); 
           return;
        }
  
          drawCtx.strokeStyle = pointercolor.current;
          drawCtx.lineWidth = 4;
          drawCtx.lineCap = 'round';
          drawCtx.beginPath();
          drawCtx.moveTo(prevPos.current.x, prevPos.current.y);
          drawCtx.lineTo(x, y);
          drawCtx.stroke();

          prevPos.current = { x, y };
        }; 
    
        // ___Another helper functions________
        const getStableGesture = (newLabel) => {
        const bufferSize = 5;
        predictionBuffer.current.push(newLabel);
        if (predictionBuffer.current.length > bufferSize) {
        predictionBuffer.current.shift();
        }

       const counts = predictionBuffer.current.reduce((acc, label) => {
       acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});

        const [mostCommonLabel, count] = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0];

      if (count >= 3) {
        return mostCommonLabel;
       }

      return null;
      };

       // ───── Main loop: DETECH AND ACT ON GESTURES ─────

        intervalid = setInterval(async () => {
          try {
            const predictions = await model.detect(video);

          liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
          model.renderPredictions(predictions, liveCanvas, liveCtx, video);

          const open = predictions.find(p => p.label === "open");
          const closed = predictions.find(p => p.label === "closed");
          const point = predictions.find(p => p.label === "point");
          const face = predictions.find(p => p.label === "face");

          let label = null;
          if (open) label = "open";
          else if (closed) label = "closed";
          else if (point) label = "point";
          else if (face) label = "face";

          const stableGesture = getStableGesture(label);

          if (stableGesture === "open") {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  resetDrawing();

          } else if (stableGesture === "closed" && closed) {
  const [x, y, w, h] = closed.bbox;
  const centerX = (x + w / 2) / video.videoWidth * drawCanvas.width;
  const centerY = (y + h / 2) / video.videoHeight * drawCanvas.height;
  drawfromHand(centerX, centerY, true, false);

          } else if (stableGesture === "point" && point) {
  const [x, y, w, h] = point.bbox;
  const centerX = (x + w / 2) / video.videoWidth * drawCanvas.width;
  const centerY = (y + h / 2) / video.videoHeight * drawCanvas.height;
  drawfromHand(centerX, centerY, false, false);

          } else {
    resetDrawing();
          }


            } catch (err) {
            console.error('Detection error:', err);
           }
          }, 100);

      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsloading(false);
      }
    };

    initHandtracking();

    return () => {
      if (intervalid) clearInterval(intervalid);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen bg-red-50'>
        <div className='text-red-600 text-center'>
          <h2 className='text-xl font-bold mb-2'>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
 
  // _______UI-PORTION_______ 

  return (
    <div className='flex w-full h-screen overflow-hidden bg-white '>
      
       {/* ___________CANVAS AREA____________ */}

      <div className='flex-1 relative w-full h-full rounded-2xl p-3'>
      <canvas ref={drawCanvasRef} className='w-full rounded-xl border-3 border-dashed border-red-300 shadow-inner h-full bg-white'/>    
      
      
      {Isloading && (
    <div className='absolute inset-0 flex items-center justify-center bg-gray-100'>
      <div className='text-gray-600'>Loading hand tracking...</div>
     </div>
      )}
     
     <h1 className=" absolute text-4xl font-bold text-md text-red-300 text-center left-50 right-50 py-6 top-0"style={{ fontFamily: 'var(--font-lavishly)' }}>
      My Canvas
    </h1>

     <div className="absolute bottom-3 left-4 p-3 flex">
      <span className="text-sm font-bold text-black">Color :</span>
      <div
        className="w-6 h-6 rounded-full border border-gray-400 shadow-inner ml-3"
        style={{ backgroundColor: currentColor }}
      />
    </div>
  
     <div className="absolute bottom-4 right-4 flex items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg z-10">
  
    <div className='flex gap-2 items-center'>
      <FaHandPaper title="Open Hand" className='bg-red-400 w-6 h-6 rounded-full p-1'/>
      <h1 className='text-red-400 text-sm font-semibold'>Clear Canvas</h1>
    </div>
    <div className='flex gap-2 items-center'>
      <FaHandRock title="Close Hand" className='bg-red-400 w-6 h-6 rounded-full p-1'/>
      <h1 className='text-red-400 text-sm font-semibold'>Change Color</h1>
    </div>
    <div className='flex gap-2 items-center'>
      <FaHandPointUp title="Point Hand" className='bg-red-400 w-6 h-6 rounded-full p-1'/>
      <h1 className='text-red-400 text-sm font-semibold'>Draw</h1>
    </div>
    </div>
      </div>
     
      {/* ____________WEBCAM AREA___________ */}

      <div className='flex-1 relative bg-black border-red-300 border-3 '>
        <video
          ref={videoRef}
          autoPlay
          muted
          className='absolute rounded-lg inset-0 w-full h-full object-cover' />
        <canvas
          ref={liveCanvasRef}
          className='absolute inset-0 w-full h-full' />
      </div>
    </div>
   );
  };

  export default Page;
