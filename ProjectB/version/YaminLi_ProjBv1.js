//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
//==============================================================================
//
// LookAtTrianglesWithKey_ViewVolume.js (c) 2012 matsuda
//
//  MODIFIED 2014.02.19 J. Tumblin to 
//		--demonstrate multiple viewports (see 'draw()' function at bottom of file)
//		--draw ground plane in the 3D scene:  makeGroundPlane()

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
  
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
													// (x,y,z)position + (r,g,b)color
var canvas;
var modelMatrix = new Matrix4();
var viewMatrix = new Matrix4();
var u_ViewMatrix = new Matrix4();
var projMatrix = new Matrix4();
var mvpMatrix = new Matrix4();
var currentAngle = 0.0;
var ANGLE_STEP = 45.0; 


function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight*3/4;

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

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting:
	gl.enable(gl.DEPTH_TEST); 
	
  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBuffers(gl);

  if (n < 0) {
    console.log('Failed to specify the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.25, 0.2, 0.25, 1.0);

  // Get the graphics system storage locations of
  // the uniform variables u_ViewMatrix and u_ProjMatrix.
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ViewMatrix || !u_ProjMatrix) { 
    console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
    return;
  }

  // Create a JavaScript matrix to specify the view transformation
  
  // Register the event handler to be called on key press
 document.onkeydown= function(ev){keydown(ev, gl, u_ViewMatrix, viewMatrix); };
	// (Note that I eliminated the 'n' argument (no longer needed)).
	
  // Create the matrix to specify the camera frustum, 
  // and pass it to the u_ProjMatrix uniform in the graphics system
  var projMatrix = new Matrix4();
  // REPLACE this orthographic camera matrix:
/*  projMatrix.setOrtho(-1.0, 1.0, 					// left,right;
  										-1.0, 1.0, 					// bottom, top;
  										0.0, 2000.0);				// near, far; (always >=0)
*/
	// with this perspective-camera matrix:
	// (SEE PerspectiveView.js, Chapter 7 of book)

  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

  // YOU TRY IT: make an equivalent camera using matrix-cuon-mod.js
  // perspective-camera matrix made by 'frustum()' function..
  
	// Send this matrix to our Vertex and Fragment shaders through the
	// 'uniform' variable u_ProjMatrix:
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  var tick =function(){
    currentAngle = animate(currentAngle); 
    draw(gl,currentAngle, u_ViewMatrix, viewMatrix);   // Draw the triangles  
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;  
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;  
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu

	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;  
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;  
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function initVertexBuffers(gl) {
//==============================================================================

	// make our 'forest' of triangular-shaped trees:
  forestVerts = new Float32Array([
    // 3 Vertex coordinates (x,y,z) and 3 colors (r,g,b)
     0.0,  0.5,  -0.4,  1.0,  0.4,  1.0,  0.4, // The back green one
    -0.5, -0.5,  -0.4,  1.0,  0.4,  1.0,  0.4,
     0.5, -0.5,  -0.4,  1.0,  1.0,  0.4,  0.4, 
   
     0.5,  0.4,  -0.2,  1.0,  1.0,  0.4,  0.4, // The middle yellow one
    -0.5,  0.4,  -0.2,  1.0,  1.0,  1.0,  0.4,
     0.0, -0.6,  -0.2,  1.0,  1.0,  1.0,  0.4, 

     0.0,  0.5,   0.0,  1.0,  0.4,  0.4,  1.0,  // The front blue one 
    -0.5, -0.5,   0.0,  1.0,  0.4,  0.4,  1.0,
     0.5, -0.5,   0.0,  1.0,  1.0,  0.4,  0.4, 

  ]);

  // axisVerts = new Float32Array([
  //    0,0,0,1,     1.0,1.0,1.0, 
  //    1,0,0,1,     1.0, 0.0,  0.0, 

  //    0,0,0,1,     1.0,1.0,1.0,  
  //    0,1,0,1,     0.0,  1.0,  0.0,  

  //    0,0,0,1,     1.0,1.0,1.0, 
  //    0,0,1,1,     0.0,0.0,1.0,
  //   ]);
  
  // Make our 'ground plane'; can you make a'torus' shape too?
  // (recall the 'basic shapes' starter code...)
  makeGroundGrid();
  makeAxis();
  makeHead();
  makeBody();
  makeTetrahedron();
  makeRing();
  makeDiamond();
  makeCylinder();
  makeTorus();

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	mySiz = forestVerts.length + gndVerts.length + axisVerts.length + headVerts.length + bodyVerts.length + ttrVerts.length + ringVerts.length + diaVerts.length + cylVerts.length + torVerts.length;

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
  var verticesColors = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	forestStart = 0;							// we store the forest first.
  for(i=0,j=0; j< forestVerts.length; i++,j++) {
  	verticesColors[i] = forestVerts[j];
		} 
	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		verticesColors[i] = gndVerts[j];
		}

  axisStart = i;
  for(j=0; j< axisVerts.length; i++, j++) {
    verticesColors[i] = axisVerts[j];
    }


  ttrStart = i;
  for(j=0; j< ttrVerts.length; i++, j++) {
    verticesColors[i] = ttrVerts[j];
    }

  // console.log("i=", ttrStart);

  bodyStart = i;
  for(j=0; j< bodyVerts.length; i++, j++) {
    verticesColors[i] = bodyVerts[j];
    }

    headStart = i;
  for(j=0; j< headVerts.length; i++, j++) {
    verticesColors[i] = headVerts[j];
    }
  // console.log("i=", bodyStart);

  ringStart = i;
  for(j=0; j< ringVerts.length; i++, j++) {
    verticesColors[i] = ringVerts[j];
    }

  diaStart = i;
  for(j=0; j< diaVerts.length; i++, j++) {
    verticesColors[i] = diaVerts[j];
  }

  cylStart = i;
  for(j=0; j< cylVerts.length; i++, j++) {
    verticesColors[i] = cylVerts[j];
  }

  torStart = i;
  for(j=0; j< torVerts.length; i++, j++) {
    verticesColors[i] = torVerts[j];
  }

  // Create a vertex buffer object (VBO)
  var vertexColorbuffer = gl.createBuffer();  
  if (!vertexColorbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write vertex information to buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * 7, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 7, FSIZE * 4);
  gl.enableVertexAttribArray(a_Color);

  return mySiz/floatsPerVertex;	// return # of vertices
}

var g_EyeX = 0.20, g_EyeY = 4.25, g_EyeZ = -0.25; 
// Global vars for Eye position. 
// NOTE!  I moved eyepoint BACKWARDS from the forest: from g_EyeZ=0.25
// a distance far enough away to see the whole 'forest' of trees within the
// 30-degree field-of-view of our 'perspective' camera.  I ALSO increased
// the 'keydown()' function's effect on g_EyeX position.


function keydown(ev, gl, u_ViewMatrix, viewMatrix) {
//------------------------------------------------------
//HTML calls this'Event handler' or 'callback function' when we press a key:

    if(ev.keyCode == 39) { // The right arrow key was pressed
//      g_EyeX += 0.01;
				g_EyeX += 0.1;		// INCREASED for perspective camera)
    } else 
    if (ev.keyCode == 37) { // The left arrow key was pressed
//      g_EyeX -= 0.01;
				g_EyeX -= 0.1;		// INCREASED for perspective camera)
    } else 
    if (ev.keyCode == 38) { // The left arrow key was pressed
//      g_EyeX -= 0.01;
        g_EyeZ += 0.1;    // INCREASED for perspective camera)
    } else 
    if (ev.keyCode == 40) { // The left arrow key was pressed
//      g_EyeX -= 0.01;
        g_EyeZ -= 0.1;    // INCREASED for perspective camera)
    } else 
    if(ev.keyCode == 112){
      console.log(ev.keyCode);
      document.getElementById('Help').innerHTML = "Use Left/Right keys go left/right";
    }
    else { return; } // Prevent the unnecessary drawing
    draw(gl, currentAngle, u_ViewMatrix, viewMatrix);    
}

function draw(gl, currentAngle, u_ViewMatrix, viewMatrix) {
//==============================================================================
  
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Using OpenGL/ WebGL 'viewports':
  // these determine the mapping of CVV to the 'drawing context',
	// (for WebGL, the 'gl' context describes how we draw inside an HTML-5 canvas)
	// Details? see
	//
  //  https://www.khronos.org/registry/webgl/specs/1.0/#2.3
  // Draw in the FIRST of several 'viewports'
  //------------------------------------------
	// CHANGE from our default viewport:
	// gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	// to a smaller one:
	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						canvas.width/2, 				// viewport width, height.
  						canvas.height);
  projMatrix.setPerspective(40, (0.5*canvas.width)/canvas.height, 1, 100);     
  						
  // Set the matrix to be used for to set the camera view
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
  											0, 0, 0, 								// look-at point (origin)
  											0, 0, 1);								// up vector (+y)

  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);


	// Draw the scene:
	drawMyScene(gl, currentAngle, u_ViewMatrix, viewMatrix);
 
    // Draw in the SECOND of several 'viewports'
  //------------------------------------------
	// gl.viewport(canvas.width/2, 				// Viewport lower-left corner
	// 						0, 															// location(in pixels)
 //  						canvas.width/2, 				// viewport width, height.
 //  						canvas.height/2);

	// // but use a different 'view' matrix:
 //  viewMatrix.setLookAt(-g_EyeX, g_EyeY, g_EyeZ, // eye position
 //  										0, 0, 0, 									// look-at point 
 //  										0, 1, 0);									// up vector

 //  // Pass the view projection matrix to our shaders:
 //  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

	// Draw the scene:
	// drawMyScene(gl, u_ViewMatrix, viewMatrix);
    
        // Draw in the THIRD of several 'viewports'
  //------------------------------------------
	gl.viewport(canvas.width/2, 				// Viewport lower-left corner
							0, 		// location(in pixels)
  						canvas.width/2, 				// viewport width, height.
  						canvas.height);

  projMatrix.setOrtho(-0.5*canvas.width/300, 0.5*canvas.width/300,          // left,right;
                      -canvas.height/300, canvas.height/300,          // bottom, top;
                      1, 100);

	// but use a different 'view' matrix:
  viewMatrix.setLookAt(g_EyeY, g_EyeX, 6+g_EyeZ, 	// eye position,
  											0, 0, 0, 								// look-at point,
  											0, 0, 1);								// 'up' vector.

  // Pass the view projection matrix to our shaders:
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  
	// Draw the scene:
	drawMyScene(gl, currentAngle, u_ViewMatrix, viewMatrix);
}

