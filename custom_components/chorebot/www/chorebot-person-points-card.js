/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,e$2=t$2.ShadowRoot&&(void 0===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$4=new WeakMap;let n$3 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$2&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$4=t=>new n$3("string"==typeof t?t:t+"",void 0,s$2),i$3=(t,...e)=>{const o=1===t.length?t[0]:e.reduce(((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1]),t[0]);return new n$3(o,t,s$2)},S$1=(s,o)=>{if(e$2)s.adoptedStyleSheets=o.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet));else for(const e of o){const o=document.createElement("style"),n=t$2.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$2?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$2,defineProperty:e$1,getOwnPropertyDescriptor:h$1,getOwnPropertyNames:r$3,getOwnPropertySymbols:o$3,getPrototypeOf:n$2}=Object,a$1=globalThis,c$1=a$1.trustedTypes,l$1=c$1?c$1.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$1=(t,s)=>!i$2(t,s),b={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$1};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$1(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$1(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$2(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$3(t),...o$3(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$2(s));}else void 0!==s&&i.push(c$2(s));return i}static _$Eu(t,s){const i=s.attribute;return  false===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise((t=>this.enableUpdating=t)),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((t=>t(this)));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach((t=>t.hostConnected?.()));}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach((t=>t.hostDisconnected?.()));}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&true===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i){if(void 0!==t){const e=this.constructor,h=this[t];if(i??=e.getPropertyOptions(t),!((i.hasChanged??f$1)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(e._$Eu(t,i))))return;this.C(t,s,i);} false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach((t=>t.hostUpdate?.())),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach((t=>t.hostUpdated?.())),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return  true}update(t){this._$Eq&&=this._$Eq.forEach((t=>this._$ET(t,this[t]))),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.1");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=globalThis,i$1=t$1.trustedTypes,s$1=i$1?i$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,e="$lit$",h=`lit$${Math.random().toFixed(9).slice(2)}$`,o$2="?"+h,n$1=`<${o$2}>`,r$2=document,l=()=>r$2.createComment(""),c=t=>null===t||"object"!=typeof t&&"function"!=typeof t,a=Array.isArray,u=t=>a(t)||"function"==typeof t?.[Symbol.iterator],d="[ \t\n\f\r]",f=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,v=/-->/g,_=/>/g,m=RegExp(`>|${d}(?:([^\\s"'>=/]+)(${d}*=${d}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),p=/'/g,g=/"/g,$=/^(?:script|style|textarea|title)$/i,y=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),x=y(1),T=Symbol.for("lit-noChange"),E=Symbol.for("lit-nothing"),A=new WeakMap,C=r$2.createTreeWalker(r$2,129);function P(t,i){if(!a(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==s$1?s$1.createHTML(i):i}const V=(t,i)=>{const s=t.length-1,o=[];let r,l=2===i?"<svg>":3===i?"<math>":"",c=f;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,y=0;for(;y<s.length&&(c.lastIndex=y,u=c.exec(s),null!==u);)y=c.lastIndex,c===f?"!--"===u[1]?c=v:void 0!==u[1]?c=_:void 0!==u[2]?($.test(u[2])&&(r=RegExp("</"+u[2],"g")),c=m):void 0!==u[3]&&(c=m):c===m?">"===u[0]?(c=r??f,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?m:'"'===u[3]?g:p):c===g||c===p?c=m:c===v||c===_?c=f:(c=m,r=void 0);const x=c===m&&t[i+1].startsWith("/>")?" ":"";l+=c===f?s+n$1:d>=0?(o.push(a),s.slice(0,d)+e+s.slice(d)+h+x):s+h+(-2===d?i:x);}return [P(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),o]};class N{constructor({strings:t,_$litType$:s},n){let r;this.parts=[];let c=0,a=0;const u=t.length-1,d=this.parts,[f,v]=V(t,s);if(this.el=N.createElement(f,n),C.currentNode=this.el.content,2===s||3===s){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=C.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(e)){const i=v[a++],s=r.getAttribute(t).split(h),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:c,name:e[2],strings:s,ctor:"."===e[1]?H:"?"===e[1]?I:"@"===e[1]?L:k}),r.removeAttribute(t);}else t.startsWith(h)&&(d.push({type:6,index:c}),r.removeAttribute(t));if($.test(r.tagName)){const t=r.textContent.split(h),s=t.length-1;if(s>0){r.textContent=i$1?i$1.emptyScript:"";for(let i=0;i<s;i++)r.append(t[i],l()),C.nextNode(),d.push({type:2,index:++c});r.append(t[s],l());}}}else if(8===r.nodeType)if(r.data===o$2)d.push({type:2,index:c});else {let t=-1;for(;-1!==(t=r.data.indexOf(h,t+1));)d.push({type:7,index:c}),t+=h.length-1;}c++;}}static createElement(t,i){const s=r$2.createElement("template");return s.innerHTML=t,s}}function S(t,i,s=t,e){if(i===T)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=c(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=S(t,h._$AS(t,i.values),h,e)),i}class M{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??r$2).importNode(i,true);C.currentNode=e;let h=C.nextNode(),o=0,n=0,l=s[0];for(;void 0!==l;){if(o===l.index){let i;2===l.type?i=new R(h,h.nextSibling,this,t):1===l.type?i=new l.ctor(h,l.name,l.strings,this,t):6===l.type&&(i=new z(h,this,t)),this._$AV.push(i),l=s[++n];}o!==l?.index&&(h=C.nextNode(),o++);}return C.currentNode=r$2,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class R{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=E,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=S(this,t,i),c(t)?t===E||null==t||""===t?(this._$AH!==E&&this._$AR(),this._$AH=E):t!==this._$AH&&t!==T&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):u(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==E&&c(this._$AH)?this._$AA.nextSibling.data=t:this.T(r$2.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=N.createElement(P(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new M(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=A.get(t.strings);return void 0===i&&A.set(t.strings,i=new N(t)),i}k(t){a(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new R(this.O(l()),this.O(l()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,i){for(this._$AP?.(false,true,i);t!==this._$AB;){const i=t.nextSibling;t.remove(),t=i;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class k{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=E,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=E;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=S(this,t,i,0),o=!c(t)||t!==this._$AH&&t!==T,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=S(this,e[s+n],i,n),r===T&&(r=this._$AH[n]),o||=!c(r)||r!==this._$AH[n],r===E?t=E:t!==E&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===E?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class H extends k{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===E?void 0:t;}}class I extends k{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==E);}}class L extends k{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=S(this,t,i,0)??E)===T)return;const s=this._$AH,e=t===E&&s!==E||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==E&&(s===E||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){S(this,t);}}const j=t$1.litHtmlPolyfillSupport;j?.(N,R),(t$1.litHtmlVersions??=[]).push("3.3.1");const B=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new R(i.insertBefore(l(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=B(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return T}}i._$litElement$=true,i["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i});const o$1=s.litElementPolyfillSupport;o$1?.({LitElement:i});(s.litElementVersions??=[]).push("4.2.1");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=t=>(e,o)=>{ void 0!==o?o.addInitializer((()=>{customElements.define(t,e);})):customElements.define(t,e);};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const o={attribute:true,type:String,converter:u$1,reflect:false,hasChanged:f$1},r$1=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=true),s.set(r.name,t),"accessor"===n){const{name:o}=r;return {set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t);},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t);}}throw Error("Unsupported decorator location: "+n)};function n(t){return (e,o)=>"object"==typeof o?r$1(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function r(r){return n({...r,state:true,attribute:false})}

// ============================================================================
// Date/Time Utility Functions for ChoreBot Cards
// ============================================================================
/**
 * Parse UTC timestamp to local date and time strings
 * @param utcString - ISO 8601 UTC timestamp
 * @returns Object with separate date and time strings in local timezone
 */
/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day
 */
function isSameDay(date1, date2) {
    return (date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate());
}

// ============================================================================
// Task Utility Functions for ChoreBot Cards
// ============================================================================
/**
 * Filter tasks for today-focused view
 * Shows: incomplete tasks due today, incomplete overdue tasks, tasks completed today, and dateless tasks
 * @param entity - Home Assistant entity containing tasks
 * @param showDatelessTasks - Whether to show tasks without due dates
 * @param filterSectionId - Optional section ID to filter by
 * @returns Filtered array of tasks
 */
function filterTodayTasks(entity, showDatelessTasks = true, filterSectionId) {
    const tasks = entity.attributes.chorebot_tasks || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Apply date/status filtering
    let filteredTasks = tasks.filter((task) => {
        const hasDueDate = !!task.due;
        const isCompleted = task.status === "completed";
        // Handle dateless tasks
        if (!hasDueDate) {
            return showDatelessTasks;
        }
        const dueDate = new Date(task.due);
        dueDate.setHours(0, 0, 0, 0);
        const isToday = isSameDay(dueDate, today);
        const isOverdue = dueDate < today;
        // If task is completed, check if it was completed today
        if (isCompleted) {
            if (task.last_completed) {
                const completedDate = new Date(task.last_completed);
                if (isSameDay(completedDate, new Date())) {
                    return true; // Show if completed today (regardless of due date)
                }
                // If completed but not today, hide it
                return false;
            }
        }
        // Show incomplete tasks due today
        if (isToday) {
            return true;
        }
        // Show incomplete overdue tasks
        if (isOverdue && !isCompleted) {
            return true;
        }
        return false;
    });
    return filteredTasks;
}
/**
 * Calculate progress for only tasks with due dates (excludes dateless tasks)
 * @param tasks - Array of tasks to calculate progress for
 * @returns Object with completed and total counts for dated tasks only
 */
function calculateDatedTasksProgress(tasks) {
    // Filter to only tasks with due dates
    const datedTasks = tasks.filter((t) => !!t.due);
    const completed = datedTasks.filter((t) => t.status === "completed").length;
    return {
        completed,
        total: datedTasks.length,
    };
}
/**
 * Filter tasks assigned to a specific person across all ChoreBot lists
 * Uses pre-computed person_id from backend (eliminates manual section/list lookups)
 * @param entities - All Home Assistant entities (will filter to todo.chorebot_*)
 * @param personEntityId - Person entity ID (e.g., "person.kyle")
 * @param includeDateless - Whether to include dateless tasks (default: false)
 * @returns Array of tasks assigned to this person (already filtered by today/overdue)
 */
function filterTasksByPerson(entities, personEntityId, includeDateless = false) {
    const allPersonTasks = [];
    // Filter to only ChoreBot todo entities
    const choreботEntities = entities.filter((e) => e.entity_id.startsWith("todo.chorebot_"));
    for (const entity of choreботEntities) {
        // Get today's tasks from this entity
        const todayTasks = filterTodayTasks(entity, includeDateless);
        // Filter to tasks assigned to this person using pre-computed person_id
        // Backend resolves: section.person_id → list.person_id → null
        const personTasks = todayTasks.filter((task) => task.computed_person_id === personEntityId);
        allPersonTasks.push(...personTasks);
    }
    return allPersonTasks;
}

// ============================================================================
// Color Utilities for ChoreBot Cards
// ============================================================================
/**
 * Adjust color lightness in HSL color space
 * Handles hex, rgb, rgba, and CSS variable formats
 *
 * @param color - Base color (hex, rgb, or CSS variable like var(--primary-color))
 * @param percent - Percentage to adjust (-100 to 100, negative = darker, positive = lighter)
 * @returns Adjusted color in hex format without # prefix (for canvas-confetti compatibility)
 */
function adjustColorLightness(color, percent) {
    // For CSS variables, resolve the computed value
    if (color.startsWith("var(")) {
        const resolvedColor = getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1).trim());
        if (resolvedColor) {
            color = resolvedColor.trim();
        }
        else {
            // Fallback if variable can't be resolved
            return color;
        }
    }
    // Convert hex to rgb
    let r, g, b;
    if (color.startsWith("#")) {
        const hex = color.replace("#", "");
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    else if (color.startsWith("rgb")) {
        const match = color.match(/\d+/g);
        if (!match)
            return color;
        [r, g, b] = match.map(Number);
    }
    else {
        return color;
    }
    // Convert RGB to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    // Adjust lightness
    if (percent > 0) {
        // Lighten: increase lightness but cap to avoid pure white
        l = Math.max(0, Math.min(0.95, l + (percent / 100) * (1 - l)));
    }
    else {
        // Darken: decrease lightness proportionally
        l = Math.max(0.05, l + (percent / 100) * l);
    }
    // Convert HSL back to RGB
    const hue2rgb = (p, q, t) => {
        if (t < 0)
            t += 1;
        if (t > 1)
            t -= 1;
        if (t < 1 / 6)
            return p + (q - p) * 6 * t;
        if (t < 1 / 2)
            return q;
        if (t < 2 / 3)
            return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    let r2, g2, b2;
    if (s === 0) {
        r2 = g2 = b2 = l;
    }
    else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1 / 3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1 / 3);
    }
    // Convert to hex format without # prefix (canvas-confetti expects this format)
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `${toHex(r2)}${toHex(g2)}${toHex(b2)}`.toUpperCase();
}
/**
 * Convert any color format to hex without # prefix
 * Used for canvas-confetti which expects hex colors without the # prefix
 *
 * @param color - Color in any format (hex, rgb, or CSS variable)
 * @returns Hex color without # prefix (format: 'RRGGBB')
 */
