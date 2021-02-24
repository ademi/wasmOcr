class Viewer{
  init(){
    const canvas = document.querySelector('#glcanvas');
    this.gl = canvas.getContext('webgl2');
  
    // If we don't have a GL context, give up now
  
    if (!this.gl) {
      alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
      console.error('Unable to initialize WebGL2.')
      return;
    }
    this.workingArea = new WorkingArea();
    this.workingArea._setupMouseWheel(canvas);

    // 1) Initialize a shader program; this is where all the lighting
    //    for the vertices and so forth is established.
    // 2) Collect all the info needed to use the shader program.
    //    Look up which attributes our shader program is using
    //    for aVertexPosition, aTextureCoord and also
    //    look up uniform locations.
    this.shaderContext = this.workingArea.initShaderProgram(this.gl);
  }
  refresh(payload){
    
    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    this.buffers = this.workingArea.initBuffers(this.gl,payload.width,payload.height);
  
    const texture = this.workingArea.loadTexture(this.gl, payload.data,payload.width,payload.height);//'http://localhost:8080/ocr_example.png');
  
  
    // Draw the scene repeatedly
    this.workingArea.drawScene(this.gl, this.shaderContext, this.buffers, texture);   
  }
}
class WorkingArea{
  constructor() {
    this.zoom = 1;
  }
  //
  // Initialize a shader program, so WebGL knows how to draw our data
  //
  // vertex shader
  initShaderProgram(gl) {
    if (!gl) {
      throw 'Unable to tinit shader program'
    }
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;
  
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
  
      varying highp vec2 vTextureCoord;
      void main(void) {
        gl_Position = uProjectionMatrix * aVertexPosition * uModelViewMatrix;
        vTextureCoord = aTextureCoord;
      }
    `;
    
    // Fragment shader program
    
    const fsSource = `
      varying highp vec2 vTextureCoord;
      uniform sampler2D uSampler;
      void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
      }
    `;
    const vertexShader   = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }
    return {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        textureCoord:   gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix:  gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      }
    }
  }
  initBuffers(gl,width,height){
    // Create a buffer for vertex positions.
  
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // create a rectangle with the image diminsions.
    const factor = Math.max(width,height)*0.5;
    const positions = [
      -1.0,  -1.0 +(height/factor),  1.0,
      -1.0+(width/factor),  -1.0 +(height/factor),  1.0,
      -1.0 +(width/factor), -1.0,  1.0,
      -1.0, -1.0,  1.0,
      ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
    // texture coordinates.
  
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    const textureCoordinates = [
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      0.0,  1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                  gl.STATIC_DRAW);
    
    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.
  
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  
    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.
  
    const indices = [
      0,  1,  2,      0,  2,  3,
    ];
  
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), gl.STATIC_DRAW);
  
    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer,
    };
  }
  drawScene(gl, shaderContext, buffers, texture){
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
  
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
  
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = 1;//gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
  
    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
  
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
  
    // Now move the drawing position a bit to where we want to
    // start drawing the square.
  
    mat4.translate(modelViewMatrix,     // destination matrix
                   modelViewMatrix,     // matrix to translate
                   [0, 0, -4]);  // amount to translate

  
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      gl.vertexAttribPointer(
        shaderContext.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
        shaderContext.attribLocations.vertexPosition);
    }
  
    // Tell WebGL how to pull out the texture coordinates from
    // the texture coordinate buffer into the textureCoord attribute.
    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
      gl.vertexAttribPointer(
        shaderContext.attribLocations.textureCoord,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
        shaderContext.attribLocations.textureCoord);
    }
  
    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  
    // Tell WebGL to use our program when drawing
  
    gl.useProgram(shaderContext.program);
  
    // Set the shader uniforms
  
    gl.uniformMatrix4fv(
      shaderContext.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
      shaderContext.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
  
    // Specify the texture to map onto the faces.
  
    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);
  
    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(shaderContext.uniformLocations.uSampler, 0);
  
    {
      const vertexCount = 6;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
  
  }
//
// creates a shader of the given type, uploads the source and
// compiles it.
//
  loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  //
  // Initialize a texture and load an image.
  // When the image finished loading copy it into the texture.
  //
  loadTexture(gl, rgba_buffer,width,height) {
    
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const _width = 1;
    const _height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  _width, _height, border, srcFormat, srcType,
                  pixel);
    
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,//target
                    0, //mip level
                    gl.RGBA, // internal format
                    width,height, // dims
                    0,//border
                    gl.RGBA, //format
                    gl.UNSIGNED_BYTE, //type
                    rgba_buffer // data
                    );

    return texture;
  }
  // SETUP EVENTS

  _setupMouseWheel (canvas) {
    canvas.addEventListener('wheel', this._handleMouseWheel.bind(this));
  }
  _handleMouseWheel (event) {
    event.stopPropagation();
    event.preventDefault();
    const delta = Math.max(-1, Math.min(1, -event.deltaY));
    this.zoom = Math.max(1, this.zoom + delta * 0.05);
    console.log(this)
  }
}
export const viewer = new Viewer();