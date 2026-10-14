// Fondo pintado con cámara 2,5D: dibuja una ilustración desplazando cada píxel según
// su profundidad (paralaje y «dolly»), y mece por shader lo que es verde (hierba,
// copas), el agua y las nubes. Usa su propio lienzo WebGL2; el resultado se copia
// al lienzo 2D del escenario con drawImage.

const VS = `#version 300 es
in vec2 aP;
uniform vec2 uRes;
out vec2 vS;
void main() {
  vS = vec2((aP.x * 0.5 + 0.5) * uRes.x, (0.5 - aP.y * 0.5) * uRes.y);
  gl_Position = vec4(aP, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vS;
out vec4 oC;
uniform sampler2D uImg, uDepth;
uniform vec2 uSize;     // tamaño de la ilustración (px)
uniform vec2 uA;        // dónde cae el foco en pantalla
uniform vec2 uF;        // foco (px de la ilustración)
uniform float uS;       // escala ilustración → pantalla
uniform vec2 uRot;      // coseno y seno del giro de cámara
uniform vec2 uShift;    // desplazamiento (px) por unidad de profundidad
uniform float uDolly;   // acercamiento extra por unidad de profundidad
uniform float uFd;      // profundidad que se queda quieta
uniform float uTime, uWind, uWater, uCloud, uLights;
uniform vec4 uWaterBox; // x0, y0, x1, y1 en px de la ilustración

float depthAt(vec2 q) { return texture(uDepth, q / uSize).r; }

void main() {
  vec2 d = vS - uA;
  vec2 r = vec2(uRot.x * d.x + uRot.y * d.y, -uRot.y * d.x + uRot.x * d.y) / uS;
  // Busca el píxel de la ilustración que cae aquí (iteración de punto fijo).
  vec2 q = uF + r;
  for (int i = 0; i < 12; i++) {
    float k = depthAt(q) - uFd;
    q = uF + (r - uShift * k) / (1.0 + uDolly * k);
  }
  float dep = depthAt(q);
  vec3 c0 = texture(uImg, q / uSize).rgb;
  // Viento en lo verde: más fuerte cuanto más cerca.
  float green = smoothstep(0.03, 0.14, c0.g - max(c0.r, c0.b) * 0.95);
  float wv = sin(uTime * 1.9 + q.y * 0.045 + q.x * 0.011) + 0.5 * sin(uTime * 3.3 + q.x * 0.027 - q.y * 0.02);
  q.x += uWind * green * wv * (0.35 + dep);
  // Nubes que respiran despacio (claras y poco saturadas).
  float lum = dot(c0, vec3(0.299, 0.587, 0.114));
  float sat = max(c0.r, max(c0.g, c0.b)) - min(c0.r, min(c0.g, c0.b));
  float cloud = smoothstep(0.55, 0.8, lum) * (1.0 - smoothstep(0.18, 0.4, sat)) * (1.0 - green);
  q += uCloud * cloud * vec2(sin(uTime * 0.35 + q.y * 0.012 + q.x * 0.004), 0.6 * cos(uTime * 0.29 + q.x * 0.009));
  // Agua: ondula en vertical dentro de su caja.
  if (q.x > uWaterBox.x && q.x < uWaterBox.z && q.y > uWaterBox.y && q.y < uWaterBox.w) {
    float fall = smoothstep(uWaterBox.y, uWaterBox.y + 12.0, q.y);
    q.y += uWater * fall * sin(uTime * 2.3 + q.x * 0.08 + q.y * 0.4);
  }
  vec3 col = texture(uImg, q / uSize).rgb;
  // Luces cálidas (ventanas, farolas, bokeh) que respiran, cada zona a su ritmo.
  float warm = clamp((col.r - 0.67) / 0.23, 0.0, 1.0) * clamp((col.g - 0.47) / 0.23, 0.0, 1.0) * clamp((col.r - col.b - 0.24) / 0.23, 0.0, 1.0);
  float cell = floor(q.x / 140.0) + floor(q.y / 90.0) * 7.0;
  float flick = 0.5 + 0.5 * sin(uTime * (1.1 + fract(cell * 0.37) * 0.9) + cell * 1.9);
  col += col * uLights * warm * flick;
  oC = vec4(col, 1.0);
}`;

export class PlateGL {
  constructor(w, h) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    const gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 no disponible');
    this.gl = gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.pr = pr;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'aP');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uImg', 'uDepth', 'uSize', 'uA', 'uF', 'uS', 'uRot', 'uShift', 'uDolly', 'uFd', 'uTime', 'uWind', 'uWater', 'uCloud', 'uLights', 'uWaterBox', 'uRes']) this.u[n] = gl.getUniformLocation(pr, n);
    gl.uniform1i(this.u.uImg, 0);
    gl.uniform1i(this.u.uDepth, 1);
    gl.uniform2f(this.u.uRes, w, h);
    gl.viewport(0, 0, w, h);
    this.tex = new Map();
  }

  texture(im) {
    let t = this.tex.get(im);
    if (t) return t;
    const gl = this.gl;
    t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.tex.set(im, t);
    return t;
  }

  // cam: la cámara de plates.js (S, A, F, c, s, shift, dolly, fd); fx: viento, agua, nubes.
  render(img, depth, size, cam, t, fx = {}) {
    const gl = this.gl, u = this.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texture(img));
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.texture(depth));
    gl.uniform2f(u.uSize, size.w, size.h);
    gl.uniform2f(u.uA, cam.A[0], cam.A[1]);
    gl.uniform2f(u.uF, cam.F[0], cam.F[1]);
    gl.uniform1f(u.uS, cam.S);
    gl.uniform2f(u.uRot, cam.c, cam.s);
    gl.uniform2f(u.uShift, cam.shift[0], cam.shift[1]);
    gl.uniform1f(u.uDolly, cam.dolly);
    gl.uniform1f(u.uFd, cam.fd);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uWind, fx.wind ?? 0);
    gl.uniform1f(u.uWater, fx.water ?? 0);
    gl.uniform1f(u.uCloud, fx.cloud ?? 0);
    gl.uniform1f(u.uLights, fx.lights ?? 0);
    const wb = fx.waterBox ?? [0, 0, 0, 0];
    gl.uniform4f(u.uWaterBox, wb[0], wb[1], wb[2], wb[3]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
}
