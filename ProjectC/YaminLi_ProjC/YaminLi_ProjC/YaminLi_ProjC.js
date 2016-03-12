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
  //-------------Set precision.
  // GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
  // DEFAULT for Vertex Shaders:  precision highp float; precision highp int;
  //                  precision lowp sampler2D; precision lowp samplerCube;
  // DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
  //                  precision lowp sampler2D; precision lowp samplerCube;
  //--------------- GLSL Struct Definitions:
  'struct LampT {\n' +    // Describes one point-like Phong light source
  '   vec3 pos;\n' +      // (x,y,z,w); w==1.0 for local light at x,y,z position
                          //       w==0.0 for distant light from x,y,z direction 
  '   vec3 ambi;\n' +     // Ia ==  ambient light source strength (r,g,b)
  '   vec3 diff;\n' +     // Id ==  diffuse light source strength (r,g,b)
  '   vec3 spec;\n' +     // Is == specular light source strength (r,g,b)
  '}; \n' +

  'struct MatlT {\n' +    // Describes one Phong material by its reflectances:
  '   vec3 emit;\n' +     // Ke: emissive -- surface 'glow' amount (r,g,b);
  '   vec3 ambi;\n' +     // Ka: ambient reflectance (r,g,b)
  '   vec3 diff;\n' +     // Kd: diffuse reflectance (r,g,b)
  '   vec3 spec;\n' +     // Ks: specular reflectance (r,g,b)
  '   int shiny;\n' +     // Kshiny: specular exponent (integer >= 1; typ. <200)
  '   };\n' +
  //                                
  //-------------ATTRIBUTES of each vertex, read from our Vertex Buffer Object
  'attribute vec4 a_Position; \n' +   // vertex position (model coord sys)
  'attribute vec4 a_Normal; \n' +     // vertex normal vector (model coord sys)

                    
  //-------------UNIFORMS: values set from JavaScript before a drawing command.
//  'uniform vec3 u_Kd; \n' +           // Phong diffuse reflectance for the 
                                      // entire shape. Later: as vertex attrib.
  'uniform LampT u_LampSet[2];\n' +   // Array of all light sources.
  'uniform MatlT u_MatlSet[1];\n' +   // Array of all materials.


  'uniform mat4 u_MvpMatrix; \n' +
  'uniform mat4 u_ModelMatrix; \n' +    // Model matrix
  'uniform mat4 u_NormalMatrix; \n' +   // Inverse Transpose of ModelMatrix;
                                        // (won't distort normal vec directions
                                        // but it usually WILL change its length)
  'uniform vec3 u_eyePosWorld; \n' +  // Camera/eye location in world coords.
  'uniform int worldLight;\n' +
  'uniform int eyeLight;\n' +
  'uniform int isPhong;\n' +
  'uniform int att;\n' +

  
  //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
  'varying vec4 g_color; \n' +

  'varying vec3 v_Kd; \n' +             // Phong Lighting: diffuse reflectance
                                        // (I didn't make per-pixel Ke,Ka,Ks;
                                        // we use 'uniform' values instead)
  'varying vec4 v_Position; \n' +       
  'varying vec3 v_Normal; \n' +         // Why Vec3? its not a point, hence w==0
  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +
  //-----------------------------------------------------------------------------
  'void main() { \n' +
    // Compute CVV coordinate values from our given vertex. This 'built-in'
    // 'varying' value gets interpolated to set screen position for each pixel.
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
    // Calculate the vertex position & normal vec in the WORLD coordinate system
    // for use as a 'varying' variable: fragment shaders get per-pixel values
    // (interpolated between vertices for our drawing primitive (TRIANGLE)).
  '  v_Position = u_ModelMatrix * a_Position; \n' +
    // 3D surface normal of our vertex, in world coords.  ('varying'--its value
    // gets interpolated (in world coords) for each pixel's fragment shader.
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Kd = u_MatlSet[0].diff; \n' +    // find per-pixel diffuse reflectance from per-vertex
                          // (no per-pixel Ke,Ka, or Ks, but you can do it...)
//  '  v_Kd = vec3(1.0, 1.0, 0.0); \n'  + // TEST; color fixed at green
  '  vec3 normal = normalize(v_Normal); \n' +
//  '  vec3 normal = v_Normal; \n' +
      // Find the unit-length light dir vector 'L' (surface pt --> light):
  '  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
  '  vec3 lightDirection1 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
      // Find the unit-length eye-direction vector 'V' (surface pt --> camera)
  '  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
      // The dot product of (unit-length) light direction and the normal vector
      // (use max() to discard any negatives from lights below the surface) 
      // (look in GLSL manual: what other functions would help?)
      // gives us the cosine-falloff factor needed for the diffuse lighting term:
  '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
  '  float nDotL1 = max(dot(lightDirection1, normal), 0.0); \n' +
      // The Blinn-Phong lighting model computes the specular term faster 
      // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
      // where 'halfway' vector H has a direction half-way between L and V
      // H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
      // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)

  '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
  '  vec3 H1 = normalize(lightDirection1 + eyeDirection); \n' +
  'if(isPhong == 1){\n' +
  '   H = reflect(-lightDirection, normal); \n' +
  '   H1 = reflect(-lightDirection1, normal); \n' +
  '} \n' +

  '  float nDotH = max(dot(H, normal), 0.0); \n' +
  '  float nDotH1 = max(dot(H1, normal), 0.0); \n' +
      // (use max() to discard any negatives from lights below the surface)
      // Apply the 'shininess' exponent K_e:
      // Try it two different ways:   The 'new hotness': pow() fcn in GLSL.
      // CAREFUL!  pow() won't accept integer exponents! Convert K_shiny!  
  '  float e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
  '  float e64_1 = pow(nDotH1, float(u_MatlSet[0].shiny));\n' +
   'if(att == 1) {\n' +
  ' e64 = e64/(2.0+dot(lightDirection, lightDirection));' +
  ' e64_1 = e64_1/(2.0 + dot(lightDirection1, lightDirection1));' +
  ' }\n' +
  'else if(att == 2) {\n' +
  ' e64 = e64/(2.0+dot(lightDirection, lightDirection)*dot(lightDirection, lightDirection));' +
  ' e64_1 = e64_1/(2.0 + dot(lightDirection1, lightDirection1)*dot(lightDirection, lightDirection));' +
  ' }\n' +
  // Calculate the final color from diffuse reflection and ambient reflection
//  '  vec3 emissive = u_Ke;' +
  '  if(worldLight == 1 && eyeLight == 1) {\n' +
  '     vec3 emissive =                    u_MatlSet[0].emit;' +
  '     vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
  '     vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
  '     vec3 emissive1 =                    u_MatlSet[0].emit;' +
  '     vec3 ambient1 = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse1 = u_LampSet[1].diff * v_Kd * nDotL1;\n' +
  '     vec3 speculr1 = u_LampSet[1].spec * u_MatlSet[0].spec * e64_1;\n' +
  '     g_color = vec4(emissive + ambient + diffuse + speculr + emissive1 + ambient1 + diffuse1 + speculr1 , 1.0);\n' +
  '  } \n' +
  '  else if(worldLight == 1) {\n' +
  '     vec3 emissive =                    u_MatlSet[0].emit;' +
  '     vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
  '     vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
  '     g_color = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '  } \n' +
  '  else if(eyeLight == 1) {\n' +
  '     vec3 emissive =                    u_MatlSet[0].emit;' +
  '     vec3 ambient = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse = u_LampSet[1].diff * v_Kd * nDotL1;\n' +
  '     vec3 speculr = u_LampSet[1].spec * u_MatlSet[0].spec * e64_1;\n' +
  '     g_color = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '  } \n' +
  '  else {\n' +
  '     g_color = vec4(0.0, 0.0, 0.0, 1.0); \n' +
  '  } \n' +
  '}\n';


