var D=globalThis,z=D.ShadowRoot&&(D.ShadyCSS===void 0||D.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,K=Symbol(),ce=new WeakMap,T=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==K)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(z&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=ce.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&ce.set(t,e))}return e}toString(){return this.cssText}},le=n=>new T(typeof n=="string"?n:n+"",void 0,K),V=(n,...e)=>{let t=n.length===1?n[0]:e.reduce((s,i,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[r+1],n[0]);return new T(t,n,K)},he=(n,e)=>{if(z)n.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),i=D.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,n.appendChild(s)}},q=z?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return le(t)})(n):n;var{is:Re,defineProperty:Oe,getOwnPropertyDescriptor:He,getOwnPropertyNames:Ue,getOwnPropertySymbols:Ne,getPrototypeOf:Le}=Object,B=globalThis,de=B.trustedTypes,Fe=de?de.emptyScript:"",Ie=B.reactiveElementPolyfillSupport,R=(n,e)=>n,J={toAttribute(n,e){switch(e){case Boolean:n=n?Fe:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},ue=(n,e)=>!Re(n,e),pe={attribute:!0,type:String,converter:J,reflect:!1,useDefault:!1,hasChanged:ue};Symbol.metadata??=Symbol("metadata"),B.litPropertyMetadata??=new WeakMap;var v=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=pe){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&Oe(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){let{get:i,set:r}=He(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:i,set(o){let l=i?.call(this);r?.call(this,o),this.requestUpdate(e,l,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??pe}static _$Ei(){if(this.hasOwnProperty(R("elementProperties")))return;let e=Le(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(R("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(R("properties"))){let t=this.properties,s=[...Ue(t),...Ne(t)];for(let i of s)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let i of s)t.unshift(q(i))}else e!==void 0&&t.push(q(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return he(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){let s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){let r=(s.converter?.toAttribute!==void 0?s.converter:J).toAttribute(t,s.type);this._$Em=e,r==null?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(e,t){let s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let r=s.getPropertyOptions(i),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:J;this._$Em=i;let l=o.fromAttribute(t,r.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(e,t,s,i=!1,r){if(e!==void 0){let o=this.constructor;if(i===!1&&(r=this[e]),s??=o.getPropertyOptions(e),!((s.hasChanged??ue)(r,t)||s.useDefault&&s.reflect&&r===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:r},o){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),r!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,r]of this._$Ep)this[i]=r;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,r]of s){let{wrapped:o}=r,l=this[i];o!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,r,l)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};v.elementStyles=[],v.shadowRootOptions={mode:"open"},v[R("elementProperties")]=new Map,v[R("finalized")]=new Map,Ie?.({ReactiveElement:v}),(B.reactiveElementVersions??=[]).push("2.1.2");var te=globalThis,fe=n=>n,j=te.trustedTypes,me=j?j.createPolicy("lit-html",{createHTML:n=>n}):void 0,be="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,Ae="?"+$,De=`<${Ae}>`,E=document,H=()=>E.createComment(""),U=n=>n===null||typeof n!="object"&&typeof n!="function",se=Array.isArray,ze=n=>se(n)||typeof n?.[Symbol.iterator]=="function",X=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ge=/-->/g,_e=/>/g,A=RegExp(`>|${X}(?:([^\\s"'>=/]+)(${X}*=${X}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ve=/'/g,ye=/"/g,xe=/^(?:script|style|textarea|title)$/i,ie=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),M=ie(1),nt=ie(2),rt=ie(3),S=Symbol.for("lit-noChange"),f=Symbol.for("lit-nothing"),$e=new WeakMap,x=E.createTreeWalker(E,129);function Ee(n,e){if(!se(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return me!==void 0?me.createHTML(e):e}var Be=(n,e)=>{let t=n.length-1,s=[],i,r=e===2?"<svg>":e===3?"<math>":"",o=O;for(let l=0;l<t;l++){let a=n[l],h,p,c=-1,m=0;for(;m<a.length&&(o.lastIndex=m,p=o.exec(a),p!==null);)m=o.lastIndex,o===O?p[1]==="!--"?o=ge:p[1]!==void 0?o=_e:p[2]!==void 0?(xe.test(p[2])&&(i=RegExp("</"+p[2],"g")),o=A):p[3]!==void 0&&(o=A):o===A?p[0]===">"?(o=i??O,c=-1):p[1]===void 0?c=-2:(c=o.lastIndex-p[2].length,h=p[1],o=p[3]===void 0?A:p[3]==='"'?ye:ve):o===ye||o===ve?o=A:o===ge||o===_e?o=O:(o=A,i=void 0);let d=o===A&&n[l+1].startsWith("/>")?" ":"";r+=o===O?a+De:c>=0?(s.push(h),a.slice(0,c)+be+a.slice(c)+$+d):a+$+(c===-2?l:d)}return[Ee(n,r+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},N=class n{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let r=0,o=0,l=e.length-1,a=this.parts,[h,p]=Be(e,t);if(this.el=n.createElement(h,s),x.currentNode=this.el.content,t===2||t===3){let c=this.el.content.firstChild;c.replaceWith(...c.childNodes)}for(;(i=x.nextNode())!==null&&a.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(let c of i.getAttributeNames())if(c.endsWith(be)){let m=p[o++],d=i.getAttribute(c).split($),g=/([.?@])?(.*)/.exec(m);a.push({type:1,index:r,name:g[2],strings:d,ctor:g[1]==="."?Y:g[1]==="?"?Z:g[1]==="@"?Q:C}),i.removeAttribute(c)}else c.startsWith($)&&(a.push({type:6,index:r}),i.removeAttribute(c));if(xe.test(i.tagName)){let c=i.textContent.split($),m=c.length-1;if(m>0){i.textContent=j?j.emptyScript:"";for(let d=0;d<m;d++)i.append(c[d],H()),x.nextNode(),a.push({type:2,index:++r});i.append(c[m],H())}}}else if(i.nodeType===8)if(i.data===Ae)a.push({type:2,index:r});else{let c=-1;for(;(c=i.data.indexOf($,c+1))!==-1;)a.push({type:7,index:r}),c+=$.length-1}r++}}static createElement(e,t){let s=E.createElement("template");return s.innerHTML=e,s}};function k(n,e,t=n,s){if(e===S)return e;let i=s!==void 0?t._$Co?.[s]:t._$Cl,r=U(e)?void 0:e._$litDirective$;return i?.constructor!==r&&(i?._$AO?.(!1),r===void 0?i=void 0:(i=new r(n),i._$AT(n,t,s)),s!==void 0?(t._$Co??=[])[s]=i:t._$Cl=i),i!==void 0&&(e=k(n,i._$AS(n,e.values),i,s)),e}var G=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??E).importNode(t,!0);x.currentNode=i;let r=x.nextNode(),o=0,l=0,a=s[0];for(;a!==void 0;){if(o===a.index){let h;a.type===2?h=new L(r,r.nextSibling,this,e):a.type===1?h=new a.ctor(r,a.name,a.strings,this,e):a.type===6&&(h=new ee(r,this,e)),this._$AV.push(h),a=s[++l]}o!==a?.index&&(r=x.nextNode(),o++)}return x.currentNode=E,i}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},L=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=f,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=k(this,e,t),U(e)?e===f||e==null||e===""?(this._$AH!==f&&this._$AR(),this._$AH=f):e!==this._$AH&&e!==S&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):ze(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==f&&U(this._$AH)?this._$AA.nextSibling.data=e:this.T(E.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=N.createElement(Ee(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{let r=new G(i,this),o=r.u(this.options);r.p(t),this.T(o),this._$AH=r}}_$AC(e){let t=$e.get(e.strings);return t===void 0&&$e.set(e.strings,t=new N(e)),t}k(e){se(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,i=0;for(let r of e)i===t.length?t.push(s=new n(this.O(H()),this.O(H()),this,this.options)):s=t[i],s._$AI(r),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let s=fe(e).nextSibling;fe(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},C=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,r){this.type=1,this._$AH=f,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=f}_$AI(e,t=this,s,i){let r=this.strings,o=!1;if(r===void 0)e=k(this,e,t,0),o=!U(e)||e!==this._$AH&&e!==S,o&&(this._$AH=e);else{let l=e,a,h;for(e=r[0],a=0;a<r.length-1;a++)h=k(this,l[s+a],t,a),h===S&&(h=this._$AH[a]),o||=!U(h)||h!==this._$AH[a],h===f?e=f:e!==f&&(e+=(h??"")+r[a+1]),this._$AH[a]=h}o&&!i&&this.j(e)}j(e){e===f?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},Y=class extends C{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===f?void 0:e}},Z=class extends C{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==f)}},Q=class extends C{constructor(e,t,s,i,r){super(e,t,s,i,r),this.type=5}_$AI(e,t=this){if((e=k(this,e,t,0)??f)===S)return;let s=this._$AH,i=e===f&&s!==f||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,r=e!==f&&(s===f||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},ee=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){k(this,e)}};var je=te.litHtmlPolyfillSupport;je?.(N,L),(te.litHtmlVersions??=[]).push("3.3.3");var Se=(n,e,t)=>{let s=t?.renderBefore??e,i=s._$litPart$;if(i===void 0){let r=t?.renderBefore??null;s._$litPart$=i=new L(e.insertBefore(H(),r),r,void 0,t??{})}return i._$AI(n),i};var ne=globalThis,b=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Se(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return S}};b._$litElement$=!0,b.finalized=!0,ne.litElementHydrateSupport?.({LitElement:b});var We=ne.litElementPolyfillSupport;We?.({LitElement:b});(ne.litElementVersions??=[]).push("4.2.2");async function we(n,e,t,s){let i=!1,r,o=new Promise(c=>r=c),l=!1,a=c=>{let m=c.data??{};switch(c.type){case"intent-progress":{let d=m.chat_log_delta;if(!d)break;let g=d.role==="assistant";typeof d.content=="string"&&d.content?(s.onText(d.content,g&&l),l=!0):g&&l&&s.onText("",!0);break}case"intent-end":{let d=m.intent_output??{},g=d.response?.speech?.plain?.speech??"";d.response?.response_type==="error"&&!l?s.onError(g||"The assistant could not answer."):s.onDone({speech:g,conversationId:d.conversation_id??null}),i=!0;break}case"error":i||s.onError(m.message||m.code||"The assistant could not answer."),i=!0,r();break;case"run-end":i||s.onError("The assistant did not answer."),i=!0,r();break}},h={type:"assist_pipeline/run",start_stage:"intent",end_stage:"intent",input:{text:e},conversation_id:t.conversationId??null};t.pipeline&&(h.pipeline=t.pipeline);let p;try{p=await n.connection.subscribeMessage(a,h)}catch(c){s.onError(c?.message||"Home Assistant refused the request.");return}await o;try{await p()}catch{}}var ke=n=>{n.replaceChildren();let e=document.createElement("ha-icon");e.setAttribute("icon","mdi:cat"),e.className="face-icon";let t=document.createElement("div");t.className="face-status",n.append(e,t);let s={idle:"",listening:"Listening\u2026",thinking:"Thinking\u2026",speaking:"",error:"Something went wrong"};return{setState(i){n.dataset.state=i,t.textContent=s[i]},setLevel(){},destroy(){n.replaceChildren()}}};var P={BOOT:0,IDLE:1,LISTEN:4,THINK:5,SPEAK:6,ERROR:8},Ce={idle:P.IDLE,listening:P.LISTEN,thinking:P.THINK,speaking:P.SPEAK,error:P.ERROR},Ke=30,Ve=12,qe=2,Je=1e3,Xe=6,F;function Ge(){if(!F){let n=new URL(import.meta.url),e=new URL(`kattio-face.wasm${n.search}`,n);F=(async()=>{let t=await fetch(e);if(!t.ok)throw new Error(`${e.pathname}: HTTP ${t.status}`);return WebAssembly.compile(await t.arrayBuffer())})(),F.catch(()=>F=void 0)}return F}async function Ye(){let n=await Ge(),e,t={clock_time_get:(r,o,l)=>(new DataView(e.buffer).setBigUint64(l,BigInt(Math.round(performance.now()*1e6)),!0),0),fd_close:()=>8,fd_seek:()=>8,fd_write:()=>8},i=(await WebAssembly.instantiate(n,{wasi_snapshot_preview1:t})).exports;return e=i.memory,i._initialize(),i.face_init(Math.random()*4294967295>>>0||1),i}function Me(n){return e=>{e.replaceChildren();let t=document.createElement("canvas");t.className="face-canvas",t.setAttribute("role","img"),t.setAttribute("aria-label","Kattio"),e.append(t);let s=t.getContext("2d",{alpha:!1}),i,r,o=!1,l="idle",a=0,h=0,p=0,c=0,m=0,d=!0,g=()=>{if(!i)return;let u=e.getBoundingClientRect(),_=Math.min(window.devicePixelRatio||1,qe),y=Math.max(1,Math.round(u.width*_)),w=Math.max(1,Math.round(u.height*_)),ae=Math.min(1,Je/Math.max(y,w));y=Math.max(1,Math.round(y*ae)),w=Math.max(1,Math.round(w*ae)),!(y===t.width&&w===t.height&&h)&&(t.width=y,t.height=w,h=i.face_resize(y,w),m=0)},W=new ResizeObserver(g);W.observe(e);let Te=()=>{if(!i||!s||!h)return;i.face_render();let u=new Uint8ClampedArray(i.memory.buffer,h,t.width*t.height*4);s.putImageData(new ImageData(u,t.width,t.height),0,0);let _=i.face_background();e.style.backgroundColor=`#${_.toString(16).padStart(6,"0")}`},re=u=>{if(o||(p=requestAnimationFrame(re),!i))return;let _=c?Math.min((u-c)/1e3,.25):0;c=u,a=Math.max(0,a-Xe*_*a-.02*_),i.face_set_level(a),d=i.face_update(_)!==0||d;let y=1e3/(d||l==="speaking"?Ke:Ve);u-m>=y-2&&(m=u,Te(),d=!1)},oe=()=>{i&&(i.face_poke(),d=!0)};return t.addEventListener("click",oe),Ye().then(u=>{o||(i=u,g(),l!=="idle"&&i.face_set_mood(Ce[l]),p=requestAnimationFrame(re))},u=>{console.warn("Kattio face: could not load the face engine, showing a simpler one",u),!o&&(W.disconnect(),r=n(e),r.setState(l))}),{setState(u){if(r)return r.setState(u);let _=u!==l;l=u,!(!i||!_)&&(u==="idle"&&i.face_get_mood()===P.BOOT||(i.face_set_mood(Ce[u]),d=!0))},setLevel(u){if(r)return r.setLevel(u);a=Math.max(a,Math.min(1,Math.max(0,u)))},destroy(){o=!0,cancelAnimationFrame(p),W.disconnect(),t.removeEventListener("click",oe),r?.destroy(),e.replaceChildren(),e.style.backgroundColor=""}}}}var Pe="kattio-panel:conversation:v1",Ze=100,Qe=Me(ke),I=class extends b{constructor(){super(...arguments);this.narrow=!1;this._messages=[];this._busy=!1;this._draft="";this._conversationId=null}get _config(){return this.panel?.config??{}}connectedCallback(){super.connectedCallback(),this._restore()}disconnectedCallback(){super.disconnectedCallback(),this._face?.destroy(),this._face=void 0}updated(t){t.has("_messages")&&this._scrollToEnd();let s=this.renderRoot.querySelector(".face");s&&!this._face?(this._face=Qe(s),this._face.setState("idle")):!s&&this._face&&(this._face.destroy(),this._face=void 0)}get _allowed(){let t=this._config.users??[];return t.length===0||!!this.hass?.user?.id&&t.includes(this.hass.user.id)}render(){let t=this._config.title||"Kattio";return this._allowed?M`
      <div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${t}</div>
        <button
          class="icon"
          title="New conversation"
          aria-label="New conversation"
          ?disabled=${this._busy||this._messages.length===0}
          @click=${this._newConversation}
        >
          <ha-icon icon="mdi:message-plus-outline"></ha-icon>
        </button>
      </div>
      <div class="face" aria-hidden="true"></div>
      <div class="talk">
        <div class="messages" role="log" aria-live="polite">
          ${this._messages.length===0?M`<div class="hint">Write to ${t} below.</div>`:this._messages.map(s=>M`<div class="msg ${s.role} ${s.pending?"pending":""}">${s.text||(s.pending?M`<span class="dots"><i></i><i></i><i></i></span>`:f)}</div>`)}
        </div>
        <div class="input">
          <button class="icon" title="Attach (coming later)" aria-label="Attach" disabled>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
          <textarea
            rows="1"
            placeholder="Message ${t}"
            .value=${this._draft}
            @input=${s=>this._draft=s.target.value}
            @keydown=${this._onKey}
          ></textarea>
          <button
            class="icon send"
            title="Send"
            aria-label="Send"
            ?disabled=${this._busy||!this._draft.trim()}
            @click=${this._send}
          >
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
          <button class="icon" title="Speak (coming later)" aria-label="Speak" disabled>
            <ha-icon icon="mdi:microphone"></ha-icon>
          </button>
        </div>
      </div>
    `:M`
        <div class="toolbar">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div class="title">${t}</div>
        </div>
        <div class="denied">${t} is not set up for you. Ask whoever runs this Home Assistant.</div>
      `}_onKey(t){t.key==="Enter"&&!t.shiftKey&&!t.isComposing&&(t.preventDefault(),this._send())}async _send(){let t=this._draft.trim();if(!t||this._busy||!this.hass)return;this._draft="",this._busy=!0;let s={role:"assistant",text:"",pending:!0};this._messages=[...this._messages,{role:"user",text:t},s],this._face?.setState("thinking");let i=()=>this._messages=[...this._messages];await we(this.hass,t,{pipeline:this._config.pipeline,conversationId:this._conversationId},{onText:(r,o)=>{s.text+=(o&&s.text?`

`:"")+r,this._face?.setState("speaking"),r&&this._face?.setLevel(.45+Math.random()*.4),i()},onDone:({speech:r,conversationId:o})=>{s.text.trim()||(s.text=r),s.pending=!1,this._conversationId=o??this._conversationId,this._face?.setState("idle"),i()},onError:r=>{s.pending=!1,s.text||(this._messages=this._messages.filter(o=>o!==s)),this._messages=[...this._messages,{role:"error",text:r}],this._face?.setState("error")}}),this._busy=!1,this._save()}_newConversation(){this._messages=[],this._conversationId=null,this._face?.setState("idle"),this._save()}_scrollToEnd(){let t=this.renderRoot.querySelector(".messages");t&&(t.scrollTop=t.scrollHeight)}_save(){try{let t=this._messages.filter(s=>!s.pending).slice(-Ze);sessionStorage.setItem(Pe,JSON.stringify({conversationId:this._conversationId,messages:t}))}catch{}}_restore(){try{let t=JSON.parse(sessionStorage.getItem(Pe)||"null");t&&Array.isArray(t.messages)&&(this._messages=t.messages,this._conversationId=t.conversationId??null)}catch{}}};I.properties={hass:{attribute:!1},narrow:{type:Boolean},panel:{attribute:!1},_messages:{state:!0},_busy:{state:!0},_draft:{state:!0}},I.styles=V`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: var(--header-height, 56px);
      padding: 0 8px 0 4px;
      flex: none;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
    }
    .title {
      flex: 1;
      font-size: 20px;
      margin-left: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .denied {
      margin: auto;
      padding: 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .face {
      flex: 1 1 50%;
      min-height: 96px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      overflow: hidden;
    }
    .face-canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .face .face-icon {
      --mdc-icon-size: min(40vw, 30vh, 220px);
      color: var(--primary-color);
      transition: transform 0.3s, opacity 0.3s;
    }
    .face[data-state="thinking"] .face-icon {
      animation: think 1.6s ease-in-out infinite;
    }
    .face[data-state="error"] .face-icon {
      color: var(--error-color, #db4437);
    }
    .face .face-status {
      min-height: 1.4em;
      color: var(--secondary-text-color);
    }
    @keyframes think {
      50% {
        transform: rotate(-6deg) scale(0.97);
        opacity: 0.75;
      }
    }
    .talk {
      flex: 1 1 50%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--divider-color);
      background: var(--card-background-color, var(--primary-background-color));
    }
    .messages {
      flex: 3 1 0;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hint {
      margin: auto;
      color: var(--secondary-text-color);
    }
    .msg {
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 16px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.4;
    }
    .msg.user {
      align-self: flex-end;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-bottom-right-radius: 4px;
    }
    .msg.assistant {
      align-self: flex-start;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      border-bottom-left-radius: 4px;
    }
    .msg.error {
      align-self: center;
      color: var(--error-color, #db4437);
      font-size: 0.9em;
    }
    .dots i {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin: 0 2px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.4;
      animation: dot 1.2s infinite;
    }
    .dots i:nth-child(2) {
      animation-delay: 0.2s;
    }
    .dots i:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes dot {
      30% {
        opacity: 1;
      }
    }
    .input {
      flex: 1 1 0;
      min-height: 64px;
      max-height: 160px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding: 8px;
      border-top: 1px solid var(--divider-color);
    }
    textarea {
      flex: 1;
      align-self: stretch;
      min-width: 0;
      resize: none;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 8px 12px;
      font: inherit;
      font-size: 16px; /* 16px or more: phones don't zoom in on focus */
      color: inherit;
      background: var(--primary-background-color);
    }
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    button.icon {
      flex: none;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background: none;
      color: inherit;
      cursor: pointer;
    }
    button.icon:hover:not([disabled]) {
      background: rgba(127, 127, 127, 0.15);
    }
    button.icon[disabled] {
      opacity: 0.35;
      cursor: default;
    }
    .input button.send:not([disabled]) {
      color: var(--primary-color);
    }
  `;customElements.get("kattio-panel")||customElements.define("kattio-panel",I);
