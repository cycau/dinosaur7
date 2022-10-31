let _d7Mode = 'dev';
/***
 * @author Dinosaur7
 * @author kougen.sai
 * @author cycauo@gmail.com
 * @version 1.0
 * The name [Dinosaur7] comes from that
 * my daughter likes dinosaurs very much and she is 7 years old.
 * this framework help you to implement SPA without complex knowledge.
 *
 * Dinosaur7's all symbol in html
 *   [_d7] 		if | for | DUMMY.
 *   [_d7v] 	show Model data to html.
 *   [_d7m] 	collect html value to Model data.
 *   [compsrc] 	specify external html resource of template.
 *   [compseq] 	loading priority of template, specify this will load in synchronize mode.
 *   [mainblock] to specify main page content.
 *
 *   {%  javascript logic %}
 *   {%= print value %}
 *   {%=<print value with encode %}
 *
 * Dinosaur7's all method
 *   fn.onload(function)
 *   fn.s(selector, index)
 *   fn.S(selector)
 *   fn.m(empty|selector) => target block's model data
 *   fn.render(ModelData, empty|selector)
 *   fn.renderTo(ModelData, srcSelector, empty|srcChildSlector, tarSelector, empty|tarChildSlector)
 *   fn.remove(selector, empty|childIndex)
 *
 *   fn.show(empty|false)
 *   fn.loadpage(url, parameters)
 *   fn.api(url, params, options, onSuccess, onError)
 * 
 *   fn.popup(selector, parameters, autoClose)
 *   fn.openmodal(url, parameters, autoClose)
 *   fn.processing(empty|false)
 * 
 * Dinosaur7's util
 *   fn.util.encodeHtml(strHtml)
 *   fn.util.stringifyUrl(url, queryMap)
 *   fn.util.stringifyJSON(data)
 *   fn.util.parseJSON(strJSON)
 *   fn.util.format(value, fmt, prefix, suffix)
 *   fn.util.emitEvent(selector, eventName, val)
 *   fn.util.persist(key, value)
 * 
 * Expand native Element's method
 *   Element.s(selector, empty|index)
 *   Element.S(selector)
 *   Element.val(strAttr, val)
 *   Element.css(propOrMap|empty, val|null)
 *   Element.clazz(classOrList|empty, val|null)
 *   Element.attr(strProp|empty, val|null)
/*/
(function (global) {
	const debug = function(msg) {
		if (_d7Mode !== 'dev') return;
		console.info( "[Dinosaur7]debug: " + msg);
	}
	const error = function(msg) {
		if (_d7Mode === 'dev') alert(msg);
		console.error("[Dinosaur7]error! " + msg);
	}

	class Dinosaur7 {
		constructor(fullname, params) {
			this.fullname = fullname;
			this.params = params;
			this.conf = {pageRoot: "", apiRoot: ""};
			this._PRIVATE = {showed:false};
			this._CACHE = {funcRender:{}}; // cache compiled function
			this.childseq = 0;
			this.children = {};

			this.assignBlock = function(tarBlock) {
				tarBlock.setAttribute('_d7name', fullname);
				tarBlock.querySelectorAll("[_d7=DUMMY]").forEach(function(dummyBlock) {
					dummyBlock.remove();
				})
				this._PRIVATE.ROOT = tarBlock;
				this._PRIVATE.TPLT = document.createElement("div");
				this._PRIVATE.TPLT.innerHTML = tarBlock.innerHTML;
			}
		}
	}

	/********************************************************************
	 * CONSTANT
	/********************************************************************/
	const _LOGIC = {	// {% logic %} 				describe logic
		start: "{%",	// {% =varOrFunction %} 	describe output
		close: "%}",	// {% =<varOrFunction %} 	encode and output
	}
	const _ENCODE = {
		"<": "&#60;", 
		">": "&#62;", 
		"&": "&#26;", 
		'"': "&#34;", 
		"'": "&#39;", 
		"/": "&#47;",
		" ": "&#20;", //&emsp;
		"\t": "&#09;",
		"\n": "&#a0;",
		"\r": "&#d0;",
	};
	const _TYPECONTAINER = {
		"CAPTION": "table", 
		"THEAD": "table",
		"TFOOT": "table",
		"TBODY": "table",
		"TR": "table",
		"COLGROUP": "table tr",
		"COL: ": "table tr",
		"TH": "table tr",
		"TD": "table tr",
		"LI": "ul",
		"DT": "dl",
		"DD": "dl",
		"OPTION": "select",
		"OPTGROUP": "select",
		"AREA": "map",
		"LEGEND": "fieldset",
	};

	/*********************************************************************
	 * compile html.
	 * [_d7] support only if|for|DUMMY
	 * example)
	 *   if (condition) continue | break
	 *   if (condition) xxx; yyy; zzz; => if (condition) {xxx; yyy; zzz;
	 *   for(condition) xxx; yyy; zzz; => for(condition) {xxx; yyy; zzz;
	/*********************************************************************/
	const buildBlock = function(selector) {
		if (!selector) selector = "_d7Root"
		if (this._CACHE.funcRender[selector]) return this._CACHE.funcRender[selector];

		var tplts = this._PRIVATE.TPLT.querySelectorAll(selector);
		if (selector === "_d7Root") {
			tplts = [this._PRIVATE.TPLT];
		}
		if (tplts.length < 1) {
			error("not found template area with selector [" + selector + "]");
			return;
		}
		if (tplts.length > 2) {
			error("only one template area is allowed, but there is " + tplts.length + " with selector[" + selector + "]");
			return;
		}
		if (tplts[0].hasAttribute("_d7")) {
			error("can't specify attribute [_d7] in root element.");
			return;
		}

		var markedHtml = normalizeCompileMark(tplts[0].outerHTML);
		var renderFunc = makeRenderFunc(markedHtml);
		this._CACHE.funcRender[selector] = renderFunc
		return renderFunc;
	}
	const normalizeCompileMark = function(strHtml) {

		/***
		 * ロジックマーク正規化
		 * ロジック前後にに<!-- -->を追加する（html escape防止）
		 */
		var RegStart = new RegExp("(<!\\-\\-\\s*)?(" + _LOGIC.start + ")", "gm");
		var RegClose = new RegExp("(" + _LOGIC.close + ")(\\s*\\-\\->)?", "gm");
		strHtml = strHtml.replace(RegStart, function (m, cmtStart, start) {return "<!-- " + start;})
		strHtml = strHtml.replace(RegClose, function (m, close, cmtClose) {return close + " -->";})
		var divTemp = document.createElement("div");
		divTemp.innerHTML = strHtml;


		/***
		 * _d7プロパティ展開
		 * if, for
		 */
		var logic = {};
		var logicKey; var idx = 0; var prefix = "_d7L0Gic"; 
		divTemp.querySelectorAll("[_d7]").forEach(function(d7Tag) {
			var expr = d7Tag.getAttribute("_d7").trim();

			d7Tag.removeAttribute("_d7");
			var block = analyzeD7(expr);
			if (block.start) {
				logicKey = prefix + (++idx) + "E";
				logic[logicKey] = _LOGIC.start + " " + block.start + " " + _LOGIC.close;
				d7Tag.before(logicKey);
			}

			if (block.close) {
				logicKey = prefix + (++idx) + "E";
				logic[logicKey] = _LOGIC.start + " " + block.close + " " + _LOGIC.close;
				d7Tag.after(logicKey);
			}
		})

		/***
		 * _d7vプロパティ簡略表記[.]展開
		 */
		divTemp.querySelectorAll("[_d7v]").forEach(function(d7vTag) {
			var d7v = d7vTag.getAttribute('_d7v');
			if(!d7v.endsWith(".")) return;
			if(!d7v.startsWith("_m.") && !d7v.startsWith("=m.")) return;

			expandD7v(d7vTag, d7v);
		})
		/***
		 * _d7vプロパティ展開
		 * <span _d7v="=m.key1.key[idx].val,attr"></span>
		 * <span _d7v="=m.key1.key[idx].val,attr" _d7vi="{% _c.push(_m.key1.key[idx].val) %}{# _c.size()-1 #}" _d7m="{# `key1.key[${idx}].val` #}"></span>
		 */
		divTemp.querySelectorAll("[_d7v]").forEach(function(d7vTag) {
			var d7v = d7vTag.getAttribute('_d7v');

			if (d7v.startsWith("=m.")) {
				d7vTag.setAttribute('_d7vi', `${_LOGIC.start}_c.push(_m.${d7v.substring(3)})${_LOGIC.close}${_LOGIC.start}=_c.length-1${_LOGIC.close}`);
			} else {
				d7vTag.setAttribute('_d7vi', `${_LOGIC.start}_c.push(   ${d7v})             ${_LOGIC.close}${_LOGIC.start}=_c.length-1${_LOGIC.close}`);
			}
			// 双方向、かつ_d7m定義されてない場合
			if (d7v.startsWith("=m.") && !d7vTag.hasAttribute("_d7m")) {
				var d7m = d7v.substring(3);
				d7m = d7m.replaceAll("[", "[${");
				d7m = d7m.replaceAll("]", "}]");
				//d7vTag.setAttribute('_d7m', _LOGIC.start + "=`" + d7m + "`" + _LOGIC.close);
				d7vTag.setAttribute('_d7m', _LOGIC.start + "=" + "`" + d7m + "`.replace(/\\[.*?\\]/g,'[]')" + _LOGIC.close);
			}
		})
		/***
		 * _d7プロパティ展開
		 * 上でのロジックを書き換え
		 */
		strHtml = divTemp.innerHTML;
		for (logicKey in logic) {
			strHtml = strHtml.replace(logicKey, logic[logicKey]);
		}
		return strHtml;
	}
	const analyzeD7 = function(expr) {
		if (expr.match(/^if\(.*?\)\s+(continue|break)/)) {
			return {start: expr};
		}
		var m = expr.match(/^(if|for)\s*\(.*?\)\s*({?)/);
		if (m) {
			if (m[2]) {
				return {start: expr, close:"}"};
			} else {
				return {start: expr.replace(/(.+\(.*?\))/, "$1 {"), close:"}"};
			}
		}
		error("syntaxAnalyze: " + expr);
	}
	const expandD7v = function(topD7vTag, prefix) {
		topD7vTag.removeAttribute('_d7v');

		topD7vTag.children.forEach(function(child) {
			if (!child.hasAttribute('_d7v')) {
				expandD7v(child, prefix);
				return;
			}

			var d7v = child.getAttribute('_d7v');

			if(d7v.startsWith("_m.") || d7v.startsWith("=m.")) {
				// prefixリセット、外側で行われる
				if (d7v.endsWith(".")) return

				expandD7v(child, prefix);
				return;
			}
			// さらに下位層への展開が必要の場合
			if (d7v.endsWith(".")) {
				expandD7v(child, prefix + d7v);
				return;
			}

			child.setAttribute('_d7v', prefix + d7v);
			expandD7v(child, prefix);
		})
	}
	const makeRenderFunc = function (strHtml) {

		var regstr;
		regstr  = "(<!\\-\\-\\s*)?";
		regstr += "(" + _LOGIC.start + ")";
		regstr += "([\\s\\S]*?)";
		regstr += "(" + _LOGIC.close + ")";
		regstr += "(\\s*\\-\\->)?";

		strHtml = strHtml.replace(/[\r\n]/g, "").replace(/'/g, "\\'"); // escape all ' first and recover in below.
		var tpl = strHtml.replace(new RegExp(regstr, "gm"), function (m, cmtoutStart, start, expr, close, cmtoutClose) {
				expr = expr.replace(/\\'/gm, "'").trim();
				if (expr.startsWith("=<")) {
					expr = expr.substring(2).trim();
					return "'.replaceAll('_d7.', _d7name + '.') + this.util.encodeHtml(" + expr + ") + '";
				}
				if (expr.startsWith("=")) {
					expr = expr.substring(1).trim();
					if (expr === "_c.length-1") return "' + (" + expr + ") + '";
					return "'.replaceAll('_d7.', _d7name + '.') + (" + expr + ") + '";
				}
				return "'.replaceAll('_d7.', _d7name + '.');" + expr + "; out+='";
			});

		tpl = "var out=''; out+='" + tpl + "'.replaceAll('_d7.', _d7name + '.'); return out;";

		try {
			return new Function("_m", "_c", "_d7name", tpl);
		} catch(e) {
		    error(e.message + '\n' + tpl);
		}
	};
	/*********************************************************************
	 * load external component as html template
	 * also run javascript when contains it.
	 * example) <span compsrc='/view/pageA.html' compseq='1'></span>
	/*********************************************************************/
	const _CACHE_COMP = {};
	const createComp = function(currD7, params) {
		currD7.childseq++;
		var childName = currD7.fullname + '.children.c' + currD7.childseq;
		var child = new Dinosaur7(childName, params);
		currD7.children['c'+currD7.childseq] = child;
		return child;
	}
	const deleteComp = function(fullname) {
		var _d7temp = _d7;
		var _d7path = fullname.split('.');
		for (var idx=1; idx<(_d7path.length-1); idx++) {
			_d7temp = _d7temp[_d7path[idx]];
		}
		delete _d7temp[_d7path[_d7path.length-1]];

		document.querySelectorAll('[_d7nameref]').forEach(function(tag) {
			// remove css or script even children's'.
			if (tag.getAttribute('_d7nameref').startsWith(fullname)) {
				tag.remove();
			}
		});
	}
	const loadExComp = function(compTag, params) {
		var _d7name = compTag.getAttribute('_d7name');
		if (_d7name) deleteComp(_d7name);

		var compUrl = compTag.getAttribute('compsrc');
		if (!params) params = parseQuery(compUrl);
		var _d7Comp = createComp(this, params);

		if (_CACHE_COMP[compUrl]) {
			return renderComp(compTag, _CACHE_COMP[compUrl], _d7Comp);
		}

		var synch = compTag.hasAttribute('compseq') ? true : false;
		var request = new XMLHttpRequest();
		request.open('GET', compUrl, !synch);
		if(synch) {
			request.send(null);
			if (request.status === 200) {
				var template = _CACHE_COMP[compUrl] = makeTemplate(request.responseText);
				return renderComp(compTag, template, _d7Comp);
			} else {
				error(`http: ${compUrl} status[${request.status}]`);
			}
			return null;
		}

		request.onload = function() {
			if (request.status == 200) {
				var template = _CACHE_COMP[compUrl] = makeTemplate(request.responseText);
				renderComp(compTag, template, _d7Comp);
			} else {
				error(`http: ${compUrl} status[${request.status}]`);
			}
		}
		request.onerror = function() {
			error(`http: ${compUrl} status[${request.status}]`);
		}
		request.send(null);
		return null;
	}
	const CSS_TAGS = [];
	const SCRIPT_TAGS = [];
	const makeTemplate = function(strHtml) {
		var divTemp = document.createElement("div");
		divTemp.innerHTML = strHtml;
		var cssCode = "";
		var cssTags = [];
		var scriptCode = "";
		var scriptTags = [];

		// css
		divTemp.querySelectorAll('style').forEach(function(css) {
			cssCode += css.innerHTML + "\n\n\n"
			css.remove();
		})
		divTemp.querySelectorAll('[rel="stylesheet"]').forEach(function(css) {
			var href = css.getAttribute('href');
			if (!CSS_TAGS.includes(href)) {
				cssTags.push(href);
				CSS_TAGS.push(href);
			}
			css.remove();
		})
		// javascript
		divTemp.querySelectorAll('script').forEach(function(script) {
			var src = script.getAttribute('src');
			if (src){
				if (!SCRIPT_TAGS.includes(src)) {
					scriptTags.push(src);
					SCRIPT_TAGS.push(src);
				}
			} else {
				scriptCode += script.innerHTML + "\n;\n;\n;"
			}
			script.remove();
		})

		var mainblock = divTemp.querySelector('mainblock');
		if (!mainblock) mainblock = divTemp.querySelector('[mainblock]');
		if (mainblock) 	strHtml = mainblock.innerHTML;
		else 			strHtml = divTemp.innerHTML;

		return {
			html: strHtml,
			css: cssCode,
			cssTags: cssTags,
			script: scriptCode,
			scriptTags: scriptTags
		};
	}
	const renderComp = function(compTag, template, d7Comp) {

		compTag.innerHTML = template.html;

		var headTag = document.querySelector('head');
		for (var idx in template.cssTags) {
			var newTag = document.createElement('link');
			newTag.type = 'text/css';
			newTag.setAttribute('rel', 'stylesheet');
			newTag.setAttribute('href', template.cssTags[idx]);
			//newTag.setAttribute('_d7nameref', d7Comp.fullname);
			headTag.appendChild(newTag);
		}
		if (template.css) {
			var newTag = document.createElement('style');
			newTag.type = 'text/css';
			newTag.innerHTML = template.css;
			newTag.setAttribute('_d7nameref', d7Comp.fullname);
			headTag.appendChild(newTag);
		}
		for (var idx in template.scriptTags) {
			var newTag = document.createElement('script');
			newTag.type = 'text/javascript';
			newTag.setAttribute('src', template.scriptTags[idx]);
			//newTag.setAttribute('_d7nameref', d7Comp.fullname);
			headTag.appendChild(newTag);
		}

		d7Comp.assignBlock(compTag);
		(new Function("_d7", template.script))(d7Comp);
		if (typeof d7Comp._funcOnload !== 'function') {
			if (!d7Comp._PRIVATE.showed) {
				d7Comp.show();
			}
		}

		return d7Comp; // only when synch mode!
	}
	/*********************************************************************
	 * model. collect html attribute[_d7m]'s value as Map.
	 *   return map values
	 * example) <span _d7m='keyPath, valAttr'></span>
	 *   keyPath: "key1.key2[].key3[n][m].key4 ..."
	 *   valAttr: priority[valAttr > value > innerHTML]
	/*********************************************************************/
	const tarContainer = function(currContainer, keys, arrayFlg) {
		var fullKey = "R";
		var finalPos = keys.length - 1;
		for (var idx=0; idx<=finalPos; idx++) {
			var key = keys[idx];
			
			/*** current container is a MAP ***/
			if (!key.startsWith("[")) {
				if (!(currContainer instanceof Object)) error("not a MAP. " + fullKey);

				if (idx == finalPos) return currContainer;

				if (!currContainer[key]) {
					if (keys[idx+1].startsWith("[")) {
						currContainer[key] = [];
					} else {
						currContainer[key] = {};
					}
				}
				currContainer = currContainer[key];
				fullKey += "." + key;
				continue;
			}

			/*** current container is a Array ***/
			if (!(currContainer instanceof Array)) error("not a LIST. " + fullKey);

			/*** [], [+], [n], [<n] ***/
			var strIdx = key.substring(1, key.length-1);

			if (strIdx === ""){
				// append key[]
				if (idx==finalPos) {
					keys[idx] = currContainer.length;
					currContainer.push(null);
					return currContainer;
				}

				if (currContainer.length <1) return error(`forgot specify new array flag? ${fullKey}[+]`);
				
				// last key[][], key[].key2
				currContainer = currContainer[currContainer.length-1];
				fullKey += "[" + (currContainer.length-1) + "]";
				continue;
			}

			if(strIdx === "+"){
				// append key[+]
				if (idx==finalPos) {
					keys[idx] = currContainer.length;
					currContainer.push(null);
					return currContainer;
				}
				
				// add element key[+][], key[+].key2
				if (keys[idx+1].startsWith("[")) {
					currContainer.push([]);
				} else {
					currContainer.push({});
				}

				currContainer = currContainer[currContainer.length-1];
				fullKey += "[" + (currContainer.length-1) + "]";
				continue;
			}

			// insert to pinpoint
			if(strIdx.startsWith("<")) 	{
				var numIdx = parseInt(strIdx.substring(1) || "0");
				if (idx==finalPos) {
					for (var listIdx=currContainer.length-1; listIdx<numIdx-1; listIdx++) currContainer.push(null);
					currContainer.splice(numIdx, 0, null);
					keys[idx] = numIdx;
					return currContainer;
				}

				fullKey += "[" + numIdx + "]";
				if (keys[idx+1].startsWith("[")) {
					for (var listIdx=currContainer.length-1; listIdx<numIdx-1; listIdx++) currContainer.push([]);
					currContainer.splice(numIdx, 0, []);
				} else {
					for (var listIdx=currContainer.length-1; listIdx<numIdx-1; listIdx++) currContainer.push({});
					currContainer.splice(numIdx, 0, {});
				}
				currContainer = currContainer[numIdx];
				continue;
			}

			// replace pinpoint
			var numIdx  = parseInt(strIdx);
			if (numIdx < 0) error("array must be one of these [], [+], [n], [<n]. " + fullKey);
			if (idx==finalPos) {
				for (var listIdx=currContainer.length-1; listIdx<numIdx; listIdx++) currContainer.push(null);
				keys[idx] = numIdx;
				return currContainer;
			}

			fullKey += "[" + numIdx + "]";
			if (keys[idx+1].startsWith("[")) {
				for (var listIdx=currContainer.length-1; listIdx<numIdx; listIdx++) currContainer.push([]);
			} else {
				for (var listIdx=currContainer.length-1; listIdx<numIdx; listIdx++) currContainer.push({});
			}
			currContainer = currContainer[numIdx];
		}
		return currContainer;
	}
	const extractModelOld = function(selector) {
		var modelData = {};
		var arrayFlg = {};
		this.querySelectorAll(selector ? (selector + " [_d7m]") : "[_d7m]").forEach(function(d7mTag) {;
			var d7m = d7mTag.getAttribute('_d7m').replaceAll(" ", "");
			if (!d7m) error("_d7m can not be empty! " + d7mTag.outerHTML);
			if (d7m.startsWith("[")) error("_d7m can not starts with array " + d7mTag.outerHTML);

			var accessKey = d7m.split(',');
			var keys = accessKey[0].trim().replaceAll("[", ".[").replaceAll("..", ".").split(".");
			var tc = tarContainer(modelData, keys, arrayFlg);
			tc[keys[keys.length-1]] = d7mTag.val(accessKey[1] || '');
		})

		return modelData;
	}
	const extractModel = function(tarBlock, modelData, arrayFlg) {
		var d7m = tarBlock.getAttribute('_d7m');
		if (d7m) {
			d7m = d7m.replaceAll(" ", "");
			if (d7m.startsWith("[")) error("_d7m can not starts with array " + tarBlock.outerHTML);
	
			var accessKey = d7m.split(',');
			var keys = accessKey[0].trim().replaceAll("[", ".[").replaceAll("..", ".").split(".");
			var tc = tarContainer(modelData, keys, arrayFlg);
			tc[keys[keys.length-1]] = tarBlock.val(accessKey[1] || '');
		}

		// must be sequentially!
		for (var idx=0; idx<tarBlock.children.length; idx++) {
			extractModel(tarBlock.children[idx], modelData, arrayFlg);
		}

		return modelData;
	}

	/*********************************************************************
	 * Dinosaur7's public function
	 *   fn.onload(fOnload)
	 *   fn.s(selector)
	 *   fn.S(selector)
	 * 
	 *   fn.m(selector|empty)
	 *   fn.render(modelData, blockSelector|empty)
	 *   fn.renderTo(modelData, srcSelector, srcChildSlector|empty, tarSelector, tarChildSlector|empty)
	 *   fn.remove(selector, childIndex|empty)
	 * 
	 *   fn.show(visible)
	 *   fn.newPage(url)
	 *   fn.newModal(url, queryMap, model)
	 *   fn.api(url, paramMap, onSuccess, onError)
	/*********************************************************************/
	const fn = Dinosaur7.prototype;
	fn.onload = function(funcOnload) {
		var currD7 = this;
		this._PRIVATE._funcOnload = function() {
			funcOnload.call(currD7);
		}
		if (this._PRIVATE.ROOT) this._PRIVATE._funcOnload(currD7);
	}
	fn.s = function(selector, index) {
		if (!selector) return this._PRIVATE.ROOT;
		if (typeof index === 'undefined') return this._PRIVATE.ROOT.querySelector(selector);

		var elements = this._PRIVATE.ROOT.querySelectorAll(selector);
		if (elements.length < (index+1)) return null;
		return elements[index];
	}
	fn.S = function(selector) {
		if (!selector) return [this._PRIVATE.ROOT];
		return this._PRIVATE.ROOT.querySelectorAll(selector);
	}
	fn.m = function(selector) {
		var modelData = {};
		var arrayFlg = {};
		extractModel(this.s(selector), modelData, arrayFlg);
		return modelData;
		//return extractModelOld.call(this._PRIVATE.ROOT, selector);
	}
	/***
	 * render model data to elements
	/*/
	const virtualRender = function(modelData, blockSelector) {
		if (!this._PRIVATE.TPLT) error("not onload yet.");

		var tpltBlock = this._PRIVATE.TPLT.s(blockSelector);
		if (!tpltBlock) error("target block not exists. " + blockSelector);

		var htmlContainer = document.createElement("div");
		var tags = (_TYPECONTAINER[tpltBlock.tagName] || "").split(" ");
		for (var idx in tags) {
			if (!tags[idx]) break;

			var tempTag = document.createElement(tags[idx]);
			htmlContainer.append(tempTag);
			htmlContainer = tempTag;
		}
		var valContainer = [];
		htmlContainer.innerHTML = buildBlock.call(this, blockSelector)(modelData || {}, valContainer, this.fullname);

		// データを埋め込む
		htmlContainer.querySelectorAll("[_d7v]").forEach(function(d7vTag) {
			var idx = d7vTag.getAttribute('_d7vi');
			var d7v = d7vTag.getAttribute('_d7v').split(',');
			d7vTag.val(d7v[1] || '', valContainer[idx]);
			d7vTag.removeAttribute('_d7v');
			d7vTag.removeAttribute('_d7vi');
		})

		htmlContainer.querySelectorAll("[compsrc]").forEach(function(compTag) {
			if (compTag.hasAttribute("solidblock")) return;
			compTag.style.display = "none";
		})

		return htmlContainer.firstChild;
	}
	fn.render = function(modelData, blockSelector) {
		var currD7 = this;
		var virtualBlock = virtualRender.call(currD7, modelData, blockSelector);

		var tarBlock = currD7._PRIVATE.ROOT.s(blockSelector);
		tarBlock.innerHTML = virtualBlock.innerHTML;
		tarBlock.querySelectorAll("[compsrc]").forEach(function(compTag) {
			if (compTag.hasAttribute("solidblock")) return;
			loadExComp.call(currD7, compTag);
		})
		currD7.show(true);
	}
	// insert before target Child.
	fn.renderTo = function(modelData, srcSelector, srcChildSlector, tarSelector, tarChildSlector) {
		var currD7 = this;
		var virtualBlocks = [virtualRender.call(currD7, modelData, srcSelector)];
		if (srcChildSlector) {
			virtualBlocks = virtualBlocks[0].querySelectorAll(srcChildSlector);
		}

		var tarBlock = currD7.s(tarSelector);
		if (!tarBlock) error('tarBlock can not be empty.');

		if (!tarChildSlector) {
			for (var idx=0; idx<virtualBlocks.length; idx++) {
				tarBlock.insertBefore(virtualBlocks[idx], null);
			}
		} else {
			var tarChild = tarBlock.querySelector(tarChildSlector);
			for (var idx=0; idx<virtualBlocks.length; idx++) {
				tarChild.parentNode.insertBefore(virtualBlocks[idx], tarChild);
			}
		}

		tarBlock.querySelectorAll("[compsrc]").forEach(function(compTag) {
			if (compTag.hasAttribute("solidblock")) return;
			loadExComp.call(currD7, compTag);
		})
		currD7.show(true);
	}
	fn.remove = function(tarSelector, childIndex) {
		if (typeof childIndex === 'undefined') {
			this.s(tarSelector).remove();
			return;
		}
		var children = this.s(tarSelector).children;
		for (var idx=0; idx<children.length; idx++) {
			if (idx == childIndex) {
				children[childIndex].remove();
				break;
			}
		}
	}
	/***
	 * show(true|false)
	/*/
	fn.show = function(visible) {
		if (!_d7root._PRIVATE.showed) {
			if (document.body) {
				document.body.style.display = "block";
				document.body.style.visibility = "visible";
			} else {
				var firstBlock = document.querySelector("header +");
				firstBlock.style.display = "block";
			}
			_d7root._PRIVATE.showed = true;
		}
		this._PRIVATE.showed = true;

		if (visible === false) {
			this._PRIVATE.ROOT.style.display = "none";
		} else {
			this._PRIVATE.ROOT.style.display = "block";
		}
	};
	/***
	 * single page mode
	/*/
	fn.loadpage = function(url, parameters) {
		var tarTag = _d7root._PRIVATE.ROOT;
		tarTag.setAttribute("compsrc", _d7root.conf.pageRoot + url);
		//tarTag.setAttribute("compseq", 999); // synch

		loadExComp.call(_d7root, tarTag, parameters);
	}
	/***
	 * HTTP request
	 * 	 default : GET JSON
	 * 	 you can set paramMap to {_method:'POST', _responseType:'TEXT'}
	/*/
	fn.api = function(url, paramMap, options, onSuccess, onError) {
		processing();

		var currD7 = this;

		if (!options) options = {};
		if (!options.method) options.method = "GET";
		if (!options.responseType) options.responseType = "JSON";
		options.method = options.method.toUpperCase();
		options.responseType = options.responseType.toUpperCase();
		if (options.method == "GET") url = this.util.tringifyUrl(url, paramMap);

		url = _d7root.conf.apiRoot + url;
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			var response;
			try{
				if (options.responseType == "JSON") {
					response = JSON.parse(xhr.responseText);
				} else {
					response = xhr.responseText;
				}
			}catch (e) {
				if (options.responseType == "JSON") {
					response = {_exception: 1};
					response.response = xhr.responseText;
				} else {
					response = "ERROR!";
				}
			}
			if (xhr.status == 200) {
				if (onSuccess) onSuccess.call(currD7, response, xhr.status);
			} else {
				if (onError) onError.call(currD7, response, xhr.status);
				error("http: " + options.method + " " + url + " status[" + xhr.status + "]");
			}
			processing(false);
		}
		xhr.onerror = function() {
			if (onError) onError.call(currD7, null, 0);
			error("http: " + options.method + " " + url + " status[failed]");
			processing(false);
		}
		xhr.open(options.method, url);
		xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		//xhr.responseType = 'json';
		xhr.send(options.method == "POST" ? JSON.stringify(paramMap) : null);
	}

	/*********************************************************************
	 * UTIL
     *   fn.util.encodeHtml(strHtml)
     *   fn.util.stringifyUrl(url, queryMap)
     *   fn.util.stringifyJSON(data)
     *   fn.util.parseJSON(strJSON)
     *   fn.util.format(value, strFormat, prefix, suffix)
	 *   fn.util.emitEvent(selector, eventName, val)
     *   fn.util.persist(key, value)
	/*********************************************************************/
	const parseQuery = function(strUrl) {
		var params = {};
		strUrl = strUrl.startsWith("http:") ? strUrl : ("http://tmp.com" + strUrl);
		const url = new URL(strUrl);
		(new URLSearchParams(url.search)).forEach(function(value, key) {
			params[key] = value;
		});
		return params;
	}
	fn.util = {};
	fn.util.encodeHtml = function(strHtml) {
		strHtml = strHtml + '';
		strHtml = strHtml.replace(/[<>"'\/]/g, function (c) { 
			return _ENCODE[c]; 
		});
		return strHtml
	};
	fn.util.stringifyUrl = function(url, queryMap) {
		if (!queryMap) return url;
		if (!Object.keys(queryMap).length) return url;

		return url + "?" + Object.keys(queryMap).map(function (key) {
			return key + "=" + encodeURIComponent(queryMap[key]);
		}).join("&");
	}
	fn.util.stringifyJSON = function(data) {
		return JSON.stringify(data);
	}
	fn.util.parseJSON = function(strJSON) {
		return JSON.parse(strJSON);
	}
	// fmt: ,|date|time|dateTime|other
	fn.util.format = function(value, fmt, prefix, suffix) {
		if (fmt === ',') {
			if (typeof value === 'string') value = Number(value);
			return prefix + value.toLocaleString() + suffix;
		}
	}
	fn.util.emitEvent = function(selector, eventName, val) {
		var element = document.querySelector(selector);
		if (!element) error("target not found in sendEvent. " + selector);
		element.dispatchEvent(new Event(eventName, val));
	}
	fn.util.persistVal = function(key, data) {
		if (typeof data === 'undefined') {
			return localStorage.getItem(key);
		}

		localStorage.setItem(key, data);
	}
	/*********************************************************************
	 * popup(msgbox) | modal | processing
	/*********************************************************************/
	class Modal {
		constructor(cssPrefix, autoClose) {
			this.cssPrefix = "_d7_" + cssPrefix; // popup | modal | processing

			var form = document.createElement('div');
			form.classList.add(this.cssPrefix + "_form");
			form.innerHTML = this.html;
	
			var container = document.createElement('div');
			container.classList.add(this.cssPrefix + "_overlay");
			container.appendChild(form);

			this.form = form;
			this.container = container;

			var thisModal = this;
			if (autoClose) {
				form.onclick = function(e) {e.stopPropagation();}
				container.onclick = function() {thisModal.close();}
			}
	   }
	};
	const modalfn = Modal.prototype;
	modalfn.open = function() {
		var thisModal = this;

		document.body.appendChild(this.container);
		setTimeout(function(cssPrefix) {
			thisModal.form.classList.add(cssPrefix + "_form_show");
			thisModal.container.classList.add(cssPrefix + "_overlay_show");
		}, 120, thisModal.cssPrefix);

	}
	modalfn.close = function() {
		this.form.classList.remove(this.cssPrefix + "_form_show");
		this.form.classList.add(this.cssPrefix + "_form_closing");
		this.form.classList.remove(this.cssPrefix + "_overlay_show");
		this.container.classList.add(this.cssPrefix + "_overlay_closing");

		var d7name = this.form.getAttribute('_d7name');
		setTimeout(function(container, d7name) {
			document.body.removeChild(container);
			deleteComp(d7name);
		}, 300, this.container, d7name);
	}
	/***
	 * var msgbox = _d7.popup("#msgbox", parameters, true|false);
	 * msgbox.s("#closeBtn").onclick = function() {msgbox.close();}
	 */
	fn.popup = function (selector, params, autoClose) {
		const defbox = document.querySelector(selector);
		if (!defbox) error(`can not find popup block. selector[${selector}]`);

		var modal = new Modal("popup", autoClose);
		modal.form.innerHTML = defbox.innerHTML;
		var currD7 = this;
		var _d7Popup = createComp(currD7, params);
		_d7Popup.assignBlock(modal.form);
		_d7Popup.render(params);
		_d7Popup.close = function() {
			modal.close();
		}

		modal.open();
		return _d7Popup;
	}
	/***
	 * var detailModal = _d7.openModal("/detail.html", parameters, true|false);
	 * detailModal.handleOk = function() {}
	 */
	fn.openmodal = function (url, params, autoClose) {
		var modal = new Modal("modal", autoClose);
		modal.form.setAttribute("compsrc", url);
		modal.form.setAttribute("compseq", 999); // synch

		var currD7 = this;
		var _d7Modal = loadExComp.call(currD7, modal.form, params);
		_d7Modal.close = function() {
			modal.close();
		}

		modal.open();
		return _d7Modal;
	};
	let processingIcon = null;
	const processing = function(start) {
		if (start === false) {
			if (processingIcon) {
				processingIcon.close();
				processingIcon = null;
			}
			return;
		}

		if (processingIcon) return;
		processingIcon = new Modal("processing", false);
		processingIcon.form.innerHTML = "<span class='_d7_processing'>processing</span>";
		processingIcon.open();
	}
	fn.processing = processing;

	/*********************************************************************
	 * Element.s(selector, index)	=> select one
	 * Element.S(selector)			=> select all
	 * Element.val(strAttr, val)	=> priority[strAttr > value > innerHTML]
	 * Element.css()				=> {style}
	 * Element.css(propOrMap)		=> val
	 * Element.css({})				<= overwrite
	 * Element.css(propOrMap, val|nullToDelete)
	 * Element.clazz()				=> [classList]
	 * Element.clazz(classOrList)	=> true|false
	 * Element.clazz([])			<= overwrite
	 * Element.clazz(classOrList, true|nullToDelete)
	 * Element.attr(strProp)		=> val|null
	 * Element.attr(strProp, val|nullToDelete)
	/**********************************************************************/
	// selectOne
	Element.prototype.s = function(selector, index) {
		if (!selector) return this;
		if (typeof index === 'undefined') return this.querySelector(selector);

		var elements = this.querySelectorAll(selector);
		if (elements.length < (index+1)) return null;
		return elements[index];
	}
	// selectAll
	Element.prototype.S = function(selector) {
		if (!selector) return this._PRIVATE.ROOT;
		return this._PRIVATE.ROOT.querySelectorAll(selector);
	}
	// value priority[strAttr > value > innerHTML]
	Element.prototype.val = function(strAttr, val) {
		//getter
		if (typeof val === 'undefined') {
			if (strAttr) {
				if (strAttr === 'text' || strAttr === 'innerHTML') return this.innerHTML;
				else return this.getAttribute(strAttr);
			}
			if (typeof this.value !== 'undefined') return this.value;
			else return this.innerHTML;
		}
		// setter
		if (strAttr) {
			if (strAttr == 'text' || strAttr === 'innerHTML') {this.innerHTML = val; return this;}
			else {this.setAttribute(strAttr, val); return this;}
		}
		if (typeof this.value !== 'undefined') {this.value = val; return this;}
		this.innerHTML = val; return this;
	}
	// style
	Element.prototype.css = function(propOrMap, val) {
		if (typeof propOrMap === 'undefined') return this.style;
		if (typeof val === 'undefined') {
			if (typeof propOrMap === 'string') return this.style[propOrMap];
			else {this.style = propOrMap; return this;}
		}
		if (typeof propOrMap !== 'string') error('[propOrMap] must be a string when set or remove.');
		if (val === null) {this.style[propOrMap] = null; return this;}
		this.style[propOrMap] = val; return this;
	};
	// class
	Element.prototype.clazz = function(classOrList, val) {
		if (typeof classOrList === 'undefined') return this.classList;
		if (typeof val === 'undefined') {
			if (typeof classOrList === 'string') return this.classList.contains(classOrList);
			else {this.classList = classOrList; return this;}
		}
		if (typeof classOrList !== 'string') error('[classOrList] must be a string when add or remove.');
		if (val === null) {this.classList.remove(classOrList); return this;}
		this.classList.add(classOrList); return this;
	}
	// attribute
	Element.prototype.attr = function(strProp, val) {
		if (!strProp) error('[strProp] can not be empty.');
		if (typeof val === 'undefined') {
			if (!this.hasAttribute(strProp)) return null;
			else return this.getAttribute(strProp) || '';
		}
		if (val === null) {this.removeAttribute(strProp); return this;}
		this.setAttribute(strProp, val); return this;
	}

	/*********************************************************************
	 * to publish.
	/*********************************************************************/
	// apply to multy platform
	const publish = function(obj, name) {
		if (typeof exports === 'object' && typeof module !== 'undefined') { 
			module.exports = obj; // CommonJS
		} else if (typeof define === 'function') { 
			define(function () { return obj; }); // AMD
		} else {
			global[name] = obj; // WINDOWS
		}
	}
	const _d7 = new Dinosaur7('_d7', parseQuery(window.location.href));
	global._d7root = global._d7 = _d7;
	const mainInit = function() {
		var mainBlock = document.querySelector("mainblock");
		if (!mainBlock) mainBlock = document.querySelector("[mainblock]");
		if (!mainBlock) error('mainblock not defined.');
		mainBlock.style.display = "none";

		var exComp = [];
		var exCompAsynch = [];
		document.querySelectorAll("[compsrc]").forEach(function(compTag) {
			if (compTag.hasAttribute("solidblock")) return;
			if (compTag.closest("mainblock")) return;
			if (compTag.closest("[mainblock]")) return;

			compTag.style.display = "none";
			if (compTag.hasAttribute("compseq")) {
				exComp.push(compTag);
				return;
			}
			exCompAsynch.push(compTag);
		})

		// css, javascript
		document.querySelectorAll('[rel="stylesheet"]').forEach(function(css) {
			CSS_TAGS.push(css.getAttribute('href'));
		})
		document.querySelectorAll('script').forEach(function(script) {
			var src = script.getAttribute('src');
			if (src){
				SCRIPT_TAGS.push(src);
			}
		})

		// asynch first.
		for(var idx=0; idx<exCompAsynch.length; idx++) {
			loadExComp.call(_d7, exCompAsynch[idx]);
		}
		// synchronize with priority.
		exComp.sort(function(e1, e2) {
			var v1 = parseInt(e1.getAttribute('compseq'));
			var v2 = parseInt(e2.getAttribute('compseq'));
			if (v1>v2) return  1;
			if (v1<v2) return -1;
			return 0;
		});
		for(var idx=0; idx<exComp.length; idx++) {
			loadExComp.call(_d7, exComp[idx]);
		}

		_d7.assignBlock(mainBlock);
		if (_d7._PRIVATE.ROOT.hasAttribute("solidblock")) {
			typeof _d7._PRIVATE._funcOnload ? _d7._PRIVATE._funcOnload.call(_d7) : _d7.show(true);
			return;
		}
		if (!_d7.conf.pageRoot) error('must define page root. _d7.conf.pageRoot = "/xxx"');

		_d7.loadpage(window.location.pathname, parseQuery(window.location.href));
	}
	// assign to system's onload
	switch (document.readyState) {
		case "loading":
			document.addEventListener('DOMContentLoaded', function () {
				mainInit();
				// window.addEventListener("load", function () {}); // after image css loaded.
			});
			break;
		default : // interactive, complete
			mainInit();
			break;
	}
})(this);