var FSHADER_SOURCE =
  //-------------Set precision.
  // GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
  // DEFAULT for Vertex Shaders:  precision highp float; precision highp int;
  //                  precision lowp sampler2D; precision lowp samplerCube;
  // DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
  //                  precision lowp sampler2D; precision lowp samplerCube;
  // MATCH the Vertex shader precision for float and int:
  'precision highp float;\n' +
  'precision highp int;\n' +
  //
  //--------------- GLSL Struct Definitions:
  'struct LampT {\n' +    // Describes one point-like Phong light source
  '   vec3 pos;\n' +      // (x,y,z,w); w==1.0 for local light at x,y,z position
                          //       w==0.0 for distant light from x,y,z direction 
  '   vec3 ambi;\n' +     // Ia ==  ambient light source strength (r,g,b)
  '   vec3 diff;\n' +     // Id ==  diffuse light source strength (r,g,b)
  '   vec3 spec;\n' +     // Is == specular light source strength (r,g,b)
  '}; \n' +
  //
  'struct MatlT {\n' +    // Describes one Phong material by its reflectances:
  '   vec3 emit;\n' +     // Ke: emissive -- surface 'glow' amount (r,g,b);
  '   vec3 ambi;\n' +     // Ka: ambient reflectance (r,g,b)
  '   vec3 diff;\n' +     // Kd: diffuse reflectance (r,g,b)
  '   vec3 spec;\n' +     // Ks: specular reflectance (r,g,b)
  '   int shiny;\n' +     // Kshiny: specular exponent (integer >= 1; typ. <200)
  '   };\n' +
  //
  //-------------UNIFORMS: values set from JavaScript before a drawing command.
  // first light source: (YOU write a second one...)
  'uniform LampT u_LampSet[2];\n' +   // Array of all light sources.
  'uniform MatlT u_MatlSet[1];\n' +   // Array of all materials.
// OLD first material definition: you write 2nd, 3rd, etc.
//  'uniform vec3 u_Ke;\n' +            // Phong Reflectance: emissive
//  'uniform vec3 u_Ka;\n' +            // Phong Reflectance: ambient
  // no Phong Reflectance: diffuse? -- no: use v_Kd instead for per-pixel value
//  'uniform vec3 u_Ks;\n' +            // Phong Reflectance: specular
//  'uniform int u_Kshiny;\n' +       // Phong Reflectance: 1 < shiny < 128
//
  'uniform vec3 u_eyePosWorld; \n' +  // Camera/eye location in world coords.
  'uniform int worldLight;\n' +
  'uniform int eyeLight;\n' +
  'uniform int isPhong;\n' +
  'uniform int isGouraud;\n' +
  'uniform int isTexture;\n' +
  'uniform int att;\n' +
  
  //-------------VARYING:Vertex Shader values sent per-pix'''''''''''''''';el to Fragment shader: 
  'varying vec3 v_Normal;\n' +        // Find 3D surface normal at each pix
  'varying vec4 v_Position;\n' +      // pixel's 3D pos too -- in 'world' coords
  'varying vec3 v_Kd; \n' +           // Find diffuse reflectance K_d per pix
                            // Ambient? Emissive? Specular? almost
                            // NEVER change per-vertex: I use 'uniform' values
  'varying vec4 g_color; \n' +
  'varying vec2 v_TexCoord;\n' + // interpolated texture coords for this pixel
  'uniform sampler2D u_Sampler;\n' +  // claim a perspective-texture-addr calc

  'void main() { \n' +
      // Normalize! !!IMPORTANT!! TROUBLE if you don't! 
      // normals interpolated for each pixel aren't 1.0 in length any more!
  '  vec3 normal = normalize(v_Normal); \n' +
//  '  vec3 normal = v_Normal; \n' +
      // Find the unit-length light dir vector 'L' (surface pt --> light):
  '  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
  '  vec3 lightDirection1 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
      // Find the unit-length eye-direction vector 'V' (surface pt --> camera)
  '  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
      // The dot product of (unit-length) light direction and the normal vector
      // (use max() to discard any negatives from lights below the surface) 
      // (look in GLSL manual: what other functions would help?)
      // gives us the cosine-falloff factor needed for the diffuse lighting term:
  '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
  '  float nDotL1 = max(dot(lightDirection1, normal), 0.0); \n' +
      // The Blinn-Phong lighting model computes the specular term faster 
      // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
      // where 'halfway' vector H has a direction half-way between L and V
      // H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
      // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)

  '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
  '  vec3 H1 = normalize(lightDirection1 + eyeDirection); \n' +
  'if(isPhong == 1){\n' +
  '   H = reflect(-lightDirection, normal); \n' +
  '   H1 = reflect(-lightDirection1, normal); \n' +
  '} \n' +

  '  float nDotH = max(dot(H, normal), 0.0); \n' +
  '  float nDotH1 = max(dot(H1, normal), 0.0); \n' +
      // (use max() to discard any negatives from lights below the surface)
      // Apply the 'shininess' exponent K_e:
      // Try it two different ways:   The 'new hotness': pow() fcn in GLSL.
      // CAREFUL!  pow() won't accept integer exponents! Convert K_shiny!  
  '  float e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
  '  float e64_1 = pow(nDotH1, float(u_MatlSet[0].shiny));\n' +
  'if(att == 1) {\n' +
  ' e64 = e64/(2.0+dot(lightDirection, lightDirection));' +
  ' e64_1 = e64_1/(2.0 + dot(lightDirection1, lightDirection1));' +
  ' }\n' +
  'if(att == 2) {\n' +
  ' e64 = e64/(4.0+dot(lightDirection, lightDirection)*dot(lightDirection, lightDirection));' +
  ' e64_1 = e64_1/(4.0 + dot(lightDirection1, lightDirection1)*dot(lightDirection, lightDirection));' +
  ' }\n' +
  // Calculate the final color from diffuse reflection and ambient reflection
//  '  vec3 emissive = u_Ke;' +
  'if(isGouraud == 1) {\n' +
  '   gl_FragColor = g_color; \n' +
  '} \n' +
  'else {\n' +
  '  if(worldLight == 1 && eyeLight == 1) {\n' +
  '     vec3 emissive =                    u_MatlSet[0].emit;' +
  '     vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
  '     vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
  '     vec3 emissive1 =                    u_MatlSet[0].emit;' +
  '     vec3 ambient1 = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse1 = u_LampSet[1].diff * v_Kd * nDotL1;\n' +
  '     vec3 speculr1 = u_LampSet[1].spec * u_MatlSet[0].spec * e64_1;\n' +
  '     gl_FragColor = vec4(emissive + ambient + diffuse + speculr + emissive1 + ambient1 + diffuse1 + speculr1 , 1.0);\n' +
  '  } \n' +
  '  else if(worldLight == 1) {\n' +
  '     vec3 emissive =                    u_MatlSet[0].emit;' +
  '     vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
  '     vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
  '     gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '  } \n' +
  '  else if(eyeLight == 1) {\n' +
  '     vec3 emissive =                    u_MatlSet[0].emit;' +
  '     vec3 ambient = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
  '     vec3 diffuse = u_LampSet[1].diff * v_Kd * nDotL1;\n' +
  '     vec3 speculr = u_LampSet[1].spec * u_MatlSet[0].spec * e64_1;\n' +
  '     gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '  } \n' +
  '  else {\n' +
  '     gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); \n' +
  '  } \n' +
  '} \n' +
  'if(isTexture == 1) {\n' +
  ' gl_FragColor += 0.3*texture2D(u_Sampler, v_TexCoord); \n' +
  '} \n' +
  '}\n';
  
var uLoc_eyePosWorld  = false;
var uLoc_ModelMatrix  = false;
var uLoc_MvpMatrix    = false;
var uLoc_NormalMatrix = false;

