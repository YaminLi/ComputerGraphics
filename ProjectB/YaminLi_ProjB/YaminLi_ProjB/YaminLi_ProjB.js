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
  '  gl_Position = u_ProjMatrix * u_ViewMatrix  * a_Position;\n' +
  '  vec3 lightDirection = normalize(vec3(0.5, 3.0, 4.0)); \n' +
  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz); \n' +
  '  vec3 lightColor = vec3(1.0, 1.0, 1.0);\n' +
  '  if (a_Normal[0] == 0.0 && a_Normal[1] == 0.0 && a_Normal[2] == 0.0) {\n ' +
  '     v_Color = a_Color;\n ' +
  ' } else {\n' +
  '     float nDotL = clamp(dot(normal, lightDirection), 0.0, 1.0);\n' +
  '     vec3 diff = lightColor * a_Color.rgb * nDotL;\n' +
  '     v_Color = vec4(diff, a_Color.a);\n' +
  ' }\n' +
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
  
var floatsPerVertex = 10;	// # of Float32Array elements used for each vertex
													// (x,y,z)position + (r,g,b)color
var canvas;
var modelMatrix = new Matrix4();
var viewMatrix = new Matrix4();
var u_ViewMatrix = new Matrix4();
var projMatrix = new Matrix4();
var mvpMatrix = new Matrix4();
var normalMatrix = new Matrix4();
var currentAngle = 0.0;
var ANGLE_STEP = 45.0; 
var MOVE_STEP = 0.15;
var flag = -1;
var LOOK_STEP = 0.02;

var u_ViewMatrix, u_ProjMatrix, u_ModelMatrix, u_NormalMatrix;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight*4/5;

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
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_ModelMatrix = gl.getUniformLocation(gl.program,'u_ModelMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
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
  // var projMatrix = new Matrix4();
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
    gndVerts[j+7] = 0.0;     // red
    gndVerts[j+8] = 0.0;     // grn
    gndVerts[j+9] = 0.0; 

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
    gndVerts[j+7] = 0.0;     // red
    gndVerts[j+8] = 0.0;     // grn
    gndVerts[j+9] = 0.0; 

	}
}

