var B=globalThis,W=B.ShadowRoot&&(B.ShadyCSS===void 0||B.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Y=Symbol(),ue=new WeakMap,L=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==Y)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(W&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=ue.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&ue.set(t,e))}return e}toString(){return this.cssText}},fe=n=>new L(typeof n=="string"?n:n+"",void 0,Y),X=(n,...e)=>{let t=n.length===1?n[0]:e.reduce((s,i,o)=>s+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[o+1],n[0]);return new L(t,n,Y)},ge=(n,e)=>{if(W)n.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),i=B.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,n.appendChild(s)}},G=W?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return fe(t)})(n):n;var{is:Fe,defineProperty:De,getOwnPropertyDescriptor:Ke,getOwnPropertyNames:Be,getOwnPropertySymbols:We,getPrototypeOf:je}=Object,j=globalThis,me=j.trustedTypes,Ve=me?me.emptyScript:"",qe=j.reactiveElementPolyfillSupport,R=(n,e)=>n,Z={toAttribute(n,e){switch(e){case Boolean:n=n?Ve:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},_e=(n,e)=>!Fe(n,e),ve={attribute:!0,type:String,converter:Z,reflect:!1,useDefault:!1,hasChanged:_e};Symbol.metadata??=Symbol("metadata"),j.litPropertyMetadata??=new WeakMap;var b=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=ve){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&De(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){let{get:i,set:o}=Ke(this.prototype,e)??{get(){return this[t]},set(r){this[t]=r}};return{get:i,set(r){let c=i?.call(this);o?.call(this,r),this.requestUpdate(e,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ve}static _$Ei(){if(this.hasOwnProperty(R("elementProperties")))return;let e=je(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(R("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(R("properties"))){let t=this.properties,s=[...Be(t),...We(t)];for(let i of s)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let i of s)t.unshift(G(i))}else e!==void 0&&t.push(G(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ge(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){let s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){let o=(s.converter?.toAttribute!==void 0?s.converter:Z).toAttribute(t,s.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,t){let s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let o=s.getPropertyOptions(i),r=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:Z;this._$Em=i;let c=r.fromAttribute(t,o.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(e,t,s,i=!1,o){if(e!==void 0){let r=this.constructor;if(i===!1&&(o=this[e]),s??=r.getPropertyOptions(e),!((s.hasChanged??_e)(o,t)||s.useDefault&&s.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:o},r){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),o!==!0||r!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,o]of s){let{wrapped:r}=o,c=this[i];r!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,o,c)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};b.elementStyles=[],b.shadowRootOptions={mode:"open"},b[R("elementProperties")]=new Map,b[R("finalized")]=new Map,qe?.({ReactiveElement:b}),(j.reactiveElementVersions??=[]).push("2.1.2");var oe=globalThis,be=n=>n,V=oe.trustedTypes,xe=V?V.createPolicy("lit-html",{createHTML:n=>n}):void 0,Se="$lit$",y=`lit$${Math.random().toFixed(9).slice(2)}$`,Ee="?"+y,Je=`<${Ee}>`,A=document,N=()=>A.createComment(""),I=n=>n===null||typeof n!="object"&&typeof n!="function",re=Array.isArray,Ye=n=>re(n)||typeof n?.[Symbol.iterator]=="function",Q=`[ 	
\f\r]`,U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ye=/-->/g,ke=/>/g,$=RegExp(`>|${Q}(?:([^\\s"'>=/]+)(${Q}*=${Q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),$e=/'/g,we=/"/g,Ce=/^(?:script|style|textarea|title)$/i,ae=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),v=ae(1),ft=ae(2),gt=ae(3),S=Symbol.for("lit-noChange"),f=Symbol.for("lit-nothing"),Ae=new WeakMap,w=A.createTreeWalker(A,129);function Me(n,e){if(!re(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return xe!==void 0?xe.createHTML(e):e}var Xe=(n,e)=>{let t=n.length-1,s=[],i,o=e===2?"<svg>":e===3?"<math>":"",r=U;for(let c=0;c<t;c++){let a=n[c],p,h,l=-1,g=0;for(;g<a.length&&(r.lastIndex=g,h=r.exec(a),h!==null);)g=r.lastIndex,r===U?h[1]==="!--"?r=ye:h[1]!==void 0?r=ke:h[2]!==void 0?(Ce.test(h[2])&&(i=RegExp("</"+h[2],"g")),r=$):h[3]!==void 0&&(r=$):r===$?h[0]===">"?(r=i??U,l=-1):h[1]===void 0?l=-2:(l=r.lastIndex-h[2].length,p=h[1],r=h[3]===void 0?$:h[3]==='"'?we:$e):r===we||r===$e?r=$:r===ye||r===ke?r=U:(r=$,i=void 0);let u=r===$&&n[c+1].startsWith("/>")?" ":"";o+=r===U?a+Je:l>=0?(s.push(p),a.slice(0,l)+Se+a.slice(l)+y+u):a+y+(l===-2?c:u)}return[Me(n,o+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},z=class n{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let o=0,r=0,c=e.length-1,a=this.parts,[p,h]=Xe(e,t);if(this.el=n.createElement(p,s),w.currentNode=this.el.content,t===2||t===3){let l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(i=w.nextNode())!==null&&a.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let l of i.getAttributeNames())if(l.endsWith(Se)){let g=h[r++],u=i.getAttribute(l).split(y),m=/([.?@])?(.*)/.exec(g);a.push({type:1,index:o,name:m[2],strings:u,ctor:m[1]==="."?te:m[1]==="?"?se:m[1]==="@"?ie:T}),i.removeAttribute(l)}else l.startsWith(y)&&(a.push({type:6,index:o}),i.removeAttribute(l));if(Ce.test(i.tagName)){let l=i.textContent.split(y),g=l.length-1;if(g>0){i.textContent=V?V.emptyScript:"";for(let u=0;u<g;u++)i.append(l[u],N()),w.nextNode(),a.push({type:2,index:++o});i.append(l[g],N())}}}else if(i.nodeType===8)if(i.data===Ee)a.push({type:2,index:o});else{let l=-1;for(;(l=i.data.indexOf(y,l+1))!==-1;)a.push({type:7,index:o}),l+=y.length-1}o++}}static createElement(e,t){let s=A.createElement("template");return s.innerHTML=e,s}};function M(n,e,t=n,s){if(e===S)return e;let i=s!==void 0?t._$Co?.[s]:t._$Cl,o=I(e)?void 0:e._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(n),i._$AT(n,t,s)),s!==void 0?(t._$Co??=[])[s]=i:t._$Cl=i),i!==void 0&&(e=M(n,i._$AS(n,e.values),i,s)),e}var ee=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??A).importNode(t,!0);w.currentNode=i;let o=w.nextNode(),r=0,c=0,a=s[0];for(;a!==void 0;){if(r===a.index){let p;a.type===2?p=new F(o,o.nextSibling,this,e):a.type===1?p=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(p=new ne(o,this,e)),this._$AV.push(p),a=s[++c]}r!==a?.index&&(o=w.nextNode(),r++)}return w.currentNode=A,i}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},F=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=f,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=M(this,e,t),I(e)?e===f||e==null||e===""?(this._$AH!==f&&this._$AR(),this._$AH=f):e!==this._$AH&&e!==S&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Ye(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==f&&I(this._$AH)?this._$AA.nextSibling.data=e:this.T(A.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=z.createElement(Me(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{let o=new ee(i,this),r=o.u(this.options);o.p(t),this.T(r),this._$AH=o}}_$AC(e){let t=Ae.get(e.strings);return t===void 0&&Ae.set(e.strings,t=new z(e)),t}k(e){re(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,i=0;for(let o of e)i===t.length?t.push(s=new n(this.O(N()),this.O(N()),this,this.options)):s=t[i],s._$AI(o),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let s=be(e).nextSibling;be(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},T=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,o){this.type=1,this._$AH=f,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=f}_$AI(e,t=this,s,i){let o=this.strings,r=!1;if(o===void 0)e=M(this,e,t,0),r=!I(e)||e!==this._$AH&&e!==S,r&&(this._$AH=e);else{let c=e,a,p;for(e=o[0],a=0;a<o.length-1;a++)p=M(this,c[s+a],t,a),p===S&&(p=this._$AH[a]),r||=!I(p)||p!==this._$AH[a],p===f?e=f:e!==f&&(e+=(p??"")+o[a+1]),this._$AH[a]=p}r&&!i&&this.j(e)}j(e){e===f?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},te=class extends T{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===f?void 0:e}},se=class extends T{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==f)}},ie=class extends T{constructor(e,t,s,i,o){super(e,t,s,i,o),this.type=5}_$AI(e,t=this){if((e=M(this,e,t,0)??f)===S)return;let s=this._$AH,i=e===f&&s!==f||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,o=e!==f&&(s===f||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},ne=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){M(this,e)}};var Ge=oe.litHtmlPolyfillSupport;Ge?.(z,F),(oe.litHtmlVersions??=[]).push("3.3.3");var Te=(n,e,t)=>{let s=t?.renderBefore??e,i=s._$litPart$;if(i===void 0){let o=t?.renderBefore??null;s._$litPart$=i=new F(e.insertBefore(N(),o),o,void 0,t??{})}return i._$AI(n),i};var le=globalThis,k=class extends b{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Te(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return S}};k._$litElement$=!0,k.finalized=!0,le.litElementHydrateSupport?.({LitElement:k});var Ze=le.litElementPolyfillSupport;Ze?.({LitElement:k});(le.litElementVersions??=[]).push("4.2.2");async function Pe(n,e,t,s){let i=!1,o,r=new Promise(l=>o=l),c=!1,a=l=>{let g=l.data??{};switch(l.type){case"intent-progress":{let u=g.chat_log_delta;if(!u)break;let m=u.role==="assistant";typeof u.content=="string"&&u.content?(s.onText(u.content,m&&c),c=!0):m&&c&&s.onText("",!0);break}case"intent-end":{let u=g.intent_output??{},m=u.response?.speech?.plain?.speech??"";u.response?.response_type==="error"&&!c?s.onError(m||"The assistant could not answer."):s.onDone({speech:m,conversationId:u.conversation_id??null}),i=!0;break}case"error":i||s.onError(g.message||g.code||"The assistant could not answer."),i=!0,o();break;case"run-end":i||s.onError("The assistant did not answer."),i=!0,o();break}},p={type:"assist_pipeline/run",start_stage:"intent",end_stage:"intent",input:{text:e},conversation_id:t.conversationId??null};t.pipeline&&(p.pipeline=t.pipeline);let h;try{h=await n.connection.subscribeMessage(a,p)}catch(l){s.onError(l?.message||"Home Assistant refused the request.");return}await r;try{await h()}catch{}}var Oe=n=>{n.replaceChildren();let e=document.createElement("ha-icon");e.setAttribute("icon","mdi:cat"),e.className="face-icon";let t=document.createElement("div");t.className="face-status",n.append(e,t);let s={idle:"",listening:"Listening\u2026",thinking:"Thinking\u2026",speaking:"",error:"Something went wrong"};return{setState(i){n.dataset.state=i,t.textContent=s[i]},setLevel(){},setDark(){},destroy(){n.replaceChildren()}}};var P={BOOT:0,IDLE:1,LISTEN:4,THINK:5,SPEAK:6,ERROR:8},He={idle:P.IDLE,listening:P.LISTEN,thinking:P.THINK,speaking:P.SPEAK,error:P.ERROR},Qe=30,et=12,tt=2,st=1e3,it=6,D;function nt(){if(!D){let n=new URL(import.meta.url),e=new URL(`kattio-face.wasm${n.search}`,n);D=(async()=>{let t=await fetch(e);if(!t.ok)throw new Error(`${e.pathname}: HTTP ${t.status}`);return WebAssembly.compile(await t.arrayBuffer())})(),D.catch(()=>D=void 0)}return D}async function ot(){let n=await nt(),e,t={clock_time_get:(o,r,c)=>(new DataView(e.buffer).setBigUint64(c,BigInt(Math.round(performance.now()*1e6)),!0),0),fd_close:()=>8,fd_seek:()=>8,fd_write:()=>8},i=(await WebAssembly.instantiate(n,{wasi_snapshot_preview1:t})).exports;return e=i.memory,i._initialize(),i.face_init(Math.random()*4294967295>>>0||1),i}function Le(n){return e=>{e.replaceChildren();let t=document.createElement("canvas");t.className="face-canvas",t.setAttribute("role","img"),t.setAttribute("aria-label","Kattio"),e.append(t);let s=t.getContext("2d"),i,o,r=!1,c="idle",a=!1,p=-1,h=0,l=0,g=0,u=0,m=0,E=!0,ce=()=>{if(!i)return;let d=e.getBoundingClientRect(),_=Math.min(window.devicePixelRatio||1,tt),x=Math.max(1,Math.round(d.width*_)),C=Math.max(1,Math.round(d.height*_)),pe=Math.min(1,st/Math.max(x,C));x=Math.max(1,Math.round(x*pe)),C=Math.max(1,Math.round(C*pe)),!(x===t.width&&C===t.height&&l)&&(t.width=x,t.height=C,l=i.face_resize(x,C),m=0)},J=new ResizeObserver(ce);J.observe(e);let ze=()=>{if(!i||!s||!l)return;i.face_render(a?1:0);let d=new Uint8ClampedArray(i.memory.buffer,l,t.width*t.height*4);s.putImageData(new ImageData(d,t.width,t.height),0,0);let _=i.face_glow(a?1:0);_!==p&&(p=_,e.style.setProperty("--face-glow",`#${_.toString(16).padStart(6,"0")}`))},he=d=>{if(r||(g=requestAnimationFrame(he),!i))return;let _=u?Math.min((d-u)/1e3,.25):0;u=d,h=Math.max(0,h-it*_*h-.02*_),i.face_set_level(h),E=i.face_update(_)!==0||E;let x=1e3/(E||c==="speaking"?Qe:et);d-m>=x-2&&(m=d,ze(),E=!1)},de=()=>{i&&(i.face_poke(),E=!0)};return t.addEventListener("click",de),ot().then(d=>{r||(i=d,ce(),c!=="idle"&&i.face_set_mood(He[c]),g=requestAnimationFrame(he))},d=>{console.warn("Kattio face: could not load the face engine, showing a simpler one",d),!r&&(J.disconnect(),o=n(e),o.setState(c))}),{setState(d){if(o)return o.setState(d);let _=d!==c;c=d,!(!i||!_)&&(d==="idle"&&i.face_get_mood()===P.BOOT||(i.face_set_mood(He[d]),E=!0))},setLevel(d){if(o)return o.setLevel(d);h=Math.max(h,Math.min(1,Math.max(0,d)))},setDark(d){if(o)return o.setDark(d);d!==a&&(a=d,p=-1,m=0)},destroy(){r=!0,cancelAnimationFrame(g),J.disconnect(),t.removeEventListener("click",de),o?.destroy(),e.replaceChildren(),e.style.removeProperty("--face-glow")}}}}var O={theme:"auto",start:"text",keepAwake:!1},Re="kattio-panel:settings:v1";function Ue(){try{let n=JSON.parse(localStorage.getItem(Re)||"null");if(n&&typeof n=="object")return{theme:["auto","light","dark"].includes(n.theme)?n.theme:O.theme,start:["text","speak"].includes(n.start)?n.start:O.start,keepAwake:typeof n.keepAwake=="boolean"?n.keepAwake:O.keepAwake}}catch{}return{...O}}function Ne(n){try{return localStorage.setItem(Re,JSON.stringify(n)),!0}catch{return!1}}var H=class n{constructor(){this.lock=null;this.wanted=!1;this.onVisible=()=>{document.visibilityState==="visible"&&this.acquire()}}static get supported(){return"wakeLock"in navigator}set(e){e!==this.wanted&&(this.wanted=e,e?(document.addEventListener("visibilitychange",this.onVisible),this.acquire()):(document.removeEventListener("visibilitychange",this.onVisible),this.lock?.release().catch(()=>{}),this.lock=null))}async acquire(){if(!(!this.wanted||this.lock||!n.supported||document.visibilityState!=="visible"))try{let e=await navigator.wakeLock.request("screen");if(!this.wanted){e.release();return}this.lock=e,e.addEventListener?.("release",()=>{this.lock===e&&(this.lock=null)})}catch{}}};var Ie="kattio-panel:conversation:v1",rt=100,at=96,lt=720,ct=Le(Oe),q=1,K=class extends k{constructor(){super(...arguments);this.narrow=!1;this._messages=[];this._busy=!1;this._draft="";this._settings={...O};this._settingsOpen=!1;this._wide=!1;this._dark=!1;this._conversationId=null;this._stick=!0;this._smooth=!1;this._awake=new H;this._resize=new ResizeObserver(([t])=>{let{width:s,height:i}=t.contentRect;this._wide=s>=lt&&s>i*1.05});this._fitHeight=()=>{let t=window.visualViewport,s=t?t.offsetTop+t.height:window.innerHeight,i=this.getBoundingClientRect().top;this.style.height=`${Math.max(240,Math.round(s-Math.max(0,i)))}px`};this._onWindowKey=t=>{t.key==="Escape"&&this._settingsOpen&&(this._settingsOpen=!1)}}get _config(){return this.panel?.config??{}}get _title(){return this._config.title||"Kattio"}get _allowed(){let t=this._config.users??[];return t.length===0||!!this.hass?.user?.id&&t.includes(this.hass.user.id)}connectedCallback(){super.connectedCallback(),this._restore(),this._settings=Ue(),this._resize.observe(this),window.addEventListener("keydown",this._onWindowKey),window.addEventListener("resize",this._fitHeight),window.visualViewport?.addEventListener("resize",this._fitHeight),requestAnimationFrame(this._fitHeight)}disconnectedCallback(){super.disconnectedCallback(),this._resize.disconnect(),window.removeEventListener("keydown",this._onWindowKey),window.removeEventListener("resize",this._fitHeight),window.visualViewport?.removeEventListener("resize",this._fitHeight),this._awake.set(!1),this._face?.destroy(),this._face=void 0}willUpdate(t){if(t.has("hass")||t.has("_settings")){let s=this._settings.theme;this._dark=s==="dark"||s==="auto"&&!!this.hass?.themes?.darkMode}if(t.has("_settings")&&this._awake.set(this._settings.keepAwake),t.has("_messages")){let s=this.renderRoot?.querySelector(".messages");this._stick=!s||s.scrollHeight-s.scrollTop-s.clientHeight<at}}updated(t){t.has("_messages")&&this._stick&&this._scrollToEnd(this._smooth),this._smooth=!1;let s=this.renderRoot.querySelector(".face");s&&!this._face?(this._face=ct(s),this._face.setDark(this._dark),this._face.setState("idle")):!s&&this._face&&(this._face.destroy(),this._face=void 0),t.has("_dark")&&this._face?.setDark(this._dark)}render(){return this._allowed?v`
      ${this._toolbar(!0)}
      <div class="body">
        <div class="face" aria-hidden="true"></div>
        <div class="talk">
          <div class="messages" role="log" aria-live="polite">
            <div class="column">
              ${this._messages.length===0?v`<div class="empty">
                    <div class="empty-title">Hi, I'm ${this._title}.</div>
                    <div>Write to me below. You can pet me too.</div>
                  </div>`:this._messages.map(t=>this._message(t))}
            </div>
          </div>
          ${this._composer()}
        </div>
      </div>
      ${this._settingsOpen?this._settingsSheet():f}
    `:v`
        ${this._toolbar(!1)}
        <div class="denied">${this._title} is not set up for you. Ask whoever runs this Home Assistant.</div>
      `}_toolbar(t){return v`<div class="toolbar">
      <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
      <div class="title">${this._title}</div>
      ${t?v`<button
              class="icon"
              title="New conversation"
              aria-label="New conversation"
              ?disabled=${this._busy||this._messages.length===0}
              @click=${this._newConversation}
            >
              <ha-icon icon="mdi:message-plus-outline"></ha-icon>
            </button>
            <button class="icon" title="Settings" aria-label="Settings" @click=${()=>this._settingsOpen=!0}>
              <ha-icon icon="mdi:cog-outline"></ha-icon>
            </button>`:f}
    </div>`}_message(t){return v`<div class="msg ${t.role}">${t.text||(t.pending?v`<span class="dots" aria-label="Thinking"><i></i><i></i><i></i></span>`:f)}</div>`}_composer(){let t=!this._busy&&!!this._draft.trim();return v`<div class="composer">
      <div class="field">
        <button class="icon small" title="Attach (coming later)" aria-label="Attach" disabled>
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
        <input
          type="text"
          enterkeyhint="send"
          autocomplete="off"
          placeholder="Message ${this._title}"
          aria-label="Message ${this._title}"
          .value=${this._draft}
          @input=${s=>this._draft=s.target.value}
          @keydown=${this._onKey}
        />
        <button class="icon small send" title="Send" aria-label="Send" ?disabled=${!t} @click=${this._send}>
          <ha-icon icon="mdi:send"></ha-icon>
        </button>
      </div>
      <button class="icon speak" title="Speak (coming in the next version)" aria-label="Speak" disabled>
        <ha-icon icon="mdi:microphone"></ha-icon>
      </button>
    </div>`}_settingsSheet(){let t=this._settings,s=(i,o,r,c=!1)=>v`<button
        class="choice ${t[i]===o?"on":""}"
        role="radio"
        aria-checked=${t[i]===o?"true":"false"}
        ?disabled=${c}
        @click=${()=>this._set(i,o)}
      >
        ${r}
      </button>`;return v`<div class="scrim" @click=${()=>this._settingsOpen=!1}></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="sheet-head">
          <div id="settings-title" class="sheet-title">Settings on this device</div>
          <button class="icon" aria-label="Close" title="Close" @click=${()=>this._settingsOpen=!1}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="setting">
          <div class="label">Appearance</div>
          <div class="choices" role="radiogroup" aria-label="Appearance">
            ${s("theme","auto","Auto")} ${s("theme","light","Light")}
            ${s("theme","dark","Dark")}
          </div>
        </div>
        <div class="setting">
          <div class="label">Start in</div>
          <div class="choices" role="radiogroup" aria-label="Start in">
            ${s("start","text","Text")} ${s("start","speak","Speak")}
          </div>
          <div class="note">
            ${t.start==="speak"?v`Speak mode comes in the next version. Until then the page opens in text mode.`:v`Opens quietly: nothing is said out loud, and the microphone stays off.`}
          </div>
        </div>
        <label class="setting toggle">
          <div>
            <div class="label">Keep the screen on</div>
            <div class="note">
              ${H.supported?"While this page is open, for a tablet on the wall.":"This browser can't keep the screen on."}
            </div>
          </div>
          <input
            type="checkbox"
            role="switch"
            .checked=${t.keepAwake}
            ?disabled=${!H.supported}
            @change=${i=>this._set("keepAwake",i.target.checked)}
          />
        </label>
        <div class="sheet-foot">Kept on this device only, in this browser.</div>
      </div>`}_set(t,s){this._settings={...this._settings,[t]:s},Ne(this._settings)}_onKey(t){t.key==="Enter"&&!t.isComposing&&(t.preventDefault(),this._send())}async _send(){let t=this._draft.trim();if(!t||this._busy||!this.hass)return;this._draft="",this._busy=!0;let s={id:q++,role:"assistant",text:"",pending:!0};this._smooth=!0,this._stick=!0,this._messages=[...this._messages,{id:q++,role:"user",text:t},s],this._face?.setState("thinking");let i=()=>this._messages=[...this._messages];await Pe(this.hass,t,{pipeline:this._config.pipeline,conversationId:this._conversationId},{onText:(o,r)=>{s.text+=(r&&s.text?`

`:"")+o,this._face?.setState("speaking"),o&&this._face?.setLevel(.45+Math.random()*.4),i()},onDone:({speech:o,conversationId:r})=>{s.text.trim()||(s.text=o),s.pending=!1,this._conversationId=r??this._conversationId,this._face?.setState("idle"),i()},onError:o=>{s.pending=!1,s.text||(this._messages=this._messages.filter(r=>r!==s)),this._messages=[...this._messages,{id:q++,role:"error",text:o}],this._face?.setState("error")}}),this._busy=!1,this._save()}_newConversation(){this._messages=[],this._conversationId=null,this._face?.setState("idle"),this._save()}_scrollToEnd(t){let s=this.renderRoot.querySelector(".messages");s&&s.scrollTo({top:s.scrollHeight,behavior:t?"smooth":"auto"})}_save(){try{let t=this._messages.filter(s=>!s.pending).slice(-rt).map(({role:s,text:i})=>({role:s,text:i}));sessionStorage.setItem(Ie,JSON.stringify({conversationId:this._conversationId,messages:t}))}catch{}}_restore(){try{let t=JSON.parse(sessionStorage.getItem(Ie)||"null");t&&Array.isArray(t.messages)&&(this._messages=t.messages.map(s=>({id:q++,role:s.role,text:s.text})),this._conversationId=t.conversationId??null)}catch{}}};K.properties={hass:{attribute:!1},narrow:{type:Boolean},panel:{attribute:!1},_messages:{state:!0},_busy:{state:!0},_draft:{state:!0},_settings:{state:!0},_settingsOpen:{state:!0},_wide:{type:Boolean,reflect:!0,attribute:"wide"},_dark:{type:Boolean,reflect:!0,attribute:"dark"}},K.styles=X`
    :host {
      /* light */
      --k-bg: #f6f6f8;
      --k-surface: #ffffff;
      --k-bubble: #ececf1;
      --k-text: #1d1d22;
      --k-muted: #6b6b76;
      --k-line: rgba(0, 0, 0, 0.08);
      --k-accent: var(--primary-color, #03a9f4);
      --k-on-accent: #ffffff;
      --k-error: var(--error-color, #db4437);
      --k-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.06);

      position: relative;
      display: flex;
      flex-direction: column;
      height: 100vh; /* until the page has measured its space */
      overflow: hidden;
      background: var(--k-bg);
      color: var(--k-text);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      -webkit-font-smoothing: antialiased;
    }
    :host([dark]) {
      --k-bg: #111114;
      --k-surface: #1c1c21;
      --k-bubble: #24242a;
      --k-text: #ececf1;
      --k-muted: #9a9aa6;
      --k-line: rgba(255, 255, 255, 0.08);
      --k-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.25);
      color-scheme: dark;
    }

    /* ---- top bar ---- */
    .toolbar {
      flex: none;
      display: flex;
      align-items: center;
      gap: 2px;
      height: 56px;
      padding: 0 6px 0 2px;
    }
    .title {
      flex: 1;
      margin-left: 6px;
      font-size: 20px;
      font-weight: 500;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ---- layout ---- */
    .body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    :host([wide]) .body {
      flex-direction: row;
    }
    .face {
      position: relative;
      flex: 0 0 33%;
      min-height: 120px;
      /* the mood's colour as a soft glow behind the face; the page's own background around it */
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--face-glow, transparent) 50%, transparent),
        transparent
      );
      transition: background 0.4s;
    }
    :host([dark]) .face {
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--face-glow, transparent) 30%, transparent),
        transparent
      );
    }
    :host([wide]) .face {
      flex: 0 0 42%;
      min-height: 0;
    }
    .face-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .face .face-icon {
      --mdc-icon-size: min(40vw, 22vh, 200px);
      color: var(--k-accent);
    }
    .face:has(.face-icon) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .face .face-status {
      min-height: 1.3em;
      color: var(--k-muted);
    }
    .talk {
      flex: 1;
      min-height: 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    :host([wide]) .talk {
      padding-top: 8px;
    }

    /* ---- conversation ---- */
    .messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      /* the newest messages sit just above the input; older ones fade out under the face */
      mask-image: linear-gradient(to bottom, transparent 0, #000 18px);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18px);
    }
    .column {
      box-sizing: border-box;
      min-height: 100%;
      max-width: 760px;
      margin: 0 auto;
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 6px;
    }
    .empty {
      margin: auto;
      text-align: center;
      color: var(--k-muted);
      line-height: 1.5;
    }
    .empty-title {
      color: var(--k-text);
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .msg {
      max-width: min(82%, 600px);
      padding: 9px 14px;
      border-radius: 20px;
      font-size: 16px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      animation: appear 0.22s ease-out both;
    }
    .msg.user {
      align-self: flex-end;
      margin-top: 6px;
      background: var(--k-accent);
      color: var(--k-on-accent);
      border-bottom-right-radius: 6px;
    }
    .msg.assistant {
      align-self: flex-start;
      background: var(--k-bubble);
      border-bottom-left-radius: 6px;
    }
    .msg.error {
      align-self: center;
      padding: 4px 12px;
      font-size: 14px;
      color: var(--k-error);
      background: color-mix(in srgb, var(--k-error) 12%, transparent);
    }
    @keyframes appear {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    .dots {
      display: inline-flex;
      gap: 4px;
      padding: 6px 0;
    }
    .dots i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.3;
      animation: dot 1.2s infinite ease-in-out;
    }
    .dots i:nth-child(2) {
      animation-delay: 0.15s;
    }
    .dots i:nth-child(3) {
      animation-delay: 0.3s;
    }
    @keyframes dot {
      30% {
        opacity: 0.9;
        transform: translateY(-2px);
      }
    }

    /* ---- input ---- */
    .composer {
      flex: none;
      box-sizing: border-box;
      width: 100%;
      max-width: 792px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    }
    .field {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      height: 48px;
      padding: 0 4px;
      border-radius: 24px;
      background: var(--k-surface);
      box-shadow: var(--k-shadow);
      border: 1px solid var(--k-line);
      transition: border-color 0.15s;
    }
    .field:focus-within {
      border-color: color-mix(in srgb, var(--k-accent) 60%, transparent);
    }
    input[type="text"] {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 16px; /* 16px or more: phones don't zoom in on focus */
      padding: 0 4px;
    }
    input[type="text"]::placeholder {
      color: var(--k-muted);
    }

    /* ---- buttons ---- */
    button.icon {
      flex: none;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: none;
      color: inherit;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s, opacity 0.15s, transform 0.1s;
    }
    button.icon.small {
      width: 40px;
      height: 40px;
      color: var(--k-muted);
    }
    button.icon:hover:not([disabled]) {
      background: color-mix(in srgb, currentColor 10%, transparent);
    }
    button.icon:active:not([disabled]) {
      transform: scale(0.94);
    }
    button.icon[disabled] {
      opacity: 0.35;
      cursor: default;
    }
    button.icon.send:not([disabled]) {
      color: var(--k-accent);
    }
    button.icon.speak {
      width: 48px;
      height: 48px;
      background: var(--k-surface);
      box-shadow: var(--k-shadow);
      border: 1px solid var(--k-line);
    }
    button:focus-visible {
      outline: 2px solid var(--k-accent);
      outline-offset: 2px;
    }
    /* the input's pill shows the focus */
    input[type="text"]:focus-visible {
      outline: none;
    }

    /* ---- settings ---- */
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      animation: fade 0.18s ease-out;
      z-index: 1;
    }
    .sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      box-sizing: border-box;
      max-height: 85%;
      overflow-y: auto;
      padding: 8px 20px calc(20px + env(safe-area-inset-bottom, 0px));
      background: var(--k-surface);
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
      animation: rise 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    :host([wide]) .sheet {
      left: 50%;
      right: auto;
      bottom: auto;
      top: 50%;
      width: min(440px, 90%);
      transform: translate(-50%, -50%);
      border-radius: 20px;
      animation: pop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .sheet-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 -10px 4px 0;
    }
    .sheet-title {
      font-size: 18px;
      font-weight: 500;
    }
    .setting {
      display: block;
      padding: 14px 0;
      border-top: 1px solid var(--k-line);
    }
    .setting.toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
    }
    .label {
      font-weight: 500;
      margin-bottom: 8px;
    }
    .toggle .label {
      margin-bottom: 2px;
    }
    .note {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.4;
      color: var(--k-muted);
    }
    .toggle .note {
      margin-top: 0;
    }
    .choices {
      display: flex;
      padding: 3px;
      gap: 3px;
      border-radius: 12px;
      background: var(--k-bubble);
    }
    .choice {
      flex: 1;
      min-height: 38px;
      padding: 0 8px;
      border: none;
      border-radius: 9px;
      background: none;
      color: var(--k-muted);
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .choice.on {
      background: var(--k-surface);
      color: var(--k-text);
      font-weight: 500;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    input[type="checkbox"][role="switch"] {
      appearance: none;
      -webkit-appearance: none;
      flex: none;
      position: relative;
      width: 44px;
      height: 26px;
      margin: 0;
      border-radius: 13px;
      background: color-mix(in srgb, var(--k-muted) 45%, transparent);
      cursor: pointer;
      transition: background 0.18s;
    }
    input[type="checkbox"][role="switch"]::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.18s;
    }
    input[type="checkbox"][role="switch"]:checked {
      background: var(--k-accent);
    }
    input[type="checkbox"][role="switch"]:checked::after {
      transform: translateX(18px);
    }
    input[type="checkbox"][role="switch"]:disabled {
      opacity: 0.4;
    }
    .sheet-foot {
      padding-top: 12px;
      border-top: 1px solid var(--k-line);
      font-size: 13px;
      color: var(--k-muted);
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: translate(-50%, -46%);
      }
    }

    .denied {
      margin: auto;
      padding: 16px;
      text-align: center;
      color: var(--k-muted);
    }
    @media (prefers-reduced-motion: reduce) {
      .msg,
      .sheet,
      .scrim {
        animation: none;
      }
    }
  `;customElements.get("kattio-panel")||customElements.define("kattio-panel",K);
