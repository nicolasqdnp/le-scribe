// ─────────────────────────────────────────────────────────────────────────────
//  GFX — moteur WebGL2 : pipeline HDR linéaire (RGBA16F)
//   fond procédural (demi-résolution) → scène (sprites 3D + particules)
//   → accumulation de sous-images (flou de mouvement, obturateur 180°)
//   → bloom (chaîne de rééchantillonnage) + traînée anamorphique
//   → aberration chromatique, vignette, étalonnage, grain, dither → sRGB 8 bits
// ─────────────────────────────────────────────────────────────────────────────
import { W, H } from './timeline.js';

export const FOCAL = 2200; // distance focale en pixels : le plan z=0 est à l'échelle 1:1

// ── mat4 (colonne-major) ─────────────────────────────────────────────────────
export const M4 = {
  id: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  },
  translate: (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]),
  scale: (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]),
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  perspective(fovy, aspect, n, f) {
    const t = 1 / Math.tan(fovy / 2);
    return new Float32Array([t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]);
  },
};
export const PROJ = M4.perspective(2 * Math.atan(H / 2 / FOCAL), W / H, 50, 30000);

// ── Shaders ──────────────────────────────────────────────────────────────────
const NOISE = `
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0., s=.5; for(int i=0;i<5;i++){ a+=s*vnoise(p); p=p*2.03+vec2(17.1,9.7); s*=.5; } return a; }
vec3 srgb2lin(vec3 c){ return pow(max(c,0.), vec3(2.2)); }
`;

const VS_FULL = `#version 300 es
out vec2 vUv;
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv = p; gl_Position = vec4(p*2.-1., 0., 1.); }`;

