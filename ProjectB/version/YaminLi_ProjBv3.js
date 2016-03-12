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
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
  '  vec3 lightDirection = normalize(vec3(0.5, 3.0, 4.0)); \n' +
  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz); \n' +
  '  vec3 lightColor = vec3(1.0, 1.0, 1.0);\n' +
  '  if (a_Normal[0] == 0.0 && a_Normal[1] == 0.0 && a_Normal[2] == 0.0) {\n ' +
  '    v_Color = a_Color;\n ' +
  ' } else {\n' +
  ' float nDotL = clamp(dot(normal, lightDirection), 0.0, 1.0);\n' +
  ' vec3 diff = lightColor * a_Color.rgb * nDotL;\n' +
  '  v_Color = vec4(diff, a_Color.a);\n' +
  ' }\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// var floatsPerVertex = 6;	// # of Float32Array elements used for each vertex
													// (x,y,z)position + (r,g,b)color

var floatsPerVertex = 9;	// # of Float32Array elements used for each vertex

//var canvas;
// Create a JavaScript matrix to specify the view transformation
var viewMatrix = new Matrix4();
var projMatrix = new Matrix4();
var modelMatrix = new Matrix4();
var normalMatrix = new Matrix4();

var u_ViewMatrix, u_ProjMatrix, u_ModelMatrix, u_NormalMatrix;

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
  gl.enable(gl.DEPTH_TEST);

  // Get the graphics system storage locations of
  // the uniform variables u_ViewMatrix and u_ProjMatrix.
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_ModelMatrix = gl.getUniformLocation(gl.program,'u_ModelMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');

  if (!u_ViewMatrix || !u_ProjMatrix ) {
    console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
    return;
  }
  winResize();

  var tick = function() {
  var now = Date.now();
   currentAngle = animate(currentAngle, now);
   secondAngle = animate_small(secondAngle, now);
  //console.log("smallangle" + secondAngle);
  // Register the event handler to be called on key press
   document.onkeydown= function(ev){keydown(ev, gl); };
	// (Note that I eliminated the 'n' argument (no longer needed)).
  winResize();
  draw(gl,currentAngle, secondAngle);   // Draw the triangles
  requestAnimationFrame(tick, canvas);
 }
   tick();
}

function makecube() {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    // Coordinates
  var cubeV = new Float32Array([
       1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,
       1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0, // v0-v1-v2-v3 front
       1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,
       1.0, 1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0, // v0-v3-v4-v5 right
       1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,
       1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
      -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,
      -1.0, 1.0, 1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0, // v1-v6-v7-v2 left
      -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,
      -1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0, // v7-v4-v3-v2 down
       1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,
       1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0  // v4-v7-v6-v5 back
    ]);

    // Normal
    var normals = new Float32Array([
      0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,
      0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
      1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,
      1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
      0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,
      0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
     -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,   -1.0, 0.0, 0.0,
     -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,   -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
      0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,
      0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
      0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,
      0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
    ]);
    var coloArray = new Float32Array([Math.random(), Math.random(), Math.random()]);

  cubeVertex = new Float32Array(36 * floatsPerVertex);
  for (v = 0, j = 0, m = 0; v < 36; v++, j += floatsPerVertex, m += 3 ) {
      cubeVertex[j] = cubeV[m];
      cubeVertex[j + 1] = cubeV[m + 1];
      cubeVertex[j + 2] = cubeV[m + 2];
      cubeVertex[j + 3] = Math.random();
      cubeVertex[j + 4] = Math.random();
      cubeVertex[j + 5] = coloArray[2];
      cubeVertex[j + 6] = normals[m];
      cubeVertex[j + 7] = normals[m + 1];
      cubeVertex[j + 8] = normals[m + 2];
  }
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z),
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 20;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them.
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.

	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices;
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);
				sphVerts[j+2] = cos0;
	//			sphVerts[j+3] = 1.0;
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
//				sphVerts[j+3] = 1.0;																				// w.
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+3]=topColr[0];
				sphVerts[j+4]=topColr[1];
				sphVerts[j+5]=topColr[2];
        sphVerts[j +6] = 0.0;
        sphVerts[j +7] = 0.0;
        sphVerts[j +8] = 0.0;
				}
			else if(s==slices-1) {
				sphVerts[j+3]=botColr[0];
				sphVerts[j+4]=botColr[1];
				sphVerts[j+5]=botColr[2];
        sphVerts[j +6] = 0.0;
        sphVerts[j +7] = 0.0;
        sphVerts[j +8] = 0.0;
			}
			else {
					sphVerts[j+3]=Math.random();// equColr[0];
					sphVerts[j+4]=Math.random();// equColr[1];
					sphVerts[j+5]=Math.random();// equColr[2];
        sphVerts[j +6] = 0.0;
        sphVerts[j +7] = 0.0;
        sphVerts[j +8] = 0.0;
			}
		}
	}
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
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
		}
		gndVerts[j+3] = xColr[0];			// red
		gndVerts[j+4] = xColr[1];			// grn
		gndVerts[j+5] = xColr[2];			// blu
    gndVerts[j+6] = 0.0;			// red
    gndVerts[j+7] = 0.0;			// grn
    gndVerts[j+8] = 0.0;			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		gndVerts[j+3] = yColr[0];			// red
		gndVerts[j+4] = yColr[1];			// grn
		gndVerts[j+5] = yColr[2];			// blu
    gndVerts[j+6] = 0.0;			// red
    gndVerts[j+7] = 0.0;			// grn
    gndVerts[j+8] = 0.0;			// blu

	}
}