function drawMyScene(myGL, currentAngle, myu_ViewMatrix, myViewMatrix) {
//===============================================================================
// Called ONLY from within the 'draw()' function
// Assumes already-correctly-set View matrix and Proj matrix; 
// draws all items in 'world' coords.

	// DON'T clear <canvas> or you'll WIPE OUT what you drew 
	// in all previous viewports!
	// myGL.clear(gl.COLOR_BUFFER_BIT);  						
  
  // Draw the 'forest' in the current 'world' coord system:
  // (where +y is 'up', as defined by our setLookAt() function call above...)
  // mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);

  // pushMatrix(myViewMatrix);
  // myGL.drawArrays(myGL.TRIANGLES, 				// use this drawing primitive, and
  // 						  forestStart/floatsPerVertex,	// start at this vertex number, and
  // 						  forestVerts.length/floatsPerVertex);	// draw this many vertices
  
 // Rotate to make a new set of 'world' drawing axes: 
 // old one had "+y points upwards", but
  myViewMatrix.rotate(90.0, 0,0,1);	// new one has "+z points upwards",
  																		// made by rotating -90 deg on +x-axis.
  																		// Move those new drawing axes to the 
  																		// bottom of the trees:
	myViewMatrix.translate(0.0, 0.0, -0.6);	
	myViewMatrix.scale(0.4, 0.4,0.4);		// shrink the drawing axes 
																			//for nicer-looking ground-plane, and
  // Pass the modified view matrix to our shaders:
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  
  // Now, using these drawing axes, draw our ground plane: 
  myGL.drawArrays(myGL.LINES,							// use this drawing primitive, and
  							gndStart/floatsPerVertex,	// start at this vertex number, and
  							gndVerts.length/floatsPerVertex);		// draw this many vertices

  myViewMatrix.translate(0.0, 0.0, 2.0); 
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);

  myViewMatrix = popMatrix();
  myViewMatrix.translate(2, 5, 1);
  myViewMatrix.scale(1, 1, 0.5);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                ringStart/floatsPerVertex, // start at this vertex number, and
                ringVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix = popMatrix();
  myViewMatrix.translate(1, -5, -1);
  myViewMatrix.scale(0.9, 0.9, 0.45);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                diaStart/floatsPerVertex, // start at this vertex number, and
                diaVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix = popMatrix();
  myViewMatrix.translate(1.5, 5, -1);
  myViewMatrix.scale(1, 0.5, 0.5);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                cylStart/floatsPerVertex, // start at this vertex number, and
                cylVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix = popMatrix();
  // myViewMatrix.rotate(90.0, 0,0,1);
  myViewMatrix.translate(1.5, -5, 0.8);
  myViewMatrix.scale(1, 0.5, 0.5);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                torStart/floatsPerVertex, // start at this vertex number, and
                torVerts.length/floatsPerVertex); 

  myViewMatrix.rotate(90.0, 0,0,1);  // new one has "+z points upwards",
                                      // made by rotating -90 deg on +x-axis.
                                      // Move those new drawing axes to the 
                                      // bottom of the trees:
  // myViewMatrix.translate(0.0, 0.0, 2.0); 
  // draw this many vertices

  myViewMatrix = popMatrix();

  myViewMatrix.rotate(currentAngle, 0, 0, 1);

  // myViewMatrix.translate(0.0, 0.0, 2.0);
  myViewMatrix.scale(0.4, 0.4,0.2);   // shrink the drawing axes 
                                      //for nicer-looking ground-plane, and
  // Pass the modified view matrix to our shaders:
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

   myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

   pushMatrix(myViewMatrix);

   myViewMatrix = popMatrix();

    myViewMatrix.scale(3, 3, 3);   // shrink the drawing axes 
                                      //for nicer-looking ground-plane, and
  // Pass the modified view matrix to our shaders:
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

   myGL.drawArrays(myGL.LINES,              // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);  

//body
  myViewMatrix = popMatrix();
  myViewMatrix.translate(0.0, 0.0, -1.0); 
  myViewMatrix.scale(0.8, 0.8,0.8); 
  myViewMatrix.rotate(currentAngle, 0, 0, 1); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

   myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                bodyStart/floatsPerVertex, // start at this vertex number, and
                bodyVerts.length/floatsPerVertex);   // draw this many vertices
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);
  pushMatrix(myViewMatrix);