function initVertexBuffers(gl) {
//==============================================================================

	// make our 'forest' of triangular-shaped trees:
  forestVerts = new Float32Array([
    // 3 Vertex coordinates (x,y,z) and 3 colors (r,g,b)
     0.0,  0.5,  -0.4,  1.0,  0.4,  1.0,  0.4, 0.0, 0.0, 0.0,// The back green one
    -0.5, -0.5,  -0.4,  1.0,  0.4,  1.0,  0.4, 0.0, 0.0, 0.0,
     0.5, -0.5,  -0.4,  1.0,  1.0,  0.4,  0.4, 0.0, 0.0, 0.0,
   
     0.5,  0.4,  -0.2,  1.0,  1.0,  0.4,  0.4, 0.0, 0.0, 0.0,// The middle yellow one
    -0.5,  0.4,  -0.2,  1.0,  1.0,  1.0,  0.4, 0.0, 0.0, 0.0,
     0.0, -0.6,  -0.2,  1.0,  1.0,  1.0,  0.4, 0.0, 0.0, 0.0,

     0.0,  0.5,   0.0,  1.0,  0.4,  0.4,  1.0,  0.0, 0.0, 0.0,// The front blue one 
    -0.5, -0.5,   0.0,  1.0,  0.4,  0.4,  1.0,  0.0, 0.0, 0.0,
     0.5, -0.5,   0.0,  1.0,  1.0,  0.4,  0.4,   0.0, 0.0, 0.0,

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
  makeSphere();
  makeTetrahedron();
  makeRing();
  makeDiamond();
  makeCylinder();
  makeTorus();

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	mySiz = forestVerts.length + gndVerts.length + axisVerts.length + headVerts.length + sphVerts.length + ttrVerts.length + ringVerts.length + diaVerts.length + cylVerts.length + torVerts.length;

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
  var verticesColors = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
  i=0;

  forestStart = 0;              // we store the forest first.
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

  sphStart = i;
  for(j=0; j< sphVerts.length; i++, j++) {
    verticesColors[i] = sphVerts[j];
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
  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE * floatsPerVertex, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 4);
  gl.enableVertexAttribArray(a_Color);

  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log("Failed to get the storage location of a_Normal");
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 7);
  gl.enableVertexAttribArray(a_Normal);

  return mySiz/floatsPerVertex;	// return # of vertices
}

var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = 4.25; 
var g_AtX = 0.0, g_AtY = 0.0, g_AtZ = 0.0;
look = new Vector3();
upCrossLook = new Vector3();

function setLook(){
  dx = g_AtX - g_EyeX;
  dy = g_AtY - g_EyeY;
  dz = g_AtZ - g_EyeZ;
  amp = Math.sqrt(dx*dx + dy*dy + dz*dz);

  look[0] = dx/amp;
  look[1] = dy/amp;
  look[2] = dz/amp;

  up = new Vector3();
  up[0] = 0;
  up[1] = 1;
  up[2] = 0;

  upCrossLook[0] = up[1]*look[2] - up[2]*look[1];
  upCrossLook[1] = up[2]*look[0] - up[0]*look[2];
  upCrossLook[2] = up[0]*look[1] - up[1]*look[0];

  amp = Math.sqrt(upCrossLook[0]*upCrossLook[0] + upCrossLook[1]*upCrossLook[1] + upCrossLook[2]*upCrossLook[2]) + 0.000001;

  upCrossLook[0] /= amp;
  upCrossLook[1] /= amp;
  upCrossLook[2] /= amp;

}



function keydown(ev, gl, u_ViewMatrix, viewMatrix) {
    if(ev.keyCode == 39) { 
        setLook();

        g_EyeX -= MOVE_STEP * upCrossLook[0];
        g_EyeY -= MOVE_STEP * upCrossLook[1];
        g_EyeZ -= MOVE_STEP * upCrossLook[2];

        g_AtX -= MOVE_STEP * upCrossLook[0];
        g_AtY -= MOVE_STEP * upCrossLook[1];
        g_AtZ -= MOVE_STEP * upCrossLook[2];
    } 
  else 
    if (ev.keyCode == 37) { 
        setLook();

        g_EyeX += MOVE_STEP * upCrossLook[0];
        g_EyeY += MOVE_STEP * upCrossLook[1];
        g_EyeZ += MOVE_STEP * upCrossLook[2];

        g_AtX += MOVE_STEP * upCrossLook[0];
        g_AtY += MOVE_STEP * upCrossLook[1];
        g_AtZ += MOVE_STEP * upCrossLook[2];
    } 
  else 
    if (ev.keyCode == 38) {
        setLook();     
        g_EyeX += MOVE_STEP * look[0];
        g_EyeY += MOVE_STEP * look[1];
        g_EyeZ += MOVE_STEP * look[2];

        g_AtX += MOVE_STEP * look[0];
        g_AtY += MOVE_STEP * look[1];
        g_AtZ += MOVE_STEP * look[2];

    } 
    else 
    if (ev.keyCode == 40) {
        setLook();
        
        g_EyeX -= MOVE_STEP * look[0];
        g_EyeY -= MOVE_STEP * look[1];
        g_EyeZ -= MOVE_STEP * look[2];

        g_AtX -= MOVE_STEP * look[0];
        g_AtY -= MOVE_STEP * look[1];
        g_AtZ -= MOVE_STEP * look[2];
    } 
    else
    if (ev.keyCode == 65){
      if(flag==-1 || flag==0)
        {
          x = g_AtX - g_EyeX;
          y = g_AtY - g_EyeY;
          z = g_AtZ - g_EyeZ;
          l = Math.sqrt(x*x + y*y + z*z);
          l_zx = Math.sqrt(x*x+z*z);
          sin_phi = l_zx / l;
          THETA_NOW = Math.PI -  Math.asin(x/l_zx) + LOOK_STEP;
        
          flag = 1;
        }
        else
        {
          THETA_NOW += LOOK_STEP;
        }

        g_AtY = y + g_EyeY;
        g_AtX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
        g_AtZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
    }

    else
      if(ev.keyCode==68){
        if (flag==-1 || flag==0)
        {
          x = g_AtX - g_EyeX;
          y = g_AtY - g_EyeY;
          z = g_AtZ - g_EyeZ;
          l = Math.sqrt(x*x + y*y + z*z);
          l_zx = Math.sqrt(x*x+z*z);
          sin_phi = l_zx / l;
          THETA_NOW = Math.PI -  Math.asin(x/l_zx) - LOOK_STEP;
          flag = 1;
        }
        else
        {
          THETA_NOW -= LOOK_STEP;
        }

        g_AtY = y + g_EyeY;
        g_AtX = l * sin_phi * Math.sin(THETA_NOW) + g_EyeX;
        g_AtZ = l * sin_phi * Math.cos(THETA_NOW) + g_EyeZ;
      }
    else
      if(ev.keyCode==87){ 
        if (flag==-1 || flag==1)
        {  
          x = g_AtX - g_EyeX;
          y = g_AtY - g_EyeY;
          z = g_AtZ - g_EyeZ;
          l = Math.sqrt(x*x + y*y + z*z);
          cos_theta = z / Math.sqrt(x*x + z*z);
          sin_theta = x / Math.sqrt(x*x + z*z);

          PHI_NEW = Math.asin(y/l) + LOOK_STEP;
          flag = 0;
        }
        else
        {
          PHI_NEW += LOOK_STEP;
        }

        g_AtY = l * Math.sin(PHI_NEW) + g_EyeY;
        g_AtX = l * Math.cos(PHI_NEW) * sin_theta + g_EyeX;
        g_AtZ = l * Math.cos(PHI_NEW) * cos_theta + g_EyeZ;
      }
    else
      if(ev.keyCode==83){ //s-look down
        if(flag==-1 || flag==1)
        { 
          x = g_AtX - g_EyeX;
          y = g_AtY - g_EyeY;
          z = g_AtZ - g_EyeZ;
          l = Math.sqrt(x*x + y*y + z*z);
  
          cos_theta = z / Math.sqrt(x*x + z*z);
          sin_theta = x / Math.sqrt(x*x + z*z);

          PHI_NEW = Math.asin(y/l) - LOOK_STEP;
          
          flag = 0;
        }
        else
        {
          PHI_NEW -= LOOK_STEP;
        }

        g_AtY = l * Math.sin(PHI_NEW) + g_EyeY;
        g_AtX = l * Math.cos(PHI_NEW) * sin_theta + g_EyeX;
        g_AtZ = l * Math.cos(PHI_NEW) * cos_theta + g_EyeZ;
      }
    else
      if(ev.keyCode==112){
      document.getElementById('Help').innerHTML= '<br> &nbsp Left-Perspective View and Right-orthographic' +
                                                 '<br> &nbsp Use Up/Down/Left/Right keys to go ahead/back/left/right' + 
                                                 '<br> &nbsp Use W/A/S/D to look up/left/down/right';
  
      }
    else { return; } // Prevent the unnecessary drawing
    draw(gl, currentAngle, u_ViewMatrix, viewMatrix);    
}


function draw(gl, currentAngle, u_ViewMatrix, viewMatrix) {
//==============================================================================
  
  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						canvas.width/2, 				// viewport width, height.
  						canvas.height);
  projMatrix.setPerspective(40, (0.5*canvas.width)/canvas.height, 1, 100);

  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);     
  						
  // Set the matrix to be used for to set the camera view
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
  											g_AtX, g_AtY, g_AtZ, 								// look-at point (origin)
  											0, 1, 0);								// up vector (+y)

  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);


	// Draw the scene:
	drawMyScene(gl, currentAngle, u_ViewMatrix, viewMatrix);
 

	gl.viewport(canvas.width/2, 				// Viewport lower-left corner
							0, 		// location(in pixels)
  						canvas.width/2, 				// viewport width, height.
  						canvas.height);

  projMatrix.setOrtho(-0.5*canvas.width/300, 0.5*canvas.width/300,          // left,right;
                      -canvas.height/300, canvas.height/300,          // bottom, top;
                      1, 100);


  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
	// but use a different 'view' matrix:
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position,
  											g_AtX, g_AtY, g_AtZ, 								// look-at point,
  											0, 1, 0);								// 'up' vector.

  // Pass the view projection matrix to our shaders:
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  
	// Draw the scene:
	drawMyScene(gl, currentAngle, u_ViewMatrix, viewMatrix);
}

