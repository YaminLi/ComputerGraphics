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
var ANGLE_STEP = 45.0;

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
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

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
    console.log('currentAngle=',currentAngle);
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
  };
  tick();							// start (and continue) animation: draw current image
	
}

function initVertexBuffer(gl) {
//==============================================================================
	var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);						 

  var colorShapes = new Float32Array([
  // Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
	//		Apex on +z axis; equilateral triangle base at z=0
/*	Nodes:
		 0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0 (apex, +z axis;  white)
     c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1 (base: lower rt; red)
     0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2 (base: +y axis;  grn)
    -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3 (base:lower lft; blue)

*/
			// Face 0: (left side)
     0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0
     c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1
     0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2
			// Face 1: (right side)
		 0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0
     0.0,  1.0, 0.0, 1.0,  		1.0,  0.0,  0.0,	// Node 2
    -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3
    	// Face 2: (lower side)
		 0.0,	 0.0, sq2, 1.0,			1.0, 	1.0,	1.0,	// Node 0 
    -c30, -0.5, 0.0, 1.0, 		0.0,  1.0,  0.0, 	// Node 3
     c30, -0.5, 0.0, 1.0, 		0.0,  0.0,  1.0, 	// Node 1 
     	// Face 3: (base side)  
    -c30, -0.5, -0.2, 1.0, 		0.0,  1.0,  0.0, 	// Node 3
     0.0,  1.0, -0.2, 1.0,  	1.0,  0.0,  0.0,	// Node 2
     c30, -0.5, -0.2, 1.0, 		0.0,  0.0,  1.0, 	// Node 1
 
/*    // Cube Nodes
    -1.0, -1.0, -1.0, 1.0	// Node 0
    -1.0,  1.0, -1.0, 1.0	// Node 1
     1.0,  1.0, -1.0, 1.0	// Node 2
     1.0, -1.0, -1.0, 1.0	// Node 3
    
     1.0,  1.0,  1.0, 1.0	// Node 4
    -1.0,  1.0,  1.0, 1.0	// Node 5
    -1.0, -1.0,  1.0, 1.0	// Node 6
     1.0, -1.0,  1.0, 1.0	// Node 7
*/
		// +x face: RED
     1.0, -1.0, -1.0, 1.0,		1.0, 0.0, 0.0,	// Node 3
     1.0,  1.0, -1.0, 1.0,		1.0, 0.0, 0.0,	// Node 2
     1.0,  1.0,  1.0, 1.0,	  1.0, 0.0, 0.0,  // Node 4
     
     1.0,  1.0,  1.0, 1.0,	  1.0, 0.1, 0.1,	// Node 4
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.1, 0.1,	// Node 7
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 0.1,	// Node 3

		// +y face: GREEN
    -1.0,  1.0, -1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 1
    -1.0,  1.0,  1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 5
     1.0,  1.0,  1.0, 1.0,	  0.0, 1.0, 0.0,	// Node 4

     1.0,  1.0,  1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 4
     1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 2 
    -1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 0.1,	// Node 1

		// +z face: BLUE
    -1.0,  1.0,  1.0, 1.0,	  0.0, 0.0, 1.0,	// Node 5
    -1.0, -1.0,  1.0, 1.0,	  0.0, 0.0, 1.0,	// Node 6
     1.0, -1.0,  1.0, 1.0,	  0.0, 0.0, 1.0,	// Node 7

     1.0, -1.0,  1.0, 1.0,	  0.1, 0.1, 1.0,	// Node 7
     1.0,  1.0,  1.0, 1.0,	  0.1, 0.1, 1.0,	// Node 4
    -1.0,  1.0,  1.0, 1.0,	  0.1, 0.1, 1.0,	// Node 5

		// -x face: CYAN
    -1.0, -1.0,  1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 6	
    -1.0,  1.0,  1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 5 
    -1.0,  1.0, -1.0, 1.0,	  0.0, 1.0, 1.0,	// Node 1
    
    -1.0,  1.0, -1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 1
    -1.0, -1.0, -1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 0  
    -1.0, -1.0,  1.0, 1.0,	  0.1, 1.0, 1.0,	// Node 6  
    
		// -y face: MAGENTA
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.0, 1.0,	// Node 3
     1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 1.0,	// Node 7
    -1.0, -1.0,  1.0, 1.0,	  1.0, 0.0, 1.0,	// Node 6

    -1.0, -1.0,  1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 6
    -1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 0
     1.0, -1.0, -1.0, 1.0,	  1.0, 0.1, 1.0,	// Node 3

     // -z face: YELLOW
     1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 2
     1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 3
    -1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.0,	// Node 0		

    -1.0, -1.0, -1.0, 1.0,	  1.0, 1.0, 0.1,	// Node 0
    -1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 0.1,	// Node 1
     1.0,  1.0, -1.0, 1.0,	  1.0, 1.0, 0.1,	// Node 2
 
  ]);
  var nn = 48;		// 12 tetrahedron vertices; 36 cube verts (6 per side*6 sides)
	
	
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

  //-------Draw Spinning Tetrahedron
  modelMatrix.setTranslate(-0.4,-0.4, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  modelMatrix.scale(1,1,-1);							// convert to left-handed coord sys
  																				// to match WebGL display canvas.
  modelMatrix.scale(0.5, 0.5, 0.5);
  						// if you DON'T scale, tetra goes outside the CVV; clipped!
  modelMatrix.rotate(currentAngle, 0, 1, 0);  // Make new drawing axes that
 //modelMatrix.rotate(20.0, 0,1,0);
  						// that spin around y axis (0,1,0) of the previous 
  						// drawing axes, using the same origin.

  // DRAW TETRA:  Use this matrix to transform & draw 
  //						the first set of vertices stored in our VBO:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the first set of vertices: start at vertex 0...
  gl.drawArrays(gl.TRIANGLES, 0, 12);
  
  // NEXT, create different drawing axes, and...
  modelMatrix.setTranslate(0.4, 0.4, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1);							// convert to left-handed coord sys
  																				// to match WebGL display canvas.
  modelMatrix.scale(0.3, 0.3, 0.3);
  						// Make it smaller:
  modelMatrix.rotate(currentAngle, 1, 1, 0);  // Spin on XY diagonal axis
	// DRAW CUBE:		Use ths matrix to transform & draw
	//						the second set of vertices stored in our VBO:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, 12,36);
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
  ANGLE_STEP += 25; 
}

function spinDown() {
 ANGLE_STEP -= 25; 
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
 