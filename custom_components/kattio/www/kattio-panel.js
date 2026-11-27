var se=globalThis,ie=se.ShadowRoot&&(se.ShadyCSS===void 0||se.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,ae=Symbol(),Me=new WeakMap,q=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==ae)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(ie&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=Me.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&Me.set(e,t))}return t}toString(){return this.cssText}},Pe=n=>new q(typeof n=="string"?n:n+"",void 0,ae),le=(n,...t)=>{let e=n.length===1?n[0]:t.reduce((s,i,o)=>s+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[o+1],n[0]);return new q(e,n,ae)},Oe=(n,t)=>{if(ie)n.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),i=se.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,n.appendChild(s)}},ce=ie?n=>n:n=>n instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return Pe(e)})(n):n;var{is:pt,defineProperty:ut,getOwnPropertyDescriptor:ft,getOwnPropertyNames:gt,getOwnPropertySymbols:mt,getPrototypeOf:vt}=Object,ne=globalThis,Le=ne.trustedTypes,_t=Le?Le.emptyScript:"",bt=ne.reactiveElementPolyfillSupport,G=(n,t)=>n,de={toAttribute(n,t){switch(t){case Boolean:n=n?_t:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,t){let e=n;switch(t){case Boolean:e=n!==null;break;case Number:e=n===null?null:Number(n);break;case Object:case Array:try{e=JSON.parse(n)}catch{e=null}}return e}},Re=(n,t)=>!pt(n,t),He={attribute:!0,type:String,converter:de,reflect:!1,useDefault:!1,hasChanged:Re};Symbol.metadata??=Symbol("metadata"),ne.litPropertyMetadata??=new WeakMap;var E=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=He){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&ut(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){let{get:i,set:o}=ft(this.prototype,t)??{get(){return this[e]},set(r){this[e]=r}};return{get:i,set(r){let c=i?.call(this);o?.call(this,r),this.requestUpdate(t,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??He}static _$Ei(){if(this.hasOwnProperty(G("elementProperties")))return;let t=vt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(G("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(G("properties"))){let e=this.properties,s=[...gt(e),...mt(e)];for(let i of s)this.createProperty(i,e[i])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let i of s)e.unshift(ce(i))}else t!==void 0&&e.push(ce(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Oe(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){let o=(s.converter?.toAttribute!==void 0?s.converter:de).toAttribute(e,s.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,e){let s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){let o=s.getPropertyOptions(i),r=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:de;this._$Em=i;let c=r.fromAttribute(e,o.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(t,e,s,i=!1,o){if(t!==void 0){let r=this.constructor;if(i===!1&&(o=this[t]),s??=r.getPropertyOptions(t),!((s.hasChanged??Re)(o,e)||s.useDefault&&s.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:o},r){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),o!==!0||r!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,o]of s){let{wrapped:r}=o,c=this[i];r!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,o,c)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};E.elementStyles=[],E.shadowRootOptions={mode:"open"},E[G("elementProperties")]=new Map,E[G("finalized")]=new Map,bt?.({ReactiveElement:E}),(ne.reactiveElementVersions??=[]).push("2.1.2");var ve=globalThis,Ie=n=>n,oe=ve.trustedTypes,Ue=oe?oe.createPolicy("lit-html",{createHTML:n=>n}):void 0,Be="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,je="?"+T,yt=`<${je}>`,H=document,Y=()=>H.createComment(""),J=n=>n===null||typeof n!="object"&&typeof n!="function",_e=Array.isArray,xt=n=>_e(n)||typeof n?.[Symbol.iterator]=="function",he=`[ 	
\f\r]`,X=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,De=/-->/g,ze=/>/g,O=RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Ne=/'/g,Fe=/"/g,Ke=/^(?:script|style|textarea|title)$/i,be=n=>(t,...e)=>({_$litType$:n,strings:t,values:e}),m=be(1),jt=be(2),Kt=be(3),R=Symbol.for("lit-noChange"),g=Symbol.for("lit-nothing"),We=new WeakMap,L=H.createTreeWalker(H,129);function Ve(n,t){if(!_e(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ue!==void 0?Ue.createHTML(t):t}var wt=(n,t)=>{let e=n.length-1,s=[],i,o=t===2?"<svg>":t===3?"<math>":"",r=X;for(let c=0;c<e;c++){let l=n[c],p,d,a=-1,u=0;for(;u<l.length&&(r.lastIndex=u,d=r.exec(l),d!==null);)u=r.lastIndex,r===X?d[1]==="!--"?r=De:d[1]!==void 0?r=ze:d[2]!==void 0?(Ke.test(d[2])&&(i=RegExp("</"+d[2],"g")),r=O):d[3]!==void 0&&(r=O):r===O?d[0]===">"?(r=i??X,a=-1):d[1]===void 0?a=-2:(a=r.lastIndex-d[2].length,p=d[1],r=d[3]===void 0?O:d[3]==='"'?Fe:Ne):r===Fe||r===Ne?r=O:r===De||r===ze?r=X:(r=O,i=void 0);let v=r===O&&n[c+1].startsWith("/>")?" ":"";o+=r===X?l+yt:a>=0?(s.push(p),l.slice(0,a)+Be+l.slice(a)+T+v):l+T+(a===-2?c:v)}return[Ve(n,o+(n[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},Z=class n{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let o=0,r=0,c=t.length-1,l=this.parts,[p,d]=wt(t,e);if(this.el=n.createElement(p,s),L.currentNode=this.el.content,e===2||e===3){let a=this.el.content.firstChild;a.replaceWith(...a.childNodes)}for(;(i=L.nextNode())!==null&&l.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let a of i.getAttributeNames())if(a.endsWith(Be)){let u=d[r++],v=i.getAttribute(a).split(T),w=/([.?@])?(.*)/.exec(u);l.push({type:1,index:o,name:w[2],strings:v,ctor:w[1]==="."?ue:w[1]==="?"?fe:w[1]==="@"?ge:N}),i.removeAttribute(a)}else a.startsWith(T)&&(l.push({type:6,index:o}),i.removeAttribute(a));if(Ke.test(i.tagName)){let a=i.textContent.split(T),u=a.length-1;if(u>0){i.textContent=oe?oe.emptyScript:"";for(let v=0;v<u;v++)i.append(a[v],Y()),L.nextNode(),l.push({type:2,index:++o});i.append(a[u],Y())}}}else if(i.nodeType===8)if(i.data===je)l.push({type:2,index:o});else{let a=-1;for(;(a=i.data.indexOf(T,a+1))!==-1;)l.push({type:7,index:o}),a+=T.length-1}o++}}static createElement(t,e){let s=H.createElement("template");return s.innerHTML=t,s}};function z(n,t,e=n,s){if(t===R)return t;let i=s!==void 0?e._$Co?.[s]:e._$Cl,o=J(t)?void 0:t._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(n),i._$AT(n,e,s)),s!==void 0?(e._$Co??=[])[s]=i:e._$Cl=i),i!==void 0&&(t=z(n,i._$AS(n,t.values),i,s)),t}var pe=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??H).importNode(e,!0);L.currentNode=i;let o=L.nextNode(),r=0,c=0,l=s[0];for(;l!==void 0;){if(r===l.index){let p;l.type===2?p=new Q(o,o.nextSibling,this,t):l.type===1?p=new l.ctor(o,l.name,l.strings,this,t):l.type===6&&(p=new me(o,this,t)),this._$AV.push(p),l=s[++c]}r!==l?.index&&(o=L.nextNode(),r++)}return L.currentNode=H,i}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},Q=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=g,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=z(this,t,e),J(t)?t===g||t==null||t===""?(this._$AH!==g&&this._$AR(),this._$AH=g):t!==this._$AH&&t!==R&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):xt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==g&&J(this._$AH)?this._$AA.nextSibling.data=t:this.T(H.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=Z.createElement(Ve(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{let o=new pe(i,this),r=o.u(this.options);o.p(e),this.T(r),this._$AH=o}}_$AC(t){let e=We.get(t.strings);return e===void 0&&We.set(t.strings,e=new Z(t)),e}k(t){_e(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,i=0;for(let o of t)i===e.length?e.push(s=new n(this.O(Y()),this.O(Y()),this,this.options)):s=e[i],s._$AI(o),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=Ie(t).nextSibling;Ie(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},N=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,o){this.type=1,this._$AH=g,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=g}_$AI(t,e=this,s,i){let o=this.strings,r=!1;if(o===void 0)t=z(this,t,e,0),r=!J(t)||t!==this._$AH&&t!==R,r&&(this._$AH=t);else{let c=t,l,p;for(t=o[0],l=0;l<o.length-1;l++)p=z(this,c[s+l],e,l),p===R&&(p=this._$AH[l]),r||=!J(p)||p!==this._$AH[l],p===g?t=g:t!==g&&(t+=(p??"")+o[l+1]),this._$AH[l]=p}r&&!i&&this.j(t)}j(t){t===g?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},ue=class extends N{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===g?void 0:t}},fe=class extends N{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==g)}},ge=class extends N{constructor(t,e,s,i,o){super(t,e,s,i,o),this.type=5}_$AI(t,e=this){if((t=z(this,t,e,0)??g)===R)return;let s=this._$AH,i=t===g&&s!==g||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,o=t!==g&&(s===g||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},me=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){z(this,t)}};var kt=ve.litHtmlPolyfillSupport;kt?.(Z,Q),(ve.litHtmlVersions??=[]).push("3.3.3");var qe=(n,t,e)=>{let s=e?.renderBefore??t,i=s._$litPart$;if(i===void 0){let o=e?.renderBefore??null;s._$litPart$=i=new Q(t.insertBefore(Y(),o),o,void 0,e??{})}return i._$AI(n),i};var ye=globalThis,M=class extends E{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=qe(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return R}};M._$litElement$=!0,M.finalized=!0,ye.litElementHydrateSupport?.({LitElement:M});var $t=ye.litElementPolyfillSupport;$t?.({LitElement:M});(ye.litElementVersions??=[]).push("4.2.2");function xe(n){let t=!1,e=!1;return s=>{let i=s.data??{};switch(s.type){case"intent-progress":{let o=i.chat_log_delta;if(!o)break;let r=o.role==="assistant";typeof o.content=="string"&&o.content?(n.onText(o.content,r&&e),e=!0):r&&e&&n.onText("",!0);break}case"intent-end":{if(t)break;let o=i.intent_output??{},r=o.response?.speech?.plain?.speech??"";o.response?.response_type==="error"&&!e?n.onError(r||"The assistant could not answer."):n.onDone({speech:r,conversationId:o.conversation_id??null}),t=!0;break}case"error":t||n.onError(we(i)),t=!0;break;case"run-end":t||n.onError("The assistant did not answer."),t=!0;break}return t}}function we(n){switch(n.code){case"stt-no-text-recognized":return"I didn't catch that.";case"stt-stream-failed":case"stt-provider-unsupported-metadata":return"I couldn't hear you: speech recognition isn't working.";case"tts-failed":return"I couldn't say the answer out loud.";case"timeout":return"That took too long."}return n.message||n.code||"The assistant could not answer."}function ke(n,t){let e={type:"assist_pipeline/run",...t,conversation_id:n.conversationId??null};return n.pipeline&&(e.pipeline=n.pipeline),e}async function Ge(n,t,e,s){let i,o=new Promise(d=>i=d),r=xe(s),c=d=>{r(d),(d.type==="error"||d.type==="run-end")&&i()},l=ke(e,{start_stage:"intent",end_stage:"intent",input:{text:t}}),p;try{p=await n.connection.subscribeMessage(c,l)}catch(d){s.onError(d?.message||"Home Assistant refused the request.");return}await o;try{await p()}catch{}}var Xe=n=>{n.replaceChildren();let t=document.createElement("ha-icon");t.setAttribute("icon","mdi:cat"),t.className="face-icon";let e=document.createElement("div");e.className="face-status",n.append(t,e);let s={idle:"",listening:"Listening\u2026",thinking:"Thinking\u2026",speaking:"",error:"Something went wrong"};return{setState(i){n.dataset.state=i,e.textContent=s[i]},setLevel(){},setDark(){},destroy(){n.replaceChildren()}}};var F={BOOT:0,IDLE:1,LISTEN:4,THINK:5,SPEAK:6,ERROR:8},Ye={idle:F.IDLE,listening:F.LISTEN,thinking:F.THINK,speaking:F.SPEAK,error:F.ERROR},St=30,At=12,Et=2,Ct=1e3,Tt=6,ee;function Mt(){if(!ee){let n=new URL(import.meta.url),t=new URL(`kattio-face.wasm${n.search}`,n);ee=(async()=>{let e=await fetch(t);if(!e.ok)throw new Error(`${t.pathname}: HTTP ${e.status}`);return WebAssembly.compile(await e.arrayBuffer())})(),ee.catch(()=>ee=void 0)}return ee}async function Pt(){let n=await Mt(),t,e={clock_time_get:(o,r,c)=>(new DataView(t.buffer).setBigUint64(c,BigInt(Math.round(performance.now()*1e6)),!0),0),fd_close:()=>8,fd_seek:()=>8,fd_write:()=>8},i=(await WebAssembly.instantiate(n,{wasi_snapshot_preview1:e})).exports;return t=i.memory,i._initialize(),i.face_init(Math.random()*4294967295>>>0||1),i}function Je(n){return t=>{t.replaceChildren();let e=document.createElement("canvas");e.className="face-canvas",e.setAttribute("role","img"),e.setAttribute("aria-label","Kattio"),t.append(e);let s=e.getContext("2d"),i,o,r=!1,c="idle",l=!1,p=-1,d=0,a=0,u=0,v=0,w=0,A=!0,B=()=>{if(!i)return;let f=t.getBoundingClientRect(),x=Math.min(window.devicePixelRatio||1,Et),$=Math.max(1,Math.round(f.width*x)),k=Math.max(1,Math.round(f.height*x)),V=Math.min(1,Ct/Math.max($,k));$=Math.max(1,Math.round($*V)),k=Math.max(1,Math.round(k*V)),!($===e.width&&k===e.height&&a)&&(e.width=$,e.height=k,a=i.face_resize($,k),w=0)},I=new ResizeObserver(B);I.observe(t);let j=()=>{if(!i||!s||!a)return;i.face_render(l?1:0);let f=new Uint8ClampedArray(i.memory.buffer,a,e.width*e.height*4);s.putImageData(new ImageData(f,e.width,e.height),0,0);let x=i.face_glow(l?1:0);x!==p&&(p=x,t.style.setProperty("--face-glow",`#${x.toString(16).padStart(6,"0")}`))},U=f=>{if(r||(u=requestAnimationFrame(U),!i))return;let x=v?Math.min((f-v)/1e3,.25):0;v=f,d=Math.max(0,d-Tt*x*d-.02*x),i.face_set_level(d),A=i.face_update(x)!==0||A;let $=1e3/(A||c==="speaking"?St:At);f-w>=$-2&&(w=f,j(),A=!1)},K=()=>{i&&(i.face_poke(),A=!0)};return e.addEventListener("click",K),Pt().then(f=>{r||(i=f,B(),c!=="idle"&&i.face_set_mood(Ye[c]),u=requestAnimationFrame(U))},f=>{console.warn("Kattio face: could not load the face engine, showing a simpler one",f),!r&&(I.disconnect(),o=n(t),o.setState(c))}),{setState(f){if(o)return o.setState(f);let x=f!==c;c=f,!(!i||!x)&&(f==="idle"&&i.face_get_mood()===F.BOOT||(i.face_set_mood(Ye[f]),A=!0))},setLevel(f){if(o)return o.setLevel(f);d=Math.max(d,Math.min(1,Math.max(0,f)))},setDark(f){if(o)return o.setDark(f);f!==l&&(l=f,p=-1,w=0)},destroy(){r=!0,cancelAnimationFrame(u),I.disconnect(),e.removeEventListener("click",K),o?.destroy(),t.replaceChildren(),t.style.removeProperty("--face-glow")}}}}var S={theme:"auto",start:"text",keepAwake:!1,greeting:"",history:!0,resume:!1,resumeAnyDevice:!1},$e=300,Ze="kattio-panel:settings:v1",re=(n,t)=>typeof n=="boolean"?n:t;function Qe(){try{let n=JSON.parse(localStorage.getItem(Ze)||"null");if(n&&typeof n=="object")return{theme:["auto","light","dark"].includes(n.theme)?n.theme:S.theme,start:["text","speak"].includes(n.start)?n.start:S.start,keepAwake:re(n.keepAwake,S.keepAwake),greeting:typeof n.greeting=="string"?n.greeting.slice(0,$e):S.greeting,history:re(n.history,S.history),resume:re(n.resume,S.resume),resumeAnyDevice:re(n.resumeAnyDevice,S.resumeAnyDevice)}}catch{}return{...S}}function et(n){try{return localStorage.setItem(Ze,JSON.stringify(n)),!0}catch{return!1}}var W=class n{constructor(){this.lock=null;this.wanted=!1;this.onVisible=()=>{document.visibilityState==="visible"&&this.acquire()}}static get supported(){return"wakeLock"in navigator}set(t){t!==this.wanted&&(this.wanted=t,t?(document.addEventListener("visibilitychange",this.onVisible),this.acquire()):(document.removeEventListener("visibilitychange",this.onVisible),this.lock?.release().catch(()=>{}),this.lock=null))}async acquire(){if(!(!this.wanted||this.lock||!n.supported||document.visibilityState!=="visible"))try{let t=await navigator.wakeLock.request("screen");if(!this.wanted){t.release();return}this.lock=t,t.addEventListener?.("release",()=>{this.lock===t&&(this.lock=null)})}catch{}}},tt="kattio-panel:last:v1";function st(n){try{let t=JSON.parse(localStorage.getItem(tt)||"null");if(t&&t.userId===n&&Array.isArray(t.messages))return{conversationId:t.conversationId??null,messages:t.messages}}catch{}return null}function it(n,t){try{localStorage.setItem(tt,JSON.stringify({userId:n,...t}))}catch{}}async function nt(n,t=!1){return(await n.callWS({type:"kattio/history/list",everyone:t})).conversations}function Se(n,t){return n.callWS({type:"kattio/history/get",conversation_id:t??null})}function ot(n,t,e){return n.callWS({type:"kattio/history/save",conversation_id:t,messages:e})}function rt(n,t){return n.callWS({type:"kattio/history/delete",conversation_id:t})}function at(n,t=Date.now()){let e=new Date(n*1e3),s=(t-e.getTime())/1e3;if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)} min ago`;let i=new Date(t);i.setHours(0,0,0,0);let o=864e5;return e.getTime()>=i.getTime()?e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):e.getTime()>=i.getTime()-o?"yesterday":e.getTime()>=i.getTime()-6*o?e.toLocaleDateString([],{weekday:"short"}):e.toLocaleDateString([],{day:"numeric",month:"short"})}var Ot=2e4,Lt=`
registerProcessor("kattio-mic", class extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
});`;function Ht(){let e=new DataView(new ArrayBuffer(1644)),s=(o,r)=>[...r].forEach((c,l)=>e.setUint8(o+l,c.charCodeAt(0)));s(0,"RIFF"),e.setUint32(4,36+800*2,!0),s(8,"WAVEfmt "),e.setUint32(16,16,!0),e.setUint16(20,1,!0),e.setUint16(22,1,!0),e.setUint32(24,8e3,!0),e.setUint32(28,8e3*2,!0),e.setUint16(32,2,!0),e.setUint16(34,16,!0),s(36,"data"),e.setUint32(40,800*2,!0);let i="";return new Uint8Array(e.buffer).forEach(o=>i+=String.fromCharCode(o)),`data:audio/wav;base64,${btoa(i)}`}function lt(){return!!navigator.mediaDevices?.getUserMedia&&typeof AudioContext<"u"&&window.isSecureContext}function ct(n,t,e){let s=new AudioContext;s.resume();let i=new Audio;i.src=Ht(),i.play().catch(()=>{});let o,r,c,l,p=[],d=!1,a=!1,u=!1,v=!1,w,A=!1,B=!1,I=!1,j,U=0,K=0,f,x=new Promise(_=>f=_),$=xe(e),k=_=>{let h=n.connection.socket;if(l===void 0||!h||h.readyState!==WebSocket.OPEN)return;let b=_?new Uint8Array(_):new Uint8Array(0),y=new Uint8Array(1+b.byteLength);y[0]=l,y.set(b,1),h.send(y)},V=_=>{if(a)return;let h=new Int16Array(_.length);for(let b=0;b<_.length;b++){let y=Math.max(-1,Math.min(1,_[b]));h[b]=y<0?y*32768:y*32767}l===void 0?p.push(h.buffer):k(h.buffer)},D=()=>{a||(a=!0,d=!1,clearTimeout(K),c?.disconnect(),r?.disconnect(),o?.getTracks().forEach(_=>_.stop()),k(null))},P=()=>{u||(u=!0,D(),cancelAnimationFrame(U),i.pause(),i.removeAttribute("src"),v&&e.onSpeaking(!1),v=!1,s.close().catch(()=>{}),j?.().catch(()=>{}),f())},Ae=_=>{if(v||u)return;v=!0;let h;try{let y=s.createMediaElementSource(i);h=s.createAnalyser(),h.fftSize=512,y.connect(h),h.connect(s.destination)}catch{}i.src=new URL(_,location.href).href;let b=()=>{v&&(v=!1,e.onSpeaking(!1),B&&P())};if(i.onended=b,i.onerror=b,i.play().then(()=>{v&&e.onSpeaking(!0)},()=>{console.warn("Kattio: the browser did not play the answer"),b()}),h){let y=new Uint8Array(h.fftSize),Ee=()=>{if(!v)return;h.getByteTimeDomainData(y);let Ce=0;for(let Te of y)Ce+=(Te-128)*(Te-128);e.onLevel(Math.min(1,Math.sqrt(Ce/y.length)/128*4)),U=requestAnimationFrame(Ee)};U=requestAnimationFrame(Ee)}},ht=_=>{if(u)return;let h=_.data??{};switch(_.type){case"run-start":l=h.runner_data?.stt_binary_handler_id,w=h.tts_output?.url,A=!!h.tts_output?.stream_response,a?k(null):p.forEach(k),p=[];break;case"stt-vad-end":D();break;case"stt-end":D(),I=!0,e.onHeard((h.stt_output?.text??"").trim());break;case"intent-progress":h.tts_start_streaming&&A&&w&&Ae(w);break;case"tts-end":h.tts_output?.url&&Ae(h.tts_output.url);break;case"error":D(),h.code==="stt-no-text-recognized"&&!I&&e.onHeard("");break}(_.type!=="error"||h.code!=="stt-no-text-recognized")&&$(_),(_.type==="run-end"||_.type==="error")&&(B=!0,v||P())};return(async()=>{try{o=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0,channelCount:1}})}catch(h){let b=h?.name==="NotAllowedError"||h?.name==="SecurityError";e.onError(b?"The microphone isn't allowed here. Allow it for Home Assistant (in the browser or the app's settings).":"No microphone was found."),P();return}if(u)return P();r=s.createMediaStreamSource(o);try{let h=URL.createObjectURL(new Blob([Lt],{type:"application/javascript"}));await s.audioWorklet.addModule(h),URL.revokeObjectURL(h);let b=new AudioWorkletNode(s,"kattio-mic");b.port.onmessage=y=>V(y.data),c=b}catch{let h=s.createScriptProcessor(2048,1,1);h.onaudioprocess=b=>V(b.inputBuffer.getChannelData(0)),c=h}if(u)return P();r.connect(c),c.connect(s.destination),d=!0,K=window.setTimeout(D,Ot),e.onListening();let _=ke(t,{start_stage:"stt",end_stage:"tts",input:{sample_rate:s.sampleRate}});try{j=await n.connection.subscribeMessage(ht,_),u&&j().catch(()=>{})}catch(h){e.onError(h?.message||we({})),P()}})(),{stopListening(){d&&D()},cancel(){P()},done:x}}var dt="kattio-panel:conversation:v1",Rt=100,It=24,Ut=720,Dt=Je(Xe),C=1,te=class extends M{constructor(){super(...arguments);this.narrow=!1;this._messages=[];this._busy=!1;this._draft="";this._settings={...S};this._settingsOpen=!1;this._wide=!1;this._dark=!1;this._conversationId=null;this._follow=!0;this._autoScroll=!1;this._behind=!1;this._smooth=!1;this._touching=!1;this._voicePhase="off";this._started=!1;this._historyOpen=!1;this._history=null;this._historyEveryone=!1;this._historyError="";this._confirmDelete=null;this._readOnly=null;this._logResize=new ResizeObserver(()=>{this._follow&&this._scrollToEnd(!1)});this._awake=new W;this._resize=new ResizeObserver(([e])=>{let{width:s,height:i}=e.contentRect;this._wide=s>=Ut&&s>i*1.05});this._openHistory=()=>{this._historyOpen=!0,this._confirmDelete=null,this._loadHistory(this._historyEveryone)};this._leaveReadOnly=()=>{let e=this._ownAside;this._readOnly=null,this._ownAside=void 0,this._messages=e?.messages??[],this._conversationId=e?.conversationId??null,this._follow=!0,this._behind=!1};this._fitHeight=()=>{let e=window.visualViewport,s=e?e.offsetTop+e.height:window.innerHeight,i=this.getBoundingClientRect().top;this.style.height=`${Math.max(240,Math.round(s-Math.max(0,i)))}px`};this._onWindowKey=e=>{e.key==="Escape"&&(this._settingsOpen?this._settingsOpen=!1:this._historyOpen&&(this._historyOpen=!1))};this._onSpeak=()=>{this._voicePhase==="off"?this._askByVoice():this._voicePhase==="listening"?this._voice?.stopListening():this._voice?.cancel()};this._onScroll=()=>{let e=this._log;e&&(e.scrollHeight-e.scrollTop-e.clientHeight<It?(this._follow=!0,this._autoScroll=!1,this._behind=!1):this._autoScroll||(this._follow=!1))};this._onReaderScroll=()=>{this._autoScroll=!1};this._onWheel=e=>{e.deltaY<0?this._readBack():this._autoScroll=!1};this._onTouch=()=>{this._touching=!0,this._autoScroll=!1};this._onTouchEnd=()=>{this._touching=!1,this._onScroll(),this._follow&&this._scrollToEnd(!1)};this._onLogKey=e=>{["ArrowUp","PageUp","Home"].includes(e.key)?this._readBack():this._autoScroll=!1};this._jump=()=>{this._follow=!0,this._behind=!1,this._scrollToEnd(!0)}}get _config(){return this.panel?.config??{}}get _title(){return this._config.title||"Kattio"}get _allowed(){let e=this._config.users??[];return e.length===0||!!this.hass?.user?.id&&e.includes(this.hass.user.id)}connectedCallback(){super.connectedCallback(),this._settings=Qe(),this._resize.observe(this),window.addEventListener("keydown",this._onWindowKey),window.addEventListener("resize",this._fitHeight),window.visualViewport?.addEventListener("resize",this._fitHeight),requestAnimationFrame(this._fitHeight)}disconnectedCallback(){super.disconnectedCallback(),this._resize.disconnect(),this._logResize.disconnect(),this._observedLog=void 0,this._voice?.cancel(),window.removeEventListener("keydown",this._onWindowKey),window.removeEventListener("resize",this._fitHeight),window.visualViewport?.removeEventListener("resize",this._fitHeight),this._awake.set(!1),this._face?.destroy(),this._face=void 0}willUpdate(e){if(!this._started&&this.hass?.user?.id&&(this._started=!0,this._start()),e.has("hass")||e.has("_settings")){let s=this._settings.theme;this._dark=s==="dark"||s==="auto"&&!!this.hass?.themes?.darkMode}e.has("_settings")&&this._awake.set(this._settings.keepAwake)}updated(e){let s=this._log;s!==this._observedLog&&(this._logResize.disconnect(),s&&this._logResize.observe(s),this._observedLog=s??void 0),e.has("_messages")&&(this._follow&&!this._touching?this._scrollToEnd(this._smooth):this._messages.length&&(this._behind=!0)),this._smooth=!1;let i=this.renderRoot.querySelector(".face");i&&!this._face?(this._face=Dt(i),this._face.setDark(this._dark),this._face.setState("idle")):!i&&this._face&&(this._face.destroy(),this._face=void 0),e.has("_dark")&&this._face?.setDark(this._dark)}render(){return this._allowed?m`
      ${this._toolbar(!0)}
      <div class="body">
        <div class="face" aria-hidden="true"></div>
        <div class="talk">
          <div class="log">
            <div
              class="messages"
              role="log"
              aria-live="polite"
              @scroll=${this._onScroll}
              @wheel=${this._onWheel}
              @touchstart=${this._onTouch}
              @touchend=${this._onTouchEnd}
              @touchcancel=${this._onTouchEnd}
              @pointerdown=${this._onReaderScroll}
              @keydown=${this._onLogKey}
            >
              <div class="column">
                ${this._messages.length===0?this._empty():this._messages.map(e=>this._message(e))}
              </div>
            </div>
            ${this._behind?m`<button class="jump" title="Go to the newest" aria-label="Go to the newest" @click=${this._jump}>
                  <ha-icon icon="mdi:arrow-down"></ha-icon>
                </button>`:g}
          </div>
          ${this._readOnly?this._readOnlyBar():this._composer()}
        </div>
      </div>
      ${this._settingsOpen?this._settingsSheet():g} ${this._historyOpen?this._historySheet():g}
    `:m`
        ${this._toolbar(!1)}
        <div class="denied">${this._title} is not set up for you. Ask whoever runs this Home Assistant.</div>
      `}_toolbar(e){return m`<div class="toolbar">
      <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
      <div class="title">${this._title}</div>
      ${e&&this._settings.history?m`<button class="icon" title="Conversations" aria-label="Conversations" @click=${this._openHistory}>
            <ha-icon icon="mdi:history"></ha-icon>
          </button>`:g}
      ${e?m`<button
              class="icon"
              title="New conversation"
              aria-label="New conversation"
              ?disabled=${this._busy||this._messages.length===0&&!this._readOnly}
              @click=${this._newConversation}
            >
              <ha-icon icon="mdi:message-plus-outline"></ha-icon>
            </button>
            <button class="icon" title="Settings" aria-label="Settings" @click=${()=>this._settingsOpen=!0}>
              <ha-icon icon="mdi:cog-outline"></ha-icon>
            </button>`:g}
    </div>`}get _defaultGreeting(){return`Hi, I'm ${this._title}.
Write or talk to me below. You can pet me too.`}_empty(){let e=this._settings.greeting.trim()||this._defaultGreeting,[s,...i]=e.split(`
`);return m`<div class="empty">
      <div class="empty-title">${s}</div>
      ${i.length?m`<div class="empty-text">${i.join(`
`).trim()}</div>`:g}
    </div>`}_message(e){let s=e.role==="user"?"Listening":"Thinking";return m`<div class="msg ${e.role}">${e.text||(e.pending?m`<span class="dots" aria-label=${s}><i></i><i></i><i></i></span>`:g)}</div>`}_composer(){let e=!this._busy&&!!this._draft.trim(),s=this._voicePhase,i=lt(),[o,r]=s==="off"?["mdi:microphone",i?"Speak":"Speaking needs the microphone, which this browser doesn't allow here"]:s==="listening"?["mdi:microphone","Done speaking"]:["mdi:stop","Stop"];return m`<div class="composer">
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
          @input=${c=>this._draft=c.target.value}
          @keydown=${this._onKey}
        />
        <button class="icon small send" title="Send" aria-label="Send" ?disabled=${!e} @click=${this._send}>
          <ha-icon icon="mdi:send"></ha-icon>
        </button>
      </div>
      <button
        class="icon speak ${s}"
        title=${r}
        aria-label=${r}
        ?disabled=${s==="off"&&(this._busy||!i)}
        @click=${this._onSpeak}
      >
        <ha-icon icon=${o}></ha-icon>
      </button>
    </div>`}_settingsSheet(){let e=this._settings,s=(i,o,r,c=!1)=>m`<button
        class="choice ${e[i]===o?"on":""}"
        role="radio"
        aria-checked=${e[i]===o?"true":"false"}
        ?disabled=${c}
        @click=${()=>this._set(i,o)}
      >
        ${r}
      </button>`;return m`<div class="scrim" @click=${()=>this._settingsOpen=!1}></div>
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
            ${e.start==="speak"?m`Listening all the time (and a wake word) comes in a later version. Until then the page opens in
                  text mode: tap the microphone to talk.`:m`Opens quietly: nothing is said out loud, and the microphone stays off until you tap it.`}
          </div>
        </div>
        <div class="setting">
          <label class="label" for="greeting">Greeting</label>
          <textarea
            id="greeting"
            rows="3"
            maxlength=${$e}
            placeholder=${this._defaultGreeting}
            .value=${e.greeting}
            @input=${i=>this._set("greeting",i.target.value)}
          ></textarea>
          <div class="note">Shown before a conversation starts; the first line large. Empty: the one above.</div>
        </div>
        <label class="setting toggle">
          <div>
            <div class="label">Conversation history</div>
            <div class="note">Your recent conversations, kept in Home Assistant, to pick up again.</div>
          </div>
          ${this._switch("history")}
        </label>
        <label class="setting toggle">
          <div>
            <div class="label">Continue the last conversation</div>
            <div class="note">When the page opens. Off: a new conversation each time.</div>
          </div>
          ${this._switch("resume")}
        </label>
        <label class="setting toggle sub ${e.resume?"":"off"}">
          <div>
            <div class="label">From any device</div>
            <div class="note">
              ${e.history?"Your most recent conversation, wherever it was. Off: the last one on this device.":"Needs the conversation history."}
            </div>
          </div>
          ${this._switch("resumeAnyDevice",!e.resume||!e.history)}
        </label>
        <label class="setting toggle">
          <div>
            <div class="label">Keep the screen on</div>
            <div class="note">
              ${W.supported?"While this page is open, for a tablet on the wall.":"This browser can't keep the screen on."}
            </div>
          </div>
          <input
            type="checkbox"
            role="switch"
            .checked=${e.keepAwake}
            ?disabled=${!W.supported}
            @change=${i=>this._set("keepAwake",i.target.checked)}
          />
        </label>
        <div class="sheet-foot">Kept on this device only, in this browser.</div>
      </div>`}_switch(e,s=!1){return m`<input
      type="checkbox"
      role="switch"
      .checked=${this._settings[e]&&!s}
      ?disabled=${s}
      @change=${i=>this._set(e,i.target.checked)}
    />`}_readOnlyBar(){return m`<div class="readonly">
      <ha-icon icon="mdi:eye-outline"></ha-icon>
      <div class="readonly-text">${this._readOnly.name||"Someone else"}'s conversation, read only</div>
      <button class="pill" @click=${this._leaveReadOnly}>Back to mine</button>
    </div>`}_historySheet(){let e=!!this.hass?.user?.is_admin,s=this._history;return m`<div class="scrim" @click=${()=>this._historyOpen=!1}></div>
      <div class="sheet history" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div class="sheet-head">
          <div id="history-title" class="sheet-title">Conversations</div>
          <button class="icon" aria-label="Close" title="Close" @click=${()=>this._historyOpen=!1}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        ${e?m`<div class="choices" role="radiogroup" aria-label="Whose">
              <button
                class="choice ${this._historyEveryone?"":"on"}"
                role="radio"
                aria-checked=${this._historyEveryone?"false":"true"}
                @click=${()=>this._loadHistory(!1)}
              >
                Mine
              </button>
              <button
                class="choice ${this._historyEveryone?"on":""}"
                role="radio"
                aria-checked=${this._historyEveryone?"true":"false"}
                @click=${()=>this._loadHistory(!0)}
              >
                Everyone
              </button>
            </div>`:g}
        <div class="convs">
          ${this._historyError?m`<div class="conv-empty">${this._historyError}</div>`:s===null?m`<div class="conv-empty">Loading…</div>`:s.length===0?m`<div class="conv-empty">No conversations yet.</div>`:s.map(i=>this._conversationRow(i))}
        </div>
        <div class="sheet-foot">The 20 most recent are kept for each person.</div>
      </div>`}_conversationRow(e){let s=e.id===this._conversationId&&!this._readOnly,i=this._confirmDelete===e.id;return m`<div class="conv ${s?"current":""}">
      <button class="conv-open" @click=${()=>this._openConversation(e)}>
        <div class="conv-title">${e.title||"Untitled"}</div>
        <div class="conv-meta">
          ${e.mine?g:m`<span class="conv-who">${e.user_name||"Someone"}</span> · `}${at(e.updated)}
          · ${Math.ceil(e.count/2)} ${e.count>2?"questions":"question"}${s?" \xB7 open now":""}
        </div>
      </button>
      ${i?m`<button class="pill danger" @click=${()=>this._delete(e)}>Delete</button>`:m`<button
            class="icon small"
            title="Delete"
            aria-label="Delete ${e.title}"
            @click=${()=>this._confirmDelete=e.id}
          >
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>`}
    </div>`}async _loadHistory(e){this._historyEveryone=e,this._history=null,this._historyError="",this._confirmDelete=null;try{this._history=await nt(this.hass,e)}catch(s){this._historyError=s?.code==="unknown_command"?"The history needs a newer version of the Kattio integration.":s?.message||"The conversations could not be loaded."}}async _openConversation(e){if(this._busy)return;this._confirmDelete=null;let s;try{s=await Se(this.hass,e.id)}catch(i){this._historyError=i?.message||"The conversation could not be opened.";return}if(!s){this._historyError="That conversation is gone.";return}if(this._historyOpen=!1,!s.mine){this._readOnly||(this._ownAside={messages:this._messages,conversationId:this._conversationId}),this._readOnly={name:s.user_name},this._show({conversationId:null,messages:s.messages});return}this._readOnly=null,this._ownAside=void 0,this._show({conversationId:s.id,messages:s.messages}),this._save(!1)}async _delete(e){this._confirmDelete=null;try{await rt(this.hass,e.id)}catch(s){this._historyError=s?.message||"The conversation could not be deleted.";return}this._history=(this._history??[]).filter(s=>s.id!==e.id),e.id===this._conversationId&&!this._readOnly&&this._newConversation()}_set(e,s){this._settings={...this._settings,[e]:s},et(this._settings)}_onKey(e){e.key==="Enter"&&!e.isComposing&&(e.preventDefault(),this._send())}async _send(){let e=this._draft.trim();if(!e||this._busy||!this.hass)return;this._draft="",this._busy=!0;let s={id:C++,role:"assistant",text:"",pending:!0};this._smooth=!0,this._follow=!0,this._behind=!1,this._messages=[...this._messages,{id:C++,role:"user",text:e},s],this._face?.setState("thinking");let i=()=>this._messages=[...this._messages];await Ge(this.hass,e,{pipeline:this._config.pipeline,conversationId:this._conversationId},{onText:(o,r)=>{s.text+=(r&&s.text?`

`:"")+o,this._face?.setState("speaking"),o&&this._face?.setLevel(.45+Math.random()*.4),i()},onDone:({speech:o,conversationId:r})=>{s.text.trim()||(s.text=o),s.pending=!1,this._conversationId=r??this._conversationId,this._face?.setState("idle"),i()},onError:o=>{s.pending=!1,s.text||(this._messages=this._messages.filter(r=>r!==s)),this._messages=[...this._messages,{id:C++,role:"error",text:o}],this._face?.setState("error")}}),this._busy=!1,this._save()}async _askByVoice(){if(this._busy||!this.hass)return;this._busy=!0,this._voicePhase="starting";let e={id:C++,role:"user",text:"",pending:!0},s={id:C++,role:"assistant",text:"",pending:!0},i=!1,o=!1,r=!1;this._smooth=!0,this._follow=!0,this._behind=!1,this._messages=[...this._messages,e],this._face?.setState("listening");let c=()=>this._messages=[...this._messages],l=()=>{i||(i=!0,this._messages=[...this._messages,s])},p=ct(this.hass,{pipeline:this._config.pipeline,conversationId:this._conversationId},{onListening:()=>this._voicePhase="listening",onHeard:a=>{if(!a){this._messages=[...this._messages.filter(u=>u!==e),{id:C++,role:"note",text:"I didn't catch that."}],this._face?.setState("idle");return}e.text=a,e.pending=!1,this._voicePhase="thinking",this._face?.setState("thinking"),l(),c()},onText:(a,u)=>{l(),s.text+=(u&&s.text?`

`:"")+a,c()},onDone:({speech:a,conversationId:u})=>{l(),s.text.trim()||(s.text=a),s.pending=!1,this._conversationId=u??this._conversationId,o||this._face?.setState("idle"),c()},onError:a=>{r=!0,this._messages=[...this._messages.filter(u=>u!==e&&u!==s||u.text),{id:C++,role:"error",text:a}],this._face?.setState("error")},onSpeaking:a=>{o=a,a?(this._voicePhase="speaking",this._face?.setState("speaking")):r||this._face?.setState(s.pending?"thinking":"idle")},onLevel:a=>this._face?.setLevel(a)});this._voice=p,await p.done,this._voice=void 0;let d=e.pending||s.pending;this._messages=this._messages.filter(a=>!a.pending||a.text).map(a=>a.pending?{...a,pending:!1}:a),d&&e.text&&!r&&(this._messages=[...this._messages,{id:C++,role:"note",text:"Stopped."}]),r||this._face?.setState("idle"),this._voicePhase="off",this._busy=!1,this._save()}_newConversation(){this._readOnly=null,this._ownAside=void 0,this._messages=[],this._follow=!0,this._behind=!1,this._conversationId=null,this._face?.setState("idle"),this._save()}get _log(){return this.renderRoot?.querySelector(".messages")??null}_scrollToEnd(e){let s=this._log;s&&(s.scrollHeight-s.scrollTop-s.clientHeight<1||(this._autoScroll=!0,s.scrollTo({top:s.scrollHeight,behavior:e?"smooth":"auto"})))}_readBack(){this._autoScroll=!1,this._follow=!1}_save(e=!0){if(this._readOnly)return;let s=this.hass?.user?.id??"",i=this._messages.filter(r=>!r.pending).slice(-Rt).map(({role:r,text:c})=>({role:r,text:c})),o={conversationId:this._conversationId,messages:i};try{sessionStorage.setItem(dt,JSON.stringify({userId:s,...o}))}catch{}s&&(it(s,o),e&&this._settings.history&&this._conversationId&&i.length&&ot(this.hass,this._conversationId,i).catch(r=>console.warn("Kattio: the conversation was not kept in Home Assistant",r)))}async _start(){let e=this.hass.user.id;try{let o=JSON.parse(sessionStorage.getItem(dt)||"null");if(o&&o.userId===e&&Array.isArray(o.messages)){this._show(o);return}}catch{}let s=this._settings;if(!s.resume)return;if(s.resumeAnyDevice&&s.history)try{let o=await Se(this.hass);o?.mine&&!this._messages.length&&(this._show({conversationId:o.id,messages:o.messages}),this._save(!1));return}catch(o){console.warn("Kattio: the most recent conversation could not be loaded; this device's last instead",o)}let i=st(e);i&&!this._messages.length&&this._show(i)}_show(e){this._messages=e.messages.filter(s=>s&&typeof s.text=="string"&&["user","assistant","note","error"].includes(s.role)).map(s=>({id:C++,role:s.role,text:s.text})),this._conversationId=e.conversationId??null,this._follow=!0,this._behind=!1,this._face?.setState("idle")}};te.properties={hass:{attribute:!1},narrow:{type:Boolean},panel:{attribute:!1},_messages:{state:!0},_busy:{state:!0},_draft:{state:!0},_settings:{state:!0},_settingsOpen:{state:!0},_behind:{state:!0},_historyOpen:{state:!0},_history:{state:!0},_historyEveryone:{state:!0},_historyError:{state:!0},_confirmDelete:{state:!0},_readOnly:{state:!0},_voicePhase:{state:!0},_wide:{type:Boolean,reflect:!0,attribute:"wide"},_dark:{type:Boolean,reflect:!0,attribute:"dark"}},te.styles=le`
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
    .log {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
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
    .empty-text {
      white-space: pre-line;
    }
    .jump {
      position: absolute;
      left: 50%;
      bottom: 8px;
      z-index: 1;
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid var(--k-line);
      border-radius: 50%;
      background: var(--k-surface);
      color: var(--k-accent);
      box-shadow: var(--k-shadow);
      cursor: pointer;
      --mdc-icon-size: 22px;
      transform: translateX(-50%);
      animation: jump-in 0.2s ease-out;
      -webkit-tap-highlight-color: transparent;
    }
    .jump:active {
      transform: translateX(-50%) scale(0.94);
    }
    @keyframes jump-in {
      from {
        opacity: 0;
        transform: translate(-50%, 8px);
      }
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
    .msg.note {
      align-self: center;
      padding: 2px 12px;
      font-size: 14px;
      color: var(--k-muted);
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
      position: relative;
      width: 48px;
      height: 48px;
      background: var(--k-surface);
      box-shadow: var(--k-shadow);
      border: 1px solid var(--k-line);
    }
    button.icon.speak:not(.off) {
      background: var(--k-accent);
      color: var(--k-on-accent);
      border-color: transparent;
    }
    button.icon.speak:not(.off):hover {
      background: color-mix(in srgb, var(--k-accent) 88%, #000);
    }
    /* listening: a ring breathes out from the button */
    button.icon.speak.listening::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: 50%;
      border: 2px solid var(--k-accent);
      animation: ring 1.4s ease-out infinite;
      pointer-events: none;
    }
    @keyframes ring {
      from {
        transform: scale(1);
        opacity: 0.7;
      }
      to {
        transform: scale(1.5);
        opacity: 0;
      }
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
    label.label {
      display: block;
    }
    textarea {
      box-sizing: border-box;
      display: block;
      width: 100%;
      min-height: 64px;
      resize: vertical;
      padding: 10px 12px;
      border: 1px solid var(--k-line);
      border-radius: 12px;
      background: var(--k-bg);
      color: inherit;
      font: inherit;
      font-size: 16px;
      line-height: 1.4;
      outline: none;
    }
    textarea:focus {
      border-color: color-mix(in srgb, var(--k-accent) 60%, transparent);
    }
    textarea::placeholder {
      color: var(--k-muted);
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
    .setting.sub {
      padding-left: 16px;
    }
    .setting.sub.off .label,
    .setting.sub.off .note {
      opacity: 0.5;
    }
    .setting.sub {
      border-top: none;
      padding-top: 0;
    }

    /* ---- conversations ---- */
    .sheet.history {
      display: flex;
      flex-direction: column;
    }
    :host([wide]) .sheet.history {
      width: min(520px, 90%);
      max-height: 80%;
    }
    .sheet.history .choices {
      flex: none;
      margin-bottom: 8px;
    }
    .convs {
      flex: 1;
      min-height: 120px;
      overflow-y: auto;
      margin: 0 -8px;
    }
    .conv {
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: 12px;
      padding-right: 4px;
    }
    .conv.current {
      background: color-mix(in srgb, var(--k-accent) 12%, transparent);
    }
    .conv-open {
      flex: 1;
      min-width: 0;
      padding: 10px 8px;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: 12px;
      -webkit-tap-highlight-color: transparent;
    }
    .conv-open:hover {
      background: color-mix(in srgb, currentColor 6%, transparent);
    }
    .conv-title {
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .conv-meta {
      margin-top: 2px;
      font-size: 13px;
      color: var(--k-muted);
    }
    .conv-who {
      color: var(--k-text);
      font-weight: 500;
    }
    .conv-empty {
      padding: 24px 8px;
      text-align: center;
      color: var(--k-muted);
    }
    .pill {
      flex: none;
      height: 34px;
      padding: 0 14px;
      border: 1px solid var(--k-line);
      border-radius: 17px;
      background: var(--k-surface);
      color: var(--k-accent);
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .pill.danger {
      border-color: transparent;
      background: var(--k-error);
      color: #fff;
    }
    .readonly {
      flex: none;
      box-sizing: border-box;
      width: 100%;
      max-width: 792px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px));
      color: var(--k-muted);
      font-size: 14px;
      --mdc-icon-size: 20px;
    }
    .readonly-text {
      flex: 1;
      min-width: 0;
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
      .scrim,
      .jump,
      button.icon.speak.listening::after {
        animation: none;
      }
    }
  `;customElements.get("kattio-panel")||customElements.define("kattio-panel",te);