function drawMyScene(myGL, currentAngle, myu_ViewMatrix, myViewMatrix) {
//===============================================================================

  myViewMatrix.rotate(-90.0, 1,0,0);	// new one has "+z points upwards",
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
  pushMatrix(myViewMatrix);
  // pushMatrix(myViewMatrix);

  myViewMatrix = popMatrix();
  myViewMatrix.translate(3, 1, 2);
  myViewMatrix.scale(0.8, 0.8, 0.5);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and
                sphVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix.translate(0, 0, 0);
  myViewMatrix.scale(3, 3, 3); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.LINES,              // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);

  myViewMatrix = popMatrix();
  myViewMatrix.translate(3, -1, -1);
  myViewMatrix.scale(0.7, 0.7, 0.3);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                diaStart/floatsPerVertex, // start at this vertex number, and
                diaVerts.length/floatsPerVertex);   // draw this many vertices


  myViewMatrix = popMatrix();
  myViewMatrix.translate(-3, -1, -1);
  myViewMatrix.scale(0.8, 0.4, 0.4);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                cylStart/floatsPerVertex, // start at this vertex number, and
                cylVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix = popMatrix();
  // myViewMatrix.rotate(90.0, 0,0,1);
  myViewMatrix.translate(-3, 1, 2);
  myViewMatrix.scale(0.8, 0.4, 0.4);    
  myViewMatrix.rotate(currentAngle, 1, 0, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLE_STRIP,              // use this drawing primitive, and
                torStart/floatsPerVertex, // start at this vertex number, and
                torVerts.length/floatsPerVertex);

  myViewMatrix = popMatrix();
  // myViewMatrix.rotate(-180.0, 0,0,1);
  myViewMatrix.translate(-3, -2, 0);
  myViewMatrix.scale(2, 2, 2); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.LINES,              // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex); 
 
  myViewMatrix = popMatrix();
  myViewMatrix.scale(2, 2, 2); 
  myViewMatrix.translate(0, 0.5+Math.cos(currentAngle*0.05), -0.5);
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.LINES,              // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex); 

  // myViewMatrix.translate(0, 0, 0);
  // myViewMatrix.rotate(currentAngle, 0, 1 , 0 );
  myViewMatrix.scale(0.1, 0.2,0.2);   
  myViewMatrix.rotate(currentAngle, 0, 1, 0);
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  normalMatrix.setInverseOf(myViewMatrix);
  normalMatrix.transpose();
  myGL.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices 

  myViewMatrix.translate(0.0, 0.0, 2); 
  myViewMatrix.scale(1, 1, 1); 
  myViewMatrix.rotate(currentAngle*0.6, 0, 1, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  normalMatrix.setInverseOf(myViewMatrix);
  normalMatrix.transpose();
   myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

  myViewMatrix.translate(0.0, 0.0, 2); 
  myViewMatrix.scale(1, 1, 1); 
  myViewMatrix.rotate(currentAngle*0.6, 0, 1, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  normalMatrix.setInverseOf(myViewMatrix);
  normalMatrix.transpose();
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices
  myViewMatrix.translate(0.0, 0.0, 2); 
  myViewMatrix.scale(1, 1, 1); 
  myViewMatrix.rotate(currentAngle*0.6, 0, 1, 0); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  normalMatrix.setInverseOf(myViewMatrix);
  normalMatrix.transpose();
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices
  pushMatrix(myViewMatrix);

  myViewMatrix.scale(3, 3, 3); 
  myViewMatrix.translate(0, 0, 0);
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.LINES,              // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);

  //  myViewMatrix.rotate(currentAngle*0.6, 0, 1, 0); 
  myViewMatrix = popMatrix();
  myViewMatrix.translate(0.0, 0.0, 2); 
  myViewMatrix.scale(0.1, 0.1, 1); 
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  normalMatrix.setInverseOf(myViewMatrix);
  normalMatrix.transpose();
  myGL.drawArrays(myGL.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

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
 if(angle >  45.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 if(angle < -45.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight*4/5;
}

function makeAxis(){
  axisVerts = new Float32Array([
     0,0,0,1,     1.0, 1.0, 1.0,  0.0, 0.0, 0.0,
     1,0,0,1,     1.0, 0.0, 0.0,  0.0, 0.0, 0.0,

     0,0,0,1,     1.0, 1.0, 1.0,  0.0, 0.0, 0.0,
     0,1,0,1,     0.0, 1.0, 0.0,  0.0, 0.0, 0.0,

     0,0,0,1,     1.0,1.0,1.0, 0.0, 0.0, 0.0,
     0,0,1,1,     0.0,0.0,1.0, 0.0, 0.0, 0.0,
    ]);
}

function makeHead(){
  headVerts = new Float32Array([
  
     1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// Node 3
     1.0,  1.0, -1.0, 1.0,    1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// Node 2
     1.0,  1.0,  1.0, 1.0,    1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// Node 4
     
     1.0,  1.0,  1.0, 1.0,    1.0, 0.1, 0.1,  1.0, 0.0, 0.0,// Node 4
     1.0, -1.0,  1.0, 1.0,    1.0, 0.1, 0.1,  1.0, 0.0, 0.0,// Node 7
     1.0, -1.0, -1.0, 1.0,    1.0, 0.1, 0.1,  1.0, 0.0, 0.0,// Node 3

    // +y face: GREEN
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0,// Node 1
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0,// Node 5
     1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0,// Node 4

     1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0,// Node 4
     1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0,// Node 2 
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0,// Node 1

    // +z face: BLUE
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 0.0, 1.0,// Node 5
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 0.0, 1.0,// Node 6
     1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 0.0, 1.0,// Node 7

     1.0, -1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  0.0, 0.0, 1.0, // Node 7
     1.0,  1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  0.0, 0.0, 1.0,// Node 4
    -1.0,  1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  0.0, 0.0, 1.0,// Node 5

    // -x face: CYAN
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  -1.0, 0.0, 0.0,// Node 6 
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  -1.0, 0.0, 0.0,// Node 5 
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  -1.0, 0.0, 0.0,// Node 1
    
    -1.0,  1.0, -1.0, 1.0,    0.1, 1.0, 1.0,  -1.0, 0.0, 0.0,// Node 1
    -1.0, -1.0, -1.0, 1.0,    0.1, 1.0, 1.0,  -1.0, 0.0, 0.0,// Node 0  
    -1.0, -1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  -1.0, 0.0, 0.0,// Node 6  
    
    // -y face: MAGENTA
     1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 1.0,  0.0, -1.0, 0.0,// Node 3
     1.0, -1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  0.0, -1.0, 0.0,// Node 7
    -1.0, -1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  0.0, -1.0, 0.0,// Node 6

    -1.0, -1.0,  1.0, 1.0,    1.0, 0.1, 1.0,  0.0, -1.0, 0.0,// Node 6
    -1.0, -1.0, -1.0, 1.0,    1.0, 0.1, 1.0,  0.0, -1.0, 0.0,// Node 0
     1.0, -1.0, -1.0, 1.0,    1.0, 0.1, 1.0,  0.0, -1.0, 0.0,// Node 3

     // -z face: YELLOW
     1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  0.0, 0.0, -1.0,// Node 2
     1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  0.0, 0.0, -1.0,// Node 3
    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  0.0, 0.0, -1.0,// Node 0   

    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  0.0, 0.0, -1.0,// Node 0
    -1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  0.0, 0.0, -1.0,// Node 1
     1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  0.0, 0.0, -1.0,// Node 2
     ]);
}

function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);  // North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);  // Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        sphVerts[j+2] = cos0;   
        sphVerts[j+3] = 1.0;      
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        sphVerts[j+2] = cos1;                                       // z
        sphVerts[j+3] = 1.0;                                        // w.   
      }
      if(s==0) {  // finally, set some interesting colors for vertices:
        sphVerts[j+4]=topColr[0]; 
        sphVerts[j+5]=topColr[1]; 
        sphVerts[j+6]=topColr[2]; 
        }
      else if(s==slices-1) {
        sphVerts[j+4]=botColr[0]; 
        sphVerts[j+5]=botColr[1]; 
        sphVerts[j+6]=botColr[2]; 
      }
      else {
          sphVerts[j+4]=Math.random();// equColr[0]; 
          sphVerts[j+5]=Math.random();// equColr[1]; 
          sphVerts[j+6]=Math.random();// equColr[2];          
      }
        sphVerts[j+7]=0.0; 
        sphVerts[j+8]=0.0; 
        sphVerts[j+9]=0.0;
    }
  }
}

