import { Context,JsPayLoad } from "wasm-game-of-life";
import { memory } from "wasm-game-of-life/wasm_game_of_life_bg";

class App {
  init(img_blob){
    this.canvas = document.querySelector('#glcanvas');
    let reader = new FileReader();
    reader.onload = (event)=>{
      let raw = new Uint8Array(event.target.result)
      this.wasm_context= Context.new(raw);
      this.payload= JsPayLoad.new();
      this.displayer = new Displayer(this.canvas, this.wasm_context,this.payload)
    }
    reader.readAsArrayBuffer(img_blob);
  }


}

class Displayer{

  constructor(canvas, img_processor, payload){
    this.canvas = canvas;
    this.processor = img_processor;
    this.payload = payload;
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
    this.mouseEvents = new(mouseEvents)
    this.init_mouse_control()
    // load the initial image
    this.processor.refresh(this.payload);
    this.refresh(this.payload)
  }
  init_mouse_control(){
    // Handle drag and drop
    //document.addEventListener('dragover', this.mouseEvents._handleDragOver.bind(this));
    //document.addEventListener('drop',     this.mouseEvents._handleDrop.bind(this));

    this.mouseEvents._handleDragOver(document,(event)=>{
      event.dataTransfer.dropEffect = 'copy';
    })
    this.mouseEvents._handleDrop(document,(event)=>{
        //console.log(event);
        let reader = new FileReader();
        reader.onload = (event)=>{
            let raw = new Uint8Array(event.target.result)
            this.processor= Context.new(raw);
            this.processor.refresh(this.payload);
            this.refresh(this.payload)
            //
        }
        const file = event.dataTransfer.files[0]
        reader.readAsArrayBuffer(file);
      
    })
    // mouse buttons move the image while right button is clicked, release once done
    // initial offset
    this.dx = 0;
    this.dy = 0;
    this.canvas.addEventListener("mousedown", this.mouseEvents.mouse_clicked.bind(this));
    document.addEventListener("mouseup"  ,    this.mouseEvents.mouse_unclicked.bind(this));

    // setting mouse wheel
    // scale image with mouse wheel
    this.zoom_ratio = 1.0
    this.canvas.addEventListener('wheel', this.mouseEvents.handleMouseWheel.bind(this));
    // keep track of event listeners (using bind changes the function reference)
    this.position_listener = this.reposition_img.bind(this)
    this.scale_listener = this.scale_img.bind(this)
    
    // when the wheel stops spinning for 500 ms refresh the image using the img processor (time expensive operation)
    this.mouseEvents.wheelStopListener(window, ()=> {
      this.processor.resize(this.zoom_ratio,this.payload);
      this.refresh(this.payload);
    },300);
  }
  refresh(payload){
    let data = {
      width:  payload.get_width(),
      height: payload.get_height(),
      data: new Uint8Array(memory.buffer, payload.get_buff_ptr(), payload.get_width() * payload.get_height()*4)
    }
    
    this.textureData = this.getTexture(this.gl,data.data,data.width,data.height)
    this.drawImage(
      this.program,this.gl,
      this.textureData.texture,
      this.textureData.width,
      this.textureData.height,
      this.dx,this.dy,this.zoom_ratio);
      console.log(`there ${payload.get_width()} , ${payload.get_height()}`);
  }
  scale_img(event){
    //this.processor.resize(this.zoom_ratio,this.payload);
    this.refresh(this.payload);

  }
  reposition_img(event){
    event.stopPropagation();
    event.preventDefault();
    //console.log(`dx = ${event.clientX} - ${this.canvas.offsetLeft} - ${this.init_x} = ${event.clientX - this.canvas.offsetLeft - this.init_x}`)
    //console.log(`dy = ${event.clientY} - ${this.canvas.offsetTop } - ${this.init_y} = ${event.clientY - this.canvas.offsetTop  - this.init_y}`)
    this.dx = event.clientX - this.canvas.offsetLeft - this.init_x;
    this.dy = event.clientY - this.canvas.offsetTop  - this.init_y;

    this.drawImage(
      this.program,this.gl,
      this.textureData.texture,
      this.textureData.width,
      this.textureData.height,
      this.dx,this.dy,this.zoom_ratio);
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
  drawImage(program,gl,tex, texWidth, texHeight, dstX, dstY,scale_ratio=1.0) {

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
    matrix = m4.scale(matrix, texWidth * scale_ratio, texHeight * scale_ratio, 1);

    // Set the matrix.
    gl.uniformMatrix4fv(this.ptr.matrix, false, matrix);

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(this.ptr.texture, 0);

    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);/**/
    
  }

}
class mouseEvents{
  _handleDragOver(element, callback) {
    element.addEventListener('dragover',function(event){
      event.stopPropagation();
      event.preventDefault();
      callback(event);//
     
    });

  }
  _handleDrop(element, callback) {
    element.addEventListener('drop', function(event){
      event.stopPropagation();
      event.preventDefault();
      
      callback(event);
    });

    //if (files && files.length === 1 && files[0].type.match('image/jpeg')) {
    //  const fileReader = new FileReader();
    //  fileReader.onload = (event) => {
    //    if (this._loadImage(new Uint8Array(event.target.result))) {
    //      this._invalidate();
    //    }
    //  };
    //  fileReader.onerror = () => {
    //    console.error('Unable to read file ' + file.name + '.');
    //  };
    //  fileReader.readAsArrayBuffer(files[0]);
    //} else {
    //  console.error('Unsupported files or content dropped.');
    //  alert('This demo only supports displaying JPEG files.');
    //}
  }
  handleMouseWheel(event){
    //event.stopPropagation();
    event.preventDefault();
    const delta = Math.max(-1, Math.min(1, -event.deltaY));
    this.zoom_ratio = Math.max(0.1, this.zoom_ratio + delta * 0.05);

    this.scale_listener();
  }
  wheelStopListener(element, callback, timeout) {
      let handle = null;
      let onScroll = function() {
          if (handle) {
              clearTimeout(handle);
          }
          handle = setTimeout(callback, timeout || 400); // default 400 ms
      };
      element.addEventListener('wheel', onScroll);
      return function() {
          element.removeEventListener('wheel', onScroll);
      };
  }


  mouse_clicked(event){
    event.stopPropagation();
    event.preventDefault();
    this.init_x = event.clientX - this.canvas.offsetLeft - this.dx ;
    this.init_y = event.clientY - this.canvas.offsetTop  - this.dy ;
    this.canvas.addEventListener("mousemove", this.position_listener);
  }
  mouse_unclicked(event){
    event.stopPropagation();
    event.preventDefault();
    this.canvas.removeEventListener("mousemove", this.position_listener);
  }
}
export const app = new(App);