// ... for Phong material/reflectance:
var uLoc_Ke = false;
var uLoc_Ka = false;
var uLoc_Kd = false;
var uLoc_Kd2 = false;     // for K_d within the MatlSet[0] element.l
var uLoc_Ks = false;
var uLoc_Kshiny = false;

//  ... for 3D scene variables (previously used as arguments to draw() function)
var canvas  = false;
var gl      = false;
var n_vcount= false;  // formerly 'n', but that name is far too vague and terse
                      // to use safely as a global variable.

// NEXT, create global vars that contain the values we send thru those uniforms,
//  ... for our camera:
var eyePosWorld = new Float32Array(3);  // x,y,z in world coords
var worldLightPos = new Float32Array(3);
var ambient = new Float32Array(3);
var diffuse = new Float32Array(3);
var specular = new Float32Array(3);

worldLightPos = [0.0, 5.0, 5.0];
ambient = [0.4, 0.4, 0.4];
diffuse = [1.0, 1.0, 1.0];
specular = [1.0, 1.0, 1.0];
//  ... for our transforms:
var modelMatrix = new Matrix4();  // Model matrix
var mvpMatrix   = new Matrix4();  // Model-view-projection matrix
var normalMatrix= new Matrix4();  // Transformation matrix for normals

//  ... for our first light source:   (stays false if never initialized)
var lamp0 = new LightsT();
var lamp1 = new LightsT();

  // ... for our first material:
// var matlSel= MATL_PEARL;        // see keypress(): 'm' key changes matlSel 

var matl0 = new Material(MATL_PEARL);  
var matl1 = new Material(MATL_GOLD_SHINY);
var matl2 = new Material(MATL_GRN_PLASTIC);
var matl3 = new Material(MATL_TURQUOISE);


var uLoc_worldLight = false;
var uLoc_eyeLight = false;
var uLoc_isPhong = false;
var uLoc_isGouraud = false;
var uLoc_isTexture = false;
var uLoc_att = false;
var worldLight = 1;
var eyeLight = 0;
var isPhong = 0;
var isGouraud = 0;
var isTexture = 0;
var att = 0;

var floatsPerVertex = 12;	// # of Float32Array elements used for each vertex
													// (x,y,z)position + (r,g,b)color

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
  canvas.height=window.innerHeight;

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
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
  // u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  // u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  u_ModelMatrix = gl.getUniformLocation(gl.program,'u_ModelMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_MvpMatrix || !u_ModelMatrix || !u_NormalMatrix) { 
    console.log('Failed to get u_MvpMatrix or u_ModelMatrix or u_NormalMatrix');
    return;
  }

  // Create a JavaScript matrix to specify the view transformation
  
  // Register the event handler to be called on key press
  document.onkeydown= function(ev){keydown(ev, gl); };
	// (Note that I eliminated the 'n' argument (no longer needed)).

  uLoc_worldLight = gl.getUniformLocation(gl.program, 'worldLight');
  uLoc_eyeLight = gl.getUniformLocation(gl.program,'eyeLight');
  uLoc_isPhong= gl.getUniformLocation(gl.program, 'isPhong');
  uLoc_isGouraud= gl.getUniformLocation(gl.program, 'isGouraud');
  uLoc_isTexture = gl.getUniformLocation(gl.program, 'isTexture');
  uLoc_att = gl.getUniformLocation(gl.program, 'att');
  if(!uLoc_worldLight || !uLoc_eyeLight || !uLoc_isPhong || !uLoc_isGouraud || !uLoc_isTexture || !uLoc_att){
      console.log('Failed to get worldLight or eyeLight');
      return;
  }

	
  uLoc_eyePosWorld  = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
  uLoc_ModelMatrix  = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  uLoc_MvpMatrix    = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  uLoc_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!uLoc_eyePosWorld ||
      !uLoc_ModelMatrix || !uLoc_MvpMatrix || !uLoc_NormalMatrix) {
    console.log('Failed to get GPUs matrix storage locations');
    return;
    }
  //  ... for Phong light source:
  // NEW!  Note we're getting the location of a GLSL struct array member:

  lamp0.u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet[0].pos'); 
  lamp0.u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet[0].ambi');
  lamp0.u_diff = gl.getUniformLocation(gl.program, 'u_LampSet[0].diff');
  lamp0.u_spec = gl.getUniformLocation(gl.program, 'u_LampSet[0].spec');
  if( !lamp0.u_pos || !lamp0.u_ambi || !lamp0.u_diff || !lamp0.u_spec ) {
    console.log('Failed to get GPUs Lamp0 storage locations');
    return;
  }

  lamp1.u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet[1].pos'); 
  lamp1.u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet[1].ambi');
  lamp1.u_diff = gl.getUniformLocation(gl.program, 'u_LampSet[1].diff');
  lamp1.u_spec = gl.getUniformLocation(gl.program, 'u_LampSet[1].spec');
  if( !lamp1.u_pos || !lamp1.u_ambi || !lamp1.u_diff || !lamp1.u_spec ) {
    console.log('Failed to get GPUs Lamp1 storage locations');
    return;
  }

  // ... for Phong material/reflectance:
  // OLD global vars - absorb them into the Material objects;
  uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
  console.log('uLoc_Ke', uLoc_Ke, '\n');
  uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
  uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
  uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
  uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');
  
  if(!uLoc_Ke || !uLoc_Ka || !uLoc_Kd // || !uLoc_Kd2
              || !uLoc_Ks || !uLoc_Kshiny
     ) {
    console.log('Failed to get GPUs Reflectance storage locations');
    return;
  }
  
  // TEST: can we store/retrieve these locations in our matl0 object?
  // try one:
  matl0.uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
  console.log('matl0.uLoc_Ke', matl0.uLoc_Ke);
