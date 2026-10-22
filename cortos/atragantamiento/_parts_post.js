// ───────────────────────────── post: accumulate → DOF → bloom → tone map ─────────────────────────────
const RT = {};
const FSQ = new THREE.BufferGeometry(); FSQ.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
const postCam = new THREE.Camera();
function pass(frag, uniforms, opts = {}) {
  const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3,
    vertexShader: 'precision highp float;\nin vec3 position; out vec2 vUv; void main(){ vUv=position.xy*0.5+0.5; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: 'precision highp float;\nin vec2 vUv; out vec4 o;\n' + frag, uniforms, depthTest: false, depthWrite: false, ...opts });
  const msh = new THREE.Mesh(FSQ, m); msh.frustumCulled = false; const sc = new THREE.Scene(); sc.add(msh);
  return { m, run: (target) => { renderer.setRenderTarget(target); renderer.render(sc, postCam); } };
}
function buildPost() {
  const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  RT.scene = new THREE.WebGLRenderTarget(W, HGT, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(W, HGT, THREE.UnsignedIntType) });
  RT.acc = new THREE.WebGLRenderTarget(W, HGT, hf);
  RT.half = new THREE.WebGLRenderTarget(W / 2, HGT / 2, hf); RT.dof = new THREE.WebGLRenderTarget(W / 2, HGT / 2, hf);
  RT.bloom = [4, 8, 16, 32, 64].map(d => new THREE.WebGLRenderTarget(Math.ceil(W / d), Math.ceil(HGT / d), hf));
  RT.bloomUp = [4, 8, 16, 32].map(d => new THREE.WebGLRenderTarget(Math.ceil(W / d), Math.ceil(HGT / d), hf));
  RT.accum = pass(`uniform sampler2D uC, uD; uniform float uW, uNear, uFar, uCenter;
    void main(){ vec3 c=texture(uC,vUv).rgb; float z=texture(uD,vUv).r*2.0-1.0; float lin=2.0*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); o=vec4(c*uW, uCenter*lin); }`,
    { uC: { value: RT.scene.texture }, uD: { value: RT.scene.depthTexture }, uW: { value: 1 }, uNear: { value: 0.05 }, uFar: { value: 900 }, uCenter: { value: 1 } }, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, transparent: true });   // plain sum: alpha carries depth, not opacity
  RT.coc = pass(`uniform sampler2D uA; uniform vec2 uPx; uniform float uFocus, uK, uMax;
    float coc(float z){ return clamp(uK*(z-uFocus)/max(z,1e-3), -uMax, uMax); }
    void main(){ vec2 d=uPx*0.5; vec4 a=texture(uA,vUv+vec2(-d.x,-d.y)), b=texture(uA,vUv+vec2(d.x,-d.y)), c=texture(uA,vUv+vec2(-d.x,d.y)), e=texture(uA,vUv+vec2(d.x,d.y));
      float zmin=min(min(a.a,b.a),min(c.a,e.a)); o=vec4((a.rgb+b.rgb+c.rgb+e.rgb)*0.25, coc(zmin)*0.5); }`,
    { uA: { value: RT.acc.texture }, uPx: { value: new THREE.Vector2(1 / W, 1 / HGT) }, uFocus: { value: 3 }, uK: { value: 8 }, uMax: { value: 20 } });
  RT.gather = pass(`uniform sampler2D uH; uniform vec2 uPx; uniform float uMax; const float GA=2.39996323;
    void main(){ vec4 cc=texture(uH,vUv); float cs=abs(cc.a); vec3 col=cc.rgb; float tot=1.0; float r=0.5;
      for(int i=0;i<110;i++){ if(r>uMax) break; float a=float(i)*GA; vec2 tc=vUv+vec2(cos(a),sin(a))*uPx*r; vec4 s=texture(uH,tc); float ssz=abs(s.a);
        if(s.a>cc.a) ssz=clamp(ssz,0.0,cs*2.0); float m=smoothstep(r-0.5,r+0.5,ssz); col+=mix(col/tot,s.rgb,m); tot+=1.0; r+=1.1/r; }
      o=vec4(col/tot, cc.a); }`, { uH: { value: RT.half.texture }, uPx: { value: new THREE.Vector2(2 / W, 2 / HGT) }, uMax: { value: 10 } });
  RT.down = pass(`uniform sampler2D uS; uniform vec2 uPx; uniform float uThr;
    void main(){ vec2 d=uPx; vec3 c=texture(uS,vUv).rgb*4.0+texture(uS,vUv+vec2(-d.x,-d.y)).rgb+texture(uS,vUv+vec2(d.x,-d.y)).rgb+texture(uS,vUv+vec2(-d.x,d.y)).rgb+texture(uS,vUv+vec2(d.x,d.y)).rgb; c/=8.0;
      if(uThr>0.0){ float l=max(c.r,max(c.g,c.b)); c*=max(l-uThr,0.0)/max(l,1e-4); } o=vec4(c,1.0); }`, { uS: { value: null }, uPx: { value: new THREE.Vector2() }, uThr: { value: 0 } });
  RT.up = pass(`uniform sampler2D uS, uB; uniform vec2 uPx;
    void main(){ vec2 d=uPx; vec3 c=texture(uS,vUv+vec2(-d.x,0)).rgb+texture(uS,vUv+vec2(d.x,0)).rgb+texture(uS,vUv+vec2(0,-d.y)).rgb+texture(uS,vUv+vec2(0,d.y)).rgb; o=vec4(c*0.25+texture(uB,vUv).rgb,1.0); }`,
    { uS: { value: null }, uB: { value: null }, uPx: { value: new THREE.Vector2() } });
  RT.final = pass(`uniform sampler2D uA, uDof, uBloom; uniform float uFocus, uK, uMax, uExp, uBloomK, uTime, uGrain;
    float coc(float z){ return clamp(uK*(z-uFocus)/max(z,1e-3), -uMax, uMax); }
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(0.0031308,c)); }
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uTime*17.0)*43758.5453); }
    void main(){ vec4 a=texture(uA,vUv); float cf=abs(coc(a.a)); vec4 dof=texture(uDof,vUv);
      vec3 c=mix(a.rgb,dof.rgb,smoothstep(0.6,2.2,max(cf,abs(dof.a)*2.0*step(dof.a,0.0))));
      c+=texture(uBloom,vUv).rgb*uBloomK; vec2 q=vUv-0.5; c*=1.0-0.55*dot(q*vec2(1.0,0.7),q*vec2(1.0,0.7))*1.6;
      c=aces(c*uExp); c=toSRGB(c); c+=(h(vUv*vec2(1080.0,1920.0))-0.5)*uGrain; c+=(h(vUv*vec2(1091.0,1931.0)+3.1)-0.5)/255.0; o=vec4(c,1.0); }`,
    { uA: { value: RT.acc.texture }, uDof: { value: RT.dof.texture }, uBloom: { value: RT.bloomUp[0].texture }, uFocus: { value: 3 }, uK: { value: 8 }, uMax: { value: 20 },
      uExp: { value: 1 }, uBloomK: { value: 0.09 }, uTime: { value: 0 }, uGrain: { value: 0.02 } });
}
let EXPOSURE = 1.0;
function setScene(t, si = shotAt(t)) {
  const s = applyAll(t);
  const cam = CAM_OVERRIDE ? (() => { const o = CAM_OVERRIDE; return { pos: V3(o[0], o[1], o[2]), tgt: V3(o[3], o[4], o[5]), fov: o[6], coc: o[7] ?? 4, roll: 0, focus: Math.hypot(o[0] - o[3], o[1] - o[4], o[2] - o[5]) }; })() : cameraAt(t, s, si);
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(cam.tgt); if (cam.roll) camera.rotateZ(cam.roll);
  onCamera(t, s, cam);
  scene.updateMatrixWorld(true);
  return cam;
}
function renderAt(t) {
  const si = shotAt(t), sh = SHOTS[si];
  const n = Math.max(1, SUB);
  const offs = []; for (let i = 0; i < n; i++) offs.push(n === 1 ? 0 : (i / (n - 1) - 0.5)); offs.sort((a, b) => Math.abs(b) - Math.abs(a));
  const jit = [[0, 0], [0.25, -0.25], [-0.25, 0.25], [0.375, 0.125], [-0.125, -0.375]];
  renderer.setRenderTarget(RT.acc); renderer.setClearColor(0x000000, 0); renderer.clear();
  let cam;
  offs.forEach((o, i) => {
    cam = setScene(clamp(t + o * SHUTTER / FPS, sh.t0, sh.t1 - 1e-4), si);   // never blur across a cut
    const [jx, jy] = n > 1 ? jit[i % jit.length] : [0, 0];
    camera.setViewOffset(W, HGT, jx, jy, W, HGT);
    renderer.setRenderTarget(RT.scene); renderer.setClearColor(0x000000, 1); renderer.render(scene, camera); camera.clearViewOffset();
    const u = RT.accum.m.uniforms; u.uW.value = 1 / n; u.uNear.value = camera.near; u.uFar.value = camera.far; u.uCenter.value = i === n - 1 ? 1 : 0; RT.accum.run(RT.acc);
  });
  cam = setScene(t, si);
  for (const pp of [RT.coc.m, RT.final.m]) { pp.uniforms.uFocus.value = cam.focus; pp.uniforms.uK.value = cam.coc; }
  RT.coc.run(RT.half); RT.gather.m.uniforms.uMax.value = Math.min(cam.coc * 0.5 + 1, 11); RT.gather.run(RT.dof);
  RT.bloom.forEach((rt, i) => { const u = RT.down.m.uniforms; u.uS.value = i === 0 ? RT.acc.texture : RT.bloom[i - 1].texture; u.uPx.value.set(1 / rt.width, 1 / rt.height); u.uThr.value = i === 0 ? 1.2 : 0; RT.down.run(rt); });
  for (let i = RT.bloomUp.length - 1; i >= 0; i--) { const u = RT.up.m.uniforms; u.uS.value = i === RT.bloomUp.length - 1 ? RT.bloom[i + 1].texture : RT.bloomUp[i + 1].texture; u.uB.value = RT.bloom[i].texture; u.uPx.value.set(1 / RT.bloomUp[i].width, 1 / RT.bloomUp[i].height); RT.up.run(RT.bloomUp[i]); }
  const f = RT.final.m.uniforms; f.uExp.value = EXPOSURE; f.uTime.value = t; RT.final.run(null);
}

