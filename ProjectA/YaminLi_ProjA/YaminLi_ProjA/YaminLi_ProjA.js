//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// ColoredMultiObject.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		--converted from 2D to 4D (x,y,z,w) vertices
//		--demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//		--demonstrate 'nodes' vs. 'vertices'; geometric corner locations where
//				OpenGL/WebGL requires multiple co-located vertices to implement the
//				meeting point of multiple diverse faces.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variable -- Rotation angle rate (degrees/second)
var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)
var isDrag=false;   // mouse-drag: true when user holds down mouse button
var xMclik=0.0;     // last mouse button-down position (in CVV coords)
var yMclik=0.0;
var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;
var zoomScale = 0.5;
var viewAngle = 0.0;


function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  var n = initVertexBuffer(gl, 0);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return
  }


  canvas.onmousedown = function(ev){myMouseDown( ev, gl, canvas) }; 
            // when user's mouse button goes down call mouseDown() function
  canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };
          // call mouseMove() function          
  canvas.onmouseup = function(ev){myMouseUp(   ev, gl, canvas)};
  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);
  window.addEventListener("keypress", myKeyPress, false);
  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);
	gl.enable(gl.DEPTH_TEST); 	  
	
  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();
  
  // Create, init current rotation angle value in JavaScript
  var currentAngle = 0.0;

//-----------------  

  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // Draw shapes
    // console.log('currentAngle=',currentAngle);
    // console.log('n=', n);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();							// start (and continue) animation: draw current image
	
}

function initVertexBuffer(gl, currentAngle) {
//==============================================================================
	var sq3 = Math.sqrt(3.0)/3;					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);						 
  
  // var colors = [
  //   [1.0,  1.0,  1.0,  1.0],    // Front face: white
  //   [1.0,  0.0,  0.0,  1.0],    // Back face: red
  //   [0.0,  1.0,  0.0,  1.0],    // Top face: green
  //   [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
  //   [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
  //   [1.0,  0.0,  1.0,  1.0]     // Left face: purple
  // ];

  

  // var  hexagonScale = 0.998; 

  var colorShapes = new Float32Array(10000);
  // var colorShapes = new Float32Array([
//     colorShapes.set([
//   // Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
// 	//		Apex on +z axis; equilateral triangle base at z=0
 
//        //  1.0,   0.075,  0, 1.0,  //0
//        //  1.0,  -0.075,  0, 1.0,  //1
//        //  sq3,   0.075,  1, 1.0,  //2
//        //  sq3,  -0.075,  1, 1.0,  //3
//        // -sq3,   0.075,  1, 1.0,  //4
//        // -sq3,  -0.075,  1, 1.0,  //5
//        // -1.0,   0.075,  0, 1.0,  //6
//        // -1.0,  -0.075,  0, 1.0,  //7
//        // -sq3,   0.075, -1, 1.0,  //8
//        // -sq3,  -0.075, -1, 1.0,  //9
//        //  sq3,   0.075, -1, 1.0,  //10
//        //  sq3,  -0.075, -1, 1.0,  //11

//        //  1.0,   0.075,  0, 1.0,  //0
//        //  1.0,     0,  0, 1.0,  //1
//        //  sq3,   0.075,  1, 1.0,  //2
//        //  sq3,     0,  1, 1.0,  //3
//        // -sq3,   0.075,  1, 1.0,  //4
//        // -sq3,     0,  1, 1.0,  //5
//        // -1.0,   0.075,  0, 1.0,  //6
//        // -1.0,     0,  0, 1.0,  //7
//        // -sq3,   0.075, -1, 1.0,  //8
//        // -sq3,     0, -1, 1.0,  //9
//        //  sq3,   0.075, -1, 1.0,  //10
//        //  sq3,     0, -1, 1.0,  //11 


//   ], 0);

var i;
var j;
var index=0;
var heightBase=0;
var VertexNum = 0;
var radius = 1;
var c= [];

