/******************************************
 * [Dinosaur7]
 * @author kougen.sai
 * @author cycauo@gmail.com
 * @version 3.0
 * @keyword simple pure html client framework, frontend, React, Vue, Angular, SPA
 * this framework help you to implement SPA with basic skill and no longer need to hard work.
 * The name [Dinosaur7] comes from that My daughter loved dinosaurs when she was 7 years old.
 * 
 * Server side setting
 *   proxy !*.html -
 *   proxy /${PAGE_BASE_URL}/*.html -
 *   proxy * /index.html
 *
 * All D7 tag
 *   d7app, d7layout, d7page, d7comp
 *   d7, d7event, d7key, d7dummy
 * 
 * With Enterprise Version
 *   1) run on async mode
 *   2) recover prev status
 *   3) authenticator
 *   4) web server with api tester
 *   5) full suport with customize
 ******************************************/

let _D7_DEV_MODE = 'dev'; 
let _D7_BASE_URL = '';
let _D7_DEFAULT_LAYOUT = '';
let _D7_DEFAULT_EXTENSION = '';
class D7App {
	constructor() {
		this._GLOBAL = {};
		this._MOUNT_POINT = null;
		this._HIST_PAGE = {};
	}

	setting = function(opt) {
		if (!opt) opt = {};

		_D7_DEV_MODE = opt.devMode || _D7_DEV_MODE;
		_D7_BASE_URL = opt.baseUrl || _D7_BASE_URL;
		_D7_DEFAULT_LAYOUT = opt.defaultLayout || _D7_DEFAULT_LAYOUT;
		_D7_DEFAULT_EXTENSION = opt.defaultExtension || _D7_DEFAULT_EXTENSION;

		this.topPage = opt.topPage || window.location.href;
		this.routeDef = opt.route || [];
	}

	// on document load
	start = async function() {
		let pageInfo = D7Util.parseUrl(this.topPage);
		if ((_D7_BASE_URL + pageInfo.path) === D7Util.parseUrl(window.location.href).path) d7error('Not specified topPage or d7page.');

		this._MOUNT_POINT = document.querySelector('[d7App]');
		if (!this._MOUNT_POINT) d7error('no [d7App] defined in root html.');
		this._MOUNT_POINT.innerHTML = '';

		this.routeMap = {};
		for (const row of this.routeDef) {
			this.routeMap[row.name] = D7Util.parseUrl(row.url).path;
			if (!row.preload) continue;

			await D7Template.load(this.routeMap[row.name]);
		}

		const entryPage = await D7Page.load(pageInfo.path);
		await entryPage.mount(pageInfo.query, this._MOUNT_POINT);
	}

	route = async function(pageNameOrUrl, params, prevStatus) {
		const currPagePath = this._MOUNT_POINT.querySelector('[_d7page]').getAttribute('_d7page');
		this._HIST_PAGE[currPagePath] = this._MOUNT_POINT;

		pageNameOrUrl = this.routeMap[pageNameOrUrl] || pageNameOrUrl;
		const pageInfo = D7Util.parseUrl(pageNameOrUrl);
		pageInfo.query = {...pageInfo.query, ...params};

		if (prevStatus && this._HIST_PAGE[pageInfo.path]) {
			this._MOUNT_POINT.replaceWith(this._HIST_PAGE[pageInfo.path]);
			this._MOUNT_POINT = document.querySelector('[d7App]');
			return;
		}

		const mountPoint = this._MOUNT_POINT.cloneNode(true);
		const pageTag = mountPoint.querySelector('[d7page]');
		if (pageTag) pageTag.innerHTML = ''; // hold layout
		else mountPoint.innerHTML = '';
		this._MOUNT_POINT.replaceWith(mountPoint);
		this._MOUNT_POINT = mountPoint;
		const d7Page = await D7Page.load(pageInfo.path);
		return await d7Page.mount(pageInfo.query, this._MOUNT_POINT);
	}

	modal = async function(pageNameOrUrl, autoClose) {
		pageNameOrUrl = this.routeMap[pageNameOrUrl] || pageNameOrUrl;
		return await D7Modal.load(pageNameOrUrl, autoClose);
	}

