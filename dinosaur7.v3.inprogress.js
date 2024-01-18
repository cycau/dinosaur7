/******************************************
 * [Dinosaur7]
 * 
 * proxy !*.html -
 * proxy /${PAGE_BASE_URL}/*.html -
 * proxy * /index.html
 *
 * d7app, d7layout, d7page, d7comp
 * d7, d7event, d7key, d7dummy
 ******************************************/
const _d7Mode = 'dev'; 
let _D7_PAGE_BASE = '';
let _D7_PAGE_EXTENSION = '.html';
let _D7_PAGE_DEFAULT_LAYOUT = '';
class D7App {
	constructor() {
		this._GLOBAL = {};
		this._MOUNT_POINT = null;
	}

	setting = function(opt) {

		_D7_PAGE_BASE = opt.pageBase || _D7_PAGE_BASE;
		_D7_PAGE_EXTENSION = opt.pageExtension || _D7_PAGE_EXTENSION;
		_D7_PAGE_DEFAULT_LAYOUT = opt.defaultLayout || _D7_PAGE_DEFAULT_LAYOUT;
		this.topPage = opt.topPage;

		const preload = opt.preload || [];
		for (const pageUrl of preload) {
			let pageInfo = D7Util.parseUrl(pageUrl);
			D7Page.load(pageInfo.path);
		}
	}

	// on document load
	start = async function() {

		this._MOUNT_POINT = document.querySelector('[d7App]');
		if (!this._MOUNT_POINT) d7error('no [d7App] defined in root html.');

		let pageInfo = D7Util.parseUrl(this.topPage || window.location.href);
		if (pageInfo.query.d7Page) {
			pageInfo = D7Util.parseUrl(pageInfo.query.d7Page);
		}

		if ((_D7_PAGE_BASE + pageInfo.path) === D7Util.parseUrl(window.location.href).path) d7error('Not specified topPage or d7page.');
		if (this.init && this.init(pageInfo.path, pageInfo.query) === false) d7error('Initialized d7App failed int init().');

		this._MOUNT_POINT.innerHTML = '';
		const entryPage = await D7Page.load(pageInfo.path);
		await entryPage.mount(pageInfo.query, this._MOUNT_POINT);
	}

	route = async function(pageUrl, ) {
		const pageInfo = D7Util.parseUrl(pageUrl);
		const d7Page = await D7Page.load(pageInfo.path);
		await d7Page.mount(pageInfo.query, this._MOUNT_POINT);
	}

	storeData = function(key, val) {
		if (typeof val === 'undefined') {
			return this._GLOBAL[key];
		}
		this._GLOBAL[key] = val;
	}
}

/*******************************
 * PAGE
 *******************************/
const _D7_CACHE_PAGE = {};
class D7Page {
	constructor(comp) {
		this._COMP = comp;
	}

	static load = async (path) => {
		let d7Page = _D7_CACHE_PAGE[path];
		if (d7Page) return d7Page;

		const comp = await D7Component.load(path, _D7_PAGE_DEFAULT_LAYOUT);
		d7Page = new D7Page(comp);
		_D7_CACHE_PAGE[path] = d7Page;
		return d7Page;
	}

	mount = async (query, mountPoint) => {
		this._COMP.mount(query, mountPoint);
	}
}
/*******************************
 * COMPONENT
 *******************************/
let _d7id = 100;
class D7Component {

	constructor(template, defaultLayoutUrl) {
		this.id = _d7id++;
		this._TEMPLATE = template;
		this._MOUNT_LAYOUT = null;
		this._MOUNT_POINT = null;
		this._DEFAULT_LAYOUT_URL = defaultLayoutUrl;
	}

	static load = async (path, defaultLayoutUrl) => {
		const template = await D7Template.load(_D7_PAGE_BASE + path);
		const d7Component = new D7Component(template, defaultLayoutUrl);

		return d7Component;
	}

	mount = async (query, mountPoint) => {
		this._MOUNT_LAYOUT = mountPoint;
		this._MOUNT_POINT = mountPoint;
		mountPoint.style.display = "none";

		this.inited = false;
		await this._TEMPLATE.fnUserScript.call(this, query, this);
		if (this.afterInit) this.afterInit(this);
	}