var colors = [   
    [0.1, 1.0, 0.1],    
    [1.0, 0.0, 0.0], 
    [0.2, 1.0, 0.6],
    [1.0, 1.0, 0.0],    
    [1.0, 0.0, 1.0],    
    [0.1, 1.0, 1.0],   
    [0.1, 0.1, 1.0], 
    [1.0, 0.5, 0.5],
    [0.3, 0.5, 0.8],
    [0.84, 0.84, 0.75] //moon' color   
  ];

for(i = 0; i < 4; i++){
  for(j=0; j< 16; j++){
    for(k=0; k<3; k++){
      var temp = (j+k)%16;
      var tempY = heightBase + (i+index)*0.25;
      var tempR = Math.sqrt(radius*radius - tempY*tempY);
      var tempX = tempR*Math.cos((Math.floor(temp/2)*0.785));
      var tempZ = tempR*Math.sin((Math.floor(temp/2)*0.785));
      if(index == 0){
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[Math.floor((i+1)*k)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+60);
        index = 1;
      }
      else{
        c.push(tempX, tempY, tempZ, 1.0);
        // c = c.concat(colors[Math.floor((i+1)*k)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+60);
        index = 0;
      }
      VertexNum++;
    }
  }
}

for(i = 0; i < 4; i++){
  for(j=0; j< 16; j++){
    for(k=0; k<3; k++){
      var temp = (j+k)%16;
      var tempY = (-1)*(heightBase + (i+index)*0.25);
      var tempR = Math.sqrt(radius*radius - tempY*tempY);
      var tempX = tempR*Math.cos((Math.floor(temp/2)*0.785));
      var tempZ = tempR*Math.sin((Math.floor(temp/2)*0.785));
      if(index == 0){
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[Math.floor((i+1)*k)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+60);
        index = 1;
      }
      else{
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[Math.floor((i+1)*k)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+60);
        index = 0;
      }
      VertexNum++;
    }
  }
}


//moon
for(i = 0; i < 4; i++){
  for(j=0; j< 16; j++){
    for(k=0; k<3; k++){
      var temp = (j+k)%16;
      var tempY = heightBase + (i+index)*0.25;
      var tempR = Math.sqrt(radius*radius - tempY*tempY);
      var tempX = tempR*Math.cos((Math.floor(temp/2)*0.785));
      var tempZ = tempR*Math.sin((Math.floor(temp/2)*0.785));
      if(index == 0){
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[(9-(i+1)*k%2)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+30);
        index = 1;
      }
      else{
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[(9-(i+1)*k%2)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+30);
        index = 0;
      }
      VertexNum++;
    }
  }
}

for(i = 0; i < 4; i++){
  for(j=0; j< 16; j++){
    for(k=0; k<3; k++){
      var temp = (j+k)%16;
      var tempY = (-1)*(heightBase + (i+index)*0.25);
      var tempR = Math.sqrt(radius*radius - tempY*tempY);
      var tempX = tempR*Math.cos((Math.floor(temp/2)*0.785));
      var tempZ = tempR*Math.sin((Math.floor(temp/2)*0.785));
      if(index == 0){
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[(9-(i+1)*k%2)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+30);
        index = 1;
      }
      else{
        c.push(tempX, tempY, tempZ, 1.0);
        // c=c.concat(colors[(9-(i+1)*k%2)]);
        c=c.concat(colors[Math.floor(currentAngle/360*9)]);
        currentAngle = animate(currentAngle+30);
        index = 0;
      }
      VertexNum++;
    }
  }
}

index = 0;

