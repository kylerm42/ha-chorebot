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

// canvas-confetti v1.9.4 built on 2025-10-25T05:14:56.640Z
var module$1 = {};

// source content
/* globals Map */

(function main(global, module, isWorker, workerSize) {
  var canUseWorker = !!(
    global.Worker &&
    global.Blob &&
    global.Promise &&
    global.OffscreenCanvas &&
    global.OffscreenCanvasRenderingContext2D &&
    global.HTMLCanvasElement &&
    global.HTMLCanvasElement.prototype.transferControlToOffscreen &&
    global.URL &&
    global.URL.createObjectURL);

  var canUsePaths = typeof Path2D === 'function' && typeof DOMMatrix === 'function';
  var canDrawBitmap = (function () {
    // this mostly supports ssr
    if (!global.OffscreenCanvas) {
      return false;
    }

    try {
      var canvas = new OffscreenCanvas(1, 1);
      var ctx = canvas.getContext('2d');
      ctx.fillRect(0, 0, 1, 1);
      var bitmap = canvas.transferToImageBitmap();
      ctx.createPattern(bitmap, 'no-repeat');
    } catch (e) {
      return false;
    }

    return true;
  })();

  function noop() {}

  // create a promise if it exists, otherwise, just
  // call the function directly
  function promise(func) {
    var ModulePromise = module.exports.Promise;
    var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;

    if (typeof Prom === 'function') {
      return new Prom(func);
    }

    func(noop, noop);

    return null;
  }

  var bitmapMapper = (function (skipTransform, map) {
    // see https://github.com/catdad/canvas-confetti/issues/209
    // creating canvases is actually pretty expensive, so we should create a
    // 1:1 map for bitmap:canvas, so that we can animate the confetti in
    // a performant manner, but also not store them forever so that we don't
    // have a memory leak
    return {
      transform: function(bitmap) {
        if (skipTransform) {
          return bitmap;
        }

        if (map.has(bitmap)) {
          return map.get(bitmap);
        }

        var canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);

        map.set(bitmap, canvas);

        return canvas;
      },
      clear: function () {
        map.clear();
      }
    };
  })(canDrawBitmap, new Map());

  var raf = (function () {
    var TIME = Math.floor(1000 / 60);
    var frame, cancel;
    var frames = {};
    var lastFrameTime = 0;

    if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
      frame = function (cb) {
        var id = Math.random();

        frames[id] = requestAnimationFrame(function onFrame(time) {
          if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
            lastFrameTime = time;
            delete frames[id];

            cb();
          } else {
            frames[id] = requestAnimationFrame(onFrame);
          }
        });

        return id;
      };
      cancel = function (id) {
        if (frames[id]) {
          cancelAnimationFrame(frames[id]);
        }
      };
    } else {
      frame = function (cb) {
        return setTimeout(cb, TIME);
      };
      cancel = function (timer) {
        return clearTimeout(timer);
      };
    }

    return { frame: frame, cancel: cancel };
  }());

  var getWorker = (function () {
    var worker;
    var prom;
    var resolves = {};

    function decorate(worker) {
      function execute(options, callback) {
        worker.postMessage({ options: options || {}, callback: callback });
      }
      worker.init = function initWorker(canvas) {
        var offscreen = canvas.transferControlToOffscreen();
        worker.postMessage({ canvas: offscreen }, [offscreen]);
      };

      worker.fire = function fireWorker(options, size, done) {
        if (prom) {
          execute(options, null);
          return prom;
        }

        var id = Math.random().toString(36).slice(2);

        prom = promise(function (resolve) {
          function workerDone(msg) {
            if (msg.data.callback !== id) {
              return;
            }

            delete resolves[id];
            worker.removeEventListener('message', workerDone);

            prom = null;

            bitmapMapper.clear();

            done();
            resolve();
          }

          worker.addEventListener('message', workerDone);
          execute(options, id);

          resolves[id] = workerDone.bind(null, { data: { callback: id }});
        });

        return prom;
      };

      worker.reset = function resetWorker() {
        worker.postMessage({ reset: true });

        for (var id in resolves) {
          resolves[id]();
          delete resolves[id];
        }
      };
    }

    return function () {
      if (worker) {
        return worker;
      }

      if (!isWorker && canUseWorker) {
        var code = [
          'var CONFETTI, SIZE = {}, module = {};',
          '(' + main.toString() + ')(this, module, true, SIZE);',
          'onmessage = function(msg) {',
          '  if (msg.data.options) {',
          '    CONFETTI(msg.data.options).then(function () {',
          '      if (msg.data.callback) {',
          '        postMessage({ callback: msg.data.callback });',
          '      }',
          '    });',
          '  } else if (msg.data.reset) {',
          '    CONFETTI && CONFETTI.reset();',
          '  } else if (msg.data.resize) {',
          '    SIZE.width = msg.data.resize.width;',
          '    SIZE.height = msg.data.resize.height;',
          '  } else if (msg.data.canvas) {',
          '    SIZE.width = msg.data.canvas.width;',
          '    SIZE.height = msg.data.canvas.height;',
          '    CONFETTI = module.exports.create(msg.data.canvas);',
          '  }',
          '}',
        ].join('\n');
        try {
          worker = new Worker(URL.createObjectURL(new Blob([code])));
        } catch (e) {
          // eslint-disable-next-line no-console
          typeof console !== 'undefined' && typeof console.warn === 'function' ? console.warn('🎊 Could not load worker', e) : null;

          return null;
        }

        decorate(worker);
      }

      return worker;
    };
  })();

  var defaults = {
    particleCount: 50,
    angle: 90,
    spread: 45,
    startVelocity: 45,
    decay: 0.9,
    gravity: 1,
    drift: 0,
    ticks: 200,
    x: 0.5,
    y: 0.5,
    shapes: ['square', 'circle'],
    zIndex: 100,
    colors: [
      '#26ccff',
      '#a25afd',
      '#ff5e7e',
      '#88ff5a',
      '#fcff42',
      '#ffa62d',
      '#ff36ff'
    ],
    // probably should be true, but back-compat
    disableForReducedMotion: false,
    scalar: 1
  };

  function convert(val, transform) {
    return transform ? transform(val) : val;
  }

  function isOk(val) {
    return !(val === null || val === undefined);
  }

  function prop(options, name, transform) {
    return convert(
      options && isOk(options[name]) ? options[name] : defaults[name],
      transform
    );
  }

  function onlyPositiveInt(number){
    return number < 0 ? 0 : Math.floor(number);
  }

  function randomInt(min, max) {
    // [min, max)
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function toDecimal(str) {
    return parseInt(str, 16);
  }

  function colorsToRgb(colors) {
    return colors.map(hexToRgb);
  }

  function hexToRgb(str) {
    var val = String(str).replace(/[^0-9a-f]/gi, '');

    if (val.length < 6) {
        val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2];
    }

    return {
      r: toDecimal(val.substring(0,2)),
      g: toDecimal(val.substring(2,4)),
      b: toDecimal(val.substring(4,6))
    };
  }

  function getOrigin(options) {
    var origin = prop(options, 'origin', Object);
    origin.x = prop(origin, 'x', Number);
    origin.y = prop(origin, 'y', Number);

    return origin;
  }

  function setCanvasWindowSize(canvas) {
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
  }

  function setCanvasRectSize(canvas) {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function getCanvas(zIndex) {
    var canvas = document.createElement('canvas');

    canvas.style.position = 'fixed';
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = zIndex;

    return canvas;
  }

  function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(radiusX, radiusY);
    context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
    context.restore();
  }

  function randomPhysics(opts) {
    var radAngle = opts.angle * (Math.PI / 180);
    var radSpread = opts.spread * (Math.PI / 180);

    return {
      x: opts.x,
      y: opts.y,
      wobble: Math.random() * 10,
      wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
      velocity: (opts.startVelocity * 0.5) + (Math.random() * opts.startVelocity),
      angle2D: -radAngle + ((0.5 * radSpread) - (Math.random() * radSpread)),
      tiltAngle: (Math.random() * (0.75 - 0.25) + 0.25) * Math.PI,
      color: opts.color,
      shape: opts.shape,
      tick: 0,
      totalTicks: opts.ticks,
      decay: opts.decay,
      drift: opts.drift,
      random: Math.random() + 2,
      tiltSin: 0,
      tiltCos: 0,
      wobbleX: 0,
      wobbleY: 0,
      gravity: opts.gravity * 3,
      ovalScalar: 0.6,
      scalar: opts.scalar,
      flat: opts.flat
    };
  }

  function updateFetti(context, fetti) {
    fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift;
    fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
    fetti.velocity *= fetti.decay;

    if (fetti.flat) {
      fetti.wobble = 0;
      fetti.wobbleX = fetti.x + (10 * fetti.scalar);
      fetti.wobbleY = fetti.y + (10 * fetti.scalar);

      fetti.tiltSin = 0;
      fetti.tiltCos = 0;
      fetti.random = 1;
    } else {
      fetti.wobble += fetti.wobbleSpeed;
      fetti.wobbleX = fetti.x + ((10 * fetti.scalar) * Math.cos(fetti.wobble));
      fetti.wobbleY = fetti.y + ((10 * fetti.scalar) * Math.sin(fetti.wobble));

      fetti.tiltAngle += 0.1;
      fetti.tiltSin = Math.sin(fetti.tiltAngle);
      fetti.tiltCos = Math.cos(fetti.tiltAngle);
      fetti.random = Math.random() + 2;
    }

    var progress = (fetti.tick++) / fetti.totalTicks;

    var x1 = fetti.x + (fetti.random * fetti.tiltCos);
    var y1 = fetti.y + (fetti.random * fetti.tiltSin);
    var x2 = fetti.wobbleX + (fetti.random * fetti.tiltCos);
    var y2 = fetti.wobbleY + (fetti.random * fetti.tiltSin);

    context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';

    context.beginPath();

    if (canUsePaths && fetti.shape.type === 'path' && typeof fetti.shape.path === 'string' && Array.isArray(fetti.shape.matrix)) {
      context.fill(transformPath2D(
        fetti.shape.path,
        fetti.shape.matrix,
        fetti.x,
        fetti.y,
        Math.abs(x2 - x1) * 0.1,
        Math.abs(y2 - y1) * 0.1,
        Math.PI / 10 * fetti.wobble
      ));
    } else if (fetti.shape.type === 'bitmap') {
      var rotation = Math.PI / 10 * fetti.wobble;
      var scaleX = Math.abs(x2 - x1) * 0.1;
      var scaleY = Math.abs(y2 - y1) * 0.1;
      var width = fetti.shape.bitmap.width * fetti.scalar;
      var height = fetti.shape.bitmap.height * fetti.scalar;

      var matrix = new DOMMatrix([
        Math.cos(rotation) * scaleX,
        Math.sin(rotation) * scaleX,
        -Math.sin(rotation) * scaleY,
        Math.cos(rotation) * scaleY,
        fetti.x,
        fetti.y
      ]);

      // apply the transform matrix from the confetti shape
      matrix.multiplySelf(new DOMMatrix(fetti.shape.matrix));

      var pattern = context.createPattern(bitmapMapper.transform(fetti.shape.bitmap), 'no-repeat');
      pattern.setTransform(matrix);

      context.globalAlpha = (1 - progress);
      context.fillStyle = pattern;
      context.fillRect(
        fetti.x - (width / 2),
        fetti.y - (height / 2),
        width,
        height
      );
      context.globalAlpha = 1;
    } else if (fetti.shape === 'circle') {
      context.ellipse ?
        context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) :
        ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
    } else if (fetti.shape === 'star') {
      var rot = Math.PI / 2 * 3;
      var innerRadius = 4 * fetti.scalar;
      var outerRadius = 8 * fetti.scalar;
      var x = fetti.x;
      var y = fetti.y;
      var spikes = 5;
      var step = Math.PI / spikes;

      while (spikes--) {
        x = fetti.x + Math.cos(rot) * outerRadius;
        y = fetti.y + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;

        x = fetti.x + Math.cos(rot) * innerRadius;
        y = fetti.y + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
      }
    } else {
      context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
      context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
      context.lineTo(Math.floor(x2), Math.floor(y2));
      context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
    }

    context.closePath();
    context.fill();

    return fetti.tick < fetti.totalTicks;
  }

  function animate(canvas, fettis, resizer, size, done) {
    var animatingFettis = fettis.slice();
    var context = canvas.getContext('2d');
    var animationFrame;
    var destroy;

    var prom = promise(function (resolve) {
      function onDone() {
        animationFrame = destroy = null;

        context.clearRect(0, 0, size.width, size.height);
        bitmapMapper.clear();

        done();
        resolve();
      }

      function update() {
        if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
          size.width = canvas.width = workerSize.width;
          size.height = canvas.height = workerSize.height;
        }

        if (!size.width && !size.height) {
          resizer(canvas);
          size.width = canvas.width;
          size.height = canvas.height;
        }

        context.clearRect(0, 0, size.width, size.height);

        animatingFettis = animatingFettis.filter(function (fetti) {
          return updateFetti(context, fetti);
        });

        if (animatingFettis.length) {
          animationFrame = raf.frame(update);
        } else {
          onDone();
        }
      }

      animationFrame = raf.frame(update);
      destroy = onDone;
    });

    return {
      addFettis: function (fettis) {
        animatingFettis = animatingFettis.concat(fettis);

        return prom;
      },
      canvas: canvas,
      promise: prom,
      reset: function () {
        if (animationFrame) {
          raf.cancel(animationFrame);
        }

        if (destroy) {
          destroy();
        }
      }
    };
  }

  function confettiCannon(canvas, globalOpts) {
    var isLibCanvas = !canvas;
    var allowResize = !!prop(globalOpts || {}, 'resize');
    var hasResizeEventRegistered = false;
    var globalDisableForReducedMotion = prop(globalOpts, 'disableForReducedMotion', Boolean);
    var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker');
    var worker = shouldUseWorker ? getWorker() : null;
    var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
    var initialized = (canvas && worker) ? !!canvas.__confetti_initialized : false;
    var preferLessMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion)').matches;
    var animationObj;

    function fireLocal(options, size, done) {
      var particleCount = prop(options, 'particleCount', onlyPositiveInt);
      var angle = prop(options, 'angle', Number);
      var spread = prop(options, 'spread', Number);
      var startVelocity = prop(options, 'startVelocity', Number);
      var decay = prop(options, 'decay', Number);
      var gravity = prop(options, 'gravity', Number);
      var drift = prop(options, 'drift', Number);
      var colors = prop(options, 'colors', colorsToRgb);
      var ticks = prop(options, 'ticks', Number);
      var shapes = prop(options, 'shapes');
      var scalar = prop(options, 'scalar');
      var flat = !!prop(options, 'flat');
      var origin = getOrigin(options);

      var temp = particleCount;
      var fettis = [];

      var startX = canvas.width * origin.x;
      var startY = canvas.height * origin.y;

      while (temp--) {
        fettis.push(
          randomPhysics({
            x: startX,
            y: startY,
            angle: angle,
            spread: spread,
            startVelocity: startVelocity,
            color: colors[temp % colors.length],
            shape: shapes[randomInt(0, shapes.length)],
            ticks: ticks,
            decay: decay,
            gravity: gravity,
            drift: drift,
            scalar: scalar,
            flat: flat
          })
        );
      }

      // if we have a previous canvas already animating,
      // add to it
      if (animationObj) {
        return animationObj.addFettis(fettis);
      }

      animationObj = animate(canvas, fettis, resizer, size , done);

      return animationObj.promise;
    }

    function fire(options) {
      var disableForReducedMotion = globalDisableForReducedMotion || prop(options, 'disableForReducedMotion', Boolean);
      var zIndex = prop(options, 'zIndex', Number);

      if (disableForReducedMotion && preferLessMotion) {
        return promise(function (resolve) {
          resolve();
        });
      }

      if (isLibCanvas && animationObj) {
        // use existing canvas from in-progress animation
        canvas = animationObj.canvas;
      } else if (isLibCanvas && !canvas) {
        // create and initialize a new canvas
        canvas = getCanvas(zIndex);
        document.body.appendChild(canvas);
      }

      if (allowResize && !initialized) {
        // initialize the size of a user-supplied canvas
        resizer(canvas);
      }

      var size = {
        width: canvas.width,
        height: canvas.height
      };

      if (worker && !initialized) {
        worker.init(canvas);
      }

      initialized = true;

      if (worker) {
        canvas.__confetti_initialized = true;
      }

      function onResize() {
        if (worker) {
          // TODO this really shouldn't be immediate, because it is expensive
          var obj = {
            getBoundingClientRect: function () {
              if (!isLibCanvas) {
                return canvas.getBoundingClientRect();
              }
            }
          };

          resizer(obj);

          worker.postMessage({
            resize: {
              width: obj.width,
              height: obj.height
            }
          });
          return;
        }

        // don't actually query the size here, since this
        // can execute frequently and rapidly
        size.width = size.height = null;
      }

      function done() {
        animationObj = null;

        if (allowResize) {
          hasResizeEventRegistered = false;
          global.removeEventListener('resize', onResize);
        }

        if (isLibCanvas && canvas) {
          if (document.body.contains(canvas)) {
            document.body.removeChild(canvas);
          }
          canvas = null;
          initialized = false;
        }
      }

      if (allowResize && !hasResizeEventRegistered) {
        hasResizeEventRegistered = true;
        global.addEventListener('resize', onResize, false);
      }

      if (worker) {
        return worker.fire(options, size, done);
      }

      return fireLocal(options, size, done);
    }

    fire.reset = function () {
      if (worker) {
        worker.reset();
      }

      if (animationObj) {
        animationObj.reset();
      }
    };

    return fire;
  }

  // Make default export lazy to defer worker creation until called.
  var defaultFire;
  function getDefaultFire() {
    if (!defaultFire) {
      defaultFire = confettiCannon(null, { useWorker: true, resize: true });
    }
    return defaultFire;
  }

  function transformPath2D(pathString, pathMatrix, x, y, scaleX, scaleY, rotation) {
    var path2d = new Path2D(pathString);

    var t1 = new Path2D();
    t1.addPath(path2d, new DOMMatrix(pathMatrix));

    var t2 = new Path2D();
    // see https://developer.mozilla.org/en-US/docs/Web/API/DOMMatrix/DOMMatrix
    t2.addPath(t1, new DOMMatrix([
      Math.cos(rotation) * scaleX,
      Math.sin(rotation) * scaleX,
      -Math.sin(rotation) * scaleY,
      Math.cos(rotation) * scaleY,
      x,
      y
    ]));

    return t2;
  }

  function shapeFromPath(pathData) {
    if (!canUsePaths) {
      throw new Error('path confetti are not supported in this browser');
    }

    var path, matrix;

    if (typeof pathData === 'string') {
      path = pathData;
    } else {
      path = pathData.path;
      matrix = pathData.matrix;
    }

    var path2d = new Path2D(path);
    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d');

    if (!matrix) {
      // attempt to figure out the width of the path, up to 1000x1000
      var maxSize = 1000;
      var minX = maxSize;
      var minY = maxSize;
      var maxX = 0;
      var maxY = 0;
      var width, height;

      // do some line skipping... this is faster than checking
      // every pixel and will be mostly still correct
      for (var x = 0; x < maxSize; x += 2) {
        for (var y = 0; y < maxSize; y += 2) {
          if (tempCtx.isPointInPath(path2d, x, y, 'nonzero')) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      width = maxX - minX;
      height = maxY - minY;

      var maxDesiredSize = 10;
      var scale = Math.min(maxDesiredSize/width, maxDesiredSize/height);

      matrix = [
        scale, 0, 0, scale,
        -Math.round((width/2) + minX) * scale,
        -Math.round((height/2) + minY) * scale
      ];
    }

    return {
      type: 'path',
      path: path,
      matrix: matrix
    };
  }

  function shapeFromText(textData) {
    var text,
        scalar = 1,
        color = '#000000',
        // see https://nolanlawson.com/2022/04/08/the-struggle-of-using-native-emoji-on-the-web/
        fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';

    if (typeof textData === 'string') {
      text = textData;
    } else {
      text = textData.text;
      scalar = 'scalar' in textData ? textData.scalar : scalar;
      fontFamily = 'fontFamily' in textData ? textData.fontFamily : fontFamily;
      color = 'color' in textData ? textData.color : color;
    }

    // all other confetti are 10 pixels,
    // so this pixel size is the de-facto 100% scale confetti
    var fontSize = 10 * scalar;
    var font = '' + fontSize + 'px ' + fontFamily;

    var canvas = new OffscreenCanvas(fontSize, fontSize);
    var ctx = canvas.getContext('2d');

    ctx.font = font;
    var size = ctx.measureText(text);
    var width = Math.ceil(size.actualBoundingBoxRight + size.actualBoundingBoxLeft);
    var height = Math.ceil(size.actualBoundingBoxAscent + size.actualBoundingBoxDescent);

    var padding = 2;
    var x = size.actualBoundingBoxLeft + padding;
    var y = size.actualBoundingBoxAscent + padding;
    width += padding + padding;
    height += padding + padding;

    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
    ctx.font = font;
    ctx.fillStyle = color;

    ctx.fillText(text, x, y);

    var scale = 1 / scalar;

    return {
      type: 'bitmap',
      // TODO these probably need to be transfered for workers
      bitmap: canvas.transferToImageBitmap(),
      matrix: [scale, 0, 0, scale, -width * scale / 2, -height * scale / 2]
    };
  }

  module.exports = function() {
    return getDefaultFire().apply(this, arguments);
  };
  module.exports.reset = function() {
    getDefaultFire().reset();
  };
  module.exports.create = confettiCannon;
  module.exports.shapeFromPath = shapeFromPath;
  module.exports.shapeFromText = shapeFromText;
}((function () {
  if (typeof window !== 'undefined') {
    return window;
  }

  if (typeof self !== 'undefined') {
    return self;
  }

  return this || {};
})(), module$1, false));