//arms&hands
  myViewMatrix = popMatrix();
  myViewMatrix.translate(0.0, -1, 0.5);
  myViewMatrix.scale(0.1, 0.4,0.05);   
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

  
  myViewMatrix = popMatrix();
  myViewMatrix.translate(0.0, -1.5, 1.2);
  myViewMatrix.scale(0.1, 0.1, 0.8);   
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

  
  pushMatrix(myViewMatrix);

  myViewMatrix = popMatrix();
  myViewMatrix.translate(0, 0, 0);
  myViewMatrix.scale(16, 16, 1);    
  myViewMatrix.rotate(currentAngle*2, 0, 0, 1); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix.rotate(90, 0, 0, 1);
  // myViewMatrix.translate(0, 0, 0);
  myViewMatrix.scale(1, 1, 1);    
  // myViewMatrix.rotate(currentAngle*0.7, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices
  myViewMatrix.rotate(90, 0, 0, 1);
  // myViewMatrix.translate(0, 0, 0);
  myViewMatrix.scale(1, 1, 1);    
  // myViewMatrix.rotate(currentAngle*0.7, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices
myViewMatrix.rotate(90, 0, 0, 1);
  // myViewMatrix.translate(0, 0, 0);
  myViewMatrix.scale(1, 1, 1);    
  // myViewMatrix.rotate(currentAngle*0.7, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix = popMatrix();
  myViewMatrix.translate(0.0, 1, 0.5);
  myViewMatrix.scale(0.1, 0.4,0.05);    
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix = popMatrix();
  myViewMatrix.translate(0.75, 1.5, 0.5);
  myViewMatrix.scale(0.8, 0.1,0.05);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices



}

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