/*  uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
  uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
  uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
  uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');
*/
  if(!matl0.uLoc_Ke
  //  || !matl0.uLoc_Ka || !matl0.uLoc_Kd // || !uLoc_Kd2
  //            || !matl0.uLoc_Ks || !matl0.uLoc_Kshiny
     ) {
    console.log('Failed to get GPUs Reflectance NEW storage locations');
    return;
  }

  if (!initTextures(gl, n)) {
    console.log('Failed to properly load texture(s) into GPU memory buffer!');
    return;
  }
  // Position the camera in world coordinates:
  eyePosWorld.set([6.0, 0.0, 0.0]);
  gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
  // (Note: uniform4fv() expects 4-element float32Array as its 2nd argument)
  
  // Init World-coord. position & colors of first light source in global vars;
  lamp0.I_pos.elements.set(worldLightPos);
  lamp0.I_ambi.elements.set([0.4, 0.4, 0.4]);
  lamp0.I_diff.elements.set([1.0, 1.0, 1.0]);
  lamp0.I_spec.elements.set([1.0, 1.0, 1.0]);

  lamp1.I_pos.elements.set( [eyePosWorld[0], eyePosWorld[1], eyePosWorld[2]]);
  lamp1.I_ambi.elements.set([0.4, 0.4, 0.4]);
  lamp1.I_diff.elements.set([0.8, 0.8, 0.8]);
  lamp1.I_spec.elements.set([1.0, 1.0, 1.0]);

  var worldLightGUI = function() {
    this.LightPosX = worldLightPos[0];
    this.LightPosY = worldLightPos[1];
    this.LightPosZ = worldLightPos[2];
    this.ambientR = ambient[0];
    this.ambientG = ambient[1];
    this.ambientB = ambient[2];
    this.diffuseR = diffuse[0];
    this.diffuseG = diffuse[1];
    this.diffuseB = diffuse[2];
    this.specularR = specular[0];
    this.specularG = specular[1];
    this.specularB = specular[2];
  };

  var worldLight = new worldLightGUI();
  var gui = new DAT.GUI();
  var LightControllerX = gui.add(worldLight, 'LightPosX').step(0.2);
  var LightControllerY = gui.add(worldLight, 'LightPosY').step(0.2);
  var LightControllerZ = gui.add(worldLight, 'LightPosZ').step(0.2);
  var AmbientControllerR = gui.add(worldLight, 'ambientR', 0,1).step(0.05);
  var AmbientControllerG = gui.add(worldLight, 'ambientG', 0,1).step(0.05);
  var AmbientControllerB = gui.add(worldLight, 'ambientB', 0,1).step(0.05);
  var DiffuseControllerR = gui.add(worldLight, 'diffuseR',0,1).step(0.05);
  var DiffuseControllerG = gui.add(worldLight, 'diffuseG',0,1).step(0.05);
  var DiffuseControllerB = gui.add(worldLight, 'diffuseB',0,1).step(0.05);
  var SpecularControllerR = gui.add(worldLight, 'specularR',0,1).step(0.05);
  var SpecularControllerG = gui.add(worldLight, 'specularG',0,1).step(0.05);
  var SpecularControllerB = gui.add(worldLight, 'specularB',0,1).step(0.05);

  LightControllerX.onChange(function(newX){
    worldLightPos[0] = newX;
  });

  LightControllerY.onChange(function(newY){
    worldLightPos[2] = -newY;
  });

  LightControllerZ.onChange(function(newZ){
    worldLightPos[1] = newZ;
  });

  AmbientControllerR.onChange(function(newAmbientR){
    ambient[0] = newAmbientR;
  });

  AmbientControllerG.onChange(function(newAmbientG){
    ambient[1] = newAmbientG;
  });

  AmbientControllerB.onChange(function(newAmbientB){
    ambient[2] = newAmbientB;
  });

  DiffuseControllerR.onChange(function(newDiffuseR){
    diffuse[0] = newDiffuseR;
  });

  DiffuseControllerG.onChange(function(newDiffuseG){
    diffuse[1] = newDiffuseG;
  });

  DiffuseControllerB.onChange(function(newDiffuseB){
    diffuse[2] = newDiffuseB;
  });

  SpecularControllerR.onChange(function(newSpecularR){
    specular[0] = newSpecularR;
  });

  SpecularControllerG.onChange(function(newSpecularG){
    specular[1] = newSpecularG;
  });

  SpecularControllerB.onChange(function(newSpecularB){
    specular[2] = newSpecularB;
  });

  var tick =function(){
    currentAngle = animate(currentAngle); 
    draw(currentAngle);   // Draw the triangles  
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

  for(v=0, j=0; v<2*(xcount+ycount); v++, j+= floatsPerVertex) {
    if(v%4==0) {  // put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;  // x
      gndVerts[j+1] = -xymax;               // y
      gndVerts[j+2] = 0;                  // z
      gndVerts[j+3] = 1.0;  
    }
    else if(v%4 == 1){
      gndVerts[j  ] = -xymax;               // x
      gndVerts[j+1] = -xymax + (v  )*ygap;  // y
      gndVerts[j+2] = 0;                  // z
      gndVerts[j+3] = 1.0; 
    }
    else if(v%4 == 2){        // put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;  // x
      gndVerts[j+1] = xymax;                // y
      gndVerts[j+2] = 0;                  // z
      gndVerts[j+3] = 1.0; 
    }
    else{
      gndVerts[j  ] = xymax;                // x
      gndVerts[j+1] = -xymax + (v-1)*ygap;  // y
      gndVerts[j+2] = 0;                  // z
      gndVerts[j+3] = 1.0; 
    }
    gndVerts[j+4] = xColr[0];     // red
    gndVerts[j+5] = xColr[1];     // grn
    gndVerts[j+6] = xColr[2];     // blu
    gndVerts[j+7] = 0; 
    gndVerts[j+8] = 0; 
    gndVerts[j+9] = 1; 
    gndVerts[j+10] = 0; 
    gndVerts[j+11] = 0; 
  }
}

function initVertexBuffers(gl) {
//==============================================================================


  
  // Make our 'ground plane'; can you make a'torus' shape too?
  // (recall the 'basic shapes' starter code...)
  makeGroundGrid();
  makeAxis();
  makeHead();
  makeSphere();
  makeTetrahedron();
  // makeRing();
  // makeDiamond();
  // makeCylinder();
  // makeTorus();

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	mySiz = gndVerts.length + axisVerts.length + headVerts.length + sphVerts.length + ttrVerts.length;
  // + ringVerts.length + diaVerts.length + cylVerts.length + torVerts.length;

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
  var verticesColors = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
  i=0;
	
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

  // ringStart = i;
  // for(j=0; j< ringVerts.length; i++, j++) {
  //   verticesColors[i] = ringVerts[j];
  //   }

  // diaStart = i;
  // for(j=0; j< diaVerts.length; i++, j++) {
  //   verticesColors[i] = diaVerts[j];
  // }

  // cylStart = i;
  // for(j=0; j< cylVerts.length; i++, j++) {
  //   verticesColors[i] = cylVerts[j];
  // }

  // torStart = i;
  // for(j=0; j< torVerts.length; i++, j++) {
  //   verticesColors[i] = torVerts[j];
  // }

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
 

  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log("Failed to get the storage location of a_Normal");
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 7);
  gl.enableVertexAttribArray(a_Normal);

  var aLoc_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if(aLoc_TexCoord < 0) {
    console.log('Failed to get storage location of shader var: a_TexCoord\n');
    return -1;
  }
  // Use that location to specify how to retrieve TEX COORD data from our VBO:
  gl.vertexAttribPointer(
      aLoc_TexCoord,  // Location of Vertex Shader attribute to fill with data
      2,              // How many values? 1,2,3 or 4. (we're using s,t coords)
      gl.FLOAT,       // data type for each value: usually gl.FLOAT
      false,          // did we supply fixed-point data + it needs normalizing?
      FSIZE * floatsPerVertex,      // Stride -- how many bytes used to store each vertex?
                      // (x,y,z,w  r,g,b,  s,t) * bytes/value
      FSIZE * 10);     // Offset -- how many bytes from START of buffer to the
                      // 1st value we actually use? Need to skip x,y,z,w,r,g,b 
  gl.enableVertexAttribArray(aLoc_TexCoord);

  return mySiz/floatsPerVertex;	// return # of vertices
}


function initTextures(gl, n) {
//==============================================================================
// Initialize texture maps: load texture image from file into a texture buffer
  // in GPU memory, and connect that buffer to GPU's texture-map machinery:
  var texLoc = gl.createTexture();   // Create, save location of texture-buffer
                      // object that will hold our texture image in GPU memory. 
  if (!texLoc) {
    console.log('Failed to create the texture-buffer object in GPU memory');
    return false;
  }

  // Get the GPU memory location of the Fragment Shader uniform 'u_Sampler'
  var uLoc_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!uLoc_Sampler) {
    console.log('Failed to get the GPU storage location of u_Sampler');
    return false;
  }
  var texImg = new Image();             // Create a JavaScript image object:
  texImg.crossOrigin = "anonymous";     // Apply hack to get around security 
    //  prohibitions of loading image files from web-browser's machine (yours).
    // for details, see: https://hacks.mozilla.org/2011/11/using-cors-to-load-webgl-textures-from-cross-domain-images/
  if (!texImg) {
    console.log('Failed to create the JavaScript texture-image object');
    return false;
  }
  // Register an HTML event handler that gets called each time the web-browser 
  // loads or re-loads webpage (and re-reads the texture image texImg from 
  // file).   When that happens, this line ensures that we call 'loadTexture()':
  texImg.onload = function(){ loadTexture(gl,n,texLoc, uLoc_Sampler, texImg); };
  // set the filename used by loadTexture():
  texImg.src = '../resources/sky.JPG';
  // texImg.src = 'data:image/jpeg;base64,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';
  return true;
}

