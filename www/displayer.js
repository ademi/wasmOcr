
class Displayer{

  init(payload){
    this.canvas = document.querySelector('#glcanvas');
    this.gl = this.canvas.getContext('webgl');
  
    // If we don't have a GL context, give up now
    if (!this.gl) {
      alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
      console.error('Unable to initialize WebGL2.')
      return;
    }
    // setup GLSL program
    this.program = webglUtils.createProgramFromScripts(this.gl, ["vertex-shader", "fragment-shader"]);
    this.ptr = this.getPtr(this.program,this.gl)
    this.buffers = this.setUpBuffers(this.gl)
    
    // Set up mouse events
    // initial offset
    this.dtx = 0;
    this.dty = 0;
    this.canvas.addEventListener("mousedown", this.startListening.bind(this));
    document.addEventListener("mouseup"  , this.stopListening.bind(this));
    // keep track of event listeners (using bind changes the function reference)
    this.offset_listener = this.update.bind(this)

    this.refresh(payload)
  }
  startListening(event){
    this.offset_listener(event)
    this.canvas.addEventListener("mousemove", this.offset_listener);
  }
  stopListening(event){
    //console.log(event)
    this.canvas.removeEventListener("mousemove", this.offset_listener);
  }
  refresh(payload){
    this.textureData = this.getTexture(this.gl,payload.data,payload.width,payload.height)
    this.drawImage(
      this.program,this.gl,
      this.textureData.texture,
      this.textureData.width,
      this.textureData.height,
      0,0);
  
  }
  update(event){
    this.dtx = event.clientX - this.canvas.offsetLeft;
    this.dty = event.clientY - this.canvas.offsetTop;
    this.drawImage(
      this.program,this.gl,
      this.textureData.texture,
      this.textureData.width,
      this.textureData.height,
      this.dtx,this.dty);
  }
  getPtr(program,gl){
    return {
      // look up where the vertex data needs to go.
      position : gl.getAttribLocation (program, "a_position"),
      texcoord : gl.getAttribLocation (program, "a_texcoord"),
      // lookup uniforms
      matrix   : gl.getUniformLocation(program, "u_matrix"),
      texture  : gl.getUniformLocation(program, "u_texture"),
    }
  }
  setUpBuffers(gl){

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Put a unit quad in the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
    ]), gl.STATIC_DRAW);

    // Create a buffer for texture coords
    let texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      0, 1,
      1, 0,
      1, 0,
      0, 1,
      1, 1,
    ]), gl.STATIC_DRAW);
    return{
      position: positionBuffer,
      texture:  texcoordBuffer,
    }
  }
  getTexture(gl,rgba_buffer,width,height) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);


    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D,//target
      0, //mip level
      gl.RGBA, // internal format
      width,height, // dims
      0,//border
      gl.RGBA, //format
      gl.UNSIGNED_BYTE, //type
      rgba_buffer // data
      );
    
    return {
      width: width,   
      height: height,
      texture: tex,
    };
  }
  drawImage(program,gl,tex, texWidth, texHeight, dstX, dstY) {

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Tell WebGL to use our shader program pair
    gl.useProgram(program);

    // Setup the attributes to pull data from our buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.vertexAttribPointer(this.ptr.position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.ptr.position);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texture);
    gl.vertexAttribPointer(this.ptr.texcoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.ptr.texcoord);

    // this matrix will convert from pixels to clip space
    var matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

    // this matrix will translate our quad to dstX, dstY
    matrix = m4.translate(matrix, dstX, dstY, 0);

    // this matrix will scale our 1 unit quad
    // from 1 unit to texWidth, texHeight units
    matrix = m4.scale(matrix, texWidth, texHeight, 1);

    // Set the matrix.
    gl.uniformMatrix4fv(this.ptr.matrix, false, matrix);

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(this.ptr.texture, 0);

    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);/**/
    
  }

}
export const displayer = new Displayer();