// Fond procédural : tunnel, rayons, marbre liquide, onde de choc, halo
const FS_BG = `#version 300 es
precision highp float;
${NOISE}
in vec2 vUv; out vec4 o;
uniform float uTime;
uniform vec4 uTunnel;  // amt, profondeur, roulis, pulsation
uniform vec4 uRays;    // amt, cx, cy, nombre de faisceaux
uniform vec4 uLiquid;  // amt, échelle, flux, veines
uniform vec4 uBurst;   // amt, âge, cx, cy
uniform vec4 uGlow;    // amt, cx, cy, rayon
uniform vec3 uTint;    // couleur principale (linéaire)
uniform vec3 uTint2;   // couleur secondaire
uniform vec3 uBase;    // fond
uniform vec2 uPar;     // parallaxe caméra
uniform float uGain;
uniform vec4 uScrim;   // amt, cx, cy, rayon : assombrit le fond sous le texte
void main(){
  vec2 p = (vUv-.5)*vec2(${(W / H).toFixed(5)},1.)*2.; // y ∈ [-1,1]
  p += uPar;
  vec3 col = uBase;
  // — halo
  if(uGlow.x>0.){ vec2 q=p-uGlow.yz; float r=length(q)/uGlow.w; col += uTint*uGlow.x*(exp(-r*r*2.5)+.25*exp(-r*1.2)); }
  // — tunnel rectangulaire
  if(uTunnel.x>0.){
    float c=cos(uTunnel.z), s=sin(uTunnel.z); vec2 q=mat2(c,-s,s,c)*p;
    vec2 a=abs(q); float d=max(a.x*.78,a.y*.78)+1e-3; float z=1./d;
    float u = (a.x>a.y) ? q.y/ max(a.x,1e-3) : q.x/ max(a.y,1e-3);
    float face = (a.x>a.y) ? (q.x>0.?0.:1.) : (q.y>0.?2.:3.);
    float zz = z*2.2 + uTunnel.y;
    float ring = smoothstep(.07,0.,.5-abs(fract(zz)-.5));
    float lines = smoothstep(.05,0.,abs(fract(u*4.+face*.5+.5)-.5)-.0);
    float wave = .5+.5*cos((zz-uTunnel.w*6.)*1.0);
    float fog = smoothstep(0.,.5,d);
    float pan = .06+.5*fbm(vec2(zz*.7, u*3.+face));
    vec3 t = uTint*(ring*(.9+1.4*wave)+lines*.35*(.4+wave))*fog + uTint2*pan*.06*fog;
    col += t*uTunnel.x;
  }
  // — rayons de lumière
  if(uRays.x>0.){
    vec2 q=p-uRays.yz; float r=length(q)+1e-3; float ang=atan(q.y,q.x);
    float n1=vnoise(vec2(ang*uRays.w*.5+uTime*.07, 3.1)), n2=vnoise(vec2(ang*uRays.w*1.3-uTime*.11, 9.7));
    float beams = pow(smoothstep(.35,.95,n1*.65+n2*.5),1.8);
    float fall = exp(-r*.95);
    float haze = .55+.9*fbm(p*1.6+vec2(uTime*.03,-uTime*.02));
    vec3 c = mix(uTint, uTint2, clamp(beams*1.2,0.,1.));
    col += c*(beams*fall*1.5 + fall*fall*.35)*haze*uRays.x;
  }
  // — marbre liquide (veines d'or)
  if(uLiquid.x>0.){
    vec2 q=p*uLiquid.y; float t=uTime*uLiquid.z;
    for(int i=0;i<3;i++){ q += .55*vec2(vnoise(q*1.1+vec2(t,0.)), vnoise(q.yx*1.1-vec2(0.,t)))-.275; q*=1.35; }
    float v=abs(sin(q.x*2.4+q.y*1.7+fbm(q)*4.)); float vein=pow(1.-v, uLiquid.w);
    float vein2=pow(1.-abs(sin(q.y*3.1-q.x*1.3+fbm(q+3.)*5.)), uLiquid.w*1.6);
    col += (uTint*vein*1.1 + uTint2*vein2*.55 + uTint*.012*fbm(q*.8))*uLiquid.x;
  }
  // — onde de choc + traits de vitesse
  if(uBurst.x>0.){
    vec2 q=p-uBurst.zw; float r=length(q); float a=uBurst.y; float ang=atan(q.y,q.x);
    float R=a*3.2; float ring=exp(-pow((r-R)/(.035+a*.06),2.));
    float R2=a*2.0; float ring2=exp(-pow((r-R2)/(.02+a*.04),2.))*.6;
    float spokes=pow(vnoise(vec2(ang*26.,floor(a*18.))),3.)*smoothstep(R*.15,R*.9,r)*smoothstep(R*1.1,R*.6,r);
    float e=exp(-a*2.2);
    col += (uTint*(ring+ring2)*2.2 + uTint2*spokes*1.8 + uTint*exp(-r*r*6.)*.9)*e*uBurst.x;
  }
  col = uBase + (col-uBase)*uGain;
  if(uScrim.x>0.){ vec2 q=(p-uScrim.yz)/vec2(uScrim.w*.7,uScrim.w); col *= 1.-uScrim.x*exp(-dot(q,q)*1.6); }
  o = vec4(col,1.);
}`;

// Sprites 3D texturés (texte, cartes, logo…)
const VS_SPRITE = `#version 300 es
layout(location=0) in vec2 aCorner;
uniform mat4 uMVP; uniform vec2 uSize; uniform vec4 uUV;
out vec2 vUv; out vec2 vLocal;
void main(){
  vUv = vec2(mix(uUV.x,uUV.z,aCorner.x+.5), mix(uUV.w,uUV.y,aCorner.y+.5));
  vLocal = aCorner;
  gl_Position = uMVP * vec4(aCorner*uSize, 0., 1.);
}`;
const FS_SPRITE = `#version 300 es
precision highp float;
${NOISE}
in vec2 vUv; in vec2 vLocal; out vec4 o;
uniform sampler2D uTex; uniform vec3 uTint; uniform vec3 uTint2; uniform float uGrad;
uniform float uAlpha, uGlow, uLod, uSplit, uAdd; uniform vec2 uSheen;
vec4 fetch(vec2 uv){ return textureLod(uTex, uv, uLod); }
void main(){
  vec4 c = fetch(vUv);
  float a = c.a;
  vec3 tint = mix(uTint, uTint2, uGrad*clamp(vLocal.y+.5,0.,1.));
  vec3 rgb; float al;
  if(uSplit>0.001){
    vec2 d=vec2(uSplit/1000.,0.);
    vec4 cr=fetch(vUv+d), cb=fetch(vUv-d);
    vec3 un = vec3(cr.r/max(cr.a,1e-3), c.g/max(a,1e-3), cb.b/max(cb.a,1e-3));
    vec3 al3 = vec3(cr.a, a, cb.a);
    rgb = pow(max(un,0.), vec3(2.2))*tint*uGlow*al3; al = max(max(al3.r,al3.g),al3.b);
  } else {
    vec3 un = c.rgb/max(a,1e-3);
    rgb = pow(max(un,0.), vec3(2.2))*tint*uGlow*a; al = a;
  }
  float band = exp(-pow((vLocal.x*.8+vLocal.y*.6-uSheen.x)/.10,2.));
  rgb *= (1. + uSheen.y*band*3.) * uAlpha;
  al *= uAlpha;
  o = vec4(rgb, uAdd>0. ? 0. : al);
}`;