function winResize(){
 //  var nuCanvas = document.getElementById('webgl');
 //  var nuGL = getWebGLContext(nuCanvas);             // and context:

 //  console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);   
 // console.log('Browser window: innerWidth,innerHeight=', 
 //                                innerWidth, innerHeight);

 //  nuCanvas.width = window.innerWidth;
 //  nuCanvas.height = window.innerHeight*3/4;
 //  draw(nuGL, u_ViewMatrix, viewMatrix);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight*3/4;
}

function makeAxis(){
  axisVerts = new Float32Array([
     0,0,0,1,     1.0,1.0,1.0, 
     1,0,0,1,     1.0, 0.0,  0.0,

     0,0,0,1,     1.0,1.0,1.0,  
     0,1,0,1,     0.0,  1.0,  0.0,

     0,0,0,1,     1.0,1.0,1.0, 
     0,0,1,1,     0.0,0.0,1.0, 
    ]);
}

function makeHead(){
  headVerts = new Float32Array([
     1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 0.0,  // Node 3
     1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 0.0,  // Node 2
     1.0,  1.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 4
     
     1.0,  1.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 4
     1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 0.0,  // Node 7
     1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  // Node 3

    // +y face: GREEN
    -1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  // Node 1
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 0.0,  // Node 5
     1.0,  1.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 4

     1.0,  1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  // Node 4
     1.0,  1.0, -1.0, 1.0,    0.0, 0.0, 1.0,  // Node 2 
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 0.1,  // Node 1

    // +z face: BLUE
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  // Node 5
    -1.0, -1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  // Node 6
     1.0, -1.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 7

     1.0, -1.0,  1.0, 1.0,    1.0, 1.0, 0.0,  // Node 7
     1.0,  1.0,  1.0, 1.0,    0.1, 0.1, 1.0,  // Node 4
    -1.0,  1.0,  1.0, 1.0,    1.0, 0.1, 1.0,  // Node 5

    // -x face: CYAN
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  // Node 6 
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  // Node 5 
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  // Node 1
    
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  // Node 1
    -1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 1.0,  // Node 0  
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  // Node 6  
    
    // -y face: MAGENTA
     1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 1.0,  // Node 3
     1.0, -1.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 7
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  // Node 6

    -1.0, -1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  // Node 6
    -1.0, -1.0, -1.0, 1.0,    0.0, 0.0, 1.0,  // Node 0
     1.0, -1.0, -1.0, 1.0,    0.0, 0.1, 1.0,  // Node 3

     // -z face: YELLOW
     1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 0.0,  // Node 2
     1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  // Node 3
    -1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 1.0,  // Node 0   

    -1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 0.1,  // Node 0
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 0.1,  // Node 1
     1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  // Node 2
     ]);
}

