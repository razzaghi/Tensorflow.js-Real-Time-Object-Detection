import React from "react";
import ReactDOM from "react-dom";
import * as tf from '@tensorflow/tfjs-core';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as blazeface from '@tensorflow-models/blazeface';

import "@tensorflow/tfjs";
import "./styles.css";
	const returnTensors = false;
    const flipHorizontal = false;
    const annotateBoxes = true; 
class App extends React.Component {
  videoRef = React.createRef();
  canvasRef = React.createRef();
  FoundFacesRef= React.createRef();
  start = Date.now();
  UpdateRate=5000;
  millis = this.UpdateRate;
  videoWidth=640;
  videoHeight=480;
  componentDidMount() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const webCamPromise = navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: "user"
          }
        })
        .then(stream => {
          window.stream = stream;
          this.videoRef.current.srcObject = stream;
		  this.videoWidth = this.videoRef.current.videoWidth;
          this.videoHeight = this.videoRef.current.videoHeight;
          return new Promise((resolve, reject) => {
            this.videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          });
        });
	  tfjsWasm.setWasmPaths( `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`);
      const cocoSsdmodelPromise = cocoSsd.load();
	  const blazefacePromise =blazeface.load();
	  const tfPromise = tf.setBackend("wasm");
      Promise.all([cocoSsdmodelPromise,tfPromise,blazefacePromise, webCamPromise])
        .then(values => {this.DoActionLoop(values);
        })
        .catch(error => {
          console.error(error);
        });
    }
  }

 DoActionLoop= values =>
  {
	   const ctx = this.canvasRef.current.getContext("2d");
       ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);	
	    this.detectFrame(this.videoRef.current, values[0]);
		this.detectFace(this.videoRef.current, values[2]);
		requestAnimationFrame(() => {
        this.DoActionLoop(values);
      });
  };
  
  detectFrame = (video, model) => {
    model.detect(video).then(predictions => {
      this.renderPredictions(predictions);    
    });
  };
  
  detectFace = (video, model) => {
    model.estimateFaces(video, returnTensors, flipHorizontal, annotateBoxes).then(FacePredictions => {		
      this.renderFacePredictions(FacePredictions);      
    });
  };
  renderPredictions = predictions => {
    const ctx = this.canvasRef.current.getContext("2d");
    // Font options.
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";
    predictions.forEach(prediction => {
      const x =this.videoWidth - prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = "#00FFFF";
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x, y);
    });
  };

  renderFacePredictions = FacePredictions => {
	  
	  let CanUpdate=false;
this.millis=Date.now()-this.start;
if(this.millis >=this.UpdateRate){
	this.start=Date.now();
	CanUpdate=true;
}
else
	CanUpdate=false;

	const ctx = this.canvasRef.current.getContext("2d");
	  // Font options.
    const font = "16px sans-serif";
    ctx.font = font;
    ctx.textBaseline = "top";
	if (FacePredictions.length > 0) {
		if (CanUpdate){
			console.log("Found " + FacePredictions.length.toString() + " Faces ");
		   this.FoundFacesRef.current.innerHTML = ""; 
			let span = document.createElement("span");
			span.innerHTML="Found " + FacePredictions.length.toString() + " Faces ";
			this.FoundFacesRef.current.append(span);		  
	   }	
		FacePredictions.forEach(prediction => {
			const start = prediction.topLeft;
			const end = prediction.bottomRight;
			let size = [end[0] - start[0], end[1] - start[1]];
			let width=size[0];
			let height=size[1];
			if (width<0)
				width= -1 * width;
			if (height<0)
				height= -1 * height;
			ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
			ctx.fillRect(start[0], start[1], size[0], size[1]);
			if (annotateBoxes) {
				const landmarks = prediction.landmarks;
				ctx.fillStyle = 'blue';
				for (let j = 0; j < landmarks.length; j++) {
					const x = landmarks[j][0];
					const y = landmarks[j][1];
					ctx.fillRect(x, y, 5, 5);
				}
			}
			if (CanUpdate){
				let tmpCanvas = document.createElement("canvas");
				tmpCanvas.setAttribute('width', width);
				tmpCanvas.setAttribute('height', height);
				this.FoundFacesRef.current.append(tmpCanvas);
				let tmpdiv = document.createElement("div");
				tmpCanvas.append(tmpdiv);	  
				let photo = document.createElement("img");
				tmpdiv.append(photo);
				let context = tmpCanvas.getContext('2d');
				//context.translate(width, 0);
				//context.scale(-1, 1);
				context.drawImage(this.videoRef.current, start[0], start[1],width, height,0,0, width, height);			
				let data = tmpCanvas.toDataURL('image/png');
				photo.setAttribute('src', data);						
			}			
		});
		
	}
  }
  render() {
    return (
      <div>	 
        <video
          className="video"
          autoPlay
          playsInline
          muted
          ref={this.videoRef}
          width="640"
          height="480"
        />
        <canvas
          className="output"
          ref={this.canvasRef}
          width="640"
          height="480"
        />
		<div 
		className="FoundFaces" 
		ref={this.FoundFacesRef}           
		width="640"     
		height="480"
		/>
      </div>
    );
  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