	storeData = function(key, val) {
		try {
			localStorage.setItem('dummytest', '1');
			if (localStorage.getItem('dummytest') === '1') {
				if (typeof val === 'undefined') return localStorage.getItem(key);

				if (val != null) return localStorage.setItem(key, val);

				return localStorage.removeItem(key);
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
		else expires.setTime(expires.getTime() - 1000); // for delete
		document.cookie = `${key}=${encodeURIComponent(val)}; expires=${expires.toGMTString()}`;
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

		const comp = await D7Component.load(path, _D7_DEFAULT_LAYOUT);
		d7Page = new D7Page(comp);
		_D7_CACHE_PAGE[path] = d7Page;
		return d7Page;
	}

	mount = async (query, mountPoint) => {
		await this._COMP.mount(query, mountPoint);
		this._COMP._MOUNT_POINT.setAttribute('_d7page', this._COMP._PATH);
	}
}
/*******************************
 * LAYOUT
 *******************************/
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
		await this._COMP.mount(query, mountPoint);
	}
}
/*******************************
 * MODAL
 *******************************/
class D7Modal {
	constructor(comp) {
		this._COMP = comp;

		let tmpDiv = document.createElement('div');
		tmpDiv.innerHTML = "<div class='d7_modal_overlay'><div class='d7_modal_form'></div></div>";
		this.form = tmpDiv.querySelector('.d7_modal_form');
		this.container = tmpDiv.querySelector('.d7_modal_overlay');
		this.form.onclick = function(e) {e.stopPropagation();}
	}

	static load = async (path, autoClose) => {

		const comp = await D7Component.load(path);
		const d7Modal = new D7Modal(comp);

		comp.close = () => { d7Modal.close(); }
		if (autoClose)  d7Modal.container.onclick = function() {d7Modal.close();};
		else 			d7Modal.container.onclick = function() {};

		return d7Modal;
	}

	open = async (params, callback) => {

		this._COMP.callParent = callback;
		await this._COMP.mount(params, this.form);

		document.body.appendChild(this.container);
		this.container.classList.remove("d7_modal_overlay_closing");
		setTimeout(function(container) {
			container.classList.add("d7_modal_overlay_show");
		}, 10, this.container);
	}

	close = () => {
		this.container.classList.remove("d7_modal_overlay_show");
		this.container.classList.add("d7_modal_overlay_closing");

		setTimeout(function(container) {
			document.body.removeChild(container);
		}, 500, this.container);
	}
}

/*******************************
 * COMPONENT
 *******************************/
let _d7id = 100;
class D7Component {

	constructor(path, template, defaultLayoutUrl) {
		this.id = _d7id++;
		this._PATH = path;
		this._TEMPLATE = template;
		this._MOUNT_LAYOUT = null;
		this._MOUNT_POINT = null;
		this._DEFAULT_LAYOUT_URL = defaultLayoutUrl;
	}

	static load = async (path, defaultLayoutUrl) => {
		const template = await D7Template.load(path);
		return new D7Component(path, template, defaultLayoutUrl);
	}

	mount = async (query, mountPoint) => {
		this._MOUNT_LAYOUT = mountPoint;
		this._MOUNT_POINT = mountPoint;
		this._MOUNT_LAYOUT.style.display = "none";

		this._initialized = false;
		if (this._TEMPLATE.fnUserScript) {
			d7debug(`Running UserScript. d7${this.id} ${this._PATH}`);
			await this._TEMPLATE.fnUserScript.call(this, query, this);
		} else {
			d7debug(`Running d7.init({}) instead of UserScript. d7${this.id} ${this._PATH}`);
			await d7.init({})
		}

		if (this.afterInit) this.afterInit(this);
	}