function initVertexBuffers(gl) {
//==============================================================================
  // Make our 'ground plane'; can you make a'torus' shape too?
  // (recall the 'basic shapes' starter code...)
   makeGroundGrid();
   makecube();

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
 //	mySiz = forestVerts.length + gndVerts.length;
  mySiz =
        gndVerts.length +
        cubeVertex.length;

  // if (draw_xyz) {
  //   mySiz += axes.length;
  // }

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
  var verticesColors = new Float32Array(mySiz);
  i = 0;

	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		verticesColors[i] = gndVerts[j];
		}

//   axeStart = i;
// //  console.log(axeStart + "axeStart");
// 	for(j=0; j< axes.length; i++, j++) {
// 		verticesColors[i] = axes[j];
// 	  }

  cubeStart = i;
	for(j=0; j< cubeVertex.length; i++, j++) {
		verticesColors[i] = cubeVertex[j];
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
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 9, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 9, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);


  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log("Failed to get the storage location of a_Normal");
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * 9, FSIZE * 6);
  gl.enableVertexAttribArray(a_Normal);

  return mySiz/floatsPerVertex;	// return # of vertices
}

 var g_EyeX = -25.0, g_EyeY = 10.0, g_EyeZ = 20.0;
//var g_EyeX = 2, g_EyeY = 0, g_EyeZ = -15.0;
// Global vars for Eye position.
// NOTE!  I moved eyepoint BACKWARDS from the forest: from g_EyeZ=0.25
// a distance far enough away to see the whole 'forest' of trees within the
// 30-degree field-of-view of our 'perspective' camera.  I ALSO increased
// the 'keydown()' function's effect on g_EyeX position.


function keydown(ev, gl) {
//------------------------------------------------------
//HTML calls this'Event handler' or 'callback function' when we press a key:

    if(ev.keyCode == 39) { // The right arrow key was pressed
//      g_EyeX += 0.01;
				g_EyeX += 0.1;		// INCREASED for perspective camera)
    } else if (ev.keyCode == 37) { // The left arrow key was pressed
//      g_EyeX -= 0.01;
				g_EyeX -= 0.1;		// INCREASED for perspective camera)
    } else if (ev.keyCode == 38) { // up arrow key was pressed
      g_EyeY += 0.1;
    } else if (ev.keyCode == 40) {// down arrow key was pressed
      g_EyeY -= 0.1;
    } else { return; } // Prevent the unnecessary drawing

    draw(gl);
}

var currentAngle = 45;
var secondAngle = 30;

function draw(gl, currentAngle, secondAngle) {
  //==============================================================================
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);

  var vpAspect = gl.drawingBufferWidth/2 /			// On-screen aspect ratio for
                              gl.drawingBufferHeight;		// this camera: width/height.

  projMatrix.setPerspective(30, vpAspect, 1, 100);

  // YOU TRY IT: make an equivalent camera using matrix-cuon-mod.js
  // perspective-camera matrix made by 'frustum()' function..

  // Send this matrix to our Vertex and Fragment shaders through the
  // 'uniform' variable u_ProjMatrix:
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  // Set the matrix to be used for to set the camera view
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
  // viewMatrix.setLookAt(0.2, 0.5, 4.5,
  											0, 0, 0, 								// look-at point (origin)
  											0, 1, 0);								// up vector (+y)

  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