function makeBody(){
  bodyVerts = new Float32Array(2688);
  var i;
  var j;
  var index=0;
  var heightBase=0;
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
          c=c.concat(colors[Math.floor((i+1)*k)]);
          // c=c.concat(colors[0]);
          index = 1;
        }
        else{
          c.push(tempX, tempY, tempZ, 1.0);
          c = c.concat(colors[Math.floor((i+1)*k)]);
          // c=c.concat(colors[0]);
          index = 0;
        }
      }
    }
  }

  for(i=0; i < 4; i++){
    for(j=0; j < 16; j++){
      for(k=0; k < 3; k++){
        var temp = (j+k)%16;
        var tempY = (-1)*(heightBase + (i+index)*0.25);
        var tempR = Math.sqrt(radius*radius - tempY*tempY);
        var tempX = tempR*Math.cos((Math.floor(temp/2)*0.785));
        var tempZ = tempR*Math.sin((Math.floor(temp/2)*0.785));
        if(index == 0){
          c.push(tempX, tempY, tempZ, 1.0);
          c=c.concat(colors[Math.floor((i+1)*k)]);
          // c=c.concat(colors[0]);
          index = 1;
        }
        else{
          c.push(tempX, tempY, tempZ, 1.0);
          c=c.concat(colors[Math.floor((i+1)*k)]);
          // c=c.concat(colors[0]);
          index = 0;
        }
      }
    }
  }
  bodyVerts.set(c, 0);
}