// Particules (quads instanciés orientés, additifs)
const VS_PART = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPos;    // x,y,z,taille(px)
layout(location=2) in vec4 aCol;    // rgb, alpha
layout(location=3) in vec4 aShape;  // kind, angle, étirement, extra
uniform mat4 uVP; uniform vec2 uRes;
out vec2 vC; out vec4 vCol; out vec4 vShape;
void main(){
  vec4 cl = uVP * vec4(aPos.xyz,1.);
  float sc = ${FOCAL.toFixed(1)} / max(cl.w, 1.);
  float ca=cos(aShape.y), sa=sin(aShape.y);
  vec2 off = vec2(aCorner.x*aShape.z, aCorner.y) * aPos.w * sc;
  off = vec2(ca*off.x - sa*off.y, sa*off.x + ca*off.y);
  gl_Position = cl + vec4(off*2./uRes*cl.w, 0., 0.);
  vC = aCorner*2.; vC.x /= max(aShape.z,1.);  vCol=aCol; vShape=aShape;
  vC = aCorner*2.;
}`;
const FS_PART = `#version 300 es
precision highp float;
in vec2 vC; in vec4 vCol; in vec4 vShape; out vec4 o;
void main(){
  float k=vShape.x; vec2 v=vC; float d=length(v); float a=0.;
  if(k<.5) a=exp(-d*d*3.2);
  else if(k<1.5) a=smoothstep(1.,.88,d)*(.3+.7*smoothstep(.55,.95,d));
  else if(k<2.5) a=exp(-v.y*v.y*26.)*pow(max(1.-abs(v.x),0.),1.3);
  else if(k<3.5) a=exp(-pow((d-.82)/.07,2.));
  else a=exp(-abs(v.x*v.y)*14.)*smoothstep(1.,.0,d);
  o = vec4(vCol.rgb*a*vCol.a, 0.);
}`;

// Accumulation + déformations de scène (glitch par bandes) ; maillage d'éclats pour le « shatter »
const FS_WARP = `#version 300 es
precision highp float;
${NOISE}
in vec2 vUv; in vec3 vBary; in float vMask; out vec4 o;
uniform sampler2D uScene; uniform float uWeight;
uniform vec4 uGlitch;  // amt, seed, split(px), 0
uniform vec4 uCrack;   // amt, 0,0,0
uniform vec4 uBars;    // amt, seed — barres de décalage
void main(){
  vec2 uv = vUv; vec2 px = uv*vec2(${W}.,${H}.);
  vec3 split = vec3(0.);
  if(uGlitch.x>0.){
    float bh = mix(10.,90.,hash11(uGlitch.y*1.37));
    float band = floor(px.y/bh);
    float h = hash21(vec2(band, uGlitch.y));
    float a2 = uGlitch.x*uGlitch.x; float on = step(1.-a2*.6, h);
    float sh = (hash21(vec2(band+.5, uGlitch.y*3.1))-.5)*2.*uGlitch.x*190.*on;
    uv.x += sh/${W}.;
    split = vec3(on*uGlitch.z/${W}.,0.,0.);
    // blocs recopiés
    vec2 bl = floor(px/vec2(180.,70.)); float hb = hash21(bl+uGlitch.y*7.);
    if(hb>1.-a2*.05){ uv += (hash22(bl+3.)-.5)*.25; }
  }
  vec3 c;
  if(split.x!=0.){ c = vec3(texture(uScene, uv+split.xy).r, texture(uScene, uv).g, texture(uScene, uv-split.xy).b); }
  else c = texture(uScene, uv).rgb;
  float edge = min(vBary.x, min(vBary.y, vBary.z));
  float crack = uCrack.x * vMask * smoothstep(.014,.0,edge);
  c += vec3(1.,.55,.4)*crack*1.6;
  o = vec4(c*uWeight, 1.);
}`;
const VS_SHARD = `#version 300 es
${NOISE}
uniform mat4 uVP; uniform vec4 uShatter; // p, graine, 0, 0
out vec2 vUv; out vec3 vBary; out float vMask;
const int NX=9, NY=16;
vec2 vtx(ivec2 g){
  vec2 base = vec2(g)*vec2(${W / 9}.,${H / 16}.);
  bool inner = g.x>0 && g.x<NX && g.y>0 && g.y<NY;
  vec2 j = (hash22(vec2(g)+uShatter.y)-.5)*(inner?78.:0.);
  if(g.x==0||g.x==NX) j.x=0.; if(g.y==0||g.y==NY) j.y=0.;
  return base + j;
}
void main(){
  int tri = gl_VertexID/3; int k = gl_VertexID%3;
  int cell = tri/2; int half_ = tri%2; int cx = cell%NX, cy = cell/NX;
  bool diag = hash21(vec2(cx,cy)+uShatter.y)>.5;
  ivec2 a,b,c;
  if(diag){ if(half_==0){ a=ivec2(0,0); b=ivec2(1,0); c=ivec2(1,1);} else { a=ivec2(0,0); b=ivec2(1,1); c=ivec2(0,1);} }
  else    { if(half_==0){ a=ivec2(0,0); b=ivec2(1,0); c=ivec2(0,1);} else { a=ivec2(1,0); b=ivec2(1,1); c=ivec2(0,1);} }
  ivec2 o0 = ivec2(cx,cy);
  vec2 pa=vtx(o0+a), pb=vtx(o0+b), pc=vtx(o0+c);
  vec2 cen=(pa+pb+pc)/3.;
  vec2 P = k==0?pa:(k==1?pb:pc);
  vUv = vec2(P.x/${W}., 1.-P.y/${H}.);
  vBary = vec3(k==0?1.:0., k==1?1.:0., k==2?1.:0.);
  float p = uShatter.x;
  vec3 h = vec3(hash21(cen*.013+uShatter.y), hash21(cen*.029+7.1), hash21(cen*.047+3.3));
  vec2 dir = normalize(cen-vec2(${W / 2}.,${H * 0.4}.)+(h.xy-.5)*260.);
  vMask = step(.35,h.z) * step(length(cen-vec2(${W / 2}.,${H * 0.4}.))/1300., uShatter.z);
  float e = p*p;
  vec3 disp = vec3(dir*e*(220.+520.*h.x), e*(500.+1700.*h.y));
  float ang = e*(h.z-.5)*7.;
  vec2 d = P-cen; float cs=cos(ang), sn=sin(ang);
  vec2 rp = vec2(cs*d.x-sn*d.y, sn*d.x+cs*d.y);
  float tilt = e*(h.x-.5)*3.;
  vec3 w = vec3(cen.x-${W / 2}., ${H / 2}.-cen.y, 0.) + vec3(rp.x, -rp.y, rp.x*sin(tilt)*.8) + vec3(disp.x, -disp.y, disp.z);
  gl_Position = uVP * vec4(w,1.);
}`;

// Post : prefiltre / rééchantillonnage bloom
const FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uPre; uniform float uThr;
vec3 S(vec2 uv){ return texture(uTex, uv).rgb; }
float luma(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
vec3 kar(vec3 c){ return c/(1.+luma(c)*.25); }
void main(){
  vec2 t=uTexel; vec2 uv=vUv;
  vec3 a=S(uv+t*vec2(-2,-2)), b=S(uv+t*vec2(0,-2)), c=S(uv+t*vec2(2,-2));
  vec3 d=S(uv+t*vec2(-2,0)),  e=S(uv),              f=S(uv+t*vec2(2,0));
  vec3 g=S(uv+t*vec2(-2,2)),  h=S(uv+t*vec2(0,2)),  i=S(uv+t*vec2(2,2));
  vec3 j=S(uv+t*vec2(-1,-1)), k=S(uv+t*vec2(1,-1)), l=S(uv+t*vec2(-1,1)), m=S(uv+t*vec2(1,1));
  vec3 r;
  if(uPre>.5){
    // premier niveau (1/4) : 4 taps bilinéaires = boîte 4×4, seuil doux + moyenne de Karis (anti-lucioles)
    vec3 q0=S(uv+t*vec2(-1,-1)), q1=S(uv+t*vec2(1,-1)), q2=S(uv+t*vec2(-1,1)), q3=S(uv+t*vec2(1,1));
    q0=kar(q0); q1=kar(q1); q2=kar(q2); q3=kar(q3);
    r=(q0+q1+q2+q3)*.25;
    float L=luma(r); float kn = clamp((L-uThr)/(uThr*.8+1e-3),0.,1.); r *= kn*kn*(3.-2.*kn);
  } else {
    r = e*.125 + (a+c+g+i)*.03125 + (b+d+f+h)*.0625 + (j+k+l+m)*.125;
  }
  o=vec4(r,1.);
}`;
const FS_UP = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform sampler2D uPrev; uniform vec2 uTexel; uniform float uMix;
void main(){
  vec2 t=uTexel; vec2 uv=vUv;
  vec3 s = texture(uTex, uv+t*vec2(-1,-1)).rgb + 2.*texture(uTex, uv+t*vec2(0,-1)).rgb + texture(uTex, uv+t*vec2(1,-1)).rgb
         + 2.*texture(uTex, uv+t*vec2(-1,0)).rgb + 4.*texture(uTex, uv).rgb + 2.*texture(uTex, uv+t*vec2(1,0)).rgb
         + texture(uTex, uv+t*vec2(-1,1)).rgb + 2.*texture(uTex, uv+t*vec2(0,1)).rgb + texture(uTex, uv+t*vec2(1,1)).rgb;
  s /= 16.;
  o = vec4(s*uMix + texture(uPrev, uv).rgb, 1.);
}`;
// Traînée anamorphique horizontale (flou gaussien 1D large sur le niveau 2)
const FS_STREAK = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uTexel;
void main(){
  vec3 s=vec3(0.); float wsum=0.;
  for(int i=-12;i<=12;i++){ float w=exp(-float(i*i)/50.); s += texture(uTex, vUv+vec2(float(i)*uTexel.x*1.5,0.)).rgb*w; wsum+=w; }
  o=vec4(s/wsum,1.);
}`;