function makeTetrahedron() {
  ttrVerts = new Float32Array([
      // Face 0
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  0.0, 0.0, 0.0,// Node 0
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  0.0, 0.0, 0.0,// Node 1
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  0.0, 0.0, 0.0,// Node 2
      // Face 1(front)
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  0.0, 0.0, 0.0,// Node 0
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  0.0, 0.0, 0.0,// Node 2
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  0.0, 0.0, 0.0,// Node 3
      // Face 2
     0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  0.0, 0.0, 0.0,// Node 0 
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  0.0, 0.0, 0.0,// Node 3
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  0.0, 0.0, 0.0,// Node 1 
      // Face 3  
    -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  0.0, 0.0, 0.0,// Node 3
     0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  0.0, 0.0, 0.0,// Node 2
     0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  0.0, 0.0, 0.0,// Node 1
    ]);
}


function makeRing(){
  ringVerts = new Float32Array(960);
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
        c=c.concat([0.0, 0.0, 0.0]);
        index = 1;
      }
      else{
        c.push(tempX, tempY, tempZ, 1.0);
        c=c.concat(colors[9-Math.floor(temp/4)]);
        c=c.concat([0.0, 0.0, 0.0]);
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
    diaVerts[j+7] = 0.0;
    diaVerts[j+8] = 0.0;
    diaVerts[j+9] = 0.0;
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
    diaVerts[j+7] = 0.0;
    diaVerts[j+8] = 0.0;
    diaVerts[j+9] = 0.0;
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
    diaVerts[j+7] = 0.0;
    diaVerts[j+8] = 0.0;
    diaVerts[j+9] = 0.0;
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
    cylVerts[j+7]=0.0;
    cylVerts[j+8]=0.0;
    cylVerts[j+9]=0.0;
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
    cylVerts[j+7]=0.0;
    cylVerts[j+8]=0.0;
    cylVerts[j+9]=0.0;
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
    cylVerts[j+7]=0.0;
    cylVerts[j+8]=0.0;
    cylVerts[j+9]=0.0;
  }
}

function makeTorus() {
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
      for(v=0; v< 2*barSides; v++, j+=floatsPerVertex) {    // for each vertex in this slice:
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
        torVerts[j+7]=0.0;
        torVerts[j+8]=0.0;
        torVerts[j+9]=0.0;
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
        torVerts[j+7]=0.0;
        torVerts[j+8]=0.0;
        torVerts[j+9]=0.0;
        j+=floatsPerVertex; // go to next vertex:
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
        torVerts[j+7]=0.0;
        torVerts[j+8]=0.0;
        torVerts[j+9]=0.0;
}