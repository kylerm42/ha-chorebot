function t(t,e,r,o){var i,a=arguments.length,n=a<3?e:null===o?o=Object.getOwnPropertyDescriptor(e,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,r,o);else for(var s=t.length-1;s>=0;s--)(i=t[s])&&(n=(a<3?i(n):a>3?i(e,r,n):i(e,r))||n);return a>3&&n&&Object.defineProperty(e,r,n),n}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,r=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),i=new WeakMap;let a=class{constructor(t,e,r){if(this._$cssResult$=!0,r!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(r&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=i.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&i.set(e,t))}return t}toString(){return this.cssText}};const n=r?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new a("string"==typeof t?t:t+"",void 0,o))(e)})(t):t,{is:s,defineProperty:d,getOwnPropertyDescriptor:c,getOwnPropertyNames:l,getOwnPropertySymbols:h,getPrototypeOf:p}=Object,u=globalThis,f=u.trustedTypes,m=f?f.emptyScript:"",g=u.reactiveElementPolyfillSupport,w=(t,e)=>t,_={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},b=(t,e)=>!s(t,e),v={attribute:!0,type:String,converter:_,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let y=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=v){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),o=this.getPropertyDescriptor(t,r,e);void 0!==o&&d(this.prototype,t,o)}}static getPropertyDescriptor(t,e,r){const{get:o,set:i}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:o,set(e){const a=o?.call(this);i?.call(this,e),this.requestUpdate(t,a,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??v}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const t=this.properties,e=[...l(t),...h(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(n(t))}else void 0!==t&&e.push(n(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,o)=>{if(r)t.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const r of o){const o=document.createElement("style"),i=e.litNonce;void 0!==i&&o.setAttribute("nonce",i),o.textContent=r.cssText,t.appendChild(o)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,r);if(void 0!==o&&!0===r.reflect){const i=(void 0!==r.converter?.toAttribute?r.converter:_).toAttribute(e,r.type);this._$Em=t,null==i?this.removeAttribute(o):this.setAttribute(o,i),this._$Em=null}}_$AK(t,e){const r=this.constructor,o=r._$Eh.get(t);if(void 0!==o&&this._$Em!==o){const t=r.getPropertyOptions(o),i="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:_;this._$Em=o;const a=i.fromAttribute(e,t.type);this[o]=a??this._$Ej?.get(o)??a,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const o=this.constructor,i=this[t];if(r??=o.getPropertyOptions(t),!((r.hasChanged??b)(i,e)||r.useDefault&&r.reflect&&i===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:o,wrapped:i},a){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,a??e??this[t]),!0!==i||void 0!==a)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===o&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,o=this[e];!0!==t||this._$AL.has(e)||void 0===o||this.C(e,void 0,r,o)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[w("elementProperties")]=new Map,y[w("finalized")]=new Map,g?.({ReactiveElement:y}),(u.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,$=x.trustedTypes,A=$?$.createPolicy("lit-html",{createHTML:t=>t}):void 0,M="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,R="?"+C,E=`<${R}>`,S=document,k=()=>S.createComment(""),P=t=>null===t||"object"!=typeof t&&"function"!=typeof t,O=Array.isArray,T="[ \t\n\f\r]",I=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,N=/-->/g,U=/>/g,D=RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,H=/"/g,z=/^(?:script|style|textarea|title)$/i,B=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),j=Symbol.for("lit-noChange"),L=Symbol.for("lit-nothing"),q=new WeakMap,W=S.createTreeWalker(S,129);function V(t,e){if(!O(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(e):e}const Z=(t,e)=>{const r=t.length-1,o=[];let i,a=2===e?"<svg>":3===e?"<math>":"",n=I;for(let e=0;e<r;e++){const r=t[e];let s,d,c=-1,l=0;for(;l<r.length&&(n.lastIndex=l,d=n.exec(r),null!==d);)l=n.lastIndex,n===I?"!--"===d[1]?n=N:void 0!==d[1]?n=U:void 0!==d[2]?(z.test(d[2])&&(i=RegExp("</"+d[2],"g")),n=D):void 0!==d[3]&&(n=D):n===D?">"===d[0]?(n=i??I,c=-1):void 0===d[1]?c=-2:(c=n.lastIndex-d[2].length,s=d[1],n=void 0===d[3]?D:'"'===d[3]?H:F):n===H||n===F?n=D:n===N||n===U?n=I:(n=D,i=void 0);const h=n===D&&t[e+1].startsWith("/>")?" ":"";a+=n===I?r+E:c>=0?(o.push(s),r.slice(0,c)+M+r.slice(c)+C+h):r+C+(-2===c?e:h)}return[V(t,a+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),o]};class Y{constructor({strings:t,_$litType$:e},r){let o;this.parts=[];let i=0,a=0;const n=t.length-1,s=this.parts,[d,c]=Z(t,e);if(this.el=Y.createElement(d,r),W.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(o=W.nextNode())&&s.length<n;){if(1===o.nodeType){if(o.hasAttributes())for(const t of o.getAttributeNames())if(t.endsWith(M)){const e=c[a++],r=o.getAttribute(t).split(C),n=/([.?@])?(.*)/.exec(e);s.push({type:1,index:i,name:n[2],strings:r,ctor:"."===n[1]?Q:"?"===n[1]?tt:"@"===n[1]?et:K}),o.removeAttribute(t)}else t.startsWith(C)&&(s.push({type:6,index:i}),o.removeAttribute(t));if(z.test(o.tagName)){const t=o.textContent.split(C),e=t.length-1;if(e>0){o.textContent=$?$.emptyScript:"";for(let r=0;r<e;r++)o.append(t[r],k()),W.nextNode(),s.push({type:2,index:++i});o.append(t[e],k())}}}else if(8===o.nodeType)if(o.data===R)s.push({type:2,index:i});else{let t=-1;for(;-1!==(t=o.data.indexOf(C,t+1));)s.push({type:7,index:i}),t+=C.length-1}i++}}static createElement(t,e){const r=S.createElement("template");return r.innerHTML=t,r}}function X(t,e,r=t,o){if(e===j)return e;let i=void 0!==o?r._$Co?.[o]:r._$Cl;const a=P(e)?void 0:e._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),void 0===a?i=void 0:(i=new a(t),i._$AT(t,r,o)),void 0!==o?(r._$Co??=[])[o]=i:r._$Cl=i),void 0!==i&&(e=X(t,i._$AS(t,e.values),i,o)),e}class G{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,o=(t?.creationScope??S).importNode(e,!0);W.currentNode=o;let i=W.nextNode(),a=0,n=0,s=r[0];for(;void 0!==s;){if(a===s.index){let e;2===s.type?e=new J(i,i.nextSibling,this,t):1===s.type?e=new s.ctor(i,s.name,s.strings,this,t):6===s.type&&(e=new rt(i,this,t)),this._$AV.push(e),s=r[++n]}a!==s?.index&&(i=W.nextNode(),a++)}return W.currentNode=S,o}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class J{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,o){this.type=2,this._$AH=L,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=X(this,t,e),P(t)?t===L||null==t||""===t?(this._$AH!==L&&this._$AR(),this._$AH=L):t!==this._$AH&&t!==j&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>O(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==L&&P(this._$AH)?this._$AA.nextSibling.data=t:this.T(S.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,o="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=Y.createElement(V(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===o)this._$AH.p(e);else{const t=new G(o,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new Y(t)),e}k(t){O(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,o=0;for(const i of t)o===e.length?e.push(r=new J(this.O(k()),this.O(k()),this,this.options)):r=e[o],r._$AI(i),o++;o<e.length&&(this._$AR(r&&r._$AB.nextSibling,o),e.length=o)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class K{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,o,i){this.type=1,this._$AH=L,this._$AN=void 0,this.element=t,this.name=e,this._$AM=o,this.options=i,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=L}_$AI(t,e=this,r,o){const i=this.strings;let a=!1;if(void 0===i)t=X(this,t,e,0),a=!P(t)||t!==this._$AH&&t!==j,a&&(this._$AH=t);else{const o=t;let n,s;for(t=i[0],n=0;n<i.length-1;n++)s=X(this,o[r+n],e,n),s===j&&(s=this._$AH[n]),a||=!P(s)||s!==this._$AH[n],s===L?t=L:t!==L&&(t+=(s??"")+i[n+1]),this._$AH[n]=s}a&&!o&&this.j(t)}j(t){t===L?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Q extends K{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===L?void 0:t}}class tt extends K{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==L)}}class et extends K{constructor(t,e,r,o,i){super(t,e,r,o,i),this.type=5}_$AI(t,e=this){if((t=X(this,t,e,0)??L)===j)return;const r=this._$AH,o=t===L&&r!==L||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,i=t!==L&&(r===L||o);o&&this.element.removeEventListener(this.name,this,r),i&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){X(this,t)}}const ot=x.litHtmlPolyfillSupport;ot?.(Y,J),(x.litHtmlVersions??=[]).push("3.3.1");const it=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class at extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const o=r?.renderBefore??e;let i=o._$litPart$;if(void 0===i){const t=r?.renderBefore??null;o._$litPart$=i=new J(e.insertBefore(k(),t),t,void 0,r??{})}return i._$AI(t),i})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return j}}at._$litElement$=!0,at.finalized=!0,it.litElementHydrateSupport?.({LitElement:at});const nt=it.litElementPolyfillSupport;nt?.({LitElement:at}),(it.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const st={attribute:!0,type:String,converter:_,reflect:!1,hasChanged:b},dt=(t=st,e,r)=>{const{kind:o,metadata:i}=r;let a=globalThis.litPropertyMetadata.get(i);if(void 0===a&&globalThis.litPropertyMetadata.set(i,a=new Map),"setter"===o&&((t=Object.create(t)).wrapped=!0),a.set(r.name,t),"accessor"===o){const{name:o}=r;return{set(r){const i=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,i,t)},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===o){const{name:o}=r;return function(r){const i=this[o];e.call(this,r),this.requestUpdate(o,i,t)}}throw Error("Unsupported decorator location: "+o)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ct(t){return(e,r)=>"object"==typeof r?dt(t,e,r):((t,e,r)=>{const o=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),o?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function lt(t){return ct({...t,state:!0,attribute:!1})}var ht={};!function t(e,r,o,i){var a=!!(e.Worker&&e.Blob&&e.Promise&&e.OffscreenCanvas&&e.OffscreenCanvasRenderingContext2D&&e.HTMLCanvasElement&&e.HTMLCanvasElement.prototype.transferControlToOffscreen&&e.URL&&e.URL.createObjectURL),n="function"==typeof Path2D&&"function"==typeof DOMMatrix,s=function(){if(!e.OffscreenCanvas)return!1;try{var t=new OffscreenCanvas(1,1),r=t.getContext("2d");r.fillRect(0,0,1,1);var o=t.transferToImageBitmap();r.createPattern(o,"no-repeat")}catch(t){return!1}return!0}();function d(){}function c(t){var o=r.exports.Promise,i=void 0!==o?o:e.Promise;return"function"==typeof i?new i(t):(t(d,d),null)}var l,h,p,u,f,m,g,w,_,b,v,y=(l=s,h=new Map,{transform:function(t){if(l)return t;if(h.has(t))return h.get(t);var e=new OffscreenCanvas(t.width,t.height);return e.getContext("2d").drawImage(t,0,0),h.set(t,e),e},clear:function(){h.clear()}}),x=(f=Math.floor(1e3/60),m={},g=0,"function"==typeof requestAnimationFrame&&"function"==typeof cancelAnimationFrame?(p=function(t){var e=Math.random();return m[e]=requestAnimationFrame(function r(o){g===o||g+f-1<o?(g=o,delete m[e],t()):m[e]=requestAnimationFrame(r)}),e},u=function(t){m[t]&&cancelAnimationFrame(m[t])}):(p=function(t){return setTimeout(t,f)},u=function(t){return clearTimeout(t)}),{frame:p,cancel:u}),$=(b={},function(){if(w)return w;if(!o&&a){var e=["var CONFETTI, SIZE = {}, module = {};","("+t.toString()+")(this, module, true, SIZE);","onmessage = function(msg) {","  if (msg.data.options) {","    CONFETTI(msg.data.options).then(function () {","      if (msg.data.callback) {","        postMessage({ callback: msg.data.callback });","      }","    });","  } else if (msg.data.reset) {","    CONFETTI && CONFETTI.reset();","  } else if (msg.data.resize) {","    SIZE.width = msg.data.resize.width;","    SIZE.height = msg.data.resize.height;","  } else if (msg.data.canvas) {","    SIZE.width = msg.data.canvas.width;","    SIZE.height = msg.data.canvas.height;","    CONFETTI = module.exports.create(msg.data.canvas);","  }","}"].join("\n");try{w=new Worker(URL.createObjectURL(new Blob([e])))}catch(t){return"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("🎊 Could not load worker",t),null}!function(t){function e(e,r){t.postMessage({options:e||{},callback:r})}t.init=function(e){var r=e.transferControlToOffscreen();t.postMessage({canvas:r},[r])},t.fire=function(r,o,i){if(_)return e(r,null),_;var a=Math.random().toString(36).slice(2);return _=c(function(o){function n(e){e.data.callback===a&&(delete b[a],t.removeEventListener("message",n),_=null,y.clear(),i(),o())}t.addEventListener("message",n),e(r,a),b[a]=n.bind(null,{data:{callback:a}})})},t.reset=function(){for(var e in t.postMessage({reset:!0}),b)b[e](),delete b[e]}}(w)}return w}),A={particleCount:50,angle:90,spread:45,startVelocity:45,decay:.9,gravity:1,drift:0,ticks:200,x:.5,y:.5,shapes:["square","circle"],zIndex:100,colors:["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffa62d","#ff36ff"],disableForReducedMotion:!1,scalar:1};function M(t,e,r){return function(t,e){return e?e(t):t}(t&&null!=t[e]?t[e]:A[e],r)}function C(t){return t<0?0:Math.floor(t)}function R(t,e){return Math.floor(Math.random()*(e-t))+t}function E(t){return parseInt(t,16)}function S(t){return t.map(k)}function k(t){var e=String(t).replace(/[^0-9a-f]/gi,"");return e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]),{r:E(e.substring(0,2)),g:E(e.substring(2,4)),b:E(e.substring(4,6))}}function P(t){t.width=document.documentElement.clientWidth,t.height=document.documentElement.clientHeight}function O(t){var e=t.getBoundingClientRect();t.width=e.width,t.height=e.height}function T(t){var e=t.angle*(Math.PI/180),r=t.spread*(Math.PI/180);return{x:t.x,y:t.y,wobble:10*Math.random(),wobbleSpeed:Math.min(.11,.1*Math.random()+.05),velocity:.5*t.startVelocity+Math.random()*t.startVelocity,angle2D:-e+(.5*r-Math.random()*r),tiltAngle:(.5*Math.random()+.25)*Math.PI,color:t.color,shape:t.shape,tick:0,totalTicks:t.ticks,decay:t.decay,drift:t.drift,random:Math.random()+2,tiltSin:0,tiltCos:0,wobbleX:0,wobbleY:0,gravity:3*t.gravity,ovalScalar:.6,scalar:t.scalar,flat:t.flat}}function I(t,e){e.x+=Math.cos(e.angle2D)*e.velocity+e.drift,e.y+=Math.sin(e.angle2D)*e.velocity+e.gravity,e.velocity*=e.decay,e.flat?(e.wobble=0,e.wobbleX=e.x+10*e.scalar,e.wobbleY=e.y+10*e.scalar,e.tiltSin=0,e.tiltCos=0,e.random=1):(e.wobble+=e.wobbleSpeed,e.wobbleX=e.x+10*e.scalar*Math.cos(e.wobble),e.wobbleY=e.y+10*e.scalar*Math.sin(e.wobble),e.tiltAngle+=.1,e.tiltSin=Math.sin(e.tiltAngle),e.tiltCos=Math.cos(e.tiltAngle),e.random=Math.random()+2);var r=e.tick++/e.totalTicks,o=e.x+e.random*e.tiltCos,i=e.y+e.random*e.tiltSin,a=e.wobbleX+e.random*e.tiltCos,s=e.wobbleY+e.random*e.tiltSin;if(t.fillStyle="rgba("+e.color.r+", "+e.color.g+", "+e.color.b+", "+(1-r)+")",t.beginPath(),n&&"path"===e.shape.type&&"string"==typeof e.shape.path&&Array.isArray(e.shape.matrix))t.fill(function(t,e,r,o,i,a,n){var s=new Path2D(t),d=new Path2D;d.addPath(s,new DOMMatrix(e));var c=new Path2D;return c.addPath(d,new DOMMatrix([Math.cos(n)*i,Math.sin(n)*i,-Math.sin(n)*a,Math.cos(n)*a,r,o])),c}(e.shape.path,e.shape.matrix,e.x,e.y,.1*Math.abs(a-o),.1*Math.abs(s-i),Math.PI/10*e.wobble));else if("bitmap"===e.shape.type){var d=Math.PI/10*e.wobble,c=.1*Math.abs(a-o),l=.1*Math.abs(s-i),h=e.shape.bitmap.width*e.scalar,p=e.shape.bitmap.height*e.scalar,u=new DOMMatrix([Math.cos(d)*c,Math.sin(d)*c,-Math.sin(d)*l,Math.cos(d)*l,e.x,e.y]);u.multiplySelf(new DOMMatrix(e.shape.matrix));var f=t.createPattern(y.transform(e.shape.bitmap),"no-repeat");f.setTransform(u),t.globalAlpha=1-r,t.fillStyle=f,t.fillRect(e.x-h/2,e.y-p/2,h,p),t.globalAlpha=1}else if("circle"===e.shape)t.ellipse?t.ellipse(e.x,e.y,Math.abs(a-o)*e.ovalScalar,Math.abs(s-i)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI):function(t,e,r,o,i,a,n,s,d){t.save(),t.translate(e,r),t.rotate(a),t.scale(o,i),t.arc(0,0,1,n,s,d),t.restore()}(t,e.x,e.y,Math.abs(a-o)*e.ovalScalar,Math.abs(s-i)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI);else if("star"===e.shape)for(var m=Math.PI/2*3,g=4*e.scalar,w=8*e.scalar,_=e.x,b=e.y,v=5,x=Math.PI/v;v--;)_=e.x+Math.cos(m)*w,b=e.y+Math.sin(m)*w,t.lineTo(_,b),m+=x,_=e.x+Math.cos(m)*g,b=e.y+Math.sin(m)*g,t.lineTo(_,b),m+=x;else t.moveTo(Math.floor(e.x),Math.floor(e.y)),t.lineTo(Math.floor(e.wobbleX),Math.floor(i)),t.lineTo(Math.floor(a),Math.floor(s)),t.lineTo(Math.floor(o),Math.floor(e.wobbleY));return t.closePath(),t.fill(),e.tick<e.totalTicks}function N(t,r){var n,s=!t,d=!!M(r||{},"resize"),l=!1,h=M(r,"disableForReducedMotion",Boolean),p=a&&!!M(r||{},"useWorker")?$():null,u=s?P:O,f=!(!t||!p)&&!!t.__confetti_initialized,m="function"==typeof matchMedia&&matchMedia("(prefers-reduced-motion)").matches;function g(e,r,a){for(var s=M(e,"particleCount",C),d=M(e,"angle",Number),l=M(e,"spread",Number),h=M(e,"startVelocity",Number),p=M(e,"decay",Number),f=M(e,"gravity",Number),m=M(e,"drift",Number),g=M(e,"colors",S),w=M(e,"ticks",Number),_=M(e,"shapes"),b=M(e,"scalar"),v=!!M(e,"flat"),$=function(t){var e=M(t,"origin",Object);return e.x=M(e,"x",Number),e.y=M(e,"y",Number),e}(e),A=s,E=[],k=t.width*$.x,P=t.height*$.y;A--;)E.push(T({x:k,y:P,angle:d,spread:l,startVelocity:h,color:g[A%g.length],shape:_[R(0,_.length)],ticks:w,decay:p,gravity:f,drift:m,scalar:b,flat:v}));return n?n.addFettis(E):(n=function(t,e,r,a,n){var s,d,l=e.slice(),h=t.getContext("2d"),p=c(function(e){function c(){s=d=null,h.clearRect(0,0,a.width,a.height),y.clear(),n(),e()}s=x.frame(function e(){!o||a.width===i.width&&a.height===i.height||(a.width=t.width=i.width,a.height=t.height=i.height),a.width||a.height||(r(t),a.width=t.width,a.height=t.height),h.clearRect(0,0,a.width,a.height),(l=l.filter(function(t){return I(h,t)})).length?s=x.frame(e):c()}),d=c});return{addFettis:function(t){return l=l.concat(t),p},canvas:t,promise:p,reset:function(){s&&x.cancel(s),d&&d()}}}(t,E,u,r,a),n.promise)}function w(r){var o=h||M(r,"disableForReducedMotion",Boolean),i=M(r,"zIndex",Number);if(o&&m)return c(function(t){t()});s&&n?t=n.canvas:s&&!t&&(t=function(t){var e=document.createElement("canvas");return e.style.position="fixed",e.style.top="0px",e.style.left="0px",e.style.pointerEvents="none",e.style.zIndex=t,e}(i),document.body.appendChild(t)),d&&!f&&u(t);var a={width:t.width,height:t.height};function w(){if(p){var e={getBoundingClientRect:function(){if(!s)return t.getBoundingClientRect()}};return u(e),void p.postMessage({resize:{width:e.width,height:e.height}})}a.width=a.height=null}function _(){n=null,d&&(l=!1,e.removeEventListener("resize",w)),s&&t&&(document.body.contains(t)&&document.body.removeChild(t),t=null,f=!1)}return p&&!f&&p.init(t),f=!0,p&&(t.__confetti_initialized=!0),d&&!l&&(l=!0,e.addEventListener("resize",w,!1)),p?p.fire(r,a,_):g(r,a,_)}return w.reset=function(){p&&p.reset(),n&&n.reset()},w}function U(){return v||(v=N(null,{useWorker:!0,resize:!0})),v}r.exports=function(){return U().apply(this,arguments)},r.exports.reset=function(){U().reset()},r.exports.create=N,r.exports.shapeFromPath=function(t){if(!n)throw new Error("path confetti are not supported in this browser");var e,r;"string"==typeof t?e=t:(e=t.path,r=t.matrix);var o=new Path2D(e),i=document.createElement("canvas").getContext("2d");if(!r){for(var a,s,d=1e3,c=d,l=d,h=0,p=0,u=0;u<d;u+=2)for(var f=0;f<d;f+=2)i.isPointInPath(o,u,f,"nonzero")&&(c=Math.min(c,u),l=Math.min(l,f),h=Math.max(h,u),p=Math.max(p,f));a=h-c,s=p-l;var m=Math.min(10/a,10/s);r=[m,0,0,m,-Math.round(a/2+c)*m,-Math.round(s/2+l)*m]}return{type:"path",path:e,matrix:r}},r.exports.shapeFromText=function(t){var e,r=1,o="#000000",i='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';"string"==typeof t?e=t:(e=t.text,r="scalar"in t?t.scalar:r,i="fontFamily"in t?t.fontFamily:i,o="color"in t?t.color:o);var a=10*r,n=a+"px "+i,s=new OffscreenCanvas(a,a),d=s.getContext("2d");d.font=n;var c=d.measureText(e),l=Math.ceil(c.actualBoundingBoxRight+c.actualBoundingBoxLeft),h=Math.ceil(c.actualBoundingBoxAscent+c.actualBoundingBoxDescent),p=c.actualBoundingBoxLeft+2,u=c.actualBoundingBoxAscent+2;l+=4,h+=4,(d=(s=new OffscreenCanvas(l,h)).getContext("2d")).font=n,d.fillStyle=o,d.fillText(e,p,u);var f=1/r;return{type:"bitmap",bitmap:s.transferToImageBitmap(),matrix:[f,0,0,f,-l*f/2,-h*f/2]}}}(function(){return"undefined"!=typeof window?window:"undefined"!=typeof self?self:this||{}}(),ht,!1);var pt=ht.exports;function ut(t,e){if(t.startsWith("var(")){const e=getComputedStyle(document.documentElement).getPropertyValue(t.slice(4,-1).trim());if(!e)return t;t=e.trim()}let r,o,i;if(t.startsWith("#")){const e=t.replace("#","");r=parseInt(e.substring(0,2),16),o=parseInt(e.substring(2,4),16),i=parseInt(e.substring(4,6),16)}else{if(!t.startsWith("rgb"))return t;{const e=t.match(/\d+/g);if(!e)return t;[r,o,i]=e.map(Number)}}r/=255,o/=255,i/=255;const a=Math.max(r,o,i),n=Math.min(r,o,i);let s=0,d=0,c=(a+n)/2;if(a!==n){const t=a-n;switch(d=c>.5?t/(2-a-n):t/(a+n),a){case r:s=((o-i)/t+(o<i?6:0))/6;break;case o:s=((i-r)/t+2)/6;break;case i:s=((r-o)/t+4)/6}}c=e>0?Math.max(0,Math.min(.95,c+e/100*(1-c))):Math.max(.05,c+e/100*c);const l=(t,e,r)=>(r<0&&(r+=1),r>1&&(r-=1),r<1/6?t+6*(e-t)*r:r<.5?e:r<2/3?t+(e-t)*(2/3-r)*6:t);let h,p,u;if(0===d)h=p=u=c;else{const t=c<.5?c*(1+d):c+d-c*d,e=2*c-t;h=l(e,t,s+1/3),p=l(e,t,s),u=l(e,t,s-1/3)}const f=t=>{const e=Math.round(255*t).toString(16);return 1===e.length?"0"+e:e};return`${f(h)}${f(p)}${f(u)}`.toUpperCase()}function ft(t){const e=function(t){return{lighter:ut(t,30),light:ut(t,15),base:(e=t,e.startsWith("#")?e.substring(1).toUpperCase():/^[0-9A-Fa-f]{6}$/.test(e)?e.toUpperCase():ut(e,0)),dark:ut(t,-15),darker:ut(t,-30)};var e}(t);return[e.lighter,e.light,e.base,e.dark,e.darker]}function mt(t){const e=t.states["sensor.chorebot_points"],r=e?.attributes.points_display;return r?{icon:r.icon??"",text:r.text??"points"}:{icon:"",text:"points"}}function gt(t){const e=mt(t);return e.text?e.text.toLowerCase():""}ht.exports.create;let wt=class extends at{constructor(){super(...arguments),this._redeeming=null,this._showConfirmModal=!1,this._showAddRewardModal=!1,this._pendingRedemption=null,this._rewardFormData={name:"",cost:50,icon:"mdi:gift",description:""},this._showEditRewardModal=!1,this._editingRewardId=null,this._rewardFormSchema=[{name:"name",required:!0,selector:{text:{}}},{name:"cost",selector:{number:{min:1,max:1e4,mode:"box"}}},{name:"icon",selector:{icon:{}}},{name:"description",selector:{text:{multiline:!0}}}],this._computeRewardFieldLabel=t=>{const e=gt(this.hass);return{name:"Name",cost:`Cost (${e.charAt(0).toUpperCase()+e.slice(1)})`,icon:"Icon",description:"Description (Optional)"}[t.name]||t.name},this._computeRewardFieldHelper=t=>({cost:`Cost between 1 and 10,000 ${gt(this.hass)}`,icon:"Use Material Design Icons (e.g., mdi:gift, mdi:ice-cream)"}[t.name]||""),this._handleRewardFormChange=t=>{this._rewardFormData=t.detail.value}}setConfig(t){if(!t.person_entity)throw new Error("person_entity is required");this._config={type:"custom:chorebot-person-rewards-card",person_entity:t.person_entity,title:t.title||void 0,show_title:!1!==t.show_title,hide_card_background:!0===t.hide_card_background,show_disabled_rewards:!0===t.show_disabled_rewards,sort_by:t.sort_by||"cost",show_add_reward_button:!1!==t.show_add_reward_button,accent_color:t.accent_color||""}}static getStubConfig(){return{type:"custom:chorebot-person-rewards-card",person_entity:"person.example",title:"My Rewards",show_title:!0,hide_card_background:!1,show_disabled_rewards:!1,sort_by:"cost",show_add_reward_button:!0,accent_color:""}}getCardSize(){return 3}static getConfigForm(){return{schema:[{name:"person_entity",required:!0,selector:{entity:{domain:"person"}}},{name:"title",selector:{text:{}}},{name:"show_title",default:!0,selector:{boolean:{}}},{name:"hide_card_background",default:!1,selector:{boolean:{}}},{name:"show_disabled_rewards",default:!1,selector:{boolean:{}}},{name:"sort_by",default:"cost",selector:{select:{options:[{label:"Cost (Low to High)",value:"cost"},{label:"Name (A-Z)",value:"name"},{label:"Date Created (Oldest First)",value:"created"}]}}},{name:"show_add_reward_button",default:!0,selector:{boolean:{}}},{name:"accent_color",selector:{text:{}}}],computeLabel:t=>({person_entity:"Person Entity",title:"Card Title",show_title:"Show Title",hide_card_background:"Hide Card Background",show_disabled_rewards:"Show Disabled Rewards",sort_by:"Sort Rewards By",show_add_reward_button:"Show Add Reward Button",accent_color:"Accent Color"}[t.name]||void 0),computeHelper:t=>({person_entity:"Select the person whose rewards to display",title:'Custom title for the card (defaults to "{Person Name}\'s Rewards")',show_title:"Show the card title",hide_card_background:"Hide the card background and padding for a seamless look",show_disabled_rewards:"Include rewards that have been disabled in the grid",sort_by:"Choose how to sort the rewards in the grid",show_add_reward_button:"Show the 'Add Reward' card for creating new rewards",accent_color:"Accent color for reward icons and buttons (hex code or CSS variable like var(--primary-color))"}[t.name]||void 0)}}render(){if(!this.hass||!this._config)return B`<ha-card>Loading...</ha-card>`;if(!this.hass.states[this._config.person_entity])return B`<ha-card>
        <div class="error-state">
          Person entity "${this._config.person_entity}" not found. Please check
          your configuration.
        </div>
      </ha-card>`;const t=this.hass.states["sensor.chorebot_points"];if(!t)return B`<ha-card>
        <div class="empty-state">
          ChoreBot Points sensor not found. Make sure the integration is set up.
        </div>
      </ha-card>`;const e=t.attributes.people||{},r=t.attributes.rewards||[];let o="var(--primary-color)";if(this._config.person_entity){const t=e[this._config.person_entity];t?.accent_color&&(o=t.accent_color)}this._config.accent_color&&(o=this._config.accent_color),this.style.setProperty("--accent-color",o);const i=this._getPersonName(this._config.person_entity),a=this._config.title||`${i}'s Rewards`;return B`
      <ha-card
        class="${this._config.hide_card_background?"no-background":""}"
      >
        ${this._config.show_title?B`<div class="card-header">${a}</div>`:""}
        ${this._renderRewardsGrid(r,e)}
      </ha-card>
      ${this._showConfirmModal?this._renderConfirmModal(e,r):""}
      ${this._showAddRewardModal?this._renderAddRewardModal():""}
      ${this._showEditRewardModal?this._renderEditRewardModal():""}
    `}_renderConfirmModal(t,e){if(!this._pendingRedemption||!this._config)return"";const{personId:r,rewardId:o}=this._pendingRedemption,i=t[r],a=e.find(t=>t.id===o);if(!i||!a)return"";const n=this._getPersonName(r),s=i.points_balance-a.cost,d=i.points_balance>=a.cost,c=a.enabled&&d,l=mt(this.hass);return B`
      <div class="modal-overlay" @click="${this._cancelRedemption}">
        <div
          class="modal-content"
          @click="${t=>t.stopPropagation()}"
        >
          <div class="modal-header">
            ${c?"Are you sure?":"Reward Details"}
            <button
              class="edit-button"
              @click="${()=>this._handleEditButtonClick(a.id)}"
              title="Edit Reward"
            >
              <ha-icon icon="mdi:pencil"></ha-icon>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-info">
              <div class="modal-info-row">
                <span class="modal-info-label">Person:</span>
                <span class="modal-info-value">${n}</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Reward:</span>
                <span class="modal-info-value">${a.name}</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Cost:</span>
                <span class="modal-info-value"
                  >${a.cost}
                  ${l.icon?B`<ha-icon icon="${l.icon}"></ha-icon>`:""}
                  ${l.text?l.text:""}</span
                >
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Current Balance:</span>
                <span class="modal-info-value"
                  >${i.points_balance}
                  ${l.icon?B`<ha-icon icon="${l.icon}"></ha-icon>`:""}
                  ${l.text?l.text:""}</span
                >
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Remaining Balance:</span>
                <span
                  class="modal-info-value"
                  style="color: ${s<0?"var(--error-color)":"inherit"}"
                  >${s}
                  ${l.icon?B`<ha-icon icon="${l.icon}"></ha-icon>`:""}
                  ${l.text?l.text:""}</span
                >
              </div>
              ${a.enabled?"":B`<div
                    style="margin-top: 12px; color: var(--warning-color); font-size: 14px; text-align: center;"
                  >
                    This reward is currently disabled.
                  </div>`}
              ${d?"":B`<div
                    style="margin-top: 12px; color: var(--error-color); font-size: 14px; text-align: center;"
                  >
                    Not enough points to redeem this reward.
                  </div>`}
            </div>
          </div>
          <div class="modal-actions">
            <button
              class="modal-button cancel"
              @click="${this._cancelRedemption}"
            >
              ${c?"Cancel":"Close"}
            </button>
            <button
              class="modal-button confirm"
              ?disabled="${!c}"
              @click="${this._confirmRedemption}"
            >
              Redeem
            </button>
          </div>
        </div>
      </div>
    `}_renderAddRewardModal(){return this._config?B`
      <ha-dialog
        open
        @closed=${this._closeAddRewardModal}
        heading="Add New Reward"
      >
        <ha-form
          .hass=${this.hass}
          .schema=${this._rewardFormSchema}
          .data=${this._rewardFormData}
          .computeLabel=${this._computeRewardFieldLabel}
          .computeHelper=${this._computeRewardFieldHelper}
          @value-changed=${this._handleRewardFormChange}
        ></ha-form>

        <ha-button
          slot="primaryAction"
          @click=${this._createReward}
          ?disabled=${!this._rewardFormData.name?.trim()}
        >
          Create
        </ha-button>
        <ha-button slot="secondaryAction" @click=${this._closeAddRewardModal}>
          Cancel
        </ha-button>
      </ha-dialog>
    `:""}_renderEditRewardModal(){return this._config?B`
      <ha-dialog
        open
        @closed=${this._closeEditRewardModal}
        heading="Edit Reward"
      >
        <ha-form
          .hass=${this.hass}
          .schema=${this._rewardFormSchema}
          .data=${this._rewardFormData}
          .computeLabel=${this._computeRewardFieldLabel}
          .computeHelper=${this._computeRewardFieldHelper}
          @value-changed=${this._handleRewardFormChange}
        ></ha-form>

        <ha-button
          slot="primaryAction"
          @click=${this._updateReward}
          ?disabled=${!this._rewardFormData.name?.trim()}
        >
          Update
        </ha-button>
        <ha-button slot="secondaryAction" @click=${this._closeEditRewardModal}>
          Cancel
        </ha-button>
      </ha-dialog>
    `:""}_renderRewardsGrid(t,e){if(!this._config)return"";const r=t.filter(t=>t.person_id===this._config.person_entity),o=r.filter(t=>this._config.show_disabled_rewards||t.enabled),i=this._sortRewards(o),a=e[this._config.person_entity];return 0!==i.length||this._config.show_add_reward_button?B`
      <div class="rewards-grid">
        ${i.map(t=>this._renderRewardCard(t,a))}
        ${this._config.show_add_reward_button?this._renderAddRewardCard():""}
      </div>
    `:B`<div class="empty-state">
        No rewards configured yet. Use the "Add Reward" button or
        <code>chorebot.manage_reward</code> service to create rewards.
      </div>`}_renderRewardCard(t,e){const r=!!e&&e.points_balance>=t.cost,o=!t.enabled||!r,i=mt(this.hass);return B`
      <div
        class="reward-card ${o?"disabled":""}"
        @click="${()=>this._handleRewardClick(t,r)}"
      >
        <div class="reward-icon-section">
          <div class="reward-icon">
            <ha-icon icon="${t.icon}"></ha-icon>
          </div>
        </div>
        <div class="reward-info">
          <div class="reward-header">
            <div class="reward-name">${t.name}</div>
            <div class="reward-cost">
              ${t.cost}
              ${i.icon?B`<ha-icon icon="${i.icon}"></ha-icon>`:""}
              ${i.text?i.text:""}
            </div>
          </div>
          ${t.description?B`<div class="reward-description">${t.description}</div>`:""}
        </div>
      </div>
    `}_renderAddRewardCard(){return B`
      <div class="add-reward-card" @click="${this._openAddRewardModal}">
        <div class="add-reward-icon-section">
          <div class="add-reward-icon">
            <ha-icon icon="mdi:plus"></ha-icon>
          </div>
        </div>
        <div class="add-reward-info">
          <div class="add-reward-text">Add Reward</div>
        </div>
      </div>
    `}_sortRewards(t){const e=[...t];switch(this._config.sort_by){case"name":return e.sort((t,e)=>t.name.localeCompare(e.name));case"created":return e.sort((t,e)=>new Date(t.created||0).getTime()-new Date(e.created||0).getTime());default:return e.sort((t,e)=>t.cost-e.cost)}}_handleRewardClick(t,e){this._pendingRedemption={personId:this._config.person_entity,rewardId:t.id},this._showConfirmModal=!0}_cancelRedemption(){this._showConfirmModal=!1,this._pendingRedemption=null}async _confirmRedemption(){if(!this._pendingRedemption)return;const{personId:t,rewardId:e}=this._pendingRedemption;this._showConfirmModal=!1,this._pendingRedemption=null,this._redeeming=e;try{await this.hass.callService("chorebot","redeem_reward",{person_id:t,reward_id:e}),this._showRedemptionSuccess()}catch(t){const e=t.message||"Failed to redeem reward. Please try again.";alert(e)}finally{this._redeeming=null}}_showRedemptionSuccess(){!function(t,e=5e3){const r=Date.now()+e;function o(t,e){return Math.random()*(e-t)+t}!function i(){const a=r-Date.now(),n=Math.max(200,a/e*500);pt({particleCount:1,startVelocity:0,ticks:n,origin:{x:Math.random(),y:.3*Math.random()-.1},colors:t,shapes:["star"],gravity:o(1.2,1.5),scalar:o(1.2,2),drift:o(-.4,.4),disableForReducedMotion:!0}),a>0&&requestAnimationFrame(i)}()}(ft(this._config.accent_color||getComputedStyle(this).getPropertyValue("--primary-color")||"#03a9f4"),3e3)}_openAddRewardModal(){this._rewardFormData={name:"",cost:50,icon:"mdi:gift",description:""},this._showAddRewardModal=!0}_closeAddRewardModal(){this._showAddRewardModal=!1}async _createReward(){if(!this._config)return;const{name:t,cost:e,icon:r,description:o}=this._rewardFormData;if(t.trim())try{await this.hass.callService("chorebot","manage_reward",{name:t.trim(),cost:Math.max(1,Math.min(1e4,e)),icon:r||"mdi:gift",description:o.trim(),person_id:this._config.person_entity}),this._closeAddRewardModal()}catch(t){const e=t.message||"Failed to create reward. Please try again.";alert(e)}else alert("Reward name is required")}_openEditRewardModal(t){if(!this.hass)return;const e=this.hass.states["sensor.chorebot_points"];if(!e)return;const r=(e.attributes.rewards||[]).find(e=>e.id===t);r?(this._rewardFormData={name:r.name,cost:r.cost,icon:r.icon,description:r.description||""},this._editingRewardId=t,this._showEditRewardModal=!0):alert("Reward not found")}_closeEditRewardModal(){this._showEditRewardModal=!1,this._editingRewardId=null,this._rewardFormData={name:"",cost:50,icon:"mdi:gift",description:""}}_handleEditButtonClick(t){this._showConfirmModal=!1,this._pendingRedemption=null,this._openEditRewardModal(t)}async _updateReward(){if(!this._config||!this._editingRewardId)return;const{name:t,cost:e,icon:r,description:o}=this._rewardFormData;if(t.trim())try{await this.hass.callService("chorebot","manage_reward",{reward_id:this._editingRewardId,name:t.trim(),cost:Math.max(1,Math.min(1e4,e)),icon:r||"mdi:gift",description:o.trim(),person_id:this._config.person_entity}),this._closeEditRewardModal()}catch(t){const e=t.message||"Failed to update reward. Please try again.";alert(e)}else alert("Reward name is required")}_getPersonName(t){const e=this.hass?.states[t];return e?.attributes.friendly_name||t.replace("person.","")}};wt.styles=((t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,o)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[o+1],t[0]);return new a(r,t,o)})`
    :host {
      display: block;
      /* HA Dialog styling */
      --mdc-dialog-content-ink-color: var(--primary-text-color);
      --mdc-dialog-heading-ink-color: var(--primary-text-color);
      --mdc-dialog-max-width: 400px;
      /* HA Form field styling */
      --mdc-text-field-outlined-idle-border-color: var(--divider-color);
      --mdc-text-field-outlined-hover-border-color: var(--primary-color);
      --mdc-theme-primary: var(--primary-color);
      --mdc-text-field-fill-color: var(--card-background-color);
      --mdc-text-field-ink-color: var(--primary-text-color);
      --mdc-text-field-label-ink-color: var(--primary-text-color);
    }

    ha-card {
      padding: 16px;
      border: none;
    }

    ha-card.no-background {
      padding: 0;
      background: transparent;
      box-shadow: none;
    }

    ha-dialog {
      --mdc-dialog-min-width: 90%;
    }

    ha-form {
      display: block;
    }

    .card-header {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    /* Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .reward-card {
      border-radius: 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      display: flex;
      flex-direction: row;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 80px;
      height: 80px;
    }

    .reward-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .reward-card.disabled {
      opacity: 0.6;
    }

    .reward-icon-section {
      flex-shrink: 0;
      width: 80px;
      background: var(--accent-color, var(--primary-color));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reward-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .reward-icon ha-icon {
      --mdc-icon-size: 36px;
    }

    .reward-info {
      flex: 1;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      min-width: 0;
    }

    .reward-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      line-height: 1;
    }

    .reward-name {
      font-size: 18px;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
      line-height: 1;
    }

    .reward-cost {
      font-size: 20px;
      font-weight: bold;
      color: var(--accent-color, var(--primary-color));
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      line-height: 1;
    }

    .reward-cost ha-icon {
      --mdc-icon-size: 16px;
      display: flex;
    }

    .reward-description {
      font-size: 13px;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.3;
    }

    /* Add Reward Card */
    .add-reward-card {
      border-radius: 12px;
      background: var(--card-background-color);
      border: 2px dashed var(--divider-color);
      display: flex;
      flex-direction: row;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 80px;
      height: 80px;
    }

    .add-reward-card:hover {
      border-color: var(--accent-color, var(--primary-color));
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .add-reward-icon-section {
      flex-shrink: 0;
      width: 80px;
      background: color-mix(in srgb, var(--divider-color) 50%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .add-reward-card:hover .add-reward-icon-section {
      background: color-mix(
        in srgb,
        var(--accent-color, var(--primary-color)) 20%,
        var(--card-background-color)
      );
    }

    .add-reward-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      transition: all 0.2s ease;
    }

    .add-reward-card:hover .add-reward-icon {
      color: var(--accent-color, var(--primary-color));
    }

    .add-reward-icon ha-icon {
      --mdi-icon-size: 36px;
    }

    .add-reward-info {
      flex: 1;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .add-reward-text {
      font-size: 18px;
      font-weight: 500;
      color: var(--secondary-text-color);
      transition: all 0.2s ease;
    }

    .add-reward-card:hover .add-reward-text {
      color: var(--accent-color, var(--primary-color));
    }

    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: var(--card-background-color);
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      position: relative; /* For absolute positioning of edit button */
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--primary-text-color);
    }

    .edit-button {
      position: absolute;
      top: 8px;
      right: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--primary-text-color);
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: all 0.2s;
    }

    .edit-button:hover {
      opacity: 1;
      background: var(--secondary-background-color);
    }

    .edit-button ha-icon {
      --mdc-icon-size: 20px;
    }

    .modal-body {
      margin-bottom: 24px;
      color: var(--primary-text-color);
    }

    /* Confirmation Modal Info */
    .modal-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: var(--secondary-background-color);
      border-radius: 8px;
      margin-top: 12px;
    }

    .modal-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-info-label {
      color: var(--secondary-text-color);
      font-size: 14px;
    }

    .modal-info-value {
      color: var(--primary-text-color);
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .modal-info-value ha-icon {
      --mdc-icon-size: 14px;
      display: flex;
    }

    /* Modal Actions (used by confirmation modal only) */
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .modal-button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .modal-button.cancel {
      background: var(--secondary-background-color);
      color: var(--primary-text-color);
    }

    .modal-button.cancel:hover {
      background: var(--divider-color);
    }

    .modal-button.confirm {
      background: var(--accent-color, var(--primary-color));
      color: white;
    }

    .modal-button.confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .modal-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-button:disabled:hover {
      transform: none;
      box-shadow: none;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }

    .error-state {
      text-align: center;
      padding: 32px;
      color: var(--error-color);
    }
  `,t([ct({attribute:!1})],wt.prototype,"hass",void 0),t([lt()],wt.prototype,"_config",void 0),t([lt()],wt.prototype,"_redeeming",void 0),t([lt()],wt.prototype,"_showConfirmModal",void 0),t([lt()],wt.prototype,"_showAddRewardModal",void 0),t([lt()],wt.prototype,"_pendingRedemption",void 0),t([lt()],wt.prototype,"_rewardFormData",void 0),t([lt()],wt.prototype,"_showEditRewardModal",void 0),t([lt()],wt.prototype,"_editingRewardId",void 0),wt=t([(t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("chorebot-person-rewards-card")],wt),window.customCards=window.customCards||[],window.customCards.push({type:"chorebot-person-rewards-card",name:"ChoreBot Person Rewards Card",description:"Display person-specific rewards with inline creation and redemption",preview:!0}),console.info("%c CHOREBOT-PERSON-REWARDS-CARD %c v0.1.0 ","color: white; background: #9C27B0; font-weight: bold;","color: #9C27B0; background: white; font-weight: bold;");export{wt as ChoreBotPersonRewardsCard};