for(j=0; j< 32; j++){
  for(k=0; k<3; k++){
    var temp = (j+k)%32;
    var tempR = (index == 0 ? radius : 1.2*radius);
    // var radiusX = radius;
    // var radiusZ = 1.2*radius;
    var theta = (Math.floor(temp/2)*0.3925);
    var tempX = tempR*Math.cos(theta);
    var tempY = 0.3*tempR*Math.sin(theta);
    var tempZ = tempR*Math.sin(theta);
    // console.log(tempX, tempZ);
    if(index == 0){
      c.push(tempX, tempY, tempZ, 1.0);
      c=c.concat(colors[9-Math.floor(temp/4)]);
      index = 1;
    }
    else{
      c.push(tempX, tempY, tempZ, 1.0);
      c=c.concat(colors[9-Math.floor(temp/4)]);
      index = 0;
    }
    VertexNum++;
  }
}


  colorShapes.set(c, 0);

  var nn = VertexNum;		// 12 tetrahedron vertices; 36 cube verts (6 per side*6 sides)
	
	
  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * 7, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

function draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // modelMatrix.setTranslate(0, 0, 0);
  // modelMatrix.scale(1,1,-1);              
  // modelMatrix.scale(zoomScale*0.3, zoomScale*0.3, zoomScale*0.03);
  // gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  // gl.drawArrays(gl.TRIANGLES, 768, 96);

  //-------Draw Spinning Tetrahedron
  modelMatrix.setTranslate(-1.2+xMdragTot, yMdragTot, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);


  modelMatrix.scale(1,1,-1);							// convert to left-handed coord sys
  																				// to match WebGL display canvas.
  modelMatrix.scale(zoomScale*0.7, zoomScale*0.7, zoomScale*0.7);
  						// if you DON'T scale, tetra goes outside the CVV; clipped!
  var thetaView;
  thetaView = (viewAngle/360)*2*3.14;
  modelMatrix.rotate(currentAngle, 0, Math.cos(thetaView)*1, Math.sin(thetaView));  // Make new drawing axes that
 //modelMatrix.rotate(20.0, 0,1,0);
  						// that spin around y axis (0,1,0) of the previous 
  						// drawing axes, using the same origin.

  // DRAW TETRA:  Use this matrix to transform & draw 
  //						the first set of vertices stored in our VBO:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 0, 384);
  
  modelMatrix = popMatrix();

  var thetaMercury = ((currentAngle*8%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*1*Math.cos(thetaMercury), Math.sin(thetaView)*0.8*zoomScale*Math.sin(thetaMercury), zoomScale*0.65*Math.sin(thetaMercury));
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.03, zoomScale*0.03, zoomScale*0.03);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 384);

  modelMatrix = popMatrix();

  var thetaVenus = (((currentAngle*7)%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*1.3*Math.cos(thetaVenus), Math.sin(thetaView)*zoomScale*1.2*Math.sin(thetaVenus), zoomScale*0.7*Math.sin(thetaVenus));  
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.11, zoomScale*0.11, zoomScale*0.11);
  modelMatrix.rotate(-currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 384, 384);

  modelMatrix = popMatrix();
  var thetaMars = (((currentAngle*5)%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*2.3*Math.cos(thetaMars), Math.sin(thetaView)*zoomScale*2*Math.sin(thetaMars), zoomScale*0.9*Math.sin(thetaMars));  
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.1, zoomScale*0.1, zoomScale*0.1);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 384);

  modelMatrix = popMatrix();
  var thetaJupiter = (((currentAngle*4)%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*3*Math.cos(thetaJupiter), Math.sin(thetaView)*zoomScale*2.5*Math.sin(thetaJupiter), zoomScale*0.9*Math.sin(thetaJupiter));  
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.25, zoomScale*0.25, zoomScale*0.25);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 384);

  modelMatrix = popMatrix();
  var thetaUranus = (((currentAngle*2)%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*4.8*Math.cos(thetaUranus), Math.sin(thetaView)*zoomScale*3.6*Math.sin(thetaUranus), zoomScale*0.95*Math.sin(thetaUranus));  
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.15, zoomScale*0.15, zoomScale*0.15);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 384, 384);
  
  modelMatrix = popMatrix();
  var thetaNeptune = (currentAngle/360)*2*3.14;
  modelMatrix.translate(zoomScale*5.4*Math.cos(thetaNeptune), Math.sin(thetaView)*zoomScale*4*Math.sin(thetaNeptune), zoomScale*1*Math.sin(thetaNeptune));  
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.14, zoomScale*0.14, zoomScale*0.14);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 384, 384);


  modelMatrix = popMatrix();
  var thetaSaturn = (((currentAngle*3)%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*4*Math.cos(thetaSaturn), Math.sin(thetaView)*zoomScale*3.2*Math.sin(thetaSaturn), zoomScale*1.05*Math.sin(thetaSaturn));  
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*0.2, zoomScale*0.2, zoomScale*0.2);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 384, 384);

  pushMatrix(modelMatrix);
  modelMatrix = popMatrix();

  modelMatrix.translate(0, 0, 0);
  modelMatrix.scale(1,1,-1);              
  modelMatrix.scale(zoomScale*4, zoomScale*4, zoomScale*4);
  modelMatrix.scale(1,1,-1); 
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 768, 96);


  modelMatrix = popMatrix();
  var thetaEarth;
  thetaEarth = ((currentAngle*6)%360/360)*2*3.14;
  modelMatrix.translate(zoomScale*1.8*Math.cos(thetaEarth), Math.sin(thetaView)*1.5*zoomScale*Math.sin(thetaEarth), zoomScale*0.85*Math.sin(thetaEarth));  // 'set' means DISCARD old matrix,
  
  pushMatrix(modelMatrix); 

  modelMatrix.scale(1,1,-1);							
  modelMatrix.scale(zoomScale*0.12, zoomScale*0.12, zoomScale*0.12);
  modelMatrix.rotate(currentAngle, 0, 1, 0); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0,384);

  modelMatrix = popMatrix();
  modelMatrix.scale(zoomScale*0.03,zoomScale*0.03, zoomScale*0.03);
  var thetaMoon;
  thetaMoon = ((currentAngle*12%360)/360)*2*3.14;
  modelMatrix.translate(zoomScale*6*Math.cos(thetaMoon), zoomScale*3*Math.cos(thetaMoon), zoomScale*6*Math.sin(thetaMoon)); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 384, 384);

}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

