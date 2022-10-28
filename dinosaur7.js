let _d7Mode = 'dev';
/***
 * The name [Dinosaur7] comes from that
 * my daughter likes dinosaurs very much and she is 7 years old.
 * 
 * Dinosaur7's all symbol in html
 *   [_d7] 		if | for | DUMMY
 *   [_d7v] 	show ModelData to html
 *   [_d7m] 	collect html value to ModelData
 *   [tpltsrc] 	specify external html resource of template
 *   [tpltseq] 	specify loading priority of template
 *   [mainpage] specify main block
 *
 *   {% javascript logic %}
 *   {# print value #}
 *   {@ print value with encode @}
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
 *   fn.show(true|false)
 *   fn.nextpage(url, parameters)
 *   fn.api(url, paramMap, onSuccess, onError)
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
		constructor(name, tpltBlock, params) {
			this.fullname = name;
			this.params = params;
			this._PRIVATE = {};
			this._PRIVATE.CACHE = {fRender:{}}; // cache compiled function
			this.childseq = 0;
			this.children = {};
	
			if (tpltBlock) {
				tpltBlock.setAttribute('_d7name', name);
				tpltBlock.querySelectorAll("[_d7=DUMMY]").forEach(function(dummyBlock) {
					dummyBlock.remove();
				})
				this._PRIVATE.ROOT = tpltBlock;
				this._PRIVATE.TPLT = document.createElement("div");
				this._PRIVATE.TPLT.innerHTML = tpltBlock.innerHTML;
			}
		}
	}

	/********************************************************************
	 * CONSTANT
	/********************************************************************/
	const _LOGIC = {	// <% logic %> 				describe logic
		start: "{%",	// <% =varOrFunction %> 	describe output
		close: "%}",	// <% =<varOrFunction %> 	encode and output
	}
	const _ENCODE = {
		"<": "&#60;", 
		">": "&#62;", 
		'"': "&#34;", 
		"'": "&#39;", 
		"/": "&#47;",
		" ": "?",
		"\t": "?",
		"\n": "?",
		"\r\n": "?",
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
	const normalizeCompileMark = function(strHtml) {

		/***
		 * ロジックマーク正規化
		 * ロジック前後にに<!-- -->を追加する（html escape防止）
		 */
		var RegStart = new RegExp("(<!\\-\\-\\s*)?(" + _LOGIC.start + ")", "g");
		var RegClose = new RegExp("(" + _LOGIC.close + ")(\\s*\\-\\->)?", "g");
		strHtml = strHtml.replace(/^\s+|\s+$/gm, ""); // 前後スペース
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
				//d7Tag.before(encodeURIComponent(_ENCLOSER.logicStart + " " + block.start + " " + _ENCLOSER.logicClose));
				logic[logicKey] = _LOGIC.start + " " + block.start + " " + _LOGIC.close;
				d7Tag.before(logicKey);
			}

			if (block.close) {
				logicKey = prefix + (++idx) + "E";
				//d7Tag.after(encodeURIComponent(_ENCLOSER.logicStart + " " + block.close + " " + _ENCLOSER.logicClose));
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
				d7vTag.setAttribute('_d7vi', `{% _c.push(_m.${d7v.substring(3)}) %}{# _c.length-1 #}`);
			} else {
				d7vTag.setAttribute('_d7vi', `{% _c.push(${d7v}) %}{# _c.length-1 #}`);
			}
			// 双方向、かつ_d7m定義されてない場合
			if (d7v.startsWith("=m.") && !d7vTag.hasAttribute("_d7m")) {
				var d7m = d7v.substring(3);
				d7m = d7m.replaceAll("[", "[${");
				d7m = d7m.replaceAll("]", "}]");
				d7m = "{# `" + d7m + "` #}";
				d7vTag.setAttribute('_d7m', d7m);
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
	const makeRenderFunc = function (strHtml) {

		var regstr;
		regstr  = "(<!\\-\\-\\s*)?";
		regstr += "(" + _LOGIC.start + ")";
		regstr += "([\\s\\S]*?)";
		regstr += "(" + _LOGIC.close + ")";
		regstr += "(\\s*\\-\\->)?";
		
		strHtml = strHtml.replace(/'/g, "\\'"); // 一回全部escapeして、下でロジック部のみ還元
		// start closeは表記上ネストすることはない！
		var tpl = strHtml.replace(new RegExp(regstr, "gm"), function (m, cmtStar, start, expr, close, cmtClose) {
				expr = expr.trim();
				if (expr.startsWith("=<")) {
					return "'.replaceAll('_d7.', this.fullname + '.') + this.util.encodeHtml(" + expr.replace(/\'/gm, "'") + ") + '";
				}
				if (expr.startsWith("=")) {
					return "'.replaceAll('_d7.', this.fullname + '.') + (" + expr.replace(/\'/gm, "'") + ") + '";
				}
				return "'.replaceAll('_d7.', this.fullname + '.');" + expr.replace(/\'/gm, "'") + "; out+='";
			});

		tpl = "var out=''; out+='" + tpl + "'.replaceAll('_d7.', this.fullname + '.'); return out;";

		return new Function("_m", "_c", tpl);
	};
	const buildBlock = function(selector) {
		if (!selector) selector = "_d7Root"
		if (this._PRIVATE.CACHE.fRender[selector]) return this._PRIVATE.CACHE.fRender[selector];

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
		this._PRIVATE.CACHE.fRender[selector] = renderFunc
		return renderFunc;
	}

	/*********************************************************************
	 * load external resouce as html template
	 * also run javascript when contains it.
	 * example) <span tpltsrc='/view/pageA.html' tpltseq='1'></span>
	/*********************************************************************/
	const CSS_TAGS = [];
	const SCRIPT_TAGS = [];
	const splitTplt = function(strHtml) {
		var divTemp = document.createElement("div");
		divTemp.innerHTML = strHtml;
		var cssTemp = "";
		var cssTags = [];
		var scriptTemp = "";
		var scriptTags = [];

		// css
		divTemp.querySelectorAll('style').forEach(function(css) {
			cssTemp += css.innerHTML + "\n;\n/*******-.-*******/\n;"
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
				scriptTemp += script.innerHTML + "\n;\n/*******-.-*******/\n;"
			}
			script.remove();
		})

		var mainpage = divTemp.querySelector('mainpage');
		if (!mainpage) mainpage = divTemp.querySelector('[mainpage]');
		if (mainpage) {
			strHtml = mainpage.innerHTML;
		} else {
			strHtml = divTemp.innerHTML;
		}

		return {
			html: strHtml,
			css: cssTemp,
			cssTags: cssTags,
			script: scriptTemp,
			scriptTags: scriptTags
		};
	}
	let _d7tpltid = 1000;
	const renderTplt = function(tarTag, tplt, params) {
		var tpltid = _d7tpltid++;

		// HTML 追加
		tarTag.innerHTML = tplt.html.replaceAll('_d7.', `_d7_${tpltid}.`);
		tarTag.setAttribute('tpltid', tpltid);

		var headTag = document.querySelector('head');
		for (var idx in tplt.cssTags) {
			var newTag = document.createElement('link');
			newTag.type = 'text/css';
			newTag.setAttribute('rel', 'stylesheet');
			newTag.setAttribute('href', tplt.cssTags[idx]);
			newTag.setAttribute('srctpltid', tpltid);
			headTag.appendChild(newTag);
		}
		if (tplt.css) {
			var newTag = document.createElement('style');
			newTag.type = 'text/css';
			newTag.innerHTML = tplt.css;
			newTag.setAttribute('srctpltid', tpltid);
			headTag.appendChild(newTag);
		}
		for (var idx in tplt.scriptTags) {
			var newTag = document.createElement('script');
			newTag.type = 'text/javascript';
			newTag.setAttribute('src', tplt.scriptTags[idx]);
			newTag.setAttribute('srctpltid', tpltid);
			headTag.appendChild(newTag);
			//var orgScripts = document.querySelectorAll('script[src]');
			//var lastScript = orgScripts[orgScripts.length-1];
			//lastScript.parentNode.insertBefore(newTag, lastScript.nextSibling);
		}
		//再ロードやめる
		//tplt.css = '';
		//tplt.cssTags = [];
		//tplt.scriptTags = [];

		if (!params) params = Dinosaur7.prototype.util.queryMap(tarTag.getAttribute('tpltsrc'));
		var _d7New = new Dinosaur7(tarTag, params);
		publish(_d7New, `_d7_${tpltid}`);
		(new Function("_d7", tplt.script))(_d7New);

		return _d7New; // only when synch mode!
	}
	const _CACHE_TPLT = {};
	const loadExTplt = function(tpltTag, params) {
		var tpltid = tpltTag.getAttribute('tpltid');
		document.querySelectorAll(`[srctpltid="${tpltid}"]`).forEach(function(tag) {
			tag.remove();
		});

		var tpltUrl = tpltTag.getAttribute('tpltsrc');
		if (_CACHE_TPLT[tpltUrl]) {
			return renderTplt(tpltTag, _CACHE_TPLT[tpltUrl], params);
		}

		var asynch = tpltTag.hasAttribute('tpltseq') ? false : true;
		var request = new XMLHttpRequest();
		request.open('GET', tpltUrl, asynch);
		// 非同期
		if (asynch) {
			request.onload = function() {
				if (request.status == 200) {
					var tplt = _CACHE_TPLT[tpltUrl] = splitTplt(request.responseText);
					renderTplt(tpltTag, tplt, params);
				} else {
					error(`http: ${tpltUrl} status[${request.status}]`);
				}
			}
			request.onerror = function() {
				error(`http: ${tpltUrl} status[${request.status}]`);
			}
			request.send(null);
			return null;
		}

		// 同期
		request.send(null);
		if (request.status === 200) {
			var tplt = _CACHE_TPLT[tpltUrl] = splitTplt(request.responseText);
			return renderTplt(tpltTag, tplt, params);
		} else {
			error(`http: ${tpltUrl} status[${request.status}]`);
		}
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
		var maxIdx = keys.length - 1;
		for (var idx=0; idx<=maxIdx; idx++) {
			var key = keys[idx];
			
			/*** current container is a MAP ***/
			if (!key.startsWith("[")) {
				if (!(currContainer instanceof Object)) error("not a MAP. " + fullKey);

				if (idx == maxIdx) return currContainer;

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
				if (idx==maxIdx) {
					keys[idx] = currContainer.length;
					currContainer.push(null);
					return currContainer;
				}

				if (currContainer.length <1) return error("must have at least one element. " + fullKey);
				
				// last key[][], key[].key2
				currContainer = currContainer[currContainer.length-1];
				fullKey += "[" + (currContainer.length-1) + "]";
				continue;
			}

			if(strIdx === "+"){
				// append key[+]
				if (idx==maxIdx) {
					keys[idx] = currContainer.length;
					currContainer.push(null);
					return currContainer;
				}
				
				// add element key[+][], key[+].key2
				var firstFlg = fullKey + '[0]';
				if ((firstFlg in arrayFlg)) {
					if (keys[idx+1].startsWith("[")) {
						currContainer.push([]);
					} else {
						currContainer.push({});
					}
				} else {
					arrayFlg[firstFlg] = 1;
				}

				currContainer = currContainer[currContainer.length-1];
				fullKey += "[" + (currContainer.length-1) + "]";
				continue;
			}

			// insert to pinpoint
			if(strIdx.startsWith("<")) 	{
				var numIdx = parseInt(strIdx.substring(1) || "0");
				if (idx==maxIdx) {
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
			if (idx==maxIdx) {
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
	const extractModel = function(selector) {
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
		if (!this._PRIVATE.ROOT) {
			this._PRIVATE._funcOnload = function() {
				funcOnload.call(this);
			}
			return;
		}
		funcOnload.call(this);
	}
	fn.s = function(selector, index) {
		if (!selector) return this._PRIVATE.ROOT;
		if (typeof index === 'undefined') return this._PRIVATE.ROOT.querySelector(selector);

		var elements = this._PRIVATE.ROOT.querySelectorAll(selector);
		if (elements.length < (index+1)) return null;
		return elements[index];
	}
	fn.S = function(selector) {
		if (!selector) return this._PRIVATE.ROOT;
		return this._PRIVATE.ROOT.querySelectorAll(selector);
	}
	fn.m = function(selector) {
		return extractModel.call(this._PRIVATE.ROOT, selector);
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
		htmlContainer.innerHTML = buildBlock.call(this, blockSelector)(modelData || {}, valContainer);

		// データを埋め込む
		htmlContainer.querySelectorAll("[_d7v]").forEach(function(d7vTag) {
			var idx = d7vTag.getAttribute('_d7vi');
			var d7v = d7vTag.getAttribute('_d7v').split(',');
			d7vTag.val(d7v[1] || '', valContainer[idx]);
			d7vTag.removeAttribute('_d7v');
			d7vTag.removeAttribute('_d7vi');
		})

		htmlContainer.querySelectorAll("[tpltsrc]").forEach(function(d7tplt) {
			d7tplt.style.display = "none";
		})

		return htmlContainer.firstChild;
	}
	fn.render = function(modelData, blockSelector) {
		var virtualElement = virtualRender.call(this, modelData, blockSelector);

		var tarBlock = this._PRIVATE.ROOT.s(blockSelector);
		tarBlock.querySelectorAll("[tpltid]").forEach(function(d7tplt) {
			var tpltid = d7tplt.getAttribute("tpltid");
			publish(null, `_d7_${tpltid}`); // 前回分を解放
		})
		tarBlock.innerHTML = virtualElement.innerHTML;
		tarBlock.querySelectorAll("[tpltsrc]").forEach(function(d7tplt) {
			loadExTplt(d7tplt); // ネストされたテンプレートのロード
		})
		this.show(true);
	}
	// insert before target Child.
	fn.renderTo = function(modelData, srcSelector, srcChildSlector, tarSelector, tarChildSlector) {
		var srcBlock = [virtualRender.call(this, modelData, srcSelector)];
		if (srcChildSlector) {
			srcBlock = srcBlock[0].querySelectorAll(srcChildSlector);
		}

		var tarBlock = this.s(tarSelector);
		if (!tarBlock) error('tarBlock can not be empty.');

		if (!tarChildSlector) {
			for (var idx=0; idx<srcBlock.length; idx++) {
				tarBlock.insertBefore(srcBlock[idx], null);
			}
		} else {
			var tarChild = tarBlock.querySelector(tarChildSlector);
			for (var idx=0; idx<srcBlock.length; idx++) {
				tarChild.parentNode.insertBefore(srcBlock[idx], tarChild);
			}
		}

		tarBlock.querySelectorAll("[tpltsrc]").forEach(function(d7tplt) {
			loadExTplt(d7tplt);
		})
		this.show(true);
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
		if (!this._PRIVATE.ROOT) return;

		if (this._PRIVATE.ROOT.body) {
			if (visible === false) {
				this._PRIVATE.ROOT.body.style.display = "none";
				this._PRIVATE.ROOT.body.style.visibility = "hidden";
			} else {
				this._PRIVATE.ROOT.body.style.display = "block";
				this._PRIVATE.ROOT.body.style.visibility = "visible";
			}
		}

		if (!this._PRIVATE.ROOT.style) return;

		if (visible === false) {
			this._PRIVATE.ROOT.style.display = "none";
		} else {
			this._PRIVATE.ROOT.style.display = "block";
		}
	};
	/***
	 * single page mode
	/*/
	fn.nextpage = function(url, parameters) {
		var tarTag = _d7._PRIVATE.ROOT;
		tarTag.setAttribute("tpltsrc", url);
		//tarTag.setAttribute("tpltseq", 999); // 同期呼び出し

		loadExTplt(tarTag, parameters);
	}
	/***
	 * HTTP request
	 * 	 default : GET JSON
	 * 	 you can set paramMap to {_method:'POST', _responseType:'TEXT'}
	/*/
	fn.api = function(url, paramMap, onSuccess, onError) {
		processing();

		var ibtInstance = this;
		var method = "GET";
		var responseType = "JSON";

		if (paramMap) {
			if (paramMap._method) {
				method = paramMap._method.toUpperCase();
				delete paramMap._method;
			}
			if (paramMap._responseType) {
				responseType = paramMap._responseType.toUpperCase();
				delete paramMap._responseType;
			}
			if (method == "GET") {
				url = this.util.tringifyUrl(url, paramMap);
				paramMap = null;
			}
		}
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			var response;
			try{
				if (responseType == "JSON") {
					response = JSON.parse(xhr.responseText);
				} else {
					response = xhr.responseText;
				}
			}catch (e) {
				if (responseType == "JSON") {
					response = {_exception: 1};
					response.response = xhr.responseText;
				} else {
					response = "ERROR!";
				}
			}
			if (xhr.status == 200) {
				if (onSuccess) onSuccess.call(ibtInstance, response, xhr.status);
			} else {
				if (onError) onError.call(ibtInstance, response, xhr.status);
				error("http: " + method + " " + url + " status[" + xhr.status + "]");
			}
			processing(false);
		}
		xhr.onerror = function() {
			if (onError) onError.call(ibtInstance, null, 0);
			error("http: " + method + " " + url + " status[failed]");
			processing(false);
		}
		xhr.open(method, url);
		xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		//xhr.responseType = 'json';
		xhr.send(method == "POST" ? JSON.stringify(paramMap) : null);
	}

	/*********************************************************************
	 * UTIL
     *   fn.util.encodeHtml(strHtml)
     *   fn.util.stringifyUrl(url, queryMap)
     *   fn.util.stringifyJSON(data)
     *   fn.util.parseJSON(strJSON)
     *   fn.util.format(value, strFormat, prefix, suffix)
     *   fn.util.persist(key, value)
	/*********************************************************************/
	fn.util = {};
	fn.util.queryMap = function(strUrl) {
		var params = {};
		strUrl = strUrl.startsWith("http:") ? strUrl : ("http://tmp.com" + strUrl);
		const url = new URL(strUrl);
		(new URLSearchParams(url.search)).forEach(function(value, key) {
			params[key] = value;
		});
		return params;
	}
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
	fn.util.persist = function(key, data) {
		localStorage.setItem(key, data);
		// when error save to cookie
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

		var tpltid = this.form.getAttribute('tpltid');
		setTimeout(function(container, tpltid) {
			document.body.removeChild(container);
			document.querySelectorAll(`[srctpltid="${tpltid}"]`).forEach(function(tag) {
				tag.remove();
			});
		}, 300, this.container, tpltid);
	}
	/***
	 * var msgbox = _d7.popup("#msgbox", parameters, true|false);
	 * msgbox.s("#closeBtn").onclick = function() {msgbox.close();}
	 */
	const newChile = function(currD7, tarTag, parameters) {
		currD7.childseq++;
		var childName = currD7.fullname + '.children.c' + currD7.childseq;
		var child = new Dinosaur7(childName, tarTag, parameters);
		currD7.children[childName] = child;
		return child;
	}
	fn.popup = function (selector, parameters, autoClose) {
		var currD7 = this;
		const defbox = document.querySelector(selector);
		if (!defbox) error(`can not find popup block. selector[${selector}]`);

		var modal = new Modal("popup", autoClose);
		modal.form.innerHTML = defbox.innerHTML;
		var _d7Msgbox = newChile(currD7, modal.form, parameters);
		_d7Msgbox.render(parameters);
		_d7Msgbox.close = function() {
			modal.close();
			delete currD7.children[this.name];
		}

		modal.open();
		return _d7Msgbox;
	}
	/***
	 * var detailModal = _d7.openModal("/detail.html", parameters, true|false);
	 * detailModal.handleOk = function() {}
	 */
	fn.openmodal = function (url, parameters, autoClose) {
		var modal = new Modal("modal", autoClose);
		modal.form.setAttribute("tpltsrc", url);
		modal.form.setAttribute("tpltseq", 999); // 同期呼び出し

		var currD7 = this;
		var _d7Modal = loadExTplt(modal.form, parameters);
		_d7Modal.close = function() {
			modal.close();
			delete currD7.children[this.name];
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
	const _d7 = new Dinosaur7('_d7', null, Dinosaur7.prototype.util.queryMap(window.location.href));
	global._d7 = _d7;
	// call main page's onload function
	const mainPageInit = function() {
		var mainBlock = document.querySelector("mainpage");
		if (!mainBlock) mainBlock = document.querySelector("[mainpage]");
		if (!mainBlock) error('mainpage not defined.');
		mainBlock.style.display = "none";

		mainBlock.querySelectorAll("[_d7=DUMMY]").forEach(function(dummyBlock) {
			dummyBlock.remove();
		})
		_d7._PRIVATE.ROOT = mainBlock;
		_d7._PRIVATE.TPLT = document.createElement("div");
		_d7._PRIVATE.TPLT.innerHTML = mainBlock.innerHTML;

		document.querySelectorAll('[rel="stylesheet"]').forEach(function(css) {
			CSS_TAGS.push(css.getAttribute('href'));
		})
		document.querySelectorAll('script').forEach(function(script) {
			var src = script.getAttribute('src');
			if (src){
				SCRIPT_TAGS.push(src);
			}
		})
	}
	const mainExTplts = function() {
		var extplts = [];
		var extpltsAsynch = [];
		document.querySelectorAll("[tpltsrc]").forEach(function(d7tplt) {
			if (d7tplt.closest("mainpage")) return;
			if (d7tplt.closest("[mainpage]")) return;

			d7tplt.style.display = "none";
			if (d7tplt.hasAttribute("tpltseq")) {
				extplts.push(d7tplt);
				return;
			}
			extpltsAsynch.push(d7tplt);
		})
		// 非同期ロード処理
		for(var idx=0; idx<extpltsAsynch.length; idx++) {
			loadExTplt(extpltsAsynch[idx]);
		}
		// 同期優先順位調整
		extplts.sort(function(e1, e2) {
			var v1 = parseInt(e1.getAttribute('tpltseq'));
			var v2 = parseInt(e2.getAttribute('tpltseq'));
			if (v1>v2) return  1;
			if (v1<v2) return -1;
			return 0;
		});
		for(var idx=0; idx<extplts.length; idx++) {
			loadExTplt(extplts[idx]);
		}
	}
	const hidePage = function() {
		if (document.body) {
			document.body.style.display = "none";
			document.body.style.visibility = "hidden";
			return;
		}
		var pageBlock = document.querySelector("header +");
		pageBlock.style.display = "none";
	}
	const showPage = function() {
		if (document.body) {
			document.body.style.display = "block";
			document.body.style.visibility = "visible";
			return;
		}
		var pageBlock = document.querySelector("header +");
		pageBlock.style.display = "block";
	}
	// assign to system's onload
	switch (document.readyState) {
		case "loading":
			document.addEventListener('DOMContentLoaded', function () {
				//hidePage(); // prevent flickering
				mainPageInit();
				mainExTplts();
				typeof _d7._PRIVATE._funcOnload ? _d7._PRIVATE._funcOnload.call(_d7) : _d7.show(true);
				showPage();
				// after image css loaded.
				// window.addEventListener("load", function () {});
			});
			break;
		default : // interactive, complete
			mainPageInit();
			mainExTplts();
			typeof _d7._PRIVATE._funcOnload ? _d7._PRIVATE._funcOnload.call(_d7) : _d7.show(true);
			showPage();
			break;
	}

})(this);