//  modelMatrix.setRotate(currentAngle, 0, 1, 0);
  modelMatrix.setTranslate(0, 0, 0);
  pushMatrix(modelMatrix);
  pushMatrix(modelMatrix);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);


	// Draw the scene:
	drawMyScene(gl, currentAngle, secondAngle);
  modelMatrix = popMatrix();
  gl.uniformMatrix4fv(u_ModelMatrix,false, modelMatrix.elements);

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  drawfloor(gl);



  // Draw in the SECOND of several 'viewports'
  //------------------------------------------
	gl.viewport(gl.drawingBufferWidth/2, 				// Viewport lower-left corner
							0, 															// location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);
// REPLACE this orthographic camera matrix:
  projMatrix.setOrtho(-6.0, 6.0, 					// left,right;
                			-6.0, 6.0, 					// bottom, top;
                			0.0, 200.0);				// near, far; (always >=0)


  // Send this matrix to our Vertex and Fragment shaders through the
  // 'uniform' variable u_ProjMatrix:
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
	// but use a different 'view' matrix:
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, // eye position
  // viewMatrix.setLookAt(0, 0, 5,
  										0, 0, 0, 									// look-at point
  										0, 1, 0);									// up vector


  // Pass the view projection matrix to our shaders:
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  //
  // normalMatrix.setInverseOf(modelMatrix);
  // normalMatrix.transpose();
  // gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

	// Draw the scene:
	drawMyScene(gl, currentAngle,secondAngle);
  modelMatrix = popMatrix();
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  drawfloor(gl);
}

function drawMyScene(myGL, currentAngle, secondAngle) {
//===============================================================================
// Called ONLY from within the 'draw()' function
// Assumes already-correctly-set View matrix and Proj matrix;
// draws all items in 'world' coords.

  // Draw the 'forest' in the current 'world' coord system:
  // (where +y is 'up', as defined by our setLookAt() function call above...)
  //// draw  diamonds -----------------------

//-------------cube -----------------------------

   modelMatrix.setTranslate(-7, 0, 10);
   modelMatrix.scale(1,1,1);
   modelMatrix.rotate(secondAngle , 0, 1, 0);

   myGL.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  myGL.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,
                      cubeStart/floatsPerVertex,
                      cubeVertex.length/floatsPerVertex);

//  myGL.drawElements(myGL.TRIANGLES, cubeVertex.length/floatsPerVertex, myGL.UNSIGNED_BYTE, cubeStart/floatsPerVertex);
 // Rotate to make a new set of 'world' drawing axes:
 // old one had "+y points upwards", but
//  draw_rotate(myGL, currentAngle, SmallAngle, modelMatrix, u_ModelMatrix);
//  modelMatrix = popMatrix();
}

function drawfloor(gl) {
    viewMatrix.rotate(-90.0, 1,0,0);	// new one has "+z points upwards",
    																		// made by rotating -90 deg on +x-axis.
    																		// Move those new drawing axes to the
    																		// bottom of the trees:
  	viewMatrix.translate(0.0, 0.0, -0.6);
  	viewMatrix.scale(0.4, 0.4,0.4);		// shrink the drawing axes
  																		//for nicer-looking ground-plane, and
    // Pass the modified view matrix to our shaders:
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

    // Now, using these drawing axes, draw our ground plane:
    gl.drawArrays(gl.LINES,							// use this drawing primitive, and
    							gndStart/floatsPerVertex,	// start at this vertex number, and
    							gndVerts.length/floatsPerVertex);		// draw this many vertices
}

function winResize() {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas
	var nuGL = getWebGLContext(nuCanvas);							// and context:

	//Report our current browser-window contents:

	console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);
  console.log('Browser window: innerWidth,innerHeight=',
																innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp

	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight *  5 / 6;
	//IMPORTANT!  need to re-draw screen contents
	draw(nuGL,currentAngle, secondAngle);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
var g_last1 = Date.now();
var ANGLE_STEP = 20;
var ANGLE_STEP1 = 30;


function animate(angle, now) {
//==============================================================================
  // Calculate the elapsed time
 // var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
 //console.log("big" + angle);
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  if(angle >  70.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle < -70.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}


function animate_small(angle ,now) {
  // Calculate the elapsed time
  //  var now = Date.now();
 // console.log( angle);
  var elapsed = now - g_last1;
  g_last1 = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP1 * elapsed) / 1000.0;
  return newAngle %= 360;
}