//==================HTML Button Callbacks
function spinUp() {
  ANGLE_STEP += 15; 
}

function spinDown() {
 ANGLE_STEP -= 15; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}

function zoomIn(){
  zoomScale *= 1.1; 
}
 
function zoomOut(){
  zoomScale /= 1.1;
}

function viewUp(){
  viewAngle += 15;
  viewAngle %= 360;
}

function viewDown(){
  viewAngle -= 15;
  viewAngle %= 360;
}

function detail(){
 if(xMclik < -0.9){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Sun"
 }
 if(xMclik > -0.85 && xMclik < -0.8){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Mercury"+
    "<br> &nbsp Diameter: 3,031 miles(4,878km)"+
    "<br> &nbsp Orbit: 88 Earth days"+
    "<br> &nbsp Day: 58.6 Earth days"
 }
 if(xMclik > -0.75 && xMclik < -0.65){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Venus"+
    "<br> &nbsp Diameter: 7,521 miles(12,104km)"+
    "<br> &nbsp Orbit: 225 Earth days"+
    "<br> &nbsp Day: 241 Earth days"
 }
 if(xMclik > -0.65 && xMclik < -0.45){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Earth"+
    "<br> &nbsp Diameter: 7,926 miles(12,760km)"+
    "<br> &nbsp Orbit: 365.24 Earth days"+
    "<br> &nbsp Day:  23 hours, 56 minutes"
 }
 if(xMclik > -0.45 && xMclik < -0.25){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Mars"+
    "<br> &nbsp Diameter: 4,217 miles(6,787km)"+
    "<br> &nbsp Orbit: 687 Earth days"+
    "<br> &nbsp Day: 24 hours, 37 minutes"
 }
 if(xMclik > -0.25 && xMclik < 0.09){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Jupiter"+
    "<br> &nbsp Diameter: 86,881 miles(139,822km)"+
    "<br> &nbsp Orbit: 11.9 Earth years"+
    "<br> &nbsp Day: 9.8. Earth hours"
 }
 if(xMclik > 0.09 && xMclik < 0.48){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Saturn"+
    "<br> &nbsp Diameter: 74,900 miles(120,500km)"+
    "<br> &nbsp Orbit: 29.5 Earth years"+
    "<br> &nbsp Day: 10.5 Earth hours"
 }
 if(xMclik > 0.48 && xMclik < 0.72){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Uranus"+
    "<br> &nbsp Diameter: 31,763 miles(51,120km)"+
    "<br> &nbsp Orbit: 84 Earth years"+
    "<br> &nbsp Day: 18 Earth hours"
 }
 if(xMclik > 0.72){
    document.getElementById('Detail').innerHTML= "<br> &nbsp Name: Neptune"+
    "<br> &nbsp Diameter: 30,775 miles(49,530km)"+
    "<br> &nbsp Orbit: 165 Earth years"+
    "<br> &nbsp Day: 19 Earth hours"
 }

}