const FS_FINAL = `#version 300 es
precision highp float;
${NOISE}
in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uBloom, uStreak;
uniform float uBloomAmt, uStreakAmt, uCA, uVig, uGrain, uExposure, uFlash, uFrame, uFade, uSat, uPulse;
uniform vec3 uFlashCol; uniform vec3 uShadow; uniform vec3 uHigh;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec2 uv=vUv; vec2 d=uv-.5; d.x*=${(W / H).toFixed(5)};
  float r2=dot(d,d);
  vec2 off = (uv-.5)*(uCA*(1.+r2*5.));
  vec3 col;
  col.r = texture(uScene, uv+off).r; col.g = texture(uScene, uv).g; col.b = texture(uScene, uv-off).b;
  vec3 bl; bl.r = texture(uBloom, uv+off*1.5).r; bl.g=texture(uBloom,uv).g; bl.b=texture(uBloom,uv-off*1.5).b;
  col += bl*uBloomAmt + texture(uStreak, uv).rgb*uStreakAmt;
  col = col*(1.+uFlash*1.6) + uFlashCol*uFlash*uFlash;
  col *= uExposure;
  // vignette
  col *= 1. - uVig*smoothstep(.12,.95,r2*2.1);
  col = aces(col);
  // étalonnage : ombres froides, hautes lumières chaudes, saturation
  float L = dot(col, vec3(.2126,.7152,.0722));
  col = mix(vec3(L), col, uSat);
  col += uShadow*L*(1.-smoothstep(0.,.35,L))*.12 + uHigh*smoothstep(.45,1.,L)*.04;
  col = pow(max(col,0.), vec3(1./2.2));
  // grain argentique : 2 octaves, plus présent dans les demi-teintes, un peu chromatique
  vec2 px = floor(gl_FragCoord.xy/1.35);
  float seed = uFrame*13.37;
  float g1 = hash21(px+seed)+hash21(px*.5+seed+11.)-1.;
  vec3 gc = vec3(g1) + (vec3(hash21(px+seed+3.), hash21(px+seed+5.), hash21(px+seed+7.))-.5)*.35;
  float mid = .35+.65*(1.-abs(L*2.-1.));
  col += gc*uGrain*mid*(1.-uFade);
  // dither triangulaire 8 bits
  col += (hash21(gl_FragCoord.xy+seed+23.)+hash21(gl_FragCoord.xy*1.7+seed+31.)-1.)/255.;
  col *= 1.-uFade;
  o = vec4(clamp(col,0.,1.),1.);
}`;

