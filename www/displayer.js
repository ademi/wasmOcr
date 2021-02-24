class Displayer{
  init(payload){
    const canvas = document.querySelector('#glcanvas');
    this.gl = canvas.getContext('webgl2');
  
    // If we don't have a GL context, give up now
  
    if (!this.gl) {
      alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
      console.error('Unable to initialize WebGL2.')
      return;
    }
    this.workingArea = this.activeWindow(canvas);

    // 1) Initialize a shader program; this is where all the lighting
    //    for the vertices and so forth is established.
    // 2) Collect all the info needed to use the shader program.
    //    Look up which attributes our shader program is using
    //    for aVertexPosition, aTextureCoord and also
    //    look up uniform locations.
    this.shaderContext = this.workingArea.initShaderProgram(this.gl);
  }
  activeWindow(canvas){
    new WorkingArea();
    this.workingArea._setupMouseWheel(canvas);
  }
}
export const displayer = new Displayer();