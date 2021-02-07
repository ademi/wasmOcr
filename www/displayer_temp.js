
class Displayer{
    init(rgba_buffer){
      console.log(rgba_buffer)
      temp(rgba_buffer);
    }
  }
  export const displayer = new Displayer();
  function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
  }
function temp(rgba_buffer){
  
var w = 899;
var h = 492;
var img = rgba_buffer; //new Uint8Array(w * h * 4);
//for (var i = 0; i < img.length; i += 4) {
//    img[i + 0] = 255; // r
//    img[i + 1] = 0; // g
//    img[i + 2] = 0; // b
//    img[i + 3] = 255; // a
//}
console.log(img)
var cv = document.getElementById('glcanvas');
var gl = cv.getContext('experimental-webgl');
var tex = gl.createTexture();
var vbo = gl.createBuffer();
var program = gl.createProgram();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texImage2D(
    gl.TEXTURE_2D, // target
    0, // mip level
    gl.RGBA, // internal format
    w, h, // width and height
    0, // border
    gl.RGBA, //format
    gl.UNSIGNED_BYTE, // type
    img // texture data
);
    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(899) && isPowerOf2(492)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
   } else {
      // No, it's not a power of 2. Turn of mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   }
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, 
              new Float32Array([-1, -1,
               1, -1,
               1, 1,               
               1, 1,
               -1, 1,
               -1, -1]), gl.STATIC_DRAW);

program.vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(program.vs,
                "attribute vec4 vertex;\n" +
                "varying vec2 tc;\n" +
                "void main(){\n" +
                " gl_Position = vertex;\n" +
                " tc = vertex.xy*0.5+0.5;\n" +
                "}\n");

program.fs = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(program.fs,
                "precision highp float;\n" +
                "uniform sampler2D tex;\n" +
                "varying vec2 tc;\n" +
                "void main(){\n" +
                " gl_FragColor = texture2D(tex, tc);\n" +
                "}\n");

gl.compileShader(program.vs);
gl.compileShader(program.fs);

gl.attachShader(program,program.vs);
gl.attachShader(program,program.fs);

gl.deleteShader(program.vs);
gl.deleteShader(program.fs);
gl.bindAttribLocation(program, 0, "vertex");
gl.linkProgram(program);
gl.useProgram(program);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.TRIANGLES, 0, 6);
}
