'use client'
import { init } from 'next/dist/compiled/webpack/webpack';
import { useEffect, useState, useRef } from 'react';

const page = () => {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null)
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

  const [Isloading, setIsloading] = useState(true);
  const [error, setError] = useState<string | null>(null)

  // _________________Drawing state_________________

  const prevPos = useRef({ x: null, y: null});
  const pointercolor = useRef('ff0000');

  useEffect(()=>{
    let model = null;
    let intervalid = null;

    const initHandtracking = async () => {
      try{
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
        
        // _________________Start Video and Load Model_________________
        const status = await handtrack.default.startVideo(video);
        if(!status){
          throw new Error('Failed to start the video');
        }

        model = await handtrack.default.load(ModelParams);
        setIsloading(false);

        // Helper functions

        const getRandomclr = () => {
          const letters = '0123456789ABCDEF';
          let color = '#';
          for (let i = 0; i<6; i++){
            color += letters[Math.floor(Math.random()*16)];
          }
          return color;
        };

        const resetDrawing = () => {
          prevPos.current = {x: null , y: null};
        };

        const drawfromHand = (x , y , isClosed, isOpen) => {
          if (prevPos.current.x === null || prevPos.current.y ===null){
            prevPos.current = {x,y};
          }
        }

        if(isOpen){
          drawCtx.clearRect(0,0, drawCanvas.width, drawCanvas.height);
          resetDrawing()
          return;
        }

        if(isClosed){
          pointercolor.current = getRandomclr();
          return;
        }

        drawCtx.strokeStyle = pointercolor.current;
        drawCtx.lineWidth = 4;
        drawCtx.lineCap = 'round';
        drawCtx.beginPath();
        drawCtx.moveTo(prevPos.current.x , prevPos.current.y);
        drawCtx.lineTo(x,y);
        drawCtx.stroke();

        prevPos.current = { x,y };
     
        

      // Main Detection loop
      intervalid = setInterval(async () => {
        try{
          const predictions = await model.detect(video);

          liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
          model.renderPredictions(predictions , liveCanvas , liveCtx , video);

          // _____________Gesture Allocation _____________
          const open = predictions.find(p => p.label === "open");
          const closed = predictions.find(p => p.label === "closed");
          const point = predictions.find(p => p.label === "point");

          if(open) {
            drawCtx.clearRect(0 , 0, drawCanvas.width, drawCanvas.height );
            resetDrawing();
          }

          if (closed){
            const [ x, y , w , h] = closed.bbox;
            const centerX = ( x + w / 2) / video.videoWidth * drawCanvas.width;
            const centerY = ( y + h / 2) / video.videoHeight * drawCanvas.height;
            drawfromHand(centerX, centerY, true , false);

          } else if (point){
            const [x , y, w, h] = point.bbox;
            const centerX = (x + w / 2) / video.videoWidth * drawCanvas.width;
            const centerY = ( y + h / 2) / video.videoHeight * drawCanvas.height;
            drawfromHand(centerX, centerY, false , false);
         
          }else{
            resetDrawing();
          }
        }catch (err){
          console.error('Detection error: ' , err);
        }
      }, 100);

    } catch(err){
      console.error('Initialization error:', err);
      setError(err.message);
      setIsloading(false);
    }
 

  initHandtracking();

  return()=> {
    if (intervalid) clearInterval(intervalid);
    if (videoRef.current && videoRef.current.srcObject){
      const stream = videorRef.current.scrObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };
}, []);

if (error){
  
}


export default page