function loadTexture(gl, n, texLoc, u_Sampler, texImg) {
//==============================================================================
// HTML event handler: this function gets called when browser re-loads webpage.
// It specifies HOW texture image file contents in JavaScript 'texImg' object  
// (created in initTextures() from the filename string in texImg.src member)
// will get its particular format read into the GPU for use as a texture.
// Nice step-by-step explanation: http://learningwebgl.com/blog/?p=507 
  // 
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis when
                                              // you transfer it to the GPU.
  // Select, enable GPU's texture unit0 (there are more available) for our use:
  gl.activeTexture(gl.TEXTURE0);
  // Select the texLoc texture-buffer object we created in initTextures() as
  // the 'current' texture-object for use by texture unit 0:
  gl.bindTexture(gl.TEXTURE_2D, texLoc);
  // Specify how to the texture unit will 'filter' the texture (how to best 
  // approx texture color when the texture is greatly enlarged or reduced in 
  // size on-screen):
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // COPY the texture image held in JavaScript object 'texImg' to the GPU's
  // current texture-buffer object, found there at location 'texLoc'. 

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, texImg);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  
  // Set the value of the 'u_Sampler' uniform variable to indicate we are using 
  // texture-unit 0:
  gl.uniform1i(u_Sampler, 0);
  // WE'RE READY!  Now when we call 'draw()', it will apply the our texture to
  // the surfaces it draws on-screen.
}

var g_AtX = 0.0, g_AtY = 0.0, g_AtZ = 0.0;
look = new Vector3();
upCrossLook = new Vector3();