// end source content

var confetti = module$1.exports;
module$1.exports.create;

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
// Confetti Utility Functions for ChoreBot Cards
// ============================================================================
/**
 * Extract color variants (lighter and darker shades) from a base color
 * Returns array of 5 colors compatible with canvas-confetti
 *
 * @param baseColor - Base color (hex, rgb, or CSS variable)
 * @returns Array of 5 hex color strings without # prefix (format: 'RRGGBB')
 */
function extractColorVariants(baseColor) {
    const shades = calculateColorShades(baseColor);
    return [
        shades.lighter,
        shades.light,
        shades.base,
        shades.dark,
        shades.darker,
    ];
}
/**
 * Play star shower effect falling from top (all tasks complete)
 * @param colors - Array of color strings to use for stars
 * @param duration - Duration in milliseconds (default: 5000)
 */
function playStarShower(colors, duration = 5000) {
    const animationEnd = Date.now() + duration;
    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    (function frame() {
        const timeLeft = animationEnd - Date.now();
        const ticks = Math.max(200, 500 * (timeLeft / duration));
        confetti({
            particleCount: 1,
            startVelocity: 0,
            ticks: ticks,
            origin: {
                x: Math.random(),
                // Keep stars mostly at the top of the screen
                y: Math.random() * 0.3 - 0.1,
            },
            colors: colors,
            shapes: ["star"],
            gravity: randomInRange(1.2, 1.5), // Faster fall (increased from 0.4-0.6)
            scalar: randomInRange(1.2, 2.0), // Larger stars (increased from 0.4-1.0)
            drift: randomInRange(-0.4, 0.4),
            disableForReducedMotion: true,
        });
        if (timeLeft > 0) {
            requestAnimationFrame(frame);
        }
    })();
}