// ── Utilitaires GL ───────────────────────────────────────────────────────────
function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const lines = src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
    throw new Error('shader: ' + log + '\n' + lines.slice(0, 6000));
  }
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}

export class Renderer {
  constructor(canvas, opts = {}) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 indisponible');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float manquant');
    this.gl = gl;
    this.canvas = canvas;
    this.bgScale = opts.bgScale ?? 0.5;
    this.fbo = {};
    const mk = (n, w, h, fmt = 'f16') => (this.fbo[n] = this.makeTarget(w, h, fmt));
    mk('bg', Math.round(W * this.bgScale), Math.round(H * this.bgScale));
    mk('scene', W, H);
    mk('accum', W, H);
    this.levels = [];
    for (let i = 2; i <= 7; i++) {
      const w = Math.max(2, W >> i), h = Math.max(2, H >> i);
      this.levels.push({ down: this.makeTarget(w, h), up: this.makeTarget(w, h), w, h });
    }
    this.streak = this.makeTarget(W >> 3, H >> 3);
    mk('final', W, H, 'u8');

    this.pr = {
      bg: program(gl, VS_FULL, FS_BG),
      sprite: program(gl, VS_SPRITE, FS_SPRITE),
      part: program(gl, VS_PART, FS_PART),
      warp: program(gl, VS_FULL.replace('out vec2 vUv;', 'out vec2 vUv; out vec3 vBary; out float vMask;').replace('vUv = p;', 'vUv = p; vBary = vec3(1.); vMask = 1.;'), FS_WARP),
      shard: program(gl, VS_SHARD, FS_WARP),
      down: program(gl, VS_FULL, FS_DOWN),
      up: program(gl, VS_FULL, FS_UP),
      streak: program(gl, VS_FULL, FS_STREAK),
      final: program(gl, VS_FULL, FS_FINAL),
      copy: program(gl, VS_FULL, `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; void main(){ o=vec4(texture(uTex,vUv).rgb,1.); }`),
    };
    // géométrie : quad unité (TRIANGLE_STRIP) et vao vide pour les plein-écran
    this.vaoEmpty = gl.createVertexArray();
    this.quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    this.vaoSprite = gl.createVertexArray();
    gl.bindVertexArray(this.vaoSprite);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.partBuf = gl.createBuffer();
    this.vaoPart = gl.createVertexArray();
    gl.bindVertexArray(this.vaoPart);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    for (let k = 0; k < 3; k++) {
      gl.enableVertexAttribArray(1 + k);
      gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, 48, k * 16);
      gl.vertexAttribDivisor(1 + k, 1);
    }
    gl.bindVertexArray(null);
    this.pixels = new Uint8Array(W * H * 4);
  }

  makeTarget(w, h, fmt = 'f16') {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, fmt === 'f16' ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }

  /** Texture 2D depuis un canvas (alpha prémultipliée, mipmaps) */
  textureFromCanvas(cv) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex, w: cv.width, h: cv.height };
  }

  bind(target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, target.w, target.h);
  }
  use(name) {
    this.cur = this.pr[name];
    this.gl.useProgram(this.cur.p);
    return this.cur.u;
  }
  tex(unit, t) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex ?? t);
  }
  full() {
    this.gl.bindVertexArray(this.vaoEmpty);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  // ── Fond ───────────────────────────────────────────────────────────────────
  drawBG(bg, time) {
    const gl = this.gl;
    this.bind(this.fbo.bg);
    gl.disable(gl.BLEND);
    const u = this.use('bg');
    gl.uniform1f(u.uTime, time);
    gl.uniform4fv(u.uTunnel, bg.tunnel || [0, 0, 0, 0]);
    gl.uniform4fv(u.uRays, bg.rays || [0, 0, 0, 8]);
    gl.uniform4fv(u.uLiquid, bg.liquid || [0, 1, 0, 6]);
    gl.uniform4fv(u.uBurst, bg.burst || [0, 0, 0, 0]);
    gl.uniform4fv(u.uGlow, bg.glow || [0, 0, 0, 1]);
    gl.uniform3fv(u.uTint, bg.tint || [1, 0.7, 0.35]);
    gl.uniform3fv(u.uTint2, bg.tint2 || [1, 1, 1]);
    gl.uniform3fv(u.uBase, bg.base || [0.004, 0.003, 0.005]);
    gl.uniform2fv(u.uPar, bg.par || [0, 0]);
    gl.uniform1f(u.uGain, bg.gain ?? 0.2);
    gl.uniform4fv(u.uScrim, bg.scrim || [0, 0, 0, 1]);
    this.full();
  }

  // ── Scène : fond + sprites + particules ───────────────────────────────────
  beginScene() {
    const gl = this.gl;
    // fond demi-résolution → scène pleine résolution (blit filtré, sans shader)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo.bg.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fbo.scene.fb);
    gl.disable(gl.BLEND);
    gl.blitFramebuffer(0, 0, this.fbo.bg.w, this.fbo.bg.h, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    this.bind(this.fbo.scene);
  }
  drawSprites(list, view) {
    const gl = this.gl;
    if (!list.length) return;
    const VP = M4.mul(PROJ, view);
    const u = this.use('sprite');
    gl.bindVertexArray(this.vaoSprite);
    gl.enable(gl.BLEND);
    gl.uniform1i(u.uTex, 0);
    // tri du plus loin au plus près (coordonnée z dans l'espace caméra)
    const items = list.map((s) => {
      const M = s.matrix;
      const MVP = M4.mul(VP, M);
      const mv = M4.mul(view, M);
      return { s, MVP, z: s.sortZ !== undefined ? s.sortZ : mv[14] };
    });
    items.sort((a, b) => a.z - b.z);
    for (const { s, MVP } of items) {
      gl.blendFunc(gl.ONE, s.add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      this.tex(0, s.tex);
      gl.uniformMatrix4fv(u.uMVP, false, MVP);
      gl.uniform2f(u.uSize, s.w, s.h);
      const uv = s.uv || [0, 0, 1, 1];
      gl.uniform4f(u.uUV, uv[0], uv[1], uv[2], uv[3]);
      const tn = s.tint || [1, 1, 1];
      gl.uniform3f(u.uTint, tn[0], tn[1], tn[2]);
      const t2 = s.tint2 || tn;
      gl.uniform3f(u.uTint2, t2[0], t2[1], t2[2]);
      gl.uniform1f(u.uGrad, s.tint2 ? 1 : 0);
      gl.uniform1f(u.uAlpha, s.alpha ?? 1);
      gl.uniform1f(u.uGlow, (s.glow ?? 1) * (s.text ? 0.42 : 0.9));
      gl.uniform1f(u.uLod, s.lod ?? 0);
      gl.uniform1f(u.uSplit, s.split ?? 0);
      gl.uniform1f(u.uAdd, s.add ? 1 : 0);
      gl.uniform2f(u.uSheen, s.sheenPos ?? 0, s.sheen ?? 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.bindVertexArray(null);
  }
  drawParticles(data, count, view) {
    const gl = this.gl;
    if (!count) return;
    const VP = M4.mul(PROJ, view);
    const u = this.use('part');
    gl.bindVertexArray(this.vaoPart);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 12), gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(u.uVP, false, VP);
    gl.uniform2f(u.uRes, W, H);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    gl.bindVertexArray(null);
  }

  // ── Accumulation (flou de mouvement) ──────────────────────────────────────
  clearAccum() {
    const gl = this.gl;
    this.bind(this.fbo.accum);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  accumulate(weight, warp = {}) {
    const gl = this.gl;
    this.bind(this.fbo.accum);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    const shatter = !!warp.shatter;
    const u = this.use(shatter ? 'shard' : 'warp');
    this.tex(0, this.fbo.scene);
    gl.uniform1i(u.uScene, 0);
    gl.uniform1f(u.uWeight, weight);
    const g = warp.glitch || [0, 0, 0, 0];
    gl.uniform4f(u.uGlitch, g[0], g[1], g[2], 0);
    gl.uniform4f(u.uCrack, warp.crack || 0, 0, 0, 0);
    if (shatter) {
      gl.uniformMatrix4fv(u.uVP, false, M4.mul(PROJ, M4.translate(0, 0, -FOCAL)));
      gl.uniform4f(u.uShatter, warp.shatter.p, warp.shatter.seed || 1, warp.shatter.reveal ?? 1, 0);
      gl.bindVertexArray(this.vaoEmpty);
      gl.drawArrays(gl.TRIANGLES, 0, 9 * 16 * 2 * 3);
    } else this.full();
    gl.disable(gl.BLEND);
  }

  // ── Post-traitement + sortie 8 bits ───────────────────────────────────────
  post(p, frame) {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    // bloom : descente
    let src = this.fbo.accum;
    this.levels.forEach((lv, i) => {
      this.bind(lv.down);
      const u = this.use('down');
      this.tex(0, src);
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uTexel, 1 / src.w, 1 / src.h);
      gl.uniform1f(u.uPre, i === 0 ? 1 : 0);
      gl.uniform1f(u.uThr, p.bloomThr ?? 0.9);
      this.full();
      src = lv.down;
    });
    // remontée : up[i] = tent(up[i+1]) * mix + down[i]
    for (let i = this.levels.length - 1; i >= 0; i--) {
      const lv = this.levels[i];
      this.bind(lv.up);
      const u = this.use('up');
      const lower = i === this.levels.length - 1 ? lv.down : this.levels[i + 1].up;
      this.tex(0, lower);
      this.tex(1, lv.down);
      gl.uniform1i(u.uTex, 0);
      gl.uniform1i(u.uPrev, 1);
      gl.uniform2f(u.uTexel, 1 / lower.w, 1 / lower.h);
      gl.uniform1f(u.uMix, i === this.levels.length - 1 ? 0 : 0.6);
      this.full();
    }
    // traînée anamorphique à partir du niveau 2 (¼ de résolution)
    this.bind(this.streak);
    {
      const u = this.use('streak');
      this.tex(0, this.levels[1].down);
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uTexel, 1 / this.levels[1].w, 1 / this.levels[1].h);
      this.full();
    }
    // final
    this.bind(this.fbo.final);
    const u = this.use('final');
    this.tex(0, this.fbo.accum);
    this.tex(1, this.levels[0].up);
    this.tex(2, this.streak);
    gl.uniform1i(u.uScene, 0);
    gl.uniform1i(u.uBloom, 1);
    gl.uniform1i(u.uStreak, 2);
    gl.uniform1f(u.uBloomAmt, (p.bloom ?? 0.55) * 0.5);
    gl.uniform1f(u.uStreakAmt, (p.streak ?? 0.25) * 0.5);
    gl.uniform1f(u.uCA, p.ca ?? 0.003);
    gl.uniform1f(u.uVig, p.vig ?? 0.55);
    gl.uniform1f(u.uGrain, p.grain ?? 0.05);
    gl.uniform1f(u.uExposure, p.exposure ?? 1.0);
    gl.uniform1f(u.uFlash, p.flash ?? 0);
    gl.uniform3fv(u.uFlashCol, p.flashCol || [1, 1, 1]);
    gl.uniform1f(u.uFrame, frame % 1024);
    gl.uniform1f(u.uFade, p.fade ?? 0);
    gl.uniform1f(u.uSat, p.sat ?? 1.05);
    gl.uniform3fv(u.uShadow, p.shadow || [-0.4, 0.1, 0.6]);
    gl.uniform3fv(u.uHigh, p.high || [0.8, 0.45, 0.0]);
    gl.uniform1f(u.uPulse, 0);
    this.full();
  }
  /** Lit l'image finale (haut → bas, RGBA 8 bits) */
  read() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.final.fb);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels);
    return this.pixels; // lignes de bas en haut : ffmpeg applique vflip
  }
  /** Affiche l'image finale sur le canvas visible */
  present() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    const u = this.use('copy');
    this.tex(0, this.fbo.final);
    gl.uniform1i(u.uTex, 0);
    this.full();
  }
  clearFinalBlack() {
    const gl = this.gl;
    this.bind(this.fbo.final);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