function setLook(){
  dx = g_AtX - eyePosWorld[0];
  dy = g_AtY - eyePosWorld[1];
  dz = g_AtZ - eyePosWorld[2];
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



function keydown(ev, gl) {
    if(ev.keyCode == 39) { 
        setLook();

        eyePosWorld[0] -= MOVE_STEP * upCrossLook[0];
        eyePosWorld[1] -= MOVE_STEP * upCrossLook[1];
        eyePosWorld[2] -= MOVE_STEP * upCrossLook[2];

        g_AtX -= MOVE_STEP * upCrossLook[0];
        g_AtY -= MOVE_STEP * upCrossLook[1];
        g_AtZ -= MOVE_STEP * upCrossLook[2];
    } 
  else 
    if (ev.keyCode == 37) { 
        setLook();

        eyePosWorld[0] += MOVE_STEP * upCrossLook[0];
        eyePosWorld[1] += MOVE_STEP * upCrossLook[1];
        eyePosWorld[2] += MOVE_STEP * upCrossLook[2];

        g_AtX += MOVE_STEP * upCrossLook[0];
        g_AtY += MOVE_STEP * upCrossLook[1];
        g_AtZ += MOVE_STEP * upCrossLook[2];
    } 
  else 
    if (ev.keyCode == 38) {
        setLook();     
        eyePosWorld[0] += MOVE_STEP * look[0];
        eyePosWorld[1] += MOVE_STEP * look[1];
        eyePosWorld[2] += MOVE_STEP * look[2];

        g_AtX += MOVE_STEP * look[0];
        g_AtY += MOVE_STEP * look[1];
        g_AtZ += MOVE_STEP * look[2];

    } 
    else 
    if (ev.keyCode == 40) {
        setLook();
        
        eyePosWorld[0] -= MOVE_STEP * look[0];
        eyePosWorld[1] -= MOVE_STEP * look[1];
        eyePosWorld[2] -= MOVE_STEP * look[2];

        g_AtX -= MOVE_STEP * look[0];
        g_AtY -= MOVE_STEP * look[1];
        g_AtZ -= MOVE_STEP * look[2];
    } 
    else
    if (ev.keyCode == 65){
      if(flag==-1 || flag==0)
        {
          x = g_AtX - eyePosWorld[0];
          y = g_AtY - eyePosWorld[1];
          z = g_AtZ - eyePosWorld[2];
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

        g_AtY = y + eyePosWorld[1];
        g_AtX = l * sin_phi * Math.sin(THETA_NOW) + eyePosWorld[0];
        g_AtZ = l * sin_phi * Math.cos(THETA_NOW) + eyePosWorld[2];
    }

    else
      if(ev.keyCode==68){
        if (flag==-1 || flag==0)
        {
          x = g_AtX - eyePosWorld[0];
          y = g_AtY - eyePosWorld[1];
          z = g_AtZ - eyePosWorld[2];
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

        g_AtY = y + eyePosWorld[1];
        g_AtX = l * sin_phi * Math.sin(THETA_NOW) + eyePosWorld[0];
        g_AtZ = l * sin_phi * Math.cos(THETA_NOW) + eyePosWorld[2];
      }
    else
      if(ev.keyCode==87){ 
        if (flag==-1 || flag==1)
        {  
          x = g_AtX - eyePosWorld[0];
          y = g_AtY - eyePosWorld[1];
          z = g_AtZ - eyePosWorld[2];
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

        g_AtY = l * Math.sin(PHI_NEW) + eyePosWorld[1];
        g_AtX = l * Math.cos(PHI_NEW) * sin_theta + eyePosWorld[0];
        g_AtZ = l * Math.cos(PHI_NEW) * cos_theta + eyePosWorld[2];
      }
    else
      if(ev.keyCode==83){ //s-look down
        if(flag==-1 || flag==1)
        { 
          x = g_AtX - eyePosWorld[0];
          y = g_AtY - eyePosWorld[1];
          z = g_AtZ - eyePosWorld[2];
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

        g_AtY = l * Math.sin(PHI_NEW) + eyePosWorld[1];
        g_AtX = l * Math.cos(PHI_NEW) * sin_theta + eyePosWorld[0];
        g_AtZ = l * Math.cos(PHI_NEW) * cos_theta + eyePosWorld[2];
      }
    else
      if(ev.keyCode == 77){
        if(worldLight == 1){
          worldLight = 0;
        }
        else{
          worldLight = 1;
        }
      }
    else
      if(ev.keyCode == 78){
        if(eyeLight == 0){
          eyeLight = 1;
        }
        else{
          eyeLight = 0;
        }
      }
    else
      if(ev.keyCode == 80){
        if(isPhong == 0){
          isPhong = 1;
        }
        else{
          isPhong = 0;
        }
      }
    else
      if(ev.keyCode == 71){
        if(isGouraud == 0){
          isGouraud = 1;
        }
        else{
          isGouraud = 0;
        }
      }
    else
      if(ev.keyCode == 84){
        if(isTexture == 0){
          isTexture = 1;
        }
        else{
          isTexture = 0;
        }
      }
    else
      if(ev.keyCode == 49){
        att = 1;
      }
    else
      if(ev.keyCode == 50){
        att = 2;
      }
    else
      if(ev.keyCode == 48){
        att = 0;
      }
    else
      if(ev.keyCode == 32){
        runStop();
      }
    else
      if(ev.keyCode == 73){
        spinUp();
      }
    else
      if(ev.keyCode == 79){
        spinDown();
      }
    else
      if(ev.keyCode==112){
      document.getElementById('Help').innerHTML= '<br> &nbsp Use Up/Down/Left/Right keys to control camera positon: ahead/back/left/right' + 
                                                 '<br> &nbsp Use W/A/S/D to control camera direction: look up/left/down/right' +
                                                 '<br> &nbsp Use I/O/Space to spin up/down/stop' +
                                                 '<br> &nbsp Use N to switch on/off headlight' + 
                                                 '<br> &nbsp Use M to switch on/off worldlight. Use right Control Panel to adjust light Position/Ambient/Diffuse/Specular' +
                                                 '<br> &nbsp Use P to switch between Blinn-Phong lighting and Phong lighting' +
                                                 '<br> &nbsp Use G to switch between Phong shading and Gouraud shading'+
                                                 '<br> &nbsp Use T to add Texture' +
                                                 '<br> &nbsp Use 0/1/2 to switch between ATT (0-NONE, 1-1/dist, 2-1/dist^2)';
  
      }
    else { return; } // Prevent the unnecessary drawing
    draw(currentAngle);    
}


function draw(currentAngle) {
//==============================================================================

  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  
	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						canvas.width, 				// viewport width, height.
  						canvas.height);
  mvpMatrix.setPerspective(40, (0.4*canvas.width)/canvas.height, 1, 100);
  // Set the matrix to be used for to set the camera view
  mvpMatrix.lookAt( eyePosWorld[0], eyePosWorld[1], eyePosWorld[2], // eye pos
                    g_AtX,  g_AtY, g_AtZ,         // aim-point (in world coords)
                    0,  1, 0); 
  pushMatrix(mvpMatrix);

	// Draw the scene:
	drawMyScene(currentAngle);
 
}

function drawMyScene(currentAngle) {
  gl.uniform1i(uLoc_worldLight, worldLight);
  gl.uniform1i(uLoc_eyeLight, eyeLight);
  gl.uniform1i(uLoc_isPhong, isPhong);
  gl.uniform1i(uLoc_isGouraud, isGouraud);
  gl.uniform1i(uLoc_isTexture, isTexture);
  gl.uniform1i(uLoc_att, att);

  lamp0.I_pos.elements.set(worldLightPos);
  lamp0.I_ambi.elements.set(ambient);
  lamp0.I_diff.elements.set(diffuse);
  lamp0.I_spec.elements.set(specular);

  gl.uniform3fv(lamp0.u_pos,  lamp0.I_pos.elements.slice(0,3));
  //     ('slice(0,3) member func returns elements 0,1,2 (x,y,z) ) 
  gl.uniform3fv(lamp0.u_ambi, lamp0.I_ambi.elements);   // ambient
  gl.uniform3fv(lamp0.u_diff, lamp0.I_diff.elements);   // diffuse
  gl.uniform3fv(lamp0.u_spec, lamp0.I_spec.elements);   // Specular

  lamp1.I_pos.elements.set( [eyePosWorld[0], eyePosWorld[1], eyePosWorld[2]]);
  gl.uniform3fv(lamp1.u_pos,  lamp1.I_pos.elements.slice(0,3));
  //     ('slice(0,3) member func returns elements 0,1,2 (x,y,z) ) 
  gl.uniform3fv(lamp1.u_ambi, lamp1.I_ambi.elements);   // ambient
  gl.uniform3fv(lamp1.u_diff, lamp1.I_diff.elements);   // diffuse
  gl.uniform3fv(lamp1.u_spec, lamp1.I_spec.elements);   // Specular
//  console.log('lamp0.u_pos',lamp0.u_pos,'\n' );
//  console.log('lamp0.I_diff.elements', lamp0.I_diff.elements, '\n');

  //---------------For the materials: 
// Test our new Material object:
// console.log('matl0.K_emit', matl0.K_emit.slice(0,3), '\n');
// (Why 'slice(0,4)'? 
//  this takes only 1st 3 elements (r,g,b) of array, ignores 4th element (alpha))

  gl.uniform3fv(uLoc_Ke, matl0.K_emit.slice(0,3));        // Ke emissive
  gl.uniform3fv(uLoc_Ka, matl0.K_ambi.slice(0,3));        // Ka ambient
  gl.uniform3fv(uLoc_Kd, matl0.K_diff.slice(0,3));        // Kd diffuse
  gl.uniform3fv(uLoc_Ks, matl0.K_spec.slice(0,3));        // Ks specular
  gl.uniform1i(uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 
//===============================================================================

  
	
  modelMatrix.setRotate(-90, 1, 0, 0);// new one has "+z points upwards",
                                      // made by rotating -90 deg on +x-axis.
                                      // Move those new drawing axes to the 
                                      // bottom of the trees:
  modelMatrix.translate(0.0, 0, -1.0);
  modelMatrix.scale(0.4, 0.4, 0.4);
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  // Now, using these drawing axes, draw our ground plane: 
  gl.drawArrays(gl.TRIANGLE_STRIP,							// use this drawing primitive, and
  							gndStart/floatsPerVertex,	// start at this vertex number, and
  							gndVerts.length/floatsPerVertex);		// draw this many vertices

  
  gl.uniform3fv(uLoc_Ke, matl3.K_emit.slice(0,3));        // Ke emissive
  gl.uniform3fv(uLoc_Ka, matl3.K_ambi.slice(0,3));        // Ka ambient
  gl.uniform3fv(uLoc_Kd, matl3.K_diff.slice(0,3));        // Kd diffuse
  gl.uniform3fv(uLoc_Ks, matl3.K_spec.slice(0,3));        // Ks specular
  gl.uniform1i(uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 

  modelMatrix.setRotate(-90, 1, 0 ,0);
  modelMatrix.translate(0, 0, -0.5);
  modelMatrix.scale(1, 1, 1);   
  modelMatrix.rotate(currentAngle*2, 0, 0, 1);
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.LINES,              // use this drawing primitive, and
                axisStart/floatsPerVertex, // start at this vertex number, and
                axisVerts.length/floatsPerVertex);  
  
  modelMatrix.translate(0, 0, 0);
  modelMatrix.scale(0.2, 0.2,0.2);   
  modelMatrix.rotate(currentAngle, 1, 0, 0);
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  
  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices 

  modelMatrix.translate(0.0, 0.0, 2); 
  modelMatrix.scale(1, 1, 1); 
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0.0, 0.0, 2); 
  modelMatrix.scale(1, 1, 1); 
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0.0, 0.0, 2); 
  modelMatrix.scale(1, 1, 1); 
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices
  

  gl.uniform3fv(uLoc_Ke, matl1.K_emit.slice(0,3));        // Ke emissive
  gl.uniform3fv(uLoc_Ka, matl1.K_ambi.slice(0,3));        // Ka ambient
  gl.uniform3fv(uLoc_Kd, matl1.K_diff.slice(0,3));        // Kd diffuse
  gl.uniform3fv(uLoc_Ks, matl1.K_spec.slice(0,3));        // Ks specular
  gl.uniform1i(uLoc_Kshiny, parseInt(matl1.K_shiny, 10));     // Kshiny 

  modelMatrix.setRotate(-90, 1, 0 , 0);
  modelMatrix.translate(-2, -1.5, -0.5); 
  modelMatrix.translate(0, 0, 0);
  modelMatrix.scale(0.4, 0.4, 0.4);   
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0);
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  
  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices 

  modelMatrix.translate(0.0, 0.0, 1.5); 
  modelMatrix.scale(0.8, 0.8, 0.8); 
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0.0, 0.0, 1.5); 
  modelMatrix.scale(0.8, 0.8, 0.8); 
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices


  modelMatrix.translate(0, 0, 2); 
  modelMatrix.scale(0.15, 0.15, 0.075); 
  modelMatrix.rotate(currentAngle*8, 0, 0, 1); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLES,              // use this drawing primitive, and
                headStart/floatsPerVertex, // start at this vertex number, and
                headVerts.length/floatsPerVertex);   // draw this many vertices


  modelMatrix.translate(0, 0, -10); 
  modelMatrix.scale(10, 10, 10); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0, 0, 0); 
  modelMatrix.scale(1, 1, 1); 
  modelMatrix.rotate(90, 0, 0, 1); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0, 0, 0); 
  modelMatrix.scale(1, 1, 1); 
  modelMatrix.rotate(90, 0, 0, 1); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0, 0, 0); 
  modelMatrix.scale(1, 1, 1); 
  modelMatrix.rotate(90, 0, 0, 1); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                ttrStart/floatsPerVertex, // start at this vertex number, and
                ttrVerts.length/floatsPerVertex);   // draw this many vertices


  gl.uniform3fv(uLoc_Ke, matl2.K_emit.slice(0,3));        // Ke emissive
  gl.uniform3fv(uLoc_Ka, matl2.K_ambi.slice(0,3));        // Ka ambient
  gl.uniform3fv(uLoc_Kd, matl2.K_diff.slice(0,3));        // Kd diffuse
  gl.uniform3fv(uLoc_Ks, matl2.K_spec.slice(0,3));        // Ks specular
  gl.uniform1i(uLoc_Kshiny, parseInt(matl2.K_shiny, 10));     // Kshiny 

  modelMatrix.setRotate(-90, 1, 0 , 0);
  modelMatrix.translate(-2, 1.5, -0.2); 
  modelMatrix.scale(0.2, 0.2, 0.4); 
  modelMatrix.rotate(currentAngle*0.8, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and
                sphVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0, 0, 1.8); 
  modelMatrix.scale(0.8, 0.8, 0.8); 
  modelMatrix.rotate(currentAngle*0.8, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and
                sphVerts.length/floatsPerVertex);   // draw this many vertices

  modelMatrix.translate(0, 0, 1.8); 
  modelMatrix.scale(0.8, 0.8, 0.8); 
  modelMatrix.rotate(currentAngle*0.6, 1, 0, 0); 
  mvpMatrix = popMatrix();
  pushMatrix(mvpMatrix);
  mvpMatrix.multiply(modelMatrix);  

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP,              // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and
                sphVerts.length/floatsPerVertex);   // draw this many vertices


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
  canvas.height = window.innerHeight;
}