function toHexWithoutPrefix(color) {
    // If already hex with #, remove it
    if (color.startsWith("#")) {
        return color.substring(1).toUpperCase();
    }
    // If it's already a hex without #, return as-is
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        return color.toUpperCase();
    }
    // Otherwise it's rgb() or a CSS variable, adjustColorLightness will handle it
    // and return hex without prefix
    return adjustColorLightness(color, 0);
}
/**
 * Calculate all 5 color shades from a base color
 *
 * @param baseColor - Base color (hex, rgb, or CSS variable)
 * @returns Object with 5 color shades in hex format without # prefix
 */
function calculateColorShades(baseColor) {
    return {
        lighter: adjustColorLightness(baseColor, 30),
        light: adjustColorLightness(baseColor, 15),
        base: toHexWithoutPrefix(baseColor),
        dark: adjustColorLightness(baseColor, -15),
        darker: adjustColorLightness(baseColor, -30),
    };
}

// ============================================================================
// Points Display Utilities for ChoreBot Cards
// ============================================================================
/**
 * Get points display configuration from sensor.
 * Returns { icon, text } where icon is MDI icon string (e.g., "mdi:star")
 * and text is display term (e.g., "stars", "coins", "points").
 *
 * Falls back to { icon: "", text: "points" } if sensor is missing or
 * attribute is undefined.
 *
 * Respects empty strings: If backend sends text="" with an icon, that's
 * intentional (icon-only mode) and won't be overridden with "points".
 *
 * @param hass - Home Assistant instance
 * @returns Object with icon and text properties
 */
