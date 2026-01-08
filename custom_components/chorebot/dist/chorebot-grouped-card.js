function t(t,e,s,i){var n,o=arguments.length,r=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(n=t[a])&&(r=(o<3?n(r):o>3?n(e,s,r):n(e,s))||r);return o>3&&r&&Object.defineProperty(e,s,r),r}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),n=new WeakMap;let o=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&n.set(e,t))}return t}toString(){return this.cssText}};const r=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new o("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:a,defineProperty:l,getOwnPropertyDescriptor:c,getOwnPropertyNames:d,getOwnPropertySymbols:h,getPrototypeOf:u}=Object,p=globalThis,_=p.trustedTypes,g=_?_.emptyScript:"",f=p.reactiveElementPolyfillSupport,m=(t,e)=>t,y={toAttribute(t,e){switch(e){case Boolean:t=t?g:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},b=(t,e)=>!a(t,e),v={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),p.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=v){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&l(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:n}=c(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const o=i?.call(this);n?.call(this,e),this.requestUpdate(t,o,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??v}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const t=this.properties,e=[...d(t),...h(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(r(t))}else void 0!==t&&e.push(r(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),n=e.litNonce;void 0!==n&&i.setAttribute("nonce",n),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const n=(void 0!==s.converter?.toAttribute?s.converter:y).toAttribute(e,s.type);this._$Em=t,null==n?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:y;this._$Em=i;const o=n.fromAttribute(e,t.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(t,e,s){if(void 0!==t){const i=this.constructor,n=this[t];if(s??=i.getPropertyOptions(t),!((s.hasChanged??b)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),!0!==n||void 0!==o)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[m("elementProperties")]=new Map,w[m("finalized")]=new Map,f?.({ReactiveElement:w}),(p.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const $=globalThis,k=$.trustedTypes,x=k?k.createPolicy("lit-html",{createHTML:t=>t}):void 0,T="$lit$",A=`lit$${Math.random().toFixed(9).slice(2)}$`,C="?"+A,M=`<${C}>`,E=document,S=()=>E.createComment(""),D=t=>null===t||"object"!=typeof t&&"function"!=typeof t,P=Array.isArray,O="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,N=/-->/g,R=/>/g,H=RegExp(`>|${O}(?:([^\\s"'>=/]+)(${O}*=${O}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),I=/'/g,F=/"/g,z=/^(?:script|style|textarea|title)$/i,B=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),L=Symbol.for("lit-noChange"),Y=Symbol.for("lit-nothing"),j=new WeakMap,q=E.createTreeWalker(E,129);function W(t,e){if(!P(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==x?x.createHTML(e):e}const V=(t,e)=>{const s=t.length-1,i=[];let n,o=2===e?"<svg>":3===e?"<math>":"",r=U;for(let e=0;e<s;e++){const s=t[e];let a,l,c=-1,d=0;for(;d<s.length&&(r.lastIndex=d,l=r.exec(s),null!==l);)d=r.lastIndex,r===U?"!--"===l[1]?r=N:void 0!==l[1]?r=R:void 0!==l[2]?(z.test(l[2])&&(n=RegExp("</"+l[2],"g")),r=H):void 0!==l[3]&&(r=H):r===H?">"===l[0]?(r=n??U,c=-1):void 0===l[1]?c=-2:(c=r.lastIndex-l[2].length,a=l[1],r=void 0===l[3]?H:'"'===l[3]?F:I):r===F||r===I?r=H:r===N||r===R?r=U:(r=H,n=void 0);const h=r===H&&t[e+1].startsWith("/>")?" ":"";o+=r===U?s+M:c>=0?(i.push(a),s.slice(0,c)+T+s.slice(c)+A+h):s+A+(-2===c?e:h)}return[W(t,o+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class G{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,o=0;const r=t.length-1,a=this.parts,[l,c]=V(t,e);if(this.el=G.createElement(l,s),q.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=q.nextNode())&&a.length<r;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(T)){const e=c[o++],s=i.getAttribute(t).split(A),r=/([.?@])?(.*)/.exec(e);a.push({type:1,index:n,name:r[2],strings:s,ctor:"."===r[1]?Q:"?"===r[1]?tt:"@"===r[1]?et:J}),i.removeAttribute(t)}else t.startsWith(A)&&(a.push({type:6,index:n}),i.removeAttribute(t));if(z.test(i.tagName)){const t=i.textContent.split(A),e=t.length-1;if(e>0){i.textContent=k?k.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],S()),q.nextNode(),a.push({type:2,index:++n});i.append(t[e],S())}}}else if(8===i.nodeType)if(i.data===C)a.push({type:2,index:n});else{let t=-1;for(;-1!==(t=i.data.indexOf(A,t+1));)a.push({type:7,index:n}),t+=A.length-1}n++}}static createElement(t,e){const s=E.createElement("template");return s.innerHTML=t,s}}function Z(t,e,s=t,i){if(e===L)return e;let n=void 0!==i?s._$Co?.[i]:s._$Cl;const o=D(e)?void 0:e._$litDirective$;return n?.constructor!==o&&(n?._$AO?.(!1),void 0===o?n=void 0:(n=new o(t),n._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=n:s._$Cl=n),void 0!==n&&(e=Z(t,n._$AS(t,e.values),n,i)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??E).importNode(e,!0);q.currentNode=i;let n=q.nextNode(),o=0,r=0,a=s[0];for(;void 0!==a;){if(o===a.index){let e;2===a.type?e=new X(n,n.nextSibling,this,t):1===a.type?e=new a.ctor(n,a.name,a.strings,this,t):6===a.type&&(e=new st(n,this,t)),this._$AV.push(e),a=s[++r]}o!==a?.index&&(n=q.nextNode(),o++)}return q.currentNode=E,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=Y,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Z(this,t,e),D(t)?t===Y||null==t||""===t?(this._$AH!==Y&&this._$AR(),this._$AH=Y):t!==this._$AH&&t!==L&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>P(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==Y&&D(this._$AH)?this._$AA.nextSibling.data=t:this.T(E.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=G.createElement(W(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new K(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=j.get(t.strings);return void 0===e&&j.set(t.strings,e=new G(t)),e}k(t){P(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const n of t)i===e.length?e.push(s=new X(this.O(S()),this.O(S()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class J{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=Y,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=Y}_$AI(t,e=this,s,i){const n=this.strings;let o=!1;if(void 0===n)t=Z(this,t,e,0),o=!D(t)||t!==this._$AH&&t!==L,o&&(this._$AH=t);else{const i=t;let r,a;for(t=n[0],r=0;r<n.length-1;r++)a=Z(this,i[s+r],e,r),a===L&&(a=this._$AH[r]),o||=!D(a)||a!==this._$AH[r],a===Y?t=Y:t!==Y&&(t+=(a??"")+n[r+1]),this._$AH[r]=a}o&&!i&&this.j(t)}j(t){t===Y?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Q extends J{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===Y?void 0:t}}class tt extends J{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==Y)}}class et extends J{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=Z(this,t,e,0)??Y)===L)return;const s=this._$AH,i=t===Y&&s!==Y||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==Y&&(s===Y||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Z(this,t)}}const it=$.litHtmlPolyfillSupport;it?.(G,X),($.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let n=i._$litPart$;if(void 0===n){const t=s?.renderBefore??null;i._$litPart$=n=new X(e.insertBefore(S(),t),t,void 0,s??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return L}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const rt=nt.litElementPolyfillSupport;rt?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const at={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:b},lt=(t=at,e,s)=>{const{kind:i,metadata:n}=s;let o=globalThis.litPropertyMetadata.get(n);if(void 0===o&&globalThis.litPropertyMetadata.set(n,o=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),o.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const n=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,n,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const n=this[i];e.call(this,s),this.requestUpdate(i,n,t)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ct(t){return(e,s)=>"object"==typeof s?lt(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function dt(t){return ct({...t,state:!0,attribute:!1})}function ht(t){try{const e=new Date(t);if(isNaN(e.getTime()))return{date:null,time:null};const s=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0");return{date:`${s}-${i}-${n}`,time:`${o}:${String(e.getMinutes()).padStart(2,"0")}`}}catch(e){return console.error("Date parsing error:",e,t),{date:null,time:null}}}function ut(t,e){return t.getFullYear()===e.getFullYear()&&t.getMonth()===e.getMonth()&&t.getDate()===e.getDate()}function pt(t){const e=t.filter(t=>"completed"===t.status).length;return{completed:e,total:t.length}}function _t(t){const e=t.states["sensor.chorebot_points"],s=e?.attributes.points_display;return s?{icon:s.icon??"",text:s.text??"points"}:{icon:"",text:"points"}}function gt(t,e){const s={...t,is_all_day:t.is_all_day||!1,tags:t.tags||[],section_id:t.section_id,points_value:t.points_value||0,streak_bonus_points:t.streak_bonus_points||0,streak_bonus_interval:t.streak_bonus_interval||0};if(t.due){const e=ht(t.due);s.due_date=e.date??void 0,s.due_time=e.time??void 0,s.has_due_date=!0}else s.has_due_date=!1;let i=t.rrule;if(t.parent_uid&&e){const n=e.find(e=>e.uid===t.parent_uid);n&&(i=n.rrule,s.streak_bonus_points=n.streak_bonus_points||0,s.streak_bonus_interval=n.streak_bonus_interval||0)}const n=function(t){if(!t)return null;try{const e=t.split(";");let s=null,i=1;const n=[];let o=null;for(const t of e){const[e,r]=t.split("=");if("FREQ"===e)"DAILY"!==r&&"WEEKLY"!==r&&"MONTHLY"!==r||(s=r);else if("INTERVAL"===e){const t=parseInt(r,10);!isNaN(t)&&t>0&&(i=t)}else if("BYDAY"===e)n.push(...r.split(","));else if("BYMONTHDAY"===e){const t=parseInt(r,10);!isNaN(t)&&t>=1&&t<=31&&(o=t)}}return s?{frequency:s,interval:i,byweekday:n,bymonthday:o}:null}catch(e){return console.error("rrule parsing error:",e,t),null}}(i);return n?(s.has_recurrence=!0,s.recurrence_frequency=n.frequency,s.recurrence_interval=n.interval,s.recurrence_byweekday=n.byweekday,s.recurrence_bymonthday=n.bymonthday||1):(s.has_recurrence=!1,s.recurrence_frequency="DAILY",s.recurrence_interval=1,s.recurrence_byweekday=[],s.recurrence_bymonthday=1),s}function ft(t){const e=function(t){const e=_t(t);return e.text?e.text.charAt(0).toUpperCase()+e.text.slice(1):""}(t)||"Points";return function(t){return{summary:"Task Name",has_due_date:"Has Due Date",is_all_day:"All Day",due_date:"Date",due_time:"Time",description:"Description",section_id:"Section",tags:"Tags",has_recurrence:"Recurring Task",recurrence_frequency:"Frequency",recurrence_interval:"Repeat Every",recurrence_byweekday:"Days of Week",recurrence_bymonthday:"Day of Month",points_value:`${e} Value`,streak_bonus_points:`Streak Bonus ${e}`,streak_bonus_interval:"Bonus Every X Days (0 = no bonus)"}[t.name]||t.name}}function mt(t,e,s,i,n,o,r,a,l,c,d="Edit Task",h=!0){if(!t||!e)return B``;const u=function(t,e,s){const i=void 0!==t.has_due_date?t.has_due_date:!!t.due,n=void 0!==t.is_all_day&&t.is_all_day,o=[{name:"summary",required:!0,selector:{text:{}}},{name:"description",selector:{text:{multiline:!0}}}];if(e.length>0&&o.push({name:"section_id",selector:{select:{options:e.sort((t,e)=>e.sort_order-t.sort_order).map(t=>({label:t.name,value:t.id}))}}}),o.push({name:"tags",selector:{select:{multiple:!0,custom_value:!0,options:s.map(t=>({label:t,value:t}))}}}),o.push({name:"has_due_date",selector:{boolean:{}}}),i&&(o.push({name:"due_date",selector:{date:{}}}),n||o.push({name:"due_time",selector:{time:{}}}),o.push({name:"is_all_day",selector:{boolean:{}}})),i){const e=void 0!==t.has_recurrence&&t.has_recurrence,s=t.recurrence_frequency||"DAILY";o.push({name:"has_recurrence",selector:{boolean:{}}}),e&&(o.push({name:"recurrence_frequency",selector:{select:{options:[{label:"Daily",value:"DAILY"},{label:"Weekly",value:"WEEKLY"},{label:"Monthly",value:"MONTHLY"}]}}}),o.push({name:"recurrence_interval",selector:{number:{min:1,max:999,mode:"box"}}}),"WEEKLY"===s?o.push({name:"recurrence_byweekday",selector:{select:{multiple:!0,options:[{label:"Monday",value:"MO"},{label:"Tuesday",value:"TU"},{label:"Wednesday",value:"WE"},{label:"Thursday",value:"TH"},{label:"Friday",value:"FR"},{label:"Saturday",value:"SA"},{label:"Sunday",value:"SU"}]}}}):"MONTHLY"===s&&o.push({name:"recurrence_bymonthday",selector:{number:{min:1,max:31,mode:"box"}}}))}return o.push({name:"points_value",selector:{number:{min:0,max:1e4,mode:"box"}}}),i&&t.has_recurrence&&(o.push({name:"streak_bonus_points",selector:{number:{min:0,max:1e4,mode:"box"}}}),o.push({name:"streak_bonus_interval",selector:{number:{min:0,max:999,mode:"box"}}})),o}(e,i,n),p=function(t,e){const s=void 0!==t.has_due_date?t.has_due_date:!!t.due,i=void 0!==t.is_all_day&&t.is_all_day;let n=t.due_date||null,o=t.due_time||null;if(!n&&t.due){const e=ht(t.due);n=e.date,o=e.time}return{summary:t.summary||"",has_due_date:s,is_all_day:i,due_date:n||null,due_time:o||"00:00",description:t.description||"",section_id:t.section_id||(e.length>0?e.sort((t,e)=>e.sort_order-t.sort_order)[0].id:void 0),tags:t.tags||[],has_recurrence:s&&t.has_recurrence||!1,recurrence_frequency:t.recurrence_frequency||"DAILY",recurrence_interval:t.recurrence_interval||1,recurrence_byweekday:t.recurrence_byweekday||[],recurrence_bymonthday:t.recurrence_bymonthday||1,points_value:t.points_value||0,streak_bonus_points:t.streak_bonus_points||0,streak_bonus_interval:t.streak_bonus_interval||0}}(e,i),_=ft(s);return B`
    <ha-dialog open @closed=${r} .heading=${d}>
      <ha-form
        .hass=${s}
        .schema=${u}
        .data=${p}
        .computeLabel=${_}
        @value-changed=${a}
      ></ha-form>

      <!-- Delete button (bottom-left positioning via CSS) -->
      ${h&&c&&e?.uid?B`
            <ha-button
              slot="primaryAction"
              @click=${c}
              .disabled=${o}
              class="delete-button"
            >
              Delete
            </ha-button>
          `:""}

      <ha-button slot="primaryAction" @click=${l} .disabled=${o}>
        ${o?"Saving...":"Save"}
      </ha-button>
      <ha-button slot="secondaryAction" @click=${r} .disabled=${o}>
        Cancel
      </ha-button>

      <style>
        ha-dialog {
          --mdc-dialog-min-width: 500px;
        }
        .delete-button {
          --mdc-theme-primary: var(--error-color, #db4437);
          margin-right: auto; /* Push to left */
        }
      </style>
    </ha-dialog>
  `}function yt(t,e){if(t.startsWith("var(")){const e=getComputedStyle(document.documentElement).getPropertyValue(t.slice(4,-1).trim());if(!e)return t;t=e.trim()}let s,i,n;if(t.startsWith("#")){const e=t.replace("#","");s=parseInt(e.substring(0,2),16),i=parseInt(e.substring(2,4),16),n=parseInt(e.substring(4,6),16)}else{if(!t.startsWith("rgb"))return t;{const e=t.match(/\d+/g);if(!e)return t;[s,i,n]=e.map(Number)}}s/=255,i/=255,n/=255;const o=Math.max(s,i,n),r=Math.min(s,i,n);let a=0,l=0,c=(o+r)/2;if(o!==r){const t=o-r;switch(l=c>.5?t/(2-o-r):t/(o+r),o){case s:a=((i-n)/t+(i<n?6:0))/6;break;case i:a=((n-s)/t+2)/6;break;case n:a=((s-i)/t+4)/6}}c=e>0?Math.max(0,Math.min(.95,c+e/100*(1-c))):Math.max(.05,c+e/100*c);const d=(t,e,s)=>(s<0&&(s+=1),s>1&&(s-=1),s<1/6?t+6*(e-t)*s:s<.5?e:s<2/3?t+(e-t)*(2/3-s)*6:t);let h,u,p;if(0===l)h=u=p=c;else{const t=c<.5?c*(1+l):c+l-c*l,e=2*c-t;h=d(e,t,a+1/3),u=d(e,t,a),p=d(e,t,a-1/3)}const _=t=>{const e=Math.round(255*t).toString(16);return 1===e.length?"0"+e:e};return`${_(h)}${_(u)}${_(p)}`.toUpperCase()}var bt={};!function t(e,s,i,n){var o=!!(e.Worker&&e.Blob&&e.Promise&&e.OffscreenCanvas&&e.OffscreenCanvasRenderingContext2D&&e.HTMLCanvasElement&&e.HTMLCanvasElement.prototype.transferControlToOffscreen&&e.URL&&e.URL.createObjectURL),r="function"==typeof Path2D&&"function"==typeof DOMMatrix,a=function(){if(!e.OffscreenCanvas)return!1;try{var t=new OffscreenCanvas(1,1),s=t.getContext("2d");s.fillRect(0,0,1,1);var i=t.transferToImageBitmap();s.createPattern(i,"no-repeat")}catch(t){return!1}return!0}();function l(){}function c(t){var i=s.exports.Promise,n=void 0!==i?i:e.Promise;return"function"==typeof n?new n(t):(t(l,l),null)}var d,h,u,p,_,g,f,m,y,b,v,w=(d=a,h=new Map,{transform:function(t){if(d)return t;if(h.has(t))return h.get(t);var e=new OffscreenCanvas(t.width,t.height);return e.getContext("2d").drawImage(t,0,0),h.set(t,e),e},clear:function(){h.clear()}}),$=(_=Math.floor(1e3/60),g={},f=0,"function"==typeof requestAnimationFrame&&"function"==typeof cancelAnimationFrame?(u=function(t){var e=Math.random();return g[e]=requestAnimationFrame(function s(i){f===i||f+_-1<i?(f=i,delete g[e],t()):g[e]=requestAnimationFrame(s)}),e},p=function(t){g[t]&&cancelAnimationFrame(g[t])}):(u=function(t){return setTimeout(t,_)},p=function(t){return clearTimeout(t)}),{frame:u,cancel:p}),k=(b={},function(){if(m)return m;if(!i&&o){var e=["var CONFETTI, SIZE = {}, module = {};","("+t.toString()+")(this, module, true, SIZE);","onmessage = function(msg) {","  if (msg.data.options) {","    CONFETTI(msg.data.options).then(function () {","      if (msg.data.callback) {","        postMessage({ callback: msg.data.callback });","      }","    });","  } else if (msg.data.reset) {","    CONFETTI && CONFETTI.reset();","  } else if (msg.data.resize) {","    SIZE.width = msg.data.resize.width;","    SIZE.height = msg.data.resize.height;","  } else if (msg.data.canvas) {","    SIZE.width = msg.data.canvas.width;","    SIZE.height = msg.data.canvas.height;","    CONFETTI = module.exports.create(msg.data.canvas);","  }","}"].join("\n");try{m=new Worker(URL.createObjectURL(new Blob([e])))}catch(t){return"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn("🎊 Could not load worker",t),null}!function(t){function e(e,s){t.postMessage({options:e||{},callback:s})}t.init=function(e){var s=e.transferControlToOffscreen();t.postMessage({canvas:s},[s])},t.fire=function(s,i,n){if(y)return e(s,null),y;var o=Math.random().toString(36).slice(2);return y=c(function(i){function r(e){e.data.callback===o&&(delete b[o],t.removeEventListener("message",r),y=null,w.clear(),n(),i())}t.addEventListener("message",r),e(s,o),b[o]=r.bind(null,{data:{callback:o}})})},t.reset=function(){for(var e in t.postMessage({reset:!0}),b)b[e](),delete b[e]}}(m)}return m}),x={particleCount:50,angle:90,spread:45,startVelocity:45,decay:.9,gravity:1,drift:0,ticks:200,x:.5,y:.5,shapes:["square","circle"],zIndex:100,colors:["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffa62d","#ff36ff"],disableForReducedMotion:!1,scalar:1};function T(t,e,s){return function(t,e){return e?e(t):t}(t&&null!=t[e]?t[e]:x[e],s)}function A(t){return t<0?0:Math.floor(t)}function C(t,e){return Math.floor(Math.random()*(e-t))+t}function M(t){return parseInt(t,16)}function E(t){return t.map(S)}function S(t){var e=String(t).replace(/[^0-9a-f]/gi,"");return e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]),{r:M(e.substring(0,2)),g:M(e.substring(2,4)),b:M(e.substring(4,6))}}function D(t){t.width=document.documentElement.clientWidth,t.height=document.documentElement.clientHeight}function P(t){var e=t.getBoundingClientRect();t.width=e.width,t.height=e.height}function O(t){var e=t.angle*(Math.PI/180),s=t.spread*(Math.PI/180);return{x:t.x,y:t.y,wobble:10*Math.random(),wobbleSpeed:Math.min(.11,.1*Math.random()+.05),velocity:.5*t.startVelocity+Math.random()*t.startVelocity,angle2D:-e+(.5*s-Math.random()*s),tiltAngle:(.5*Math.random()+.25)*Math.PI,color:t.color,shape:t.shape,tick:0,totalTicks:t.ticks,decay:t.decay,drift:t.drift,random:Math.random()+2,tiltSin:0,tiltCos:0,wobbleX:0,wobbleY:0,gravity:3*t.gravity,ovalScalar:.6,scalar:t.scalar,flat:t.flat}}function U(t,e){e.x+=Math.cos(e.angle2D)*e.velocity+e.drift,e.y+=Math.sin(e.angle2D)*e.velocity+e.gravity,e.velocity*=e.decay,e.flat?(e.wobble=0,e.wobbleX=e.x+10*e.scalar,e.wobbleY=e.y+10*e.scalar,e.tiltSin=0,e.tiltCos=0,e.random=1):(e.wobble+=e.wobbleSpeed,e.wobbleX=e.x+10*e.scalar*Math.cos(e.wobble),e.wobbleY=e.y+10*e.scalar*Math.sin(e.wobble),e.tiltAngle+=.1,e.tiltSin=Math.sin(e.tiltAngle),e.tiltCos=Math.cos(e.tiltAngle),e.random=Math.random()+2);var s=e.tick++/e.totalTicks,i=e.x+e.random*e.tiltCos,n=e.y+e.random*e.tiltSin,o=e.wobbleX+e.random*e.tiltCos,a=e.wobbleY+e.random*e.tiltSin;if(t.fillStyle="rgba("+e.color.r+", "+e.color.g+", "+e.color.b+", "+(1-s)+")",t.beginPath(),r&&"path"===e.shape.type&&"string"==typeof e.shape.path&&Array.isArray(e.shape.matrix))t.fill(function(t,e,s,i,n,o,r){var a=new Path2D(t),l=new Path2D;l.addPath(a,new DOMMatrix(e));var c=new Path2D;return c.addPath(l,new DOMMatrix([Math.cos(r)*n,Math.sin(r)*n,-Math.sin(r)*o,Math.cos(r)*o,s,i])),c}(e.shape.path,e.shape.matrix,e.x,e.y,.1*Math.abs(o-i),.1*Math.abs(a-n),Math.PI/10*e.wobble));else if("bitmap"===e.shape.type){var l=Math.PI/10*e.wobble,c=.1*Math.abs(o-i),d=.1*Math.abs(a-n),h=e.shape.bitmap.width*e.scalar,u=e.shape.bitmap.height*e.scalar,p=new DOMMatrix([Math.cos(l)*c,Math.sin(l)*c,-Math.sin(l)*d,Math.cos(l)*d,e.x,e.y]);p.multiplySelf(new DOMMatrix(e.shape.matrix));var _=t.createPattern(w.transform(e.shape.bitmap),"no-repeat");_.setTransform(p),t.globalAlpha=1-s,t.fillStyle=_,t.fillRect(e.x-h/2,e.y-u/2,h,u),t.globalAlpha=1}else if("circle"===e.shape)t.ellipse?t.ellipse(e.x,e.y,Math.abs(o-i)*e.ovalScalar,Math.abs(a-n)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI):function(t,e,s,i,n,o,r,a,l){t.save(),t.translate(e,s),t.rotate(o),t.scale(i,n),t.arc(0,0,1,r,a,l),t.restore()}(t,e.x,e.y,Math.abs(o-i)*e.ovalScalar,Math.abs(a-n)*e.ovalScalar,Math.PI/10*e.wobble,0,2*Math.PI);else if("star"===e.shape)for(var g=Math.PI/2*3,f=4*e.scalar,m=8*e.scalar,y=e.x,b=e.y,v=5,$=Math.PI/v;v--;)y=e.x+Math.cos(g)*m,b=e.y+Math.sin(g)*m,t.lineTo(y,b),g+=$,y=e.x+Math.cos(g)*f,b=e.y+Math.sin(g)*f,t.lineTo(y,b),g+=$;else t.moveTo(Math.floor(e.x),Math.floor(e.y)),t.lineTo(Math.floor(e.wobbleX),Math.floor(n)),t.lineTo(Math.floor(o),Math.floor(a)),t.lineTo(Math.floor(i),Math.floor(e.wobbleY));return t.closePath(),t.fill(),e.tick<e.totalTicks}function N(t,s){var r,a=!t,l=!!T(s||{},"resize"),d=!1,h=T(s,"disableForReducedMotion",Boolean),u=o&&!!T(s||{},"useWorker")?k():null,p=a?D:P,_=!(!t||!u)&&!!t.__confetti_initialized,g="function"==typeof matchMedia&&matchMedia("(prefers-reduced-motion)").matches;function f(e,s,o){for(var a=T(e,"particleCount",A),l=T(e,"angle",Number),d=T(e,"spread",Number),h=T(e,"startVelocity",Number),u=T(e,"decay",Number),_=T(e,"gravity",Number),g=T(e,"drift",Number),f=T(e,"colors",E),m=T(e,"ticks",Number),y=T(e,"shapes"),b=T(e,"scalar"),v=!!T(e,"flat"),k=function(t){var e=T(t,"origin",Object);return e.x=T(e,"x",Number),e.y=T(e,"y",Number),e}(e),x=a,M=[],S=t.width*k.x,D=t.height*k.y;x--;)M.push(O({x:S,y:D,angle:l,spread:d,startVelocity:h,color:f[x%f.length],shape:y[C(0,y.length)],ticks:m,decay:u,gravity:_,drift:g,scalar:b,flat:v}));return r?r.addFettis(M):(r=function(t,e,s,o,r){var a,l,d=e.slice(),h=t.getContext("2d"),u=c(function(e){function c(){a=l=null,h.clearRect(0,0,o.width,o.height),w.clear(),r(),e()}a=$.frame(function e(){!i||o.width===n.width&&o.height===n.height||(o.width=t.width=n.width,o.height=t.height=n.height),o.width||o.height||(s(t),o.width=t.width,o.height=t.height),h.clearRect(0,0,o.width,o.height),(d=d.filter(function(t){return U(h,t)})).length?a=$.frame(e):c()}),l=c});return{addFettis:function(t){return d=d.concat(t),u},canvas:t,promise:u,reset:function(){a&&$.cancel(a),l&&l()}}}(t,M,p,s,o),r.promise)}function m(s){var i=h||T(s,"disableForReducedMotion",Boolean),n=T(s,"zIndex",Number);if(i&&g)return c(function(t){t()});a&&r?t=r.canvas:a&&!t&&(t=function(t){var e=document.createElement("canvas");return e.style.position="fixed",e.style.top="0px",e.style.left="0px",e.style.pointerEvents="none",e.style.zIndex=t,e}(n),document.body.appendChild(t)),l&&!_&&p(t);var o={width:t.width,height:t.height};function m(){if(u){var e={getBoundingClientRect:function(){if(!a)return t.getBoundingClientRect()}};return p(e),void u.postMessage({resize:{width:e.width,height:e.height}})}o.width=o.height=null}function y(){r=null,l&&(d=!1,e.removeEventListener("resize",m)),a&&t&&(document.body.contains(t)&&document.body.removeChild(t),t=null,_=!1)}return u&&!_&&u.init(t),_=!0,u&&(t.__confetti_initialized=!0),l&&!d&&(d=!0,e.addEventListener("resize",m,!1)),u?u.fire(s,o,y):f(s,o,y)}return m.reset=function(){u&&u.reset(),r&&r.reset()},m}function R(){return v||(v=N(null,{useWorker:!0,resize:!0})),v}s.exports=function(){return R().apply(this,arguments)},s.exports.reset=function(){R().reset()},s.exports.create=N,s.exports.shapeFromPath=function(t){if(!r)throw new Error("path confetti are not supported in this browser");var e,s;"string"==typeof t?e=t:(e=t.path,s=t.matrix);var i=new Path2D(e),n=document.createElement("canvas").getContext("2d");if(!s){for(var o,a,l=1e3,c=l,d=l,h=0,u=0,p=0;p<l;p+=2)for(var _=0;_<l;_+=2)n.isPointInPath(i,p,_,"nonzero")&&(c=Math.min(c,p),d=Math.min(d,_),h=Math.max(h,p),u=Math.max(u,_));o=h-c,a=u-d;var g=Math.min(10/o,10/a);s=[g,0,0,g,-Math.round(o/2+c)*g,-Math.round(a/2+d)*g]}return{type:"path",path:e,matrix:s}},s.exports.shapeFromText=function(t){var e,s=1,i="#000000",n='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';"string"==typeof t?e=t:(e=t.text,s="scalar"in t?t.scalar:s,n="fontFamily"in t?t.fontFamily:n,i="color"in t?t.color:i);var o=10*s,r=o+"px "+n,a=new OffscreenCanvas(o,o),l=a.getContext("2d");l.font=r;var c=l.measureText(e),d=Math.ceil(c.actualBoundingBoxRight+c.actualBoundingBoxLeft),h=Math.ceil(c.actualBoundingBoxAscent+c.actualBoundingBoxDescent),u=c.actualBoundingBoxLeft+2,p=c.actualBoundingBoxAscent+2;d+=4,h+=4,(l=(a=new OffscreenCanvas(d,h)).getContext("2d")).font=r,l.fillStyle=i,l.fillText(e,u,p);var _=1/s;return{type:"bitmap",bitmap:a.transferToImageBitmap(),matrix:[_,0,0,_,-d*_/2,-h*_/2]}}}(function(){return"undefined"!=typeof window?window:"undefined"!=typeof self?self:this||{}}(),bt,!1);var vt=bt.exports;function wt(t,e=3e3){const s=Date.now()+e,i={startVelocity:30,spread:360,ticks:60,zIndex:0};function n(t,e){return Math.random()*(e-t)+t}const o=setInterval(function(){const r=s-Date.now();if(r<=0)return clearInterval(o);const a=r/e*50;vt({...i,particleCount:a,origin:{x:n(.1,.3),y:Math.random()-.2},colors:t,disableForReducedMotion:!0}),vt({...i,particleCount:a,origin:{x:n(.7,.9),y:Math.random()-.2},colors:t,disableForReducedMotion:!0})},250)}bt.exports.create;let $t=class extends ot{constructor(){super(...arguments),this._editDialogOpen=!1,this._editingTask=null,this._saving=!1,this._groups=[],this._autoCollapseTimeouts=new Map,this._previousGroupProgress=new Map,this.shades={lighter:"",light:"",base:"",dark:"",darker:""},this.shadesArray=[]}setConfig(t){if(!t.entity)throw new Error("You need to define an entity");this._config={entity:t.entity,title:t.title||"Tasks",show_title:!1!==t.show_title,show_dateless_tasks:!1!==t.show_dateless_tasks,hide_card_background:!0===t.hide_card_background,accent_color:t.accent_color||"",task_text_color:t.task_text_color||"",show_points:!1!==t.show_points,untagged_header:t.untagged_header||"Untagged",tag_group_order:t.tag_group_order||[],show_future_tasks:!0===t.show_future_tasks,filter_section_id:t.filter_section_id,person_entity:t.person_entity}}getCardSize(){return 3}willUpdate(t){if((t.has("_config")||t.has("hass"))&&this._config&&this.hass){let t="var(--primary-color)";if(this._config.person_entity){const e=this.hass.states["sensor.chorebot_points"],s=(e?.attributes.people||{})[this._config.person_entity];s?.accent_color&&(t=s.accent_color)}this._config.accent_color&&(t=this._config.accent_color),this.shades=function(t){return{lighter:yt(t,30),light:yt(t,15),base:(e=t,e.startsWith("#")?e.substring(1).toUpperCase():/^[0-9A-Fa-f]{6}$/.test(e)?e.toUpperCase():yt(e,0)),dark:yt(t,-15),darker:yt(t,-30)};var e}(t),this.shadesArray=Object.values(this.shades)}(t.has("hass")||t.has("_config"))&&this._updateGroups()}_updateGroups(){if(!this.hass||!this._config)return;const t=this.hass.states[this._config.entity];if(!t)return;let e=function(t,e=!0,s=!1,i="Untagged",n="Upcoming",o,r){const a=t.attributes.chorebot_tasks||[],l=new Date;l.setHours(0,0,0,0);const c=new Date(l);c.setHours(23,59,59,999);const d=new Map,h=[];let u;if(o){const e=(t.attributes.chorebot_sections||[]).find(t=>t.name===o);u=e?e.id:o}for(const t of a){if(u&&t.section_id!==u)continue;if(r&&t.computed_person_id!==r)continue;const n=!!t.due,o="completed"===t.status;let a=!1,p=!1;if(n){if(t.due){const e=new Date(t.due);if(s&&e>c)p=!0;else{const s=new Date(e);s.setHours(0,0,0,0);const i=ut(s,l),n=s<l;o?t.last_completed&&ut(new Date(t.last_completed),new Date)&&(a=!0):(i||n)&&(a=!0)}}}else a=e;if(a){const e=t.tags||[];if(0===e.length)d.has(i)||d.set(i,[]),d.get(i).push(t);else for(const s of e)d.has(s)||d.set(s,[]),d.get(s).push(t)}else p&&h.push(t)}h.sort((t,e)=>new Date(t.due).getTime()-new Date(e.due).getTime());const p=Array.from(d.entries()).map(([t,e])=>({name:t,tasks:e,isCollapsed:!1}));return s&&h.length>0&&p.push({name:n,tasks:h,isCollapsed:!1}),p}(t,!1!==this._config.show_dateless_tasks,!0===this._config.show_future_tasks,this._config.untagged_header||"Untagged","Upcoming",this._config.filter_section_id,this._config.person_entity);e=function(t,e,s="Untagged",i="Upcoming"){return t.sort((t,n)=>{if(t.name===i)return 1;if(n.name===i)return-1;if(!e||0===e.length)return t.name===s?1:n.name===s?-1:t.name.localeCompare(n.name);const o=e.indexOf(t.name),r=e.indexOf(n.name);return-1!==o&&-1!==r?o-r:-1!==o?-1:-1!==r||t.name===s?1:n.name===s?-1:t.name.localeCompare(n.name)})}(e,this._config.tag_group_order,this._config.untagged_header,"Upcoming"),this._groups=e.map(t=>({...t,isCollapsed:this._findExistingCollapseState(t.name)}))}_findExistingCollapseState(t){const e=this._groups.find(e=>e.name===t);return void 0!==e?e.isCollapsed:"Upcoming"===t}render(){if(!this.hass||!this._config)return B`<ha-card>Loading...</ha-card>`;return this.hass.states[this._config.entity]?B`
      <ha-card
        class="${this._config.hide_card_background?"no-background":""}"
      >
        ${this._config.show_title?B`<div class="card-header">${this._config.title}</div>`:""}
        ${0===this._groups.length?B`<div class="empty-state">No tasks</div>`:B`<div class="tag-groups">
              ${this._renderAllGroups(this._groups)}
            </div>`}
      </ha-card>

      ${this._renderEditDialog()}
    `:B`<ha-card>
        <div class="empty-state">Entity not found: ${this._config.entity}</div>
      </ha-card>`}_renderAllGroups(t){return t.map(t=>{const e=pt(t.tasks),s=this._config.task_text_color||"white",i=t.isCollapsed,n=e.completed===e.total,o=i&&n,r=e.total>0?e.completed/e.total*100:0;return this._checkAutoCollapse(t.name,e,n,i),B`
        <div class="tag-group-container ${i?"collapsed":""}">
          <div
            class="tag-group-header ${i?"collapsed":""}"
            style="background: #${this.shades.light}; color: ${s}; --progress-width: ${r}%; --darker-color: #${this.shades.dark};"
            @click=${()=>this._toggleGroup(t.name)}
          >
            <div class="tag-group-header-title">${t.name}</div>
            <div class="tag-group-header-progress">
              ${o?B`<ha-icon
                    icon="mdi:check"
                    style="color: ${s}; --mdi-icon-size: 20px;"
                  ></ha-icon>`:B`${e.completed}/${e.total}`}
            </div>
          </div>
          <div class="tag-group-tasks ${i?"collapsed":""}">
            <div class="tag-group-tasks-inner">
              ${this._renderTasks(t.tasks,s)}
            </div>
          </div>
        </div>
      `})}_renderTasks(t,e){return t.map(t=>{const s="completed"===t.status,i=s?`#${this.shades.base}`:"transparent",n=s?e:"var(--primary-text-color)",o=s?`#${this.shades.dark}`:"transparent",r=s?"white":"var(--divider-color)",a=s?"none":"2px solid var(--divider-color)";return B`
        <div
          class="todo-item"
          style="background: ${i}; color: ${n};"
          @click=${()=>this._openEditDialog(t)}
        >
          <div class="todo-content">
            <div class="todo-summary">${t.summary}</div>
            ${t.due||t.points_value||t.parent_uid?B`<div
                  class="todo-due-date"
                  style="color: ${function(t){if(!t.due||"completed"===t.status)return!1;const e=t.is_all_day||!1,s=new Date(t.due);if(e){const t=new Date,e=Date.UTC(t.getFullYear(),t.getMonth(),t.getDate());return Date.UTC(s.getUTCFullYear(),s.getUTCMonth(),s.getUTCDate())<e}{const t=new Date;return t.setHours(0,0,0,0),s.setHours(0,0,0,0),s<t}}(t)?"var(--error-color)":"inherit"}"
                >
                  ${t.due?function(t,e){if(e?.is_all_day){const e=new Date,s=Date.UTC(e.getFullYear(),e.getMonth(),e.getDate()),i=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate())-s,n=Math.round(i/864e5);return 0===n?"Today":-1===n?"Yesterday":1===n?"Tomorrow":n<-1?`${Math.abs(n)} days ago`:`In ${n} days`}const s=new Date;s.setHours(0,0,0,0);const i=new Date(t);i.setHours(0,0,0,0);const n=i.getTime()-s.getTime(),o=Math.round(n/864e5);if(0===o)return new Date(t).toLocaleTimeString(void 0,{hour:"numeric",minute:"2-digit"});return-1===o?"Yesterday":1===o?"Tomorrow":o<-1?`${Math.abs(o)} days ago`:`In ${o} days`}(new Date(t.due),t):""}
                  ${t.parent_uid?B`<ha-icon
                        icon="mdi:sync"
                        class="recurring-icon"
                      ></ha-icon>`:""}
                  ${this._renderPointsBadge(t)}
                </div>`:""}
          </div>
          <div
            class="completion-circle"
            style="background: ${o}; border: ${a};"
            @click=${e=>this._handleCompletionClick(e,t)}
          >
            <ha-icon
              icon="mdi:check"
              style="color: ${r};"
            ></ha-icon>
          </div>
        </div>
      `})}_renderPointsBadge(t){if(!this._config?.show_points||!t.points_value)return B``;const e=this._config.task_text_color||"white",s=_t(this.hass),i=this.hass?.states[this._config.entity],n=i?.attributes.chorebot_templates||[];if(t.parent_uid){const i=n.find(e=>e.uid===t.parent_uid);if(i&&i.streak_bonus_points&&i.streak_bonus_interval){if((i.streak_current+1)%i.streak_bonus_interval===0)return B`<span
            class="points-badge bonus-pending"
            style="color: ${e};"
          >
            +${t.points_value} + ${i.streak_bonus_points}
            ${s.icon?B`<ha-icon icon="${s.icon}"></ha-icon>`:""}
            ${s.text?s.text:""}
          </span>`}}return B`<span
      class="points-badge"
      style="background: #${this.shades.lighter}; color: ${e}; border: 1px solid ${e};"
    >
      +${t.points_value}
      ${s.icon?B`<ha-icon icon="${s.icon}"></ha-icon>`:""}
      ${s.text?s.text:""}
    </span>`}_getFilteredTasks(t){return function(t,e=!0,s){const i=t.attributes.chorebot_tasks||[],n=new Date;n.setHours(0,0,0,0);let o=i.filter(t=>{const s=!!t.due,i="completed"===t.status;if(!s)return e;const o=new Date(t.due);o.setHours(0,0,0,0);const r=ut(o,n),a=o<n;return i&&t.last_completed?!!ut(new Date(t.last_completed),new Date):!!r||!(!a||i)});if(s){const e=t.attributes.chorebot_sections||[],i=s,n=e.find(t=>t.name===i),r=n?n.id:i;o=o.filter(t=>t.section_id===r)}return o}(t,!1!==this._config.show_dateless_tasks,this._config?.filter_section_id)}_toggleGroup(t){this._autoCollapseTimeouts.has(t)&&(clearTimeout(this._autoCollapseTimeouts.get(t)),this._autoCollapseTimeouts.delete(t));const e=this._groups.find(e=>e.name===t);e&&(e.isCollapsed=!e.isCollapsed,this.requestUpdate())}_checkAutoCollapse(t,e,s,i){const n=this._previousGroupProgress.get(t),o=n&&n.completed<n.total&&s&&!i;if(this._previousGroupProgress.set(t,{completed:e.completed,total:e.total}),o){this._autoCollapseTimeouts.has(t)&&clearTimeout(this._autoCollapseTimeouts.get(t));const e=window.setTimeout(()=>{const e=this._groups.find(e=>e.name===t);e&&(e.isCollapsed=!0,this.requestUpdate()),this._autoCollapseTimeouts.delete(t)},1500);this._autoCollapseTimeouts.set(t,e)}}async _toggleTask(t,e){const s="completed"===t.status?"needs_action":"completed";if(await this.hass.callService("todo","update_item",{entity_id:this._config.entity,item:t.uid,status:s}),"completed"===s&&e){this._playCompletionConfetti(e);const s=this._calculateTotalPointsAwarded(t);if(null!==s&&s>0){!function(t,e){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;const s=document.createElement("div");s.className="floating-points",s.textContent=`+${e}`,s.style.left=t.x-20+"px",s.style.top=t.y-30+"px",document.body.appendChild(s),setTimeout(()=>{s.remove()},2e3)}({x:e.x*window.innerWidth,y:e.y*window.innerHeight},s)}const i=this._areAllTasksComplete(),n=this._areAllDatedTasksComplete(),o=!!t.due;i?this._playAllCompleteStarShower():n&&o?this._playDatedTasksFireworks():this._isGroupComplete(t)&&this._playGroupFireworks()}}_handleCompletionClick(t,e){t.stopPropagation();const s=t.currentTarget.getBoundingClientRect(),i={x:(s.left+s.width/2)/window.innerWidth,y:(s.top+s.height/2)/window.innerHeight};this._toggleTask(e,i)}_playCompletionConfetti(t){!function(t,e){vt({particleCount:30,spread:70,startVelocity:25,origin:t,colors:e,disableForReducedMotion:!0})}(t,this.shadesArray)}_isGroupComplete(t){const e=this.hass?.states[this._config.entity];if(!e)return!1;const s=this._getFilteredTasks(e),i=this._config.untagged_header||"Untagged",n=function(t,e="Untagged"){const s=new Map;for(const i of t){const t=i.tags||[];if(0===t.length)s.has(e)||s.set(e,[]),s.get(e).push(i);else for(const e of t)s.has(e)||s.set(e,[]),s.get(e).push(i)}return s}(s,i),o=t.tags||[],r=o.length>0?o:[i];for(const t of r){const e=n.get(t);if(!e)continue;const s=pt(e);if(s.total>0&&s.completed===s.total)return!0}return!1}_areAllTasksComplete(){const t=this.hass?.states[this._config.entity];if(!t)return!1;const e=pt(this._getFilteredTasks(t));return e.total>0&&e.completed===e.total}_areAllDatedTasksComplete(){const t=this.hass?.states[this._config.entity];if(!t)return!1;const e=function(t){const e=t.filter(t=>!!t.due),s=e.filter(t=>"completed"===t.status).length;return{completed:s,total:e.length}}(this._getFilteredTasks(t));return e.total>0&&e.completed===e.total}_playGroupFireworks(){wt(this.shadesArray)}_playDatedTasksFireworks(){wt(this.shadesArray)}_playAllCompleteStarShower(){!function(t,e=5e3){const s=Date.now()+e;function i(t,e){return Math.random()*(e-t)+t}!function n(){const o=s-Date.now(),r=Math.max(200,o/e*500);vt({particleCount:1,startVelocity:0,ticks:r,origin:{x:Math.random(),y:.3*Math.random()-.1},colors:t,shapes:["star"],gravity:i(1.2,1.5),scalar:i(1.2,2),drift:i(-.4,.4),disableForReducedMotion:!0}),o>0&&requestAnimationFrame(n)}()}(this.shadesArray)}_calculateTotalPointsAwarded(t){if(!t.points_value)return null;let e=t.points_value;if(t.parent_uid){const s=this.hass?.states[this._config.entity],i=(s?.attributes.chorebot_templates||[]).find(e=>e.uid===t.parent_uid);if(i?.streak_bonus_points&&i?.streak_bonus_interval){(i.streak_current+1)%i.streak_bonus_interval===0&&(e+=i.streak_bonus_points)}}return e}_openEditDialog(t){if(!this.hass||!this._config?.entity)return;const e=this.hass.states[this._config.entity];if(!e)return;const s=e.attributes.chorebot_templates||[];this._editingTask=gt(t,s),this._editDialogOpen=!0}_closeEditDialog(){this._editDialogOpen=!1,this._editingTask=null}_renderEditDialog(){const t=this.hass?.states[this._config.entity],e=t?.attributes.chorebot_sections||[],s=t?.attributes.chorebot_tags||[];return mt(this._editDialogOpen,this._editingTask,this.hass,e,s,this._saving,()=>this._closeEditDialog(),t=>this._formValueChanged(t),()=>this._saveTask(),()=>this._handleDeleteTask())}_formValueChanged(t){const e=t.detail.value;this._editingTask={...this._editingTask,...e},("has_due_date"in e||"is_all_day"in e||"has_recurrence"in e||"recurrence_frequency"in e)&&this.requestUpdate()}async _saveTask(){if(!this._editingTask||!this._editingTask.summary?.trim()||this._saving)return;this._saving=!0;const t={list_id:this._config.entity,uid:this._editingTask.uid,summary:this._editingTask.summary.trim()};if(this._editingTask.has_due_date&&this._editingTask.due_date){const e=!!this._editingTask.is_all_day;let s;if(e||!this._editingTask.due_time)s=`${this._editingTask.due_date}T00:00:00`;else{const t=3===this._editingTask.due_time.split(":").length?this._editingTask.due_time:`${this._editingTask.due_time}:00`;s=`${this._editingTask.due_date}T${t}`}const i=new Date(s);if(isNaN(i.getTime()))return console.error("Invalid date/time combination:",s),void(this._saving=!1);t.due=i.toISOString(),t.is_all_day=e}else!1===this._editingTask.has_due_date&&(t.due="",t.is_all_day=!1);this._editingTask.description&&(t.description=this._editingTask.description),this._editingTask.section_id&&(t.section_id=this._editingTask.section_id),void 0!==this._editingTask.tags&&(t.tags=this._editingTask.tags);const e=function(t){if(!t||!t.has_recurrence)return null;const{recurrence_frequency:e,recurrence_interval:s,recurrence_byweekday:i,recurrence_bymonthday:n}=t;if(!e)return null;let o=`FREQ=${e};INTERVAL=${s||1}`;"WEEKLY"===e&&i&&i.length>0?o+=`;BYDAY=${i.join(",").toUpperCase()}`:"MONTHLY"===e&&n&&(o+=`;BYMONTHDAY=${Math.max(1,Math.min(31,n))}`);return o}(this._editingTask);null!==e?t.rrule=e:!1===this._editingTask.has_recurrence&&(t.rrule=""),void 0!==this._editingTask.points_value&&(t.points_value=this._editingTask.points_value),void 0!==this._editingTask.streak_bonus_points&&(t.streak_bonus_points=this._editingTask.streak_bonus_points),void 0!==this._editingTask.streak_bonus_interval&&(t.streak_bonus_interval=this._editingTask.streak_bonus_interval);!!this._editingTask.parent_uid&&(t.include_future_occurrences=!0),console.log("Calling chorebot.update_task with payload:",t);try{await this.hass.callService("chorebot","update_task",t),this._closeEditDialog()}catch(t){console.error("Error saving task:",t),alert("Failed to save task. Please try again.")}finally{this._saving=!1}}async _handleDeleteTask(){if(!this._editingTask||this._saving)return;const t=this._editingTask,e=t.has_recurrence||t.parent_uid;if(confirm(e?"Delete this recurring task? This will remove all future occurrences, but keep completed instances.":"Delete this task? This action cannot be undone.")){this._saving=!0;try{await this.hass.callService("todo","remove_item",{entity_id:this._config.entity,item:t.uid}),this._closeEditDialog(),this.dispatchEvent(new CustomEvent("hass-notification",{detail:{message:"Task deleted successfully"},bubbles:!0,composed:!0}))}catch(t){console.error("Error deleting task:",t),alert(`Failed to delete task: ${t}`)}finally{this._saving=!1}}}static getStubConfig(){return{entity:"",title:"Tasks",show_title:!0,show_dateless_tasks:!0,show_future_tasks:!1,filter_section_id:"",person_entity:"",hide_card_background:!1,accent_color:"",task_text_color:"",untagged_header:"Untagged",tag_group_order:[]}}static getConfigForm(){return{schema:[{name:"entity",required:!0,selector:{entity:{filter:{domain:"todo"}}}},{name:"title",default:"Tasks",selector:{text:{}}},{name:"show_title",default:!0,selector:{boolean:{}}},{name:"show_dateless_tasks",default:!0,selector:{boolean:{}}},{name:"show_future_tasks",default:!1,selector:{boolean:{}}},{name:"filter_section_id",selector:{text:{}}},{name:"person_entity",selector:{entity:{filter:{domain:"person"}}}},{name:"hide_card_background",default:!1,selector:{boolean:{}}},{name:"accent_color",selector:{text:{}}},{name:"task_text_color",selector:{text:{}}},{name:"untagged_header",default:"Untagged",selector:{text:{}}},{name:"tag_group_order",selector:{select:{multiple:!0,custom_value:!0,options:[]}}}],computeLabel:t=>({entity:"Todo Entity",title:"Card Title",show_title:"Show Title",show_dateless_tasks:"Show Tasks Without Due Date",show_future_tasks:"Show Future Tasks",filter_section_id:"Filter by Section",person_entity:"Filter by Person",hide_card_background:"Hide Card Background",accent_color:"Accent Color",task_text_color:"Task Text Color",untagged_header:"Untagged Tasks Header",tag_group_order:"Tag Display Order"}[t.name]||void 0),computeHelper:t=>({entity:"Select the ChoreBot todo entity to display",title:"Custom title for the card",show_title:"Show the card title",show_dateless_tasks:"Show tasks that do not have a due date",show_future_tasks:"Show tasks with future due dates in a collapsible 'Upcoming' section (collapsed by default)",filter_section_id:'Enter section name (e.g., "SECOND SECTION"). Leave empty to show all sections.',person_entity:"Optional: Filter to show only tasks assigned to this person. Also inherits their accent color if set.",hide_card_background:"Hide the card background and padding for a seamless look",accent_color:"Accent color for task items and headers (hex code or CSS variable like var(--primary-color))",task_text_color:"Text color for task items (hex code or CSS variable)",untagged_header:'Header text for tasks without tags (default: "Untagged")',tag_group_order:"Order to display tag groups. Tags not listed will appear alphabetically after these."}[t.name]||void 0)}}};$t.styles=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new o(s,t,i)})`
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

    /* Tag Group Container */
    .tag-groups {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tag-group-container {
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      border: 1px solid var(--divider-color);
      transition: border-radius 0.3s ease;
    }

    .tag-group-container.collapsed {
      border-radius: var(--ha-card-border-radius, 12px);
    }

    /* Tag Group Header Bar */
    .tag-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-weight: 500;
      font-size: 24px;
      cursor: pointer;
      user-select: none;
      transition:
        filter 0.2s ease,
        border-bottom 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .tag-group-header::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: var(--darker-color);
      width: var(--progress-width, 0%);
      transition: width 0.3s ease;
      z-index: 0;
    }

    .tag-group-header.collapsed {
      border-bottom: none;
    }

    .tag-group-header:active {
      filter: brightness(0.9);
    }

    .tag-group-header-title {
      flex: 1;
      text-transform: capitalize;
      position: relative;
      z-index: 1;
    }

    .tag-group-header-progress {
      font-weight: 400;
      opacity: 0.8;
      position: relative;
      z-index: 1;
    }

    /* Tag Group Tasks (rows, not separate cards) */
    .tag-group-tasks {
      display: grid;
      grid-template-rows: 1fr;
      transition:
        grid-template-rows 0.3s ease,
        opacity 0.3s ease;
      opacity: 1;
    }

    .tag-group-tasks.collapsed {
      grid-template-rows: 0fr;
      opacity: 0;
    }

    .tag-group-tasks-inner {
      overflow: hidden;
    }

    .todo-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      cursor: pointer;
      transition: filter 0.2s ease;
      border-bottom: 1px solid var(--divider-color);
    }

    .todo-item:last-child {
      border-bottom: none;
    }

    .todo-item:hover {
      filter: brightness(1.1);
    }

    .todo-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .todo-summary {
      font-size: 20px;
      font-weight: 400;
      word-wrap: break-word;
      line-height: 1.3;
    }

    .todo-due-date {
      font-size: 14px;
      font-weight: normal;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .points-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      opacity: 0.9;
    }

    .points-badge ha-icon {
      --mdc-icon-size: 12px;
      display: flex;
    }

    .points-badge.bonus-pending {
      background: linear-gradient(135deg, #ffd700, #ffa500) !important;
      border: 1px solid currentColor !important;
      animation: glow 2s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
    }

    @keyframes glow {
      0%,
      100% {
        opacity: 0.9;
      }
      50% {
        opacity: 1;
      }
    }

    .recurring-icon {
      --mdc-icon-size: 14px;
      margin-right: 4px;
      vertical-align: middle;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }

    .completion-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .completion-circle ha-icon {
      --mdi-icon-size: 28px;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }

    ha-dialog {
      --mdc-dialog-min-width: 500px;
    }

    /* Floating Points Animation */
    @keyframes floatPoints {
      0% {
        transform: scale(0.5) translateY(0);
        opacity: 1;
      }
      50% {
        transform: scale(1.5) translateY(-30px);
        opacity: 1;
      }
      100% {
        transform: scale(1.5) translateY(-60px);
        opacity: 0;
      }
    }

    .floating-points {
      position: absolute;
      font-size: 28px;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      pointer-events: none;
      z-index: 9999;
      animation: floatPoints 2s ease-out forwards;
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .floating-points {
        animation: none;
        opacity: 0;
      }
    }
  `,t([ct({attribute:!1})],$t.prototype,"hass",void 0),t([dt()],$t.prototype,"_config",void 0),t([dt()],$t.prototype,"_editDialogOpen",void 0),t([dt()],$t.prototype,"_editingTask",void 0),t([dt()],$t.prototype,"_saving",void 0),t([dt()],$t.prototype,"_groups",void 0),$t=t([(t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("chorebot-grouped-card")],$t),window.customCards=window.customCards||[],window.customCards.push({type:"chorebot-grouped-card",name:"ChoreBot Grouped Card",description:"Display and manage ChoreBot tasks grouped by tags",preview:!0}),console.info("%c CHOREBOT-GROUPED-CARD %c v0.1.0 ","color: white; background: #2196F3; font-weight: bold;","color: #2196F3; background: white; font-weight: bold;");export{$t as ChoreBotGroupedCard};