function makeAxis(){
  axisVerts = new Float32Array([
     0,0,0,1,     1.0, 1.0, 1.0,  0.0, 0.0, 0.0, 0.0, 0.0,
     1,0,0,1,     1.0, 0.0, 0.0,  0.0, 0.0, 0.0, 1.0, 0.0,

     0,0,0,1,     1.0, 1.0, 1.0,  0.0, 0.0, 0.0, 1.0, 1.0,
     0,1,0,1,     0.0, 1.0, 0.0,  0.0, 0.0, 0.0, 0.0, 1.0,

     0,0,0,1,     1.0,1.0,1.0, 0.0, 0.0, 0.0,    1.0, 0.0,
     0,0,1,1,     0.0,0.0,1.0, 0.0, 0.0, 0.0,    0.0, 0.0,
    ]);
}

function makeHead(){
  headVerts = new Float32Array([
  
     1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 0.0,  1.0, 0.0, 0.0, -1.0, 1.7, // Node 3
     1.0,  1.0, -1.0, 1.0,    1.0, 0.0, 0.0,  1.0, 0.0, 0.0, -1.0, 0.2,// Node 2
     1.0,  1.0,  1.0, 1.0,    1.0, 0.0, 0.0,  1.0, 0.0, 0.0, 1.7, 1.7, // Node 4
     
     1.0,  1.0,  1.0, 1.0,    1.0, 0.1, 0.1,  1.0, 0.0, 0.0, -1.0, 0.2,// Node 4
     1.0, -1.0,  1.0, 1.0,    1.0, 0.1, 0.1,  1.0, 0.0, 0.0, 1.7, 1.7,// Node 7
     1.0, -1.0, -1.0, 1.0,    1.0, 0.1, 0.1,  1.0, 0.0, 0.0, 1.7, -0.2,// Node 3

    // +y face: GREEN
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0, -1.0, 1.7,// Node 1
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0, -1.0, 0.2,// Node 5
     1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0, 1.7, 1.7, // Node 4

     1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0, -1.0, 0.2,// Node 4
     1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0, 1.7, 1.7,// Node 2 
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 1.0, 0.0, 1.7, -0.2,// Node 1

    // +z face: BLUE
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 0.0, 1.0, -1.0, 1.7,// Node 5
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 0.0, 1.0, -1.0, 0.2,// Node 6
     1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  0.0, 0.0, 1.0, 1.7, 1.7,// Node 7

     1.0, -1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  0.0, 0.0, 1.0, -1.0, 0.2,// Node 7
     1.0,  1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  0.0, 0.0, 1.0, 1.7, 1.7,// Node 4
    -1.0,  1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  0.0, 0.0, 1.0, 1.7, -0.2,// Node 5

    // -x face: CYAN
    -1.0, -1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  -1.0, 0.0, 0.0, -1.0, 1.7,// Node 6 
    -1.0,  1.0,  1.0, 1.0,    0.0, 1.0, 1.0,  -1.0, 0.0, 0.0, -1.0, 0.2,// Node 5 
    -1.0,  1.0, -1.0, 1.0,    0.0, 1.0, 1.0,  -1.0, 0.0, 0.0, 1.7, 1.7, // Node 1
    
    -1.0,  1.0, -1.0, 1.0,    0.1, 1.0, 1.0,  -1.0, 0.0, 0.0, -1.0, 0.2,// Node 1
    -1.0, -1.0, -1.0, 1.0,    0.1, 1.0, 1.0,  -1.0, 0.0, 0.0, 1.7, 1.7,// Node 0  
    -1.0, -1.0,  1.0, 1.0,    0.1, 1.0, 1.0,  -1.0, 0.0, 0.0, 1.7, -0.2,// Node 6  
    
    // -y face: MAGENTA
     1.0, -1.0, -1.0, 1.0,    1.0, 0.0, 1.0,  0.0, -1.0, 0.0, -1.0, 1.7,// Node 3
     1.0, -1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  0.0, -1.0, 0.0, -1.0, 0.2,// Node 7
    -1.0, -1.0,  1.0, 1.0,    1.0, 0.0, 1.0,  0.0, -1.0, 0.0, 1.7, 1.7, // Node 6

    -1.0, -1.0,  1.0, 1.0,    1.0, 0.1, 1.0,  0.0, -1.0, 0.0, -1.0, 0.2,// Node 6
    -1.0, -1.0, -1.0, 1.0,    1.0, 0.1, 1.0,  0.0, -1.0, 0.0, 1.7, 1.7,// Node 0
     1.0, -1.0, -1.0, 1.0,    1.0, 0.1, 1.0,  0.0, -1.0, 0.0, 1.7, -0.2,// Node 3

     // -z face: YELLOW
     1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  0.0, 0.0, -1.0, -1.0, 1.7,// Node 2
     1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  0.0, 0.0, -1.0, -1.0, 0.2,// Node 3
    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.0,  0.0, 0.0, -1.0, 1.7, 1.7,// Node 0   

    -1.0, -1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  0.0, 0.0, -1.0, -1.0, 0.2,// Node 0
    -1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  0.0, 0.0, -1.0, 1.7, 1.7,// Node 1
     1.0,  1.0, -1.0, 1.0,    1.0, 1.0, 0.1,  0.0, 0.0, -1.0, 1.7, -0.2,// Node 2
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
        sphVerts[j+3] = 1.0; 
                                              // w.   
      }
      if(s==0) {  // finally, set some interesting colors for vertices:
        sphVerts[j+4]=topColr[0]; 
        sphVerts[j+5]=topColr[1]; 
        sphVerts[j+6]=topColr[2];
        sphVerts[j+10] = 0.0;
        sphVerts[j+11] = 0.0;  
        }
      else if(s==slices-1) {
        sphVerts[j+4]=botColr[0]; 
        sphVerts[j+5]=botColr[1]; 
        sphVerts[j+6]=botColr[2]; 
        sphVerts[j+10] = 0.0;
        sphVerts[j+11] = 1.0; 
      }
      else {
          sphVerts[j+4]=Math.random();// equColr[0]; 
          sphVerts[j+5]=Math.random();// equColr[1]; 
          sphVerts[j+6]=Math.random();// equColr[2]; 
          sphVerts[j+10] = 1.0;
          sphVerts[j+11] = 1.0;          
      }
        sphVerts[j+7]=sphVerts[j]; 
        sphVerts[j+8]=sphVerts[j+1]; 
        sphVerts[j+9]=sphVerts[j+2];
    }
  }
}