	// call from fnUserScript()
	init = async function(modelData) {
		const layoutUrl = this._TEMPLATE.getLayoutUrl(modelData, this) || this._DEFAULT_LAYOUT_URL;
		const currLayoutUrl = this._MOUNT_LAYOUT.getAttribute('[_d7layout]');
		if (layoutUrl && layoutUrl !== currLayoutUrl) {
			const layout = D7Util.parseUrl(layoutUrl);
			const d7Layout = await D7Layout.load(layout.path);
			await d7Layout.mount(layout.query, this._MOUNT_LAYOUT);
			this._MOUNT_LAYOUT.setAttribute('_d7layout', layoutUrl);
			const pagePoint = this._MOUNT_LAYOUT.querySelector('[d7page]');
			if (!pagePoint) d7error('No [d7page] defined in layout. ' + layoutUrl);

			this._MOUNT_POINT = pagePoint;
		}

		for (var idx=0; idx < this._MOUNT_POINT.classList.length; idx++) {
			const clazz = this._MOUNT_POINT.classList[idx];
			if (clazz.startsWith('_d7') && !clazz.endsWith('c')) this._MOUNT_POINT.classList.remove(clazz);
		}
		this._MOUNT_POINT.classList.add(`_d7${this.id}`);
		this._MOUNT_POINT.innerHTML = this._TEMPLATE.fnRender(modelData);
		if (this._TEMPLATE.fnStyle) {
			var styleTag = document.createElement('style');
			styleTag.innerHTML = this._TEMPLATE.fnStyle(`._d7${this.id}`, `._d7${this.id}c`);
			this._MOUNT_POINT.insertBefore(styleTag, this._MOUNT_POINT.firstChild);
		}
		this._TEMPLATE.fnBindEvent(this._MOUNT_POINT, this);

		var elements = this._MOUNT_POINT.querySelectorAll('[d7Comp]');
		for (const mountPoint of elements) {
			mountPoint.classList.add(`_d7${this.id}c`);
			const compInfo = D7Util.parseUrl(mountPoint.getAttribute('d7Comp'));
			const comp = await D7Component.load(compInfo.path);
			await comp.mount(compInfo.query, mountPoint);
		}

		this._MOUNT_POINT.style.display = "block";
		this.inited = true;
	}

	render = async function(selector, modelData) {
		if (!this.inited) d7error(`Need to call d7.init() first.`);
		if (typeof selector !== 'string') d7error(`Need to specify selector.`);
		/***
		 * 仕様！
		 * 子component内のrenderは禁止、責務的に子componentにやらせるべき（非同期絡み）
		 ***/
		const targetDom = this._MOUNT_POINT.querySelector(selector);
		if (!targetDom) d7error(`Target element not exists in Current DOM. ${selector}`);

		const html = this._TEMPLATE.renderPart(selector, modelData);
		targetDom.innerHTML = html;
		this._TEMPLATE.fnBindEvent(targetDom, this);

		var elements = targetDom.querySelectorAll('d7Comp');
		for (const mountPoint of elements) {
			const compInfo = D7Util.parseUrl(mountPoint.getAttribute('d7Comp'));
			const comp = await D7Component.load(compInfo.path);
			await comp.mount(mountPoint, compInfo.query);
		}
	}

	show = async function(visiable) {
		if (visiable) return this._MOUNT_POINT.style.display = "block";
		this._MOUNT_POINT.style.display = "none";
	}

	collect = function(selector) {
		const targetDom = this._MOUNT_DOM.s(selector);
		if (!targetDom) d7error(`Target DOM not exists. ${selector}`);

		const data = {};
		var elements = targetDom.querySelectorAll('[d7key]');
		for (const el of elements) {
			const d7key = el.getAttribute('d7key').split(',');
			let key = d7key[0].trim();
			const attr = d7key[1]?.trim() || null;

			let value = null;
			if (!attr) {
				if (typeof el.value !== 'undefined') value = el.value;
				else value = el.innerHTML;
			} else {
				if (attr === 'text' || attr === 'innerHTML') value = el.innerHTML;
				else  value = el.getAttribute(attr);
			}
			if (!key.endsWith('[]')) {
				data[key] = value;
				continue;
			}

			key = key.substring(0, key.length-2);
			if (data[key]) data[key] = [];
			data[key].push(value);
		}
		return data;
	}
}

const _D7_CACHE_LAYOUT = {};
class D7Layout {
	constructor(comp) {
		this._COMP = comp;
	}

	static load = async (path) => {
		let d7Layout = _D7_CACHE_LAYOUT[path];
		if (d7Layout) return d7Layout;

		const comp = await D7Component.load(path);
		d7Layout = new D7Layout(comp);
		_D7_CACHE_LAYOUT[path] = d7Layout;
		return d7Layout;
	}