	// call from fnUserScript()
	init = async function(modelData) {
		const moutPoint = await this.mountLayout(modelData);

		for (var idx=0; idx < moutPoint.classList.length; idx++) {
			const clazz = moutPoint.classList[idx];
			if (clazz.startsWith('_d7') && !clazz.endsWith('c')) moutPoint.classList.remove(clazz);
		}
		moutPoint.classList.add(`_d7${this.id}`);
		moutPoint.innerHTML = this._TEMPLATE.fnRender(modelData);
		if (this._TEMPLATE.fnStyle) {
			var styleTag = document.createElement('style');
			styleTag.innerHTML = this._TEMPLATE.fnStyle(`._d7${this.id}`, `._d7${this.id}c`);
			moutPoint.insertBefore(styleTag, moutPoint.firstChild);
		}
		this._TEMPLATE.fnBindEvent(moutPoint, this);

		var elements = moutPoint.querySelectorAll('[d7Comp]');
		for (const compPoint of elements) {
			compPoint.classList.add(`_d7${this.id}c`);
			const compInfo = D7Util.parseUrl(compPoint.getAttribute('d7Comp'));
			const comp = await D7Component.load(compInfo.path);
			await comp.mount(compInfo.query, compPoint);
		}

		this._initialized = true;
		this._MOUNT_LAYOUT.style.display = "block";
	}

	mountLayout = async function(modelData) {
		const layoutUrl = this._TEMPLATE.getLayoutUrl(modelData) || this._DEFAULT_LAYOUT_URL;
		const currLayoutUrl = this._MOUNT_LAYOUT.getAttribute('_d7layout');
		if (!layoutUrl || layoutUrl === currLayoutUrl) {
			const compTag = this._MOUNT_LAYOUT.querySelector('[d7page]');
			if (compTag) this._MOUNT_POINT = compTag;
			return this._MOUNT_POINT;
		}

		const layout = D7Util.parseUrl(layoutUrl);
		const d7Layout = await D7Layout.load(layout.path);
		await d7Layout.mount(layout.query, this._MOUNT_LAYOUT);
		this._MOUNT_LAYOUT.setAttribute('_d7layout', layoutUrl);
		const compTag = this._MOUNT_LAYOUT.querySelector('[d7page]');
		if (!compTag) d7error('No [d7page] defined in layout. ' + layoutUrl);
		return this._MOUNT_POINT = compTag;
	}

	render = async function(selector, modelData) {
		if (!this._initialized) d7error(`Need to call d7.init() first.`);
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
		for (const compPoint of elements) {
			const compInfo = D7Util.parseUrl(compPoint.getAttribute('d7Comp'));
			const comp = await D7Component.load(compInfo.path);
			await comp.mount(compInfo.query, compPoint);
		}
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

	/********************************************************************/
	show = function(visiable) {
		if (visiable) return this._MOUNT_POINT.style.display = "block";
		this._MOUNT_POINT.style.display = "none";
	}
	emitEvent = function(selector, eventName, val) {
		var element = this._MOUNT_POINT.querySelector(selector);
		if (!element) d7error("Target not found for [emitEvent]. " + selector);
		if (eventName.startsWith("on")) eventName = eventName.substring(2);
		element.dispatchEvent(new Event(eventName, val));
	}
	s = function(selector, listNo) {
		if (!selector) return this._MOUNT_POINT;
		if (typeof listNo === 'undefined') return this._MOUNT_POINT.querySelector(selector);

		var elements = this._MOUNT_POINT.querySelectorAll(selector);
		if (elements.length < (listNo+1)) return null;
		return elements[listNo];
	}
	S = function(selector) {
		if (!selector) return [this._MOUNT_POINT];
		return this._MOUNT_POINT.querySelectorAll(selector);
	}
}
/*******************************
 * TEMPLATE
 *******************************/
const _D7_CACHE_TPLT = {};
class D7Template {
	constructor(htmlText) {
		const { layoutExpr, scriptCode, styleCode, templateDom } = d7analyze(htmlText)

		this.fnRender = d7compileHtml(d7prepareHtml(templateDom));
		this.fnStyle = d7compileStyle(styleCode);
		const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
		if (scriptCode) {
			this.fnUserScript = new AsyncFunction("query", "d7", scriptCode);
		}
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
		this._RENDER_PARTS = {};
	}