function makeTetrahedron(){
  var c30 = Math.sqrt(0.75);          // == cos(30deg) == sqrt(3) / 2
  var sq2 = Math.sqrt(2.0);
  // for surface normals:
  var sq23 = Math.sqrt(2.0/3.0)
  var sq29 = Math.sqrt(2.0/9.0)
  var sq89 = Math.sqrt(8.0/9.0)
  var thrd = 1.0/3.0;

  ttrVerts = new Float32Array([
  // Vertex coordinates(x,y,z,w) and color (R,G,B) for a new color tetrahedron:
  //    Apex on +z axis; equilateral triangle base at z=0
/*  Nodes:
     0.0,  0.0, sq2, 1.0,     0.0,  0.0,  1.0,  // Node 0 (apex, +z axis;  blue)
     c30, -0.5, 0.0, 1.0,     1.0,  0.0,  0.0,  // Node 1 (base: lower rt; red)
     0.0,  1.0, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 2 (base: +y axis;  grn)
    -c30, -0.5, 0.0, 1.0,     1.0,  1.0,  1.0,  // Node 3 (base:lower lft; white)
*/
  // 0.0,  0.0, sq2, 1.0,     1.0,  0.0,  1.0,    sq23, sq29, thrd, -1.0, 1.7, // Node 0 (apex, +z axis;  blue)
  //    c30, -0.5, 0.0, 1.0,     1.0,  1.0,  0.0,    sq23, sq29, thrd, -1.0, 0.2,// Node 1 (base: lower rt; red)
  //    0.0,  1.0, 0.0, 1.0,     0.0,  1.0,  0.0,    sq23, sq29, thrd, 1.7, 1.7,// Node 2 (base: +y axis;  grn)
  //     // Face 1: (right side)
  //    0.0,  0.0, sq2, 1.0,     1.0,  0.0,  1.0,    -sq23,  sq29, thrd, -1.0, 0.2, // Node 0 (apex, +z axis;  blue)
  //    0.0,  1.0, 0.0, 1.0,    0.0,  1.0,  0.0,    -sq23,  sq29, thrd,  1.7, 1.7,// Node 2 (base: +y axis;  grn)
  //   -c30, -0.5, 0.0, 1.0,     1.0,  1.0,  1.0,    -sq23,  sq29, thrd, 1.7, -0.2,// Node 3 (base:lower lft; white)
  //     // Face 2: (lower side)
  //    0.0,  0.0, sq2, 1.0,    1.0,  0.0,  1.0,    0.0, -sq89, thrd,   -1.0, 1.7,// Node 0 (apex, +z axis;  blue)
  //   -c30, -0.5, 0.0, 1.0,    1.0,  1.0,  1.0,    0.0, -sq89, thrd,   -1.0, 0.2, // Node 3 (base:lower lft; white)
  //    c30, -0.5, 0.0, 1.0,    1.0,  1.0,  0.0,    0.0, -sq89, thrd,   1.7, 1.7, // Node 1 (base: lower rt; red)
  //     // Face 3: (base side)/
  //   -c30, -0.5, 0.0, 1.0,    1.0,  1.0,  1.0,    0.0,  0.0,  -1.3,   -1.0, 0.2,// Node 3 (base:lower lft; white)
  //    0.0,  1.0, 0.0, 1.0,    0.0,  1.0,  0.0,    0.0,  0.0,  -1.3,   1.7, 1.7,// Node 2 (base: +y axis;  grn)
  //    c30, -0.5, 0.0, 1.0,    1.0,  1.0,  0.0,    0.0,  0.0,  -1.3,   1.7, -0.2, // Node 1 (base: lower rt; red)
      // Face 0: (left side)
     0.0,  0.0, sq2, 1.0,     1.0,  0.0,  1.0,    sq23, sq29, thrd, 0.0, 0.0, // Node 0 (apex, +z axis;  blue)
     c30, -0.5, 0.0, 1.0,     1.0,  1.0,  0.0,    sq23, sq29, thrd, 1.0, 0.0,// Node 1 (base: lower rt; red)
     0.0,  1.0, 0.0, 1.0,     0.0,  1.0,  0.0,    sq23, sq29, thrd, 1.0, 1.0,// Node 2 (base: +y axis;  grn)
      // Face 1: (right side)
     0.0,  0.0, sq2, 1.0,     1.0,  0.0,  1.0,    -sq23,  sq29, thrd, 0.0, 1.0, // Node 0 (apex, +z axis;  blue)
     0.0,  1.0, 0.0, 1.0,    0.0,  1.0,  0.0,    -sq23,  sq29, thrd,  0.0, 0.0,// Node 2 (base: +y axis;  grn)
    -c30, -0.5, 0.0, 1.0,     1.0,  1.0,  1.0,    -sq23,  sq29, thrd, 1.0, 0.0,// Node 3 (base:lower lft; white)
      // Face 2: (lower side)
     0.0,  0.0, sq2, 1.0,    1.0,  0.0,  1.0,    0.0, -sq89, thrd,   1.0, 1.0,// Node 0 (apex, +z axis;  blue)
    -c30, -0.5, 0.0, 1.0,    1.0,  1.0,  1.0,    0.0, -sq89, thrd,   0.0, 1.0,// Node 3 (base:lower lft; white)
     c30, -0.5, 0.0, 1.0,    1.0,  1.0,  0.0,    0.0, -sq89, thrd,   0.0, 0.0,// Node 1 (base: lower rt; red)
      // Face 3: (base side)/
    -c30, -0.5, 0.0, 1.0,    1.0,  1.0,  1.0,    0.0,  0.0,  -1.3,   1.0, 0.0,// Node 3 (base:lower lft; white)
     0.0,  1.0, 0.0, 1.0,    0.0,  1.0,  0.0,    0.0,  0.0,  -1.3,   1.0, 1.0,// Node 2 (base: +y axis;  grn)
     c30, -0.5, 0.0, 1.0,    1.0,  1.0,  0.0,    0.0,  0.0,  -1.3,   0.0, 1.0, // Node 1 (base: lower rt; red)
  ]);

}

// function makeTetrahedron() {
//   ttrVerts = new Float32Array([
//       // Face 0
//      0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  1.0, 0.0, 0.0,// Node 0
//      0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  1.0, 0.0, 0.0,// Node 1
//      0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  1.0, 0.0, 0.0,// Node 2
//       // Face 1(front)
//      0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  1.0, 0.0, 0.0,// Node 0
//      0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  1.0, 0.0, 0.0,// Node 2
//     -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  1.0, 0.0, 0.0,// Node 3
//       // Face 2
//      0.00, 0.00, 1.00, 1.00,    1.0,  1.0,  0.0,  1.0, 0.0, 0.0,// Node 0 
//     -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  1.0, 0.0, 0.0,// Node 3
//      0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  1.0, 0.0, 0.0,// Node 1 
//       // Face 3  
//     -0.87, 2.00, 0.50, 1.00,    0.0,  1.0,  0.0,  1.0, 0.0, 0.0,// Node 3
//      0.87, 2.00, 0.50, 1.00,    1.0,  0.0,  0.0,  1.0, 0.0, 0.0,// Node 2
//      0.00, 2.00, 2.00, 1.00,    0.0,  0.0,  1.0,  1.0, 0.0, 0.0,// Node 1
//     ]);
// }


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
        torVerts[j+7]=1.0;
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
        torVerts[j+7]=1.0;
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
        torVerts[j+7]=1.0;
        torVerts[j+8]=0.0;
        torVerts[j+9]=0.0;
}