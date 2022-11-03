let _d7Mode = 'dev';
/***
 * @author Dinosaur7
 * @author kougen.sai
 * @author cycauo@gmail.com
 * @version 2.1
 * @keyword React Vue Angular simple pure html client
 * this framework help you to implement SPA with basic skill no longer need to hard work.
 * The name [Dinosaur7] comes from that My daughter loves dinosaurs and is 7 years old.
 *
 * Dinosaur7's all symbols you can specify in html tag
 *   [_d7] 		specify [if | for | DUMMY] to control rendering html block.
 *   [_d7v] 	specify key to show Model data to html's tag.
 *   [_d7m] 	specify key to collect html value to a Map as ModelData.
 *   [compsrc] 	specify external component resource that includes html and script.
 *   [compseq] 	priority for loading component, specify this will load in synchronize mode.
 *   [mainblock] To specify main page content. in SAP mode only mainblock will show as page.
 *   [solidblock] To tell Dinosaur7 that block don't need to load from remote.
 *
 *   {%  javascript logic %}
 *   {%= print value to html %}
 *   {%=<print value with encode %}
 *
 * Dinosaur7's all javascript method
 *   fn.onload(funcOnload) 					run funcOnload on load event.
 *   fn.s(selector, empty|tarNo)			select one element.
 *   fn.S(selector) 						select all element.
 *   fn.m(empty|selector) 					collect target block's data as Map.
 *   fn.render(ModelData, empty|selector)	render data to target block.
 *   fn.renderTo(ModelData, srcSelector, empty|srcChildSlector, tarSelector, empty|tarChildSlector)
 *   fn.remove(selector, empty|childIndex)	remove one element.
 *
 *   fn.show(empty|false)
 *   fn.loadpage(url, empty|params)			load a component as page to mainblock.
 *   fn.api(url, params, empty|options, empty|onSuccess, empty|onError)
 * 
 *   fn.popup(selector, params, autoClose)	popup current html block.
 *   fn.loadmodal(url, params, autoClose)	load a component and show in modal mode.
 *   fn.processing(empty|false)				show loading icon.
 * 
 * Dinosaur7's util method
 *   fn.util.encodeHtml(strHtml)
 *   fn.util.stringifyUrl(url, params)
 *   fn.util.stringifyJSON(data)
 *   fn.util.parseJSON(strJSON)
 *   fn.util.format(value, fmt, fmtEx)			,|comma|date|datetime|time
 *   fn.util.emitEvent(selector, eventName, val)
 *   fn.util.persistVal(key, empty|value)		save to localStorage or cookie.
 * 
 * Expand native Element's method
 *   Element.s(selector, empty|tarNo)
 *   Element.S(selector)
 *   Element.val(strAttr, val)					setter/getter
 *   Element.css(propOrMap|empty, val|null)		setter/getter, null value to remove
 *   Element.clazz(classOrList|empty, val|null)	setter/getter, null value to remove
 *   Element.attr(strProp|empty, val|null)		setter/getter, null value to remove
/*/
(function (global) {
	const error = function(msg) {
		if (_d7Mode === 'dev') alert(msg);
		throw new Error("[Dinosaur7]error! " + msg);
	}

	class Dinosaur7 {
		constructor(fullname, params) {
			this.fullname = fullname;
			this.params = params;
			this.conf = {pagebase: "", apibase: ""};
			this.childseq = 0;
			this.children = {};
			this._WORK = {showed:false};
			this._CACHE = {funcRender:{}};

			this.assignBlock = function(tarBlock) {
				tarBlock.setAttribute('_d7name', fullname);
				tarBlock.querySelectorAll("[_d7=DUMMY]").forEach(function(dummyBlock) {
					dummyBlock.remove();
				})
				this._WORK.ROOT = tarBlock;
				this._WORK.TPLT = document.createElement(tarBlock.tagName);
				this._WORK.TPLT.innerHTML = tarBlock.innerHTML;
			}
		}
	}

	/********************************************************************
	 * CONSTANT
	/********************************************************************/
	const _LOGIC = {	// {% logic %}				describe logic
		start: "{%",	// {% =varOrFunction %} 	describe output
		close: "%}",	// {% =<varOrFunction %} 	encode and output
	}
	const _HTMLENCODE = {
		"<": "&lt;", 
		">": "&gt;", 
		"&": "&amp;", 
		'"': "&quot;", 
		"'": "&#39;",
		" ": "&nbsp;",
		"　": "&emsp;",
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
	const makeContainerTag = function(tagName) {
		var htmlTag = document.createElement("div");
		var strContainer = _TYPECONTAINER[tagName.toUpperCase()];
		if (!strContainer) return htmlTag;

		var tags = strContainer.split(" ");
		for (var idx in tags) {
			var tempTag = document.createElement(tags[idx]);
			htmlTag.append(tempTag);
			htmlTag = tempTag;
		}
		return htmlTag;
	}
	const bracketsPos = function(str, startPos, strStart, strEnd) {
		if (!str) return null;
		if (!str) return null;
  
		var deeps = 0;
		var posStart = -1;
		for (var idx = startPos; idx < str.length; idx++) {
		  var currStr = str.charAt(idx);
		  if (currStr === strStart) {
			if (deeps === 0) posStart = idx;
			deeps++;
		  }
		  if (currStr === strEnd) {
			if (deeps === 1) return [posStart, idx];
			deeps--;
		  }
		}
  
		return null;
	}
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

		var tarBlock = this._WORK.TPLT;
		if (selector !== "_d7Root") {
			var blocks = this._WORK.TPLT.querySelectorAll(selector);
			if (blocks.length < 1) {
				error("not found target block with selector [" + selector + "]");
				return;
			}
			if (blocks.length > 2) {
				error("only one block is allowed, but there is " + blocks.length + " with selector[" + selector + "]");
				return;
			}
			tarBlock = blocks[0];
		}

		var markedHtml = analyzeD7Mark(tarBlock);
		var renderFunc = makeRenderFunc(markedHtml);
		this._CACHE.funcRender[selector] = renderFunc
		return renderFunc;
	}
	const analyzeD7Mark = function(tarBlock) {

		/***
		 * {% xxx %}
		 * normalize to <!-- {% xxx %} -->
		 */
		var strHtml = tarBlock.outerHTML;
		var RegStart = new RegExp("(<!\\-\\-\\s*)?(" + _LOGIC.start + ")", "gm");
		var RegClose = new RegExp("(" + _LOGIC.close + ")(\\s*\\-\\->)?", "gm");
		strHtml = strHtml.replace(RegStart, function (m, cmtStart, start) {return "<!-- " + start;})
		strHtml = strHtml.replace(RegClose, function (m, close, cmtClose) {return close + " -->";})
		var workingTag = makeContainerTag(tarBlock.tagName);
		workingTag.innerHTML = strHtml;


		/***
		 * _d7 logic [if | for]
		 */
		var logic = {};
		var logicKey; var idx = 0; const prefix = "_d7l0Gic"; 
		workingTag.querySelectorAll("[_d7]").forEach(function(d7Tag) {
			var expr = d7Tag.getAttribute("_d7").trim();

			d7Tag.removeAttribute("_d7");
			var block = analyzeD7Logic(expr);
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
		});
		/***
		 * when <UpperTag _d7v="_m.key1."> and <LowerTag _d7v="key1.key2">
		 * then to                             <LowerTag _d7v="_m.key1.key1.key2">
		 */
		 workingTag.querySelectorAll("[_d7v]").forEach(function(d7vTag) {
			var d7v = d7vTag.getAttribute('_d7v');
			if(!d7v.endsWith(".")) return;
			if(!d7v.startsWith("_m.") && !d7v.startsWith("=m.")) return;

			expandD7ModelExpr(d7vTag, d7v);
		});
		/***
		 * <span _d7v="=m.key1.key[idx].val,attr"></span>
		 * to
		 * <span _d7v="=m.key1.key[idx].val,attr"
		 *       _d7vi="{%_c.push(_m.key1.key[idx].val)%}{%=_c.size()-1%}"
		 *       _d7m="key1.key[].val">
		 * </span>
		 */
		 workingTag.querySelectorAll("[_d7v]").forEach(function(d7vTag) {
			var d7v = d7vTag.getAttribute('_d7v').split(',')[0];
			d7vTag.setAttribute('_d7vi', `${_LOGIC.start}_c.push(${d7v.replaceAll("=m.", "_m.")})${_LOGIC.close}${_LOGIC.start}=_c.length-1${_LOGIC.close}`);
			if (!d7v.startsWith("=m.")) return;

			var d7m = (d7vTag.getAttribute('_d7m') || "").split(',');
			if (d7m[0]) return; // model defined manually

			var d7v = d7v.substring(3);
			var startPos = 0;
			for (var idx=0; ; idx++) {
				pos = bracketsPos(d7v, startPos, '[', ']');
				if (!pos) break;
				d7v = d7v.substring(0,pos[0]+1) + d7v.substring(pos[1]);
				startPos = pos[0] + 2;
			}
			d7m[0] = d7v;
			d7vTag.setAttribute('_d7m', d7m.join(','));
		});
		workingTag.querySelectorAll("[_d7m]").forEach(function(d7mTag) {
			var d7m = d7mTag.getAttribute('_d7m');
			if (d7m.indexOf(',') < 0) return;

			var newArrayFlg = d7m.split(',');
			d7m = newArrayFlg[0];
			var startPos = 0;
			for (var idx=0; ; idx++) {
				pos = bracketsPos(d7m, startPos, '[', ']');
				if (!pos) break;
				if (!newArrayFlg.includes(idx.toString())) {
					startPos = pos[1] + 1;
					continue;
				}
				d7m = d7m.substring(0,pos[0]+1) + '+' + d7m.substring(pos[1]);
				startPos = pos[0] + 3;
			}
			var valAttr = newArrayFlg[1] || '';
			d7mTag.setAttribute('_d7m', isNaN(valAttr) ? (d7m + ',' + valAttr) : '');
		});
		/***
		 * replace logicKey in string mode.
		 */
		strHtml = workingTag.innerHTML;
		for (logicKey in logic) {
			strHtml = strHtml.replace(logicKey, logic[logicKey]);
		}
		return strHtml;
	}
	const analyzeD7Logic = function(expr) {
		expr = expr.trim();
		var pos = bracketsPos(expr, 0, '(', ')');
		if (!pos) error("analyzeD7Logic: " + expr);
		var ctl = expr.substring(0,pos[0]).trim();
		var control = expr.substring(0,pos[1]+1).trim();
		var logic = expr.substring(pos[1]+1).trim();
		if (ctl === 'if') {
			if (logic.match(/^continue|break/)) return {start: expr};
			return {
				start: logic.startsWith('{') ? expr : `${control}{${logic}`,
				close:"}"
			}
		}
		if (ctl === 'for') {
			return {
				start: logic.startsWith('{') ? expr : `${control}{${logic}`,
				close:"}"
			}
		}
		error("analyzeD7Logic: " + expr);
	}
	const expandD7ModelExpr = function(topD7vTag, prefix) {
		topD7vTag.removeAttribute('_d7v');

		topD7vTag.children.forEach(function(child) {
			if (!child.hasAttribute('_d7v')) {
				expandD7ModelExpr(child, prefix);
				return;
			}

			var d7v = child.getAttribute('_d7v');

			if(d7v.startsWith("_m.") || d7v.startsWith("=m.")) {
				// prefixリセット、外側で行われる
				if (d7v.endsWith(".")) return;

				// 自身はそのままで何もしない
				expandD7ModelExpr(child, prefix);
				return;
			}
			// さらに下位層への展開が必要の場合
			if (d7v.endsWith(".")) {
				expandD7ModelExpr(child, prefix + d7v);
				return;
			}

			child.setAttribute('_d7v', prefix + d7v);
			expandD7ModelExpr(child, prefix);
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
					expr = expr.substring(2);
					return "'.replaceAll('_d7.', _d7name + '.') + this.util.encodeHtml(" + expr + ") + '";
				}
				if (expr.startsWith("=")) {
					expr = expr.substring(1);
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
		for(var key in _d7root.conf) child.conf[key] = _d7root.conf[key];
		currD7.children['c'+currD7.childseq] = child;
		return child;
	}
	const deleteComp = function(fullname) {
		var _d7temp = _d7root;
		var _d7path = fullname.split('.');
		for (var idx=3; idx<_d7path.length; idx+=2) {
			_d7temp = _d7temp.children[_d7path[idx-1]];
		}
		delete _d7temp.children[_d7path[_d7path.length-1]];

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
	const ROOT_TAGS_CSS = [];
	const ROOT_TAGS_SCRIPT = [];
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
			cssTags.push(href);
			css.remove();
		})
		// javascript
		divTemp.querySelectorAll('script').forEach(function(script) {
			var src = script.getAttribute('src');
			if (src){
				scriptTags.push(src);
			} else {
				scriptCode += script.innerHTML + "\n;\n;\n;"
			}
			script.remove();
		})

		var mainblock = divTemp.querySelector('mainblock');
		if (!mainblock) mainblock = divTemp.querySelector('[mainblock]');
		if (mainblock) 	strHtml = mainblock.innerHTML;
		else {
			var head = divTemp.querySelector('head');
			if (head) head.remove();
			strHtml = divTemp.innerHTML;
		}

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
			if (ROOT_TAGS_CSS.includes(template.cssTags[idx])) continue;
			ROOT_TAGS_CSS.push(template.cssTags[idx]);

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
			if (ROOT_TAGS_SCRIPT.includes(template.scriptTags[idx])) continue;
			ROOT_TAGS_SCRIPT.push(template.scriptTags[idx]);

			var newTag = document.createElement('script');
			newTag.type = 'text/javascript';
			newTag.setAttribute('src', template.scriptTags[idx]);
			//newTag.setAttribute('_d7nameref', d7Comp.fullname);
			headTag.appendChild(newTag);
		}

		d7Comp.assignBlock(compTag);
		(new Function("_d7", template.script))(d7Comp);
		if (typeof d7Comp._funcOnload !== 'function') {
			if (!d7Comp._WORK.showed) {
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
	const dataContainer = function(currContainer, keys, arrayFlg) {
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

				if (currContainer.length <1) {
					fullKey = fullKey.substring(2);
					error(`forgot specify new array flag?\n   _d7m="${fullKey}[+].key" \nor _d7m="${fullKey}[].key,0" \nor _d7v="=m.${fullKey}[var].key,0" _d7m=",0"`);
					return;
				}
				
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
	const extractModel = function(tarBlock, modelData, arrayFlg) {
		var d7m = tarBlock.getAttribute('_d7m');
		if (d7m) {
			d7m = d7m.replaceAll(" ", "");
			if (d7m.startsWith("[")) error("_d7m can not starts with array " + tarBlock.outerHTML);
	
			var accessKey = d7m.split(',');
			var keys = accessKey[0].trim().replaceAll("[", ".[").replaceAll("..", ".").split(".");
			var dc = dataContainer(modelData, keys, arrayFlg);
			dc[keys[keys.length-1]] = tarBlock.val(accessKey[1] || '');
		}

		// must be sequentially!
		for (var idx=0; idx<tarBlock.children.length; idx++) {
			extractModel(tarBlock.children[idx], modelData, arrayFlg);
		}

		return modelData;
	}
	/*********************************************************************
	 * Dinosaur7's public function
	/*********************************************************************/
	const fn = Dinosaur7.prototype;
	fn.onload = function(funcOnload) {
		var currD7 = this;
		this._WORK._funcOnload = function() {
			funcOnload.call(currD7);
		}
		if (this._WORK.ROOT) this._WORK._funcOnload(currD7);
	}
	fn.s = function(selector, tarNo) {
		if (!selector) return this._WORK.ROOT;
		if (typeof tarNo === 'undefined') return this._WORK.ROOT.querySelector(selector);

		var elements = this._WORK.ROOT.querySelectorAll(selector);
		if (elements.length < tarNo) return null;
		return elements[tarNo-1];
	}
	fn.S = function(selector) {
		if (!selector) return [this._WORK.ROOT];
		return this._WORK.ROOT.querySelectorAll(selector);
	}
	fn.m = function(selector) {
		var tarBlock = this.s(selector);
		if (!tarBlock) error('target block not exists. ' + selector);
		var modelData = {};
		var arrayFlg = {};
		extractModel(tarBlock, modelData, arrayFlg);
		return modelData;
	}
	/***
	 * render model data to elements
	/*/
	const virtualRender = function(modelData, blockSelector) {
		if (!this._WORK.TPLT) error("not onload yet.");

		var tpltBlock = this._WORK.TPLT.s(blockSelector);
		if (!tpltBlock) error("target block not exists in template. " + blockSelector);

		var valContainer = [];
		var htmlContainer = makeContainerTag(tpltBlock.tagName);
		htmlContainer.innerHTML = buildBlock.call(this, blockSelector)(modelData, valContainer, this.fullname);

		// embed value
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
	fn.render = function(modelData, selector) {
		var currD7 = this;
		var virtualBlock = virtualRender.call(currD7, modelData || {}, selector);

		var tarBlock = currD7._WORK.ROOT.s(selector);
		if (!tarBlock) error('target block not exists.');
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
		var srcBlock = virtualRender.call(currD7, modelData || {}, srcSelector);
		var tarBlock = currD7.s(tarSelector);
		if (!tarBlock) error('target block not exists.');
		if (!srcChildSlector && !tarChildSlector) {
			tarBlock.innerHTML = srcBlock.innerHTML;
		} else {
			var srcBlockChildren = srcBlock.children;
			if (srcChildSlector) srcBlockChildren = srcBlock.querySelectorAll(srcChildSlector);
	
	
			if (!tarChildSlector) {
				for (var idx=0; idx<srcBlockChildren.length; idx++) {
					tarBlock.insertBefore(srcBlockChildren[idx], null);
				}
			} else {
				var tarChild = tarBlock.querySelector(tarChildSlector);
				for (var idx=0; idx<srcBlockChildren.length; idx++) {
					tarChild.parentNode.insertBefore(srcBlockChildren[idx], tarChild);
				}
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
		if (!_d7root._WORK.showed) {
			if (document.body) {
				document.body.style.display = "block";
				document.body.style.visibility = "visible";
			} else {
				var firstBlock = document.querySelector("header +");
				firstBlock.style.display = "block";
			}
			_d7root._WORK.showed = true;
		}

		if (visible === false) {
			this._WORK.ROOT.style.display = "none";
		} else {
			this._WORK.ROOT.style.display = "block";
		}
		this._WORK.showed = true;
	};
	/***
	 * single page mode
	/*/
	fn.loadpage = function(url, params) {
		var tarTag = _d7root._WORK.ROOT;
		tarTag.setAttribute("compsrc", _d7root.conf.pagebase + url);
		//tarTag.setAttribute("compseq", 999); // synch

		loadExComp.call(_d7root, tarTag, params);
	}
	/***
	 * HTTP request
	 * 	 default : GET JSON
	/*/
	fn.api = function(url, params, options, onSuccess, onError) {
		processing();
		var currD7 = this;

		if (!options) options = {};
		if (!options.method) options.method = "GET";
		if (!options.responseType) options.responseType = "JSON";
		if (!options.header) options.header = {};
		options.method = options.method.toUpperCase();
		options.responseType = options.responseType.toUpperCase();
		if (options.method == "GET") url = this.util.stringifyUrl(url, params);

		url = currD7.conf.apibase + url;
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
					response = {_error: 'JsonParse'};
					response.response = xhr.responseText;
				} else {
					response = xhr.responseText;
				}
			}
			if (xhr.status == 200) {
				if (onSuccess) onSuccess.call(currD7, response);
			} else {
				if (onError) onError.call(currD7, response, xhr.status);
				error(`http:${options.method} ${url} status[${xhr.status}]`);
			}
			processing(false);
		}
		xhr.onerror = function() {
			if (onError) onError.call(currD7, xhr.responseText, xhr.status);
			error(`http:${options.method} ${url} status[failed]`);
			processing(false);
		}
		xhr.open(options.method, url);
		for (var key in options.header) {
			xhr.setRequestHeader(key, options.header[key]);
		}
		xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		//xhr.responseType = 'json';
		xhr.send(options.method === "GET" ? null : JSON.stringify(params));
	}

	/*********************************************************************
	 * UTIL
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
		strHtml = strHtml || '';
		strHtml = strHtml.replace(/./g, function (c) {
			return _HTMLENCODE[c] || c; 
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
	// fmt: ,|date|datetime|time
	fn.util.format = function(value, fmt, fmtEx) {
		if (fmt === ',' || fmt === 'comma') {
			if (typeof value === 'string') value = Number(value);
			return (value.toLocaleString() + (fmtEx||''));
		}
		value = value.replaceAll(' ', '');
		if (fmt === 'date') {
			if (value.length > 7 ) return (value.substring(0,4) + fmtEx + value.substring(4,6) + fmtEx + value.substring(6,8));
			error('wrong date value. ' + value);
		}
		if (fmt === 'datetime') {
			if (value.length > 13) return (value.substring(0,4) + fmtEx + value.substring(4,6) + fmtEx + value.substring(6,8) + ' ' + value.substring(8,10) + ':' + value.substring(10,12) + ':' + value.substring(12,14));
			error('wrong datetime value. ' + value);
		}
		if (fmt === 'time') {
			if (value.length > 13) return (value.substring(8,10) + ':' + value.substring(10,12) + ':' + value.substring(12,14));
			if (value.length >  5) return (value.substring(0,2) + ':' + value.substring(2,4) + ':' + value.substring(4,6));
			error('wrong time value. ' + value);
		}
		error('wrong format.' + fmt);
	}
	fn.util.emitEvent = function(selector, eventName, val) {
		var element = document.querySelector(selector);
		if (!element) error("target not found in emitEvent. " + selector);
		if (eventName.startsWith("on")) eventName = eventName.substring(2);
		element.dispatchEvent(new Event(eventName, val));
	}
	fn.util.persistVal = function(key, val) {
		try {
			localStorage.setItem('dummytest', '1');
			if (localStorage.getItem('dummytest') === '1') {
				if (typeof val === 'undefined') return localStorage.getItem(key);
				localStorage.setItem(key, val);
				if (val != null) localStorage.setItem(key, val);
				else localStorage.removeItem(key);
				return;
			}
		} catch(e) {;}

		if (typeof val === 'undefined') {
			var keyvals = {};
			(document.cookie || '').split('; ').forEach(function(keyval) {
	            var data = keyval.split('=');
	            keyvals[data[0]] = decodeURIComponent(data[1]);
			});
			return keyvals[key];
		}
		var expires = new Date();
		if (val != null) expires.setTime(expires.getTime() + 365*24*60*60*1000);
		else expires.setTime(expires.getTime() - 1000);
		document.cookie = `${key}=${encodeURIComponent(val)}; expires=${expires.toGMTString()}`;
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
			if (d7name) deleteComp(d7name);
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
	 * var detailModal = _d7.modal("/detail.html", parameters, true|false);
	 * detailModal.handleOk = function() {}
	 */
	fn.loadmodal = function (url, params, autoClose) {
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
	 * Element.s(selector, tarNo)	=> select one
	 * Element.S(selector)			=> select all
	 * Element.val(strAttr, val)	=> priority[strAttr > value > innerHTML]
	 * Element.css()				=> {style}
	 * Element.css(propOrMap)		=> val
	 * Element.css({})				<= set all
	 * Element.css(propOrMap, val|nullToDelete)
	 * Element.clazz()				=> [classList]
	 * Element.clazz(classOrList)	=> judge is contains[true|false]
	 * Element.clazz([])			<= add all
	 * Element.clazz(classOrList, any|nullToDelete) => add
	 * Element.attr(strProp)		=> val|null
	 * Element.attr(strProp, val|nullToDelete)
	/**********************************************************************/
	// selectOne
	Element.prototype.s = function(selector, tarNo) {
		if (!selector) return this;
		if (typeof tarNo === 'undefined') return this.querySelector(selector);

		var elements = this.querySelectorAll(selector);
		if (elements.length < (tarNo)) return null;
		return elements[tarNo-1];
	}
	// selectAll
	Element.prototype.S = function(selector) {
		if (!selector) return [this];
		return this.querySelectorAll(selector);
	}
	// value priority[strAttr > value > innerHTML]
	Element.prototype.val = function(attr, val) {
		//getter
		if (typeof val === 'undefined') {
			if (attr) {
				if (attr === 'text' || attr === 'innerHTML') return this.innerHTML;
				return this.getAttribute(attr);
			}
			if (typeof this.value !== 'undefined') return this.value;
			return this.innerHTML;
		}
		// setter
		if (attr) {
			if (attr == 'text' || attr === 'innerHTML') {this.innerHTML = val; return this;}
			this.setAttribute(attr, val);
			return this
		}
		if (typeof this.value !== 'undefined') {this.value = val; return this;}
		this.innerHTML = val;
		return this;
	}
	// style
	Element.prototype.css = function(propOrMap, val) {
		if (typeof propOrMap === 'undefined') {
			var css = {};
			(this.style.cssText || '').split(';').forEach(function(str){
				var cssunit = str.split(':');
				if (cssunit.length < 2) return;
				css[cssunit[0].trim()] = cssunit[1].trim();
			})
			return css;
		}
		if (typeof val === 'undefined') {
			if (typeof propOrMap === 'string') return this.style[propOrMap];
			for (var key in propOrMap) {
				this.style[key] = propOrMap[key];
			}
			return this;
		}
		if (typeof propOrMap !== 'string') error('[propOrMap] must be a string when set or remove.');
		if (val === null) {
			this.style[propOrMap] = null;
			return this;
		}
		this.style[propOrMap] = val;
		return this;
	};
	// class
	Element.prototype.clazz = function(classOrList, val) {
		if (typeof classOrList === 'undefined') {
			var clazz = [];
			for (var idx=0; idx < this.classList.length; idx++) {
				clazz.push(this.classList[idx]);
			}
			return clazz;
		}
		if (typeof val === 'undefined') {
			if (typeof classOrList === 'string') return this.classList.contains(classOrList);
			for (var idx=0; idx < classOrList.length; idx++) {
				this.classList.add(classOrList[idx]);
			}
			return this;
		}
		if (typeof classOrList !== 'string') error('[classOrList] must be a string when add or remove.');
		if (val === null) {
			this.classList.remove(classOrList);
			return this;
		}
		this.classList.add(classOrList);
		return this;
	}
	// attribute
	Element.prototype.attr = function(prop, val) {
		if (!prop) error('[prop] can not be empty.');
		if (typeof val === 'undefined') {
			if (!this.hasAttribute(prop)) return null;
			return this.getAttribute(prop) || '';
		}
		if (val === null) {
			this.removeAttribute(prop);
			return this;
		}
		this.setAttribute(prop, val);
		return this;
	}

	/*********************************************************************
	 * load.
	/*********************************************************************/
	const _d7 = new Dinosaur7('_d7', parseQuery(window.location.href));
	global._d7 = global._d7root = _d7;
	const rootInit = function() {
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
			ROOT_TAGS_CSS.push(css.getAttribute('href'));
		})
		document.querySelectorAll('script').forEach(function(script) {
			var src = script.getAttribute('src');
			if (src){
				ROOT_TAGS_SCRIPT.push(src);
			}
		})

		// asynch first.
		for(var idx=0; idx<exCompAsynch.length; idx++) {
			loadExComp.call(_d7root, exCompAsynch[idx]);
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
			loadExComp.call(_d7root, exComp[idx]);
		}

		_d7root.assignBlock(mainBlock);
		if (_d7root._WORK.ROOT.hasAttribute("solidblock")) {
			typeof _d7root._WORK._funcOnload ? _d7root._WORK._funcOnload.call(_d7root) : _d7root.show(true);
			return;
		}
		if (!_d7root.conf.pagebase) error('should specify [solidblock] in <mainblock> or define page\'s html root in SPA mode such as _d7.conf.pagebase = "/html/page". ');

		_d7root.loadpage(window.location.pathname, parseQuery(window.location.href));
	}


	switch (document.readyState) {
		case "loading":
			document.addEventListener('DOMContentLoaded', function () {
				rootInit();
				// after image css loaded.
				// window.addEventListener("load", function () {});
			});
			break;
		default : // interactive, complete
			rootInit();
			break;
	}
})(this);
