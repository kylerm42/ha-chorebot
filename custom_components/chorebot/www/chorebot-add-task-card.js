function t(t,e,s,i){var n,o=arguments.length,r=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(n=t[a])&&(r=(o<3?n(r):o>3?n(e,s,r):n(e,s))||r);return o>3&&r&&Object.defineProperty(e,s,r),r}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,s=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),n=new WeakMap;let o=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&n.set(e,t))}return t}toString(){return this.cssText}};const r=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new o("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:a,defineProperty:c,getOwnPropertyDescriptor:l,getOwnPropertyNames:d,getOwnPropertySymbols:h,getPrototypeOf:u}=Object,_=globalThis,p=_.trustedTypes,m=p?p.emptyScript:"",f=_.reactiveElementPolyfillSupport,g=(t,e)=>t,y={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},b=(t,e)=>!a(t,e),$={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;let v=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=$){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&c(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:n}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const o=i?.call(this);n?.call(this,e),this.requestUpdate(t,o,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??$}static _$Ei(){if(this.hasOwnProperty(g("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(g("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(g("properties"))){const t=this.properties,e=[...d(t),...h(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(r(t))}else void 0!==t&&e.push(r(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,i)=>{if(s)t.adoptedStyleSheets=i.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of i){const i=document.createElement("style"),n=e.litNonce;void 0!==n&&i.setAttribute("nonce",n),i.textContent=s.cssText,t.appendChild(i)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const n=(void 0!==s.converter?.toAttribute?s.converter:y).toAttribute(e,s.type);this._$Em=t,null==n?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),n="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:y;this._$Em=i;const o=n.fromAttribute(e,t.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(t,e,s){if(void 0!==t){const i=this.constructor,n=this[t];if(s??=i.getPropertyOptions(t),!((s.hasChanged??b)(n,e)||s.useDefault&&s.reflect&&n===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:n},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),!0!==n||void 0!==o)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};v.elementStyles=[],v.shadowRootOptions={mode:"open"},v[g("elementProperties")]=new Map,v[g("finalized")]=new Map,f?.({ReactiveElement:v}),(_.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const A=globalThis,w=A.trustedTypes,k=w?w.createPolicy("lit-html",{createHTML:t=>t}):void 0,x="$lit$",S=`lit$${Math.random().toFixed(9).slice(2)}$`,E="?"+S,T=`<${E}>`,C=document,P=()=>C.createComment(""),O=t=>null===t||"object"!=typeof t&&"function"!=typeof t,U=Array.isArray,M="[ \t\n\f\r]",D=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,H=/-->/g,N=/>/g,R=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,z=/"/g,B=/^(?:script|style|textarea|title)$/i,j=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),I=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),Y=new WeakMap,W=C.createTreeWalker(C,129);function V(t,e){if(!U(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==k?k.createHTML(e):e}const F=(t,e)=>{const s=t.length-1,i=[];let n,o=2===e?"<svg>":3===e?"<math>":"",r=D;for(let e=0;e<s;e++){const s=t[e];let a,c,l=-1,d=0;for(;d<s.length&&(r.lastIndex=d,c=r.exec(s),null!==c);)d=r.lastIndex,r===D?"!--"===c[1]?r=H:void 0!==c[1]?r=N:void 0!==c[2]?(B.test(c[2])&&(n=RegExp("</"+c[2],"g")),r=R):void 0!==c[3]&&(r=R):r===R?">"===c[0]?(r=n??D,l=-1):void 0===c[1]?l=-2:(l=r.lastIndex-c[2].length,a=c[1],r=void 0===c[3]?R:'"'===c[3]?z:L):r===z||r===L?r=R:r===H||r===N?r=D:(r=R,n=void 0);const h=r===R&&t[e+1].startsWith("/>")?" ":"";o+=r===D?s+T:l>=0?(i.push(a),s.slice(0,l)+x+s.slice(l)+S+h):s+S+(-2===l?e:h)}return[V(t,o+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class K{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let n=0,o=0;const r=t.length-1,a=this.parts,[c,l]=F(t,e);if(this.el=K.createElement(c,s),W.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=W.nextNode())&&a.length<r;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(x)){const e=l[o++],s=i.getAttribute(t).split(S),r=/([.?@])?(.*)/.exec(e);a.push({type:1,index:n,name:r[2],strings:s,ctor:"."===r[1]?G:"?"===r[1]?tt:"@"===r[1]?et:X}),i.removeAttribute(t)}else t.startsWith(S)&&(a.push({type:6,index:n}),i.removeAttribute(t));if(B.test(i.tagName)){const t=i.textContent.split(S),e=t.length-1;if(e>0){i.textContent=w?w.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],P()),W.nextNode(),a.push({type:2,index:++n});i.append(t[e],P())}}}else if(8===i.nodeType)if(i.data===E)a.push({type:2,index:n});else{let t=-1;for(;-1!==(t=i.data.indexOf(S,t+1));)a.push({type:7,index:n}),t+=S.length-1}n++}}static createElement(t,e){const s=C.createElement("template");return s.innerHTML=t,s}}function J(t,e,s=t,i){if(e===I)return e;let n=void 0!==i?s._$Co?.[i]:s._$Cl;const o=O(e)?void 0:e._$litDirective$;return n?.constructor!==o&&(n?._$AO?.(!1),void 0===o?n=void 0:(n=new o(t),n._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=n:s._$Cl=n),void 0!==n&&(e=J(t,n._$AS(t,e.values),n,i)),e}class Z{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??C).importNode(e,!0);W.currentNode=i;let n=W.nextNode(),o=0,r=0,a=s[0];for(;void 0!==a;){if(o===a.index){let e;2===a.type?e=new Q(n,n.nextSibling,this,t):1===a.type?e=new a.ctor(n,a.name,a.strings,this,t):6===a.type&&(e=new st(n,this,t)),this._$AV.push(e),a=s[++r]}o!==a?.index&&(n=W.nextNode(),o++)}return W.currentNode=C,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class Q{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=J(this,t,e),O(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==I&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>U(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&O(this._$AH)?this._$AA.nextSibling.data=t:this.T(C.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=K.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new Z(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=Y.get(t.strings);return void 0===e&&Y.set(t.strings,e=new K(t)),e}k(t){U(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const n of t)i===e.length?e.push(s=new Q(this.O(P()),this.O(P()),this,this.options)):s=e[i],s._$AI(n),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class X{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,n){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=n,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=q}_$AI(t,e=this,s,i){const n=this.strings;let o=!1;if(void 0===n)t=J(this,t,e,0),o=!O(t)||t!==this._$AH&&t!==I,o&&(this._$AH=t);else{const i=t;let r,a;for(t=n[0],r=0;r<n.length-1;r++)a=J(this,i[s+r],e,r),a===I&&(a=this._$AH[r]),o||=!O(a)||a!==this._$AH[r],a===q?t=q:t!==q&&(t+=(a??"")+n[r+1]),this._$AH[r]=a}o&&!i&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class G extends X{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class tt extends X{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class et extends X{constructor(t,e,s,i,n){super(t,e,s,i,n),this.type=5}_$AI(t,e=this){if((t=J(this,t,e,0)??q)===I)return;const s=this._$AH,i=t===q&&s!==q||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,n=t!==q&&(s===q||i);i&&this.element.removeEventListener(this.name,this,s),n&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){J(this,t)}}const it=A.litHtmlPolyfillSupport;it?.(K,Q),(A.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let n=i._$litPart$;if(void 0===n){const t=s?.renderBefore??null;i._$litPart$=n=new Q(e.insertBefore(P(),t),t,void 0,s??{})}return n._$AI(t),n})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return I}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const rt=nt.litElementPolyfillSupport;rt?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const at={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:b},ct=(t=at,e,s)=>{const{kind:i,metadata:n}=s;let o=globalThis.litPropertyMetadata.get(n);if(void 0===o&&globalThis.litPropertyMetadata.set(n,o=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),o.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const n=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,n,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const n=this[i];e.call(this,s),this.requestUpdate(i,n,t)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function lt(t){return(e,s)=>"object"==typeof s?ct(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function dt(t){return lt({...t,state:!0,attribute:!1})}function ht(t,e){const s=void 0!==t.has_due_date?t.has_due_date:!!t.due,i=void 0!==t.is_all_day&&t.is_all_day;let n=t.due_date||null,o=t.due_time||null;if(!n&&t.due){const e=function(t){try{const e=new Date(t);if(isNaN(e.getTime()))return{date:null,time:null};const s=e.getFullYear(),i=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0");return{date:`${s}-${i}-${n}`,time:`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`}}catch(e){return console.error("Date parsing error:",e,t),{date:null,time:null}}}(t.due);n=e.date,o=e.time}return{summary:t.summary||"",has_due_date:s,is_all_day:i,due_date:n||null,due_time:o||"00:00",description:t.description||"",section_id:t.section_id||(e.length>0?e.sort((t,e)=>e.sort_order-t.sort_order)[0].id:void 0),tags:t.tags||[],has_recurrence:s&&t.has_recurrence||!1,recurrence_frequency:t.recurrence_frequency||"DAILY",recurrence_interval:t.recurrence_interval||1,recurrence_byweekday:t.recurrence_byweekday||[],recurrence_bymonthday:t.recurrence_bymonthday||1,points_value:t.points_value||0,streak_bonus_points:t.streak_bonus_points||0,streak_bonus_interval:t.streak_bonus_interval||0}}let ut=class extends ot{constructor(){super(...arguments),this._dialogOpen=!1,this._newTask=null,this._saving=!1}setConfig(t){if(!t.entity)throw new Error("You need to define an entity");this._config={entity:t.entity,button_text:t.button_text||"Add Task",button_icon:t.button_icon||"mdi:plus",button_color:t.button_color||"var(--primary-color)",button_text_color:t.button_text_color||"white",button_size:t.button_size||"medium",hide_card_background:!0===t.hide_card_background,default_section_id:t.default_section_id,default_tags:t.default_tags||[]}}getCardSize(){return 1}render(){if(!this.hass||!this._config)return j`<ha-card>Loading...</ha-card>`;return this.hass.states[this._config.entity]?j`
      <ha-card
        class="${this._config.hide_card_background?"no-background":""}"
      >
        <div class="button-container">
          <button
            class="add-button ${this._config.button_size} ${this._config.button_text?"":"icon-only"}"
            style="background: ${this._config.button_color}; color: ${this._config.button_text_color};"
            @click=${this._openDialog}
          >
            <ha-icon icon="${this._config.button_icon}"></ha-icon>
            ${this._config.button_text?j`<span>${this._config.button_text}</span>`:""}
          </button>
        </div>
      </ha-card>

      ${this._renderDialog()}
    `:j`<ha-card>
        <div
          style="text-align: center; padding: 16px; color: var(--error-color);"
        >
          Entity not found: ${this._config.entity}
        </div>
      </ha-card>`}_openDialog(){const t=this.hass?.states[this._config.entity],e=t?.attributes.chorebot_sections||[];this._newTask=this._createBlankTask(e),this._dialogOpen=!0}_closeDialog(){this._dialogOpen=!1,this._newTask=null}_createBlankTask(t){let e;if(this._config.default_section_id){const s=t.find(t=>t.id===this._config.default_section_id);if(s)e=s.id;else{const s=t.find(t=>t.name.toLowerCase()===this._config.default_section_id.toLowerCase());s&&(e=s.id)}}else t.length>0&&(e=t.sort((t,e)=>e.sort_order-t.sort_order)[0].id);return{uid:"",summary:"",status:"needs_action",has_due_date:!1,is_all_day:!1,due_date:void 0,due_time:void 0,description:"",section_id:e,tags:this._config.default_tags||[],has_recurrence:!1,recurrence_frequency:"DAILY",recurrence_interval:1,recurrence_byweekday:[],recurrence_bymonthday:1}}_renderDialog(){const t=this.hass?.states[this._config.entity],e=t?.attributes.chorebot_sections||[],s=t?.attributes.chorebot_tags||[];return function(t,e,s,i,n,o,r,a,c,l="Edit Task"){if(!t||!e)return j``;const d=function(t,e,s){const i=void 0!==t.has_due_date?t.has_due_date:!!t.due,n=void 0!==t.is_all_day&&t.is_all_day,o=[{name:"summary",required:!0,selector:{text:{}}},{name:"description",selector:{text:{multiline:!0}}}];if(e.length>0&&o.push({name:"section_id",selector:{select:{options:e.sort((t,e)=>e.sort_order-t.sort_order).map(t=>({label:t.name,value:t.id}))}}}),o.push({name:"tags",selector:{select:{multiple:!0,custom_value:!0,options:s.map(t=>({label:t,value:t}))}}}),o.push({name:"has_due_date",selector:{boolean:{}}}),i&&(o.push({name:"due_date",selector:{date:{}}}),n||o.push({name:"due_time",selector:{time:{}}}),o.push({name:"is_all_day",selector:{boolean:{}}})),i){const e=void 0!==t.has_recurrence&&t.has_recurrence,s=t.recurrence_frequency||"DAILY";o.push({name:"has_recurrence",selector:{boolean:{}}}),e&&(o.push({name:"recurrence_frequency",selector:{select:{options:[{label:"Daily",value:"DAILY"},{label:"Weekly",value:"WEEKLY"},{label:"Monthly",value:"MONTHLY"}]}}}),o.push({name:"recurrence_interval",selector:{number:{min:1,max:999,mode:"box"}}}),"WEEKLY"===s?o.push({name:"recurrence_byweekday",selector:{select:{multiple:!0,options:[{label:"Monday",value:"MO"},{label:"Tuesday",value:"TU"},{label:"Wednesday",value:"WE"},{label:"Thursday",value:"TH"},{label:"Friday",value:"FR"},{label:"Saturday",value:"SA"},{label:"Sunday",value:"SU"}]}}}):"MONTHLY"===s&&o.push({name:"recurrence_bymonthday",selector:{number:{min:1,max:31,mode:"box"}}}))}return o.push({name:"points_value",selector:{number:{min:0,max:1e4,mode:"box"}}}),i&&t.has_recurrence&&(o.push({name:"streak_bonus_points",selector:{number:{min:0,max:1e4,mode:"box"}}}),o.push({name:"streak_bonus_interval",selector:{number:{min:0,max:999,mode:"box"}}})),o}(e,i,n),h=ht(e,i),u=function(t){const e=function(t){const e=function(t){const e=t.states["sensor.chorebot_points"],s=e?.attributes.points_display;return s?{icon:s.icon??"",text:s.text??"points"}:{icon:"",text:"points"}}(t);return e.text?e.text.charAt(0).toUpperCase()+e.text.slice(1):""}(t)||"Points";return function(t){return{summary:"Task Name",has_due_date:"Has Due Date",is_all_day:"All Day",due_date:"Date",due_time:"Time",description:"Description",section_id:"Section",tags:"Tags",has_recurrence:"Recurring Task",recurrence_frequency:"Frequency",recurrence_interval:"Repeat Every",recurrence_byweekday:"Days of Week",recurrence_bymonthday:"Day of Month",points_value:`${e} Value`,streak_bonus_points:`Streak Bonus ${e}`,streak_bonus_interval:"Bonus Every X Days (0 = no bonus)"}[t.name]||t.name}}(s);return j`
    <ha-dialog open @closed=${r} .heading=${l}>
      <ha-form
        .hass=${s}
        .schema=${d}
        .data=${h}
        .computeLabel=${u}
        @value-changed=${a}
      ></ha-form>
      <ha-button slot="primaryAction" @click=${c} .disabled=${o}>
        ${o?"Saving...":"Save"}
      </ha-button>
      <ha-button slot="secondaryAction" @click=${r} .disabled=${o}>
        Cancel
      </ha-button>
    </ha-dialog>
  `}(this._dialogOpen,this._newTask,this.hass,e,s,this._saving,()=>this._closeDialog(),t=>this._formValueChanged(t),()=>this._saveTask(),"Add Task")}_formValueChanged(t){const e=t.detail.value;this._newTask={...this._newTask,...e},("has_due_date"in e||"is_all_day"in e||"has_recurrence"in e||"recurrence_frequency"in e)&&this.requestUpdate()}async _saveTask(){if(!this._newTask||!this._newTask.summary?.trim()||this._saving)return;this._saving=!0;const t={list_id:this._config.entity,summary:this._newTask.summary.trim()};if(this._newTask.has_due_date&&this._newTask.due_date){const e=!!this._newTask.is_all_day;let s;if(e||!this._newTask.due_time)s=`${this._newTask.due_date}T00:00:00`;else{const t=3===this._newTask.due_time.split(":").length?this._newTask.due_time:`${this._newTask.due_time}:00`;s=`${this._newTask.due_date}T${t}`}const i=new Date(s);if(isNaN(i.getTime()))return console.error("Invalid date/time combination:",s),void(this._saving=!1);t.due=i.toISOString(),t.is_all_day=e}this._newTask.description&&(t.description=this._newTask.description),this._newTask.section_id&&(t.section_id=this._newTask.section_id),void 0!==this._newTask.tags&&this._newTask.tags.length>0&&(t.tags=this._newTask.tags);const e=function(t){if(!t||!t.has_recurrence)return null;const{recurrence_frequency:e,recurrence_interval:s,recurrence_byweekday:i,recurrence_bymonthday:n}=t;if(!e)return null;let o=`FREQ=${e};INTERVAL=${s||1}`;"WEEKLY"===e&&i&&i.length>0?o+=`;BYDAY=${i.join(",").toUpperCase()}`:"MONTHLY"===e&&n&&(o+=`;BYMONTHDAY=${Math.max(1,Math.min(31,n))}`);return o}(this._newTask);null!==e&&(t.rrule=e),void 0!==this._newTask.points_value&&this._newTask.points_value>0&&(t.points_value=this._newTask.points_value),null!==e&&(void 0!==this._newTask.streak_bonus_points&&this._newTask.streak_bonus_points>0&&(t.streak_bonus_points=this._newTask.streak_bonus_points),void 0!==this._newTask.streak_bonus_interval&&this._newTask.streak_bonus_interval>0&&(t.streak_bonus_interval=this._newTask.streak_bonus_interval));try{await this.hass.callService("chorebot","add_task",t),this._closeDialog();const e=this.hass?.states[this._config.entity],s=e?.attributes.chorebot_sections||[];this._newTask=this._createBlankTask(s)}catch(t){console.error("Error adding task:",t),alert("Failed to add task. Please try again.")}finally{this._saving=!1}}static getStubConfig(){return{entity:"",button_text:"Add Task",button_icon:"mdi:plus",button_color:"var(--primary-color)",button_text_color:"white",button_size:"medium",hide_card_background:!1,default_section_id:"",default_tags:[]}}static getConfigForm(){return{schema:[{name:"entity",required:!0,selector:{entity:{filter:{domain:"todo"}}}},{name:"button_text",default:"Add Task",selector:{text:{}}},{name:"button_icon",default:"mdi:plus",selector:{icon:{}}},{name:"button_color",default:"var(--primary-color)",selector:{text:{}}},{name:"button_text_color",default:"white",selector:{text:{}}},{name:"button_size",default:"medium",selector:{select:{options:[{label:"Small",value:"small"},{label:"Medium",value:"medium"},{label:"Large",value:"large"}]}}},{name:"hide_card_background",default:!1,selector:{boolean:{}}},{name:"default_section_id",selector:{text:{}}},{name:"default_tags",selector:{select:{multiple:!0,custom_value:!0,options:[]}}}],computeLabel:t=>({entity:"Todo Entity",button_text:"Button Text",button_icon:"Button Icon",button_color:"Button Color",button_text_color:"Button Text Color",button_size:"Button Size",hide_card_background:"Hide Card Background",default_section_id:"Default Section",default_tags:"Default Tags"}[t.name]||void 0),computeHelper:t=>({entity:"Select the ChoreBot todo entity for new tasks",button_text:"Text displayed on the button",button_icon:"Icon displayed on the button",button_color:"Button background color (hex code or CSS variable like var(--primary-color))",button_text_color:"Button text color (hex code or CSS variable)",button_size:"Size of the button",hide_card_background:"Hide the card background and padding for a seamless look",default_section_id:'Default section for new tasks (enter section name like "Kyle" or leave empty for automatic)',default_tags:"Tags to pre-fill when creating new tasks"}[t.name]||void 0)}}};ut.styles=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new o(s,t,i)})`
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
    .button-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .add-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      border-radius: var(--ha-card-border-radius, 12px);
      cursor: pointer;
      font-weight: 500;
      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        filter 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .add-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .add-button:active {
      transform: translateY(0);
      filter: brightness(0.95);
    }
    .add-button.small {
      padding: 8px 16px;
      font-size: 14px;
    }
    .add-button.medium {
      padding: 12px 24px;
      font-size: 16px;
    }
    .add-button.large {
      padding: 16px 32px;
      font-size: 18px;
    }
    /* Icon-only button styles (when no text) */
    .add-button.icon-only.small {
      padding: 8px;
    }
    .add-button.icon-only.medium {
      padding: 12px;
    }
    .add-button.icon-only.large {
      padding: 16px;
    }
    .add-button ha-icon {
      --mdc-icon-size: 20px;
    }
    .add-button.large ha-icon {
      --mdc-icon-size: 24px;
    }
    ha-dialog {
      --mdc-dialog-min-width: 500px;
    }
  `,t([lt({attribute:!1})],ut.prototype,"hass",void 0),t([dt()],ut.prototype,"_config",void 0),t([dt()],ut.prototype,"_dialogOpen",void 0),t([dt()],ut.prototype,"_newTask",void 0),t([dt()],ut.prototype,"_saving",void 0),ut=t([(t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("chorebot-add-task-card")],ut),window.customCards=window.customCards||[],window.customCards.push({type:"chorebot-add-task-card",name:"ChoreBot Add Task Card",description:"A button card for quickly adding new ChoreBot tasks",preview:!0});export{ut as ChoreBotAddTaskCard};