	mount = async (query, mountPoint) => {
		this._COMP.mount(query, mountPoint);
	}
}

const _D7_CACHE_TPLT = {};
class D7Template {
	constructor(htmlText) {
		const { layoutExpr, scriptCode, styleCode, templateDom } = d7analyze(htmlText)

		this.fnRender = d7compileHtml(d7prepareHtml(templateDom));
		this.fnStyle = d7compileStyle(styleCode);
		const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
		this.fnUserScript = new AsyncFunction("query", "d7", scriptCode || "d7.init({});");
		this.fnBindEvent = function(targetDom, d7Owner) {
			targetDom.querySelectorAll("[d7event]").forEach(function(ele) {
				const expr = ele.getAttribute("d7event");
				const pos = expr.indexOf(',');
				if (pos < 1) return;
				const eventName = expr.substring(0, pos).trim();
				const eventLogic = expr.substring(pos+1).trim();
				//const eventFunc = function(e) {const d7=d7Owner; eval(eventLogic);}
				const eventFunc = function(e) {new Function("e", "d7", eventLogic)(e, d7Owner);}
				ele.addEventListener(eventName, eventFunc);
			});
		};

		if (layoutExpr) this.fnLayoutInfo = d7compileHtml(layoutExpr);
		this._TPLT_DOM = templateDom;
		this._FUNC_PARTS = {};
	}

	static load = async function(path) {
		let d7Template = _D7_CACHE_TPLT[path];
		if (d7Template) return d7Template;

		const absPath = _D7_PAGE_BASE + path;
		console.log('loading html...' + absPath);
		let htmlText = await D7Api.loadHtml(absPath);
		htmlText = d7normalizeLogic(htmlText)
		d7Template = new D7Template(htmlText);

		return d7Template;
	}

	getLayoutUrl = function(modelData, d7Owner) {
		if (!this.fnLayoutInfo) return "";
		return this.fnLayoutInfo(modelData, d7Owner);
	}

	renderPart = function(selector, modelData) {
		let fnRender = this._FUNC_PARTS[selector];
		if (fnRender) {
			return fnRender(modelData);
		}

		const target = this._TPLT_DOM.querySelector(selector);
		if (!target) d7error(`Target element not exists in TEMPLATE. ${selector}`);

		fnRender = d7compileHtml(target.innerHTML);
		this._FUNC_PARTS[selector] = fnRender;
		return fnRender(modelData);
	}
}
/*******************************
 * COMPILER
 *******************************/