function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
//                  (Which button?    console.log('ev.button='+ev.button);   )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = true;                      // set our mouse-dragging flag
  xMclik = x;                         // record where mouse-dragging began
  yMclik = y;
};

function myMouseMove(ev, gl, canvas){
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

  // find how far we dragged the mouse:
  xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
  yMdragTot += (y - yMclik);
  xMclik = x;                         // Make next drag-measurement from here.
  yMclik = y;
  
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = false;                     // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  xMdragTot += (x - xMclik);
  yMdragTot += (y - yMclik);
  console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
};


function myKeyDown(ev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard, and captures the 
// keyboard's scancode or keycode(varies for different countries and alphabets).
//  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T 
// need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins, 
// Del, etc), then just use the 'keypress' event instead.
//   The 'keypress' event captures the combined effects of alphanumeric keys and // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
// ASCII codes; you'll get the ASCII code for uppercase 'S' if you hold shift 
// and press the 's' key.
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of the messy way JavaScript handles keyboard events
// see:    http://javascript.info/tutorial/keyboard-events
//

  switch(ev.keyCode) {      // keycodes !=ASCII, but are very consistent for 
  //  nearly all non-alphanumeric keys for nearly all keyboards in all countries. 
    case 32:
      runStop();
      break;
    case 38:
      viewUp();
      console.log('viewAngle: ', viewAngle);
      break;
    case 40:
      viewDown();
      console.log('viewAngle: ', viewAngle);
      break;
    case 68:
      detail();
      break;
    case 83:
     spinDown();
     break;
    case 81:
      spinUp();
      break;
    case 73:
      zoomIn();
      console.log('zoomscale: ');
      break;
    case 79:
      zoomOut();
      break;
    case 112:
      document.getElementById('Instruction').innerHTML = 
        "<br> &nbsp Space: Stop/Run"+
        "<br> &nbsp Q key: Spin UP"+
        "<br> &nbsp S key: Spin Down"+
        "<br> &nbsp I key: Zoom In" +
        "<br> &nbsp O key: Zoom Out" +
        "<br> &nbsp Up key: View Up" + 
        "<br> &nbsp Down key: View Down" +
        "<br> &nbsp Mouse Click + D key: Detail" +
        "<br> &nbsp Mouse Drag: Change Position"

        break;
    default:
      console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
      break;
  }
}


function clearDrag() {
// Called when user presses 'Clear' button in our webpage
  xMdragTot = 0.0;
  yMdragTot = 0.0;
}


function myKeyUp(ev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well

  console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
}

function myKeyPress(ev) {
//===============================================================================
// Best for capturing alphanumeric keys and key-combinations such as 
// CTRL-C, alt-F, SHIFT-4, etc.
  console.log('myKeyPress():keyCode='+ev.keyCode  +', charCode=' +ev.charCode+
                        ', shift='    +ev.shiftKey + ', ctrl='    +ev.ctrlKey +
                        ', altKey='   +ev.altKey   +
                        ', metaKey(Command key or Windows key)='+ev.metaKey);
}
