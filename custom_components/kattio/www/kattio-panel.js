var ae=globalThis,le=ae.ShadowRoot&&(ae.ShadyCSS===void 0||ae.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,ge=Symbol(),qe=new WeakMap,Y=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==ge)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(le&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=qe.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&qe.set(t,e))}return e}toString(){return this.cssText}},Ve=n=>new Y(typeof n=="string"?n:n+"",void 0,ge),me=(n,...e)=>{let t=n.length===1?n[0]:e.reduce((s,i,o)=>s+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[o+1],n[0]);return new Y(t,n,ge)},Ge=(n,e)=>{if(le)n.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),i=ae.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,n.appendChild(s)}},ve=le?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return Ve(t)})(n):n;var{is:Pt,defineProperty:It,getOwnPropertyDescriptor:Ot,getOwnPropertyNames:Rt,getOwnPropertySymbols:Lt,getPrototypeOf:Ht}=Object,ce=globalThis,Ye=ce.trustedTypes,Ut=Ye?Ye.emptyScript:"",Dt=ce.reactiveElementPolyfillSupport,X=(n,e)=>n,_e={toAttribute(n,e){switch(e){case Boolean:n=n?Ut:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},Je=(n,e)=>!Pt(n,e),Xe={attribute:!0,type:String,converter:_e,reflect:!1,useDefault:!1,hasChanged:Je};Symbol.metadata??=Symbol("metadata"),ce.litPropertyMetadata??=new WeakMap;var M=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Xe){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&It(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){let{get:i,set:o}=Ot(this.prototype,e)??{get(){return this[t]},set(r){this[t]=r}};return{get:i,set(r){let c=i?.call(this);o?.call(this,r),this.requestUpdate(e,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Xe}static _$Ei(){if(this.hasOwnProperty(X("elementProperties")))return;let e=Ht(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(X("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(X("properties"))){let t=this.properties,s=[...Rt(t),...Lt(t)];for(let i of s)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let i of s)t.unshift(ve(i))}else e!==void 0&&t.push(ve(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ge(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){let s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){let o=(s.converter?.toAttribute!==void 0?s.converter:_e).toAttribute(t,s.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,t){let s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let o=s.getPropertyOptions(i),r=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:_e;this._$Em=i;let c=r.fromAttribute(t,o.type);this[i]=c??this._$Ej?.get(i)??c,this._$Em=null}}requestUpdate(e,t,s,i=!1,o){if(e!==void 0){let r=this.constructor;if(i===!1&&(o=this[e]),s??=r.getPropertyOptions(e),!((s.hasChanged??Je)(o,t)||s.useDefault&&s.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:o},r){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),o!==!0||r!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,o]of s){let{wrapped:r}=o,c=this[i];r!==!0||this._$AL.has(i)||c===void 0||this.C(i,void 0,o,c)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};M.elementStyles=[],M.shadowRootOptions={mode:"open"},M[X("elementProperties")]=new Map,M[X("finalized")]=new Map,Dt?.({ReactiveElement:M}),(ce.reactiveElementVersions??=[]).push("2.1.2");var Se=globalThis,Qe=n=>n,de=Se.trustedTypes,Ze=de?de.createPolicy("lit-html",{createHTML:n=>n}):void 0,ot="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,rt="?"+P,Nt=`<${rt}>`,U=document,Q=()=>U.createComment(""),Z=n=>n===null||typeof n!="object"&&typeof n!="function",Ae=Array.isArray,zt=n=>Ae(n)||typeof n?.[Symbol.iterator]=="function",ye=`[ 	
\f\r]`,J=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,et=/-->/g,tt=/>/g,L=RegExp(`>|${ye}(?:([^\\s"'>=/]+)(${ye}*=${ye}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),st=/'/g,it=/"/g,at=/^(?:script|style|textarea|title)$/i,Ee=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),_=Ee(1),gs=Ee(2),ms=Ee(3),D=Symbol.for("lit-noChange"),v=Symbol.for("lit-nothing"),nt=new WeakMap,H=U.createTreeWalker(U,129);function lt(n,e){if(!Ae(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ze!==void 0?Ze.createHTML(e):e}var Ft=(n,e)=>{let t=n.length-1,s=[],i,o=e===2?"<svg>":e===3?"<math>":"",r=J;for(let c=0;c<t;c++){let l=n[c],p,h,d=-1,f=0;for(;f<l.length&&(r.lastIndex=f,h=r.exec(l),h!==null);)f=r.lastIndex,r===J?h[1]==="!--"?r=et:h[1]!==void 0?r=tt:h[2]!==void 0?(at.test(h[2])&&(i=RegExp("</"+h[2],"g")),r=L):h[3]!==void 0&&(r=L):r===L?h[0]===">"?(r=i??J,d=-1):h[1]===void 0?d=-2:(d=r.lastIndex-h[2].length,p=h[1],r=h[3]===void 0?L:h[3]==='"'?it:st):r===it||r===st?r=L:r===et||r===tt?r=J:(r=L,i=void 0);let k=r===L&&n[c+1].startsWith("/>")?" ":"";o+=r===J?l+Nt:d>=0?(s.push(p),l.slice(0,d)+ot+l.slice(d)+P+k):l+P+(d===-2?c:k)}return[lt(n,o+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},ee=class n{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let o=0,r=0,c=e.length-1,l=this.parts,[p,h]=Ft(e,t);if(this.el=n.createElement(p,s),H.currentNode=this.el.content,t===2||t===3){let d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(i=H.nextNode())!==null&&l.length<c;){if(i.nodeType===1){if(i.hasAttributes())for(let d of i.getAttributeNames())if(d.endsWith(ot)){let f=h[r++],k=i.getAttribute(d).split(P),x=/([.?@])?(.*)/.exec(f);l.push({type:1,index:o,name:x[2],strings:k,ctor:x[1]==="."?xe:x[1]==="?"?ke:x[1]==="@"?we:j}),i.removeAttribute(d)}else d.startsWith(P)&&(l.push({type:6,index:o}),i.removeAttribute(d));if(at.test(i.tagName)){let d=i.textContent.split(P),f=d.length-1;if(f>0){i.textContent=de?de.emptyScript:"";for(let k=0;k<f;k++)i.append(d[k],Q()),H.nextNode(),l.push({type:2,index:++o});i.append(d[f],Q())}}}else if(i.nodeType===8)if(i.data===rt)l.push({type:2,index:o});else{let d=-1;for(;(d=i.data.indexOf(P,d+1))!==-1;)l.push({type:7,index:o}),d+=P.length-1}o++}}static createElement(e,t){let s=U.createElement("template");return s.innerHTML=e,s}};function W(n,e,t=n,s){if(e===D)return e;let i=s!==void 0?t._$Co?.[s]:t._$Cl,o=Z(e)?void 0:e._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(n),i._$AT(n,t,s)),s!==void 0?(t._$Co??=[])[s]=i:t._$Cl=i),i!==void 0&&(e=W(n,i._$AS(n,e.values),i,s)),e}var be=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??U).importNode(t,!0);H.currentNode=i;let o=H.nextNode(),r=0,c=0,l=s[0];for(;l!==void 0;){if(r===l.index){let p;l.type===2?p=new te(o,o.nextSibling,this,e):l.type===1?p=new l.ctor(o,l.name,l.strings,this,e):l.type===6&&(p=new $e(o,this,e)),this._$AV.push(p),l=s[++c]}r!==l?.index&&(o=H.nextNode(),r++)}return H.currentNode=U,i}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},te=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=v,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=W(this,e,t),Z(e)?e===v||e==null||e===""?(this._$AH!==v&&this._$AR(),this._$AH=v):e!==this._$AH&&e!==D&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):zt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==v&&Z(this._$AH)?this._$AA.nextSibling.data=e:this.T(U.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=ee.createElement(lt(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{let o=new be(i,this),r=o.u(this.options);o.p(t),this.T(r),this._$AH=o}}_$AC(e){let t=nt.get(e.strings);return t===void 0&&nt.set(e.strings,t=new ee(e)),t}k(e){Ae(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,i=0;for(let o of e)i===t.length?t.push(s=new n(this.O(Q()),this.O(Q()),this,this.options)):s=t[i],s._$AI(o),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let s=Qe(e).nextSibling;Qe(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},j=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,o){this.type=1,this._$AH=v,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=v}_$AI(e,t=this,s,i){let o=this.strings,r=!1;if(o===void 0)e=W(this,e,t,0),r=!Z(e)||e!==this._$AH&&e!==D,r&&(this._$AH=e);else{let c=e,l,p;for(e=o[0],l=0;l<o.length-1;l++)p=W(this,c[s+l],t,l),p===D&&(p=this._$AH[l]),r||=!Z(p)||p!==this._$AH[l],p===v?e=v:e!==v&&(e+=(p??"")+o[l+1]),this._$AH[l]=p}r&&!i&&this.j(e)}j(e){e===v?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},xe=class extends j{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===v?void 0:e}},ke=class extends j{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==v)}},we=class extends j{constructor(e,t,s,i,o){super(e,t,s,i,o),this.type=5}_$AI(e,t=this){if((e=W(this,e,t,0)??v)===D)return;let s=this._$AH,i=e===v&&s!==v||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,o=e!==v&&(s===v||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},$e=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){W(this,e)}};var Kt=Se.litHtmlPolyfillSupport;Kt?.(ee,te),(Se.litHtmlVersions??=[]).push("3.3.3");var ct=(n,e,t)=>{let s=t?.renderBefore??e,i=s._$litPart$;if(i===void 0){let o=t?.renderBefore??null;s._$litPart$=i=new te(e.insertBefore(Q(),o),o,void 0,t??{})}return i._$AI(n),i};var Te=globalThis,I=class extends M{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ct(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return D}};I._$litElement$=!0,I.finalized=!0,Te.litElementHydrateSupport?.({LitElement:I});var Wt=Te.litElementPolyfillSupport;Wt?.({LitElement:I});(Te.litElementVersions??=[]).push("4.2.2");var Ce="kattio-app-talk";function B(){return window.kattioApp}function Me(n){let e=!1,t=!1;return s=>{let i=s.data??{};switch(s.type){case"intent-progress":{let o=i.chat_log_delta;if(!o)break;let r=o.role==="assistant";typeof o.content=="string"&&o.content?(n.onText(o.content,r&&t),t=!0):r&&t&&n.onText("",!0);break}case"intent-end":{if(e)break;let o=i.intent_output??{},r=o.response?.speech?.plain?.speech??"";o.response?.response_type==="error"&&!t?n.onError(r||"The assistant could not answer."):n.onDone({speech:r,conversationId:o.conversation_id??null}),e=!0;break}case"error":e||n.onError(Pe(i)),e=!0;break;case"run-end":e||n.onError("The assistant did not answer."),e=!0;break}return e}}function Pe(n){switch(n.code){case"stt-no-text-recognized":return"I didn't catch that.";case"stt-stream-failed":case"stt-provider-unsupported-metadata":return"I couldn't hear you: speech recognition isn't working.";case"tts-failed":return"I couldn't say the answer out loud.";case"timeout":return"That took too long."}return n.message||n.code||"The assistant could not answer."}function Ie(n,e){let t={type:"assist_pipeline/run",...e,conversation_id:n.conversationId??null};return n.pipeline&&(t.pipeline=n.pipeline),t}async function dt(n,e,t,s){let i,o=new Promise(h=>i=h),r=Me(s),c=h=>{r(h),(h.type==="error"||h.type==="run-end")&&i()},l=Ie(t,{start_stage:"intent",end_stage:"intent",input:{text:e}}),p;try{p=await n.connection.subscribeMessage(c,l)}catch(h){s.onError(h?.message||"Home Assistant refused the request.");return}await o;try{await p()}catch{}}var ht=n=>{n.replaceChildren();let e=document.createElement("ha-icon");e.setAttribute("icon","mdi:cat"),e.className="face-icon";let t=document.createElement("div");t.className="face-status",n.append(e,t);let s={idle:"",listening:"Listening\u2026",thinking:"Thinking\u2026",speaking:"",error:"Something went wrong"};return{setState(i){n.dataset.state=i,t.textContent=s[i]},setLevel(){},setDark(){},destroy(){n.replaceChildren()}}};var q={BOOT:0,IDLE:1,LISTEN:4,THINK:5,SPEAK:6,ERROR:8},pt={idle:q.IDLE,listening:q.LISTEN,thinking:q.THINK,speaking:q.SPEAK,error:q.ERROR},jt=30,Bt=12,qt=2,Vt=1e3,Gt=6,se;function Yt(){if(!se){let n=new URL(import.meta.url),e=new URL(`kattio-face.wasm${n.search}`,n);se=(async()=>{let t=await fetch(e);if(!t.ok)throw new Error(`${e.pathname}: HTTP ${t.status}`);return WebAssembly.compile(await t.arrayBuffer())})(),se.catch(()=>se=void 0)}return se}async function Xt(){let n=await Yt(),e,t={clock_time_get:(o,r,c)=>(new DataView(e.buffer).setBigUint64(c,BigInt(Math.round(performance.now()*1e6)),!0),0),fd_close:()=>8,fd_seek:()=>8,fd_write:()=>8},i=(await WebAssembly.instantiate(n,{wasi_snapshot_preview1:t})).exports;return e=i.memory,i._initialize(),i.face_init(Math.random()*4294967295>>>0||1),i}function ut(n){return e=>{e.replaceChildren();let t=document.createElement("canvas");t.className="face-canvas",t.setAttribute("role","img"),t.setAttribute("aria-label","Kattio"),e.append(t);let s=t.getContext("2d"),i,o,r=!1,c="idle",l=!1,p=-1,h=0,d=0,f=0,k=0,x=0,S=!0,R=()=>{if(!i)return;let m=e.getBoundingClientRect(),w=Math.min(window.devicePixelRatio||1,qt),A=Math.max(1,Math.round(m.width*w)),E=Math.max(1,Math.round(m.height*w)),ne=Math.min(1,Vt/Math.max(A,E));A=Math.max(1,Math.round(A*ne)),E=Math.max(1,Math.round(E*ne)),!(A===t.width&&E===t.height&&d)&&(t.width=A,t.height=E,d=i.face_resize(A,E),x=0)},z=new ResizeObserver(R);z.observe(e);let ue=()=>{if(!i||!s||!d)return;i.face_render(l?1:0);let m=new Uint8ClampedArray(i.memory.buffer,d,t.width*t.height*4);s.putImageData(new ImageData(m,t.width,t.height),0,0);let w=i.face_glow(l?1:0);w!==p&&(p=w,e.style.setProperty("--face-glow",`#${w.toString(16).padStart(6,"0")}`))},F=m=>{if(r||(f=requestAnimationFrame(F),!i))return;let w=k?Math.min((m-k)/1e3,.25):0;k=m,h=Math.max(0,h-Gt*w*h-.02*w),i.face_set_level(h),S=i.face_update(w)!==0||S;let A=1e3/(S||c==="speaking"?jt:Bt);m-x>=A-2&&(x=m,ue(),S=!1)},K=()=>{i&&(i.face_poke(),S=!0)};return t.addEventListener("click",K),Xt().then(m=>{r||(i=m,R(),c!=="idle"&&i.face_set_mood(pt[c]),f=requestAnimationFrame(F))},m=>{console.warn("Kattio face: could not load the face engine, showing a simpler one",m),!r&&(z.disconnect(),o=n(e),o.setState(c))}),{setState(m){if(o)return o.setState(m);let w=m!==c;c=m,!(!i||!w)&&(m==="idle"&&i.face_get_mood()===q.BOOT||(i.face_set_mood(pt[m]),S=!0))},setLevel(m){if(o)return o.setLevel(m);h=Math.max(h,Math.min(1,Math.max(0,m)))},setDark(m){if(o)return o.setDark(m);m!==l&&(l=m,p=-1,x=0)},destroy(){r=!0,cancelAnimationFrame(f),z.disconnect(),t.removeEventListener("click",K),o?.destroy(),e.replaceChildren(),e.style.removeProperty("--face-glow")}}}}var C={theme:"auto",start:"text",keepAwake:!1,greeting:"",history:!0,resume:!1,resumeAnyDevice:!1},Oe=300,ft="kattio-panel:settings:v1",he=(n,e)=>typeof n=="boolean"?n:e;function gt(){try{let n=JSON.parse(localStorage.getItem(ft)||"null");if(n&&typeof n=="object")return{theme:["auto","light","dark"].includes(n.theme)?n.theme:C.theme,start:["text","speak"].includes(n.start)?n.start:C.start,keepAwake:he(n.keepAwake,C.keepAwake),greeting:typeof n.greeting=="string"?n.greeting.slice(0,Oe):C.greeting,history:he(n.history,C.history),resume:he(n.resume,C.resume),resumeAnyDevice:he(n.resumeAnyDevice,C.resumeAnyDevice)}}catch{}return{...C}}function mt(n){try{return localStorage.setItem(ft,JSON.stringify(n)),!0}catch{return!1}}var V=class n{constructor(){this.lock=null;this.wanted=!1;this.onVisible=()=>{document.visibilityState==="visible"&&this.acquire()}}static get supported(){return"wakeLock"in navigator||!!B()?.keepScreenOn}set(e){if(e===this.wanted)return;this.wanted=e;let t=B();if(t?.keepScreenOn)return t.keepScreenOn(e);e?(document.addEventListener("visibilitychange",this.onVisible),this.acquire()):(document.removeEventListener("visibilitychange",this.onVisible),this.lock?.release().catch(()=>{}),this.lock=null)}async acquire(){if(!(!this.wanted||this.lock||!n.supported||document.visibilityState!=="visible"))try{let e=await navigator.wakeLock.request("screen");if(!this.wanted){e.release();return}this.lock=e,e.addEventListener?.("release",()=>{this.lock===e&&(this.lock=null)})}catch{}}},vt="kattio-panel:last:v1";function _t(n){try{let e=JSON.parse(localStorage.getItem(vt)||"null");if(e&&e.userId===n&&Array.isArray(e.messages))return{conversationId:e.conversationId??null,messages:e.messages}}catch{}return null}function yt(n,e){try{localStorage.setItem(vt,JSON.stringify({userId:n,...e}))}catch{}}async function bt(n,e=!1){return(await n.callWS({type:"kattio/history/list",everyone:e})).conversations}function Re(n,e){return n.callWS({type:"kattio/history/get",conversation_id:e??null})}function xt(n,e,t){return n.callWS({type:"kattio/history/save",conversation_id:e,messages:t})}function kt(n,e){return n.callWS({type:"kattio/history/delete",conversation_id:e})}function wt(n,e=Date.now()){let t=new Date(n*1e3),s=(e-t.getTime())/1e3;if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)} min ago`;let i=new Date(e);i.setHours(0,0,0,0);let o=864e5;return t.getTime()>=i.getTime()?t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):t.getTime()>=i.getTime()-o?"yesterday":t.getTime()>=i.getTime()-6*o?t.toLocaleDateString([],{weekday:"short"}):t.toLocaleDateString([],{day:"numeric",month:"short"})}function $t(){let n=new Uint8Array(8);crypto.getRandomValues(n);let e=[...n].map(t=>t.toString(16).padStart(2,"0")).join("");return`kattio-${Date.now().toString(36)}-${e}`}var N=16e3,Jt=8e3,Qt=3e4,Zt=8e3,es=.02,St=250,ts=400,Le=4,pe=8,ss=["stop talking","shut up","bye bye","go back to sleep","hold mund","hold op med at snakke","farvel","g\xE5 i seng"];function is(n){let e=` ${n.toLowerCase().replace(/[-,.!?]/g," ").replace(/\s+/g," ").trim()} `;return ss.some(t=>e.includes(` ${t} `))}var ns=`
registerProcessor("kattio-mic", class extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
});`;function os(){let e=new DataView(new ArrayBuffer(1644)),t=(i,o)=>[...o].forEach((r,c)=>e.setUint8(i+c,r.charCodeAt(0)));t(0,"RIFF"),e.setUint32(4,36+800*2,!0),t(8,"WAVEfmt "),e.setUint32(16,16,!0),e.setUint16(20,1,!0),e.setUint16(22,1,!0),e.setUint32(24,8e3,!0),e.setUint32(28,16e3,!0),e.setUint16(32,2,!0),e.setUint16(34,16,!0),t(36,"data"),e.setUint32(40,800*2,!0);let s="";return new Uint8Array(e.buffer).forEach(i=>s+=String.fromCharCode(i)),`data:audio/wav;base64,${btoa(s)}`}function At(){return!!navigator.mediaDevices?.getUserMedia&&typeof AudioContext<"u"&&window.isSecureContext}var He=class{constructor(e){this.rest=new Float32Array(0);this.pos=0;this.ratio=e/N}push(e){let t=e;this.rest.length&&(t=new Float32Array(this.rest.length+e.length),t.set(this.rest),t.set(e,this.rest.length));let s=this.ratio,i=new Int16Array(Math.max(0,Math.floor((t.length-this.pos)/s))),o=0,r=this.pos;for(;r+s<=t.length&&o<i.length;){let l=Math.floor(r),p=Math.max(l+1,Math.floor(r+s)),h=0;for(let d=l;d<p;d++)h+=t[d];i[o++]=Et(h/(p-l)),r+=s}let c=Math.floor(r);return this.rest=t.slice(c),this.pos=r-c,i.subarray(0,o)}};function Et(n){let e=Math.max(-1,Math.min(1,n));return e<0?e*32768:e*32767}var Ue=class{constructor(){this.chunks=[];this.samples=0}add(e){this.chunks.push(e),this.samples+=e.length;let t=Zt/1e3*N;for(;this.chunks.length>1&&this.samples-this.chunks[0].length>=t;)this.samples-=this.chunks.shift().length}last(e){let t=Math.min(this.samples,Math.round(e/1e3*N)),s=new Int16Array(t),i=t;for(let o=this.chunks.length-1;o>=0&&i>0;o--){let r=this.chunks[o],c=Math.min(i,r.length);s.set(r.subarray(r.length-c),i-c),i-=c}return s}};function Tt(n,e,t){let s=new AudioContext;s.resume();let i=new Audio;i.src=os(),i.play().catch(()=>{});let o;try{let a=s.createMediaElementSource(i);o=s.createAnalyser(),o.fftSize=512,a.connect(o),o.connect(s.destination)}catch{}let r;try{r=new AudioContext({sampleRate:N}),r.resume()}catch{r=void 0}let c,l,p,h=new Ue,d=!1,f,k=0,x=0,S=0,R=0,z,ue=new Promise(a=>z=a),F,K,m=!1,w=(a,u,y)=>{let g=n.connection.socket;if(!g||g.readyState!==WebSocket.OPEN)return;let b=y?new Uint8Array(y.buffer,y.byteOffset,y.byteLength):new Uint8Array(0),$=new Uint8Array(1+u.length+b.byteLength);$[0]=a,$.set(u,1),$.set(b,1+u.length),g.send($)},A=a=>{F!==void 0&&w(F,[x,k&255],a)},E=a=>{a!==x&&(x=a,A())},ne=a=>{d||(a.type==="ready"?(F=a.handler_id,A()):a.type==="end_of_turn"?a.turn===(k&255)&&f?.open&&x&Le&&G():a.type==="interrupt"&&f?.playing&&Fe((a.ago_ms??0)+ts))},oe=(a,u)=>{a.handlerId!==void 0&&w(a.handlerId,[],u??void 0)},G=()=>{let a=f;!a||!a.open||(a.open=!1,a.timers.forEach(clearTimeout),E(x&~Le),a.handlerId!==void 0&&oe(a,null),a.heard||t.onState("thinking"))},re=a=>{a.open=!1,a.ended=!0,a.timers.forEach(clearTimeout),a.unsubscribe?.().catch(()=>{})},De=()=>{cancelAnimationFrame(R),i.onended=null,i.onerror=null,i.pause(),f?.playing&&(f.playing=!1,E(x&~pe))},T=a=>{d||(d=!0,f&&re(f),De(),i.removeAttribute("src"),l?.disconnect(),p?.disconnect(),c?.getTracks().forEach(u=>u.stop()),x=0,K?.().catch(()=>{}),r?.close().catch(()=>{}),s.close().catch(()=>{}),document.removeEventListener("visibilitychange",We),t.onEnd(a),z())},Ne=a=>{if(!(d||a!==f||!a.ended||a.playing)){if(a.failed)return T("error");fe(0)}},ze=(a,u)=>{if(a.playing||d||a!==f)return;a.playing=!0,E(x|pe),i.src=new URL(u,location.href).href;let y=()=>{a.playing&&(a.playing=!1,cancelAnimationFrame(R),E(x&~pe),t.onLevel(0),Ne(a))};if(i.onended=y,i.onerror=y,i.play().then(()=>{a.playing&&t.onState("speaking")},()=>{console.warn("Kattio: the browser did not play the answer"),y()}),o){let g=new Uint8Array(o.fftSize),b=()=>{if(!a.playing)return;o.getByteTimeDomainData(g);let $=0;for(let Be of g)$+=(Be-128)*(Be-128);t.onLevel(Math.min(1,Math.sqrt($/g.length)/128*4)),R=requestAnimationFrame(b)};R=requestAnimationFrame(b)}},Mt=(a,u)=>{if(d||a!==f||a.ended)return;let y=u.data??{};switch(u.type){case"run-start":a.handlerId=y.runner_data?.stt_binary_handler_id,a.ttsUrl=y.tts_output?.url,a.streamable=!!y.tts_output?.stream_response,a.pending.forEach(g=>oe(a,g)),a.pending=[],a.open||oe(a,null);break;case"stt-vad-end":G();break;case"stt-end":{G(),a.heard=!0;let g=(y.stt_output?.text??"").trim();if(t.onHeard(g),g&&is(g))return T("dismissed");t.onState("thinking");break}case"intent-progress":y.tts_start_streaming&&a.streamable&&a.ttsUrl&&ze(a,a.ttsUrl);break;case"tts-end":y.tts_output?.url&&ze(a,y.tts_output.url);break;case"error":if(G(),y.code==="stt-no-text-recognized")return a.heard||t.onHeard(""),re(a),T("quiet");a.failed=!0;break}(u.type!=="error"||y.code!=="stt-no-text-recognized")&&a.read(u),(u.type==="run-end"||u.type==="error")&&(a.ended=!0,a.unsubscribe?.().catch(()=>{}),Ne(a))},fe=a=>{if(d)return;k++;let u={open:!0,pending:a>0?[h.last(a)]:[],heard:!1,streamable:!1,ended:!1,playing:!1,failed:!1,read:Me(t),timers:[]};f=u,S=a>0?St:0,E(x&pe|Le),t.onTurn(),t.onState("listening"),u.timers.push(window.setTimeout(()=>{u===f&&u.open&&S<St&&(re(u),t.onHeard(""),T("quiet"))},Jt),window.setTimeout(G,Qt));let y={sample_rate:N};m&&(y.no_vad=!0);let g=Ie({pipeline:e.pipeline,conversationId:e.conversationId()},{start_stage:"stt",end_stage:"tts",input:y});n.connection.subscribeMessage(b=>Mt(u,b),g).then(b=>{u.unsubscribe=b,(d||u!==f||u.ended)&&b().catch(()=>{})},b=>{u!==f||d||(t.onError(b?.message||Pe({})),T("error"))})},Fe=a=>{let u=f;d||!u?.playing||(De(),t.onLevel(0),re(u),t.onInterrupted(),fe(a))},Ke=a=>{if(d||!a.length)return;h.add(a);let u=0;for(let b=0;b<a.length;b++)u+=a[b]*a[b];let y=Math.sqrt(u/a.length)/32768;f?.open&&(S=y>=es?S+a.length/N*1e3:Math.max(0,S-5)),A(a);let g=f;g?.open&&(g.handlerId===void 0?g.pending.push(a):oe(g,a))},We=()=>{document.visibilityState==="hidden"&&T("hidden")},je=async a=>{p=a.createMediaStreamSource(c);let u=a.sampleRate===N?null:new He(a.sampleRate),y=g=>{if(u)return Ke(u.push(g));let b=new Int16Array(g.length);for(let $=0;$<g.length;$++)b[$]=Et(g[$]);Ke(b)};try{let g=URL.createObjectURL(new Blob([ns],{type:"application/javascript"}));await a.audioWorklet.addModule(g),URL.revokeObjectURL(g);let b=new AudioWorkletNode(a,"kattio-mic");b.port.onmessage=$=>y($.data),l=b}catch{let g=a.createScriptProcessor(2048,1,1);g.onaudioprocess=b=>y(b.inputBuffer.getChannelData(0)),l=g}p.connect(l),l.connect(a.destination)};return(async()=>{t.onState("starting");try{c=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0,channelCount:1}})}catch(a){let u=a?.name==="NotAllowedError"||a?.name==="SecurityError";return t.onError(u?"The microphone isn't allowed here. Allow it for Home Assistant (in the browser or the app's settings).":"No microphone was found."),T("error")}if(d)return T("stopped");try{if(!r)throw new Error("no 16 kHz");await je(r)}catch{r?.close().catch(()=>{}),r=void 0,l=void 0;try{await je(s)}catch(a){return t.onError(`The microphone could not be opened: ${a?.message||a}`),T("error")}}if(!d){if(document.addEventListener("visibilitychange",We),e.turnDetection){try{K=await n.connection.subscribeMessage(ne,{type:"kattio/voice/stream"}),m=!0}catch(a){console.warn("Kattio: no turn detection:",a?.message||a?.code||a)}if(d){K?.().catch(()=>{});return}}fe(0)}})(),{stop(){T("stopped")},interrupt(){Fe(0)},done:ue}}var Ct="kattio-panel:conversation:v1",rs=100,as=24,ls=720,cs=ut(ht),O=1,ie=class extends I{constructor(){super(...arguments);this.narrow=!1;this._messages=[];this._busy=!1;this._draft="";this._settings={...C};this._settingsOpen=!1;this._wide=!1;this._dark=!1;this._conversationId=null;this._follow=!0;this._autoScroll=!1;this._behind=!1;this._smooth=!1;this._touching=!1;this._voicePhase="off";this._started=!1;this._opened=!1;this._historyOpen=!1;this._history=null;this._historyEveryone=!1;this._historyError="";this._confirmDelete=null;this._readOnly=null;this._logResize=new ResizeObserver(()=>{this._follow&&this._scrollToEnd(!1)});this._awake=new V;this._resize=new ResizeObserver(([t])=>{let{width:s,height:i}=t.contentRect;this._wide=s>=ls&&s>i*1.05});this._openHistory=()=>{this._historyOpen=!0,this._confirmDelete=null,this._loadHistory(this._historyEveryone)};this._leaveReadOnly=()=>{let t=this._ownAside;this._readOnly=null,this._ownAside=void 0,this._messages=t?.messages??[],this._conversationId=t?.conversationId??null,this._follow=!0,this._behind=!1};this._fitHeight=()=>{let t=window.visualViewport,s=t?t.offsetTop+t.height:window.innerHeight,i=this.getBoundingClientRect().top;this.style.height=`${Math.max(240,Math.round(s-Math.max(0,i)))}px`};this._onWindowKey=t=>{t.key==="Escape"&&(this._settingsOpen?this._settingsOpen=!1:this._historyOpen&&(this._historyOpen=!1))};this._appTalk=()=>{!this._opened||this._readOnly||!this._allowed||B()?.takeTalkRequest?.()&&this._voicePhase==="off"&&this._startTalk()};this._onSpeak=()=>{this._voicePhase==="off"?this._startTalk():this._talk?.stop()};this._onFaceTap=()=>{this._voicePhase==="speaking"&&this._talk?.interrupt()};this._onScroll=()=>{let t=this._log;t&&(t.scrollHeight-t.scrollTop-t.clientHeight<as?(this._follow=!0,this._autoScroll=!1,this._behind=!1):this._autoScroll||(this._follow=!1))};this._onReaderScroll=()=>{this._autoScroll=!1};this._onWheel=t=>{t.deltaY<0?this._readBack():this._autoScroll=!1};this._onTouch=()=>{this._touching=!0,this._autoScroll=!1};this._onTouchEnd=()=>{this._touching=!1,this._onScroll(),this._follow&&this._scrollToEnd(!1)};this._onLogKey=t=>{["ArrowUp","PageUp","Home"].includes(t.key)?this._readBack():this._autoScroll=!1};this._jump=()=>{this._follow=!0,this._behind=!1,this._scrollToEnd(!0)}}get _config(){return this.panel?.config??{}}get _title(){return this._config.title||"Kattio"}get _allowed(){let t=this._config.users??[];return t.length===0||!!this.hass?.user?.id&&t.includes(this.hass.user.id)}connectedCallback(){super.connectedCallback(),this._settings=gt(),this._resize.observe(this),window.addEventListener("keydown",this._onWindowKey),window.addEventListener(Ce,this._appTalk),window.addEventListener("resize",this._fitHeight),window.visualViewport?.addEventListener("resize",this._fitHeight),requestAnimationFrame(this._fitHeight)}disconnectedCallback(){super.disconnectedCallback(),this._resize.disconnect(),this._logResize.disconnect(),this._observedLog=void 0,this._talk?.stop(),window.removeEventListener("keydown",this._onWindowKey),window.removeEventListener(Ce,this._appTalk),window.removeEventListener("resize",this._fitHeight),window.visualViewport?.removeEventListener("resize",this._fitHeight),this._awake.set(!1),this._face?.destroy(),this._face=void 0}willUpdate(t){if(!this._started&&this.hass?.user?.id&&(this._started=!0,this._start().finally(()=>{this._opened=!0,this._appTalk()})),t.has("hass")||t.has("_settings")){let s=this._settings.theme;this._dark=s==="dark"||s==="auto"&&!!this.hass?.themes?.darkMode}(t.has("_settings")||t.has("_voicePhase"))&&this._awake.set(this._settings.keepAwake||this._voicePhase!=="off")}updated(t){let s=this._log;s!==this._observedLog&&(this._logResize.disconnect(),s&&this._logResize.observe(s),this._observedLog=s??void 0),t.has("_messages")&&(this._follow&&!this._touching?this._scrollToEnd(this._smooth):this._messages.length&&(this._behind=!0)),this._smooth=!1;let i=this.renderRoot.querySelector(".face");i&&!this._face?(this._face=cs(i),this._face.setDark(this._dark),this._face.setState("idle")):!i&&this._face&&(this._face.destroy(),this._face=void 0),t.has("_dark")&&(this._face?.setDark(this._dark),B()?.setTheme?.(this._dark,getComputedStyle(this).backgroundColor))}render(){return this._allowed?_`
      ${this._toolbar(!0)}
      <div class="body">
        <div class="face" aria-hidden="true" @click=${this._onFaceTap}></div>
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
                ${this._messages.length===0?this._empty():this._messages.map(t=>this._message(t))}
              </div>
            </div>
            ${this._behind?_`<button class="jump" title="Go to the newest" aria-label="Go to the newest" @click=${this._jump}>
                  <ha-icon icon="mdi:arrow-down"></ha-icon>
                </button>`:v}
          </div>
          ${this._readOnly?this._readOnlyBar():this._composer()}
        </div>
      </div>
      ${this._settingsOpen?this._settingsSheet():v} ${this._historyOpen?this._historySheet():v}
    `:_`
        ${this._toolbar(!1)}
        <div class="denied">${this._title} is not set up for you. Ask whoever runs this Home Assistant.</div>
      `}_toolbar(t){return _`<div class="toolbar">
      <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
      <div class="title">${this._title}</div>
      ${t&&this._settings.history?_`<button class="icon" title="Conversations" aria-label="Conversations" @click=${this._openHistory}>
            <ha-icon icon="mdi:history"></ha-icon>
          </button>`:v}
      ${t?_`<button
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
            </button>`:v}
    </div>`}get _defaultGreeting(){return`Hi, I'm ${this._title}.
Write or talk to me below. You can pet me too.`}_empty(){let t=this._settings.greeting.trim()||this._defaultGreeting,[s,...i]=t.split(`
`);return _`<div class="empty">
      <div class="empty-title">${s}</div>
      ${i.length?_`<div class="empty-text">${i.join(`
`).trim()}</div>`:v}
    </div>`}_message(t){let s=t.role==="user"?"Listening":"Thinking";return _`<div class="msg ${t.role}">${t.text||(t.pending?_`<span class="dots" aria-label=${s}><i></i><i></i><i></i></span>`:v)}</div>`}_composer(){let t=!this._busy&&!!this._draft.trim(),s=this._voicePhase,i=At(),[o,r]=s==="off"?["mdi:microphone",i?`Talk with ${this._title}`:"Talking needs the microphone, which this browser doesn't allow here"]:s==="listening"?["mdi:microphone","End the conversation"]:["mdi:stop","End the conversation"];return _`<div class="composer">
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
        <button class="icon small send" title="Send" aria-label="Send" ?disabled=${!t} @click=${this._send}>
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
    </div>`}_settingsSheet(){let t=this._settings,s=(i,o,r,c=!1)=>_`<button
        class="choice ${t[i]===o?"on":""}"
        role="radio"
        aria-checked=${t[i]===o?"true":"false"}
        ?disabled=${c}
        @click=${()=>this._set(i,o)}
      >
        ${r}
      </button>`;return _`<div class="scrim" @click=${()=>this._settingsOpen=!1}></div>
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
            ${t.start==="speak"?_`A wake word comes in a later version. Until then the page opens in text mode: tap the
                  microphone to start talking (it listens again after every answer, until you're quiet or say
                  "bye bye").`:_`Opens quietly: nothing is said out loud, and the microphone stays off until you tap it.`}
          </div>
        </div>
        <div class="setting">
          <label class="label" for="greeting">Greeting</label>
          <textarea
            id="greeting"
            rows="3"
            maxlength=${Oe}
            placeholder=${this._defaultGreeting}
            .value=${t.greeting}
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
        <label class="setting toggle sub ${t.resume?"":"off"}">
          <div>
            <div class="label">From any device</div>
            <div class="note">
              ${t.history?"Your most recent conversation, wherever it was. Off: the last one on this device.":"Needs the conversation history."}
            </div>
          </div>
          ${this._switch("resumeAnyDevice",!t.resume||!t.history)}
        </label>
        <label class="setting toggle">
          <div>
            <div class="label">Keep the screen on</div>
            <div class="note">
              ${V.supported?"While this page is open, for a tablet on the wall.":"This browser can't keep the screen on."}
            </div>
          </div>
          <input
            type="checkbox"
            role="switch"
            .checked=${t.keepAwake}
            ?disabled=${!V.supported}
            @change=${i=>this._set("keepAwake",i.target.checked)}
          />
        </label>
        <div class="sheet-foot">Kept on this device only, in this browser.</div>
      </div>`}_switch(t,s=!1){return _`<input
      type="checkbox"
      role="switch"
      .checked=${this._settings[t]&&!s}
      ?disabled=${s}
      @change=${i=>this._set(t,i.target.checked)}
    />`}_readOnlyBar(){return _`<div class="readonly">
      <ha-icon icon="mdi:eye-outline"></ha-icon>
      <div class="readonly-text">${this._readOnly.name||"Someone else"}'s conversation, read only</div>
      <button class="pill" @click=${this._leaveReadOnly}>Back to mine</button>
    </div>`}_historySheet(){let t=!!this.hass?.user?.is_admin,s=this._history;return _`<div class="scrim" @click=${()=>this._historyOpen=!1}></div>
      <div class="sheet history" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div class="sheet-head">
          <div id="history-title" class="sheet-title">Conversations</div>
          <button class="icon" aria-label="Close" title="Close" @click=${()=>this._historyOpen=!1}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        ${t?_`<div class="choices" role="radiogroup" aria-label="Whose">
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
            </div>`:v}
        <div class="convs">
          ${this._historyError?_`<div class="conv-empty">${this._historyError}</div>`:s===null?_`<div class="conv-empty">Loading…</div>`:s.length===0?_`<div class="conv-empty">No conversations yet.</div>`:s.map(i=>this._conversationRow(i))}
        </div>
        <div class="sheet-foot">The 20 most recent are kept for each person.</div>
      </div>`}_conversationRow(t){let s=t.id===this._conversationId&&!this._readOnly,i=this._confirmDelete===t.id;return _`<div class="conv ${s?"current":""}">
      <button class="conv-open" @click=${()=>this._openConversation(t)}>
        <div class="conv-title">${t.title||"Untitled"}</div>
        <div class="conv-meta">
          ${t.mine?v:_`<span class="conv-who">${t.user_name||"Someone"}</span> · `}${wt(t.updated)}
          · ${Math.ceil(t.count/2)} ${t.count>2?"questions":"question"}${s?" \xB7 open now":""}
        </div>
      </button>
      ${i?_`<button class="pill danger" @click=${()=>this._delete(t)}>Delete</button>`:_`<button
            class="icon small"
            title="Delete"
            aria-label="Delete ${t.title}"
            @click=${()=>this._confirmDelete=t.id}
          >
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>`}
    </div>`}async _loadHistory(t){this._historyEveryone=t,this._history=null,this._historyError="",this._confirmDelete=null;try{this._history=await bt(this.hass,t)}catch(s){this._historyError=s?.code==="unknown_command"?"The history needs a newer version of the Kattio integration.":s?.message||"The conversations could not be loaded."}}async _openConversation(t){if(this._busy)return;this._confirmDelete=null;let s;try{s=await Re(this.hass,t.id)}catch(i){this._historyError=i?.message||"The conversation could not be opened.";return}if(!s){this._historyError="That conversation is gone.";return}if(this._historyOpen=!1,!s.mine){this._readOnly||(this._ownAside={messages:this._messages,conversationId:this._conversationId}),this._readOnly={name:s.user_name},this._show({conversationId:null,messages:s.messages});return}this._readOnly=null,this._ownAside=void 0,this._show({conversationId:s.id,messages:s.messages}),this._save(!1)}async _delete(t){this._confirmDelete=null;try{await kt(this.hass,t.id)}catch(s){this._historyError=s?.message||"The conversation could not be deleted.";return}this._history=(this._history??[]).filter(s=>s.id!==t.id),t.id===this._conversationId&&!this._readOnly&&this._newConversation()}_set(t,s){this._settings={...this._settings,[t]:s},mt(this._settings)}_onKey(t){t.key==="Enter"&&!t.isComposing&&(t.preventDefault(),this._send())}async _send(){let t=this._draft.trim();if(!t||this._busy||!this.hass)return;this._draft="",this._busy=!0;let s={id:O++,role:"assistant",text:"",pending:!0};this._smooth=!0,this._follow=!0,this._behind=!1,this._messages=[...this._messages,{id:O++,role:"user",text:t},s],this._face?.setState("thinking");let i=()=>this._messages=[...this._messages];await dt(this.hass,t,{pipeline:this._config.pipeline,conversationId:this._ensureConversationId()},{onText:(o,r)=>{s.text+=(r&&s.text?`

`:"")+o,this._face?.setState("speaking"),o&&this._face?.setLevel(.45+Math.random()*.4),i()},onDone:({speech:o,conversationId:r})=>{s.text.trim()||(s.text=o),s.pending=!1,this._conversationId=r??this._conversationId,this._face?.setState("idle"),i()},onError:o=>{s.pending=!1,s.text||(this._messages=this._messages.filter(r=>r!==s)),this._messages=[...this._messages,{id:O++,role:"error",text:o}],this._face?.setState("error")}}),this._busy=!1,this._save()}_startTalk(){if(this._busy||!this.hass||this._talk)return;this._busy=!0,this._voicePhase="starting",this._smooth=!0,this._follow=!0,this._behind=!1;let t,s,i=!1,o=()=>this._messages=[...this._messages],r=()=>(s||(s={id:O++,role:"assistant",text:"",pending:!0},this._messages=[...this._messages,s]),s),c=()=>{this._messages=this._messages.filter(l=>!l.pending||l.text).map(l=>l.pending?{...l,pending:!1}:l)};this._talk=Tt(this.hass,{pipeline:this._config.pipeline,conversationId:()=>this._ensureConversationId(),turnDetection:!!this._config.turn_detection},{onState:l=>{this._voicePhase=l,l!=="starting"?this._face?.setState(l):this._face?.setState("listening")},onTurn:()=>{c(),t={id:O++,role:"user",text:"",pending:!0},s=void 0,this._messages=[...this._messages,t]},onHeard:l=>{t&&(l?(t.text=l,t.pending=!1,r(),o()):this._messages=this._messages.filter(p=>p!==t))},onText:(l,p)=>{let h=r();h.text+=(p&&h.text?`

`:"")+l,o()},onDone:({speech:l,conversationId:p})=>{let h=r();h.text.trim()||(h.text=l),h.pending=!1,h.text.trim()||(this._messages=this._messages.filter(d=>d!==h)),this._conversationId=p??this._conversationId,o(),this._save()},onError:l=>{i=!0,c(),this._messages=[...this._messages,{id:O++,role:"error",text:l}],this._face?.setState("error")},onInterrupted:()=>{s&&(s.text=s.text.trimEnd()+" \u2026",s.pending=!1,o())},onLevel:l=>this._face?.setLevel(l),onEnd:l=>{let p=!!t?.text&&!!s?.pending;c(),l==="stopped"&&p&&(this._messages=[...this._messages,{id:O++,role:"note",text:"Stopped."}]),i||this._face?.setState("idle"),this._talk=void 0,this._voicePhase="off",this._busy=!1,this._save()}})}_ensureConversationId(){return this._conversationId??=$t(),this._conversationId}_newConversation(){this._readOnly=null,this._ownAside=void 0,this._messages=[],this._follow=!0,this._behind=!1,this._conversationId=null,this._face?.setState("idle"),this._save()}get _log(){return this.renderRoot?.querySelector(".messages")??null}_scrollToEnd(t){let s=this._log;s&&(s.scrollHeight-s.scrollTop-s.clientHeight<1||(this._autoScroll=!0,s.scrollTo({top:s.scrollHeight,behavior:t?"smooth":"auto"})))}_readBack(){this._autoScroll=!1,this._follow=!1}_save(t=!0){if(this._readOnly)return;let s=this.hass?.user?.id??"",i=this._messages.filter(r=>!r.pending).slice(-rs).map(({role:r,text:c})=>({role:r,text:c})),o={conversationId:this._conversationId,messages:i};try{sessionStorage.setItem(Ct,JSON.stringify({userId:s,...o}))}catch{}s&&(yt(s,o),t&&this._settings.history&&this._conversationId&&i.length&&xt(this.hass,this._conversationId,i).catch(r=>console.warn("Kattio: the conversation was not kept in Home Assistant",r)))}async _start(){let t=this.hass.user.id;try{let o=JSON.parse(sessionStorage.getItem(Ct)||"null");if(o&&o.userId===t&&Array.isArray(o.messages)){this._show(o);return}}catch{}let s=this._settings;if(!s.resume)return;if(s.resumeAnyDevice&&s.history)try{let o=await Re(this.hass);o?.mine&&!this._messages.length&&(this._show({conversationId:o.id,messages:o.messages}),this._save(!1));return}catch(o){console.warn("Kattio: the most recent conversation could not be loaded; this device's last instead",o)}let i=_t(t);i&&!this._messages.length&&this._show(i)}_show(t){this._messages=t.messages.filter(s=>s&&typeof s.text=="string"&&["user","assistant","note","error"].includes(s.role)).map(s=>({id:O++,role:s.role,text:s.text})),this._conversationId=t.conversationId??null,this._follow=!0,this._behind=!1,this._face?.setState("idle")}};ie.properties={hass:{attribute:!1},narrow:{type:Boolean},panel:{attribute:!1},_messages:{state:!0},_busy:{state:!0},_draft:{state:!0},_settings:{state:!0},_settingsOpen:{state:!0},_behind:{state:!0},_historyOpen:{state:!0},_history:{state:!0},_historyEveryone:{state:!0},_historyError:{state:!0},_confirmDelete:{state:!0},_readOnly:{state:!0},_voicePhase:{state:!0},_wide:{type:Boolean,reflect:!0,attribute:"wide"},_dark:{type:Boolean,reflect:!0,attribute:"dark"}},ie.styles=me`
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
  `;customElements.get("kattio-panel")||customElements.define("kattio-panel",ie);