	static load = async function(path) {
		path = _D7_BASE_URL + path;
		if (!path.match(/\.\w+$/)) path = path + _D7_DEFAULT_EXTENSION

		let d7Template = _D7_CACHE_TPLT[path];
		if (d7Template) return d7Template;

		d7debug('loading html. ' + path);
		let htmlText = await D7Api.loadHtml(path);
		d7Template = new D7Template(htmlText);
		_D7_CACHE_TPLT[path] = d7Template;

		return d7Template;
	}

	getLayoutUrl = function(modelData) {
		if (!this.fnLayoutInfo) return "";
		return this.fnLayoutInfo(modelData);
	}

	renderPart = function(selector, modelData) {
		let fnRender = this._RENDER_PARTS[selector];
		if (fnRender) return fnRender(modelData);

		const target = this._TPLT_DOM.querySelector(selector);
		if (!target) d7error(`Target element not exists in TEMPLATE. ${selector}`);

		fnRender = d7compileHtml(target.innerHTML);
		this._RENDER_PARTS[selector] = fnRender;
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
/*******************************
 * analyze html
 *******************************/
const _D7_NL_REG_START = new RegExp(`(<!\\-\\-\\s*)?(${d7escapeReg(_D7_LOGIC.start)})`, "gm");
const _D7_NL_REG_CLOSE = new RegExp(`(${d7escapeReg(_D7_LOGIC.close)})(\\s*\\-\\->)?`, "gm");
const d7analyze = function(htmlText) {
	let firstTag = htmlText.match(/<\w+>/)
	if (firstTag) firstTag = firstTag[0]
	else firstTag = 'div'
	var divTemp = d7makeContainer(firstTag);

	// {% xxx %} normalize to <!-- {% xxx %} -->
	htmlText = htmlText.replace(_D7_NL_REG_START, function (m, cmtStart, start) {return "<!-- " + start;})
	htmlText = htmlText.replace(_D7_NL_REG_CLOSE, function (m, close, cmtClose) {return close + " -->";})
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
/*******************************
 * compile html
 *******************************/
/* example)
 * 	 <div d7="if|for" class="red [% %]" d7event="click, search(e)" d7value="key, attr">
 *   if (condition) continue | break
 *   if (condition) xxx; yyy; zzz; => if (condition) {xxx; yyy; zzz;
 *   for(condition) xxx; yyy; zzz; => for(condition) {xxx; yyy; zzz;
*/
const _D7_PL_REG_START = new RegExp(d7escapeReg(_D7_PRINT.start), "gm");
const _D7_PL_REG_CLOSE = new RegExp(d7escapeReg(_D7_PRINT.close), "gm");
const d7prepareHtml = function(targetDom) {

	let logicKey; let idx=0;
	const prefix = "_d7l0Gic"; 
	const logicPool = {};
	targetDom.querySelectorAll("[d7]").forEach(function(d7Tag) {
		var d7expr = d7Tag.getAttribute("d7").trim();
		d7Tag.removeAttribute('d7');
		var pos = d7bracketsPos(d7expr, 0, '(', ')');
		if (!pos) d7error("d7scanHtml: " + d7expr);

		var ctl = d7expr.substring(0,pos[0]).trim();
		var control = d7expr.substring(0,pos[1]+1).trim();
		var logic = d7expr.substring(pos[1]+1).trim();
		logicKey = `${prefix}${++idx}E`;
		if (ctl === 'if') {
			if (logic.match(/^continue|break/)) {
				logicPool[logicKey] = `${_D7_LOGIC.start} ${d7expr}; ${_D7_LOGIC.close}`;
				d7Tag.before(logicKey);
				return;
			}
			logicPool[logicKey] = `${_D7_LOGIC.start} ${logic.startsWith('{') ? d7expr : `${control}{${logic}`}; ${_D7_LOGIC.close}`;
			d7Tag.before(logicKey);
			logicKey = `${prefix}${++idx}E`;
			logicPool[logicKey] = `${_D7_LOGIC.start} } ${_D7_LOGIC.close}`;
			d7Tag.after(logicKey);
			return;
		}
		if (ctl === 'for') {
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

// loading icon
var tmpDiv = document.createElement('div');
tmpDiv.innerHTML = "<div style='display:block' class='d7_processing_overlay'><div class='d7_processing_form'><span class='d7_processing'>processing</span></div></div>";
const _d7_processing = tmpDiv.firstChild;
const d7processing = function(start) {
	if (!document.body) return;
	if (start === false) {
		try {return document.body.removeChild(_d7_processing);}
		catch(e) {}
		return;
	}

	document.body.appendChild(_d7_processing);
}
const d7error = function(msg) {
	if (_D7_DEV_MODE === 'dev') alert("[ERROR] " + msg);
	throw new Error("[ERROR] " + msg);
}
const d7debug = function(msg) {
	if (_D7_DEV_MODE === 'dev') console.log("[DEBUG] " + msg);
}
/*********************************************************************************************
 * HTTP API
 *******************************/
class D7Api {
	static loadHtml = (htmlUrl) => {
		return new Promise((resolve, reject) => {
			let request = new XMLHttpRequest();
			request.open('GET', htmlUrl);
	
			request.onload = function() {
				if (request.status == 200) {
					resolve(request.responseText);
				} else {
					reject(`loadHtml: ${htmlUrl} status[${request.status}]`);
				}
			}
			request.onerror = function() {
				reject(`loadHtml: ${htmlUrl} [onerror] occurred.`);
			}
			request.send();
		});
	}
	static loadHtmlSync = (htmlUrl) => {
		let request = new XMLHttpRequest();
		request.open('GET', htmlUrl, false);
		request.send();

		if (request.status == 200) return request.responseText;

		d7error(`loadHtml: ${htmlUrl} status[${request.status}]`);
	}
	static get = function(url, querys, headers, errorHandler) {
		return new Promise((resolve, reject) => {

			if (!headers) headers = {};
			url = D7Util.stringifyUrl(url, querys);
	
			const request = new XMLHttpRequest();
			request.onload = function() {
				let response;
				if (request.getResponseHeader("Content-Type").toUpperCase().contains("JSON")) {
					try{
						response = JSON.parse(xhr.responseText);
					}catch (e) {
						if (errorHandler) errorHandler(e, xhr.responseText);
						else d7error(e);
					}
				} else response = xhr.responseText;
				if (request.status == 200) return resolve(response);

				if (errorHandler) errorHandler('status', request.status);
				else d7error(`Api error. GET ${url} status[${xhr.status}]`);
			}
			request.onerror = function() {
				if (errorHandler) errorHandler('onerror');
				else d7error(`Api error. GET ${url} [onerror] occurred.`);
			}
			request.open("GET", url);
			for (var key in headers) {
				xhr.setRequestHeader(key, headers[key]);
			}
			request.send();
		});
	}
	static post = function(url, data, headers, errorHandler) {
		return new Promise((resolve, reject) => {

			if (!headers) headers = {};
	
			const request = new XMLHttpRequest();
			request.onload = function() {
				let response;
				if (request.getResponseHeader("Content-Type").toUpperCase().contains("JSON")) {
					try{
						response = JSON.parse(xhr.responseText);
					}catch (e) {
						if (errorHandler) errorHandler(e, xhr.responseText);
						else d7error(e);
					}
				} else response = xhr.responseText;
				if (request.status == 200) return resolve(response);

				if (errorHandler) errorHandler('status', request.status);
				else d7error(`Api error. POST ${url} status[${xhr.status}]`);
			}
			request.onerror = function() {
				if (errorHandler) errorHandler('onerror');
				else d7error(`Api error. POST ${url} [onerror] occurred.`);
			}
			request.open("POST", url);
			if (!headers["Content-Type"]) headers["Content-Type"] = "application/json; charset=utf-8";
			for (var key in options.headers) {
				xhr.setRequestHeader(key, headers[key]);
			}
			if (headers["Content-Type"].toUpperCase().contains('JSON')) return request.send(JSON.stringify(data));
			request.send(data);
		});
	}
	static put = function(url, data, headers, errorHandler) {
		return new Promise((resolve, reject) => {

			if (!headers) headers = {};
	
			const request = new XMLHttpRequest();
			request.onload = function() {
				let response;
				if (request.getResponseHeader("Content-Type").toUpperCase().contains("JSON")) {
					try{
						response = JSON.parse(xhr.responseText);
					}catch (e) {
						if (errorHandler) errorHandler(e, xhr.responseText);
						else d7error(e);
					}
				} else response = xhr.responseText;
				if (request.status == 200) return resolve(response);

				if (errorHandler) errorHandler('status', request.status);
				else d7error(`Api error. PUT ${url} status[${xhr.status}]`);
			}
			request.onerror = function() {
				if (errorHandler) errorHandler('onerror');
				else d7error(`Api error. PUT ${url} [onerror] occurred.`);
			}
			request.open("PUT", url);
			if (!headers["Content-Type"]) headers["Content-Type"] = "application/json; charset=utf-8";
			for (var key in options.headers) {
				xhr.setRequestHeader(key, headers[key]);
			}
			if (headers["Content-Type"].toUpperCase().contains('JSON')) return request.send(JSON.stringify(data));
			request.send(data);
		});
	}
	static delete = function(url, querys, headers, errorHandler) {
		return new Promise((resolve, reject) => {

			if (!headers) headers = {};
			url = D7Util.stringifyUrl(url, querys);
	
			const request = new XMLHttpRequest();
			request.onload = function() {
				let response;
				if (request.getResponseHeader("Content-Type").toUpperCase().contains("JSON")) {
					try{
						response = JSON.parse(xhr.responseText);
					}catch (e) {
						if (errorHandler) errorHandler(e, xhr.responseText);
						else d7error(e);
					}
				} else response = xhr.responseText;
				if (request.status == 200) return resolve(response);

				if (errorHandler) errorHandler('status', request.status);
				else d7error(`Api error. DELETE ${url} status[${xhr.status}]`);
			}
			request.onerror = function() {
				if (errorHandler) errorHandler('onerror');
				else d7error(`Api error. DELETE ${url} [onerror] occurred.`);
			}
			request.open("DELETE", url);
			for (var key in headers) {
				xhr.setRequestHeader(key, headers[key]);
			}
			request.send();
		});
	}
}

/*******************************
 * extend Element
 *******************************/
// selectOne
Element.prototype.s = function(selector, listNo) {
	if (!selector) return this;
	if (typeof tarNo === 'undefined') return this.querySelector(selector);

	var elements = this.querySelectorAll(selector);
	if (elements.length < (listNo+1)) return null;
	return elements[listNo];
}
// selectAll
Element.prototype.S = function(selector) {
	if (!selector) return [this];
	return this.querySelectorAll(selector);
}
// value priority[strAttr > value > innerHTML]
Element.prototype.getVal = function() {
	if (this.hasAttribute('d7key')) {
		const d7key = this.getAttribute('d7key').split(',');
		const attr = d7key[1]?.trim() || null;
		if (attr) {
			if (attr === 'text' || attr === 'innerHTML') return this.innerHTML;
			return this.getAttribute(attr);
		}
	}
	if (typeof this.value !== 'undefined') return this.value;
	return this.innerHTML;
}
Element.prototype.setVal = function(val) {
	if (this.hasAttribute('d7key')) {
		const d7key = this.getAttribute('d7key').split(',');
		const attr = d7key[1]?.trim() || null;
		if (attr) {
			if (attr === 'text' || attr === 'innerHTML') {this.innerHTML = val; return this;}
			return this.getAttribute(attr);
		}
	}
	if (typeof this.value !== 'undefined') {this.value = val; return this;}
	this.innerHTML = val;
	return this;
}
// attribute
Element.prototype.getAttr = function(prop) {
	if (!this.hasAttribute(prop)) return null;
	return this.getAttribute(prop) || '';
}
Element.prototype.setAttr = function(prop, val) {
	this.setAttribute(prop, val);
	return this;
}
Element.prototype.rmvAttr = function(prop) {
	this.removeAttribute(prop);
	return this;
}
// style
Element.prototype.getStyle = function(prop) {
	if (prop) return this.style[prop];

	var css = {};
	(this.style.cssText || '').split(';').forEach(function(str){
		var cssunit = str.split(':');
		if (cssunit.length < 2) return;
		css[cssunit[0].trim()] = cssunit[1].trim();
	})
	return css;
};
Element.prototype.setStyle = function(propOrMap, val) {
	if (typeof propOrMap === 'string') {
		this.style[propOrMap] = val;
		return this;
	}
	for (var key in propOrMap) {
		this.style[key] = propOrMap[key];
	}
	return this;
};
Element.prototype.rmvStyle = function(prop) {
	this.style[prop] = null;
	return this;
};
// class
Element.prototype.getClass = function(clazz) {
	if (clazz) {
		if (this.classList.contains(clazz)) return clazz;
		return null;
	}
	var clazz = [];
	for (var idx=0; idx < this.classList.length; idx++) {
		clazz.push(this.classList[idx]);
	}
	return clazz;
}
Element.prototype.setClass = function(clazzOrList) {
	if (typeof clazzOrList === 'string') {
		this.classList.add(clazzOrList);
		return this;
	}
	for (var idx=0; idx < clazzOrList.length; idx++) {
		this.classList.add(clazzOrList[idx]);
	}
	return this;
}
Element.prototype.rmvClass = function(clazzOrList) {
	if (typeof clazzOrList === 'string') {
		this.classList.remove(clazzOrList);
		return this;
	}
	for (var idx=0; idx < clazzOrList.length; idx++) {
		this.classList.remove(clazzOrList[idx]);
	}
	return this;
}

/*********************************************************************************************
 * UTIL
 *******************************/
class D7Util {
	static equals = function(srcData, tarData) {
		if (typeof srcData !== typeof tarData) return false;

		const srcKeys = Object.keys(srcData);
		if (srcKeys.length>0) {
			if (srcKeys.length !== Object.keys(tarData).length) return false;
			for (const idx in srcKeys) {
				if (srcData[srcKeys[idx]] !== tarData[srcKeys[idx]]) return false;
			}
			return true;
		}

		return srcData == tarData;
	}
	static parseUrl = function(strUrl) {
		var query = {};
		strUrl = strUrl.startsWith("http") ? strUrl : ("http://test.com" + strUrl);
		const url = new URL(strUrl);
		(new URLSearchParams(url.search)).forEach(function(value, key) {
			query[key] = value;
		});
		return {path: url.pathname, query: query, origin: url.origin};
	}
	static stringifyUrl = function(url, queryMap) {
		if (!queryMap) return url;
		if (!Object.keys(queryMap).length) return url;

		return url + "?" + Object.keys(queryMap).map(function (key) {
			return key + "=" + encodeURIComponent(queryMap[key]);
		}).join("&");
	}
	static encodeHtml = function(strHtml) {
		strHtml = strHtml || '';
		strHtml = strHtml.replace(/./g, function (c) {
			return _D7_HTMLENCODE[c] || c; 
		});
		return strHtml
	};
	static stringifyJson = function(data) {
		return JSON.stringify(data);
	}
	static parseJson = function(strJson) {
		return JSON.parse(strJson);
	}
	// fmt: comma|date|datetime|time|elapsed
	static format = function(value, fmt, fmtEx) {
		if (fmt === 'comma') {
			if (typeof value === 'string') value = Number(value);
			return (value.toLocaleString() + (fmtEx||''));
		}
		if (fmt === 'elapsed') {

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
}

/*******************************
 * RUNTIME
 *******************************/
D7Component.prototype.api = D7Api;
D7Component.prototype.util = D7Util;
const d7App = new D7App();
const d7app = d7App;
(function (global) { switch (document.readyState) {
	case "loading":
		document.addEventListener('DOMContentLoaded', function () { d7App.start(); });
		//window.addEventListener("load", function () { d7App.start(); }); // after image css loaded.
		break;
	default : // [interactive, complete]
		d7App.start();
		break;
}})(this);