const _D7_LOGIC = {	// {% logic %}				describe logic
	start: "{%",
	close: "%}",
}
const _D7_PRINT = {	// [% output %]				describe output
	start: "[%",
	close: "%]",
}
const _D7_HTMLENCODE = {
	"<": "&lt;", 
	">": "&gt;", 
	"&": "&amp;", 
	'"': "&quot;", 
	"'": "&#39;",
	" ": "&nbsp;",
	"　": "&emsp;",
};
const _D7_CONTAINER_TYPE = {
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
const d7escapeReg = function(str) {
	return str
		.replace(/\(/g, "\\(")
		.replace(/\)/g, "\\)")
		.replace(/\[/g, "\\[")
		.replace(/\]/g, "\\]")
		.replace(/\{/g, "\\{")
		.replace(/\}/g, "\\}")
		.replace(/\\/g, "\\")
		.replace(/\$/g, "\\$")
		.replace(/\-/g, "\\-")
}
/*****
 * {% xxx %}
 * normalize to <!-- {% xxx %} -->
 */
const _D7_NL_REG_START = new RegExp(`(<!\\-\\-\\s*)?(${d7escapeReg(_D7_LOGIC.start)})`, "gm");
const _D7_NL_REG_CLOSE = new RegExp(`(${d7escapeReg(_D7_LOGIC.close)})(\\s*\\-\\->)?`, "gm");
const d7normalizeLogic = function(htmlText) {
	htmlText = htmlText.replace(_D7_NL_REG_START, function (m, cmtStart, start) {return "<!-- " + start;})
	htmlText = htmlText.replace(_D7_NL_REG_CLOSE, function (m, close, cmtClose) {return close + " -->";})
	return htmlText;
}
/*******************************
 * analyze html
 *******************************/
const d7analyze = function(htmlText) {
	let firstTag = htmlText.match(/<\w+>/)
	if (firstTag) firstTag = firstTag[0]
	else firstTag = 'div'

	var divTemp = d7makeContainer(firstTag);
	divTemp.innerHTML = htmlText;
	var layoutExpr = "";
	var scriptCode = "";
	var styleCode = "";

	// layout
	divTemp.querySelectorAll('[d7layout]').forEach(function(ele) {
		layoutExpr = ele.getAttribute('d7layout') || ele.innerHTML;
		ele.remove();
	})
	// dummy
	divTemp.querySelectorAll('[d7dummy]').forEach(function(ele) {
		ele.remove();
	})
	// comp内クリア
	divTemp.querySelectorAll('[d7comp]').forEach(function(ele) {
		ele.innerHTML = '';
	})
	// javascript
	divTemp.querySelectorAll('script').forEach(function(ele) {
		scriptCode += ele.innerHTML + "\n;\n;\n;"
		ele.remove();
	})
	// style
	divTemp.querySelectorAll('style').forEach(function(ele) {
		styleCode += ele.innerHTML + "\n\n\n"
		ele.remove();
	})

	return {
		layoutExpr: layoutExpr,
		scriptCode: scriptCode,
		styleCode: styleCode,
		templateDom: divTemp,
	};
}
const d7makeContainer = function(tagName) {
	var divTmp = document.createElement("div");
	var strContainer = _D7_CONTAINER_TYPE[tagName.toUpperCase()];
	if (!strContainer) return divTmp;

	var tags = strContainer.split(" ");
	for (var idx in tags) {
		var tempTag = document.createElement(tags[idx]);
		divTmp.append(tempTag);
		divTmp = tempTag;
	}
	return divTmp;
}
/*********************************************************************
 * compile html.
 * example)
 * 	 <div d7="if|for" class="red [% %]" d7event="click, search(e)" d7value="key, attr">
 *   if (condition) continue | break
 *   if (condition) xxx; yyy; zzz; => if (condition) {xxx; yyy; zzz;
 *   for(condition) xxx; yyy; zzz; => for(condition) {xxx; yyy; zzz;
/*********************************************************************/
const _D7_PL_REG_START = new RegExp(d7escapeReg(_D7_PRINT.start), "gm");
const _D7_PL_REG_CLOSE = new RegExp(d7escapeReg(_D7_PRINT.close), "gm");
const d7prepareHtml = function(targetDom) {

	let logicKey; let idx=0;
	const prefix = "_d7l0Gic"; 
	const logicPool = {};
	targetDom.querySelectorAll("[d7]").forEach(function(d7Tag) {
		var d7expr = d7Tag.getAttribute("d7").trim();
		var pos = d7bracketsPos(d7expr, 0, '(', ')');
		if (!pos) d7error("d7scanHtml: " + d7expr);

		var ctl = d7expr.substring(0,pos[0]).trim();
		var control = d7expr.substring(0,pos[1]+1).trim();
		var logic = d7expr.substring(pos[1]+1).trim();
		if (ctl === 'if') {
			if (logic.match(/^continue|break/)) {
				logicKey = `${prefix}${++idx}E`;
				logicPool[logicKey] = `${_D7_LOGIC.start} ${d7expr}; ${_D7_LOGIC.close}`;
				d7Tag.before(logicKey);
				return;
			}
			logicKey = `${prefix}${++idx}E`;
			logicPool[logicKey] = `${_D7_LOGIC.start} ${logic.startsWith('{') ? d7expr : `${control}{${logic}`}; ${_D7_LOGIC.close}`;
			d7Tag.before(logicKey);
			logicKey = `${prefix}${++idx}E`;
			logicPool[logicKey] = `${_D7_LOGIC.start} } ${_D7_LOGIC.close}`;
			d7Tag.after(logicKey);
			return;
		}
		if (ctl === 'for') {
			logicKey = `${prefix}${++idx}E`;
			logicPool[logicKey] = `${_D7_LOGIC.start} ${logic.startsWith('{') ? d7expr : `${control}{${logic}`}; ${_D7_LOGIC.close}`;
			d7Tag.before(logicKey);
			logicKey = `${prefix}${++idx}E`;
			logicPool[logicKey] = `${_D7_LOGIC.start} } ${_D7_LOGIC.close}`;
			d7Tag.after(logicKey);
			return;
		}
		d7error(`d7scanHtml: Not a legal [d7] expression: ${d7expr}`);
	});

	let strHtml = targetDom.innerHTML;
	for (logicKey in logicPool) {
		strHtml = strHtml.replace(logicKey, logicPool[logicKey]);
	}

	return strHtml;
}
const d7bracketsPos = function(str, startPos, bStart, bEnd) {
	if (!str) return null;

	let deeps = 0;
	let posStart = -1;
	const bStartLen = bStart.length;
	const bEndLen = bEnd.length;
	for (let idx = startPos; idx < str.length; idx++) {
		if (str.substring(idx, idx+bStartLen) === bStart) {
			if (deeps === 0) posStart = idx;
			deeps++;
		}
		if (str.substring(idx, idx+bEndLen) === bEnd) {
			if (deeps === 1) return [posStart, idx];
			deeps--;
		}
	}

	return null;
}
const _D7_RL_REG = new RegExp(`(${d7escapeReg(_D7_LOGIC.start)})([\\s\\S]*?)(${d7escapeReg(_D7_LOGIC.close)})`, "gm");
const d7compileHtml = function(expr) {
	expr = expr.replace(_D7_NL_REG_START, function (m, cmtStart, start) {return start;})
	expr = expr.replace(_D7_NL_REG_CLOSE, function (m, close, cmtClose) {return close;})
	expr = expr.replace(_D7_PL_REG_START, function (m, start) {return _D7_LOGIC.start + "=";})
	expr = expr.replace(_D7_PL_REG_CLOSE, function (m, close) {return _D7_LOGIC.close;})

	expr = expr.replace(/[\r\n]/g, "").replace(/'/g, "\\'");
	var tpl = expr.replace(_D7_RL_REG, function (m, start, expr, close) {
		if (expr.startsWith("=")) {
			return `' + (${expr.substring(1)}) +'`;
		}
		return `'; ${expr}; out+='`;
	});

	tpl = `var out=''; out+='${tpl}'; return out;`;

	try {
		return new Function("_m", tpl);
	} catch(e) {
		d7error(e.message + '\n' + tpl);
	}
}
const _D7_ST_REG = new RegExp('(.*?)(\\{.*?\\})', "gm");
const d7compileStyle = function(expr) {
	if (!expr) return;

	expr = expr.replace(/[\r\n]/g, "").replace(/'/g, "\\'");
	var tpl = expr.replace(_D7_ST_REG, function (m, selector, detail) {
		selector = selector.trim();
		return `out += scope + ' ${selector}:not(' + exclusion + ' *) ${detail}\\n';\n`;
	});

	tpl = `var out='';\n${tpl}\n return out;`;

	try {
		return new Function("scope", "exclusion", tpl);
	} catch(e) {
		d7error(e.message + '\n' + tpl);
	}
}

/*******************************
 * UTIL
 *******************************/
const d7error = function(msg) {
	if (_d7Mode === 'dev') alert(msg);
	throw new Error("[Dinosaur7]error! " + msg);
}
class D7Util {
	static debug = function(data) {
		console.log(data);
	}
	static equals = function(srcData, tarData) {
		return false;
	}
	static parseUrl = function(strUrl) {
		var query = {};
		strUrl = strUrl.startsWith("http") ? strUrl : ("http://tmp.com" + strUrl);
		const url = new URL(strUrl);
		(new URLSearchParams(url.search)).forEach(function(value, key) {
			query[key] = value;
		});
		return {path: url.pathname, query: query, origin: url.origin};
	}
}
class D7Api {
	static loadHtml = (htmlUrl) => {
		return new Promise((resolve, reject) => {
			let request = new XMLHttpRequest();
			request.open('GET', htmlUrl);
	
			request.onload = function() {
				if (request.status == 200) {
					resolve(request.responseText);
				} else {
					reject(`http: ${htmlUrl} status[${request.status}]`);
				}
			}
			request.onerror = function() {
				reject(`http: ${htmlUrl} status[${request.status}]`);
			}
			request.send();
		});
	}
	static get = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
	static post = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
	static put = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
	static delete = function(url, option, responseHandler, errorHandler) {
		alert("not support yet.");
	}
}

/*******************************
 * RUNTIME
 *******************************/
const fn = D7App.prototype;
fn.api = D7Api;
fn.util = D7Util;
const d7App = new D7App();
(function (global) {
	switch (document.readyState) {
		case "loading":
			document.addEventListener('DOMContentLoaded', function () {
				d7App.start();
			});
			/*/ after image css loaded.
			window.addEventListener("load", function () {
				d7App.start();
			});
			*/
			break;
		default : // [interactive, complete]
			d7App.start();
			break;
	}
})(this);