function getPointsDisplayParts(hass) {
    const sensor = hass.states["sensor.chorebot_points"];
    const config = sensor?.attributes.points_display;
    // If sensor or attribute missing entirely, use defaults
    if (!config) {
        return {
            icon: "",
            text: "points",
        };
    }
    // Otherwise respect exact values from backend (including empty strings)
    return {
        icon: config.icon ?? "",
        text: config.text ?? "points",
    };
}

// ============================================================================
// ChoreBot Person Points Card (TypeScript)
// ============================================================================
/**
 * ChoreBot Person Points Card
 *
 * Displays a single person's avatar and current points balance in a compact
 * horizontal layout. Designed to be placed above a person's task list card
 * for quick visual feedback.
 */
let ChoreBotPersonPointsCard = class ChoreBotPersonPointsCard extends i {
    constructor() {
        super(...arguments);
        this.shades = {
            lighter: "",
            light: "",
            base: "",
            dark: "",
            darker: "",
        };
    }
    setConfig(config) {
        if (!config.person_entity) {
            throw new Error("person_entity is required");
        }
        this._config = {
            type: "custom:chorebot-person-points-card",
            person_entity: config.person_entity,
            title: config.title || "Points",
            show_title: config.show_title !== false,
            hide_card_background: config.hide_card_background === true,
            show_progress: config.show_progress !== false, // Default: true
            accent_color: config.accent_color || "",
            progress_text_color: config.progress_text_color || "",
        };
    }
    willUpdate(changedProperties) {
        super.willUpdate(changedProperties);
        // Recalculate color shades when config or hass changes
        if ((changedProperties.has("_config") || changedProperties.has("hass")) &&
            this._config &&
            this.hass) {
            // Precedence: Manual config > Person profile > Theme default
            let baseColor = "var(--primary-color)"; // Default fallback
            // Check for centralized person color from sensor
            if (this._config.person_entity) {
                const sensor = this.hass.states["sensor.chorebot_points"];
                const people = sensor?.attributes.people || {};
                const personProfile = people[this._config.person_entity];
                if (personProfile?.accent_color) {
                    baseColor = personProfile.accent_color;
                }
            }
            // Manual config overrides everything
            if (this._config.accent_color) {
                baseColor = this._config.accent_color;
            }
            this.shades = calculateColorShades(baseColor);
        }
        // Recalculate progress when hass or config changes
        if ((changedProperties.has("hass") || changedProperties.has("_config")) &&
            this.hass &&
            this._config) {
            this._progress = this._calculatePersonProgress();
        }
    }
    _calculatePersonProgress() {
        if (!this.hass || !this._config) {
            return { completed: 0, total: 0 };
        }
        // Get all ChoreBot todo entities
        const allStates = Object.values(this.hass.states);
        const todoEntities = allStates.filter((e) => e.entity_id.startsWith("todo."));
        const entities = todoEntities.filter((e) => e.entity_id.startsWith("todo.chorebot_"));
        // Filter tasks assigned to this person (excludes dateless by default)
        const personTasks = filterTasksByPerson(entities, this._config.person_entity, false);
        // Calculate progress for dated tasks only
        return calculateDatedTasksProgress(personTasks);
    }
    static getStubConfig() {
        return {
            type: "custom:chorebot-person-points-card",
            person_entity: "",
            title: "Points",
            show_title: true,
            hide_card_background: false,
            show_progress: true,
            accent_color: "",
            progress_text_color: "",
        };
    }
    static getConfigForm() {
        return {
            schema: [
                {
                    name: "person_entity",
                    required: true,
                    selector: {
                        entity: {
                            filter: { domain: "person" },
                        },
                    },
                },
                {
                    name: "title",
                    default: "Points",
                    selector: { text: {} },
                },
                {
                    name: "show_title",
                    default: true,
                    selector: { boolean: {} },
                },
                {
                    name: "hide_card_background",
                    default: false,
                    selector: { boolean: {} },
                },
                {
                    name: "show_progress",
                    default: true,
                    selector: { boolean: {} },
                },
                {
                    name: "accent_color",
                    selector: { text: {} },
                },
                {
                    name: "progress_text_color",
                    selector: { text: {} },
                },
            ],
            computeLabel: (schema) => {
                const labels = {
                    person_entity: "Person Entity",
                    title: "Card Title",
                    show_title: "Show Title",
                    hide_card_background: "Hide Card Background",
                    show_progress: "Show Progress Bar",
                    accent_color: "Accent Color",
                    progress_text_color: "Progress Text Color",
                };
                return labels[schema.name] || undefined;
            },
            computeHelper: (schema) => {
                const helpers = {
                    person_entity: "Select the person entity to display points for",
                    title: "Custom title for the card",
                    show_title: "Show the card title",
                    hide_card_background: "Hide the card background and padding for a seamless look",
                    show_progress: "Display task completion progress below the person's name",
                    accent_color: "Accent color for progress bar and points text (hex code or CSS variable like var(--primary-color))",
                    progress_text_color: "Text color for progress label (hex code or CSS variable)",
                };
                return helpers[schema.name] || undefined;
            },
        };
    }
    getCardSize() {
        return 1;
    }
    render() {
        if (!this.hass || !this._config) {
            return x ``;
        }
        // Check if ChoreBot sensor exists
        const sensor = this.hass.states["sensor.chorebot_points"];
        if (!sensor) {
            return x `<ha-card>
        <div class="error-message">
          ChoreBot Points sensor not found. Make sure the integration is set up.
        </div>
      </ha-card>`;
        }
        // Check if person entity exists
        const personEntity = this.hass.states[this._config.person_entity];
        if (!personEntity) {
            return x `<ha-card>
        <div class="error-message">
          Person entity not found. Please check your configuration.
        </div>
      </ha-card>`;
        }
        // Get person data from sensor
        const people = sensor.attributes.people || {};
        const personData = people[this._config.person_entity];
        if (!personData) {
            return x `<ha-card>
        <div class="error-message">
          Person not found in points system. Complete tasks to earn points.
        </div>
      </ha-card>`;
        }
        return x `
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
            ? x `<div class="card-header">${this._config.title}</div>`
            : ""}
        ${this._renderPersonDisplay(personEntity, personData)}
      </ha-card>
    `;
    }
    _renderPersonDisplay(personEntity, personData) {
        const pictureUrl = personEntity.attributes.entity_picture;
        const name = this._getPersonName(this._config.person_entity);
        const parts = getPointsDisplayParts(this.hass);
        return x `
      <div class="person-container">
        <div class="person-left">
          ${pictureUrl
            ? x `<div class="person-avatar">
                <img src="${pictureUrl}" alt="${name}" />
              </div>`
            : x `<div class="person-avatar initials">
                ${this._getPersonInitials(this._config.person_entity)}
              </div>`}
        </div>
        <div class="person-info">
          <div class="person-header">
            <div class="person-name">${name}</div>
            <div class="person-points" style="color: #${this.shades.base}">
              ${personData.points_balance}
              ${parts.icon
            ? x `<ha-icon icon="${parts.icon}"></ha-icon>`
            : ""}
              ${parts.text ? parts.text : ""}
            </div>
          </div>
          ${this._config.show_progress && this._progress
            ? this._renderProgressBar(this._progress)
            : ""}
        </div>
      </div>
    `;
    }
    _renderProgressBar(progress) {
        // Calculate percentage (handle divide by zero)
        const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
        // Get text color from config or use default
        const textColor = this._config.progress_text_color || "var(--text-primary-color)";
        return x `
      <div
        class="progress-bar"
        style="background: #${this.shades.lighter}"
        aria-label="${progress.completed} of ${progress.total} tasks completed"
      >
        <div
          class="progress-bar-fill"
          style="width: ${percentage}%; background: #${this.shades.darker}"
        ></div>
        <div class="progress-text" style="color: ${textColor}">
          ${progress.completed}/${progress.total}
        </div>
      </div>
    `;
    }
    _getPersonName(entityId) {
        const entity = this.hass?.states[entityId];
        return entity?.attributes.friendly_name || entityId.replace("person.", "");
    }
    _getPersonInitials(entityId) {
        const name = this._getPersonName(entityId);
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }
};
ChoreBotPersonPointsCard.styles = i$3 `
    :host {
      display: block;
      margin-bottom: 1em;
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

    .card-header {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 16px;
    }

    .person-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .person-left {
      flex-shrink: 0;
    }

    .person-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .person-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .person-avatar.initials {
      background: linear-gradient(
        135deg,
        var(--primary-color),
        var(--accent-color)
      );
      color: white;
      font-size: 24px;
      font-weight: bold;
    }

    .person-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 0; /* Allow truncation */
    }

    .person-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      line-height: 1;
    }

    .person-name {
      font-size: 24px;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
      line-height: 1;
    }

    .progress-bar {
      position: relative;
      border-radius: 12px;
      height: 24px;
      overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      width: 100%; /* Full width of person-info */
    }

    .progress-bar-fill {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      transition: width 0.3s ease;
      border-radius: 12px;
    }

    .progress-text {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      z-index: 1;
    }

    .person-points {
      font-size: 24px;
      font-weight: bold;
      color: var(--primary-color);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      line-height: 1;
    }

    .person-points ha-icon {
      --mdc-icon-size: 20px;
      display: flex;
    }

    .error-message {
      text-align: center;
      padding: 32px;
      color: var(--error-color);
      font-size: 16px;
    }

    /* Responsive: smaller avatar on mobile */
    @media (max-width: 600px) {
      .person-avatar {
        width: 48px;
        height: 48px;
      }

      .person-avatar.initials {
        font-size: 18px;
      }

      .person-name {
        font-size: 20px;
      }

      .person-points {
        font-size: 20px;
      }

      .person-points ha-icon {
        --mdc-icon-size: 18px;
      }
    }
  `;
__decorate([
    n({ attribute: false })
], ChoreBotPersonPointsCard.prototype, "hass", void 0);
__decorate([
    r()
], ChoreBotPersonPointsCard.prototype, "_config", void 0);
__decorate([
    r()
], ChoreBotPersonPointsCard.prototype, "_progress", void 0);
ChoreBotPersonPointsCard = __decorate([
    t("chorebot-person-points-card")
], ChoreBotPersonPointsCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "chorebot-person-points-card",
    name: "ChoreBot Person Points Card",
    description: "Display a person's avatar and points balance",
    preview: true,
});

export { ChoreBotPersonPointsCard };
//# sourceMappingURL=chorebot-person-points-card.js.map