function makeTetrahedron() {
  ttrVerts = new Float32Array([
    /*  Nodes:
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  // Node 0
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  // Node 1
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  // Node 2
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  // Node 3
    */

      // Face 0
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0, // Node 0
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  // Node 1
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  // Node 2
      // Face 1(front)
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  // Node 0
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  // Node 2
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  // Node 3
      // Face 2
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  // Node 0 
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  // Node 3
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  // Node 1 
      // Face 3  
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  // Node 3
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  // Node 2
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  // Node 1
    ]);
}


function makeRing(){
  ringVerts = new Float32Array(672);
  var i;
  var j;
  var index=0;
  var heightBase=0;
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
    }
  }
  ringVerts.set(c, 0);
}

function makeDiamond() {
//==============================================================================
// Make a diamond-like shape from two adjacent tetrahedra, aligned with Z axis.

 var ctrColr = new Float32Array([0.1, 1, 0.8]); // dark gray
 var topColr = new Float32Array([1, 0.1, 0.3]); // light green
 var botColr = new Float32Array([0.2, 0.5, 1]); // light blue
 var capVerts = 30; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;   // radius of bottom of cylinder (top always 1.0)

 // Create a (global) array to hold this cylinder's vertices;
 diaVerts = new Float32Array(((capVerts*6) +4) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them.

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts +2; v++,j+=floatsPerVertex) {
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      diaVerts[j  ] = 0;      // x
      diaVerts[j+1] = 0;      // y
      diaVerts[j+2] = 1.0;
      diaVerts[j+3] = 1.0;      // r,g,b = topColr[]
      diaVerts[j+4]=ctrColr[0];
      diaVerts[j+5]=ctrColr[1];
      diaVerts[j+6]=ctrColr[2];
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      diaVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      diaVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      diaVerts[j+2] = 1.0;  // z
     diaVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      diaVerts[j+4]=ctrColr[0];
      diaVerts[j+5]=ctrColr[1];
      diaVerts[j+6]=ctrColr[2];
    }
  }


  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts + 2 ; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {
        diaVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        diaVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        diaVerts[j+2] = 1.0;  // z
       diaVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        diaVerts[j+4]=topColr[0];
        diaVerts[j+5]=topColr[1];
        diaVerts[j+6]=topColr[2];
    }
    else    // position all odd# vertices along the bottom cap:
    {
        diaVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        diaVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        diaVerts[j+2] = -0.2; // z
       diaVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        diaVerts[j+4]=botColr[0];
        diaVerts[j+5]=botColr[1];
        diaVerts[j+6]=botColr[2];
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts + 1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      diaVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      diaVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      diaVerts[j+2] =-0.2;  // z
      diaVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      diaVerts[j+4]=botColr[0];
      diaVerts[j+5]=botColr[1];
      diaVerts[j+6]=botColr[2];
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      diaVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      diaVerts[j+1] = 0.0;
      diaVerts[j+2] =-1.5;
      diaVerts[j+3] = 1.0;      // r,g,b = botColr[]
      diaVerts[j+4]=botColr[0];
      diaVerts[j+5]=botColr[1];
      diaVerts[j+6]=botColr[2];
    }
  }
}