// ───────────────────────────── boot ─────────────────────────────
buildAll();
{ // environment for reflections: the room itself, captured once
  const crt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const cc = new THREE.CubeCamera(0.05, 50, crt); cc.position.set(0, 1.4, 0); scene.add(cc);
  setScene(0.5); cc.update(renderer, scene); scene.remove(cc);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromCubemap(crt.texture).texture; scene.environmentIntensity = 0.6;
}
buildPost();
window.renderAt = renderAt; window.duration = T_END; window.fps = FPS; window.W = W; window.H = HGT;
window.__dbg = { THREE, scene, camera, PEOPLE, HOUSE };
window.qa = { setSub: (n) => SUB = n, setCam: (c) => CAM_OVERRIDE = c, setExposure: (e) => EXPOSURE = e,
  // luminance stats of the HDR frame (before tone mapping), with parts switched off, to find what blows out
  stats: (t, off = []) => {
    const saved = off.map(k => { const o = k === 'env' ? null : (k === 'bloom' ? null : LIGHTS[k] || null); return o; });
    const env = scene.environment; if (off.includes('env')) scene.environment = null;
    const bk = RT.final.m.uniforms.uBloomK.value; if (off.includes('bloom')) RT.final.m.uniforms.uBloomK.value = 0;
    const vis = []; for (const k of off) { if (LIGHTS[k]) { const L = Array.isArray(LIGHTS[k]) ? LIGHTS[k] : [LIGHTS[k]]; L.forEach(l => { vis.push([l, l.visible]); l.visible = false; }); } }
    renderAt(t);
    const buf = new Uint16Array(W * HGT * 4); renderer.readRenderTargetPixels(RT.acc, 0, 0, W, HGT, buf);
    const f16 = (h) => { const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, m = h & 1023; return e === 0 ? s * 6.1e-5 * (m / 1024) : e === 31 ? 65504 : s * Math.pow(2, e - 15) * (1 + m / 1024); };
    const L = []; for (let i = 0; i < buf.length; i += 4 * 97) L.push(0.2126 * f16(buf[i]) + 0.7152 * f16(buf[i + 1]) + 0.0722 * f16(buf[i + 2]));
    L.sort((a, b) => a - b);
    scene.environment = env; RT.final.m.uniforms.uBloomK.value = bk; vis.forEach(([l, v]) => l.visible = v);
    return { p10: +L[L.length * 0.1 | 0].toFixed(3), p50: +L[L.length * 0.5 | 0].toFixed(3), p90: +L[L.length * 0.9 | 0].toFixed(3), p99: +L[L.length * 0.99 | 0].toFixed(2), max: +L[L.length - 1].toFixed(1) };
  } };
window.ready = true;
const tq = Q.get('t'); if (tq !== null) renderAt(+tq); else if (!Q.has('render')) renderAt(1.0);
</script>
</body>
</html>
