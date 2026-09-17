var __defProp=Object.defineProperty,__export=(t,e)=>{for(var r in e)__defProp(t,r,{get:e[r],enumerable:!0})},lookup=[],revLookup=[],code="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(let t=0,e=code.length;t<e;++t)lookup[t]=code[t],revLookup[code.charCodeAt(t)]=t;revLookup[45]=62,revLookup[95]=63;function getLens(t){const e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");let r=t.indexOf("=");r===-1&&(r=e);const n=r===e?0:4-r%4;return[r,n]}function _byteLength(t,e,r){return(e+r)*3/4-r}function toByteArray(t){const e=getLens(t),r=e[0],n=e[1],o=new Uint8Array(_byteLength(t,r,n));let i=0;const s=n>0?r-4:r;let l;for(l=0;l<s;l+=4){const a=revLookup[t.charCodeAt(l)]<<18|revLookup[t.charCodeAt(l+1)]<<12|revLookup[t.charCodeAt(l+2)]<<6|revLookup[t.charCodeAt(l+3)];o[i++]=a>>16&255,o[i++]=a>>8&255,o[i++]=a&255}if(n===2){const a=revLookup[t.charCodeAt(l)]<<2|revLookup[t.charCodeAt(l+1)]>>4;o[i++]=a&255}if(n===1){const a=revLookup[t.charCodeAt(l)]<<10|revLookup[t.charCodeAt(l+1)]<<4|revLookup[t.charCodeAt(l+2)]>>2;o[i++]=a>>8&255,o[i++]=a&255}return o}function tripletToBase64(t){return lookup[t>>18&63]+lookup[t>>12&63]+lookup[t>>6&63]+lookup[t&63]}function encodeChunk(t,e,r){const n=[];for(let o=e;o<r;o+=3){const i=(t[o]<<16&16711680)+(t[o+1]<<8&65280)+(t[o+2]&255);n.push(tripletToBase64(i))}return n.join("")}function fromByteArray(t){const e=t.length,r=e%3,n=[],o=16383;for(let i=0,s=e-r;i<s;i+=o)n.push(encodeChunk(t,i,i+o>s?s:i+o));if(r===1){const i=t[e-1];n.push(lookup[i>>2]+lookup[i<<4&63]+"==")}else if(r===2){const i=(t[e-2]<<8)+t[e-1];n.push(lookup[i>>10]+lookup[i>>4&63]+lookup[i<<2&63]+"=")}return n.join("")}function read(t,e,r,n,o){let i,s;const l=o*8-n-1,a=(1<<l)-1,c=a>>1;let d=-7,p=r?o-1:0;const u=r?-1:1;let h=t[e+p];for(p+=u,i=h&(1<<-d)-1,h>>=-d,d+=l;d>0;)i=i*256+t[e+p],p+=u,d-=8;for(s=i&(1<<-d)-1,i>>=-d,d+=n;d>0;)s=s*256+t[e+p],p+=u,d-=8;if(i===0)i=1-c;else{if(i===a)return s?NaN:(h?-1:1)*(1/0);s=s+Math.pow(2,n),i=i-c}return(h?-1:1)*s*Math.pow(2,i-n)}function write(t,e,r,n,o,i){let s,l,a,c=i*8-o-1;const d=(1<<c)-1,p=d>>1,u=o===23?Math.pow(2,-24)-Math.pow(2,-77):0;let h=n?0:i-1;const _=n?1:-1,f=e<0||e===0&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(l=isNaN(e)?1:0,s=d):(s=Math.floor(Math.log(e)/Math.LN2),e*(a=Math.pow(2,-s))<1&&(s--,a*=2),s+p>=1?e+=u/a:e+=u*Math.pow(2,1-p),e*a>=2&&(s++,a/=2),s+p>=d?(l=0,s=d):s+p>=1?(l=(e*a-1)*Math.pow(2,o),s=s+p):(l=e*Math.pow(2,p-1)*Math.pow(2,o),s=0));o>=8;)t[r+h]=l&255,h+=_,l/=256,o-=8;for(s=s<<o|l,c+=o;c>0;)t[r+h]=s&255,h+=_,s/=256,c-=8;t[r+h-_]|=f*128}var config={INSPECT_MAX_BYTES:50},K_MAX_LENGTH=2147483647;Buffer2.TYPED_ARRAY_SUPPORT=!0,Object.defineProperty(Buffer2.prototype,"parent",{enumerable:!0,get:function(){if(Buffer2.isBuffer(this))return this.buffer}}),Object.defineProperty(Buffer2.prototype,"offset",{enumerable:!0,get:function(){if(Buffer2.isBuffer(this))return this.byteOffset}});function createBuffer(t){if(t>K_MAX_LENGTH)throw new RangeError('The value "'+t+'" is invalid for option "size"');const e=new Uint8Array(t);return Object.setPrototypeOf(e,Buffer2.prototype),e}function Buffer2(t,e,r){if(typeof t=="number"){if(typeof e=="string")throw new TypeError('The "string" argument must be of type string. Received type number');return allocUnsafe(t)}return from(t,e,r)}Buffer2.poolSize=8192;function from(t,e,r){if(typeof t=="string")return fromString(t,e);if(ArrayBuffer.isView(t))return fromArrayView(t);if(t==null)throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t);if(t instanceof ArrayBuffer||t&&t.buffer instanceof ArrayBuffer||t instanceof SharedArrayBuffer||t&&t.buffer instanceof SharedArrayBuffer)return fromArrayBuffer(t,e,r);if(typeof t=="number")throw new TypeError('The "value" argument must not be of type number. Received type number');const n=t.valueOf&&t.valueOf();if(n!=null&&n!==t)return Buffer2.from(n,e,r);const o=fromObject(t);if(o)return o;if(typeof Symbol<"u"&&Symbol.toPrimitive!=null&&typeof t[Symbol.toPrimitive]=="function")return Buffer2.from(t[Symbol.toPrimitive]("string"),e,r);throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof t)}Buffer2.from=function(t,e,r){return from(t,e,r)},Object.setPrototypeOf(Buffer2.prototype,Uint8Array.prototype),Object.setPrototypeOf(Buffer2,Uint8Array);function assertSize(t){if(typeof t!="number")throw new TypeError('"size" argument must be of type number');if(t<0)throw new RangeError('The value "'+t+'" is invalid for option "size"')}function alloc(t,e,r){return assertSize(t),t<=0?createBuffer(t):e!==void 0?typeof r=="string"?createBuffer(t).fill(e,r):createBuffer(t).fill(e):createBuffer(t)}Buffer2.alloc=function(t,e,r){return alloc(t,e,r)};function allocUnsafe(t){return assertSize(t),createBuffer(t<0?0:checked(t)|0)}Buffer2.allocUnsafe=function(t){return allocUnsafe(t)},Buffer2.allocUnsafeSlow=function(t){return allocUnsafe(t)};function fromString(t,e){if((typeof e!="string"||e==="")&&(e="utf8"),!Buffer2.isEncoding(e))throw new TypeError("Unknown encoding: "+e);const r=byteLength(t,e)|0;let n=createBuffer(r);const o=n.write(t,e);return o!==r&&(n=n.slice(0,o)),n}function fromArrayLike(t){const e=t.length<0?0:checked(t.length)|0,r=createBuffer(e);for(let n=0;n<e;n+=1)r[n]=t[n]&255;return r}function fromArrayView(t){if(t instanceof Uint8Array){const e=new Uint8Array(t);return fromArrayBuffer(e.buffer,e.byteOffset,e.byteLength)}return fromArrayLike(t)}function fromArrayBuffer(t,e,r){if(e<0||t.byteLength<e)throw new RangeError('"offset" is outside of buffer bounds');if(t.byteLength<e+(r||0))throw new RangeError('"length" is outside of buffer bounds');let n;return e===void 0&&r===void 0?n=new Uint8Array(t):r===void 0?n=new Uint8Array(t,e):n=new Uint8Array(t,e,r),Object.setPrototypeOf(n,Buffer2.prototype),n}function fromObject(t){if(Buffer2.isBuffer(t)){const e=checked(t.length)|0,r=createBuffer(e);return r.length===0||t.copy(r,0,0,e),r}if(t.length!==void 0)return typeof t.length!="number"||Number.isNaN(t.length)?createBuffer(0):fromArrayLike(t);if(t.type==="Buffer"&&Array.isArray(t.data))return fromArrayLike(t.data)}function checked(t){if(t>=K_MAX_LENGTH)throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+K_MAX_LENGTH.toString(16)+" bytes");return t|0}Buffer2.isBuffer=function(e){return e!=null&&e._isBuffer===!0&&e!==Buffer2.prototype},Buffer2.compare=function(e,r){if(e instanceof Uint8Array&&(e=Buffer2.from(e,e.offset,e.byteLength)),r instanceof Uint8Array&&(r=Buffer2.from(r,r.offset,r.byteLength)),!Buffer2.isBuffer(e)||!Buffer2.isBuffer(r))throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(e===r)return 0;let n=e.length,o=r.length;for(let i=0,s=Math.min(n,o);i<s;++i)if(e[i]!==r[i]){n=e[i],o=r[i];break}return n<o?-1:o<n?1:0},Buffer2.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},Buffer2.concat=function(e,r){if(!Array.isArray(e))throw new TypeError('"list" argument must be an Array of Buffers');if(e.length===0)return Buffer2.alloc(0);let n;if(r===void 0)for(r=0,n=0;n<e.length;++n)r+=e[n].length;const o=Buffer2.allocUnsafe(r);let i=0;for(n=0;n<e.length;++n){let s=e[n];if(s instanceof Uint8Array)i+s.length>o.length?(Buffer2.isBuffer(s)||(s=Buffer2.from(s.buffer,s.byteOffset,s.byteLength)),s.copy(o,i)):Uint8Array.prototype.set.call(o,s,i);else if(Buffer2.isBuffer(s))s.copy(o,i);else throw new TypeError('"list" argument must be an Array of Buffers');i+=s.length}return o};function byteLength(t,e){if(Buffer2.isBuffer(t))return t.length;if(ArrayBuffer.isView(t)||t instanceof ArrayBuffer)return t.byteLength;if(typeof t!="string")throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof t);const r=t.length,n=arguments.length>2&&arguments[2]===!0;if(!n&&r===0)return 0;let o=!1;for(;;)switch(e){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":return utf8ToBytes(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return r*2;case"hex":return r>>>1;case"base64":return base64ToBytes(t).length;default:if(o)return n?-1:utf8ToBytes(t).length;e=(""+e).toLowerCase(),o=!0}}Buffer2.byteLength=byteLength;function slowToString(t,e,r){let n=!1;if((e===void 0||e<0)&&(e=0),e>this.length||((r===void 0||r>this.length)&&(r=this.length),r<=0)||(r>>>=0,e>>>=0,r<=e))return"";for(t||(t="utf8");;)switch(t){case"hex":return hexSlice(this,e,r);case"utf8":case"utf-8":return utf8Slice(this,e,r);case"ascii":return asciiSlice(this,e,r);case"latin1":case"binary":return latin1Slice(this,e,r);case"base64":return base64Slice(this,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return utf16leSlice(this,e,r);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}Buffer2.prototype._isBuffer=!0;function swap(t,e,r){const n=t[e];t[e]=t[r],t[r]=n}Buffer2.prototype.swap16=function(){const e=this.length;if(e%2!==0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(let r=0;r<e;r+=2)swap(this,r,r+1);return this},Buffer2.prototype.swap32=function(){const e=this.length;if(e%4!==0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(let r=0;r<e;r+=4)swap(this,r,r+3),swap(this,r+1,r+2);return this},Buffer2.prototype.swap64=function(){const e=this.length;if(e%8!==0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(let r=0;r<e;r+=8)swap(this,r,r+7),swap(this,r+1,r+6),swap(this,r+2,r+5),swap(this,r+3,r+4);return this},Buffer2.prototype.toString=function(){const e=this.length;return e===0?"":arguments.length===0?utf8Slice(this,0,e):slowToString.apply(this,arguments)},Buffer2.prototype.toLocaleString=Buffer2.prototype.toString,Buffer2.prototype.equals=function(e){if(!Buffer2.isBuffer(e))throw new TypeError("Argument must be a Buffer");return this===e?!0:Buffer2.compare(this,e)===0},Buffer2.prototype.inspect=function(){let e="";const r=config.INSPECT_MAX_BYTES;return e=this.toString("hex",0,r).replace(/(.{2})/g,"$1 ").trim(),this.length>r&&(e+=" ... "),"<Buffer "+e+">"},Buffer2.prototype[Symbol.for("nodejs.util.inspect.custom")]=Buffer2.prototype.inspect,Buffer2.prototype.compare=function(e,r,n,o,i){if(e instanceof Uint8Array&&(e=Buffer2.from(e,e.offset,e.byteLength)),!Buffer2.isBuffer(e))throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof e);if(r===void 0&&(r=0),n===void 0&&(n=e?e.length:0),o===void 0&&(o=0),i===void 0&&(i=this.length),r<0||n>e.length||o<0||i>this.length)throw new RangeError("out of range index");if(o>=i&&r>=n)return 0;if(o>=i)return-1;if(r>=n)return 1;if(r>>>=0,n>>>=0,o>>>=0,i>>>=0,this===e)return 0;let s=i-o,l=n-r;const a=Math.min(s,l),c=this.slice(o,i),d=e.slice(r,n);for(let p=0;p<a;++p)if(c[p]!==d[p]){s=c[p],l=d[p];break}return s<l?-1:l<s?1:0};function bidirectionalIndexOf(t,e,r,n,o){if(t.length===0)return-1;if(typeof r=="string"?(n=r,r=0):r>2147483647?r=2147483647:r<-2147483648&&(r=-2147483648),r=+r,Number.isNaN(r)&&(r=o?0:t.length-1),r<0&&(r=t.length+r),r>=t.length){if(o)return-1;r=t.length-1}else if(r<0)if(o)r=0;else return-1;if(typeof e=="string"&&(e=Buffer2.from(e,n)),Buffer2.isBuffer(e))return e.length===0?-1:arrayIndexOf(t,e,r,n,o);if(typeof e=="number")return e=e&255,typeof Uint8Array.prototype.indexOf=="function"?o?Uint8Array.prototype.indexOf.call(t,e,r):Uint8Array.prototype.lastIndexOf.call(t,e,r):arrayIndexOf(t,[e],r,n,o);throw new TypeError("val must be string, number or Buffer")}function arrayIndexOf(t,e,r,n,o){let i=1,s=t.length,l=e.length;if(n!==void 0&&(n=String(n).toLowerCase(),n==="ucs2"||n==="ucs-2"||n==="utf16le"||n==="utf-16le")){if(t.length<2||e.length<2)return-1;i=2,s/=2,l/=2,r/=2}function a(d,p){return i===1?d[p]:d.readUInt16BE(p*i)}let c;if(o){let d=-1;for(c=r;c<s;c++)if(a(t,c)===a(e,d===-1?0:c-d)){if(d===-1&&(d=c),c-d+1===l)return d*i}else d!==-1&&(c-=c-d),d=-1}else for(r+l>s&&(r=s-l),c=r;c>=0;c--){let d=!0;for(let p=0;p<l;p++)if(a(t,c+p)!==a(e,p)){d=!1;break}if(d)return c}return-1}Buffer2.prototype.includes=function(e,r,n){return this.indexOf(e,r,n)!==-1},Buffer2.prototype.indexOf=function(e,r,n){return bidirectionalIndexOf(this,e,r,n,!0)},Buffer2.prototype.lastIndexOf=function(e,r,n){return bidirectionalIndexOf(this,e,r,n,!1)};function hexWrite(t,e,r,n){r=Number(r)||0;const o=t.length-r;n?(n=Number(n),n>o&&(n=o)):n=o;const i=e.length;n>i/2&&(n=i/2);let s;for(s=0;s<n;++s){const l=parseInt(e.substr(s*2,2),16);if(Number.isNaN(l))return s;t[r+s]=l}return s}function utf8Write(t,e,r,n){return blitBuffer(utf8ToBytes(e,t.length-r),t,r,n)}function asciiWrite(t,e,r,n){return blitBuffer(asciiToBytes(e),t,r,n)}function base64Write(t,e,r,n){return blitBuffer(base64ToBytes(e),t,r,n)}function ucs2Write(t,e,r,n){return blitBuffer(utf16leToBytes(e,t.length-r),t,r,n)}Buffer2.prototype.write=function(e,r,n,o){if(r===void 0)o="utf8",n=this.length,r=0;else if(n===void 0&&typeof r=="string")o=r,n=this.length,r=0;else if(isFinite(r))r=r>>>0,isFinite(n)?(n=n>>>0,o===void 0&&(o="utf8")):(o=n,n=void 0);else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");const i=this.length-r;if((n===void 0||n>i)&&(n=i),e.length>0&&(n<0||r<0)||r>this.length)throw new RangeError("Attempt to write outside buffer bounds");o||(o="utf8");let s=!1;for(;;)switch(o){case"hex":return hexWrite(this,e,r,n);case"utf8":case"utf-8":return utf8Write(this,e,r,n);case"ascii":case"latin1":case"binary":return asciiWrite(this,e,r,n);case"base64":return base64Write(this,e,r,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return ucs2Write(this,e,r,n);default:if(s)throw new TypeError("Unknown encoding: "+o);o=(""+o).toLowerCase(),s=!0}},Buffer2.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};function base64Slice(t,e,r){return e===0&&r===t.length?fromByteArray(t):fromByteArray(t.slice(e,r))}function utf8Slice(t,e,r){r=Math.min(t.length,r);const n=[];let o=e;for(;o<r;){const i=t[o];let s=null,l=i>239?4:i>223?3:i>191?2:1;if(o+l<=r){let a,c,d,p;switch(l){case 1:i<128&&(s=i);break;case 2:a=t[o+1],(a&192)===128&&(p=(i&31)<<6|a&63,p>127&&(s=p));break;case 3:a=t[o+1],c=t[o+2],(a&192)===128&&(c&192)===128&&(p=(i&15)<<12|(a&63)<<6|c&63,p>2047&&(p<55296||p>57343)&&(s=p));break;case 4:a=t[o+1],c=t[o+2],d=t[o+3],(a&192)===128&&(c&192)===128&&(d&192)===128&&(p=(i&15)<<18|(a&63)<<12|(c&63)<<6|d&63,p>65535&&p<1114112&&(s=p))}}s===null?(s=65533,l=1):s>65535&&(s-=65536,n.push(s>>>10&1023|55296),s=56320|s&1023),n.push(s),o+=l}return decodeCodePointsArray(n)}var MAX_ARGUMENTS_LENGTH=4096;function decodeCodePointsArray(t){const e=t.length;if(e<=MAX_ARGUMENTS_LENGTH)return String.fromCharCode.apply(String,t);let r="",n=0;for(;n<e;)r+=String.fromCharCode.apply(String,t.slice(n,n+=MAX_ARGUMENTS_LENGTH));return r}function asciiSlice(t,e,r){let n="";r=Math.min(t.length,r);for(let o=e;o<r;++o)n+=String.fromCharCode(t[o]&127);return n}function latin1Slice(t,e,r){let n="";r=Math.min(t.length,r);for(let o=e;o<r;++o)n+=String.fromCharCode(t[o]);return n}function hexSlice(t,e,r){const n=t.length;(!e||e<0)&&(e=0),(!r||r<0||r>n)&&(r=n);let o="";for(let i=e;i<r;++i)o+=hexSliceLookupTable[t[i]];return o}function utf16leSlice(t,e,r){const n=t.slice(e,r);let o="";for(let i=0;i<n.length-1;i+=2)o+=String.fromCharCode(n[i]+n[i+1]*256);return o}Buffer2.prototype.slice=function(e,r){const n=this.length;e=~~e,r=r===void 0?n:~~r,e<0?(e+=n,e<0&&(e=0)):e>n&&(e=n),r<0?(r+=n,r<0&&(r=0)):r>n&&(r=n),r<e&&(r=e);const o=this.subarray(e,r);return Object.setPrototypeOf(o,Buffer2.prototype),o};function checkOffset(t,e,r){if(t%1!==0||t<0)throw new RangeError("offset is not uint");if(t+e>r)throw new RangeError("Trying to access beyond buffer length")}Buffer2.prototype.readUintLE=Buffer2.prototype.readUIntLE=function(e,r,n){e=e>>>0,r=r>>>0,n||checkOffset(e,r,this.length);let o=this[e],i=1,s=0;for(;++s<r&&(i*=256);)o+=this[e+s]*i;return o},Buffer2.prototype.readUintBE=Buffer2.prototype.readUIntBE=function(e,r,n){e=e>>>0,r=r>>>0,n||checkOffset(e,r,this.length);let o=this[e+--r],i=1;for(;r>0&&(i*=256);)o+=this[e+--r]*i;return o},Buffer2.prototype.readUint8=Buffer2.prototype.readUInt8=function(e,r){return e=e>>>0,r||checkOffset(e,1,this.length),this[e]},Buffer2.prototype.readUint16LE=Buffer2.prototype.readUInt16LE=function(e,r){return e=e>>>0,r||checkOffset(e,2,this.length),this[e]|this[e+1]<<8},Buffer2.prototype.readUint16BE=Buffer2.prototype.readUInt16BE=function(e,r){return e=e>>>0,r||checkOffset(e,2,this.length),this[e]<<8|this[e+1]},Buffer2.prototype.readUint32LE=Buffer2.prototype.readUInt32LE=function(e,r){return e=e>>>0,r||checkOffset(e,4,this.length),(this[e]|this[e+1]<<8|this[e+2]<<16)+this[e+3]*16777216},Buffer2.prototype.readUint32BE=Buffer2.prototype.readUInt32BE=function(e,r){return e=e>>>0,r||checkOffset(e,4,this.length),this[e]*16777216+(this[e+1]<<16|this[e+2]<<8|this[e+3])},Buffer2.prototype.readBigUInt64LE=function(e){e=e>>>0,validateNumber(e,"offset");const r=this[e],n=this[e+7];(r===void 0||n===void 0)&&boundsError(e,this.length-8);const o=r+this[++e]*2**8+this[++e]*2**16+this[++e]*2**24,i=this[++e]+this[++e]*2**8+this[++e]*2**16+n*2**24;return BigInt(o)+(BigInt(i)<<BigInt(32))},Buffer2.prototype.readBigUInt64BE=function(e){e=e>>>0,validateNumber(e,"offset");const r=this[e],n=this[e+7];(r===void 0||n===void 0)&&boundsError(e,this.length-8);const o=r*2**24+this[++e]*2**16+this[++e]*2**8+this[++e],i=this[++e]*2**24+this[++e]*2**16+this[++e]*2**8+n;return(BigInt(o)<<BigInt(32))+BigInt(i)},Buffer2.prototype.readIntLE=function(e,r,n){e=e>>>0,r=r>>>0,n||checkOffset(e,r,this.length);let o=this[e],i=1,s=0;for(;++s<r&&(i*=256);)o+=this[e+s]*i;return i*=128,o>=i&&(o-=Math.pow(2,8*r)),o},Buffer2.prototype.readIntBE=function(e,r,n){e=e>>>0,r=r>>>0,n||checkOffset(e,r,this.length);let o=r,i=1,s=this[e+--o];for(;o>0&&(i*=256);)s+=this[e+--o]*i;return i*=128,s>=i&&(s-=Math.pow(2,8*r)),s},Buffer2.prototype.readInt8=function(e,r){return e=e>>>0,r||checkOffset(e,1,this.length),this[e]&128?(255-this[e]+1)*-1:this[e]},Buffer2.prototype.readInt16LE=function(e,r){e=e>>>0,r||checkOffset(e,2,this.length);const n=this[e]|this[e+1]<<8;return n&32768?n|4294901760:n},Buffer2.prototype.readInt16BE=function(e,r){e=e>>>0,r||checkOffset(e,2,this.length);const n=this[e+1]|this[e]<<8;return n&32768?n|4294901760:n},Buffer2.prototype.readInt32LE=function(e,r){return e=e>>>0,r||checkOffset(e,4,this.length),this[e]|this[e+1]<<8|this[e+2]<<16|this[e+3]<<24},Buffer2.prototype.readInt32BE=function(e,r){return e=e>>>0,r||checkOffset(e,4,this.length),this[e]<<24|this[e+1]<<16|this[e+2]<<8|this[e+3]},Buffer2.prototype.readBigInt64LE=function(e){e=e>>>0,validateNumber(e,"offset");const r=this[e],n=this[e+7];(r===void 0||n===void 0)&&boundsError(e,this.length-8);const o=this[e+4]+this[e+5]*2**8+this[e+6]*2**16+(n<<24);return(BigInt(o)<<BigInt(32))+BigInt(r+this[++e]*2**8+this[++e]*2**16+this[++e]*2**24)},Buffer2.prototype.readBigInt64BE=function(e){e=e>>>0,validateNumber(e,"offset");const r=this[e],n=this[e+7];(r===void 0||n===void 0)&&boundsError(e,this.length-8);const o=(r<<24)+this[++e]*2**16+this[++e]*2**8+this[++e];return(BigInt(o)<<BigInt(32))+BigInt(this[++e]*2**24+this[++e]*2**16+this[++e]*2**8+n)},Buffer2.prototype.readFloatLE=function(e,r){return e=e>>>0,r||checkOffset(e,4,this.length),read(this,e,!0,23,4)},Buffer2.prototype.readFloatBE=function(e,r){return e=e>>>0,r||checkOffset(e,4,this.length),read(this,e,!1,23,4)},Buffer2.prototype.readDoubleLE=function(e,r){return e=e>>>0,r||checkOffset(e,8,this.length),read(this,e,!0,52,8)},Buffer2.prototype.readDoubleBE=function(e,r){return e=e>>>0,r||checkOffset(e,8,this.length),read(this,e,!1,52,8)};function checkInt(t,e,r,n,o,i){if(!Buffer2.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>o||e<i)throw new RangeError('"value" argument is out of bounds');if(r+n>t.length)throw new RangeError("Index out of range")}Buffer2.prototype.writeUintLE=Buffer2.prototype.writeUIntLE=function(e,r,n,o){if(e=+e,r=r>>>0,n=n>>>0,!o){const l=Math.pow(2,8*n)-1;checkInt(this,e,r,n,l,0)}let i=1,s=0;for(this[r]=e&255;++s<n&&(i*=256);)this[r+s]=e/i&255;return r+n},Buffer2.prototype.writeUintBE=Buffer2.prototype.writeUIntBE=function(e,r,n,o){if(e=+e,r=r>>>0,n=n>>>0,!o){const l=Math.pow(2,8*n)-1;checkInt(this,e,r,n,l,0)}let i=n-1,s=1;for(this[r+i]=e&255;--i>=0&&(s*=256);)this[r+i]=e/s&255;return r+n},Buffer2.prototype.writeUint8=Buffer2.prototype.writeUInt8=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,1,255,0),this[r]=e&255,r+1},Buffer2.prototype.writeUint16LE=Buffer2.prototype.writeUInt16LE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,2,65535,0),this[r]=e&255,this[r+1]=e>>>8,r+2},Buffer2.prototype.writeUint16BE=Buffer2.prototype.writeUInt16BE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,2,65535,0),this[r]=e>>>8,this[r+1]=e&255,r+2},Buffer2.prototype.writeUint32LE=Buffer2.prototype.writeUInt32LE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,4,4294967295,0),this[r+3]=e>>>24,this[r+2]=e>>>16,this[r+1]=e>>>8,this[r]=e&255,r+4},Buffer2.prototype.writeUint32BE=Buffer2.prototype.writeUInt32BE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,4,4294967295,0),this[r]=e>>>24,this[r+1]=e>>>16,this[r+2]=e>>>8,this[r+3]=e&255,r+4};function wrtBigUInt64LE(t,e,r,n,o){checkIntBI(e,n,o,t,r,7);let i=Number(e&BigInt(4294967295));t[r++]=i,i=i>>8,t[r++]=i,i=i>>8,t[r++]=i,i=i>>8,t[r++]=i;let s=Number(e>>BigInt(32)&BigInt(4294967295));return t[r++]=s,s=s>>8,t[r++]=s,s=s>>8,t[r++]=s,s=s>>8,t[r++]=s,r}function wrtBigUInt64BE(t,e,r,n,o){checkIntBI(e,n,o,t,r,7);let i=Number(e&BigInt(4294967295));t[r+7]=i,i=i>>8,t[r+6]=i,i=i>>8,t[r+5]=i,i=i>>8,t[r+4]=i;let s=Number(e>>BigInt(32)&BigInt(4294967295));return t[r+3]=s,s=s>>8,t[r+2]=s,s=s>>8,t[r+1]=s,s=s>>8,t[r]=s,r+8}Buffer2.prototype.writeBigUInt64LE=function(e,r=0){return wrtBigUInt64LE(this,e,r,BigInt(0),BigInt("0xffffffffffffffff"))},Buffer2.prototype.writeBigUInt64BE=function(e,r=0){return wrtBigUInt64BE(this,e,r,BigInt(0),BigInt("0xffffffffffffffff"))},Buffer2.prototype.writeIntLE=function(e,r,n,o){if(e=+e,r=r>>>0,!o){const a=Math.pow(2,8*n-1);checkInt(this,e,r,n,a-1,-a)}let i=0,s=1,l=0;for(this[r]=e&255;++i<n&&(s*=256);)e<0&&l===0&&this[r+i-1]!==0&&(l=1),this[r+i]=(e/s>>0)-l&255;return r+n},Buffer2.prototype.writeIntBE=function(e,r,n,o){if(e=+e,r=r>>>0,!o){const a=Math.pow(2,8*n-1);checkInt(this,e,r,n,a-1,-a)}let i=n-1,s=1,l=0;for(this[r+i]=e&255;--i>=0&&(s*=256);)e<0&&l===0&&this[r+i+1]!==0&&(l=1),this[r+i]=(e/s>>0)-l&255;return r+n},Buffer2.prototype.writeInt8=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,1,127,-128),e<0&&(e=255+e+1),this[r]=e&255,r+1},Buffer2.prototype.writeInt16LE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,2,32767,-32768),this[r]=e&255,this[r+1]=e>>>8,r+2},Buffer2.prototype.writeInt16BE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,2,32767,-32768),this[r]=e>>>8,this[r+1]=e&255,r+2},Buffer2.prototype.writeInt32LE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,4,2147483647,-2147483648),this[r]=e&255,this[r+1]=e>>>8,this[r+2]=e>>>16,this[r+3]=e>>>24,r+4},Buffer2.prototype.writeInt32BE=function(e,r,n){return e=+e,r=r>>>0,n||checkInt(this,e,r,4,2147483647,-2147483648),e<0&&(e=4294967295+e+1),this[r]=e>>>24,this[r+1]=e>>>16,this[r+2]=e>>>8,this[r+3]=e&255,r+4},Buffer2.prototype.writeBigInt64LE=function(e,r=0){return wrtBigUInt64LE(this,e,r,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))},Buffer2.prototype.writeBigInt64BE=function(e,r=0){return wrtBigUInt64BE(this,e,r,-BigInt("0x8000000000000000"),BigInt("0x7fffffffffffffff"))};function checkIEEE754(t,e,r,n,o,i){if(r+n>t.length)throw new RangeError("Index out of range");if(r<0)throw new RangeError("Index out of range")}function writeFloat(t,e,r,n,o){return e=+e,r=r>>>0,o||checkIEEE754(t,e,r,4,34028234663852886e22,-34028234663852886e22),write(t,e,r,n,23,4),r+4}Buffer2.prototype.writeFloatLE=function(e,r,n){return writeFloat(this,e,r,!0,n)},Buffer2.prototype.writeFloatBE=function(e,r,n){return writeFloat(this,e,r,!1,n)};function writeDouble(t,e,r,n,o){return e=+e,r=r>>>0,o||checkIEEE754(t,e,r,8,17976931348623157e292,-17976931348623157e292),write(t,e,r,n,52,8),r+8}Buffer2.prototype.writeDoubleLE=function(e,r,n){return writeDouble(this,e,r,!0,n)},Buffer2.prototype.writeDoubleBE=function(e,r,n){return writeDouble(this,e,r,!1,n)},Buffer2.prototype.copy=function(e,r,n,o){if(!Buffer2.isBuffer(e))throw new TypeError("argument should be a Buffer");if(n||(n=0),!o&&o!==0&&(o=this.length),r>=e.length&&(r=e.length),r||(r=0),o>0&&o<n&&(o=n),o===n||e.length===0||this.length===0)return 0;if(r<0)throw new RangeError("targetStart out of bounds");if(n<0||n>=this.length)throw new RangeError("Index out of range");if(o<0)throw new RangeError("sourceEnd out of bounds");o>this.length&&(o=this.length),e.length-r<o-n&&(o=e.length-r+n);const i=o-n;return this===e?this.copyWithin(r,n,o):Uint8Array.prototype.set.call(e,this.subarray(n,o),r),i},Buffer2.prototype.fill=function(e,r,n,o){if(typeof e=="string"){if(typeof r=="string"?(o=r,r=0,n=this.length):typeof n=="string"&&(o=n,n=this.length),o!==void 0&&typeof o!="string")throw new TypeError("encoding must be a string");if(typeof o=="string"&&!Buffer2.isEncoding(o))throw new TypeError("Unknown encoding: "+o);if(e.length===1){const s=e.charCodeAt(0);(o==="utf8"&&s<128||o==="latin1")&&(e=s)}}else typeof e=="number"?e=e&255:typeof e=="boolean"&&(e=Number(e));if(r<0||this.length<r||this.length<n)throw new RangeError("Out of range index");if(n<=r)return this;r=r>>>0,n=n===void 0?this.length:n>>>0,e||(e=0);let i;if(typeof e=="number")for(i=r;i<n;++i)this[i]=e;else{const s=Buffer2.isBuffer(e)?e:Buffer2.from(e,o),l=s.length;if(l===0)throw new TypeError('The value "'+e+'" is invalid for argument "value"');for(i=0;i<n-r;++i)this[i+r]=s[i%l]}return this};var errors={};function E(t,e,r){errors[t]=class extends r{constructor(){super(),Object.defineProperty(this,"message",{value:e.apply(this,arguments),writable:!0,configurable:!0}),this.name=`${this.name} [${t}]`,this.stack,delete this.name}get code(){return t}set code(o){Object.defineProperty(this,"code",{configurable:!0,enumerable:!0,value:o,writable:!0})}toString(){return`${this.name} [${t}]: ${this.message}`}}}E("ERR_BUFFER_OUT_OF_BOUNDS",function(t){return t?`${t} is outside of buffer bounds`:"Attempt to access memory outside buffer bounds"},RangeError),E("ERR_INVALID_ARG_TYPE",function(t,e){return`The "${t}" argument must be of type number. Received type ${typeof e}`},TypeError),E("ERR_OUT_OF_RANGE",function(t,e,r){let n=`The value of "${t}" is out of range.`,o=r;return Number.isInteger(r)&&Math.abs(r)>2**32?o=addNumericalSeparator(String(r)):typeof r=="bigint"&&(o=String(r),(r>BigInt(2)**BigInt(32)||r<-(BigInt(2)**BigInt(32)))&&(o=addNumericalSeparator(o)),o+="n"),n+=` It must be ${e}. Received ${o}`,n},RangeError);function addNumericalSeparator(t){let e="",r=t.length;const n=t[0]==="-"?1:0;for(;r>=n+4;r-=3)e=`_${t.slice(r-3,r)}${e}`;return`${t.slice(0,r)}${e}`}function checkBounds(t,e,r){validateNumber(e,"offset"),(t[e]===void 0||t[e+r]===void 0)&&boundsError(e,t.length-(r+1))}function checkIntBI(t,e,r,n,o,i){if(t>r||t<e){const s=typeof e=="bigint"?"n":"";let l;throw i>3?e===0||e===BigInt(0)?l=`>= 0${s} and < 2${s} ** ${(i+1)*8}${s}`:l=`>= -(2${s} ** ${(i+1)*8-1}${s}) and < 2 ** ${(i+1)*8-1}${s}`:l=`>= ${e}${s} and <= ${r}${s}`,new errors.ERR_OUT_OF_RANGE("value",l,t)}checkBounds(n,o,i)}function validateNumber(t,e){if(typeof t!="number")throw new errors.ERR_INVALID_ARG_TYPE(e,"number",t)}function boundsError(t,e,r){throw Math.floor(t)!==t?(validateNumber(t,r),new errors.ERR_OUT_OF_RANGE(r||"offset","an integer",t)):e<0?new errors.ERR_BUFFER_OUT_OF_BOUNDS:new errors.ERR_OUT_OF_RANGE(r||"offset",`>= ${r?1:0} and <= ${e}`,t)}var INVALID_BASE64_RE=/[^+/0-9A-Za-z-_]/g;function base64clean(t){if(t=t.split("=")[0],t=t.trim().replace(INVALID_BASE64_RE,""),t.length<2)return"";for(;t.length%4!==0;)t=t+"=";return t}function utf8ToBytes(t,e){e=e||1/0;let r;const n=t.length;let o=null;const i=[];for(let s=0;s<n;++s){if(r=t.charCodeAt(s),r>55295&&r<57344){if(!o){if(r>56319){(e-=3)>-1&&i.push(239,191,189);continue}else if(s+1===n){(e-=3)>-1&&i.push(239,191,189);continue}o=r;continue}if(r<56320){(e-=3)>-1&&i.push(239,191,189),o=r;continue}r=(o-55296<<10|r-56320)+65536}else o&&(e-=3)>-1&&i.push(239,191,189);if(o=null,r<128){if((e-=1)<0)break;i.push(r)}else if(r<2048){if((e-=2)<0)break;i.push(r>>6|192,r&63|128)}else if(r<65536){if((e-=3)<0)break;i.push(r>>12|224,r>>6&63|128,r&63|128)}else if(r<1114112){if((e-=4)<0)break;i.push(r>>18|240,r>>12&63|128,r>>6&63|128,r&63|128)}else throw new Error("Invalid code point")}return i}function asciiToBytes(t){const e=[];for(let r=0;r<t.length;++r)e.push(t.charCodeAt(r)&255);return e}function utf16leToBytes(t,e){let r,n,o;const i=[];for(let s=0;s<t.length&&!((e-=2)<0);++s)r=t.charCodeAt(s),n=r>>8,o=r%256,i.push(o),i.push(n);return i}function base64ToBytes(t){return toByteArray(base64clean(t))}function blitBuffer(t,e,r,n){let o;for(o=0;o<n&&!(o+r>=e.length||o>=t.length);++o)e[o+r]=t[o];return o}var hexSliceLookupTable=(function(){const t="0123456789abcdef",e=new Array(256);for(let r=0;r<16;++r){const n=r*16;for(let o=0;o<16;++o)e[n+o]=t[r]+t[o]}return e})(),android_exports={};__export(android_exports,{ArtMethod:()=>ArtMethod,ArtStackVisitor:()=>ArtStackVisitor,DVM_JNI_ENV_OFFSET_SELF:()=>DVM_JNI_ENV_OFFSET_SELF,HandleVector:()=>HandleVector,VariableSizedHandleScope:()=>VariableSizedHandleScope,backtrace:()=>backtrace,deoptimizeBootImage:()=>deoptimizeBootImage,deoptimizeEverything:()=>deoptimizeEverything,deoptimizeMethod:()=>deoptimizeMethod,ensureClassInitialized:()=>ensureClassInitialized,getAndroidApiLevel:()=>getAndroidApiLevel,getAndroidVersion:()=>getAndroidVersion,getApi:()=>getApi,getArtApexVersion:()=>getArtApexVersion,getArtClassSpec:()=>getArtClassSpec,getArtFieldSpec:()=>getArtFieldSpec,getArtMethodSpec:()=>getArtMethodSpec,getArtThreadFromEnv:()=>getArtThreadFromEnv,getArtThreadSpec:()=>getArtThreadSpec,makeArtClassLoaderVisitor:()=>makeArtClassLoaderVisitor,makeArtClassVisitor:()=>makeArtClassVisitor,makeMethodMangler:()=>makeMethodMangler,makeObjectVisitorPredicate:()=>makeObjectVisitorPredicate,revertGlobalPatches:()=>revertGlobalPatches,translateMethod:()=>translateMethod,withAllArtThreadsSuspended:()=>withAllArtThreadsSuspended,withRunnableArtThread:()=>withRunnableArtThread});var{pageSize,pointerSize}=Process,CodeAllocator=class{constructor(t){this.sliceSize=t,this.slicesPerPage=pageSize/t,this.pages=[],this.free=[]}allocateSlice(t,e){const r=t.near===void 0,n=e===1;if(r&&n){const o=this.free.pop();if(o!==void 0)return o}else if(e<pageSize){const{free:o}=this,i=o.length,s=n?null:ptr(e-1);for(let l=0;l!==i;l++){const a=o[l],c=r||this._isSliceNear(a,t),d=n||a.and(s).isNull();if(c&&d)return o.splice(l,1)[0]}}return this._allocatePage(t)}_allocatePage(t){const e=Memory.alloc(pageSize,t),{sliceSize:r,slicesPerPage:n}=this;for(let o=1;o!==n;o++){const i=e.add(o*r);this.free.push(i)}return this.pages.push(e),e}_isSliceNear(t,e){const r=t.add(this.sliceSize),{near:n,maxDistance:o}=e,i=abs(n.sub(t)),s=abs(n.sub(r));return i.compare(o)<=0&&s.compare(o)<=0}freeSlice(t){this.free.push(t)}};function abs(t){const e=pointerSize===4?31:63,r=ptr(1).shl(e).not();return t.and(r)}function makeAllocator(t){return new CodeAllocator(t)}var JNI_OK=0;function checkJniResult(t,e){if(e!==JNI_OK)throw new Error(t+" failed: "+e)}var jvmtiVersion={v1_0:805371904,v1_2:805372416},jvmtiCapabilities={canTagObjects:1},{pointerSize:pointerSize2}=Process,nativeFunctionOptions={exceptions:"propagate"};function EnvJvmti(t,e){this.handle=t,this.vm=e,this.vtable=t.readPointer()}EnvJvmti.prototype.deallocate=proxy(47,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)}),EnvJvmti.prototype.getLoadedClasses=proxy(78,"int32",["pointer","pointer","pointer"],function(t,e,r){const n=t(this.handle,e,r);checkJniResult("EnvJvmti::getLoadedClasses",n)}),EnvJvmti.prototype.iterateOverInstancesOfClass=proxy(112,"int32",["pointer","pointer","int","pointer","pointer"],function(t,e,r,n,o){const i=t(this.handle,e,r,n,o);checkJniResult("EnvJvmti::iterateOverInstancesOfClass",i)}),EnvJvmti.prototype.getObjectsWithTags=proxy(114,"int32",["pointer","int","pointer","pointer","pointer","pointer"],function(t,e,r,n,o,i){const s=t(this.handle,e,r,n,o,i);checkJniResult("EnvJvmti::getObjectsWithTags",s)}),EnvJvmti.prototype.addCapabilities=proxy(142,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)});function proxy(t,e,r,n){let o=null;return function(){o===null&&(o=new NativeFunction(this.vtable.add((t-1)*pointerSize2).readPointer(),e,r,nativeFunctionOptions));let i=[o];return i=i.concat.apply(i,arguments),n.apply(this,i)}}function parseInstructionsAt(t,e,{limit:r}){let n=t,o=null;for(let i=0;i!==r;i++){const s=Instruction.parse(n),l=e(s,o);if(l!==null)return l;n=s.next,o=s}return null}function memoize(t){let e=null,r=!1;return function(...n){return r||(e=t(...n),r=!0),e}}function Env(t,e){this.handle=t,this.vm=e}var pointerSize3=Process.pointerSize,JNI_ABORT=2,CALL_CONSTRUCTOR_METHOD_OFFSET=28,CALL_OBJECT_METHOD_OFFSET=34,CALL_BOOLEAN_METHOD_OFFSET=37,CALL_BYTE_METHOD_OFFSET=40,CALL_CHAR_METHOD_OFFSET=43,CALL_SHORT_METHOD_OFFSET=46,CALL_INT_METHOD_OFFSET=49,CALL_LONG_METHOD_OFFSET=52,CALL_FLOAT_METHOD_OFFSET=55,CALL_DOUBLE_METHOD_OFFSET=58,CALL_VOID_METHOD_OFFSET=61,CALL_NONVIRTUAL_OBJECT_METHOD_OFFSET=64,CALL_NONVIRTUAL_BOOLEAN_METHOD_OFFSET=67,CALL_NONVIRTUAL_BYTE_METHOD_OFFSET=70,CALL_NONVIRTUAL_CHAR_METHOD_OFFSET=73,CALL_NONVIRTUAL_SHORT_METHOD_OFFSET=76,CALL_NONVIRTUAL_INT_METHOD_OFFSET=79,CALL_NONVIRTUAL_LONG_METHOD_OFFSET=82,CALL_NONVIRTUAL_FLOAT_METHOD_OFFSET=85,CALL_NONVIRTUAL_DOUBLE_METHOD_OFFSET=88,CALL_NONVIRTUAL_VOID_METHOD_OFFSET=91,CALL_STATIC_OBJECT_METHOD_OFFSET=114,CALL_STATIC_BOOLEAN_METHOD_OFFSET=117,CALL_STATIC_BYTE_METHOD_OFFSET=120,CALL_STATIC_CHAR_METHOD_OFFSET=123,CALL_STATIC_SHORT_METHOD_OFFSET=126,CALL_STATIC_INT_METHOD_OFFSET=129,CALL_STATIC_LONG_METHOD_OFFSET=132,CALL_STATIC_FLOAT_METHOD_OFFSET=135,CALL_STATIC_DOUBLE_METHOD_OFFSET=138,CALL_STATIC_VOID_METHOD_OFFSET=141,GET_OBJECT_FIELD_OFFSET=95,GET_BOOLEAN_FIELD_OFFSET=96,GET_BYTE_FIELD_OFFSET=97,GET_CHAR_FIELD_OFFSET=98,GET_SHORT_FIELD_OFFSET=99,GET_INT_FIELD_OFFSET=100,GET_LONG_FIELD_OFFSET=101,GET_FLOAT_FIELD_OFFSET=102,GET_DOUBLE_FIELD_OFFSET=103,SET_OBJECT_FIELD_OFFSET=104,SET_BOOLEAN_FIELD_OFFSET=105,SET_BYTE_FIELD_OFFSET=106,SET_CHAR_FIELD_OFFSET=107,SET_SHORT_FIELD_OFFSET=108,SET_INT_FIELD_OFFSET=109,SET_LONG_FIELD_OFFSET=110,SET_FLOAT_FIELD_OFFSET=111,SET_DOUBLE_FIELD_OFFSET=112,GET_STATIC_OBJECT_FIELD_OFFSET=145,GET_STATIC_BOOLEAN_FIELD_OFFSET=146,GET_STATIC_BYTE_FIELD_OFFSET=147,GET_STATIC_CHAR_FIELD_OFFSET=148,GET_STATIC_SHORT_FIELD_OFFSET=149,GET_STATIC_INT_FIELD_OFFSET=150,GET_STATIC_LONG_FIELD_OFFSET=151,GET_STATIC_FLOAT_FIELD_OFFSET=152,GET_STATIC_DOUBLE_FIELD_OFFSET=153,SET_STATIC_OBJECT_FIELD_OFFSET=154,SET_STATIC_BOOLEAN_FIELD_OFFSET=155,SET_STATIC_BYTE_FIELD_OFFSET=156,SET_STATIC_CHAR_FIELD_OFFSET=157,SET_STATIC_SHORT_FIELD_OFFSET=158,SET_STATIC_INT_FIELD_OFFSET=159,SET_STATIC_LONG_FIELD_OFFSET=160,SET_STATIC_FLOAT_FIELD_OFFSET=161,SET_STATIC_DOUBLE_FIELD_OFFSET=162,callMethodOffset={pointer:CALL_OBJECT_METHOD_OFFSET,uint8:CALL_BOOLEAN_METHOD_OFFSET,int8:CALL_BYTE_METHOD_OFFSET,uint16:CALL_CHAR_METHOD_OFFSET,int16:CALL_SHORT_METHOD_OFFSET,int32:CALL_INT_METHOD_OFFSET,int64:CALL_LONG_METHOD_OFFSET,float:CALL_FLOAT_METHOD_OFFSET,double:CALL_DOUBLE_METHOD_OFFSET,void:CALL_VOID_METHOD_OFFSET},callNonvirtualMethodOffset={pointer:CALL_NONVIRTUAL_OBJECT_METHOD_OFFSET,uint8:CALL_NONVIRTUAL_BOOLEAN_METHOD_OFFSET,int8:CALL_NONVIRTUAL_BYTE_METHOD_OFFSET,uint16:CALL_NONVIRTUAL_CHAR_METHOD_OFFSET,int16:CALL_NONVIRTUAL_SHORT_METHOD_OFFSET,int32:CALL_NONVIRTUAL_INT_METHOD_OFFSET,int64:CALL_NONVIRTUAL_LONG_METHOD_OFFSET,float:CALL_NONVIRTUAL_FLOAT_METHOD_OFFSET,double:CALL_NONVIRTUAL_DOUBLE_METHOD_OFFSET,void:CALL_NONVIRTUAL_VOID_METHOD_OFFSET},callStaticMethodOffset={pointer:CALL_STATIC_OBJECT_METHOD_OFFSET,uint8:CALL_STATIC_BOOLEAN_METHOD_OFFSET,int8:CALL_STATIC_BYTE_METHOD_OFFSET,uint16:CALL_STATIC_CHAR_METHOD_OFFSET,int16:CALL_STATIC_SHORT_METHOD_OFFSET,int32:CALL_STATIC_INT_METHOD_OFFSET,int64:CALL_STATIC_LONG_METHOD_OFFSET,float:CALL_STATIC_FLOAT_METHOD_OFFSET,double:CALL_STATIC_DOUBLE_METHOD_OFFSET,void:CALL_STATIC_VOID_METHOD_OFFSET},getFieldOffset={pointer:GET_OBJECT_FIELD_OFFSET,uint8:GET_BOOLEAN_FIELD_OFFSET,int8:GET_BYTE_FIELD_OFFSET,uint16:GET_CHAR_FIELD_OFFSET,int16:GET_SHORT_FIELD_OFFSET,int32:GET_INT_FIELD_OFFSET,int64:GET_LONG_FIELD_OFFSET,float:GET_FLOAT_FIELD_OFFSET,double:GET_DOUBLE_FIELD_OFFSET},setFieldOffset={pointer:SET_OBJECT_FIELD_OFFSET,uint8:SET_BOOLEAN_FIELD_OFFSET,int8:SET_BYTE_FIELD_OFFSET,uint16:SET_CHAR_FIELD_OFFSET,int16:SET_SHORT_FIELD_OFFSET,int32:SET_INT_FIELD_OFFSET,int64:SET_LONG_FIELD_OFFSET,float:SET_FLOAT_FIELD_OFFSET,double:SET_DOUBLE_FIELD_OFFSET},getStaticFieldOffset={pointer:GET_STATIC_OBJECT_FIELD_OFFSET,uint8:GET_STATIC_BOOLEAN_FIELD_OFFSET,int8:GET_STATIC_BYTE_FIELD_OFFSET,uint16:GET_STATIC_CHAR_FIELD_OFFSET,int16:GET_STATIC_SHORT_FIELD_OFFSET,int32:GET_STATIC_INT_FIELD_OFFSET,int64:GET_STATIC_LONG_FIELD_OFFSET,float:GET_STATIC_FLOAT_FIELD_OFFSET,double:GET_STATIC_DOUBLE_FIELD_OFFSET},setStaticFieldOffset={pointer:SET_STATIC_OBJECT_FIELD_OFFSET,uint8:SET_STATIC_BOOLEAN_FIELD_OFFSET,int8:SET_STATIC_BYTE_FIELD_OFFSET,uint16:SET_STATIC_CHAR_FIELD_OFFSET,int16:SET_STATIC_SHORT_FIELD_OFFSET,int32:SET_STATIC_INT_FIELD_OFFSET,int64:SET_STATIC_LONG_FIELD_OFFSET,float:SET_STATIC_FLOAT_FIELD_OFFSET,double:SET_STATIC_DOUBLE_FIELD_OFFSET},nativeFunctionOptions2={exceptions:"propagate"},cachedVtable=null,globalRefs=[];Env.dispose=function(t){globalRefs.forEach(t.deleteGlobalRef,t),globalRefs=[]};function register(t){return globalRefs.push(t),t}function vtable(t){return cachedVtable===null&&(cachedVtable=t.handle.readPointer()),cachedVtable}function proxy2(t,e,r,n){let o=null;return function(){o===null&&(o=new NativeFunction(vtable(this).add(t*pointerSize3).readPointer(),e,r,nativeFunctionOptions2));let i=[o];return i=i.concat.apply(i,arguments),n.apply(this,i)}}Env.prototype.getVersion=proxy2(4,"int32",["pointer"],function(t){return t(this.handle)}),Env.prototype.findClass=proxy2(6,"pointer",["pointer","pointer"],function(t,e){const r=t(this.handle,Memory.allocUtf8String(e));return this.throwIfExceptionPending(),r}),Env.prototype.throwIfExceptionPending=function(){const t=this.exceptionOccurred();if(t.isNull())return;this.exceptionClear();const e=this.newGlobalRef(t);this.deleteLocalRef(t);const r=this.vaMethod("pointer",[])(this.handle,e,this.javaLangObject().toString),n=this.stringFromJni(r);this.deleteLocalRef(r);const o=new Error(n);throw o.$h=e,Script.bindWeak(o,makeErrorHandleDestructor(this.vm,e)),o};function makeErrorHandleDestructor(t,e){return function(){t.perform(r=>{r.deleteGlobalRef(e)})}}Env.prototype.fromReflectedMethod=proxy2(7,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.fromReflectedField=proxy2(8,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.toReflectedMethod=proxy2(9,"pointer",["pointer","pointer","pointer","uint8"],function(t,e,r,n){return t(this.handle,e,r,n)}),Env.prototype.getSuperclass=proxy2(10,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.isAssignableFrom=proxy2(11,"uint8",["pointer","pointer","pointer"],function(t,e,r){return!!t(this.handle,e,r)}),Env.prototype.toReflectedField=proxy2(12,"pointer",["pointer","pointer","pointer","uint8"],function(t,e,r,n){return t(this.handle,e,r,n)}),Env.prototype.throw=proxy2(13,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.exceptionOccurred=proxy2(15,"pointer",["pointer"],function(t){return t(this.handle)}),Env.prototype.exceptionDescribe=proxy2(16,"void",["pointer"],function(t){t(this.handle)}),Env.prototype.exceptionClear=proxy2(17,"void",["pointer"],function(t){t(this.handle)}),Env.prototype.pushLocalFrame=proxy2(19,"int32",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.popLocalFrame=proxy2(20,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.newGlobalRef=proxy2(21,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.deleteGlobalRef=proxy2(22,"void",["pointer","pointer"],function(t,e){t(this.handle,e)}),Env.prototype.deleteLocalRef=proxy2(23,"void",["pointer","pointer"],function(t,e){t(this.handle,e)}),Env.prototype.isSameObject=proxy2(24,"uint8",["pointer","pointer","pointer"],function(t,e,r){return!!t(this.handle,e,r)}),Env.prototype.newLocalRef=proxy2(25,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.allocObject=proxy2(27,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.getObjectClass=proxy2(31,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.isInstanceOf=proxy2(32,"uint8",["pointer","pointer","pointer"],function(t,e,r){return!!t(this.handle,e,r)}),Env.prototype.getMethodId=proxy2(33,"pointer",["pointer","pointer","pointer","pointer"],function(t,e,r,n){return t(this.handle,e,Memory.allocUtf8String(r),Memory.allocUtf8String(n))}),Env.prototype.getFieldId=proxy2(94,"pointer",["pointer","pointer","pointer","pointer"],function(t,e,r,n){return t(this.handle,e,Memory.allocUtf8String(r),Memory.allocUtf8String(n))}),Env.prototype.getIntField=proxy2(100,"int32",["pointer","pointer","pointer"],function(t,e,r){return t(this.handle,e,r)}),Env.prototype.getStaticMethodId=proxy2(113,"pointer",["pointer","pointer","pointer","pointer"],function(t,e,r,n){return t(this.handle,e,Memory.allocUtf8String(r),Memory.allocUtf8String(n))}),Env.prototype.getStaticFieldId=proxy2(144,"pointer",["pointer","pointer","pointer","pointer"],function(t,e,r,n){return t(this.handle,e,Memory.allocUtf8String(r),Memory.allocUtf8String(n))}),Env.prototype.getStaticIntField=proxy2(150,"int32",["pointer","pointer","pointer"],function(t,e,r){return t(this.handle,e,r)}),Env.prototype.getStringLength=proxy2(164,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.getStringChars=proxy2(165,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.releaseStringChars=proxy2(166,"void",["pointer","pointer","pointer"],function(t,e,r){t(this.handle,e,r)}),Env.prototype.newStringUtf=proxy2(167,"pointer",["pointer","pointer"],function(t,e){const r=Memory.allocUtf8String(e);return t(this.handle,r)}),Env.prototype.getStringUtfChars=proxy2(169,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.releaseStringUtfChars=proxy2(170,"void",["pointer","pointer","pointer"],function(t,e,r){t(this.handle,e,r)}),Env.prototype.getArrayLength=proxy2(171,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.newObjectArray=proxy2(172,"pointer",["pointer","int32","pointer","pointer"],function(t,e,r,n){return t(this.handle,e,r,n)}),Env.prototype.getObjectArrayElement=proxy2(173,"pointer",["pointer","pointer","int32"],function(t,e,r){return t(this.handle,e,r)}),Env.prototype.setObjectArrayElement=proxy2(174,"void",["pointer","pointer","int32","pointer"],function(t,e,r,n){t(this.handle,e,r,n)}),Env.prototype.newBooleanArray=proxy2(175,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newByteArray=proxy2(176,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newCharArray=proxy2(177,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newShortArray=proxy2(178,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newIntArray=proxy2(179,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newLongArray=proxy2(180,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newFloatArray=proxy2(181,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.newDoubleArray=proxy2(182,"pointer",["pointer","int32"],function(t,e){return t(this.handle,e)}),Env.prototype.getBooleanArrayElements=proxy2(183,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getByteArrayElements=proxy2(184,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getCharArrayElements=proxy2(185,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getShortArrayElements=proxy2(186,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getIntArrayElements=proxy2(187,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getLongArrayElements=proxy2(188,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getFloatArrayElements=proxy2(189,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.getDoubleArrayElements=proxy2(190,"pointer",["pointer","pointer","pointer"],function(t,e){return t(this.handle,e,NULL)}),Env.prototype.releaseBooleanArrayElements=proxy2(191,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseByteArrayElements=proxy2(192,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseCharArrayElements=proxy2(193,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseShortArrayElements=proxy2(194,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseIntArrayElements=proxy2(195,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseLongArrayElements=proxy2(196,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseFloatArrayElements=proxy2(197,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.releaseDoubleArrayElements=proxy2(198,"pointer",["pointer","pointer","pointer","int32"],function(t,e,r){t(this.handle,e,r,JNI_ABORT)}),Env.prototype.getByteArrayRegion=proxy2(200,"void",["pointer","pointer","int","int","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setBooleanArrayRegion=proxy2(207,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setByteArrayRegion=proxy2(208,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setCharArrayRegion=proxy2(209,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setShortArrayRegion=proxy2(210,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setIntArrayRegion=proxy2(211,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setLongArrayRegion=proxy2(212,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setFloatArrayRegion=proxy2(213,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.setDoubleArrayRegion=proxy2(214,"void",["pointer","pointer","int32","int32","pointer"],function(t,e,r,n,o){t(this.handle,e,r,n,o)}),Env.prototype.registerNatives=proxy2(215,"int32",["pointer","pointer","pointer","int32"],function(t,e,r,n){return t(this.handle,e,r,n)}),Env.prototype.monitorEnter=proxy2(217,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.monitorExit=proxy2(218,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.getDirectBufferAddress=proxy2(230,"pointer",["pointer","pointer"],function(t,e){return t(this.handle,e)}),Env.prototype.getObjectRefType=proxy2(232,"int32",["pointer","pointer"],function(t,e){return t(this.handle,e)});var cachedMethods=new Map;function plainMethod(t,e,r,n){return getOrMakeMethod(this,"p",makePlainMethod,t,e,r,n)}function vaMethod(t,e,r,n){return getOrMakeMethod(this,"v",makeVaMethod,t,e,r,n)}function nonvirtualVaMethod(t,e,r,n){return getOrMakeMethod(this,"n",makeNonvirtualVaMethod,t,e,r,n)}function getOrMakeMethod(t,e,r,n,o,i,s){if(s!==void 0)return r(t,n,o,i,s);const l=[n,e,o].concat(i).join("|");let a=cachedMethods.get(l);return a===void 0&&(a=r(t,n,o,i,nativeFunctionOptions2),cachedMethods.set(l,a)),a}function makePlainMethod(t,e,r,n,o){return new NativeFunction(vtable(t).add(e*pointerSize3).readPointer(),r,["pointer","pointer","pointer"].concat(n),o)}function makeVaMethod(t,e,r,n,o){return new NativeFunction(vtable(t).add(e*pointerSize3).readPointer(),r,["pointer","pointer","pointer","..."].concat(n),o)}function makeNonvirtualVaMethod(t,e,r,n,o){return new NativeFunction(vtable(t).add(e*pointerSize3).readPointer(),r,["pointer","pointer","pointer","pointer","..."].concat(n),o)}Env.prototype.constructor=function(t,e){return vaMethod.call(this,CALL_CONSTRUCTOR_METHOD_OFFSET,"pointer",t,e)},Env.prototype.vaMethod=function(t,e,r){const n=callMethodOffset[t];if(n===void 0)throw new Error("Unsupported type: "+t);return vaMethod.call(this,n,t,e,r)},Env.prototype.nonvirtualVaMethod=function(t,e,r){const n=callNonvirtualMethodOffset[t];if(n===void 0)throw new Error("Unsupported type: "+t);return nonvirtualVaMethod.call(this,n,t,e,r)},Env.prototype.staticVaMethod=function(t,e,r){const n=callStaticMethodOffset[t];if(n===void 0)throw new Error("Unsupported type: "+t);return vaMethod.call(this,n,t,e,r)},Env.prototype.getField=function(t){const e=getFieldOffset[t];if(e===void 0)throw new Error("Unsupported type: "+t);return plainMethod.call(this,e,t,[])},Env.prototype.getStaticField=function(t){const e=getStaticFieldOffset[t];if(e===void 0)throw new Error("Unsupported type: "+t);return plainMethod.call(this,e,t,[])},Env.prototype.setField=function(t){const e=setFieldOffset[t];if(e===void 0)throw new Error("Unsupported type: "+t);return plainMethod.call(this,e,"void",[t])},Env.prototype.setStaticField=function(t){const e=setStaticFieldOffset[t];if(e===void 0)throw new Error("Unsupported type: "+t);return plainMethod.call(this,e,"void",[t])};var javaLangClass=null;Env.prototype.javaLangClass=function(){if(javaLangClass===null){const t=this.findClass("java/lang/Class");try{const e=this.getMethodId.bind(this,t);javaLangClass={handle:register(this.newGlobalRef(t)),getName:e("getName","()Ljava/lang/String;"),getSimpleName:e("getSimpleName","()Ljava/lang/String;"),getGenericSuperclass:e("getGenericSuperclass","()Ljava/lang/reflect/Type;"),getDeclaredConstructors:e("getDeclaredConstructors","()[Ljava/lang/reflect/Constructor;"),getDeclaredMethods:e("getDeclaredMethods","()[Ljava/lang/reflect/Method;"),getDeclaredFields:e("getDeclaredFields","()[Ljava/lang/reflect/Field;"),isArray:e("isArray","()Z"),isPrimitive:e("isPrimitive","()Z"),isInterface:e("isInterface","()Z"),getComponentType:e("getComponentType","()Ljava/lang/Class;")}}finally{this.deleteLocalRef(t)}}return javaLangClass};var javaLangObject=null;Env.prototype.javaLangObject=function(){if(javaLangObject===null){const t=this.findClass("java/lang/Object");try{const e=this.getMethodId.bind(this,t);javaLangObject={handle:register(this.newGlobalRef(t)),toString:e("toString","()Ljava/lang/String;"),getClass:e("getClass","()Ljava/lang/Class;")}}finally{this.deleteLocalRef(t)}}return javaLangObject};var javaLangReflectConstructor=null;Env.prototype.javaLangReflectConstructor=function(){if(javaLangReflectConstructor===null){const t=this.findClass("java/lang/reflect/Constructor");try{javaLangReflectConstructor={getGenericParameterTypes:this.getMethodId(t,"getGenericParameterTypes","()[Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(t)}}return javaLangReflectConstructor};var javaLangReflectMethod=null;Env.prototype.javaLangReflectMethod=function(){if(javaLangReflectMethod===null){const t=this.findClass("java/lang/reflect/Method");try{const e=this.getMethodId.bind(this,t);javaLangReflectMethod={getName:e("getName","()Ljava/lang/String;"),getGenericParameterTypes:e("getGenericParameterTypes","()[Ljava/lang/reflect/Type;"),getParameterTypes:e("getParameterTypes","()[Ljava/lang/Class;"),getGenericReturnType:e("getGenericReturnType","()Ljava/lang/reflect/Type;"),getGenericExceptionTypes:e("getGenericExceptionTypes","()[Ljava/lang/reflect/Type;"),getModifiers:e("getModifiers","()I"),isVarArgs:e("isVarArgs","()Z")}}finally{this.deleteLocalRef(t)}}return javaLangReflectMethod};var javaLangReflectField=null;Env.prototype.javaLangReflectField=function(){if(javaLangReflectField===null){const t=this.findClass("java/lang/reflect/Field");try{const e=this.getMethodId.bind(this,t);javaLangReflectField={getName:e("getName","()Ljava/lang/String;"),getType:e("getType","()Ljava/lang/Class;"),getGenericType:e("getGenericType","()Ljava/lang/reflect/Type;"),getModifiers:e("getModifiers","()I"),toString:e("toString","()Ljava/lang/String;")}}finally{this.deleteLocalRef(t)}}return javaLangReflectField};var javaLangReflectTypeVariable=null;Env.prototype.javaLangReflectTypeVariable=function(){if(javaLangReflectTypeVariable===null){const t=this.findClass("java/lang/reflect/TypeVariable");try{const e=this.getMethodId.bind(this,t);javaLangReflectTypeVariable={handle:register(this.newGlobalRef(t)),getName:e("getName","()Ljava/lang/String;"),getBounds:e("getBounds","()[Ljava/lang/reflect/Type;"),getGenericDeclaration:e("getGenericDeclaration","()Ljava/lang/reflect/GenericDeclaration;")}}finally{this.deleteLocalRef(t)}}return javaLangReflectTypeVariable};var javaLangReflectWildcardType=null;Env.prototype.javaLangReflectWildcardType=function(){if(javaLangReflectWildcardType===null){const t=this.findClass("java/lang/reflect/WildcardType");try{const e=this.getMethodId.bind(this,t);javaLangReflectWildcardType={handle:register(this.newGlobalRef(t)),getLowerBounds:e("getLowerBounds","()[Ljava/lang/reflect/Type;"),getUpperBounds:e("getUpperBounds","()[Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(t)}}return javaLangReflectWildcardType};var javaLangReflectGenericArrayType=null;Env.prototype.javaLangReflectGenericArrayType=function(){if(javaLangReflectGenericArrayType===null){const t=this.findClass("java/lang/reflect/GenericArrayType");try{javaLangReflectGenericArrayType={handle:register(this.newGlobalRef(t)),getGenericComponentType:this.getMethodId(t,"getGenericComponentType","()Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(t)}}return javaLangReflectGenericArrayType};var javaLangReflectParameterizedType=null;Env.prototype.javaLangReflectParameterizedType=function(){if(javaLangReflectParameterizedType===null){const t=this.findClass("java/lang/reflect/ParameterizedType");try{const e=this.getMethodId.bind(this,t);javaLangReflectParameterizedType={handle:register(this.newGlobalRef(t)),getActualTypeArguments:e("getActualTypeArguments","()[Ljava/lang/reflect/Type;"),getRawType:e("getRawType","()Ljava/lang/reflect/Type;"),getOwnerType:e("getOwnerType","()Ljava/lang/reflect/Type;")}}finally{this.deleteLocalRef(t)}}return javaLangReflectParameterizedType};var javaLangString=null;Env.prototype.javaLangString=function(){if(javaLangString===null){const t=this.findClass("java/lang/String");try{javaLangString={handle:register(this.newGlobalRef(t))}}finally{this.deleteLocalRef(t)}}return javaLangString},Env.prototype.getClassName=function(t){const e=this.vaMethod("pointer",[])(this.handle,t,this.javaLangClass().getName);try{return this.stringFromJni(e)}finally{this.deleteLocalRef(e)}},Env.prototype.getObjectClassName=function(t){const e=this.getObjectClass(t);try{return this.getClassName(e)}finally{this.deleteLocalRef(e)}},Env.prototype.getActualTypeArgument=function(t){const e=this.vaMethod("pointer",[])(this.handle,t,this.javaLangReflectParameterizedType().getActualTypeArguments);if(this.throwIfExceptionPending(),!e.isNull())try{return this.getTypeNameFromFirstTypeElement(e)}finally{this.deleteLocalRef(e)}},Env.prototype.getTypeNameFromFirstTypeElement=function(t){if(this.getArrayLength(t)>0){const r=this.getObjectArrayElement(t,0);try{return this.getTypeName(r)}finally{this.deleteLocalRef(r)}}else return"java.lang.Object"},Env.prototype.getTypeName=function(t,e){const r=this.vaMethod("pointer",[]);if(this.isInstanceOf(t,this.javaLangClass().handle))return this.getClassName(t);if(this.isInstanceOf(t,this.javaLangReflectGenericArrayType().handle))return this.getArrayTypeName(t);if(this.isInstanceOf(t,this.javaLangReflectParameterizedType().handle)){const n=r(this.handle,t,this.javaLangReflectParameterizedType().getRawType);this.throwIfExceptionPending();let o;try{o=this.getTypeName(n)}finally{this.deleteLocalRef(n)}return e&&(o+="<"+this.getActualTypeArgument(t)+">"),o}else return this.isInstanceOf(t,this.javaLangReflectTypeVariable().handle)||this.isInstanceOf(t,this.javaLangReflectWildcardType().handle),"java.lang.Object"},Env.prototype.getArrayTypeName=function(t){const e=this.vaMethod("pointer",[]);if(this.isInstanceOf(t,this.javaLangClass().handle))return this.getClassName(t);if(this.isInstanceOf(t,this.javaLangReflectGenericArrayType().handle)){const r=e(this.handle,t,this.javaLangReflectGenericArrayType().getGenericComponentType);this.throwIfExceptionPending();try{return"[L"+this.getTypeName(r)+";"}finally{this.deleteLocalRef(r)}}else return"[Ljava.lang.Object;"},Env.prototype.stringFromJni=function(t){const e=this.getStringChars(t);if(e.isNull())throw new Error("Unable to access string");try{const r=this.getStringLength(t);return e.readUtf16String(r)}finally{this.releaseStringChars(t,e)}};var JNI_VERSION_1_6=65542,pointerSize4=Process.pointerSize,jsThreadID=Process.getCurrentThreadId(),attachedThreads=new Map,activeEnvs=new Map;function VM(t){const e=t.vm;let r=null,n=null,o=null;function i(){const l=e.readPointer(),a={exceptions:"propagate"};r=new NativeFunction(l.add(4*pointerSize4).readPointer(),"int32",["pointer","pointer","pointer"],a),n=new NativeFunction(l.add(5*pointerSize4).readPointer(),"int32",["pointer"],a),o=new NativeFunction(l.add(6*pointerSize4).readPointer(),"int32",["pointer","pointer","int32"],a)}this.handle=e,this.perform=function(l){const a=Process.getCurrentThreadId(),c=s(a);if(c!==null)return l(c);let d=this._tryGetEnv();const p=d!==null;p||(d=this.attachCurrentThread(),attachedThreads.set(a,!0)),this.link(a,d);try{return l(d)}finally{const u=a===jsThreadID;if(u||this.unlink(a),!p&&!u){const h=attachedThreads.get(a);attachedThreads.delete(a),h&&this.detachCurrentThread()}}},this.attachCurrentThread=function(){const l=Memory.alloc(pointerSize4);return checkJniResult("VM::AttachCurrentThread",r(e,l,NULL)),new Env(l.readPointer(),this)},this.detachCurrentThread=function(){checkJniResult("VM::DetachCurrentThread",n(e))},this.preventDetachDueToClassLoader=function(){const l=Process.getCurrentThreadId();attachedThreads.has(l)&&attachedThreads.set(l,!1)},this.getEnv=function(){const l=s(Process.getCurrentThreadId());if(l!==null)return l;const a=Memory.alloc(pointerSize4),c=o(e,a,JNI_VERSION_1_6);if(c===-2)throw new Error("Current thread is not attached to the Java VM; please move this code inside a Java.perform() callback");return checkJniResult("VM::GetEnv",c),new Env(a.readPointer(),this)},this.tryGetEnv=function(){const l=s(Process.getCurrentThreadId());return l!==null?l:this._tryGetEnv()},this._tryGetEnv=function(){const l=this.tryGetEnvHandle(JNI_VERSION_1_6);return l===null?null:new Env(l,this)},this.tryGetEnvHandle=function(l){const a=Memory.alloc(pointerSize4);return o(e,a,l)!==JNI_OK?null:a.readPointer()},this.makeHandleDestructor=function(l){return()=>{this.perform(a=>{a.deleteGlobalRef(l)})}},this.link=function(l,a){const c=activeEnvs.get(l);c===void 0?activeEnvs.set(l,[a,1]):c[1]++},this.unlink=function(l){const a=activeEnvs.get(l);a[1]===1?activeEnvs.delete(l):a[1]--};function s(l){const a=activeEnvs.get(l);return a===void 0?null:a[0]}i.call(this)}VM.dispose=function(t){attachedThreads.get(jsThreadID)===!0&&(attachedThreads.delete(jsThreadID),t.detachCurrentThread())};var jsizeSize=4,pointerSize5=Process.pointerSize,{readU32,readPointer,writeU32,writePointer}=NativePointer.prototype,kAccPublic=1,kAccStatic=8,kAccFinal=16,kAccNative=256,kAccFastNative=524288,kAccCriticalNative=2097152,kAccFastInterpreterToInterpreterInvoke=1073741824,kAccSkipAccessChecks=524288,kAccSingleImplementation=134217728,kAccNterpEntryPointFastPathFlag=1048576,kAccNterpInvokeFastPathFlag=2097152,kAccPublicApi=268435456,kAccXposedHookedMethod=268435456,kPointer=0,kFullDeoptimization=3,kSelectiveDeoptimization=5,THUMB_BIT_REMOVAL_MASK=ptr(1).not(),X86_JMP_MAX_DISTANCE=2147467263,ARM64_ADRP_MAX_DISTANCE=4294963200,ENV_VTABLE_OFFSET_EXCEPTION_CLEAR=17*pointerSize5,ENV_VTABLE_OFFSET_FATAL_ERROR=18*pointerSize5,DVM_JNI_ENV_OFFSET_SELF=12,DVM_CLASS_OBJECT_OFFSET_VTABLE_COUNT=112,DVM_CLASS_OBJECT_OFFSET_VTABLE=116,DVM_OBJECT_OFFSET_CLAZZ=0,DVM_METHOD_SIZE=56,DVM_METHOD_OFFSET_ACCESS_FLAGS=4,DVM_METHOD_OFFSET_METHOD_INDEX=8,DVM_METHOD_OFFSET_REGISTERS_SIZE=10,DVM_METHOD_OFFSET_OUTS_SIZE=12,DVM_METHOD_OFFSET_INS_SIZE=14,DVM_METHOD_OFFSET_SHORTY=28,DVM_METHOD_OFFSET_JNI_ARG_INFO=36,DALVIK_JNI_RETURN_VOID=0,DALVIK_JNI_RETURN_FLOAT=1,DALVIK_JNI_RETURN_DOUBLE=2,DALVIK_JNI_RETURN_S8=3,DALVIK_JNI_RETURN_S4=4,DALVIK_JNI_RETURN_S2=5,DALVIK_JNI_RETURN_U2=6,DALVIK_JNI_RETURN_S1=7,DALVIK_JNI_NO_ARG_INFO=2147483648,DALVIK_JNI_RETURN_SHIFT=28,STD_STRING_SIZE=3*pointerSize5,STD_VECTOR_SIZE=3*pointerSize5,AF_UNIX=1,SOCK_STREAM=1,getArtRuntimeSpec=memoize(_getArtRuntimeSpec),getArtInstrumentationSpec=memoize(_getArtInstrumentationSpec),getArtMethodSpec=memoize(_getArtMethodSpec),getArtThreadSpec=memoize(_getArtThreadSpec),getArtManagedStackSpec=memoize(_getArtManagedStackSpec),getArtThreadStateTransitionImpl=memoize(_getArtThreadStateTransitionImpl),getAndroidVersion=memoize(_getAndroidVersion),getAndroidCodename=memoize(_getAndroidCodename),getAndroidApiLevel=memoize(_getAndroidApiLevel),getArtApexVersion=memoize(_getArtApexVersion),getArtQuickFrameInfoGetterThunk=memoize(_getArtQuickFrameInfoGetterThunk),makeCxxMethodWrapperReturningPointerByValue=Process.arch==="ia32"?makeCxxMethodWrapperReturningPointerByValueInFirstArg:makeCxxMethodWrapperReturningPointerByValueGeneric,nativeFunctionOptions3={exceptions:"propagate"},artThreadStateTransitions={},cachedApi=null,cachedArtClassLinkerSpec=null,MethodMangler=null,artController=null,inlineHooks=[],patchedClasses=new Map,artQuickInterceptors=[],thunkPage=null,thunkOffset=0,taughtArtAboutReplacementMethods=!1,taughtArtAboutMethodInstrumentation=!1,backtraceModule=null,jdwpSessions=[],socketpair=null,trampolineAllocator=null;function getApi(){return cachedApi===null&&(cachedApi=_getApi()),cachedApi}function _getApi(){const t=Process.enumerateModules().filter(h=>/^lib(art|dvm).so$/.test(h.name)).filter(h=>!/\/system\/fake-libs/.test(h.path));if(t.length===0)return null;const e=t[0],r=e.name.indexOf("art")!==-1?"art":"dalvik",n=r==="art",o={module:e,find(h){const{module:_}=this;let f=_.findExportByName(h);return f===null&&(f=_.findSymbolByName(h)),f},flavor:r,addLocalReference:null};o.isApiLevel34OrApexEquivalent=n&&(o.find("_ZN3art7AppInfo29GetPrimaryApkReferenceProfileEv")!==null||o.find("_ZN3art6Thread15RunFlipFunctionEPS0_")!==null);const i=n?{functions:{JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]],artInterpreterToCompiledCodeBridge:function(h){this.artInterpreterToCompiledCodeBridge=h},_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE:["art::JavaVMExt::AddGlobalRef","pointer",["pointer","pointer","pointer"]],_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE:["art::JavaVMExt::AddGlobalRef","pointer",["pointer","pointer","pointer"]],_ZN3art17ReaderWriterMutex13ExclusiveLockEPNS_6ThreadE:["art::ReaderWriterMutex::ExclusiveLock","void",["pointer","pointer"]],_ZN3art17ReaderWriterMutex15ExclusiveUnlockEPNS_6ThreadE:["art::ReaderWriterMutex::ExclusiveUnlock","void",["pointer","pointer"]],_ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE:function(h){this["art::IndirectReferenceTable::Add"]=new NativeFunction(h,"pointer",["pointer","uint","pointer"],nativeFunctionOptions3)},_ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE:function(h){this["art::IndirectReferenceTable::Add"]=new NativeFunction(h,"pointer",["pointer","uint","pointer"],nativeFunctionOptions3)},_ZN3art9JavaVMExt12DecodeGlobalEPv:function(h){let _;getAndroidApiLevel()>=26?_=makeCxxMethodWrapperReturningPointerByValue(h,["pointer","pointer"]):_=new NativeFunction(h,"pointer",["pointer","pointer"],nativeFunctionOptions3),this["art::JavaVMExt::DecodeGlobal"]=function(f,m,g){return _(f,g)}},_ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv:["art::JavaVMExt::DecodeGlobal","pointer",["pointer","pointer","pointer"]],_ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject:["art::Thread::DecodeJObject","pointer",["pointer","pointer"]],_ZNK3art6Thread13DecodeJObjectEP8_jobject:["art::Thread::DecodeJObject","pointer",["pointer","pointer"]],_ZN3art10ThreadList10SuspendAllEPKcb:["art::ThreadList::SuspendAll","void",["pointer","pointer","bool"]],_ZN3art10ThreadList10SuspendAllEv:function(h){const _=new NativeFunction(h,"void",["pointer"],nativeFunctionOptions3);this["art::ThreadList::SuspendAll"]=function(f,m,g){return _(f)}},_ZN3art10ThreadList9ResumeAllEv:["art::ThreadList::ResumeAll","void",["pointer"]],_ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE:["art::ClassLinker::VisitClasses","void",["pointer","pointer"]],_ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_:function(h){const _=new NativeFunction(h,"void",["pointer","pointer","pointer"],nativeFunctionOptions3);this["art::ClassLinker::VisitClasses"]=function(f,m){_(f,m,NULL)}},_ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE:["art::ClassLinker::VisitClassLoaders","void",["pointer","pointer"]],_ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_:["art::gc::Heap::VisitObjects","void",["pointer","pointer","pointer"]],_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE:["art::gc::Heap::GetInstances","void",["pointer","pointer","pointer","int","pointer"]],_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE:function(h){const _=new NativeFunction(h,"void",["pointer","pointer","pointer","bool","int","pointer"],nativeFunctionOptions3);this["art::gc::Heap::GetInstances"]=function(f,m,g,v,A){_(f,m,g,0,v,A)}},_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb:["art::StackVisitor::StackVisitor","void",["pointer","pointer","pointer","uint","uint","bool"]],_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb:["art::StackVisitor::StackVisitor","void",["pointer","pointer","pointer","uint","size_t","bool"]],_ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb:["art::StackVisitor::WalkStack","void",["pointer","bool"]],_ZNK3art12StackVisitor9GetMethodEv:["art::StackVisitor::GetMethod","pointer",["pointer"]],_ZNK3art12StackVisitor16DescribeLocationEv:function(h){this["art::StackVisitor::DescribeLocation"]=makeCxxMethodWrapperReturningStdStringByValue(h,["pointer"])},_ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv:function(h){this["art::StackVisitor::GetCurrentQuickFrameInfo"]=makeArtQuickFrameInfoGetter(h)},_ZN3art7Context6CreateEv:["art::Context::Create","pointer",[]],_ZN3art6Thread18GetLongJumpContextEv:["art::Thread::GetLongJumpContext","pointer",["pointer"]],_ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE:function(h){this["art::mirror::Class::GetDescriptor"]=h},_ZN3art6mirror5Class11GetLocationEv:function(h){this["art::mirror::Class::GetLocation"]=makeCxxMethodWrapperReturningStdStringByValue(h,["pointer"])},_ZN3art9ArtMethod12PrettyMethodEb:function(h){this["art::ArtMethod::PrettyMethod"]=makeCxxMethodWrapperReturningStdStringByValue(h,["pointer","bool"])},_ZN3art12PrettyMethodEPNS_9ArtMethodEb:function(h){this["art::ArtMethod::PrettyMethodNullSafe"]=makeCxxMethodWrapperReturningStdStringByValue(h,["pointer","bool"])},_ZN3art6Thread14CurrentFromGdbEv:["art::Thread::CurrentFromGdb","pointer",[]],_ZN3art6mirror6Object5CloneEPNS_6ThreadE:function(h){this["art::mirror::Object::Clone"]=new NativeFunction(h,"pointer",["pointer","pointer"],nativeFunctionOptions3)},_ZN3art6mirror6Object5CloneEPNS_6ThreadEm:function(h){const _=new NativeFunction(h,"pointer",["pointer","pointer","pointer"],nativeFunctionOptions3);this["art::mirror::Object::Clone"]=function(f,m){const g=NULL;return _(f,m,g)}},_ZN3art6mirror6Object5CloneEPNS_6ThreadEj:function(h){const _=new NativeFunction(h,"pointer",["pointer","pointer","uint"],nativeFunctionOptions3);this["art::mirror::Object::Clone"]=function(f,m){return _(f,m,0)}},_ZN3art3Dbg14SetJdwpAllowedEb:["art::Dbg::SetJdwpAllowed","void",["bool"]],_ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE:["art::Dbg::ConfigureJdwp","void",["pointer"]],_ZN3art31InternalDebuggerControlCallback13StartDebuggerEv:["art::InternalDebuggerControlCallback::StartDebugger","void",["pointer"]],_ZN3art3Dbg9StartJdwpEv:["art::Dbg::StartJdwp","void",[]],_ZN3art3Dbg8GoActiveEv:["art::Dbg::GoActive","void",[]],_ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE:["art::Dbg::RequestDeoptimization","void",["pointer"]],_ZN3art3Dbg20ManageDeoptimizationEv:["art::Dbg::ManageDeoptimization","void",[]],_ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv:["art::Instrumentation::EnableDeoptimization","void",["pointer"]],_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc:["art::Instrumentation::DeoptimizeEverything","void",["pointer","pointer"]],_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv:function(h){const _=new NativeFunction(h,"void",["pointer"],nativeFunctionOptions3);this["art::Instrumentation::DeoptimizeEverything"]=function(f,m){_(f)}},_ZN3art7Runtime19DeoptimizeBootImageEv:["art::Runtime::DeoptimizeBootImage","void",["pointer"]],_ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE:["art::Instrumentation::Deoptimize","void",["pointer","pointer"]],_ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID:["art::jni::JniIdManager::DecodeMethodId","pointer",["pointer","pointer"]],_ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID:["art::jni::JniIdManager::DecodeFieldId","pointer",["pointer","pointer"]],_ZN3art11interpreter18GetNterpEntryPointEv:["art::interpreter::GetNterpEntryPoint","pointer",[]],_ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi:["art::Monitor::TranslateLocation","void",["pointer","uint32","pointer","pointer"]]},variables:{_ZN3art3Dbg9gRegistryE:function(h){this.isJdwpStarted=()=>!h.readPointer().isNull()},_ZN3art3Dbg15gDebuggerActiveE:function(h){this.isDebuggerActive=()=>!!h.readU8()}},optionals:new Set(["artInterpreterToCompiledCodeBridge","_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadENS_6ObjPtrINS_6mirror6ObjectEEE","_ZN3art9JavaVMExt12AddGlobalRefEPNS_6ThreadEPNS_6mirror6ObjectE","_ZN3art9JavaVMExt12DecodeGlobalEPv","_ZN3art9JavaVMExt12DecodeGlobalEPNS_6ThreadEPv","_ZNK3art6Thread19DecodeGlobalJObjectEP8_jobject","_ZNK3art6Thread13DecodeJObjectEP8_jobject","_ZN3art10ThreadList10SuspendAllEPKcb","_ZN3art10ThreadList10SuspendAllEv","_ZN3art11ClassLinker12VisitClassesEPNS_12ClassVisitorE","_ZN3art11ClassLinker12VisitClassesEPFbPNS_6mirror5ClassEPvES4_","_ZNK3art11ClassLinker17VisitClassLoadersEPNS_18ClassLoaderVisitorE","_ZN3art6mirror6Object5CloneEPNS_6ThreadE","_ZN3art6mirror6Object5CloneEPNS_6ThreadEm","_ZN3art6mirror6Object5CloneEPNS_6ThreadEj","_ZN3art22IndirectReferenceTable3AddEjPNS_6mirror6ObjectE","_ZN3art22IndirectReferenceTable3AddENS_15IRTSegmentStateENS_6ObjPtrINS_6mirror6ObjectEEE","_ZN3art2gc4Heap12VisitObjectsEPFvPNS_6mirror6ObjectEPvES5_","_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE","_ZN3art2gc4Heap12GetInstancesERNS_24VariableSizedHandleScopeENS_6HandleINS_6mirror5ClassEEEbiRNSt3__16vectorINS4_INS5_6ObjectEEENS8_9allocatorISB_EEEE","_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEjb","_ZN3art12StackVisitorC2EPNS_6ThreadEPNS_7ContextENS0_13StackWalkKindEmb","_ZN3art12StackVisitor9WalkStackILNS0_16CountTransitionsE0EEEvb","_ZNK3art12StackVisitor9GetMethodEv","_ZNK3art12StackVisitor16DescribeLocationEv","_ZNK3art12StackVisitor24GetCurrentQuickFrameInfoEv","_ZN3art7Context6CreateEv","_ZN3art6Thread18GetLongJumpContextEv","_ZN3art6mirror5Class13GetDescriptorEPNSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEE","_ZN3art6mirror5Class11GetLocationEv","_ZN3art9ArtMethod12PrettyMethodEb","_ZN3art12PrettyMethodEPNS_9ArtMethodEb","_ZN3art3Dbg13ConfigureJdwpERKNS_4JDWP11JdwpOptionsE","_ZN3art31InternalDebuggerControlCallback13StartDebuggerEv","_ZN3art3Dbg15gDebuggerActiveE","_ZN3art15instrumentation15Instrumentation20EnableDeoptimizationEv","_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEPKc","_ZN3art15instrumentation15Instrumentation20DeoptimizeEverythingEv","_ZN3art7Runtime19DeoptimizeBootImageEv","_ZN3art15instrumentation15Instrumentation10DeoptimizeEPNS_9ArtMethodE","_ZN3art3Dbg9StartJdwpEv","_ZN3art3Dbg8GoActiveEv","_ZN3art3Dbg21RequestDeoptimizationERKNS_21DeoptimizationRequestE","_ZN3art3Dbg20ManageDeoptimizationEv","_ZN3art3Dbg9gRegistryE","_ZN3art3jni12JniIdManager14DecodeMethodIdEP10_jmethodID","_ZN3art3jni12JniIdManager13DecodeFieldIdEP9_jfieldID","_ZN3art11interpreter18GetNterpEntryPointEv","_ZN3art7Monitor17TranslateLocationEPNS_9ArtMethodEjPPKcPi"])}:{functions:{_Z20dvmDecodeIndirectRefP6ThreadP8_jobject:["dvmDecodeIndirectRef","pointer",["pointer","pointer"]],_Z15dvmUseJNIBridgeP6MethodPv:["dvmUseJNIBridge","void",["pointer","pointer"]],_Z20dvmHeapSourceGetBasev:["dvmHeapSourceGetBase","pointer",[]],_Z21dvmHeapSourceGetLimitv:["dvmHeapSourceGetLimit","pointer",[]],_Z16dvmIsValidObjectPK6Object:["dvmIsValidObject","uint8",["pointer"]],JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]]},variables:{gDvmJni:function(h){this.gDvmJni=h},gDvm:function(h){this.gDvm=h}}},{functions:s={},variables:l={},optionals:a=new Set}=i,c=[];for(const[h,_]of Object.entries(s)){const f=o.find(h);f!==null?typeof _=="function"?_.call(o,f):o[_[0]]=new NativeFunction(f,_[1],_[2],nativeFunctionOptions3):a.has(h)||c.push(h)}for(const[h,_]of Object.entries(l)){const f=o.find(h);f!==null?_.call(o,f):a.has(h)||c.push(h)}if(c.length>0)throw new Error("Java API only partially available; please file a bug. Missing: "+c.join(", "));const d=Memory.alloc(pointerSize5),p=Memory.alloc(jsizeSize);if(checkJniResult("JNI_GetCreatedJavaVMs",o.JNI_GetCreatedJavaVMs(d,1,p)),p.readInt()===0)return null;if(o.vm=d.readPointer(),n){const h=getAndroidApiLevel();let _;h>=27?_=33554432:h>=24?_=16777216:_=0,o.kAccCompileDontBother=_;const f=o.vm.add(pointerSize5).readPointer();o.artRuntime=f;const m=getArtRuntimeSpec(o),g=m.offset,v=g.instrumentation;o.artInstrumentation=v!==null?f.add(v):null,getArtApexVersion()>=36e7&&o.artInstrumentation!=null&&(o.artInstrumentation=o.artInstrumentation.readPointer()),o.artHeap=f.add(g.heap).readPointer(),o.artThreadList=f.add(g.threadList).readPointer();const w=f.add(g.classLinker).readPointer(),N=getArtClassLinkerSpec(f,m).offset,M=w.add(N.quickResolutionTrampoline).readPointer(),L=w.add(N.quickImtConflictTrampoline).readPointer(),T=w.add(N.quickGenericJniTrampoline).readPointer(),b=w.add(N.quickToInterpreterBridgeTrampoline).readPointer();o.artClassLinker={address:w,quickResolutionTrampoline:M,quickImtConflictTrampoline:L,quickGenericJniTrampoline:T,quickToInterpreterBridgeTrampoline:b};const I=new VM(o);o.artQuickGenericJniTrampoline=getArtQuickEntrypointFromTrampoline(T,I),o.artQuickToInterpreterBridge=getArtQuickEntrypointFromTrampoline(b,I),o.artQuickResolutionTrampoline=getArtQuickEntrypointFromTrampoline(M,I),o["art::JavaVMExt::AddGlobalRef"]===void 0&&(o["art::JavaVMExt::AddGlobalRef"]=makeAddGlobalRefFallbackForAndroid5(o)),o["art::JavaVMExt::DecodeGlobal"]===void 0&&(o["art::JavaVMExt::DecodeGlobal"]=makeDecodeGlobalFallback(o)),o["art::ArtMethod::PrettyMethod"]===void 0&&(o["art::ArtMethod::PrettyMethod"]=o["art::ArtMethod::PrettyMethodNullSafe"]),o["art::interpreter::GetNterpEntryPoint"]!==void 0?o.artNterpEntryPoint=o["art::interpreter::GetNterpEntryPoint"]():o.artNterpEntryPoint=o.find("ExecuteNterpImpl"),artController=makeArtController(o,I),fixupArtQuickDeliverExceptionBug(o);let k=null;Object.defineProperty(o,"jvmti",{get(){return k===null&&(k=[tryGetEnvJvmti(I,this.artRuntime)]),k[0]}})}const u=e.enumerateImports().filter(h=>h.name.indexOf("_Z")===0).reduce((h,_)=>(h[_.name]=_.address,h),{});return o.$new=new NativeFunction(u._Znwm||u._Znwj,"pointer",["ulong"],nativeFunctionOptions3),o.$delete=new NativeFunction(u._ZdlPv,"void",["pointer"],nativeFunctionOptions3),MethodMangler=n?ArtMethodMangler:DalvikMethodMangler,o}function tryGetEnvJvmti(t,e){let r=null;return t.perform(()=>{const n=getApi().find("_ZN3art7Runtime18EnsurePluginLoadedEPKcPNSt3__112basic_stringIcNS3_11char_traitsIcEENS3_9allocatorIcEEEE");if(n===null)return;const o=new NativeFunction(n,"bool",["pointer","pointer","pointer"]),i=Memory.alloc(pointerSize5);if(!o(e,Memory.allocUtf8String("libopenjdkjvmti.so"),i))return;const l=jvmtiVersion.v1_2|1073741824,a=t.tryGetEnvHandle(l);if(a===null)return;r=new EnvJvmti(a,t);const c=Memory.alloc(8);c.writeU64(jvmtiCapabilities.canTagObjects),r.addCapabilities(c)!==JNI_OK&&(r=null)}),r}function ensureClassInitialized(t,e){getApi().flavor==="art"&&t.getClassName(e)}function getArtVMSpec(t){return{offset:pointerSize5===4?{globalsLock:32,globals:72}:{globalsLock:64,globals:112}}}function _getArtRuntimeSpec(t){const e=t.vm,r=t.artRuntime,n=pointerSize5===4?200:384,o=n+100*pointerSize5,i=getAndroidApiLevel(),s=getAndroidCodename(),{isApiLevel34OrApexEquivalent:l}=t;let a=null;for(let d=n;d!==o;d+=pointerSize5)if(r.add(d).readPointer().equals(e)){let u,h=null;i>=33||s==="Tiramisu"||l?(u=[d-4*pointerSize5],h=d-pointerSize5):i>=30||s==="R"?(u=[d-3*pointerSize5,d-4*pointerSize5],h=d-pointerSize5):i>=29?u=[d-2*pointerSize5]:i>=27?u=[d-STD_STRING_SIZE-3*pointerSize5]:u=[d-STD_STRING_SIZE-2*pointerSize5];for(const _ of u){const f=_-pointerSize5,m=f-pointerSize5;let g;l?g=m-9*pointerSize5:i>=24?g=m-8*pointerSize5:i>=23?g=m-7*pointerSize5:g=m-4*pointerSize5;const v={offset:{heap:g,threadList:m,internTable:f,classLinker:_,jniIdManager:h}};if(tryGetArtClassLinkerSpec(r,v)!==null){a=v;break}}break}if(a===null)throw new Error("Unable to determine Runtime field offsets");const c=getArtApexVersion()>=36e7;return a.offset.instrumentation=c?tryDetectInstrumentationPointer(t):tryDetectInstrumentationOffset(t),a.offset.jniIdsIndirection=tryDetectJniIdsIndirectionOffset(t),a}var instrumentationOffsetParsers={ia32:parsex86InstrumentationOffset,x64:parsex86InstrumentationOffset,arm:parseArmInstrumentationOffset,arm64:parseArm64InstrumentationOffset};function tryDetectInstrumentationOffset(t){const e=t["art::Runtime::DeoptimizeBootImage"];return e===void 0?null:parseInstructionsAt(e,instrumentationOffsetParsers[Process.arch],{limit:30})}function parsex86InstrumentationOffset(t){if(t.mnemonic!=="lea")return null;const e=t.operands[1].value.disp;return e<256||e>1024?null:e}function parseArmInstrumentationOffset(t){if(t.mnemonic!=="add.w")return null;const e=t.operands;if(e.length!==3)return null;const r=e[2];return r.type!=="imm"?null:r.value}function parseArm64InstrumentationOffset(t){if(t.mnemonic!=="add")return null;const e=t.operands;if(e.length!==3||e[0].value==="sp"||e[1].value==="sp")return null;const r=e[2];if(r.type!=="imm")return null;const n=r.value.valueOf();return n<256||n>1024?null:n}var instrumentationPointerParser={ia32:parsex86InstrumentationPointer,x64:parsex86InstrumentationPointer,arm:parseArmInstrumentationPointer,arm64:parseArm64InstrumentationPointer};function tryDetectInstrumentationPointer(t){const e=t["art::Runtime::DeoptimizeBootImage"];return e===void 0?null:parseInstructionsAt(e,instrumentationPointerParser[Process.arch],{limit:30})}function parsex86InstrumentationPointer(t){if(t.mnemonic!=="mov")return null;const e=t.operands;if(e[0].value!=="rax")return null;const n=e[1];if(n.type!=="mem")return null;const o=n.value;if(o.base!=="rdi")return null;const i=o.disp;return i<256||i>1024?null:i}function parseArmInstrumentationPointer(t){return null}function parseArm64InstrumentationPointer(t){if(t.mnemonic!=="ldr")return null;const e=t.operands;if(e[0].value==="x0")return null;const r=e[1].value;if(r.base!=="x0")return null;const n=r.disp;return n<256||n>1024?null:n}var jniIdsIndirectionOffsetParsers={ia32:parsex86JniIdsIndirectionOffset,x64:parsex86JniIdsIndirectionOffset,arm:parseArmJniIdsIndirectionOffset,arm64:parseArm64JniIdsIndirectionOffset};function tryDetectJniIdsIndirectionOffset(t){const e=t.find("_ZN3art7Runtime12SetJniIdTypeENS_9JniIdTypeE");if(e===null)return null;const r=parseInstructionsAt(e,jniIdsIndirectionOffsetParsers[Process.arch],{limit:20});if(r===null)throw new Error("Unable to determine Runtime.jni_ids_indirection_ offset");return r}function parsex86JniIdsIndirectionOffset(t){return t.mnemonic==="cmp"?t.operands[0].value.disp:null}function parseArmJniIdsIndirectionOffset(t){return t.mnemonic==="ldr.w"?t.operands[1].value.disp:null}function parseArm64JniIdsIndirectionOffset(t,e){if(e===null)return null;const{mnemonic:r}=t,{mnemonic:n}=e;return r==="cmp"&&n==="ldr"||r==="bl"&&n==="str"?e.operands[1].value.disp:null}function _getArtInstrumentationSpec(){const e={"4-21":136,"4-22":136,"4-23":172,"4-24":196,"4-25":196,"4-26":196,"4-27":196,"4-28":212,"4-29":172,"4-30":180,"4-31":180,"8-21":224,"8-22":224,"8-23":296,"8-24":344,"8-25":344,"8-26":352,"8-27":352,"8-28":392,"8-29":328,"8-30":336,"8-31":336}[`${pointerSize5}-${getAndroidApiLevel()}`];if(e===void 0)throw new Error("Unable to determine Instrumentation field offsets");return{offset:{forcedInterpretOnly:4,deoptimizationEnabled:e}}}function getArtClassLinkerSpec(t,e){const r=tryGetArtClassLinkerSpec(t,e);if(r===null)throw new Error("Unable to determine ClassLinker field offsets");return r}function tryGetArtClassLinkerSpec(t,e){if(cachedArtClassLinkerSpec!==null)return cachedArtClassLinkerSpec;const{classLinker:r,internTable:n}=e.offset,o=t.add(r).readPointer(),i=t.add(n).readPointer(),s=pointerSize5===4?100:200,l=s+100*pointerSize5,a=getAndroidApiLevel();let c=null;for(let d=s;d!==l;d+=pointerSize5)if(o.add(d).readPointer().equals(i)){let u;a>=30||getAndroidCodename()==="R"?u=6:a>=29?u=4:a>=23?u=3:u=5;const h=d+u*pointerSize5;let _;a>=23?_=h-2*pointerSize5:_=h-3*pointerSize5,c={offset:{quickResolutionTrampoline:_,quickImtConflictTrampoline:h-pointerSize5,quickGenericJniTrampoline:h,quickToInterpreterBridgeTrampoline:h+pointerSize5}};break}return c!==null&&(cachedArtClassLinkerSpec=c),c}function getArtClassSpec(t){let r=null;return t.perform(n=>{const o=getArtFieldSpec(t),i=getArtMethodSpec(t),s={artArrayLengthSize:4,artArrayEntrySize:o.size,artArrayMax:50},l={artArrayLengthSize:pointerSize5,artArrayEntrySize:i.size,artArrayMax:100},a=(u,h,_)=>{const f=u.add(h).readPointer();if(f.isNull())return null;const m=_===4?f.readU32():f.readU64().valueOf();return m<=0?null:{length:m,data:f.add(_)}},c=(u,h,_,f)=>{try{const m=a(u,h,f.artArrayLengthSize);if(m===null)return!1;const g=Math.min(m.length,f.artArrayMax);for(let v=0;v!==g;v++)if(m.data.add(v*f.artArrayEntrySize).equals(_))return!0}catch{}return!1},d=n.findClass("java/lang/Thread"),p=n.newGlobalRef(d);try{let u;withRunnableArtThread(t,n,T=>{u=getApi()["art::JavaVMExt::DecodeGlobal"](t,T,p)});const h=unwrapFieldId(n.getFieldId(p,"name","Ljava/lang/String;")),_=unwrapFieldId(n.getStaticFieldId(p,"MAX_PRIORITY","I"));let f=-1,m=-1;for(let T=0;T!==256;T+=4)f===-1&&c(u,T,_,s)&&(f=T),m===-1&&c(u,T,h,s)&&(m=T);if(m===-1||f===-1)throw new Error("Unable to find fields in java/lang/Thread; please file a bug");const g=m!==f?f:0,v=m;let A=-1;const w=unwrapMethodId(n.getMethodId(p,"getName","()Ljava/lang/String;"));for(let T=0;T!==256;T+=4)A===-1&&c(u,T,w,l)&&(A=T);if(A===-1)throw new Error("Unable to find methods in java/lang/Thread; please file a bug");let N=-1;const L=a(u,A,l.artArrayLengthSize).length;for(let T=A;T!==256;T+=4)if(u.add(T).readU16()===L){N=T;break}if(N===-1)throw new Error("Unable to find copied methods in java/lang/Thread; please file a bug");r={offset:{ifields:v,methods:A,sfields:g,copiedMethodsOffset:N}}}finally{n.deleteLocalRef(d),n.deleteGlobalRef(p)}}),r}function _getArtMethodSpec(t){const e=getApi();let r;return t.perform(n=>{const o=n.findClass("android/os/Process"),i=unwrapMethodId(n.getStaticMethodId(o,"getElapsedCpuTime","()J"));n.deleteLocalRef(o);const s=Process.getModuleByName("libandroid_runtime.so"),l=s.base,a=l.add(s.size),c=getAndroidApiLevel(),d=c<=21?8:pointerSize5,p=kAccPublic|kAccStatic|kAccFinal|kAccNative,u=~(kAccFastInterpreterToInterpreterInvoke|kAccPublicApi|kAccNterpInvokeFastPathFlag)>>>0;let h=null,_=null,f=2;for(let v=0;v!==64&&f!==0;v+=4){const A=i.add(v);if(h===null){const w=A.readPointer();w.compare(l)>=0&&w.compare(a)<0&&(h=v,f--)}_===null&&(A.readU32()&u)===p&&(_=v,f--)}if(f!==0)throw new Error("Unable to determine ArtMethod field offsets");const m=h+d;r={size:c<=21?m+32:m+pointerSize5,offset:{jniCode:h,quickCode:m,accessFlags:_}},"artInterpreterToCompiledCodeBridge"in e&&(r.offset.interpreterCode=h-d)}),r}function getArtFieldSpec(t){const e=getAndroidApiLevel();return e>=23?{size:16,offset:{accessFlags:4}}:e>=21?{size:24,offset:{accessFlags:12}}:null}function _getArtThreadSpec(t){const e=getAndroidApiLevel();let r;return t.perform(n=>{const o=getArtThreadFromEnv(n),i=n.handle;let s=null,l=null,a=null,c=null,d=null,p=null;for(let u=144;u!==256;u+=pointerSize5)if(o.add(u).readPointer().equals(i)){l=u-6*pointerSize5,d=u-4*pointerSize5,p=u+2*pointerSize5,e<=22&&(l-=pointerSize5,s=l-pointerSize5-72-12,a=u+6*pointerSize5,d-=pointerSize5,p-=pointerSize5),c=u+9*pointerSize5,e<=22&&(c+=2*pointerSize5+4,pointerSize5===8&&(c+=4)),e>=23&&(c+=pointerSize5);break}if(c===null)throw new Error("Unable to determine ArtThread field offsets");r={offset:{isExceptionReportedToInstrumentation:s,exception:l,throwLocation:a,topHandleScope:c,managedStack:d,self:p}}}),r}function _getArtManagedStackSpec(){return getAndroidApiLevel()>=23?{offset:{topQuickFrame:0,link:pointerSize5}}:{offset:{topQuickFrame:2*pointerSize5,link:0}}}var artQuickTrampolineParsers={ia32:parseArtQuickTrampolineX86,x64:parseArtQuickTrampolineX86,arm:parseArtQuickTrampolineArm,arm64:parseArtQuickTrampolineArm64};function getArtQuickEntrypointFromTrampoline(t,e){let r;return e.perform(n=>{const o=getArtThreadFromEnv(n),i=artQuickTrampolineParsers[Process.arch],s=Instruction.parse(t),l=i(s);l!==null?r=o.add(l).readPointer():r=t}),r}function parseArtQuickTrampolineX86(t){return t.mnemonic==="jmp"?t.operands[0].value.disp:null}function parseArtQuickTrampolineArm(t){return t.mnemonic==="ldr.w"?t.operands[1].value.disp:null}function parseArtQuickTrampolineArm64(t){return t.mnemonic==="ldr"?t.operands[1].value.disp:null}function getArtThreadFromEnv(t){return t.handle.add(pointerSize5).readPointer()}function _getAndroidVersion(){return getAndroidSystemProperty("ro.build.version.release")}function _getAndroidCodename(){return getAndroidSystemProperty("ro.build.version.codename")}function _getAndroidApiLevel(){return parseInt(getAndroidSystemProperty("ro.build.version.sdk"),10)}function _getArtApexVersion(){try{const t=File.readAllText("/proc/self/mountinfo");let e=null;const r=new Map;for(const o of t.trimEnd().split(`
`)){const i=o.split(" "),s=i[4];if(!s.startsWith("/apex/com.android.art"))continue;const l=i[10];s.includes("@")?r.set(l,s.split("@")[1]):e=l}const n=r.get(e);return n!==void 0?parseInt(n):computeArtApexVersionFromApiLevel()}catch{return computeArtApexVersionFromApiLevel()}}function computeArtApexVersionFromApiLevel(){return getAndroidApiLevel()*1e7}var systemPropertyGet=null,PROP_VALUE_MAX=92;function getAndroidSystemProperty(t){systemPropertyGet===null&&(systemPropertyGet=new NativeFunction(Process.getModuleByName("libc.so").getExportByName("__system_property_get"),"int",["pointer","pointer"],nativeFunctionOptions3));const e=Memory.alloc(PROP_VALUE_MAX);return systemPropertyGet(Memory.allocUtf8String(t),e),e.readUtf8String()}function withRunnableArtThread(t,e,r){const n=getArtThreadStateTransitionImpl(t,e),o=getArtThreadFromEnv(e).toString();if(artThreadStateTransitions[o]=r,n(e.handle),artThreadStateTransitions[o]!==void 0)throw delete artThreadStateTransitions[o],new Error("Unable to perform state transition; please file a bug")}function _getArtThreadStateTransitionImpl(t,e){const r=new NativeCallback(onThreadStateTransitionComplete,"void",["pointer"]);return makeArtThreadStateTransitionImpl(t,e,r)}function onThreadStateTransitionComplete(t){const e=t.toString(),r=artThreadStateTransitions[e];delete artThreadStateTransitions[e],r(t)}function withAllArtThreadsSuspended(t){const e=getApi(),r=e.artThreadList;e["art::ThreadList::SuspendAll"](r,Memory.allocUtf8String("frida"),!1?1:0);try{t()}finally{e["art::ThreadList::ResumeAll"](r)}}var ArtClassVisitor=class{constructor(t){const e=Memory.alloc(4*pointerSize5),r=e.add(pointerSize5);e.writePointer(r);const n=new NativeCallback((o,i)=>t(i)===!0?1:0,"bool",["pointer","pointer"]);r.add(2*pointerSize5).writePointer(n),this.handle=e,this._onVisit=n}};function makeArtClassVisitor(t){return getApi()["art::ClassLinker::VisitClasses"]instanceof NativeFunction?new ArtClassVisitor(t):new NativeCallback(r=>t(r)===!0?1:0,"bool",["pointer","pointer"])}var ArtClassLoaderVisitor=class{constructor(t){const e=Memory.alloc(4*pointerSize5),r=e.add(pointerSize5);e.writePointer(r);const n=new NativeCallback((o,i)=>{t(i)},"void",["pointer","pointer"]);r.add(2*pointerSize5).writePointer(n),this.handle=e,this._onVisit=n}};function makeArtClassLoaderVisitor(t){return new ArtClassLoaderVisitor(t)}var WalkKind={"include-inlined-frames":0,"skip-inlined-frames":1},ArtStackVisitor=class{constructor(t,e,r,n=0,o=!0){const i=getApi(),s=512,l=3*pointerSize5,a=Memory.alloc(s+l);i["art::StackVisitor::StackVisitor"](a,t,e,WalkKind[r],n,o?1:0);const c=a.add(s);a.writePointer(c);const d=new NativeCallback(this._visitFrame.bind(this),"bool",["pointer"]);c.add(2*pointerSize5).writePointer(d),this.handle=a,this._onVisitFrame=d;const p=a.add(pointerSize5===4?12:24);this._curShadowFrame=p,this._curQuickFrame=p.add(pointerSize5),this._curQuickFramePc=p.add(2*pointerSize5),this._curOatQuickMethodHeader=p.add(3*pointerSize5),this._getMethodImpl=i["art::StackVisitor::GetMethod"],this._descLocImpl=i["art::StackVisitor::DescribeLocation"],this._getCQFIImpl=i["art::StackVisitor::GetCurrentQuickFrameInfo"]}walkStack(t=!1){getApi()["art::StackVisitor::WalkStack"](this.handle,t?1:0)}_visitFrame(){return this.visitFrame()?1:0}visitFrame(){throw new Error("Subclass must implement visitFrame")}getMethod(){const t=this._getMethodImpl(this.handle);return t.isNull()?null:new ArtMethod(t)}getCurrentQuickFramePc(){return this._curQuickFramePc.readPointer()}getCurrentQuickFrame(){return this._curQuickFrame.readPointer()}getCurrentShadowFrame(){return this._curShadowFrame.readPointer()}describeLocation(){const t=new StdString;return this._descLocImpl(t,this.handle),t.disposeToString()}getCurrentOatQuickMethodHeader(){return this._curOatQuickMethodHeader.readPointer()}getCurrentQuickFrameInfo(){return this._getCQFIImpl(this.handle)}},ArtMethod=class{constructor(t){this.handle=t}prettyMethod(t=!0){const e=new StdString;return getApi()["art::ArtMethod::PrettyMethod"](e,this.handle,t?1:0),e.disposeToString()}toString(){return`ArtMethod(handle=${this.handle})`}};function makeArtQuickFrameInfoGetter(t){return function(e){const r=Memory.alloc(12);return getArtQuickFrameInfoGetterThunk(t)(r,e),{frameSizeInBytes:r.readU32(),coreSpillMask:r.add(4).readU32(),fpSpillMask:r.add(8).readU32()}}}function _getArtQuickFrameInfoGetterThunk(t){let e=NULL;switch(Process.arch){case"ia32":e=makeThunk(32,r=>{r.putMovRegRegOffsetPtr("ecx","esp",4),r.putMovRegRegOffsetPtr("edx","esp",8),r.putCallAddressWithArguments(t,["ecx","edx"]),r.putMovRegReg("esp","ebp"),r.putPopReg("ebp"),r.putRet()});break;case"x64":e=makeThunk(32,r=>{r.putPushReg("rdi"),r.putCallAddressWithArguments(t,["rsi"]),r.putPopReg("rdi"),r.putMovRegPtrReg("rdi","rax"),r.putMovRegOffsetPtrReg("rdi",8,"edx"),r.putRet()});break;case"arm":e=makeThunk(16,r=>{r.putCallAddressWithArguments(t,["r0","r1"]),r.putPopRegs(["r0","lr"]),r.putMovRegReg("pc","lr")});break;case"arm64":e=makeThunk(64,r=>{r.putPushRegReg("x0","lr"),r.putCallAddressWithArguments(t,["x1"]),r.putPopRegReg("x2","lr"),r.putStrRegRegOffset("x0","x2",0),r.putStrRegRegOffset("w1","x2",8),r.putRet()});break}return new NativeFunction(e,"void",["pointer","pointer"],nativeFunctionOptions3)}var thunkRelocators={ia32:globalThis.X86Relocator,x64:globalThis.X86Relocator,arm:globalThis.ThumbRelocator,arm64:globalThis.Arm64Relocator},thunkWriters={ia32:globalThis.X86Writer,x64:globalThis.X86Writer,arm:globalThis.ThumbWriter,arm64:globalThis.Arm64Writer};function makeThunk(t,e){thunkPage===null&&(thunkPage=Memory.alloc(Process.pageSize));const r=thunkPage.add(thunkOffset),n=Process.arch,o=thunkWriters[n];return Memory.patchCode(r,t,i=>{const s=new o(i,{pc:r});if(e(s),s.flush(),s.offset>t)throw new Error(`Wrote ${s.offset}, exceeding maximum of ${t}`)}),thunkOffset+=t,n==="arm"?r.or(1):r}function notifyArtMethodHooked(t,e){ensureArtKnowsHowToHandleMethodInstrumentation(e),ensureArtKnowsHowToHandleReplacementMethods(e)}function makeArtController(t,e){const r=getArtThreadSpec(e).offset,n=getArtManagedStackSpec().offset,o=`
#include <gum/guminterceptor.h>

extern GMutex lock;
extern GHashTable * methods;
extern GHashTable * replacements;
extern gpointer last_seen_art_method;

extern gpointer get_oat_quick_method_header_impl (gpointer method, gpointer pc);

void
init (void)
{
  g_mutex_init (&lock);
  methods = g_hash_table_new_full (NULL, NULL, NULL, NULL);
  replacements = g_hash_table_new_full (NULL, NULL, NULL, NULL);
}

void
finalize (void)
{
  g_hash_table_unref (replacements);
  g_hash_table_unref (methods);
  g_mutex_clear (&lock);
}

gboolean
is_replacement_method (gpointer method)
{
  gboolean is_replacement;

  g_mutex_lock (&lock);

  is_replacement = g_hash_table_contains (replacements, method);

  g_mutex_unlock (&lock);

  return is_replacement;
}

gpointer
get_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);

  g_mutex_unlock (&lock);

  return replacement_method;
}

void
set_replacement_method (gpointer original_method,
                        gpointer replacement_method)
{
  g_mutex_lock (&lock);

  g_hash_table_insert (methods, original_method, replacement_method);
  g_hash_table_insert (replacements, replacement_method, original_method);

  g_mutex_unlock (&lock);
}

void
synchronize_replacement_methods (guint quick_code_offset,
                                 void * nterp_entrypoint,
                                 void * quick_to_interpreter_bridge)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
  {
    void ** quick_code;

    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

    quick_code = hooked_method + quick_code_offset;
    if (*quick_code == nterp_entrypoint)
      *quick_code = quick_to_interpreter_bridge;
  }

  g_mutex_unlock (&lock);
}

void
delete_replacement_method (gpointer original_method)
{
  gpointer replacement_method;

  g_mutex_lock (&lock);

  replacement_method = g_hash_table_lookup (methods, original_method);
  if (replacement_method != NULL)
  {
    g_hash_table_remove (methods, original_method);
    g_hash_table_remove (replacements, replacement_method);
  }

  g_mutex_unlock (&lock);
}

gpointer
translate_method (gpointer method)
{
  gpointer translated_method;

  g_mutex_lock (&lock);

  translated_method = g_hash_table_lookup (replacements, method);

  g_mutex_unlock (&lock);

  return (translated_method != NULL) ? translated_method : method;
}

gpointer
find_replacement_method_from_quick_code (gpointer method,
                                         gpointer thread)
{
  gpointer replacement_method;
  gpointer managed_stack;
  gpointer top_quick_frame;
  gpointer link_managed_stack;
  gpointer * link_top_quick_frame;

  replacement_method = get_replacement_method (method);
  if (replacement_method == NULL)
    return NULL;

  /*
   * Stack check.
   *
   * Return NULL to indicate that the original method should be invoked, otherwise
   * return a pointer to the replacement ArtMethod.
   *
   * If the caller is our own JNI replacement stub, then a stack transition must
   * have been pushed onto the current thread's linked list.
   *
   * Therefore, we invoke the original method if the following conditions are met:
   *   1- The current managed stack is empty.
   *   2- The ArtMethod * inside the linked managed stack's top quick frame is the
   *      same as our replacement.
   */
  managed_stack = thread + ${r.managedStack};
  top_quick_frame = *((gpointer *) (managed_stack + ${n.topQuickFrame}));
  if (top_quick_frame != NULL)
    return replacement_method;

  link_managed_stack = *((gpointer *) (managed_stack + ${n.link}));
  if (link_managed_stack == NULL)
    return replacement_method;

  link_top_quick_frame = GSIZE_TO_POINTER (*((gsize *) (link_managed_stack + ${n.topQuickFrame})) & ~((gsize) 1));
  if (link_top_quick_frame == NULL || *link_top_quick_frame != replacement_method)
    return replacement_method;

  return NULL;
}

void
on_interpreter_do_call (GumInvocationContext * ic)
{
  gpointer method, replacement_method;

  method = gum_invocation_context_get_nth_argument (ic, 0);

  replacement_method = get_replacement_method (method);
  if (replacement_method != NULL)
    gum_invocation_context_replace_nth_argument (ic, 0, replacement_method);
}

gpointer
on_art_method_get_oat_quick_method_header (gpointer method,
                                           gpointer pc)
{
  if (is_replacement_method (method))
    return NULL;

  return get_oat_quick_method_header_impl (method, pc);
}

void
on_art_method_pretty_method (GumInvocationContext * ic)
{
  const guint this_arg_index = ${Process.arch==="arm64"?0:1};
  gpointer method;

  method = gum_invocation_context_get_nth_argument (ic, this_arg_index);
  if (method == NULL)
    gum_invocation_context_replace_nth_argument (ic, this_arg_index, last_seen_art_method);
  else
    last_seen_art_method = method;
}

void
on_leave_gc_concurrent_copying_copying_phase (GumInvocationContext * ic)
{
  GHashTableIter iter;
  gpointer hooked_method, replacement_method;

  g_mutex_lock (&lock);

  g_hash_table_iter_init (&iter, methods);
  while (g_hash_table_iter_next (&iter, &hooked_method, &replacement_method))
    *((uint32_t *) replacement_method) = *((uint32_t *) hooked_method);

  g_mutex_unlock (&lock);
}
`,i=8,s=pointerSize5,l=pointerSize5,a=pointerSize5,d=Memory.alloc(i+s+l+a),p=d.add(i),u=p.add(s),h=u.add(l),_=t.find(pointerSize5===4?"_ZN3art9ArtMethod23GetOatQuickMethodHeaderEj":"_ZN3art9ArtMethod23GetOatQuickMethodHeaderEm"),f=new CModule(o,{lock:d,methods:p,replacements:u,last_seen_art_method:h,get_oat_quick_method_header_impl:_??ptr("0xdeadbeef")}),m={exceptions:"propagate",scheduling:"exclusive"};return{handle:f,replacedMethods:{isReplacement:new NativeFunction(f.is_replacement_method,"bool",["pointer"],m),get:new NativeFunction(f.get_replacement_method,"pointer",["pointer"],m),set:new NativeFunction(f.set_replacement_method,"void",["pointer","pointer"],m),synchronize:new NativeFunction(f.synchronize_replacement_methods,"void",["uint","pointer","pointer"],m),delete:new NativeFunction(f.delete_replacement_method,"void",["pointer"],m),translate:new NativeFunction(f.translate_method,"pointer",["pointer"],m),findReplacementFromQuickCode:f.find_replacement_method_from_quick_code},getOatQuickMethodHeaderImpl:_,hooks:{Interpreter:{doCall:f.on_interpreter_do_call},ArtMethod:{getOatQuickMethodHeader:f.on_art_method_get_oat_quick_method_header,prettyMethod:f.on_art_method_pretty_method},Gc:{copyingPhase:{onLeave:f.on_leave_gc_concurrent_copying_copying_phase},runFlip:{onEnter:f.on_leave_gc_concurrent_copying_copying_phase}}}}}function ensureArtKnowsHowToHandleMethodInstrumentation(t){taughtArtAboutMethodInstrumentation||(taughtArtAboutMethodInstrumentation=!0,instrumentArtQuickEntrypoints(t),instrumentArtMethodInvocationFromInterpreter(),instrumentArtGarbageCollection(),instrumentArtFixupStaticTrampolines())}function instrumentArtQuickEntrypoints(t){const e=getApi();[e.artQuickGenericJniTrampoline,e.artQuickToInterpreterBridge,e.artQuickResolutionTrampoline].forEach(n=>{Memory.protect(n,32,"rwx");const o=new ArtQuickCodeInterceptor(n);o.activate(t),artQuickInterceptors.push(o)})}function instrumentArtMethodInvocationFromInterpreter(){const t=getApi(),e=getAndroidApiLevel(),{isApiLevel34OrApexEquivalent:r}=t;let n;if(e<=22)n=/^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_6mirror9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/;else if(e<=33&&!r)n=/^_ZN3art11interpreter6DoCallILb[0-1]ELb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtPNS_6JValueE$/;else if(r)n=/^_ZN3art11interpreter6DoCallILb[0-1]EEEbPNS_9ArtMethodEPNS_6ThreadERNS_11ShadowFrameEPKNS_11InstructionEtbPNS_6JValueE$/;else throw new Error("Unable to find method invocation in ART; please file a bug");const o=t.module,i=[...o.enumerateExports(),...o.enumerateSymbols()].filter(s=>n.test(s.name));if(i.length===0)throw new Error("Unable to find method invocation in ART; please file a bug");for(const s of i)Interceptor.attach(s.address,artController.hooks.Interpreter.doCall)}function instrumentArtGarbageCollection(){const t=getApi(),r=t.module.findSymbolByName("_ZN3art2gc4Heap22CollectGarbageInternalENS0_9collector6GcTypeENS0_7GcCauseEbj");if(r===null)return;const{artNterpEntryPoint:n,artQuickToInterpreterBridge:o}=t,i=getArtMethodSpec(t.vm).offset.quickCode;Interceptor.attach(r,{onLeave(){artController.replacedMethods.synchronize(i,n,o)}})}function instrumentArtFixupStaticTrampolines(){const t=[["_ZN3art11ClassLinker26VisiblyInitializedCallback22MarkVisiblyInitializedEPNS_6ThreadE","e90340f8 : ff0ff0ff"],["_ZN3art11ClassLinker26VisiblyInitializedCallback29AdjustThreadVisibilityCounterEPNS_6ThreadEl","7f0f00f9 : 1ffcffff"]],e=getApi(),r=e.module;for(const[n,o]of t){const i=r.findSymbolByName(n);if(i===null)continue;const s=Memory.scanSync(i,8192,o);if(s.length===0)return;const{artNterpEntryPoint:l,artQuickToInterpreterBridge:a}=e,c=getArtMethodSpec(e.vm).offset.quickCode;Interceptor.attach(s[0].address,function(){artController.replacedMethods.synchronize(c,l,a)});return}}function ensureArtKnowsHowToHandleReplacementMethods(t){if(taughtArtAboutReplacementMethods)return;if(taughtArtAboutReplacementMethods=!0,!maybeInstrumentGetOatQuickMethodHeaderInlineCopies()){const{getOatQuickMethodHeaderImpl:i}=artController;if(i===null)return;try{Interceptor.replace(i,artController.hooks.ArtMethod.getOatQuickMethodHeader)}catch{}}const e=getAndroidApiLevel();let r=null;const n=getApi();e>28?r=n.find("_ZN3art2gc9collector17ConcurrentCopying12CopyingPhaseEv"):e>22&&(r=n.find("_ZN3art2gc9collector17ConcurrentCopying12MarkingPhaseEv")),r!==null&&Interceptor.attach(r,artController.hooks.Gc.copyingPhase);let o=null;o=n.find("_ZN3art6Thread15RunFlipFunctionEPS0_"),o===null&&(o=n.find("_ZN3art6Thread15RunFlipFunctionEPS0_b")),o!==null&&Interceptor.attach(o,artController.hooks.Gc.runFlip)}var artGetOatQuickMethodHeaderInlinedCopyHandler={arm:{signatures:[{pattern:["b0 68","01 30","0c d0","1b 98",":","c0 ff","c0 ff","00 ff","00 2f"],validateMatch:validateGetOatQuickMethodHeaderInlinedMatchArm},{pattern:["d8 f8 08 00","01 30","0c d0","1b 98",":","f0 ff ff 0f","ff ff","00 ff","00 2f"],validateMatch:validateGetOatQuickMethodHeaderInlinedMatchArm},{pattern:["b0 68","01 30","40 f0 c3 80","00 25",":","c0 ff","c0 ff","c0 fb 00 d0","ff f8"],validateMatch:validateGetOatQuickMethodHeaderInlinedMatchArm}],instrument:instrumentGetOatQuickMethodHeaderInlinedCopyArm},arm64:{signatures:[{pattern:["0a 40 b9","1f 05 00 31","40 01 00 54","88 39 00 f0",":","fc ff ff","1f fc ff ff","1f 00 00 ff","00 00 00 9f"],offset:1,validateMatch:validateGetOatQuickMethodHeaderInlinedMatchArm64},{pattern:["0a 40 b9","1f 05 00 31","40 01 00 54","00 0e 40 f9",":","fc ff ff","1f fc ff ff","1f 00 00 ff","00 fc ff ff"],offset:1,validateMatch:validateGetOatQuickMethodHeaderInlinedMatchArm64},{pattern:["0a 40 b9","1f 05 00 31","01 34 00 54","e0 03 1f aa",":","fc ff ff","1f fc ff ff","1f 00 00 ff","e0 ff ff ff"],offset:1,validateMatch:validateGetOatQuickMethodHeaderInlinedMatchArm64}],instrument:instrumentGetOatQuickMethodHeaderInlinedCopyArm64}};function validateGetOatQuickMethodHeaderInlinedMatchArm({address:t,size:e}){const r=Instruction.parse(t.or(1)),[n,o]=r.operands,i=o.value.base,s=n.value,l=Instruction.parse(r.next.add(2)),a=ptr(l.operands[0].value),c=l.address.add(l.size);let d,p;return l.mnemonic==="beq"?(d=c,p=a):(d=a,p=c),parseInstructionsAt(d.or(1),u,{limit:3});function u(h){const{mnemonic:_}=h;if(!(_==="ldr"||_==="ldr.w"))return null;const{base:f,disp:m}=h.operands[1].value;return f===i&&m===20?{methodReg:i,scratchReg:s,target:{whenTrue:a,whenRegularMethod:d,whenRuntimeMethod:p}}:null}}function validateGetOatQuickMethodHeaderInlinedMatchArm64({address:t,size:e}){const[r,n]=Instruction.parse(t).operands,o=n.value.base,i="x"+r.value.substring(1),s=Instruction.parse(t.add(8)),l=ptr(s.operands[0].value),a=t.add(12);let c,d;return s.mnemonic==="b.eq"?(c=a,d=l):(c=l,d=a),parseInstructionsAt(c,p,{limit:3});function p(u){if(u.mnemonic!=="ldr")return null;const{base:h,disp:_}=u.operands[1].value;return h===o&&_===24?{methodReg:o,scratchReg:i,target:{whenTrue:l,whenRegularMethod:c,whenRuntimeMethod:d}}:null}}function maybeInstrumentGetOatQuickMethodHeaderInlineCopies(){if(getAndroidApiLevel()<31)return!1;const t=artGetOatQuickMethodHeaderInlinedCopyHandler[Process.arch];if(t===void 0)return!1;const e=t.signatures.map(({pattern:n,offset:o=0,validateMatch:i=returnEmptyObject})=>({pattern:new MatchPattern(n.join("")),offset:o,validateMatch:i})),r=[];for(const{base:n,size:o}of getApi().module.enumerateRanges("--x"))for(const{pattern:i,offset:s,validateMatch:l}of e){const a=Memory.scanSync(n,o,i).map(({address:c,size:d})=>({address:c.sub(s),size:d+s})).filter(c=>{const d=l(c);return d===null?!1:(c.validationResult=d,!0)});r.push(...a)}return r.length===0?!1:(r.forEach(t.instrument),!0)}function returnEmptyObject(){return{}}var InlineHook=class{constructor(t,e,r){this.address=t,this.size=e,this.originalCode=t.readByteArray(e),this.trampoline=r}revert(){Memory.patchCode(this.address,this.size,t=>{t.writeByteArray(this.originalCode)})}};function instrumentGetOatQuickMethodHeaderInlinedCopyArm({address:t,size:e,validationResult:r}){const{methodReg:n,target:o}=r,i=Memory.alloc(Process.pageSize);let s=e;Memory.patchCode(i,256,l=>{const a=new ThumbWriter(l,{pc:i}),c=new ThumbRelocator(t,a);for(let _=0;_!==2;_++)c.readOne();c.writeAll(),c.readOne(),c.skipOne(),a.putBCondLabel("eq","runtime_or_replacement_method");const d=[45,237,16,10];a.putBytes(d);const p=["r0","r1","r2","r3"];a.putPushRegs(p),a.putCallAddressWithArguments(artController.replacedMethods.isReplacement,[n]),a.putCmpRegImm("r0",0),a.putPopRegs(p);const u=[189,236,16,10];a.putBytes(u),a.putBCondLabel("ne","runtime_or_replacement_method"),a.putBLabel("regular_method"),c.readOne();const h=c.input.address.equals(o.whenRegularMethod);for(a.putLabel(h?"regular_method":"runtime_or_replacement_method"),c.writeOne();s<10;){const _=c.readOne();if(_===0){s=10;break}s=_}c.writeAll(),a.putBranchAddress(t.add(s+1)),a.putLabel(h?"runtime_or_replacement_method":"regular_method"),a.putBranchAddress(o.whenTrue),a.flush()}),inlineHooks.push(new InlineHook(t,s,i)),Memory.patchCode(t,s,l=>{const a=new ThumbWriter(l,{pc:t});a.putLdrRegAddress("pc",i.or(1)),a.flush()})}function instrumentGetOatQuickMethodHeaderInlinedCopyArm64({address:t,size:e,validationResult:r}){const{methodReg:n,scratchReg:o,target:i}=r,s=Memory.alloc(Process.pageSize);Memory.patchCode(s,256,l=>{const a=new Arm64Writer(l,{pc:s}),c=new Arm64Relocator(t,a);for(let _=0;_!==2;_++)c.readOne();c.writeAll(),c.readOne(),c.skipOne(),a.putBCondLabel("eq","runtime_or_replacement_method");const d=["d0","d1","d2","d3","d4","d5","d6","d7","x0","x1","x2","x3","x4","x5","x6","x7","x8","x9","x10","x11","x12","x13","x14","x15","x16","x17"],p=d.length;for(let _=0;_!==p;_+=2)a.putPushRegReg(d[_],d[_+1]);a.putCallAddressWithArguments(artController.replacedMethods.isReplacement,[n]),a.putCmpRegReg("x0","xzr");for(let _=p-2;_>=0;_-=2)a.putPopRegReg(d[_],d[_+1]);a.putBCondLabel("ne","runtime_or_replacement_method"),a.putBLabel("regular_method"),c.readOne();const u=c.input,h=u.address.equals(i.whenRegularMethod);a.putLabel(h?"regular_method":"runtime_or_replacement_method"),c.writeOne(),a.putBranchAddress(u.next),a.putLabel(h?"runtime_or_replacement_method":"regular_method"),a.putBranchAddress(i.whenTrue),a.flush()}),inlineHooks.push(new InlineHook(t,e,s)),Memory.patchCode(t,e,l=>{const a=new Arm64Writer(l,{pc:t});a.putLdrRegAddress(o,s),a.putBrReg(o),a.flush()})}function makeMethodMangler(t){return new MethodMangler(t)}function translateMethod(t){return artController.replacedMethods.translate(t)}function backtrace(t,e={}){const{limit:r=16}=e,n=t.getEnv();return backtraceModule===null&&(backtraceModule=makeBacktraceModule(t,n)),backtraceModule.backtrace(n,r)}function makeBacktraceModule(t,e){const r=getApi(),n=Memory.alloc(Process.pointerSize),o=new CModule(`
#include <glib.h>
#include <stdbool.h>
#include <string.h>
#include <gum/gumtls.h>
#include <json-glib/json-glib.h>

typedef struct _ArtBacktrace ArtBacktrace;
typedef struct _ArtStackFrame ArtStackFrame;

typedef struct _ArtStackVisitor ArtStackVisitor;
typedef struct _ArtStackVisitorVTable ArtStackVisitorVTable;

typedef struct _ArtClass ArtClass;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtThread ArtThread;
typedef struct _ArtContext ArtContext;

typedef struct _JNIEnv JNIEnv;

typedef struct _StdString StdString;
typedef struct _StdTinyString StdTinyString;
typedef struct _StdLargeString StdLargeString;

typedef enum {
  STACK_WALK_INCLUDE_INLINED_FRAMES,
  STACK_WALK_SKIP_INLINED_FRAMES,
} StackWalkKind;

struct _StdTinyString
{
  guint8 unused;
  gchar data[(3 * sizeof (gpointer)) - 1];
};

struct _StdLargeString
{
  gsize capacity;
  gsize size;
  gchar * data;
};

struct _StdString
{
  union
  {
    guint8 flags;
    StdTinyString tiny;
    StdLargeString large;
  };
};

struct _ArtBacktrace
{
  GChecksum * id;
  GArray * frames;
  gchar * frames_json;
};

struct _ArtStackFrame
{
  ArtMethod * method;
  gsize dexpc;
  StdString description;
};

struct _ArtStackVisitorVTable
{
  void (* unused1) (void);
  void (* unused2) (void);
  bool (* visit) (ArtStackVisitor * visitor);
};

struct _ArtStackVisitor
{
  ArtStackVisitorVTable * vtable;

  guint8 padding[512];

  ArtStackVisitorVTable vtable_storage;

  ArtBacktrace * backtrace;
};

struct _ArtMethod
{
  guint32 declaring_class;
  guint32 access_flags;
};

extern GumTlsKey current_backtrace;

extern void (* perform_art_thread_state_transition) (JNIEnv * env);

extern ArtContext * art_make_context (ArtThread * thread);

extern void art_stack_visitor_init (ArtStackVisitor * visitor, ArtThread * thread, void * context, StackWalkKind walk_kind,
    size_t num_frames, bool check_suspended);
extern void art_stack_visitor_walk_stack (ArtStackVisitor * visitor, bool include_transitions);
extern ArtMethod * art_stack_visitor_get_method (ArtStackVisitor * visitor);
extern void art_stack_visitor_describe_location (StdString * description, ArtStackVisitor * visitor);
extern ArtMethod * translate_method (ArtMethod * method);
extern void translate_location (ArtMethod * method, guint32 pc, const gchar ** source_file, gint32 * line_number);
extern void get_class_location (StdString * result, ArtClass * klass);
extern void cxx_delete (void * mem);
extern unsigned long strtoul (const char * str, char ** endptr, int base);

static bool visit_frame (ArtStackVisitor * visitor);
static void art_stack_frame_destroy (ArtStackFrame * frame);

static void append_jni_type_name (GString * s, const gchar * name, gsize length);

static void std_string_destroy (StdString * str);
static gchar * std_string_get_data (StdString * str);

void
init (void)
{
  current_backtrace = gum_tls_key_new ();
}

void
finalize (void)
{
  gum_tls_key_free (current_backtrace);
}

ArtBacktrace *
_create (JNIEnv * env,
         guint limit)
{
  ArtBacktrace * bt;

  bt = g_new (ArtBacktrace, 1);
  bt->id = g_checksum_new (G_CHECKSUM_SHA1);
  bt->frames = (limit != 0)
      ? g_array_sized_new (FALSE, FALSE, sizeof (ArtStackFrame), limit)
      : g_array_new (FALSE, FALSE, sizeof (ArtStackFrame));
  g_array_set_clear_func (bt->frames, (GDestroyNotify) art_stack_frame_destroy);
  bt->frames_json = NULL;

  gum_tls_key_set_value (current_backtrace, bt);

  perform_art_thread_state_transition (env);

  gum_tls_key_set_value (current_backtrace, NULL);

  return bt;
}

void
_on_thread_state_transition_complete (ArtThread * thread)
{
  ArtContext * context;
  ArtStackVisitor visitor = {
    .vtable_storage = {
      .visit = visit_frame,
    },
  };

  context = art_make_context (thread);

  art_stack_visitor_init (&visitor, thread, context, STACK_WALK_SKIP_INLINED_FRAMES, 0, true);
  visitor.vtable = &visitor.vtable_storage;
  visitor.backtrace = gum_tls_key_get_value (current_backtrace);

  art_stack_visitor_walk_stack (&visitor, false);

  cxx_delete (context);
}

static bool
visit_frame (ArtStackVisitor * visitor)
{
  ArtBacktrace * bt = visitor->backtrace;
  ArtStackFrame frame;
  const gchar * description, * dexpc_part;

  frame.method = art_stack_visitor_get_method (visitor);

  art_stack_visitor_describe_location (&frame.description, visitor);

  description = std_string_get_data (&frame.description);
  if (strstr (description, " '<") != NULL)
    goto skip;

  dexpc_part = strstr (description, " at dex PC 0x");
  if (dexpc_part == NULL)
    goto skip;
  frame.dexpc = strtoul (dexpc_part + 13, NULL, 16);

  g_array_append_val (bt->frames, frame);

  g_checksum_update (bt->id, (guchar *) &frame.method, sizeof (frame.method));
  g_checksum_update (bt->id, (guchar *) &frame.dexpc, sizeof (frame.dexpc));

  return true;

skip:
  std_string_destroy (&frame.description);
  return true;
}

static void
art_stack_frame_destroy (ArtStackFrame * frame)
{
  std_string_destroy (&frame->description);
}

void
_destroy (ArtBacktrace * backtrace)
{
  g_free (backtrace->frames_json);
  g_array_free (backtrace->frames, TRUE);
  g_checksum_free (backtrace->id);
  g_free (backtrace);
}

const gchar *
_get_id (ArtBacktrace * backtrace)
{
  return g_checksum_get_string (backtrace->id);
}

const gchar *
_get_frames (ArtBacktrace * backtrace)
{
  GArray * frames = backtrace->frames;
  JsonBuilder * b;
  guint i;
  JsonNode * root;

  if (backtrace->frames_json != NULL)
    return backtrace->frames_json;

  b = json_builder_new_immutable ();

  json_builder_begin_array (b);

  for (i = 0; i != frames->len; i++)
  {
    ArtStackFrame * frame = &g_array_index (frames, ArtStackFrame, i);
    gchar * description, * ret_type, * paren_open, * paren_close, * arg_types, * token, * method_name, * class_name;
    GString * signature;
    gchar * cursor;
    ArtMethod * translated_method;
    StdString location;
    gsize dexpc;
    const gchar * source_file;
    gint32 line_number;

    description = std_string_get_data (&frame->description);

    ret_type = strchr (description, '\\'') + 1;

    paren_open = strchr (ret_type, '(');
    paren_close = strchr (paren_open, ')');
    *paren_open = '\\0';
    *paren_close = '\\0';

    arg_types = paren_open + 1;

    token = strrchr (ret_type, '.');
    *token = '\\0';

    method_name = token + 1;

    token = strrchr (ret_type, ' ');
    *token = '\\0';

    class_name = token + 1;

    signature = g_string_sized_new (128);

    append_jni_type_name (signature, class_name, method_name - class_name - 1);
    g_string_append_c (signature, ',');
    g_string_append (signature, method_name);
    g_string_append (signature, ",(");

    if (arg_types != paren_close)
    {
      for (cursor = arg_types; cursor != NULL;)
      {
        gsize length;
        gchar * next;

        token = strstr (cursor, ", ");
        if (token != NULL)
        {
          length = token - cursor;
          next = token + 2;
        }
        else
        {
          length = paren_close - cursor;
          next = NULL;
        }

        append_jni_type_name (signature, cursor, length);

        cursor = next;
      }
    }

    g_string_append_c (signature, ')');

    append_jni_type_name (signature, ret_type, class_name - ret_type - 1);

    translated_method = translate_method (frame->method);
    dexpc = (translated_method == frame->method) ? frame->dexpc : 0;

    get_class_location (&location, GSIZE_TO_POINTER (translated_method->declaring_class));

    translate_location (translated_method, dexpc, &source_file, &line_number);

    json_builder_begin_object (b);

    json_builder_set_member_name (b, "signature");
    json_builder_add_string_value (b, signature->str);

    json_builder_set_member_name (b, "origin");
    json_builder_add_string_value (b, std_string_get_data (&location));

    json_builder_set_member_name (b, "className");
    json_builder_add_string_value (b, class_name);

    json_builder_set_member_name (b, "methodName");
    json_builder_add_string_value (b, method_name);

    json_builder_set_member_name (b, "methodFlags");
    json_builder_add_int_value (b, translated_method->access_flags);

    json_builder_set_member_name (b, "fileName");
    json_builder_add_string_value (b, source_file);

    json_builder_set_member_name (b, "lineNumber");
    json_builder_add_int_value (b, line_number);

    json_builder_end_object (b);

    std_string_destroy (&location);
    g_string_free (signature, TRUE);
  }

  json_builder_end_array (b);

  root = json_builder_get_root (b);
  backtrace->frames_json = json_to_string (root, FALSE);
  json_node_unref (root);

  return backtrace->frames_json;
}

static void
append_jni_type_name (GString * s,
                      const gchar * name,
                      gsize length)
{
  gchar shorty = '\\0';
  gsize i;

  switch (name[0])
  {
    case 'b':
      if (strncmp (name, "boolean", length) == 0)
        shorty = 'Z';
      else if (strncmp (name, "byte", length) == 0)
        shorty = 'B';
      break;
    case 'c':
      if (strncmp (name, "char", length) == 0)
        shorty = 'C';
      break;
    case 'd':
      if (strncmp (name, "double", length) == 0)
        shorty = 'D';
      break;
    case 'f':
      if (strncmp (name, "float", length) == 0)
        shorty = 'F';
      break;
    case 'i':
      if (strncmp (name, "int", length) == 0)
        shorty = 'I';
      break;
    case 'l':
      if (strncmp (name, "long", length) == 0)
        shorty = 'J';
      break;
    case 's':
      if (strncmp (name, "short", length) == 0)
        shorty = 'S';
      break;
    case 'v':
      if (strncmp (name, "void", length) == 0)
        shorty = 'V';
      break;
  }

  if (shorty != '\\0')
  {
    g_string_append_c (s, shorty);

    return;
  }

  if (length > 2 && name[length - 2] == '[' && name[length - 1] == ']')
  {
    g_string_append_c (s, '[');
    append_jni_type_name (s, name, length - 2);

    return;
  }

  g_string_append_c (s, 'L');

  for (i = 0; i != length; i++)
  {
    gchar ch = name[i];
    if (ch != '.')
      g_string_append_c (s, ch);
    else
      g_string_append_c (s, '/');
  }

  g_string_append_c (s, ';');
}

static void
std_string_destroy (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  if (is_large)
    cxx_delete (str->large.data);
}

static gchar *
std_string_get_data (StdString * str)
{
  bool is_large = (str->flags & 1) != 0;
  return is_large ? str->large.data : str->tiny.data;
}
`,{current_backtrace:Memory.alloc(Process.pointerSize),perform_art_thread_state_transition:n,art_make_context:r["art::Thread::GetLongJumpContext"]??r["art::Context::Create"],art_stack_visitor_init:r["art::StackVisitor::StackVisitor"],art_stack_visitor_walk_stack:r["art::StackVisitor::WalkStack"],art_stack_visitor_get_method:r["art::StackVisitor::GetMethod"],art_stack_visitor_describe_location:r["art::StackVisitor::DescribeLocation"],translate_method:artController.replacedMethods.translate,translate_location:r["art::Monitor::TranslateLocation"],get_class_location:r["art::mirror::Class::GetLocation"],cxx_delete:r.$delete,strtoul:Process.getModuleByName("libc.so").getExportByName("strtoul")}),i=new NativeFunction(o._create,"pointer",["pointer","uint"],nativeFunctionOptions3),s=new NativeFunction(o._destroy,"void",["pointer"],nativeFunctionOptions3),l={exceptions:"propagate",scheduling:"exclusive"},a=new NativeFunction(o._get_id,"pointer",["pointer"],l),c=new NativeFunction(o._get_frames,"pointer",["pointer"],l),d=makeArtThreadStateTransitionImpl(t,e,o._on_thread_state_transition_complete);o._performData=d,n.writePointer(d),o.backtrace=(u,h)=>{const _=i(u,h),f=new Backtrace(_);return Script.bindWeak(f,p.bind(null,_)),f};function p(u){s(u)}return o.getId=u=>a(u).readUtf8String(),o.getFrames=u=>JSON.parse(c(u).readUtf8String()),o}var Backtrace=class{constructor(t){this.handle=t}get id(){return backtraceModule.getId(this.handle)}get frames(){return backtraceModule.getFrames(this.handle)}};function revertGlobalPatches(){patchedClasses.forEach(t=>{t.vtablePtr.writePointer(t.vtable),t.vtableCountPtr.writeS32(t.vtableCount)}),patchedClasses.clear();for(const t of artQuickInterceptors.splice(0))t.deactivate();for(const t of inlineHooks.splice(0))t.revert()}function unwrapMethodId(t){return unwrapGenericId(t,"art::jni::JniIdManager::DecodeMethodId")}function unwrapFieldId(t){return unwrapGenericId(t,"art::jni::JniIdManager::DecodeFieldId")}function unwrapGenericId(t,e){const r=getApi(),n=getArtRuntimeSpec(r).offset,o=n.jniIdManager,i=n.jniIdsIndirection;if(o!==null&&i!==null){const s=r.artRuntime;if(s.add(i).readInt()!==kPointer){const a=s.add(o).readPointer();return r[e](a,t)}}return t}var artQuickCodeReplacementTrampolineWriters={ia32:writeArtQuickCodeReplacementTrampolineIA32,x64:writeArtQuickCodeReplacementTrampolineX64,arm:writeArtQuickCodeReplacementTrampolineArm,arm64:writeArtQuickCodeReplacementTrampolineArm64};function writeArtQuickCodeReplacementTrampolineIA32(t,e,r,n,o){const i=getArtThreadSpec(o).offset,s=getArtMethodSpec(o).offset;let l;return Memory.patchCode(t,128,a=>{const c=new X86Writer(a,{pc:t}),d=new X86Relocator(e,c),p=[15,174,4,36],u=[15,174,12,36];c.putPushax(),c.putMovRegReg("ebp","esp"),c.putAndRegU32("esp",4294967280),c.putSubRegImm("esp",512),c.putBytes(p),c.putMovRegFsU32Ptr("ebx",i.self),c.putCallAddressWithAlignedArguments(artController.replacedMethods.findReplacementFromQuickCode,["eax","ebx"]),c.putTestRegReg("eax","eax"),c.putJccShortLabel("je","restore_registers","no-hint"),c.putMovRegOffsetPtrReg("ebp",28,"eax"),c.putLabel("restore_registers"),c.putBytes(u),c.putMovRegReg("esp","ebp"),c.putPopax(),c.putJccShortLabel("jne","invoke_replacement","no-hint");do l=d.readOne();while(l<r&&!d.eoi);d.writeAll(),d.eoi||c.putJmpAddress(e.add(l)),c.putLabel("invoke_replacement"),c.putJmpRegOffsetPtr("eax",s.quickCode),c.flush()}),l}function writeArtQuickCodeReplacementTrampolineX64(t,e,r,n,o){const i=getArtThreadSpec(o).offset,s=getArtMethodSpec(o).offset;let l;return Memory.patchCode(t,256,a=>{const c=new X86Writer(a,{pc:t}),d=new X86Relocator(e,c),p=[15,174,4,36],u=[15,174,12,36];c.putPushax(),c.putMovRegReg("rbp","rsp"),c.putAndRegU32("rsp",4294967280),c.putSubRegImm("rsp",512),c.putBytes(p),c.putMovRegGsU32Ptr("rbx",i.self),c.putCallAddressWithAlignedArguments(artController.replacedMethods.findReplacementFromQuickCode,["rdi","rbx"]),c.putTestRegReg("rax","rax"),c.putJccShortLabel("je","restore_registers","no-hint"),c.putMovRegOffsetPtrReg("rbp",64,"rax"),c.putLabel("restore_registers"),c.putBytes(u),c.putMovRegReg("rsp","rbp"),c.putPopax(),c.putJccShortLabel("jne","invoke_replacement","no-hint");do l=d.readOne();while(l<r&&!d.eoi);d.writeAll(),d.eoi||c.putJmpAddress(e.add(l)),c.putLabel("invoke_replacement"),c.putJmpRegOffsetPtr("rdi",s.quickCode),c.flush()}),l}function writeArtQuickCodeReplacementTrampolineArm(t,e,r,n,o){const i=getArtMethodSpec(o).offset,s=e.and(THUMB_BIT_REMOVAL_MASK);let l;return Memory.patchCode(t,128,a=>{const c=new ThumbWriter(a,{pc:t}),d=new ThumbRelocator(s,c),p=[45,237,16,10],u=[189,236,16,10];c.putPushRegs(["r1","r2","r3","r5","r6","r7","r8","r10","r11","lr"]),c.putBytes(p),c.putSubRegRegImm("sp","sp",8),c.putStrRegRegOffset("r0","sp",0),c.putCallAddressWithArguments(artController.replacedMethods.findReplacementFromQuickCode,["r0","r9"]),c.putCmpRegImm("r0",0),c.putBCondLabel("eq","restore_registers"),c.putStrRegRegOffset("r0","sp",0),c.putLabel("restore_registers"),c.putLdrRegRegOffset("r0","sp",0),c.putAddRegRegImm("sp","sp",8),c.putBytes(u),c.putPopRegs(["lr","r11","r10","r8","r7","r6","r5","r3","r2","r1"]),c.putBCondLabel("ne","invoke_replacement");do l=d.readOne();while(l<r&&!d.eoi);d.writeAll(),d.eoi||c.putLdrRegAddress("pc",e.add(l)),c.putLabel("invoke_replacement"),c.putLdrRegRegOffset("pc","r0",i.quickCode),c.flush()}),l}function writeArtQuickCodeReplacementTrampolineArm64(t,e,r,{availableScratchRegs:n},o){const i=getArtMethodSpec(o).offset;let s;return Memory.patchCode(t,256,l=>{const a=new Arm64Writer(l,{pc:t}),c=new Arm64Relocator(e,a);a.putPushRegReg("d0","d1"),a.putPushRegReg("d2","d3"),a.putPushRegReg("d4","d5"),a.putPushRegReg("d6","d7"),a.putPushRegReg("x1","x2"),a.putPushRegReg("x3","x4"),a.putPushRegReg("x5","x6"),a.putPushRegReg("x7","x20"),a.putPushRegReg("x21","x22"),a.putPushRegReg("x23","x24"),a.putPushRegReg("x25","x26"),a.putPushRegReg("x27","x28"),a.putPushRegReg("x29","lr"),a.putSubRegRegImm("sp","sp",16),a.putStrRegRegOffset("x0","sp",0),a.putCallAddressWithArguments(artController.replacedMethods.findReplacementFromQuickCode,["x0","x19"]),a.putCmpRegReg("x0","xzr"),a.putBCondLabel("eq","restore_registers"),a.putStrRegRegOffset("x0","sp",0),a.putLabel("restore_registers"),a.putLdrRegRegOffset("x0","sp",0),a.putAddRegRegImm("sp","sp",16),a.putPopRegReg("x29","lr"),a.putPopRegReg("x27","x28"),a.putPopRegReg("x25","x26"),a.putPopRegReg("x23","x24"),a.putPopRegReg("x21","x22"),a.putPopRegReg("x7","x20"),a.putPopRegReg("x5","x6"),a.putPopRegReg("x3","x4"),a.putPopRegReg("x1","x2"),a.putPopRegReg("d6","d7"),a.putPopRegReg("d4","d5"),a.putPopRegReg("d2","d3"),a.putPopRegReg("d0","d1"),a.putBCondLabel("ne","invoke_replacement");do s=c.readOne();while(s<r&&!c.eoi);if(c.writeAll(),!c.eoi){const d=Array.from(n)[0];a.putLdrRegAddress(d,e.add(s)),a.putBrReg(d)}a.putLabel("invoke_replacement"),a.putLdrRegRegOffset("x16","x0",i.quickCode),a.putBrReg("x16"),a.flush()}),s}var artQuickCodePrologueWriters={ia32:writeArtQuickCodePrologueX86,x64:writeArtQuickCodePrologueX86,arm:writeArtQuickCodePrologueArm,arm64:writeArtQuickCodePrologueArm64};function writeArtQuickCodePrologueX86(t,e,r){Memory.patchCode(t,16,n=>{const o=new X86Writer(n,{pc:t});o.putJmpAddress(e),o.flush()})}function writeArtQuickCodePrologueArm(t,e,r){const n=t.and(THUMB_BIT_REMOVAL_MASK);Memory.patchCode(n,16,o=>{const i=new ThumbWriter(o,{pc:n});i.putLdrRegAddress("pc",e.or(1)),i.flush()})}function writeArtQuickCodePrologueArm64(t,e,r){Memory.patchCode(t,16,n=>{const o=new Arm64Writer(n,{pc:t});r===16?o.putLdrRegAddress("x16",e):o.putAdrpRegAddress("x16",e),o.putBrReg("x16"),o.flush()})}var artQuickCodeHookRedirectSize={ia32:5,x64:16,arm:8,arm64:16},ArtQuickCodeInterceptor=class{constructor(t){this.quickCode=t,this.quickCodeAddress=Process.arch==="arm"?t.and(THUMB_BIT_REMOVAL_MASK):t,this.redirectSize=0,this.trampoline=null,this.overwrittenPrologue=null,this.overwrittenPrologueLength=0}_canRelocateCode(t,e){const r=thunkWriters[Process.arch],n=thunkRelocators[Process.arch],{quickCodeAddress:o}=this,i=new r(o),s=new n(o,i);let l;if(Process.arch==="arm64"){let a=new Set(["x16","x17"]);do{const c=s.readOne(),d=new Set(a),{read:p,written:u}=s.input.regsAccessed;for(const h of[p,u])for(const _ of h){let f;_.startsWith("w")?f="x"+_.substring(1):f=_,d.delete(f)}if(d.size===0)break;l=c,a=d}while(l<t&&!s.eoi);e.availableScratchRegs=a}else do l=s.readOne();while(l<t&&!s.eoi);return l>=t}_allocateTrampoline(){trampolineAllocator===null&&(trampolineAllocator=makeAllocator(pointerSize5===4?128:256));const t=artQuickCodeHookRedirectSize[Process.arch];let e,r,n=1;const o={};if(pointerSize5===4||this._canRelocateCode(t,o))e=t,r={};else{let i;Process.arch==="x64"?(e=5,i=X86_JMP_MAX_DISTANCE):Process.arch==="arm64"&&(e=8,i=ARM64_ADRP_MAX_DISTANCE,n=4096),r={near:this.quickCodeAddress,maxDistance:i}}return this.redirectSize=e,this.trampoline=trampolineAllocator.allocateSlice(r,n),o}_destroyTrampoline(){trampolineAllocator.freeSlice(this.trampoline)}activate(t){const e=this._allocateTrampoline(),{trampoline:r,quickCode:n,redirectSize:o}=this,i=artQuickCodeReplacementTrampolineWriters[Process.arch],s=i(r,n,o,e,t);this.overwrittenPrologueLength=s,this.overwrittenPrologue=Memory.dup(this.quickCodeAddress,s);const l=artQuickCodePrologueWriters[Process.arch];l(n,r,o)}deactivate(){const{quickCodeAddress:t,overwrittenPrologueLength:e}=this,r=thunkWriters[Process.arch];Memory.patchCode(t,e,n=>{const o=new r(n,{pc:t}),{overwrittenPrologue:i}=this;o.putBytes(i.readByteArray(e)),o.flush()}),this._destroyTrampoline()}};function isArtQuickEntrypoint(t){const e=getApi(),{module:r,artClassLinker:n}=e;return t.equals(n.quickGenericJniTrampoline)||t.equals(n.quickToInterpreterBridgeTrampoline)||t.equals(n.quickResolutionTrampoline)||t.equals(n.quickImtConflictTrampoline)||t.compare(r.base)>=0&&t.compare(r.base.add(r.size))<0}var ArtMethodMangler=class{constructor(t){const e=unwrapMethodId(t);this.methodId=e,this.originalMethod=null,this.hookedMethodId=e,this.replacementMethodId=null,this.interceptor=null}replace(t,e,r,n,o){const{kAccCompileDontBother:i,artNterpEntryPoint:s}=o;this.originalMethod=fetchArtMethod(this.methodId,n);const l=this.originalMethod.accessFlags;if((l&kAccXposedHookedMethod)!==0&&xposedIsSupported()){const u=this.originalMethod.jniCode;this.hookedMethodId=u.add(2*pointerSize5).readPointer(),this.originalMethod=fetchArtMethod(this.hookedMethodId,n)}const{hookedMethodId:a}=this,c=cloneArtMethod(a,n);this.replacementMethodId=c,patchArtMethod(c,{jniCode:t,accessFlags:(l&~(kAccCriticalNative|kAccFastNative|kAccNterpEntryPointFastPathFlag)|kAccNative|i)>>>0,quickCode:o.artClassLinker.quickGenericJniTrampoline,interpreterCode:o.artInterpreterToCompiledCodeBridge},n);let d=kAccFastInterpreterToInterpreterInvoke|kAccSingleImplementation|kAccNterpEntryPointFastPathFlag;(l&kAccNative)===0&&(d|=kAccSkipAccessChecks),patchArtMethod(a,{accessFlags:(l&~d|i)>>>0},n);const p=this.originalMethod.quickCode;if(s!==null&&p.equals(s)&&patchArtMethod(a,{quickCode:o.artQuickToInterpreterBridge},n),!isArtQuickEntrypoint(p)){const u=new ArtQuickCodeInterceptor(p);u.activate(n),this.interceptor=u}artController.replacedMethods.set(a,c),notifyArtMethodHooked(a,n)}revert(t){const{hookedMethodId:e,interceptor:r}=this;patchArtMethod(e,this.originalMethod,t),artController.replacedMethods.delete(e),r!==null&&(r.deactivate(),this.interceptor=null)}resolveTarget(t,e,r,n){return this.hookedMethodId}};function xposedIsSupported(){return getAndroidApiLevel()<28}function fetchArtMethod(t,e){const n=getArtMethodSpec(e).offset;return["jniCode","accessFlags","quickCode","interpreterCode"].reduce((o,i)=>{const s=n[i];if(s===void 0)return o;const l=t.add(s),a=i==="accessFlags"?readU32:readPointer;return o[i]=a.call(l),o},{})}function patchArtMethod(t,e,r){const o=getArtMethodSpec(r).offset;Object.keys(e).forEach(i=>{const s=o[i];if(s===void 0)return;const l=t.add(s);(i==="accessFlags"?writeU32:writePointer).call(l,e[i])})}var DalvikMethodMangler=class{constructor(t){this.methodId=t,this.originalMethod=null}replace(t,e,r,n,o){const{methodId:i}=this;this.originalMethod=Memory.dup(i,DVM_METHOD_SIZE);let s=r.reduce((p,u)=>p+u.size,0);e&&s++;const l=(i.add(DVM_METHOD_OFFSET_ACCESS_FLAGS).readU32()|kAccNative)>>>0,a=s,c=0,d=s;i.add(DVM_METHOD_OFFSET_ACCESS_FLAGS).writeU32(l),i.add(DVM_METHOD_OFFSET_REGISTERS_SIZE).writeU16(a),i.add(DVM_METHOD_OFFSET_OUTS_SIZE).writeU16(c),i.add(DVM_METHOD_OFFSET_INS_SIZE).writeU16(d),i.add(DVM_METHOD_OFFSET_JNI_ARG_INFO).writeU32(computeDalvikJniArgInfo(i)),o.dvmUseJNIBridge(i,t)}revert(t){Memory.copy(this.methodId,this.originalMethod,DVM_METHOD_SIZE)}resolveTarget(t,e,r,n){const o=r.handle.add(DVM_JNI_ENV_OFFSET_SELF).readPointer();let i;if(e)i=n.dvmDecodeIndirectRef(o,t.$h);else{const p=t.$borrowClassHandle(r);i=n.dvmDecodeIndirectRef(o,p.value),p.unref(r)}let s;e?s=i.add(DVM_OBJECT_OFFSET_CLAZZ).readPointer():s=i;const l=s.toString(16);let a=patchedClasses.get(l);if(a===void 0){const p=s.add(DVM_CLASS_OBJECT_OFFSET_VTABLE),u=s.add(DVM_CLASS_OBJECT_OFFSET_VTABLE_COUNT),h=p.readPointer(),_=u.readS32(),f=_*pointerSize5,m=Memory.alloc(2*f);Memory.copy(m,h,f),p.writePointer(m),a={classObject:s,vtablePtr:p,vtableCountPtr:u,vtable:h,vtableCount:_,shadowVtable:m,shadowVtableCount:_,targetMethods:new Map},patchedClasses.set(l,a)}const c=this.methodId.toString(16);let d=a.targetMethods.get(c);if(d===void 0){d=Memory.dup(this.originalMethod,DVM_METHOD_SIZE);const p=a.shadowVtableCount++;a.shadowVtable.add(p*pointerSize5).writePointer(d),d.add(DVM_METHOD_OFFSET_METHOD_INDEX).writeU16(p),a.vtableCountPtr.writeS32(a.shadowVtableCount),a.targetMethods.set(c,d)}return d}};function computeDalvikJniArgInfo(t){if(Process.arch!=="ia32")return DALVIK_JNI_NO_ARG_INFO;const e=t.add(DVM_METHOD_OFFSET_SHORTY).readPointer().readCString();if(e===null||e.length===0||e.length>65535)return DALVIK_JNI_NO_ARG_INFO;let r;switch(e[0]){case"V":r=DALVIK_JNI_RETURN_VOID;break;case"F":r=DALVIK_JNI_RETURN_FLOAT;break;case"D":r=DALVIK_JNI_RETURN_DOUBLE;break;case"J":r=DALVIK_JNI_RETURN_S8;break;case"Z":case"B":r=DALVIK_JNI_RETURN_S1;break;case"C":r=DALVIK_JNI_RETURN_U2;break;case"S":r=DALVIK_JNI_RETURN_S2;break;default:r=DALVIK_JNI_RETURN_S4;break}let n=0;for(let o=e.length-1;o>0;o--){const i=e[o];n+=i==="D"||i==="J"?2:1}return r<<DALVIK_JNI_RETURN_SHIFT|n}function cloneArtMethod(t,e){const r=getApi();if(getAndroidApiLevel()<23){const n=r["art::Thread::CurrentFromGdb"]();return r["art::mirror::Object::Clone"](t,n)}return Memory.dup(t,getArtMethodSpec(e).size)}function deoptimizeMethod(t,e,r){requestDeoptimization(t,e,kSelectiveDeoptimization,r)}function deoptimizeEverything(t,e){requestDeoptimization(t,e,kFullDeoptimization)}function deoptimizeBootImage(t,e){const r=getApi();if(getAndroidApiLevel()<26)throw new Error("This API is only available on Android >= 8.0");withRunnableArtThread(t,e,n=>{r["art::Runtime::DeoptimizeBootImage"](r.artRuntime)})}function requestDeoptimization(t,e,r,n){const o=getApi();if(getAndroidApiLevel()<24)throw new Error("This API is only available on Android >= 7.0");withRunnableArtThread(t,e,i=>{if(getAndroidApiLevel()<30){if(!o.isJdwpStarted()){const l=startJdwp(o);jdwpSessions.push(l)}o.isDebuggerActive()||o["art::Dbg::GoActive"]();const s=Memory.alloc(8+pointerSize5);switch(s.writeU32(r),r){case kFullDeoptimization:break;case kSelectiveDeoptimization:s.add(8).writePointer(n);break;default:throw new Error("Unsupported deoptimization kind")}o["art::Dbg::RequestDeoptimization"](s),o["art::Dbg::ManageDeoptimization"]()}else{const s=o.artInstrumentation;if(s===null)throw new Error("Unable to find Instrumentation class in ART; please file a bug");const l=o["art::Instrumentation::EnableDeoptimization"];switch(l!==void 0&&(s.add(getArtInstrumentationSpec().offset.deoptimizationEnabled).readU8()||l(s)),r){case kFullDeoptimization:o["art::Instrumentation::DeoptimizeEverything"](s,Memory.allocUtf8String("frida"));break;case kSelectiveDeoptimization:o["art::Instrumentation::Deoptimize"](s,n);break;default:throw new Error("Unsupported deoptimization kind")}}})}var JdwpSession=class{constructor(){const t=Process.getModuleByName("libart.so"),e=t.getExportByName("_ZN3art4JDWP12JdwpAdbState6AcceptEv"),r=t.getExportByName("_ZN3art4JDWP12JdwpAdbState15ReceiveClientFdEv"),n=makeSocketPair(),o=makeSocketPair();this._controlFd=n[0],this._clientFd=o[0];let i=null;i=Interceptor.attach(e,function(s){const l=s[0];Memory.scanSync(l.add(8252),256,"00 ff ff ff ff 00")[0].address.add(1).writeS32(n[1]),i.detach()}),Interceptor.replace(r,new NativeCallback(function(s){return Interceptor.revert(r),o[1]},"int",["pointer"])),Interceptor.flush(),this._handshakeRequest=this._performHandshake()}async _performHandshake(){const t=new UnixInputStream(this._clientFd,{autoClose:!1}),e=new UnixOutputStream(this._clientFd,{autoClose:!1}),r=[74,68,87,80,45,72,97,110,100,115,104,97,107,101];try{await e.writeAll(r),await t.readAll(r.length)}catch{}}};function startJdwp(t){const e=new JdwpSession;t["art::Dbg::SetJdwpAllowed"](1);const r=makeJdwpOptions();t["art::Dbg::ConfigureJdwp"](r);const n=t["art::InternalDebuggerControlCallback::StartDebugger"];return n!==void 0?n(NULL):t["art::Dbg::StartJdwp"](),e}function makeJdwpOptions(){const t=getAndroidApiLevel()<28?2:3,e=0,r=t,n=!0,o=!1,i=e,s=8+STD_STRING_SIZE+2,l=Memory.alloc(s);return l.writeU32(r).add(4).writeU8(n?1:0).add(1).writeU8(o?1:0).add(1).add(STD_STRING_SIZE).writeU16(i),l}function makeSocketPair(){socketpair===null&&(socketpair=new NativeFunction(Process.getModuleByName("libc.so").getExportByName("socketpair"),"int",["int","int","int","pointer"]));const t=Memory.alloc(8);if(socketpair(AF_UNIX,SOCK_STREAM,0,t)===-1)throw new Error("Unable to create socketpair for JDWP");return[t.readS32(),t.add(4).readS32()]}function makeAddGlobalRefFallbackForAndroid5(t){const e=getArtVMSpec().offset,r=t.vm.add(e.globalsLock),n=t.vm.add(e.globals),o=t["art::IndirectReferenceTable::Add"],i=t["art::ReaderWriterMutex::ExclusiveLock"],s=t["art::ReaderWriterMutex::ExclusiveUnlock"],l=0;return function(a,c,d){i(r,c);try{return o(n,l,d)}finally{s(r,c)}}}function makeDecodeGlobalFallback(t){const e=t["art::Thread::DecodeJObject"];if(e===void 0)throw new Error("art::Thread::DecodeJObject is not available; please file a bug");return function(r,n,o){return e(n,o)}}var threadStateTransitionRecompilers={ia32:recompileExceptionClearForX86,x64:recompileExceptionClearForX86,arm:recompileExceptionClearForArm,arm64:recompileExceptionClearForArm64};function makeArtThreadStateTransitionImpl(t,e,r){const n=getApi(),o=e.handle.readPointer();let i;const s=n.find("_ZN3art3JNIILb1EE14ExceptionClearEP7_JNIEnv");s!==null?i=s:i=o.add(ENV_VTABLE_OFFSET_EXCEPTION_CLEAR).readPointer();let l;const a=n.find("_ZN3art3JNIILb1EE10FatalErrorEP7_JNIEnvPKc");a!==null?l=a:l=o.add(ENV_VTABLE_OFFSET_FATAL_ERROR).readPointer();const c=threadStateTransitionRecompilers[Process.arch];if(c===void 0)throw new Error("Not yet implemented for "+Process.arch);let d=null;const p=getArtThreadSpec(t).offset,u=p.exception,h=new Set,_=p.isExceptionReportedToInstrumentation;_!==null&&h.add(_);const f=p.throwLocation;f!==null&&(h.add(f),h.add(f+pointerSize5),h.add(f+2*pointerSize5));const m=65536,g=Memory.alloc(m);return Memory.patchCode(g,m,v=>{d=c(v,g,i,l,u,h,r)}),d._code=g,d._callback=r,d}function recompileExceptionClearForX86(t,e,r,n,o,i,s){const l={},a=new Set,c=[r];for(;c.length>0;){let f=c.shift();if(Object.values(l).some(({begin:N,end:M})=>f.compare(N)>=0&&f.compare(M)<0))continue;const g=f.toString();let v={begin:f},A=null,w=!1;do{if(f.equals(n)){w=!0;break}const N=Instruction.parse(f);A=N;const M=l[N.address.toString()];if(M!==void 0){delete l[M.begin.toString()],l[g]=M,M.begin=v.begin,v=null;break}let L=null;switch(N.mnemonic){case"jmp":L=ptr(N.operands[0].value),w=!0;break;case"je":case"jg":case"jle":case"jne":case"js":L=ptr(N.operands[0].value);break;case"ret":w=!0;break}L!==null&&(a.add(L.toString()),c.push(L),c.sort((T,b)=>T.compare(b))),f=N.next}while(!w);v!==null&&(v.end=A.address.add(A.size),l[g]=v)}const d=Object.keys(l).map(f=>l[f]);d.sort((f,m)=>f.begin.compare(m.begin));const p=l[r.toString()];d.splice(d.indexOf(p),1),d.unshift(p);const u=new X86Writer(t,{pc:e});let h=!1,_=null;return d.forEach(f=>{const m=f.end.sub(f.begin).toInt32(),g=new X86Relocator(f.begin,u);let v;for(;(v=g.readOne())!==0;){const A=g.input,{mnemonic:w}=A,N=A.address.toString();a.has(N)&&u.putLabel(N);let M=!0;switch(w){case"jmp":u.putJmpNearLabel(branchLabelFromOperand(A.operands[0])),M=!1;break;case"je":case"jg":case"jle":case"jne":case"js":u.putJccNearLabel(w,branchLabelFromOperand(A.operands[0]),"no-hint"),M=!1;break;case"mov":{const[L,T]=A.operands;if(L.type==="mem"&&T.type==="imm"){const b=L.value,I=b.disp;if(I===o&&T.value.valueOf()===0){if(_=b.base,u.putPushfx(),u.putPushax(),u.putMovRegReg("xbp","xsp"),pointerSize5===4)u.putAndRegU32("esp",4294967280);else{const k=_!=="rdi"?"rdi":"rsi";u.putMovRegU64(k,uint64("0xfffffffffffffff0")),u.putAndRegReg("rsp",k)}u.putCallAddressWithAlignedArguments(s,[_]),u.putMovRegReg("xsp","xbp"),u.putPopax(),u.putPopfx(),h=!0,M=!1}else i.has(I)&&b.base===_&&(M=!1)}break}case"call":{const L=A.operands[0];L.type==="mem"&&L.value.disp===ENV_VTABLE_OFFSET_EXCEPTION_CLEAR&&(pointerSize5===4?(u.putPopReg("eax"),u.putMovRegRegOffsetPtr("eax","eax",4),u.putPushReg("eax")):u.putMovRegRegOffsetPtr("rdi","rdi",8),u.putCallAddressWithArguments(s,[]),h=!0,M=!1);break}}if(M?g.writeAll():g.skipOne(),v===m)break}g.dispose()}),u.dispose(),h||throwThreadStateTransitionParseError(),new NativeFunction(e,"void",["pointer"],nativeFunctionOptions3)}function recompileExceptionClearForArm(t,e,r,n,o,i,s){const l={},a=new Set,c=ptr(1).not(),d=[r];for(;d.length>0;){let g=d.shift();if(Object.values(l).some(({begin:I,end:k})=>g.compare(I)>=0&&g.compare(k)<0))continue;const A=g.and(c),w=A.toString(),N=g.and(1);let M={begin:A},L=null,T=!1,b=0;do{if(g.equals(n)){T=!0;break}const I=Instruction.parse(g),{mnemonic:k}=I;L=I;const j=g.and(c).toString(),P=l[j];if(P!==void 0){delete l[P.begin.toString()],l[w]=P,P.begin=M.begin,M=null;break}const F=b===0;let R=null;switch(k){case"b":R=ptr(I.operands[0].value),T=F;break;case"beq.w":case"beq":case"bne":case"bne.w":case"bgt":R=ptr(I.operands[0].value);break;case"cbz":case"cbnz":R=ptr(I.operands[1].value);break;case"pop.w":F&&(T=I.operands.filter(D=>D.value==="pc").length===1);break}switch(k){case"it":b=1;break;case"itt":b=2;break;case"ittt":b=3;break;case"itttt":b=4;break;default:b>0&&b--;break}R!==null&&(a.add(R.toString()),d.push(R.or(N)),d.sort((D,$)=>D.compare($))),g=I.next}while(!T);M!==null&&(M.end=L.address.add(L.size),l[w]=M)}const p=Object.keys(l).map(g=>l[g]);p.sort((g,v)=>g.begin.compare(v.begin));const u=l[r.and(c).toString()];p.splice(p.indexOf(u),1),p.unshift(u);const h=new ThumbWriter(t,{pc:e});let _=!1,f=null,m=null;return p.forEach(g=>{const v=new ThumbRelocator(g.begin,h);let A=g.begin;const w=g.end;let N=0;do{if(v.readOne()===0)throw new Error("Unexpected end of block");const L=v.input;A=L.address,N=L.size;const{mnemonic:T}=L,b=A.toString();a.has(b)&&h.putLabel(b);let I=!0;switch(T){case"b":h.putBLabel(branchLabelFromOperand(L.operands[0])),I=!1;break;case"beq.w":h.putBCondLabelWide("eq",branchLabelFromOperand(L.operands[0])),I=!1;break;case"bne.w":h.putBCondLabelWide("ne",branchLabelFromOperand(L.operands[0])),I=!1;break;case"beq":case"bne":case"bgt":h.putBCondLabelWide(T.substr(1),branchLabelFromOperand(L.operands[0])),I=!1;break;case"cbz":{const k=L.operands;h.putCbzRegLabel(k[0].value,branchLabelFromOperand(k[1])),I=!1;break}case"cbnz":{const k=L.operands;h.putCbnzRegLabel(k[0].value,branchLabelFromOperand(k[1])),I=!1;break}case"str":case"str.w":{const k=L.operands[1].value,y=k.disp;if(y===o){f=k.base;const j=f!=="r4"?"r4":"r5",P=["r0","r1","r2","r3",j,"r9","r12","lr"];h.putPushRegs(P),h.putMrsRegReg(j,"apsr-nzcvq"),h.putCallAddressWithArguments(s,[f]),h.putMsrRegReg("apsr-nzcvq",j),h.putPopRegs(P),_=!0,I=!1}else i.has(y)&&k.base===f&&(I=!1);break}case"ldr":{const[k,y]=L.operands;if(y.type==="mem"){const j=y.value;j.base[0]==="r"&&j.disp===ENV_VTABLE_OFFSET_EXCEPTION_CLEAR&&(m=k.value)}break}case"blx":L.operands[0].value===m&&(h.putLdrRegRegOffset("r0","r0",4),h.putCallAddressWithArguments(s,["r0"]),_=!0,m=null,I=!1);break}I?v.writeAll():v.skipOne()}while(!A.add(N).equals(w));v.dispose()}),h.dispose(),_||throwThreadStateTransitionParseError(),new NativeFunction(e.or(1),"void",["pointer"],nativeFunctionOptions3)}function recompileExceptionClearForArm64(t,e,r,n,o,i,s){const l={},a=new Set,c=[r];for(;c.length>0;){let g=c.shift();if(Object.values(l).some(({begin:L,end:T})=>g.compare(L)>=0&&g.compare(T)<0))continue;const A=g.toString();let w={begin:g},N=null,M=!1;do{if(g.equals(n)){M=!0;break}let L;try{L=Instruction.parse(g)}catch(I){if(g.readU32()===0){M=!0;break}else throw I}N=L;const T=l[L.address.toString()];if(T!==void 0){delete l[T.begin.toString()],l[A]=T,T.begin=w.begin,w=null;break}let b=null;switch(L.mnemonic){case"b":b=ptr(L.operands[0].value),M=!0;break;case"b.eq":case"b.ne":case"b.le":case"b.gt":b=ptr(L.operands[0].value);break;case"cbz":case"cbnz":b=ptr(L.operands[1].value);break;case"tbz":case"tbnz":b=ptr(L.operands[2].value);break;case"ret":M=!0;break}b!==null&&(a.add(b.toString()),c.push(b),c.sort((I,k)=>I.compare(k))),g=L.next}while(!M);w!==null&&(w.end=N.address.add(N.size),l[A]=w)}const d=Object.keys(l).map(g=>l[g]);d.sort((g,v)=>g.begin.compare(v.begin));const p=l[r.toString()];d.splice(d.indexOf(p),1),d.unshift(p);const u=new Arm64Writer(t,{pc:e});u.putBLabel("performTransition");const h=e.add(u.offset);u.putPushAllXRegisters(),u.putCallAddressWithArguments(s,["x0"]),u.putPopAllXRegisters(),u.putRet(),u.putLabel("performTransition");let _=!1,f=null,m=null;return d.forEach(g=>{const v=g.end.sub(g.begin).toInt32(),A=new Arm64Relocator(g.begin,u);let w;for(;(w=A.readOne())!==0;){const N=A.input,{mnemonic:M}=N,L=N.address.toString();a.has(L)&&u.putLabel(L);let T=!0;switch(M){case"b":u.putBLabel(branchLabelFromOperand(N.operands[0])),T=!1;break;case"b.eq":case"b.ne":case"b.le":case"b.gt":u.putBCondLabel(M.substr(2),branchLabelFromOperand(N.operands[0])),T=!1;break;case"cbz":{const b=N.operands;u.putCbzRegLabel(b[0].value,branchLabelFromOperand(b[1])),T=!1;break}case"cbnz":{const b=N.operands;u.putCbnzRegLabel(b[0].value,branchLabelFromOperand(b[1])),T=!1;break}case"tbz":{const b=N.operands;u.putTbzRegImmLabel(b[0].value,b[1].value.valueOf(),branchLabelFromOperand(b[2])),T=!1;break}case"tbnz":{const b=N.operands;u.putTbnzRegImmLabel(b[0].value,b[1].value.valueOf(),branchLabelFromOperand(b[2])),T=!1;break}case"str":{const b=N.operands,I=b[0].value,k=b[1].value,y=k.disp;I==="xzr"&&y===o?(f=k.base,u.putPushRegReg("x0","lr"),u.putMovRegReg("x0",f),u.putBlImm(h),u.putPopRegReg("x0","lr"),_=!0,T=!1):i.has(y)&&k.base===f&&(T=!1);break}case"ldr":{const b=N.operands,I=b[1].value;I.base[0]==="x"&&I.disp===ENV_VTABLE_OFFSET_EXCEPTION_CLEAR&&(m=b[0].value);break}case"blr":N.operands[0].value===m&&(u.putLdrRegRegOffset("x0","x0",8),u.putCallAddressWithArguments(s,["x0"]),_=!0,m=null,T=!1);break}if(T?A.writeAll():A.skipOne(),w===v)break}A.dispose()}),u.dispose(),_||throwThreadStateTransitionParseError(),new NativeFunction(e,"void",["pointer"],nativeFunctionOptions3)}function throwThreadStateTransitionParseError(){throw new Error("Unable to parse ART internals; please file a bug")}function fixupArtQuickDeliverExceptionBug(t){const e=t["art::ArtMethod::PrettyMethod"];e!==void 0&&(Interceptor.attach(e.impl,artController.hooks.ArtMethod.prettyMethod),Interceptor.flush())}function branchLabelFromOperand(t){return ptr(t.value).toString()}function makeCxxMethodWrapperReturningPointerByValueGeneric(t,e){return new NativeFunction(t,"pointer",e,nativeFunctionOptions3)}function makeCxxMethodWrapperReturningPointerByValueInFirstArg(t,e){const r=new NativeFunction(t,"void",["pointer"].concat(e),nativeFunctionOptions3);return function(){const n=Memory.alloc(pointerSize5);return r(n,...arguments),n.readPointer()}}function makeCxxMethodWrapperReturningStdStringByValue(t,e){const{arch:r}=Process;switch(r){case"ia32":case"arm64":{let n;r==="ia32"?n=makeThunk(64,s=>{const l=1+e.length,a=l*4;s.putSubRegImm("esp",a);for(let c=0;c!==l;c++){const d=c*4;s.putMovRegRegOffsetPtr("eax","esp",a+4+d),s.putMovRegOffsetPtrReg("esp",d,"eax")}s.putCallAddress(t),s.putAddRegImm("esp",a-4),s.putRet()}):n=makeThunk(32,s=>{s.putMovRegReg("x8","x0"),e.forEach((l,a)=>{s.putMovRegReg("x"+a,"x"+(a+1))}),s.putLdrRegAddress("x7",t),s.putBrReg("x7")});const o=new NativeFunction(n,"void",["pointer"].concat(e),nativeFunctionOptions3),i=function(...s){o(...s)};return i.handle=n,i.impl=t,i}default:{const n=new NativeFunction(t,"void",["pointer"].concat(e),nativeFunctionOptions3);return n.impl=t,n}}}var StdString=class{constructor(){this.handle=Memory.alloc(STD_STRING_SIZE)}dispose(){const[t,e]=this._getData();e||getApi().$delete(t)}disposeToString(){const t=this.toString();return this.dispose(),t}toString(){const[t]=this._getData();return t.readUtf8String()}_getData(){const t=this.handle,e=(t.readU8()&1)===0;return[e?t.add(1):t.add(2*pointerSize5).readPointer(),e]}},StdVector=class{$delete(){this.dispose(),getApi().$delete(this)}constructor(t,e){this.handle=t,this._begin=t,this._end=t.add(pointerSize5),this._storage=t.add(2*pointerSize5),this._elementSize=e}init(){this.begin=NULL,this.end=NULL,this.storage=NULL}dispose(){getApi().$delete(this.begin)}get begin(){return this._begin.readPointer()}set begin(t){this._begin.writePointer(t)}get end(){return this._end.readPointer()}set end(t){this._end.writePointer(t)}get storage(){return this._storage.readPointer()}set storage(t){this._storage.writePointer(t)}get size(){return this.end.sub(this.begin).toInt32()/this._elementSize}},HandleVector=class ae extends StdVector{static $new(){const e=new ae(getApi().$new(STD_VECTOR_SIZE));return e.init(),e}constructor(e){super(e,pointerSize5)}get handles(){const e=[];let r=this.begin;const n=this.end;for(;!r.equals(n);)e.push(r.readPointer()),r=r.add(pointerSize5);return e}},BHS_OFFSET_LINK=0,BHS_OFFSET_NUM_REFS=pointerSize5,BHS_SIZE=BHS_OFFSET_NUM_REFS+4,kNumReferencesVariableSized=-1,BaseHandleScope=class le{$delete(){this.dispose(),getApi().$delete(this)}constructor(e){this.handle=e,this._link=e.add(BHS_OFFSET_LINK),this._numberOfReferences=e.add(BHS_OFFSET_NUM_REFS)}init(e,r){this.link=e,this.numberOfReferences=r}dispose(){}get link(){return new le(this._link.readPointer())}set link(e){this._link.writePointer(e)}get numberOfReferences(){return this._numberOfReferences.readS32()}set numberOfReferences(e){this._numberOfReferences.writeS32(e)}},VSHS_OFFSET_SELF=alignPointerOffset(BHS_SIZE),VSHS_OFFSET_CURRENT_SCOPE=VSHS_OFFSET_SELF+pointerSize5,VSHS_SIZE=VSHS_OFFSET_CURRENT_SCOPE+pointerSize5,VariableSizedHandleScope=class ce extends BaseHandleScope{static $new(e,r){const n=new ce(getApi().$new(VSHS_SIZE));return n.init(e,r),n}constructor(e){super(e),this._self=e.add(VSHS_OFFSET_SELF),this._currentScope=e.add(VSHS_OFFSET_CURRENT_SCOPE);const o=(64-pointerSize5-4-4)/4;this._scopeLayout=FixedSizeHandleScope.layoutForCapacity(o),this._topHandleScopePtr=null}init(e,r){const n=e.add(getArtThreadSpec(r).offset.topHandleScope);this._topHandleScopePtr=n,super.init(n.readPointer(),kNumReferencesVariableSized),this.self=e,this.currentScope=FixedSizeHandleScope.$new(this._scopeLayout),n.writePointer(this)}dispose(){this._topHandleScopePtr.writePointer(this.link);let e;for(;(e=this.currentScope)!==null;){const r=e.link;e.$delete(),this.currentScope=r}}get self(){return this._self.readPointer()}set self(e){this._self.writePointer(e)}get currentScope(){const e=this._currentScope.readPointer();return e.isNull()?null:new FixedSizeHandleScope(e,this._scopeLayout)}set currentScope(e){this._currentScope.writePointer(e)}newHandle(e){return this.currentScope.newHandle(e)}},FixedSizeHandleScope=class de extends BaseHandleScope{static $new(e){const r=new de(getApi().$new(e.size),e);return r.init(),r}constructor(e,r){super(e);const{offset:n}=r;this._refsStorage=e.add(n.refsStorage),this._pos=e.add(n.pos),this._layout=r}init(){super.init(NULL,this._layout.numberOfReferences),this.pos=0}get pos(){return this._pos.readU32()}set pos(e){this._pos.writeU32(e)}newHandle(e){const r=this.pos,n=this._refsStorage.add(r*4);return n.writeS32(e.toInt32()),this.pos=r+1,n}static layoutForCapacity(e){const r=BHS_SIZE,n=r+e*4;return{size:n+4,numberOfReferences:e,offset:{refsStorage:r,pos:n}}}},objectVisitorPredicateFactories={arm:function(t,e){const r=Process.pageSize,n=Memory.alloc(r);Memory.protect(n,r,"rwx");const o=new NativeCallback(e,"void",["pointer"]);n._onMatchCallback=o;const i=[26625,18947,17041,53505,19202,18200,18288,48896],s=i.length*2,l=s+4,a=l+4;return Memory.patchCode(n,a,function(c){i.forEach((d,p)=>{c.add(p*2).writeU16(d)}),c.add(s).writeS32(t),c.add(l).writePointer(o)}),n.or(1)},arm64:function(t,e){const r=Process.pageSize,n=Memory.alloc(r);Memory.protect(n,r,"rwx");const o=new NativeCallback(e,"void",["pointer"]);n._onMatchCallback=o;const i=[3107979265,402653378,1795293247,1409286241,1476395139,3592355936,3596551104],s=i.length*4,l=s+4,a=l+8;return Memory.patchCode(n,a,function(c){i.forEach((d,p)=>{c.add(p*4).writeU32(d)}),c.add(s).writeS32(t),c.add(l).writePointer(o)}),n}};function makeObjectVisitorPredicate(t,e){return(objectVisitorPredicateFactories[Process.arch]||makeGenericObjectVisitorPredicate)(t,e)}function makeGenericObjectVisitorPredicate(t,e){return new NativeCallback(r=>{r.readS32()===t&&e(r)},"void",["pointer","pointer"])}function alignPointerOffset(t){const e=t%pointerSize5;return e!==0?t+pointerSize5-e:t}var jsizeSize2=4,{pointerSize:pointerSize6}=Process,JVM_ACC_NATIVE=256,JVM_ACC_IS_OLD=65536,JVM_ACC_IS_OBSOLETE=131072,JVM_ACC_NOT_C2_COMPILABLE=33554432,JVM_ACC_NOT_C1_COMPILABLE=67108864,JVM_ACC_NOT_C2_OSR_COMPILABLE=134217728,nativeFunctionOptions4={exceptions:"propagate"},getJvmMethodSpec=memoize(_getJvmMethodSpec),getJvmInstanceKlassSpec=memoize(_getJvmInstanceKlassSpec),getJvmThreadSpec=memoize(_getJvmThreadSpec),cachedApi2=null,manglersScheduled=!1,replaceManglers=new Map,revertManglers=new Map;function getApi2(){return cachedApi2===null&&(cachedApi2=_getApi2()),cachedApi2}function _getApi2(){const t=Process.enumerateModules().filter(a=>/jvm.(dll|dylib|so)$/.test(a.name));if(t.length===0)return null;const e=t[0],r={flavor:"jvm"},n=Process.platform==="windows"?[{module:e,functions:{JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]],JVM_Sleep:["JVM_Sleep","void",["pointer","pointer","long"]],"VMThread::execute":["VMThread::execute","void",["pointer"]],"Method::size":["Method::size","int",["int"]],"Method::set_native_function":["Method::set_native_function","void",["pointer","pointer","int"]],"Method::clear_native_function":["Method::clear_native_function","void",["pointer"]],"Method::jmethod_id":["Method::jmethod_id","pointer",["pointer"]],"ClassLoaderDataGraph::classes_do":["ClassLoaderDataGraph::classes_do","void",["pointer"]],"NMethodSweeper::sweep_code_cache":["NMethodSweeper::sweep_code_cache","void",[]],"OopMapCache::flush_obsolete_entries":["OopMapCache::flush_obsolete_entries","void",["pointer"]]},variables:{"VM_RedefineClasses::`vftable'":function(a){this.vtableRedefineClasses=a},"VM_RedefineClasses::doit":function(a){this.redefineClassesDoIt=a},"VM_RedefineClasses::doit_prologue":function(a){this.redefineClassesDoItPrologue=a},"VM_RedefineClasses::doit_epilogue":function(a){this.redefineClassesDoItEpilogue=a},"VM_RedefineClasses::allow_nested_vm_operations":function(a){this.redefineClassesAllow=a},"NMethodSweeper::_traversals":function(a){this.traversals=a},"NMethodSweeper::_should_sweep":function(a){this.shouldSweep=a}},optionals:[]}]:[{module:e,functions:{JNI_GetCreatedJavaVMs:["JNI_GetCreatedJavaVMs","int",["pointer","int","pointer"]],_ZN6Method4sizeEb:["Method::size","int",["int"]],_ZN6Method19set_native_functionEPhb:["Method::set_native_function","void",["pointer","pointer","int"]],_ZN6Method21clear_native_functionEv:["Method::clear_native_function","void",["pointer"]],_ZN6Method24restore_unshareable_infoEP10JavaThread:["Method::restore_unshareable_info","void",["pointer","pointer"]],_ZN6Method24restore_unshareable_infoEP6Thread:["Method::restore_unshareable_info","void",["pointer","pointer"]],_ZN6Method11link_methodERK12methodHandleP10JavaThread:["Method::link_method","void",["pointer","pointer","pointer"]],_ZN6Method10jmethod_idEv:["Method::jmethod_id","pointer",["pointer"]],_ZN6Method10clear_codeEv:function(a){const c=new NativeFunction(a,"void",["pointer"],nativeFunctionOptions4);this["Method::clear_code"]=function(d){c(d)}},_ZN6Method10clear_codeEb:function(a){const c=new NativeFunction(a,"void",["pointer","int"],nativeFunctionOptions4),d=0;this["Method::clear_code"]=function(p){c(p,d)}},_ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass:["VM_RedefineClasses::mark_dependent_code","void",["pointer","pointer"]],_ZN18VM_RedefineClasses20flush_dependent_codeEv:["VM_RedefineClasses::flush_dependent_code","void",[]],_ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread:["VM_RedefineClasses::flush_dependent_code","void",["pointer","pointer","pointer"]],_ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread:["VM_RedefineClasses::flush_dependent_code","void",["pointer","pointer","pointer"]],_ZN19ResolvedMethodTable21adjust_method_entriesEPb:["ResolvedMethodTable::adjust_method_entries","void",["pointer"]],_ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb:["MemberNameTable::adjust_method_entries","void",["pointer","pointer","pointer"]],_ZN17ConstantPoolCache21adjust_method_entriesEPb:function(a){const c=new NativeFunction(a,"void",["pointer","pointer"],nativeFunctionOptions4);this["ConstantPoolCache::adjust_method_entries"]=function(d,p,u){c(d,u)}},_ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb:function(a){const c=new NativeFunction(a,"void",["pointer","pointer","pointer"],nativeFunctionOptions4);this["ConstantPoolCache::adjust_method_entries"]=function(d,p,u){c(d,p,u)}},_ZN20ClassLoaderDataGraph10classes_doEP12KlassClosure:["ClassLoaderDataGraph::classes_do","void",["pointer"]],_ZN20ClassLoaderDataGraph22clean_deallocate_listsEb:["ClassLoaderDataGraph::clean_deallocate_lists","void",["int"]],_ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_:["JavaThread::thread_from_jni_environment","pointer",["pointer"]],_ZN8VMThread7executeEP12VM_Operation:["VMThread::execute","void",["pointer"]],_ZN11OopMapCache22flush_obsolete_entriesEv:["OopMapCache::flush_obsolete_entries","void",["pointer"]],_ZN14NMethodSweeper11force_sweepEv:["NMethodSweeper::force_sweep","void",[]],_ZN14NMethodSweeper16sweep_code_cacheEv:["NMethodSweeper::sweep_code_cache","void",[]],_ZN14NMethodSweeper17sweep_in_progressEv:["NMethodSweeper::sweep_in_progress","bool",[]],JVM_Sleep:["JVM_Sleep","void",["pointer","pointer","long"]]},variables:{_ZN18VM_RedefineClasses14_the_class_oopE:function(a){this.redefineClass=a},_ZN18VM_RedefineClasses10_the_classE:function(a){this.redefineClass=a},_ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass:function(a){this.doKlass=a},_ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass:function(a){this.doKlass=a},_ZTV18VM_RedefineClasses:function(a){this.vtableRedefineClasses=a},_ZN18VM_RedefineClasses4doitEv:function(a){this.redefineClassesDoIt=a},_ZN18VM_RedefineClasses13doit_prologueEv:function(a){this.redefineClassesDoItPrologue=a},_ZN18VM_RedefineClasses13doit_epilogueEv:function(a){this.redefineClassesDoItEpilogue=a},_ZN18VM_RedefineClassesD0Ev:function(a){this.redefineClassesDispose0=a},_ZN18VM_RedefineClassesD1Ev:function(a){this.redefineClassesDispose1=a},_ZNK18VM_RedefineClasses26allow_nested_vm_operationsEv:function(a){this.redefineClassesAllow=a},_ZNK18VM_RedefineClasses14print_on_errorEP12outputStream:function(a){this.redefineClassesOnError=a},_ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread:function(a){this.createNewDefaultVtableIndices=a},_ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread:function(a){this.createNewDefaultVtableIndices=a},_ZN19Abstract_VM_Version19jre_release_versionEv:function(a){const d=new NativeFunction(a,"pointer",[],nativeFunctionOptions4)().readCString();this.version=d.startsWith("1.8")?8:d.startsWith("9.")?9:parseInt(d.slice(0,2),10),this.versionS=d},_ZN14NMethodSweeper11_traversalsE:function(a){this.traversals=a},_ZN14NMethodSweeper21_sweep_fractions_leftE:function(a){this.fractions=a},_ZN14NMethodSweeper13_should_sweepE:function(a){this.shouldSweep=a}},optionals:["_ZN6Method24restore_unshareable_infoEP10JavaThread","_ZN6Method24restore_unshareable_infoEP6Thread","_ZN6Method11link_methodERK12methodHandleP10JavaThread","_ZN6Method10clear_codeEv","_ZN6Method10clear_codeEb","_ZN18VM_RedefineClasses19mark_dependent_codeEP13InstanceKlass","_ZN18VM_RedefineClasses20flush_dependent_codeEv","_ZN18VM_RedefineClasses20flush_dependent_codeEP13InstanceKlassP6Thread","_ZN18VM_RedefineClasses20flush_dependent_codeE19instanceKlassHandleP6Thread","_ZN19ResolvedMethodTable21adjust_method_entriesEPb","_ZN15MemberNameTable21adjust_method_entriesEP13InstanceKlassPb","_ZN17ConstantPoolCache21adjust_method_entriesEPb","_ZN17ConstantPoolCache21adjust_method_entriesEP13InstanceKlassPb","_ZN20ClassLoaderDataGraph22clean_deallocate_listsEb","_ZN10JavaThread27thread_from_jni_environmentEP7JNIEnv_","_ZN14NMethodSweeper11force_sweepEv","_ZN14NMethodSweeper17sweep_in_progressEv","_ZN18VM_RedefineClasses14_the_class_oopE","_ZN18VM_RedefineClasses10_the_classE","_ZN18VM_RedefineClasses25AdjustCpoolCacheAndVtable8do_klassEP5Klass","_ZN18VM_RedefineClasses22AdjustAndCleanMetadata8do_klassEP5Klass","_ZN18VM_RedefineClassesD0Ev","_ZN18VM_RedefineClassesD1Ev","_ZNK18VM_RedefineClasses14print_on_errorEP12outputStream","_ZN13InstanceKlass33create_new_default_vtable_indicesEiP10JavaThread","_ZN13InstanceKlass33create_new_default_vtable_indicesEiP6Thread","_ZN14NMethodSweeper21_sweep_fractions_leftE"]}],o=[];if(n.forEach(function(a){const c=a.module,d=a.functions||{},p=a.variables||{},u=new Set(a.optionals||[]),h=c.enumerateExports().reduce(function(f,m){return f[m.name]=m,f},{}),_=c.enumerateSymbols().reduce(function(f,m){return f[m.name]=m,f},h);Object.keys(d).forEach(function(f){const m=_[f];if(m!==void 0){const g=d[f];typeof g=="function"?g.call(r,m.address):r[g[0]]=new NativeFunction(m.address,g[1],g[2],nativeFunctionOptions4)}else u.has(f)||o.push(f)}),Object.keys(p).forEach(function(f){const m=_[f];m!==void 0?p[f].call(r,m.address):u.has(f)||o.push(f)})}),o.length>0)throw new Error("Java API only partially available; please file a bug. Missing: "+o.join(", "));const i=Memory.alloc(pointerSize6),s=Memory.alloc(jsizeSize2);if(checkJniResult("JNI_GetCreatedJavaVMs",r.JNI_GetCreatedJavaVMs(i,1,s)),s.readInt()===0)return null;r.vm=i.readPointer();const l=Process.platform==="windows"?{$new:["??2@YAPEAX_K@Z","pointer",["ulong"]],$delete:["??3@YAXPEAX@Z","void",["pointer"]]}:{$new:["_Znwm","pointer",["ulong"]],$delete:["_ZdlPv","void",["pointer"]]};for(const[a,[c,d,p]]of Object.entries(l)){let u=Module.findGlobalExportByName(c);if(u===null&&(u=DebugSymbol.fromName(c).address,u.isNull()))throw new Error(`unable to find C++ allocator API, missing: '${c}'`);r[a]=new NativeFunction(u,d,p,nativeFunctionOptions4)}return r.jvmti=getEnvJvmti(r),r["JavaThread::thread_from_jni_environment"]===void 0&&(r["JavaThread::thread_from_jni_environment"]=makeThreadFromJniHelper(r)),r}function getEnvJvmti(t){const e=new VM(t);let r;return e.perform(()=>{const n=e.tryGetEnvHandle(jvmtiVersion.v1_0);if(n===null)throw new Error("JVMTI not available");r=new EnvJvmti(n,e);const o=Memory.alloc(8);o.writeU64(jvmtiCapabilities.canTagObjects);const i=r.addCapabilities(o);checkJniResult("getEnvJvmti::AddCapabilities",i)}),r}var threadOffsetParsers={x64:parseX64ThreadOffset};function makeThreadFromJniHelper(t){let e=null;const r=threadOffsetParsers[Process.arch];if(r!==void 0){const o=new VM(t).perform(i=>i.handle.readPointer().add(6*pointerSize6).readPointer());e=parseInstructionsAt(o,r,{limit:11})}return e===null?()=>{throw new Error("Unable to make thread_from_jni_environment() helper for the current architecture")}:n=>n.add(e)}function parseX64ThreadOffset(t){if(t.mnemonic!=="lea")return null;const{base:e,disp:r}=t.operands[1].value;return e==="rdi"&&r<0?r:null}function ensureClassInitialized2(t,e){}var JvmMethodMangler=class{constructor(t){this.methodId=t,this.method=t.readPointer(),this.originalMethod=null,this.newMethod=null,this.resolved=null,this.impl=null,this.key=t.toString(16)}replace(t,e,r,n,o){const{key:i}=this,s=revertManglers.get(i);s!==void 0&&(revertManglers.delete(i),this.method=s.method,this.originalMethod=s.originalMethod,this.newMethod=s.newMethod,this.resolved=s.resolved),this.impl=t,replaceManglers.set(i,this),ensureManglersScheduled(n)}revert(t){const{key:e}=this;replaceManglers.delete(e),revertManglers.set(e,this),ensureManglersScheduled(t)}resolveTarget(t,e,r,n){const{resolved:o,originalMethod:i,methodId:s}=this;if(o!==null)return o;if(i===null)return s;i.oldMethod.vtableIndexPtr.writeS32(-2);const a=Memory.alloc(pointerSize6);return a.writePointer(this.method),this.resolved=a,a}};function ensureManglersScheduled(t){manglersScheduled||(manglersScheduled=!0,Script.nextTick(doManglers,t))}function doManglers(t){const e=new Map(replaceManglers),r=new Map(revertManglers);replaceManglers.clear(),revertManglers.clear(),manglersScheduled=!1,t.perform(n=>{const o=getApi2(),i=o["JavaThread::thread_from_jni_environment"](n.handle);let s=!1;withJvmThread(()=>{e.forEach(l=>{const{method:a,originalMethod:c,impl:d,methodId:p,newMethod:u}=l;c===null?(l.originalMethod=fetchJvmMethod(a),l.newMethod=nativeJvmMethod(a,d,i),installJvmMethod(l.newMethod,p,i)):o["Method::set_native_function"](u.method,d,0)}),r.forEach(l=>{const{originalMethod:a,methodId:c,newMethod:d}=l;if(a!==null){revertJvmMethod(a);const p=a.oldMethod;p.oldMethod=d,installJvmMethod(p,c,i),s=!0}})}),s&&forceSweep(n.handle)})}function forceSweep(t){const{fractions:e,shouldSweep:r,traversals:n,"NMethodSweeper::sweep_code_cache":o,"NMethodSweeper::sweep_in_progress":i,"NMethodSweeper::force_sweep":s,JVM_Sleep:l}=getApi2();if(s!==void 0)Thread.sleep(.05),s(),Thread.sleep(.05),s();else{let a=n.readS64();const c=a+2;for(;c>a;)e.writeS32(1),l(t,NULL,50),i()||withJvmThread(()=>{Thread.sleep(.05)}),r.readU8()===0&&(e.writeS32(1),o()),a=n.readS64()}}function withJvmThread(t,e,r){const{execute:n,vtable:o,vtableSize:i,doItOffset:s,prologueOffset:l,epilogueOffset:a}=getJvmThreadSpec(),c=Memory.dup(o,i),d=Memory.alloc(pointerSize6*25);d.writePointer(c);const p=new NativeCallback(t,"void",["pointer"]);c.add(s).writePointer(p);let u=null;e!==void 0&&(u=new NativeCallback(e,"int",["pointer"]),c.add(l).writePointer(u));let h=null;r!==void 0&&(h=new NativeCallback(r,"void",["pointer"]),c.add(a).writePointer(h)),n(d)}function _getJvmThreadSpec(){const{vtableRedefineClasses:t,redefineClassesDoIt:e,redefineClassesDoItPrologue:r,redefineClassesDoItEpilogue:n,redefineClassesOnError:o,redefineClassesAllow:i,redefineClassesDispose0:s,redefineClassesDispose1:l,"VMThread::execute":a}=getApi2(),c=t.add(2*pointerSize6),d=15*pointerSize6,p=Memory.dup(c,d),u=new NativeCallback(()=>{},"void",["pointer"]);let h,_,f;for(let m=0;m!==d;m+=pointerSize6){const g=p.add(m),v=g.readPointer();o!==void 0&&v.equals(o)||s!==void 0&&v.equals(s)||l!==void 0&&v.equals(l)?g.writePointer(u):v.equals(e)?h=m:v.equals(r)?(_=m,g.writePointer(i)):v.equals(n)&&(f=m,g.writePointer(u))}return{execute:a,emptyCallback:u,vtable:p,vtableSize:d,doItOffset:h,prologueOffset:_,epilogueOffset:f}}function makeMethodMangler2(t){return new JvmMethodMangler(t)}function installJvmMethod(t,e,r){const{method:n,oldMethod:o}=t,i=getApi2();t.methodsArray.add(t.methodIndex*pointerSize6).writePointer(n),t.vtableIndex>=0&&t.vtable.add(t.vtableIndex*pointerSize6).writePointer(n),e.writePointer(n),o.accessFlagsPtr.writeU32((o.accessFlags|JVM_ACC_IS_OLD|JVM_ACC_IS_OBSOLETE)>>>0);const s=i["OopMapCache::flush_obsolete_entries"];if(s!==void 0){const{oopMapCache:_}=t;_.isNull()||s(_)}const l=i["VM_RedefineClasses::mark_dependent_code"],a=i["VM_RedefineClasses::flush_dependent_code"];l!==void 0?(l(NULL,t.instanceKlass),a()):a(NULL,t.instanceKlass,r);const c=Memory.alloc(1);c.writeU8(1),i["ConstantPoolCache::adjust_method_entries"](t.cache,t.instanceKlass,c);const d=Memory.alloc(3*pointerSize6),p=Memory.alloc(pointerSize6);p.writePointer(i.doKlass),d.writePointer(p),d.add(pointerSize6).writePointer(r),d.add(2*pointerSize6).writePointer(r),i.redefineClass!==void 0&&i.redefineClass.writePointer(t.instanceKlass),i["ClassLoaderDataGraph::classes_do"](d);const u=i["ResolvedMethodTable::adjust_method_entries"];if(u!==void 0)u(c);else{const{memberNames:_}=t;if(!_.isNull()){const f=i["MemberNameTable::adjust_method_entries"];f!==void 0&&f(_,t.instanceKlass,c)}}const h=i["ClassLoaderDataGraph::clean_deallocate_lists"];h!==void 0&&h(0)}function nativeJvmMethod(t,e,r){const n=getApi2(),o=fetchJvmMethod(t);o.constPtr.writePointer(o.const);const i=(o.accessFlags|JVM_ACC_NATIVE|JVM_ACC_NOT_C2_COMPILABLE|JVM_ACC_NOT_C1_COMPILABLE|JVM_ACC_NOT_C2_OSR_COMPILABLE)>>>0;if(o.accessFlagsPtr.writeU32(i),o.signatureHandler.writePointer(NULL),o.adapter.writePointer(NULL),o.i2iEntry.writePointer(NULL),n["Method::clear_code"](o.method),o.dataPtr.writePointer(NULL),o.countersPtr.writePointer(NULL),o.stackmapPtr.writePointer(NULL),n["Method::clear_native_function"](o.method),n["Method::set_native_function"](o.method,e,0),n["Method::restore_unshareable_info"](o.method,r),n.version>=17){const s=Memory.alloc(2*pointerSize6);s.writePointer(o.method),s.add(pointerSize6).writePointer(r),n["Method::link_method"](o.method,s,r)}return o}function fetchJvmMethod(t){const e=getJvmMethodSpec(),r=t.add(e.method.constMethodOffset).readPointer(),n=r.add(e.constMethod.sizeOffset).readS32()*pointerSize6,o=Memory.alloc(n+e.method.size);Memory.copy(o,r,n);const i=o.add(n);Memory.copy(i,t,e.method.size);const s=readJvmMethod(i,o,n),l=readJvmMethod(t,r,n);return s.oldMethod=l,s}function readJvmMethod(t,e,r){const n=getApi2(),o=getJvmMethodSpec(),i=t.add(o.method.constMethodOffset),s=t.add(o.method.methodDataOffset),l=t.add(o.method.methodCountersOffset),a=t.add(o.method.accessFlagsOffset),c=a.readU32(),d=o.getAdapterPointer(t,e),p=t.add(o.method.i2iEntryOffset),u=t.add(o.method.signatureHandlerOffset),h=e.add(o.constMethod.constantPoolOffset).readPointer(),_=e.add(o.constMethod.stackmapDataOffset),f=h.add(o.constantPool.instanceKlassOffset).readPointer(),m=h.add(o.constantPool.cacheOffset).readPointer(),g=getJvmInstanceKlassSpec(),v=f.add(g.methodsOffset).readPointer(),A=v.readS32(),w=v.add(pointerSize6),N=e.add(o.constMethod.methodIdnumOffset).readU16(),M=t.add(o.method.vtableIndexOffset),L=M.readS32(),T=f.add(g.vtableOffset),b=f.add(g.oopMapCacheOffset).readPointer(),I=n.version>=10?f.add(g.memberNamesOffset).readPointer():NULL;return{method:t,methodSize:o.method.size,const:e,constSize:r,constPtr:i,dataPtr:s,countersPtr:l,stackmapPtr:_,instanceKlass:f,methodsArray:w,methodsCount:A,methodIndex:N,vtableIndex:L,vtableIndexPtr:M,vtable:T,accessFlags:c,accessFlagsPtr:a,adapter:d,i2iEntry:p,signatureHandler:u,memberNames:I,cache:m,oopMapCache:b}}function revertJvmMethod(t){const{oldMethod:e}=t;e.accessFlagsPtr.writeU32(e.accessFlags),e.vtableIndexPtr.writeS32(e.vtableIndex)}function _getJvmMethodSpec(){const t=getApi2(),{version:e}=t;let r;e>=17?r="method:early":e>=9&&e<=16?r="const-method":r="method:late";const o=t["Method::size"](1)*pointerSize6,i=pointerSize6,s=2*pointerSize6,l=3*pointerSize6,a=4*pointerSize6,c=r==="method:early"?pointerSize6:0,d=a+c,p=d+4,u=p+4+8,h=u+pointerSize6,_=c!==0?a:h,f=o-2*pointerSize6,m=o-pointerSize6,g=8,v=g+pointerSize6,A=v+pointerSize6,w=r==="const-method"?pointerSize6:0,N=A+w,M=N+14,L=2*pointerSize6,T=3*pointerSize6;return{getAdapterPointer:w!==0?function(I,k){return k.add(A)}:function(I,k){return I.add(_)},method:{size:o,constMethodOffset:i,methodDataOffset:s,methodCountersOffset:l,accessFlagsOffset:d,vtableIndexOffset:p,i2iEntryOffset:u,nativeFunctionOffset:f,signatureHandlerOffset:m},constMethod:{constantPoolOffset:g,stackmapDataOffset:v,sizeOffset:N,methodIdnumOffset:M},constantPool:{cacheOffset:L,instanceKlassOffset:T}}}var vtableOffsetParsers={x64:parseX64VTableOffset};function _getJvmInstanceKlassSpec(){const{version:t,createNewDefaultVtableIndices:e}=getApi2(),r=vtableOffsetParsers[Process.arch];if(r===void 0)throw new Error(`Missing vtable offset parser for ${Process.arch}`);const n=parseInstructionsAt(e,r,{limit:32});if(n===null)throw new Error("Unable to deduce vtable offset");const o=t>=10&&t<=11||t>=15?17:18,i=n-7*pointerSize6,s=n-17*pointerSize6,l=n-o*pointerSize6;return{vtableOffset:n,methodsOffset:i,memberNamesOffset:s,oopMapCacheOffset:l}}function parseX64VTableOffset(t){if(t.mnemonic!=="mov")return null;const e=t.operands[0];if(e.type!=="mem")return null;const{value:r}=e;if(r.scale!==1)return null;const{disp:n}=r;return n<256?null:n+16}var getApi3=getApi;try{getAndroidVersion()}catch{getApi3=getApi2}var api_default=getApi3,code2=`#include <json-glib/json-glib.h>
#include <string.h>

#define kAccStatic 0x0008
#define kAccConstructor 0x00010000

typedef struct _Model Model;
typedef struct _EnumerateMethodsContext EnumerateMethodsContext;

typedef struct _JavaApi JavaApi;
typedef struct _JavaClassApi JavaClassApi;
typedef struct _JavaMethodApi JavaMethodApi;
typedef struct _JavaFieldApi JavaFieldApi;

typedef struct _JNIEnv JNIEnv;
typedef guint8 jboolean;
typedef gint32 jint;
typedef jint jsize;
typedef gpointer jobject;
typedef jobject jclass;
typedef jobject jstring;
typedef jobject jarray;
typedef jarray jobjectArray;
typedef gpointer jfieldID;
typedef gpointer jmethodID;

typedef struct _jvmtiEnv jvmtiEnv;
typedef enum
{
  JVMTI_ERROR_NONE = 0
} jvmtiError;

typedef struct _ArtApi ArtApi;
typedef guint32 ArtHeapReference;
typedef struct _ArtObject ArtObject;
typedef struct _ArtClass ArtClass;
typedef struct _ArtClassLinker ArtClassLinker;
typedef struct _ArtClassVisitor ArtClassVisitor;
typedef struct _ArtClassVisitorVTable ArtClassVisitorVTable;
typedef struct _ArtMethod ArtMethod;
typedef struct _ArtString ArtString;

typedef union _StdString StdString;
typedef struct _StdStringShort StdStringShort;
typedef struct _StdStringLong StdStringLong;

typedef void (* ArtVisitClassesFunc) (ArtClassLinker * linker, ArtClassVisitor * visitor);
typedef const char * (* ArtGetClassDescriptorFunc) (ArtClass * klass, StdString * storage);
typedef void (* ArtPrettyMethodFunc) (StdString * result, ArtMethod * method, jboolean with_signature);

struct _Model
{
  GHashTable * members;
};

struct _EnumerateMethodsContext
{
  GPatternSpec * class_query;
  GPatternSpec * method_query;
  jboolean include_signature;
  jboolean ignore_case;
  jboolean skip_system_classes;
  GHashTable * groups;
};

struct _JavaClassApi
{
  jmethodID get_declared_methods;
  jmethodID get_declared_fields;
};

struct _JavaMethodApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaFieldApi
{
  jmethodID get_name;
  jmethodID get_modifiers;
};

struct _JavaApi
{
  jvmtiEnv * jvmti;
  JavaClassApi clazz;
  JavaMethodApi method;
  JavaFieldApi field;
};

struct _JNIEnv
{
  gpointer * functions;
};

struct _jvmtiEnv
{
  gpointer * functions;
};

struct _ArtApi
{
  gboolean available;

  guint class_offset_ifields;
  guint class_offset_methods;
  guint class_offset_sfields;
  guint class_offset_copied_methods_offset;

  guint method_size;
  guint method_offset_access_flags;

  guint field_size;
  guint field_offset_access_flags;

  guint alignment_padding;

  ArtClassLinker * linker;
  ArtVisitClassesFunc visit_classes;
  ArtGetClassDescriptorFunc get_class_descriptor;
  ArtPrettyMethodFunc pretty_method;

  void (* free) (gpointer mem);
};

struct _ArtObject
{
  ArtHeapReference klass;
  ArtHeapReference monitor;
};

struct _ArtClass
{
  ArtObject parent;

  ArtHeapReference class_loader;
};

struct _ArtClassVisitor
{
  ArtClassVisitorVTable * vtable;
  gpointer user_data;
};

struct _ArtClassVisitorVTable
{
  void (* reserved1) (ArtClassVisitor * self);
  void (* reserved2) (ArtClassVisitor * self);
  jboolean (* visit) (ArtClassVisitor * self, ArtClass * klass);
};

struct _ArtString
{
  ArtObject parent;

  gint32 count;
  guint32 hash_code;

  union
  {
    guint16 value[0];
    guint8 value_compressed[0];
  };
};

struct _StdStringShort
{
  guint8 size;
  gchar data[(3 * sizeof (gpointer)) - sizeof (guint8)];
};

struct _StdStringLong
{
  gsize capacity;
  gsize size;
  gchar * data;
};

union _StdString
{
  StdStringShort s;
  StdStringLong l;
};

static void model_add_method (Model * self, const gchar * name, jmethodID id, jint modifiers);
static void model_add_field (Model * self, const gchar * name, jfieldID id, jint modifiers);
static void model_free (Model * model);

static jboolean collect_matching_class_methods (ArtClassVisitor * self, ArtClass * klass);
static gchar * finalize_method_groups_to_json (GHashTable * groups);
static GPatternSpec * make_pattern_spec (const gchar * pattern, jboolean ignore_case);
static gchar * class_name_from_signature (const gchar * signature);
static gchar * format_method_signature (const gchar * name, const gchar * signature);
static void append_type (GString * output, const gchar ** type);

static gpointer read_art_array (gpointer object_base, guint field_offset, guint length_size, guint * length);

static void std_string_destroy (StdString * str);
static gchar * std_string_c_str (StdString * self);

extern GMutex lock;
extern GArray * models;
extern JavaApi java_api;
extern ArtApi art_api;

void
init (void)
{
  g_mutex_init (&lock);
  models = g_array_new (FALSE, FALSE, sizeof (Model *));
}

void
finalize (void)
{
  guint n, i;

  n = models->len;
  for (i = 0; i != n; i++)
  {
    Model * model = g_array_index (models, Model *, i);
    model_free (model);
  }

  g_array_unref (models);
  g_mutex_clear (&lock);
}

Model *
model_new (jclass class_handle,
           gpointer class_object,
           JNIEnv * env)
{
  Model * model;
  GHashTable * members;
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * funcs = env->functions;
  jmethodID (* from_reflected_method) (JNIEnv *, jobject) = funcs[7];
  jfieldID (* from_reflected_field) (JNIEnv *, jobject) = funcs[8];
  jobject (* to_reflected_method) (JNIEnv *, jclass, jmethodID, jboolean) = funcs[9];
  jobject (* to_reflected_field) (JNIEnv *, jclass, jfieldID, jboolean) = funcs[12];
  void (* delete_local_ref) (JNIEnv *, jobject) = funcs[23];
  jobject (* call_object_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[34];
  jint (* call_int_method) (JNIEnv *, jobject, jmethodID, ...) = funcs[49];
  const char * (* get_string_utf_chars) (JNIEnv *, jstring, jboolean *) = funcs[169];
  void (* release_string_utf_chars) (JNIEnv *, jstring, const char *) = funcs[170];
  jsize (* get_array_length) (JNIEnv *, jarray) = funcs[171];
  jobject (* get_object_array_element) (JNIEnv *, jobjectArray, jsize) = funcs[173];
  jsize n, i;

  model = g_new (Model, 1);

  members = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, g_free);
  model->members = members;

  if (jvmti != NULL)
  {
    gpointer * jf = jvmti->functions - 1;
    jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
    jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
    jvmtiError (* get_class_fields) (jvmtiEnv *, jclass, jint *, jfieldID **) = jf[53];
    jvmtiError (* get_field_name) (jvmtiEnv *, jclass, jfieldID, char **, char **, char **) = jf[60];
    jvmtiError (* get_field_modifiers) (jvmtiEnv *, jclass, jfieldID, jint *) = jf[62];
    jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
    jvmtiError (* get_method_modifiers) (jvmtiEnv *, jmethodID, jint *) = jf[66];
    jint method_count;
    jmethodID * methods;
    jint field_count;
    jfieldID * fields;
    char * name;
    jint modifiers;

    get_class_methods (jvmti, class_handle, &method_count, &methods);
    for (i = 0; i != method_count; i++)
    {
      jmethodID method = methods[i];

      get_method_name (jvmti, method, &name, NULL, NULL);
      get_method_modifiers (jvmti, method, &modifiers);

      model_add_method (model, name, method, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, methods);

    get_class_fields (jvmti, class_handle, &field_count, &fields);
    for (i = 0; i != field_count; i++)
    {
      jfieldID field = fields[i];

      get_field_name (jvmti, class_handle, field, &name, NULL, NULL);
      get_field_modifiers (jvmti, class_handle, field, &modifiers);

      model_add_field (model, name, field, modifiers);

      deallocate (jvmti, name);
    }
    deallocate (jvmti, fields);
  }
  else if (art_api.available)
  {
    gpointer elements;
    guint n, i;
    const guint field_arrays[] = {
      art_api.class_offset_ifields,
      art_api.class_offset_sfields
    };
    guint field_array_cursor;
    gboolean merged_fields = art_api.class_offset_sfields == 0;

    elements = read_art_array (class_object, art_api.class_offset_methods, sizeof (gsize), NULL);
    n = *(guint16 *) (class_object + art_api.class_offset_copied_methods_offset);
    for (i = 0; i != n; i++)
    {
      jmethodID id;
      guint32 access_flags;
      jboolean is_static;
      jobject method, name;
      const char * name_str;
      jint modifiers;

      id = elements + (i * art_api.method_size);

      access_flags = *(guint32 *) (id + art_api.method_offset_access_flags);
      if ((access_flags & kAccConstructor) != 0)
        continue;
      is_static = (access_flags & kAccStatic) != 0;
      method = to_reflected_method (env, class_handle, id, is_static);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      modifiers = access_flags & 0xffff;

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }

    for (field_array_cursor = 0; field_array_cursor != G_N_ELEMENTS (field_arrays); field_array_cursor++)
    {
      jboolean is_static;

      if (field_arrays[field_array_cursor] == 0)
        continue;

      if (!merged_fields)
        is_static = field_array_cursor == 1;

      elements = read_art_array (class_object, field_arrays[field_array_cursor], sizeof (guint32), &n);
      for (i = 0; i != n; i++)
      {
        jfieldID id;
        guint32 access_flags;
        jobject field, name;
        const char * name_str;
        jint modifiers;

        id = elements + (i * art_api.field_size);

        access_flags = *(guint32 *) (id + art_api.field_offset_access_flags);
        if (merged_fields)
          is_static = (access_flags & kAccStatic) != 0;
        field = to_reflected_field (env, class_handle, id, is_static);
        name = call_object_method (env, field, java_api.field.get_name);
        name_str = get_string_utf_chars (env, name, NULL);
        modifiers = access_flags & 0xffff;

        model_add_field (model, name_str, id, modifiers);

        release_string_utf_chars (env, name, name_str);
        delete_local_ref (env, name);
        delete_local_ref (env, field);
      }
    }
  }
  else
  {
    jobject elements;

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_methods);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject method, name;
      const char * name_str;
      jmethodID id;
      jint modifiers;

      method = get_object_array_element (env, elements, i);
      name = call_object_method (env, method, java_api.method.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_method (env, method);
      modifiers = call_int_method (env, method, java_api.method.get_modifiers);

      model_add_method (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, method);
    }
    delete_local_ref (env, elements);

    elements = call_object_method (env, class_handle, java_api.clazz.get_declared_fields);
    n = get_array_length (env, elements);
    for (i = 0; i != n; i++)
    {
      jobject field, name;
      const char * name_str;
      jfieldID id;
      jint modifiers;

      field = get_object_array_element (env, elements, i);
      name = call_object_method (env, field, java_api.field.get_name);
      name_str = get_string_utf_chars (env, name, NULL);
      id = from_reflected_field (env, field);
      modifiers = call_int_method (env, field, java_api.field.get_modifiers);

      model_add_field (model, name_str, id, modifiers);

      release_string_utf_chars (env, name, name_str);
      delete_local_ref (env, name);
      delete_local_ref (env, field);
    }
    delete_local_ref (env, elements);
  }

  g_mutex_lock (&lock);
  g_array_append_val (models, model);
  g_mutex_unlock (&lock);

  return model;
}

static void
model_add_method (Model * self,
                  const gchar * name,
                  jmethodID id,
                  jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;
  const gchar * value;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  value = g_hash_table_lookup (members, key);
  if (value == NULL)
    g_hash_table_insert (members, key, g_strdup_printf ("m:%c0x%zx", type, id));
  else
    g_hash_table_insert (members, key, g_strdup_printf ("%s:%c0x%zx", value, type, id));
}

static void
model_add_field (Model * self,
                 const gchar * name,
                 jfieldID id,
                 jint modifiers)
{
  GHashTable * members = self->members;
  gchar * key, type;

  if (name[0] == '$')
    key = g_strdup_printf ("_%s", name);
  else
    key = g_strdup (name);
  while (g_hash_table_contains (members, key))
  {
    gchar * new_key = g_strdup_printf ("_%s", key);
    g_free (key);
    key = new_key;
  }

  type = (modifiers & kAccStatic) != 0 ? 's' : 'i';

  g_hash_table_insert (members, key, g_strdup_printf ("f:%c0x%zx", type, id));
}

static void
model_free (Model * model)
{
  g_hash_table_unref (model->members);

  g_free (model);
}

gboolean
model_has (Model * self,
           const gchar * member)
{
  return g_hash_table_contains (self->members, member);
}

const gchar *
model_find (Model * self,
            const gchar * member)
{
  return g_hash_table_lookup (self->members, member);
}

gchar *
model_list (Model * self)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  const gchar * name;

  result = g_string_sized_new (128);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, self->members);
  for (i = 0; g_hash_table_iter_next (&iter, (gpointer *) &name, NULL); i++)
  {
    if (i > 0)
      g_string_append_c (result, ',');

    g_string_append_c (result, '"');
    g_string_append (result, name);
    g_string_append_c (result, '"');
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

gchar *
enumerate_methods_art (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes)
{
  gchar * result;
  EnumerateMethodsContext ctx;
  ArtClassVisitor visitor;
  ArtClassVisitorVTable visitor_vtable = { NULL, };

  ctx.class_query = make_pattern_spec (class_query, ignore_case);
  ctx.method_query = make_pattern_spec (method_query, ignore_case);
  ctx.include_signature = include_signature;
  ctx.ignore_case = ignore_case;
  ctx.skip_system_classes = skip_system_classes;
  ctx.groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  visitor.vtable = &visitor_vtable;
  visitor.user_data = &ctx;

  visitor_vtable.visit = collect_matching_class_methods;

  art_api.visit_classes (art_api.linker, &visitor);

  result = finalize_method_groups_to_json (ctx.groups);

  g_hash_table_unref (ctx.groups);
  g_pattern_spec_free (ctx.method_query);
  g_pattern_spec_free (ctx.class_query);

  return result;
}

static jboolean
collect_matching_class_methods (ArtClassVisitor * self,
                                ArtClass * klass)
{
  EnumerateMethodsContext * ctx = self->user_data;
  const char * descriptor;
  StdString descriptor_storage = { 0, };
  gchar * class_name = NULL;
  gchar * class_name_copy = NULL;
  const gchar * normalized_class_name;
  JsonBuilder * group;
  size_t class_name_length;
  GHashTable * seen_method_names;
  gpointer elements;
  guint n, i;

  if (ctx->skip_system_classes && klass->class_loader == 0)
    goto skip_class;

  descriptor = art_api.get_class_descriptor (klass, &descriptor_storage);
  if (descriptor[0] != 'L')
    goto skip_class;

  class_name = class_name_from_signature (descriptor);

  if (ctx->ignore_case)
  {
    class_name_copy = g_utf8_strdown (class_name, -1);
    normalized_class_name = class_name_copy;
  }
  else
  {
    normalized_class_name = class_name;
  }

  if (!g_pattern_match_string (ctx->class_query, normalized_class_name))
    goto skip_class;

  group = NULL;
  class_name_length = strlen (class_name);
  seen_method_names = ctx->include_signature ? NULL : g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

  elements = read_art_array (klass, art_api.class_offset_methods, sizeof (gsize), NULL);
  n = *(guint16 *) ((gpointer) klass + art_api.class_offset_copied_methods_offset);
  for (i = 0; i != n; i++)
  {
    ArtMethod * method;
    guint32 access_flags;
    jboolean is_constructor;
    StdString method_name = { 0, };
    const gchar * bare_method_name;
    gchar * bare_method_name_copy = NULL;
    const gchar * normalized_method_name;
    gchar * normalized_method_name_copy = NULL;

    method = elements + (i * art_api.method_size);

    access_flags = *(guint32 *) ((gpointer) method + art_api.method_offset_access_flags);
    is_constructor = (access_flags & kAccConstructor) != 0;

    art_api.pretty_method (&method_name, method, ctx->include_signature);
    bare_method_name = std_string_c_str (&method_name);
    if (ctx->include_signature)
    {
      const gchar * return_type_end, * name_begin;
      GString * name;

      return_type_end = strchr (bare_method_name, ' ');
      name_begin = return_type_end + 1 + class_name_length + 1;
      if (is_constructor && g_str_has_prefix (name_begin, "<clinit>"))
        goto skip_method;

      name = g_string_sized_new (64);

      if (is_constructor)
      {
        g_string_append (name, "$init");
        g_string_append (name, strchr (name_begin, '>') + 1);
      }
      else
      {
        g_string_append (name, name_begin);
      }
      g_string_append (name, ": ");
      g_string_append_len (name, bare_method_name, return_type_end - bare_method_name);

      bare_method_name_copy = g_string_free (name, FALSE);
      bare_method_name = bare_method_name_copy;
    }
    else
    {
      const gchar * name_begin;

      name_begin = bare_method_name + class_name_length + 1;
      if (is_constructor && strcmp (name_begin, "<clinit>") == 0)
        goto skip_method;

      if (is_constructor)
        bare_method_name = "$init";
      else
        bare_method_name += class_name_length + 1;
    }

    if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, bare_method_name))
      goto skip_method;

    if (ctx->ignore_case)
    {
      normalized_method_name_copy = g_utf8_strdown (bare_method_name, -1);
      normalized_method_name = normalized_method_name_copy;
    }
    else
    {
      normalized_method_name = bare_method_name;
    }

    if (!g_pattern_match_string (ctx->method_query, normalized_method_name))
      goto skip_method;

    if (group == NULL)
    {
      group = g_hash_table_lookup (ctx->groups, GUINT_TO_POINTER (klass->class_loader));
      if (group == NULL)
      {
        group = json_builder_new_immutable ();
        g_hash_table_insert (ctx->groups, GUINT_TO_POINTER (klass->class_loader), group);

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "loader");
        json_builder_add_int_value (group, klass->class_loader);

        json_builder_set_member_name (group, "classes");
        json_builder_begin_array (group);
      }

      json_builder_begin_object (group);

      json_builder_set_member_name (group, "name");
      json_builder_add_string_value (group, class_name);

      json_builder_set_member_name (group, "methods");
      json_builder_begin_array (group);
    }

    json_builder_add_string_value (group, bare_method_name);

    if (seen_method_names != NULL)
      g_hash_table_add (seen_method_names, g_strdup (bare_method_name));

skip_method:
    g_free (normalized_method_name_copy);
    g_free (bare_method_name_copy);
    std_string_destroy (&method_name);
  }

  if (seen_method_names != NULL)
    g_hash_table_unref (seen_method_names);

  if (group == NULL)
    goto skip_class;

  json_builder_end_array (group);
  json_builder_end_object (group);

skip_class:
  g_free (class_name_copy);
  g_free (class_name);
  std_string_destroy (&descriptor_storage);

  return TRUE;
}

gchar *
enumerate_methods_jvm (const gchar * class_query,
                       const gchar * method_query,
                       jboolean include_signature,
                       jboolean ignore_case,
                       jboolean skip_system_classes,
                       JNIEnv * env)
{
  gchar * result;
  GPatternSpec * class_pattern, * method_pattern;
  GHashTable * groups;
  gpointer * ef = env->functions;
  jobject (* new_global_ref) (JNIEnv *, jobject) = ef[21];
  void (* delete_local_ref) (JNIEnv *, jobject) = ef[23];
  jboolean (* is_same_object) (JNIEnv *, jobject, jobject) = ef[24];
  jvmtiEnv * jvmti = java_api.jvmti;
  gpointer * jf = jvmti->functions - 1;
  jvmtiError (* deallocate) (jvmtiEnv *, void * mem) = jf[47];
  jvmtiError (* get_class_signature) (jvmtiEnv *, jclass, char **, char **) = jf[48];
  jvmtiError (* get_class_methods) (jvmtiEnv *, jclass, jint *, jmethodID **) = jf[52];
  jvmtiError (* get_class_loader) (jvmtiEnv *, jclass, jobject *) = jf[57];
  jvmtiError (* get_method_name) (jvmtiEnv *, jmethodID, char **, char **, char **) = jf[64];
  jvmtiError (* get_loaded_classes) (jvmtiEnv *, jint *, jclass **) = jf[78];
  jint class_count, class_index;
  jclass * classes;

  class_pattern = make_pattern_spec (class_query, ignore_case);
  method_pattern = make_pattern_spec (method_query, ignore_case);
  groups = g_hash_table_new_full (NULL, NULL, NULL, NULL);

  if (get_loaded_classes (jvmti, &class_count, &classes) != JVMTI_ERROR_NONE)
    goto emit_results;

  for (class_index = 0; class_index != class_count; class_index++)
  {
    jclass klass = classes[class_index];
    jobject loader = NULL;
    gboolean have_loader = FALSE;
    char * signature = NULL;
    gchar * class_name = NULL;
    gchar * class_name_copy = NULL;
    const gchar * normalized_class_name;
    jint method_count, method_index;
    jmethodID * methods = NULL;
    JsonBuilder * group = NULL;
    GHashTable * seen_method_names = NULL;

    if (skip_system_classes)
    {
      if (get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
        goto skip_class;
      have_loader = TRUE;

      if (loader == NULL)
        goto skip_class;
    }

    if (get_class_signature (jvmti, klass, &signature, NULL) != JVMTI_ERROR_NONE)
      goto skip_class;

    class_name = class_name_from_signature (signature);

    if (ignore_case)
    {
      class_name_copy = g_utf8_strdown (class_name, -1);
      normalized_class_name = class_name_copy;
    }
    else
    {
      normalized_class_name = class_name;
    }

    if (!g_pattern_match_string (class_pattern, normalized_class_name))
      goto skip_class;

    if (get_class_methods (jvmti, klass, &method_count, &methods) != JVMTI_ERROR_NONE)
      goto skip_class;

    if (!include_signature)
      seen_method_names = g_hash_table_new_full (g_str_hash, g_str_equal, g_free, NULL);

    for (method_index = 0; method_index != method_count; method_index++)
    {
      jmethodID method = methods[method_index];
      const gchar * method_name;
      char * method_name_value = NULL;
      char * method_signature_value = NULL;
      gchar * method_name_copy = NULL;
      const gchar * normalized_method_name;
      gchar * normalized_method_name_copy = NULL;

      if (get_method_name (jvmti, method, &method_name_value, include_signature ? &method_signature_value : NULL, NULL) != JVMTI_ERROR_NONE)
        goto skip_method;
      method_name = method_name_value;

      if (method_name[0] == '<')
      {
        if (strcmp (method_name, "<init>") == 0)
          method_name = "$init";
        else if (strcmp (method_name, "<clinit>") == 0)
          goto skip_method;
      }

      if (include_signature)
      {
        method_name_copy = format_method_signature (method_name, method_signature_value);
        method_name = method_name_copy;
      }

      if (seen_method_names != NULL && g_hash_table_contains (seen_method_names, method_name))
        goto skip_method;

      if (ignore_case)
      {
        normalized_method_name_copy = g_utf8_strdown (method_name, -1);
        normalized_method_name = normalized_method_name_copy;
      }
      else
      {
        normalized_method_name = method_name;
      }

      if (!g_pattern_match_string (method_pattern, normalized_method_name))
        goto skip_method;

      if (group == NULL)
      {
        if (!have_loader && get_class_loader (jvmti, klass, &loader) != JVMTI_ERROR_NONE)
          goto skip_method;

        if (loader == NULL)
        {
          group = g_hash_table_lookup (groups, NULL);
        }
        else
        {
          GHashTableIter iter;
          jobject cur_loader;
          JsonBuilder * cur_group;

          g_hash_table_iter_init (&iter, groups);
          while (g_hash_table_iter_next (&iter, (gpointer *) &cur_loader, (gpointer *) &cur_group))
          {
            if (cur_loader != NULL && is_same_object (env, cur_loader, loader))
            {
              group = cur_group;
              break;
            }
          }
        }

        if (group == NULL)
        {
          jobject l;
          gchar * str;

          l = (loader != NULL) ? new_global_ref (env, loader) : NULL;

          group = json_builder_new_immutable ();
          g_hash_table_insert (groups, l, group);

          json_builder_begin_object (group);

          json_builder_set_member_name (group, "loader");
          str = g_strdup_printf ("0x%" G_GSIZE_MODIFIER "x", GPOINTER_TO_SIZE (l));
          json_builder_add_string_value (group, str);
          g_free (str);

          json_builder_set_member_name (group, "classes");
          json_builder_begin_array (group);
        }

        json_builder_begin_object (group);

        json_builder_set_member_name (group, "name");
        json_builder_add_string_value (group, class_name);

        json_builder_set_member_name (group, "methods");
        json_builder_begin_array (group);
      }

      json_builder_add_string_value (group, method_name);

      if (seen_method_names != NULL)
        g_hash_table_add (seen_method_names, g_strdup (method_name));

skip_method:
      g_free (normalized_method_name_copy);
      g_free (method_name_copy);
      deallocate (jvmti, method_signature_value);
      deallocate (jvmti, method_name_value);
    }

skip_class:
    if (group != NULL)
    {
      json_builder_end_array (group);
      json_builder_end_object (group);
    }

    if (seen_method_names != NULL)
      g_hash_table_unref (seen_method_names);

    deallocate (jvmti, methods);

    g_free (class_name_copy);
    g_free (class_name);
    deallocate (jvmti, signature);

    if (loader != NULL)
      delete_local_ref (env, loader);

    delete_local_ref (env, klass);
  }

  deallocate (jvmti, classes);

emit_results:
  result = finalize_method_groups_to_json (groups);

  g_hash_table_unref (groups);
  g_pattern_spec_free (method_pattern);
  g_pattern_spec_free (class_pattern);

  return result;
}

static gchar *
finalize_method_groups_to_json (GHashTable * groups)
{
  GString * result;
  GHashTableIter iter;
  guint i;
  JsonBuilder * group;

  result = g_string_sized_new (1024);

  g_string_append_c (result, '[');

  g_hash_table_iter_init (&iter, groups);
  for (i = 0; g_hash_table_iter_next (&iter, NULL, (gpointer *) &group); i++)
  {
    JsonNode * root;
    gchar * json;

    if (i > 0)
      g_string_append_c (result, ',');

    json_builder_end_array (group);
    json_builder_end_object (group);

    root = json_builder_get_root (group);
    json = json_to_string (root, FALSE);
    g_string_append (result, json);
    g_free (json);
    json_node_unref (root);

    g_object_unref (group);
  }

  g_string_append_c (result, ']');

  return g_string_free (result, FALSE);
}

static GPatternSpec *
make_pattern_spec (const gchar * pattern,
                   jboolean ignore_case)
{
  GPatternSpec * spec;

  if (ignore_case)
  {
    gchar * str = g_utf8_strdown (pattern, -1);
    spec = g_pattern_spec_new (str);
    g_free (str);
  }
  else
  {
    spec = g_pattern_spec_new (pattern);
  }

  return spec;
}

static gchar *
class_name_from_signature (const gchar * descriptor)
{
  gchar * result, * c;

  result = g_strdup (descriptor + 1);

  for (c = result; *c != '\\0'; c++)
  {
    if (*c == '/')
      *c = '.';
  }

  c[-1] = '\\0';

  return result;
}

static gchar *
format_method_signature (const gchar * name,
                         const gchar * signature)
{
  GString * sig;
  const gchar * cursor;
  gint arg_index;

  sig = g_string_sized_new (128);

  g_string_append (sig, name);

  cursor = signature;
  arg_index = -1;
  while (TRUE)
  {
    const gchar c = *cursor;

    if (c == '(')
    {
      g_string_append_c (sig, c);
      cursor++;
      arg_index = 0;
    }
    else if (c == ')')
    {
      g_string_append_c (sig, c);
      cursor++;
      break;
    }
    else
    {
      if (arg_index >= 1)
        g_string_append (sig, ", ");

      append_type (sig, &cursor);

      if (arg_index != -1)
        arg_index++;
    }
  }

  g_string_append (sig, ": ");
  append_type (sig, &cursor);

  return g_string_free (sig, FALSE);
}

static void
append_type (GString * output,
             const gchar ** type)
{
  const gchar * cursor = *type;

  switch (*cursor)
  {
    case 'Z':
      g_string_append (output, "boolean");
      cursor++;
      break;
    case 'B':
      g_string_append (output, "byte");
      cursor++;
      break;
    case 'C':
      g_string_append (output, "char");
      cursor++;
      break;
    case 'S':
      g_string_append (output, "short");
      cursor++;
      break;
    case 'I':
      g_string_append (output, "int");
      cursor++;
      break;
    case 'J':
      g_string_append (output, "long");
      cursor++;
      break;
    case 'F':
      g_string_append (output, "float");
      cursor++;
      break;
    case 'D':
      g_string_append (output, "double");
      cursor++;
      break;
    case 'V':
      g_string_append (output, "void");
      cursor++;
      break;
    case 'L':
    {
      gchar ch;

      cursor++;
      for (; (ch = *cursor) != ';'; cursor++)
      {
        g_string_append_c (output, (ch != '/') ? ch : '.');
      }
      cursor++;

      break;
    }
    case '[':
      *type = cursor + 1;
      append_type (output, type);
      g_string_append (output, "[]");
      return;
    default:
      g_string_append (output, "BUG");
      cursor++;
  }

  *type = cursor;
}

void
dealloc (gpointer mem)
{
  g_free (mem);
}

static gpointer
read_art_array (gpointer object_base,
                guint field_offset,
                guint length_size,
                guint * length)
{
  gpointer result, header;
  guint n;

  header = GSIZE_TO_POINTER (*(guint64 *) (object_base + field_offset));
  if (header != NULL)
  {
    result = header + length_size;
    if (length_size == sizeof (guint32))
      n = *(guint32 *) header;
    else
      n = *(guint64 *) header;
  }
  else
  {
    result = NULL;
    n = 0;
  }

  if (length != NULL)
    *length = n;

  return result;
}

static void
std_string_destroy (StdString * str)
{
  if ((str->l.capacity & 1) != 0)
    art_api.free (str->l.data);
}

static gchar *
std_string_c_str (StdString * self)
{
  if ((self->l.capacity & 1) != 0)
    return self->l.data;

  return self->s.data;
}
`,methodQueryPattern=/(.+)!([^/]+)\/?([isu]+)?/,cm=null,unwrap=null,Model=class ue{static build(e,r){return ensureInitialized(r),unwrap(e,r,n=>new ue(cm.new(e,n,r)))}static enumerateMethods(e,r,n){ensureInitialized(n);const o=e.match(methodQueryPattern);if(o===null)throw new Error("Invalid query; format is: class!method -- see documentation of Java.enumerateMethods(query) for details");const i=Memory.allocUtf8String(o[1]),s=Memory.allocUtf8String(o[2]);let l=!1,a=!1,c=!1;const d=o[3];d!==void 0&&(l=d.indexOf("s")!==-1,a=d.indexOf("i")!==-1,c=d.indexOf("u")!==-1);let p;if(r.jvmti!==null){const u=cm.enumerateMethodsJvm(i,s,boolToNative(l),boolToNative(a),boolToNative(c),n);try{p=JSON.parse(u.readUtf8String()).map(h=>{const _=ptr(h.loader);return h.loader=_.isNull()?null:_,h})}finally{cm.dealloc(u)}}else withRunnableArtThread(n.vm,n,u=>{const h=cm.enumerateMethodsArt(i,s,boolToNative(l),boolToNative(a),boolToNative(c));try{const _=r["art::JavaVMExt::AddGlobalRef"],{vm:f}=r;p=JSON.parse(h.readUtf8String()).map(m=>{const g=m.loader;return m.loader=g!==0?_(f,u,ptr(g)):null,m})}finally{cm.dealloc(h)}});return p}constructor(e){this.handle=e}has(e){return cm.has(this.handle,Memory.allocUtf8String(e))!==0}find(e){return cm.find(this.handle,Memory.allocUtf8String(e)).readUtf8String()}list(){const e=cm.list(this.handle);try{return JSON.parse(e.readUtf8String())}finally{cm.dealloc(e)}}};function ensureInitialized(t){cm===null&&(cm=compileModule(t),unwrap=makeHandleUnwrapper(cm,t.vm))}function compileModule(t){const e=api_default(),{jvmti:r=null}=e,{pointerSize:n}=Process,o=8,i=n,s=7*n,l=40+5*n,a=o+i+s+l,d=Memory.alloc(a),p=d.add(o),u=p.add(i),{getDeclaredMethods:h,getDeclaredFields:_}=t.javaLangClass(),f=t.javaLangReflectMethod(),m=t.javaLangReflectField();let g=u;[r!==null?r:NULL,h,_,f.getName,f.getModifiers,m.getName,m.getModifiers].forEach(L=>{g=g.writePointer(L).add(n)});const v=u.add(s),{vm:A}=t;if(e.flavor==="art"){let L;if(r!==null)L=[0,0,0,0];else{const k=getArtClassSpec(A).offset;L=[k.ifields,k.methods,k.sfields,k.copiedMethodsOffset]}const T=getArtMethodSpec(A),b=getArtFieldSpec(A);let I=v;[1,...L,T.size,T.offset.accessFlags,b.size,b.offset.accessFlags,4294967295].forEach(k=>{I=I.writeUInt(k).add(4)}),[e.artClassLinker.address,e["art::ClassLinker::VisitClasses"],e["art::mirror::Class::GetDescriptor"],e["art::ArtMethod::PrettyMethod"],Process.getModuleByName("libc.so").getExportByName("free")].forEach((k,y)=>{k===void 0&&(k=NULL),I=I.writePointer(k).add(n)})}const w=new CModule(code2,{lock:d,models:p,java_api:u,art_api:v}),N={exceptions:"propagate"},M={exceptions:"propagate",scheduling:"exclusive"};return{handle:w,new:new NativeFunction(w.model_new,"pointer",["pointer","pointer","pointer"],N),has:new NativeFunction(w.model_has,"bool",["pointer","pointer"],M),find:new NativeFunction(w.model_find,"pointer",["pointer","pointer"],M),list:new NativeFunction(w.model_list,"pointer",["pointer"],M),enumerateMethodsArt:new NativeFunction(w.enumerate_methods_art,"pointer",["pointer","pointer","bool","bool","bool"],N),enumerateMethodsJvm:new NativeFunction(w.enumerate_methods_jvm,"pointer",["pointer","pointer","bool","bool","bool","pointer"],N),dealloc:new NativeFunction(w.dealloc,"void",["pointer"],M)}}function makeHandleUnwrapper(t,e){const r=api_default();if(r.flavor!=="art")return nullUnwrap;const n=r["art::JavaVMExt::DecodeGlobal"];return function(o,i,s){let l;return withRunnableArtThread(e,i,a=>{const c=n(e,a,o);l=s(c)}),l}}function nullUnwrap(t,e,r){return r(NULL)}function boolToNative(t){return t?1:0}var LRU=class{constructor(t,e){this.items=new Map,this.capacity=t,this.destroy=e}dispose(t){const{items:e,destroy:r}=this;e.forEach(n=>{r(n,t)}),e.clear()}get(t){const{items:e}=this,r=e.get(t);return r!==void 0&&(e.delete(t),e.set(t,r)),r}set(t,e,r){const{items:n}=this,o=n.get(t);if(o!==void 0)n.delete(t),this.destroy(o,r);else if(n.size===this.capacity){const i=n.keys().next().value,s=n.get(i);n.delete(i),this.destroy(s,r)}n.set(t,e)}},kAccPublic2=1,kAccNative2=256,kAccConstructor=65536,kEndianTag=305419896,kClassDefSize=32,kProtoIdSize=12,kFieldIdSize=8,kMethodIdSize=8,kTypeIdSize=4,kStringIdSize=4,kMapItemSize=12,TYPE_HEADER_ITEM=0,TYPE_STRING_ID_ITEM=1,TYPE_TYPE_ID_ITEM=2,TYPE_PROTO_ID_ITEM=3,TYPE_FIELD_ID_ITEM=4,TYPE_METHOD_ID_ITEM=5,TYPE_CLASS_DEF_ITEM=6,TYPE_MAP_LIST=4096,TYPE_TYPE_LIST=4097,TYPE_ANNOTATION_SET_ITEM=4099,TYPE_CLASS_DATA_ITEM=8192,TYPE_CODE_ITEM=8193,TYPE_STRING_DATA_ITEM=8194,TYPE_DEBUG_INFO_ITEM=8195,TYPE_ANNOTATION_ITEM=8196,TYPE_ANNOTATIONS_DIRECTORY_ITEM=8198,VALUE_TYPE=24,VALUE_ARRAY=28,VISIBILITY_SYSTEM=2,kDefaultConstructorSize=24,kDefaultConstructorDebugInfo=Buffer2.from([3,0,7,14,0]),kDalvikAnnotationTypeThrows="Ldalvik/annotation/Throws;",kNullTerminator=Buffer2.from([0]);function mkdex(t){const e=new DexBuilder,r=Object.assign({},t);return e.addClass(r),e.build()}var DexBuilder=class{constructor(){this.classes=[]}addClass(t){this.classes.push(t)}build(){const t=computeModel(this.classes),{classes:e,interfaces:r,fields:n,methods:o,protos:i,parameters:s,annotationDirectories:l,annotationSets:a,throwsAnnotations:c,types:d,strings:p}=t;let u=0;const h=0,_=8,f=12,m=20,g=112;u+=g;const v=u,A=p.length*kStringIdSize;u+=A;const w=u,N=d.length*kTypeIdSize;u+=N;const M=u,L=i.length*kProtoIdSize;u+=L;const T=u,b=n.length*kFieldIdSize;u+=b;const I=u,k=o.length*kMethodIdSize;u+=k;const y=u,j=e.length*kClassDefSize;u+=j;const P=u,F=a.map(C=>{const O=u;return C.offset=O,u+=4+C.items.length*4,O}),R=e.reduce((C,O)=>(O.classData.constructorMethods.forEach(z=>{const[,B,V]=z;(B&kAccNative2)===0&&V>=0&&(z.push(u),C.push({offset:u,superConstructor:V}),u+=kDefaultConstructorSize)}),C),[]);l.forEach(C=>{C.offset=u,u+=16+C.methods.length*8});const D=r.map(C=>{u=align(u,4);const O=u;return C.offset=O,u+=4+2*C.types.length,O}),$=s.map(C=>{u=align(u,4);const O=u;return C.offset=O,u+=4+2*C.types.length,O}),H=[],q=p.map(C=>{const O=u,x=Buffer2.from(createUleb128(C.length)),z=Buffer2.from(C,"utf8"),B=Buffer2.concat([x,z,kNullTerminator]);return H.push(B),u+=B.length,O}),J=R.map(C=>{const O=u;return u+=kDefaultConstructorDebugInfo.length,O}),K=c.map(C=>{const O=makeThrowsAnnotation(C);return C.offset=u,u+=O.length,O}),G=e.map((C,O)=>{C.classData.offset=u;const x=makeClassData(C);return u+=x.length,x}),Z=0,X=0;u=align(u,4);const te=u,U=r.length+s.length,Q=4+(n.length>0?1:0)+2+a.length+R.length+l.length+(U>0?1:0)+1+J.length+c.length+e.length+1,re=4+Q*kMapItemSize;u+=re;const ne=u-P,ee=u,S=Buffer2.alloc(ee);S.write(`dex
035`),S.writeUInt32LE(ee,32),S.writeUInt32LE(g,36),S.writeUInt32LE(kEndianTag,40),S.writeUInt32LE(Z,44),S.writeUInt32LE(X,48),S.writeUInt32LE(te,52),S.writeUInt32LE(p.length,56),S.writeUInt32LE(v,60),S.writeUInt32LE(d.length,64),S.writeUInt32LE(w,68),S.writeUInt32LE(i.length,72),S.writeUInt32LE(M,76),S.writeUInt32LE(n.length,80),S.writeUInt32LE(n.length>0?T:0,84),S.writeUInt32LE(o.length,88),S.writeUInt32LE(I,92),S.writeUInt32LE(e.length,96),S.writeUInt32LE(y,100),S.writeUInt32LE(ne,104),S.writeUInt32LE(P,108),q.forEach((C,O)=>{S.writeUInt32LE(C,v+O*kStringIdSize)}),d.forEach((C,O)=>{S.writeUInt32LE(C,w+O*kTypeIdSize)}),i.forEach((C,O)=>{const[x,z,B]=C,V=M+O*kProtoIdSize;S.writeUInt32LE(x,V),S.writeUInt32LE(z,V+4),S.writeUInt32LE(B!==null?B.offset:0,V+8)}),n.forEach((C,O)=>{const[x,z,B]=C,V=T+O*kFieldIdSize;S.writeUInt16LE(x,V),S.writeUInt16LE(z,V+2),S.writeUInt32LE(B,V+4)}),o.forEach((C,O)=>{const[x,z,B]=C,V=I+O*kMethodIdSize;S.writeUInt16LE(x,V),S.writeUInt16LE(z,V+2),S.writeUInt32LE(B,V+4)}),e.forEach((C,O)=>{const{interfaces:x,annotationsDirectory:z}=C,B=x!==null?x.offset:0,V=z!==null?z.offset:0,ie=0,Y=y+O*kClassDefSize;S.writeUInt32LE(C.index,Y),S.writeUInt32LE(C.accessFlags,Y+4),S.writeUInt32LE(C.superClassIndex,Y+8),S.writeUInt32LE(B,Y+12),S.writeUInt32LE(C.sourceFileIndex,Y+16),S.writeUInt32LE(V,Y+20),S.writeUInt32LE(C.classData.offset,Y+24),S.writeUInt32LE(ie,Y+28)}),a.forEach((C,O)=>{const{items:x}=C,z=F[O];S.writeUInt32LE(x.length,z),x.forEach((B,V)=>{S.writeUInt32LE(B.offset,z+4+V*4)})}),R.forEach((C,O)=>{const{offset:x,superConstructor:z}=C,B=1,V=1,ie=1,Y=0,se=4;S.writeUInt16LE(B,x),S.writeUInt16LE(V,x+2),S.writeUInt16LE(ie,x+4),S.writeUInt16LE(Y,x+6),S.writeUInt32LE(J[O],x+8),S.writeUInt32LE(se,x+12),S.writeUInt16LE(4208,x+16),S.writeUInt16LE(z,x+18),S.writeUInt16LE(0,x+20),S.writeUInt16LE(14,x+22)}),l.forEach(C=>{const O=C.offset,x=0,z=0,B=C.methods.length,V=0;S.writeUInt32LE(x,O),S.writeUInt32LE(z,O+4),S.writeUInt32LE(B,O+8),S.writeUInt32LE(V,O+12),C.methods.forEach((ie,Y)=>{const se=O+16+Y*8,[fe,_e]=ie;S.writeUInt32LE(fe,se),S.writeUInt32LE(_e.offset,se+4)})}),r.forEach((C,O)=>{const x=D[O];S.writeUInt32LE(C.types.length,x),C.types.forEach((z,B)=>{S.writeUInt16LE(z,x+4+B*2)})}),s.forEach((C,O)=>{const x=$[O];S.writeUInt32LE(C.types.length,x),C.types.forEach((z,B)=>{S.writeUInt16LE(z,x+4+B*2)})}),H.forEach((C,O)=>{C.copy(S,q[O])}),J.forEach(C=>{kDefaultConstructorDebugInfo.copy(S,C)}),K.forEach((C,O)=>{C.copy(S,c[O].offset)}),G.forEach((C,O)=>{C.copy(S,e[O].classData.offset)}),S.writeUInt32LE(Q,te);const W=[[TYPE_HEADER_ITEM,1,h],[TYPE_STRING_ID_ITEM,p.length,v],[TYPE_TYPE_ID_ITEM,d.length,w],[TYPE_PROTO_ID_ITEM,i.length,M]];n.length>0&&W.push([TYPE_FIELD_ID_ITEM,n.length,T]),W.push([TYPE_METHOD_ID_ITEM,o.length,I]),W.push([TYPE_CLASS_DEF_ITEM,e.length,y]),a.forEach((C,O)=>{W.push([TYPE_ANNOTATION_SET_ITEM,C.items.length,F[O]])}),R.forEach(C=>{W.push([TYPE_CODE_ITEM,1,C.offset])}),l.forEach(C=>{W.push([TYPE_ANNOTATIONS_DIRECTORY_ITEM,1,C.offset])}),U>0&&W.push([TYPE_TYPE_LIST,U,D.concat($)[0]]),W.push([TYPE_STRING_DATA_ITEM,p.length,q[0]]),J.forEach(C=>{W.push([TYPE_DEBUG_INFO_ITEM,1,C])}),c.forEach(C=>{W.push([TYPE_ANNOTATION_ITEM,1,C.offset])}),e.forEach(C=>{W.push([TYPE_CLASS_DATA_ITEM,1,C.classData.offset])}),W.push([TYPE_MAP_LIST,1,te]),W.forEach((C,O)=>{const[x,z,B]=C,V=te+4+O*kMapItemSize;S.writeUInt16LE(x,V),S.writeUInt32LE(z,V+4),S.writeUInt32LE(B,V+8)});const oe=new Checksum("sha1");return oe.update(S.slice(f+m)),Buffer2.from(oe.getDigest()).copy(S,f),S.writeUInt32LE(adler32(S,f),_),S}};function makeClassData(t){const{instanceFields:e,constructorMethods:r,virtualMethods:n}=t.classData;return Buffer2.from([0].concat(createUleb128(e.length)).concat(createUleb128(r.length)).concat(createUleb128(n.length)).concat(e.reduce((i,[s,l])=>i.concat(createUleb128(s)).concat(createUleb128(l)),[])).concat(r.reduce((i,[s,l,,a])=>i.concat(createUleb128(s)).concat(createUleb128(l)).concat(createUleb128(a||0)),[])).concat(n.reduce((i,[s,l])=>i.concat(createUleb128(s)).concat(createUleb128(l)).concat([0]),[])))}function makeThrowsAnnotation(t){const{thrownTypes:e}=t;return Buffer2.from([VISIBILITY_SYSTEM].concat(createUleb128(t.type)).concat([1]).concat(createUleb128(t.value)).concat([VALUE_ARRAY,e.length]).concat(e.reduce((r,n)=>(r.push(VALUE_TYPE,n),r),[])))}function computeModel(t){const e=new Set,r=new Set,n={},o=[],i=[],s={},l=new Set,a=new Set;t.forEach(y=>{const{name:j,superClass:P,sourceFileName:F}=y;e.add("this"),e.add(j),r.add(j),e.add(P),r.add(P),e.add(F),y.interfaces.forEach(R=>{e.add(R),r.add(R)}),y.fields.forEach(R=>{const[D,$]=R;e.add(D),e.add($),r.add($),o.push([y.name,$,D])}),y.methods.some(([R])=>R==="<init>")||(y.methods.unshift(["<init>","V",[]]),l.add(j)),y.methods.forEach(R=>{const[D,$,H,q=[],J]=R;e.add(D);const K=c($,H);let G=null;if(q.length>0){const Z=q.slice();Z.sort(),G=Z.join("|");let X=s[G];X===void 0&&(X={id:G,types:Z},s[G]=X),e.add(kDalvikAnnotationTypeThrows),r.add(kDalvikAnnotationTypeThrows),q.forEach(te=>{e.add(te),r.add(te)}),e.add("value")}if(i.push([y.name,K,D,G,J]),D==="<init>"){a.add(j+"|"+K);const Z=P+"|"+K;l.has(j)&&!a.has(Z)&&(i.push([P,K,D,null,0]),a.add(Z))}})});function c(y,j){const P=[y].concat(j),F=P.join("|");if(n[F]!==void 0)return F;e.add(y),r.add(y),j.forEach(D=>{e.add(D),r.add(D)});const R=P.map(typeToShorty).join("");return e.add(R),n[F]=[F,R,y,j],F}const d=Array.from(e);d.sort();const p=d.reduce((y,j,P)=>(y[j]=P,y),{}),u=Array.from(r).map(y=>p[y]);u.sort(compareNumbers);const h=u.reduce((y,j,P)=>(y[d[j]]=P,y),{}),_=Object.keys(n).map(y=>n[y]);_.sort(compareProtoItems);const f={},m=_.map(y=>{const[,j,P,F]=y;let R;if(F.length>0){const D=F.join("|");R=f[D],R===void 0&&(R={types:F.map($=>h[$]),offset:-1},f[D]=R)}else R=null;return[p[j],h[P],R]}),g=_.reduce((y,j,P)=>{const[F]=j;return y[F]=P,y},{}),v=Object.keys(f).map(y=>f[y]),A=o.map(y=>{const[j,P,F]=y;return[h[j],h[P],p[F]]});A.sort(compareFieldItems);const w=i.map(y=>{const[j,P,F,R,D]=y;return[h[j],g[P],p[F],R,D]});w.sort(compareMethodItems);const N=Object.keys(s).map(y=>s[y]).map(y=>({id:y.id,type:h[kDalvikAnnotationTypeThrows],value:p.value,thrownTypes:y.types.map(j=>h[j]),offset:-1})),M=N.map(y=>({id:y.id,items:[y],offset:-1})),L=M.reduce((y,j,P)=>(y[j.id]=P,y),{}),T={},b=[],I=t.map(y=>{const j=h[y.name],P=kAccPublic2,F=h[y.superClass];let R;const D=y.interfaces.map(U=>h[U]);if(D.length>0){D.sort(compareNumbers);const U=D.join("|");R=T[U],R===void 0&&(R={types:D,offset:-1},T[U]=R)}else R=null;const $=p[y.sourceFileName],H=w.reduce((U,Q,re)=>{const[ne,ee,S,W,oe]=Q;return ne===j&&U.push([re,S,W,ee,oe]),U},[]);let q=null;const J=H.filter(([,,U])=>U!==null).map(([U,,Q])=>[U,M[L[Q]]]);J.length>0&&(q={methods:J,offset:-1},b.push(q));const K=A.reduce((U,Q,re)=>{const[ne]=Q;return ne===j&&U.push([re>0?1:0,kAccPublic2]),U},[]),G=p["<init>"],Z=H.filter(([,U])=>U===G).map(([U,,,Q])=>{if(l.has(y.name)){let re=-1;const ne=w.length;for(let ee=0;ee!==ne;ee++){const[S,W,oe]=w[ee];if(S===F&&oe===G&&W===Q){re=ee;break}}return[U,kAccPublic2|kAccConstructor,re]}else return[U,kAccPublic2|kAccConstructor|kAccNative2,-1]}),X=compressClassMethodIndexes(H.filter(([,U])=>U!==G).map(([U,,,,Q])=>[U,Q|kAccPublic2|kAccNative2]));return{index:j,accessFlags:P,superClassIndex:F,interfaces:R,sourceFileIndex:$,annotationsDirectory:q,classData:{instanceFields:K,constructorMethods:Z,virtualMethods:X,offset:-1}}}),k=Object.keys(T).map(y=>T[y]);return{classes:I,interfaces:k,fields:A,methods:w,protos:m,parameters:v,annotationDirectories:b,annotationSets:M,throwsAnnotations:N,types:u,strings:d}}function compressClassMethodIndexes(t){let e=0;return t.map(([r,n],o)=>{let i;return o===0?i=[r,n]:i=[r-e,n],e=r,i})}function compareNumbers(t,e){return t-e}function compareProtoItems(t,e){const[,,r,n]=t,[,,o,i]=e;if(r<o)return-1;if(r>o)return 1;const s=n.join("|"),l=i.join("|");return s<l?-1:s>l?1:0}function compareFieldItems(t,e){const[r,n,o]=t,[i,s,l]=e;return r!==i?r-i:o!==l?o-l:n-s}function compareMethodItems(t,e){const[r,n,o]=t,[i,s,l]=e;return r!==i?r-i:o!==l?o-l:n-s}function typeToShorty(t){const e=t[0];return e==="L"||e==="["?"L":t}function createUleb128(t){if(t<=127)return[t];const e=[];let r=!1;do{let n=t&127;t>>=7,r=t!==0,r&&(n|=128),e.push(n)}while(r);return e}function align(t,e){const r=t%e;return r===0?t:t+e-r}function adler32(t,e){let r=1,n=0;const o=t.length;for(let i=e;i<o;i++)r=(r+t[i])%65521,n=(n+r)%65521;return(n<<16|r)>>>0}var mkdex_default=mkdex,JNILocalRefType=1,vm=null,primitiveArrayHandler=null;function initialize(t){vm=t}function getType(t,e,r){let n=getPrimitiveType(t);return n===null&&(t.indexOf("[")===0?n=getArrayType(t,e,r):(t[0]==="L"&&t[t.length-1]===";"&&(t=t.substring(1,t.length-1)),n=getObjectType(t,e,r))),Object.assign({className:t},n)}var primitiveTypes={boolean:{name:"Z",type:"uint8",size:1,byteSize:1,defaultValue:!1,isCompatible(t){return typeof t=="boolean"},fromJni(t){return!!t},toJni(t){return t?1:0},read(t){return t.readU8()},write(t,e){t.writeU8(e)},toString(){return this.name}},byte:{name:"B",type:"int8",size:1,byteSize:1,defaultValue:0,isCompatible(t){return Number.isInteger(t)&&t>=-128&&t<=127},fromJni:identity,toJni:identity,read(t){return t.readS8()},write(t,e){t.writeS8(e)},toString(){return this.name}},char:{name:"C",type:"uint16",size:1,byteSize:2,defaultValue:0,isCompatible(t){if(typeof t!="string"||t.length!==1)return!1;const e=t.charCodeAt(0);return e>=0&&e<=65535},fromJni(t){return String.fromCharCode(t)},toJni(t){return t.charCodeAt(0)},read(t){return t.readU16()},write(t,e){t.writeU16(e)},toString(){return this.name}},short:{name:"S",type:"int16",size:1,byteSize:2,defaultValue:0,isCompatible(t){return Number.isInteger(t)&&t>=-32768&&t<=32767},fromJni:identity,toJni:identity,read(t){return t.readS16()},write(t,e){t.writeS16(e)},toString(){return this.name}},int:{name:"I",type:"int32",size:1,byteSize:4,defaultValue:0,isCompatible(t){return Number.isInteger(t)&&t>=-2147483648&&t<=2147483647},fromJni:identity,toJni:identity,read(t){return t.readS32()},write(t,e){t.writeS32(e)},toString(){return this.name}},long:{name:"J",type:"int64",size:2,byteSize:8,defaultValue:0,isCompatible(t){return typeof t=="number"||t instanceof Int64},fromJni:identity,toJni:identity,read(t){return t.readS64()},write(t,e){t.writeS64(e)},toString(){return this.name}},float:{name:"F",type:"float",size:1,byteSize:4,defaultValue:0,isCompatible(t){return typeof t=="number"},fromJni:identity,toJni:identity,read(t){return t.readFloat()},write(t,e){t.writeFloat(e)},toString(){return this.name}},double:{name:"D",type:"double",size:2,byteSize:8,defaultValue:0,isCompatible(t){return typeof t=="number"},fromJni:identity,toJni:identity,read(t){return t.readDouble()},write(t,e){t.writeDouble(e)},toString(){return this.name}},void:{name:"V",type:"void",size:0,byteSize:0,defaultValue:void 0,isCompatible(t){return t===void 0},fromJni(){},toJni(){return NULL},toString(){return this.name}}},primitiveTypesNames=new Set(Object.values(primitiveTypes).map(t=>t.name));function getPrimitiveType(t){const e=primitiveTypes[t];return e!==void 0?e:null}function getObjectType(t,e,r){const n=r._types[e?1:0];let o=n[t];return o!==void 0||(t==="java.lang.Object"?o=getJavaLangObjectType(r):o=getAnyObjectType(t,e,r),n[t]=o),o}function getJavaLangObjectType(t){return{name:"Ljava/lang/Object;",type:"pointer",size:1,defaultValue:NULL,isCompatible(e){return e===null?!0:e===void 0?!1:e.$h instanceof NativePointer?!0:typeof e=="string"},fromJni(e,r,n){return e.isNull()?null:t.cast(e,t.use("java.lang.Object"),n)},toJni(e,r){return e===null?NULL:typeof e=="string"?r.newStringUtf(e):e.$h}}}function getAnyObjectType(t,e,r){let n=null,o=null,i=null;function s(){return n===null&&(n=r.use(t).class),n}function l(c){const d=s();return o===null&&(o=d.isInstance.overload("java.lang.Object")),o.call(d,c)}function a(){if(i===null){const c=s();i=r.use("java.lang.String").class.isAssignableFrom(c)}return i}return{name:makeJniObjectTypeName(t),type:"pointer",size:1,defaultValue:NULL,isCompatible(c){return c===null?!0:c===void 0?!1:c.$h instanceof NativePointer?l(c):typeof c=="string"&&a()},fromJni(c,d,p){return c.isNull()?null:a()&&e?d.stringFromJni(c):r.cast(c,r.use(t),p)},toJni(c,d){return c===null?NULL:typeof c=="string"?d.newStringUtf(c):c.$h},toString(){return this.name}}}var primitiveArrayTypes=[["Z","boolean"],["B","byte"],["C","char"],["D","double"],["F","float"],["I","int"],["J","long"],["S","short"]].reduce((t,[e,r])=>(t["["+e]=makePrimitiveArrayType("["+e,r),t),{});function makePrimitiveArrayType(t,e){const r=Env.prototype,n=toTitleCase(e),o={typeName:e,newArray:r["new"+n+"Array"],setRegion:r["set"+n+"ArrayRegion"],getElements:r["get"+n+"ArrayElements"],releaseElements:r["release"+n+"ArrayElements"]};return{name:t,type:"pointer",size:1,defaultValue:NULL,isCompatible(i){return isCompatiblePrimitiveArray(i,e)},fromJni(i,s,l){return fromJniPrimitiveArray(i,o,s,l)},toJni(i,s){return toJniPrimitiveArray(i,o,s)}}}function getArrayType(t,e,r){const n=primitiveArrayTypes[t];if(n!==void 0)return n;if(t.indexOf("[")!==0)throw new Error("Unsupported type: "+t);let o=t.substring(1);const i=getType(o,e,r);let s=0;const l=o.length;for(;s!==l&&o[s]==="[";)s++;o=o.substring(s),o[0]==="L"&&o[o.length-1]===";"&&(o=o.substring(1,o.length-1));let a=o.replace(/\./g,"/");primitiveTypesNames.has(a)?a="[".repeat(s)+a:a="[".repeat(s)+"L"+a+";";const c="["+a;return o="[".repeat(s)+o,{name:t.replace(/\./g,"/"),type:"pointer",size:1,defaultValue:NULL,isCompatible(d){return d===null?!0:typeof d!="object"||d.length===void 0?!1:d.every(function(p){return i.isCompatible(p)})},fromJni(d,p,u){if(d.isNull())return null;const h=[],_=p.getArrayLength(d);for(let f=0;f!==_;f++){const m=p.getObjectArrayElement(d,f);try{h.push(i.fromJni(m,p))}finally{p.deleteLocalRef(m)}}try{h.$w=r.cast(d,r.use(c),u)}catch{r.use("java.lang.reflect.Array").newInstance(r.use(o).class,0),h.$w=r.cast(d,r.use(c),u)}return h.$dispose=disposeObjectArray,h},toJni(d,p){if(d===null)return NULL;if(!(d instanceof Array))throw new Error("Expected an array");const u=d.$w;if(u!==void 0)return u.$h;const h=d.length,f=r.use(o).$borrowClassHandle(p);try{const m=p.newObjectArray(h,f.value,NULL);p.throwIfExceptionPending();for(let g=0;g!==h;g++){const v=i.toJni(d[g],p);try{p.setObjectArrayElement(m,g,v)}finally{i.type==="pointer"&&p.getObjectRefType(v)===JNILocalRefType&&p.deleteLocalRef(v)}p.throwIfExceptionPending()}return m}finally{f.unref(p)}}}}function disposeObjectArray(){const t=this.length;for(let e=0;e!==t;e++){const r=this[e];if(r===null)continue;const n=r.$dispose;if(n===void 0)break;n.call(r)}this.$w.$dispose()}function fromJniPrimitiveArray(t,e,r,n){if(t.isNull())return null;const o=getPrimitiveType(e.typeName),i=r.getArrayLength(t);return new PrimitiveArray(t,e,o,i,r,n)}function toJniPrimitiveArray(t,e,r){if(t===null)return NULL;const n=t.$h;if(n!==void 0)return n;const o=t.length,i=getPrimitiveType(e.typeName),s=e.newArray.call(r,o);if(s.isNull())throw new Error("Unable to construct array");if(o>0){const l=i.byteSize,a=i.write,c=i.toJni,d=Memory.alloc(o*i.byteSize);for(let p=0;p!==o;p++)a(d.add(p*l),c(t[p]));e.setRegion.call(r,s,0,o,d),r.throwIfExceptionPending()}return s}function isCompatiblePrimitiveArray(t,e){if(t===null)return!0;if(t instanceof PrimitiveArray)return t.$s.typeName===e;if(!(typeof t=="object"&&t.length!==void 0))return!1;const n=getPrimitiveType(e);return Array.prototype.every.call(t,o=>n.isCompatible(o))}function PrimitiveArray(t,e,r,n,o,i=!0){if(i){const s=o.newGlobalRef(t);this.$h=s,this.$r=Script.bindWeak(this,o.vm.makeHandleDestructor(s))}else this.$h=t,this.$r=null;return this.$s=e,this.$t=r,this.length=n,new Proxy(this,primitiveArrayHandler)}primitiveArrayHandler={has(t,e){return e in t?!0:t.tryParseIndex(e)!==null},get(t,e,r){const n=t.tryParseIndex(e);return n===null?t[e]:t.readElement(n)},set(t,e,r,n){const o=t.tryParseIndex(e);return o===null?(t[e]=r,!0):(t.writeElement(o,r),!0)},ownKeys(t){const e=[],{length:r}=t;for(let n=0;n!==r;n++){const o=n.toString();e.push(o)}return e.push("length"),e},getOwnPropertyDescriptor(t,e){return t.tryParseIndex(e)!==null?{writable:!0,configurable:!0,enumerable:!0}:Object.getOwnPropertyDescriptor(t,e)}},Object.defineProperties(PrimitiveArray.prototype,{$dispose:{enumerable:!0,value(){const t=this.$r;t!==null&&(this.$r=null,Script.unbindWeak(t))}},$clone:{value(t){return new PrimitiveArray(this.$h,this.$s,this.$t,this.length,t)}},tryParseIndex:{value(t){if(typeof t=="symbol")return null;const e=parseInt(t);return isNaN(e)||e<0||e>=this.length?null:e}},readElement:{value(t){return this.withElements(e=>{const r=this.$t;return r.fromJni(r.read(e.add(t*r.byteSize)))})}},writeElement:{value(t,e){const{$h:r,$s:n,$t:o}=this,i=vm.getEnv(),s=Memory.alloc(o.byteSize);o.write(s,o.toJni(e)),n.setRegion.call(i,r,t,1,s)}},withElements:{value(t){const{$h:e,$s:r}=this,n=vm.getEnv(),o=r.getElements.call(n,e);if(o.isNull())throw new Error("Unable to get array elements");try{return t(o)}finally{r.releaseElements.call(n,e,o)}}},toJSON:{value(){const{length:t,$t:e}=this,{byteSize:r,fromJni:n,read:o}=e;return this.withElements(i=>{const s=[];for(let l=0;l!==t;l++){const a=n(o(i.add(l*r)));s.push(a)}return s})}},toString:{value(){return this.toJSON().toString()}}});function makeJniObjectTypeName(t){return"L"+t.replace(/\./g,"/")+";"}function toTitleCase(t){return t.charAt(0).toUpperCase()+t.slice(1)}function identity(t){return t}var jsizeSize3=4,{ensureClassInitialized:ensureClassInitialized3,makeMethodMangler:makeMethodMangler3}=android_exports,kAccStatic2=8,CONSTRUCTOR_METHOD=1,STATIC_METHOD=2,INSTANCE_METHOD=3,STATIC_FIELD=1,INSTANCE_FIELD=2,STRATEGY_VIRTUAL=1,STRATEGY_DIRECT=2,PENDING_USE=Symbol("PENDING_USE"),DEFAULT_CACHE_DIR="/data/local/tmp",{getCurrentThreadId,pointerSize:pointerSize7}=Process,factoryCache={state:"empty",factories:[],loaders:null,Integer:null},vm2=null,api=null,isArtVm=null,wrapperHandler=null,dispatcherPrototype=null,methodPrototype=null,valueOfPrototype=null,cachedLoaderInvoke=null,cachedLoaderMethod=null,ignoredThreads=new Map,ClassFactory=class pe{static _initialize(e,r){vm2=e,api=r,isArtVm=r.flavor==="art",r.flavor==="jvm"&&(ensureClassInitialized3=ensureClassInitialized2,makeMethodMangler3=makeMethodMangler2)}static _disposeAll(e){factoryCache.factories.forEach(r=>{r._dispose(e)})}static get(e){const r=getFactoryCache(),n=r.factories[0];if(e===null)return n;const o=r.loaders.get(e);if(o!==null){const s=n.cast(o,r.Integer);return r.factories[s.intValue()]}const i=new pe;return i.loader=e,i.cacheDir=n.cacheDir,addFactoryToCache(i,e),i}constructor(){this.cacheDir=DEFAULT_CACHE_DIR,this.codeCacheDir=DEFAULT_CACHE_DIR+"/dalvik-cache",this.tempFileNaming={prefix:"frida",suffix:""},this._classes={},this._classHandles=new LRU(10,releaseClassHandle),this._patchedMethods=new Set,this._loader=null,this._types=[{},{}],factoryCache.factories.push(this)}_dispose(e){Array.from(this._patchedMethods).forEach(r=>{r.implementation=null}),this._patchedMethods.clear(),revertGlobalPatches(),this._classHandles.dispose(e),this._classes={}}get loader(){return this._loader}set loader(e){const r=this._loader===null&&e!==null;this._loader=e,r&&factoryCache.state==="ready"&&this===factoryCache.factories[0]&&addFactoryToCache(this,e)}use(e,r={}){const n=r.cache!=="skip";let o=n?this._getUsedClass(e):void 0;if(o===void 0)try{const i=vm2.getEnv(),{_loader:s}=this,l=s!==null?makeLoaderClassHandleGetter(e,s,i):makeBasicClassHandleGetter(e);o=this._make(e,l,i)}finally{n&&this._setUsedClass(e,o)}return o}_getUsedClass(e){let r;for(;(r=this._classes[e])===PENDING_USE;)Thread.sleep(.05);return r===void 0&&(this._classes[e]=PENDING_USE),r}_setUsedClass(e,r){r!==void 0?this._classes[e]=r:delete this._classes[e]}_make(e,r,n){const o=makeClassWrapperConstructor(),i=Object.create(Wrapper.prototype,{[Symbol.for("n")]:{value:e},$n:{get(){return this[Symbol.for("n")]}},[Symbol.for("C")]:{value:o},$C:{get(){return this[Symbol.for("C")]}},[Symbol.for("w")]:{value:null,writable:!0},$w:{get(){return this[Symbol.for("w")]},set(a){this[Symbol.for("w")]=a}},[Symbol.for("_s")]:{writable:!0},$_s:{get(){return this[Symbol.for("_s")]},set(a){this[Symbol.for("_s")]=a}},[Symbol.for("c")]:{value:[null]},$c:{get(){return this[Symbol.for("c")]}},[Symbol.for("m")]:{value:new Map},$m:{get(){return this[Symbol.for("m")]}},[Symbol.for("l")]:{value:null,writable:!0},$l:{get(){return this[Symbol.for("l")]},set(a){this[Symbol.for("l")]=a}},[Symbol.for("gch")]:{value:r},$gch:{get(){return this[Symbol.for("gch")]}},[Symbol.for("f")]:{value:this},$f:{get(){return this[Symbol.for("f")]}}});o.prototype=i;const s=new o(null);i[Symbol.for("w")]=s,i.$w=s;const l=s.$borrowClassHandle(n);try{const a=l.value;ensureClassInitialized3(n,a),i.$l=Model.build(a,n)}finally{l.unref(n)}return s}retain(e){const r=vm2.getEnv();return e.$clone(r)}cast(e,r,n){const o=vm2.getEnv();let i=e.$h;i===void 0&&(i=e);const s=r.$borrowClassHandle(o);try{if(!o.isInstanceOf(i,s.value))throw new Error(`Cast from '${o.getObjectClassName(i)}' to '${r.$n}' isn't possible`)}finally{s.unref(o)}const l=r.$C;return new l(i,STRATEGY_VIRTUAL,o,n)}wrap(e,r,n){const o=r.$C,i=new o(e,STRATEGY_VIRTUAL,n,!1);return i.$r=Script.bindWeak(i,vm2.makeHandleDestructor(e)),i}array(e,r){const n=vm2.getEnv(),o=getPrimitiveType(e);o!==null&&(e=o.name);const i=getArrayType("["+e,!1,this),s=i.toJni(r,n);return i.fromJni(s,n,!0)}registerClass(e){const r=vm2.getEnv(),n=[];try{const o=this.use("java.lang.Class"),i=r.javaLangReflectMethod(),s=r.vaMethod("pointer",[]),l=e.name,a=e.implements||[],c=e.superClass||this.use("java.lang.Object"),d=[],p=[],u={name:makeJniObjectTypeName(l),sourceFileName:makeSourceFileName(l),superClass:makeJniObjectTypeName(c.$n),interfaces:a.map(b=>makeJniObjectTypeName(b.$n)),fields:d,methods:p},h=a.slice();a.forEach(b=>{Array.prototype.slice.call(b.class.getInterfaces()).forEach(I=>{const k=this.cast(I,o).getCanonicalName();h.push(this.use(k))})});const _=e.fields||{};Object.getOwnPropertyNames(_).forEach(b=>{const I=this._getType(_[b]);d.push([b,I.name])});const f={},m={};h.forEach(b=>{const I=b.$borrowClassHandle(r);n.push(I);const k=I.value;b.$ownMembers.filter(y=>b[y].overloads!==void 0).forEach(y=>{const j=b[y],P=j.overloads,F=P.map(R=>makeOverloadId(y,R.returnType,R.argumentTypes));f[y]=[j,F,k],P.forEach((R,D)=>{const $=F[D];m[$]=[R,k]})})});const g=e.methods||{},A=Object.keys(g).reduce((b,I)=>{const k=g[I],y=I==="$init"?"<init>":I;return k instanceof Array?b.push(...k.map(j=>[y,j])):b.push([y,k]),b},[]),w=[];A.forEach(([b,I])=>{let k=INSTANCE_METHOD,y,j,P=[],F;if(typeof I=="function"){const H=f[b];if(H!==void 0&&Array.isArray(H)){const[q,J,K]=H;if(J.length>1)throw new Error(`More than one overload matching '${b}': signature must be specified`);delete m[J[0]];const G=q.overloads[0];k=G.type,y=G.returnType,j=G.argumentTypes,F=I;const Z=r.toReflectedMethod(K,G.handle,0),X=s(r.handle,Z,i.getGenericExceptionTypes);P=readTypeNames(r,X).map(makeJniObjectTypeName),r.deleteLocalRef(X),r.deleteLocalRef(Z)}else y=this._getType("void"),j=[],F=I}else{if(I.isStatic&&(k=STATIC_METHOD),y=this._getType(I.returnType||"void"),j=(I.argumentTypes||[]).map(J=>this._getType(J)),F=I.implementation,typeof F!="function")throw new Error("Expected a function implementation for method: "+b);const H=makeOverloadId(b,y,j),q=m[H];if(q!==void 0){const[J,K]=q;delete m[H],k=J.type,y=J.returnType,j=J.argumentTypes;const G=r.toReflectedMethod(K,J.handle,0),Z=s(r.handle,G,i.getGenericExceptionTypes);P=readTypeNames(r,Z).map(makeJniObjectTypeName),r.deleteLocalRef(Z),r.deleteLocalRef(G)}}const R=y.name,D=j.map(H=>H.name),$="("+D.join("")+")"+R;p.push([b,R,D,P,k===STATIC_METHOD?kAccStatic2:0]),w.push([b,$,k,y,j,F])});const N=Object.keys(m);if(N.length>0)throw new Error("Missing implementation for: "+N.join(", "));const M=DexFile.fromBuffer(mkdex_default(u),this);try{M.load()}finally{M.file.delete()}const L=this.use(e.name),T=A.length;if(T>0){const b=3*pointerSize7,I=Memory.alloc(T*b),k=[],y=[];w.forEach(([F,R,D,$,H,q],J)=>{const K=Memory.allocUtf8String(F),G=Memory.allocUtf8String(R),Z=implement(F,L,D,$,H,q);I.add(J*b).writePointer(K),I.add(J*b+pointerSize7).writePointer(G),I.add(J*b+2*pointerSize7).writePointer(Z),y.push(K,G),k.push(Z)});const j=L.$borrowClassHandle(r);n.push(j);const P=j.value;r.registerNatives(P,I,T),r.throwIfExceptionPending(),L.$nativeMethods=k}return L}finally{n.forEach(o=>{o.unref(r)})}}choose(e,r){const n=vm2.getEnv(),{flavor:o}=api;if(o==="jvm")this._chooseObjectsJvm(e,n,r);else if(o==="art"){const i=api["art::gc::Heap::VisitObjects"]===void 0;if(i&&api["art::gc::Heap::GetInstances"]===void 0)return this._chooseObjectsJvm(e,n,r);withRunnableArtThread(vm2,n,s=>{i?this._chooseObjectsArtPreA12(e,n,s,r):this._chooseObjectsArtLegacy(e,n,s,r)})}else this._chooseObjectsDalvik(e,n,r)}_chooseObjectsJvm(e,r,n){const o=this.use(e),{jvmti:i}=api,s=1,l=3,a=o.$borrowClassHandle(r),c=int64(a.value.toString());try{const d=new NativeCallback((g,v,A,w)=>(A.writeS64(c),s),"int",["int64","int64","pointer","pointer"]);i.iterateOverInstancesOfClass(a.value,l,d,a.value);const p=Memory.alloc(8);p.writeS64(c);const u=Memory.alloc(jsizeSize3),h=Memory.alloc(pointerSize7);i.getObjectsWithTags(1,p,u,h,NULL);const _=u.readS32(),f=h.readPointer(),m=[];for(let g=0;g!==_;g++)m.push(f.add(g*pointerSize7).readPointer());i.deallocate(f);try{for(const g of m){const v=this.cast(g,o);if(n.onMatch(v)==="stop")break}n.onComplete()}finally{m.forEach(g=>{r.deleteLocalRef(g)})}}finally{a.unref(r)}}_chooseObjectsArtPreA12(e,r,n,o){const i=this.use(e),s=VariableSizedHandleScope.$new(n,vm2);let l;const a=i.$borrowClassHandle(r);try{const u=api["art::JavaVMExt::DecodeGlobal"](api.vm,n,a.value);l=s.newHandle(u)}finally{a.unref(r)}const c=0,d=HandleVector.$new();api["art::gc::Heap::GetInstances"](api.artHeap,s,l,c,d);const p=d.handles.map(u=>r.newGlobalRef(u));d.$delete(),s.$delete();try{for(const u of p){const h=this.cast(u,i);if(o.onMatch(h)==="stop")break}o.onComplete()}finally{p.forEach(u=>{r.deleteGlobalRef(u)})}}_chooseObjectsArtLegacy(e,r,n,o){const i=this.use(e),s=[],l=api["art::JavaVMExt::AddGlobalRef"],a=api.vm;let c;const d=i.$borrowClassHandle(r);try{c=api["art::JavaVMExt::DecodeGlobal"](a,n,d.value).toInt32()}finally{d.unref(r)}const p=makeObjectVisitorPredicate(c,u=>{s.push(l(a,n,u))});api["art::gc::Heap::VisitObjects"](api.artHeap,p,NULL);try{for(const u of s){const h=this.cast(u,i);if(o.onMatch(h)==="stop")break}}finally{s.forEach(u=>{r.deleteGlobalRef(u)})}o.onComplete()}_chooseObjectsDalvik(e,r,n){const o=this.use(e);if(api.addLocalReference===null){const s=Process.getModuleByName("libdvm.so");let l;switch(Process.arch){case"arm":l="2d e9 f0 41 05 46 15 4e 0c 46 7e 44 11 b3 43 68";break;case"ia32":l="8d 64 24 d4 89 5c 24 1c 89 74 24 20 e8 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? 85 d2";break}Memory.scan(s.base,s.size,l,{onMatch:(a,c)=>{let d;if(Process.arch==="arm")a=a.or(1),d=new NativeFunction(a,"pointer",["pointer","pointer"]);else{const p=Memory.alloc(Process.pageSize);Memory.patchCode(p,16,u=>{const h=new X86Writer(u,{pc:p});h.putMovRegRegOffsetPtr("eax","esp",4),h.putMovRegRegOffsetPtr("edx","esp",8),h.putJmpAddress(a),h.flush()}),d=new NativeFunction(p,"pointer",["pointer","pointer"]),d._thunk=p}return api.addLocalReference=d,vm2.perform(p=>{i(this,p)}),"stop"},onError(a){},onComplete(){api.addLocalReference===null&&n.onComplete()}})}else i(this,r);function i(s,l){const{DVM_JNI_ENV_OFFSET_SELF:a}=android_exports,c=l.handle.add(a).readPointer();let d;const p=o.$borrowClassHandle(l);try{d=api.dvmDecodeIndirectRef(c,p.value)}finally{p.unref(l)}const u=d.toMatchPattern(),h=api.dvmHeapSourceGetBase(),f=api.dvmHeapSourceGetLimit().sub(h).toInt32();Memory.scan(h,f,u,{onMatch:(m,g)=>{api.dvmIsValidObject(m)&&vm2.perform(v=>{const A=v.handle.add(a).readPointer();let w;const N=api.addLocalReference(A,m);try{w=s.cast(N,o)}finally{v.deleteLocalRef(N)}if(n.onMatch(w)==="stop")return"stop"})},onError(m){},onComplete(){n.onComplete()}})}}openClassFile(e){return new DexFile(e,null,this)}_getType(e,r=!0){return getType(e,r,this)}};function makeClassWrapperConstructor(){return function(t,e,r,n){return Wrapper.call(this,t,e,r,n)}}function Wrapper(t,e,r,n=!0){if(t!==null)if(n){const o=r.newGlobalRef(t);this.$h=o,this.$r=Script.bindWeak(this,vm2.makeHandleDestructor(o))}else this.$h=t,this.$r=null;else this.$h=null,this.$r=null;return this.$t=e,new Proxy(this,wrapperHandler)}wrapperHandler={has(t,e){return e in t?!0:t.$has(e)},get(t,e,r){if(typeof e!="string"||e.startsWith("$")||e==="class")return t[e];const n=t.$find(e);return n!==null?n(r):t[e]},set(t,e,r,n){return t[e]=r,!0},ownKeys(t){return t.$list()},getOwnPropertyDescriptor(t,e){return Object.prototype.hasOwnProperty.call(t,e)?Object.getOwnPropertyDescriptor(t,e):{writable:!1,configurable:!0,enumerable:!0}}},Object.defineProperties(Wrapper.prototype,{[Symbol.for("new")]:{enumerable:!1,get(){return this.$getCtor("allocAndInit")}},$new:{enumerable:!0,get(){return this[Symbol.for("new")]}},[Symbol.for("alloc")]:{enumerable:!1,value(){const t=vm2.getEnv(),e=this.$borrowClassHandle(t);try{const r=t.allocObject(e.value);return this.$f.cast(r,this)}finally{e.unref(t)}}},$alloc:{enumerable:!0,get(){return this[Symbol.for("alloc")]}},[Symbol.for("init")]:{enumerable:!1,get(){return this.$getCtor("initOnly")}},$init:{enumerable:!0,get(){return this[Symbol.for("init")]}},[Symbol.for("dispose")]:{enumerable:!1,value(){const t=this.$r;t!==null&&(this.$r=null,Script.unbindWeak(t)),this.$h!==null&&(this.$h=void 0)}},$dispose:{enumerable:!0,get(){return this[Symbol.for("dispose")]}},[Symbol.for("clone")]:{enumerable:!1,value(t){const e=this.$C;return new e(this.$h,this.$t,t)}},$clone:{value(t){return this[Symbol.for("clone")](t)}},[Symbol.for("class")]:{enumerable:!1,get(){const t=vm2.getEnv(),e=this.$borrowClassHandle(t);try{const r=this.$f;return r.cast(e.value,r.use("java.lang.Class"))}finally{e.unref(t)}}},class:{enumerable:!0,get(){return this[Symbol.for("class")]}},[Symbol.for("className")]:{enumerable:!1,get(){const t=this.$h;return t===null?this.$n:vm2.getEnv().getObjectClassName(t)}},$className:{enumerable:!0,get(){return this[Symbol.for("className")]}},[Symbol.for("ownMembers")]:{enumerable:!1,get(){return this.$l.list()}},$ownMembers:{enumerable:!0,get(){return this[Symbol.for("ownMembers")]}},[Symbol.for("super")]:{enumerable:!1,get(){const t=vm2.getEnv(),e=this.$s.$C;return new e(this.$h,STRATEGY_DIRECT,t)}},$super:{enumerable:!0,get(){return this[Symbol.for("super")]}},[Symbol.for("s")]:{enumerable:!1,get(){const t=Object.getPrototypeOf(this);let e=t.$_s;if(e===void 0){const r=vm2.getEnv(),n=this.$borrowClassHandle(r);try{const o=r.getSuperclass(n.value);if(o.isNull())e=null;else try{const i=r.getClassName(o),s=t.$f;if(e=s._getUsedClass(i),e===void 0)try{const l=makeSuperHandleGetter(this);e=s._make(i,l,r)}finally{s._setUsedClass(i,e)}}finally{r.deleteLocalRef(o)}}finally{n.unref(r)}t.$_s=e}return e}},$s:{get(){return this[Symbol.for("s")]}},[Symbol.for("isSameObject")]:{enumerable:!1,value(t){return vm2.getEnv().isSameObject(t.$h,this.$h)}},$isSameObject:{value(t){return this[Symbol.for("isSameObject")](t)}},[Symbol.for("getCtor")]:{enumerable:!1,value(t){const e=this.$c;let r=e[0];if(r===null){const n=vm2.getEnv(),o=this.$borrowClassHandle(n);try{r=makeConstructor(o.value,this.$w,n),e[0]=r}finally{o.unref(n)}}return r[t]}},$getCtor:{value(t){return this[Symbol.for("getCtor")](t)}},[Symbol.for("borrowClassHandle")]:{enumerable:!1,value(t){const e=this.$n,r=this.$f._classHandles;let n=r.get(e);return n===void 0&&(n=new ClassHandle(this.$gch(t),t),r.set(e,n,t)),n.ref()}},$borrowClassHandle:{value(t){return this[Symbol.for("borrowClassHandle")](t)}},[Symbol.for("copyClassHandle")]:{enumerable:!1,value(t){const e=this.$borrowClassHandle(t);try{return t.newLocalRef(e.value)}finally{e.unref(t)}}},$copyClassHandle:{value(t){return this[Symbol.for("copyClassHandle")](t)}},[Symbol.for("getHandle")]:{enumerable:!1,value(t){const e=this.$h;if(e===void 0)throw new Error("Wrapper is disposed; perhaps it was borrowed from a hook instead of calling Java.retain() to make a long-lived wrapper?");return e}},$getHandle:{value(t){return this[Symbol.for("getHandle")](t)}},[Symbol.for("list")]:{enumerable:!1,value(){const t=this.$s,e=t!==null?t.$list():[],r=this.$l;return Array.from(new Set(e.concat(r.list())))}},$list:{get(){return this[Symbol.for("list")]}},[Symbol.for("has")]:{enumerable:!1,value(t){if(this.$m.has(t)||this.$l.has(t))return!0;const n=this.$s;return!!(n!==null&&n.$has(t))}},$has:{value(t){return this[Symbol.for("has")](t)}},[Symbol.for("find")]:{enumerable:!1,value(t){const e=this.$m;let r=e.get(t);if(r!==void 0)return r;const o=this.$l.find(t);if(o!==null){const s=vm2.getEnv(),l=this.$borrowClassHandle(s);try{r=makeMember(t,o,l.value,this.$w,s)}finally{l.unref(s)}return e.set(t,r),r}const i=this.$s;return i!==null?i.$find(t):null}},$find:{value(t){return this[Symbol.for("find")](t)}},[Symbol.for("toJSON")]:{enumerable:!1,value(){const t=this.$n;if(this.$h===null)return`<class: ${t}>`;const r=this.$className;return t===r?`<instance: ${t}>`:`<instance: ${t}, $className: ${r}>`}},toJSON:{get(){return this[Symbol.for("toJSON")]}}});function ClassHandle(t,e){this.value=e.newGlobalRef(t),e.deleteLocalRef(t),this.refs=1}ClassHandle.prototype.ref=function(){return this.refs++,this},ClassHandle.prototype.unref=function(t){--this.refs===0&&t.deleteGlobalRef(this.value)};function releaseClassHandle(t,e){t.unref(e)}function makeBasicClassHandleGetter(t){const e=t.replace(/\./g,"/");return function(r){const n=getCurrentThreadId();ignore(n);try{return r.findClass(e)}finally{unignore(n)}}}function makeLoaderClassHandleGetter(t,e,r){return cachedLoaderMethod===null&&(cachedLoaderInvoke=r.vaMethod("pointer",["pointer"]),cachedLoaderMethod=e.loadClass.overload("java.lang.String").handle),r=null,function(n){const o=n.newStringUtf(t),i=getCurrentThreadId();ignore(i);try{const s=cachedLoaderInvoke(n.handle,e.$h,cachedLoaderMethod,o);return n.throwIfExceptionPending(),s}finally{unignore(i),n.deleteLocalRef(o)}}}function makeSuperHandleGetter(t){return function(e){const r=t.$borrowClassHandle(e);try{return e.getSuperclass(r.value)}finally{r.unref(e)}}}function makeConstructor(t,e,r){const{$n:n,$f:o}=e,i=basename(n),s=r.javaLangClass(),l=r.javaLangReflectConstructor(),a=r.vaMethod("pointer",[]),c=r.vaMethod("uint8",[]),d=[],p=[],u=o._getType(n,!1),h=o._getType("void",!1),_=a(r.handle,t,s.getDeclaredConstructors);try{const f=r.getArrayLength(_);if(f!==0)for(let m=0;m!==f;m++){let g,v;const A=r.getObjectArrayElement(_,m);try{g=r.fromReflectedMethod(A),v=a(r.handle,A,l.getGenericParameterTypes)}finally{r.deleteLocalRef(A)}let w;try{w=readTypeNames(r,v).map(N=>o._getType(N))}finally{r.deleteLocalRef(v)}d.push(makeMethod(i,e,CONSTRUCTOR_METHOD,g,u,w,r)),p.push(makeMethod(i,e,INSTANCE_METHOD,g,h,w,r))}else{if(c(r.handle,t,s.isInterface))throw new Error("cannot instantiate an interface");const g=r.javaLangObject(),v=r.getMethodId(g,"<init>","()V");d.push(makeMethod(i,e,CONSTRUCTOR_METHOD,v,u,[],r)),p.push(makeMethod(i,e,INSTANCE_METHOD,v,h,[],r))}}finally{r.deleteLocalRef(_)}if(p.length===0)throw new Error("no supported overloads");return{allocAndInit:makeMethodDispatcher(d),initOnly:makeMethodDispatcher(p)}}function makeMember(t,e,r,n,o){return e.startsWith("m")?makeMethodFromSpec(t,e,r,n,o):makeFieldFromSpec(t,e,r,n,o)}function makeMethodFromSpec(t,e,r,n,o){const{$f:i}=n,s=e.split(":").slice(1),l=o.javaLangReflectMethod(),a=o.vaMethod("pointer",[]),c=o.vaMethod("uint8",[]),d=s.map(u=>{const h=u[0]==="s"?STATIC_METHOD:INSTANCE_METHOD,_=ptr(u.substr(1));let f;const m=[],g=o.toReflectedMethod(r,_,h===STATIC_METHOD?1:0);try{const v=!!c(o.handle,g,l.isVarArgs),A=a(o.handle,g,l.getGenericReturnType);o.throwIfExceptionPending();try{f=i._getType(o.getTypeName(A))}finally{o.deleteLocalRef(A)}const w=a(o.handle,g,l.getParameterTypes);try{const N=o.getArrayLength(w);for(let M=0;M!==N;M++){const L=o.getObjectArrayElement(w,M);let T;try{T=v&&M===N-1?o.getArrayTypeName(L):o.getTypeName(L)}finally{o.deleteLocalRef(L)}const b=i._getType(T);m.push(b)}}finally{o.deleteLocalRef(w)}}catch{return null}finally{o.deleteLocalRef(g)}return makeMethod(t,n,h,_,f,m,o)}).filter(u=>u!==null);if(d.length===0)throw new Error("No supported overloads");t==="valueOf"&&ensureDefaultValueOfImplemented(d);const p=makeMethodDispatcher(d);return function(u){return p}}function makeMethodDispatcher(t){const e=makeMethodDispatcherCallable();return Object.setPrototypeOf(e,dispatcherPrototype),e._o=t,e}function makeMethodDispatcherCallable(){const t=function(){return t.invoke(this,arguments)};return t}dispatcherPrototype=Object.create(Function.prototype,{overloads:{enumerable:!0,get(){return this._o}},overload:{value(...t){const e=this._o,r=t.length,n=t.join(":");for(let o=0;o!==e.length;o++){const i=e[o],{argumentTypes:s}=i;if(s.length!==r)continue;if(s.map(a=>a.className).join(":")===n)return i}throwOverloadError(this.methodName,this.overloads,"specified argument types do not match any of:")}},methodName:{enumerable:!0,get(){return this._o[0].methodName}},holder:{enumerable:!0,get(){return this._o[0].holder}},type:{enumerable:!0,get(){return this._o[0].type}},handle:{enumerable:!0,get(){return throwIfDispatcherAmbiguous(this),this._o[0].handle}},implementation:{enumerable:!0,get(){return throwIfDispatcherAmbiguous(this),this._o[0].implementation},set(t){throwIfDispatcherAmbiguous(this),this._o[0].implementation=t}},returnType:{enumerable:!0,get(){return throwIfDispatcherAmbiguous(this),this._o[0].returnType}},argumentTypes:{enumerable:!0,get(){return throwIfDispatcherAmbiguous(this),this._o[0].argumentTypes}},canInvokeWith:{enumerable:!0,get(t){return throwIfDispatcherAmbiguous(this),this._o[0].canInvokeWith}},clone:{enumerable:!0,value(t){return throwIfDispatcherAmbiguous(this),this._o[0].clone(t)}},invoke:{value(t,e){const r=this._o,n=t.$h!==null;for(let o=0;o!==r.length;o++){const i=r[o];if(i.canInvokeWith(e)){if(i.type===INSTANCE_METHOD&&!n){const s=this.methodName;if(s==="toString")return`<class: ${t.$n}>`;throw new Error(s+": cannot call instance method without an instance")}return i.apply(t,e)}}if(this.methodName==="toString")return`<class: ${t.$n}>`;throwOverloadError(this.methodName,this.overloads,"argument types do not match any of:")}}});function makeOverloadId(t,e,r){return`${e.className} ${t}(${r.map(n=>n.className).join(", ")})`}function throwIfDispatcherAmbiguous(t){const e=t._o;e.length>1&&throwOverloadError(e[0].methodName,e,"has more than one overload, use .overload(<signature>) to choose from:")}function throwOverloadError(t,e,r){const o=e.slice().sort((i,s)=>i.argumentTypes.length-s.argumentTypes.length).map(i=>i.argumentTypes.length>0?".overload('"+i.argumentTypes.map(l=>l.className).join("', '")+"')":".overload()");throw new Error(`${t}(): ${r}
	${o.join(`
	`)}`)}function makeMethod(t,e,r,n,o,i,s,l){const a=o.type,c=i.map(u=>u.type);s===null&&(s=vm2.getEnv());let d,p;return r===INSTANCE_METHOD?(d=s.vaMethod(a,c,l),p=s.nonvirtualVaMethod(a,c,l)):r===STATIC_METHOD?(d=s.staticVaMethod(a,c,l),p=d):(d=s.constructor(c,l),p=d),makeMethodInstance([t,e,r,n,o,i,d,p])}function makeMethodInstance(t){const e=makeMethodCallable();return Object.setPrototypeOf(e,methodPrototype),e._p=t,e}function makeMethodCallable(){const t=function(){return t.invoke(this,arguments)};return t}methodPrototype=Object.create(Function.prototype,{methodName:{enumerable:!0,get(){return this._p[0]}},holder:{enumerable:!0,get(){return this._p[1]}},type:{enumerable:!0,get(){return this._p[2]}},handle:{enumerable:!0,get(){return this._p[3]}},implementation:{enumerable:!0,get(){const t=this._r;return t!==void 0?t:null},set(t){const e=this._p,r=e[1];if(e[2]===CONSTRUCTOR_METHOD)throw new Error("Reimplementing $new is not possible; replace implementation of $init instead");const o=this._r;if(o!==void 0&&(r.$f._patchedMethods.delete(this),o._m.revert(vm2),this._r=void 0),t!==null){const[i,s,l,a,c,d]=e,p=implement(i,s,l,c,d,t,this),u=makeMethodMangler3(a);p._m=u,this._r=p,u.replace(p,l===INSTANCE_METHOD,d,vm2,api),r.$f._patchedMethods.add(this)}}},returnType:{enumerable:!0,get(){return this._p[4]}},argumentTypes:{enumerable:!0,get(){return this._p[5]}},canInvokeWith:{enumerable:!0,value(t){const e=this._p[5];return t.length!==e.length?!1:e.every((r,n)=>r.isCompatible(t[n]))}},clone:{enumerable:!0,value(t){const e=this._p.slice(0,6);return makeMethod(...e,null,t)}},invoke:{value(t,e){const r=vm2.getEnv(),n=this._p,o=n[2],i=n[4],s=n[5],l=this._r,a=o===INSTANCE_METHOD,c=e.length,d=2+c;r.pushLocalFrame(d);let p=null;try{let u;a?u=t.$getHandle():(p=t.$borrowClassHandle(r),u=p.value);let h,_=t.$t;l===void 0?h=n[3]:(h=l._m.resolveTarget(t,a,r,api),isArtVm&&l._c.has(getCurrentThreadId())&&(_=STRATEGY_DIRECT));const f=[r.handle,u,h];for(let v=0;v!==c;v++)f.push(s[v].toJni(e[v],r));let m;_===STRATEGY_VIRTUAL?m=n[6]:(m=n[7],a&&f.splice(2,0,t.$copyClassHandle(r)));const g=m.apply(null,f);return r.throwIfExceptionPending(),i.fromJni(g,r,!0)}finally{p!==null&&p.unref(r),r.popLocalFrame(NULL)}}},toString:{enumerable:!0,value(){return`function ${this.methodName}(${this.argumentTypes.map(t=>t.className).join(", ")}): ${this.returnType.className}`}}});function implement(t,e,r,n,o,i,s=null){const l=new Set,a=makeMethodImplementation([t,e,r,n,o,i,s,l]),c=new NativeCallback(a,n.type,["pointer","pointer"].concat(o.map(d=>d.type)));return c._c=l,c}function makeMethodImplementation(t){return function(){return handleMethodInvocation(arguments,t)}}function handleMethodInvocation(t,e){const r=new Env(t[0],vm2),[n,o,i,s,l,a,c,d]=e,p=[];let u;if(i===INSTANCE_METHOD){const f=o.$C;u=new f(t[1],STRATEGY_VIRTUAL,r,!1)}else u=o;const h=getCurrentThreadId();r.pushLocalFrame(3);let _=!0;vm2.link(h,r);try{d.add(h);let f;c===null||!ignoredThreads.has(h)?f=a:f=c;const m=[],g=t.length-2;for(let w=0;w!==g;w++){const M=l[w].fromJni(t[2+w],r,!1);m.push(M),p.push(M)}const v=f.apply(u,m);if(!s.isCompatible(v))throw new Error(`Implementation for ${n} expected return value compatible with ${s.className}`);let A=s.toJni(v,r);return s.type==="pointer"&&(A=r.popLocalFrame(A),_=!1,p.push(v)),A}catch(f){const m=f.$h;return m!==void 0?r.throw(m):Script.nextTick(()=>{throw f}),s.defaultValue}finally{vm2.unlink(h),_&&r.popLocalFrame(NULL),d.delete(h),p.forEach(f=>{if(f===null)return;const m=f.$dispose;m!==void 0&&m.call(f)})}}function ensureDefaultValueOfImplemented(t){const{holder:e,type:r}=t[0];t.some(o=>o.type===r&&o.argumentTypes.length===0)||t.push(makeValueOfMethod([e,r]))}function makeValueOfMethod(t){const e=makeValueOfCallable();return Object.setPrototypeOf(e,valueOfPrototype),e._p=t,e}function makeValueOfCallable(){return function(){return this}}valueOfPrototype=Object.create(Function.prototype,{methodName:{enumerable:!0,get(){return"valueOf"}},holder:{enumerable:!0,get(){return this._p[0]}},type:{enumerable:!0,get(){return this._p[1]}},handle:{enumerable:!0,get(){return NULL}},implementation:{enumerable:!0,get(){return null},set(t){}},returnType:{enumerable:!0,get(){const t=this.holder;return t.$f.use(t.$n)}},argumentTypes:{enumerable:!0,get(){return[]}},canInvokeWith:{enumerable:!0,value(t){return t.length===0}},clone:{enumerable:!0,value(t){throw new Error("Invalid operation")}}});function makeFieldFromSpec(t,e,r,n,o){const i=e[2]==="s"?STATIC_FIELD:INSTANCE_FIELD,s=ptr(e.substr(3)),{$f:l}=n;let a;const c=o.toReflectedField(r,s,i===STATIC_FIELD?1:0);try{a=o.vaMethod("pointer",[])(o.handle,c,o.javaLangReflectField().getGenericType),o.throwIfExceptionPending()}finally{o.deleteLocalRef(c)}let d;try{d=l._getType(o.getTypeName(a))}finally{o.deleteLocalRef(a)}let p,u;const h=d.type;return i===STATIC_FIELD?(p=o.getStaticField(h),u=o.setStaticField(h)):(p=o.getField(h),u=o.setField(h)),makeFieldFromParams([i,d,s,p,u])}function makeFieldFromParams(t){return function(e){return new Field([e].concat(t))}}function Field(t){this._p=t}Object.defineProperties(Field.prototype,{value:{enumerable:!0,get(){const[t,e,r,n,o]=this._p,i=vm2.getEnv();i.pushLocalFrame(4);let s=null;try{let l;if(e===INSTANCE_FIELD){if(l=t.$getHandle(),l===null)throw new Error("Cannot access an instance field without an instance")}else s=t.$borrowClassHandle(i),l=s.value;const a=o(i.handle,l,n);return i.throwIfExceptionPending(),r.fromJni(a,i,!0)}finally{s!==null&&s.unref(i),i.popLocalFrame(NULL)}},set(t){const[e,r,n,o,,i]=this._p,s=vm2.getEnv();s.pushLocalFrame(4);let l=null;try{let a;if(r===INSTANCE_FIELD){if(a=e.$getHandle(),a===null)throw new Error("Cannot access an instance field without an instance")}else l=e.$borrowClassHandle(s),a=l.value;if(!n.isCompatible(t))throw new Error(`Expected value compatible with ${n.className}`);const c=n.toJni(t,s);i(s.handle,a,o,c),s.throwIfExceptionPending()}finally{l!==null&&l.unref(s),s.popLocalFrame(NULL)}}},holder:{enumerable:!0,get(){return this._p[0]}},fieldType:{enumerable:!0,get(){return this._p[1]}},fieldReturnType:{enumerable:!0,get(){return this._p[2]}},toString:{enumerable:!0,value(){const t=`Java.Field{holder: ${this.holder}, fieldType: ${this.fieldType}, fieldReturnType: ${this.fieldReturnType}, value: ${this.value}}`;return t.length<200?t:`Java.Field{
	holder: ${this.holder},
	fieldType: ${this.fieldType},
	fieldReturnType: ${this.fieldReturnType},
	value: ${this.value},
}`.split(`
`).map(r=>r.length>200?r.slice(0,r.indexOf(" ")+1)+"...,":r).join(`
`)}}});var DexFile=class he{static fromBuffer(e,r){const n=createTemporaryDex(r),o=n.getCanonicalPath().toString(),i=new File(o,"w");return i.write(e.buffer),i.close(),setReadOnlyDex(o,r),new he(o,n,r)}constructor(e,r,n){this.path=e,this.file=r,this._factory=n}load(){const{_factory:e}=this,{codeCacheDir:r}=e,n=e.use("dalvik.system.DexClassLoader"),o=e.use("java.io.File");let i=this.file;if(i===null&&(i=e.use("java.io.File").$new(this.path)),!i.exists())throw new Error("File not found");o.$new(r).mkdirs(),e.loader=n.$new(i.getCanonicalPath(),r,null,e.loader),vm2.preventDetachDueToClassLoader()}getClassNames(){const{_factory:e}=this,r=e.use("dalvik.system.DexFile"),n=createTemporaryDex(e),o=r.loadDex(this.path,n.getCanonicalPath(),0),i=[],s=o.entries();for(;s.hasMoreElements();)i.push(s.nextElement().toString());return i}};function createTemporaryDex(t){const{cacheDir:e,tempFileNaming:r}=t,n=t.use("java.io.File"),o=n.$new(e);return o.mkdirs(),n.createTempFile(r.prefix,r.suffix+".dex",o)}function setReadOnlyDex(t,e){e.use("java.io.File").$new(t).setWritable(!1,!1)}function getFactoryCache(){switch(factoryCache.state){case"empty":{factoryCache.state="pending";const t=factoryCache.factories[0],e=t.use("java.util.HashMap"),r=t.use("java.lang.Integer");factoryCache.loaders=e.$new(),factoryCache.Integer=r;const n=t.loader;return n!==null&&addFactoryToCache(t,n),factoryCache.state="ready",factoryCache}case"pending":do Thread.sleep(.05);while(factoryCache.state==="pending");return factoryCache;case"ready":return factoryCache}}function addFactoryToCache(t,e){const{factories:r,loaders:n,Integer:o}=factoryCache,i=o.$new(r.indexOf(t));n.put(e,i);for(let s=e.getParent();s!==null&&!n.containsKey(s);s=s.getParent())n.put(s,i)}function ignore(t){let e=ignoredThreads.get(t);e===void 0&&(e=0),e++,ignoredThreads.set(t,e)}function unignore(t){let e=ignoredThreads.get(t);if(e===void 0)throw new Error(`Thread ${t} is not ignored`);e--,e===0?ignoredThreads.delete(t):ignoredThreads.set(t,e)}function basename(t){return t.slice(t.lastIndexOf(".")+1)}function readTypeNames(t,e){const r=[],n=t.getArrayLength(e);for(let o=0;o!==n;o++){const i=t.getObjectArrayElement(e,o);try{r.push(t.getTypeName(i))}finally{t.deleteLocalRef(i)}}return r}function makeSourceFileName(t){const e=t.split(".");return e[e.length-1]+".java"}var jsizeSize4=4,pointerSize8=Process.pointerSize,Runtime=class{ACC_PUBLIC=1;ACC_PRIVATE=2;ACC_PROTECTED=4;ACC_STATIC=8;ACC_FINAL=16;ACC_SYNCHRONIZED=32;ACC_BRIDGE=64;ACC_VARARGS=128;ACC_NATIVE=256;ACC_ABSTRACT=1024;ACC_STRICT=2048;ACC_SYNTHETIC=4096;constructor(){this.classFactory=null,this.ClassFactory=ClassFactory,this.vm=null,this.api=null,this._initialized=!1,this._apiError=null,this._wakeupHandler=null,this._pollListener=null,this._pendingMainOps=[],this._pendingVmOps=[],this._cachedIsAppProcess=null;try{this._tryInitialize()}catch{}}_tryInitialize(){if(this._initialized)return!0;if(this._apiError!==null)throw this._apiError;let t;try{t=api_default(),this.api=t}catch(r){throw this._apiError=r,r}if(t===null)return!1;const e=new VM(t);return this.vm=e,initialize(e),ClassFactory._initialize(e,t),this.classFactory=new ClassFactory,this._initialized=!0,!0}_dispose(){if(this.api===null)return;const{vm:t}=this;t.perform(e=>{ClassFactory._disposeAll(e),Env.dispose(e)}),Script.nextTick(()=>{VM.dispose(t)})}get available(){return this._tryInitialize()}get androidVersion(){return getAndroidVersion()}synchronized(t,e){const{$h:r=t}=t;if(!(r instanceof NativePointer))throw new Error("Java.synchronized: the first argument `obj` must be either a pointer or a Java instance");const n=this.vm.getEnv();checkJniResult("VM::MonitorEnter",n.monitorEnter(r));try{e()}finally{n.monitorExit(r)}}enumerateLoadedClasses(t){this._checkAvailable();const{flavor:e}=this.api;e==="jvm"?this._enumerateLoadedClassesJvm(t):e==="art"?this._enumerateLoadedClassesArt(t):this._enumerateLoadedClassesDalvik(t)}enumerateLoadedClassesSync(){const t=[];return this.enumerateLoadedClasses({onMatch(e){t.push(e)},onComplete(){}}),t}enumerateClassLoaders(t){this._checkAvailable();const{flavor:e}=this.api;if(e==="jvm")this._enumerateClassLoadersJvm(t);else if(e==="art")this._enumerateClassLoadersArt(t);else throw new Error("Enumerating class loaders is not supported on Dalvik")}enumerateClassLoadersSync(){const t=[];return this.enumerateClassLoaders({onMatch(e){t.push(e)},onComplete(){}}),t}_enumerateLoadedClassesJvm(t){const{api:e,vm:r}=this,{jvmti:n}=e,o=r.getEnv(),i=Memory.alloc(jsizeSize4),s=Memory.alloc(pointerSize8);n.getLoadedClasses(i,s);const l=i.readS32(),a=s.readPointer(),c=[];for(let d=0;d!==l;d++)c.push(a.add(d*pointerSize8).readPointer());n.deallocate(a);try{for(const d of c){const p=o.getClassName(d);t.onMatch(p,d)}t.onComplete()}finally{c.forEach(d=>{o.deleteLocalRef(d)})}}_enumerateClassLoadersJvm(t){this.choose("java.lang.ClassLoader",t)}_enumerateLoadedClassesArt(t){const{vm:e,api:r}=this,n=e.getEnv(),o=r["art::JavaVMExt::AddGlobalRef"],{vm:i}=r;withRunnableArtThread(e,n,s=>{const l=makeArtClassVisitor(a=>{const c=o(i,s,a);try{const d=n.getClassName(c);t.onMatch(d,c)}finally{n.deleteGlobalRef(c)}return!0});r["art::ClassLinker::VisitClasses"](r.artClassLinker.address,l)}),t.onComplete()}_enumerateClassLoadersArt(t){const{classFactory:e,vm:r,api:n}=this,o=r.getEnv(),i=n["art::ClassLinker::VisitClassLoaders"];if(i===void 0)throw new Error("This API is only available on Android >= 7.0");const s=e.use("java.lang.ClassLoader"),l=[],a=n["art::JavaVMExt::AddGlobalRef"],{vm:c}=n;withRunnableArtThread(r,o,d=>{const p=makeArtClassLoaderVisitor(u=>(l.push(a(c,d,u)),!0));withAllArtThreadsSuspended(()=>{i(n.artClassLinker.address,p)})});try{l.forEach(d=>{const p=e.cast(d,s);t.onMatch(p)})}finally{l.forEach(d=>{o.deleteGlobalRef(d)})}t.onComplete()}_enumerateLoadedClassesDalvik(t){const{api:e}=this,r=ptr("0xcbcacccd"),n=172,o=8,s=e.gDvm.add(n).readPointer(),l=s.readS32(),c=s.add(12).readPointer(),d=l*o;for(let p=0;p<d;p+=o){const h=c.add(p).add(4).readPointer();if(h.isNull()||h.equals(r))continue;const f=h.add(24).readPointer().readUtf8String();if(f.startsWith("L")){const m=f.substring(1,f.length-1).replace(/\//g,".");t.onMatch(m)}}t.onComplete()}enumerateMethods(t){const{classFactory:e}=this,r=this.vm.getEnv(),n=e.use("java.lang.ClassLoader");return Model.enumerateMethods(t,this.api,r).map(o=>{const i=o.loader;return o.loader=i!==null?e.wrap(i,n,r):null,o})}scheduleOnMainThread(t){this.performNow(()=>{this._pendingMainOps.push(t);let{_wakeupHandler:e}=this;if(e===null){const{classFactory:r}=this,n=r.use("android.os.Handler"),o=r.use("android.os.Looper");e=n.$new(o.getMainLooper()),this._wakeupHandler=e}this._pollListener===null&&(this._pollListener=Interceptor.attach(Process.getModuleByName("libc.so").getExportByName("epoll_wait"),this._makePollHook()),Interceptor.flush()),e.sendEmptyMessage(1)})}_makePollHook(){const t=Process.id,{_pendingMainOps:e}=this;return function(){if(this.threadId!==t)return;let r;for(;(r=e.shift())!==void 0;)try{r()}catch(n){Script.nextTick(()=>{throw n})}}}perform(t){if(this._checkAvailable(),!this._isAppProcess()||this.classFactory.loader!==null)try{this.vm.perform(t)}catch(e){Script.nextTick(()=>{throw e})}else this._pendingVmOps.push(t),this._pendingVmOps.length===1&&this._performPendingVmOpsWhenReady()}performNow(t){return this._checkAvailable(),this.vm.perform(()=>{const{classFactory:e}=this;if(this._isAppProcess()&&e.loader===null){const n=e.use("android.app.ActivityThread").currentApplication();n!==null&&initFactoryFromApplication(e,n)}return t()})}_performPendingVmOpsWhenReady(){this.vm.perform(()=>{const{classFactory:t}=this,e=t.use("android.app.ActivityThread"),r=e.currentApplication();if(r!==null){initFactoryFromApplication(t,r),this._performPendingVmOps();return}const n=this;let o=!1,i="early";const s=e.handleBindApplication;s.implementation=function(c){if(c.instrumentationName.value!==null){i="late";const p=t.use("android.app.LoadedApk").makeApplication;p.implementation=function(u,h){return o||(o=!0,initFactoryFromLoadedApk(t,this),n._performPendingVmOps()),p.apply(this,arguments)}}s.apply(this,arguments)};const a=e.getPackageInfo.overloads.map(c=>[c.argumentTypes.length,c]).sort(([c],[d])=>d-c).map(([c,d])=>d)[0];a.implementation=function(...c){const d=a.call(this,...c);return!o&&i==="early"&&(o=!0,initFactoryFromLoadedApk(t,d),n._performPendingVmOps()),d}})}_performPendingVmOps(){const{vm:t,_pendingVmOps:e}=this;let r;for(;(r=e.shift())!==void 0;)try{t.perform(r)}catch(n){Script.nextTick(()=>{throw n})}}use(t,e){return this.classFactory.use(t,e)}openClassFile(t){return this.classFactory.openClassFile(t)}choose(t,e){this.classFactory.choose(t,e)}retain(t){return this.classFactory.retain(t)}cast(t,e){return this.classFactory.cast(t,e)}array(t,e){return this.classFactory.array(t,e)}backtrace(t){return backtrace(this.vm,t)}isMainThread(){const t=this.classFactory.use("android.os.Looper"),e=t.getMainLooper(),r=t.myLooper();return r===null?!1:e.$isSameObject(r)}registerClass(t){return this.classFactory.registerClass(t)}deoptimizeEverything(){const{vm:t}=this;return deoptimizeEverything(t,t.getEnv())}deoptimizeBootImage(){const{vm:t}=this;return deoptimizeBootImage(t,t.getEnv())}deoptimizeMethod(t){const{vm:e}=this;return deoptimizeMethod(e,e.getEnv(),t)}_checkAvailable(){if(!this.available)throw new Error("Java API not available")}_isAppProcess(){let t=this._cachedIsAppProcess;if(t===null){if(this.api.flavor==="jvm")return t=!1,this._cachedIsAppProcess=t,t;const e=new NativeFunction(Module.getGlobalExportByName("readlink"),"pointer",["pointer","pointer","pointer"],{exceptions:"propagate"}),r=Memory.allocUtf8String("/proc/self/exe"),n=1024,o=Memory.alloc(n),i=e(r,o,ptr(n)).toInt32();if(i!==-1){const s=o.readUtf8String(i);t=/^\/system\/bin\/app_process/.test(s)}else t=!0;this._cachedIsAppProcess=t}return t}};function initFactoryFromApplication(t,e){const r=t.use("android.os.Process");t.loader=e.getClassLoader(),r.myUid()===r.SYSTEM_UID.value?(t.cacheDir="/data/system",t.codeCacheDir="/data/dalvik-cache"):"getCodeCacheDir"in e?(t.cacheDir=e.getCacheDir().getCanonicalPath(),t.codeCacheDir=e.getCodeCacheDir().getCanonicalPath()):(t.cacheDir=e.getFilesDir().getCanonicalPath(),t.codeCacheDir=e.getCacheDir().getCanonicalPath())}function initFactoryFromLoadedApk(t,e){const r=t.use("java.io.File");t.loader=e.getClassLoader();const n=r.$new(e.getDataDir()).getCanonicalPath();t.cacheDir=n,t.codeCacheDir=n+"/cache"}var runtime=new Runtime;Script.bindWeak(runtime,()=>{runtime._dispose()});var frida_java_bridge_default=runtime;globalThis.Java=frida_java_bridge_default;