function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([0.2, 0.2, 0.2]); // dark gray
 var topColr = new Float32Array([0.4, 0.7, 0.4]); // light green
 var botColr = new Float32Array([0.5, 0.5, 1.0]); // light blue
 var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.6;   // radius of bottom of cylinder (top always 1.0)
 
 // Create a (global) array to hold this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 

  // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
  // v counts vertices: j counts array elements (vertices * elements per vertex)
  for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {  
    // skip the first vertex--not needed.
    if(v%2==0)
    {       // put even# vertices at center of cylinder's top cap:
      cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,1,1
      cylVerts[j+1] = 0.0;  
      cylVerts[j+2] = 1.0; 
      cylVerts[j+3] = 1.0;      // r,g,b = topColr[]
      cylVerts[j+4]=ctrColr[0]; 
      cylVerts[j+5]=ctrColr[1]; 
      cylVerts[j+6]=ctrColr[2];
    }
    else {  // put odd# vertices around the top cap's outer edge;
            // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
            //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
      cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);     // x
      cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);     // y
      //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
      //   can simplify cos(2*PI * (v-1)/(2*capVerts))
      cylVerts[j+2] = 1.0;  // z
      cylVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      cylVerts[j+4]=topColr[0]; 
      cylVerts[j+5]=topColr[1]; 
      cylVerts[j+6]=topColr[2];     
    }
  }
  // Create the cylinder side walls, made of 2*capVerts vertices.
  // v counts vertices within the wall; j continues to count array elements
  for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
    if(v%2==0)  // position all even# vertices along top cap:
    {   
        cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);   // x
        cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);   // y
        cylVerts[j+2] = 1.0;  // z
        cylVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cylVerts[j+4]=topColr[0]; 
        cylVerts[j+5]=topColr[1]; 
        cylVerts[j+6]=topColr[2];     
    }
    else    // position all odd# vertices along the bottom cap:
    {
        cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);   // x
        cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);   // y
        cylVerts[j+2] =-1.0;  // z
        cylVerts[j+3] = 1.0;  // w.
        // r,g,b = topColr[]
        cylVerts[j+4]=botColr[0]; 
        cylVerts[j+5]=botColr[1]; 
        cylVerts[j+6]=botColr[2];     
    }
  }
  // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
  // v counts the vertices in the cap; j continues to count array elements
  for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
    if(v%2==0) {  // position even #'d vertices around bot cap's outer edge
      cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);   // x
      cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);   // y
      cylVerts[j+2] =-1.0;  // z
      cylVerts[j+3] = 1.0;  // w.
      // r,g,b = topColr[]
      cylVerts[j+4]=botColr[0]; 
      cylVerts[j+5]=botColr[1]; 
      cylVerts[j+6]=botColr[2];   
    }
    else {        // position odd#'d vertices at center of the bottom cap:
      cylVerts[j  ] = 0.0;      // x,y,z,w == 0,0,-1,1
      cylVerts[j+1] = 0.0;  
      cylVerts[j+2] =-1.0; 
      cylVerts[j+3] = 1.0;      // r,g,b = botColr[]
      cylVerts[j+4]=botColr[0]; 
      cylVerts[j+5]=botColr[1]; 
      cylVerts[j+6]=botColr[2];
    }
  }
}