// ============================================================================
// ChoreBot Rewards Card (TypeScript)
// ============================================================================
/**
 * ChoreBot Rewards Card
 *
 * Displays rewards and person points with:
 * - People section showing avatars (picture or initials) with point balances
 * - Rewards grid with icons, names, costs, and descriptions
 * - Redeem buttons per person (disabled if can't afford)
 * - Confetti animation on successful redemption
 */
let ChoreBotRewardsCard = class ChoreBotRewardsCard extends i {
    constructor() {
        super(...arguments);
        this._redeeming = null; // reward_id being redeemed
        this._selectedPersonId = null; // Currently selected person
        this._showConfirmModal = false; // Show redemption confirmation
        this._pendingRedemption = null; // Pending redemption details
    }
    setConfig(config) {
        this._config = {
            type: "custom:chorebot-rewards-card",
            title: config.title || "Rewards",
            show_title: config.show_title !== false,
            hide_card_background: config.hide_card_background === true,
            show_people_section: config.show_people_section !== false,
            show_disabled_rewards: config.show_disabled_rewards === true,
            sort_by: config.sort_by || "cost",
        };
    }
    static getStubConfig() {
        return {
            type: "custom:chorebot-rewards-card",
            title: "Rewards",
            show_title: true,
            hide_card_background: false,
            show_people_section: true,
            show_disabled_rewards: false,
            sort_by: "cost",
        };
    }
    getCardSize() {
        return 3;
    }
    static getConfigForm() {
        return {
            schema: [
                {
                    name: "title",
                    default: "Rewards",
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
                    name: "show_people_section",
                    default: true,
                    selector: { boolean: {} },
                },
                {
                    name: "show_disabled_rewards",
                    default: false,
                    selector: { boolean: {} },
                },
                {
                    name: "sort_by",
                    default: "cost",
                    selector: {
                        select: {
                            options: [
                                { label: "Cost (Low to High)", value: "cost" },
                                { label: "Name (A-Z)", value: "name" },
                                { label: "Date Created (Oldest First)", value: "created" },
                            ],
                        },
                    },
                },
            ],
            computeLabel: (schema) => {
                const labels = {
                    title: "Card Title",
                    show_title: "Show Title",
                    hide_card_background: "Hide Card Background",
                    show_people_section: "Show People Section",
                    show_disabled_rewards: "Show Disabled Rewards",
                    sort_by: "Sort Rewards By",
                };
                return labels[schema.name] || undefined;
            },
            computeHelper: (schema) => {
                const helpers = {
                    title: "Custom title for the card",
                    show_title: "Show the card title",
                    hide_card_background: "Hide the card background and padding for a seamless look",
                    show_people_section: "Display the people section showing avatars and points balances",
                    show_disabled_rewards: "Include rewards that have been disabled in the grid",
                    sort_by: "Choose how to sort the rewards in the grid",
                };
                return helpers[schema.name] || undefined;
            },
        };
    }
    render() {
        if (!this.hass || !this._config) {
            return x `<ha-card>Loading...</ha-card>`;
        }
        // Get points sensor entity
        const sensor = this.hass.states["sensor.chorebot_points"];
        if (!sensor) {
            return x `<ha-card>
        <div class="empty-state">
          ChoreBot Points sensor not found. Make sure the integration is set up.
        </div>
      </ha-card>`;
        }
        const people = sensor.attributes.people || {};
        const rewards = sensor.attributes.rewards || [];
        return x `
      <ha-card
        class="${this._config.hide_card_background ? "no-background" : ""}"
      >
        ${this._config.show_title
            ? x `<div class="card-header">${this._config.title}</div>`
            : ""}
        ${this._config.show_people_section
            ? this._renderPeopleSection(people)
            : ""}
        ${this._renderRewardsGrid(rewards, people)}
      </ha-card>
      ${this._showConfirmModal ? this._renderConfirmModal(people, rewards) : ""}
    `;
    }
    _renderConfirmModal(people, rewards) {
        if (!this._pendingRedemption)
            return "";
        const { personId, rewardId } = this._pendingRedemption;
        const person = people[personId];
        const reward = rewards.find((r) => r.id === rewardId);
        if (!person || !reward)
            return "";
        const personName = this._getPersonName(personId);
        const remainingPoints = person.points_balance - reward.cost;
        return x `
      <div class="modal-overlay" @click="${this._cancelRedemption}">
        <div
          class="modal-content"
          @click="${(e) => e.stopPropagation()}"
        >
          <div class="modal-header">Are you sure?</div>
          <div class="modal-body">
            <div class="modal-info">
              <div class="modal-info-row">
                <span class="modal-info-label">Person:</span>
                <span class="modal-info-value">${personName}</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Reward:</span>
                <span class="modal-info-value">${reward.name}</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Cost:</span>
                <span class="modal-info-value">${reward.cost} pts</span>
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Current Balance:</span>
                <span class="modal-info-value"
                  >${person.points_balance} pts</span
                >
              </div>
              <div class="modal-info-row">
                <span class="modal-info-label">Remaining Balance:</span>
                <span class="modal-info-value">${remainingPoints} pts</span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button
              class="modal-button cancel"
              @click="${this._cancelRedemption}"
            >
              Cancel
            </button>
            <button
              class="modal-button confirm"
              @click="${this._confirmRedemption}"
            >
              Redeem
            </button>
          </div>
        </div>
      </div>
    `;
    }
    _renderPeopleSection(people) {
        const peopleArray = Object.values(people)
            .filter((person) => {
            // Filter out people whose entity no longer exists
            return this.hass?.states[person.entity_id] !== undefined;
        })
            .sort((a, b) => b.points_balance - a.points_balance);
        if (peopleArray.length === 0) {
            return x `<div class="empty-state">
        No people with points yet. Complete tasks to earn points!
      </div>`;
        }
        // Auto-select first person if none selected or selected person no longer exists
        if (!this._selectedPersonId ||
            !peopleArray.find((p) => p.entity_id === this._selectedPersonId)) {
            this._selectedPersonId = peopleArray[0].entity_id;
        }
        return x `
      <div class="people-section">
        ${peopleArray.map((person) => this._renderPersonCard(person))}
      </div>
    `;
    }
    _renderPersonCard(person) {
        const entity = this.hass?.states[person.entity_id];
        const pictureUrl = entity?.attributes.entity_picture;
        const name = this._getPersonName(person.entity_id);
        const isSelected = this._selectedPersonId === person.entity_id;
        return x `
      <div
        class="person-card ${isSelected ? "selected" : ""}"
        @click="${() => this._selectPerson(person.entity_id)}"
      >
        ${pictureUrl
            ? x `<div class="person-avatar">
              <img src="${pictureUrl}" alt="${name}" />
            </div>`
            : x `<div class="person-avatar initials">
              ${this._getPersonInitials(person.entity_id)}
            </div>`}
        <div class="person-info">
          <div class="person-name">${name}</div>
          <div class="person-points">${person.points_balance} pts</div>
        </div>
      </div>
    `;
    }
    _renderRewardsGrid(rewards, people) {
        // Filter and sort rewards
        const filteredRewards = rewards.filter((r) => this._config.show_disabled_rewards || r.enabled);
        const sortedRewards = this._sortRewards(filteredRewards);
        if (sortedRewards.length === 0) {
            return x `<div class="empty-state">
        No rewards configured yet. Use the
        <code>chorebot.manage_reward</code> service to create rewards.
      </div>`;
        }
        return x `
      <div class="rewards-grid">
        ${sortedRewards.map((reward) => this._renderRewardCard(reward, people))}
      </div>
    `;
    }
    _renderRewardCard(reward, people) {
        const selectedPerson = this._selectedPersonId
            ? people[this._selectedPersonId]
            : null;
        const canAfford = selectedPerson
            ? selectedPerson.points_balance >= reward.cost
            : false;
        const isRedeeming = this._redeeming === reward.id;
        return x `
      <div class="reward-card">
        <div class="reward-icon">
          <ha-icon icon="${reward.icon}"></ha-icon>
        </div>
        <div class="reward-name">${reward.name}</div>
        <div class="reward-cost">${reward.cost} pts</div>
        ${reward.description
            ? x `<div class="reward-description">${reward.description}</div>`
            : ""}

        <button
          class="redeem-button"
          ?disabled="${!canAfford ||
            !reward.enabled ||
            isRedeeming ||
            !this._selectedPersonId}"
          @click="${() => this._showRedeemConfirmation(reward.id)}"
        >
          ${isRedeeming ? "Redeeming..." : "Redeem"}
        </button>
      </div>
    `;
    }
    _sortRewards(rewards) {
        const sorted = [...rewards];
        switch (this._config.sort_by) {
            case "name":
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case "created":
                return sorted.sort((a, b) => new Date(a.created || 0).getTime() -
                    new Date(b.created || 0).getTime());
            case "cost":
            default:
                return sorted.sort((a, b) => a.cost - b.cost);
        }
    }
    async _redeemReward(personId, rewardId) {
        this._redeeming = rewardId;
        try {
            await this.hass.callService("chorebot", "redeem_reward", {
                person_id: personId,
                reward_id: rewardId,
            });
            // Show success animation (star shower with themed colors)
            this._showRedemptionSuccess();
        }
        catch (err) {
            // Show error message
            const errorMessage = err.message || "Failed to redeem reward. Please try again.";
            alert(errorMessage);
        }
        finally {
            this._redeeming = null;
        }
    }
    _showRedemptionSuccess() {
        // Get base color from primary color
        const baseColor = getComputedStyle(this).getPropertyValue("--primary-color") || "#03a9f4";
        // Extract color variants (lighter and darker shades)
        const colors = extractColorVariants(baseColor);
        // Play star shower animation
        playStarShower(colors, 3000);
    }
    _selectPerson(personId) {
        this._selectedPersonId = personId;
    }
    _showRedeemConfirmation(rewardId) {
        if (!this._selectedPersonId)
            return;
        this._pendingRedemption = {
            personId: this._selectedPersonId,
            rewardId: rewardId,
        };
        this._showConfirmModal = true;
    }
    _cancelRedemption() {
        this._showConfirmModal = false;
        this._pendingRedemption = null;
    }
    async _confirmRedemption() {
        if (!this._pendingRedemption)
            return;
        const { personId, rewardId } = this._pendingRedemption;
        // Close modal and trigger redemption
        this._showConfirmModal = false;
        this._pendingRedemption = null;
        await this._redeemReward(personId, rewardId);
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
ChoreBotRewardsCard.styles = i$3 `
    :host {
      display: block;
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

    /* People Section */
    .people-section {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .person-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      flex: 1;
      min-width: 0; /* Allow flex items to shrink below content size */
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .person-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .person-card.selected {
      border-color: var(--primary-color);
      border-width: 2px;
      padding: 11px; /* Compensate for thicker border */
      background: color-mix(
        in srgb,
        var(--primary-color) 10%,
        var(--card-background-color)
      );
    }

    .person-card.selected::after {
      content: "✓";
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: var(--primary-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }

    .person-avatar {
      width: 48px;
      height: 48px;
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
      font-size: 18px;
      font-weight: bold;
    }

    .person-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .person-name {
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    .person-points {
      font-size: 14px;
      color: var(--secondary-text-color);
    }

    /* Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .reward-card {
      padding: 16px;
      border-radius: 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reward-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--primary-color);
      color: white;
      margin: 0 auto;
    }

    .reward-icon ha-icon {
      --mdi-icon-size: 32px;
    }

    .reward-name {
      font-size: 18px;
      font-weight: 500;
      text-align: center;
      color: var(--primary-text-color);
    }

    .reward-cost {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      color: var(--primary-color);
    }

    .reward-description {
      font-size: 14px;
      color: var(--secondary-text-color);
      text-align: center;
      margin-top: -4px;
    }

    /* Redeem Button */
    .redeem-button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      margin-top: auto;
      width: 100%;
    }

    .redeem-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .redeem-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Confirmation Modal */
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
    }

    .modal-header {
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--primary-text-color);
    }

    .modal-body {
      margin-bottom: 24px;
      color: var(--primary-text-color);
    }

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
    }

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
      background: var(--primary-color);
      color: white;
    }

    .modal-button.confirm:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }
  `;
__decorate([
    n({ attribute: false })
], ChoreBotRewardsCard.prototype, "hass", void 0);
__decorate([
    r()
], ChoreBotRewardsCard.prototype, "_config", void 0);
__decorate([
    r()
], ChoreBotRewardsCard.prototype, "_redeeming", void 0);
__decorate([
    r()
], ChoreBotRewardsCard.prototype, "_selectedPersonId", void 0);
__decorate([
    r()
], ChoreBotRewardsCard.prototype, "_showConfirmModal", void 0);
__decorate([
    r()
], ChoreBotRewardsCard.prototype, "_pendingRedemption", void 0);
ChoreBotRewardsCard = __decorate([
    t("chorebot-rewards-card")
], ChoreBotRewardsCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "chorebot-rewards-card",
    name: "ChoreBot Rewards Card",
    description: "Display points, rewards, and redemption options for ChoreBot",
    preview: true,
});

export { ChoreBotRewardsCard };
//# sourceMappingURL=chorebot-rewards-card.js.map