function makeTorus() {
//==============================================================================
//    Create a torus centered at the origin that circles the z axis.  
// Terminology: imagine a torus as a flexible, cylinder-shaped bar or rod bent 
// into a circle around the z-axis. The bent bar's centerline forms a circle
// entirely in the z=0 plane, centered at the origin, with radius 'rbend'.  The 
// bent-bar circle begins at (rbend,0,0), increases in +y direction to circle  
// around the z-axis in counter-clockwise (CCW) direction, consistent with our
// right-handed coordinate system.
//    This bent bar forms a torus because the bar itself has a circular cross-
// section with radius 'rbar' and angle 'phi'. We measure phi in CCW direction 
// around the bar's centerline, circling right-handed along the direction 
// forward from the bar's start at theta=0 towards its end at theta=2PI.
//    THUS theta=0, phi=0 selects the torus surface point (rbend+rbar,0,0);
// a slight increase in phi moves that point in -z direction and a slight
// increase in theta moves that point in the +y direction.  
// To construct the torus, begin with the circle at the start of the bar:
//          xc = rbend + rbar*cos(phi); 
//          yc = 0; 
//          zc = -rbar*sin(phi);      (note negative sin(); right-handed phi)
// and then rotate this circle around the z-axis by angle theta:
//          x = xc*cos(theta) - yc*sin(theta)   
//          y = xc*sin(theta) + yc*cos(theta)
//          z = zc
// Simplify: yc==0, so
//          x = (rbend + rbar*cos(phi))*cos(theta)
//          y = (rbend + rbar*cos(phi))*sin(theta) 
//          z = -rbar*sin(phi)
// To construct a torus from a single triangle-strip, make a 'stepped spiral' along the length of the bent bar; successive rings of constant-theta, using the same design used for cylinder walls in 'makeCyl()' and for 'slices' in makeSphere().  Unlike the cylinder and sphere, we have no 'special case' for the first and last of these bar-encircling rings.
//
var rbend = 1.0;                    // Radius of circle formed by torus' bent bar
var rbar = 0.5;                     // radius of the bar we bent to form torus
var barSlices = 23;                 // # of bar-segments in the torus: >=3 req'd;
                                    // more segments for more-circular torus
var barSides = 13;                    // # of sides of the bar (and thus the 
                                    // number of vertices in its cross-section)
                                    // >=3 req'd;
                                    // more sides for more-circular cross-section
// for nice-looking torus with approx square facets, 
//      --choose odd or prime#  for barSides, and
//      --choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
// EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.

  // Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
//  Each slice requires 2*barSides vertices, but 1st slice will skip its first 
// triangle and last slice will skip its last triangle. To 'close' the torus,
// repeat the first 2 vertices at the end of the triangle-strip.  Assume 7

var phi=0, theta=0;                   // begin torus at angles 0,0
var thetaStep = 2*Math.PI/barSlices;  // theta angle between each bar segment
var phiHalfStep = Math.PI/barSides;   // half-phi angle between each side of bar
                                      // (WHY HALF? 2 vertices per step in phi)
  // s counts slices of the bar; v counts vertices within one slice; j counts
  // array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
  for(s=0,j=0; s<barSlices; s++) {    // for each 'slice' or 'ring' of the torus:
    for(v=0; v< 2*barSides; v++, j+=7) {    // for each vertex in this slice:
      if(v%2==0)  { // even #'d vertices at bottom of slice,
        torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
                                             Math.cos((s)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
                                             Math.sin((s)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
                //  z = -rbar  *   sin(phi)
        torVerts[j+3] = 1.0;    // w
      }
      else {        // odd #'d vertices at top of slice (s+1);
                    // at same phi used at bottom of slice (v-1)
        torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
                                             Math.cos((s+1)*thetaStep);
                //  x = (rbend + rbar*cos(phi)) * cos(theta)
        torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
                                             Math.sin((s+1)*thetaStep);
                //  y = (rbend + rbar*cos(phi)) * sin(theta) 
        torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
                //  z = -rbar  *   sin(phi)
        torVerts[j+3] = 1.0;    // w
      }
      torVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      torVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      torVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
    }
  }
  // Repeat the 1st 2 vertices of the triangle strip to complete the torus:
      torVerts[j  ] = rbend + rbar; // copy vertex zero;
              //  x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
      torVerts[j+1] = 0.0;
              //  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
      torVerts[j+2] = 0.0;
              //  z = -rbar  *   sin(phi==0)
      torVerts[j+3] = 1.0;    // w
      torVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      torVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      torVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
      j+=7; // go to next vertex:
      torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
              //  x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
      torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
              //  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
      torVerts[j+2] = 0.0;
              //  z = -rbar  *   sin(phi==0)
      torVerts[j+3] = 1.0;    // w
      torVerts[j+4] = Math.random();    // random color 0.0 <= R < 1.0
      torVerts[j+5] = Math.random();    // random color 0.0 <= G < 1.0
      torVerts[j+6] = Math.random();    // random color 0.0 <= B < 1.0
}